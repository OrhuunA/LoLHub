import { useState, useEffect, useRef } from 'react';

// Custom Champion Select Component
const ChampionSelect = ({
    label,
    value,
    onChange,
    champions,
    disabled,
    colorClass
}: {
    label: string,
    value: string,
    onChange: (val: string) => void,
    champions: { id: string, name: string }[],
    disabled?: boolean,
    colorClass?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter champions: Starts with matches first, then includes matches
    const filtered = champions.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(search.toLowerCase());
        const bStarts = b.name.toLowerCase().startsWith(search.toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
    });

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative group" ref={wrapperRef}>
            <div
                className={`w-full bg-gray-900/60 border border-gray-600/50 hover:border-gray-500 rounded-xl px-4 py-3 text-white flex items-center justify-between cursor-pointer transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-gray-800/80 hover:shadow-md'} ${isOpen ? `ring-2 ring-${colorClass || 'blue'}-500/50 border-transparent` : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div>
                    <span className={`block text-sm font-medium ${value ? 'text-white' : 'text-gray-400'}`}>
                        {value || label}
                    </span>
                </div>
                <span className={`text-gray-400 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full bg-[#1a1a1a] border border-gray-700/80 rounded-xl mt-2 shadow-2xl max-h-72 overflow-hidden flex flex-col animate-fade-in backdrop-blur-xl ring-1 ring-black/20">
                    <div className="p-2 border-b border-gray-800">
                        <input
                            autoFocus
                            className="w-full bg-gray-900/50 text-white px-3 py-2 rounded-lg border border-gray-700/50 focus:border-blue-500/50 outline-none text-sm transition-all"
                            placeholder="🔍 Search champion..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-0.5 custom-scrollbar">
                        {filtered.map(c => (
                            <div
                                key={c.id}
                                className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm flex items-center justify-between group/item transition-all ${c.name === value ? `bg-${colorClass || 'blue'}-500/20 text-${colorClass || 'blue'}-300` : 'hover:bg-gray-800 text-gray-300 hover:text-white'}`}
                                onClick={() => {
                                    onChange(c.name);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                            >
                                <span className="font-medium">{c.name}</span>
                                {c.name === value && <span className="text-xs">✓</span>}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-3 py-4 text-gray-500 text-xs text-center italic">No champions found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const GameTools = () => {
    const [status, setStatus] = useState<string>('Disconnected');
    const [autoAccept, setAutoAccept] = useState(false);
    const [autoPick, setAutoPick] = useState(false);
    const [autoBan, setAutoBan] = useState(false);
    const [pickChamp, setPickChamp] = useState('');
    const [pickChamp2, setPickChamp2] = useState('');
    const [banChamp, setBanChamp] = useState('');
    // Offline Mode temporarily disabled
    // const [isOffline, setIsOffline] = useState(false);

    // Fetch initial offline status on mount to persist state across tab changes
    /*
    useEffect(() => {
        const checkOffline = async () => {
            try {
                const status = await window.api.getOfflineStatus();
                if (status && status.isOffline) {
                    setIsOffline(true);
                }
            } catch (e) {
                console.error("Failed to fetch offline status", e);
            }
        };
        checkOffline();
    }, []);
    */

    const [champions, setChampions] = useState<{ id: string, name: string }[]>([]);
    const [gameflowPhase, setGameflowPhase] = useState<string>('');

    // Fetch Champions
    useEffect(() => {
        window.api.getChampions().then(list => {
            const sorted = list.sort((a, b) => a.name.localeCompare(b.name));
            setChampions(sorted);
        });
    }, []);

    // Load Settings
    useEffect(() => {
        window.api.getConfig().then((cfg: any) => {
            if (cfg && cfg.gameTools) {
                const gt = cfg.gameTools;
                if (gt.autoAccept !== undefined) setAutoAccept(gt.autoAccept);
                if (gt.autoPick !== undefined) setAutoPick(gt.autoPick);
                if (gt.autoBan !== undefined) setAutoBan(gt.autoBan);
                if (gt.pickChamp !== undefined) setPickChamp(gt.pickChamp);
                if (gt.pickChamp2 !== undefined) setPickChamp2(gt.pickChamp2);
                if (gt.banChamp !== undefined) setBanChamp(gt.banChamp);
                console.log('Loaded GameTools config:', gt);
            }
        });
    }, []);

    // Save Settings Helper
    const saveSettings = async (updates: any) => {
        const oldConfig = await window.api.getConfig();
        const newConfig = {
            ...oldConfig,
            gameTools: {
                ...(oldConfig.gameTools || {}),
                autoAccept: autoAccept,
                autoPick: autoPick,
                autoBan: autoBan,
                pickChamp: pickChamp,
                pickChamp2: pickChamp2,
                banChamp: banChamp,
                ...updates
            }
        };
        await window.api.saveConfig(newConfig);
    };

    // Update settings when state changes
    const isFirstRun = useRef(true);
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        const timer = setTimeout(() => {
            saveSettings({
                autoAccept, autoPick, autoBan, pickChamp, pickChamp2, banChamp
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [autoAccept, autoPick, autoBan, pickChamp, pickChamp2, banChamp]);


    // Using refs for mutable state in interval
    const autoAcceptRef = useRef(autoAccept);
    const autoPickRef = useRef(autoPick);
    const autoBanRef = useRef(autoBan);
    const pickChampRef = useRef(pickChamp);
    const pickChamp2Ref = useRef(pickChamp2);
    const banChampRef = useRef(banChamp);

    useEffect(() => { autoAcceptRef.current = autoAccept; }, [autoAccept]);
    useEffect(() => { autoPickRef.current = autoPick; }, [autoPick]);
    useEffect(() => { autoBanRef.current = autoBan; }, [autoBan]);
    useEffect(() => { pickChampRef.current = pickChamp; }, [pickChamp]);
    useEffect(() => { pickChamp2Ref.current = pickChamp2; }, [pickChamp2]);
    useEffect(() => { banChampRef.current = banChamp; }, [banChamp]);

    useEffect(() => {
        const interval = setInterval(async () => {
            const connected = await window.api.lcuConnect();
            setStatus(connected ? 'Connected' : 'Disconnected');
            if (!connected) return;

            const phase = await window.api.lcuRequest('GET', '/lol-gameflow/v1/gameflow-phase');
            const phaseStr = (typeof phase === 'string' ? phase : JSON.stringify(phase)).replace(/"/g, '');
            setGameflowPhase(phaseStr);

            // Auto Accept
            if (autoAcceptRef.current && phaseStr === 'ReadyCheck') {
                await window.api.lcuRequest('POST', '/lol-matchmaking/v1/ready-check/accept');
            }

            // Auto Pick / Ban
            if (phaseStr === 'ChampSelect') {
                const session = await window.api.lcuRequest('GET', '/lol-champ-select/v1/session');
                if (!session) return;

                const localCellId = session.localPlayerCellId;
                const actions = session.actions;
                const bans = session.bans || {};
                const myTeamBans = bans.myTeamBans || [];
                const theirTeamBans = bans.theirTeamBans || [];
                const allBans = [...myTeamBans, ...theirTeamBans];

                // Determine unavailability (Bans + Locked Picks)
                const takenChampIds = new Set(allBans);

                const addPicks = (team: any[]) => {
                    team.forEach(p => {
                        // championId is set when locked or hovered? 
                        // Usually locked logic means we can check if anyone else has locked it.
                        // But for simplicity, if someone else has it selected, consider it taken?
                        // No, only locked matters. But api doesn't give easy locked status per player here easily.
                        // However, standard restriction is unique champions per team. 
                        // Bans are global.
                        if (p.championId && p.championId !== 0) takenChampIds.add(p.championId);
                    });
                };
                if (session.myTeam) addPicks(session.myTeam);
                if (session.theirTeam) addPicks(session.theirTeam);

                // Flatten actions
                for (const actionRow of actions) {
                    for (const action of actionRow) {
                        // Check actor, type, and !completed
                        if (action.actorCellId === localCellId && !action.completed) {

                            // Ban Phase
                            if (action.type === 'ban' && autoBanRef.current) {
                                const champ = champions.find(c => c.name === banChampRef.current);
                                if (champ) {
                                    const body = { championId: parseInt(champ.id), completed: true };
                                    await window.api.lcuRequest('PATCH', `/lol-champ-select/v1/session/actions/${action.id}`, body);
                                }
                            }

                            // Pick Phase
                            if (action.type === 'pick' && autoPickRef.current) {
                                let champContext = null;
                                let chosenName = '';

                                // Try Primary
                                const p1 = champions.find(c => c.name === pickChampRef.current);
                                if (p1) {
                                    if (!takenChampIds.has(parseInt(p1.id))) {
                                        champContext = p1;
                                        chosenName = p1.name;
                                    } else {
                                        // Primary taken/banned, Try Secondary
                                        const p2 = champions.find(c => c.name === pickChamp2Ref.current);
                                        if (p2 && !takenChampIds.has(parseInt(p2.id))) {
                                            console.log(`Primary (${p1.name}) unavailable. Switching to Secondary (${p2.name}).`);
                                            champContext = p2;
                                            chosenName = p2.name;
                                        }
                                    }
                                }

                                if (champContext) {
                                    const body = { championId: parseInt(champContext.id), completed: true };
                                    await window.api.lcuRequest('PATCH', `/lol-champ-select/v1/session/actions/${action.id}`, body);
                                    console.log('Auto Picked:', chosenName);
                                }
                            }
                        }
                    }
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [champions]);

    // Modern Toggle Switch Component
    const Toggle = ({ checked, onChange, colorString = 'green' }: { checked: boolean, onChange: (v: boolean) => void, colorString?: string }) => {
        const bgClass = checked
            ? (colorString === 'red' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                colorString === 'blue' ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]' :
                    'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]')
            : 'bg-gray-700';

        return (
            <div
                className={`relative w-12 h-6 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${bgClass}`}
                onClick={() => onChange(!checked)}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 fade-in-animation">
            <div className="flex items-center justify-between bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 shadow-lg">
                <div>
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Game Automation</h2>
                    <p className="text-gray-400 text-sm mt-1">Configure automated actions for champion select.</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-900/80 px-4 py-2 rounded-xl border border-gray-700/50 shadow-inner">
                    <div className={`w-3 h-3 rounded-full transition-all duration-500 ${status === 'Connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`} />
                    <span className="text-sm font-medium text-gray-300">LCU: {status} <span className="text-gray-500">({gameflowPhase})</span></span>
                </div>
            </div>

            {/* Auto Accept */}
            <div className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 hover:border-gray-600 transition-all shadow-md flex items-center justify-between group">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-900/50 to-green-800/10 flex items-center justify-center border border-green-500/20 group-hover:border-green-500/40 transition-colors">
                        <span className="text-2xl">✅</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">Auto Accept Match</h3>
                        <p className="text-gray-400 text-sm">Automatically accept the queue when a match is found.</p>
                    </div>
                </div>
                <Toggle checked={autoAccept} onChange={setAutoAccept} colorString="green" />
            </div>

            {/* Offline Mode */}
            {/* Offline Mode (Temporarily Removed)
            <div className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 hover:border-gray-600 transition-all shadow-md flex items-center justify-between group">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700/50 to-gray-600/10 flex items-center justify-center border border-gray-500/20 group-hover:border-gray-400/40 transition-colors">
                        <span className="text-2xl">👻</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-400 group-hover:text-gray-300 transition-colors">Offline Mode (Temporarily Disabled)</h3>
                        <p className="text-gray-400 text-sm">Appear offline to friends while being able to play.</p>
                    </div>
                </div>
                <Toggle
                    checked={false}
                    onChange={() => alert("Offline Mode is temporarily disabled regarding your request to revert to 'commented out' state.")}
                    colorString="gray"
                />
            </div>
            */}

            {/* Pick / Ban Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Auto Pick */}
                <div className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/30 transition-all shadow-lg relative group overflow-visible">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center border border-blue-500/20 text-blue-400">
                                ✋
                            </div>
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">Auto Pick</h3>
                        </div>
                        <Toggle checked={autoPick} onChange={setAutoPick} colorString="blue" />
                    </div>
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Primary Pick</label>
                            <ChampionSelect
                                label="Select Champion"
                                value={pickChamp}
                                onChange={setPickChamp}
                                champions={champions}
                                colorClass="blue"
                                disabled={!autoPick}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Secondary Pick</label>
                            <ChampionSelect
                                label="Select Backup"
                                value={pickChamp2}
                                onChange={setPickChamp2}
                                champions={champions}
                                colorClass="blue"
                                disabled={!autoPick}
                            />
                        </div>
                    </div>
                </div>

                {/* Auto Ban */}
                <div className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 hover:border-red-500/30 transition-all shadow-lg relative group overflow-visible">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center border border-red-500/20 text-red-400">
                                🚫
                            </div>
                            <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">Auto Ban</h3>
                        </div>
                        <Toggle checked={autoBan} onChange={setAutoBan} colorString="red" />
                    </div>
                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Permaban</label>
                            <ChampionSelect
                                label="Select Ban"
                                value={banChamp}
                                onChange={setBanChamp}
                                champions={champions}
                                colorClass="red"
                                disabled={!autoBan}
                            />
                        </div>
                        <p className="text-xs text-gray-500 px-1">Tip: This champion will be instantly banned.</p>
                    </div>
                </div>
            </div>

        </div>
    );
};
