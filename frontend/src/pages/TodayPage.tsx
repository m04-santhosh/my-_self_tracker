import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Check, Clock, AlertCircle, HelpCircle, Plus,
  Moon, ChevronRight, Play, Square, Award, Target,
  RefreshCw, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import {
  DayDetail, ActivityInstance, Goal, Settings, Status
} from '../types';
import { formatDateIso, formatDateDisplay, formatTimeDisplay, getGreeting, timeToMinutes } from '../utils/dates';
import { getScheduleStatus } from '../utils/activityLogic';
import { CategoryBadge } from '../components/CategoryBadge';
import { ProgressRing } from '../components/ProgressRing';
import { QuickLogModal } from '../components/QuickLogModal';
import { OneOffTaskModal } from '../components/OneOffTaskModal';

interface TodayPageProps {
  settings: Settings | null;
  selectedInstanceForLogId?: number | null;
  onClearSelectedInstance?: () => void;
}

export const TodayPage: React.FC<TodayPageProps> = ({
  settings,
  selectedInstanceForLogId,
  onClearSelectedInstance,
}) => {
  const [todayStr, setTodayStr] = useState<string>(formatDateIso(new Date()));
  const [dayData, setDayData] = useState<DayDetail | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [unloggedPastDays, setUnloggedPastDays] = useState<{ date: string; unlogged: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Sheets
  const [activeLogInstance, setActiveLogInstance] = useState<ActivityInstance | null>(null);
  const [showOneOffModal, setShowOneOffModal] = useState<boolean>(false);

  // Active running timer state (instanceId -> start time)
  const [timerInstanceId, setTimerInstanceId] = useState<number | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<string | null>(null);

  // Daily Review Form State
  const [wentWell, setWentWell] = useState<string>('');
  const [wentWrong, setWentWrong] = useState<string>('');
  const [changeTomorrow, setChangeTomorrow] = useState<string>('');
  const [dayRating, setDayRating] = useState<number | null>(null);
  const [isRestDay, setIsRestDay] = useState<boolean>(false);
  const [reviewSaving, setReviewSaving] = useState<boolean>(false);
  const [reviewSavedMessage, setReviewSavedMessage] = useState<string | null>(null);

  // Live time ticker for current/next countdowns
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setCurrentTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Day Data and Goals
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, goalsList] = await Promise.all([
        api.getDayDetail(todayStr),
        api.getGoals(),
      ]);
      setDayData(detail);
      setGoals(goalsList);

      // Populate review form if exists
      if (detail.review) {
        setWentWell(detail.review.went_well || '');
        setWentWrong(detail.review.went_wrong || '');
        setChangeTomorrow(detail.review.change_tomorrow || '');
        setDayRating(detail.review.day_rating || null);
        setIsRestDay(detail.review.is_rest_day);
      }

      // Check last 3 days for unlogged past items
      const todayD = new Date(todayStr);
      const pastDates: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const pd = new Date(todayD);
        pd.setDate(pd.getDate() - i);
        pastDates.push(formatDateIso(pd));
      }

      if (pastDates.length > 0) {
        try {
          const summaries = await api.getDaysSummary(pastDates[pastDates.length - 1], pastDates[0]);
          const unloggedDays = summaries
            .filter((s) => s.unlogged_count > 0)
            .map((s) => ({ date: s.date, unlogged: s.unlogged_count }));
          setUnloggedPastDays(unloggedDays);
        } catch {
          // Ignore
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load today data');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal if triggered externally (e.g. from notification click)
  useEffect(() => {
    if (selectedInstanceForLogId && dayData?.instances) {
      const match = dayData.instances.find((i) => i.id === selectedInstanceForLogId);
      if (match) {
        setActiveLogInstance(match);
      }
      if (onClearSelectedInstance) {
        onClearSelectedInstance();
      }
    }
  }, [selectedInstanceForLogId, dayData, onClearSelectedInstance]);

  // Schedule status: current, next, overdue
  const scheduleStatus = useMemo(() => {
    if (!dayData?.instances) {
      return { current: null, next: null, overdue: [], minutesUntilNext: null };
    }
    return getScheduleStatus(dayData.instances, currentTimeStr);
  }, [dayData?.instances, currentTimeStr]);

  // Today's focus categories (categories with pending items)
  const focusCategories = useMemo(() => {
    if (!dayData?.instances) return [];
    const pendingCats = new Set<string>();
    dayData.instances.forEach((i) => {
      if (i.status === 'pending') {
        pendingCats.add(i.category);
      }
    });
    return Array.from(pendingCats).slice(0, 3) as any[];
  }, [dayData?.instances]);

  // Night mode check: after 21:00 OR all items resolved OR review closed
  const isNightMode = useMemo(() => {
    const nowHour = parseInt(currentTimeStr.split(':')[0], 10);
    const allResolved = dayData ? dayData.counts.pending === 0 : false;
    const isClosed = dayData ? dayData.is_closed : false;
    return nowHour >= 21 || allResolved || isClosed;
  }, [currentTimeStr, dayData]);

  // Quick Action Handlers
  const handleQuickLog = async (
    instanceId: number,
    logData: {
      status: Status;
      rating?: number | null;
      notes?: string | null;
      actual_start?: string | null;
      actual_end?: string | null;
      duration_minutes?: number | null;
      metric_value?: number | null;
    }
  ) => {
    try {
      await api.logInstance(instanceId, logData);
      await loadData();
    } catch (err: any) {
      alert(`Error logging activity: ${err.message}`);
    }
  };

  // Timer: Start / Finish
  const handleStartTimer = (instance: ActivityInstance) => {
    const nowTime = currentTimeStr;
    setTimerInstanceId(instance.id);
    setTimerStartTime(nowTime);
  };

  const handleFinishTimer = async (instance: ActivityInstance) => {
    const endNow = currentTimeStr;
    const startT = timerStartTime || instance.planned_start;
    let dur = 0;
    try {
      dur = Math.max(0, timeToMinutes(endNow) - timeToMinutes(startT));
    } catch {
      dur = 0;
    }

    setTimerInstanceId(null);
    setTimerStartTime(null);

    await handleQuickLog(instance.id, {
      status: 'completed',
      actual_start: startT,
      actual_end: endNow,
      duration_minutes: dur,
    });
  };

  // Save Daily Review
  const handleSaveReview = async (closeDay: boolean = false) => {
    setReviewSaving(true);
    setReviewSavedMessage(null);
    try {
      await api.upsertDailyReview(todayStr, {
        went_well: wentWell.trim() || null,
        went_wrong: wentWrong.trim() || null,
        change_tomorrow: changeTomorrow.trim() || null,
        day_rating: dayRating,
        is_rest_day: isRestDay,
        close_day: closeDay,
      });
      setReviewSavedMessage(closeDay ? 'Day closed successfully!' : 'Review saved!');
      setTimeout(() => setReviewSavedMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to save review: ${err.message}`);
    } finally {
      setReviewSaving(false);
    }
  };

  // Bulk Resolve pending for a past date or today
  const handleResolvePending = async (dateToResolve: string, newStatus: 'missed' | 'skipped') => {
    try {
      await api.resolvePending(dateToResolve, newStatus);
      await loadData();
    } catch (err: any) {
      alert(`Failed to resolve items: ${err.message}`);
    }
  };

  if (loading && !dayData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-sm">Loading your day...</span>
        </div>
      </div>
    );
  }

  if (error && !dayData) {
    return (
      <div className="flex-1 p-6 max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Unable to load today's schedule</h2>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { current, next, overdue, minutesUntilNext } = scheduleStatus;
  const dayInfo = dayData?.day_info;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:py-6 md:px-8 max-w-5xl mx-auto space-y-4 md:space-y-6 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
      {/* 1. Mobile-First Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {dayInfo?.state === 'active'
                ? `DAY ${dayInfo.day_number} / ${dayInfo.total_days}`
                : dayInfo?.state === 'before'
                ? `Starts in ${dayInfo.days_until_start} days`
                : 'Challenge Finished'}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {formatDateDisplay(todayStr)}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {getGreeting(settings?.user_name || 'Santhosh')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Let's execute today.</p>
        </div>

        {/* Progress Ring & Stats (Compact Card) */}
        <div className="flex items-center gap-4 bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shrink-0 shadow-sm backdrop-blur-sm">
          <ProgressRing
            percent={dayData?.is_closed ? dayData.score : dayData?.live_progress ?? null}
            subtitle={dayData?.is_closed ? 'Score' : 'Done'}
            size={68}
            strokeWidth={7}
          />
          <div className="flex flex-col gap-1 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="font-semibold text-white">{dayData?.counts.completed || 0} completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
              <span>{dayData?.counts.partial || 0} partial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0"></span>
              <span>{dayData?.counts.pending || 0} pending</span>
            </div>
            {dayData && dayData.counts.skipped > 0 && (
              <div className="text-[11px] text-slate-400">
                {dayData.counts.skipped} skipped
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Needs an Answer Banner (Unlogged past items, last 3 days) */}
      {unloggedPastDays.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Needs an answer</p>
              <p className="text-xs text-amber-300/80">
                You have unlogged items from {unloggedPastDays.map((d) => formatDateDisplay(d.date).split(',')[0]).join(', ')}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => handleResolvePending(unloggedPastDays[0].date, 'skipped')}
              className="flex-1 md:flex-initial h-10 px-3 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors"
            >
              Skip rest
            </button>
            <button
              onClick={() => handleResolvePending(unloggedPastDays[0].date, 'missed')}
              className="flex-1 md:flex-initial h-10 px-3 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
            >
              Mark missed
            </button>
          </div>
        </div>
      )}

      {/* 3. Overdue Banner (for today's past pending items) */}
      {overdue.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium">
              {overdue.length} activity item{overdue.length > 1 ? 's' : ''} past planned time
            </span>
          </div>
          <button
            onClick={() => handleResolvePending(todayStr, 'skipped')}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Skip past items
          </button>
        </div>
      )}

      {/* 4. Current & Up Next Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CURRENT ACTIVITY (HERO CARD - HIGHEST VISUAL PRIORITY) */}
        <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-emerald-500/40 shadow-xl shadow-emerald-950/20 flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Current Activity
              </span>
              {current && <CategoryBadge category={current.category} size="md" />}
            </div>

            {current ? (
              <>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight">
                  {current.title}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300 mb-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {formatTimeDisplay(current.planned_start)}
                    {current.planned_end ? ` – ${formatTimeDisplay(current.planned_end)}` : ''}
                  </span>
                  {current.metric_name && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 text-[11px]">
                      {current.metric_name}
                    </span>
                  )}
                </div>
                {current.description && (
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                    {current.description}
                  </p>
                )}
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-base font-bold text-slate-200">Nothing planned right now</p>
                <p className="text-xs text-slate-400 mt-1">Enjoy your free space or check Up Next below.</p>
              </div>
            )}
          </div>

          {current && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              {/* Primary 3 Large Status Action Buttons (DONE, PARTIAL, MISSED - thumb-friendly >=48px) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLog(current.id, { status: 'completed' })}
                  className="h-12 min-h-[48px] rounded-2xl text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>DONE</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLog(current.id, { status: 'partial' })}
                  className="h-12 min-h-[48px] rounded-2xl text-xs sm:text-sm font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>PARTIAL</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLog(current.id, { status: 'missed' })}
                  className="h-12 min-h-[48px] rounded-2xl text-xs sm:text-sm font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>MISSED</span>
                </button>
              </div>

              {/* Secondary Controls: Timer & Detailed Metric Log */}
              <div className="flex items-center gap-2">
                {timerInstanceId === current.id ? (
                  <button
                    type="button"
                    onClick={() => handleFinishTimer(current)}
                    className="flex-1 h-11 min-h-[44px] rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all flex items-center justify-center gap-2 animate-pulse shadow-md shadow-rose-500/25"
                  >
                    <Square className="w-4 h-4" />
                    <span>FINISH TIMER ({timerStartTime})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartTimer(current)}
                    className="flex-1 h-11 min-h-[44px] rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-700/60 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Start Timer</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveLogInstance(current)}
                  className="h-11 min-h-[44px] px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all border border-slate-800 active:scale-95"
                >
                  More...
                </button>
              </div>
            </div>
          )}
        </div>

        {/* UP NEXT CARD */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md flex flex-col justify-between min-h-[170px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Up Next
              </span>
              {next && <CategoryBadge category={next.category} size="sm" />}
            </div>

            {next ? (
              <>
                <h3 className="text-lg font-bold text-white mb-1">{next.title}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {formatTimeDisplay(next.planned_start)}
                  {next.planned_end ? ` – ${formatTimeDisplay(next.planned_end)}` : ''}
                </p>
                {minutesUntilNext !== null && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Starts in {minutesUntilNext} min</span>
                  </div>
                )}
              </>
            ) : (
              <div className="py-4">
                <p className="text-base font-semibold text-slate-300">No more planned activities</p>
                <p className="text-xs text-slate-400 mt-0.5">All scheduled activities for today are finished.</p>
              </div>
            )}
          </div>

          {next && (
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Ready when you are</span>
              <button
                onClick={() => setActiveLogInstance(next)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Log ahead
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Focus Chips & Active Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Focus Categories */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Today's Focus
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {focusCategories.length > 0 ? (
              focusCategories.map((cat) => (
                <CategoryBadge key={cat} category={cat} size="md" />
              ))
            ) : (
              <span className="text-xs text-slate-400">All focus areas covered today</span>
            )}
          </div>
        </div>

        {/* Top Active Goals */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Goals
            </span>
            <span className="text-xs text-slate-400">{goals.length} tracking</span>
          </div>
          <div className="space-y-2">
            {goals.slice(0, 3).map((g) => (
              <div key={g.id} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-200 truncate">{g.title}</span>
                  <span className="text-slate-400 font-mono shrink-0 ml-2">
                    {g.current_value} / {g.target_value} {g.unit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, g.progress_percent)}%` }}
                  />
                </div>
              </div>
            ))}
            {goals.length === 0 && (
              <p className="text-xs text-slate-400">No active goals yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* 6. Today's Timeline */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Today's Schedule
            <span className="text-xs text-slate-400 font-normal">
              ({dayData?.instances.length || 0} activities)
            </span>
          </h2>
          <button
            onClick={() => setShowOneOffModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add task</span>
          </button>
        </div>

        <div className="space-y-2">
          {dayData?.instances.map((inst) => {
            const isCompleted = inst.status === 'completed';
            const isPartial = inst.status === 'partial';
            const isMissed = inst.status === 'missed';
            const isSkipped = inst.status === 'skipped';
            const isPending = inst.status === 'pending';

            return (
              <div
                key={inst.id}
                onClick={() => setActiveLogInstance(inst)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-slate-900/60 border-emerald-500/20 hover:border-emerald-500/40'
                    : isPartial
                    ? 'bg-slate-900/60 border-amber-500/20 hover:border-amber-500/40'
                    : isMissed
                    ? 'bg-slate-900/40 border-rose-500/20 opacity-75'
                    : isSkipped
                    ? 'bg-slate-900/30 border-slate-800/60 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status Indicator Icon */}
                  <div className="shrink-0">
                    {isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isPartial && (
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isMissed && (
                      <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isSkipped && (
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isPending && (
                      <div className="w-6 h-6 rounded-full border border-slate-700 text-slate-400 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${
                        isCompleted || isSkipped ? 'text-slate-300' : 'text-white'
                      }`}>
                        {inst.title}
                      </span>
                      {inst.overridden && (
                        <span className="text-[10px] px-1.5 rounded bg-slate-800 text-slate-400">
                          overridden
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                      <span className="font-mono">{formatTimeDisplay(inst.planned_start)}</span>
                      {inst.planned_end && (
                        <span className="font-mono">– {formatTimeDisplay(inst.planned_end)}</span>
                      )}
                      <span>•</span>
                      <CategoryBadge category={inst.category} size="sm" />
                      {inst.metric_name && inst.metric_value !== null && (
                        <span className="font-mono text-emerald-400">
                          {inst.metric_value} {inst.metric_unit || inst.metric_name}
                        </span>
                      )}
                      {inst.duration_minutes != null && inst.duration_minutes > 0 && (
                        <span>({inst.duration_minutes}m)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs text-slate-400 capitalize hidden sm:inline">
                    {inst.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Night Mode & Daily Review (Always accessible, highlighted at night/completion) */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isNightMode
          ? 'bg-slate-900/90 border-slate-700 shadow-xl'
          : 'bg-slate-900/30 border-slate-800/60'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Daily Review & Reflection</h2>
          </div>
          {dayData?.score !== null && dayData?.score !== undefined && (
            <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Score: {dayData.score}%</span>
            </div>
          )}
        </div>

        {reviewSavedMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{reviewSavedMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                What went well?
              </label>
              <textarea
                rows={3}
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                placeholder="Wins, focus, healthy choices..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                What went wrong?
              </label>
              <textarea
                rows={3}
                value={wentWrong}
                onChange={(e) => setWentWrong(e.target.value)}
                placeholder="Distractions, friction, energy dips..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                What will I change tomorrow?
              </label>
              <textarea
                rows={3}
                value={changeTomorrow}
                onChange={(e) => setChangeTomorrow(e.target.value)}
                placeholder="One concrete adjustment..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
            {/* Rating and Rest Day */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Day Rating:</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDayRating(dayRating === s ? null : s)}
                      className={`min-w-[44px] h-11 rounded-xl text-sm font-bold transition-all ${
                        dayRating === s
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/50'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95'
                      }`}
                    >
                      {s}★
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="rest-day-toggle"
                  checked={isRestDay}
                  onChange={(e) => setIsRestDay(e.target.checked)}
                  className="w-5 h-5 rounded-lg bg-slate-950 border-slate-800 text-purple-500 focus:ring-0"
                />
                <label htmlFor="rest-day-toggle" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                  Rest day (excluded from score)
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => handleSaveReview(false)}
                className="flex-1 sm:flex-initial h-12 min-h-[48px] px-5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all text-center active:scale-95"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={reviewSaving}
                onClick={() => handleSaveReview(true)}
                className="flex-1 sm:flex-initial h-12 min-h-[48px] px-6 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25 transition-all text-center active:scale-95"
              >
                {dayData?.review?.closed_at ? 'Update & Close' : 'Close Day'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QuickLogModal
        instance={activeLogInstance}
        onClose={() => setActiveLogInstance(null)}
        onSave={handleQuickLog}
      />

      {showOneOffModal && (
        <OneOffTaskModal
          dateStr={todayStr}
          onClose={() => setShowOneOffModal(false)}
          onCreated={loadData}
          onCreate={api.createOneOffInstance}
        />
      )}
    </div>
  );
};
