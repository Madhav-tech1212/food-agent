import Link from 'next/link';

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '640px' }}>
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #60a5fa, #22c55e)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}
        >
          FoodAI
        </h1>
        <p
          style={{
            fontSize: '1.25rem',
            color: '#cbd5e1',
            marginBottom: '0.5rem',
            lineHeight: 1.6,
          }}
        >
          Order your favorite meals or let our AI assistant help you choose.
        </p>
        <p
          style={{
            fontSize: '1rem',
            color: '#94a3b8',
            marginBottom: '2.5rem',
          }}
        >
          Browse the menu, filter by veg / spice / budget, and chat with the agent to get personalized suggestions.
        </p>

        <Link
          href="/order"
          className="btn btn-primary"
          style={{
            padding: '1rem 2.5rem',
            fontSize: '1.1rem',
            borderRadius: '12px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Order now
        </Link>
      </div>
    </main>
  );
}
