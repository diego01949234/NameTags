import { rateLimitRequest } from "@/lib/server/request-rate-limit";

export const runtime = "nodejs";

const MAX_EVENT_URL_LENGTH = 2048;
const MAX_EVENT_PAGE_BYTES = 1_000_000;

const privateHostPatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^169\.254\./,
  /^\[?::1\]?$/i
];

export async function POST(request: Request) {
  const limit = rateLimitRequest(request, "event-brief", { maxRequests: 12, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return Response.json(
      { ok: false, error: "You have checked several event pages. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let url: string | undefined;
  try {
    ({ url } = (await request.json()) as { url?: string });
  } catch {
    return Response.json({ ok: false, error: "Paste a public event URL or use the description field." }, { status: 400 });
  }

  const parsed = safeParseUrl(url?.slice(0, MAX_EVENT_URL_LENGTH));
  if (!parsed) {
    return Response.json({
      ok: false,
      error: "Paste a public http(s) event URL or use the description field."
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const { response, sourceUrl } = await fetchPublicEventPage(parsed, controller.signal);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return Response.json({
        ok: false,
        title: sourceUrl.hostname,
        text: "",
        sourceUrl: sourceUrl.toString(),
        error: "This link did not return an event page. Paste the event description instead."
      });
    }
    const html = await readTextWithLimit(response, MAX_EVENT_PAGE_BYTES);
    const title = extractOgTitle(html) ?? sourceUrl.hostname;
    const description = extractMetaDescription(html);
    const structuredText = extractStructuredEventFacts(html);
    const bodyText = htmlToText(extractReadableHtml(html));
    const metaText = [title, description].filter(Boolean).join(". ");
    const bodyWordCount = countWords(bodyText);
    const descriptionWordCount = countWords(description ?? "");
    const hasUsefulBody = bodyWordCount >= 80;
    const hasUsefulMeta = descriptionWordCount >= 12;
    const hasUsefulStructuredData = countWords(structuredText) >= 8;
    const text = [metaText, structuredText, hasUsefulBody ? bodyText : ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 6000);

    if (response.ok && !hasUsefulBody && !hasUsefulMeta && !hasUsefulStructuredData) {
      return Response.json({
        ok: false,
        title,
        text,
        sourceUrl: sourceUrl.toString(),
        contentQuality: "thin",
        error:
          "This event page did not include enough readable text. Paste the event description instead."
      });
    }

    return Response.json({
      ok: response.ok,
      title,
      text,
      sourceUrl: sourceUrl.toString(),
      contentQuality: hasUsefulBody ? "body" : "metadata",
      error: response.ok ? undefined : `Event page returned ${response.status}`
    });
  } catch {
    return Response.json({
      ok: false,
      title: parsed.hostname,
      text: "",
      sourceUrl: parsed.toString(),
      error: "Could not fetch event page. Paste a short event description instead."
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicEventPage(url: URL, signal: AbortSignal) {
  const requestInit = {
    signal,
    redirect: "manual" as const,
    headers: { "User-Agent": "NametagCodexHackathon/1.0" }
  };
  const firstResponse = await fetch(url.toString(), requestInit);
  if (!isRedirect(firstResponse.status)) {
    return { response: firstResponse, sourceUrl: url };
  }

  const location = firstResponse.headers.get("location");
  const redirectedUrl = location ? safeParseUrl(new URL(location, url).toString()) : null;
  if (!redirectedUrl) {
    throw new Error("Event link redirected to an unavailable address");
  }

  const redirectedResponse = await fetch(redirectedUrl.toString(), requestInit);
  if (isRedirect(redirectedResponse.status)) {
    throw new Error("Event link has too many redirects");
  }
  return { response: redirectedResponse, sourceUrl: redirectedUrl };
}

async function readTextWithLimit(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) {
    throw new Error("Event page is too large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Event page is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const text = new TextDecoder().decode(concatenateChunks(chunks, total));
  return text;
}

function concatenateChunks(chunks: Uint8Array[], total: number) {
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function isRedirect(status: number) {
  return status >= 300 && status < 400;
}

function safeParseUrl(input?: string) {
  if (!input) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (privateHostPatterns.some((pattern) => pattern.test(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}

function extractOgTitle(html: string) {
  return (
    extractMetaContent(html, "property", "og:title") ??
    extractMetaContent(html, "name", "twitter:title") ??
    html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
  )?.trim();
}

function extractMetaDescription(html: string) {
  return (
    extractMetaContent(html, "property", "og:description") ??
    extractMetaContent(html, "name", "description") ??
    extractMetaContent(html, "name", "twitter:description")
  )?.trim();
}

function extractMetaContent(html: string, attrName: "name" | "property", attrValue: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = metaTags.find((item) => {
    const attr = item.match(new RegExp(`${attrName}=["']([^"']+)["']`, "i"))?.[1];
    return attr?.toLowerCase() === attrValue.toLowerCase();
  });
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1];
}

function extractReadableHtml(html: string) {
  const candidates = ["main", "article"]
    .map((tag) => html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "")
    .filter(Boolean)
    .sort((first, second) => second.length - first.length);

  return candidates[0] || html;
}

function extractStructuredEventFacts(html: string) {
  const facts: string[] = [];
  const scripts = Array.from(
    html.matchAll(
      /<script\b[^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi
    )
  );

  for (const script of scripts) {
    try {
      const json = JSON.parse(script[1]);
      for (const item of flattenJsonLd(json)) {
        if (!isJsonLdEvent(item)) continue;

        const name = getStructuredText(item.name, 220);
        const description = getStructuredText(item.description, 900);
        const startDate = getStructuredText(item.startDate, 100);
        const endDate = getStructuredText(item.endDate, 100);
        const location = getStructuredText(item.location, 220);
        const organizers = getStructuredNames(item.organizer);
        const featuredPeople = getStructuredNames(item.performer ?? item.speaker);

        if (name) facts.push(`Structured event title: ${name}`);
        if (description) facts.push(`Structured event description: ${description}`);
        if (startDate) facts.push(`Structured start: ${startDate}`);
        if (endDate) facts.push(`Structured end: ${endDate}`);
        if (location) facts.push(`Structured location: ${location}`);
        if (organizers.length) facts.push(`Structured organizer: ${organizers.join(", ")}`);
        if (featuredPeople.length) facts.push(`Structured featured people: ${featuredPeople.join(", ")}`);
      }
    } catch {
      // Some sites emit invalid JSON-LD. The readable page and metadata still work.
    }
  }

  return Array.from(new Set(facts)).slice(0, 10).join("\n");
}

function flattenJsonLd(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!isRecord(value)) return [];

  const graph = value["@graph"];
  return [value, ...flattenJsonLd(graph)];
}

function isJsonLdEvent(value: Record<string, unknown>) {
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  return types.some((type) => String(type ?? "").toLowerCase().includes("event"));
}

function getStructuredNames(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      values
        .map((item) => (isRecord(item) ? getStructuredText(item.name, 140) : getStructuredText(item, 140)))
        .filter(Boolean)
    )
  ).slice(0, 6);
}

function getStructuredText(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return cleanStructuredText(String(value)).slice(0, maxLength);
  }
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => getStructuredText(item, maxLength)).filter(Boolean)))
      .join(", ")
      .slice(0, maxLength);
  }
  if (!isRecord(value)) return "";

  const directFields = [
    value.name,
    value.streetAddress,
    value.addressLocality,
    value.addressRegion,
    value.addressCountry
  ];
  return Array.from(new Set(directFields.map((item) => getStructuredText(item, maxLength)).filter(Boolean)))
    .join(", ")
    .slice(0, maxLength);
}

function cleanStructuredText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
