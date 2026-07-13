import { urgencyColor, urgencyLabel } from '../lib/constants.js';

function RecurrenceBadge({ recurrence }) {
  if (!recurrence) return null;
  return (
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
      {recurrence}
    </span>
  );
}

export default function FocusView({ focusOverdue, focusUpcoming, focusBlocked, focusSuggested, openEditTask }) {
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
        00 — ACTION CENTER
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap',
          marginBottom: '28px',
        }}
      >
        <div className="page-title">
          Focus
        </div>
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '12px',
            color: 'rgba(33, 29, 58, 0.45)',
          }}
        >
          DAILY HUDDLE & PRIORITIES
        </div>
      </div>
      <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '28px' }}></div>

      <div className="focus-grid">
        {/* Overdue Column */}
        <div className="focus-column">
          <div className="focus-column-header">
            <div className="focus-column-header-top">
              <span className="focus-column-title">Overdue</span>
              <span className="focus-column-count">{focusOverdue.length}</span>
            </div>
            <div className="focus-column-bar" style={{ backgroundColor: '#c2542f' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {focusOverdue.map((t) => (
              <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                <div className="focus-task-title">
                  {t.description}
                  <RecurrenceBadge recurrence={t.recurrence} />
                </div>
                <div className="focus-task-meta">
                  <span className="focus-task-project">{t.project}</span>
                  <span className="focus-task-date-red">Overdue • {t.deadlineFmt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Column */}
        <div className="focus-column">
          <div className="focus-column-header">
            <div className="focus-column-header-top">
              <span className="focus-column-title">Upcoming • 7d</span>
              <span className="focus-column-count">{focusUpcoming.length}</span>
            </div>
            <div className="focus-column-bar" style={{ backgroundColor: '#c68a2e' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {focusUpcoming.map((t) => (
              <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                <div className="focus-task-title">
                  {t.description}
                  <RecurrenceBadge recurrence={t.recurrence} />
                </div>
                <div className="focus-task-meta">
                  <span className="focus-task-project">{t.project}</span>
                  <span className="focus-task-date-gold">Due • {t.deadlineFmt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Blocked Column */}
        <div className="focus-column">
          <div className="focus-column-header">
            <div className="focus-column-header-top">
              <span className="focus-column-title">Blocked</span>
              <span className="focus-column-count">{focusBlocked.length}</span>
            </div>
            <div className="focus-column-bar" style={{ backgroundColor: '#c2542f' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {focusBlocked.map((t) => (
              <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                <div className="focus-task-title">
                  {t.description}
                  <RecurrenceBadge recurrence={t.recurrence} />
                </div>
                <div className="focus-task-meta">
                  <span className="focus-task-project">{t.project}</span>
                  {t.deadline && (
                    <span className="focus-task-date-gray">{t.deadlineFmt}</span>
                  )}
                </div>
                <div className="focus-badge-container">
                  <span className="focus-badge badge-blocked">Blocked</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Column */}
        <div className="focus-column">
          <div className="focus-column-header">
            <div className="focus-column-header-top">
              <span className="focus-column-title">Suggested Next</span>
              <span className="focus-column-count">{focusSuggested.length}</span>
            </div>
            <div className="focus-column-bar" style={{ backgroundColor: '#d8f24a' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {focusSuggested.map((t) => (
              <div key={t._id} onClick={() => openEditTask(t)} className="focus-task-card">
                <div className="focus-task-title">
                  {t.description}
                  <RecurrenceBadge recurrence={t.recurrence} />
                </div>
                <div className="focus-task-meta">
                  <span className="focus-task-project">{t.project}</span>
                  <span className="focus-task-priority">
                    <span className="focus-priority-dot" style={{ backgroundColor: urgencyColor[t.urgency] }}></span>
                    {urgencyLabel[t.urgency]}
                  </span>
                </div>
                {t.status === 'doing' && (
                  <div className="focus-badge-container">
                    <span className="focus-badge badge-in-progress">In progress</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
