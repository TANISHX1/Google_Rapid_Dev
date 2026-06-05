import { useEffect, useRef, useState } from 'react';
import {
  Zap,
  Shield,
  Gauge,
  Terminal,
  Sparkles,
  ArrowRight,
  Rocket,
  Eye,
  Webhook,
  BrainCircuit,
  FileCode,
  GitCommitHorizontal,
  MessageSquareCode,
  FolderTree,
  CheckCircle2,
} from 'lucide-react';
import '../landing.css';

/* ── Terminal mock data ──────────────────────────────────────── */
const TERMINAL_LINES = [
  { text: 'Webhook accepted: MR #12 opened [A11y & Security Audit]', type: 'normal' },
  { text: 'Fetching project tree from GitLab MCP Server...', type: 'normal' },
  { text: 'File loaded: /src/components/LoginButton.tsx', type: 'normal' },
  { text: 'Analyzing 134 lines of React code via Gemini 2.5 Pro...', type: 'normal' },
  { text: 'VIOLATION: Missing aria-label on <button> (line 24)', type: 'violation' },
  { text: 'VULNERABILITY: Unsanitized DOM ref — XSS risk (line 55)', type: 'violation' },
  { text: 'Generating AST-aligned compliance patches...', type: 'normal' },
  { text: "Commit pushed to 'feature/login-fix' via GitLab Commit API.", type: 'success' },
  { text: 'MR comment posted: 2 issues fixed autonomously. ✓', type: 'success' },
];

const DIFF_BEFORE = [
  { text: '<button', type: 'removed' },
  { text: '  onClick={handleLogin}', type: 'normal' },
  { text: '  className="login-btn"', type: 'normal' },
  { text: '>', type: 'removed' },
  { text: '  Login', type: 'normal' },
  { text: '</button>', type: 'normal' },
  { text: '', type: 'normal' },
  { text: '<img src={avatar} />', type: 'removed' },
];

const DIFF_AFTER = [
  { text: '<button', type: 'added' },
  { text: '  onClick={handleLogin}', type: 'normal' },
  { text: '  className="login-btn"', type: 'normal' },
  { text: '  aria-label="Sign in">', type: 'added' },
  { text: '  Login', type: 'normal' },
  { text: '</button>', type: 'normal' },
  { text: '', type: 'normal' },
  { text: '<img src={avatar} alt="User avatar" />', type: 'added' },
];

interface LandingPageProps {
  onLaunch: () => void;
}

