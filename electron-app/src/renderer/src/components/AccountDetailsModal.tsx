import { useState, useEffect } from 'react';

interface Props {
    account: Account;
    onClose: () => void;
    onUpdate: () => void; // Trigger refresh of account list in parent
}

export const AccountDetailsModal = ({ account, onClose, onUpdate }: Props) => {
    const [activeTab, setActiveTab] = useState<'champions' | 'skins'>('champions');
    const [inventory, setInventory] = useState<{ champions: any[], skins: any[] }>({ champions: [], skins: [] });
    const [loadingInv, setLoadingInv] = useState(false);
    const [search, setSearch] = useState('');
    // DDragon not needed for images anymore (using CommunityDragon)
    const [syncing, setSyncing] = useState(false);

    // Load inventory and DD data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // If account has saved data, use it first
        if (account.champions && account.champions.length > 0) {
            console.log('[Details] Using cached inventory');
            setInventory({ champions: account.champions, skins: account.skins || [] });
        } else {
            setLoadingInv(true);
            const inv = await window.api.getAccountInventory();
            setInventory(inv);
            setLoadingInv(false);
        }

    }

    // DDragon map fetch removed

    const handleSync = async () => {
        setSyncing(true);
        try {
            await window.api.refreshLCUStats(account.riot_id);
            // Force reload from backend (which will save to store)
            const inv = await window.api.getAccountInventory(account.riot_id);
            setInventory(inv);
            onUpdate(); // Refresh parent list
        } catch (e: any) {
            alert(e.message || 'Sync failed. Please ensure you are logged into the correct account in League.');
        } finally {
            setSyncing(false);
        }
    };

    const openLeagueOfGraphs = () => {
        // Map server to slug
        // League of Graphs expects: euw, eune, tr, na, etc. (NO numbers like tr1, euw1)
        const serverMap: Record<string, string> = {
            'EU West': 'euw', 'EUW': 'euw', 'EUW1': 'euw',
            'EU East': 'eune', 'EUNE': 'eune', 'EUN1': 'eune',
            'North America': 'na', 'NA': 'na', 'NA1': 'na',
            'Turkey': 'tr', 'TR': 'tr', 'TR1': 'tr',
            'Oceania': 'oce', 'OC1': 'oce',
            'Brazil': 'br', 'BR1': 'br',
            'LAS': 'las', 'LA2': 'las',
            'LAN': 'lan', 'LA1': 'lan',
            'Russia': 'ru', 'RU': 'ru',
            'Japan': 'jp', 'JP1': 'jp',
            'Korea': 'kr', 'KR': 'kr'
        };


        let slug = serverMap[account.server] || account.server.toLowerCase();
        // Remove confusing trailing numbers if they exist in raw data (e.g. "tr1" -> "tr")
        slug = slug.replace(/\d+$/, '');

        // Format Riot ID: Name#Tag -> Name-Tag
        let path = account.riot_id.replace('#', '-');
        // Handle special chars
        path = encodeURIComponent(path).replace(/%23/g, '-');

        const url = `https://www.leagueofgraphs.com/summoner/${slug}/${path}`;
        window.api.openExternal(url);
    };


    const filteredList = (activeTab === 'champions' ? inventory.champions : inventory.skins).filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    // Images restored
    const [ddVersion, setDdVersion] = useState('14.23.1');
    const [champMap, setChampMap] = useState<Record<string, string>>({}); // ID -> Alias

    useEffect(() => {
        // Fetch latest DD version and Champion Map
        const initDD = async () => {
            try {
                const vRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
                const vData = await vRes.json();
                const ver = (vData && vData.length > 0) ? vData[0] : '14.23.1';
                setDdVersion(ver);

                const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/champion.json`);
                const cData = await cRes.json();

                const map: Record<string, string> = {};
                // DDragon structure: data.data["Aatrox"] = { key: "266", id: "Aatrox", ... }
                // We want Key(ID) -> Id(Alias)
                Object.values(cData.data).forEach((c: any) => {
                    map[c.key] = c.id;
                });
                setChampMap(map);
            } catch (e) {
                console.error('Failed to init DDragon', e);
            }
        };
        initDD();
    }, []);

    // Helper to get image URL using DDragon (Riot CDN)
    const getImageUrl = (item: any, type: 'champion' | 'skin') => {
        // Resolve Alias
        // 1. Use item.alias if available (LCU cached)
        // 2. Lookup ID in champMap (Robust fallback)
        // 3. Fallback to item.name (Often works, but fails for Wukong/MonkeyKing)
        const idStr = item.id ? item.id.toString() : '';
        const resolvedAlias = item.alias || champMap[idStr] || item.name || '';

        // Clean up alias if it has spaces (DDragon doesn't have spaces typically, e.g. MissFortune, XinZhao? No, XinZhao is XinZhao.py? No it's usually PascalCase without spaces)
        // Actually DDragon ID is e.g. "XinZhao", "MissFortune". Name might comprise spaces.
        // So better rely on map. If map fails, removing spaces from Name is a decent heuristic.
        const safeAlias = resolvedAlias.replace(/\s+/g, '');

        if (type === 'champion') {
            return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${safeAlias}.png`;
        } else {
            // Skin
            if (item.loadingUrl) return item.loadingUrl;

            // Fallback for Skins
            return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${safeAlias}_${item.id % 1000}.jpg`;
        }
    };
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header / Stats */}
                <div className="bg-gray-800 p-6 border-b border-gray-700 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            {account.riot_id.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{account.riot_id}</h2>
                            <p className="text-gray-400">{account.login_id}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-yellow-500 font-bold">Lvl: {account.level || '??'}</span>
                                <span className="text-blue-400">BE: {account.blue_essence?.toLocaleString() || '0'}</span>
                                <span className="text-red-400">RP: {account.rp?.toLocaleString() || '0'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${syncing ? 'bg-gray-600 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50'}`}
                        >
                            <span className={syncing ? "animate-spin" : ""}>⟳</span>
                            {syncing ? 'Syncing...' : 'Sync LCU'}
                        </button>
                        <button
                            onClick={openLeagueOfGraphs}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 border border-gray-600"
                            title="Open LeagueOfGraphs"
                        >
                            <span>📈</span> Graphs
                        </button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                            Close
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden bg-gray-900/50">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="flex bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('champions')}
                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'champions' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Champions ({inventory.champions.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('skins')}
                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'skins' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Skins ({inventory.skins.length})
                            </button>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500 outline-none"
                                placeholder={`Search ${activeTab}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {loadingInv ? (
                            <div className="flex h-full items-center justify-center text-gray-500 flex-col gap-2">
                                <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                                <p>Loading inventory...</p>
                            </div>
                        ) : filteredList.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-gray-500">
                                No {activeTab} found matching "{search}".
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredList.map((item: any) => (
                                    <div key={item.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-all group relative">
                                        <div className={`bg-gray-900 relative ${activeTab === 'skins' ? 'aspect-[2/3]' : 'aspect-square'}`}>
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold text-4xl select-none group-hover:text-gray-500">
                                                {item.name.charAt(0)}
                                            </div>
                                            {/* Images restored */}
                                            <img
                                                src={getImageUrl(item, activeTab === 'champions' ? 'champion' : 'skin')}
                                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // Fallback for champions if alias fails?
                                                    // For skins if loading fails, maybe try community dragon or tile?
                                                    // Just hide for now to keep it clean or show placeholder
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                        <div className="p-3 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8">
                                            <h4 className="font-bold text-sm text-white truncate text-center drop-shadow-md" title={item.name}>{item.name}</h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
