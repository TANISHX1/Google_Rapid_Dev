import { Router, Request, Response } from 'express';
import { triggerAgentWorkflow } from '../services/agentService';

const router = Router();

// Endpoint for GitLab Webhooks
router.post('/', async (req: Request, res: Response) => {
    try {
        const payload = req.body;

        // Webhook security: Validate X-Gitlab-Token if configured
        const secretToken = process.env.GITLAB_WEBHOOK_SECRET;
        const providedToken = req.headers['x-gitlab-token'];
        
        if (secretToken && providedToken !== secretToken) {
            console.warn('[Webhook] Unauthorized access attempt: Invalid X-Gitlab-Token');
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // Verify it's a Merge Request event
        if (payload.object_kind !== 'merge_request') {
            return res.status(200).json({ message: 'Ignored: Not a Merge Request event.' });
        }

        const action = payload.object_attributes?.action;
        const mrId = payload.object_attributes?.iid;
        const projectId = payload.project?.id;

        console.log(`[Webhook] Received MR event: Action=${action}, MR ID=${mrId}, Project=${projectId}`);

        // We only care about newly opened, updated, or reopened MRs
        if (action === 'open' || action === 'update' || action === 'reopen') {
            // Acknowledge the webhook quickly so GitLab doesn't timeout
            res.status(202).json({ message: 'Merge Request event accepted. Processing...' });

            // Trigger the Agent Builder workflow asynchronously
            await triggerAgentWorkflow(projectId, mrId);
        } else {
            res.status(200).json({ message: `Ignored: MR action '${action}' doesn't require analysis.` });
        }
    } catch (error) {
        console.error('[Webhook] Error processing webhook:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
