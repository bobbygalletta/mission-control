import { Header } from './components/Header';
import { CalendarWidget } from './components/CalendarWidget';
import { WeatherWidget } from './components/WeatherWidget';
import { RemindersWidget } from './components/RemindersWidget';
import { MoneyWidget } from './components/MoneyWidget';
import { BillsWidget } from './components/BillsWidget';
import { FinnlyWidget } from './components/FinnlyWidget';
import { MusicWidget } from './components/MusicWidget';
import { HabitsWidget } from './components/HabitsWidget';
import { Background } from './components/Background';
import { useAgentStatus } from './hooks/useAgentStatus';
import { useEffect } from 'react';

export default function App() {
  const { connectionState } = useAgentStatus(3000);

  // Set body background immediately (before paint) to avoid flash — both modes
  const savedMode = localStorage.getItem('mc_mode') || 'dark';
  const savedTheme = localStorage.getItem('mc_theme') || 'purple';
  const lightHexes: Record<string, string> = { purple: '#ede0ff', ocean: '#add8ff', forest: '#c8ebd2', sunset: '#ffd8b0', rose: '#ffbed7', slate: '#dce1e6' };
  const darkHexes: Record<string, string> = { purple: '#2a1040', ocean: '#0a1e3a', forest: '#0a2018', sunset: '#3a1a08', rose: '#3a1020', slate: '#1a1e24' };

  if (savedMode === 'light') {
    const hex = lightHexes[savedTheme] || '#ede0ff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.body.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.88)`;
    document.body.classList.add('light-mode');
  } else {
    const hex = darkHexes[savedTheme] || '#1a0a2e';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.body.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.88)`;
    document.body.classList.remove('light-mode');
  }

  // Auto-reload when server has new build (hash-based, checks every second)
  useEffect(() => {
    let lastHash = '';
    const check = async () => {
      try {
        const res = await fetch('/api/version');
        const data = await res.json();
        const hash = data.hash || data.version;
        if (lastHash && hash !== lastHash) {
          window.location.reload();
        }
        lastHash = hash;
      } catch {}
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen">
      <Background />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header connectionState={connectionState} />

        <main className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WeatherWidget />
          <CalendarWidget />
          <RemindersWidget />
          <MoneyWidget />
          <BillsWidget />
          <FinnlyWidget />
          <MusicWidget />
          <HabitsWidget />
        </main>

        <footer className="mt-6 flex items-center justify-between px-1">
          <p className="text-[11px] text-slate-500">Auto-updates live</p>
          <p className="text-[11px] text-slate-500">
            Mission Control &middot; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
