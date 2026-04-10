import CampaignIntelligence from './CampaignIntelligence.jsx'

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg)',
    }}>
      {/* ── Top Bar ────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 32px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
          background: 'var(--color-primary-muted)',
          border: '1px solid rgba(37,99,235,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: 'var(--color-primary)',
        }}>
          ◈
        </div>
        <div>

          <p style={{
            fontSize: 15, fontWeight: 600,
            color: 'var(--color-text-primary)', margin: 0,
          }}>
            AdVantage AI
          </p>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────── */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <CampaignIntelligence />
      </main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer style={{
        padding: '12px 32px',
        borderTop: '1px solid var(--color-border)',
        fontSize: 12,
        color: 'var(--color-text-tertiary)',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        flexShrink: 0,
        background: 'var(--color-surface)',
      }}>

        <span>digital_media_cleaned.csv · v1.0</span>
      </footer>
    </div>
  )
}
