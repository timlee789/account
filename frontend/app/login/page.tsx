'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.message || 'Invalid Password');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">

            {/* Minimalist Centered Card */}
            <div className="w-full max-w-sm">
                <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col relative">

                    <div className="flex flex-col items-center justify-center mb-8">
                        <Lock className="w-7 h-7 text-indigo-500 mb-4" />
                        <h1 className="text-xl font-medium text-white tracking-wide text-center">
                            Collegiate Grill
                        </h1>
                        <p className="text-gray-500 text-xs mt-1">Admin Dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Master Password"
                                className="w-full bg-[#1a1a1a] border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-center tracking-widest text-sm"
                                autoFocus
                                required
                            />
                            {error && (
                                <p className="text-rose-400 text-xs mt-3 flex items-center justify-center gap-1.5 font-medium">
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3.5 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                "Unlock"
                            )}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}
