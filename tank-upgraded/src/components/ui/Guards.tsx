// ─── LoadingSpinner.tsx ───────────────────────────────────────────────────────
import React from 'react'

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-3">
      <div className="w-8 h-8 border-2 border-blue-700 border-t-blue-400 rounded-full animate-spin" />
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

// ─── PageLoadingOverlay.tsx ───────────────────────────────────────────────────

export function PageLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-[#0f1117]/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-blue-700 border-t-blue-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Processing…</p>
      </div>
    </div>
  )
}

// ─── ApiError display ─────────────────────────────────────────────────────────

interface ApiErrorProps {
  error: Error | null
  retry?: () => void
}

export function ApiErrorPanel({ error, retry }: ApiErrorProps) {
  if (!error) return null
  return (
    <div className="bg-red-950 border border-red-900 rounded-lg p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-400">Failed to load data</p>
        <p className="text-xs text-red-400/80 mt-1">{error.message}</p>
        {retry && (
          <button
            onClick={retry}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

// ─── ImmutabilityGuard ────────────────────────────────────────────────────────
// AT-091: If status = APPROVED, UI must be read-only. Edits disabled, only REOPEN allowed.

interface ImmutabilityGuardProps {
  isApproved: boolean
  onReopen?: () => void
  children: React.ReactNode
}

export function ImmutabilityGuard({ isApproved, onReopen, children }: ImmutabilityGuardProps) {
  if (!isApproved) return <>{children}</>

  return (
    <div className="relative">
      {/* Read-only overlay banner */}
      <div className="bg-amber-950 border border-amber-800 rounded-md px-3.5 py-2.5 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z" />
          </svg>
          <p className="text-xs font-semibold text-amber-400">
            This record is APPROVED and locked. All fields are read-only.
          </p>
        </div>
        {onReopen && (
          <button
            onClick={onReopen}
            className="text-xs font-semibold text-amber-400 border border-amber-700 px-2.5 py-1 rounded hover:bg-amber-900 transition-colors"
          >
            Request Re-open (WF-02)
          </button>
        )}
      </div>
      {/* Pointer-events none disables all interactions inside */}
      <div className="pointer-events-none opacity-70 select-none">
        {children}
      </div>
    </div>
  )
}

// ─── ReopenDialog ─────────────────────────────────────────────────────────────
// AT-092: Re-open workflow with mandatory reason capture

interface ReopenDialogProps {
  entityName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function ReopenDialog({ entityName, onConfirm, onCancel, isLoading }: ReopenDialogProps) {
  const [reason, setReason] = React.useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#131920] border border-[#1e2530] rounded-xl p-6 w-[420px] shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-1">Re-open Record (WF-02)</h3>
        <p className="text-xs text-slate-400 mb-4">
          Re-opening <span className="text-slate-200 font-medium">{entityName}</span> will unlock it for editing and generate an audit event.
        </p>
        <label className="block text-[11px] text-slate-500 mb-1.5">
          Reason for re-opening <span className="text-red-400">*</span>
        </label>
        <textarea
          className="w-full bg-[#0d1117] border border-[#2d3748] rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 resize-none"
          rows={4}
          placeholder="Provide a detailed reason for re-opening this approved record…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn btn-secondary" disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || isLoading}
            className="btn bg-amber-700 text-white hover:bg-amber-600 disabled:opacity-40"
          >
            {isLoading ? 'Processing…' : 'Confirm Re-open'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
// Safe-by-default: destructive actions require confirmation + reason

interface ConfirmDialogProps {
  title: string
  message: string
  requireReason?: boolean
  reasonLabel?: string
  onConfirm: (reason?: string) => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmDialog({
  title, message, requireReason, reasonLabel, onConfirm, onCancel, variant = 'danger', isLoading,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState('')

  const colors = {
    danger: 'border-red-900 bg-red-900 text-white hover:bg-red-800',
    warning: 'border-amber-700 bg-amber-700 text-white hover:bg-amber-600',
    info: 'border-blue-700 bg-blue-700 text-white hover:bg-blue-600',
  }

  const canConfirm = !requireReason || reason.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#131920] border border-[#1e2530] rounded-xl p-6 w-[400px] shadow-2xl">
        <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
        <p className="text-xs text-slate-400 mb-4">{message}</p>
        {requireReason && (
          <>
            <label className="block text-[11px] text-slate-500 mb-1.5">
              {reasonLabel ?? 'Reason'} <span className="text-red-400">*</span>
            </label>
            <textarea
              className="w-full bg-[#0d1117] border border-[#2d3748] rounded-md px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 resize-none mb-3"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
          <button
            onClick={() => canConfirm && onConfirm(requireReason ? reason.trim() : undefined)}
            disabled={!canConfirm || isLoading}
            className={`btn disabled:opacity-40 ${colors[variant]}`}
          >
            {isLoading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ComplianceBanner ─────────────────────────────────────────────────────────
// UX Principle 1: Compliance-first UI — every screen surfaces regulatory status

interface ComplianceBannerProps {
  status: 'COMPLIANT' | 'ACTION_REQUIRED' | 'NON_COMPLIANT'
  message: string
  detail?: string
}

export function ComplianceBanner({ status, message, detail }: ComplianceBannerProps) {
  const styles = {
    COMPLIANT: 'bg-green-950 border-green-800 text-green-400',
    ACTION_REQUIRED: 'bg-red-950 border-red-800 text-red-400',
    NON_COMPLIANT: 'bg-red-950 border-red-800 text-red-400',
  }

  const icons = {
    COMPLIANT: '✓',
    ACTION_REQUIRED: '⚠',
    NON_COMPLIANT: '✕',
  }

  return (
    <div className={`border rounded-md px-3.5 py-2 flex items-center gap-2 mb-4 ${styles[status]}`}>
      <span className="font-bold">{icons[status]}</span>
      <div>
        <span className="text-xs font-semibold">{message}</span>
        {detail && <span className="text-xs text-slate-400 ml-2">{detail}</span>}
      </div>
    </div>
  )
}

// ─── AuditBadge ───────────────────────────────────────────────────────────────
// Provenance visibility: show timestamps + signatures

interface AuditBadgeProps {
  label: string
  user?: string
  timestamp?: string
  hash?: string
}

export function AuditBadge({ label, user, timestamp, hash }: AuditBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-[#0d1117] border border-[#1e2530] rounded px-2 py-1">
      <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span>{label}</span>
      {user && <span className="text-blue-500">· {user}</span>}
      {timestamp && <span>· {timestamp}</span>}
      {hash && <span className="font-mono truncate max-w-[80px]" title={hash}>· {hash.substring(0, 8)}…</span>}
    </div>
  )
}

// ─── AiDraftLabel ─────────────────────────────────────────────────────────────
// UX Principle 4: Status over opinion — AI outputs clearly labeled as "draft"

export function AiDraftLabel() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950 border border-amber-800 px-1.5 py-0.5 rounded">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      AI Draft — human review required
    </span>
  )
}
