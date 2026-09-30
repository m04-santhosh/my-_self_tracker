import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckSquare, BarChart2, GitCompare,
  Target, DollarSign, Settings as SettingsIcon, Clock, AlertTriangle,
  Menu, X, Sparkles, Database, Download, ShieldCheck
} from 'lucide-react';
import { formatTimeDisplay } from '../utils/dates';
import { api } from '../services/api';

interface NavigationProps {
  isBackendOffline?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ isBackendOffline }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setCurrentTime(timeStr);
    };
    update();
    const interval = setInterval(update, 20000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const desktopNavItems = [
    { to: '/', label: 'Today', icon: CheckSquare },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/history', label: 'History', icon: Clock },
    { to: '/goals', label: 'Goals', icon: Target },
    { to: '/finance', label: 'Finance', icon: DollarSign },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/compare', label: 'Compare', icon: GitCompare },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Exactly 5 primary tabs for mobile bottom navigation (thumb-friendly, equal spacing)
  const mobilePrimaryTabs = [
    { to: '/', label: 'Today', icon: CheckSquare },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/history', label: 'History', icon: Clock },
    { to: '/goals', label: 'Goals', icon: Target },
    { to: '/finance', label: 'Finance', icon: DollarSign },
  ];

  // Secondary items accessed via the Mobile Menu Drawer
  const mobileDrawerItems = [
    { to: '/analytics', label: 'Analytics & Trends', icon: BarChart2, desc: 'Streaks, bounce-back & sleep metrics' },
    { to: '/compare', label: 'Period Compare', icon: GitCompare, desc: 'A/B date range metric differences' },
    { to: '/settings', label: 'Preferences & Settings', icon: SettingsIcon, desc: 'Notifications, quiet hours & targets' },
  ];

  const handleQuickBackup = async () => {
    try {
      const res = await api.createBackup();
      setBackupStatus(`Backup: ${res.backup_filename}`);
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    }
  };

  const handleQuickExport = async () => {
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
    <>
      {/* Backend offline warning banner */}
      {isBackendOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-300 text-xs flex items-center justify-between z-50 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Backend not responding • Check server or connection
            </span>
          </div>
        </div>
      )}

      {/* Mobile Top App Bar (Compact, Safe-Area aware for iPhone Notch / Dynamic Island) */}
      <header className="md:hidden flex items-center justify-between px-4 pt-safe pb-2.5 bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-xl z-30 sticky top-0 w-full shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"></div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-white">LifeOS 90</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              92D
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono font-medium">
            {currentTime ? formatTimeDisplay(currentTime) : '--:--'}
          </span>
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open More Menu"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white bg-slate-900 border border-slate-800 active:scale-95 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Slide-up Bottom Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-150">
          <div
            className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl pb-safe animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag indicator handle */}
            <div className="flex justify-center pb-1">
              <div className="w-12 h-1.5 rounded-full bg-slate-700"></div>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">More Sections & Tools</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation links */}
            <div className="space-y-2">
              {mobileDrawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-200 hover:bg-slate-800/60 active:scale-[0.98]'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold block">{item.label}</span>
                      <span className="text-[11px] text-slate-400">{item.desc}</span>
                    </div>
                  </NavLink>
                );
              })}
            </div>

            {/* Quick Actions: Backup & Export */}
            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                Data Safety
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleQuickBackup}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                >
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Snapshot DB</span>
                </button>
                <button
                  onClick={handleQuickExport}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span>Export JSON</span>
                </button>
              </div>
              {backupStatus && (
                <p className="text-[11px] text-emerald-400 font-mono mt-2 text-center animate-pulse">
                  {backupStatus}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
              Santhosh • 90-Day Challenge • SQLite WAL Engine
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Preserved full desktop navigation for md: and up) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950/70 p-5 shrink-0 justify-between select-none">
        <div>
          {/* Brand & live clock */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LifeOS 90
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {currentTime ? formatTimeDisplay(currentTime) : '--:--'}
              </span>
            </div>
            <p className="text-xs text-slate-400">92-Day Personal Operating System</p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-900 text-xs text-slate-400 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span>Oct 1 – Dec 31, 2026</span>
            <span className="font-mono text-slate-400">Asia/Kolkata</span>
          </div>
          <div className="text-[11px] text-slate-400">Santhosh • Calm & Focused</div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 Primary Tabs with Minimum 44px Touch Targets & Safe Area) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl z-30 px-1 py-1.5 flex items-center justify-around pb-safe">
        {mobilePrimaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 px-1 rounded-2xl text-[10px] font-bold transition-all active:scale-95 ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
