export default function ReminderToasts({ activeReminders, saveTaskMutation, snoozeReminder, moveTaskStatus }) {
  return (
    <>
      {activeReminders.map((r, idx) => (
        <div
          key={r._id}
          className="active-reminders-toast"
          style={{
            bottom: `${24 + idx * 170}px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#d8f24a'
                }} />
              </div>
              <span style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '10.5px',
                fontWeight: '600',
                letterSpacing: '0.12em',
                color: 'rgba(247, 242, 232, 0.45)',
              }}>
                REMINDER
              </span>
            </div>
            <span style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              color: '#d8f24a',
            }}>
              {r.project}
            </span>
          </div>

          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '19px',
            color: '#ffffff',
            lineHeight: 1.35,
            margin: '12px 0 18px 0',
            fontWeight: 500,
          }}>
            {r.description}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => saveTaskMutation({
                _id: r._id,
                description: r.description,
                project: r.project,
                urgency: r.urgency,
                status: r.status,
                deadline: r.deadline,
                recurrence: r.recurrence || null,
                dateType: 'deadline'
              })}
              style={{
                backgroundColor: '#d8f24a',
                color: '#211d3a',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Make task
            </button>
            <button
              onClick={() => snoozeReminder(r)}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Snooze
            </button>
            <button
              onClick={() => moveTaskStatus(r._id, 'done')}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
