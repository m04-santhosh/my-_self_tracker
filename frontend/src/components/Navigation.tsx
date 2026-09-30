import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar, CheckSquare, BarChart2, GitCompare,
  Target, DollarSign, Settings, Clock, AlertTriangle
} from 'lucide-react';
import { formatTimeDisplay } from '../utils/dates';

interface NavigationProps {
  isBackendOffline?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ isBackendOffline }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

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

  const navItems = [
    { to: '/', label: 'Today', icon: CheckSquare },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/history', label: 'History', icon: Clock },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/compare', label: 'Compare', icon: GitCompare },
    { to: '/goals', label: 'Goals', icon: Target },
    { to: '/finance', label: 'Finance', icon: DollarSign },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Backend offline warning banner */}
      {isBackendOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-amber-300 text-xs flex items-center justify-between z-50 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Backend not running - start it with <code>start.bat</code> or <code>uvicorn app.main:app --reload</code></span>
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md z-40 px-2 py-1.5 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-1 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        {/* Overflow dropdown or settings for mobile */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-300'
            }`
          }
        >
          <Settings className="w-4 h-4" />
          <span>More</span>
        </NavLink>
      </nav>
    </>
  );
};
