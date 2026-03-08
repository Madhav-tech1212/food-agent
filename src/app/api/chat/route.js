import { createGroq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { searchMenu, getMenuItemById, getMenu } from '@/lib/db';

// Slim food object to reduce token usage in conversation history
function slimFood(f) {
    if (!f) return null;
    return { id: f.id, name: f.name, price: f.price, type: f.type, image: f.image };
}

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req) {
    const body = await req.json().catch(() => ({}));
    const rawMessages = body?.messages;
    const cart = Array.isArray(body?.cart) ? body.cart : [];
    const cartTotal = typeof body?.cartTotal === 'number' ? body.cartTotal : cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

    // Limit message history to avoid Groq TPM (6000) limit - keep last 12 messages
    const fullMessages = Array.isArray(rawMessages) ? rawMessages : [];
    const uiMessages = fullMessages.length > 12 ? fullMessages.slice(-12) : fullMessages;

    // Cart summary for AI context (slim to reduce tokens)
    const cartSummary = cart.length === 0
        ? 'Cart is empty.'
        : cart.map((i) => `${i.quantity || 1}x ${i.name} (₹${(i.price || 0) * (i.quantity || 1)})`).join(', ') + `. Total: ₹${cartTotal}`;

    console.log('[FoodAI] Incoming UI messages:', uiMessages?.length, '(trimmed from', fullMessages.length, '), cart:', cart.length, 'items');

    // Extract the latest user text for graceful fallbacks if tools fail
    let lastUserText = '';
    try {
        const reversed = [...uiMessages].reverse();
        const lastUser = reversed.find((m) => m.role === 'user');
        if (lastUser && Array.isArray(lastUser.parts)) {
            lastUserText = lastUser.parts
                .filter((p) => p.type === 'text')
                .map((p) => p.text)
                .join(' ')
                .trim();
        }
    } catch (e) {
        console.error('[FoodAI] Failed to extract last user text for fallback:', e);
    }

    const result = streamText({
        model: groq('llama-3.1-8b-instant'),
        temperature: 0.3,
        messages: await convertToModelMessages(uiMessages),
        system: `You are FoodAI, a helpful, proactive, and highly capable smart food ordering assistant for a premium restaurant.
Your ONLY job is to help the user with food: understanding their cravings, moods, and constraints, and turning that into concrete food suggestions and orders.
You can search the menu, display food items, add/remove items to/from their cart, and checkout. You should always gently steer the conversation back to food.

CURRENT CART: ${cartSummary}

CRITICAL RULES:
1. For greetings or emotions (like "hi", "hello", "I'm sad", "I'm stressed"), respond with 1 short empathetic sentence, then immediately relate it to food and suggest options. You MAY call search_food with a query like "comfort food" or "light meals" to show options—but you MUST use proper tool calls only. NEVER output raw function syntax (like <function=...> or similar) in your text. Your text must be plain conversational sentences only.
2. Act with HIGH AGENCY for ordering-related intents. If the user says "I want a spicy dinner", call search_food to present visual options.
3. If the user says "Add the paneer tikka to my cart", call add_to_cart with the correct foodId. For multiple items (e.g. "add 2 uttapam and 1 medu vada"), call add_items_to_cart with an array of { itemName, quantity }—this tool finds items by name and adds them.
4. If the user says "remove the tandoori chicken" (or "remove one pav bhaji", "remove 2 biryani"), call remove_from_cart with the correct foodId and optional quantity (number to remove). If they say "remove one" or "remove 2", pass that quantity; otherwise omit quantity to remove the entire line.
5. When the user says "checkout" or they are done ordering, call checkout. The UI will show payment options. Tell the user to choose a payment method—COD (Cash on Delivery) is the only one currently available; others (UPI, Card, Net Banking) show as unavailable.
6. CART / CHECKOUT FLOW: When the user asks "cart", "show cart", "my order", "what's in my cart", "ready to pay", or similar—summarize the cart briefly (using CURRENT CART above). If cart has items, IMMEDIATELY call checkout to show payment options so they can complete the order. If cart is empty, suggest adding items first.
7. Keep your text responses very brief since the Generative UI components will display the actual data (cards, summaries, etc.).
8. Respect dietary intent: if the user asks for "veg" or "vegetarian", prefer strictly vegetarian items; if they say "non-veg", use non-vegetarian items.
9. If the user gives a high-level intent like "Give me a high protein dinner under ₹500", use search_food with a query that includes their constraints, then optionally call add_to_cart for good matches.
10. ALWAYS keep the conversation centered on food, eating, and ordering decisions. Do not talk about unrelated topics like politics, sports, or tech.
11. NEVER write function call syntax in your text. Use only structured tool calls. Your visible text must never contain <function=...>, {"query":...}, or similar raw JSON/XML.
`,
        tools: {
            search_food: tool({
                description: 'Search menu by name, category, or dietary preference.',
                inputSchema: z.object({
                    query: z.string().describe('Search query for food items.'),
                }),
                execute: async ({ query }) => {
                    const results = searchMenu(query).slice(0, 6);
                    return { results: results.map(slimFood) };
                },
            }),
            add_to_cart: tool({
                description: 'Add a single food item to cart by ID.',
                inputSchema: z.object({
                    foodId: z.number().describe('ID of the food item.'),
                    quantity: z.number().default(1).describe('Quantity.'),
                }),
                execute: async ({ foodId, quantity }) => {
                    const food = getMenuItemById(foodId);
                    return { food: slimFood(food) || food, quantity, action: 'ADD_TO_CART' };
                },
            }),
            add_items_to_cart: tool({
                description: 'Add multiple food items to cart by name. Use for "add 2 uttapam and 1 medu vada"—pass items like [{ itemName: "uttapam", quantity: 2 }, { itemName: "medu vada", quantity: 1 }]. Matches menu items by name.',
                inputSchema: z.object({
                    items: z.array(z.object({
                        itemName: z.string().describe('Name of the dish (e.g. uttapam, medu vada, paneer tikka).'),
                        quantity: z.number().default(1).describe('Quantity to add.'),
                    })).describe('List of items with names and quantities.'),
                }),
                execute: async ({ items }) => {
                    const menu = getMenu();
                    const results = (items || []).map(({ itemName, quantity }) => {
                        const nameLower = (itemName || '').toLowerCase().trim();
                        const food = menu.find(
                            (f) => (f.name || '').toLowerCase().includes(nameLower) ||
                                nameLower.includes((f.name || '').toLowerCase())
                        );
                        return { food: food ? slimFood(food) : null, quantity: quantity ?? 1 };
                    }).filter((r) => r.food != null);
                    return { items: results, action: 'ADD_TO_CART' };
                },
            }),
            remove_from_cart: tool({
                description: 'Remove a food item from cart by ID. Optionally specify how many to remove (e.g. "remove one" → quantity 1). If quantity omitted, remove the entire line.',
                inputSchema: z.object({
                    foodId: z.number().describe('ID of the food item to remove.'),
                    quantity: z.number().optional().describe('Number of that item to remove (e.g. 1 for "remove one"). Omit to remove all.'),
                }),
                execute: async ({ foodId, quantity }) => {
                    const food = getMenuItemById(foodId);
                    return { food: slimFood(food) || food, quantityRemoved: quantity ?? null, action: 'REMOVE_FROM_CART' };
                },
            }),
            checkout: tool({
                description: 'Initiate checkout and show payment method selection. Call when user says checkout or ready to order.',
                inputSchema: z.preprocess(
                    (value) => (value == null ? {} : value),
                    z.object({})
                ),
                execute: async () => {
                    return {
                        action: 'CHECKOUT',
                        paymentMethods: [
                            { id: 'cod', name: 'Cash on Delivery (COD)', available: true },
                            { id: 'upi', name: 'UPI', available: false },
                            { id: 'card', name: 'Credit / Debit Card', available: false },
                            { id: 'netbank', name: 'Net Banking', available: false },
                        ],
                    };
                },
            }),
        },
    });

    return result.toUIMessageStreamResponse({
        onError(error) {
            console.error('[FoodAI] Stream error:', error);

            // Fallback: still respond with food suggestions using simple server-side search,
            // without mentioning errors to the user.
            try {
                const query = lastUserText && lastUserText.length > 0 ? lastUserText : 'popular';
                let results = searchMenu(query);

                if (!results || results.length === 0) {
                    // If intent-based search yields nothing, fall back to top of the menu
                    results = getMenu();
                }

                const top = (results || []).slice(0, 3);
                if (top.length > 0) {
                    const summary = top
                        .map((item) => `${item.name} (₹${item.price})`)
                        .join(', ');
                    return `Here are some good options based on your request: ${summary}. You can ask me to add any of these to your cart or refine it further (for example: veg only, under ₹500, spicier, etc.).`;
                }
            } catch (fallbackError) {
                console.error('[FoodAI] Fallback search failed:', fallbackError);
            }

            // Final generic fallback (still food-focused, no error talk)
            return 'Tell me what kind of food you are in the mood for (for example: a spicy veg dinner under ₹500), and I will recommend dishes and manage your cart for you.';
        },
    });
}
