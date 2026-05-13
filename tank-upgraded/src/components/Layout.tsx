import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import {
  Bell,
  ChevronDown,
  Calendar,
  MapPin,
  LogOut,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { getUnreadAlerts } from '../api';
import { AlertTriangle, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function Layout() {
  const { logout, user, loggedIn } = useAuth();

  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const alertsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {

    if (
      userMenuRef.current &&
      !userMenuRef.current.contains(event.target as Node)
    ) {
      setUserMenuOpen(false);
    }

    if (
      alertsRef.current &&
      !alertsRef.current.contains(event.target as Node)
    ) {
      setAlertsOpen(false);
    }
  }

  document.addEventListener('mousedown', handleClickOutside);

  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, []);
const alertsQ = useQuery({
  queryKey: ['layout-alerts'],
  queryFn: async () => {
    const res = await getUnreadAlerts(0, 5);
    return (res as any)?.data ?? res;
  },
  refetchInterval: 30000,
});

const alerts = alertsQ.data?.content ?? [];

const unreadCount = alerts.length;
  if (!loggedIn) return null;

  const email = user?.email ?? 'User';

  const initials =
    email !== 'User'
      ? email
          .split('@')[0]
          .split('.')
          .map((p) => p[0]?.toUpperCase())
          .join('')
      : 'U';

  return (
    <div className="flex min-h-screen bg-[#f0f4f8]">

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-end px-6 gap-3 shrink-0 shadow-sm">

          {/* Location selector */}
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <MapPin className="w-4 h-4 text-slate-400" />

            <span className="text-sm">
              All Locations
            </span>

            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Date range */}
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <span className="text-sm">
              01 Jan 2024 - 31 Dec 2024
            </span>

            <Calendar className="w-4 h-4 text-slate-400" />
          </button>

          {/* Notifications */}
<div
  className="relative"
  ref={alertsRef}
>

  <button
    onClick={() => setAlertsOpen((v) => !v)}
    className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors"
  >
    <Bell className="w-5 h-5" />

    {unreadCount > 0 && (
      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
        {unreadCount}
      </span>
    )}
  </button>

  {/* Dropdown */}
  {alertsOpen && (
    <div className="absolute right-0 top-12 w-[360px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">

        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Alerts & Notifications
          </h3>

          <p className="text-[11px] text-slate-500 mt-0.5">
            {unreadCount} unread alerts
          </p>
        </div>

        <button
          onClick={() => {
            setAlertsOpen(false);
            navigate('/alerts');
          }}
          className="text-xs text-blue-600 hover:underline"
        >
          View All
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[420px] overflow-auto">

        {alertsQ.isLoading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />

            <p className="text-sm font-medium text-slate-700">
              No unread alerts
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Everything looks good
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">

            {alerts.map((alert: any) => {

              const severity =
                alert.severity?.toLowerCase() ?? 'info';

              const isHigh =
                severity === 'high' ||
                severity === 'critical';

              const isMedium =
                severity === 'medium' ||
                severity === 'warning';

              return (
                <button
                  key={alert.id}
                  onClick={() => {
                    setAlertsOpen(false);
                    navigate('/alerts');
                  }}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3"
                >

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isHigh
                      ? 'bg-red-100'
                      : isMedium
                      ? 'bg-orange-100'
                      : 'bg-blue-100'
                  }`}>
                    {isHigh ? (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    ) : isMedium ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">

                    <div className="flex items-center justify-between gap-2">

                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {alert.title ??
                          alert.type ??
                          'Inspection Alert'}
                      </p>

                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-0.5" />
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {alert.message ??
                        alert.detail ??
                        'No additional details'}
                    </p>

                    <div className="flex items-center gap-2 mt-2">

                      {(alert.tankId || alert.tank) && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {alert.tankId ?? alert.tank}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400">
                        {alert.createdAt
                          ? new Date(alert.createdAt).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <button
          onClick={() => {
            setAlertsOpen(false);
            navigate('/alerts');
          }}
          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Open Alerts Center
        </button>
      </div>
    </div>
  )}
</div>

          {/* User Menu */}
          <div
            className="relative"
            ref={userMenuRef}
          >

            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-lg pr-2 py-1 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>

              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-700 leading-none">
                  {user?.email?.split('@')[0] ?? 'User'}
                </p>

                <p className="text-[10px] text-slate-400 mt-0.5">
                  {user?.role ?? '—'}
                </p>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">

                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">

                  <p className="text-sm font-semibold text-slate-800">
                    {user?.email?.split('@')[0] ?? 'User'}
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Menu */}
                <div className="p-2">

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />

                    <span className="font-medium">
                      Logout
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}