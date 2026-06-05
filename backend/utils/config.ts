import fs from 'fs';
import path from 'path';

const configPath = path.join(__dirname, '..', 'config.json');

export interface IntegrationsConfig {
    gitlab?: {
        token?: string;
        projectId?: string;
    };
    notion?: {
        token?: string;
    };
    jira?: {
        token?: string;
    };
    slack?: {
        token?: string;
    };
}

export function getIntegrationsConfig(): IntegrationsConfig {
    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(content);
        }
    } catch (e) {
        console.error('[Config Util] Error reading config file:', e);
    }
    return {};
}

export function saveIntegrationsConfig(config: IntegrationsConfig): void {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
        console.error('[Config Util] Error writing config file:', e);
    }
}
