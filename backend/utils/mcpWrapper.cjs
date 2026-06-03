const { spawn } = require('child_process');

const child = spawn('npx', ['-y', '@modelcontextprotocol/server-gitlab'], {
    env: process.env,
    stdio: ['pipe', 'pipe', 'inherit'] // stdin, stdout, stderr
});

// Forward stdin to the child
process.stdin.pipe(child.stdin);

// Intercept stdout from the child, patch it, and forward to our stdout
child.stdout.on('data', (data) => {
    let str = data.toString();
    try {
        if (str.includes('"inputSchema":')) {
            const parsed = JSON.parse(str);
            if (parsed.result && parsed.result.tools) {
                parsed.result.tools.forEach((tool) => {
                    if (tool.inputSchema && !tool.inputSchema.type) {
                        tool.inputSchema.type = 'object';
                    }
                });
            }
            str = JSON.stringify(parsed) + '\n';
        }
    } catch (e) {
        // Ignore parse errors (might be partial chunks)
    }
    process.stdout.write(str);
});
