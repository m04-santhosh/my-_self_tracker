import React, { useState, useEffect } from 'react';
import { X, Check, Star, Clock, ChevronDown, ChevronUp, AlertCircle, HelpCircle } from 'lucide-react';
import { ActivityInstance, Status } from '../types';
import { CategoryBadge } from './CategoryBadge';
import { formatTimeDisplay, timeToMinutes } from '../utils/dates';

interface QuickLogModalProps {
  instance: ActivityInstance | null;
  onClose: () => void;
  onSave: (instanceId: number, logData: {
    status: Status;
    rating?: number | null;
    notes?: string | null;
    actual_start?: string | null;
    actual_end?: string | null;
    duration_minutes?: number | null;
    metric_value?: number | null;
  }) => Promise<void>;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  instance,
  onClose,
  onSave,
}) => {
  if (!instance) return null;

  // Calculate default planned duration
  const defaultDuration = React.useMemo(() => {
    if (instance.duration_minutes !== null && instance.duration_minutes !== undefined) {
      return instance.duration_minutes;
    }
    if (instance.planned_start && instance.planned_end) {
      return Math.max(0, timeToMinutes(instance.planned_end) - timeToMinutes(instance.planned_start));
    }
    return 0;
  }, [instance]);

  const [status, setStatus] = useState<Status>(
    instance.status !== 'pending' ? instance.status : 'completed'
  );
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [actualStart, setActualStart] = useState<string>(instance.actual_start || instance.planned_start || '');
  const [actualEnd, setActualEnd] = useState<string>(instance.actual_end || instance.planned_end || '');
  const [rating, setRating] = useState<number | null>(instance.rating ?? null);
  const [notes, setNotes] = useState<string>(instance.notes || '');
  const [metricValue, setMetricValue] = useState<string>(
    instance.metric_value !== null && instance.metric_value !== undefined ? String(instance.metric_value) : ''
  );
  const [expanded, setExpanded] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleQuickStatusClick = async (chosenStatus: Status) => {
    setStatus(chosenStatus);
    setSaving(true);
    try {
      await onSave(instance.id, {
        status: chosenStatus,
        duration_minutes: duration > 0 ? duration : (chosenStatus === 'completed' ? defaultDuration : 0),
        rating,
        notes: notes.trim() || null,
        actual_start: actualStart || null,
        actual_end: actualEnd || null,
        metric_value: metricValue ? parseFloat(metricValue) : null,
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleFullSave = async () => {
    setSaving(true);
    try {
      await onSave(instance.id, {
        status,
        duration_minutes: duration,
        rating,
        notes: notes.trim() || null,
        actual_start: actualStart || null,
        actual_end: actualEnd || null,
        metric_value: metricValue ? parseFloat(metricValue) : null,
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CategoryBadge category={instance.category} size="sm" />
              <span className="text-xs text-slate-400 font-mono">
                {instance.planned_start}
                {instance.planned_end ? ` – ${instance.planned_end}` : ''}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">{instance.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Log Action Buttons */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Mark as (one tap to save)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleQuickStatusClick('completed')}
                className={`py-3 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  status === 'completed'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Done</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleQuickStatusClick('partial')}
                className={`py-3 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  status === 'partial'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Partial</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleQuickStatusClick('missed')}
                className={`py-3 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  status === 'missed'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Missed</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleQuickStatusClick('skipped')}
                className={`py-3 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                  status === 'skipped'
                    ? 'bg-slate-600 text-white shadow-lg shadow-slate-600/20'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Skip</span>
              </button>
            </div>
          </div>

          {/* Expand Details Toggle */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 py-2 border-t border-slate-800/80"
          >
            <span>Add details (duration, metric, rating, notes)</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Expandable Details */}
          {expanded && (
            <div className="space-y-4 pt-1 animate-in fade-in duration-100">
              {/* Duration and metric */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                {instance.metric_name ? (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 capitalize">
                      {instance.metric_name} ({instance.metric_unit || 'count'})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 3"
                      value={metricValue}
                      onChange={(e) => setMetricValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Actual start time</label>
                    <input
                      type="time"
                      value={actualStart}
                      onChange={(e) => setActualStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                    />
                  </div>
                )}
              </div>

              {/* Rating 1-5 */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rating (optional)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      className="p-1 rounded hover:bg-slate-800 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          rating !== null && star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                  {rating !== null && (
                    <button
                      type="button"
                      onClick={() => setRating(null)}
                      className="text-xs text-slate-400 hover:text-slate-400 ml-2"
                    >
                      clear
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did this session go?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFullSave}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all"
                >
                  {saving ? 'Saving...' : 'Save details'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
