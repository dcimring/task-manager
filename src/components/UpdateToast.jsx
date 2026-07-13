export default function UpdateToast({ updateVersion, dismissedVersion, setDismissedVersion }) {
  if (!updateVersion || updateVersion === dismissedVersion) return null;

  return (
    <div className="update-toast">
      <div className="update-toast-content">
        <div className="update-toast-title">Update Available</div>
        <div className="update-toast-desc">A new version of this application is available.</div>
      </div>
      <div className="update-toast-actions">
        <button className="update-toast-btn" onClick={() => window.location.reload()}>
          Refresh
        </button>
        <button
          className="update-toast-close"
          onClick={() => setDismissedVersion(updateVersion)}
          title="Dismiss"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
