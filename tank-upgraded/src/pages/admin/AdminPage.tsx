/**
 * AdminPage.tsx
 * All mock data removed. Every tab calls real backend via React Query.
 *
 * Endpoints consumed:
 *   GET    /api/admin/users                      → AdminUserDto[]
 *   POST   /api/admin/users/invite               → { email, role }
 *   PATCH  /api/admin/users/{id}                 → { role?, status? }
 *   GET    /api/admin/settings                   → SystemSettingDto[]
 *   PUT    /api/admin/settings                   → SystemSettingDto[]  (bulk save)
 *   GET    /api/admin/audit-log?page=0&size=20   → Page<AdminAuditEventDto>
 *   GET    /api/admin/notifications              → NotificationPreferenceDto[]
 *   PUT    /api/admin/notifications              → NotificationPreferenceDto[]
 *   GET    /api/admin/integrations               → IntegrationStatusDto[]
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import {
  User, Settings, ScrollText, Bell, Plug,
  Plus, Pencil, X, Check, Loader, AlertCircle,
  ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react'

// ── Types (mirror of backend DTOs) ───────────────────────────────────────────

interface AdminUserDto {
  id: number
  name: string
  email: string
  role: string
  status: 'Active' | 'Inactive' | 'Pending'
  lastLogin: string | null
}

interface SystemSettingDto {
  key: string
  label: string
  value: string
  description: string
  editable: boolean
}

interface AdminAuditEventDto {
  id: number
  action: string
  user: string
  time: string
  type: 'upload' | 'sign' | 'alert' | 'auth' | 'config' | 'reopen'
  entityId?: string
}

interface NotificationPreferenceDto {
  key: string
  label: string
  description: string
  enabled: boolean
  channel: 'email' | 'in-app' | 'both'
}

interface IntegrationStatusDto {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync: string | null
  configUrl?: string
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ['Users & Roles', 'System Settings', 'Audit Trail', 'Notifications', 'Integrations'] as const
type Tab = typeof TABS[number]

const TAB_ICONS: Record<Tab, React.ElementType> = {
  'Users & Roles':    User,
  'System Settings':  Settings,
  'Audit Trail':      ScrollText,
  'Notifications':    Bell,
  'Integrations':     Plug,
}

// ── Audit event styling ───────────────────────────────────────────────────────

const AUDIT_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  upload:  { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: <span className="text-blue-600 font-bold text-sm">↑</span> },
  sign:    { bg: 'bg-green-50',  border: 'border-green-200', icon: <Check className="w-4 h-4 text-green-600" /> },
  alert:   { bg: 'bg-red-50',    border: 'border-red-200',   icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
  auth:    { bg: 'bg-slate-50',  border: 'border-slate-200', icon: <span className="text-slate-600 text-sm">🔑</span> },
  config:  { bg: 'bg-amber-50',  border: 'border-amber-200', icon: <Settings className="w-4 h-4 text-amber-600" /> },
  reopen:  { bg: 'bg-orange-50', border: 'border-orange-200',icon: <RefreshCw className="w-4 h-4 text-orange-600" /> },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader className="w-6 h-6 text-blue-500 animate-spin" />
    </div>
  )
}

function ApiErr({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {msg}
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const ROLE_OPTIONS = [
  'Integrity Engineer', 'Sr. Integrity Engineer', 'EEMUA 159 Inspector',
  'Integrity Manager', 'Data Analyst', 'Administrator', 'Read Only',
]

const CHANNEL_OPTIONS: NotificationPreferenceDto['channel'][] = ['email', 'in-app', 'both']

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('Users & Roles')

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Administration</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure system-wide parameters and access control.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 mb-6">
        {TABS.map(tab => {
          const Icon = TAB_ICONS[tab]
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="max-w-6xl">
        {activeTab === 'Users & Roles'   && <UsersTab qc={qc} />}
        {activeTab === 'System Settings' && <SettingsTab qc={qc} />}
        {activeTab === 'Audit Trail'     && <AuditTab />}
        {activeTab === 'Notifications'   && <NotificationsTab qc={qc} />}
        {activeTab === 'Integrations'    && <IntegrationsTab />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Users & Roles
// ─────────────────────────────────────────────────────────────────────────────

function UsersTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState(ROLE_OPTIONS[0])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const usersQ = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<AdminUserDto[]>('/admin/users'),
    staleTime: 30_000,
  })

  const inviteMut = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      api.post<AdminUserDto>('/admin/users/invite', { email, role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setShowInvite(false)
      setInviteEmail('')
    },
  })

  const editMut = useMutation({
    mutationFn: ({ id, role, status }: { id: number; role: string; status: string }) =>
      api.patch<AdminUserDto>(`/admin/users/${id}`, { role, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditingId(null)
    },
  })

  const users: AdminUserDto[] = usersQ.data ?? []

  const startEdit = (u: AdminUserDto) => {
    setEditingId(u.id)
    setEditRole(u.role)
    setEditStatus(u.status)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">
          Active Directory
          {usersQ.isFetching && <Loader className="inline w-3.5 h-3.5 ml-2 text-slate-400 animate-spin" />}
        </h3>
        <button
          onClick={() => setShowInvite(true)}
          className="btn-primary text-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Invite User
        </button>
      </div>

      {/* Invite row */}
      {showInvite && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Email address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-56">
            <label className="text-xs font-medium text-slate-600 mb-1 block">Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button
            onClick={() => inviteMut.mutate({ email: inviteEmail, role: inviteRole })}
            disabled={!inviteEmail.trim() || inviteMut.isPending}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {inviteMut.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Send Invite
          </button>
          <button onClick={() => setShowInvite(false)} className="btn-secondary text-sm">
            <X className="w-3.5 h-3.5" />
          </button>
          {inviteMut.error && (
            <p className="text-xs text-red-600">{(inviteMut.error as Error).message}</p>
          )}
        </div>
      )}

      {usersQ.isLoading ? <Spinner /> : usersQ.error ? (
        <div className="p-5"><ApiErr msg={(usersQ.error as Error).message} /></div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider">
              <th className="px-6 py-3 font-semibold">User</th>
              <th className="px-6 py-3 font-semibold">Role</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Last Activity</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-slate-400">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 border border-white shadow-sm shrink-0">
                      {initials(u.name)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {editingId === u.id ? (
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="border border-blue-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-600">{u.role}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === u.id ? (
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value)}
                      className="border border-blue-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {['Active', 'Inactive'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <Badge variant={u.status === 'Active' ? 'good' : u.status === 'Pending' ? 'planned' : 'info'}>
                      {u.status}
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {u.lastLogin ?? <span className="text-slate-300">Never</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  {editingId === u.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => editMut.mutate({ id: u.id, role: editRole, status: editStatus })}
                        disabled={editMut.isPending}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        title="Save"
                      >
                        {editMut.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(u)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: System Settings
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [local, setLocal] = useState<SystemSettingDto[]>([])
  const [dirty, setDirty] = useState(false)

  const settingsQ = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<SystemSettingDto[]>('/admin/settings'),
    staleTime: 60_000,
  })

  // Sync query data into local state on load
  useEffect(() => {
    if (settingsQ.data) {
      setLocal(settingsQ.data)
      setDirty(false)
    }
  }, [settingsQ.data])

  const saveMut = useMutation({
    mutationFn: (settings: SystemSettingDto[]) =>
      api.put<SystemSettingDto[]>('/admin/settings', settings),
    onSuccess: data => {
      qc.setQueryData(['admin', 'settings'], data)
      setLocal(data)
      setDirty(false)
    },
  })

  const updateValue = (key: string, value: string) => {
    setLocal(prev => prev.map(s => s.key === key ? { ...s, value } : s))
    setDirty(true)
  }

  const discard = () => {
    if (settingsQ.data) setLocal(settingsQ.data)
    setDirty(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {settingsQ.isLoading ? <Spinner /> : settingsQ.error ? (
        <div className="p-5"><ApiErr msg={(settingsQ.error as Error).message} /></div>
      ) : (
        <>
          <div className="p-6 divide-y divide-slate-100">
            {local.map(s => (
              <div key={s.key} className="py-5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="max-w-md">
                  <label className="block text-sm font-semibold text-slate-800">{s.label}</label>
                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                  <code className="text-[10px] text-slate-400 font-mono">{s.key}</code>
                </div>
                {s.editable ? (
                  <input
                    value={s.value}
                    onChange={e => updateValue(s.key, e.target.value)}
                    className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 w-64 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                ) : (
                  <span className="w-64 text-right text-sm text-slate-500 italic">{s.value}</span>
                )}
              </div>
            ))}
            {local.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No settings configured</p>
            )}
          </div>
          <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex justify-between items-center rounded-b-xl">
            {dirty && (
              <p className="text-xs text-amber-600 font-medium">• Unsaved changes</p>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={discard}
                disabled={!dirty}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                Discard Changes
              </button>
              <button
                onClick={() => saveMut.mutate(local)}
                disabled={!dirty || saveMut.isPending}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saveMut.isPending
                  ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  : 'Save Configuration'}
              </button>
            </div>
          </div>
          {saveMut.error && (
            <div className="px-5 pb-4">
              <ApiErr msg={(saveMut.error as Error).message} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Audit Trail
// ─────────────────────────────────────────────────────────────────────────────

function AuditTab() {
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const auditQ = useQuery({
    queryKey: ['admin', 'audit-log', page],
    queryFn: () => api.get<{ content: AdminAuditEventDto[]; totalElements: number; totalPages: number }>(
      `/admin/audit-log?page=${page}&size=${PAGE_SIZE}`
    ),
    staleTime: 15_000,
  })

  const events: AdminAuditEventDto[] = auditQ.data?.content ?? []
  const totalPages = auditQ.data?.totalPages ?? 1

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-slate-500">
          {auditQ.data?.totalElements ?? 0} events total
          {auditQ.isFetching && <Loader className="inline w-3.5 h-3.5 ml-2 text-slate-400 animate-spin" />}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 font-mono">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {auditQ.isLoading ? <Spinner /> : auditQ.error ? (
        <ApiErr msg={(auditQ.error as Error).message} />
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          No audit events recorded
        </div>
      ) : events.map(entry => {
        const style = AUDIT_STYLES[entry.type] ?? AUDIT_STYLES.auth
        return (
          <div
            key={entry.id}
            className={`bg-white p-4 rounded-lg border shadow-sm flex gap-4 items-start hover:border-slate-300 transition ${style.border}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${style.bg} border ${style.border}`}>
              {style.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm font-semibold text-slate-800 leading-snug">{entry.action}</p>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-wide shrink-0">
                  {entry.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Initiated by{' '}
                <span className="font-medium text-slate-700">{entry.user}</span>
                {' · '}{entry.time}
                {entry.entityId && (
                  <span className="ml-2 font-mono text-[10px] text-slate-400">#{entry.entityId}</span>
                )}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Notifications
// ─────────────────────────────────────────────────────────────────────────────

function NotificationsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [local, setLocal] = useState<NotificationPreferenceDto[]>([])
  const [dirty, setDirty] = useState(false)

  const notifQ = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => api.get<NotificationPreferenceDto[]>('/admin/notifications'),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (notifQ.data) { setLocal(notifQ.data); setDirty(false) }
  }, [notifQ.data])

  const saveMut = useMutation({
    mutationFn: (prefs: NotificationPreferenceDto[]) =>
      api.put<NotificationPreferenceDto[]>('/admin/notifications', prefs),
    onSuccess: data => {
      qc.setQueryData(['admin', 'notifications'], data)
      setLocal(data)
      setDirty(false)
    },
  })

  const toggle = (key: string) => {
    setLocal(prev => prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p))
    setDirty(true)
  }
  const setChannel = (key: string, channel: NotificationPreferenceDto['channel']) => {
    setLocal(prev => prev.map(p => p.key === key ? { ...p, channel } : p))
    setDirty(true)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {notifQ.isLoading ? <Spinner /> : notifQ.error ? (
        <div className="p-5"><ApiErr msg={(notifQ.error as Error).message} /></div>
      ) : (
        <>
          <div className="divide-y divide-slate-100">
            {local.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">No notification preferences available</p>
            ) : local.map(pref => (
              <div key={pref.key} className="px-6 py-5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Toggle */}
                  <button
                    onClick={() => toggle(pref.key)}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${
                      pref.enabled ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      pref.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{pref.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pref.description}</p>
                  </div>
                </div>
                {/* Channel selector */}
                <select
                  disabled={!pref.enabled}
                  value={pref.channel}
                  onChange={e => setChannel(pref.key, e.target.value as NotificationPreferenceDto['channel'])}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                >
                  {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c === 'both' ? 'Email & In-App' : c === 'in-app' ? 'In-App' : 'Email'}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
            {dirty && <p className="text-xs text-amber-600 font-medium self-center mr-auto">• Unsaved changes</p>}
            <button onClick={() => { if (notifQ.data) setLocal(notifQ.data); setDirty(false) }}
              disabled={!dirty} className="btn-secondary text-sm disabled:opacity-40">
              Discard
            </button>
            <button onClick={() => saveMut.mutate(local)} disabled={!dirty || saveMut.isPending}
              className="btn-primary text-sm disabled:opacity-50">
              {saveMut.isPending ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save Preferences'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Integrations
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<IntegrationStatusDto['status'], { label: string; cls: string }> = {
  connected:    { label: 'Connected',    cls: 'bg-green-100 text-green-700 border-green-200' },
  disconnected: { label: 'Disconnected', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  error:        { label: 'Error',        cls: 'bg-red-100 text-red-700 border-red-200' },
}

function IntegrationsTab() {
  const integrationsQ = useQuery({
    queryKey: ['admin', 'integrations'],
    queryFn: () => api.get<IntegrationStatusDto[]>('/admin/integrations'),
    staleTime: 60_000,
  })

  const integrations: IntegrationStatusDto[] = integrationsQ.data ?? []

  return (
    <div className="space-y-3">
      {integrationsQ.isLoading ? <Spinner /> : integrationsQ.error ? (
        <ApiErr msg={(integrationsQ.error as Error).message} />
      ) : integrations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          No integrations configured
        </div>
      ) : integrations.map(int => {
        const badge = STATUS_BADGE[int.status]
        return (
          <div key={int.id} className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5 flex items-center gap-5">
            {/* Status dot */}
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              int.status === 'connected' ? 'bg-green-500' : int.status === 'error' ? 'bg-red-500' : 'bg-slate-300'
            }`} />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-900">{int.name}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{int.description}</p>
              {int.lastSync && (
                <p className="text-[11px] text-slate-400 mt-1">Last synced: {int.lastSync}</p>
              )}
            </div>
            {int.configUrl && (
              <a
                href={int.configUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs"
              >
                Configure
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}