import React, { useState, useEffect } from 'react';

interface AccountFormModalProps {
    onClose: () => void;
    onSave: (data: any) => void;
    server: string;
    initialData?: any; // If provided, we are in Edit mode
}

export function AccountFormModal({ onClose, onSave, server, initialData }: AccountFormModalProps) {
    const [data, setData] = useState({
        login_id: '',
        login_pw: '',
        riot_id: '',
    });

    useEffect(() => {
        if (initialData) {
            setData({
                login_id: initialData.login_id || '',
                login_pw: initialData.login_pw || '',
                riot_id: initialData.riot_id || '',
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // If editing, preserve existing ID and stats. If new, create defaults.
        const payload = initialData ? {
            ...initialData,
            ...data,
            // Don't overwrite stats
        } : {
            ...data,
            id: crypto.randomUUID(),
            server: server,
            rank_tier: 'UNRANKED',
            rank_div: '',
            lp: 0,
            level: 0,
            blue_essence: 0,
            rp: 0,
            skin_count: 0
        };

        onSave(payload);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 w-96 rounded-xl border border-gray-700 shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                    {initialData ? 'Edit Account' : 'Add New Account'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Username</label>
                        <input
                            required
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                            value={data.login_id}
                            onChange={e => setData({ ...data, login_id: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Password</label>
                        <input
                            required
                            type="text" // User requested ability to see/edit password easily, maybe text is better? Or password. Let's stick to text for easy edit as per 'edit functionality' request implied visibility, or standard password. I'll use password but maybe add show toggle? For now standard password input is safer defaults but user said "edit password if entered wrong".
                            // Actually, standard text input might be annoying for privacy. I'll keep it as text? No, password.
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                            value={data.login_pw}
                            onChange={e => setData({ ...data, login_pw: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Riot ID (GameName#Tag)</label>
                        <input
                            required
                            placeholder="Faker#T1"
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                            value={data.riot_id}
                            onChange={e => setData({ ...data, riot_id: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 text-gray-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
                        >
                            {initialData ? 'Save Changes' : 'Add Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
