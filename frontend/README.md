# AccessOps Frontend

The frontend for AccessOps is a highly visual, real-time "God-Mode" dashboard designed to monitor the Multi-Agent Orchestrator. 

It is built using React 19, Vite, and bespoke Vanilla CSS implementing a modern Glassmorphism aesthetic without relying on Tailwind.

## Features

- **AgentFlow Visualization:** Uses `React Flow` to render the Orchestrator delegating tasks to sub-agents in real-time.
- **CommitGraph:** Plugs into GitLab telemetry to plot interactive, branch-aware git history swimlanes.
- **Monaco Diff Editor:** Streams the AI's exact code fixes directly into a side-by-side IDE view.
- **Live Metrics:** Calculates and renders the exact Tokens Saved and Developer Hours recouped per action.
- **Vite/Nginx Reverse Proxy:** Resolves CORS constraints by routing `/api` and `/socket.io` through a single relative path.

## Local Development

If you are running the backend on `http://localhost:3000`, the Vite proxy will automatically route all WebSocket and API traffic securely.

1. Ensure dependencies are installed:
   ```bash
   npm install
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```

*Note: You do not need a `.env` file in the frontend. All credentials and target repositories are configured dynamically at runtime using the top-right Settings (IntegrationsModal) button.*
