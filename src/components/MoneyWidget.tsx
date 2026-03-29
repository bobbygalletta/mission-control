import { useState, useEffect, useRef } from 'react';

type Account = 'bobby' | 'logan' | 'dash';
type MoneyType = 'income' | 'expense';

interface MoneyEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: MoneyType;
}

interface Balances {
  bobby: number;
  logan: number;
  dash: number;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACC_COLORS: Record<Account, { bg: string; border: string; text: string; label: string }> = {
  bobby:  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Bobby' },
  logan:  { bg: 'bg-blue-500/20',   border: 'border-blue-500/30',   text: 'text-blue-400',   label: 'Logan' },
  dash:   { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400',  label: 'Dash' },
};

export function MoneyWidget() {
  const [account, setAccount] = useState<Account>('bobby');
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [balances, setBalances] = useState<Balances>({ bobby: 0, logan: 0, dash: 0 });
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(true);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTotals, setShowTotals] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/money').then(r => r.json()),
      fetch('/api/money/balances').then(r => r.json()).catch(() => ({ bobby: 0, logan: 0, dash: 0 }))
    ]).then(([moneyData, balancesData]) => {
      setEntries(moneyData.money || []);
      setBalances(balancesData);
      if (hasLoaded.current) {
        setLoading(false);
        hasLoaded.current = false;
      }
    }).catch(() => {
      if (hasLoaded.current) {
        setLoading(false);
        hasLoaded.current = false;
      }
    });
  }, []);

  const currentEntries = entries.filter(e => {
    // Show entries for selected account (tagged in description) or untagged
    // Since the API doesn't have account field, we'll show all and let user filter
    return true;
  });

  // Use saved balance for selected account
  const balance = balances[account];
  const colors = ACC_COLORS[account];

  const saveBalance = async (newBalances: Balances) => {
    try {
      const res = await fetch('/api/money/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBalances),
      });
      if (!res.ok) throw new Error('Failed to save');
      setBalances(newBalances);
    } catch (e) {
      console.error('Failed to save balance', e);
    }
  };

  const startEditBalance = () => {
    setEditValue(balance.toFixed(2));
    setEditingBalance(true);
  };

  const saveEditBalance = () => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) return;
    const newBalances = { ...balances, [account]: newValue };
    saveBalance(newBalances);
    setEditingBalance(false);
  };

  const handleAdd = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !description.trim()) return;

    const item: MoneyEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      description: description.trim(),
      amount: isIncome ? numAmount : -numAmount,
      type: isIncome ? 'income' : 'expense',
    };

    try {
      const res = await fetch('/api/money/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', item }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      setEntries(data.money || [item, ...entries]);

      // Auto-update and save the account balance
      const newBalances = { ...balances, [account]: balances[account] + item.amount };
      const saveRes = await fetch('/api/money/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBalances),
      });
      if (saveRes.ok) setBalances(newBalances);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to add entry');
    }

    setAmount('');
    setDescription('');
  };

  const handleDelete = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    try {
      const res = await fetch('/api/money/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', item: { id } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setEntries(data.money || entries.filter(e => e.id !== id));

      // Auto-update and save the account balance (reverse the deleted amount)
      if (entry) {
        const newBalances = { ...balances, [account]: balances[account] - entry.amount };
        const saveRes = await fetch('/api/money/balances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBalances),
        });
        if (saveRes.ok) setBalances(newBalances);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete entry');
    }
  };

  return (
    <>
      <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
          <span className="text-xl">💰</span>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Money Tracker</p>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowTotals(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.10] text-slate-300 border border-white/[0.10] transition-colors"
            >
              Totals
            </button>
            {!loading && entries.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.10] text-emerald-400 border border-emerald-500/20 transition-colors"
              >
                History ({entries.length})
              </button>
            )}
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        </div>

        {/* Account Toggle */}
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="flex gap-2">
            {(['bobby', 'logan', 'dash'] as Account[]).map(a => (
              <button
                key={a}
                onClick={() => setAccount(a)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  account === a
                    ? `${ACC_COLORS[a].bg} ${ACC_COLORS[a].text} ${ACC_COLORS[a].border} border`
                    : 'text-slate-500 border border-transparent'
                }`}
              >
                {ACC_COLORS[a].label}
              </button>
            ))}
          </div>
        </div>

        {/* Balance */}
        <div className="px-5 py-5 text-center border-b border-white/[0.06]">
          <p className={`text-[10px] uppercase tracking-wider mb-1 ${colors.text} opacity-70`}>
            {colors.label} {account === 'dash' ? 'Dasher Card' : 'Checking'}
          </p>
          {loading ? (
            <div className="h-10 w-40 mx-auto bg-white/[0.04] rounded-lg animate-pulse" />
          ) : editingBalance ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-mono font-semibold text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEditBalance(); if (e.key === 'Escape') setEditingBalance(false); }}
                className="w-32 bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-3xl font-mono font-semibold text-slate-100 text-center focus:outline-none focus:border-emerald-500/50"
                autoFocus
              />
              <button onClick={saveEditBalance} className="px-3 py-2 rounded-lg bg-emerald-500/30 text-emerald-400 text-sm font-medium">Save</button>
              <button onClick={() => setEditingBalance(false)} className="px-3 py-2 rounded-lg bg-white/10 text-slate-400 text-sm">Cancel</button>
            </div>
          ) : (
            <button onClick={startEditBalance} className="group">
              <span className={`text-3xl font-mono font-semibold ${balance >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
                ${fmt(Math.abs(balance))}
              </span>
              <span className="text-lg ml-1 opacity-0 group-hover:opacity-50 transition-opacity">✏️</span>
            </button>
          )}
          <p className="text-[9px] text-slate-600 mt-1">tap balance to edit</p>
        </div>

        {/* Entry Form */}
        <div className="px-5 py-4">
          <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="space-y-2.5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsIncome(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !isIncome
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-slate-500 border border-transparent'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setIsIncome(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isIncome
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-500 border border-transparent'
                }`}
              >
                Income
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="$0.00"
                className="w-28 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 font-mono text-right flex-shrink-0"
              />
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Label (e.g. Groceries, Paycheck)"
                className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isIncome
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
              }`}
            >
              {isIncome ? '+ Add Income' : '- Add Expense'}
            </button>
          </form>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.15] overflow-hidden animate-slideUp">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-4 px-5 pb-4">
              <span className="text-4xl">📋</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Transactions</h3>
                <p className="text-sm text-slate-400">{entries.length} entries</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-mono font-semibold text-slate-100">${fmt(balance)}</p>
                <p className="text-xs text-slate-500">net balance</p>
              </div>
            </div>
            <div className="px-5 pb-6 max-h-80 overflow-y-auto">
              <div className="space-y-1">
                {entries.map(entry => (
                  <div key={entry.id} className="group flex items-start justify-between gap-3 py-2.5 border-b border-white/[0.05]">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${entry.amount >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 font-medium">{entry.description}</p>
                        <p className="text-xs text-slate-500">{entry.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-base font-mono font-semibold ${entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.amount > 0 ? '+' : ''}${fmt(Math.abs(entry.amount))}
                      </span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Totals Modal */}
      {showTotals && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTotals(false)} />
          <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.15] overflow-hidden animate-slideUp">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center gap-4 px-5 pb-4">
              <span className="text-4xl">💵</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Total Balance</h3>
                <p className="text-sm text-slate-400">All Accounts Combined</p>
              </div>
            </div>
            <div className="px-5 pb-6 space-y-3">
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-emerald-400 font-medium">Bobby Checking</p>
                <p className="text-base font-mono text-emerald-400">${fmt(balances.bobby)}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-blue-400 font-medium">Logan Checking</p>
                <p className="text-base font-mono text-blue-400">${fmt(balances.logan)}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-orange-400 font-medium">Dash Dasher</p>
                <p className="text-base font-mono text-orange-400">${fmt(balances.dash)}</p>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-white/[0.15] mt-2">
                <p className="text-base font-semibold text-slate-200">Total</p>
                <p className="text-xl font-mono font-bold text-slate-100">${fmt(balances.bobby + balances.logan + balances.dash)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
