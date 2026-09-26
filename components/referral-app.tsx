"use client"

import { useState } from "react"
import { ReferralForm, type ReferralValues } from "./referral-form"
import { ReferralSuccess, type Decision } from "./referral-success"
import { ReferralError } from "./referral-error"

type View =
  | { state: "form" }
  | { state: "success"; decision: Decision }
  | { state: "error"; message: string }

export function ReferralApp() {
  const [view, setView] = useState<View>({ state: "form" })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(values: ReferralValues) {
    setSubmitting(true)
    try {
      const response = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setView({
          state: "error",
          message: data?.error || "Something went wrong. Please try again.",
        })
        return
      }

      setView({ state: "success", decision: data.decision ?? {} })
    } catch {
      setView({
        state: "error",
        message: "Network error — please check your connection and try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh bg-violet-50/60">
      <main>
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-600">
            <span className="h-px w-6 bg-violet-600" />
            Partner referral
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
            Introduce your next great customer.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500 sm:text-base">
            Share a qualified prospect with our team. We&apos;ll follow up thoughtfully and keep you
            in the loop.
          </p>

          <div className="mt-8">
            {view.state === "form" && (
              <ReferralForm onSubmit={handleSubmit} submitting={submitting} />
            )}
            {view.state === "success" && (
              <ReferralSuccess
                decision={view.decision}
                onReset={() => setView({ state: "form" })}
              />
            )}
            {view.state === "error" && (
              <ReferralError
                message={view.message}
                onRetry={() => setView({ state: "form" })}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
