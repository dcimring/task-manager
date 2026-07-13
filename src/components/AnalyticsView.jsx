import { accent } from '../lib/constants.js';

export default function AnalyticsView({
  ringDeg,
  overallCompletionRate,
  totalTasks,
  overallAvgDays,
  totalOverdue,
  totalBlocked,
  projectStats,
  weeklyStatsBars,
}) {
  return (
    <div style={{ animation: 'fadeInUp 0.45s ease' }}>
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: 'rgba(33, 29, 58, 0.4)',
          marginBottom: '10px',
        }}
      >
        04 — PERFORMANCE
      </div>
      <div className="page-title" style={{ marginBottom: '28px' }}>
        Analytics
      </div>
      <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '36px' }}></div>

      <div className="analytics-grid" style={{ marginBottom: '48px' }}>
        <div style={{ background: '#211d3a', borderRadius: '18px', padding: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: `conic-gradient(${accent} ${ringDeg}deg, rgba(247, 242, 232, 0.15) ${ringDeg}deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: '#211d3a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '30px', fontWeight: 700, color: '#f7f2e8' }}>
                {overallCompletionRate}%
              </div>
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '10.5px',
                letterSpacing: '0.08em',
                color: 'rgba(247, 242, 232, 0.5)',
                marginBottom: '6px',
              }}
            >
              COMPLETION RATE
            </div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '15px', color: '#f7f2e8' }}>Across all projects</div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '18px',
            }}
          >
            TOTAL TASKS
          </div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '54px', fontWeight: 700, lineHeight: 1 }}>
            {totalTasks}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '18px',
            }}
          >
            AVG DAYS TO COMPLETE
          </div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '54px', fontWeight: 700, lineHeight: 1 }}>
            {overallAvgDays}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '18px',
            }}
          >
            OVERDUE TASKS
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '54px',
              fontWeight: 700,
              lineHeight: 1,
              color: totalOverdue > 0 ? '#c1493f' : '#211d3a',
            }}
          >
            {totalOverdue}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid rgba(33, 29, 58, 0.1)', borderRadius: '18px', padding: '28px' }}>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '18px',
            }}
          >
            BLOCKED TASKS
          </div>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '54px',
              fontWeight: 700,
              lineHeight: 1,
              color: totalBlocked > 0 ? '#a83c33' : '#211d3a',
            }}
          >
            {totalBlocked}
          </div>
        </div>
      </div>

      {/* By Project Stats */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '20px' }}>By Project</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {projectStats.map((p) => (
            <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <span
                style={{
                  width: '160px',
                  flexShrink: 0,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '15px',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </span>
              <div style={{ flex: 1, height: '8px', background: 'rgba(33, 29, 58, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={p.barStyle}></div>
              </div>
              <span style={{ width: '46px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{p.completionRate}%</span>
              <span
                style={{
                  width: '70px',
                  textAlign: 'right',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '11px',
                  color: 'rgba(33, 29, 58, 0.45)',
                }}
              >
                {p.total} tasks
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Completed by Week Bar Chart */}
      <div>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '22px', fontWeight: 600, marginBottom: '20px' }}>
          Completed by Week
        </div>
        <div className="weekly-chart-container">
          {weeklyStatsBars.map((w) => (
            <div
              key={w.key}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#211d3a' }}>{w.count}</span>
              <div style={w.barStyle}></div>
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10px',
                  color: 'rgba(33, 29, 58, 0.45)',
                }}
              >
                {w.shortLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
