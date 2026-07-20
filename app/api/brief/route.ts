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
    const bodyText = htmlToText(html);
    const metaText = [title, description].filter(Boolean).join(". ");
    const bodyWordCount = countWords(bodyText);
    const descriptionWordCount = countWords(description ?? "");
    const hasUsefulBody = bodyWordCount >= 80;
    const hasUsefulMeta = descriptionWordCount >= 12;
    const text = [metaText, hasUsefulBody ? bodyText : ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 6000);

    if (response.ok && !hasUsefulBody && !hasUsefulMeta) {
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
