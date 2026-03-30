import { useState, useEffect, useRef } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';

interface ReminderItem {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: string;
  priority: string;
}

interface ReminderList {
  list: string;
  items: ReminderItem[];
}

type ListType = 'reminders' | 'grocery';

// Isolated scroll container — receives items as props, won't re-render parent state changes
function ScrollList({ items, listType, loading, onAdd, onComplete, onDelete, onEdit }: {
  items: ReminderItem[];
  listType: ListType;
  loading: boolean;
  onAdd: (title: string) => void;
  onComplete: (item: ReminderItem) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}) {
  const [addTitle, setAddTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const icon = listType === 'reminders' ? '📋' : '🛒';
  const label = listType === 'reminders' ? 'Reminders' : 'Grocery';

  const handleAdd = () => {
    if (!addTitle.trim()) return;
    onAdd(addTitle.trim());
    setAddTitle('');
    setShowAdd(false);
  };

  const handleEditStart = (item: ReminderItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleEditSave = () => {
    if (editingId && editTitle.trim()) {
      onEdit(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
  };

  return (
    <div className={listType === 'reminders' ? 'px-5 py-4 border-b border-white/[0.06]' : 'px-5 py-4'}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="ml-auto w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-emerald-400 hover:bg-white/[0.06] transition-colors text-lg leading-none"
          title={`Add ${label}`}
        >
          +
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="flex gap-1.5 mb-3">
          <input
            type="text"
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setShowAdd(false); setAddTitle(''); }
            }}
            placeholder={`Add ${label.slice(0, -1)}…`}
            className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors shrink-0"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAdd(false); setAddTitle(''); }}
            className="px-2 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] text-sm transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-7 bg-white/[0.04] rounded-lg animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-3">No items — click + to add</p>
      ) : (
        <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin" ref={scrollRef}>
          {items.map((item) => (
            <div key={item.id} className="group flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-white/[0.03]">
              <button
                onClick={() => onComplete(item)}
                className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0 flex items-center justify-center hover:border-emerald-500/60 transition-colors"
                title="Mark done"
              >
                {item.isCompleted && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>

              {editingId === item.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleEditSave}
                  className="flex-1 min-w-0 bg-white/[0.08] border border-emerald-500/40 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="flex-1 min-w-0 text-sm text-slate-300 leading-snug truncate cursor-pointer"
                  onClick={() => handleEditStart(item)}
                  title={item.title}
                >
                  {item.title}
                </span>
              )}

              {editingId !== item.id && (
                <button
                  onClick={() => handleEditStart(item)}
                  className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                  title="Edit"
                >
                  ✎
                </button>
              )}

              <button
                onClick={() => onDelete(item.id)}
                className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RemindersWidget() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [grocery, setGrocery] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const firstFetch = useRef(true);
  const pendingAction = useRef(false); // pause polling during save operations

  const fetchList = async (list: ListType): Promise<ReminderItem[]> => {
    const res = await fetch(list === 'grocery' ? `${API_BASE}/api/reminders/grocery` : `${API_BASE}/api/reminders`);
    const data: ReminderList = await res.json();
    return data.items || [];
  };

  const fetchAll = async () => {
    try {
      const [rem, gro] = await Promise.all([fetchList('reminders'), fetchList('grocery')]);
      setReminders(rem.filter((r: ReminderItem) => !r.isCompleted));
      setGrocery(gro.filter((r: ReminderItem) => !r.isCompleted));
      if (firstFetch.current) {
        setLoading(false);
        firstFetch.current = false;
      }
    } catch (e: unknown) {
      console.error('Failed to load reminders', e);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      if (!pendingAction.current) fetchAll();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const apiAction = async (action: string, list: ListType, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`${API_BASE}/api/reminders/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, list, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Action failed');
    return data;
  };

  const handleAdd = (list: ListType) => (title: string) => {
    pendingAction.current = true;
    apiAction('add', list, { title }).then(() => fetchAll()).catch((e: unknown) => alert(e instanceof Error ? e.message : 'Failed to add')).finally(() => { pendingAction.current = false; });
  };

  const handleComplete = (list: ListType) => (item: ReminderItem) => {
    pendingAction.current = true;
    // Optimistically update local state immediately
    const update = (list === 'reminders' ? setReminders : setGrocery) as (fn: (prev: ReminderItem[]) => ReminderItem[]) => void;
    update(prev => prev.filter(i => i.id !== item.id));
    apiAction('complete', list, { id: item.id }).catch((e: unknown) => {
      alert(e instanceof Error ? e.message : 'Failed to complete');
      fetchAll();
    }).finally(() => { pendingAction.current = false; });
  };

  const handleDelete = (list: ListType) => (id: string) => {
    pendingAction.current = true;
    // Optimistically update local state immediately
    const update = (list === 'reminders' ? setReminders : setGrocery) as (fn: (prev: ReminderItem[]) => ReminderItem[]) => void;
    update(prev => prev.filter(i => i.id !== id));
    apiAction('delete', list, { id }).catch((e: unknown) => {
      alert(e instanceof Error ? e.message : 'Failed to delete');
      fetchAll();
    }).finally(() => { pendingAction.current = false; });
  };

  const handleEdit = (list: ListType) => (id: string, title: string) => {
    pendingAction.current = true;
    // Optimistically update local state immediately
    const update = (list === 'reminders' ? setReminders : setGrocery) as (fn: (prev: ReminderItem[]) => ReminderItem[]) => void;
    update(prev => prev.map(i => i.id === id ? { ...i, title } : i));
    apiAction('edit', list, { id, title }).catch((e: unknown) => {
      alert(e instanceof Error ? e.message : 'Failed to edit');
      fetchAll();
    }).finally(() => { pendingAction.current = false; });
  };

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      <ScrollList
        items={reminders}
        listType="reminders"
        loading={loading}
        onAdd={handleAdd('reminders')}
        onComplete={handleComplete('reminders')}
        onDelete={handleDelete('reminders')}
        onEdit={handleEdit('reminders')}
      />
      <ScrollList
        items={grocery}
        listType="grocery"
        loading={loading}
        onAdd={handleAdd('grocery')}
        onComplete={handleComplete('grocery')}
        onDelete={handleDelete('grocery')}
        onEdit={handleEdit('grocery')}
      />
    </div>
  );
}
