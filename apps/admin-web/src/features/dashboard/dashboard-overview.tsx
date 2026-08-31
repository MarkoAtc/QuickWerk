import type { DashboardMetric } from './dashboard-presenter';

type DashboardOverviewProps = {
  metrics: DashboardMetric[];
  sessionLabel: string;
};

const toneColors = {
  primary: '#0266FF',
  success: '#10B981',
  warning: '#FF8A00',
};

function MetricCard({ label, tone, value }: DashboardMetric) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: '1px solid rgba(148,163,184,0.20)',
        background: '#FFFFFF',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
        padding: 20,
      }}
    >
      <div style={{ color: '#4B5563', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color: toneColors[tone], fontSize: 28, fontWeight: 800, marginTop: 10 }}>{value}</div>
    </div>
  );
}

export function DashboardOverview({ metrics, sessionLabel }: DashboardOverviewProps) {
  return (
    <>
      <section
        style={{
          background: '#131A2C',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
          padding: 36,
        }}
      >
        <div style={{ alignItems: 'flex-start', display: 'flex', gap: 24, justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#9DA8BF', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Operator dashboard
            </div>
            <h1 style={{ color: '#E8EEF8', fontSize: 52, letterSpacing: '-0.04em', lineHeight: 1.02, margin: '10px 0 0', maxWidth: 760 }}>
              Control the marketplace with clarity.
            </h1>
            <p style={{ color: '#9DA8BF', lineHeight: 1.7, margin: '14px 0 0', maxWidth: 720 }}>
              Live provider verification, dispute operations, and finance/support exception handling in one premium operations cockpit.
            </p>
            <p style={{ color: '#9DA8BF', margin: '14px 0 0' }}>Session bootstrap: {sessionLabel}</p>
          </div>
          <span style={{ background: 'rgba(16,185,129,0.14)', borderRadius: 999, color: '#6EE7B7', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', padding: '6px 12px', textTransform: 'uppercase' }}>
            Live control
          </span>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>
    </>
  );
}
