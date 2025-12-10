import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

interface RClientCredentials {
    port: string;
    password: string;
    protocol: string;
}

class RiotClientHandler {
    credentials: RClientCredentials | null = null;
    connected = false;

    constructor() { }

    async tryConnect(): Promise<boolean> {
        // Path: %LOCALAPPDATA%\Riot Games\Riot Client\Config\lockfile
        const localAppData = process.env.LOCALAPPDATA;
        if (!localAppData) return false;

        const lockfilePath = path.join(localAppData, 'Riot Games', 'Riot Client', 'Config', 'lockfile');

        if (fs.existsSync(lockfilePath)) {
            try {
                // Content: name:pid:port:password:protocol
                const content = fs.readFileSync(lockfilePath, 'utf-8');
                const parts = content.split(':');
                if (parts.length >= 5) {
                    const newPort = parts[2];
                    if (!this.credentials || this.credentials.port !== newPort) {
                        console.log(`[RiotClient] Connected on port ${newPort}`);
                    }
                    this.credentials = {
                        port: parts[2],
                        password: parts[3],
                        protocol: parts[4]
                    };
                    this.connected = true;
                    return true;
                }
            } catch (e) {
                console.error('[RiotClient] Failed to read lockfile', e);
            }
        }

        this.connected = false;
        return false;
    }

    async request(method: string, endpoint: string, body?: any): Promise<any> {
        if (!this.connected || !this.credentials) {
            const reconnected = await this.tryConnect();
            if (!reconnected) return null;
        }

        const { port, password } = this.credentials!;
        const auth = Buffer.from(`riot:${password}`).toString('base64');

        const options: https.RequestOptions = {
            hostname: '127.0.0.1',
            port: parseInt(port),
            path: endpoint,
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            rejectUnauthorized: false
        };

        return new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch {
                        resolve(null); // or data if text 
                    }
                });
            });

            req.on('error', (e: any) => {
                // Suppress common connection errors (client closed, restarting, etc.)
                if (e.code !== 'ECONNREFUSED' && e.code !== 'ECONNRESET') {
                    console.error("[RiotClient] Request Error:", e);
                }
                this.connected = false;
                resolve(null);
            });

            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }
}

export const riotClientHandler = new RiotClientHandler();
