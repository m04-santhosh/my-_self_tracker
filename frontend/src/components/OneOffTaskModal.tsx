import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Category, Kind } from '../types';

interface OneOffTaskModalProps {
  dateStr: string;
  onClose: () => void;
  onCreated: () => void;
  onCreate: (taskData: any) => Promise<any>;
}

export const OneOffTaskModal: React.FC<OneOffTaskModalProps> = ({
  dateStr,
  onClose,
  onCreated,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('life');
  const [kind, setKind] = useState<Kind>('block');
  const [plannedStart, setPlannedStart] = useState('14:00');
  const [plannedEnd, setPlannedEnd] = useState('15:00');
  const [metricName, setMetricName] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title');
      return;
    }
    if (kind === 'block' && plannedEnd <= plannedStart) {
      setError('End time must be strictly after start time');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onCreate({
        date: dateStr,
        title: title.trim(),
        category,
        kind,
        planned_start: plannedStart,
        planned_end: kind === 'block' ? plannedEnd : null,
        metric_name: metricName.trim() || null,
        metric_unit: metricUnit.trim() || null,
        notify,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-slate-700"></div>
        </div>

        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            Add One-Off Task
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 pb-safe sm:pb-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Submit lab assignment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600 capitalize"
              >
                {['mind', 'body', 'career', 'money', 'life', 'discipline'].map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
              >
                <option value="block">Time Block</option>
                <option value="checkpoint">Checkpoint</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
              />
            </div>

            {kind === 'block' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={plannedEnd}
                  onChange={(e) => setPlannedEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="task-notify"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
            />
            <label htmlFor="task-notify" className="text-xs text-slate-300">
              Send browser reminder
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all"
            >
              {loading ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
