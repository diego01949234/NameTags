import { addPublicContact, canReadPublicContacts, getPublicCard, getPublicContacts } from "@/lib/server/public-store";
import type { Contact } from "@/lib/types";

export const runtime = "nodejs";

const requestLog = new Map<string, number[]>();
const MAX_SUBMISSIONS_PER_HOUR = 12;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  const ownerSyncKey = _request.headers.get("x-nametag-owner-key");

  try {
    const allowed = await canReadPublicContacts(cardId, ownerSyncKey);
    if (!allowed) {
      return Response.json({ contacts: [], error: "Owner authorization required." }, { status: 401 });
    }
    const contacts = await getPublicContacts(cardId, ownerSyncKey);
    return Response.json({ contacts });
  } catch (error) {
    console.error("Could not sync public contacts", error);
    return Response.json(
      { contacts: [], error: "Connections are temporarily unavailable." },
      { status: 503 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  try {
    if (isRateLimited(request, cardId)) {
      return Response.json({ ok: false, error: "Please wait a moment before trying again." }, { status: 429 });
    }

    const payload = (await request.json()) as Partial<Contact> & { website?: string; consent?: boolean };
    if (payload.website?.trim()) {
      return Response.json({ ok: true, accepted: false });
    }

    if (payload.consent !== true) {
      return Response.json(
        { ok: false, error: "Please confirm before sharing your contact details." },
        { status: 400 }
      );
    }

    // The scanner may name an event in the browser request, but it must never
    // decide where their data appears in the owner's workspace. The server
    // derives that relationship from the published room pass instead.
    const publicCard = await getPublicCard(cardId);
    if (!publicCard?.eventId) {
      return Response.json({ ok: false, error: "This room pass is no longer available." }, { status: 404 });
    }

    const contact = sanitizeContact(payload, cardId, publicCard.eventId);
    if (!contact) {
      return Response.json(
        { ok: false, error: "Name and contact are required." },
        { status: 400 }
      );
    }

    const result = await addPublicContact(contact);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Could not save public contact", error);
    return Response.json(
      { ok: false, error: "Your details could not be saved. Please try again before leaving this card." },
      { status: 503 }
    );
  }
}

function sanitizeContact(payload: Partial<Contact>, cardId: string, eventId: string) {
  const name = cleanText(payload.name, 80);
  const contactValue = cleanText(payload.contact, 240);
  if (!name || !contactValue) return null;
  const submittedAt = new Date().toISOString();

  return {
    id: cleanText(payload.id, 80) || `contact_${Date.now()}`,
    eventId,
    cardId: cleanText(cardId, 80),
    name,
    contact: contactValue,
    note: cleanText(payload.note, 600),
    promise: cleanText(payload.promise, 200),
    priority: payload.priority === "high" || payload.priority === "low" ? payload.priority : "medium",
    followUpDraft: cleanText(payload.followUpDraft, 1000),
    done: false,
    consentedAt: submittedAt,
    createdAt: submittedAt
  } satisfies Contact;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isRateLimited(request: Request, cardId: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const key = `${cardId}:${client}`;
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000;
  const recent = (requestLog.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > MAX_SUBMISSIONS_PER_HOUR;
}
