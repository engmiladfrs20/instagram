import React, { useEffect, useState } from 'react';
import { BrainCircuit, Check, Loader2, Plus, Save, Send, Trash2 } from 'lucide-react';

interface AISettingsViewProps {
  settings: any | null;
  knowledgeItems: any[];
  onSaveSettings: (settings: any) => Promise<void>;
  onAddKnowledge: (title: string, content: string) => Promise<void>;
  onDeleteKnowledge: (id: string) => Promise<void>;
  onTest: (text: string) => Promise<string>;
}

export const AISettingsView: React.FC<AISettingsViewProps> = ({
  settings,
  knowledgeItems,
  onSaveSettings,
  onAddKnowledge,
  onDeleteKnowledge,
  onTest,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState('gemini-3.6-flash');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [dailyRequestLimit, setDailyRequestLimit] = useState(100);
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeContent, setKnowledgeContent] = useState('');
  const [testText, setTestText] = useState('سلام، برای معرفی خدمات چه پاسخی بدهم؟');
  const [testAnswer, setTestAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!settings) return;
    setEnabled(Boolean(settings.enabled));
    setModel(settings.model || 'gemini-3.6-flash');
    setSystemPrompt(settings.system_prompt || settings.systemPrompt || '');
    setDailyRequestLimit(Number(settings.daily_request_limit || settings.dailyRequestLimit || 100));
  }, [settings]);

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      await onSaveSettings({ enabled, model, systemPrompt, dailyRequestLimit });
      setMessage('تنظیمات Gemini ذخیره شد.');
    } finally {
      setBusy(false);
    }
  };

  const addKnowledge = async () => {
    if (!knowledgeTitle.trim() || !knowledgeContent.trim()) return;
    setBusy(true);
    try {
      await onAddKnowledge(knowledgeTitle, knowledgeContent);
      setKnowledgeTitle('');
      setKnowledgeContent('');
      setMessage('اطلاعات کسب‌وکار اضافه شد.');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!testText.trim()) return;
    setBusy(true);
    setTestAnswer('');
    try {
      setTestAnswer(await onTest(testText));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="ai-hero-panel rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="ai-hero-icon rounded-2xl p-3 text-purple-300"><BrainCircuit className="h-6 w-6" /></div>
            <div>
              <h1 className="ai-hero-title text-xl font-bold">دستیار هوشمند Gemini</h1>
              <p className="mt-1 text-xs text-slate-400">پاسخ‌گویی خودکار دایرکت و کامنت فقط بر اساس اطلاعاتی که برای همین Workspace ثبت می‌کنید.</p>
            </div>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-950 text-slate-400'}`}>
            {enabled ? 'فعال' : 'غیرفعال'}
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">تنظیمات پاسخ‌گویی</h2>
            <p className="mt-1 text-xs text-slate-400">قبل از فعال‌سازی، حداقل یک بخش اطلاعات کسب‌وکار اضافه کنید.</p>
          </div>
          <button onClick={save} disabled={busy} className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50"><Save className="h-4 w-4" /> ذخیره</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
            <span>فعال‌سازی پاسخ خودکار Gemini</span>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-purple-600" />
          </label>
          <label className="text-xs text-slate-400">مدل
            <select value={model} onChange={(event) => setModel(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100">
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
            </select>
          </label>
          <label className="text-xs text-slate-400 md:col-span-2">دستورالعمل رفتار دستیار
            <textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-7 text-slate-100" placeholder="مثلاً: همیشه فارسی، کوتاه و محترمانه جواب بده..." />
          </label>
          <label className="text-xs text-slate-400">سقف درخواست روزانه
            <input type="number" min={1} max={1000} value={dailyRequestLimit} onChange={(event) => setDailyRequestLimit(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100" />
          </label>
        </div>
        {message && <p className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><Check className="h-4 w-4" /> {message}</p>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-4"><h2 className="font-bold text-white">آموزش کسب‌وکار</h2><p className="mt-1 text-xs text-slate-400">قیمت، خدمات، قوانین، ساعت کاری و پاسخ‌های مجاز را به‌صورت جداگانه ثبت کنید.</p></div>
        <div className="grid gap-3 md:grid-cols-[0.35fr_0.65fr]">
          <input value={knowledgeTitle} onChange={(event) => setKnowledgeTitle(event.target.value)} placeholder="عنوان، مثلاً قوانین ارسال" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100" />
          <textarea value={knowledgeContent} onChange={(event) => setKnowledgeContent(event.target.value)} rows={3} placeholder="متن دقیق و قابل استناد برای دستیار" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-7 text-slate-100" />
        </div>
        <button onClick={addKnowledge} disabled={busy || !knowledgeTitle.trim() || !knowledgeContent.trim()} className="mt-3 flex items-center gap-2 rounded-xl border border-purple-500/40 px-4 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/10 disabled:opacity-40"><Plus className="h-4 w-4" /> افزودن اطلاعات</button>
        <div className="mt-5 space-y-3">
          {knowledgeItems.length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">هنوز اطلاعاتی ثبت نشده است.</p>}
          {knowledgeItems.map((item) => <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-200">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-400">{item.content}</p></div><button onClick={() => onDeleteKnowledge(item.id)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div></div>)}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-4"><h2 className="font-bold text-white">تست قبل از اتصال به اینستاگرام</h2><p className="mt-1 text-xs text-slate-400">یک پیام نمونه بفرستید تا پاسخ واقعی Gemini را ببینید.</p></div>
        <div className="flex flex-col gap-3 md:flex-row"><textarea value={testText} onChange={(event) => setTestText(event.target.value)} rows={2} className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm leading-7 text-slate-100" /><button onClick={test} disabled={busy || !testText.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} تست پاسخ</button></div>
        {testAnswer && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-7 text-emerald-100"><span className="mb-2 block text-xs font-bold text-emerald-300">پاسخ Gemini</span>{testAnswer}</div>}
      </section>
    </div>
  );
};
