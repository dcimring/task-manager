export default function ProjectsView({
  projectStats,
  editingProject,
  setEditingProject,
  saveProjectEdit,
  goToProjectTasks,
  projectForm,
  setProjectForm,
  addProjectQuick,
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
        03 — PORTFOLIO
      </div>
      <div className="page-title" style={{ marginBottom: '28px' }}>
        Projects
      </div>
      <div style={{ height: '1px', backgroundColor: 'rgba(33, 29, 58, 0.14)', marginBottom: '32px' }}></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px' }}>
        {projectStats.map((p) => (
          <div key={p._id} className="project-card">
            {editingProject && editingProject.id === p._id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                <div>
                  <div
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      color: 'rgba(33, 29, 58, 0.4)',
                      marginBottom: '8px',
                    }}
                  >
                    EDIT PROJECT
                  </div>
                  <input
                    value={editingProject.name}
                    onChange={(e) => setEditingProject((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Project name"
                    style={{
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(33, 29, 58, 0.16)',
                      fontSize: '13px',
                      width: '100%',
                      fontFamily: 'inherit',
                      marginBottom: '8px',
                    }}
                  />
                  <textarea
                    value={editingProject.description}
                    onChange={(e) => setEditingProject((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description (optional)"
                    rows={3}
                    style={{
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(33, 29, 58, 0.16)',
                      fontSize: '13px',
                      width: '100%',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    onClick={saveProjectEdit}
                    style={{
                      flex: 1,
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#211d3a',
                      color: '#f7f2e8',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingProject(null)}
                    style={{
                      flex: 1,
                      padding: '9px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(33, 29, 58, 0.16)',
                      background: 'none',
                      color: '#211d3a',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      color: 'rgba(33, 29, 58, 0.4)',
                      marginBottom: '8px',
                    }}
                  >
                    PROJECT
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '25px', fontWeight: 600 }}>{p.name}</div>
                  {p.hasDescription && (
                    <div style={{ fontSize: '13px', color: 'rgba(33, 29, 58, 0.55)', marginTop: '6px' }}>{p.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'rgba(33, 29, 58, 0.55)', flexWrap: 'wrap' }}>
                  <span>{p.todo} todo</span>
                  <span>{p.doing} doing</span>
                  <span>{p.done} done</span>
                  <span>{p.blocked} blocked</span>
                  {p.overdue > 0 && (
                    <span style={{ color: '#c1493f', fontWeight: 'bold' }}>{p.overdue} overdue</span>
                  )}
                </div>
                <div style={{ borderTop: '1px solid rgba(33, 29, 58, 0.1)', paddingTop: '16px' }}>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '44px', fontWeight: 700, lineHeight: 1 }}>
                    {p.completionRate}%
                  </div>
                  <div
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      fontSize: '10px',
                      letterSpacing: '0.08em',
                      color: 'rgba(33, 29, 58, 0.4)',
                      marginTop: '6px',
                    }}
                  >
                    COMPLETE · {p.total} TASKS
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                  <button
                    onClick={() => goToProjectTasks(p.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#211d3a',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px',
                    }}
                  >
                    View tasks →
                  </button>
                  <button
                    onClick={() => setEditingProject({ id: p._id, name: p.name, description: p.description || '' })}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'rgba(33, 29, 58, 0.55)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px',
                    }}
                  >
                    Edit project
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        <div
          style={{
            border: '1.5px dashed rgba(33, 29, 58, 0.25)',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
          }}
        >
          {projectForm.show ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <input
                value={projectForm.name}
                onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Project name"
                style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid rgba(33, 29, 58, 0.16)', fontSize: '13px' }}
              />
              <input
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid rgba(33, 29, 58, 0.16)', fontSize: '13px' }}
              />
              <button
                onClick={addProjectQuick}
                style={{
                  padding: '9px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#211d3a',
                  color: '#f7f2e8',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add project
              </button>
            </div>
          ) : (
            <button
              onClick={() => setProjectForm((f) => ({ ...f, show: true }))}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '15px',
                color: 'rgba(33, 29, 58, 0.5)',
                cursor: 'pointer',
              }}
            >
              + Add project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
