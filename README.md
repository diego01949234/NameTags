# NameTags

**Networking, without the pressure.**

NameTags is a private event copilot for people who want to feel prepared before a networking event, share the right links during it, and follow up while the conversation is still fresh.

[Open the live app](https://nametags-network.vercel.app)

## Why NameTags Exists

I came to New York for a summer internship and was surprised by how social the city felt. Meetups, founder gatherings, and networking events were everywhere. As a non-native English speaker in a new city, I did not understand how people could walk into a room full of strangers, know what to say, exchange the right information naturally, and remember every conversation afterward.

Before an event, I was switching between event pages, LinkedIn, notes, and contact apps while commuting. During it, I did not want to give everyone the same generic profile. After it, business cards, names, and promises became a follow-up task I kept postponing.

NameTags turns that scattered experience into one calm flow: understand the room, share one intentional card, and take one clear next step.

## The Problems It Solves

| Networking moment | The problem | NameTags response |
| --- | --- | --- |
| Before the event | "I do not understand this event or know what to ask." | Event research, a structured brief, and a conversational research chat tailored to the attendee's goal. |
| During the event | "I want to exchange information without sharing everything." | An event-specific QR room pass with only the links the owner chooses. |
| After the event | "I met many people and do not know who to follow up with." | A private follow-up queue that keeps the event, contact, notes, promises, priority, and editable draft together. |

## What You Can Do

1. **Research an event**: Paste an event link, description, name, or screenshot. NameTags creates an event brief and lets you ask follow-up questions about the room.
2. **Create a room pass**: Select the links that make sense for one event and share them with a QR code. The public card only contains the links you selected.
3. **Capture connections**: A person who scans can save your card or explicitly share their contact details and a note.
4. **Follow up**: Review contacts, conversation notes, promises, priority, and an editable message draft. NameTags never sends a message automatically.

## Product Experience

NameTags is designed as a quiet, mobile-first companion rather than a crowded CRM.

- **Event-first home:** The workspace is organized around the event happening now, what needs attention in the next 48 hours, and past events. Users do not need to manage a generic contact database before they can act.
- **Research before pressure:** Event context and follow-up questions are the primary experience. The app helps a user understand the room before asking them to perform in it.
- **Link-first public card:** The scanner sees a clean digital business card with the owner's selected links. Private profile fields, hidden links, notes, and AI reasoning remain private.
- **Explicit consent:** A scanner can save a card without giving anything back, or deliberately choose to share their own contact and note.
- **Human-controlled follow-up:** AI prepares the context and a draft; the owner can edit, copy, mark sent, or mark done. There is no automatic outreach.
- **Responsive by default:** The owner workspace works as an app-like mobile experience while desktop gives research and event planning more room.

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next.js.

## Environment Variables

Copy `.env.example` to `.env.local` and add only the services you want to use.

- `OPENAI_API_KEY`: Enables AI research and follow-up generation.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Enable accounts and private cloud workspaces.
- `SUPABASE_URL` and `SUPABASE_SECRET_KEY`: Enable deployed QR cards and consented contact capture.

Run [`supabase/schema.sql`](./supabase/schema.sql) once in the Supabase SQL editor before using Supabase.

Never commit `.env.local`, an OpenAI API key, a Supabase `sb_secret_...` key, or a database password. The included `.gitignore` excludes local environment files and deployment credentials.

## GPT-5.6 in NameTags

GPT-5.6 is used server-side to:

- synthesize an event brief from a URL, description, web research, or screenshot;
- answer event research questions with the attendee's goal in mind;
- recommend which links belong on a room pass and explain the recommendation privately;
- organize consented contacts, notes, promises, and an editable follow-up draft.

The app uses source-aware prompts, bounded inputs, and a deterministic fallback when AI or source retrieval is unavailable. It does not invent speakers or attendees when a source does not support them.

## Built With Codex

Codex was used throughout implementation to build and refine the Next.js application, mobile and desktop flows, Supabase-backed persistence and privacy boundaries, QR sharing, AI routes, and product UI. It also assisted with debugging, type-checking, deployment preparation, and repository hygiene.

## Stack

Next.js, TypeScript, React, Tailwind CSS, Supabase, OpenAI Responses API, and `qrcode.react`.

## Verify

```bash
npm run typecheck
npm run build
```

## The Goal

Networking should not require perfect English, endless preparation, or a flawless memory. NameTags is built to make entering a new room feel more understandable, more intentional, and less intimidating.
