import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Calendar, CheckSquare, BarChart2, GitCompare,
  Target, DollarSign, Settings as SettingsIcon, Clock, AlertTriangle,
  Menu, X, Sparkles
} from 'lucide-react';
import { formatTimeDisplay } from '../utils/dates';

interface NavigationProps {
  isBackendOffline?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ isBackendOffline }) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setCurrentTime(timeStr);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/', label: 'Today', icon: CheckSquare },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/history', label: 'History', icon: Clock },
    { to: '/goals', label: 'Goals', icon: Target },
    { to: '/finance', label: 'Finance', icon: DollarSign },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/compare', label: 'Compare', icon: GitCompare },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Top 4 for direct bottom bar access
  const primaryBottomNav = [
    { to: '/', label: 'Today', icon: CheckSquare },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/history', label: 'History', icon: Clock },
    { to: '/goals', label: 'Goals', icon: Target },
  ];

  return (
    <>
      {/* Backend offline warning banner */}
      {isBackendOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-300 text-xs flex items-center justify-between z-50 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              Backend not running - check <code>start.bat</code>
            </span>
          </div>
        </div>
      )}

      {/* Mobile Top App Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md z-30 sticky top-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-base font-extrabold tracking-tight text-white">LifeOS 90</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            {currentTime ? formatTimeDisplay(currentTime) : '--:--'}
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Full Menu Slide-up / Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">All LifeOS Sections</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
              Santhosh • 90-Day Challenge (Oct 1 – Dec 31, 2026)
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
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
            {navItems.map((item) => {
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

      {/* Mobile Bottom Navigation Bar (Thumb Friendly with Haptic Feel) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-lg z-30 px-2 py-2 flex items-center justify-around pb-safe">
        {primaryBottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 px-2 rounded-xl text-[11px] font-semibold transition-all ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Finance direct access */}
        <NavLink
          to="/finance"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 px-2 rounded-xl text-[11px] font-semibold transition-all ${
              isActive
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <DollarSign className="w-5 h-5" />
          <span>Finance</span>
        </NavLink>

        {/* Menu Drawer Toggle */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 px-2 rounded-xl text-[11px] font-semibold transition-all ${
            mobileMenuOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
};
