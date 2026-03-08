import { createGroq } from '@ai-sdk/groq';
import { convertToModelMessages, streamText, tool } from 'ai';
import { z } from 'zod';
import { searchMenu, getMenuItemById, getMenu } from '@/lib/db';

const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req) {
    const body = await req.json().catch(() => ({}));
    const rawMessages = body?.messages;

    const uiMessages = Array.isArray(rawMessages) ? rawMessages : [];

    console.log('[FoodAI] Incoming UI messages:', uiMessages ? JSON.stringify(uiMessages, null, 2) : '[]');

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
CRITICAL RULES:
1. For greetings or emotions (like "hi", "hello", "I'm sad", "I'm stressed"), respond with 1 short empathetic sentence, then immediately relate it to food and suggest options. You MAY call search_food with a query like "comfort food" or "light meals" to show options—but you MUST use proper tool calls only. NEVER output raw function syntax (like <function=...> or similar) in your text. Your text must be plain conversational sentences only.
2. Act with HIGH AGENCY for ordering-related intents. If the user says "I want a spicy dinner", call search_food to present visual options.
3. If the user says "Add the paneer tikka to my cart", call add_to_cart immediately using the correct foodId.
4. If the user says "remove the tandoori chicken" or similar, call remove_from_cart using the correct foodId.
5. When the user says they are done or ready to order, call checkout so the UI can guide them through Cash on Delivery.
6. Keep your text responses very brief since the Generative UI components will display the actual data (cards, summaries, etc.).
7. Respect dietary intent: if the user asks for "veg" or "vegetarian", prefer strictly vegetarian items; if they say "non-veg", use non-vegetarian items.
8. If the user gives a high-level intent like "Give me a high protein dinner under ₹500", use search_food with a query that includes their constraints, then optionally call add_to_cart for good matches.
9. ALWAYS keep the conversation centered on food, eating, and ordering decisions. Do not talk about unrelated topics like politics, sports, or tech.
10. NEVER write function call syntax in your text. Use only structured tool calls. Your visible text must never contain <function=...>, {"query":...}, or similar raw JSON/XML.
`,
        tools: {
            search_food: tool({
                description: 'Search menu by name, category, or dietary preference.',
                inputSchema: z.object({
                    query: z.string().describe('Search query for food items.'),
                }),
                execute: async ({ query }) => {
                    const results = searchMenu(query);
                    return { results: results.slice(0, 6) };
                },
            }),
            add_to_cart: tool({
                description: 'Add a food item to cart by ID.',
                inputSchema: z.object({
                    foodId: z.number().describe('ID of the food item.'),
                    quantity: z.number().default(1).describe('Quantity.'),
                }),
                execute: async ({ foodId, quantity }) => {
                    const food = getMenuItemById(foodId);
                    return { food, quantity, action: 'ADD_TO_CART' };
                },
            }),
            remove_from_cart: tool({
                description: 'Remove a food item from cart by ID.',
                inputSchema: z.object({
                    foodId: z.number().describe('ID of the food item to remove.'),
                }),
                execute: async ({ foodId }) => {
                    const food = getMenuItemById(foodId);
                    return { food, action: 'REMOVE_FROM_CART' };
                },
            }),
            checkout: tool({
                description: 'Initiate checkout for the current cart.',
                // Allow null/undefined input from the model and coerce to {}
                inputSchema: z.preprocess(
                    (value) => (value == null ? {} : value),
                    z.object({})
                ),
                execute: async () => {
                    return { action: 'CHECKOUT' };
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
