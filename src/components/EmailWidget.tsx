import { useState, useEffect } from 'react';

interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  labels: string[];
  unread: boolean;
}

function formatFrom(from: string): { name: string; email: string } {
  const match = from.match(/(.+?)\s*<(.+?)>/);
  if (match) return { name: match[1].replace(/^[""]|[""]$/g, '').trim(), email: match[2] };
  return { name: from, email: '' };
}

export function EmailWidget() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [selected, setSelected] = useState<Email | null>(null);
  const [body, setBody] = useState('');
  const [showAll, setShowAll] = useState(false);

  const GATEWAY = 'http://127.0.0.1:18789';

  const fetchEmails = async () => {
    try {
      const res = await fetch(`${GATEWAY}/tools/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'exec',
          args: { command: 'gog gmail search "in:inbox" -j', timeout: 15000 }
        })
      });
      const data = await res.json();
      // Parse gog output — might be wrapped in exec result or raw JSON
      let text = '';
      if (data.text) text = data.text;
      else if (typeof data === 'string') text = data;
      else text = JSON.stringify(data);

      // Extract JSON from output
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const threads = JSON.parse(jsonMatch[0]);
        setEmails(threads.map((t: Record<string, unknown>) => ({
          id: t.id,
          from: String(t.from || ''),
          subject: String(t.subject || ''),
          date: String(t.date || ''),
          snippet: String(t.snippet || ''),
          labels: (t.labels as string[]) || [],
          unread: (t.labels as string[])?.includes('UNREAD') || false,
        })));
        setUnread(threads.filter((t: Record<string, unknown>) => (t.labels as string[])?.includes('UNREAD')).length);
      }
    } catch (e) { console.error('Failed to fetch emails', e); }
    finally { setLoading(false); }
  };

  const fetchBody = async (id: string) => {
    try {
      const res = await fetch(`${GATEWAY}/tools/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'exec',
          args: { command: `gog gmail thread "${id}"`, timeout: 15000 }
        })
      });
      const data = await res.json();
      let text = '';
      if (data.text) text = data.text;
      else if (typeof data === 'string') text = data;
      else text = JSON.stringify(data);
      // Strip email headers
      const body = text
        .replace(/^(From|To|Subject|Date|To|Cc|Bcc):.*$/gm, '')
        .replace(/^\s*[-=]{3,}.*$/gm, '')
        .replace(/\bhttps?:\/\/[^\s]+/g, '')
        .replace(/^\s+/gm, '')
        .trim();
      setBody(body);
    } catch (e) { console.error('Failed to fetch body', e); }
  };

  useEffect(() => { fetchEmails(); }, []);
  useEffect(() => {
    const id = setInterval(fetchEmails, 2000);
    return () => clearInterval(id);
  }, []);

  const handleSelect = (email: Email) => {
    if (selected?.id === email.id) { setSelected(null); setBody(''); return; }
    setSelected(email);
    fetchBody(email.id);
  };

  const displayed = showAll ? emails : emails.slice(0, 8);

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <span className="text-lg">📧</span>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Inbox</p>
        {unread > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">{unread} new</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {emails.length > 8 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showAll ? 'Show less' : `+${emails.length - 8} more`}
            </button>
          )}
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        </div>
      </div>

      {/* Email list */}
      {loading ? (
        <div className="p-4 space-y-2">
          {[100, 75, 90, 60].map((w, i) => (
            <div key={i} className="h-12 bg-white/[0.05] rounded-lg animate-pulse" style={{ width: w + '%' }} />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-500">No emails in inbox</p>
        </div>
      ) : (
        <div>
          {displayed.map(email => {
            const { name } = formatFrom(email.from);
            const isSelected = selected?.id === email.id;
            return (
              <div key={email.id}>
                <button
                  onClick={() => handleSelect(email)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${isSelected ? 'bg-white/[0.04]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${email.unread ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400'}`}>
                      {name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${email.unread ? 'font-semibold text-slate-200' : 'font-normal text-slate-400'}`}>{name}</p>
                        <span className="text-[10px] text-slate-600 shrink-0">{email.date}</span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${email.unread ? 'text-slate-300' : 'text-slate-500'}`}>{email.subject || '(No subject)'}</p>
                      <p className="text-[10px] text-slate-600 truncate mt-0.5">{email.snippet}</p>
                    </div>
                    {email.unread && <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />}
                  </div>
                </button>

                {/* Expanded body */}
                {isSelected && (
                  <div className="px-4 pb-4 bg-white/[0.02]">
                    <div className="border-t border-white/[0.05] pt-3">
                      <p className="text-sm font-semibold text-slate-200 mb-1">{email.subject}</p>
                      <p className="text-[10px] text-slate-500 mb-3">{email.from} · {email.date}</p>
                      <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{body || email.snippet}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
