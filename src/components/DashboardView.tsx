import React from 'react';
import {
  Workflow,
  MessageSquare,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Send,
  Sparkles,
  FlaskConical,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { AnalyticsOverview, WebhookEvent } from '../types';

interface DashboardViewProps {
  analytics: AnalyticsOverview;
  recentWebhooks: WebhookEvent[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  recentWebhooks,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome & Quick Actions Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 space-x-reverse mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1.5" />
                سامانه فعال | Webhook Delivery Rate: 99.8%
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              مدیریت هوشمند اتوماسیون اینستاگرام
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              پاسخ‌دهی خودکار به کامنت‌ها، ارسال دایرکت‌های هوشمند Comment-to-DM، ثبت فاکتور و مدیریت لیدها کاملاً مطابق قوانین رسمی Meta.
            </p>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onClick={() => onNavigate('webhook_studio')}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium text-xs transition shadow-sm"
            >
              <FlaskConical className="w-4 h-4" />
              <span>استودیو تست وب‌هوک</span>
            </button>
            <button
              onClick={() => onNavigate('automations')}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs transition shadow-md shadow-purple-900/30"
            >
              <Workflow className="w-4 h-4" />
              <span>ساخت اتوماسیون جدید</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">کامنت‌های دریافتی</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white dir-ltr inline-block">
              {analytics.totalCommentsReceived.toLocaleString('fa-IR')}
            </span>
            <div className="flex items-center space-x-1 space-x-reverse text-xs text-emerald-400 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>۱۴٪+ رشد نسبت به هفته قبل</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">پاسخ‌های دایرکت (Private Replies)</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white dir-ltr inline-block">
              {analytics.privateRepliesSent.toLocaleString('fa-IR')}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              رعایت ضوابط ۷ روزه قوانین Meta
            </p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">لیدها و سفارشات جذب‌شده</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white dir-ltr inline-block">
              {analytics.leadsCaptured.toLocaleString('fa-IR')}
            </span>
            <div className="flex items-center space-x-1 space-x-reverse text-xs text-emerald-400 mt-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>نرخ تبدیل ۱۶.۴٪</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">سلامت سلامت وب‌هوک و API</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white dir-ltr inline-block">
              ۹۹.۸٪
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Deduplicated & Signature Valid
            </p>
          </div>
        </div>
      </div>

      {/* Conversion Funnel & Daily Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 lg:col-span-1">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
            <span>قیف تبدیل کامنت به سفارش</span>
            <span className="text-xs text-purple-400 font-normal">امروز</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">کامنت‌های دریافت شده</span>
                <span className="text-slate-400 font-semibold dir-ltr">3,120</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-full" />
              </div>
            </div>

            <div className="space-y-1.5 pr-3 border-r-2 border-purple-500/30">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">ارسال پاسخ خصوصی (Private Reply)</span>
                <span className="text-slate-400 font-semibold dir-ltr">2,950 (94.5%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-[94.5%]" />
              </div>
            </div>

            <div className="space-y-1.5 pr-6 border-r-2 border-indigo-500/30">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">پاسخ کاربر و بازگشایی پنجره ۲۴ ساعته</span>
                <span className="text-slate-400 font-semibold dir-ltr">1,820 (61.6%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full w-[61.6%]" />
              </div>
            </div>

            <div className="space-y-1.5 pr-9 border-r-2 border-teal-500/30">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">تکمیل فرم / ثبت نهایی سفارش</span>
                <span className="text-slate-400 font-semibold dir-ltr">485 (16.4%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[16.4%]" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>بازده کلی کمپین‌ها</span>
            <span className="text-emerald-400 font-semibold">+۲۴٪ افزایش نسبت به ماه گذشته</span>
          </div>
        </div>

        {/* Live Webhooks Stream Monitor */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2 space-x-reverse">
                  <span>جریان زنده رویدادهای Webhook</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-xs text-slate-400">آخرین رویدادهای اینستاگرام دریافتی با امضای HMAC</p>
              </div>
              <button
                onClick={() => onNavigate('webhook_studio')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center space-x-1 space-x-reverse"
              >
                <span>مشاهده در استودیو</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentWebhooks.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-semibold text-slate-200">
                          رویداد {evt.eventType === 'comments' ? 'کامنت جدید' : 'پیام دایرکت'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                          {evt.fingerprint.slice(0, 10)}...
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {evt.payload?.entry?.[0]?.changes?.[0]?.value?.text || 'دریافت شده از API رسمی Meta'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        evt.status === 'processed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3 ml-1" />
                      {evt.status === 'processed' ? 'پردازش شد' : 'یکتا‌سازی (Deduplicated)'}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 dir-ltr font-mono">
                      {new Date(evt.receivedAt).toLocaleTimeString('fa-IR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>تست وب‌هوک با امضای واقعی HMAC SHA-256</span>
            <span className="text-purple-400 hover:underline cursor-pointer" onClick={() => onNavigate('webhook_studio')}>
              اجرای سناریوی شبیه‌سازی →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
