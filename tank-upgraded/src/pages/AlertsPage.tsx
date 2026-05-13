import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  Filter,
  Info,
  RefreshCcw,
} from 'lucide-react';

import {
  acknowledgeAlert,
  bulkAcknowledgeAlerts,
  getAlerts,
} from '../api';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function severityStyles(severity?: string) {
  const s = severity?.toLowerCase();

  if (s === 'high' || s === 'critical') {
    return {
      badge: 'bg-red-100 text-red-700',
      iconBg: 'bg-red-100',
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
    };
  }

  if (s === 'medium' || s === 'warning') {
    return {
      badge: 'bg-orange-100 text-orange-700',
      iconBg: 'bg-orange-100',
      icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    };
  }

  return {
    badge: 'bg-blue-100 text-blue-700',
    iconBg: 'bg-blue-100',
    icon: <Info className="w-4 h-4 text-blue-600" />,
  };
}

function formatDate(date?: string) {
  if (!date) return '—';

  return new Date(date).toLocaleString();
}

export default function AlertsPage() {
  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const alertsQ = useQuery({
    queryKey: ['alerts', page, unreadOnly],
    queryFn: () => getAlerts(page, 20, unreadOnly),
    staleTime: 30000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: bulkAcknowledgeAlerts,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const pageData = alertsQ.data;

  const alerts = useMemo(() => {
    return (pageData?.content ?? []) as any[];
  }, [pageData]);

  const unreadIds = alerts
    .filter((a) => !a.read)
    .map((a) => a.id);

  return (
    <div className="p-6 animate-page space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">
              Alerts & Notifications
            </h1>
          </div>

          <p className="text-sm text-slate-500 mt-1">
            Monitor inspection alerts, risk notifications and integrity warnings
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() => alertsQ.refetch()}
            className="btn-secondary text-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>

          <button
            disabled={unreadIds.length === 0 || bulkMutation.isPending}
            onClick={() => bulkMutation.mutate(unreadIds)}
            className="btn-primary text-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="tims-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />

          <button
            onClick={() => setUnreadOnly(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              !unreadOnly
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Alerts
          </button>

          <button
            onClick={() => setUnreadOnly(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              unreadOnly
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unread Only
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Total Alerts: {pageData?.totalElements ?? 0}
        </div>
      </div>

      {/* Content */}
      {alertsQ.isLoading ? (
        <Spinner />
      ) : alertsQ.error ? (
        <div className="tims-card p-5 text-red-600 text-sm">
          Failed to load alerts
        </div>
      ) : alerts.length === 0 ? (
        <div className="tims-card p-10 text-center">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">
            No alerts found
          </p>
          <p className="text-xs text-slate-500 mt-1">
            System notifications will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">

          {alerts.map((alert) => {
            const styles = severityStyles(alert.severity);

            return (
              <div
                key={alert.id}
                className={`tims-card p-4 border transition-all ${
                  !alert.read
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-4">

                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${styles.iconBg}`}
                  >
                    {styles.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">

                    <div className="flex items-center gap-2 flex-wrap">

                      <h3 className="text-sm font-semibold text-slate-800">
                        {alert.title ??
                          alert.type ??
                          alert.category ??
                          'Inspection Alert'}
                      </h3>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${styles.badge}`}
                      >
                        {alert.severity ?? 'INFO'}
                      </span>

                      {!alert.read && (
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-semibold">
                          NEW
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mt-1">
                      {alert.message ??
                        alert.detail ??
                        'No additional details'}
                    </p>

                    <div className="flex items-center gap-4 mt-3 flex-wrap">

                      {(alert.tankId || alert.tank) && (
                        <div className="text-xs text-slate-500">
                          Tank:{' '}
                          <span className="font-medium text-slate-700">
                            {alert.tankId ?? alert.tank}
                          </span>
                        </div>
                      )}

                      <div className="text-xs text-slate-400">
                        {formatDate(alert.createdAt)}
                      </div>

                      {alert.assignedTo && (
                        <div className="text-xs text-slate-500">
                          Assigned: {alert.assignedTo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!alert.read && (
                    <button
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="btn-secondary text-xs whitespace-nowrap"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">

            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="text-xs text-slate-500">
              Page {(pageData?.number ?? 0) + 1} of{' '}
              {pageData?.totalPages ?? 1}
            </div>

            <button
              disabled={page >= ((pageData?.totalPages ?? 1) - 1)}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}