/// <reference types="vite/client" />

interface Account {
    id: string;
    login_id: string;
    riot_id: string;
    rank_tier: string;
    rank_div: string;
    lp: number;
    winrate?: string;
    login_pw: string;
    server: string;
    note?: string;
    last_seen?: string;
    level?: number;
    blue_essence?: number;
    rp?: number;
    champions?: any[];
    skins?: any[];
}

interface Window {
    api: {
        getAccounts: () => Promise<Account[]>;
        addAccount: (acc: Omit<Account, 'id'>) => Promise<Account[]>;
        saveAccount: (acc: any) => Promise<boolean>;
        deleteAccount: (id: string) => Promise<Account[]>;
        login: (acc: Account) => Promise<boolean>;
        lcuConnect: () => Promise<boolean>;
        lcuRequest: (method: string, endpoint: string, body?: any) => Promise<any>;
        scrapeRank: (server: string, riotId: string) => Promise<any>;
        autoLogin: (path: string, user: string, pass: string) => Promise<void>;
        openExternal: (url: string) => Promise<void>;
        openLogProfile: (acc: Account) => Promise<void>;
        getConfig: () => Promise<any>;
        saveConfig: (config: any) => Promise<boolean>;
        openConfig: () => Promise<void>;
        getChampions: () => Promise<{ id: string, name: string }[]>;
        refreshLCUStats: (targetRiotId?: string) => Promise<Account[]>;
        getAccountInventory: (targetRiotId?: string) => Promise<{ champions: any[], skins: any[] }>;
        setChatPresence: (status: string) => Promise<{ success: boolean, error?: string }>;
        getOfflineStatus: () => Promise<{ isOffline: boolean }>;
        getDDragonChampions: () => Promise<{ version: string, map: Record<string, string> }>;
        backupGameConfig: () => Promise<{ success: boolean, message: string }>;
        restoreGameConfig: () => Promise<{ success: boolean, message: string }>;
    }
}
