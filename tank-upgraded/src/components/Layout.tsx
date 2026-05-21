import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import {
  Bell,
  ChevronDown,
  Calendar,
  MapPin,
  LogOut,
  AlertTriangle,
  Info,
  User,
  Settings,
  HelpCircle,
  CheckCheck
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { getUnreadAlerts } from '../api';
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
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-end px-6 gap-4 shrink-0 shadow-sm z-30">
          
          {/* Location selector */}
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all shadow-sm">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">All Locations</span>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
          </button>

          {/* Date range */}
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all shadow-sm">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">01 Jan 2024 - 31 Dec 2024</span>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Notifications */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => setAlertsOpen((v) => !v)}
              className={`relative p-2 rounded-full transition-colors ${alertsOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Alerts Dropdown */}
            {alertsOpen && (
              <div className="absolute right-0 top-12 w-[380px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Alerts & Notifications</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{unreadCount} unread alerts</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="max-h-[420px] overflow-auto">
                  {alertsQ.isLoading ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-slate-400">Loading alerts...</p>
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No unread alerts</p>
                      <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {alerts.map((alert: any) => {
                        const severity = alert.severity?.toLowerCase() ?? 'info';
                        const isHigh = severity === 'high' || severity === 'critical';
                        const isMedium = severity === 'medium' || severity === 'warning';
                        const targetTankId = alert.tankId ?? alert.tank;

                        return (
                          <button
                            key={alert.id}
                            onClick={() => {
                              setAlertsOpen(false);
                              if (targetTankId) {
                                navigate(`/tanks/${targetTankId}`);
                              } else {
                                navigate('/alerts');
                              }
                            }}
                            className="w-full text-left p-4 hover:bg-blue-50/50 transition-colors flex items-start gap-3 group relative"
                          >
                            {/* Unread indicator dot */}
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 opacity-100" />

                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ml-1 ${
                              isHigh ? 'bg-red-100' : isMedium ? 'bg-orange-100' : 'bg-blue-100'
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
                                <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                                  {alert.title ?? alert.type ?? 'Inspection Alert'}
                                </p>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {alert.message ?? alert.detail ?? 'No additional details'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {targetTankId && (
                                  <span className="text-[10px] text-slate-600 font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                                    {targetTankId}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Just now'}
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
                    className="w-full text-xs text-blue-600 hover:text-blue-800 font-semibold text-center"
                  >
                    Open Alerts Center →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-3 border-l border-slate-200 hover:bg-slate-50 rounded-lg pr-2 py-1 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-white">
                {initials}
              </div>

              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-700 leading-none">
                  {user?.email?.split('@')[0] ?? 'User'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide uppercase">
                  {user?.role ?? 'Engineer'}
                </p>
              </div>

              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="px-4 py-4 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-bold text-slate-800">
                    {user?.email?.split('@')[0] ?? 'User'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Standard Enterprise Nav Options */}
                <div className="p-2 border-b border-slate-100">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">My Profile</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Preferences</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Help & Support</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Logout</span>
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