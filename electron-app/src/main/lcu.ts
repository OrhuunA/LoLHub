import * as fs from 'fs';
import * as https from 'https';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

interface LCUCredentials {
    port: string;
    password: string;
    protocol: string;
}

class LCUHandler {
    credentials: LCUCredentials | null = null;
    connected = false;

    constructor() { }

    async tryConnect(): Promise<boolean> {
        // Fast path: Check common locations
        const lockfilePaths = [
            "C:\\Riot Games\\League of Legends\\lockfile",
            "D:\\Riot Games\\League of Legends\\lockfile",
        ];

        let lockfile = '';
        for (const p of lockfilePaths) {
            if (fs.existsSync(p)) {
                lockfile = p;
                break;
            }
        }

        if (lockfile) {
            try {
                const content = fs.readFileSync(lockfile, 'utf-8');
                const [, , port, password, protocol] = content.split(':');
                this.credentials = { port, password, protocol };
                this.connected = true;
                return true;
            } catch (e) {
                // If read fails, fall through to process check
            }
        }

        // Slow path: Dynamic process check
        try {
            const { stdout } = await execPromise('wmic process where "name=\'LeagueClientUx.exe\'" get commandline');
            if (!stdout) return false;

            // Parse command line arguments
            // Looking for --app-port=12345 --remoting-auth-token=abcdefg
            const portMatch = stdout.match(/--app-port=(\d+)/);
            const authMatch = stdout.match(/--remoting-auth-token=([\w-]+)/);

            if (portMatch && authMatch) {
                this.credentials = {
                    port: portMatch[1],
                    password: authMatch[1],
                    protocol: 'https'
                };
                this.connected = true;
                return true;
            }
        } catch (e) {
            // Process not found or other error
        }

        this.connected = false;
        return false;
    }

    async requestFull(method: string, endpoint: string, body?: any): Promise<{ ok: boolean, status: number, data: any } | null> {
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
                    let parsed = data;
                    try {
                        parsed = JSON.parse(data);
                    } catch { }

                    resolve({
                        ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
                        status: res.statusCode || 0,
                        data: parsed
                    });
                });
            });

            req.on('error', (e: any) => {
                this.connected = false;
                // Suppress socket hang up / ECONNRESET / ECONNREFUSED as they are common during session resets or when client is closed
                if (e.code !== 'ECONNRESET' && e.message !== 'socket hang up' && e.code !== 'ECONNREFUSED') {
                    console.error("LCU Request Error:", e);
                }
                resolve(null);
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    async request(method: string, endpoint: string, body?: any) {
        const res = await this.requestFull(method, endpoint, body);
        return res ? res.data : null;
    }
}

export const lcuHandler = new LCUHandler();
