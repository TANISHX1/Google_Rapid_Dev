import { GoogleGenAI, Type } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import dotenv from 'dotenv';
import path from 'path';
import { io } from '../server';

dotenv.config();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'us-central1';

const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
});

function log(message: string) {
    console.log(message);
    io.emit('agent:log', message);
}

// Helper for GitLab API calls
async function gitlabApi(path: string, method: string = 'GET', body?: any) {
    const GITLAB_TOKEN = process.env.GITLAB_TOKEN || '';
    const url = `https://gitlab.com/api/v4${path}`;
    const response = await fetch(url, {
        method,
        headers: {
            'PRIVATE-TOKEN': GITLAB_TOKEN,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
        throw new Error(`GitLab API error: ${response.statusText} on ${url}`);
    }
    return response.json();
}

/**
 * Triggers the Gemini 2.5 Pro agent workflow using the official MCP server + Native extensions.
 */
export const triggerAgentWorkflow = async (projectId: number, mrId: number) => {
    log(`[Orchestrator] Triggering Multi-Agent Workflow for Project: ${projectId}, MR: ${mrId}`);

    const transport = new StdioClientTransport({
        command: 'node',
        args: [path.join(__dirname, '..', 'utils', 'mcpWrapper.cjs')],
        env: {
            ...process.env,
            GITLAB_PERSONAL_ACCESS_TOKEN: process.env.GITLAB_TOKEN,
            GITLAB_API_URL: 'https://gitlab.com/api/v4'
        }
    });

    const mcpClient = new Client({ name: 'accessops-orchestrator', version: '2.0.0' }, { capabilities: {} });

    try {
        log('[Orchestrator] Pre-fetching MR changes to direct the agents...');
        // Pre-fetch the MR to get the branch and modified files because the official MCP server lacks this tool
        const mr: any = await gitlabApi(`/projects/${projectId}/merge_requests/${mrId}`);
        const changes: any = await gitlabApi(`/projects/${projectId}/merge_requests/${mrId}/changes`);
        const sourceBranch = mr.source_branch;
        const mrSha = mr.sha || '';
        const modifiedFiles = changes.changes.map((c: any) => c.new_path).join(', ');

        // Layer 2: Check latest commit on source branch to prevent re-processing our own commits
        try {
            const branchCommits = await gitlabApi(`/projects/${projectId}/repository/commits?ref_name=${encodeURIComponent(sourceBranch)}&per_page=1`) as any[];
            if (branchCommits.length > 0) {
                const latest = branchCommits[0];
                const latestMsg = latest?.message || '';
                if (latestMsg.includes('AccessOps: Auto-Remediation') && latest.id === mrSha) {
                    log(`[Orchestrator] Skipping MR #${mrId}: latest commit SHA ${mrSha} matches AccessOps signature. No re-audit needed.`);
                    return;
                }
            }
        } catch (e) {
            log('[Orchestrator] Warning: Could not verify latest commit, proceeding anyway.');
        }

        log('[Orchestrator] Connecting to Official GitLab MCP Server...');
        await mcpClient.connect(transport);
        
        const mcpToolsList = await mcpClient.listTools();
        
        // Convert MCP Tools to Gemini function declarations
        const geminiTools = mcpToolsList.tools.map(t => ({
            name: t.name,
            description: t.description || '',
            parameters: t.inputSchema as any
        }));

        // Add our custom native tool for leaving comments since the MCP server lacks it
        geminiTools.push({
            name: 'leave_mr_comment',
            description: 'Leaves a comment on the Merge Request summarizing the fixes',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    comment: { type: Type.STRING, description: 'The markdown text of the comment' }
                },
                required: ['comment']
            } as any
        });

        const mcpToolMap = [{ functionDeclarations: geminiTools }];

        const orchestratorPrompt = `You are the AccessOps Orchestrator Agent. 
        A Merge Request was opened (Project ID: ${projectId}, MR IID: ${mrId}).
        Branch: ${sourceBranch}
        Modified Files: ${modifiedFiles}

        ==== CRITICAL RULES - READ BEFORE ACTING ====
        1. NEVER remove, modify, or break existing UI components, styling, CSS classes, animations, or non-vulnerable logic.
        2. ONLY add or modify lines directly responsible for XSS, Accessibility (WCAG), or Performance violations.
        3. If a file has no violations in your domain, leave it completely unchanged.
        4. Always prefix commit messages with "AccessOps: Auto-Remediation".
        ==============================================

        You manage 3 sub-agents:
        1. A11y Agent (Accessibility)
        2. Security Agent (XSS, Secrets)
        3. Performance Agent (React patterns)
        
        Using the provided tools, follow these exact steps:
        1. For each modified file in the list above, use 'get_file_contents' to read it. Use ref: '${sourceBranch}' and project_id: '${projectId}'.
        2. Analyze the code for all 3 sub-agent domains.
        3. Use 'push_files' or 'create_or_update_file' to push the fully corrected code back to the branch. Do not remove existing logic.
        4. Use 'leave_mr_comment' to leave a professional summary of all fixes applied on the MR.`;

        const chat = ai.chats.create({
            model: 'gemini-2.5-pro',
            config: {
                tools: mcpToolMap,
                systemInstruction: orchestratorPrompt
            }
        });

        log('[Orchestrator] Starting conversation with Gemini...');
        let response = await chat.sendMessage({ message: 'Begin the multi-agent audit now.' });

        // Agent Loop: Handle tool calls until the model is finished
        while (response.functionCalls && response.functionCalls.length > 0) {
            const functionResponses = [];

            // Process all parallel tool calls in the turn
            for (const call of response.functionCalls) {
                const args = call.args as any;
                log(`[Orchestrator] Gemini called tool: ${call.name}`);

                let result: any = { success: true };

                try {
                    if (call.name === 'leave_mr_comment') {
                        // Handle native extension tool
                        await gitlabApi(`/projects/${projectId}/merge_requests/${mrId}/notes`, 'POST', {
                            body: args.comment
                        });
                        result = { output: 'Comment posted successfully.' };
                    } else if (call.name === 'get_file_contents') {
                        // The official MCP server also has a bug reading files (throws reading 'map' error)
                        // So we handle file reading natively via GitLab API
                        const encodedPath = encodeURIComponent(args.file_path || args.filePath);
                        const ref = args.ref || sourceBranch;
                        const fileData: any = await gitlabApi(`/projects/${projectId}/repository/files/${encodedPath}?ref=${ref}`);
                        const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf8');
                        result = { output: decodedContent };
                    } else if (call.name === 'create_or_update_file' || call.name === 'push_files') {
                        // The official MCP server has a bug in its commit methods (throws reading 'map' error)
                        // So we handle file commits natively!
                        await gitlabApi(`/projects/${projectId}/repository/commits`, 'POST', {
                            branch: args.branch || sourceBranch,
                            commit_message: `AccessOps: Auto-Remediation - ${args.commit_message || 'Automated fix'}`,
                            actions: [{
                                action: 'update',
                                file_path: args.file_path || args.filePath,
                                content: args.content || args.newContent
                            }]
                        });
                        result = { output: 'File updated successfully.' };
                    } else {
                        // Route the tool call to the MCP server
                        const mcpResponse = await mcpClient.callTool({
                            name: call.name,
                            arguments: args
                        });
                        
                        const contentArr = (mcpResponse.content || []) as any[];
                        result = { output: contentArr.length > 0 ? contentArr.map(c => c.type === 'text' ? c.text : '').join('\n') : 'Success' };
                    }
                } catch (err: any) {
                    log(`[Orchestrator] Tool ${call.name} failed: ${err.message}`);
                    result = { error: err.message };
                }

                functionResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: result
                    }
                });
            }

            log(`[Orchestrator] Sending results back to Gemini...`);
            response = await chat.sendMessage({
                message: functionResponses
            });
        }

        log('[Orchestrator] Multi-Agent workflow completed.');

    } catch (error) {
        log(`[Orchestrator] Error triggering Agent: ${error}`);
    } finally {
        await transport.close();
    }
};
