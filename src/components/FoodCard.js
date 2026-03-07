"use client";
import React from 'react';
import { useCart } from '@/context/CartContext';
import { Plus } from 'lucide-react';

export default function FoodCard({ food, onClick }) {
    const { addToCart } = useCart();

    const handleCardClick = () => {
        if (onClick) {
            onClick(food);
        }
    };

    const handleAddToCart = (e) => {
        e.stopPropagation(); // don't trigger card click / modal
        addToCart(food);
    };

    return (
        <div
            className="glass-panel food-card"
            onClick={handleCardClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className="food-image-container">
                {/* We use standard img for simplicity here to avoid Next Image config issues with external/local unoptimized src */}
                <img src={`/${food.image}`} alt={food.name} className="food-image" />
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <span className="badge" style={{ background: food.type === 'Vegetarian' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)' }}>
                        {food.type}
                    </span>
                </div>
            </div>
            <div className="food-content">
                <h3 className="food-title">{food.name}</h3>
                <p className="food-desc" title={food.description}>{food.description}</p>
                <div className="food-meta">
                    <span className="food-price">₹{food.price}</span>
                    <button
                        className="btn btn-primary"
                        style={{ padding: '0.5rem', borderRadius: '50%' }}
                        onClick={handleAddToCart}
                        title="Add to Cart"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
