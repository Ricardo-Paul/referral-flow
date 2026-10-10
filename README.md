# Orbit Partners — Partner Referral Flow

A production-grade partner referral intake system built across three modules: a validated webhook pipeline (Module 1), a live CRM integration with resilient error handling (Module 2), and a multi-agent AI reasoning layer (Module 3). The frontend is a Next.js app that partners use to submit referrals; the backend is an n8n workflow that validates, enriches, reasons over, and routes each referral end-to-end.

**Live URL:** _[your Vercel URL]_
**n8n workflow:** `POST /webhook/partner-referral`
**Repo:** https://github.com/Ricardo-Paul/referral-flow

---

## The problem

Partners refer prospects verbally, by email, or through ad-hoc messages. There is no consistent intake, no attribution, and no way to know what happened after a referral was sent. The sales team manually enters data, often losing context. High-value leads get treated the same as low-value ones.

This system fixes that. Every referral goes through the same pipeline: validated, attributed, synced to CRM, reasoned over by AI agents, and routed with a priority and SLA before anyone on the sales team sees it.

---

## Architecture

```
Partner (browser)
    │
    ▼
Next.js frontend — Orbit Partners UI
    │  POST /api/referral  (server-side proxy — avoids CORS)
    ▼
n8n Webhook  POST /webhook/partner-referral
    │
    ├── Has Required Fields? (IF node)
    │     ├── Missing / invalid email → 400
    │     └── Pass → Lookup Partner (Google Sheets)
    │                 ├── Unknown code → 403
    │                 └── Valid → Sync to HubSpot (CRM)
    │                               ├── CRM Sync OK  ──┐
    │                               └── CRM Sync Failed ─┘
    │                                         │
    │                                   Build Lead Record
    │                                         │
    │                          ┌──────────────┴──────────────┐
    │                    Classifier Agent            Extractor Agent   (parallel)
    │                    gpt-5-mini                 gpt-5-mini
    │                          │                             │
    │                    Classifier Result          Extractor Result
    │                          └──────────────┬──────────────┘
    │                               Await Classifier + Extractor (Merge)
    │                                         │
    │                                   Reasoner Agent   (sequential)
    │                                   gpt-5 (reasoningEffort: high)
    │                                         │
    │                                   Composer Agent   (sequential)
    │                                   gpt-5-mini
    │                                         │
    │                               Combine Agent Outputs (Code node)
    │                                         │
    │                                   Persist Lead (Google Sheets)
    │                                         │
    │                          ┌──────────────┼──────────────┐
    │                  Notify Sales Team  Confirm to Partner  Welcome Prospect
    │                  (Gmail)            (Gmail)             (Gmail)
    │                                         │
    └──────────────────────────── Respond: Success (200)
```

Every agent has a fallback node. If any agent returns garbage or times out, the fallback applies a safe default and the pipeline continues. No single agent failure kills the run.

---

## n8n Workflow — Node Reference

### Ingress

