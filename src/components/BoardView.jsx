export default function BoardView({ boardColumns, dragStart, allowDrop, handleDrop, openEditTask }) {
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
        02 — WORKFLOW
      </div>
      <div className="page-title" style={{ marginBottom: '28px' }}>
        Board
      </div>
      <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '28px' }}></div>
      <div className="board-scroll-container">
        <div className="board-columns-container">
          {boardColumns.map((col) => (
            <div
              key={col.status}
              onDragOver={allowDrop}
              onDrop={(e) => handleDrop(e, col.status)}
              style={{ flex: 1, minWidth: '250px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  paddingBottom: '8px',
                  borderBottom: `3px solid ${col.accentColor}`,
                }}
              >
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '18px', fontWeight: 600, color: '#211d3a' }}>{col.label}</span>
                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '12px', fontWeight: 500, color: 'rgba(33, 29, 58, 0.4)' }}>{col.count}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
                {col.tasks.map((t) => (
                  <div
                    key={t._id}
                    draggable
                    onDragStart={(e) => dragStart(e, t._id)}
                    onClick={() => openEditTask(t)}
                    className={`board-card ${t.overdue ? 'overdue' : ''}`}
                  >
                    <div
                      style={{
                        fontFamily: "'Source Serif 4', Georgia, serif",
                        fontSize: '15.5px',
                        fontWeight: 500,
                        color: '#211d3a',
                        marginBottom: '10px',
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ verticalAlign: 'middle' }}>{t.description}</span>
                      {t.recurrence && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          marginLeft: '6px',
                          fontSize: '8.5px',
                          color: '#6b4fbb',
                          backgroundColor: 'rgba(107, 79, 187, 0.08)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          verticalAlign: 'middle',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                          </svg>
                          {t.recurrence}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                      <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif", fontWeight: 500, color: 'rgba(33, 29, 58, 0.4)' }}>{t.project}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={t.urgencyDotStyle}></span>
                        <span style={{
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                          fontWeight: t.overdue ? 700 : 500,
                          color: t.overdue ? '#c2542f' : 'rgba(33, 29, 58, 0.4)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {t.dateType === 'reminder' && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#6b4fbb"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ verticalAlign: 'middle' }}
                            >
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                          )}
                          {t.deadlineFmt}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
