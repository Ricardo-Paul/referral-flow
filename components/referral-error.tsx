"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"

export function ReferralError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center gap-3 border-b border-slate-100 px-6 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="size-8" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">We couldn&apos;t submit that</h2>
          <p className="mt-1 text-sm text-slate-500">Your referral was not recorded.</p>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {message}
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
        >
          <RotateCcw className="size-4" />
          Try again
        </button>
      </div>
    </div>
  )
}
