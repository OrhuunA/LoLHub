import * as fs from 'fs';
import * as path from 'path';
// import { app } from 'electron';

export interface Account {
    id: string;
    login_id: string;
    login_pw: string; // Encrypted
    riot_id: string;
    server: string;
    rank_tier: string;
    rank_div: string;
    lp: number;
    note: string;
    last_seen: string;
    level: number;
    blue_essence: number;
    rp: number;
    skin_count: number;
    winrate: string;
    champions?: any[];
    skins?: any[];
}

class Store {
    private userDataPath: string = '';

    init(userDataPath: string) {
        this.userDataPath = userDataPath;
    }

    public get configPath() {
        if (!this.userDataPath) throw new Error("Store not initialized");
        return path.join(this.userDataPath, 'config.json');
    }

    private get dataFile() {
        if (!this.userDataPath) throw new Error("Store not initialized");
        return path.join(this.userDataPath, 'accounts.json');
    }

    private get configFile() {
        if (!this.userDataPath) throw new Error("Store not initialized");
        return path.join(this.userDataPath, 'config.json');
    }

    public get settingsBackupPath() {
        if (!this.userDataPath) throw new Error("Store not initialized");
        return path.join(this.userDataPath, 'Main_PersistedSettings.json');
    }

    getAccounts(): Account[] {
        if (!fs.existsSync(this.dataFile)) return [];
        try {
            const raw = fs.readFileSync(this.dataFile, 'utf-8');
            const data = JSON.parse(raw);
            return data;
        } catch {
            return [];
        }
    }

    saveAccounts(accounts: Account[]) {
        fs.writeFileSync(this.dataFile, JSON.stringify(accounts, null, 2));
    }

    addAccount(account: Account) {
        const accounts = this.getAccounts();
        accounts.push(account);
        this.saveAccounts(accounts);
    }

    updateAccount(updated: Account) {
        const accounts = this.getAccounts();
        const index = accounts.findIndex(a => a.id === updated.id);
        if (index !== -1) {
            accounts[index] = updated;
            this.saveAccounts(accounts);
        }
    }

    deleteAccount(id: string) {
        let accounts = this.getAccounts();
        accounts = accounts.filter(a => a.id !== id);
        this.saveAccounts(accounts);
    }

    getConfig(): any {
        if (!fs.existsSync(this.configFile)) return {};
        try {
            const raw = fs.readFileSync(this.configFile, 'utf-8');
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    saveConfig(config: any) {
        fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    }
}

export const store = new Store();
