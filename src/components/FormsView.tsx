import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, FormInput, UserCheck } from 'lucide-react';
import { Form, FormSubmission } from '../types';
import { ResponsivePreview } from './ResponsivePreview';

interface FormsViewProps {
  forms: Form[];
  submissions: FormSubmission[];
}

export const FormsView: React.FC<FormsViewProps> = ({ forms, submissions }) => {
  const [selectedFormId, setSelectedFormId] = useState<string>(forms[0]?.id || '');

  useEffect(() => {
    if (!selectedFormId && forms[0]) setSelectedFormId(forms[0].id);
    if (selectedFormId && !forms.some((form) => form.id === selectedFormId) && forms[0]) {
      setSelectedFormId(forms[0].id);
    }
  }, [forms, selectedFormId]);

  const selectedForm = forms.find((form) => form.id === selectedFormId) || forms[0];
  const selectedSubmissions = useMemo(
    () => submissions.filter((submission) => !selectedFormId || submission.formId === selectedFormId),
    [selectedFormId, submissions],
  );

  const handleExportCSV = () => {
    const fieldKeys = selectedForm?.fields.map((field) => field.fieldKey) || Array.from(new Set(selectedSubmissions.flatMap((submission) => Object.keys(submission.answers))));
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['contact', 'username', 'status', 'createdAt', ...fieldKeys];
    const rows = selectedSubmissions.map((submission) => [
      submission.contactName,
      submission.contactUsername,
      submission.status,
      submission.createdAt,
      ...fieldKeys.map((key) => submission.answers[key] || ''),
    ]);
    const csv = '\uFEFF' + [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedForm?.name || 'form-submissions'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5" dir="rtl">
      <header className="workspace-page-header">
        <div>
          <div className="workspace-page-kicker"><FormInput size={16} /> جمع‌آوری لید در گفتگو</div>
          <h2>فرم‌های مکالمه‌ای</h2>
          <p>اطلاعات موردنیاز را مرحله‌به‌مرحله از مخاطب بگیرید و قبل از انتشار، تجربهٔ پاسخ‌گویی را روی موبایل و دسکتاپ ببینید.</p>
        </div>
        <div className="workspace-page-actions">
          <button type="button" onClick={handleExportCSV} className="topbar-oauth"><FileSpreadsheet size={16} /> خروجی CSV پاسخ‌ها</button>
        </div>
      </header>

      {selectedForm ? (
        <div className="builder-layout">
          <div className="builder-layout-preview">
            <ResponsivePreview
              variant="form"
              title={selectedForm.name}
              message={selectedForm.description || 'اطلاعات شما با موفقیت ثبت شد.'}
              formFields={selectedForm.fields.map((field) => field.label)}
            />
          </div>

          <div className="space-y-4">
            <section className="surface-card p-4 p-lg-5">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                <div>
                  <span className="text-secondary small">فرم انتخاب‌شده</span>
                  <h3 className="h5 mt-1 mb-1">{selectedForm.name}</h3>
                  <p className="text-secondary small mb-0">{selectedForm.description}</p>
                </div>
                <span className={`status-chip ${selectedForm.status === 'active' ? 'status-chip-success' : 'status-chip-muted'}`}>
                  <CheckCircle2 size={13} /> {selectedForm.status === 'active' ? 'فعال' : 'پیش‌نویس'}
                </span>
              </div>
              <div className="row g-3">
                {selectedForm.fields.map((field, index) => (
                  <div className="col-12 col-md-6" key={field.id}>
                    <div className="surface-field-card">
                      <div className="d-flex align-items-center justify-content-between gap-2">
                        <strong>{index + 1}. {field.label}</strong>
                        <span>{field.fieldType}</span>
                      </div>
                      <p>{field.prompt}</p>
                      {field.required && <small>پاسخ الزامی</small>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card p-4 p-lg-5">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                <div><span className="text-secondary small">نتیجهٔ سناریو</span><h3 className="h6 mt-1 mb-0">آخرین پاسخ‌های ثبت‌شده</h3></div>
                <span className="metric-inline"><UserCheck size={14} /> {selectedSubmissions.length.toLocaleString('fa-IR')} پاسخ</span>
              </div>
              <div className="form-selector-row" role="listbox" aria-label="انتخاب فرم">
                {forms.map((form) => (
                  <button type="button" key={form.id} onClick={() => setSelectedFormId(form.id)} className={`form-selector ${form.id === selectedForm.id ? 'is-selected' : ''}`} aria-selected={form.id === selectedForm.id}>
                    <span>{form.name}</span><small>{form.submissionCount.toLocaleString('fa-IR')} پاسخ</small>
                  </button>
                ))}
              </div>
              <div className="submissions-list mt-3">
                {selectedSubmissions.length === 0 ? (
                  <div className="empty-state-card"><UserCheck size={24} /><strong>هنوز پاسخی ثبت نشده</strong><span>وقتی کاربر فرم را کامل کند، پاسخ او در این بخش نمایش داده می‌شود.</span></div>
                ) : selectedSubmissions.slice(0, 6).map((submission) => (
                  <article className="submission-row" key={submission.id}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="submission-avatar"><UserCheck size={14} /></span>
                      <div><strong>{submission.contactName}</strong><small dir="ltr">@{submission.contactUsername}</small></div>
                    </div>
                    <div className="submission-answer-preview">
                      {Object.entries(submission.answers).slice(0, 2).map(([key, value]) => <span key={key}>{value}</span>)}
                    </div>
                    <time dateTime={submission.completedAt || submission.createdAt}>{new Date(submission.completedAt || submission.createdAt).toLocaleDateString('fa-IR')}</time>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="empty-state-card"><FormInput size={30} /><strong>فرمی ساخته نشده است</strong><span>پس از ساخت اولین فرم مکالمه‌ای، تنظیمات و پیش‌نمایش آن از اینجا مدیریت می‌شود.</span></div>
      )}
    </div>
  );
};