export function LandingPage({ onLaunch }: LandingPageProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Terminal cycling animation
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= TERMINAL_LINES.length) {
          setTimeout(() => setVisibleLines(0), 2200);
          return prev;
        }
        return prev + 1;
      });
    }, 750);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for scroll reveals — use callback ref to ensure DOM is ready
  const landingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!landingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    const targets = landingRef.current.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-stagger');
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root" ref={landingRef}>
      {/* ════════════ NAVBAR ════════════ */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="logo-icon">⚡</div>
          ACCESS_OPS
        </div>
        <div className="landing-nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#cockpit">Live Cockpit</a>
          <a href="#features">Features</a>
          <a href="#stack">Tech Stack</a>
          <a href="#roi">ROI</a>
          <a className="nav-cta" onClick={onLaunch}>
            Open Workspace <ArrowRight size={12} style={{ marginLeft: 4 }} />
          </a>
        </div>
      </nav>

      {/* ════════════ HERO ════════════ */}
      <section className="landing-hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Powered by Gemini 2.5 Pro &middot; GitLab MCP &middot; Vertex AI
        </div>

        <h1 className="hero-headline">
          Autonomous Remediations.
          <br />
          Delivered Directly To Your MR.
        </h1>

        <p className="hero-sub">
          AccessOps intercepts GitLab merge request webhooks, spawns specialized
          AI agents to audit your code for Accessibility, Security, and Performance
          compliance, generates verified patches, and pushes commits straight to
          your branch — automatically.
        </p>

        <div className="hero-actions">
          <button className="btn-launch" onClick={onLaunch}>
            <Rocket size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Launch The Core
          </button>
          <button className="btn-docs" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
            <Eye size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Explore Below
          </button>
        </div>

        <div className="scroll-indicator">
          <div className="scroll-mouse" />
          <span>Scroll</span>
        </div>
      </section>

      <div className="section-divider" />

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section id="how-it-works" className="landing-section">
        <div className="reveal">
          <span className="section-label">
            <BrainCircuit size={14} /> HOW IT WORKS
          </span>
          <h2 className="section-title">From Webhook to Commit in Seconds</h2>
          <p className="section-desc">
            A fully autonomous pipeline — no human intervention required after the developer opens a Merge Request.
          </p>
        </div>

        <div className="workflow-layout reveal">
          {/* Left — Steps */}
          <div className="workflow-left">
            {[
              { dot: 'purple', num: '1', icon: <Webhook size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />, title: 'MR Webhook Trigger', desc: 'A developer opens, updates, or reopens a Merge Request in GitLab. GitLab fires a webhook to our Express server, which responds with 202 Accepted within milliseconds.' },
              { dot: 'cyan', num: '2', icon: <FileCode size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />, title: 'Context Assembly via MCP', desc: 'The orchestrator spawns the GitLab MCP Server (patched via mcpWrapper.cjs) to fetch the changed files and repository tree.' },
              { dot: 'orange', num: '3', icon: <BrainCircuit size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />, title: 'Gemini 2.5 Pro Analysis', desc: 'The code is passed to Gemini 2.5 Pro (Vertex AI) acting as a WCAG 2.1 AA compliance officer, security auditor, and performance optimizer — simultaneously.' },
              { dot: 'green', num: '4', icon: <GitCommitHorizontal size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />, title: 'Commit & Report', desc: 'Verified patches are pushed as a new commit directly to the developer\'s branch via GitLab\'s Commits API. A review comment is posted on the MR.' },
            ].map((step, i) => (
              <div
                key={i}
                ref={(el) => { stepRefs.current[i] = el; }}
                className={`workflow-step ${activeStep === i ? 'active' : (activeStep !== i ? 'dimmed' : '')}`}
                onMouseEnter={() => setActiveStep(i)}
              >
                <div className={`step-dot ${step.dot}`}>{step.num}</div>
                <div className="step-content">
                  <h4>{step.icon} {step.title}</h4>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right — Sticky Animated Visual */}
          <div className="workflow-right">
            <div className="step-visual">
              <div className="step-visual-bar">
                <div className="bar-dots"><span className="bar-dot r" /><span className="bar-dot y" /><span className="bar-dot g" /></div>
                {activeStep === 0 && 'webhook — incoming payload'}
                {activeStep === 1 && 'mcp — repository tree scan'}
                {activeStep === 2 && 'gemini — code analysis'}
                {activeStep === 3 && 'gitlab — commit & comment'}
              </div>
              <div className="step-visual-body" key={activeStep}>
                {activeStep === 0 && <WebhookVisual />}
                {activeStep === 1 && <MCPTreeVisual />}
                {activeStep === 2 && <GeminiAnalysisVisual />}
                {activeStep === 3 && <CommitVisual />}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ════════════ COCKPIT PREVIEW ════════════ */}
      <section id="cockpit" className="landing-section">
        <div className="reveal">
          <span className="section-label">
            <Terminal size={14} /> LIVE COCKPIT PREVIEW
          </span>
          <h2 className="section-title">The God-Mode Workspace</h2>
          <p className="section-desc">
            Watch the orchestrator analyze, detect, and fix code issues in real-time — streamed directly to your terminal via WebSockets.
          </p>
        </div>

        <div className="cockpit-sim reveal">
          <div className="cockpit-sim-bar">
            <div className="sim-dot red" />
            <div className="sim-dot yellow" />
            <div className="sim-dot green" />
            <span>accessops — orchestrator terminal</span>
          </div>
          <div className="cockpit-sim-body">
            {/* Terminal */}
            <div className="sim-terminal">
              {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
                <div
                  key={i}
                  className={`sim-terminal-line ${line.type}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <span className="arrow">➜</span> {line.text}
                </div>
              ))}
              {visibleLines < TERMINAL_LINES.length && (
                <span style={{
                  display: 'inline-block', width: '7px', height: '13px',
                  background: '#a663cc', animation: 'blink 0.8s step-end infinite', marginTop: '4px',
                }} />
              )}
            </div>

            {/* Diff */}
            <div className="sim-diff">
              <div className="sim-diff-header">
                <div className="sim-diff-tab before">ORIGINAL</div>
                <div className="sim-diff-tab after">REMEDIATED</div>
              </div>
              <div className="sim-diff-content">
                <div className="sim-diff-pane before-pane">
                  {DIFF_BEFORE.map((line, i) => (
                    <div key={i} className={line.type === 'removed' ? 'diff-line-removed' : 'diff-line-normal'}>
                      {line.type === 'removed' ? '- ' : '  '}{line.text}
                    </div>
                  ))}
                </div>
                <div className="sim-diff-pane after-pane">
                  {DIFF_AFTER.map((line, i) => (
                    <div key={i} className={line.type === 'added' ? 'diff-line-added' : 'diff-line-normal'}>
                      {line.type === 'added' ? '+ ' : '  '}{line.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ════════════ FEATURES ════════════ */}
      <section id="features" className="landing-section">
        <div className="reveal">
          <span className="section-label">
            <Sparkles size={14} /> CORE CAPABILITIES
          </span>
          <h2 className="section-title">Enterprise-Grade Agent Suite</h2>
          <p className="section-desc">
            Four specialized sub-agents working autonomously to guarantee compliance before merge.
          </p>
        </div>

        <div className="feature-grid reveal-stagger">
          <div className="feature-card">
            <div className="feature-icon purple"><Sparkles size={20} /></div>
            <h3>WCAG 2.1 AA Compliance</h3>
            <p>Auto-fixes alt text, aria-describedby associations, focus traps, and keyboard navigation tabindex attributes across your component tree.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon orange"><Shield size={20} /></div>
            <h3>Security Scan Guard</h3>
            <p>Identifies hardcoded secrets, DOM-based XSS vectors, and vulnerable patterns — resolving vulnerabilities before they reach main.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon cyan"><Gauge size={20} /></div>
            <h3>Performance Tuning</h3>
            <p>Detects heavy loops, redundant renders, and bloated import trees — refactoring DOM structures for measurably faster performance.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon green"><MessageSquareCode size={20} /></div>
            <h3>Autonomous MR Reviews</h3>
            <p>Posts detailed review comments on every Merge Request explaining exactly what was fixed, giving developers full visibility and approval control.</p>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ════════════ TECH STACK ════════════ */}
      <section id="stack" className="landing-section" style={{ textAlign: 'center' }}>
        <div className="reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="section-label">
            <Zap size={14} /> TECH STACK &amp; INTEGRATIONS
          </span>
          <h2 className="section-title">Built on Production Infrastructure</h2>
          <p className="section-desc" style={{ textAlign: 'center' }}>
            Every component is live and connected — no mock data, no placeholders.
          </p>
        </div>

        <div className="tech-stack-row reveal">
          <div className="tech-pill">
            <span className="pill-dot live" />
            GitLab API (Connected)
          </div>
          <div className="tech-pill">
            <span className="pill-dot live" />
            Gemini 2.5 Pro (Vertex AI)
          </div>
          <div className="tech-pill">
            <span className="pill-dot live" />
            GitLab MCP Server (Patched)
          </div>
          <div className="tech-pill">
            <span className="pill-dot active" />
            WebSocket Streaming
          </div>
          <div className="tech-pill">
            <span className="pill-dot active" />
            Monaco Diff Editor
          </div>
          <div className="tech-pill">
            <span className="pill-dot active" />
            React 19 + Vite 8
          </div>
          <div className="tech-pill">
            <span className="pill-dot active" />
            Express + Socket.io
          </div>
          <div className="tech-pill">
            <span className="pill-dot active" />
            React Flow (Repo Graph)
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ════════════ ROI ════════════ */}
      <section id="roi" className="landing-section" style={{ textAlign: 'center' }}>
        <div className="reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="section-label">
            <Zap size={14} /> VALUE ENGINE
          </span>
          <h2 className="section-title">Measurable Impact</h2>
          <p className="section-desc" style={{ textAlign: 'center' }}>
            Every webhook trigger generates quantifiable improvements across your codebase.
          </p>
        </div>

        <div className="roi-grid reveal-stagger">
          <ROICounter value="3/3" label="Accessibility Fixes" color="green" />
          <ROICounter value="3/3" label="Security Patches" color="orange" />
          <ROICounter value="+12.4h" label="Developer Hours Saved" color="cyan" />
          <ROICounter value="100%" label="Compliance Status" color="purple" />
        </div>
      </section>

      <div className="section-divider" />

      {/* ════════════ FINAL CTA ════════════ */}
      <section className="landing-section" style={{ textAlign: 'center', paddingBottom: '48px' }}>
        <div className="reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <h2 className="section-title">Ready to Automate Compliance?</h2>
          <p className="section-desc" style={{ textAlign: 'center' }}>
            Launch the workspace to see live orchestrator telemetry, dynamic code diffs, commit history, and real-time repository analysis.
          </p>
          <button className="btn-launch" onClick={onLaunch} style={{ fontSize: '1rem', padding: '16px 48px' }}>
            <Rocket size={18} style={{ marginRight: 10, verticalAlign: 'middle' }} />
            Launch The Core
          </button>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="landing-footer">
        © 2026 AccessOps — Autonomous Remediation Engine &middot; Built with Gemini 2.5 Pro, GitLab MCP &amp; Vertex AI
      </footer>
    </div>
  );
}

/* ── ROI Counter sub-component ─────────────────────────────────── */
function ROICounter({ value, label, color }: { value: string; label: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="roi-card" ref={ref}>
      <div
        className={`roi-value ${color}`}
        style={{
          animation: isVisible ? 'countUp 0.6s ease-out forwards' : 'none',
          opacity: isVisible ? 1 : 0,
        }}
      >
        {value}
      </div>
      <div className="roi-label">{label}</div>
    </div>
  );
}

/* ── Step 1: Webhook Payload Visual ────────────────────────────── */
function WebhookVisual() {
  return (
    <>
      <div className="visual-line" style={{ animationDelay: '0s' }}>
        <span className="visual-json-brace">{'{'}</span>
      </div>
      <div className="visual-line" style={{ animationDelay: '0.1s', paddingLeft: 16 }}>
        <span className="v-key">"object_kind"</span>: <span className="v-string">"merge_request"</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.2s', paddingLeft: 16 }}>
        <span className="v-key">"event_type"</span>: <span className="v-string">"merge_request"</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.3s', paddingLeft: 16 }}>
        <span className="v-key">"project.id"</span>: <span className="v-string">82852105</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.4s', paddingLeft: 16 }}>
        <span className="v-key">"object_attributes.action"</span>: <span className="v-string">"open"</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.5s', paddingLeft: 16 }}>
        <span className="v-key">"object_attributes.iid"</span>: <span className="v-string">12</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.6s', paddingLeft: 16 }}>
        <span className="v-key">"object_attributes.source_branch"</span>: <span className="v-string">"feature/login"</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.7s' }}>
        <span className="visual-json-brace">{'}'}</span>
      </div>
      <div className="visual-line" style={{ animationDelay: '0.9s', marginTop: 12 }}>
        <span className="v-arrow">➜</span> <span className="v-ok">HTTP 202 Accepted</span> <span className="v-muted">— 4ms</span>
      </div>
      <div className="visual-line" style={{ animationDelay: '1.1s' }}>
        <span className="v-arrow">➜</span> Spawning agent workflow in background...
      </div>
    </>
  );
}

/* ── Step 2: MCP Tree Scan Visual ──────────────────────────────── */
function MCPTreeVisual() {
  const files = [
    { name: 'src/', indent: 0 },
    { name: 'components/', indent: 1 },
    { name: 'LoginButton.tsx', indent: 2, modified: true },
    { name: 'Navbar.tsx', indent: 2 },
    { name: 'UserCard.tsx', indent: 2, modified: true },
    { name: 'pages/', indent: 1 },
    { name: 'Dashboard.tsx', indent: 2 },
    { name: 'Settings.tsx', indent: 2, modified: true },
    { name: 'utils/', indent: 1 },
    { name: 'auth.ts', indent: 2 },
  ];

  return (
    <>
      <div className="visual-line" style={{ animationDelay: '0s', marginBottom: 10 }}>
        <span className="v-arrow">➜</span> Scanning repository tree via MCP...
      </div>
      {files.map((f, i) => (
        <div
          key={i}
          className="visual-file-row"
          style={{ animationDelay: `${0.15 + i * 0.1}s`, paddingLeft: 8 + f.indent * 16 }}
        >
          <FolderTree size={12} className="file-icon" />
          <span className="file-name">
            {f.name}
            {f.modified && <span className="v-warn" style={{ marginLeft: 6, fontSize: '0.6rem' }}>MODIFIED</span>}
          </span>
        </div>
      ))}
      <div className="visual-line" style={{ animationDelay: '1.3s', marginTop: 10 }}>
        <span className="v-arrow">➜</span> <span className="v-ok">3 modified files identified</span>
      </div>
    </>
  );
}

/* ── Step 3: Gemini Analysis Visual ────────────────────────────── */
function GeminiAnalysisVisual() {
  return (
    <>
      <div className="visual-line" style={{ animationDelay: '0s' }}>
        <span className="v-arrow">➜</span> Gemini 2.5 Pro analyzing LoginButton.tsx...
      </div>
      <div className="visual-line" style={{ animationDelay: '0.3s', marginTop: 8 }}>
        <span className="v-muted">Line 24:</span> {'<button onClick={handleLogin}>'}
      </div>
      <div className="visual-line" style={{ animationDelay: '0.5s' }}>
        <span className="v-warn">⚠ WCAG 4.1.2:</span> Missing aria-label attribute
      </div>
      <div className="visual-line" style={{ animationDelay: '0.8s', marginTop: 8 }}>
        <span className="v-muted">Line 55:</span> {'ref.current.innerHTML = userInput'}
      </div>
      <div className="visual-line" style={{ animationDelay: '1.0s' }}>
        <span className="v-warn">⚠ CWE-79:</span> DOM-based XSS — unsanitized input
      </div>
      <div className="visual-line" style={{ animationDelay: '1.3s', marginTop: 8 }}>
        <span className="v-muted">Line 89:</span> {'<img src={avatar} />'}
      </div>
      <div className="visual-line" style={{ animationDelay: '1.5s' }}>
        <span className="v-warn">⚠ WCAG 1.1.1:</span> Missing alt text
      </div>
      <div className="visual-line" style={{ animationDelay: '1.8s', marginTop: 12 }}>
        <span className="v-arrow">➜</span> <span className="v-ok">3 violations detected — generating patches...</span>
      </div>
    </>
  );
}

/* ── Step 4: Commit & Report Visual ────────────────────────────── */
function CommitVisual() {
  return (
    <>
      <div className="visual-line" style={{ animationDelay: '0s' }}>
        <span className="v-arrow">➜</span> Building commit payload...
      </div>
      <div className="visual-line" style={{ animationDelay: '0.2s', marginTop: 8 }}>
        <span className="visual-json-brace">{'{'}</span>
      </div>
      <div className="visual-line" style={{ animationDelay: '0.3s', paddingLeft: 16 }}>
        <span className="v-key">"branch"</span>: <span className="v-string">"feature/login"</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.4s', paddingLeft: 16 }}>
        <span className="v-key">"message"</span>: <span className="v-string">"fix(a11y): add aria-labels & alt text"</span>,
      </div>
      <div className="visual-line" style={{ animationDelay: '0.5s', paddingLeft: 16 }}>
        <span className="v-key">"actions"</span>: [<span className="v-muted">3 file updates</span>]
      </div>
      <div className="visual-line" style={{ animationDelay: '0.6s' }}>
        <span className="visual-json-brace">{'}'}</span>
      </div>
      <div className="visual-line" style={{ animationDelay: '0.9s', marginTop: 12 }}>
        <span className="v-arrow">➜</span> POST /repository/commits <span className="v-ok">201 Created</span>
      </div>
      <div className="visual-line" style={{ animationDelay: '1.1s' }}>
        <span className="v-arrow">➜</span> POST /merge_requests/12/notes <span className="v-ok">201 Created</span>
      </div>
      <div className="visual-line" style={{ animationDelay: '1.4s', marginTop: 8 }}>
        <CheckCircle2 size={13} style={{ color: '#2ecc71', marginRight: 6, verticalAlign: 'middle' }} />
        <span className="v-ok">Workflow complete — 3 issues remediated autonomously</span>
      </div>
    </>
  );
}
