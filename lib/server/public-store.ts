import { promises as fs } from "fs";
import path from "path";
import type { Contact, PublicCard } from "@/lib/types";

type PublicStore = {
  cards: StoredPublicCard[];
  contacts: Contact[];
};

type StoredPublicCard = PublicCard & {
  ownerSyncKey?: string;
};

export type PublicStoreMode = "supabase" | "local_server" | "unconfigured";

const storePath = path.join(process.cwd(), "work", "nametag-public-store.json");

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  // Supabase now recommends secret keys. Keep the legacy variable as a fallback
  // so existing local setups continue to work during the transition.
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key, usesSecretKey: key.startsWith("sb_secret_") };
}

export function getPublicStoreMode(): PublicStoreMode {
  if (supabaseConfig()) return "supabase";
  // Keep `next start` useful on a local machine, but Vercel/serverless filesystems
  // are ephemeral. Refuse that fallback there instead of losing scanner contacts.
  const isEphemeralRuntime = Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
  );
  return isEphemeralRuntime ? "unconfigured" : "local_server";
}

async function supabaseFetch<T>(pathName: string, init?: RequestInit): Promise<T> {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured");
  const response = await fetch(`${config.url}/rest/v1/${pathName}`, {
    ...init,
    headers: {
      apikey: config.key,
      // New sb_secret keys authenticate with apikey; the legacy JWT key still
      // needs the Authorization header to take on the service_role context.
      ...(config.usesSecretKey ? {} : { Authorization: `Bearer ${config.key}` }),
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}`);
  }

  // Upserts intentionally omit a response body unless `return=representation`
  // is requested. Treat an empty successful response as success instead of
  // turning it into a misleading JSON parse failure.
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

async function readLocalStore(): Promise<PublicStore> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    return JSON.parse(raw) as PublicStore;
  } catch {
    return { cards: [], contacts: [] };
  }
}

async function writeLocalStore(store: PublicStore) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2));
}

export async function upsertPublicCard(card: PublicCard, ownerSyncKey: string) {
  const mode = getPublicStoreMode();
  if (mode === "supabase") {
    if (!ownerSyncKey) throw new Error("Missing owner sync key");
    if (!(await canWritePublicCard(card.id, ownerSyncKey))) {
      throw new Error("Public card owner key mismatch");
    }
    await supabaseFetch("cards", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        id: card.id,
        event_id: card.eventId,
        // Legacy schema columns remain populated for compatibility, but owner
        // research/persona copy never becomes part of the returned public data.
        persona_name: "nametag_public_v2",
        owner_name: card.ownerName,
        headline: card.headline,
        bio: card.bio ?? "",
        cta: "",
        focus: null,
        event_name: card.eventName,
        links: card.links,
        owner_sync_key: ownerSyncKey,
        created_at: card.createdAt
      })
    });
    return { mode: "supabase" };
  }

  if (mode === "unconfigured") {
    throw new Error("Public storage is not configured");
  }

  const store = await readLocalStore();
  if (!ownerSyncKey) throw new Error("Missing owner sync key");
  const existingCard = store.cards.find((item) => item.id === card.id);
  if (existingCard?.ownerSyncKey && existingCard.ownerSyncKey !== ownerSyncKey) {
    throw new Error("Public card owner key mismatch");
  }
  const cards = [{ ...card, ownerSyncKey }, ...store.cards.filter((item) => item.id !== card.id)];
  await writeLocalStore({ ...store, cards });
  return { mode: "local_server" };
}

async function canWritePublicCard(cardId: string, ownerSyncKey: string) {
  const [existing] = await supabaseFetch<Array<{ owner_sync_key?: string }>>(
    `cards?select=owner_sync_key&id=eq.${encodeURIComponent(cardId)}&limit=1`
  );
  return !existing?.owner_sync_key || existing.owner_sync_key === ownerSyncKey;
}

export async function getPublicCard(cardId: string) {
  if (getPublicStoreMode() === "supabase") {
    const [card] = await supabaseFetch<
      Array<{
        id: string;
        event_id?: string;
        persona_name?: string;
        owner_name: string;
        headline?: string;
        bio?: string;
      event_name?: string;
      links: PublicCard["links"];
      created_at: string;
      }>
    >(
      `cards?select=id,event_id,persona_name,owner_name,headline,bio,event_name,links,created_at&id=eq.${encodeURIComponent(cardId)}&limit=1`
    );
    if (!card) return null;
    return {
      id: card.id,
      version: card.persona_name === "nametag_public_v2" ? 2 : undefined,
      eventId: card.event_id,
      ownerName: card.owner_name,
      headline: card.headline,
      bio: card.persona_name === "nametag_public_v2" ? card.bio : undefined,
      eventName: card.event_name,
      links: card.links,
      createdAt: card.created_at
    } satisfies PublicCard;
  }

  if (getPublicStoreMode() === "unconfigured") return null;
  const store = await readLocalStore();
  const card = store.cards.find((item) => item.id === cardId);
  return card ? toPublicCard(card) : null;
}

export async function addPublicContact(contact: Contact) {
  const mode = getPublicStoreMode();
  if (mode === "supabase") {
    await supabaseFetch("contacts", {
      method: "POST",
      body: JSON.stringify({
        id: contact.id,
        card_id: contact.cardId,
        event_id: contact.eventId,
        name: contact.name,
        contact: contact.contact,
        note: contact.note,
        promise: contact.promise,
        priority: contact.priority,
        follow_up_draft: contact.followUpDraft,
        done: contact.done ?? false,
        consented_at: contact.consentedAt ?? contact.createdAt,
        created_at: contact.createdAt
      })
    });
    return { mode: "supabase" };
  }

  if (mode === "unconfigured") {
    throw new Error("Public storage is not configured");
  }

  const store = await readLocalStore();
  const contacts = [contact, ...store.contacts.filter((item) => item.id !== contact.id)];
  await writeLocalStore({ ...store, contacts });
  return { mode: "local_server" };
}

export async function canReadPublicContacts(cardId: string, ownerSyncKey: string | null) {
  if (!ownerSyncKey) return false;

  if (getPublicStoreMode() === "supabase") {
    const [card] = await supabaseFetch<Array<{ owner_sync_key?: string }>>(
      `cards?select=owner_sync_key&id=eq.${encodeURIComponent(cardId)}&limit=1`
    );
    return Boolean(card?.owner_sync_key && card.owner_sync_key === ownerSyncKey);
  }

  if (getPublicStoreMode() === "unconfigured") return false;
  const store = await readLocalStore();
  return store.cards.some((card) => card.id === cardId && card.ownerSyncKey === ownerSyncKey);
}

export async function getPublicContacts(cardId: string, ownerSyncKey: string | null) {
  if (!(await canReadPublicContacts(cardId, ownerSyncKey))) {
    throw new Error("Owner authorization required");
  }

  if (getPublicStoreMode() === "supabase") {
    const rows = await supabaseFetch<
      Array<{
        id: string;
        card_id: string;
        event_id?: string;
        name: string;
        contact: string;
        note?: string;
        promise?: string;
        priority?: "high" | "medium" | "low";
        follow_up_draft?: string;
        done?: boolean;
        consented_at?: string;
        created_at: string;
      }>
    >(`contacts?select=*&card_id=eq.${encodeURIComponent(cardId)}&order=created_at.desc`);
    return rows.map((row) => ({
      id: row.id,
      eventId: row.event_id ?? "",
      cardId: row.card_id,
      name: row.name,
      contact: row.contact,
      note: row.note ?? "",
      promise: row.promise ?? "",
      priority: row.priority === "high" || row.priority === "low" ? row.priority : "medium",
      followUpDraft: row.follow_up_draft,
      done: row.done ?? false,
      consentedAt: row.consented_at ?? row.created_at,
      createdAt: row.created_at
    }));
  }

  const store = await readLocalStore();
  return store.contacts.filter((contact) => contact.cardId === cardId);
}

function toPublicCard(card: StoredPublicCard): PublicCard {
  // Explicitly shape local fallback data too, so legacy files cannot leak old
  // AI-generated persona, CTA, or focus fields through the public route.
  return {
    id: card.id,
    version: card.version,
    eventId: card.eventId,
    ownerName: card.ownerName,
    headline: card.headline,
    bio: card.version === 2 ? card.bio : undefined,
    eventName: card.eventName,
    links: card.links,
    createdAt: card.createdAt
  };
}
