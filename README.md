# ♿ AccessOps

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)
![Google GenAI](https://img.shields.io/badge/Google-GenAI-orange.svg)
![GitLab](https://img.shields.io/badge/GitLab-Webhook-red.svg)

**AccessOps** is an intelligent, autonomous Multi-Agent Orchestrator built for the Google Rapid Dev Hackathon. 

Whenever a developer opens a Merge Request in GitLab, this backend server intercepts the webhook, spins up a Gemini 2.5 Pro **Orchestrator**, and delegates tasks to specialized sub-agents:
1. **A11y Agent:** Fixes WCAG 2.1 AA violations (missing aria-labels, contrast ratios).
2. **Security Agent:** Scans for hardcoded secrets and XSS vulnerabilities.
3. **Performance Agent:** Audits React rendering patterns and DOM size.

The sub-agents autonomously write fixes and the Orchestrator pushes a single consolidated commit directly to the Merge Request!

## 🚀 Features
- **Multi-Agent Orchestration:** A single Gemini instance acts as a manager, coordinating specialized sub-agents.
- **Autonomous Remediation:** Automatically injects fixes for accessibility, security, and performance without altering core business logic.
- **Custom MCP Interceptor:** Utilizes the official `@modelcontextprotocol/server-gitlab` partner integration, paired with a custom-built Node.js schema interceptor to overcome a known Zod validation bug in the open-source repository.
- **Real-Time Glassmorphism Dashboard:** Watch the agent's thought process stream live over WebSockets to a stunning React frontend.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express, TypeScript
- **AI Model:** Google Gemini 2.5 Pro (via `@google/genai`)
- **Version Control:** GitLab REST API
- **Frontend:** React, Vite, TailwindCSS (WIP)

## 📦 Local Setup

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory:
   ```env
   GITLAB_TOKEN=your_personal_access_token
   GITLAB_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
   GOOGLE_CLOUD_LOCATION=us-central1
   PORT=3000
   ```
4. **Authenticate Google Cloud:**
   ```bash
   gcloud auth application-default login
   ```
5. **Start the Server:**
   ```bash
   npm run dev
   ```
6. **Expose the Webhook:**
   Run `ngrok http 3000` and paste the URL into your GitLab Webhook settings (Trigger: Merge Request events).

## 📚 Documentation
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md): Deep dive into the architecture, setup instructions, and the future product roadmap (Phases 2 & 3).
- [AI_CONTEXT.md](./AI_CONTEXT.md): Context file explicitly for AI tools and contributors detailing the exact state of the project, including MCP bug workarounds.

## 🏆 Hackathon Details
Built for the **Google Rapid Dev Hackathon**. Demonstrates advanced Agentic capabilities by utilizing Multi-Agent orchestration to remove human bottlenecks from enterprise compliance.
