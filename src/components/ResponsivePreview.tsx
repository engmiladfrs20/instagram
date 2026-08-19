import React, { useState } from 'react';
import { Check, ChevronLeft, LayoutPanelTop, MessageCircle, Monitor, Smartphone, UserRound } from 'lucide-react';

export type PreviewVariant = 'dm' | 'comment' | 'form';

interface ResponsivePreviewProps {
  variant: PreviewVariant;
  title: string;
  message: string;
  contactName?: string;
  keyword?: string;
  formFields?: string[];
  className?: string;
}

const DEFAULT_FIELDS = ['نام و نام خانوادگی', 'شماره تماس', 'شهر محل سکونت'];

export const ResponsivePreview: React.FC<ResponsivePreviewProps> = ({
  variant,
  title,
  message,
  contactName = 'کاربر اینستاگرام',
  keyword = 'قیمت',
  formFields = DEFAULT_FIELDS,
  className = '',
}) => {
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile');
  const fields = formFields.length > 0 ? formFields : DEFAULT_FIELDS;

  return (
    <section className={`preview-card ${className}`} aria-label={`پیش‌نمایش ${title}`}>
      <div className="preview-card-header">
        <div className="preview-card-title">
          <span className="preview-card-icon"><LayoutPanelTop size={16} /></span>
          <div>
            <strong>{title}</strong>
            <span>نمایش زندهٔ تجربه کاربر</span>
          </div>
        </div>
        <div className="preview-mode-switch" role="group" aria-label="اندازه پیش‌نمایش">
          <button type="button" className={mode === 'mobile' ? 'is-active' : ''} onClick={() => setMode('mobile')} aria-pressed={mode === 'mobile'}>
            <Smartphone size={14} /> موبایل
          </button>
          <button type="button" className={mode === 'desktop' ? 'is-active' : ''} onClick={() => setMode('desktop')} aria-pressed={mode === 'desktop'}>
            <Monitor size={14} /> دسکتاپ
          </button>
        </div>
      </div>

      <div className={`preview-stage preview-stage-${mode}`}>
        {mode === 'mobile' ? (
          <div className="preview-device preview-device-phone">
            <div className="phone-island" />
            <div className="preview-phone-status"><span>11:20</span><span>▴ ◼︎ ◌</span></div>
            <div className="preview-chat-header">
              <ChevronLeft size={15} />
              <span className="preview-avatar"><UserRound size={14} /></span>
              <div><strong>{contactName}</strong><small>@instagram_user</small></div>
              <MessageCircle size={14} className="ms-auto" />
            </div>
            <div className="preview-chat-body">
              {variant === 'comment' && <span className="preview-comment-bubble">کامنت: «{keyword}»</span>}
              {variant === 'form' && (
                <div className="preview-form-card">
                  <span className="preview-bot-badge"><MessageCircle size={13} /> فرم اطلاعات</span>
                  <strong>برای دریافت راهنمایی، چند سؤال کوتاه داریم.</strong>
                  {fields.slice(0, 2).map((field) => <span className="preview-field" key={field}>{field}</span>)}
                </div>
              )}
              <div className="preview-message-bubble">{message}</div>
              {variant !== 'form' && <span className="preview-quick-reply">مشاهده جزئیات <ChevronLeft size={13} /></span>}
            </div>
            <div className="preview-composer"><span>پیام خود را بنویسید...</span><span className="preview-send-dot">↑</span></div>
          </div>
        ) : (
          <div className="preview-device preview-device-desktop">
            <div className="preview-browser-bar"><span /><span /><span /><small>instagram.com/direct</small></div>
            <div className="preview-desktop-layout">
              <aside className="preview-thread-list">
                <strong>پیام‌ها</strong>
                <div className="preview-thread is-selected"><span className="preview-avatar"><UserRound size={13} /></span><span><b>{contactName}</b><small>مکالمه جدید</small></span></div>
                <div className="preview-thread"><span className="preview-avatar"><UserRound size={13} /></span><span><b>مشتری قبلی</b><small>آخرین پاسخ</small></span></div>
              </aside>
              <div className="preview-desktop-chat">
                <div className="preview-chat-header"><span className="preview-avatar"><UserRound size={14} /></span><div><strong>{contactName}</strong><small>در حال گفتگو</small></div><MessageCircle size={14} className="ms-auto" /></div>
                <div className="preview-chat-body">
                  {variant === 'comment' && <span className="preview-comment-bubble">کامنت: «{keyword}»</span>}
                  {variant === 'form' && <div className="preview-form-card"><span className="preview-bot-badge"><MessageCircle size={13} /> فرم اطلاعات</span><strong>اطلاعات مشتری را مرحله‌به‌مرحله دریافت کنید.</strong>{fields.slice(0, 3).map((field) => <span className="preview-field" key={field}>{field}</span>)}</div>}
                  <div className="preview-message-bubble">{message}</div>
                  {variant !== 'form' && <span className="preview-quick-reply">مشاهده جزئیات <ChevronLeft size={13} /></span>}
                </div>
                <div className="preview-composer"><span>پاسخ خود را بنویسید...</span><span className="preview-send-dot">↑</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="preview-card-footer">
        <span><Check size={14} /> هر تغییر قبل از انتشار اینجا دیده می‌شود.</span>
        <span className="preview-footer-mode">{mode === 'mobile' ? 'نمای موبایل' : 'نمای دسکتاپ'}</span>
      </div>
    </section>
  );
};
