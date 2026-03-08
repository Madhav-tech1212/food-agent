"use client";
import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, X, Plus, Minus, CheckCircle } from 'lucide-react';

export default function CartSidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart();
    const [checkoutStatus, setCheckoutStatus] = useState(null);

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setCheckoutStatus('processing');
        // Simulate COD checkout order placement
        setTimeout(() => {
            clearCart();
            setCheckoutStatus('success');
            setTimeout(() => setCheckoutStatus(null), 3000); // Reset after 3s
        }, 1500);
    };

    return (
        <>
            <button
                className="btn btn-secondary"
                style={{ position: 'fixed', top: '5.5rem', right: '1.5rem', zIndex: 40, borderRadius: '50%', width: '3rem', height: '3rem', padding: 0 }}
                onClick={() => setIsOpen(true)}
            >
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                    <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {cartCount}
                    </span>
                )}
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 45 }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`cart-overlay ${isOpen ? 'open' : ''}`}>
                <div className="cart-header">
                    <h2>Your Cart</h2>
                    <button className="btn-ghost" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'white' }} onClick={() => setIsOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <div className="cart-content">
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '3rem' }}>
                            <ShoppingBag size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                            <p>Your cart is empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="cart-item">
                                <img src={`/${item.image}`} alt={item.name} className="cart-item-img" />
                                <div className="cart-item-info">
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{item.name}</h4>
                                    <div style={{ color: '#60a5fa', fontWeight: '500', marginTop: '0.25rem' }}>₹{item.price}</div>
                                </div>
                                <div className="cart-item-actions">
                                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                        {item.quantity === 1 ? <X size={14} /> : <Minus size={14} />}
                                    </button>
                                    <span style={{ minWidth: '1.5rem', textAlign: 'center', fontWeight: '500' }}>{item.quantity}</span>
                                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="cart-footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
                        <span>Total:</span>
                        <span style={{ color: '#60a5fa' }}>₹{cartTotal}</span>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1rem' }}
                        disabled={cart.length === 0 || checkoutStatus === 'processing'}
                        onClick={handleCheckout}
                    >
                        {checkoutStatus === 'processing' ? 'Placing Order...' :
                            checkoutStatus === 'success' ? (
                                <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={20} /> Order Placed!</span>
                            ) : 'Checkout (Cash on Delivery)'}
                    </button>
                </div>
            </div>
        </>
    );
}
