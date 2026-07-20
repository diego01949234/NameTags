# NameTag Product Brief

## Positioning

**Networking, without the pressure.**

NameTag is a personal event companion for people who feel rushed before an event, awkward while meeting people, or overwhelmed by follow-up afterward. It is not a QR business-card clone. The QR is simply the fastest handoff inside a complete before/during/after loop.

## The Sharp Problem

Networking fails in a predictable sequence:

1. **Before:** “I do not understand what this event is, who matters, or what I can ask.”
2. **During:** “I have too many links and no easy way to share them without over-explaining.”
3. **After:** “I have names, scattered notes, and no energy to write the follow-up.”

Most tools solve one fragment: event pages provide information, Linktree distributes links, note apps store fragments, and CRMs create work. NameTag owns the transition between them.

## First Audience

The initial audience is people entering a high-density networking situation for the first time or under time pressure:

- Hackathon and Build Week participants
- Students at career fairs or startup events
- First-time founder-meetup attendees
- Conference and seminar attendees who need a fast brief

They are a good first market because the emotional need is immediate and the core workflow can be tested in one event.

## Core Promise

> Understand the room, make one good connection, and remember the next step.

The central job is not “choose the perfect online identity.” It is reducing cognitive load at the exact moments where people freeze or lose context.

## Product Loop

```text
Event source
  -> Context-grounded research and questions
  -> Owner-selected public links
  -> One QR card
  -> Explicit scanner consent and note
  -> Follow-up queue with a real completion state
```

The event ID is the continuity layer. It ties the source, research conversation, public card, scanner connection, private note, and follow-up together without exposing any private context to the scanner.

## What Makes It Distinctive

### 1. Research is a conversation, not a generic AI summary

The user can paste a URL, a rough description, or an event screenshot, then keep asking questions. The goal is quick understanding, not a long AI essay. When the source lacks speakers or event specifics, NameTag says so rather than inventing a social graph.

### 2. QR is a consented connection, not just a profile link

The scanner sees a clean public link card first. They can save it with no obligation. Sharing something back is a separate, clear choice, with a visible consent statement and an optional conversation note.

### 3. Follow-up is the retention loop

The lasting value begins after the room clears. NameTag turns a specific connection and note into a reviewable message and a small completion queue. It never sends automatically.

### 4. Contextual privacy is a trust feature, not the product's only promise

The owner may keep irrelevant or personal links off a professional event card. The owner can see why a link was recommended; the scanner only sees the owner-selected result. This is a useful trust mechanism, but the emotional core remains preparation and follow-through.

## Key Product Decisions

| Decision | Why it matters |
| --- | --- |
| One primary event goal | A rushed attendee needs a clear next action, not a vague multi-goal plan. |
| Link-first public card | Scanners need immediate, useful actions, not an AI-written pitch. |
| Owner-written optional bio | Keeps public identity intentional and avoids awkward generated copy. |
| Explicit scanner consent | Makes contact capture understandable and protects the attendee's choice. |
| Human-controlled follow-up | Preserves trust and prevents accidental outreach. |
| Sample event | Lets a reviewer evaluate the full product loop without onboarding friction. |

## North-Star Behavior

**Percentage of consented event connections that receive a user-reviewed follow-up within 48 hours.**

Supporting signals:

- Event research completion
- Useful question saved or used
- QR card opened on another device
- Scanner contact opt-in rate
- Follow-ups marked `sent` and then `done`

Do not invent these metrics for Build Week. Measure them only after a real pilot.

## Risks And Product Responses

| Risk | Product response |
| --- | --- |
| Event URL is a JavaScript shell or has thin content | Use title/metadata where possible, label missing evidence, and ask the user for a description or screenshot. |
| AI sounds generic | Ground it in the source and the private profile context; give questions and roles, not fabricated names. |
| Scanner does not want to share details | Saving the card is useful on its own. Connection is never required. |
| Public QR feels unsafe | Only selected links are published; research, private notes, and hidden links are omitted from the public payload. |
| Follow-up feels like extra work | Queue the next action, preserve the conversation note, and make drafts editable, copyable, and completable. |
| Product becomes a full CRM | Keep the scope to one event, one connection context, and one next action. |

## Build Week Story

1. A user is on the way to a Founder Meetup and does not understand the agenda.
2. They paste an invite or screenshot, get a grounded explanation, and ask one follow-up question.
3. They choose their LinkedIn, GitHub, and demo as the public links for this room.
4. Someone scans the QR on a second phone, saves the card, and explicitly shares a contact plus a note.
5. Back on the owner phone, the same event context makes a concise follow-up draft, which the user edits and marks sent.

That is the full product claim in under three minutes.
