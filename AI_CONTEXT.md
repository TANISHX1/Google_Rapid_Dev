# AI Agent Deep Context Document (Source of Truth)

**Purpose:** This document is the ultimate source of truth for the "AccessOps" repository. If you are an AI agent (Copilot, Cursor, Gemini) or a human contributor, reading this document provides the complete, exhaustive context of the project, the precise state of the codebase, the exact mechanics of the integrations, and the roadmap. **Read this before writing any code.**

---

## 1. Core Concept & The Hackathon Pivot
*   **The Product:** AccessOps is an autonomous Multi-Agent Orchestrator designed to completely automate Accessibility (A11y), Security, and Performance code remediations.
*   **The Trigger:** When a developer opens, updates, or reopens a Merge Request (MR) in GitLab, the system intercepts the webhook, analyzes the code via Gemini 2.5 Pro (leveraging Vertex AI), and pushes commits containing the fixed code directly back to the branch, finishing by leaving a review comment.
*   **The Pivot:** Initially pitched as a simple accessibility bot, the project was pivoted to an "Enterprise Suite" featuring an Orchestrator that spawns multiple sub-agents, combined with a highly visual "God-Mode" React dashboard that streams the agent's live thought process via WebSockets.

---

## 2. Directory Structure & Codebase Map

Here is the full structural breakdown of the workspace:

```
Google_Rapid_Dev/
├── AI_CONTEXT.md                 # This deep context document
├── ARCHITECTURE.md               # Visual Mermaid sequence and high-level architecture
├── IMPLEMENTATION_GUIDE.md       # Roadmap details for future phases
├── README.md                     # Main setup & running instructions
├── backend/
│   ├── .env                      # Local environment variables configuration
│   ├── config.json               # Dynamic user credentials registry
│   ├── package.json              # Backend dependencies (express, socket.io, @google/genai, mcp-sdk)
│   ├── tsconfig.json             # TypeScript configuration for commonjs targets
│   ├── server.ts                 # Main server entrypoint (Express + Socket.io server)
│   ├── routes/
│   │   ├── webhook.ts            # GitLab webhook handler (Fast HTTP 202 acknowledgment)
│   │   ├── gitlab.ts             # GitLab information fetching & commit diff endpoints
│   │   └── integrations.ts       # Service connection and token configuration manager
│   ├── services/
│   │   └── agentService.ts       # Agent Orchestration Loop (Gemini client, Gitlab REST, MCP routing)
│   └── utils/
│       ├── config.ts             # Utility helper to load/save configurations dynamically
│       └── mcpWrapper.cjs        # Interceptor to patch the GitLab MCP server Zod schemas
└── frontend/
    ├── .gitignore                # Node/Vite build system ignore paths
    ├── index.html                # Vite entry html template
    ├── package.json              # Frontend dependencies (react 19, vite 8, socket.io-client)
    ├── vite.config.ts            # Vite React plugins configuration
    ├── tsconfig.json             # Top level TypeScript reference config
    ├── tsconfig.app.json         # TS compiler config for client app
    ├── tsconfig.node.json        # TS compiler config for Vite node context
    ├── eslint.config.js          # ESLint rules and lint configurations
    └── src/
        ├── main.tsx              # React mounting root script
        ├── App.tsx               # Main frontend interface component (Live Terminal client)
        ├── App.css               # Component specific layout rules
        ├── index.css             # Glassmorphism dark mode styles and global styling
        └── assets/               # Public assets / images
```

---

## 3. Detailed Component Walkthrough

### A. The Backend (`backend/`)
The backend is an event-driven Node.js/Express server written in TypeScript.

*   **`server.ts`:**
    *   Initializes the Express application and attaches a native `socket.io` server on port 3000.
    *   Supports CORS to allow connections from the Vite frontend (port 5173).
    *   Exposes a `/health` endpoint for checks and registers webhooks/gitlab/integrations routes.
    *   Exports the `io` instance to allow service files to broadcast events.

*   **`routes/webhook.ts`:**
    *   Exposes a `POST /` listener for GitLab webhook notifications.
    *   Checks that the event is a Merge Request event (`payload.object_kind === 'merge_request'`).
    *   **CRITICAL PATTERN:** If the MR action is `open`, `update`, or `reopen`, it immediately responds with `202 Accepted` containing `{ message: 'Merge Request event accepted. Processing...' }`. This satisfies GitLab's strict 10-second webhook response timeout limit.
    *   Spawns `triggerAgentWorkflow(projectId, mrId)` in the background without blocking the HTTP response.

*   **`routes/gitlab.ts`:**
    *   Provides high-level workspace info via `/api/gitlab/info`. Pulls commits with `per_page=50` to support complete history.
    *   Exposes `GET /api/gitlab/commit-diff/:sha` which compares a commit with its parent, fetches modified files, and returns file contents dynamically to power the code editor diff workflow.

*   **`routes/integrations.ts`:**
    *   Exposes `GET /api/integrations` and `POST /api/integrations/connect` to check status and dynamically bind GitLab configuration tokens and repository targets on-the-fly.

*   **`utils/config.ts`:**
    *   Manages reading and writing connections settings in a local `config.json` registry file to bypass nodemon reloads and make configuration updates live.

*   **`utils/mcpWrapper.cjs`:**
    *   The official `@modelcontextprotocol/server-gitlab` package contains a bug where some input schemas lack the `type: "object"` definition. Standard MCP SDK client Zod validations reject schemas without this property, crashing on initialization.
    *   This wrapper process intercepts the MCP server's communications. It spawns the official server as a child process using `npx -y @modelcontextprotocol/server-gitlab`.
    *   It redirects `stdin` and filters `stdout` in real-time. Whenever `"inputSchema":` is matched in the output streams, it parses the JSON chunk and programmatically injects `type: 'object'` into any schema lacking a `type` property, then forwards the modified chunk back to stdout.
    *   All MCP client connections in the backend must execute their transport commands targeting this wrapper script.

