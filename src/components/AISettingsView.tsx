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
    <div className="ai-settings-view" dir="rtl">
      <header className="ai-hero-panel">
        <div className="ai-hero-copy">
          <span className="ai-hero-icon"><BrainCircuit size={23} /></span>
          <div>
            <h1 className="ai-hero-title">دستیار هوشمند Gemini</h1>
            <p>پاسخ‌گویی خودکار دایرکت و کامنت فقط بر اساس اطلاعاتی که برای همین Workspace ثبت می‌کنید.</p>
          </div>
        </div>
        <span className={`ai-status-chip ${enabled ? 'is-active' : ''}`}>{enabled ? 'فعال' : 'غیرفعال'}</span>
      </header>

      <section className="ai-panel">
        <div className="ai-panel-heading">
          <div><h2>تنظیمات پاسخ‌گویی</h2><p>قبل از فعال‌سازی، حداقل یک بخش اطلاعات کسب‌وکار اضافه کنید.</p></div>
          <button type="button" onClick={save} disabled={busy} className="btn ui-btn ui-btn-primary ai-save-btn">
            <span className="ui-btn-content"><Save size={17} /><span>ذخیره تنظیمات</span></span>
          </button>
        </div>

        <div className="ai-settings-grid">
          <div className="ai-switch-field">
            <div><strong>فعال‌سازی پاسخ خودکار Gemini</strong><small>پاسخ فقط از دانش ثبت‌شده ساخته می‌شود.</small></div>
            <div className="form-check form-switch m-0">
              <input id="ai-enabled" type="checkbox" role="switch" className="form-check-input" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              <label className="visually-hidden" htmlFor="ai-enabled">فعال‌سازی پاسخ خودکار Gemini</label>
            </div>
          </div>

          <label className="ai-field">مدل
            <select value={model} onChange={(event) => setModel(event.target.value)} className="form-select ai-control" dir="ltr">
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
            </select>
          </label>

          <label className="ai-field ai-field-wide">دستورالعمل رفتار دستیار
            <textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={5} className="form-control ai-control" placeholder="مثلاً: همیشه فارسی، کوتاه و محترمانه جواب بده..." />
          </label>

          <label className="ai-field">سقف درخواست روزانه
            <input type="number" min={1} max={1000} value={dailyRequestLimit} onChange={(event) => setDailyRequestLimit(Number(event.target.value))} className="form-control ai-control" />
          </label>
        </div>
        {message && <p className="ai-success-message"><Check size={16} /> {message}</p>}
      </section>

      <section className="ai-panel">
        <div className="ai-panel-heading ai-panel-heading-simple"><div><h2>آموزش کسب‌وکار</h2><p>قیمت، خدمات، قوانین، ساعت کاری و پاسخ‌های مجاز را به‌صورت جداگانه ثبت کنید.</p></div></div>
        <div className="ai-knowledge-grid">
          <input value={knowledgeTitle} onChange={(event) => setKnowledgeTitle(event.target.value)} placeholder="عنوان، مثلاً قوانین ارسال" className="form-control ai-control" />
          <textarea value={knowledgeContent} onChange={(event) => setKnowledgeContent(event.target.value)} rows={3} placeholder="متن دقیق و قابل استناد برای دستیار" className="form-control ai-control" />
        </div>
          <button type="button" onClick={addKnowledge} disabled={busy || !knowledgeTitle.trim() || !knowledgeContent.trim()} className="btn ui-btn ui-btn-secondary ai-add-btn">
            <span className="ui-btn-content"><Plus size={17} /><span>افزودن اطلاعات</span></span>
          </button>
        <div className="ai-knowledge-list">
          {knowledgeItems.length === 0 && <p className="ai-empty-state">هنوز اطلاعاتی ثبت نشده است.</p>}
          {knowledgeItems.map((item) => <article key={item.id} className="ai-knowledge-item"><div><h3>{item.title}</h3><p>{item.content}</p></div><button type="button" onClick={() => onDeleteKnowledge(item.id)} className="ai-icon-btn is-danger" aria-label={`حذف ${item.title}`}><Trash2 size={17} /></button></article>)}
        </div>
      </section>

      <section className="ai-panel">
        <div className="ai-panel-heading ai-panel-heading-simple"><div><h2>تست قبل از اتصال به اینستاگرام</h2><p>یک پیام نمونه بفرستید تا پاسخ واقعی Gemini را ببینید.</p></div></div>
        <div className="ai-test-row">
          <textarea value={testText} onChange={(event) => setTestText(event.target.value)} rows={2} className="form-control ai-control" />
          <button type="button" onClick={test} disabled={busy || !testText.trim()} className="btn ui-btn ui-btn-success ai-test-btn">
            <span className="ui-btn-content">{busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}<span>تست پاسخ</span></span>
          </button>
        </div>
        {testAnswer && <div className="ai-test-answer"><span>پاسخ Gemini</span>{testAnswer}</div>}
      </section>
    </div>
  );
};
