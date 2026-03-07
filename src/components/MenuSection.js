"use client";

import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import FoodCard from './FoodCard';

export default function MenuSection({ initialMenu }) {
  const [query, setQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);
  const [spiceFilters, setSpiceFilters] = useState({
    Mild: false,
    Medium: false,
    Hot: false,
  });
  const [selectedFood, setSelectedFood] = useState(null);

  const filteredMenu = useMemo(() => {
    const q = query.trim().toLowerCase();

    return initialMenu.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const ingredients = (item.ingredients || []).map((ing) =>
        ing.toLowerCase()
      );
      const spice = (item.spiceLevel || '').toLowerCase();

      // Type filters
      if (vegOnly && type !== 'vegetarian') return false;
      if (nonVegOnly && type !== 'non-vegetarian') return false;

      // Spice filters
      const activeSpiceFilters = Object.entries(spiceFilters)
        .filter(([, value]) => value)
        .map(([key]) => key);
      if (activeSpiceFilters.length > 0) {
        const spiceMap = {
          Mild: ['mild'],
          Medium: ['medium', 'medium-hot'],
          Hot: ['hot', 'spicy'],
        };
        const matchesSpice = activeSpiceFilters.some((level) =>
          spiceMap[level].some((token) => spice.includes(token))
        );
        if (!matchesSpice) return false;
      }

      // Text search
      if (!q) return true;

      return (
        name.includes(q) ||
        desc.includes(q) ||
        category.includes(q) ||
        type.includes(q) ||
        ingredients.some((ing) => ing.includes(q))
      );
    });
  }, [initialMenu, query, vegOnly, nonVegOnly, spiceFilters]);

  const toggleSpice = (level) => {
    setSpiceFilters((prev) => ({
      ...prev,
      [level]: !prev[level],
    }));
  };

  const closeModal = () => setSelectedFood(null);

  return (
    <section>
      <div
        className="search-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2>Featured Menu</h2>
        </div>
        <div style={{ position: 'relative' }}>
          <Search className="search-icon" size={18} />
          <input
            className="search-input"
            placeholder="Search the menu (e.g. paneer, biryani, veg, spicy)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: '#cbd5e1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ opacity: 0.7 }}>Type:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={vegOnly}
                onChange={(e) => setVegOnly(e.target.checked)}
              />
              Veg
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={nonVegOnly}
                onChange={(e) => setNonVegOnly(e.target.checked)}
              />
              Non-Vegetarian
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ opacity: 0.7 }}>Spice level:</span>
            {['Mild', 'Medium', 'Hot'].map((level) => (
              <label
                key={level}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={spiceFilters[level]}
                  onChange={() => toggleSpice(level)}
                />
                {level}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="food-grid">
        {filteredMenu.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            onClick={() => setSelectedFood(food)}
          />
        ))}
        {filteredMenu.length === 0 && (
          <div style={{ opacity: 0.7 }}>
            No items found. Try a different search term or adjust filters.
          </div>
        )}
      </div>

      {/* Food details modal */}
      {selectedFood && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={closeModal}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '640px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '1.5rem',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#e2e8f0',
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <img
                src={`/${selectedFood.image}`}
                alt={selectedFood.name}
                style={{
                  width: '220px',
                  height: '220px',
                  objectFit: 'cover',
                  borderRadius: '16px',
                }}
              />
              <div style={{ flex: 1, minWidth: '220px' }}>
                <h2 style={{ marginBottom: '0.25rem' }}>{selectedFood.name}</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                  <span
                    className="badge"
                    style={{
                      background:
                        selectedFood.type === 'Vegetarian'
                          ? 'rgba(34, 197, 94, 0.8)'
                          : 'rgba(239, 68, 68, 0.8)',
                    }}
                  >
                    {selectedFood.type}
                  </span>
                  {selectedFood.spiceLevel && (
                    <span className="badge">{selectedFood.spiceLevel}</span>
                  )}
                  {selectedFood.category && (
                    <span className="badge">{selectedFood.category}</span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
                  {selectedFood.description}
                </p>

                {selectedFood.ingredients && selectedFood.ingredients.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Ingredients</h4>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {selectedFood.ingredients.join(', ')}
                    </p>
                  </div>
                )}

                {selectedFood.nutrition && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Nutrition (per serving)</h4>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                      {selectedFood.nutrition.calories != null && `Calories: ${selectedFood.nutrition.calories} `}
                      {selectedFood.nutrition.protein && ` • Protein: ${selectedFood.nutrition.protein} `}
                      {selectedFood.nutrition.carbs && ` • Carbs: ${selectedFood.nutrition.carbs} `}
                      {selectedFood.nutrition.fat && ` • Fat: ${selectedFood.nutrition.fat}`}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#60a5fa' }}>
                    ₹{selectedFood.price}{' '}
                    {selectedFood.serves && (
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        • Serves {selectedFood.serves}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Click the + button on the card to add this dish to your cart.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

