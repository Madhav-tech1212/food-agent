import { getMenu } from '@/lib/db';
import CartSidebar from '@/components/CartSidebar';
import ChatInterface from '@/components/ChatInterface';
import MenuSection from '@/components/MenuSection';

export default function OrderPage() {
  const menuConfig = getMenu();

  return (
    <main className="layout-container">
      {/* Left side: Menu + search + filters */}
      <div className="main-content">
        <header className="header">
          <div>
            <h1>FoodAI</h1>
            <p>Browse the menu or ask our AI to find the perfect meal for you.</p>
          </div>
        </header>

        <MenuSection initialMenu={menuConfig} />
      </div>

      {/* Right side: AI Agent Chat */}
      <aside className="chat-sidebar">
        <ChatInterface />
      </aside>

      <CartSidebar />
    </main>
  );
}
