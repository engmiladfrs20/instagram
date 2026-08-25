import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertOctagon,
  Copy,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { WebhookEvent } from '../types';

interface WebhookStudioViewProps {
  webhookEvents: WebhookEvent[];
  onSimulateWebhook: (params: {
    eventType: string;
    text: string;
    username: string;
    isExpiredComment?: boolean;
    isDuplicate?: boolean;
  }) => Promise<any>;
}

export const WebhookStudioView: React.FC<WebhookStudioViewProps> = ({
  webhookEvents,
  onSimulateWebhook,
}) => {
  const [eventType, setEventType] = useState<string>('comments');
  const [inputText, setInputText] = useState<string>('سلام قیمت این کالا چند تومان هست؟');
  const [inputUsername, setInputUsername] = useState<string>('neda_style');
  const [isExpiredComment, setIsExpiredComment] = useState<boolean>(false);
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleRunSimulate = async () => {
    setLoading(true);
    try {
      const res = await onSimulateWebhook({
        eventType,
        text: inputText,
        username: inputUsername,
        isExpiredComment,
        isDuplicate,
      });
      setLastResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              استودیو شبیه‌ساز و تست زنده Webhook رسمی Meta
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              ارسال رویدادهای شبیه‌سازی‌شده جهت بررسی صحت محاسبه امضای HMAC SHA-256، رفتار یکتاسازی (Deduplication) و اجرای Policy Guard.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Input Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 lg:col-span-1">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>تنظیمات شبیه‌سازی رویداد</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </h2>

          <div className="space-y-4 text-xs">
            {/* Event Type Selection */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">نوع رویداد Webhook</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="comments">کامنت جدید زیر پست/ریلز (Comment-to-DM)</option>
                <option value="messages">پیام دایرکت جدید (Inbound DM)</option>
                <option value="quick_reply">انتخاب دکمه Quick Reply</option>
              </select>
            </div>

            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">نام کاربری ارسال‌کننده (Username)</label>
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-left dir-ltr focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Text Input */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-medium block">متن کامنت یا پیام</label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Special Test Scenarios Checkboxes */}
            <div className="webhook-test-options">
              <span className="text-slate-400 font-medium block text-[11px]">سناریوهای تست خاص قوانین Meta:</span>

              <label className="webhook-check-row" htmlFor="expired-comment-check">
                <input
                  id="expired-comment-check"
                  type="checkbox"
                  checked={isExpiredComment}
                  onChange={(e) => setIsExpiredComment(e.target.checked)}
                  className="form-check-input"
                />
                <span>شبیه‌سازی کامنت قدیمی‌تر از ۷ روز (نقض قوانین Meta)</span>
              </label>

              <label className="webhook-check-row" htmlFor="duplicate-event-check">
                <input
                  id="duplicate-event-check"
                  type="checkbox"
                  checked={isDuplicate}
                  onChange={(e) => setIsDuplicate(e.target.checked)}
                  className="form-check-input"
                />
                <span>ارسال تکراری (تست سیستم Deduplication)</span>
              </label>
            </div>

            <button
              onClick={handleRunSimulate}
              disabled={loading}
              className="btn ui-btn ui-btn-warning webhook-run-btn"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>ارسال Webhook به Ingress Pipeline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Execution Trace Result & History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Latest Simulation Result Trace */}
          {lastResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 space-x-reverse">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>نتیجه پردازش درون Pipeline و خروجی Policy Guard</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">امضای HMAC SHA-256</span>
                  <span className="text-emerald-400 font-bold">معتبر (Valid)</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">وضعیت یکتاسازی (Fingerprint)</span>
                  <span className={lastResult.simulationResult.isDeduped ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {lastResult.simulationResult.isDeduped ? 'تکراری (Deduped)' : 'جدید (Processed)'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">قانون ۷ روزه Meta</span>
                  <span className={lastResult.simulationResult.isExpiredComment ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {lastResult.simulationResult.isExpiredComment ? 'نقض شد (Blocked)' : 'تایید شد (Passed)'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">اکشن‌های ارسال شده</span>
                  <span className="text-white font-bold">{lastResult.simulationResult.deliveredActionsCount} پاسخ</span>
                </div>
              </div>

              {/* Payload Hash / Fingerprint Code Box */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                <p className="text-[10px] text-slate-500">Event Fingerprint ID:</p>
                <p className="text-purple-400">{lastResult.simulationResult.fingerprint}</p>
              </div>
            </div>
          )}

          {/* Real-time Ingress Event Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">جدول رویدادهای اخیر دریافت شده</span>
              <span className="text-xs text-slate-400 font-mono">{webhookEvents.length} رویداد ثبت شده</span>
            </div>

            <div className="divide-y divide-slate-800">
              {webhookEvents.map((evt) => (
                <div key={evt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-800/40 transition">
                  <div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className="font-bold text-white">
                        رویداد {evt.eventType}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {evt.fingerprint.slice(0, 12)}...
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1">
                      {evt.payload?.entry?.[0]?.changes?.[0]?.value?.text || 'Payload دریافت شده'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 space-x-reverse">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${
                        evt.status === 'processed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : evt.status === 'deduped'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {evt.status === 'processed' ? 'پردازش گردید' : evt.status === 'deduped' ? 'تکراری (Deduped)' : 'مسدود (Policy Error)'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.receivedAt).toLocaleTimeString('fa-IR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
