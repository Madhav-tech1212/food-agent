# FoodAI - Intelligent Food Ordering Agent

This is a Full-Stack Food Ordering Web Application featuring a traditional UI combined with an Intelligent Agentic interface driven by the AI SDK.

## Features
- **Manual Browsing**: Users can browse the food menu, view details, and manually add items to their cart.
- **AI Agent Interface**: A powerful chat interface where users can declare high-level intents ("I need a spicy dinner"). 
- **Generative UI**: Instead of just text, the AI agent dynamically renders structural UI components (like food grids) within the chat interface based on its tool invocations.
- **Autonomous Actions**: The Agent can search the menu, add items to the user's cart automatically, and initiate checkout flows.
- **Cash on Delivery Checkout**: Stubbed COD flow.

## Agent Architecture
The Intelligent Agent uses the Groq model `llama-3.3-70b-versatile` via `@ai-sdk/groq` together with `@ai-sdk/react`. It is equipped with several tools:
- `searchFood`: Takes a query parameter and searches the local `Foods.json` database. Outputs miniature food cards natively in the chat using Generative UI.
- `addToCart`: Takes a food ID and quantity. The AI automatically determines this from intent. Once executed, the chat UI intercepts this tool call and executes a client-side side-effect to add the item to the global React Cart Context.
- `removeFromCart`: Takes a food ID and removes that item from the cart based on user intent.
- `checkout`: Initiates the checkout sequence and surfaces a checkout confirmation card in the UI.

### Generative UI Approach
Using AI SDK v5 UI messages, the Next.js frontend listens for typed tool parts (such as `tool-searchFood`, `tool-addToCart`, `tool-removeFromCart`, `tool-checkout`). When the AI decides to call a tool, the React frontend intercepts the result payload and renders custom React components (like `MiniFoodCard` and side-effect components) directly into the message history, instead of parsing raw markdown.

## Product Thinking (Summary)

- **Problem**: Ordering food involves juggling taste, spice levels, dietary restrictions (veg / non‑veg), macros, mood, and budget. Traditional filter‑based UIs force users to micromanage every decision.
- **User Behavior**: People naturally speak in high‑level intents ("I want a veg dinner under ₹500", "I'm sad, suggest comfort food") and change their mind frequently ("remove the biryani", "make it less spicy").
- **Agentic Solution**: The agent interprets these intents, searches the structured `Foods.json` menu with constraints (veg/non‑veg, spice, budget, macros), updates the cart via tools, and guides the user to checkout. Users describe what they want; the agent handles the mechanics.
- **Why Generative UI**: Pure text chat is hard to skim. Generative UI lets the agent decide *what* structure to show (cards, confirmations, checkout prompts) and the frontend renders these structures, combining conversational feel with a clear, visual ordering experience.

## Technical Stack
- Frontend: Next.js (App Router), Vanilla CSS 
- Backend: Next.js API Routes, Local JSON Mock DB
- AI: AI SDK v5 (`ai`, `@ai-sdk/groq`, `@ai-sdk/react`)

## Running Locally

### Prerequisites
You need a Groq API key for the AI Agent to function properly.
1. Create a `.env.local` file in the root directory.
2. Add your key: `GROQ_API_KEY=your_groq_api_key_here`

### Using Docker (Recommended)
1. Run `docker-compose up --build -d`
2. Visit `http://localhost:3000`

### Using NPM
1. Run `npm install`
2. Run `npm run dev`
3. Visit `http://localhost:3000`

## Test Scenarios

You can use these prompts to exercise the agent and UI:

- **Basic discovery**
  - "Show me some popular dishes under ₹400."
  - "I want a high protein dinner under ₹500."
  - "Recommend a light lunch that’s not too spicy."
  - "What can I eat that’s good for high protein and low carbs?"

- **Veg / non‑veg & spice**
  - "I want a spicy veg dinner under ₹300."
  - "Give me a non‑veg starter that’s medium spicy."
  - "Only show me vegetarian mains under ₹350."
  - "I’m in the mood for very spicy biryani."

- **Cart operations**
  - "Add paneer tikka to my cart."
  - "Add two portions of butter chicken and one naan."
  - "Remove the chicken biryani from my cart."
  - "Increase the quantity of palak paneer in my cart."
  - "What’s in my cart right now?"

- **Budget & constraints**
  - "I have ₹600. Build me a full dinner (starter + main + bread)."
  - "Recommend a full veg meal for two under ₹800."
  - "Give me something low calorie but filling."

- **Mood‑based**
  - "I’m sad, suggest some comforting food."
  - "I’m tired and don’t want anything heavy. What should I eat?"
  - "I want something special to celebrate."

- **Checkout flow**
  - "I’m done, let’s checkout."
  - "Place the order with cash on delivery."
  - "I’m ready to confirm my order."
