import * as child_process from 'child_process';
import * as fs from 'fs';

export async function performAutoLogin(riotPath: string, username: string, pass: string, offlineMode: boolean = false) {
    // 1. Launch Riot Client
    if (fs.existsSync(riotPath)) {
        const args = ['--launch-product=league_of_legends', '--launch-patchline=live'];

        if (offlineMode) {
            console.log('[AutoLogin] Launching in Offline Mode (Deceive Method)...');
            // Inject argument to redirect chat host to localhost (dead end)
            args.push('--riotclient-chat-host=127.0.0.1');
        }

        child_process.spawn(riotPath, args, {
            detached: true,
            stdio: 'ignore'
        }).unref();
    }

    // 2. Wait a bit
    await new Promise(r => setTimeout(r, 8000));

    // 3. Type credentials using PowerShell SendKeys
    // We construct a PS script that activates the window and types
    const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("^a")
    [System.Windows.Forms.SendKeys]::SendWait("{BACKSPACE}")
    [System.Windows.Forms.SendKeys]::SendWait("${username}")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("{TAB}")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("${pass}")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
  `;

    const child = child_process.spawn('powershell', ['-Command', psScript]);

    return new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
    });
}