| Node | Type | What it does |
|---|---|---|
| Referral Webhook | Webhook (POST) | Entry point at `/webhook/partner-referral`. `responseMode: responseNode` — the response is sent explicitly at the end, not automatically. |
| Has Required Fields? | IF | Checks `partner_code`, `prospect_name`, `prospect_email` exist AND `prospect_email` matches `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Fails either branch on missing or malformed input. |
| Respond: Missing Field | Respond to Webhook | HTTP 400. Body: `{ status: "error", error: "Invalid request. partner_code, prospect_name and a valid prospect_email are required." }` |

### Partner validation

| Node | Type | What it does |
|---|---|---|
| Lookup Partner | Google Sheets (Get Rows) | Reads the `Partners` tab, filters on `partner_code`, `returnFirstMatch: true`. Returns `partner_name` and `partner_email` on a match. |
| Partner Valid? | IF | Checks that `$json.partner_code` exists in the lookup result. No row returned means unknown partner. |
| Respond: Unknown Partner | Respond to Webhook | HTTP 403. Body includes the rejected partner code. |

### CRM enrichment

| Node | Type | What it does |
|---|---|---|
| Sync to HubSpot (CRM) | HubSpot (Create/Update Contact) | Creates or updates a contact keyed on `prospect_email`. Splits `prospect_name` into `firstName`/`lastName`. Also maps `prospect_company`. `onError: continueErrorOutput` so failures route to `CRM Sync Failed` rather than crashing. |
| CRM Sync OK | Set | Normalizes the HubSpot response: `enrichment_status: ok`, `hubspot_contact_id` (from `vid` or `hs_object_id`), `company_industry`, `company_employees`, `high_value` (true when employees >= 100). |
| CRM Sync Failed | Set | Sets `enrichment_status: failed`. Captures up to 300 chars of the raw error into `enrichment_error`. Pipeline continues. |

### Lead assembly

| Node | Type | What it does |
|---|---|---|
| Build Lead Record | Set | Assembles the full lead object from all upstream sources: webhook payload (`$('Referral Webhook')`), partner lookup (`$('Lookup Partner')`), and CRM enrichment (`$json`). Adds `received_at` timestamp and `attribution` string (`"Partner referral: <name> (<code>)"`). This is the single structured object the agent layer receives. |

### AI agent layer

All four agents use `@n8n/n8n-nodes-langchain.chainLlm` with `promptType: define` and a structured output parser (`outputParserStructured`) that enforces a JSON schema via `jsonSchemaExample`. Each agent has `onError: continueErrorOutput` wired to a fallback Set node that records `agent_status: fallback`.

#### Classifier Agent (runs in parallel with Extractor)

- **Model:** `gpt-5-mini` via Gateway credits
- **Responsibility:** Categorize the referral. Nothing else.
- **System prompt:** `"You are the Classifier agent on a sales-referral team. Your ONLY job: decide what this referral is about. Return category (one of product_inquiry, partnership, support, pricing, other), urgency (low|medium|high), confidence (0-1), and a short list of topics. Respond only in the required JSON format."`
- **User prompt includes:** prospect name, company, intent, partner name, HubSpot sync status.
- **Output schema:** `{ category, urgency, confidence, topics[] }`
- **Fallback output:** `{ agent_status: "fallback", agent_error: "<message>" }`

#### Extractor Agent (runs in parallel with Classifier)

- **Model:** `gpt-5-mini` via Gateway credits
- **Responsibility:** Pull structured fields from the referral. Nothing else.
- **System prompt:** `"You are the Extractor agent on a sales-referral team. Your ONLY job: pull out the key fields. Return product_interest, company_size_signal, timeline, and budget_signal. If a field is unknown, use the string 'unknown'. Respond only in the required JSON format."`
- **User prompt includes:** prospect name, company, intent, HubSpot industry and employee count.
- **Output schema:** `{ product_interest, company_size_signal, timeline, budget_signal }`
- **Fallback output:** `{ agent_status: "fallback", agent_error: "<message>" }`

#### Await Classifier + Extractor (Merge node)

`combineBy: combineByPosition`. Collects output from `Classifier Result` (index 0) and `Extractor Result` (index 1). Neither branch proceeds until both are done.

#### Reasoner Agent (sequential — depends on Merge)

- **Model:** `gpt-5` with `reasoningEffort: high` via Gateway credits
- **Responsibility:** Make the routing decision using both upstream agent outputs.
- **System prompt:** `"You are the Reasoner agent on a sales-referral team. Using the classification and extraction from the other agents, decide the next action. Return recommended_action, priority (P1|P2|P3), sla_hours (number), and a short rationale. If upstream data is missing, reason conservatively and lower the priority. Respond only in the required JSON format."`
- **User prompt includes:** prospect name, company, `high_value` flag, full Classifier output, full Extractor output.
- **Output schema:** `{ recommended_action, priority, sla_hours, rationale }`
- **Fallback output:** `{ recommended_action: "Manual review by sales", priority: "P3", sla_hours: 48, rationale: "Reasoner unavailable; conservative default applied." }`

#### Composer Agent (sequential — depends on Reasoner)

- **Model:** `gpt-5-mini` via Gateway credits
- **Responsibility:** Write the human-facing sales brief.
- **System prompt:** `"You are the Composer agent on a sales-referral team. Write the final human-facing brief for the sales team. Return subject (email-style, <=80 chars), summary (2-3 sentences), and next_steps (1-2 concrete actions). Be concise and factual. Respond only in the required JSON format."`
- **User prompt includes:** prospect name, company, partner name, full Reasoner output, full Classifier output.
- **Output schema:** `{ subject, summary, next_steps }`
- **Fallback output:** `{ subject: "New partner referral", summary: "A partner referral was received and needs review.", next_steps: "Sales to review and follow up." }`

#### Combine Agent Outputs (Code node)

JavaScript node that pulls all four agent results together using a `pick()` helper that gracefully falls back to defaults when an agent's `.output` is missing or empty. Produces `ai_*` prefixed fields and an `ai_trace` JSON string recording which agents succeeded vs. fell back.

```js
function pick(nodeName, defaults) {
  try {
    const o = $(nodeName).first().json.output;
    if (o && typeof o === 'object' && Object.keys(o).length > 0) return o;
    return defaults;
  } catch (e) { return defaults; }
}
```

**Fields added to the lead record:**
`ai_category`, `ai_urgency`, `ai_confidence`, `ai_topics`, `ai_product_interest`, `ai_company_size_signal`, `ai_timeline`, `ai_budget_signal`, `ai_recommended_action`, `ai_priority`, `ai_sla_hours`, `ai_rationale`, `ai_subject`, `ai_summary`, `ai_next_steps`, `ai_trace`, `decided_at`

### Persistence and notifications

| Node | Type | What it does |
|---|---|---|
| Persist Lead | Google Sheets (Append) | Appends the full enriched lead record to the `Leads` tab via `autoMapInputData`. |
| Notify Sales Team | Gmail | Sends the AI-generated sales brief. Subject: `[{ai_priority}] {ai_subject}`. Body includes summary, recommended action, SLA, CRM status, and agent trace. |
| Confirm to Partner | Gmail | Sent to `partner_email`. Confirms the referral was received, includes prospect name and partner code. |
| Welcome Prospect | Gmail | Sent to `prospect_email`. Names the referring partner, says the team will follow up. |
| Respond: Success | Respond to Webhook | HTTP 200. Body: `{ status, message, partner_code, prospect_email, priority, recommended_action }` |

---

## Data schema

### Webhook request payload

```json
{
  "partner_code": "MAXXY30",
  "prospect_name": "Jane Doe",
  "prospect_email": "jane@company.com",
  "prospect_company": "Acme Corp",
  "intent": "Interested in enterprise plan"
}
```

### Success response (200)

```json
{
  "status": "ok",
  "message": "Referral accepted and attributed.",
  "partner_code": "MAXXY30",
  "prospect_email": "jane@company.com",
  "priority": "P1",
  "recommended_action": "Assign to enterprise AE"
}
```

### Validation error (400)

```json
{
  "status": "error",
  "error": "Invalid request. partner_code, prospect_name and a valid prospect_email are required."
}
```

### Unknown partner (403)

```json
{
  "status": "error",
  "error": "Unknown partner_code: 'BADCODE'. Referral rejected."
}
```

### Google Sheets — Partners tab

| Column | Description |
|---|---|
| `partner_code` | Unique code the partner includes in every referral submission |
| `partner_name` | Display name of the partner organization |
| `partner_email` | Where confirmation emails are sent |

### Google Sheets — Leads tab

All columns written by the workflow on each successful referral:

`received_at` · `partner_code` · `partner_name` · `partner_email` · `prospect_name` · `prospect_email` · `prospect_company` · `intent` · `attribution` · `enrichment_status` · `hubspot_contact_id` · `company_industry` · `company_employees` · `high_value` · `enrichment_error` · `ai_category` · `ai_urgency` · `ai_confidence` · `ai_topics` · `ai_product_interest` · `ai_company_size_signal` · `ai_timeline` · `ai_budget_signal` · `ai_recommended_action` · `ai_priority` · `ai_sla_hours` · `ai_rationale` · `ai_subject` · `ai_summary` · `ai_next_steps` · `ai_trace` · `decided_at`

---

## Frontend — local setup

```bash
corepack enable
corepack prepare pnpm@12.3.4 --activate
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

