import React, { useEffect, useRef, useState } from 'react';
import { Check, Moon, Palette, Sun } from 'lucide-react';
import {
  AccentColor,
  applyThemePreferences,
  readThemePreferences,
  saveThemePreferences,
  ThemeMode,
  ThemePreferences,
} from '../lib/theme';

const ACCENTS: Array<{ id: AccentColor; label: string; color: string }> = [
  { id: 'purple', label: 'بنفش', color: '#a855f7' },
  { id: 'cyan', label: 'فیروزه‌ای', color: '#06b6d4' },
  { id: 'emerald', label: 'سبز', color: '#10b981' },
  { id: 'amber', label: 'کهربایی', color: '#f59e0b' },
  { id: 'rose', label: 'صورتی', color: '#f43f5e' },
  { id: 'indigo', label: 'نیلی', color: '#6366f1' },
];

const MODES: Array<{ id: ThemeMode; label: string; Icon: typeof Sun }> = [
  { id: 'dark', label: 'دارک', Icon: Moon },
  { id: 'light', label: 'لایت', Icon: Sun },
];

export const ThemeControls: React.FC = () => {
  const [preferences, setPreferences] = useState<ThemePreferences>(readThemePreferences);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyThemePreferences(preferences);
    saveThemePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const updateMode = (mode: ThemeMode) => {
    setPreferences((current) => ({ ...current, mode }));
  };

  const updateAccent = (accent: AccentColor) => {
    setPreferences((current) => ({ ...current, accent }));
  };

  const selectedAccent = ACCENTS.find((accent) => accent.id === preferences.accent) || ACCENTS[0];

  return (
    <div className="theme-control" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="تنظیم ظاهر پنل"
        title="تنظیم ظاهر پنل"
        className="theme-trigger"
      >
        <Palette size={17} />
        <span>ظاهر</span>
        <span
          aria-hidden="true"
          className="theme-current-dot"
          style={{ backgroundColor: selectedAccent.color }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="تنظیمات ظاهر"
          className="theme-popover"
        >
          <div className="theme-popover-heading">
            <div>
              <p>ظاهر پنل</p>
              <small>حالت و رنگ اصلی رابط را انتخاب کنید.</small>
            </div>
            <span className="theme-heading-dot" style={{ backgroundColor: selectedAccent.color }} />
          </div>

          <div className="theme-mode-grid" role="group" aria-label="حالت رنگی">
            {MODES.map(({ id, label, Icon }) => {
              const selected = preferences.mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateMode(id)}
                  className={`theme-mode-btn ${selected ? 'is-selected' : ''}`}
                  style={{
                    borderColor: selected ? selectedAccent.color : 'var(--color-slate-700)',
                    backgroundColor: selected ? `${selectedAccent.color}22` : 'transparent',
                    color: selected ? 'var(--color-slate-100)' : 'var(--color-slate-400)',
                  }}
                >
                  <Icon size={17} />
                  {label}
                </button>
              );
            })}
          </div>

          <div className="theme-accent-section">
            <p>رنگ اصلی</p>
            <div className="theme-accent-grid" role="group" aria-label="رنگ اصلی">
              {ACCENTS.map((accent) => {
                const selected = preferences.accent === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    aria-label={accent.label}
                    aria-pressed={selected}
                    onClick={() => updateAccent(accent.id)}
                    className={`theme-accent-btn ${selected ? 'is-selected' : ''}`}
                    style={{ borderColor: selected ? accent.color : 'transparent' }}
                  >
                    <span className="theme-accent-dot" style={{ backgroundColor: accent.color }}>
                      {selected && <Check size={13} />}
                    </span>
                    <span>{accent.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
