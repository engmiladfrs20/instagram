import React, { useState } from 'react';
import { Settings, Users, Key, Zap, Shield } from 'lucide-react';
import { Workspace, WorkspaceMember } from '../types';

interface SettingsViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  onCleanup: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ workspace, members, onCleanup }) => {
  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async () => {
    if (!window.confirm('اطلاعات آزمایشی و عملیاتی این Workspace پاک شود؟')) return;
    setCleaning(true);
    try {
      await onCleanup();
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              تنظیمات فضای کاری و اعضای تیم
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              مدیریت دسترسی‌های اعضای تیم، کلیدهای محرمانه Meta API و پلن اشتراک چندمستاجری (Multi-Tenant Workspace).
            </p>
          </div>
          <button onClick={handleCleanup} disabled={cleaning} className="w-full rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-xs font-bold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
            {cleaning ? 'در حال پاک‌سازی...' : 'پاک‌سازی داده‌های آزمایشی Workspace'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2 space-x-reverse border-b border-slate-800 pb-3">
            <Users className="w-4 h-4 text-purple-400" />
            <span>اعضای فضای کاری ({workspace.name})</span>
          </h2>

          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.userId} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-bold text-white">{m.userName}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{m.userEmail}</p>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                  نقش: {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Meta Credentials Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2 space-x-reverse border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-purple-400" />
            <span>کلیدهای محرمانه Meta Developer App</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 block mb-1">Meta App ID</label>
              <input
                type="text"
                readOnly
                value="Configured in Cloudflare"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono dir-ltr"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Webhook Verify Token</label>
              <input
                type="text"
                readOnly
                value="Stored as a Worker secret"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono dir-ltr"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">App Secret Ciphertext (رمزنگاری AES-256-GCM)</label>
              <input
                type="password"
                readOnly
                value="Hidden"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono dir-ltr"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
