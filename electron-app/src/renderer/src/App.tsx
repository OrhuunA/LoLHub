import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AccountCard } from './components/AccountCard';
import { AccountFormModal } from './components/AccountFormModal';
import { GameTools } from './components/GameTools';
import { AccountDetailsModal } from './components/AccountDetailsModal';

// Simple Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'info' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        success: 'bg-green-600',
        info: 'bg-blue-600',
        error: 'bg-red-600'
    };

    return (
        <div className={`fixed bottom-6 right-6 ${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-fade-in z-[100]`}>
            <span>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span className="font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
    );
};

function App(): JSX.Element {
    const [tab, setTab] = useState('accounts');
    const [server, setServer] = useState('EUW1');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'rank' | 'level' | 'winrate', direction: 'asc' | 'desc' } | null>({ key: 'rank', direction: 'desc' });

    const [search, setSearch] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<any>(null);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Toast & Loading State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
    const [isUpdatingRanks, setIsUpdatingRanks] = useState(false);

    // Initial Load
    useEffect(() => {
        loadAccounts();
    }, []);

    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
        setToast({ message, type });
    };

    const loadAccounts = async () => {
        const acts = await window.api.getAccounts();
        setAccounts(acts);
    };

    const handleSaveAccount = async (newAccount: any) => {
        await window.api.saveAccount(newAccount);
        loadAccounts();
        showToast('Account saved successfully!', 'success');
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this account?')) {
            await window.api.deleteAccount(id);
            loadAccounts();
            showToast('Account deleted.', 'info');
        }
    };

    const handleAutoLogin = async (acc: any) => {
        const riotPath = "C:\\Riot Games\\Riot Client\\RiotClientServices.exe";
        showToast(`Launching ${acc.login_id}...`, 'info');
        await window.api.autoLogin(riotPath, acc.login_id, acc.login_pw);
    };

    const handleRefreshRanks = async () => {
        if (isUpdatingRanks) return;
        setIsUpdatingRanks(true);
        showToast('Started updating ranks in background...', 'info');

        const targetAccounts = accounts.filter(a => a.server === server);

        for (const acc of targetAccounts) {
            const data = await window.api.scrapeRank(acc.server, acc.riot_id);
            if (data) {
                const updated = { ...acc, ...data };
                await window.api.saveAccount(updated);
                setAccounts(prev => prev.map(p => p.id === updated.id ? updated : p));
            }
        }
        setIsUpdatingRanks(false);
        showToast('Rank update completed!', 'success');
    };

    const getRankWeight = (tier: string) => {
        const weights: Record<string, number> = {
            'CHALLENGER': 9, 'GRANDMASTER': 8, 'MASTER': 7,
            'DIAMOND': 6, 'EMERALD': 5, 'PLATINUM': 4,
            'GOLD': 3, 'SILVER': 2, 'BRONZE': 1, 'IRON': 0, 'UNRANKED': -1
        };
        return weights[tier] || -1;
    };

    const filteredAccounts = accounts
        .filter(a => a.server === server)
        .filter(a => a.riot_id.toLowerCase().includes(search.toLowerCase()) || a.login_id.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;

            if (key === 'rank') {
                const wA = getRankWeight(a.rank_tier);
                const wB = getRankWeight(b.rank_tier);
                if (wA !== wB) {
                    return direction === 'desc' ? wB - wA : wA - wB;
                }
                return direction === 'desc' ? (b.lp || 0) - (a.lp || 0) : (a.lp || 0) - (b.lp || 0);
            } else if (key === 'winrate') {
                const wrA = a.winrate ? parseInt(a.winrate.replace('%', '')) : -1;
                const wrB = b.winrate ? parseInt(b.winrate.replace('%', '')) : -1;
                return direction === 'desc' ? wrB - wrA : wrA - wrB;
            } else {
                // Level
                const lA = a.level || 0;
                const lB = b.level || 0;
                return direction === 'desc' ? lB - lA : lA - lB;
            }
        });

    return (
        <div className="flex h-screen bg-[#121212] text-white font-sans selection:bg-blue-500/30 overflow-hidden">
            <Sidebar
                currentTab={tab}
                setTab={setTab}
                server={server}
                setServer={setServer}
                onRefresh={handleRefreshRanks}
                onAddAccount={() => setShowAddModal(true)}
                isUpdating={isUpdatingRanks}
            />

            <main className="flex-1 flex flex-col relative z-0">
                {/* Top Bar - Z-Index 30 ensures it sits above content. Dropdown Z-50 sits above Top Bar. */}
                <div className="h-16 border-b border-gray-800 flex items-center px-6 justify-between bg-gray-900/90 backdrop-blur-md gap-4 relative z-30 shadow-sm">

                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                        <input
                            className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-gray-600 focus:bg-gray-700"
                            placeholder="Search accounts..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Sort Controls */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSortMenu(!showSortMenu)}
                                className="flex items-center gap-2 bg-gray-800/60 hover:bg-gray-700/80 text-white px-5 py-2.5 rounded-xl border border-gray-700/50 hover:border-gray-500 transition-all text-sm font-bold shadow-sm hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 backdrop-blur-md"
                            >
                                <span>🔃 Sort & Filter</span>
                            </button>

                            {showSortMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden ring-1 ring-black/20 animate-fade-in-down origin-top-right">
                                    <div className="p-1">
                                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Rank</div>
                                        <button
                                            onClick={() => { setSortConfig({ key: 'rank', direction: 'desc' }); setShowSortMenu(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${sortConfig?.key === 'rank' && sortConfig.direction === 'desc' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                        >
                                            Highest Rank First
                                        </button>
                                        <button
                                            onClick={() => { setSortConfig({ key: 'rank', direction: 'asc' }); setShowSortMenu(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${sortConfig?.key === 'rank' && sortConfig.direction === 'asc' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                        >
                                            Lowest Rank First
                                        </button>

                                        <div className="my-1 border-t border-gray-700"></div>

                                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Level</div>
                                        <button
                                            onClick={() => { setSortConfig({ key: 'level', direction: 'desc' }); setShowSortMenu(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${sortConfig?.key === 'level' && sortConfig.direction === 'desc' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                        >
                                            Highest Level First
                                        </button>
                                        <button
                                            onClick={() => { setSortConfig({ key: 'level', direction: 'asc' }); setShowSortMenu(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${sortConfig?.key === 'level' && sortConfig.direction === 'asc' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                        >
                                            Lowest Level First
                                        </button>

                                        <div className="my-1 border-t border-gray-700"></div>

                                        <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Winrate</div>
                                        <button
                                            onClick={() => { setSortConfig({ key: 'winrate', direction: 'desc' }); setShowSortMenu(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${sortConfig?.key === 'winrate' && sortConfig.direction === 'desc' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                        >
                                            Highest Winrate First
                                        </button>
                                        <button
                                            onClick={() => { setSortConfig({ key: 'winrate', direction: 'asc' }); setShowSortMenu(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${sortConfig?.key === 'winrate' && sortConfig.direction === 'asc' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                        >
                                            Lowest Winrate First
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Overlay to close menu */}
                            {showSortMenu && (
                                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)}></div>
                            )}
                        </div>

                        {/* Edit Mode Toggle */}
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm hover:scale-[1.02] active:scale-95 backdrop-blur-sm ${isEditMode ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 shadow-red-500/10' : 'bg-gray-800/60 border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-500 hover:shadow-lg'}`}
                        >
                            {isEditMode ? 'Done' : 'Edit List'}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 z-0">
                    {tab === 'accounts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {filteredAccounts.map((acc: any) => (
                                <AccountCard
                                    key={acc.id}
                                    account={acc}
                                    onAutoLogin={handleAutoLogin}
                                    onDelete={handleDelete}
                                    onClick={() => setSelectedAccount(acc)}
                                    isEditMode={isEditMode}
                                    onEdit={(acc) => setEditingAccount(acc)}
                                />
                            ))}
                            {filteredAccounts.length === 0 && (
                                <div className="col-span-full text-center py-20 text-gray-500">
                                    No accounts found in {server}.
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'gametools' && (
                        <GameTools />
                    )}

                    {tab === 'settings' && (
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold mb-6">Settings</h2>
                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-white mb-2">Configuration</h3>
                                    <p className="text-gray-400 text-sm mb-4">You can manually edit the configuration file if needed.</p>
                                    <button
                                        onClick={() => window.api.openConfig()}
                                        className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-6 py-3 rounded-xl transition-all border border-gray-600/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3 font-semibold"
                                    >
                                        <span>📂</span> Open Config File
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Application Modals */}
            {(showAddModal || editingAccount) && (
                <AccountFormModal
                    onClose={() => { setShowAddModal(false); setEditingAccount(null); }}
                    onSave={handleSaveAccount}
                    server={server}
                    initialData={editingAccount}
                />
            )}

            {selectedAccount && !isEditMode && (
                <AccountDetailsModal
                    account={selectedAccount}
                    onClose={() => setSelectedAccount(null)}
                    onUpdate={loadAccounts}
                />
            )}

            {/* Toast Notifications */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default App;
