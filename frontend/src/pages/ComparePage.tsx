import React, { useState, useEffect, useCallback } from 'react';
import {
  GitCompare, ArrowUp, ArrowDown, Minus,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { formatRupees, formatDateIso } from '../utils/dates';

interface MetricComparison {
  key: string;
  label: string;
  a_value: number | null;
  b_value: number | null;
  delta: number | null;
  percent_delta: number | null;
  is_currency: boolean;
  unit?: string | null;
}

interface CompareData {
  a: any;
  b: any;
  comparisons: MetricComparison[];
  warnings: string[];
}

export const ComparePage: React.FC = () => {
  const [aFrom, setAFrom] = useState('2026-10-01');
  const [aTo, setATo] = useState('2026-10-07');
  const [bFrom, setBFrom] = useState('2026-10-08');
  const [bTo, setBTo] = useState('2026-10-14');

  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCompare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.compareRanges(aFrom, aTo, bFrom, bTo);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  }, [aFrom, aTo, bFrom, bTo]);

  useEffect(() => {
    runCompare();
  }, [runCompare]);

  // Presets
  const applyPreset = (presetName: string) => {
    const today = new Date();
    const todayStr = formatDateIso(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateIso(yesterday);
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeStr = formatDateIso(dayBefore);

    if (presetName === 'today_vs_yesterday') {
      setAFrom(yesterdayStr);
      setATo(yesterdayStr);
      setBFrom(todayStr);
      setBTo(todayStr);
    } else if (presetName === 'yesterday_vs_day_before') {
      setAFrom(dayBeforeStr);
      setATo(dayBeforeStr);
      setBFrom(yesterdayStr);
      setBTo(yesterdayStr);
    } else if (presetName === 'week1_vs_week2') {
      setAFrom('2026-10-01');
      setATo('2026-10-07');
      setBFrom('2026-10-08');
      setBTo('2026-10-14');
    } else if (presetName === 'oct_vs_nov') {
      setAFrom('2026-10-01');
      setATo('2026-10-31');
      setBFrom('2026-11-01');
      setBTo('2026-11-30');
    } else if (presetName === 'oct_vs_dec') {
      setAFrom('2026-10-01');
      setATo('2026-10-31');
      setBFrom('2026-12-01');
      setBTo('2026-12-31');
    }
  };

  const formatVal = (val: number | null, isCurr: boolean, unit?: string | null) => {
    if (val === null || val === undefined) return <span className="text-slate-400">No data</span>;
    if (isCurr) return formatRupees(val);
    return `${val} ${unit || ''}`.trim();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:py-6 md:px-8 max-w-5xl mx-auto space-y-4 md:space-y-6 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Period Comparison</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Neutral comparison between two date windows with daily averages and metric deltas.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <span className="text-xs text-slate-400 shrink-0 font-medium">Presets:</span>
        <button
          onClick={() => applyPreset('today_vs_yesterday')}
          className="whitespace-nowrap px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          Today vs Yesterday
        </button>
        <button
          onClick={() => applyPreset('yesterday_vs_day_before')}
          className="whitespace-nowrap px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          Yesterday vs Day Before
        </button>
        <button
          onClick={() => applyPreset('week1_vs_week2')}
          className="whitespace-nowrap px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          Week 1 vs Week 2
        </button>
        <button
          onClick={() => applyPreset('oct_vs_nov')}
          className="whitespace-nowrap px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          October vs November
        </button>
        <button
          onClick={() => applyPreset('oct_vs_dec')}
          className="whitespace-nowrap px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          October vs December
        </button>
      </div>

      {/* Range Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Range A */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Base Range (A)
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">From</label>
              <input
                type="date"
                value={aFrom}
                onChange={(e) => setAFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">To</label>
              <input
                type="date"
                value={aTo}
                onChange={(e) => setATo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>
          {data && (
            <p className="text-[11px] text-slate-400">
              Based on {data.a.days_in_range} days ({data.a.days_with_data} with logged data)
            </p>
          )}
        </div>

        {/* Range B */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Comparison Range (B)
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">From</label>
              <input
                type="date"
                value={bFrom}
                onChange={(e) => setBFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">To</label>
              <input
                type="date"
                value={bTo}
                onChange={(e) => setBTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>
          {data && (
            <p className="text-[11px] text-slate-400">
              Based on {data.b.days_in_range} days ({data.b.days_with_data} with logged data)
            </p>
          )}
        </div>
      </div>

      {/* Warnings */}
      {data && data.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Range Alignment Notice</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
            {data.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm">Calculating comparison...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Comparison Table */}
      {!loading && data && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Metric</th>
                <th className="py-3 px-4">Range A</th>
                <th className="py-3 px-4">Range B</th>
                <th className="py-3 px-4 text-right">Change (Delta)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.comparisons.map((c) => {
                const hasDelta = c.delta !== null && c.delta !== undefined;
                const isZero = c.delta === 0;
                const isPositive = hasDelta && c.delta! > 0;
                const isNegative = hasDelta && c.delta! < 0;

                return (
                  <tr key={c.key} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">{c.label}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatVal(c.a_value, c.is_currency, c.unit)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {formatVal(c.b_value, c.is_currency, c.unit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {hasDelta ? (
                        <div className="inline-flex items-center gap-1.5 text-slate-300">
                          {isZero ? (
                            <Minus className="w-3.5 h-3.5 text-slate-400" />
                          ) : isPositive ? (
                            <ArrowUp className="w-3.5 h-3.5 text-slate-300" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-slate-300" />
                          )}
                          <span>
                            {c.is_currency ? formatRupees(c.delta!) : `${c.delta! > 0 ? '+' : ''}${c.delta} ${c.unit || ''}`}
                          </span>
                          {c.percent_delta !== null && (
                            <span className="text-[11px] text-slate-400 ml-1">
                              ({c.percent_delta! > 0 ? '+' : ''}{c.percent_delta}%)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
