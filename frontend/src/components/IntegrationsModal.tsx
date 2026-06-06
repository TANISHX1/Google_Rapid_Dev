interface IntegrationsModalProps {
  show: boolean;
  integrations: {
    gitlab: { connected: boolean; token: string; projectId: string };
    google: { connected: boolean; clientEmail: string; sheetId: string; docId: string };
    notion: { connected: boolean; token: string };
    jira: { connected: boolean; token: string };
    slack: { connected: boolean; token: string };
  };
  gitlabTokenInput: string;
  gitlabProjectInput: string;
  googleEmailInput: string;
  googleKeyInput: string;
  googleSheetInput: string;
  onClose: () => void;
  onGitlabTokenChange: (val: string) => void;
  onGitlabProjectChange: (val: string) => void;
  onGoogleEmailChange: (val: string) => void;
  onGoogleKeyChange: (val: string) => void;
  onGoogleSheetChange: (val: string) => void;
  onConnect: (type: string, fields: any) => void;
}

export function IntegrationsModal({
  show, integrations,
  gitlabTokenInput, gitlabProjectInput,
  googleEmailInput, googleKeyInput, googleSheetInput,
  onClose,
  onGitlabTokenChange, onGitlabProjectChange,
  onGoogleEmailChange, onGoogleKeyChange, onGoogleSheetChange,
  onConnect
}: IntegrationsModalProps) {
  if (!show) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Data Integrations</h2>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manage connections to external Zero-Warehouse sources.</p>
        </div>

        {/* GitLab API */}
        <div className="integration-card">
          <div className="integration-header">
            <span className="integration-title">GitLab API</span>
            <span className={integrations.gitlab.connected ? 'badge-connected' : 'badge-not-connected'}>
              {integrations.gitlab.connected ? 'Connected (Live)' : 'Not Connected'}
            </span>
          </div>
          <div className="integration-input-group">
            <input type="password" className="integration-input" placeholder="GitLab Token (glpat-...)"
              value={gitlabTokenInput} onChange={(e) => onGitlabTokenChange(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="text" className="integration-input" placeholder="Project ID (e.g. 82852105)"
              style={{ flex: 1 }} value={gitlabProjectInput}
              onChange={(e) => onGitlabProjectChange(e.target.value)} />
          </div>
          <button className={integrations.gitlab.connected ? 'integration-btn-update' : 'integration-btn-connect'}
            onClick={() => onConnect('gitlab', { token: gitlabTokenInput, projectId: gitlabProjectInput })}>
            {integrations.gitlab.connected ? 'Update Connection Scope' : 'Connect API'}
          </button>
        </div>

        {/* Google Workspace */}
        <div className="integration-card">
          <div className="integration-header">
            <span className="integration-title">Google Workspace</span>
            <span className={integrations.google.connected ? 'badge-connected' : 'badge-not-connected'}>
              {integrations.google.connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Auto-logs compliance metrics to Google Sheets and generates a report in Google Docs.
          </div>
          <div className="integration-input-group">
            <input type="text" className="integration-input" placeholder="Service Account Email"
              value={googleEmailInput} onChange={(e) => onGoogleEmailChange(e.target.value)} />
          </div>
          <div className="integration-input-group">
            <input type="password" className="integration-input" placeholder="Private Key (PEM)"
              value={googleKeyInput} onChange={(e) => onGoogleKeyChange(e.target.value)} />
          </div>
          <div className="integration-input-group">
            <input type="text" className="integration-input" placeholder="Google Sheet ID (optional)"
              value={googleSheetInput} onChange={(e) => onGoogleSheetChange(e.target.value)} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '4px 0' }}>
            {integrations.google.docId
              ? `Compliance report Doc ID: ${integrations.google.docId}`
              : 'A new Google Doc will be created automatically on first workflow run.'}
          </div>
          <button className={integrations.google.connected ? 'integration-btn-update' : 'integration-btn-connect'}
            onClick={() => onConnect('google', { clientEmail: googleEmailInput, privateKey: googleKeyInput, sheetId: googleSheetInput })}>
            {integrations.google.connected ? 'Update Credentials' : 'Connect Google'}
          </button>
        </div>

        <button className="modal-done-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
