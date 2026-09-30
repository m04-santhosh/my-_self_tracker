import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, Plus, Trash2, Edit, ChevronDown,
  ChevronUp, CheckCircle, Clock, Calendar, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Goal, ActivityTemplate, Category } from '../types';
import { CategoryBadge } from '../components/CategoryBadge';
import { formatRupees } from '../utils/dates';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Goal Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('career');
  const [goalType, setGoalType] = useState<any>('activity_metric_sum');
  const [linkedTemplateId, setLinkedTemplateId] = useState<number | null>(null);
  const [targetValue, setTargetValue] = useState<string>('100');
  const [unit, setUnit] = useState('problems');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [deadline, setDeadline] = useState('2026-12-31');
  const [saving, setSaving] = useState(false);

  // Manual Entry Form State
  const [entryGoalId, setEntryGoalId] = useState<number | null>(null);
  const [entryValue, setEntryValue] = useState<string>('1');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [entryNote, setEntryNote] = useState<string>('');
  const [entrySaving, setEntrySaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsData, tmpls] = await Promise.all([
        api.getGoals(),
        api.getTemplates(),
      ]);
      setGoals(goalsData);
      setTemplates(tmpls);
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setCategory('career');
    setGoalType('activity_metric_sum');
    setLinkedTemplateId(templates[0]?.id || null);
    setTargetValue('100');
    setUnit('problems');
    setStartDate('2026-10-01');
    setDeadline('2026-12-31');
    setModalOpen(true);
  };

  const handleOpenEdit = (g: Goal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setDescription(g.description || '');
    setCategory(g.category);
    setGoalType(g.goal_type);
    setLinkedTemplateId(g.linked_template_id || null);
    setTargetValue(String(g.target_value));
    setUnit(g.unit);
    setStartDate(g.start_date);
    setDeadline(g.deadline);
    setModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetValue) return;

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        goal_type: goalType,
        linked_template_id: linkedTemplateId,
        target_value: parseFloat(targetValue),
        unit: unit.trim() || 'units',
        start_date: startDate,
        deadline,
      };

      if (editingGoal) {
        await api.updateGoal(editingGoal.id, payload);
      } else {
        await api.createGoal(payload);
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Error saving goal: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.deleteGoal(id);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting goal: ${err.message}`);
    }
  };

  const handleAddManualEntry = async (e: React.FormEvent, goalId: number) => {
    e.preventDefault();
    if (!entryValue) return;

    setEntrySaving(true);
    try {
      await api.addGoalEntry(goalId, {
        date: entryDate,
        value: parseFloat(entryValue),
        note: entryNote.trim() || null,
      });
      setEntryGoalId(null);
      setEntryValue('1');
      setEntryNote('');
      await loadData();
    } catch (err: any) {
      alert(`Error adding entry: ${err.message}`);
    } finally {
      setEntrySaving(false);
    }
  };

  const handleDeleteEntry = async (goalId: number, entryId: number) => {
    try {
      await api.deleteGoalEntry(goalId, entryId);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting entry: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Goals & Milestones</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Computed progress connected directly to your logged activities and finances.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm">Loading goals...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const isCompleted = g.status === 'completed' || g.progress_percent >= 100;

            return (
              <div
                key={g.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <CategoryBadge category={g.category} size="sm" />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{g.title}</h3>
                  {g.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{g.description}</p>
                  )}

                  {/* Progress Stats */}
                  <div className="flex items-baseline justify-between text-xs mt-3 mb-1.5">
                    <span className="font-mono text-lg font-extrabold text-white">
                      {g.unit === 'paise' ? formatRupees(g.current_value) : g.current_value}
                      <span className="text-xs font-normal text-slate-400 ml-1">
                        / {g.unit === 'paise' ? formatRupees(g.target_value) : g.target_value} {g.unit !== 'paise' ? g.unit : ''}
                      </span>
                    </span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      {g.progress_percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, g.progress_percent)}%` }}
                    />
                  </div>

                  {/* Pace and deadline info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5">
                    <span>
                      {g.required_per_day !== null && g.required_per_day !== undefined && g.required_per_day > 0
                        ? `Needs about ${g.required_per_day} ${g.unit !== 'paise' ? g.unit : 'Rs'}/day`
                        : isCompleted
                        ? 'Target reached!'
                        : 'On track'}
                    </span>
                    <span className="font-mono">
                      {g.days_left} days left ({g.deadline})
                    </span>
                  </div>
                </div>

                {/* Manual entry addition for manual goals or supplemental tracking */}
                <div className="pt-3 border-t border-slate-800/80">
                  {entryGoalId === g.id ? (
                    <form onSubmit={(e) => handleAddManualEntry(e, g.id)} className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="Value"
                          value={entryValue}
                          onChange={(e) => setEntryValue(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                        <input
                          type="date"
                          required
                          value={entryDate}
                          onChange={(e) => setEntryDate(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={entryNote}
                        onChange={(e) => setEntryNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEntryGoalId(null)}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={entrySaving}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          {entrySaving ? 'Saving...' : 'Add Entry'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setEntryGoalId(g.id)}
                        className="text-xs text-slate-400 hover:text-emerald-400 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add manual entry</span>
                      </button>

                      {g.entries.length > 0 && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {g.entries.length} manual entries
                        </span>
                      )}
                    </div>
                  )}

                  {/* Manual Entries List (if any) */}
                  {g.entries.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                      {g.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="text-[11px] text-slate-400 flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/40"
                        >
                          <span>{entry.date}: +{entry.value} {entry.note ? `("${entry.note}")` : ''}</span>
                          <button
                            onClick={() => handleDeleteEntry(g.id, entry.id)}
                            className="text-slate-400 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Goal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 pb-safe sm:pb-6 animate-in slide-in-from-bottom duration-200">
            {/* Mobile Drag Handle */}
            <div className="sm:hidden flex justify-center pb-3">
              <div className="w-12 h-1.5 rounded-full bg-slate-700"></div>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white mb-3">
              {editingGoal ? 'Edit Goal' : 'New 90-Day Goal'}
            </h2>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete 150 DSA problems"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Why this milestone matters"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  <label className="block text-xs text-slate-400 mb-1">Goal Type</label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  >
                    <option value="activity_metric_sum">Sum Activity Metric</option>
                    <option value="activity_completion_count">Activity Completion Count</option>
                    <option value="income_sum">Income Revenue</option>
                    <option value="days_logged">Days Logged / Showing Up</option>
                    <option value="successful_days">Successful Days Count</option>
                    <option value="manual">Manual Tracking</option>
                  </select>
                </div>
              </div>

              {(goalType === 'activity_metric_sum' || goalType === 'activity_completion_count') && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Linked Template</label>
                  <select
                    value={linkedTemplateId || ''}
                    onChange={(e) => setLinkedTemplateId(parseInt(e.target.value, 10) || null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  >
                    <option value="">Select template</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Value</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    required
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. problems, days"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Deadline</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {saving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