### Environment variable

```bash
# .env.local
REFERRAL_WEBHOOK_URL="https://your-n8n-instance/webhook/partner-referral"
```

The form POSTs to `/api/referral` — a Next.js server-side proxy route — which forwards to `REFERRAL_WEBHOOK_URL`. The proxy is necessary because n8n does not send permissive cross-origin headers, so a direct browser-to-n8n call fails CORS. Moving the request server-side sidesteps that entirely.

---

## Error states handled

| Condition | HTTP status returned to UI | What the workflow does |
|---|---|---|
| Missing required field | 400 | Rejects at `Has Required Fields?`, never touches the sheet |
| Invalid email format | 400 | Same — regex check is part of the same IF node |
| Unknown partner code | 403 | Rejects at `Partner Valid?`, never touches the sheet |
| HubSpot unavailable | — (pipeline continues) | `CRM Sync Failed` logs the error, sets `enrichment_status: failed` |
| Any agent returns garbage | — (pipeline continues) | Fallback Set node applies safe defaults, `ai_trace` records which agents fell back |
| Network failure / webhook down | — | UI catches the fetch error and shows the error state |

---

## Known limitations

- The partner registry is in Google Sheets. For production use this should move to a database with an index on `partner_code`, especially once the registry grows past a few dozen rows.
- All three emails (sales, partner, prospect) resolve to the same Gmail account during development. In production, `partner_email` and `prospect_email` point to real external addresses.
- Agent models (`gpt-5`, `gpt-5-mini`) depend on n8n Gateway credentials. To use your own OpenAI key, swap the model sub-nodes and update the credential reference in each.
- `ai_trace` is stored as a JSON string in the sheet. Parse it for proper observability tooling.
- The frontend has no authentication. The webhook URL and a valid partner code together are the only access control. For a public-facing deployment, add webhook signature verification.

---

## Next steps

- Move the partner registry from Google Sheets to PostgreSQL with an index on `partner_code`
- Add a `referral_status` column updated by the sales team (contacted / converted / lost) to close the feedback loop
- Surface the AI decision (`priority`, `recommended_action`, `ai_summary`) in the frontend success screen rather than a generic confirmation
- Add webhook signature verification to prevent spoofed submissions
- Set up n8n execution alerts when agent fallback rate exceeds a threshold
