import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface BoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AeroRoute AI] Render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#05070c',
            color: '#e2e8f0',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: 560,
              border: '1px solid rgba(251,191,36,0.35)',
              background: 'rgba(251,191,36,0.06)',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 18, color: '#fbbf24' }}>Something went wrong</h1>
            <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
              The interface hit an unexpected error. Reload the page to try again.
            </p>
            <pre
              style={{
                marginTop: 14,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                color: '#fca5a5',
                background: 'rgba(0,0,0,0.35)',
                padding: 12,
                borderRadius: 10,
              }}
            >
              {this.state.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 16,
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: '#06b6d4',
                color: '#04121a',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');

if (!container) {
  document.body.innerHTML =
    '<pre style="color:#f87171;font-family:monospace;padding:24px">Root element #root not found.</pre>';
} else {
  createRoot(container).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  );
}
