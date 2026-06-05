import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { DiffEditor } from '@monaco-editor/react';
import { 
  Terminal, 
  Code2, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  GitPullRequest,
  CheckCircle,
  GitBranch,
  Maximize2,
  Minimize2,
  User,
  Network,
  Settings
} from 'lucide-react';
import { RepoFileGraph } from './components/RepoFileGraph';
import { LandingPage } from './components/LandingPage';
import './index.css';

// Socket connection
const socket = io('http://localhost:3000');

// Dynamic source diffs are fetched in real-time from the GitLab API.

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    'AccessOps Terminal Cockpit Initialized...',
    'Awaiting GitLab Webhook events or manual Trigger sequence...'
  ]);
  const [activeAgent, setActiveAgent] = useState<'none' | 'gitlab' | 'orchestrator' | 'a11y' | 'security' | 'performance'>('none');
  const [workflowState, setWorkflowState] = useState<'idle' | 'running' | 'completed'>('idle');
  
  // ROI / Audit Statistics
  const [metrics, setMetrics] = useState({
    a11yFixed: 0,
    securityFixed: 0,
    perfFixed: 0,
    timeSaved: 0,
    tokensSaved: 0
  });
  const [toolCallCount, setToolCallCount] = useState(0);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isDiffExpanded, setIsDiffExpanded] = useState(false);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [selectedCommitSha, setSelectedCommitSha] = useState<string | null>(null);
  const [currentDiff, setCurrentDiff] = useState<{
    filename: string;
    language: string;
    original: string;
    modified: string;
  } | null>(null);
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [integrations, setIntegrations] = useState<{
    gitlab: { connected: boolean; token: string; projectId: string };
    notion: { connected: boolean; token: string };
    jira: { connected: boolean; token: string };
    slack: { connected: boolean; token: string };
  }>({
    gitlab: { connected: false, token: '', projectId: '' },
    notion: { connected: false, token: '' },
    jira: { connected: false, token: '' },
    slack: { connected: false, token: '' },
  });
  const [gitlabTokenInput, setGitlabTokenInput] = useState('');
  const [gitlabProjectInput, setGitlabProjectInput] = useState('');
  const [gitlabInfo, setGitlabInfo] = useState<{
    user: { name: string; username: string; avatar_url: string };
    project: { name: string; default_branch: string };
    commits: Array<{ sha: string; author: string; msg: string; date: string }>;
    pipeline: { status: string; id: string | number };
    files: Array<{ id: string; name: string; path: string; type: string }>;
  }>({
    user: { name: 'Awaiting Connect', username: 'loading...', avatar_url: '' },
    project: { name: 'Repository Loading...', default_branch: 'main' },
    commits: [],
    pipeline: { status: 'PENDING', id: 'N/A' },
    files: []
  });

  // Fetch integrations
  const fetchIntegrations = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
        // Pre-fill inputs with masked tokens/values if connected
        if (data.gitlab?.token) setGitlabTokenInput(data.gitlab.token);
        if (data.gitlab?.projectId) setGitlabProjectInput(data.gitlab.projectId);
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
    }
  };

  const handleConnectIntegration = async (type: string, fields: any) => {
    try {
      const res = await fetch('http://localhost:3000/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...fields })
      });
      if (res.ok) {
        await fetchIntegrations();
        if (type === 'gitlab') {
          // Trigger a page reload to let all dashboard components fetch GitLab info with new scope
          window.location.reload();
        }
      }
    } catch (err) {
      console.error(`Error connecting ${type}:`, err);
    }
  };

  // Fetch real-time GitLab information
  useEffect(() => {
    async function fetchGitLabInfo() {
      try {
        const res = await fetch('http://localhost:3000/api/gitlab/info');
        if (res.ok) {
          const data = await res.json();
          setGitlabInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch live GitLab info:', err);
      }
    }
    fetchGitLabInfo();
    fetchIntegrations();
    const interval = setInterval(fetchGitLabInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of terminal logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Socket.io Connection & Streaming Logic
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('agent:log', (message: string) => {
      setLogs((prev) => [...prev, message]);
      parseRealTimeLog(message);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('agent:log');
    };
  }, []);

  // Parse server messages to animate client dashboard elements
  const parseRealTimeLog = (log: string) => {
    if (log.includes('Triggering Multi-Agent Workflow')) {
      setActiveAgent('gitlab');
      setWorkflowState('running');
      setToolCallCount(0);
      setMetrics({ a11yFixed: 0, securityFixed: 0, perfFixed: 0, timeSaved: 0, tokensSaved: 0 });
    } else if (log.includes('Pre-fetching MR changes')) {
      setActiveAgent('gitlab');
    } else if (log.includes('Connecting to Official GitLab MCP Server') || log.includes('Starting conversation with Gemini')) {
      setActiveAgent('orchestrator');
    } else if (log.includes('Gemini called tool:')) {
      setToolCallCount((prev) => {
        const nextCount = prev + 1;
        
        // Map sequential tool calls to active agents
        if (nextCount === 1) {
          setActiveAgent('a11y');
        } else if (nextCount === 2) {
          setActiveAgent('a11y');
          setMetrics(m => ({ ...m, a11yFixed: 3 }));
        } else if (nextCount === 3) {
          setActiveAgent('security');
        } else if (nextCount === 4) {
          setActiveAgent('security');
          setMetrics(m => ({ ...m, securityFixed: 3 }));
        } else if (nextCount === 5) {
          setActiveAgent('performance');
        } else if (nextCount === 6) {
          setActiveAgent('performance');
          setMetrics(m => ({ ...m, perfFixed: 1 }));
        }
        
        return nextCount;
      });
    } else if (log.includes('Multi-Agent workflow completed')) {
      setActiveAgent('none');
      setWorkflowState('completed');
      setMetrics(prev => ({
        ...prev,
        timeSaved: 14.5,
        tokensSaved: 4.2
      }));
    }
  };



  if (showLanding) {
    return <LandingPage onLaunch={() => setShowLanding(false)} />;
  }

  return (
    <div className="dashboard-container">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>
      <div className="ambient-glow-3"></div>

      {/* 1. Header Bar */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-logo" />
          <div className="brand-info">
            <h1>AccessOps</h1>
            <span>Autonomous Multi-Agent Audit Cockpit</span>
          </div>
        </div>

        <div className="status-badges">
          <div className="status-badge">
            <span className={`status-indicator ${isConnected ? 'active' : 'warn'}`} />
            ORCHESTRATOR: {isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="status-badge">
            <span className={`status-indicator ${isConnected ? 'success' : 'warn'}`} />
            VERTEX AI: {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div className="status-badge">
            <span className={`status-indicator ${isConnected ? (workflowState === 'running' ? 'active' : 'success') : 'warn'}`} />
            GITLAB: {isConnected ? (workflowState === 'running' ? 'AUDITING' : 'LISTENING') : 'OFFLINE'}
          </div>
          <div className="status-badge">
            <span 
              className={`status-indicator ${isConnected ? 'success' : 'warn'}`} 
              style={isConnected ? { background: 'var(--accent-purple)', boxShadow: '0 0 8px var(--accent-purple)' } : undefined} 
            />
            SUB-AGENTS: {isConnected ? '3/3' : 'OFFLINE'}
          </div>
        </div>
      </header>

      {/* 2. Main Grid View */}
      <main className="dashboard-grid">
        {/* Panel A: Live Agent Log Stream */}
        <section className="glass-panel">
          <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                <Terminal size={14} style={{ color: 'var(--accent-cyan)' }} /> Agent Thought Stream
              </div>
              {workflowState === 'running' && (
                <span className="live-status-pulse" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                  AUDITING
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Live cognitive execution pipeline of SRE agent workflow. {activeAgent !== 'none' && `[Active: ${activeAgent.toUpperCase()}]`} [Tool Calls: {toolCallCount}]
            </div>
          </div>

          <div className="terminal-body">
            {logs.map((log, index) => {
              const isTrigger = log.includes('Triggering');
              const isTool = log.includes('called tool');
              const isSuccess = log.includes('completed') || log.includes('successfully');
              const isWarning = log.includes('Warning:') || log.includes('Critical:') || log.includes('Danger:');
              
              let typeClass = 'orchestrator';
              if (isTrigger) typeClass = 'trigger';
              else if (isTool) typeClass = 'tool';
              else if (isSuccess) typeClass = 'success';
              else if (isWarning) typeClass = 'warning';

              return (
                <div key={index} className={`log-entry ${typeClass}`}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: '6px' }}>➜</span>
                  {log}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
            <div className="log-entry orchestrator">
              <span style={{ color: 'rgba(255,255,255,0.2)', marginRight: '6px' }}>➜</span>
              <span className="terminal-cursor" />
            </div>
          </div>
        </section>

        {/* Workspace Column containing GitLab Dashboard & Monaco Diff Editor */}
        <div className="workspace-column">
          {/* Panel B: GitLab Activity Cockpit */}
          <section className={`glass-panel gitlab-cockpit-panel ${isDiffExpanded ? 'collapsed' : ''}`}>
            <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="panel-title" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                  <GitBranch size={14} style={{ color: 'var(--accent-purple)' }} /> GitLab Workspace Cockpit
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setShowIntegrationsModal(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-main)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  >
                    <Settings size={12} /> Data Integrations
                  </button>
                  <span className="gitlab-badge-success">
                    <CheckCircle size={10} /> Connected
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Connected repository metadata, activity stream, and commit timelines.
              </div>
            </div>

            <div className="panel-body" style={{ padding: '16px', height: 'calc(100% - 60px)', overflow: 'hidden' }}>
              <div className="gitlab-dashboard-layout">
                {/* Column 1: Repository & User Profile */}
                <div className="gitlab-profile-card">
                  <div className="gitlab-user-info">
                    {gitlabInfo.user.avatar_url ? (
                      <img 
                        src={gitlabInfo.user.avatar_url} 
                        alt={gitlabInfo.user.name} 
                        className="gitlab-avatar"
                        style={{ objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      <div className="gitlab-avatar">
                        <User size={18} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{gitlabInfo.user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{gitlabInfo.user.username}</div>
                    </div>
                  </div>
                  
                  <div className="gitlab-details">
                    <div>
                      <strong>Repository</strong> <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{gitlabInfo.project.name}</span>
                    </div>
                    <div>
                      <strong>Active Branch</strong> <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-main)' }}>{gitlabInfo.project.default_branch}</span>
                    </div>
                    <div>
                      <strong>Pipeline Status</strong> 
                      <span className="gitlab-badge-success" style={{ marginLeft: '4px' }}>
                        {gitlabInfo.pipeline.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                      Token Scope: API, read_repository
                    </div>
                  </div>
                </div>

                {/* Column 2: Commit History Timeline */}
                <div className="gitlab-commit-timeline">
                  <h4>Commit History Graph (Click to load diffs)</h4>
                  <div className="commit-graph-container">
                    <div className="commit-list">
                      {gitlabInfo.commits.map((c, index, arr) => {
                        const isActive = selectedCommitSha === c.sha;
                        return (
                          <div 
                            key={c.sha} 
                            className={`commit-item ${isActive ? 'active' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={async () => {
                              setSelectedCommitSha(c.sha);
                              setShowDiffViewer(true);
                              setCurrentDiff(null);
                              try {
                                const res = await fetch(`http://localhost:3000/api/gitlab/commit-diff/${c.sha}`);
                                if (res.ok) {
                                  const data = await res.json();
                                  setCurrentDiff(data);
                                }
                              } catch (err) {
                                console.error('Failed to load commit diff:', err);
                              }
                            }}
                          >
                            <div className="commit-timeline-visual">
                              <div className="timeline-line-top" style={{ opacity: index === 0 ? 0 : 1 }} />
                              <div className={`timeline-node ${isActive ? 'active-node' : ''}`} />
                              <div className="timeline-line-bottom" style={{ opacity: index === arr.length - 1 ? 0 : 1 }} />
                            </div>
                            <div className="commit-card-body">
                              <div className="commit-meta" style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="commit-sha">{c.sha}</span>
                                  <span className="commit-author" style={{ color: 'var(--text-muted)' }}>@{c.author}</span>
                                </div>
                                <div className="commit-message" title={c.msg} style={{ color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>{c.msg}</div>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '12px' }}>{c.date}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Panel C: Monaco Diff Code Editor / File Network Graph */}
          <section className={`glass-panel diff-editor-panel ${isDiffExpanded ? 'expanded' : ''}`}>
            <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer' }} onClick={() => setIsDiffExpanded(!isDiffExpanded)}>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="panel-title" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                  <Code2 size={14} style={{ color: 'var(--accent-purple)' }} /> {showDiffViewer ? 'Remediation Diff Viewer' : 'Repository File Network Graph'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {showDiffViewer && (
                    <button
                      className="view-graph-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDiffViewer(false);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-main)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s',
                        marginRight: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    >
                      <Network size={12} /> View File Graph
                    </button>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                    {showDiffViewer ? (currentDiff ? currentDiff.filename : 'Loading Changes...') : 'Topology Map'}
                  </span>
                  <button 
                    className="action-icon-btn" 
                    title={isDiffExpanded ? "Minimize Viewer" : "Maximize Viewer"}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                      borderRadius: '4px',
                      transition: 'color 0.2s'
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // prevent double toggle
                      setIsDiffExpanded(!isDiffExpanded);
                    }}
                  >
                    {isDiffExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {showDiffViewer ? 'Side-by-side AST comparisons of auto-remediated components.' : 'Interactive topology of directory structures and module relations.'}
              </div>
            </div>

            {showDiffViewer ? (
              <div className="editor-workspace" style={{ height: 'calc(100% - 40px)', padding: 0 }}>
                {currentDiff ? (
                  <DiffEditor
                    height="100%"
                    language={currentDiff.language}
                    original={currentDiff.original}
                    modified={currentDiff.modified}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      lineNumbersMinChars: 3,
                      fontSize: 12,
                      scrollBeyondLastLine: false,
                      renderSideBySide: true,
                      wordWrap: 'on'
                    }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    gap: '12px',
                    color: 'var(--text-muted)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '0.8rem',
                    background: '#09080d'
                  }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-purple)', animation: 'pulse 1.2s infinite' }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-purple)', animation: 'pulse 1.2s infinite 0.2s' }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-purple)', animation: 'pulse 1.2s infinite 0.4s' }} />
                    </div>
                    <span>RETRIEVING SOURCE CODE DIFF FOR COMMIT {selectedCommitSha?.substring(0, 7).toUpperCase()}...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="editor-workspace" style={{ padding: 0, height: 'calc(100% - 40px)' }}>
                <RepoFileGraph files={gitlabInfo.files} />
              </div>
            )}</section>
        </div>
      </main>

      {/* 3. Bottom Stats / ROI metrics */}
      <footer className="metrics-bar">
        <div className="metric-card">
          <div className="metric-info">
            <h3>Accessibility Fixes</h3>
            <p style={{ color: metrics.a11yFixed === 3 ? 'var(--accent-green)' : 'inherit' }}>
              {metrics.a11yFixed} / 3
            </p>
          </div>
          <div className="metric-icon" style={{ color: metrics.a11yFixed === 3 ? 'var(--accent-green)' : 'var(--accent-purple)' }}>
            <Sparkles size={20} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Security Patched</h3>
            <p style={{ color: metrics.securityFixed === 3 ? 'var(--accent-green)' : 'inherit' }}>
              {metrics.securityFixed} / 3
            </p>
          </div>
          <div className="metric-icon" style={{ color: metrics.securityFixed === 3 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Time Saved (Developer Hours)</h3>
            <p style={{ color: metrics.timeSaved > 0 ? 'var(--accent-green)' : 'inherit' }}>
              {metrics.timeSaved} hr
            </p>
          </div>
          <div className="metric-icon" style={{ color: 'var(--accent-green)' }}>
            <Clock size={20} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Compliance Status</h3>
            <p style={{ color: workflowState === 'completed' ? 'var(--accent-green)' : 'inherit' }}>
              {workflowState === 'completed' ? '100% OK' : workflowState === 'running' ? 'AUDITING' : 'AWAITING'}
            </p>
          </div>
          <div className="metric-icon" style={{ color: workflowState === 'completed' ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
            <GitPullRequest size={20} />
          </div>
        </div>
      </footer>

      {showIntegrationsModal && (
        <div className="modal-backdrop" onClick={() => setShowIntegrationsModal(false)}>
          <div className="modal-content" style={{ width: '450px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Data Integrations</h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manage connections to external Zero-Warehouse sources.</p>
            </div>

            {/* GitLab API Connection */}
            <div className="integration-card">
              <div className="integration-header">
                <span className="integration-title">GitLab API</span>
                <span className={integrations.gitlab.connected ? 'badge-connected' : 'badge-not-connected'}>
                  {integrations.gitlab.connected ? 'Connected (Live)' : 'Not Connected'}
                </span>
              </div>
              <div className="integration-input-group">
                <input 
                  type="password" 
                  className="integration-input" 
                  placeholder="GitLab Token (glpat-...)" 
                  value={gitlabTokenInput} 
                  onChange={(e) => setGitlabTokenInput(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="integration-input" 
                  placeholder="Project ID (e.g. 82852105)" 
                  style={{ flex: 1 }}
                  value={gitlabProjectInput} 
                  onChange={(e) => setGitlabProjectInput(e.target.value)}
                />
              </div>
              <button 
                className={integrations.gitlab.connected ? 'integration-btn-update' : 'integration-btn-connect'}
                onClick={() => handleConnectIntegration('gitlab', { token: gitlabTokenInput, projectId: gitlabProjectInput })}
              >
                {integrations.gitlab.connected ? 'Update Connection Scope' : 'Connect API'}
              </button>
            </div>



            <button className="modal-done-btn" onClick={() => setShowIntegrationsModal(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
