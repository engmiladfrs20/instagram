import React, { useState } from 'react';
import { Check, ChevronLeft, Image as ImageIcon, LayoutPanelTop, MessageCircle, Mic, Monitor, Plus, Smartphone, Type, UserRound, Video, X } from 'lucide-react';

export type PreviewVariant = 'dm' | 'comment' | 'form';
export type PreviewMedia = { type: 'image' | 'video' | 'audio'; url: string };
export type PreviewButton = { title: string; url?: string; payload?: string };

interface ResponsivePreviewProps {
  variant: PreviewVariant;
  title: string;
  message: string;
  contactName?: string;
  keyword?: string;
  formFields?: string[];
  media?: PreviewMedia[];
  buttons?: PreviewButton[];
  onAddText?: () => void;
  onAddMedia?: (media: PreviewMedia) => void;
  onRemoveMedia?: (type: PreviewMedia['type']) => void;
  onAddButton?: (button: PreviewButton) => void;
  onRemoveButton?: (index: number) => void;
  className?: string;
}

const DEFAULT_FIELDS = ['نام و نام خانوادگی', 'شماره تماس', 'شهر محل سکونت'];
type ComposerKind = 'image' | 'audio' | 'video' | 'button' | null;

export const ResponsivePreview: React.FC<ResponsivePreviewProps> = ({
  variant,
  title,
  message,
  contactName = 'کاربر اینستاگرام',
  keyword = 'قیمت',
  formFields = DEFAULT_FIELDS,
  media = [],
  buttons = [],
  onAddText,
  onAddMedia,
  onRemoveMedia,
  onAddButton,
  onRemoveButton,
  className = '',
}) => {
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile');
  const [activeAction, setActiveAction] = useState('متن');
  const [composerKind, setComposerKind] = useState<ComposerKind>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [buttonTitle, setButtonTitle] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const fields = formFields.length > 0 ? formFields : DEFAULT_FIELDS;
  const actionPills = [
    { icon: Type, label: 'متن', kind: null as ComposerKind },
    { icon: ImageIcon, label: 'تصویر', kind: 'image' as ComposerKind },
    { icon: Mic, label: 'صوت', kind: 'audio' as ComposerKind },
    { icon: Video, label: 'ویدیو', kind: 'video' as ComposerKind },
    { icon: LayoutPanelTop, label: 'دکمه', kind: 'button' as ComposerKind },
  ];

  const chooseAction = (label: string, kind: ComposerKind) => {
    setActiveAction(label);
    if (label === 'متن') {
      onAddText?.();
      setComposerKind(null);
      return;
    }
    setComposerKind(kind);
    if (kind) setMediaUrl('');
  };

  const submitComposer = () => {
    if (composerKind === 'button') {
      const titleText = buttonTitle.trim();
      if (!titleText || !onAddButton) return;
      const normalizedTitle = titleText.replace(/\u200c/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fa-IR');
      const payload = normalizedTitle.includes('فالو کردم') || normalizedTitle.includes('فالو دارم') || normalizedTitle === 'i follow'
        ? 'FOLLOW_CLAIMED'
        : titleText;
      onAddButton({ title: titleText, url: buttonUrl.trim() || undefined, payload });
      setButtonTitle('');
      setButtonUrl('');
      setComposerKind(null);
      return;
    }
    const url = mediaUrl.trim();
    if (!composerKind || !url || !onAddMedia) return;
    onAddMedia({ type: composerKind, url });
    setMediaUrl('');
    setComposerKind(null);
  };

  const renderMedia = () => media.map((item) => (
    <span className="preview-media-card" key={`${item.type}-${item.url}`}>
      {item.type === 'image' && <img src={item.url} alt="رسانهٔ پاسخ" />}
      {item.type === 'video' && <video src={item.url} controls preload="metadata" />}
      {item.type === 'audio' && <audio src={item.url} controls />}
      {onRemoveMedia && <button type="button" onClick={() => onRemoveMedia(item.type)} aria-label="حذف رسانه"><X size={11} /></button>}
    </span>
  ));

  const renderButtons = () => buttons.map((button, index) => {
    const removeControl = onRemoveButton
      ? <button type="button" onClick={() => onRemoveButton(index)} aria-label={`حذف دکمه ${button.title}`}><X size={10} /></button>
      : null;
    return button.url
      ? <span className="preview-action-button" key={`${button.title}-${index}`}>
        <a href={button.url} target="_blank" rel="noreferrer">{button.title}</a>
        {removeControl}
      </span>
      : <span className="preview-action-button" key={`${button.title}-${index}`}>
        <span>{button.title}</span>
        {removeControl}
      </span>;
  });

  const renderMessageContent = () => (
    <>
      {message && <div className="preview-message-bubble">{message}</div>}
      {media.length > 0 && <div className="preview-media-list">{renderMedia()}</div>}
      {buttons.length > 0 && <div className="preview-button-list">{renderButtons()}</div>}
      {variant !== 'form' && <span className="preview-quick-reply">مشاهده جزئیات <ChevronLeft size={13} /></span>}
    </>
  );

  const renderComposer = () => composerKind && (
    <div className="preview-action-composer">
      <div className="preview-action-composer-heading"><strong>{composerKind === 'button' ? 'افزودن دکمه' : `افزودن ${composerKind === 'image' ? 'تصویر' : composerKind === 'video' ? 'ویدیو' : 'صوت'}`}</strong><button type="button" onClick={() => setComposerKind(null)} aria-label="بستن ویرایشگر"><X size={13} /></button></div>
      {composerKind === 'button' ? <>
        <input value={buttonTitle} onChange={(event) => setButtonTitle(event.target.value)} placeholder="عنوان دکمه، مثلاً مشاهده قیمت" aria-label="عنوان دکمه" autoFocus />
        <input value={buttonUrl} onChange={(event) => setButtonUrl(event.target.value)} placeholder="لینک اختیاری https://..." dir="ltr" aria-label="لینک دکمه" />
      </> : <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="لینک مستقیم فایل https://..." dir="ltr" aria-label="لینک رسانه" autoFocus />}
      <button type="button" className="preview-action-composer-submit" onClick={submitComposer}><Plus size={13} /> افزودن</button>
    </div>
  );

  return (
    <section className={`preview-card ${className}`} aria-label={`پیش‌نمایش ${title}`}>
      <div className="preview-card-header">
        <div className="preview-card-title">
          <span className="preview-card-icon"><LayoutPanelTop size={16} /></span>
          <div><strong>{title}</strong><span>نمایش زندهٔ تجربه کاربر</span></div>
        </div>
        <div className="preview-mode-switch" role="group" aria-label="اندازه پیش‌نمایش">
          <button type="button" className={mode === 'mobile' ? 'is-active' : ''} onClick={() => setMode('mobile')} aria-pressed={mode === 'mobile'}><Smartphone size={14} /> موبایل</button>
          <button type="button" className={mode === 'desktop' ? 'is-active' : ''} onClick={() => setMode('desktop')} aria-pressed={mode === 'desktop'}><Monitor size={14} /> دسکتاپ</button>
        </div>
      </div>

      <div className={`preview-stage preview-stage-${mode}`}>
        {mode === 'mobile' ? (
          <div className="preview-mobile-stage">
            <div className="preview-action-pills" role="group" aria-label="ابزارهای پاسخ">
              {actionPills.map(({ icon: ActionIcon, label, kind }) => <button type="button" key={label} className={label === activeAction ? 'is-active' : ''} aria-pressed={label === activeAction} onClick={() => chooseAction(label, kind)}><ActionIcon size={13} /><span>{label}</span><b>+</b></button>)}
            </div>
            {renderComposer()}
            <div className="preview-device preview-device-phone">
              <div className="phone-island" />
              <div className="preview-phone-status"><span>11:20</span><span>▴ ◼︎ ◌</span></div>
              <div className="preview-chat-header"><ChevronLeft size={15} /><span className="preview-avatar"><UserRound size={14} /></span><div><strong>{contactName}</strong><small>@instagram_user</small></div><MessageCircle size={14} className="ms-auto" /></div>
              <div className="preview-chat-body">
                {variant === 'comment' && <span className="preview-comment-bubble">کامنت: «{keyword}»</span>}
                {variant === 'form' && <div className="preview-form-card"><span className="preview-bot-badge"><MessageCircle size={13} /> فرم اطلاعات</span><strong>برای دریافت راهنمایی، چند سؤال کوتاه داریم.</strong>{fields.slice(0, 2).map((field) => <span className="preview-field" key={field}>{field}</span>)}</div>}
                {renderMessageContent()}
              </div>
              <div className="preview-composer"><span>پیام خود را بنویسید...</span><span className="preview-send-dot">↑</span></div>
            </div>
          </div>
        ) : (
          <div className="preview-device preview-device-desktop">
            <div className="preview-browser-bar"><span /><span /><span /><small>instagram.com/direct</small></div>
            <div className="preview-desktop-layout">
              <aside className="preview-thread-list"><strong>پیام‌ها</strong><div className="preview-thread is-selected"><span className="preview-avatar"><UserRound size={13} /></span><span><b>{contactName}</b><small>مکالمه جدید</small></span></div><div className="preview-thread"><span className="preview-avatar"><UserRound size={13} /></span><span><b>مشتری قبلی</b><small>آخرین پاسخ</small></span></div></aside>
              <div className="preview-desktop-chat"><div className="preview-chat-header"><span className="preview-avatar"><UserRound size={14} /></span><div><strong>{contactName}</strong><small>در حال گفتگو</small></div><MessageCircle size={14} className="ms-auto" /></div><div className="preview-chat-body">{variant === 'comment' && <span className="preview-comment-bubble">کامنت: «{keyword}»</span>}{variant === 'form' && <div className="preview-form-card"><span className="preview-bot-badge"><MessageCircle size={13} /> فرم اطلاعات</span><strong>اطلاعات مشتری را مرحله‌به‌مرحله دریافت کنید.</strong>{fields.slice(0, 3).map((field) => <span className="preview-field" key={field}>{field}</span>)}</div>}{renderMessageContent()}</div><div className="preview-composer"><span>پاسخ خود را بنویسید...</span><span className="preview-send-dot">↑</span></div></div>
            </div>
          </div>
        )}
      </div>

      <div className="preview-card-footer"><span><Check size={14} /> هر تغییر قبل از انتشار اینجا دیده می‌شود.</span><span className="preview-footer-mode">{mode === 'mobile' ? 'نمای موبایل' : 'نمای دسکتاپ'}</span></div>
      {mode === 'mobile' && <div className="preview-submit-bar">ثبت پاسخ</div>}
    </section>
  );
};
