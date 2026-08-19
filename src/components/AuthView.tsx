import React, { useState } from 'react';
import { LockKeyhole, LogIn, UserPlus, Zap } from 'lucide-react';
import { ThemeControls } from './ThemeControls';

interface AuthViewProps {
  onAuthenticated: (payload: any) => void;
  requestJson: (input: RequestInfo | URL, init?: RequestInit) => Promise<any>;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated, requestJson }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const payload = mode === 'login' ? { email, password } : { email, password, displayName, workspaceName };
      const data = await requestJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      onAuthenticated(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ورود انجام نشد');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4" dir="rtl">
      <div className="absolute left-4 top-4">
        <ThemeControls />
      </div>
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">ورود به InstaFlow</h1>
            <p className="text-xs text-slate-400">پنل مدیریت پیام‌ها و اتوماسیون اینستاگرام</p>
          </div>
        </div>

        {mode === 'register' && (
          <>
            <label className="block text-xs text-slate-400 mb-1">نام شما</label>
            <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="w-full mb-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-purple-500" />
            <label className="block text-xs text-slate-400 mb-1">نام کسب‌وکار یا Workspace</label>
            <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="w-full mb-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-purple-500" />
          </>
        )}

        <label className="block text-xs text-slate-400 mb-1">ایمیل</label>
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full mb-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-purple-500" />
        <label className="block text-xs text-slate-400 mb-1">رمز عبور</label>
        <input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full mb-5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-purple-500" />

        {error && <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}
        <button disabled={busy} className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold transition hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2">
          {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {busy ? 'در حال بررسی...' : mode === 'login' ? 'ورود' : 'ساخت حساب و Workspace'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="mt-4 w-full text-xs text-purple-300 hover:text-purple-200">
          {mode === 'login' ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
        </button>
        <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-500"><LockKeyhole className="w-3.5 h-3.5" /> نشست امن با Cookie HttpOnly</div>
      </form>
    </main>
  );
};
