"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useCart } from '@/context/CartContext';
import { Send, Bot, User, CheckCircle, Search, ShoppingBag, CreditCard } from 'lucide-react';
import FoodCard from './FoodCard';

const THINKING_PHRASES = [
    'Thinking...',
    'Processing...',
    'Searching menu...',
    'Finding options...',
    'Almost there...',
];

function ThinkingIndicator() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((i) => (i + 1) % THINKING_PHRASES.length);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="agent-message thinking-bubble" style={{ padding: '0.75rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
                <Bot size={18} color="#3b82f6" />
                <span className="thinking-text">{THINKING_PHRASES[index]}</span>
            </div>
            <span className="thinking-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>
        </div>
    );
}

export default function ChatInterface() {
    const { cart, addToCart, cartTotal } = useCart();
    const messagesScrollRef = useRef(null);
    const [input, setInput] = useState('');

    // Pass cart so the AI can show it and complete checkout when user asks
    const { messages, isLoading, error, sendMessage, clearError, setMessages } = useChat({
        body: { cart, cartTotal },
    });

    // Keep scroll at bottom (only within chat container, never scroll the page)
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const last = messages[messages.length - 1];
        const textParts = last.parts
            ?.filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join(' ');

        console.log('[FoodAI] New message:', {
            role: last.role,
            text: textParts,
            raw: last,
        });

        // Scroll only the chat container, not the page
        if (messagesScrollRef.current) {
            messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
        }
    }, [messages]);

    // If the server reports an error, turn it into a normal assistant message
    // so the chat doesn't "break" with a scary error box.
    useEffect(() => {
        if (!error || !error.message) return;

        const fallbackText = error.message;

        // Clear the error state in the hook
        if (clearError) clearError();

        // Append a new assistant message with the fallback text
        if (setMessages) {
            setMessages((prev) => [
                ...prev,
                {
                    id: `${Date.now()}-fallback`,
                    role: 'assistant',
                    parts: [{ type: 'text', text: fallbackText }],
                },
            ]);
        }
    }, [error, clearError, setMessages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = input.trim();
        if (!value) return;
        console.log('[FoodAI] User prompt:', value);
        setInput('');
        await sendMessage({ text: value });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', position: 'relative' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Bot color="#3b82f6" /> FoodAI Agent
                </h2>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Ask me to find food or manage your order</p>
            </div>

            <div ref={messagesScrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', scrollbarWidth: 'thin' }}>
                {(!messages || messages.length === 0) && (
                    <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.5 }}>
                        <Bot size={48} style={{ margin: '0 auto 1rem' }} />
                        <p>Hi! I'm your ordering assistant.</p>
                        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Try: "I want a high protein dinner under ₹500"</p>
                    </div>
                )}

                {messages?.map(m => (
                    <div key={m.id} style={{ marginBottom: '1.5rem' }}>
                        {/* Text content */}
                        {m.parts && m.parts.some(part => part.type === 'text') && (
                            <div className={m.role === 'user' ? 'user-message' : 'agent-message'}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
                                    {m.role === 'user' ? <><User size={14} /> You</> : <><Bot size={14} /> AI</>}
                                </div>
                                <div>
                                    {m.parts.map((part, idx) => {
                                        if (part.type === 'text') {
                                            return <span key={idx}>{part.text}</span>;
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Generative UI based on tool parts */}
                        {m.parts?.map((part, idx) => {
                            // search_food results
                            if (part.type === 'tool-search_food') {
                                const hasResults = part.state === 'output-available' && part.output;
                                const results = hasResults ? part.output.results || [] : [];

                                return (
                                    <div key={part.toolCallId} className="agent-message" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7, fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                            <Search size={14} /> Searching menu...
                                        </div>
                                        {hasResults ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {results.length > 0 ? (
                                                    results.map(f => (
                                                        <MiniFoodCard key={f.id} food={f} />
                                                    ))
                                                ) : (
                                                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                                        No items found matching the request.
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span className="spinner"></span> Searching...
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // add_to_cart confirmation
                            if (part.type === 'tool-add_to_cart') {
                                const hasOutput = part.state === 'output-available' && part.output;
                                return (
                                    <div key={part.toolCallId} className="agent-message" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                                        {hasOutput ? (
                                            <AddToCartEffect result={part.output} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                                                <span className="spinner"></span> Adding to cart...
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // add_items_to_cart confirmation (multiple items by name)
                            if (part.type === 'tool-add_items_to_cart') {
                                const hasOutput = part.state === 'output-available' && part.output;
                                return (
                                    <div key={part.toolCallId} className="agent-message" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                                        {hasOutput ? (
                                            <AddMultipleToCartEffect result={part.output} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                                                <span className="spinner"></span> Adding items to cart...
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // remove_from_cart confirmation
                            if (part.type === 'tool-remove_from_cart') {
                                const hasOutput = part.state === 'output-available' && part.output;
                                return (
                                    <div key={part.toolCallId} className="agent-message" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                        {hasOutput ? (
                                            <RemoveFromCartEffect result={part.output} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                                                <span className="spinner"></span> Removing from cart...
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // checkout prompt – payment method selection
                            if (part.type === 'tool-checkout') {
                                const hasOutput = part.state === 'output-available' && part.output;
                                const isError = part.state === 'output-error';
                                const paymentMethods = hasOutput?.paymentMethods || [
                                    { id: 'cod', name: 'Cash on Delivery (COD)', available: true },
                                    { id: 'upi', name: 'UPI', available: false },
                                    { id: 'card', name: 'Credit / Debit Card', available: false },
                                    { id: 'netbank', name: 'Net Banking', available: false },
                                ];

                                return (
                                    <div key={part.toolCallId} className="agent-message" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                                        {hasOutput && !isError ? (
                                            <CheckoutPaymentCard paymentMethods={paymentMethods} />
                                        ) : isError ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#f87171' }}>
                                                <span>Unable to prepare checkout. Please try again.</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                                                <span className="spinner"></span> Preparing checkout...
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return null;
                        })}
                    </div>
                ))}

                {isLoading && messages && messages[messages.length - 1]?.role === 'user' && (
                    <ThinkingIndicator />
                )}
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: '1rem', position: 'relative' }}>
                <input
                    className="search-input"
                    style={{ width: '100%', padding: '1rem 4rem 1rem 1rem', margin: 0 }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="I'm craving something spicy..."
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    style={{
                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                        background: input.trim() ? '#3b82f6' : 'transparent', border: 'none',
                        color: input.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                        cursor: input.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    <Send size={18} />
                </button>
            </form>

            <style dangerouslySetInnerHTML={{
                __html: `
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .thinking-bubble .thinking-dots span {
          animation: blink 0.6s ease-in-out infinite;
        }
        .thinking-bubble .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
        .thinking-bubble .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 60% { opacity: 0.2; }
          100% { opacity: 1; }
        }
      `}} />
        </div>
    );
}

// Sub-components for Generative UI

function CheckoutPaymentCard({ paymentMethods }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Choose Payment Method</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {paymentMethods.map((pm) => (
                    <div
                        key={pm.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.9rem',
                            background: pm.available ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            opacity: pm.available ? 1 : 0.6,
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <CreditCard size={16} />
                            {pm.name}
                        </span>
                        {pm.available ? (
                            <button
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                onClick={() => document.querySelector('.btn-secondary[style*="fixed"]')?.click()}
                            >
                                Choose COD
                            </button>
                        ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Currently unavailable</span>
                        )}
                    </div>
                ))}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                COD (Cash on Delivery) is the only payment option available at the moment.
            </p>
        </div>
    );
}

function MiniFoodCard({ food }) {
    const { addToCart } = useCart();

    if (!food) return null;

    const typeValue = String(food.type || '').toLowerCase();
    const isNonVeg = typeValue.includes('non');
    const cardTintStyle = isNonVeg
        ? {
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
        }
        : {
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
        };

    return (
        <div
            className="glass-panel"
            style={{
                display: 'flex',
                padding: '0.75rem',
                gap: '1rem',
                alignItems: 'center',
                ...cardTintStyle,
            }}
        >
            <img src={`/${food.image}`} alt={food.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
            <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.875rem' }}>{food.name}</h4>
                <div style={{ color: '#60a5fa', fontSize: '0.875rem', fontWeight: 500 }}>₹{food.price}</div>
            </div>
            <button className="btn btn-primary" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={() => addToCart(food)}>
                <ShoppingBag size={14} />
            </button>
        </div>
    );
}

// Side-effect for add_multiple_to_cart – adds each item to cart
function AddMultipleToCartEffect({ result }) {
    const { addToCart } = useCart();
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current && result?.items?.length) {
            setTimeout(() => {
                result.items.forEach(({ food, quantity }) => {
                    if (food) addToCart(food, quantity ?? 1);
                });
                mounted.current = true;
            }, 0);
        }
    }, [result, addToCart]);

    if (!result?.items?.length) return null;

    const summary = result.items
        .filter((r) => r.food)
        .map(({ food, quantity }) => `${quantity ?? 1}x ${food.name}`)
        .join(', ');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
            <CheckCircle size={18} />
            <span>Added <b>{summary}</b> to cart</span>
        </div>
    );
}

// Side-effect component that triggers the addToCart context action once
function AddToCartEffect({ result }) {
    const { addToCart } = useCart();
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current && result && result.food) {
            // Small timeout to prevent dispatching state during render
            setTimeout(() => {
                addToCart(result.food, result.quantity);
            }, 0);
            mounted.current = true;
        }
    }, [result, addToCart]);

    if (!result || !result.food) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
            <CheckCircle size={18} />
            <span>Added <b>{result.quantity}x {result.food.name}</b> to cart</span>
        </div>
    );
}

function RemoveFromCartEffect({ result }) {
    const { cart, removeFromCart, updateQuantity } = useCart();
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current && result && result.food) {
            setTimeout(() => {
                const id = result.food.id;
                const qty = result.quantityRemoved != null ? Number(result.quantityRemoved) : null;
                if (qty != null && qty > 0) {
                    const item = cart.find((i) => i.id === id);
                    const current = item ? item.quantity : 0;
                    const newQty = current - qty;
                    if (newQty <= 0) removeFromCart(id);
                    else updateQuantity(id, newQty);
                } else {
                    removeFromCart(id);
                }
            }, 0);
            mounted.current = true;
        }
    }, [result, removeFromCart, updateQuantity, cart]);

    if (!result || !result.food) return null;

    const qty = result.quantityRemoved != null ? Number(result.quantityRemoved) : null;
    const label = qty != null && qty > 0
        ? `Removed ${qty}x ${result.food.name}`
        : `Removed ${result.food.name} from cart`;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97373' }}>
            <CheckCircle size={18} />
            <span>{label}</span>
        </div>
    );
}
