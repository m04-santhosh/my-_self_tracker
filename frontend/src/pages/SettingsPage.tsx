import React, { useState } from 'react';
import {
  Bell, Shield, Clock, Database, Download,
  CheckCircle2, AlertTriangle, Save, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { Settings } from '../types';

interface SettingsPageProps {
  settings: Settings | null;
  onSettingsUpdated: () => void;
  notificationPermission: NotificationPermission;
  onRequestNotificationPermission: () => Promise<NotificationPermission>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSettingsUpdated,
  notificationPermission,
  onRequestNotificationPermission,
}) => {
  const [userName, setUserName] = useState(settings?.user_name || 'Santhosh');
  const [notifEnabled, setNotifEnabled] = useState(settings?.notifications_enabled ?? true);
  const [reminderMinutes, setReminderMinutes] = useState(settings?.reminder_minutes_before ?? 5);
  const [endReminder, setEndReminder] = useState(settings?.end_reminder_enabled ?? true);
  const [quietStart, setQuietStart] = useState(settings?.quiet_hours_start || '23:30');
  const [quietEnd, setQuietEnd] = useState(settings?.quiet_hours_end || '06:00');
  const [soundEnabled, setSoundEnabled] = useState(settings?.sound_enabled ?? false);
  const [threshold, setThreshold] = useState(settings?.success_threshold ?? 70);
  const [fiTarget, setFiTarget] = useState<string>(
    settings?.fi_target_monthly_income_paise
      ? String(settings.fi_target_monthly_income_paise / 100)
      : ''
  );

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const targetPaise = fiTarget ? Math.round(parseFloat(fiTarget) * 100) : null;
      await api.updateSettings({
        user_name: userName.trim() || 'Santhosh',
        notifications_enabled: notifEnabled,
        reminder_minutes_before: Number(reminderMinutes),
        end_reminder_enabled: endReminder,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        sound_enabled: soundEnabled,
        success_threshold: Number(threshold),
        fi_target_monthly_income_paise: targetPaise,
      });
      setSavedMsg('Settings saved successfully!');
      setTimeout(() => setSavedMsg(null), 4000);
      onSettingsUpdated();
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await api.createBackup();
      setBackupMsg(`Database backup created: ${res.backup_filename}`);
      setTimeout(() => setBackupMsg(null), 6000);
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:py-6 md:px-8 max-w-4xl mx-auto space-y-4 md:space-y-6 pb-28 md:pb-12 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure notifications, thresholds, quiet hours, and data safety.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {backupMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Honest Notification Note */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-semibold text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Honest Browser Reminder Notice</span>
        </div>
        <p className="text-amber-200/90 leading-relaxed">
          Web browsers only allow notifications when the app tab is open in your browser. LifeOS 90 avoids spamming: if you close the tab and return later, it will not fire a storm of old notifications, but will show a calm "Needs an answer" banner for unlogged activities.
        </p>
        <div className="pt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={onRequestNotificationPermission}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors"
          >
            {notificationPermission === 'granted'
              ? 'Permission Granted'
              : 'Enable Browser Notifications'}
          </button>
          <span className="text-[11px] text-amber-300/80">
            Current status: <span className="font-mono font-semibold">{notificationPermission}</span>
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile & Journey */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Personal & 90-Day Challenge
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Daily Success Threshold (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 70)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Score required for a successful streak day (default 70%).
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <div>
              <span className="block font-medium text-slate-300">Journey Dates:</span>
              <span className="font-mono">{settings?.start_date} to {settings?.end_date} (92 days)</span>
            </div>
            <div>
              <span className="block font-medium text-slate-300">Configured Timezone:</span>
              <span className="font-mono">{settings?.timezone || 'Asia/Kolkata'}</span>
            </div>
          </div>
        </div>

        {/* Notifications & Reminders */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            Reminders & Quiet Hours
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-white block">Enable Notifications</span>
                <span className="text-xs text-slate-400">Receive schedule prompts in browser</span>
              </div>
              <input
                type="checkbox"
                checked={notifEnabled}
                onChange={(e) => setNotifEnabled(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div>
                <span className="text-sm font-medium text-white block">Reminder Minutes Before Start</span>
                <span className="text-xs text-slate-400">Advance warning before an activity begins</span>
              </div>
              <input
                type="number"
                min="0"
                max="60"
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-slate-600"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div>
                <span className="text-sm font-medium text-white block">Ask on End Reminder</span>
                <span className="text-xs text-slate-400">Prompt "How did it go?" when a session ends</span>
              </div>
              <input
                type="checkbox"
                checked={endReminder}
                onChange={(e) => setEndReminder(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Quiet Hours Start</label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Quiet Hours End</label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Finance Target */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Financial Independence Target
          </h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Monthly Income Target (Rupees, optional)
            </label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 50000"
              value={fiTarget}
              onChange={(e) => setFiTarget(e.target.value)}
              className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-600"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Used for FI progress tracking on the Finance page.
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all text-center"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Data Management & Backup */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          Data Safety & Backups
        </h2>
        <p className="text-xs text-slate-400">
          Your life data is safely stored in local SQLite WAL mode (<code>database/lifeos.db</code>).
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleBackup}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Create DB Snapshot</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export All JSON Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
