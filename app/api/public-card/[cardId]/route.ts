import { deletePublicCard, getPublicCard, upsertPublicCard } from "@/lib/server/public-store";
import type { PublicCard } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  try {
    const card = await getPublicCard(cardId);
    if (!card) {
      return Response.json({ card: null }, { status: 404 });
    }
    return Response.json({ card });
  } catch (error) {
    console.error("Could not read public card", error);
    return Response.json(
      { card: null, error: "This public card is temporarily unavailable." },
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
    const payload = (await request.json()) as { card?: unknown; ownerSyncKey?: unknown };
    const card = payload.card;
    const ownerSyncKey = cleanText(payload.ownerSyncKey, 96);
    if (!isPublicCard(card) || card.id !== cardId || !ownerSyncKey) {
      return Response.json({ ok: false, error: "Invalid public card payload." }, { status: 400 });
    }

    const result = await upsertPublicCard(card, ownerSyncKey);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Could not publish public card", error);
    return Response.json(
      {
        ok: false,
        error: "Public publishing is unavailable. Connect Supabase before using this QR across devices."
      },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  const ownerSyncKey = cleanText(request.headers.get("x-nametag-owner-key"), 96);
  if (!ownerSyncKey) {
    return Response.json({ ok: false, error: "Owner authorization is required." }, { status: 401 });
  }

  try {
    const result = await deletePublicCard(cardId, ownerSyncKey);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Could not delete public card", error);
    return Response.json(
      {
        ok: false,
        error: "We could not remove this public QR card. Check your connection and try again."
      },
      { status: 503 }
    );
  }
}

function isPublicCard(value: unknown): value is PublicCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<PublicCard>;
  if (
    !cleanText(card.id, 80) ||
    !cleanText(card.ownerName, 120) ||
    !cleanText(card.createdAt, 80) ||
    !Array.isArray(card.links) ||
    card.links.length > 16
  ) {
    return false;
  }

  return card.links.every((link) => {
    const candidate = link as Partial<PublicCard["links"][number]>;
    const url = cleanText(candidate.url, 500);
    return (
      Boolean(cleanText(candidate.label, 120)) &&
      Boolean(cleanText(candidate.type, 40)) &&
      /^(https?:\/\/|mailto:)/i.test(url)
    );
  });
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
