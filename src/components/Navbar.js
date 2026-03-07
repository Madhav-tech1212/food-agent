"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav
      style={{
        width: '100%',
        padding: '0.75rem 2rem',
        borderBottom: '1px solid rgba(148,163,184,0.25)',
        background: 'rgba(15,23,42,0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: '1.25rem',
            background:
              'linear-gradient(135deg, #60a5fa, #22c55e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          FoodAI
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/order" style={{ textDecoration: 'none', fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 500 }}>
          Order
        </Link>
        {user ? (
          <>
            <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              Hello, <strong>{user.name}</strong>
            </span>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
              onClick={logout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
              Login
            </Link>
            <Link href="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

