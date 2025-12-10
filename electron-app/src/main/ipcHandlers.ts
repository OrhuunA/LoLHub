import { ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { store, Account } from './store';
import { cryptoManager } from './crypto';
import { lcuHandler } from './lcu';
import { riotClientHandler } from './riotClient';
import { fetchRank } from './scraper';
import { performAutoLogin } from './autoLogin';

export function registerIpcHandlers() {
    // Shared State
    let isOfflineModeEnabled = false;

    // Store
    ipcMain.handle('get-accounts', () => {
        const acts = store.getAccounts();
        // Decrypt passwords for UI (or keep them hidden? implementation choice)
        // Actually, UI usually doesn't show password unless requested.
        // We send them as is (encrypted) and provide a separate decrypt method?
        // Or decrypt on load. The python app kept them in memory decrypted.
        // Let's decrypt them here for simplicity in this MVP.
        return acts.map(a => ({
            ...a,
            login_pw: cryptoManager.decrypt(a.login_pw)
        }));
    });

    ipcMain.handle('save-account', (_, account: Account) => {
        // Encrypt before saving
        const toSave = { ...account, login_pw: cryptoManager.encrypt(account.login_pw) };
        if (store.getAccounts().find(a => a.id === account.id)) {
            store.updateAccount(toSave);
        } else {
            store.addAccount(toSave);
        }
        return true;
    });

    ipcMain.handle('delete-account', (_, id: string) => {
        store.deleteAccount(id);
        return true;
    });

    // LCU
    ipcMain.handle('lcu-connect', async () => {
        return await lcuHandler.tryConnect();
    });

    ipcMain.handle('lcu-request', async (_, method, endpoint, body) => {
        return await lcuHandler.request(method, endpoint, body);
    });

    // Scraper
    ipcMain.handle('scrape-rank', async (_, server, riotId) => {
        return await fetchRank(server, riotId);
    });

    // Auto Login
    ipcMain.handle('auto-login', async (_, path, user, pass) => {
        // Use the shared flag
        await performAutoLogin(path, user, pass, isOfflineModeEnabled);
        return true;
    });

    // Config
    ipcMain.handle('get-config', () => {
        return store.getConfig();
    });

    ipcMain.handle('save-config', (_, config) => {
        store.saveConfig(config);
        return true;
    });

    // Open External
    ipcMain.handle('open-external', (_, url) => {
        shell.openExternal(url);
    });

    ipcMain.handle('open-config', async () => {
        const p = store.configPath;
        if (!fs.existsSync(p)) {
            store.saveConfig({});
        }
        await shell.openPath(p);
    });

    // Refresh Account Stats (Level, BE, RP)
    ipcMain.handle('refresh-lcu-stats', async (_, targetRiotId?: string) => {
        const connected = await lcuHandler.tryConnect();
        if (!connected) return store.getAccounts(); // Return current if fail

        try {
            // 1. Get Current Summoner
            const sumRes = await lcuHandler.requestFull('GET', '/lol-summoner/v1/current-summoner');
            if (!sumRes || !sumRes.ok) return store.getAccounts();
            const summoner = sumRes.data;
            const currentRiotId = `${summoner.gameName}#${summoner.tagLine}`;

            // Identity Check
            if (targetRiotId) {
                const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
                if (norm(targetRiotId) !== norm(currentRiotId)) {
                    throw new Error(`Account Mismatch: App is looking for ${targetRiotId}, but LCU is logged in as ${currentRiotId}.`);
                }
            }

            const currentLevel = summoner.summonerLevel;

            console.log(`[Stats] LCU connected as: ${currentRiotId} (Level: ${currentLevel})`);

            // 2. Get Wallet (BE, RP)
            let be = 0;
            let rp = 0;

            // Try store wallet first
            const walletRes = await lcuHandler.requestFull('GET', '/lol-store/v1/wallet');
            if (walletRes && walletRes.ok) {
                const wallet = walletRes.data;
                console.log('[Stats] Got wallet from lol-store:', wallet);
                be = wallet.ip || wallet.blueEssence || wallet.be || 0;
                rp = wallet.rp || wallet.RP || 0;
            } else {
                console.log('[Stats] Failed to get lol-store wallet, trying inventory wallet...');
                // Fallback to inventory wallet
                const invRes = await lcuHandler.requestFull('GET', '/lol-inventory/v1/wallet?currencyTypes=["LOL_BLUE_ESSENCE","LOL_RIOT_POINTS"]');
                if (invRes && invRes.ok) {
                    const inv = invRes.data;
                    console.log('[Stats] Got wallet from lol-inventory:', inv);
                    // Inventory often returns like: { "LOL_BLUE_ESSENCE": 1234, ... }
                    // User report shows lowercase keys: lol_blue_essence
                    be = inv['LOL_BLUE_ESSENCE'] || inv['lol_blue_essence'] || 0;
                    rp = inv['LOL_RIOT_POINTS'] || inv['lol_riot_points'] || inv['lol_rp'] || inv['RP'] || inv['rp'] || 0;
                } else {
                    console.error('[Stats] Failed to get wallet from both endpoints.');
                }
            }

            // 3. Update Store
            const accounts = store.getAccounts();

            // Normalize: lowercase, remove all whitespace
            const norm = (s: string) => s ? s.toLowerCase().replace(/\s/g, '') : '';
            const normalizedCurrent = norm(currentRiotId);

            // Find account - relaxed matching
            let target = accounts.find(a => norm(a.riot_id) === normalizedCurrent);
            if (!target) {
                // Try matching by login_id if we can guess it? No, risky.
                // Maybe partial match if tag is missing in store?
                target = accounts.find(a => norm(a.riot_id).includes(normalizedCurrent) || normalizedCurrent.includes(norm(a.riot_id)));
            }

            if (target) {
                console.log(`[Stats] Updating stats for ${target.riot_id}: Level=${currentLevel}, BE=${be}, RP=${rp}`);
                target.level = currentLevel;
                target.blue_essence = be;
                target.rp = rp;
                target.last_seen = new Date().toLocaleString();

                // --- INVENTORY SYNC START ---
                try {
                    const summonerId = summoner.summonerId;

                    // 1. Get DD Map
                    let ddMap: Record<string, string> = {};
                    try {
                        const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                        const vData = await vRes.json() as string[];
                        const version = vData[0];
                        const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
                        const data = await cRes.json() as any;
                        Object.values(data.data).forEach((c: any) => {
                            ddMap[c.key] = c.id;
                        });
                    } catch (e) {
                        console.error('[Stats] DD Map fetch failed, skins may lack URLs', e);
                    }

                    // 2. Fetch Skins
                    const skinRes = await lcuHandler.requestFull('GET', `/lol-champions/v1/inventories/${summonerId}/skins-minimal`);
                    if (skinRes && skinRes.ok) {
                        const skins = skinRes.data as any[];
                        const ownedSkins = skins.filter(s => s.ownership.owned && !s.isBase).map(s => {
                            const alias = ddMap[s.championId] || 'Unknown';
                            const skinNum = s.id % 1000;
                            return {
                                id: s.id,
                                name: s.name,
                                championId: s.championId,
                                alias: alias,
                                loadingUrl: alias !== 'Unknown' ? `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${alias}_${skinNum}.jpg` : null,
                                splashUrl: alias !== 'Unknown' ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${alias}_${skinNum}.jpg` : null,
                            };
                        });
                        target.skins = ownedSkins;
                        target.skin_count = ownedSkins.length;
                        console.log(`[Stats] Synced ${ownedSkins.length} skins for ${target.riot_id}`);
                    }
                } catch (invErr) {
                    console.error('[Stats] Inventory sync failed:', invErr);
                }
                // --- INVENTORY SYNC END ---

                store.saveAccounts(accounts);
            } else {
                console.warn(`[Stats] No matching account found for '${currentRiotId}' in store. Valid IDs: ${accounts.map(a => a.riot_id).join(', ')}`);
            }

            return accounts;

        } catch (e) {
            console.error('Error refreshing stats:', e);
            return store.getAccounts();
        }
    });
    // Set Chat Presence (e.g. Offline)
    // isOfflineModeEnabled is defined at top of scope

    ipcMain.handle('get-offline-status', () => {
        return { isOffline: isOfflineModeEnabled };
    });

    ipcMain.handle('set-chat-presence', async (_, availability) => {
        // availability: "chat", "away", "dnd", "mobile", "offline"

        if (availability === 'offline') {
            isOfflineModeEnabled = true;
            try {
                // One-shot attempt for running clients
                console.log('[Offline Mode] Setting Offline (One-Shot)...');

                // 1. Riot Client (Mock Session)
                const rcConnected = await riotClientHandler.tryConnect();
                if (rcConnected) {
                    await riotClientHandler.request('PUT', '/chat/v1/session', {
                        chatUrl: "https://us-1.chat.si.riotgames.com",
                        availability: 'offline',
                        statusMessage: '',
                        idToken: "",
                        lol: { gameStatus: "outOfGame" }
                    });
                }

                // 2. LCU (Kill Session)
                const lcuConnected = await lcuHandler.tryConnect();
                if (lcuConnected) {
                    await lcuHandler.request('DELETE', '/lol-chat/v1/session');
                }

                console.log('[Offline Mode] Offline commands sent.');
                return { success: true };
            } catch (e: any) {
                console.error('Failed to set offline:', e);
                return { success: false, error: e.message };
            }
        } else {
            isOfflineModeEnabled = false;
            // Re-enable Chat
            try {
                console.log('[Offline Mode] Going Online...');

                // 1. Riot Client Restore
                const rcConnected = await riotClientHandler.tryConnect();
                if (rcConnected) {
                    await riotClientHandler.request('PUT', '/chat/v1/session', {
                        availability: 'chat',
                        statusMessage: ''
                    });
                }

                // 2. LCU Restore
                const lcuConnected = await lcuHandler.tryConnect();
                if (lcuConnected) {
                    await lcuHandler.request('POST', '/lol-chat/v1/session', {});
                    const body = {
                        availability: availability, // 'chat'
                        lol: { gameStatus: "outOfGame" }
                    };
                    await lcuHandler.request('PUT', '/lol-chat/v1/me', body);
                }

                console.log(`[Offline Mode] Restored online status.`);
                return { success: true };
            } catch (e) {
                console.error('Restore presence failed:', e);
                return { success: false, error: 'Failed to disable Offline Mode.' };
            }
        }
    });

    // Get Account Inventory (Champions, Skins)
    ipcMain.handle('get-account-inventory', async (_, targetRiotId?: string) => {
        const connected = await lcuHandler.tryConnect();
        if (!connected) return { champions: [], skins: [] };

        try {
            // 0. Fetch DDragon Map for Alias resolution (ID -> Name)
            let ddMap: Record<string, string> = {};
            try {
                // We can reuse the logic from get-ddragon-champions
                // Ideally this should be cached or a shared function
                const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                const vData = await vRes.json() as string[];
                const version = vData[0];
                const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
                const data = await cRes.json() as any;
                Object.values(data.data).forEach((c: any) => {
                    ddMap[c.key] = c.id; // Key "62" -> ID "MonkeyKing"
                });
            } catch (e) { console.error('DD Map fetch failed inside inventory:', e); }

            const sumRes = await lcuHandler.requestFull('GET', '/lol-summoner/v1/current-summoner');
            if (!sumRes || !sumRes.ok) return { champions: [], skins: [] };
            const summoner = sumRes.data;
            const currentRiotId = `${summoner.gameName}#${summoner.tagLine}`;

            // Identity Check
            if (targetRiotId) {
                const norm = (s: string) => s.toLowerCase().replace(/\s/g, '');
                if (norm(targetRiotId) !== norm(currentRiotId)) {
                    throw new Error(`Account Mismatch: App is looking for ${targetRiotId}, but LCU is logged in as ${currentRiotId}.`);
                }
            }

            const summonerId = summoner.summonerId;

            // Champions
            const champRes = await lcuHandler.requestFull('GET', `/lol-champions/v1/inventories/${summonerId}/champions-minimal`);
            const champions = (champRes && champRes.ok) ? champRes.data : [];

            // Skins
            const skinRes = await lcuHandler.requestFull('GET', `/lol-champions/v1/inventories/${summonerId}/skins-minimal`);
            const skins = (skinRes && skinRes.ok) ? skinRes.data : [];

            // Filter owned only
            const ownedChamps = (champions as any[]).filter(c => c.ownership.owned).map(c => ({
                id: c.id,
                name: c.name,
                alias: c.alias,
                title: c.title,
                squarePortraitPath: c.squarePortraitPath
            }));

            // Filter owned skins (excluding base skins?)
            // Base skins have isBase: true. 
            const ownedSkins = (skins as any[]).filter(s => s.ownership.owned && !s.isBase).map(s => {
                const alias = ddMap[s.championId] || 'Unknown';
                // Skin ID is usually ChampID * 1000 + SkinNum for base, but for skins it varies.
                // Actually, ensure we parse skin num correctly.
                // Riot IDs: 157002 -> 157 (Yasuo) 002 (Skin 2)
                // Skin Num = s.id % 1000
                const skinNum = s.id % 1000;

                return {
                    id: s.id,
                    name: s.name,
                    championId: s.championId,
                    alias: alias,
                    // DDragon Loading URL
                    loadingUrl: alias !== 'Unknown' ? `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${alias}_${skinNum}.jpg` : null,
                    splashUrl: alias !== 'Unknown' ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${alias}_${skinNum}.jpg` : null,
                };
            });

            // Save to Store
            const accounts = store.getAccounts();
            const norm = (s: string) => s ? s.toLowerCase().replace(/\s/g, '') : '';
            const normalizedCurrent = norm(currentRiotId);

            let target = accounts.find(a => norm(a.riot_id) === normalizedCurrent);
            if (!target) {
                target = accounts.find(a => norm(a.riot_id).includes(normalizedCurrent) || normalizedCurrent.includes(norm(a.riot_id)));
            }

            if (target) {
                target.champions = ownedChamps;
                target.skins = ownedSkins;
                target.skin_count = ownedSkins.length;
                store.saveAccounts(accounts);
                console.log(`[Inventory] Saved ${ownedChamps.length} champs and ${ownedSkins.length} skins for ${target.riot_id}`);
            }

            return { champions: ownedChamps, skins: ownedSkins };

        } catch (e) {
            console.error('Error fetching inventory:', e);
            return { champions: [], skins: [] };
        }
    });

    // Get DDragon Champions Map (for images)
    ipcMain.handle('get-ddragon-champions', async () => {
        try {
            // 1. Get Version
            let version = '14.23.1';
            try {
                const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                if (vRes.ok) {
                    const vData = await vRes.json() as string[];
                    if (vData.length > 0) version = vData[0];
                }
            } catch (e) { console.error('DD Version fetch failed', e); }

            // 2. Get Data
            const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
            if (!cRes.ok) throw new Error('DD Data failed');
            const data = await cRes.json() as any;

            // Map: ID (int or string key) -> Alias (e.g. "Aatrox")
            // DDragon "key" is the string ID "266". 
            // We want to return a map of Key -> Alias.
            // data.data is { "Aatrox": { key: "266", id: "Aatrox", ... }, ... }

            const map: Record<string, string> = {};
            Object.values(data.data).forEach((c: any) => {
                map[c.key] = c.id; // c.id is the Alias in DDragon terms (e.g. "MonkeyKing")
            });

            return { version, map };

        } catch (e) {
            console.error('Error getting DD champions:', e);
            return { version: '14.23.1', map: {} };
        }
    });



    // Old simple champion list (can keep or remove, keeping for compatibility if utilized)
    ipcMain.handle('get-champions', async () => {
        try {
            // 1. Get Version
            let version = '14.23.1';
            try {
                const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                if (vRes.ok) {
                    const vData = await vRes.json() as string[];
                    if (vData.length > 0) version = vData[0];
                }
            } catch (e) { console.error('DD Version fetch failed', e); }

            // 2. Get Data
            const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
            if (!cRes.ok) throw new Error('DD Data failed');
            const data = await cRes.json() as any;

            // Transform to list
            const champions = Object.values(data.data).map((c: any) => ({
                id: c.key,   // Integer ID as string, e.g. "266"
                name: c.name // Name, e.g. "Aatrox"
            }));

            return champions;

        } catch (e) {
            console.error('Error fetching champions:', e);
            return [];
        }
    });

    // Config Backup / Restore
    ipcMain.handle('backup-game-config', async () => {
        // Try to find LoL Config Path. Usually C:\Riot Games\League of Legends\Config\PersistedSettings.json
        // Or check config for user set path
        const cfg = store.getConfig();
        let gamePath = cfg.lolPath ? path.join(path.dirname(cfg.lolPath), 'Config', 'PersistedSettings.json') : null;

        // Fallback default
        if (!gamePath || !fs.existsSync(gamePath)) {
            const defaultPath = 'C:\\Riot Games\\League of Legends\\Config\\PersistedSettings.json';
            if (fs.existsSync(defaultPath)) {
                gamePath = defaultPath;
            }
        }

        if (!gamePath || !fs.existsSync(gamePath)) {
            // If still not found, ask user? Or return error
            return { success: false, message: 'Could not find League of Legends Config file.' };
        }

        try {
            const content = fs.readFileSync(gamePath);
            fs.writeFileSync(store.settingsBackupPath, content);
            return { success: true, message: 'Settings backed up successfully.' };
        } catch (e: any) {
            console.error('Backup failed:', e);
            return { success: false, message: `Backup failed: ${e.message}` };
        }
    });

    ipcMain.handle('restore-game-config', async () => {
        const backupPath = store.settingsBackupPath;
        if (!fs.existsSync(backupPath)) {
            return { success: false, message: 'No backup found. Please backup settings first.' };
        }

        const cfg = store.getConfig();
        let gameDir = cfg.lolPath ? path.join(path.dirname(cfg.lolPath), 'Config') : null;

        // Fallback default
        if (!gameDir || !fs.existsSync(gameDir)) {
            const defaultDir = 'C:\\Riot Games\\League of Legends\\Config';
            if (fs.existsSync(defaultDir)) {
                gameDir = defaultDir;
            }
        }

        if (!gameDir || !fs.existsSync(gameDir)) {
            return { success: false, message: 'Could not find League of Legends Config directory.' };
        }

        try {
            const target = path.join(gameDir, 'PersistedSettings.json');

            // Check if file exists and handle Read-Only attribute
            if (fs.existsSync(target)) {
                try {
                    // removing read-only attribute if present
                    // 0o666 represents read/write permissions for owner, group, and others
                    fs.chmodSync(target, 0o666);
                } catch (err) {
                    console.warn('Could not change file permissions:', err);
                    // continue anyway, might work or fail with helpful error
                }
            }

            const content = fs.readFileSync(backupPath);
            fs.writeFileSync(target, content);
            return { success: true, message: 'Settings restored successfully. Please restart client if open.' };
        } catch (e: any) {
            console.error('Restore failed:', e);
            // Check for common errors
            if (e.code === 'EBUSY') {
                return { success: false, message: 'Restore failed: File is locked. Please close League of Legends and try again.' };
            }
            if (e.code === 'EPERM') {
                return { success: false, message: 'Restore failed: Permission denied. Try running as Administrator or check if file is Read-Only.' };
            }
            return { success: false, message: `Restore failed: ${e.message}` };
        }
    });
}
