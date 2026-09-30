import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Calendar, Star,
  CheckCircle2, Clock, AlertCircle, HelpCircle,
  Award, Edit3, Save, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { DayDetail, DaySummary, ActivityInstance } from '../types';
import { formatDateIso, formatDateDisplay, formatTimeDisplay } from '../utils/dates';
import { CategoryBadge } from '../components/CategoryBadge';
import { QuickLogModal } from '../components/QuickLogModal';

export const HistoryPage: React.FC = () => {
  const { date: routeDate } = useParams<{ date?: string }>();
  const navigate = useNavigate();

  const selectedDate = routeDate || formatDateIso(new Date());

  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [monthSummaries, setMonthSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Log modal for editing activity
  const [editingInstance, setEditingInstance] = useState<ActivityInstance | null>(null);

  // Review editing
  const [editingReview, setEditingReview] = useState<boolean>(false);
  const [wentWell, setWentWell] = useState('');
  const [wentWrong, setWentWrong] = useState('');
  const [changeTomorrow, setChangeTomorrow] = useState('');
  const [dayRating, setDayRating] = useState<number | null>(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);

  // Fetch Day Detail
  const loadDay = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getDayDetail(selectedDate);
      setDayDetail(detail);

      if (detail.review) {
        setWentWell(detail.review.went_well || '');
        setWentWrong(detail.review.went_wrong || '');
        setChangeTomorrow(detail.review.change_tomorrow || '');
        setDayRating(detail.review.day_rating || null);
        setIsRestDay(detail.review.is_rest_day);
      } else {
        setWentWell('');
        setWentWrong('');
        setChangeTomorrow('');
        setDayRating(null);
        setIsRestDay(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load day history');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Fetch month calendar data
  const loadMonthData = useCallback(async () => {
    try {
      const [y, m] = selectedDate.split('-').map(Number);
      const startMonth = `${y}-${String(m).padStart(2, '0')}-01`;
      const endMonth = new Date(y, m, 0).toISOString().slice(0, 10);
      const summaries = await api.getDaysSummary(startMonth, endMonth);
      setMonthSummaries(summaries);
    } catch {
      // Ignore
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDay();
    loadMonthData();
  }, [loadDay, loadMonthData]);

  // Navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    navigate(`/history/${formatDateIso(d)}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    navigate(`/history/${formatDateIso(d)}`);
  };

  const handleDateChange = (newDate: string) => {
    navigate(`/history/${newDate}`);
  };

  const handleSaveReview = async () => {
    setReviewSaving(true);
    try {
      await api.upsertDailyReview(selectedDate, {
        went_well: wentWell.trim() || null,
        went_wrong: wentWrong.trim() || null,
        change_tomorrow: changeTomorrow.trim() || null,
        day_rating: dayRating,
        is_rest_day: isRestDay,
        close_day: true,
      });
      setEditingReview(false);
      await loadDay();
      await loadMonthData();
    } catch (err: any) {
      alert(`Failed to save review: ${err.message}`);
    } finally {
      setReviewSaving(false);
    }
  };

  const handleSaveInstanceLog = async (id: number, logData: any) => {
    try {
      await api.logInstance(id, logData);
      await loadDay();
      await loadMonthData();
    } catch (err: any) {
      alert(`Error updating activity: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:py-6 md:px-8 max-w-5xl mx-auto space-y-4 md:space-y-6 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
      {/* Top Header & Day Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">History & Logs</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review past days, edit activity logs, and inspect daily ratings.
          </p>
        </div>

        {/* Date Selector and Prev/Next */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrevDay}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0 flex items-center justify-center active:scale-95"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="flex-1 sm:flex-initial h-10 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-slate-600 text-center"
          />

          <button
            onClick={handleNextDay}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0 flex items-center justify-center active:scale-95"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Calendar Mini-Heatmap */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2.5 text-xs">
          <span className="font-bold text-slate-200 text-xs sm:text-sm">
            Month Overview ({selectedDate.slice(0, 7)})
          </span>
          <span className="text-slate-400 text-[10px] sm:text-[11px]">Click any day to inspect</span>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-1 sm:gap-1.5">
          {monthSummaries.map((s) => {
            const isSelected = s.date === selectedDate;
            const hasScore = s.score !== null;
            const isRest = s.is_rest_day;

            return (
              <button
                key={s.date}
                onClick={() => handleDateChange(s.date)}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition-all min-h-[44px] flex flex-col justify-center items-center ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 border-transparent bg-slate-800 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800 active:scale-95'
                }`}
              >
                <span className="text-[10px] text-slate-400 block font-mono leading-none mb-0.5">
                  {parseInt(s.date.slice(8), 10)}
                </span>
                <span className={`text-[10px] sm:text-xs font-bold font-mono leading-none ${
                  isRest
                    ? 'text-purple-400'
                    : hasScore
                    ? s.score! >= 70
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                    : 'text-slate-500'
                }`}>
                  {isRest ? 'REST' : hasScore ? `${s.score}%` : '--'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-sm">Loading day history...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {!loading && dayDetail && (
        <div className="space-y-6">
          {/* Day Score & Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Day Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {dayDetail.score !== null ? `${dayDetail.score}%` : 'No score'}
                </span>
                {dayDetail.review?.is_rest_day && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Rest Day
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {dayDetail.counts.completed} completed • {dayDetail.counts.partial} partial • {dayDetail.counts.missed} missed
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Focus & Movement
              </span>
              <div className="flex items-baseline gap-4">
                <div>
                  <span className="text-2xl font-bold text-white font-mono">{dayDetail.focus_minutes}</span>
                  <span className="text-xs text-slate-400 ml-1">min focus</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-white font-mono">{dayDetail.exercise_minutes}</span>
                  <span className="text-xs text-slate-400 ml-1">min exercise</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Total recorded active time</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Day Rating
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      dayDetail.review?.day_rating && s <= dayDetail.review.day_rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {dayDetail.review?.closed_at ? 'Day closed' : 'Day open'}
              </p>
            </div>
          </div>

          {/* Activity Instances List */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Activities on {formatDateDisplay(selectedDate)}
            </h2>

            <div className="space-y-2">
              {dayDetail.instances.map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => setEditingInstance(inst)}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/70 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      {inst.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {inst.status === 'partial' && <Clock className="w-4 h-4 text-amber-400" />}
                      {inst.status === 'missed' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                      {inst.status === 'skipped' && <HelpCircle className="w-4 h-4 text-slate-400" />}
                      {inst.status === 'pending' && <span className="w-2.5 h-2.5 rounded-full bg-slate-600 block" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200 truncate">{inst.title}</span>
                        <CategoryBadge category={inst.category} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono">{inst.planned_start} – {inst.planned_end || 'checkpoint'}</span>
                        {inst.duration_minutes != null && inst.duration_minutes > 0 && (
                          <span>({inst.duration_minutes}m logged)</span>
                        )}
                        {inst.metric_value !== null && inst.metric_value !== undefined && (
                          <span className="text-emerald-400 font-mono">
                            • {inst.metric_value} {inst.metric_unit || inst.metric_name}
                          </span>
                        )}
                        {inst.rating && (
                          <span className="text-amber-400">★ {inst.rating}</span>
                        )}
                      </div>
                      {inst.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">"{inst.notes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-slate-400 capitalize flex items-center gap-2">
                    <span>{inst.status}</span>
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Review Section */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Daily Review
              </h2>
              <button
                onClick={() => setEditingReview(!editingReview)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                {editingReview ? 'Cancel' : 'Edit Review'}
              </button>
            </div>

            {editingReview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">What went well?</label>
                    <textarea
                      rows={3}
                      value={wentWell}
                      onChange={(e) => setWentWell(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-slate-600 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">What went wrong?</label>
                    <textarea
                      rows={3}
                      value={wentWrong}
                      onChange={(e) => setWentWrong(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-slate-600 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">What will I change tomorrow?</label>
                    <textarea
                      rows={3}
                      value={changeTomorrow}
                      onChange={(e) => setChangeTomorrow(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-slate-600 resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 mr-1">Rating:</span>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setDayRating(dayRating === s ? null : s)}
                          className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                            dayRating === s ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {s}★
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="history-rest-toggle"
                        checked={isRestDay}
                        onChange={(e) => setIsRestDay(e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-purple-500"
                      />
                      <label htmlFor="history-rest-toggle" className="text-xs text-slate-300 select-none">
                        Rest day
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveReview}
                    disabled={reviewSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{reviewSaving ? 'Saving...' : 'Save Review'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="font-semibold text-slate-300 block mb-1">What went well</span>
                  <p className="text-slate-400">{dayDetail.review?.went_well || 'No notes'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="font-semibold text-slate-300 block mb-1">What went wrong</span>
                  <p className="text-slate-400">{dayDetail.review?.went_wrong || 'No notes'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="font-semibold text-slate-300 block mb-1">What to change tomorrow</span>
                  <p className="text-slate-400">{dayDetail.review?.change_tomorrow || 'No notes'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit modal */}
      <QuickLogModal
        instance={editingInstance}
        onClose={() => setEditingInstance(null)}
        onSave={handleSaveInstanceLog}
      />
    </div>
  );
};
