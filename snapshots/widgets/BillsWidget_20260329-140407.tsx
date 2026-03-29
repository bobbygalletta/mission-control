import { useState, useEffect, useRef } from 'react';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  paid: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseDueDay(dueDate: string): number {
  // dueDate could be "03/15", "Mar 15", "2026-03-15", etc.
  const d = new Date(dueDate);
  if (!isNaN(d.getTime())) return d.getDate();
  const parts = dueDate.match(/\d+/g);
  if (parts) return parseInt(parts[parts.length - 1]);
  return parseInt(dueDate);
}

export function BillsWidget() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newBill, setNewBill] = useState({ name: '', amount: '', dueDate: '', category: '' });
  const hasLoaded = useRef(true);

  useEffect(() => {
    const fetchBills = () => {
      fetch('/api/bills')
        .then(r => r.json())
        .then(data => {
          setBills(data.bills || []);
          if (hasLoaded.current) {
            setLoading(false);
            hasLoaded.current = false;
          }
        })
        .catch(() => {
          if (hasLoaded.current) {
            setLoading(false);
            hasLoaded.current = false;
          }
        });
    };
    fetchBills();
    const interval = setInterval(fetchBills, 15000);
    return () => clearInterval(interval);
  }, []);

  const apiAction = async (action: string, bill: Partial<Bill>) => {
    const res = await fetch('/api/bills/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, bill }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Action failed');
    return data;
  };

  const handleAdd = async () => {
    if (!newBill.name.trim() || !newBill.amount) return;
    const bill: Bill = {
      id: Date.now().toString(),
      name: newBill.name.trim(),
      amount: parseFloat(newBill.amount),
      dueDate: newBill.dueDate || new Date().toISOString().slice(0, 10),
      category: newBill.category || 'general',
      paid: false,
    };
    try {
      await apiAction('add', bill);
      const res = await fetch('/api/bills');
      const data = await res.json();
      setBills(data.bills || []);
      setNewBill({ name: '', amount: '', dueDate: '', category: '' });
      setShowAdd(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to add bill');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiAction('delete', { id });
      const res = await fetch('/api/bills');
      const data = await res.json();
      setBills(data.bills || []);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete bill');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await apiAction('markPaid', { id });
      const res = await fetch('/api/bills');
      const data = await res.json();
      setBills(data.bills || []);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to mark paid');
    }
  };

  const history = bills.filter(b => b.paid);
  const unpaid = bills.filter(b => !b.paid);
  const totalDue = unpaid.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bills Due — March 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showHistory ? 'Hide' : 'History'}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Add Bill Form */}
      {showAdd && (
        <div className="px-5 py-3 border-b border-white/[0.06] space-y-2">
          <input
            type="text"
            value={newBill.name}
            onChange={e => setNewBill(p => ({ ...p, name: e.target.value }))}
            placeholder="Bill name (e.g. Netflix)"
            className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={newBill.amount}
              onChange={e => setNewBill(p => ({ ...p, amount: e.target.value }))}
              placeholder="$0.00"
              className="w-28 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 font-mono"
            />
            <input
              type="date"
              value={newBill.dueDate}
              onChange={e => setNewBill(p => ({ ...p, dueDate: e.target.value }))}
              className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors border border-emerald-500/30"
          >
            Add Bill
          </button>
        </div>
      )}

      {showHistory ? (
        <div className="px-5 py-3 space-y-0 max-h-64 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Paid This Month</p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No paid bills yet</p>
          ) : (
            history.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm text-slate-300 line-through">{b.name}</p>
                  <p className="text-[10px] text-slate-500">Paid</p>
                </div>
                <span className="text-sm font-mono text-slate-500 line-through">${fmt(b.amount)}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Bills List */}
          <div className="px-5 py-3 space-y-0">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded-lg animate-pulse" />)}
              </div>
            ) : unpaid.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No unpaid bills — all caught up! 🎉</p>
            ) : (
              unpaid.map(bill => (
                <div key={bill.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">🗓️</span>
                    <div>
                      <p className="text-sm text-slate-200">{bill.name}</p>
                      <p className="text-[11px] text-slate-500">Mar {parseDueDay(bill.dueDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-medium text-slate-200">${fmt(bill.amount)}</span>
                    {editing ? (
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarkPaid(bill.id)}
                        className="w-5 h-5 rounded-full border border-slate-600 hover:border-emerald-400 flex items-center justify-center transition-colors"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          {unpaid.length > 0 && (
            <div className="px-5 py-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Due</p>
                <p className="text-base font-mono font-semibold text-emerald-400">${fmt(totalDue)}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
