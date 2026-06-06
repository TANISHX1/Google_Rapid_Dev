import { Router } from 'express';
import { getIntegrationsConfig, saveIntegrationsConfig } from '../utils/config';

const router = Router();

function maskToken(token?: string): string {
    if (!token) return '';
    if (token.length <= 10) return '********';
    return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
}

function maskEmail(email?: string): string {
    if (!email) return '';
    const at = email.indexOf('@');
    if (at <= 1) return '****@' + email.split('@')[1];
    return email[0] + '****@' + email.split('@')[1];
}

router.get('/', (req, res) => {
    try {
        const config = getIntegrationsConfig();

        const gitlabToken = config.gitlab?.token || process.env.GITLAB_TOKEN || '';
        const gitlabProjectId = config.gitlab?.projectId || process.env.GITLAB_PROJECT_ID || '';

        const notionToken = config.notion?.token || '';
        const jiraToken = config.jira?.token || '';
        const slackToken = config.slack?.token || '';

        const googleClientEmail = config.google?.clientEmail || '';
        const googlePrivateKey = config.google?.privateKey || '';
        const googleSheetId = config.google?.sheetId || '';
        const googleDocId = config.google?.docId || '';

        res.status(200).json({
            gitlab: {
                connected: !!(gitlabToken && gitlabProjectId),
                token: maskToken(gitlabToken),
                projectId: gitlabProjectId
            },
            google: {
                connected: !!(googleClientEmail && googlePrivateKey),
                clientEmail: maskEmail(googleClientEmail),
                sheetId: googleSheetId,
                docId: googleDocId
            },
            notion: {
                connected: !!notionToken,
                token: maskToken(notionToken)
            },
            jira: {
                connected: !!jiraToken,
                token: maskToken(jiraToken)
            },
            slack: {
                connected: !!slackToken,
                token: maskToken(slackToken)
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/connect', (req, res) => {
    try {
        const { type, token, projectId } = req.body;
        const config = getIntegrationsConfig();

        if (type === 'gitlab') {
            config.gitlab = {
                token: token || config.gitlab?.token || '',
                projectId: projectId || config.gitlab?.projectId || ''
            };
        } else if (type === 'google') {
            const { clientEmail, privateKey, sheetId, docId } = req.body;
            config.google = {
                clientEmail: clientEmail || config.google?.clientEmail || '',
                privateKey: privateKey || config.google?.privateKey || '',
                sheetId: sheetId || config.google?.sheetId || '',
                docId: docId || config.google?.docId || ''
            };
        } else if (type === 'notion') {
            config.notion = { token };
        } else if (type === 'jira') {
            config.jira = { token };
        } else if (type === 'slack') {
            config.slack = { token };
        } else {
            return res.status(400).json({ error: 'Unsupported integration type' });
        }

        saveIntegrationsConfig(config);
        res.status(200).json({ success: true, message: `${type} integration updated.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
