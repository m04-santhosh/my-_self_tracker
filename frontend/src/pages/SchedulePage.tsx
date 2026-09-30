import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Edit, Copy, Pause, Play, Trash2,
  AlertTriangle, Calendar, Clock, Check, Info, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { ActivityTemplate, Category, Kind, CountsAs, SpecialRole } from '../types';
import { CategoryBadge } from '../components/CategoryBadge';
import { formatTimeDisplay, timeToMinutes } from '../utils/dates';

const DAYS_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SchedulePage: React.FC = () => {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View toggle: 'list' or 'week'
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('career');
  const [kind, setKind] = useState<Kind>('block');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]); // Mon-Fri
  const [countsAs, setCountsAs] = useState<CountsAs>('none');
  const [specialRole, setSpecialRole] = useState<SpecialRole>('none');
  const [metricName, setMetricName] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [notify, setNotify] = useState<boolean>(true);
  const [askOnEnd, setAskOnEnd] = useState<boolean>(false);
  const [activeFrom, setActiveFrom] = useState('');
  const [activeUntil, setActiveUntil] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTemplates(false);
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Open modal for new template
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTitle('');
    setDescription('');
    setCategory('career');
    setKind('block');
    setStartTime('09:00');
    setEndTime('10:00');
    setSelectedDays([0, 1, 2, 3, 4]);
    setCountsAs('none');
    setSpecialRole('none');
    setMetricName('');
    setMetricUnit('');
    setNotify(true);
    setAskOnEnd(false);
    setActiveFrom('');
    setActiveUntil('');
    setFormError(null);
    setModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (t: ActivityTemplate) => {
    setEditingTemplate(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setCategory(t.category);
    setKind(t.kind);
    setStartTime(t.start_time);
    setEndTime(t.end_time || '');
    const daysArr = t.days_of_week.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => !isNaN(d));
    setSelectedDays(daysArr);
    setCountsAs(t.counts_as);
    setSpecialRole(t.special_role);
    setMetricName(t.metric_name || '');
    setMetricUnit(t.metric_unit || '');
    setNotify(t.notify);
    setAskOnEnd(t.ask_on_end);
    setActiveFrom(t.active_from);
    setActiveUntil(t.active_until || '');
    setFormError(null);
    setModalOpen(true);
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length === 1) return; // Keep at least one day
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort((a, b) => a - b));
    }
  };

  // Check for overlaps among templates
  const overlaps = useMemo(() => {
    const list: string[] = [];
    const activeBlocks = templates.filter((t) => !t.is_paused && !t.is_archived && t.kind === 'block' && t.end_time);

    for (let day = 0; day < 7; day++) {
      const dayBlocks = activeBlocks.filter((t) =>
        t.days_of_week.split(',').map(Number).includes(day)
      );

      for (let i = 0; i < dayBlocks.length; i++) {
        for (let j = i + 1; j < dayBlocks.length; j++) {
          const a = dayBlocks[i];
          const b = dayBlocks[j];
          const aStart = timeToMinutes(a.start_time);
          const aEnd = timeToMinutes(a.end_time!);
          const bStart = timeToMinutes(b.start_time);
          const bEnd = timeToMinutes(b.end_time!);

          if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
            const overlapMsg = `${DAYS_NAMES[day]}: "${a.title}" (${a.start_time}–${a.end_time}) overlaps with "${b.title}" (${b.start_time}–${b.end_time})`;
            if (!list.includes(overlapMsg)) {
              list.push(overlapMsg);
            }
          }
        }
      }
    }
    return list;
  }, [templates]);

  // Save template form
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (kind === 'block' && (!endTime || endTime <= startTime)) {
      setFormError('End time must be strictly after start time for block activities');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload: any = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      kind,
      start_time: startTime,
      end_time: kind === 'block' ? endTime : null,
      days_of_week: selectedDays.join(','),
      counts_as: countsAs,
      special_role: specialRole,
      metric_name: metricName.trim() || null,
      metric_unit: metricUnit.trim() || null,
      notify,
      ask_on_end: askOnEnd,
      active_until: activeUntil || null,
    };

    if (activeFrom) {
      payload.active_from = activeFrom;
    }

    try {
      if (editingTemplate) {
        await api.updateTemplate(editingTemplate.id, payload);
      } else {
        await api.createTemplate(payload);
      }
      setModalOpen(false);
      await loadTemplates();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await api.duplicateTemplate(id);
      await loadTemplates();
    } catch (err: any) {
      alert(`Error duplicating: ${err.message}`);
    }
  };

  const handleTogglePause = async (t: ActivityTemplate) => {
    try {
      if (t.is_paused) {
        await api.resumeTemplate(t.id);
      } else {
        await api.pauseTemplate(t.id);
      }
      await loadTemplates();
    } catch (err: any) {
      alert(`Error toggling pause: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Archive this schedule template? Past logged activities will be preserved.')) return;
    try {
      await api.deleteTemplate(id);
      await loadTemplates();
    } catch (err: any) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Schedule Templates</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Your recurring rhythm. Edits apply to future days starting today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'week' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Week View
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Domain Rule Explanation Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-300">Future-Only Updates: </span>
          Editing or pausing a template applies to future pending activities starting today. Past history and any single-day overrides you customized are never overwritten.
        </div>
      </div>

      {/* Overlap Warnings */}
      {overlaps.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Schedule Overlap Notice (informational only):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
            {overlaps.slice(0, 3).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm">Loading schedule...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <div className="space-y-3">
          {templates.map((tmpl) => {
            const daysArr = tmpl.days_of_week.split(',').map(Number);
            const isDaily = daysArr.length === 7;
            const isMonFri = daysArr.length === 5 && daysArr.every((d) => d < 5);

            return (
              <div
                key={tmpl.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  tmpl.is_paused
                    ? 'bg-slate-900/30 border-slate-800/40 opacity-60'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-1">
                    <CategoryBadge category={tmpl.category} size="sm" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{tmpl.title}</h3>
                      {tmpl.is_paused && (
                        <span className="text-[10px] px-1.5 rounded bg-slate-800 text-amber-400 font-mono">
                          PAUSED
                        </span>
                      )}
                    </div>
                    {tmpl.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{tmpl.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                      <span className="font-mono text-slate-300">
                        {formatTimeDisplay(tmpl.start_time)}
                        {tmpl.end_time ? ` – ${formatTimeDisplay(tmpl.end_time)}` : ''}
                      </span>
                      <span>•</span>
                      <span>
                        {isDaily ? 'Daily' : isMonFri ? 'Mon–Fri' : daysArr.map((d) => DAYS_NAMES[d]).join(', ')}
                      </span>
                      {tmpl.metric_name && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-mono">
                            tracks {tmpl.metric_name} ({tmpl.metric_unit || 'count'})
                          </span>
                        </>
                      )}
                      {tmpl.counts_as !== 'none' && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{tmpl.counts_as}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleTogglePause(tmpl)}
                    title={tmpl.is_paused ? 'Resume template' : 'Pause template'}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    {tmpl.is_paused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDuplicate(tmpl.id)}
                    title="Duplicate template"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(tmpl)}
                    title="Edit template"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-slate-300" />
                  </button>

                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    title="Archive template"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Week Grid View */}
      {!loading && viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DAYS_NAMES.map((dayName, dayIdx) => {
            const dayTemplates = templates.filter(
              (t) => !t.is_archived && t.days_of_week.split(',').map(Number).includes(dayIdx)
            ).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

            return (
              <div key={dayName} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                <div className="pb-2 border-b border-slate-800 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {dayName}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {dayTemplates.length} items
                  </span>
                </div>

                <div className="space-y-1.5 flex-1">
                  {dayTemplates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleOpenEdit(t)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                        t.is_paused
                          ? 'bg-slate-950/40 border-slate-800/40 opacity-50'
                          : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-slate-200 truncate">{t.title}</span>
                        <CategoryBadge category={t.category} size="sm" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {t.start_time}
                      </span>
                    </div>
                  ))}
                  {dayTemplates.length === 0 && (
                    <div className="py-6 text-center text-[11px] text-slate-400">Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Template Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-1">
              {editingTemplate ? 'Edit Template' : 'New Schedule Template'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {editingTemplate
                ? 'Edits apply from today onward to future pending activities.'
                : 'Define a recurring routine to generate daily activities.'}
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Focus"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Routine context or instructions"
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
                  <label className="block text-xs text-slate-400 mb-1">Kind</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as Kind)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  >
                    <option value="block">Time Block (Start & End)</option>
                    <option value="checkpoint">Checkpoint (Single Time)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                {kind === 'block' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">End Time</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                    />
                  </div>
                )}
              </div>

              {/* Day of Week Toggles */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Repeat Days</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_NAMES.map((name, idx) => {
                    const isSelected = selectedDays.includes(idx);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Counts As & Special Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Counts As</label>
                  <select
                    value={countsAs}
                    onChange={(e) => setCountsAs(e.target.value as CountsAs)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  >
                    <option value="none">None</option>
                    <option value="focus">Focus Session</option>
                    <option value="exercise">Exercise / Movement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Special Role</label>
                  <select
                    value={specialRole}
                    onChange={(e) => setSpecialRole(e.target.value as SpecialRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  >
                    <option value="none">None</option>
                    <option value="wake">Wake Time</option>
                    <option value="bedtime">Bedtime</option>
                  </select>
                </div>
              </div>

              {/* Metric tracking (optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Metric Name (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. problems, pages"
                    value={metricName}
                    onChange={(e) => setMetricName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Metric Unit (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. count, pages"
                    value={metricUnit}
                    onChange={(e) => setMetricUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>

              {/* Notification & Ask on End Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tmpl-notify"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="tmpl-notify" className="text-xs text-slate-300">
                    Enable browser notification reminder for this activity
                  </label>
                </div>

                {kind === 'block' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tmpl-ask-end"
                      checked={askOnEnd}
                      onChange={(e) => setAskOnEnd(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                    />
                    <label htmlFor="tmpl-ask-end" className="text-xs text-slate-300">
                      Ask "How did it go?" reminder at session end
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all"
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Apply to Future' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
