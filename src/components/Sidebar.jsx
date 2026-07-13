import { accent } from '../lib/constants.js';

export default function Sidebar({ tabs, setView, mobileMenuOpen, setMobileMenuOpen, openNewTask, signOut }) {
  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span className="mobile-title">Task Manager</span>
        </div>
        <button className="mobile-new-task-btn" onClick={openNewTask}>
          + New Task
        </button>
      </div>

      {/* Sidebar Drawer Overlay for Mobile */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ marginBottom: '52px' }}>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '27px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Task Manager
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'rgba(247, 242, 232, 0.4)',
              marginTop: '5px',
            }}
          >
            PERSONAL TASK RECORD
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setView(tab.key);
                setMobileMenuOpen(false);
              }}
              className={`sidebar-tab ${tab.active ? 'active' : 'inactive'}`}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '3px',
                  height: '16px',
                  borderRadius: '2px',
                  marginRight: '12px',
                  verticalAlign: 'middle',
                  backgroundColor: tab.active ? accent : 'transparent',
                }}
              ></span>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{tab.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            openNewTask();
            setMobileMenuOpen(false);
          }}
          className="cta-btn"
          style={{ marginBottom: '12px' }}
        >
          + New Task
        </button>

        <button
          onClick={signOut}
          className="logout-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Log Out
        </button>
      </div>
    </>
  );
}
