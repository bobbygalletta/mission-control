import type { ConnectionState } from '../types';
import { useEffect, useState, useRef } from 'react';

interface HeaderProps {
  connectionState: ConnectionState;
}

function useLiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const CONNECTION_CONFIG = {
  connected: {
    dotClass: 'bg-status-online shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    label: 'Connected',
  },
  polling: {
    dotClass: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]',
    label: 'Polling...',
  },
  disconnected: {
    dotClass: 'bg-status-error shadow-[0_0_8px_rgba(248,113,113,0.8)]',
    label: 'Disconnected',
  },
};

type ThemeId = 'purple' | 'ocean' | 'forest' | 'sunset' | 'rose' | 'slate' | 'midnight' | 'lavender' | 'teal' | 'gold' | 'crimson' | 'mint';
type ModeId = 'dark' | 'light';

interface ThemeDef {
  id: ThemeId;
  label: string;
  dark: { bgTop: string; bgBottom: string; orbs: string[]; panelHex: string };
  light: { bgTop: string; bgBottom: string; orbs: string[]; panelRgb: string; panelHex: string };
}

// Helper: convert hex to rgba string with alpha
function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const THEMES: ThemeDef[] = [
  {
    id: 'purple', label: 'Purple',
    dark: { panelHex: '#2a1040', bgTop: '#0a1a1f', bgBottom: '#1a0a2e', orbs: ['rgba(88,28,135,0.55)','rgba(30,30,100,0.6)','rgba(10,60,60,0.55)','rgba(109,40,217,0.45)','rgba(88,28,135,0.4)','rgba(55,65,160,0.5)'] },
    light: { bgTop: '#f0e8ff', bgBottom: '#e8d0ff', orbs: ['rgba(139,92,246,0.35)','rgba(99,102,241,0.3)','rgba(167,139,250,0.35)','rgba(124,58,237,0.3)','rgba(139,92,246,0.25)','rgba(79,70,229,0.3)'], panelRgb: '240, 232, 255', panelHex: '#ede0ff' },
  },
  {
    id: 'ocean', label: 'Ocean',
    dark: { panelHex: '#0a1e3a', bgTop: '#050f1a', bgBottom: '#0a1a2e', orbs: ['rgba(28,60,120,0.6)','rgba(10,40,80,0.5)','rgba(15,80,100,0.5)','rgba(40,100,180,0.45)','rgba(20,60,100,0.4)','rgba(60,120,180,0.4)'] },
    light: { bgTop: '#d0e8ff', bgBottom: '#b0d8ff', orbs: ['rgba(59,130,246,0.35)','rgba(14,165,233,0.3)','rgba(56,189,248,0.3)','rgba(37,99,235,0.3)','rgba(6,182,212,0.25)','rgba(2,132,199,0.3)'], panelRgb: '173, 216, 255', panelHex: '#add8ff' },
  },
  {
    id: 'forest', label: 'Forest',
    dark: { panelHex: '#0a2018', bgTop: '#040f0a', bgBottom: '#0a1a0e', orbs: ['rgba(20,60,30,0.6)','rgba(10,50,40,0.5)','rgba(30,80,50,0.5)','rgba(40,100,60,0.45)','rgba(20,70,40,0.4)','rgba(50,120,70,0.4)'] },
    light: { bgTop: '#d0f0d8', bgBottom: '#b0e0c8', orbs: ['rgba(34,197,94,0.35)','rgba(22,163,74,0.3)','rgba(74,222,128,0.3)','rgba(16,185,129,0.3)','rgba(5,150,105,0.25)','rgba(20,184,166,0.3)'], panelRgb: '200, 235, 210', panelHex: '#c8ebd2' },
  },
  {
    id: 'sunset', label: 'Sunset',
    dark: { panelHex: '#3a1a08', bgTop: '#1a0a05', bgBottom: '#2e1a0a', orbs: ['rgba(135,50,20,0.6)','rgba(100,30,15,0.5)','rgba(80,40,10,0.5)','rgba(180,80,30,0.45)','rgba(150,60,20,0.4)','rgba(200,100,50,0.4)'] },
    light: { bgTop: '#fff0d8', bgBottom: '#ffe0c0', orbs: ['rgba(249,115,22,0.35)','rgba(234,88,12,0.3)','rgba(251,191,36,0.35)','rgba(245,158,11,0.3)','rgba(217,119,6,0.25)','rgba(202,138,4,0.3)'], panelRgb: '255, 220, 180', panelHex: '#ffd8b0' },
  },
  {
    id: 'rose', label: 'Rose',
    dark: { panelHex: '#3a1020', bgTop: '#1a050f', bgBottom: '#2e0a1a', orbs: ['rgba(120,30,60,0.6)','rgba(80,20,50,0.5)','rgba(60,20,40,0.5)','rgba(160,50,80,0.45)','rgba(130,40,70,0.4)','rgba(180,70,100,0.4)'] },
    light: { bgTop: '#ffe0ec', bgBottom: '#ffd0e0', orbs: ['rgba(236,72,153,0.35)','rgba(219,39,119,0.3)','rgba(244,114,182,0.3)','rgba(190,24,93,0.3)','rgba(157,11,30,0.25)','rgba(225,29,72,0.3)'], panelRgb: '255, 190, 215', panelHex: '#ffbed7' },
  },
  {
    id: 'slate', label: 'Slate',
    dark: { panelHex: '#1a1e24', bgTop: '#0a0f12', bgBottom: '#141a1e', orbs: ['rgba(50,60,70,0.5)','rgba(30,40,50,0.5)','rgba(60,70,80,0.5)','rgba(80,90,100,0.4)','rgba(50,60,70,0.4)','rgba(100,110,120,0.4)'] },
    light: { bgTop: '#e8eaec', bgBottom: '#d8dce0', orbs: ['rgba(100,116,139,0.35)','rgba(71,85,105,0.3)','rgba(148,163,184,0.35)','rgba(100,116,139,0.3)','rgba(71,85,105,0.25)','rgba(30,41,59,0.3)'], panelRgb: '220, 225, 230', panelHex: '#dce1e6' },
  },
  {
    id: 'midnight', label: 'Midnight',
    dark: { panelHex: '#0a0a2e', bgTop: '#030310', bgBottom: '#080820', orbs: ['rgba(30,30,120,0.5)','rgba(20,20,80,0.5)','rgba(40,40,140,0.5)','rgba(60,60,160,0.45)','rgba(50,50,130,0.4)','rgba(70,70,170,0.4)'] },
    light: { bgTop: '#d8e0ff', bgBottom: '#c0d0ff', orbs: ['rgba(99,130,246,0.35)','rgba(79,110,220,0.3)','rgba(119,150,255,0.3)','rgba(129,158,255,0.3)','rgba(89,120,230,0.25)','rgba(109,140,245,0.3)'], panelRgb: '216, 224, 255', panelHex: '#d8e0ff' },
  },
  {
    id: 'lavender', label: 'Lavender',
    dark: { panelHex: '#1a0f2a', bgTop: '#080510', bgBottom: '#100820', orbs: ['rgba(120,60,180,0.5)','rgba(90,50,150,0.5)','rgba(140,80,200,0.5)','rgba(160,100,220,0.45)','rgba(130,70,170,0.4)','rgba(180,120,230,0.4)'] },
    light: { bgTop: '#f3e8ff', bgBottom: '#ecd8ff', orbs: ['rgba(167,139,250,0.35)','rgba(139,92,246,0.3)','rgba(196,167,255,0.35)','rgba(181,125,235,0.3)','rgba(153,89,219,0.25)','rgba(204,153,255,0.3)'], panelRgb: '243, 232, 255', panelHex: '#f3e8ff' },
  },
  {
    id: 'teal', label: 'Teal',
    dark: { panelHex: '#082020', bgTop: '#020f0f', bgBottom: '#051818', orbs: ['rgba(20,100,100,0.55)','rgba(10,70,80,0.5)','rgba(30,120,115,0.5)','rgba(40,140,130,0.45)','rgba(25,110,105,0.4)','rgba(50,150,140,0.4)'] },
    light: { bgTop: '#d0f0f0', bgBottom: '#b0e8e8', orbs: ['rgba(45,200,200,0.35)','rgba(20,180,180,0.3)','rgba(65,210,205,0.35)','rgba(0,180,175,0.3)','rgba(15,165,160,0.25)','rgba(50,195,190,0.3)'], panelRgb: '208, 240, 240', panelHex: '#d0f0f0' },
  },
  {
    id: 'gold', label: 'Gold',
    dark: { panelHex: '#2a1e05', bgTop: '#100a02', bgBottom: '#1e1508', orbs: ['rgba(160,120,20,0.55)','rgba(120,90,10,0.5)','rgba(140,100,30,0.5)','rgba(180,140,40,0.45)','rgba(200,160,60,0.4)','rgba(220,180,80,0.4)'] },
    light: { bgTop: '#fff8d8', bgBottom: '#fff0c0', orbs: ['rgba(250,200,30,0.35)','rgba(230,180,10,0.3)','rgba(255,210,60,0.35)','rgba(245,190,20,0.3)','rgba(220,170,0,0.25)','rgba(255,215,50,0.3)'], panelRgb: '255, 248, 216', panelHex: '#fff8d8' },
  },
  {
    id: 'crimson', label: 'Crimson',
    dark: { panelHex: '#2a0808', bgTop: '#0f0303', bgBottom: '#1e0606', orbs: ['rgba(140,30,30,0.55)','rgba(100,20,20,0.5)','rgba(120,40,40,0.5)','rgba(160,50,50,0.45)','rgba(180,60,60,0.4)','rgba(200,80,80,0.4)'] },
    light: { bgTop: '#ffe8e8', bgBottom: '#ffd8d8', orbs: ['rgba(240,80,80,0.35)','rgba(220,60,60,0.3)','rgba(255,110,110,0.35)','rgba(230,70,70,0.3)','rgba(200,50,50,0.25)','rgba(245,100,100,0.3)'], panelRgb: '255, 232, 232', panelHex: '#ffe8e8' },
  },
  {
    id: 'mint', label: 'Mint',
    dark: { panelHex: '#041a10', bgTop: '#020a05', bgBottom: '#051510', orbs: ['rgba(30,100,60,0.55)','rgba(20,80,50,0.5)','rgba(40,110,70,0.5)','rgba(50,130,80,0.45)','rgba(35,120,65,0.4)','rgba(60,140,90,0.4)'] },
    light: { bgTop: '#d8f8e8', bgBottom: '#c0f0d8', orbs: ['rgba(60,200,130,0.35)','rgba(40,180,110,0.3)','rgba(80,210,150,0.35)','rgba(50,190,120,0.3)','rgba(30,160,100,0.25)','rgba(70,200,140,0.3)'], panelRgb: '216, 248, 232', panelHex: '#d8f8e8' },
  },
];

