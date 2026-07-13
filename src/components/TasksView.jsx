export default function TasksView({ filters, setFilters, decoratedFiltered, tasks, projects, openEditTask }) {
  const activeFilters = [];
  if (filters.project !== 'all') activeFilters.push({ key: 'project', label: `Project: ${filters.project}` });
  if (filters.urgency !== 'all') activeFilters.push({ key: 'urgency', label: `Urgency: ${filters.urgency}` });
  if (filters.status !== 'active') {
    const statusLabels = { all: 'All Status', todo: 'To Do', doing: 'Doing', blocked: 'Blocked', done: 'Done' };
    activeFilters.push({ key: 'status', label: `Status: ${statusLabels[filters.status] || filters.status}` });
  }
  if (filters.type && filters.type !== 'all') {
    const typeLabels = { tasks: 'Tasks Only', reminders: 'Reminders Only' };
    activeFilters.push({ key: 'type', label: `Type: ${typeLabels[filters.type]}` });
  }

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
        01 — ALL RECORDS
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
          Tasks
        </div>
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '12px',
            color: 'rgba(33, 29, 58, 0.45)',
          }}
        >
          {decoratedFiltered.length} OF {tasks.length} SHOWN
        </div>
      </div>
      <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '28px' }}></div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search tasks…"
          style={{
            flex: 1,
            minWidth: '220px',
            height: '42px',
            boxSizing: 'border-box',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(33, 29, 58, 0.16)',
            backgroundColor: '#fff',
            fontSize: '14px',
            color: '#211d3a',
            outline: 'none',
          }}
        />
        <select
          value={filters.project}
          onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))}
          style={{
            height: '42px',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(33, 29, 58, 0.16)',
            backgroundColor: '#fff',
            fontSize: '14px',
            color: '#211d3a',
          }}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filters.urgency}
          onChange={(e) => setFilters((f) => ({ ...f, urgency: e.target.value }))}
          style={{
            height: '42px',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(33, 29, 58, 0.16)',
            backgroundColor: '#fff',
            fontSize: '14px',
            color: '#211d3a',
          }}
        >
          <option value="all">All Urgency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          style={{
            height: '42px',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(33, 29, 58, 0.16)',
            backgroundColor: '#fff',
            fontSize: '14px',
            color: '#211d3a',
          }}
        >
          <option value="active">Active Tasks</option>
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="doing">Doing</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
        <select
          value={filters.type || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          style={{
            height: '42px',
            boxSizing: 'border-box',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(33, 29, 58, 0.16)',
            backgroundColor: '#fff',
            fontSize: '14px',
            color: '#211d3a',
          }}
        >
          <option value="all">All Types</option>
          <option value="tasks">Tasks Only</option>
          <option value="reminders">Reminders Only</option>
        </select>
      </div>

      {/* Active Filters Warning Banner */}
      {activeFilters.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: 'rgba(33, 29, 58, 0.04)',
            border: '1px solid rgba(33, 29, 58, 0.1)',
            marginBottom: '28px',
            fontSize: '14px',
            color: '#211d3a',
            fontFamily: 'inherit',
            animation: 'fadeInUp 0.3s ease',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', opacity: 0.65 }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span style={{ marginRight: '4px' }}>Showing filtered tasks:</span>
            {activeFilters.map((f) => (
              <span
                key={f.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(33, 29, 58, 0.08)',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#211d3a',
                }}
              >
                {f.label}
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, [f.key]: f.key === 'status' ? 'active' : 'all' }))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#c2542f',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, project: 'all', urgency: 'all', status: 'active', type: 'all' }))}
            style={{
              background: 'none',
              border: 'none',
              color: '#c2542f',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => (e.target.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            Clear all
          </button>
        </div>
      )}

      {/* List Table */}
      <div style={{ overflowX: 'auto' }}>
        <div className="task-table-header">
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>STATUS</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>TASK</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>PROJECT</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>URGENCY</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>DEADLINE</span>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '10.5px', letterSpacing: '0.08em', color: 'rgba(33, 29, 58, 0.45)' }}>AGE</span>
        </div>
        {decoratedFiltered.map((t) => (
          <div key={t._id} onClick={() => openEditTask(t)} className={`task-row ${t.overdue ? 'overdue' : ''}`}>
            <span style={t.statusPillStyle}>{t.statusLabelText}</span>
            <span className="task-desc">
              <span style={{ verticalAlign: 'middle' }}>
                {t.dateType === 'reminder' && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b4fbb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                )}
                {t.description}
              </span>
              {t.recurrence && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  marginLeft: '8px',
                  fontSize: '9.5px',
                  color: '#6b4fbb',
                  backgroundColor: 'rgba(107, 79, 187, 0.08)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: '700',
                  verticalAlign: 'middle',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  {t.recurrence}
                </span>
              )}
            </span>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '11.5px', color: 'rgba(33, 29, 58, 0.55)' }}>{t.project}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.65)' }}>
              <span style={t.urgencyDotStyle}></span>
              {t.urgencyLabelText}
            </span>
            <span style={{ ...t.deadlineTextStyle, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
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
            <span title={t.dateAddedFmt} style={{ fontSize: '12.5px', color: 'rgba(33, 29, 58, 0.5)' }}>{t.ageFmt}</span>
          </div>
        ))}
        {decoratedFiltered.length === 0 && (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              color: 'rgba(33, 29, 58, 0.4)',
              fontSize: '15px',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            No tasks match these filters.
          </div>
        )}
      </div>
    </div>
  );
}
