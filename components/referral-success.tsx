"use client"

import { CheckCircle2, Flag, Gauge, ListChecks, Timer, RotateCcw } from "lucide-react"

export type Decision = {
  priority?: string
  urgency?: string
  recommended_action?: string
  sla?: string
  summary?: string
}

function urgencyStyle(urgency?: string) {
  const value = (urgency ?? "").toLowerCase()
  if (value.includes("high")) return "bg-red-50 text-red-700 ring-red-200"
  if (value.includes("med")) return "bg-amber-50 text-amber-700 ring-amber-200"
  if (value.includes("low")) return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  return "bg-slate-100 text-slate-700 ring-slate-200"
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-slate-900">{children}</div>
      </div>
    </div>
  )
}

export function ReferralSuccess({
  decision,
  onReset,
}: {
  decision: Decision
  onReset: () => void
}) {
  const hasAnyDecision =
    decision.priority || decision.urgency || decision.recommended_action || decision.sla

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center gap-3 border-b border-slate-100 px-6 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Referral received</h2>
          <p className="mt-1 text-sm text-slate-500">
            Thanks — your prospect is in. Here&apos;s how our team triaged it.
          </p>
        </div>
      </div>

      <div className="px-6 py-2">
        {hasAnyDecision ? (
          <dl className="divide-y divide-slate-100">
            <DetailRow icon={Flag} label="Priority level">
              <span className="inline-flex items-center rounded-md bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
                {decision.priority ?? "—"}
              </span>
            </DetailRow>
            <DetailRow icon={Gauge} label="Urgency">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${urgencyStyle(
                  decision.urgency,
                )}`}
              >
                {decision.urgency ?? "—"}
              </span>
            </DetailRow>
            <DetailRow icon={ListChecks} label="Recommended action">
              {decision.recommended_action ?? "—"}
            </DetailRow>
            <DetailRow icon={Timer} label="SLA">
              {decision.sla ?? "—"}
            </DetailRow>
          </dl>
        ) : (
          <p className="py-6 text-sm text-slate-500">
            Your referral was submitted successfully. Our team will follow up shortly.
          </p>
        )}

        {decision.summary ? (
          <p className="border-t border-slate-100 py-4 text-sm leading-relaxed text-slate-500">
            {decision.summary}
          </p>
        ) : null}
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
        >
          <RotateCcw className="size-4" />
          Submit another referral
        </button>
      </div>
    </div>
  )
}
