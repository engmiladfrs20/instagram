import React, { useState } from 'react';
import {
  Instagram,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Key,
  AlertTriangle,
  ExternalLink,
  Layers,
  Lock,
  Unlock,
} from 'lucide-react';
import { InstagramAccount } from '../types';

interface InstagramAccountsViewProps {
  instagramAccount: InstagramAccount;
  onReauthorize: () => Promise<void>;
  onStartOAuth: () => Promise<string>;
}

export const InstagramAccountsView: React.FC<InstagramAccountsViewProps> = ({
  instagramAccount,
  onReauthorize,
  onStartOAuth,
}) => {
  const [showOAuthModal, setShowOAuthModal] = useState<boolean>(false);
  const [oauthStep, setOauthStep] = useState<number>(1);
  const [checking, setChecking] = useState<boolean>(false);

  const handleSimulateOAuthComplete = async () => {
    setChecking(true);
    try {
      await onReauthorize();
      setShowOAuthModal(false);
      setOauthStep(1);
    } finally {
      setChecking(false);
    }
  };

  const handleStartOAuth = async () => {
    setChecking(true);
    try {
      const authorizationUrl = await onStartOAuth();
      window.location.assign(authorizationUrl);
    } finally {
      setChecking(false);
    }
  };

  const isConnected = instagramAccount.status === 'connected';
  const statusLabel = isConnected ? 'متصل (Connected)' : instagramAccount.status === 'reauth_required' ? 'نیازمند اتصال مجدد' : 'قطع شده';
  const webhookIsActive = instagramAccount.webhookStatus === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="p-3 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-2xl text-white shadow-lg">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                اتصال حساب‌های اینستاگرام (Meta Business Login)
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                اتصال امن حساب‌های Instagram Professional فقط از طریق OAuth رسمی Meta بدون دریافت رمز عبور.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowOAuthModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-purple-900/30 flex items-center space-x-1.5 space-x-reverse"
          >
            <Key className="w-4 h-4" />
            <span>اتصال حساب جدید / تمدید Token</span>
          </button>
        </div>
      </div>

      {/* Connected Account Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center space-x-4 space-x-reverse">
            <img
              src={instagramAccount.profilePicUrl || 'https://images.unsplash.com/photo-1611262588024-d12430b98920?auto=format&fit=crop&w=200&q=80'}
              alt={instagramAccount.username}
              className="w-14 h-14 rounded-full object-cover ring-4 ring-purple-500/20"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h2 className="text-base font-bold text-white">{instagramAccount.displayName}</h2>
                <span className="text-xs text-slate-400 font-mono">@{instagramAccount.username}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                نوع حساب: <strong className="text-slate-200">Instagram Business</strong> • Graph API: <span className="font-mono text-purple-400">v20.0</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse text-xs">
            <button
              onClick={() => setShowOAuthModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 font-medium"
            >
              بررسی Token
            </button>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">دسترسی Meta مسدود یا منقضی شده است.</p>
                <p className="mt-1 text-rose-200/80">یک Access Token تازه از Meta بگیرید و سپس دوباره «بررسی Token» را اجرا کنید.</p>
              </div>
            </div>
          </div>
        )}

        {/* Granted Scopes List */}
        <div>
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center space-x-1.5 space-x-reverse">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>مجوزهای رسمی اعطا شده (Granted OAuth Scopes)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {instagramAccount.grantedScopes.map((scope, i) => (
              <div
                key={i}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center space-x-2.5 space-x-reverse"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 font-mono truncate">{scope}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">وضعیت Webhook Ingress</span>
            <span className={`${webhookIsActive ? 'text-emerald-400' : 'text-rose-300'} font-bold flex items-center space-x-1 space-x-reverse`}>
              <span className={`w-2 h-2 rounded-full ${webhookIsActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              <span>{webhookIsActive ? 'فعال و ثبت شده در Meta' : 'نیازمند بررسی مجدد'}</span>
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">انقضای Access Token</span>
            <span className="text-slate-200 font-bold font-mono">
              {new Date(instagramAccount.tokenExpiresAt).toLocaleDateString('fa-IR')}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px]">آخرین بررسی سلامت</span>
            <span className="text-slate-200 font-bold font-mono">
              {new Date(instagramAccount.lastTokenCheckAt).toLocaleTimeString('fa-IR')}
            </span>
          </div>
        </div>
      </div>

      {/* Meta Business Login OAuth Modal Simulator */}
      {showOAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Instagram className="w-5 h-5 text-pink-500" />
                <span className="font-bold text-white text-sm">Business Login for Instagram</span>
              </div>
              <button
                onClick={() => setShowOAuthModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {oauthStep === 1 && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-300">
                  شما در حال اتصال حساب اینستاگرام خود از طریق درگاه رسمی Meta هستید.
                </p>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-slate-400 font-bold block">دسترسی‌های درخواستی:</span>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    <li><code className="text-purple-400">instagram_business_basic</code> - خواندن مشخصات پیج</li>
                    <li><code className="text-purple-400">instagram_business_manage_messages</code> - ارسال و دریافت دایرکت</li>
                    <li><code className="text-purple-400">instagram_business_manage_comments</code> - پاسخ به کامنت‌ها</li>
                  </ul>
                </div>

                <button
                  onClick={handleStartOAuth}
                  disabled={checking}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition"
                >
                  تایید و اعطای مجوزها در Meta
                </button>
              </div>
            )}

            {oauthStep === 2 && (
              <div className="space-y-4 text-xs text-center py-4">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-white font-bold">در حال دریافت Long-Lived Access Token و ثبت Webhook...</p>

                <button
                  onClick={handleSimulateOAuthComplete}
                  disabled={checking}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold transition"
                >
                  تکمیل اتصال
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
