# AccessOps

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)
![Google GenAI](https://img.shields.io/badge/Google-GenAI-orange.svg)
![Google Cloud Run](https://img.shields.io/badge/Google-Cloud%20Run-blue.svg)
![GitLab](https://img.shields.io/badge/GitLab-Webhook-red.svg)

**AccessOps** is an intelligent, autonomous Multi-Agent Orchestrator built for the Google Rapid Dev Hackathon. 

Whenever a developer opens a Merge Request in GitLab, this robust backend server intercepts the webhook, spins up a Gemini 2.5 Pro **Orchestrator**, and delegates tasks to specialized sub-agents:
1. **A11y Agent:** Fixes WCAG 2.1 AA violations (missing aria-labels, contrast ratios).
2. **Security Agent:** Scans for hardcoded secrets and XSS vulnerabilities.
3. **Performance Agent:** Audits React rendering patterns and DOM size.

The sub-agents autonomously write fixes, push a consolidated commit directly to the branch, and automatically generate Google Workspace Compliance Reports detailing their work!

## Features
- **Multi-Agent Orchestration:** A single Gemini instance acts as a manager, coordinating specialized sub-agents dynamically.
- **Autonomous Remediation:** Automatically injects fixes for accessibility, security, and performance without altering core business logic.
- **Structured WebSocket Events:** Real-time bi-directional streaming using strongly typed events (`workflow:start`, `tool:call`, `tool:result`, `workflow:complete`).
- **Anti-Loop Guards:** Robust, two-layer self-trigger prevention (Webhook layer + Agent Service layer) using commit prefix checks and `timeAgo` analysis.
- **Real-Time Glassmorphism Dashboard:** Watch the agent's thought process stream live to a stunning React frontend via a Vite proxy.
- **Live Metrics & CommitGraph:** Visualizes runtime metrics, ROI (Tokens/Time saved), and interactive repository branch timelines.
- **AgentFlow Visualization:** Integrates `React Flow` to render a live, breathing node graph of the orchestrator passing tasks to sub-agents.
- **IntegrationsModal Config Flow:** Dynamic UI allowing users to safely connect GitLab and Google Workspace credentials at runtime.
- **Automated Compliance Reporting:** Utilizes Google Service Accounts (JWT) to securely auto-generate compliance reports in Google Docs and log telemetry directly into Google Sheets.
- **Fully Cloud-Native:** CI/CD pipeline integrated via GitHub Actions automatically builds and deploys multi-container Docker workloads to Google Cloud Run, backed by a robust Nginx reverse proxy.
- **Custom MCP Interceptor:** Utilizes the official `@modelcontextprotocol/server-gitlab` integration paired with a custom Node.js interceptor to bypass open-source JSON schema bugs.

## Tech Stack
- **Infrastructure:** Google Cloud Run, Google Artifact Registry, GitHub Actions (CI/CD)
- **Backend:** Node.js, Express, TypeScript, Socket.io
- **AI Model:** Google Gemini 2.5 Pro (via `@google/genai`)
- **Integrations:** GitLab REST API, Google Workspace APIs (Docs/Sheets)
- **Frontend:** React 19, Vite, Vanilla CSS, Monaco Editor, React Flow, react-hot-toast, lucide-react

## Architecture Flow

```mermaid
graph LR
    Dev([Developer]) -->|Opens MR| GL[GitLab Webhook]
    GL -->|Trigger| Backend[Node.js Backend<br/>(Cloud Run)]
    
    subgraph Frontend Client
        Vite[Vite Proxy / Nginx] -->|WebSocket: workflow:start,<br/>tool:call, workflow:complete| Dash[React Dashboard<br/>AgentFlow & CommitGraph]
    end
    
    Backend <-->|Socket.io| Vite
    Backend <-->|Tool Calls| Gemini[Gemini 2.5 Pro<br/>Orchestrator]
    Gemini -->|Sub-Agents| GL_API[(GitLab REST API & MCP)]
    Backend -->|JWT Auth| Workspace[Google Docs & Sheets<br/>Compliance Reports]
```

## Local Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   GITLAB_TOKEN=your_personal_access_token
   GITLAB_PROJECT_ID=your_project_id
   GOOGLE_GENAI_KEY=your_gemini_api_key
   GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
   GOOGLE_CLOUD_LOCATION=us-central1
   PORT=3000
   ```
4. **Authenticate Google Cloud:**
   Either authenticate via gcloud (ADC) or simply set the `GOOGLE_GENAI_KEY` in your `.env`:
   ```bash
   # Optional: If you aren't using GOOGLE_GENAI_KEY
   gcloud auth application-default login
   ```
5. **Start the Servers:**
   Terminal 1 (Backend): `cd backend && npm run dev`
   Terminal 2 (Frontend): `cd frontend && npm run dev` (Vite Proxy automatically connects to Backend on port 3000)

## Cloud Deployment
The repository includes a fully automated GitHub Actions pipeline (`.github/workflows/deploy.yml`). 
Simply configure your GitHub repository secrets (`GITLAB_TOKEN`, Google Auth Keys) and pushing to the `master` branch will automatically compile the TypeScript, build the Nginx/Docker images, and push them live to Google Cloud Run!

## Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md): Detailed sequence diagrams for the Agent Loop and Compliance Reporting, plus component breakdowns.
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md): Deep dive into the completed phases and the long-term enterprise roadmap.
- [AI_CONTEXT.md](./AI_CONTEXT.md): Context file explicitly for AI tools and contributors detailing the exact state of the project, codebase map, and MCP bug workarounds.

## Hackathon Details
Built for the **Google Rapid Dev Hackathon**. Demonstrates advanced Agentic capabilities by utilizing Multi-Agent orchestration to remove human bottlenecks from enterprise compliance.
