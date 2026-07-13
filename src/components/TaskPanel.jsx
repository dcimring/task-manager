import { secondaryAccent, urgencyColor, urgencyLabel, statusMeta } from '../lib/constants.js';
import { fmtDate } from '../lib/dates.js';

export default function TaskPanel({ panel, projects, updateDraft, closePanel, saveTask, deleteTask }) {
  const stopClick = (e) => e.stopPropagation();

  const panelView = {
    description: panel.draft.description,
    project: panel.draft.project,
    deadline: panel.draft.deadline,
    recurrence: panel.draft.recurrence || null,
    addedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateAdded) : null,
    startedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateStarted) : null,
    completedFmt: panel.mode === 'edit' ? fmtDate(panel.draft.dateCompleted) : null,
  };

  const urgencyOptions = ['high', 'medium', 'low'].map((u) => {
    const active = panel.draft.urgency === u;
    return {
      value: u,
      label: urgencyLabel[u],
      style: {
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1.5px solid ' + urgencyColor[u],
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: active ? urgencyColor[u] : 'transparent',
        color: active ? '#fff' : urgencyColor[u],
      },
    };
  });

  const statusOptions = ['todo', 'doing', 'blocked', 'done'].map((s) => {
    const active = panel.draft.status === s;
    return {
      value: s,
      label: statusMeta[s].label,
      style: {
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1.5px solid ' + statusMeta[s].color,
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        backgroundColor: active ? statusMeta[s].color : 'transparent',
        color: active ? '#fff' : statusMeta[s].color,
      },
    };
  });

  return (
    <>
      <div
        onClick={closePanel}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(33, 29, 58, 0.4)',
          zIndex: 30,
        }}
      ></div>
      <div
        onClick={stopClick}
        className="task-panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '26px', fontWeight: 600 }}>
            {panel.mode === 'edit' ? 'Edit Task' : 'New Task'}
          </div>
          <button
            onClick={closePanel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              color: 'rgba(33, 29, 58, 0.5)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '7px',
            }}
          >
            DESCRIPTION
          </div>
          <textarea
            value={panelView.description}
            onChange={(e) => updateDraft('description', e.target.value)}
            rows="3"
            placeholder="What needs doing?"
            style={{
              width: '100%',
              padding: '11px 13px',
              borderRadius: '9px',
              border: '1px solid rgba(33, 29, 58, 0.18)',
              fontSize: '15px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          ></textarea>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '7px',
            }}
          >
            PROJECT
          </div>
          <input
            value={panelView.project}
            onChange={(e) => updateDraft('project', e.target.value)}
            list="project-options"
            placeholder="General"
            style={{
              width: '100%',
              height: '41px',
              boxSizing: 'border-box',
              padding: '10px 13px',
              borderRadius: '9px',
              border: '1px solid rgba(33, 29, 58, 0.18)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <datalist id="project-options">
            {projects.map((p) => (
              <option key={p._id} value={p.name}>
                {p.name}
              </option>
            ))}
          </datalist>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '7px',
            }}
          >
            URGENCY
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {urgencyOptions.map((opt) => (
              <button key={opt.value} onClick={() => updateDraft('urgency', opt.value)} style={opt.style}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '7px',
            }}
          >
            <div
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: '10.5px',
                letterSpacing: '0.08em',
                color: 'rgba(33, 29, 58, 0.45)',
              }}
            >
              DATE (OPTIONAL)
            </div>
            {panel.draft.deadline && (
              <button
                type="button"
                onClick={() => {
                  updateDraft('deadline', '');
                  updateDraft('recurrence', null);
                  updateDraft('dateType', 'deadline');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#c1493f',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
          <input
            type="date"
            value={panelView.deadline}
            onChange={(e) => {
              const val = e.target.value;
              updateDraft('deadline', val);
              if (!val) {
                updateDraft('recurrence', null);
              }
            }}
            style={{
              width: '100%',
              height: '41px',
              boxSizing: 'border-box',
              padding: '10px 13px',
              borderRadius: '9px',
              border: '1px solid rgba(33, 29, 58, 0.18)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {panel.draft.deadline && (
            <div style={{ marginTop: '10px' }}>
              <div
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'rgba(33, 29, 58, 0.45)',
                  marginBottom: '7px',
                }}
              >
                DATE PURPOSE
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => updateDraft('dateType', 'deadline')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid ' + (panel.draft.dateType !== 'reminder' ? '#211d3a' : 'rgba(33, 29, 58, 0.18)'),
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: panel.draft.dateType !== 'reminder' ? '#211d3a' : 'transparent',
                    color: panel.draft.dateType !== 'reminder' ? '#fff' : '#211d3a',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Task Deadline
                </button>
                <button
                  type="button"
                  onClick={() => updateDraft('dateType', 'reminder')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid ' + (panel.draft.dateType === 'reminder' ? '#211d3a' : 'rgba(33, 29, 58, 0.18)'),
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: panel.draft.dateType === 'reminder' ? '#211d3a' : 'transparent',
                    color: panel.draft.dateType === 'reminder' ? '#fff' : '#211d3a',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Reminder Alert
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '7px',
            }}
          >
            REPEAT (REQUIRES DATE)
          </div>
          <select
            value={panelView.recurrence || 'none'}
            disabled={!panelView.deadline}
            onChange={(e) => {
              const val = e.target.value;
              updateDraft('recurrence', val === 'none' ? null : val);
            }}
            style={{
              width: '100%',
              height: '41px',
              boxSizing: 'border-box',
              padding: '10px 13px',
              borderRadius: '9px',
              border: '1px solid rgba(33, 29, 58, 0.18)',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: panelView.deadline ? '#fff' : 'rgba(33, 29, 58, 0.05)',
              color: panelView.deadline ? '#211d3a' : 'rgba(33, 29, 58, 0.45)',
              cursor: panelView.deadline ? 'pointer' : 'not-allowed',
            }}
          >
            <option value="none">No Repeat</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          {!panelView.deadline && (
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(33, 29, 58, 0.45)',
                marginTop: '5px',
                fontStyle: 'italic',
              }}
            >
              Set a deadline date to enable repeat options.
            </div>
          )}
        </div>

        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10.5px',
              letterSpacing: '0.08em',
              color: 'rgba(33, 29, 58, 0.45)',
              marginBottom: '7px',
            }}
          >
            STATUS
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {statusOptions.map((opt) => (
              <button key={opt.value} onClick={() => updateDraft('status', opt.value)} style={opt.style}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {panel.mode === 'edit' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(33, 29, 58, 0.1)',
            }}
          >
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.45)' }}>
              ADDED · {panelView.addedFmt}
            </div>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.45)' }}>
              STARTED · {panelView.startedFmt}
            </div>
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11px', color: 'rgba(33, 29, 58, 0.45)' }}>
              COMPLETED · {panelView.completedFmt}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
          <button onClick={saveTask} className="cta-btn" style={{ flex: 1, marginTop: 0 }}>
            Save Task
          </button>
          {panel.mode === 'edit' && (
            <button
              onClick={deleteTask}
              style={{
                padding: '11px 18px',
                borderRadius: '9px',
                border: '1.5px solid ' + secondaryAccent,
                background: 'none',
                color: secondaryAccent,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}