*   **`services/agentService.ts`:**
    *   Manages the agent lifecycle, Gemini API configuration, and GitLab fallback APIs.
    *   Uses `@google/genai` with Vertex AI backend capability enabled (`vertexai: true`) using the `gemini-2.5-pro` model.
    *   **Pre-fetching Step:** Since the GitLab MCP server doesn't provide an API to fetch active changes for a specific MR, the service calls the GitLab REST API directly to extract the `source_branch` and the list of `modifiedFiles`.
    *   **Tool Conversion:** Converts the retrieved MCP tool schemas into Gemini compatible tool declarations. It injects a native custom tool definition `leave_mr_comment` to comment directly on MR logs.
    *   **Commit Fallback Logic:** The official GitLab MCP server's file writing/updating tools (`create_or_update_file` and `push_files`) throw mapping errors. The service intercepts these tool calls and executes them directly via GitLab's native commits API `/projects/${projectId}/repository/commits` using the commit action `update`.
    *   **Streaming Logs:** Calls a custom `log()` function, which displays status lines in the terminal and emits an `agent:log` event through `socket.io` to keep the React client updated.

### B. The Frontend (`frontend/`)
The client app is a React application built with Vite and styled via Vanilla CSS.

*   **`src/App.tsx`:**
    *   Connects to the Node backend using `socket.io-client` on `http://localhost:3000`.
    *   Maintains a state array `logs` of strings, initialized with terminal starter lines.
    *   Listens to the `agent:log` event to append new incoming logs to the interface.
    *   Uses a React `useRef` pointing to the bottom of the logs panel to automatically scroll to new messages.
    *   Includes conditional styling to highlight action lines (e.g. "Gemini called tool" or "Triggering Agent Workflow") in terminal green.
    *   **Monaco Diff Editor Integration**: Selectable commit history feeds the Monaco Diff Editor to render exact file modifications dynamically retrieved from GitLab telemetry.
    *   **Data Integrations Manager**: Populates a Settings button that triggers a glassmorphic dialog. Allows users to view and update active credentials and repository coordinates dynamically.
    *   **Branch-Aware Git Graph**: Visualizes the commit history as a true branching graph with SVG swimlanes, parent-child links, and merge annotations computed dynamically.
    *   **Real Data Only**: Cleanly handles empty repository states and propagates authentic GitLab API errors to the user instead of silent mock fallbacks.

*   **`src/index.css`:**
    *   Uses standard CSS custom properties for defining a premium dark theme.
    *   Applies fonts: `Outfit` (sans-serif for body/UI headers) and `JetBrains Mono` (for the log terminal).
    *   Creates a sleek Glassmorphism aesthetic using translucent backgrounds (`rgba(30, 41, 59, 0.7)`), a subtle blur filter (`backdrop-filter: blur(12px)`), and a smooth cyan-blue glow shadow (`box-shadow: 0 0 20px rgba(56, 189, 248, 0.4)`).
    *   Styles custom scrollbars and layout-isolated timelines to guarantee fluid grid alignment.

---

## 4. Environment Configuration

To run the project, a `.env` file must be present in the `backend/` directory with the following variables:

```env
# GitLab authentication and workspace settings (falls back to these if config.json has no values)
GITLAB_TOKEN=glpat-...                     # GitLab Personal Access Token with write API privileges
GITLAB_PROJECT_ID=82852105                 # Default workspace project target ID

# Google Cloud Platform credentials for Vertex AI SDK
GOOGLE_CLOUD_PROJECT_ID=your_project_id    # GCP project hosting the Vertex AI APIs
GOOGLE_CLOUD_LOCATION=us-central1          # GCP region where Gemini 2.5 Pro is deployed

# Server configuration
PORT=3000                                  # Express listening port
```

*   **Propagated Authentication:** The backend automatically maps `process.env.GITLAB_TOKEN` to `GITLAB_PERSONAL_ACCESS_TOKEN` when spawning the MCP server child process via `mcpWrapper.cjs`.

---

## 5. Strict Development Rules for AI Agents

1.  **Never use standard `console.log()` in the agent loop.** Always use the custom `log()` function provided in `agentService.ts` so the frontend UI stays synced.
2.  **Never attempt to use the official MCP server directly.** Always route through `mcpWrapper.cjs`.
3.  **Do not alter the webhook immediate-return pattern.** GitLab requires a response within 10 seconds. Always send the `202 Accepted` response before launching the workflow.
4.  **Always handle multiple parallel function calls in the loop.** Gemini models can invoke multiple tool calls concurrently (e.g. fetching content for multiple changed files). The orchestrator must collect all results and send them back to Gemini in a single response turn.
5.  **Maintain the Premium Aesthetic.** Any UI additions must follow the high-end glassmorphism dark-mode theme, utilizing the established CSS tokens, Outfit, and JetBrains Mono fonts.

---

## 6. Current Status & Immediate Next Steps

*   **Status:** The visual "God-Mode" Dashboard is complete. Monaco Diff Editors display dynamic SRE changes, timelines scroll seamlessly, and application connection scopes are managed dynamically in real-time. Commit history is plotted on a dynamic branch-aware graph. Parallel tool calls are supported natively.
*   **Next Immediate Step:** Expand telemetry integrations and deploy the orchestrator to cloud environments.