export const Header = ({ connectionState }: HeaderProps) => {
  const time = useLiveClock();
  const config = CONNECTION_CONFIG[connectionState];
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('mc_theme') as ThemeId;
    return saved || 'purple';
  });
  const [mode, setMode] = useState<ModeId>(() => {
    const saved = localStorage.getItem('mc_mode') as ModeId;
    return saved || 'dark';
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const h12 = time.getHours() % 12 || 12;
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM';
  const timeStr = `${pad(h12)}:${pad(time.getMinutes())} ${ampm}`;

  // Apply saved theme/mode on mount
  useEffect(() => {
    const t = THEMES.find(x => x.id === theme)!;
    const m = mode === 'light' ? t.light : t.dark;
    document.documentElement.style.setProperty('--bg-top', m.bgTop);
    document.documentElement.style.setProperty('--bg-bottom', m.bgBottom);
    m.orbs.forEach((c, i) => document.documentElement.style.setProperty(`--orb-${i + 1}`, c));
    if (mode === 'light' && t.light.panelHex) {
      const c = rgba(t.light.panelHex, 0.88);
      document.documentElement.style.setProperty('--panel-bg', c);
      document.body.style.backgroundColor = c;
    } else {
      document.documentElement.style.setProperty('--panel-bg', rgba(t.dark.panelHex, 0.88));
      document.body.style.backgroundColor = rgba(t.dark.panelHex, 0.88);
    }
    document.documentElement.classList.toggle('light-mode', mode === 'light');
    document.body.classList.toggle('light-mode', mode === 'light');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const applyTheme = (id: ThemeId) => {
    setTheme(id);
    localStorage.setItem('mc_theme', id);
    const t = THEMES.find(x => x.id === id)!;
    const m = mode === 'light' ? t.light : t.dark;
    document.documentElement.style.setProperty('--bg-top', m.bgTop);
    document.documentElement.style.setProperty('--bg-bottom', m.bgBottom);
    m.orbs.forEach((c, i) => document.documentElement.style.setProperty(`--orb-${i + 1}`, c));
    if (mode === 'light' && t.light.panelHex) {
      const c = rgba(t.light.panelHex, 0.88);
      document.documentElement.style.setProperty('--panel-bg', c);
      document.body.style.backgroundColor = c;
    } else {
      document.documentElement.style.setProperty('--panel-bg', rgba(t.dark.panelHex, 0.88));
      document.body.style.backgroundColor = rgba(t.dark.panelHex, 0.88);
    }
    document.documentElement.classList.toggle('light-mode', mode === 'light');
    document.body.classList.toggle('light-mode', mode === 'light');
  };

  const applyMode = (id: ModeId) => {
    setMode(id);
    localStorage.setItem('mc_mode', id);
    const t = THEMES.find(x => x.id === theme)!;
    const m = id === 'light' ? t.light : t.dark;
    document.documentElement.style.setProperty('--bg-top', m.bgTop);
    document.documentElement.style.setProperty('--bg-bottom', m.bgBottom);
    m.orbs.forEach((c, i) => document.documentElement.style.setProperty(`--orb-${i + 1}`, c));
    if (id === 'light' && t.light.panelHex) {
      const c = rgba(t.light.panelHex, 0.88);
      document.documentElement.style.setProperty('--panel-bg', c);
      document.body.style.backgroundColor = c;
    } else {
      document.documentElement.style.setProperty('--panel-bg', rgba(t.dark.panelHex, 0.88));
      document.body.style.backgroundColor = rgba(t.dark.panelHex, 0.88);
    }
    document.documentElement.classList.toggle('light-mode', id === 'light');
    document.body.classList.toggle('light-mode', id === 'light');
  };

  return (
    <header className="relative flex items-center justify-between px-2 pb-6">
      <div className="flex items-center gap-3">
        <h1
          className="text-2xl font-bold text-slate-100 tracking-tight cursor-pointer hover:text-violet-300 transition-colors"
          onClick={() => (window.location as any).reload(true)}
        >
          Mission Control
        </h1>
        <div className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`} />
        <span className="text-xs text-slate-500 hidden sm:inline">{config.label}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Settings dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowSettings(v => !v)}
            className={`text-xl transition-colors ${showSettings ? 'text-slate-200' : 'text-slate-500 hover:text-slate-200'}`}
            title="Display Settings"
          >
            ⚙️
          </button>

          {showSettings && (() => {
            const t = THEMES.find(x => x.id === theme)!;
            const m = mode === 'light' ? t.light : t.dark;
            const hex = m.panelHex || m.bgTop;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return (
            <div
              className="absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl overflow-hidden z-50"
              style={{
                backgroundColor: `rgba(${r}, ${g}, ${b}, 1)`,
                borderColor: mode === 'light' ? 'rgba(30,50,90,0.22)' : 'rgba(180,210,255,0.12)',
              }}
            >
              {/* Mode */}
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Mode</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => applyMode('dark')}
                    style={mode === 'dark' ? {
                      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.30)`,
                      boxShadow: `0 0 0 2px rgba(${Math.min(r+120,255)}, ${Math.min(g+120,255)}, ${Math.min(b+120,255)}, 0.90), 0 0 16px rgba(${r}, ${g}, ${b}, 0.4)`,
                      color: '#ffffff',
                    } : {}}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                      mode === 'dark' ? 'border-transparent' : 'border-transparent text-slate-500'
                    }`}
                  >
                    🌙 Dark
                  </button>
                  <button
                    onClick={() => applyMode('light')}
                    style={mode === 'light' ? {
                      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.92)`,
                      boxShadow: `0 0 0 2px rgba(${Math.max(r-50,0)}, ${Math.max(g-50,0)}, ${Math.max(b-50,0)}, 0.7), 0 0 12px rgba(${r}, ${g}, ${b}, 0.2)`,
                      color: '#1e293b',
                    } : {}}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                      mode === 'light' ? 'border-transparent' : 'border-transparent text-slate-500'
                    }`}
                  >
                    ☀️ Light
                  </button>
                </div>
              </div>

              {/* Color themes */}
              <div className="px-4 pb-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Color Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map(t => {
                    const isSelected = theme === t.id;
                    const colors = mode === 'light' ? t.light : t.dark;
                    const textColor = mode === 'light' ? '#1e293b' : '#ffffff';
                    return (
                      <button
                        key={t.id}
                        onClick={() => applyTheme(t.id)}
                        className={`relative rounded-xl overflow-hidden aspect-video transition-all ${
                          isSelected
                            ? 'ring-2 ring-white/60 scale-[1.03]'
                            : 'hover:scale-[1.03]'
                        }`}
                        style={{ background: `linear-gradient(135deg, ${colors.bgTop} 0%, ${colors.bgBottom} 100%)` }}
                      >
                        <div
                          className="absolute inset-0 opacity-60"
                          style={{ background: `radial-gradient(circle, ${colors.orbs[0]} 0%, transparent 70%)` }}
                        />
                        <div className="relative flex items-center justify-center h-full">
                          <span className="text-[9px] font-semibold drop-shadow" style={{ color: textColor }}>{t.label}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 pb-4" />
            </div>
            );
          })()}
        </div>

        <time
          dateTime={time.toISOString()}
          className="font-mono text-xl font-medium text-slate-300 tabular-nums"
        >
          {timeStr}
        </time>
      </div>
    </header>
  );
};
