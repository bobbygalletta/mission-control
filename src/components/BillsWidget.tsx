import { useState, useEffect } from 'react';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  paid: boolean;
  paidDate?: string;
}

interface PaidBill {
  name: string;
  amount: number;
  dueDay: number;
  paidDate: string;
}

export function BillsWidget() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [history, setHistory] = useState<PaidBill[]>([]);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load from server (authoritative)
  useEffect(() => {
    fetch('/api/bills')
      .then(r => r.json())
      .then(serverBills => {
        if (serverBills && Array.isArray(serverBills)) {
          setBills(serverBills);
          const paid = serverBills.filter((b: Bill) => b.paid && b.paidDate);
          setHistory(paid as PaidBill[]);
        }
      })
      .catch(() => {});
    const interval = setInterval(() => {
      fetch('/api/bills')
        .then(r => r.json())
        .then(serverBills => {
          if (serverBills && Array.isArray(serverBills)) {
            setBills(serverBills);
            const paid = serverBills.filter((b: Bill) => b.paid && b.paidDate);
            setHistory(paid as PaidBill[]);
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const sync = (newBills: Bill[]) => {
    setBills(newBills);
    const paid = newBills.filter(b => b.paid && b.paidDate);
    setHistory(paid as PaidBill[]);
    fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBills),
    }).catch(() => {});
  };

  const markPaid = (id: string) => {
    sync(bills.map(b =>
      b.id === id ? { ...b, paid: true, paidDate: new Date().toISOString() } : b
    ));
  };

  const deleteBill = (id: string) => {
    // Mark as paid instead of deleting — keeps history
    sync(bills.map(b =>
      b.id === id ? { ...b, paid: true, paidDate: new Date().toISOString() } : b
    ));
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

      {showHistory ? (
        <div className="px-5 py-3 space-y-0 max-h-64 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Paid This Month</p>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No paid bills yet</p>
          ) : (
            history.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm text-slate-300 line-through">{b.name}</p>
                  <p className="text-[10px] text-slate-500">
                    Due Mar {b.dueDay} · Paid {new Date(b.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-sm font-mono text-slate-500 line-through">${fmt(b.amount)}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Bills List — only unpaid */}
          <div className="px-5 py-3 space-y-0">
            {bills.filter(b => !b.paid).map(bill => (
              <div key={bill.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🗓️</span>
                  <div>
                    <p className="text-sm text-slate-200">{bill.name}</p>
                    <p className="text-[11px] text-slate-500">Mar {bill.dueDay}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono font-medium text-slate-200">${fmt(bill.amount)}</span>
                  {editing ? (
                    <button
                      onClick={() => deleteBill(bill.id)}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  ) : (
                    <button
                      onClick={() => markPaid(bill.id)}
                      className="w-5 h-5 rounded-full border border-slate-600 hover:border-emerald-400 flex items-center justify-center transition-colors"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Due</p>
              <p className="text-base font-mono font-semibold text-emerald-400">${fmt(totalDue)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
