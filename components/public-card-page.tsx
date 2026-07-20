"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowUpRight, Bookmark, CheckCircle2, ChevronDown, Copy, ExternalLink, ImageDown, MessageSquareText, Send } from "lucide-react";
import { LinkIcon, PrimaryButton, inputClass } from "@/components/ui-primitives";
import { linkTypeLabels } from "@/lib/links";
import { makeId } from "@/lib/ids";
import { initialState } from "@/lib/sample-data";
import { loadState } from "@/lib/storage";
import type { Contact, NametagState, PublicCard } from "@/lib/types";

export function PublicCardPage({ cardId }: { cardId: string }) {
  const [state, setState] = useState<NametagState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [publicCard, setPublicCard] = useState<PublicCard | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [consent, setConsent] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [showBrowserPrompt, setShowBrowserPrompt] = useState(false);
  const [publicCardResolved, setPublicCardResolved] = useState(false);
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [canOpenSafari, setCanOpenSafari] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
    setCurrentUrl(window.location.href);
    setShowBrowserPrompt(
      shouldOfferBrowserPrompt() &&
        window.sessionStorage.getItem(`nametag_browser_prompt_${cardId}`) !== "dismissed"
    );
    setCanOpenSafari(shouldOfferBrowserPrompt());
    fetch(`/api/public-card/${cardId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { card?: PublicCard } | null) => {
        if (data?.card) setPublicCard(data.card);
      })
      .catch(() => undefined)
      .finally(() => setPublicCardResolved(true));
  }, []);

  const card = useMemo(
    () => state.cards.find((item) => item.id === cardId),
    [cardId, state.cards]
  );
  const event = card ? state.events.find((item) => item.id === card.eventId) : undefined;
  const profile = state.profile;
  const selectedLinks = card ? state.links.filter((link) => card.selectedLinkIds.includes(link.id)) : [];
  const shownLinks =
    publicCard?.links ??
    selectedLinks.map((link) => ({
      label: link.label,
      type: link.type,
      url: link.url
    }));
  const displayName = publicCard?.ownerName ?? profile.name;
  const displayHeadline = publicCard?.headline ?? profile.headline;
  const displayEventName = publicCard?.eventName ?? event?.name ?? "Live event";
  // On another person's device, only a server-resolved public card may supply
  // owner copy. Falling back to that device's local profile would be misleading.
  const displayBio = publicCard ? publicCard.bio : profile.defaultBio;
  const publicCardId = publicCard?.id ?? card?.id ?? cardId;
  const publicEventId = publicCard?.eventId ?? card?.eventId ?? "";
  const browserName = getPreferredBrowserName();
  const primaryLink = shownLinks[0];
  const secondaryLinks = shownLinks.slice(1);

  function updateContact(value: string) {
    setContact(value);
    if (!nameEdited) {
      const inferred = inferNameFromContact(value);
      if (inferred) setName(inferred);
    }
  }

  async function saveCardLink() {
    const shareData = {
      title: `${displayName} - NameTag`,
      text: displayBio || `${displayName}'s NameTag card`,
      url: currentUrl
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData).catch(() => undefined);
      setSavedMessage("Card shared.");
      return;
    }

    await navigator.clipboard?.writeText(currentUrl).catch(() => undefined);
    setSavedMessage("Card link copied.");
    if (showBrowserPrompt) dismissBrowserPrompt();
  }

  function dismissBrowserPrompt() {
    window.sessionStorage.setItem(`nametag_browser_prompt_${cardId}`, "dismissed");
    setShowBrowserPrompt(false);
  }

  async function openInBrowser() {
    const cardUrl = currentUrl || window.location.href;
    await navigator.clipboard?.writeText(cardUrl).catch(() => undefined);
    dismissBrowserPrompt();

    const browserUrl = getExternalBrowserUrl(cardUrl);
    if (browserUrl !== cardUrl) {
      window.location.assign(browserUrl);
      window.setTimeout(() => {
        setSavedMessage("Safari launch requested. The card link is copied too.");
      }, 750);
      return;
    }

    const opened = window.open(cardUrl, "_blank", "noopener,noreferrer");
    setSavedMessage(opened ? "Opened in a new browser tab." : "Card link copied. Open it in your browser to keep it.");
  }

  async function downloadCardImage() {
    if (!downloadCardRef.current) return;
    setIsDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const imageUrl = await toPng(downloadCardRef.current, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2
      });
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${displayName.replace(/\s+/g, "-").toLowerCase()}-nametag-card.png`;
      link.click();
      setSavedMessage("Card image downloaded.");
    } catch {
      setSavedMessage("Could not make the card image. Try again in a browser.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSubmit(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!name.trim() || !contact.trim() || !consent) return;
    setIsSubmitting(true);
    setSubmitError("");

    const noteText = note.trim() || "Connected through NameTag public card.";
    const newContact: Contact = {
      id: makeId("contact"),
      eventId: publicEventId,
      cardId: publicCardId,
      name: name.trim(),
      contact: contact.trim(),
      note: noteText,
      promise: "",
      priority: "medium",
      followUpDraft: `Hi ${name.trim().split(" ")[0]}, great meeting you at ${
        displayEventName
      }. I remembered: ${noteText} Here is the NameTag link we discussed, and I would love to keep the conversation going.`,
      done: false,
      consentedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`/api/public-card/${publicCardId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newContact, consent: true, website })
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error ?? "Your details could not be saved. Please try again before leaving this card.");
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Your details could not be saved. Please try again before leaving this card."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (hydrated && publicCardResolved && !publicCard && !card) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink px-4 text-white grid-paper">
        <section className="w-full max-w-sm rounded-lg border border-white/15 bg-white/[0.08] p-5 text-center">
          <div className="font-badge-mono text-[10px] font-black tracking-normal text-coral">nametags</div>
          <h1 className="mt-3 text-2xl font-black">This room pass is not available.</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">
            The owner may have removed it, or this link is incomplete.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-5 text-ink grid-paper">
      {showBrowserPrompt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-lg border border-white/20 bg-white p-5 shadow-2xl">
            <div className="grid size-12 place-items-center rounded-lg bg-coral/10 text-coral">
              <ExternalLink className="size-6" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-ink">
              Open in {browserName}?
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Open this card in Safari so it stays available after you close the scanner. The link is copied as a backup.
            </p>
            <div className="mt-4 space-y-2">
              <PrimaryButton onClick={openInBrowser}>
                <ExternalLink className="size-4" />
                Open in {browserName}
              </PrimaryButton>
              <button
                type="button"
                onClick={saveCardLink}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink"
              >
                <Copy className="size-4" />
                Copy / save link
              </button>
              <button
                type="button"
                onClick={dismissBrowserPrompt}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-black text-slate-soft"
              >
                Continue here
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="mx-auto max-w-sm">
        <div className="mb-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="relative grid size-8 place-items-center overflow-hidden rounded-md bg-coral text-base font-black text-white">
              <span className="absolute inset-y-1 left-1 w-0.5 rounded-full bg-white" />
              <span className="absolute inset-y-1 right-1 w-0.5 rounded-full bg-white" />
              <span className="relative">N</span>
            </div>
            <span className="text-sm font-black">nametags card</span>
          </div>
          <span className="font-badge-mono text-[10px] font-black uppercase text-white/45">public</span>
        </div>

        <div className="mx-auto mb-[-2px] h-12 w-20 rounded-b-lg bg-coral" />
        <section className="overflow-hidden rounded-lg border border-white/20 bg-white shadow-2xl shadow-black">
          <div className="border-b-4 border-coral bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="relative grid size-11 place-items-center overflow-hidden rounded-md bg-coral text-xl font-black text-white">
                <span className="absolute inset-y-1 left-1 w-1 rounded-full bg-white" />
                <span className="absolute inset-y-1 right-1 w-1 rounded-full bg-white" />
                <span className="relative">N</span>
              </div>
            </div>
            <div className="font-badge-display text-4xl tracking-tight text-ink">{displayName}</div>
            {displayHeadline && <div className="mt-1 text-sm font-black text-cobalt">{displayHeadline}</div>}
          </div>

          <div className="space-y-5 p-5">
            <div>
              <div className="mb-2 font-badge-mono text-[10px] font-black uppercase tracking-normal text-slate-soft">Links</div>
              {primaryLink ? (
                <div className="space-y-2">
                  <a
                    href={primaryLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-14 items-center gap-3 rounded-lg bg-ink p-3 text-white shadow-sm transition hover:bg-cobalt"
                  >
                    <LinkIcon type={primaryLink.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black">{primaryLink.label}</span>
                      <span className="block truncate text-xs font-semibold text-white/65">
                        {linkTypeLabels[primaryLink.type]}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0" />
                  </a>
                  {secondaryLinks.length > 0 && (
                    <div className="pt-2">
                      <div className="mb-2 font-badge-mono text-[10px] font-black uppercase tracking-normal text-slate-soft">
                        More ways to connect
                      </div>
                      <div className="space-y-2">
                        {secondaryLinks.map((link) => (
                          <a
                            key={`${link.type}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 transition hover:border-ink hover:bg-wash"
                          >
                            <LinkIcon type={link.type} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-black text-ink">{link.label}</span>
                              <span className="block truncate text-xs font-semibold text-slate-soft">
                                {linkTypeLabels[link.type]}
                              </span>
                            </span>
                            <ArrowUpRight className="size-4 shrink-0 text-slate-soft" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line bg-wash p-3 text-sm font-semibold leading-5 text-slate-600">
                  This card is being set up. Check back soon.
                </p>
              )}
              {displayBio && <p className="mt-4 border-t border-line pt-4 text-sm leading-5 text-slate-600">{displayBio}</p>}
            </div>

            <section className="flex items-center justify-between border-t border-line pt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-soft">
                <Bookmark className="size-3.5 text-cobalt" />
                Keep card
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={saveCardLink}
                  title="Save card link"
                  aria-label="Save card link"
                  className="grid size-9 place-items-center rounded-lg border border-line bg-white text-ink transition hover:border-ink hover:bg-wash"
                >
                  <Copy className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={downloadCardImage}
                  disabled={isDownloading}
                  title="Download card image"
                  aria-label="Download card image"
                  className="grid size-9 place-items-center rounded-lg border border-line bg-white text-ink transition hover:border-ink hover:bg-wash"
                >
                  <ImageDown className={`size-4 ${isDownloading ? "animate-pulse" : ""}`} />
                </button>
                {canOpenSafari && (
                  <button
                    type="button"
                    onClick={openInBrowser}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-coral/30 bg-coral/10 px-2.5 text-xs font-black text-coral"
                  >
                    <ExternalLink className="size-3.5" />
                    Safari
                  </button>
                )}
              </div>
            </section>
            {savedMessage && <div className="-mt-3 text-right text-[10px] font-bold leading-4 text-teal-700" role="status">{savedMessage}</div>}

            {submitted ? (
              <div className="rounded-lg border border-mint/20 bg-mint/10 p-4 text-center">
                <CheckCircle2 className="mx-auto size-8 text-mint" />
                <h2 className="mt-2 text-lg font-black">Connection saved.</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  {displayName.split(" ")[0]} now has the details you chose to share and can follow up from this event.
                </p>
              </div>
            ) : (
              <section className="border-t border-line pt-4">
                <div className="rounded-lg border border-coral/20 bg-coral/5 p-3">
                  <div className="flex items-start gap-2">
                    <MessageSquareText className="mt-0.5 size-4 shrink-0 text-coral" />
                    <div>
                      <div className="text-sm font-black text-ink">You met {displayName.split(" ")[0]} at {displayEventName}.</div>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                        Their public links are above. Share your own details only if you want a follow-up from this conversation.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={saveCardLink}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2 text-xs font-black text-ink transition hover:border-ink hover:bg-wash"
                    >
                      <Bookmark className="size-3.5" />
                      Save their card
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContactForm((current) => !current)}
                      aria-expanded={showContactForm}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-coral px-2 text-xs font-black text-white transition hover:bg-ink"
                    >
                      Share my details
                      <ChevronDown className={`size-3.5 transition ${showContactForm ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>
                {showContactForm && (
                  <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg border border-line bg-wash p-3">
                    <p className="text-xs font-semibold leading-5 text-slate-soft">
                      This is a two-way choice: {displayName.split(" ")[0]} shared this public card, and you choose what to share back.
                    </p>
                    <label className="sr-only" htmlFor="connection-name">Your name</label>
                    <input
                      id="connection-name"
                      className={inputClass}
                      value={name}
                      onChange={(eventChange) => {
                        setName(eventChange.target.value);
                        setNameEdited(true);
                      }}
                      placeholder="Your name"
                      required
                    />
                    <input
                      aria-hidden="true"
                      autoComplete="off"
                      className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
                      name="website"
                      tabIndex={-1}
                      value={website}
                      onChange={(eventChange) => setWebsite(eventChange.target.value)}
                    />
                    <label className="sr-only" htmlFor="connection-contact">Your contact detail</label>
                    <input
                      id="connection-contact"
                      className={inputClass}
                      value={contact}
                      onChange={(eventChange) => updateContact(eventChange.target.value)}
                      placeholder="Email, LinkedIn, LINE, or handle"
                      required
                    />
                    <label className="sr-only" htmlFor="connection-note">Conversation note</label>
                    <textarea
                      id="connection-note"
                      className={`${inputClass} min-h-20 resize-none`}
                      value={note}
                      onChange={(eventChange) => setNote(eventChange.target.value)}
                      placeholder="What should they remember from this conversation?"
                    />
                    <label className="flex items-start gap-2 rounded-lg border border-line bg-wash p-3 text-xs font-bold leading-5 text-slate-600">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(eventChange) => setConsent(eventChange.target.checked)}
                        className="mt-0.5 size-4 accent-cobalt"
                      />
                      I agree that {displayName} can save my contact details and note for a follow-up from {displayEventName}.
                    </label>
                    {submitError && <p className="text-xs font-bold leading-5 text-red-600">{submitError}</p>}
                    <PrimaryButton type="submit" disabled={!hydrated || !consent || isSubmitting}>
                      <Send className="size-4" />
                      {isSubmitting ? "Saving connection..." : "Agree and share my details"}
                    </PrimaryButton>
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="inline-flex min-h-9 w-full items-center justify-center rounded-md px-3 text-xs font-black text-slate-soft transition hover:bg-white hover:text-ink"
                    >
                      Not now
                    </button>
                  </form>
                )}
              </section>
            )}
          </div>
        </section>
      </div>
      <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 w-[720px] overflow-hidden rounded-[24px] bg-white text-[#07111f]">
        <div ref={downloadCardRef} className="bg-white">
          <div className="h-5 bg-[#ff5b4d]" />
          <div className="flex min-h-[440px] flex-col p-12">
            <div className="flex items-start justify-between gap-8">
              <div>
                <div className="text-[16px] font-black tracking-normal text-[#ff5b4d]">nametags</div>
                <div className="mt-7 text-[54px] font-black leading-none">{displayName}</div>
                {displayHeadline && <div className="mt-3 text-[22px] font-bold text-[#2865d9]">{displayHeadline}</div>}
              </div>
              <div className="rounded-[16px] border-2 border-[#07111f] bg-white p-3">
                <QRCodeSVG value={currentUrl || "https://nametag-networking.vercel.app"} size={124} level="H" bgColor="#ffffff" fgColor="#07111f" />
              </div>
            </div>
            {displayBio && <div className="mt-8 max-w-[530px] text-[18px] font-semibold leading-relaxed text-[#53657a]">{displayBio}</div>}
            {primaryLink && <div className="mt-auto flex items-center justify-between rounded-[14px] bg-[#07111f] px-5 py-4 text-white"><span className="text-[20px] font-black">{primaryLink.label}</span><span className="text-[15px] font-bold text-white/70">{linkTypeLabels[primaryLink.type]}</span></div>}
          </div>
        </div>
      </div>
    </main>
  );
}

function getPreferredBrowserName() {
  if (typeof navigator === "undefined") return "browser";
  const ua = navigator.userAgent;
  if (isIosDevice(ua)) return "Safari";
  if (/Android/i.test(ua)) return "Chrome";
  return "browser";
}

function shouldOfferBrowserPrompt() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return isIosDevice(ua) && !isIosSafari(ua);
}

function getExternalBrowserUrl(url: string) {
  if (typeof navigator === "undefined") return url;
  const ua = navigator.userAgent;
  if (isIosDevice(ua) && shouldOfferBrowserPrompt() && url.startsWith("https://")) {
    return url.replace(/^https:\/\//i, "x-safari-https://");
  }
  return url;
}

function isIosDevice(ua: string) {
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isIosSafari(ua: string) {
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|MicroMessenger|LinkedInApp|Twitter|TikTok|Bytedance/i.test(ua);
}

function inferNameFromContact(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return "";

  const emailName = value.match(/^([^@\s]+)@/i)?.[1];
  if (emailName) return titleizeHandle(emailName);

  const linkedInSlug = value.match(/linkedin\.com\/in\/([^/?#]+)/i)?.[1];
  if (linkedInSlug) return titleizeHandle(linkedInSlug);

  const lineSlug = value.match(/line\.me\/ti\/p\/~?([^/?#]+)/i)?.[1];
  if (lineSlug) return titleizeHandle(lineSlug);

  if (value.startsWith("@")) return titleizeHandle(value.slice(1));

  return "";
}

function titleizeHandle(value: string) {
  return value
    .replace(/[_\-.]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
