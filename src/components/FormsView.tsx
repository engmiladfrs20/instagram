import React, { useState } from 'react';
import { FormInput, Plus, Download, CheckCircle2, FileSpreadsheet, UserCheck } from 'lucide-react';
import { Form, FormSubmission } from '../types';

interface FormsViewProps {
  forms: Form[];
  submissions: FormSubmission[];
}

export const FormsView: React.FC<FormsViewProps> = ({ forms, submissions }) => {
  const [selectedFormId, setSelectedFormId] = useState<string>(forms[0]?.id || '');

  const handleExportCSV = () => {
    alert('فایل CSV لیدها تولید شد و لینک دانلود امن و کوتاه‌عمر با موفقیت ایجاد گردید.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2 space-x-reverse">
            <FormInput className="w-5 h-5 text-purple-400" />
            <span>فرم‌های مکالمه‌ای و دریافت مشخصات در دایرکت</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تعریف پرسش‌های گام‌به‌گام (نام، شماره همراه ایران با اعتبارسنجی 09xx، آدرس) جهت دریافت سریع سفارش.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 space-x-reverse transition"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>خروجی CSV لیدها</span>
        </button>
      </div>

      {/* Forms List & Active Fields View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forms Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-1">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">فرم‌های تعریف‌شده</h2>

          {forms.map((form) => (
            <div
              key={form.id}
              onClick={() => setSelectedFormId(form.id)}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                selectedFormId === form.id
                  ? 'bg-purple-950/20 border-purple-500'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-bold text-white">{form.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {form.status === 'active' ? 'فعال' : 'پیش‌نویس'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{form.description}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-2">
                {form.submissionCount} پاسخ تکمیل شده
              </p>
            </div>
          ))}
        </div>

        {/* Form Submissions Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
            آخرین پاسخ‌های ثبت شده کاربران
          </h2>

          <div className="divide-y divide-slate-800">
            {submissions.map((sub) => (
              <div key={sub.id} className="py-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">{sub.contactName}</span>
                    <span className="text-slate-400 dir-ltr font-mono">@{sub.contactUsername}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(sub.completedAt || sub.createdAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">نام کامل:</span>
                    <span className="text-slate-200">{sub.answers.full_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">شماره همراه:</span>
                    <span className="text-slate-200 dir-ltr font-mono">{sub.answers.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">آدرس تحویل:</span>
                    <span className="text-slate-200 truncate block">{sub.answers.delivery_city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
