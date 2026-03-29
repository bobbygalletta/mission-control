import { useState, useEffect, useRef } from 'react';

interface Track {
  name: string;
  artist: string;
  album: string;
}

async function musicCmd(script: string): Promise<string> {
  try {
    const res = await fetch('/api/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    const data = await res.json();
    return data.result || '';
  } catch {
    return '';
  }
}

export function MusicWidget() {
  const [playing, setPlaying] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [addedToPlaylist, setAddedToPlaylist] = useState(false);
  const [playHistory, setPlayHistory] = useState<Track[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedSongRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [name, artist, state, vol] = await Promise.all([
          musicCmd('tell application "Music" to get name of current track'),
          musicCmd('tell application "Music" to get artist of current track'),
          musicCmd('tell application "Music" to get player state as string'),
          musicCmd('output volume of (get volume settings)'),
        ]);
        const newName = name.trim();
        if (newName) {
          // Reset "added to playlist" when song changes
          if (addedSongRef.current && addedSongRef.current !== newName) {
            setAddedToPlaylist(false);
            addedSongRef.current = null;
          }
          setPlaying({ name: newName, artist: artist.trim() || '', album: '' });
        }
        setIsPlaying(state.trim() === 'playing');
        const v = parseInt(vol);
        if (!isNaN(v)) setVolume(v);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    musicCmd('output volume of (get volume settings)').then(v => {
      const vol = parseInt(v);
      if (!isNaN(vol)) setVolume(vol);
    });
  }, []);

  const playPause = async () => {
    await musicCmd('tell application "Music" to playpause');
    setIsPlaying(!isPlaying);
  };

  const nextTrack = async () => {
    await musicCmd('tell application "Music" to next track');
  };

  const prevTrack = async () => {
    await musicCmd('tell application "Music" to previous track');
  };

  const setVol = async (v: number) => {
    setVolume(v);
    await musicCmd(`set volume output volume ${v}`);
  };

  const search = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    try {
      const escaped = query.replace(/"/g, '\\"');
      const result = await musicCmd(
        `tell application "Music"
          set sr to search library playlist 1 for "${escaped}"
          set txt to ""
          repeat with i from 1 to (count of sr)
            if i > 8 then exit repeat
            set tr to item i of sr
            set trName to name of tr
            set trArtist to artist of tr
            set txt to txt & trName & " | " & trArtist & linefeed
          end repeat
          return txt
        end tell`
      );
      const lines = result.trim().split('\n').filter(Boolean);
      const tracks: Track[] = lines.map(line => {
        const [name, ...artistParts] = line.split('|');
        return { name: name.trim(), artist: artistParts.join('|').trim() || '', album: '' };
      }).filter(t => t.name);
      setSearchResults(tracks.slice(0, 8));
      setShowResults(true);
    } catch {}
  };

  const playTrack = async (name: string) => {
    setShowResults(false);
    setSearchQuery('');
    try {
      const escaped = name.replace(/"/g, '\\"');
      const artist = await musicCmd(
        `tell application "Music"
          set sr to search library playlist 1 for "${escaped}"
          if (count of sr) > 0 then
            play item 1 of sr
            return artist of item 1 of sr
          end if
          return ""
        end tell`
      );
      const newTrack: Track = { name, artist: artist.trim() || '', album: '' };
      setPlayHistory(prev => {
        const filtered = prev.filter(t => t.name !== name);
        return [newTrack, ...filtered].slice(0, 20);
      });
    } catch {}
  };

  const addToPlaylist = async () => {
    if (!playing) return;
    try {
      await musicCmd(`tell application "Music" to duplicate current track to playlist "MY PLAYLIST"`);
      setAddedToPlaylist(true);
      addedSongRef.current = playing.name;
    } catch {}
  };

  return (
    <>
      <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎵</span>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Music</p>
          </div>
          <div className="flex items-center gap-3">
            {isPlaying && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400">Playing</span>
              </div>
            )}
            <button onClick={() => setShowHistory(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              History{playHistory.length > 0 ? ` (${playHistory.length})` : ''}
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Now Playing</p>
          {playing ? (
            <div>
              <p className="text-base font-semibold text-slate-100 truncate">{playing.name}</p>
              <p className="text-sm text-slate-400 truncate">{playing.artist}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No track playing</p>
          )}
        </div>

        <div className="px-5 py-3 border-b border-white/[0.06]">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Search & Play</p>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (searchTimeout.current) clearTimeout(searchTimeout.current);
                searchTimeout.current = setTimeout(() => search(e.target.value), 500);
              }}
              onKeyDown={e => { if (e.key === 'Enter' && searchResults.length > 0) playTrack(searchResults[0].name); }}
              placeholder="Search songs..."
              className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900/95 backdrop-blur-xl border border-white/[0.10] rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
                {searchResults.map((t, i) => (
                  <button key={i} onClick={() => playTrack(t.name)} className="w-full text-left px-4 py-2.5 hover:bg-white/[0.06] border-b border-white/[0.04] last:border-0 transition-colors">
                    <p className="text-sm text-slate-100 truncate">{t.name}</p>
                    <p className="text-xs text-slate-500 truncate">{t.artist}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={prevTrack} className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center text-slate-300 hover:text-slate-100 text-lg transition-colors">⏮</button>
            <button onClick={playPause} className="w-14 h-14 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl transition-colors shadow-lg shadow-emerald-500/20"> {isPlaying ? '⏸' : '▶'} </button>
            <button onClick={nextTrack} className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.10] flex items-center justify-center text-slate-300 hover:text-slate-100 text-lg transition-colors">⏭</button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-slate-500 text-xs w-4">🔈</span>
            <input type="range" min="0" max="100" value={volume} onChange={e => setVol(parseInt(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-400" style={{ accentColor: '#34d399' }} />
            <span className="text-slate-500 text-xs w-4">🔊</span>
            <span className="text-[10px] text-slate-500 w-6 text-right">{volume}</span>
          </div>

          <button onClick={addToPlaylist} disabled={!playing || addedToPlaylist} className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-colors ${addedToPlaylist ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : playing ? 'bg-white/[0.06] hover:bg-white/[0.10] border-white/[0.10] text-slate-300' : 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed'}`}>
            {addedToPlaylist ? '✓ Added to MY PLAYLIST' : '+ Add to MY PLAYLIST'}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.15] overflow-hidden">
            <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="flex items-center gap-4 px-5 pb-4">
              <span className="text-4xl">🎵</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Play History</h3>
                <p className="text-sm text-slate-400">{playHistory.length} songs</p>
              </div>
            </div>
            <div className="px-5 pb-6 max-h-80 overflow-y-auto space-y-1">
              {playHistory.map((t, i) => (
                <button key={i} onClick={() => { playTrack(t.name); setShowHistory(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/[0.06] border border-white/[0.04] transition-colors">
                  <p className="text-sm font-medium text-slate-100 truncate">{t.name}</p>
                  <p className="text-xs text-slate-500 truncate">{t.artist}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
