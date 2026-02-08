'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              backgroundColor: '#2d2d2d',
              borderRadius: '8px',
              border: '1px solid #404040',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ margin: '0 auto 24px' }}
            >
              <path
                d="M12 2L2 20h20L12 2z"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M12 9v4M12 17h.01"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '16px',
              }}
            >
              Application Error
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#a0a0a0',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}
            >
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={reset}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#8B5CF6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#7C3AED';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#8B5CF6';
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
