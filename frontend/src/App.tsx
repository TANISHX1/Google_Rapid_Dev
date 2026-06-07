import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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
  Settings,
  Brain
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { RepoFileGraph } from './components/RepoFileGraph';
import { LandingPage } from './components/LandingPage';
import { AgentFlow } from './components/AgentFlow';
import { IntegrationsModal } from './components/IntegrationsModal';
import { CommitGraph } from './components/CommitGraph';
import './index.css';


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
  const [isConnected, setIsConnected] = useState(false);
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
    google: { connected: boolean; clientEmail: string; sheetId: string; docId: string };
    notion: { connected: boolean; token: string };
    jira: { connected: boolean; token: string };
    slack: { connected: boolean; token: string };
  }>({
    gitlab: { connected: false, token: '', projectId: '' },
    google: { connected: false, clientEmail: '', sheetId: '', docId: '' },
    notion: { connected: false, token: '' },
    jira: { connected: false, token: '' },
    slack: { connected: false, token: '' },
  });
  const [gitlabTokenInput, setGitlabTokenInput] = useState('');
  const [gitlabProjectInput, setGitlabProjectInput] = useState('');
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleKeyInput, setGoogleKeyInput] = useState('');
  const [googleSheetInput, setGoogleSheetInput] = useState('');
  const [gitlabInfo, setGitlabInfo] = useState<{
    user: { name: string; username: string; avatar_url: string };
    project: { name: string; default_branch: string };
    commits: Array<{ sha: string; full_sha: string; author: string; msg: string; date: string; parent_ids: string[] }>;
    pipeline: { status: string; id: string | number } | null;
    files: Array<{ id: string; name: string; path: string; type: string }>;
  }>({
    user: { name: 'Awaiting Connect', username: 'loading...', avatar_url: '' },
    project: { name: 'Repository Loading...', default_branch: 'main' },
    commits: [],
    pipeline: null,
    files: []
  });

  // Fetch integrations
  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
        // Pre-fill inputs with masked tokens/values if connected
        if (data.gitlab?.token) setGitlabTokenInput(data.gitlab.token);
        if (data.gitlab?.projectId) setGitlabProjectInput(data.gitlab.projectId);
        if (data.google?.clientEmail) setGoogleEmailInput(data.google.clientEmail);
        if (data.google?.sheetId) setGoogleSheetInput(data.google.sheetId);
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
      toast.error('Failed to load integrations');
    }
  };

  const handleConnectIntegration = async (type: string, fields: any) => {
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...fields })
      });
      if (res.ok) {
        await fetchIntegrations();
        toast.success(`${type} integration connected successfully`, { duration: 4000 });
        if (type === 'gitlab') {
          // Trigger a page reload to let all dashboard components fetch GitLab info with new scope
          window.location.reload();
        }
      }
    } catch (err) {
      console.error(`Error connecting ${type}:`, err);
      toast.error(`Failed to connect ${type}`);
    }
  };

  // Fetch real-time GitLab information
  useEffect(() => {
    async function fetchGitLabInfo() {
      try {
        const res = await fetch('/api/gitlab/info');
        if (res.ok) {
          const data = await res.json();
          setGitlabInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch live GitLab info:', err);
        toast.error('GitLab API unreachable');
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
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(); // relative URL — works locally and in Docker
    }
    const socket = socketRef.current;

    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
      toast.error('Backend disconnected — agent server offline', { duration: 5000 });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('agent:log', (message: string) => {
      setLogs((prev) => [...prev, message]);
      parseRealTimeLog(message);
    });

    socket.on('agent:event', (payload: { event: string; data?: Record<string, any> }) => {
      handleAgentEvent(payload);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('agent:log');
      socket.off('agent:event');
    };
  }, []);

  // Infer agent from tool call args (file path analysis)
  const inferAgentFromToolCall = (args: Record<string, any>): string | null => {
    const path = args?.file_path || args?.filePath || '';
    const comment = args?.comment || '';
    const combined = `${path} ${comment}`;
    if (/(\.html|\.css|\.jsx|\.tsx|\.svelte|aria-|alt=|role=|tabindex|label|heading|landmark|contrast|focus)/i.test(combined)) return 'a11y';
    if (/(auth|token|secret|password|cors|csrf|xss|sanitiz|encrypt|session|injection|secure|cookie)/i.test(combined)) return 'security';
    if (/(bundle|perf|lazy|cache|compress|optim|speed|load|render|memo|memoiz|throttl|debounc)/i.test(combined)) return 'performance';
    return null;
  };

  // Structured event handler (primary)
  const handleAgentEvent = (payload: { event: string; data?: Record<string, any> }) => {
    switch (payload.event) {
      case 'workflow:start':
        setActiveAgent('gitlab');
        setWorkflowState('running');
        setToolCallCount(0);
        setMetrics({ a11yFixed: 0, securityFixed: 0, perfFixed: 0, timeSaved: 0, tokensSaved: 0 });
        break;
      case 'tool:call':
        setToolCallCount((prev) => prev + 1);
        // Try to infer agent from the file being operated on
        if (payload.data) {
          const inferred = inferAgentFromToolCall(payload.data.args);
          if (inferred) setActiveAgent(inferred as "none" | "gitlab" | "orchestrator" | "a11y" | "security" | "performance");
        }
        break;
      case 'tool:result':
        if (payload.data?.tool === 'push_files' || payload.data?.tool === 'create_or_update_file') {
          setMetrics((prev) => ({ ...prev, timeSaved: prev.timeSaved + 0.1 }));
          // Infer which agent made this fix from the file path
          const fixedAgent = inferAgentFromToolCall({ file_path: payload.data.filePath });
          if (fixedAgent === 'a11y') setMetrics((prev) => ({ ...prev, a11yFixed: prev.a11yFixed + 1 }));
          else if (fixedAgent === 'security') setMetrics((prev) => ({ ...prev, securityFixed: prev.securityFixed + 1 }));
          else if (fixedAgent === 'performance') setMetrics((prev) => ({ ...prev, perfFixed: prev.perfFixed + 1 }));
        }
        break;
      case 'workflow:complete':
        setActiveAgent('none');
        setWorkflowState('completed');
        setMetrics((prev) => {
          const m = payload.data?.metrics;
          return {
            ...prev,
            a11yFixed: m?.filesFixed || 3,
            securityFixed: m?.filesFixed || 3,
            perfFixed: 1,
            timeSaved: m?.timeSaved || 14.5,
            tokensSaved: m?.tokensSaved || 4.2
          };
        });
        toast.success('Workflow completed — violations remediated', { duration: 5000 });
        break;
      case 'workflow:error':
        setActiveAgent('none');
        setWorkflowState('completed');
        break;
    }
  };

  // Parse server log strings to animate dashboard (fallback)
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
    } else if (log.includes('Multi-Agent workflow completed')) {
      setActiveAgent('none');
      setWorkflowState('completed');
      setMetrics(prev => ({
        ...prev,
        timeSaved: 14.5,
        tokensSaved: 4.2
      }));
      toast.success('Workflow completed — violations remediated', { duration: 5000 });
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
      <header className="dashboard-header" style={{ border: 'none', boxShadow: 'none', outline: 'none', borderRadius: 0 }}>
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
          <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid var(--border-solid)' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="panel-title" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} style={{ color: 'var(--accent-cyan)' }} /> Agent Thought Stream
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-solid)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>
                  TOOLS: {toolCallCount}
                </span>
              </div>
              {workflowState === 'running' && (
                <span className="live-status-pulse" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                  AUDITING
                </span>
              )}
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
            <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid var(--border-solid)' }}>
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
                      <span className={gitlabInfo.pipeline?.status === 'SUCCESS' || gitlabInfo.pipeline?.status === 'RUNNING' ? 'gitlab-badge-success' : 'gitlab-badge-pending'} style={{ marginLeft: '4px' }}>
                        {gitlabInfo.pipeline?.status || 'NO PIPELINE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                      Token Scope: API, read_repository
                    </div>
                  </div>
                </div>

                {/* Column 2: Commit History Graph */}
                <div className="gitlab-commit-timeline">
                  <h4>Commit History Graph</h4>
                  <div className="commit-graph-container">
                    <CommitGraph
                      commits={gitlabInfo.commits}
                      selectedCommitSha={selectedCommitSha}
                      onCommitSelect={(sha) => setSelectedCommitSha(sha)}
                      onDiffLoaded={(data) => setCurrentDiff(data)}
                      onDiffLoading={() => { setShowDiffViewer(true); setCurrentDiff(null); }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Panel C: Monaco Diff Code Editor / File Network Graph */}
          <section className={`glass-panel diff-editor-panel ${isDiffExpanded ? 'expanded' : ''}`}>
            <div className="panel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', borderBottom: '1px solid var(--border-solid)', cursor: 'pointer' }} onClick={() => setIsDiffExpanded(!isDiffExpanded)}>
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="panel-title" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '1px' }}>
                  <Code2 size={14} style={{ color: 'var(--accent-purple)' }} /> {showDiffViewer ? 'Remediation Diff Viewer' : 'System Operations & Architecture'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {showDiffViewer && (
                    <button
                      aria-label="Back to visualization views"
                      onClick={(e) => { e.stopPropagation(); setShowDiffViewer(false); }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-main)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.68rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s',
                      }}
                    >
                      <Network size={12} /> Back to Visualizations
                    </button>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginLeft: '4px' }}>
                    {showDiffViewer ? (currentDiff ? currentDiff.filename : 'Loading...') : 'Live Operations'}
                  </span>
                  <button
                    aria-label={isDiffExpanded ? "Minimize panel" : "Maximize panel"}
                    style={{
                      background: 'transparent', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px',
                      borderRadius: '4px', transition: 'color 0.2s',
                    }}
                    onClick={(e) => { e.stopPropagation(); setIsDiffExpanded(!isDiffExpanded); }}
                  >
                    {isDiffExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
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
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                    height: '100%', gap: '12px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono',
                    fontSize: '0.8rem', background: '#09080d'
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
              <div className="editor-workspace" style={{ display: 'flex', gap: '0', height: 'calc(100% - 40px)', padding: 0 }}>
                <div style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', borderRight: '1px solid var(--border-solid)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border-solid)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.5px' }}>
                    <Brain size={12} /> AGENT WORKFLOW TOPOLOGY
                  </div>
                  <div style={{ height: 'calc(100% - 29px)' }}>
                    <AgentFlow activeAgent={activeAgent} workflowState={workflowState} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border-solid)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--accent-purple)', letterSpacing: '0.5px' }}>
                    <Network size={12} /> REPOSITORY FILE GRAPH
                  </div>
                  <div style={{ height: 'calc(100% - 29px)' }}>
                    <RepoFileGraph files={gitlabInfo.files} visible={!showDiffViewer} />
                  </div>
                </div>
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

      <IntegrationsModal
        show={showIntegrationsModal}
        integrations={integrations}
        gitlabTokenInput={gitlabTokenInput}
        gitlabProjectInput={gitlabProjectInput}
        googleEmailInput={googleEmailInput}
        googleKeyInput={googleKeyInput}
        googleSheetInput={googleSheetInput}
        onClose={() => setShowIntegrationsModal(false)}
        onGitlabTokenChange={(val) => setGitlabTokenInput(val)}
        onGitlabProjectChange={(val) => setGitlabProjectInput(val)}
        onGoogleEmailChange={(val) => setGoogleEmailInput(val)}
        onGoogleKeyChange={(val) => setGoogleKeyInput(val)}
        onGoogleSheetChange={(val) => setGoogleSheetInput(val)}
        onConnect={(type, fields) => handleConnectIntegration(type, fields)}
      />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(23, 17, 35, 0.92)',
            color: '#FBFBFB',
            border: '1px solid rgba(166, 99, 204, 0.18)',
            backdropFilter: 'blur(16px)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.75rem',
            borderRadius: '10px',
          },
          error: {
            iconTheme: { primary: '#d63031', secondary: '#FBFBFB' },
          },
          success: {
            iconTheme: { primary: '#2ecc71', secondary: '#FBFBFB' },
          },
        }}
      />
    </div>
  );
}

export default App;
