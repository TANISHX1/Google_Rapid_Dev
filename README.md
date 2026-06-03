# ♿ A11y Agent Auto-Remediator

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)
![Google GenAI](https://img.shields.io/badge/Google-GenAI-orange.svg)
![GitLab](https://img.shields.io/badge/GitLab-Webhook-red.svg)

**A11y Agent Auto-Remediator** is an intelligent, autonomous accessibility auditing and remediation bot built for the Google Rapid Dev Hackathon. 

Whenever a developer opens a Merge Request in GitLab, this backend server intercepts the webhook, spins up a Gemini 2.5 Pro agent, and analyzes the modified code for WCAG 2.1 AA violations. The agent then autonomously writes the fixes and pushes a new commit directly to the Merge Request!

## 🚀 Features
- **Zero-Click Accessibility:** Operates entirely in the background via GitLab webhooks.
- **Autonomous Remediation:** Automatically injects `aria-labels`, `alt` texts, semantic tags, and fixes contrast ratios without altering core business logic.
- **Native Agent Loop:** Built with a custom native tool-calling loop using Google GenAI SDK, providing extreme reliability and real-time thought processing.
- **Detailed MR Comments:** Leaves a comprehensive comment on the Merge Request explaining exactly what was changed and why.

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

## 🏆 Hackathon Details
Built for the **Google Rapid Dev Hackathon**. Demonstrates advanced Agentic capabilities by removing human bottleneck from accessibility compliance.
