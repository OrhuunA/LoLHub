// import React from 'react';

interface SidebarProps {
    currentTab: string;
    setTab: (t: string) => void;
    server: string;
    setServer: (s: string) => void;
    onRefresh: () => void;
    onAddAccount: () => void;
    isUpdating?: boolean;
}

export function Sidebar({ currentTab, setTab, server, setServer, onRefresh, onAddAccount, isUpdating = false }: SidebarProps) {
    const tabs = [
        { id: 'accounts', label: 'Accounts', icon: '👥' },
        { id: 'gametools', label: 'Game Tools', icon: '🎮' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <div className="w-64 bg-gray-900 h-full flex flex-col border-r border-gray-800">
            <div className="p-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    LoLHub
                </h1>
                {/* <p className="text-xs text-gray-500 mt-1">Version 2.0 (Electron)</p> */}
            </div>

            <div className="px-4 mb-6">
                <label className="text-xs text-gray-400 font-bold ml-1 uppercase">Server</label>
                <select
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    className="w-full mt-1 bg-gray-800 text-white rounded p-2 outline-none border border-gray-700 focus:border-blue-500 text-sm"
                >
                    <option value="TR1">Turkey</option>
                    <option value="EUW1">EU West</option>
                    <option value="EUN1">EU Nordic</option>
                    <option value="NA1">North America</option>
                </select>
            </div>

            <nav className="flex-1 px-2 space-y-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setTab(tab.id)}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${currentTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                    >
                        <span className="mr-3">{tab.icon}</span>
                        <span className="font-medium">{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 space-y-3">
                <button
                    onClick={onAddAccount}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-all shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
                >
                    <span>+</span> Add Account
                </button>

                <button
                    onClick={onRefresh}
                    disabled={isUpdating}
                    className={`w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 ${isUpdating ? 'opacity-70 cursor-wait' : ''}`}
                >
                    {isUpdating ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <span>⟳</span>
                    )}
                    {isUpdating ? 'Updating...' : 'Update Ranks'}
                </button>
            </div>
        </div>
    );
}
