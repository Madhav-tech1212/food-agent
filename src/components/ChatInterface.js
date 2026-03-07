"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useCart } from '@/context/CartContext';
import { Send, Bot, User, CheckCircle, Search, ShoppingBag } from 'lucide-react';
import FoodCard from './FoodCard';

export default function ChatInterface() {
    const { cart, addToCart } = useCart();
    const messagesEndRef = useRef(null);
    const [input, setInput] = useState('');

    // Single-provider chat: use default /api/chat endpoint
    const { messages, isLoading, error, sendMessage, clearError, setMessages } = useChat();

    // Keep scroll at bottom + log last message
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

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', scrollbarWidth: 'thin' }}>
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
                            // searchFood results
                            if (part.type === 'tool-searchFood') {
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

                            // addToCart confirmation
                            if (part.type === 'tool-addToCart') {
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

                            // removeFromCart confirmation
                            if (part.type === 'tool-removeFromCart') {
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

                            // checkout prompt
                            if (part.type === 'tool-checkout') {
                                const hasOutput = part.state === 'output-available' && part.output;
                                const isError = part.state === 'output-error';

                                return (
                                    <div key={part.toolCallId} className="agent-message" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                                        {hasOutput && !isError ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                                    <CheckCircle size={18} color="#22c55e" />
                                                    <span style={{ color: '#22c55e' }}>Ready for Cash on Delivery</span>
                                                </div>
                                                <p style={{ fontSize: '0.875rem' }}>I've prepared your order. Click below or open the cart sidebar to confirm your order.</p>
                                                <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }} onClick={() => document.querySelector('.btn-secondary[style*="fixed"]')?.click()}>
                                                    View Cart & Checkout
                                                </button>
                                            </div>
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
                    <div className="agent-message" style={{ opacity: 0.7, padding: '0.75rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="spinner"></span> Working...
                    </div>
                )}
                <div ref={messagesEndRef} />
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
      `}} />
        </div>
    );
}

// Sub-components for Generative UI 

function MiniFoodCard({ food }) {
    const { addToCart } = useCart();

    if (!food) return null;
    return (
        <div className="glass-panel" style={{ display: 'flex', padding: '0.75rem', gap: '1rem', alignItems: 'center' }}>
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
    const { removeFromCart } = useCart();
    const mounted = useRef(false);

    useEffect(() => {
        if (!mounted.current && result && result.food) {
            setTimeout(() => {
                removeFromCart(result.food.id);
            }, 0);
            mounted.current = true;
        }
    }, [result, removeFromCart]);

    if (!result || !result.food) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97373' }}>
            <CheckCircle size={18} />
            <span>Removed <b>{result.food.name}</b> from cart</span>
        </div>
    );
}
