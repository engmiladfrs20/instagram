import React from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, ShieldCheck, History, Terminal } from 'lucide-react';
import { DLQItem, AuditLog } from '../types';

interface OperationsViewProps {
  dlqItems: DLQItem[];
  auditLogs: AuditLog[];
  onReplayDLQ: (id: string) => Promise<void>;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  dlqItems,
  auditLogs,
  onReplayDLQ,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              مرکز عملیات، مدیریت خطاها (DLQ) و Audit Logs
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              بررسی کارهای ناموفق، طبقه‌بندی خطاها (تخطی قوانین Meta، انقضای توکن یا خطای سرور) و بازپخش مجدد.
            </p>
          </div>
        </div>
      </div>

      {/* DLQ Inspector Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3">
          <span>صف کارهای ناموفق (Dead Letter Queue - DLQ)</span>
          <span className="text-xs text-slate-400 font-mono">{dlqItems.length} کار نیازمند بررسی</span>
        </h2>

        {dlqItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-emerald-400 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <span>هیچ کار ناموفقی در صف وجود ندارد. تمام ارسال‌ها با موفقیت انجام شده‌اند.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {dlqItems.map((item) => (
              <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="font-bold text-rose-400">{item.actionType}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                      Job: {item.jobId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 font-semibold">
                      خطای Policy: {item.errorClass}
                    </span>
                  </div>

                  {item.canReplay ? (
                    <button
                      onClick={() => onReplayDLQ(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center space-x-1 space-x-reverse"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>بازپخش (Replay)</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">غیرقابل بازپخش (Policy Violation)</span>
                  )}
                </div>

                <p className="text-slate-300 font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {item.errorReason}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>خلاصه: {item.payloadSummary}</span>
                  <span className="font-mono">آخرین تلاش: {new Date(item.lastAttemptAt).toLocaleTimeString('fa-IR')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center space-x-2 space-x-reverse border-b border-slate-800 pb-3">
          <History className="w-4 h-4 text-purple-400" />
          <span>تاریخچه تغییرات و Audit Logs سیستم</span>
        </h2>

        <div className="divide-y divide-slate-800">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">{log.actorName}</span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="text-purple-400 font-mono">{log.action}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  منبع: {log.resourceType} ({log.resourceId})
                </p>
              </div>

              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(log.createdAt).toLocaleString('fa-IR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
