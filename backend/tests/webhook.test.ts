import request from 'supertest';
import { app } from '../server';
import * as agentService from '../services/agentService';

// Mock the agentService so we don't actually trigger the workflow during tests
jest.mock('../services/agentService', () => ({
    triggerAgentWorkflow: jest.fn().mockResolvedValue(undefined)
}));

describe('Webhook Routes', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should ignore non-merge_request events', async () => {
        const res = await request(app)
            .post('/api/webhook')
            .send({ object_kind: 'push' });
        
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Ignored: Not a Merge Request event/);
        expect(agentService.triggerAgentWorkflow).not.toHaveBeenCalled();
    });

    it('should accept and process open MR events', async () => {
        const res = await request(app)
            .post('/api/webhook')
            .send({
                object_kind: 'merge_request',
                object_attributes: { action: 'open', iid: 123 },
                project: { id: 456 }
            });
        
        expect(res.status).toBe(202);
        expect(res.body.message).toMatch(/Processing/);
        expect(agentService.triggerAgentWorkflow).toHaveBeenCalledWith(456, 123);
    });

    it('should block unauthorized requests if a secret is set', async () => {
        // Temporarily set a secret
        process.env.GITLAB_WEBHOOK_SECRET = 'my_secret_token';

        const res = await request(app)
            .post('/api/webhook')
            .set('x-gitlab-token', 'wrong_token')
            .send({
                object_kind: 'merge_request',
                object_attributes: { action: 'open', iid: 123 },
                project: { id: 456 }
            });
        
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/Unauthorized/);
        expect(agentService.triggerAgentWorkflow).not.toHaveBeenCalled();

        // Cleanup
        delete process.env.GITLAB_WEBHOOK_SECRET;
    });

});
