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
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="تنظیم ظاهر پنل"
        title="تنظیم ظاهر پنل"
        className="flex items-center gap-2 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-purple-500/50 hover:text-slate-100"
      >
        <Palette className="size-4" />
        <span className="hidden sm:inline">ظاهر</span>
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full ring-2 ring-white/10"
          style={{ backgroundColor: selectedAccent.color }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="تنظیمات ظاهر"
          className="absolute left-0 top-full z-50 mt-3 w-72 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-right shadow-2xl"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">ظاهر پنل</p>
              <p className="mt-1 text-[11px] text-slate-400">حالت و رنگ اصلی رابط را انتخاب کنید.</p>
            </div>
            <span className="mt-1 size-3 rounded-full" style={{ backgroundColor: selectedAccent.color }} />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="حالت رنگی">
            {MODES.map(({ id, label, Icon }) => {
              const selected = preferences.mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => updateMode(id)}
                  className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition"
                  style={{
                    borderColor: selected ? selectedAccent.color : 'var(--color-slate-700)',
                    backgroundColor: selected ? `${selectedAccent.color}22` : 'transparent',
                    color: selected ? 'var(--color-slate-100)' : 'var(--color-slate-400)',
                  }}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-400">رنگ اصلی</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="رنگ اصلی">
              {ACCENTS.map((accent) => {
                const selected = preferences.accent === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    aria-label={accent.label}
                    aria-pressed={selected}
                    onClick={() => updateAccent(accent.id)}
                    className="flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-[11px] text-slate-300 transition hover:bg-slate-800"
                    style={{ borderColor: selected ? accent.color : 'transparent' }}
                  >
                    <span className="flex size-5 items-center justify-center rounded-full" style={{ backgroundColor: accent.color }}>
                      {selected && <Check className="size-3 text-white" />}
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

