"use client"

import { useState } from "react"
import { ArrowRight, FileText, Loader2 } from "lucide-react"

export type ReferralValues = {
  partner_code: string
  prospect_name: string
  prospect_email: string
  prospect_company: string
  intent: string
}

const INTENT_OPTIONS = [
  "Enterprise plan",
  "Website redesign",
  "Software services",
  "Other",
]

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700"
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"

export function ReferralForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: ReferralValues) => void
  submitting: boolean
}) {
  const [values, setValues] = useState<ReferralValues>({
    partner_code: "",
    prospect_name: "",
    prospect_email: "",
    prospect_company: "",
    intent: "",
  })

  function update<K extends keyof ReferralValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FileText className="size-4 text-violet-600" />
          Referral details
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
          <span className="size-1.5 rounded-full bg-violet-500" />
          Active session
        </span>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div>
          <label htmlFor="partner_code" className={labelClass}>
            Partner code
          </label>
          <input
            id="partner_code"
            name="partner_code"
            required
            value={values.partner_code}
            onChange={(e) => update("partner_code", e.target.value)}
            placeholder="e.g. MAXXY30"
            className={inputClass}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="prospect_name" className={labelClass}>
              Prospect name
            </label>
            <input
              id="prospect_name"
              name="prospect_name"
              required
              value={values.prospect_name}
              onChange={(e) => update("prospect_name", e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="prospect_email" className={labelClass}>
              Prospect email
            </label>
            <input
              id="prospect_email"
              name="prospect_email"
              type="email"
              required
              value={values.prospect_email}
              onChange={(e) => update("prospect_email", e.target.value)}
              placeholder="name@company.com"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="prospect_company" className={labelClass}>
              Prospect company
            </label>
            <input
              id="prospect_company"
              name="prospect_company"
              required
              value={values.prospect_company}
              onChange={(e) => update("prospect_company", e.target.value)}
              placeholder="Company name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="intent" className={labelClass}>
              Intent
            </label>
            <select
              id="intent"
              name="intent"
              required
              value={values.intent}
              onChange={(e) => update("intent", e.target.value)}
              className={`${inputClass} appearance-none bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 ${
                values.intent ? "text-slate-900" : "text-slate-400"
              }`}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
              }}
            >
              <option value="" disabled>
                Select primary intent
              </option>
              {INTENT_OPTIONS.map((option) => (
                <option key={option} value={option} className="text-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs leading-relaxed text-slate-400">
          By submitting, you confirm you have permission to share these details.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              Submit referral
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
