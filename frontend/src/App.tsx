import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Bell, X, AlertTriangle } from 'lucide-react';
import { api } from './services/api';
import { Settings } from './types';
import { useNotifications } from './hooks/useNotifications';
import { Navigation } from './components/Navigation';

import { TodayPage } from './pages/TodayPage';
import { SchedulePage } from './pages/SchedulePage';
import { HistoryPage } from './pages/HistoryPage';
import { GoalsPage } from './pages/GoalsPage';
import { FinancePage } from './pages/FinancePage';
import { ComparePage } from './pages/ComparePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [selectedInstanceForLogId, setSelectedInstanceForLogId] = useState<number | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setIsBackendOffline(false);
    } catch {
      setIsBackendOffline(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    const interval = setInterval(loadSettings, 60000);
    return () => clearInterval(interval);
  }, [loadSettings]);

  const {
    permission,
    requestPermission,
    toastMessage,
    missedBanner,
    clearMissedBanner,
  } = useNotifications(settings, (instanceId) => {
    setSelectedInstanceForLogId(instanceId);
  });

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#0b0f17] text-slate-100 overflow-hidden font-sans antialiased">
        <Navigation isBackendOffline={isBackendOffline} />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Missed reminders banner if returning after tab sleep */}
          {missedBanner && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-amber-200 text-xs flex items-center justify-between z-30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  You missed {missedBanner.count} activity reminder{missedBanner.count > 1 ? 's' : ''} while this tab was inactive. Check your schedule.
                </span>
              </div>
              <button
                onClick={clearMissedBanner}
                className="text-amber-400 hover:text-amber-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* In-app notification toast */}
          {toastMessage && (
            <div className="fixed top-4 right-4 z-50 bg-slate-900 border border-emerald-500/30 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 max-w-sm">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Bell className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold block text-slate-200">Activity Reminder</span>
                <span className="text-slate-300">{toastMessage}</span>
              </div>
            </div>
          )}

          {/* App Routing */}
          <Routes>
            <Route
              path="/"
              element={
                <TodayPage
                  settings={settings}
                  selectedInstanceForLogId={selectedInstanceForLogId}
                  onClearSelectedInstance={() => setSelectedInstanceForLogId(null)}
                />
              }
            />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:date" element={<HistoryPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  settings={settings}
                  onSettingsUpdated={loadSettings}
                  notificationPermission={permission}
                  onRequestNotificationPermission={requestPermission}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
