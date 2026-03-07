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
        model: groq('llama-3.3-70b-versatile'),
        temperature: 0.3,
        messages: await convertToModelMessages(uiMessages),
        system: `You are FoodAI, a helpful, proactive, and highly capable smart food ordering assistant for a premium restaurant.
Your ONLY job is to help the user with food: understanding their cravings, moods, and constraints, and turning that into concrete food suggestions and orders.
You can search the menu, display food items, add/remove items to/from their cart, and checkout. You should always gently steer the conversation back to food.
CRITICAL RULES:
1. For greetings or emotions (like "hi", "hello", "I'm sad", "I'm stressed"), respond with 1 short empathetic sentence, then immediately relate it to food and suggest options (comfort food, light meals, etc.). Do NOT call tools for pure small talk, only when there is some food-related intent.
2. Act with HIGH AGENCY for ordering-related intents. If the user says "I want a spicy dinner", call the searchFood tool to present visual options instead of just replying with text.
3. If the user says "Add the paneer tikka to my cart", call the addToCart tool immediately using the correct foodId. Do not ask for confirmation unless ambiguous.
4. If the user says "remove the tandoori chicken" or similar, call the removeFromCart tool using the correct foodId to remove it from the cart.
5. When the user says they are done or ready to order, call the checkout tool so the UI can guide them through the Cash on Delivery confirmation.
6. Keep your text responses very brief since the Generative UI components will display the actual data (cards, summaries, etc.).
7. Respect dietary intent: if the user asks for "veg" or "vegetarian", prefer strictly vegetarian items; if they say "non-veg", use non-vegetarian items.
8. If the user gives a high-level intent like "Give me a high protein dinner under ₹500", use searchFood (with a query that includes their constraints) to find suitable items, and then optionally call addToCart for good matches.
9. ALWAYS keep the conversation centered on food, eating, and ordering decisions. Do not talk about unrelated topics like politics, sports, or tech.
`,
        tools: {
            searchFood: tool({
                description: 'Search for food items on the menu by name, description, category, or dietary preference.',
                inputSchema: z.object({
                    query: z.string().describe('The search query for food items.'),
                }),
                execute: async ({ query }) => {
                    const results = searchMenu(query);
                    // Return up to 6 results to not overwhelm UI
                    return { results: results.slice(0, 6) };
                },
            }),
            addToCart: tool({
                description: 'Add a specific food item to the user\'s cart by ID.',
                inputSchema: z.object({
                    foodId: z.number().describe('The ID of the food item to add.'),
                    quantity: z.number().default(1).describe('Quantity to add.'),
                }),
                execute: async ({ foodId, quantity }) => {
                    const food = getMenuItemById(foodId);
                    return { food, quantity, action: 'ADD_TO_CART' };
                },
            }),
            removeFromCart: tool({
                description: 'Remove a specific food item from the user\'s cart by ID. Use this when the user asks to remove or delete an item.',
                inputSchema: z.object({
                    foodId: z.number().describe('The ID of the food item to remove.'),
                }),
                execute: async ({ foodId }) => {
                    const food = getMenuItemById(foodId);
                    return { food, action: 'REMOVE_FROM_CART' };
                },
            }),
            checkout: tool({
                description: 'Initiate the checkout process for the current cart.',
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
