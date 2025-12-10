import { useMemo } from 'react';
import iron from '../assets/ranks/IRON.png';
import bronze from '../assets/ranks/BRONZE.png';
import silver from '../assets/ranks/SILVER.png';
import gold from '../assets/ranks/GOLD.png';
import platinum from '../assets/ranks/PLATINUM.png';
import emerald from '../assets/ranks/EMERALD.png';
import diamond from '../assets/ranks/DIAMOND.png';
import master from '../assets/ranks/MASTER.png';
import grandmaster from '../assets/ranks/GRANDMASTER.png';
import challenger from '../assets/ranks/CHALLENGER.png';
import unranked from '../assets/ranks/UNRANKED.png';

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
    level?: number;
    blue_essence?: number;
    rp?: number;
    skins?: any[];
}

interface AccountCardProps {
    account: Account;
    onAutoLogin: (acc: Account) => void;
    onDelete: (id: string) => void;
    onClick: () => void;
    isEditMode: boolean;
    onEdit: (acc: Account) => void;
}

const rankImages: Record<string, string> = {
    'IRON': iron,
    'BRONZE': bronze,
    'SILVER': silver,
    'GOLD': gold,
    'PLATINUM': platinum,
    'EMERALD': emerald,
    'DIAMOND': diamond,
    'MASTER': master,
    'GRANDMASTER': grandmaster,
    'CHALLENGER': challenger,
    'UNRANKED': unranked,
};

export const AccountCard = ({ account, onDelete, onAutoLogin, onClick, isEditMode, onEdit }: AccountCardProps) => {

    const getRankColor = (tier: string) => {
        const colors: Record<string, string> = {
            'IRON': 'text-gray-400',
            'BRONZE': 'text-orange-700',
            'SILVER': 'text-slate-400',
            'GOLD': 'text-yellow-500',
            'PLATINUM': 'text-cyan-400',
            'EMERALD': 'text-emerald-500',
            'DIAMOND': 'text-blue-300',
            'MASTER': 'text-purple-400',
            'GRANDMASTER': 'text-red-500',
            'CHALLENGER': 'text-yellow-300',
        };
        return colors[tier] || 'text-gray-500';
    };

    const rankImg = rankImages[account.rank_tier] || unranked;

    // Background Image Logic (Random Skin)
    // If account has skins, pick one. The user said: https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Yasuo_0.jpg
    // We need champion name (e.g. Yasuo) and skin num (0).
    // Our inventory skins from IPC have `name`, `championId`. We might need to map ID to Name if we only have ID.
    // However, LCU inventory usually gives us names or we can use the `get-ddragon-champions` map.
    // For now, if we have a skin with a name that we can parse? 
    // Actually, `ipcHandlers` returns `skins` with `tilePath` which is internal LCU path.
    // But let's say we want to show a specific champ?
    // Let's settle for a cool fallback or if we have `skins` populated, use one.
    // Since we don't fetch skins by default yet, this will be empty often.
    // But I'll add the UI support.

    // Background Image Logic (Random Skin)
    // If we have skins, we can use one. For now, we just prepare the structure.

    // Example: const bgStyle = account.skins && account.skins.length > 0 ? { backgroundImage: `url(...)` } : {};

    // Hardcoded example for demo if requested? No, dynamic only.

    const randomSkinUrl = useMemo(() => {
        if (!account.skins || account.skins.length === 0) return '';
        const randomSkin = account.skins[Math.floor(Math.random() * account.skins.length)];
        return randomSkin.loadingUrl || '';
    }, [account.skins]);

    return (
        <div
            onClick={onClick}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-500 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 group relative cursor-pointer overflow-hidden flex flex-col justify-between min-h-[150px] z-0"
        >
            {/* Background Gradient/Image */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 z-[-2]" />

            {/* Random Skin Background */}
            {randomSkinUrl && (
                <img
                    src={randomSkinUrl}
                    alt="Background"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    className="absolute inset-0 w-full h-full object-cover opacity-30 z-[-1] transition-transform duration-700 group-hover:scale-110 mask-image-gradient"
                />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/60 to-transparent z-[-1]" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                        <img src={rankImg} alt={account.rank_tier} className="w-12 h-12 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-300" />
                        <div className="overflow-hidden">
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate max-w-[140px]" title={account.riot_id}>
                                {account.riot_id}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                {account.level ? <span className="text-yellow-500 font-mono bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Lvl {account.level}</span> : null}
                                {account.server && <span className="opacity-70">{account.server}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-end px-1 mt-2">
                    <div className="text-left w-full">
                        <div className={`font-bold text-lg leading-tight ${getRankColor(account.rank_tier)}`}>
                            {account.rank_tier} {account.rank_div}
                        </div>
                        <div className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-1">
                            <span className="bg-gray-700/50 px-2 py-0.5 rounded text-gray-300">{account.lp} LP</span>
                            {account.winrate && (
                                <span className={`px-2 py-0.5 rounded bg-gray-700/50 ${parseInt(account.winrate.replace('%', '')) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                    {account.winrate} WR
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 relative z-10">
                {isEditMode ? (
                    <div className="flex gap-2 animate-fade-in">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(account); }}
                            className="flex-1 bg-gray-700/80 hover:bg-gray-600 text-white text-xs font-bold py-2.5 rounded-lg transition-all border border-gray-600 hover:border-gray-500 backdrop-blur-sm"
                        >
                            EDIT
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold py-2.5 rounded-lg transition-all border border-red-500/30 hover:border-red-500/50 backdrop-blur-sm"
                        >
                            DELETE
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAutoLogin(account); }}
                        className="group/btn w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] border border-blue-500/20 overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                        <span className="relative z-10">LOGIN</span>
                    </button>
                )}
            </div>
        </div>
    );
}
