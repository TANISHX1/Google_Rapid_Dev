import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION?.trim() || 'us-central1';
const AGENT_ID = process.env.GOOGLE_AGENT_ID || '';

// Initialize Google GenAI using Application Default Credentials (set via gcloud auth)
const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
});

/**
 * Triggers the Gemini 2.5 Pro agent workflow for a specific Merge Request.
 * @param projectId The GitLab project ID
 * @param mrId The GitLab Merge Request IID
 */
export const triggerAgentWorkflow = async (projectId: number, mrId: number) => {
    console.log(`[AgentService] Triggering Agent Workflow for Project: ${projectId}, MR: ${mrId}`);

    try {
        const prompt = `
            You are an expert accessibility auditor.
            A new Merge Request has been opened in GitLab (Project ID: ${projectId}, MR IID: ${mrId}).
            Please use your connected GitLab MCP Server tools to:
            1. Fetch the changed files for this Merge Request.
            2. Analyze the code for WCAG 2.1 AA violations (missing alt tags, aria-labels, form labels, poor contrast, non-semantic HTML, missing lang attributes, missing landmark regions).
            3. Generate the corrected code that fixes all violations while preserving the original business logic.
            4. Use the GitLab MCP tool to push a new commit to the MR's source branch with the fixes.
            5. Use the GitLab MCP tool to post a detailed comment on the MR listing every violation found and how it was fixed.

            Begin the audit now.
        `;

        console.log('[AgentService] Sending prompt to Gemini 2.5 Pro...');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        const result = response.text;
        console.log('[AgentService] Agent response full:', JSON.stringify(response, null, 2));
        console.log('[AgentService] Agent response text:', result ? result.substring(0, 500) + '...' : 'No text returned');

    } catch (error) {
        console.error('[AgentService] Error triggering Agent:', error);
    }
};
