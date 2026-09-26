import { NextResponse } from "next/server"

const WEBHOOK_URL = process.env.REFERRAL_WEBHOOK_URL

type ReferralPayload = {
  partner_code?: string
  prospect_name?: string
  prospect_email?: string
  prospect_company?: string
  intent?: string
}

const REQUIRED_FIELDS: (keyof ReferralPayload)[] = [
  "partner_code",
  "prospect_name",
  "prospect_email",
  "prospect_company",
  "intent",
]

// Pull a value from an object trying several possible key names, case-insensitively.
function pick(source: Record<string, unknown>, keys: string[]): string | undefined {
  const lowered: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(source)) lowered[k.toLowerCase()] = v
  for (const key of keys) {
    const val = lowered[key.toLowerCase()]
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val)
    }
  }
  return undefined
}

// The n8n / AI response shape is not guaranteed, so normalize defensively.
function normalizeDecision(raw: unknown) {
  let data: Record<string, unknown> = {}

  if (Array.isArray(raw)) {
    data = (raw[0] as Record<string, unknown>) ?? {}
  } else if (raw && typeof raw === "object") {
    data = raw as Record<string, unknown>
  }

  // Some workflows nest the useful fields under an `output`, `data`, `result`, or `json` key.
  for (const nestKey of ["output", "data", "result", "json", "decision"]) {
    const nested = data[nestKey]
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      data = { ...data, ...(nested as Record<string, unknown>) }
    }
  }

  return {
    priority: pick(data, ["priority", "priority_level", "prioritylevel", "p"]),
    urgency: pick(data, ["urgency", "urgency_level"]),
    recommended_action: pick(data, [
      "recommended_action",
      "recommendedaction",
      "action",
      "next_action",
      "recommendation",
    ]),
    sla: pick(data, ["sla", "sla_target", "response_sla", "response_time"]),
    summary: pick(data, ["summary", "message", "notes", "reason", "rationale"]),
  }
}

export async function POST(request: Request) {
  let body: ReferralPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = body[field]
    return !value || String(value).trim() === ""
  })

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required field: ${missing.join(", ")}` },
      { status: 400 },
    )
  }

  if (!WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Referral service is not configured. Please try again later." },
      { status: 500 },
    )
  }

  let webhookResponse: Response
  try {
    webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_code: body.partner_code,
        prospect_name: body.prospect_name,
        prospect_email: body.prospect_email,
        prospect_company: body.prospect_company,
        intent: body.intent,
      }),
    })
  } catch {
    return NextResponse.json(
      { error: "Could not reach the referral service. Please try again." },
      { status: 502 },
    )
  }

  const rawText = await webhookResponse.text()
  let parsed: unknown = null
  try {
    parsed = rawText ? JSON.parse(rawText) : null
  } catch {
    parsed = rawText
  }

  if (!webhookResponse.ok) {
    // Surface a specific error message from the webhook when available.
    const message =
      (parsed && typeof parsed === "object"
        ? pick(parsed as Record<string, unknown>, ["error", "message", "detail"])
        : typeof parsed === "string"
          ? parsed
          : undefined) ?? `Referral could not be processed (status ${webhookResponse.status}).`

    return NextResponse.json({ error: message }, { status: webhookResponse.status })
  }

  // A 200 that still contains an error field is treated as a validation error.
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const errorMessage = pick(parsed as Record<string, unknown>, ["error", "errorMessage"])
    if (errorMessage) {
      return NextResponse.json({ error: errorMessage }, { status: 422 })
    }
  }

  // n8n stops executing when a node has no output data (e.g. the partner code
  // isn't found in the sheet). That halts the workflow and returns a 200 with an
  // empty body — treat it as a validation error rather than a false success.
  const isEmpty =
    parsed === null ||
    parsed === undefined ||
    (typeof parsed === "string" && parsed.trim() === "") ||
    (Array.isArray(parsed) && parsed.length === 0) ||
    (typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed as object).length === 0)

  if (isEmpty) {
    return NextResponse.json(
      { error: `Unknown partner code "${body.partner_code}". Please check the code and try again.` },
      { status: 422 },
    )
  }

  const decision = normalizeDecision(parsed)

  // If the workflow returned data but none of the decision fields are present,
  // the referral wasn't actually scored — surface that instead of an empty card.
  const hasDecision = Boolean(
    decision.priority || decision.urgency || decision.recommended_action || decision.sla || decision.summary,
  )

  if (!hasDecision) {
    return NextResponse.json(
      { error: `Unknown partner code "${body.partner_code}". Please check the code and try again.` },
      { status: 422 },
    )
  }

  return NextResponse.json({ decision }, { status: 200 })
}
