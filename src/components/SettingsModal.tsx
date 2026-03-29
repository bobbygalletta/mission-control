import { useState, useEffect } from 'react';

export type ThemeId = 'purple' | 'ocean' | 'forest' | 'sunset' | 'rose' | 'slate';
export type ModeId = 'dark' | 'light';

interface Theme {
  id: ThemeId;
  label: string;
  bgTop: string;
  bgBottom: string;
  orbs: {
    color1: string; // rgba format for orb
    color2: string;
    color3: string;
    accent1: string;
    accent2: string;
    accent3: string;
  };
}

interface ThemeOption {
  id: ThemeId;
  label: string;
  bg: string;
  preview: string;
}

const THEMES: Theme[] = [
  {
    id: 'purple',
    label: 'Deep Purple',
    bgTop: '#0a1a1f',
    bgBottom: '#1a0a2e',
    orbs: {
      color1: 'rgba(88,28,135,0.55)',
      color2: 'rgba(30,30,100,0.6)',
      color3: 'rgba(10,60,60,0.55)',
      accent1: 'rgba(109,40,217,0.45)',
      accent2: 'rgba(88,28,135,0.4)',
      accent3: 'rgba(55,65,160,0.5)',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    bgTop: '#050f1a',
    bgBottom: '#0a1a2e',
    orbs: {
      color1: 'rgba(28,60,120,0.6)',
      color2: 'rgba(10,40,80,0.5)',
      color3: 'rgba(15,80,100,0.5)',
      accent1: 'rgba(40,100,180,0.45)',
      accent2: 'rgba(20,60,100,0.4)',
      accent3: 'rgba(60,120,180,0.4)',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    bgTop: '#040f0a',
    bgBottom: '#0a1a0e',
    orbs: {
      color1: 'rgba(20,60,30,0.6)',
      color2: 'rgba(10,50,40,0.5)',
      color3: 'rgba(30,80,50,0.5)',
      accent1: 'rgba(40,100,60,0.45)',
      accent2: 'rgba(20,70,40,0.4)',
      accent3: 'rgba(50,120,70,0.4)',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    bgTop: '#1a0a05',
    bgBottom: '#2e1a0a',
    orbs: {
      color1: 'rgba(135,50,20,0.6)',
      color2: 'rgba(100,30,15,0.5)',
      color3: 'rgba(80,40,10,0.5)',
      accent1: 'rgba(180,80,30,0.45)',
      accent2: 'rgba(150,60,20,0.4)',
      accent3: 'rgba(200,100,50,0.4)',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    bgTop: '#1a050f',
    bgBottom: '#2e0a1a',
    orbs: {
      color1: 'rgba(120,30,60,0.6)',
      color2: 'rgba(80,20,50,0.5)',
      color3: 'rgba(60,20,40,0.5)',
      accent1: 'rgba(160,50,80,0.45)',
      accent2: 'rgba(130,40,70,0.4)',
      accent3: 'rgba(180,70,100,0.4)',
    },
  },
  {
    id: 'slate',
    label: 'Slate',
    bgTop: '#0a0f12',
    bgBottom: '#141a1e',
    orbs: {
      color1: 'rgba(50,60,70,0.5)',
      color2: 'rgba(30,40,50,0.5)',
      color3: 'rgba(60,70,80,0.5)',
      accent1: 'rgba(80,90,100,0.4)',
      accent2: 'rgba(50,60,70,0.4)',
      accent3: 'rgba(100,110,120,0.4)',
    },
  },
];

const THEME_OPTIONS: ThemeOption[] = THEMES.map(t => ({
  id: t.id,
  label: t.label,
  bg: `linear-gradient(135deg, ${t.bgTop} 0%, ${t.bgBottom} 100%)`,
  preview: `linear-gradient(135deg, ${t.orbs.color1} 0%, ${t.orbs.color2} 50%, ${t.orbs.color3} 100%)`,
}));

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const [theme, setTheme] = useState<ThemeId>(() => (localStorage.getItem('mc_theme') as ThemeId) || 'purple');
  const [mode, setMode] = useState<ModeId>(() => (localStorage.getItem('mc_mode') as ModeId) || 'dark');

  useEffect(() => {
    if (open) {
      const t = (localStorage.getItem('mc_theme') as ThemeId) || 'purple';
      const m = (localStorage.getItem('mc_mode') as ModeId) || 'dark';
      setTheme(t);
      setMode(m);
    }
  }, [open]);

  const applyTheme = (id: ThemeId) => {
    setTheme(id);
    localStorage.setItem('mc_theme', id);
    const t = THEMES.find(x => x.id === id)!;
    document.documentElement.style.setProperty('--bg-top', t.bgTop);
    document.documentElement.style.setProperty('--bg-bottom', t.bgBottom);
    document.documentElement.style.setProperty('--orb-1', t.orbs.color1);
    document.documentElement.style.setProperty('--orb-2', t.orbs.color2);
    document.documentElement.style.setProperty('--orb-3', t.orbs.color3);
    document.documentElement.style.setProperty('--orb-4', t.orbs.accent1);
    document.documentElement.style.setProperty('--orb-5', t.orbs.accent2);
    document.documentElement.style.setProperty('--orb-6', t.orbs.accent3);
  };

  const applyMode = (id: ModeId) => {
    setMode(id);
    localStorage.setItem('mc_mode', id);
    if (id === 'light') {
      document.documentElement.style.setProperty('--bg-top', '#e8f0f8');
      document.documentElement.style.setProperty('--bg-bottom', '#c8dae8');
      document.documentElement.style.setProperty('--orb-1', 'rgba(100,80,160,0.35)');
      document.documentElement.style.setProperty('--orb-2', 'rgba(60,100,140,0.35)');
      document.documentElement.style.setProperty('--orb-3', 'rgba(80,140,120,0.3)');
      document.documentElement.style.setProperty('--orb-4', 'rgba(120,100,180,0.3)');
      document.documentElement.style.setProperty('--orb-5', 'rgba(100,80,140,0.25)');
      document.documentElement.style.setProperty('--orb-6', 'rgba(80,120,160,0.3)');
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
      applyTheme(theme);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] overflow-hidden shadow-2xl" style={{ backgroundColor: 'rgba(5, 8, 18, 1)' }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center gap-3 px-6 pb-4">
          <span className="text-3xl">⚙️</span>
          <h2 className="text-xl font-semibold text-slate-100">Display Settings</h2>
        </div>

        <div className="px-6 pb-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mode</p>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={() => applyMode('dark')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'dark'
                ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                : 'bg-white/[0.05] text-slate-400 border border-transparent hover:bg-white/[0.08]'
            }`}
          >
            🌙 Dark
          </button>
          <button
            onClick={() => applyMode('light')}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'light'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                : 'bg-white/[0.05] text-slate-400 border border-transparent hover:bg-white/[0.08]'
            }`}
          >
            ☀️ Light
          </button>
        </div>

        <div className="px-6 pb-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Background Theme</p>
        </div>
        <div className="px-6 pb-6 grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => applyTheme(opt.id)}
              className={`relative rounded-xl overflow-hidden aspect-video transition-all ${
                theme === opt.id && mode === 'dark'
                  ? 'ring-2 ring-white/60 scale-[1.02]'
                  : 'hover:scale-[1.03]'
              }`}
              style={{ background: opt.bg }}
            >
              <div
                className="absolute inset-0 opacity-80"
                style={{ background: opt.preview }}
              />
              <div className="relative flex items-center justify-center h-full">
                <span className="text-[10px] font-semibold text-white drop-shadow">{opt.label}</span>
              </div>
              {theme === opt.id && mode === 'dark' && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/80" />
              )}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
