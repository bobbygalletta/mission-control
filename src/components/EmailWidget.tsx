import { useState, useEffect } from 'react';

interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
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

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/emails');
      const data = await res.json();
      if (data.emails) {
        setEmails(data.emails);
        setUnread(data.unread || 0);
      }
    } catch (e) { console.error('Failed to fetch emails', e); }
    finally { setLoading(false); }
  };

  const fetchBody = async (id: string) => {
    try {
      const res = await fetch(`/api/emails/thread/${id}`);
      const data = await res.json();
      if (data.body) setBody(data.body);
    } catch (e) { console.error('Failed to fetch body', e); }
  };

  useEffect(() => { fetchEmails(); }, []);
  useEffect(() => {
    const id = setInterval(fetchEmails, 5000);
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
              className="text-xs text-sloat-500 hover:text-slate-300 transition-colors"
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-blue-300 flex-shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${email.unread ? 'font-bold text-slate-200' : 'font-medium text-slate-400'}`}>{name}</p>
                        <p className="text-[10px] text-slate-600 flex-shrink-0 ml-2">{email.date}</p>
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${email.unread ? 'text-slate-300 font-semibold' : 'text-slate-500'}`}>{email.subject}</p>
                    </div>
                  </div>
                </button>
                {isSelected && body && (
                  <div className="px-4 py-3 bg-black/20 border-b border-white/[0.04]">
                    <p className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed">{body}</p>
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
