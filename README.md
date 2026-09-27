# Orbit Partners Referral Flow

## Problem

Partners often receive opportunities through referrals but do not have a fast, structured way to submit them to the internal team. The goal of this app is to make referrals consistent, easy to capture, and easy to route into the right workflow without manual back-and-forth.

## What it does

This app is a lightweight partner referral intake form built with Next.js. It lets a partner:

- enter a partner code
- submit prospect details such as name, email, company, and intent
- send the referral to a configured external webhook
- receive a structured decision or error response from the workflow
- see either a success state or a validation/error state in the UI

The app is designed for use as a front-end intake layer for an automation workflow, such as an n8n-based referral scoring or routing pipeline.

## How it works

1. The partner fills out the referral form.
2. The client validates the required fields.
3. The form posts the payload to the backend API route in `app/api/referral/route.ts`.
4. The API forwards the data to `REFERRAL_WEBHOOK_URL`.
5. The automation workflow returns a decision payload or a validation error.
6. The UI renders the result in a success or error card.

## Local setup

Use the correct Node version first, then install and run:

```bash
corepack enable
corepack prepare pnpm@12.3.4 --activate
pnpm install
pnpm dev
```

Then open:

```text
http://localhost:3000
```

### Required environment variable

Create a `.env.local` file and add:

```bash
REFERRAL_WEBHOOK_URL="https://your-webhook-url"
```

This value should point to the referral workflow endpoint that receives the form submission.

## Known limitations

- The app depends on an external webhook being available and correctly configured.
- Validation is strict: all required fields must be present before a request is sent.
- The workflow response format is normalized defensively, but it still assumes the automation returns a recognizable decision payload.
- If the partner code is unknown or the workflow returns an empty result, the app treats it as a validation failure.
- This is a single-page app and is not designed for multi-step enterprise workflow management.

## Notes

This project is intended to be a simple, partner-friendly referral experience that plugs into a broader automation pipeline rather than acting as a full CRM or internal operations system.
