import { useState, useEffect } from 'react';

type Account = 'bobby' | 'logan' | 'dash';

interface MoneyEntry {
  id: string;
  amount: number;
  label: string;
  date: string;
}

interface AccountData {
  checking: number;
  entries: MoneyEntry[];
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACC_COLORS: Record<Account, { bg: string; border: string; text: string; label: string }> = {
  bobby:  { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Bobby' },
  logan:  { bg: 'bg-blue-500/20',   border: 'border-blue-500/30',   text: 'text-blue-400',   label: 'Logan' },
  dash:   { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400',  label: 'Dash' },
};

export function MoneyWidget() {
  const [account, setAccount] = useState<Account>('bobby');
  const [bobbyData, setBobbyData] = useState<AccountData>({ checking: 0, entries: [] });
  const [loganData, setLoganData] = useState<AccountData>({ checking: 0, entries: [] });
  const [dashData, setDashData] = useState<AccountData>({ checking: 0, entries: [] });
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [isIncome, setIsIncome] = useState(false);
  const [editingChecking, setEditingChecking] = useState(false);
  const [checkingInput, setCheckingInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showTotals, setShowTotals] = useState(false);

  const getData = (a: Account) => a === 'bobby' ? bobbyData : a === 'logan' ? loganData : dashData;
  const setData = (a: Account, d: AccountData) => {
    if (a === 'bobby') setBobbyData(d);
    else if (a === 'logan') setLoganData(d);
    else setDashData(d);
  };

  const activeData = getData(account);
  const setActiveData = (d: AccountData) => setData(account, d);
  const colors = ACC_COLORS[account];

  useEffect(() => {
    const load = (key: Account): AccountData => {
      const checking = parseFloat(localStorage.getItem(`${key}_checking`) || '0');
      const entries = JSON.parse(localStorage.getItem(`${key}_entries`) || '[]');
      return { checking, entries };
    };

    fetch('/api/money/backup')
      .then(r => r.json())
      .then(serverData => {
        if (serverData && serverData.bobby) {
          localStorage.setItem('bobby_checking', String(serverData.bobby.checking));
          localStorage.setItem('bobby_entries', JSON.stringify(serverData.bobby.entries));
          setBobbyData(serverData.bobby);
        } else {
          const d = load('bobby');
          setBobbyData(d);
        }
        if (serverData && serverData.logan) {
          localStorage.setItem('logan_checking', String(serverData.logan.checking));
          localStorage.setItem('logan_entries', JSON.stringify(serverData.logan.entries));
          setLoganData(serverData.logan);
        } else {
          const d = load('logan');
          setLoganData(d);
        }
        if (serverData && serverData.dash) {
          localStorage.setItem('dash_checking', String(serverData.dash.checking));
          localStorage.setItem('dash_entries', JSON.stringify(serverData.dash.entries));
          setDashData(serverData.dash);
        } else {
          const d = load('dash');
          setDashData(d);
        }
      })
      .catch(() => {
        setBobbyData(load('bobby'));
        setLoganData(load('logan'));
        setDashData(load('dash'));
      });
    const interval = setInterval(() => {
      fetch('/api/money/backup')
        .then(r => r.json())
        .then(serverData => {
          if (serverData && serverData.bobby) {
            localStorage.setItem('bobby_checking', String(serverData.bobby.checking));
            localStorage.setItem('bobby_entries', JSON.stringify(serverData.bobby.entries));
            setBobbyData(serverData.bobby);
          }
          if (serverData && serverData.logan) {
            localStorage.setItem('logan_checking', String(serverData.logan.checking));
            localStorage.setItem('logan_entries', JSON.stringify(serverData.logan.entries));
            setLoganData(serverData.logan);
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const saveData = (key: Account, data: AccountData) => {
    localStorage.setItem(`${key}_checking`, String(data.checking));
    localStorage.setItem(`${key}_entries`, JSON.stringify(data.entries));
  };

  const backupToServer = () => {
    fetch('/api/money/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bobby: bobbyData, logan: loganData, dash: dashData }),
    }).catch(() => {});
  };

  const addTransaction = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !label.trim()) return;

    const entry: MoneyEntry = {
      id: Date.now().toString(),
      amount: isIncome ? numAmount : -numAmount,
      label: label.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const newData: AccountData = {
      checking: Math.round((activeData.checking + entry.amount) * 100) / 100,
      entries: [entry, ...activeData.entries],
    };

    setActiveData(newData);
    saveData(account, newData);
    backupToServer();

    try {
      await fetch('/api/money/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: entry.date,
          type: isIncome ? 'income' : 'expense',
          amount: entry.amount,
          label: entry.label,
          account,
          balance_after: newData.checking,
        }),
      });
    } catch {}

    setAmount('');
    setLabel('');
  };

  const startEditChecking = () => {
    setCheckingInput(activeData.checking.toFixed(2));
    setEditingChecking(true);
  };

  const saveCheckingEdit = () => {
    const val = parseFloat(checkingInput);
    if (!isNaN(val)) {
      const newData = { ...activeData, checking: val };
      setActiveData(newData);
      saveData(account, newData);
      backupToServer();
    }
    setEditingChecking(false);
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
            {activeData.entries.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.10] text-emerald-400 border border-emerald-500/20 transition-colors"
              >
                History ({activeData.entries.length})
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

        {/* Checking Balance */}
        <div className="px-5 py-5 text-center border-b border-white/[0.06]">
          <p className={`text-[10px] uppercase tracking-wider mb-1 ${colors.text} opacity-70`}>
            {colors.label} {account === 'dash' ? 'Dasher Card' : 'Checking'}
          </p>
          {editingChecking ? (
            <div className="flex items-center justify-center gap-1">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                autoFocus
                value={checkingInput}
                onChange={e => setCheckingInput(e.target.value)}
                onBlur={saveCheckingEdit}
                onKeyDown={e => { if (e.key === 'Enter') saveCheckingEdit(); if (e.key === 'Escape') setEditingChecking(false); }}
                className="w-32 bg-white/[0.08] border border-white/[0.15] rounded-lg px-3 py-1.5 text-3xl font-mono text-slate-100 text-center focus:outline-none"
              />
            </div>
          ) : (
            <button onClick={startEditChecking} className="group flex items-center justify-center gap-2 mx-auto">
              <span className={`text-3xl font-mono font-semibold group-hover:opacity-80 transition-colors ${activeData.checking >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
                ${fmt(Math.abs(activeData.checking))}
              </span>
              <span className="text-slate-600 group-hover:text-slate-400 transition-colors text-xs">✎</span>
            </button>
          )}
          <p className="text-[9px] text-slate-600 mt-1">tap ✎ to update balance</p>
        </div>

        {/* Entry Form */}
        <div className="px-5 py-4">
          <form onSubmit={e => { e.preventDefault(); addTransaction(); }} className="space-y-2.5">
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
                value={label}
                onChange={e => setLabel(e.target.value)}
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
                <h3 className="text-xl font-semibold text-slate-100">
                  {colors.label}'s Transactions
                </h3>
                <p className="text-sm text-slate-400">{activeData.entries.length} transactions</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-mono font-semibold text-slate-100">${fmt(activeData.checking)}</p>
                <p className="text-xs text-slate-500">{account === 'dash' ? 'Dasher Card' : 'checking'}</p>
              </div>
            </div>
            <div className="px-5 pb-6 max-h-80 overflow-y-auto">
              <div className="space-y-1">
                {activeData.entries.map(entry => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-white/[0.05]">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${entry.amount >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 font-medium">{entry.label}</p>
                        <p className="text-xs text-slate-500">{entry.date}</p>
                      </div>
                    </div>
                    <span className={`text-base font-mono font-semibold flex-shrink-0 ${entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.amount > 0 ? '+' : ''}${fmt(Math.abs(entry.amount))}
                    </span>
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
                <h3 className="text-xl font-semibold text-slate-100">Combined Cash</h3>
                <p className="text-sm text-slate-400">All Accounts</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-mono font-semibold text-slate-100">
                  ${fmt(bobbyData.checking + loganData.checking + dashData.checking)}
                </p>
                <p className="text-xs text-slate-500">total</p>
              </div>
            </div>
            <div className="px-5 pb-6 space-y-4">
              {([
                { key: 'bobby' as Account, data: bobbyData, color: 'bg-emerald-400' },
                { key: 'logan' as Account, data: loganData, color: 'bg-blue-400' },
                { key: 'dash' as Account, data: dashData, color: 'bg-orange-400' },
              ]).map(({ key, data, color }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{ACC_COLORS[key].label}{key === 'dash' ? ' Dasher Card' : ''}</p>
                      <p className="text-xs text-slate-500">{data.entries.length} transactions</p>
                    </div>
                  </div>
                  <p className={`text-lg font-mono font-semibold ${ACC_COLORS[key].text}`}>${fmt(data.checking)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between py-3">
                <p className="text-sm font-semibold text-slate-200">Combined Total</p>
                <p className="text-xl font-mono font-bold text-slate-100">
                  ${fmt(bobbyData.checking + loganData.checking + dashData.checking)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
