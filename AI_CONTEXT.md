# AI Agent Deep Context Document (Source of Truth)

**Purpose:** This document is the ultimate source of truth for the "AccessOps" repository. If you are an AI agent (Copilot, Cursor, Gemini) or a human contributor, reading this document provides the complete, exhaustive context of the project, the precise state of the codebase, the exact mechanics of the integrations, and the roadmap. **Read this before writing any code.**

---

## 1. Core Concept & The Hackathon Pivot
**The Product:** AccessOps is an autonomous Multi-Agent Orchestrator designed to completely automate Accessibility (A11y), Security, and Performance code remediations. 
**The Trigger:** When a developer opens a Merge Request in GitLab, the system intercepts the webhook, analyzes the code via Gemini 2.5 Pro, and pushes commits containing the fixed code directly back to the branch, finishing by leaving a review comment.
**The Pivot:** Initially pitched as a simple accessibility bot, the project was pivoted to an "Enterprise Suite" featuring an Orchestrator that spawns multiple sub-agents, combined with a highly visual "God-Mode" React dashboard that streams the agent's live thought process via WebSockets.

---

## 2. Detailed Codebase Walkthrough (What has been built so far)

### Phase 1 is 100% Complete. Here is exactly how it works:

### A. The Backend (`backend/`)
The backend is an event-driven Node.js/Express server written in TypeScript.
- **`server.ts`:** Initializes the Express app and a `socket.io` server on port 3000. It handles CORS and serves as the primary entry point.
- **`routes/webhook.ts`:** Listens for GitLab MR events (`X-Gitlab-Event: Merge Request Hook`). **CRITICAL DETAIL:** It immediately returns a `202 Accepted` status *before* awaiting the agent workflow. If you await the agent synchronously, GitLab will time out the webhook and disable it. It spawns the agent asynchronously.
- **`utils/mcpWrapper.cjs`:** A custom interceptor. The official `@modelcontextprotocol/server-gitlab` has a Zod validation bug where it omits `type: "object"` in its JSON schemas. This CommonJS wrapper spawns the official server as a child process, intercepts its `stdout` stream, dynamically parses the JSON, injects the missing types, and outputs it. **Rule:** All MCP connections must use this wrapper.
- **`services/agentService.ts`:** The heart of the Orchestrator. 
  1. It pre-fetches the Merge Request changes using a native REST API call to GitLab (because the official MCP server lacks a tool for this).
  2. It initializes the Gemini 2.5 Pro model and provides it with the MCP tools, explicitly injecting a custom native `leave_mr_comment` tool.
  3. It executes a `while` loop, processing Gemini's tool calls and returning the MCP tool outputs until the agent is finished.
  4. **CRITICAL DETAIL:** If Gemini tries to use `create_or_update_file` or `push_files`, the official MCP server crashes internally with a mapping error. `agentService.ts` intercepts these specific tool names and handles the code push natively via the GitLab REST API.
  5. Throughout the loop, it calls `log()` which uses `io.emit('agent:log', message)` to stream real-time updates to the frontend.

### B. The Frontend (`frontend/`)
The frontend is a React application built with Vite and TailwindCSS (WIP).
- **`src/App.tsx`:** Currently acts as a "Live Terminal". It connects to the backend via `socket.io-client` on port 3000. It listens for `agent:log` events and renders them in a scrolling, hacker-style terminal window.
- **`src/index.css`:** Implements a premium "Glassmorphism" dark-mode aesthetic. 

---

## 3. Strict Development Rules for AI Agents
1. **Never use standard `console.log()` in the agent loop.** Always use the custom `log()` function provided in `agentService.ts` so the frontend UI stays synced.
2. **Never attempt to use the official MCP server directly.** Always route through `mcpWrapper.cjs`.
3. **Do not alter the webhook immediate-return pattern.** GitLab requires a response within 10 seconds.
4. **Maintain the Premium Aesthetic.** Any UI additions must follow the high-end, glassmorphism dark-mode theme.

---

## 4. Current Status & Immediate Next Steps
**Status:** The Multi-Agent Orchestrator backend (Phase 1) is flawless, fully compliant with the hackathon rules, and gracefully handles all open-source bugs.

**Next Immediate Step (Where you should start):** Phase 2 (The God-Mode Dashboard).
The frontend needs to be upgraded from a simple streaming terminal into a visual control center.
- You must install `@monaco-editor/react` to display live side-by-side code diffs of what the agent is fixing.
- You must install `reactflow` to visually render the Orchestrator node delegating tasks to the sub-agent nodes.
- Do NOT touch the backend architecture right now; it is stable. Focus strictly on `frontend/src/App.tsx` and building out the visual UI.
