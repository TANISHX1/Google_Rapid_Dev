import { Router } from 'express';
import { getIntegrationsConfig } from '../utils/config';

const router = Router();

function getGitLabCredentials() {
    const config = getIntegrationsConfig();
    const token = config.gitlab?.token || process.env.GITLAB_TOKEN || '';
    const projectId = config.gitlab?.projectId || process.env.GITLAB_PROJECT_ID || '';
    return { token, projectId };
}

async function gitlabApi(path: string) {
    const { token } = getGitLabCredentials();
    const url = `https://gitlab.com/api/v4${path}`;
    const response = await fetch(url, {
        headers: {
            'PRIVATE-TOKEN': token,
            'Content-Type': 'application/json',
        },
    });
    
    if (!response.ok) {
        throw new Error(`GitLab API error: ${response.statusText}`);
    }
    return response.json();
}

router.get('/info', async (req, res) => {
    try {
        const { projectId } = getGitLabCredentials();
        if (!projectId) {
            return res.status(400).json({ error: 'GITLAB_PROJECT_ID env variable is not set.' });
        }

        // Fetch user, project, commits, pipeline, and repository tree in parallel
        const [user, project, commits, pipelines, tree] = await Promise.all([
            gitlabApi('/user'),
            gitlabApi(`/projects/${projectId}`),
            gitlabApi(`/projects/${projectId}/repository/commits?per_page=50`).catch(() => []),
            gitlabApi(`/projects/${projectId}/pipelines?per_page=1`).catch(() => []),
            gitlabApi(`/projects/${projectId}/repository/tree?recursive=true&per_page=100`).catch(() => [])
        ]) as [any, any, any, any, any];

        const formattedCommits = commits.map((c: any) => {
            const timeAgo = (dateStr: string) => {
                const diff = Date.now() - new Date(dateStr).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 60) return `${mins} min ago`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs} hr ago`;
                return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            };

            return {
                sha: c.id.substring(0, 7),
                full_sha: c.id,
                author: c.author_name,
                msg: c.title,
                date: timeAgo(c.committed_date),
                parent_ids: (c.parent_ids || []).map((p: string) => p.substring(0, 7)),
            };
        });

        res.status(200).json({
            user: {
                username: user.username,
                name: user.name,
                avatar_url: user.avatar_url || ''
            },
            project: {
                name: project.name,
                default_branch: project.default_branch || 'main'
            },
            commits: formattedCommits,
            pipeline: pipelines[0] ? {
                status: pipelines[0].status.toUpperCase(),
                id: pipelines[0].id
            } : null,
            files: Array.isArray(tree) ? tree.map((f: any) => ({
                id: f.id,
                name: f.name,
                path: f.path,
                type: f.type
            })) : []
        });
    } catch (error: any) {
        console.error('[GitLab Info API] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/commit-diff/:sha', async (req, res) => {
    try {
        const { sha } = req.params;
        const { projectId } = getGitLabCredentials();
        if (!projectId) {
            return res.status(400).json({ error: 'GITLAB_PROJECT_ID env variable is not set.' });
        }

        // 1. Get commit diff to find modified files
        const diffs = await gitlabApi(`/projects/${projectId}/repository/commits/${sha}/diff`);
        if (!Array.isArray(diffs) || diffs.length === 0) {
            return res.status(200).json({
                filename: 'No Changes',
                language: 'plaintext',
                original: '',
                modified: ''
            });
        }

        // Use the first modified file
        const fileChange = diffs[0];
        const filePath = fileChange.new_path;

        // Determine language based on extension
        const ext = filePath.split('.').pop()?.toLowerCase() || 'plaintext';
        const langMap: Record<string, string> = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            html: 'html',
            css: 'css',
            json: 'json',
            py: 'python',
            sh: 'shell',
            md: 'markdown'
        };
        const language = langMap[ext] || 'plaintext';

        // 2. Fetch current file content
        let modifiedContent = '';
        try {
            const fileData = await gitlabApi(`/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${sha}`) as any;
            if (fileData.encoding === 'base64') {
                modifiedContent = Buffer.from(fileData.content, 'base64').toString('utf8');
            }
        } catch (e) {
            // File might be deleted
        }

        // 3. Fetch parent file content
        let originalContent = '';
        try {
            const commitDetails = await gitlabApi(`/projects/${projectId}/repository/commits/${sha}`) as any;
            const parentSha = commitDetails.parent_ids?.[0];
            if (parentSha) {
                const parentFileData = await gitlabApi(`/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${parentSha}`) as any;
                if (parentFileData.encoding === 'base64') {
                    originalContent = Buffer.from(parentFileData.content, 'base64').toString('utf8');
                }
            }
        } catch (e) {
            // File might be newly created
        }

        res.status(200).json({
            filename: filePath,
            language,
            original: originalContent,
            modified: modifiedContent
        });
    } catch (error: any) {
        console.error('[Commit Diff API] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
