# NameTag

**Networking, without the pressure.**

NameTag is a mobile-first before/during/after event application for people who find networking stressful or messy. It helps a person understand an unfamiliar room, share one focused public card, and follow through after the room clears.

## Live App

[Open the current NameTag deployment](https://nametag-networking.vercel.app)

The fictional sample event is the fastest way to inspect the core flow without creating an account. Google sign-in becomes available only after its Supabase and Google Cloud provider configuration is complete; email/password and magic-link entry remain available as account alternatives.

## Demo Account

The sign-in page includes **Open the demo account** for Build Week reviewers. It signs in, then opens a fresh fictional workspace so one reviewer's changes cannot affect the next person's walkthrough. It contains no personal data.

```text
Email: demo@nametag.app
Password: NameTagDemo!2026
```

Use **Explore a sample event** when you want the same guided walkthrough without signing in. Demo data is for review only; do not add personal links, private notes, or real contacts to it.

## Product Flow

1. **Before - Understand:** Sign in once, paste an event URL, type a short event name/date for live web research, write a description, or add a screenshot. NameTag turns that material into a grounded event brief and preserves the same context for follow-up research questions. A clearly labelled fictional sample event lets a reviewer try this without an account.
2. **During - Show QR:** Choose the few public links that make sense for this room, then show one event-specific QR code. The scanner sees only those selected links, can save the card, and can explicitly opt in to share their own contact and conversation note.
3. **After - Follow up:** Review people, private notes, follow-up drafts, and the next real action. Add people from paper cards or introductions, record promises, and deliberately move each follow-up from to send to sent to done.

NameTag is event-first, not profile-first. Your private profile and optional links live in your signed-in Settings workspace; each event creates a distinct public room pass. Links are normalized and format-validated, but v1 deliberately avoids social-account connections or ownership verification.

## Try The Core Loop

1. Open **Explore a sample event** from the account screen, or sign in and create an event from a URL, description, or screenshot.
2. In **Research**, read the source-grounded summary and ask a precise follow-up question.
3. In **Links**, choose the contact surfaces that belong on this room pass. The owner sees the recommendation and can override it.
4. In **QR**, show the public card on another device. The scanner sees only the public links and may choose to share their own contact details.
5. Return to **Follow up** to turn that consented connection and its note into an editable next action.

## Application Architecture

| Data | Where it lives | Why |
| --- | --- | --- |
| Profile, vault, events, notes, follow-up state | Supabase `user_workspaces` plus a device cache | A signed-in owner gets one private workspace that follows them across devices. |
| Public card | Server route + Supabase | A QR must work on another person's phone. |
| Scanner contact submission | Server route + Supabase | A consented connection needs to reach the owner's event debrief. |
| Owner contact polling | Device-held per-card sync key | The public card API never returns another scanner's contact details. |
| AI generation | OpenAI Responses API | Generates grounded prep, research answers, link reasoning, and follow-up language. |

The app has a deterministic fallback when no OpenAI key is present or the provider is temporarily unavailable. It does not fabricate named speakers or scanners.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next.js. For the current workspace:

```bash
npm run dev -- -p 3060
```

## Configure Real Public QR Cards

The public QR/contact flow needs Supabase when it is deployed or tested across devices.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
3. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to `.env.local` and your hosting provider's environment variables. The legacy `SUPABASE_SERVICE_ROLE_KEY` also works as a fallback.
4. Deploy to Vercel or another Node-compatible Next.js host.
5. Open the deployed `/`, create an event, open Share once, then scan its QR from a second device.

`SUPABASE_SECRET_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`.

Without Supabase, the app uses `work/nametag-public-store.json` for a same-server local-development fallback. That fallback is intentionally not suitable for deployment.

## Add User Accounts And Cloud Workspaces

NameTag's account layer uses Supabase Auth. It keeps the private owner workspace (profile, links, events, cards, notes, contacts, and follow-ups) in `public.user_workspaces`; scanner-facing cards and consented contact capture remain on the server-only path described above.

1. Run the updated [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor. The statements are safe to re-run and add the `user_workspaces` table plus owner-only RLS policies.
2. In Google Cloud, create an **OAuth client ID** for a **Web application**. Add exactly this Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`. If the OAuth consent screen is in Testing, add your own Google account as a test user.
3. In **Supabase Authentication -> Providers**, open **Google**, enable it, paste that Google client ID and client secret, then save. A `provider is not enabled` error means this save step has not happened yet.
4. In **Supabase Authentication -> URL Configuration**, set Site URL to `https://nametag-networking.vercel.app` and add that same URL to Redirect URLs.
5. In **Supabase Settings -> API Keys**, copy the public `sb_publishable_...` key. Add these Vercel Production variables, then redeploy:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable key is deliberately browser-visible and is safe to expose only because RLS restricts `user_workspaces` to `auth.uid() = user_id`. Do not put `SUPABASE_SECRET_KEY` or any `sb_secret_...` value in a `NEXT_PUBLIC_` variable.

The login page also offers email magic links. For a production release, configure custom SMTP in Supabase before relying on email delivery at scale.

## Privacy Boundaries

- A public room pass contains only the links selected for that event. Hidden links never enter the public-card payload.
- A scanner must actively provide their name/contact and consent before NameTag saves a connection. Consent is checked server-side and its timestamp is stored with the connection.
- The server derives a scanner connection's event from the published QR card. A scanner cannot submit an arbitrary event ID to place themselves into another follow-up queue.
- The public card `GET` response never includes scanner contacts. The owner app polls with a device-held, per-card sync key that is verified server-side.
- The public AI routes use per-client throttling and server-side input bounds. This is a useful hackathon guard, not a replacement for a shared production rate-limit store.
- The event-page reader only accepts public HTML, bounds the page size, permits one validated redirect, and asks for pasted context when an SPA page is too thin to ground a useful answer.
- This build includes owner accounts and private-workspace RLS. A production hardening phase still needs a shared rate-limit store, fuller consent controls, encrypted private data, and broader abuse monitoring.

## Optional OpenAI Setup

Add these values to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
# Optional. Defaults to the lower-cost GPT-5.6 Terra model.
OPENAI_MODEL=gpt-5.6-terra
# Optional. Used only when someone enters a short event name/date rather than a URL.
# Defaults to gpt-5.6 for live web research.
OPENAI_RESEARCH_MODEL=gpt-5.6
```

`app/api/generate/route.ts`, `app/api/research-chat/route.ts`, and `app/api/debrief/route.ts` use strict JSON output and bounded server-side inputs. `app/api/brief/route.ts` reads public event pages and, for short natural-language event searches, uses the Responses API web search tool with visible source links. The owner can open every captured source from the research section of the brief.

## Key Screens

- First-run identity setup
- Event home and room passes
- Settings for your profile and optional links
- Subway Mode event prep
- Event plan
- Card review and QR Share
- Public mobile card at `/c/[cardId]`
- Consent-based connect-back
- Event debrief and follow-up queue

## Build Week Materials

- [Build Week implementation record](./BUILD_WEEK.md)
- [Submission copy, demo script, and reviewer path](./docs/BUILD_WEEK_SUBMISSION.md)
- [Current application specification](./docs/NAMETAG_APPLICATION_SPEC.md)
- [Product brief](./docs/NAMETAG_PRODUCT_BRIEF.md)
- [Architecture overview](./docs/NAMETAG_ARCHITECTURE_AND_PRODUCT_OVERVIEW.md)

## Verify

```bash
npm run typecheck
npm run build
```

For a full application check, use two devices:

1. On the owner device, create a profile, add links, and prepare an event.
2. Open Share so the public card publishes to Supabase.
3. Scan the QR from another device.
4. Save the card, submit a consented connection, and return to the owner device.
5. Verify the contact appears in After and complete the follow-up.
