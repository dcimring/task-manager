import { weekLabel } from '../lib/dates.js';

export default function WeeklyReportView({ weeksList, selectedWeekKey, setWeekKey, weeklyReportRows }) {
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
        05 — RECORD
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div className="page-title">
          Weekly Report
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {weeksList.map((wKey) => {
            const active = wKey === selectedWeekKey;
            return (
              <button
                key={wKey}
                onClick={() => setWeekKey(wKey)}
                style={{
                  padding: '7px 13px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: active ? '#211d3a' : 'rgba(33, 29, 58, 0.07)',
                  color: active ? '#f7f2e8' : 'rgba(33, 29, 58, 0.6)',
                }}
              >
                {weekLabel(wKey)}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '20px' }}></div>
      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '16px', color: 'rgba(33, 29, 58, 0.6)', marginBottom: '28px' }}>
        {selectedWeekKey
          ? `${weeklyReportRows.length} task(s) completed the week of ${weekLabel(selectedWeekKey)}`
          : 'No completed tasks yet'}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            minWidth: '820px',
            display: 'grid',
            gridTemplateColumns: '1fr 130px 90px 90px 100px 140px 140px',
            gap: '14px',
            padding: '0 4px 12px',
            borderBottom: '1px solid rgba(33, 29, 58, 0.18)',
          }}
        >
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>TASK</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>PROJECT</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>ADDED</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>STARTED</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>DONE</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>SINCE ADDED</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>SINCE STARTED</span>
        </div>
        {weeklyReportRows.map((t) => (
          <div
            key={t._id}
            style={{
              minWidth: '820px',
              display: 'grid',
              gridTemplateColumns: '1fr 130px 90px 90px 100px 140px 140px',
              gap: '14px',
              alignItems: 'center',
              padding: '16px 4px',
              borderBottom: '1px solid rgba(33, 29, 58, 0.08)',
            }}
          >
            <span style={{ fontFamily: 'inherit', fontSize: '15px' }}>{t.description}</span>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11.5px', color: 'rgba(33, 29, 58, 0.55)' }}>{t.project}</span>
            <span style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.dateAddedFmt}</span>
            <span style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.dateStartedFmt}</span>
            <span style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.dateCompletedFmt}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{t.sinceAddedFmt}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{t.sinceStartedFmt}</span>
          </div>
        ))}
        {weeklyReportRows.length === 0 && (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              color: 'rgba(33, 29, 58, 0.4)',
              fontSize: '15px',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            No tasks completed this week.
          </div>
        )}
      </div>
    </div>
  );
}
