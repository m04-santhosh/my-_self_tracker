import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Plus, ArrowUpRight, ArrowDownRight,
  Trash2, Filter, Target, Calendar, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Transaction, FinanceSummary, FIProgress } from '../types';
import { formatRupees, formatDateDisplay } from '../utils/dates';

const INCOME_CATEGORIES = ['freelancing', 'business', 'salary', 'other'];
const EXPENSE_CATEGORIES = ['food', 'travel', 'education', 'business', 'entertainment', 'shopping', 'other'];

export const FinancePage: React.FC = () => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [fiProgress, setFiProgress] = useState<FIProgress | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Add Transaction Form
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState('food');
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<string>('all');

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sum, fi, txs] = await Promise.all([
        api.getFinanceSummary(),
        api.getFIProgress(),
        api.getTransactions(),
      ]);
      setSummary(sum);
      setFiProgress(fi);
      setTransactions(txs);
    } catch (err: any) {
      setError(err.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  // When type changes, adjust default category
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    if (newType === 'income') {
      setCategory('freelancing');
    } else {
      setCategory('food');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountRupees || parseFloat(amountRupees) <= 0) return;

    setSubmitting(true);
    try {
      const paise = Math.round(parseFloat(amountRupees) * 100);
      await api.createTransaction({
        type,
        amount_paise: paise,
        category,
        date: dateStr,
        note: note.trim() || null,
      });
      setAmountRupees('');
      setNote('');
      await loadFinanceData();
    } catch (err: any) {
      alert(`Error recording transaction: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Delete this transaction record?')) return;
    try {
      await api.deleteTransaction(id);
      await loadFinanceData();
    } catch (err: any) {
      alert(`Error deleting transaction: ${err.message}`);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'income') return t.type === 'income';
    if (filterType === 'expense') return t.type === 'expense';
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:py-6 md:px-8 max-w-5xl mx-auto space-y-4 md:space-y-6 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Personal Finance</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Record cashflow, track net revenue, and monitor monthly FI progress.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm">Loading finances...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Summary Cards: Today, This Week, This Month, Total */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Today */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Today Net
              </span>
              <span className="text-lg font-bold text-white font-mono block">
                {formatRupees(summary.today.net_paise)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                +{formatRupees(summary.today.income_paise)} / -{formatRupees(summary.today.expense_paise)}
              </span>
            </div>

            {/* This Week */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                This Week Net
              </span>
              <span className="text-lg font-bold text-white font-mono block">
                {formatRupees(summary.this_week.net_paise)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                +{formatRupees(summary.this_week.income_paise)} / -{formatRupees(summary.this_week.expense_paise)}
              </span>
            </div>

            {/* This Month */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                This Month Net
              </span>
              <span className="text-lg font-bold text-white font-mono block">
                {formatRupees(summary.this_month.net_paise)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                Rate: {summary.this_month.net_rate !== null ? `${Math.round(summary.this_month.net_rate * 100)}%` : '--'}
              </span>
            </div>

            {/* Total 90-Day Challenge */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Total Net Cashflow
              </span>
              <span className="text-lg font-bold text-white font-mono block">
                {formatRupees(summary.total.net_paise)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                Total: +{formatRupees(summary.total.income_paise)}
              </span>
            </div>
          </div>

          {/* FI Progress Card */}
          {fiProgress && fiProgress.target_monthly_income_paise && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Monthly Financial Independence Target
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {fiProgress.progress_percent || 0}%
                </span>
              </div>

              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, fiProgress.progress_percent || 0)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Current: {formatRupees(fiProgress.current_month_income_paise)}</span>
                <span>Target: {formatRupees(fiProgress.target_monthly_income_paise)}</span>
              </div>
            </div>
          )}

          {/* Quick Add Transaction & Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Quick Add Form */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                Quick Record Transaction
              </h2>

              <form onSubmit={handleCreateTransaction} className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      type === 'expense'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      type === 'income'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Income
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Amount (Rupees)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="1"
                      required
                      placeholder="e.g. 250"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600 capitalize"
                    >
                      {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                        <option key={c} value={c} className="capitalize">{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lunch with team, Freelance invoice #4"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all text-center"
                  >
                    {submitting ? 'Recording...' : 'Add Transaction'}
                  </button>
                </div>
              </form>
            </div>

            {/* Category Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Category Totals
              </h2>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {Object.entries(summary.by_category).map(([cat, paise]) => (
                  <div key={cat} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40">
                    <span className="capitalize text-slate-300">{cat}</span>
                    <span className="font-mono text-slate-200">{formatRupees(paise)}</span>
                  </div>
                ))}
                {Object.keys(summary.by_category).length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Transaction History
              </h2>

              {/* Filter */}
              <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs">
                {['all', 'income', 'expense'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                      filterType === f ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-xl flex-shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {tx.type === 'income' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white capitalize">{tx.category}</span>
                        {tx.note && <span className="text-xs text-slate-400 truncate max-w-[140px] sm:max-w-xs">• {tx.note}</span>}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono block">{tx.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm font-bold font-mono ${
                      tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupees(tx.amount_paise)}
                    </span>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800/50"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredTransactions.length === 0 && (
                <p className="text-xs text-slate-400 py-8 text-center">No transactions match filter.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
