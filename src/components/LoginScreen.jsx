export default function LoginScreen({ authError, signInButtonRef }) {
  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">Task Manager</div>
        <div className="login-tagline">Personal Task Record</div>

        <h1 className="login-title">Sign In</h1>
        <p className="login-description">
          This is a private personal task record application. Please sign in with your authorized Google account to proceed.
        </p>

        {authError && (
          <div className="login-error">
            {authError}
          </div>
        )}

        <div className="login-google-container">
          <div ref={signInButtonRef}></div>
        </div>
      </div>
    </div>
  );
}
