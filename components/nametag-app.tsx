"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Copy,
  Eye,
  Flag,
  ImagePlus,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  NotebookPen,
  Plus,
  QrCode,
  Save,
  SendHorizontal,
  Settings2,
  Star,
  Trash2,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { QRShare } from "@/components/qr-share";
import { AccountLoadingScreen, AuthScreen } from "@/components/auth-screen";
import {
  CheckLine,
  EmptyState,
  Field,
  LinkIcon,
  MiniBadge,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  Toggle,
  inputClass
} from "@/components/ui-primitives";
import { defaultLinkLabel, inferLinkType, linkTypeIcons, linkTypeLabels, normalizeLinkUrl } from "@/lib/links";
import { makeId, makeSecret } from "@/lib/ids";
import { createDemoWorkspace } from "@/lib/demo-event";
import { getNetworkingRole, networkingRoleOptions } from "@/lib/networking-roles";
import { goalLabels, initialState } from "@/lib/sample-data";
import { loadState, normalizeState, resetState, saveState } from "@/lib/storage";
import { getSupabaseBrowserClient, hasSupabaseAuthConfig } from "@/lib/supabase-browser";
import type {
  Contact,
  Event,
  EventDebriefResult,
  EventGoal,
  EventNote,
  FollowUp,
  GenerationResult,
  LinkType,
  NametagCard,
  NametagState,
  NetworkingRole,
  PrepBrief,
  PublicCard,
  ResearchChatResult,
  ResearchMessage,
  UserProfile,
  UserLink
} from "@/lib/types";

type View = "home" | "vault" | "prep" | "brief" | "card" | "share" | "debrief";
type RoomView = "brief" | "card" | "share" | "debrief";
type ManualContactInput = Pick<Contact, "name" | "contact" | "note" | "promise" | "priority">;
type CloudStatus = "saved" | "saving" | "error";
type WorkspaceStorageMode = "account" | "device" | "sample";
type EventScreenshot = { dataUrl: string; name: string };

const MAX_EVENT_SCREENSHOT_BYTES = 3 * 1024 * 1024;
const acceptedEventScreenshotTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const linkTypes: LinkType[] = [
  "linkedin",
  "github",
  "demo",
  "devpost",
  "portfolio",
  "resume",
  "email",
  "instagram",
  "line",
  "youtube",
  "tiktok",
  "website",
  "calendar",
  "other"
];

const commonLinkTypes: LinkType[] = ["linkedin", "github", "portfolio", "resume", "website", "email"];
const additionalLinkTypes: LinkType[] = linkTypes.filter((type) => !commonLinkTypes.includes(type));

export function NametagApp() {
  const authConfigured = hasSupabaseAuthConfig();
  const [state, setState] = useState<NametagState>(initialState);
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("home");
  const [activeCardId, setActiveCardId] = useState(initialState.cards[0]?.id ?? "");
  const [eventDescription, setEventDescription] = useState("");
  const [eventScreenshot, setEventScreenshot] = useState<EventScreenshot | null>(null);
  const [eventScreenshotError, setEventScreenshotError] = useState("");
  const [eventGoal, setEventGoal] = useState<EventGoal>("learn");
  const [eventFocus, setEventFocus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [, setGenerationMode] = useState("ready");
  const [publishMode, setPublishMode] = useState("ready");
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!authConfigured);
  const [cloudReady, setCloudReady] = useState(!authConfigured);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("saved");
  const [demoMode, setDemoMode] = useState(false);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const demoWorkspaceRef = useRef<NametagState | null>(null);
  const syncedWorkspaceRef = useRef("");
  const workspaceStorageMode: WorkspaceStorageMode = demoMode ? "sample" : session ? "account" : "device";

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setActiveCardId(loaded.cards[0]?.id ?? "");
    setHasOnboarded(
      Boolean(
        loaded.profile.name ||
          loaded.profile.headline ||
          loaded.profile.defaultBio ||
          loaded.links.length ||
          loaded.events.length
      )
    );
    setHydrated(true);
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (hydrated && !demoMode) saveState(state);
  }, [demoMode, hydrated, state]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") setPasswordRecoveryMode(true);
      if (!nextSession) {
        syncedWorkspaceRef.current = "";
        setPasswordRecoveryMode(false);
        setCloudReady(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const userId = session?.user.id;
    const accountName = getAccountDisplayName(session?.user);
    if (!hydrated || demoMode || !supabase || !userId) return;

    let cancelled = false;
    setCloudReady(false);
    setCloudStatus("saving");

    void (async () => {
      const { data, error } = await supabase
        .from("user_workspaces")
        .select("state")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        const workspace = createInitialWorkspaceForAccount(stateRef.current, userId, accountName);
        setState(workspace);
        setHasOnboarded(hasWorkspaceContent(workspace));
        setCloudStatus("error");
        setCloudReady(true);
        return;
      }

      if (data?.state) {
        const workspace = claimStateForUser(normalizeState(data.state as Partial<NametagState>), userId, accountName);
        syncedWorkspaceRef.current = workspaceFingerprint(workspace);
        setState(workspace);
        setHasOnboarded(hasWorkspaceContent(workspace));
        setCloudStatus("saved");
      } else {
        const workspace = createInitialWorkspaceForAccount(stateRef.current, userId, accountName);
        setState(workspace);
        setHasOnboarded(hasWorkspaceContent(workspace));
        const { error: saveError } = await saveWorkspace(userId, workspace);
        if (cancelled) return;
        if (!saveError) syncedWorkspaceRef.current = workspaceFingerprint(workspace);
        setCloudStatus(saveError ? "error" : "saved");
      }
      setCloudReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [demoMode, hydrated, session?.user.id, session?.user.email]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!hydrated || demoMode || !cloudReady || !userId || !getSupabaseBrowserClient()) return;

    const workspace = claimStateForUser(state, userId, getAccountDisplayName(session?.user));
    const fingerprint = workspaceFingerprint(workspace);
    if (fingerprint === syncedWorkspaceRef.current) return;
    const timeout = window.setTimeout(() => {
      setCloudStatus("saving");
      void saveWorkspace(userId, workspace).then(({ error }) => {
        if (!error) {
          syncedWorkspaceRef.current = fingerprint;
          notifyWorkspaceWindows(userId, workspace);
        }
        setCloudStatus(error ? "error" : "saved");
      });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [cloudReady, demoMode, hydrated, session?.user.id, session?.user.email, state]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const userId = session?.user.id;
    const accountName = getAccountDisplayName(session?.user);
    if (!hydrated || demoMode || !cloudReady || !supabase || !userId || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(`nametag-workspace:${userId}`);
    channel.onmessage = (message: MessageEvent<{ workspace?: Partial<NametagState> }>) => {
      if (!message.data?.workspace) return;
      const workspace = claimStateForUser(normalizeState(message.data.workspace), userId, accountName);
      const fingerprint = workspaceFingerprint(workspace);
      if (fingerprint === syncedWorkspaceRef.current) return;
      syncedWorkspaceRef.current = fingerprint;
      setState(workspace);
      setActiveCardId((current) =>
        workspace.cards.some((card) => card.id === current) ? current : workspace.cards[0]?.id ?? ""
      );
      setHasOnboarded(hasWorkspaceContent(workspace));
      setCloudStatus("saved");
    };

    return () => channel.close();
  }, [cloudReady, demoMode, hydrated, session?.user.id, session?.user.email]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const userId = session?.user.id;
    const accountName = getAccountDisplayName(session?.user);
    if (!hydrated || demoMode || !cloudReady || !supabase || !userId) return;

    let cancelled = false;
    const refreshFromAccount = async () => {
      const localWorkspace = claimStateForUser(stateRef.current, userId, accountName);
      if (workspaceFingerprint(localWorkspace) !== syncedWorkspaceRef.current) return;

      const { data, error } = await supabase
        .from("user_workspaces")
        .select("state")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled || error || !data?.state) return;
      const workspace = claimStateForUser(normalizeState(data.state as Partial<NametagState>), userId, accountName);
      const fingerprint = workspaceFingerprint(workspace);
      if (fingerprint === syncedWorkspaceRef.current) return;

      syncedWorkspaceRef.current = fingerprint;
      setState(workspace);
      setActiveCardId((current) =>
        workspace.cards.some((card) => card.id === current) ? current : workspace.cards[0]?.id ?? ""
      );
      setHasOnboarded(hasWorkspaceContent(workspace));
      setCloudStatus("saved");
    };

    void refreshFromAccount();
    const interval = window.setInterval(() => void refreshFromAccount(), 12000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [cloudReady, demoMode, hydrated, session?.user.id, session?.user.email]);

  const activeCard = useMemo(
    () => state.cards.find((card) => card.id === activeCardId) ?? state.cards[0],
    [activeCardId, state.cards]
  );
  const activeEvent = activeCard
    ? state.events.find((event) => event.id === activeCard.eventId)
    : state.events[0];
  const publicUrl = activeCard ? `${origin}/c/${activeCard.id}` : `${origin}/c/card_builder`;

  useEffect(() => {
    if (!hydrated || !activeCard || !activeEvent) return;
    const publicCard = buildPublicCard(activeCard, activeEvent, state);
    fetch(`/api/public-card/${activeCard.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card: publicCard, ownerSyncKey: activeCard.ownerSyncKey })
    })
      .then(async (response) => {
        const data = (await response.json()) as { mode?: string; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not publish public card");
        return data;
      })
      .then((data: { mode?: string }) => setPublishMode(data.mode ?? "public fallback ready"))
      .catch(() => setPublishMode("unavailable"));
  }, [
    activeCard,
    activeEvent,
    hydrated,
    state.links,
    state.profile.defaultBio,
    state.profile.headline,
    state.profile.name
  ]);

  useEffect(() => {
    if (!hydrated || !activeCard) return;
    const syncContacts = () => {
      fetch(`/api/public-card/${activeCard.id}/contacts`, {
        headers: { "x-nametag-owner-key": activeCard.ownerSyncKey ?? "" }
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { contacts?: NametagState["contacts"] } | null) => {
          if (!data?.contacts?.length) return;
          setState((current) => {
            const existing = new Set(current.contacts.map((contact) => contact.id));
            const incoming = data.contacts!.filter((contact) => !existing.has(contact.id));
            if (!incoming.length) return current;
            return {
              ...current,
              contacts: [...incoming, ...current.contacts],
              events: current.events.map((event) =>
                event.id === activeCard.eventId ? { ...event, debrief: undefined } : event
              )
            };
          });
        })
        .catch(() => undefined);
    };

    syncContacts();
    const interval = window.setInterval(syncContacts, 12000);
    return () => window.clearInterval(interval);
  }, [activeCardId, hydrated]);

  async function generateNametag(eventSubmit?: FormEvent<HTMLFormElement>) {
    eventSubmit?.preventDefault();
    setIsGenerating(true);
    setGenerationError("");

    try {
      const eventInput = eventDescription.trim();
      if (!eventInput && !eventScreenshot) {
        setGenerationError("Paste an event link, write a sentence, or add a screenshot first.");
        return;
      }

      let resolvedEventName = inferEventName(eventInput);
      let groundedDescription = eventInput;
      let researchContext = eventInput;
      let researchSourceUrl: string | undefined;
      let researchQuality: Event["researchQuality"] = "description";
      let screenshotContext = "";

      if (eventScreenshot) {
        const screenshot = await fetch("/api/event-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: eventScreenshot.dataUrl })
        })
          .then((response) => response.json())
          .catch(
            () =>
              null as null | {
                ok?: boolean;
                title?: string;
                text?: string;
                error?: string;
              }
          );

        if (!screenshot?.ok || !screenshot.text) {
          setGenerationError(
            screenshot?.error ?? "I could not read that screenshot. Try a clearer image or paste a short event description."
          );
          return;
        }

        resolvedEventName = screenshot.title?.trim() || resolvedEventName;
        screenshotContext = `Event details extracted from screenshot:\n${screenshot.text}`;
        groundedDescription = [eventInput, screenshotContext].filter(Boolean).join("\n\n");
        researchContext = groundedDescription;
        researchQuality = "screenshot";
      }

      if (/^https?:\/\//i.test(eventInput)) {
        const brief = await fetch("/api/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: eventInput })
        })
          .then((response) => response.json())
          .catch(
            () =>
              null as null | {
                ok?: boolean;
                title?: string;
                text?: string;
                sourceUrl?: string;
                contentQuality?: Event["researchQuality"];
                error?: string;
              }
          );

        if (brief?.ok && brief.text) {
          resolvedEventName = brief.title?.trim() || resolvedEventName;
          groundedDescription = [
            eventInput,
            `Fetched event page title: ${brief.title}\nFetched event page text: ${brief.text}`,
            screenshotContext
          ]
            .filter(Boolean)
            .join("\n\n");
          researchContext = [brief.text, screenshotContext].filter(Boolean).join("\n\n");
          researchSourceUrl = brief.sourceUrl;
          researchQuality = brief.contentQuality === "body" || brief.contentQuality === "metadata"
            ? brief.contentQuality
            : "thin";
        } else {
          setGenerationError(
            brief?.error ?? "We could not read that event page. Paste a short event description instead."
          );
          return;
        }
      }

      const eventRecord: Event = {
        id: makeId("event"),
        userId: state.profile.id,
        name: resolvedEventName,
        urlOrDescription: eventInput || screenshotContext,
        goal: eventGoal,
        goals: [eventGoal],
        focus: eventFocus.trim(),
        networkingRole: state.profile.networkingRole,
        researchContext,
        researchSourceUrl,
        researchQuality,
        createdAt: new Date().toISOString()
      };

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: state.profile,
          links: state.links,
          event: {
            name: eventRecord.name,
            urlOrDescription: groundedDescription,
            goal: eventRecord.goal,
            goals: eventRecord.goals,
            focus: eventRecord.focus
          }
        })
      });
      const data = (await response.json()) as {
        mode?: string;
        result?: GenerationResult;
        error?: string;
      };
      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "NameTag could not prepare this event. Please try again.");
      }
      setGenerationMode(data.mode ?? "ready");

      const vaultLinkIds = new Set(state.links.map((link) => link.id));
      const modelSelected = data.result.selectedLinkIds.filter((id) => vaultLinkIds.has(id));
      const selected = modelSelected.length
        ? modelSelected
        : state.links.slice(0, 4).map((link) => link.id);
      const hidden = state.links
        .map((link) => link.id)
        .filter((id) => !selected.includes(id));

      const card: NametagCard = {
        ...data.result,
        id: makeId("card"),
        userId: state.profile.id,
        eventId: eventRecord.id,
        ownerSyncKey: makeSecret("owner"),
        selectedLinkIds: selected.filter((id, index, all) => all.indexOf(id) === index),
        primaryLinkId: selected[0],
        hiddenLinkIds: hidden.filter((id, index, all) => all.indexOf(id) === index),
        focus: data.result.focus || eventRecord.focus,
        reasoning: data.result.reasoning?.length
          ? data.result.reasoning
          : hidden.map((id) => {
              const link = state.links.find((item) => item.id === id);
              return `${link?.label ?? "Link"} hidden — less relevant for this room.`;
            }),
        createdAt: new Date().toISOString()
      };
      eventRecord.cardId = card.id;

      setState((current) => ({
        ...current,
        events: [eventRecord, ...current.events],
        cards: [card, ...current.cards]
      }));
      setActiveCardId(card.id);
      setView("brief");
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "NameTag could not prepare this event. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function updateCard(patch: Partial<NametagCard>) {
    if (!activeCard) return;
    setState((current) => ({
      ...current,
      cards: current.cards.map((card) => (card.id === activeCard.id ? { ...card, ...patch } : card))
    }));
  }

  function toggleCardLink(linkId: string) {
    if (!activeCard) return;
    const isSelected = activeCard.selectedLinkIds.includes(linkId);
    const link = state.links.find((item) => item.id === linkId);
    const selectedLinkIds = isSelected
      ? activeCard.selectedLinkIds.filter((id) => id !== linkId)
      : [...new Set([...activeCard.selectedLinkIds, linkId])];
    const hiddenLinkIds = isSelected
      ? [...new Set([...activeCard.hiddenLinkIds, linkId])]
      : activeCard.hiddenLinkIds.filter((id) => id !== linkId);
    const linkLabel = link?.label ?? "Link";
    const overrideNotes = [
      ...(activeCard.overrideNotes ?? []).filter(
        (note) => !note.startsWith(`You overrode: ${linkLabel}`)
      ),
      isSelected
        ? `You overrode: ${linkLabel} hidden from this card.`
        : `You overrode: ${linkLabel} shown on this card.`
    ].slice(-4);
    const primaryLinkId =
      isSelected && activeCard.primaryLinkId === linkId
        ? selectedLinkIds[0]
        : activeCard.primaryLinkId ?? selectedLinkIds[0];
    updateCard({ selectedLinkIds, primaryLinkId, hiddenLinkIds, overrideNotes });
  }

  function setPrimaryCardLink(linkId: string) {
    if (!activeCard?.selectedLinkIds.includes(linkId)) return;
    updateCard({ primaryLinkId: linkId });
  }

  function addLink(formData: FormData) {
    const label = String(formData.get("label") ?? "").trim();
    const type = String(formData.get("type") ?? "other") as LinkType;
    const normalized = normalizeLinkUrl(String(formData.get("url") ?? ""), type);
    if ("error" in normalized) return normalized.error;

    const link: UserLink = {
      id: makeId("link"),
      userId: state.profile.id,
      label: label || defaultLinkLabel(normalized.url, type),
      url: normalized.url,
      type,
      isSensitive: formData.get("sensitive") === "on",
      note: String(formData.get("note") ?? "").trim()
    };

    setState((current) => ({ ...current, links: [link, ...current.links] }));
    return undefined;
  }

  function updateLink(linkId: string, patch: Partial<UserLink>) {
    setState((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === linkId ? { ...link, ...patch } : link))
    }));
  }

  function updateProfile(patch: Partial<UserProfile>) {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, ...patch }
    }));
  }

  function deleteLink(linkId: string) {
    setState((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== linkId),
      cards: current.cards.map((card) => ({
        ...card,
        selectedLinkIds: card.selectedLinkIds.filter((id) => id !== linkId),
        hiddenLinkIds: card.hiddenLinkIds.filter((id) => id !== linkId),
        primaryLinkId:
          card.primaryLinkId === linkId
            ? card.selectedLinkIds.find((id) => id !== linkId)
            : card.primaryLinkId
      }))
    }));
  }

  async function selectEventScreenshot(file?: File) {
    if (!file) return;
    if (!acceptedEventScreenshotTypes.has(file.type)) {
      setEventScreenshot(null);
      setEventScreenshotError("Use a JPEG, PNG, or WebP screenshot.");
      return;
    }
    if (file.size > MAX_EVENT_SCREENSHOT_BYTES) {
      setEventScreenshot(null);
      setEventScreenshotError("Keep the screenshot under 3 MB so it can be read quickly.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setEventScreenshot({ dataUrl, name: file.name });
      setEventScreenshotError("");
    } catch {
      setEventScreenshot(null);
      setEventScreenshotError("That screenshot could not be opened. Try another image.");
    }
  }

  function selectCard(cardId: string, nextView: View = "brief") {
    setActiveCardId(cardId);
    setView(nextView);
  }

  function startNewEvent() {
    if (demoMode) {
      const workspace = demoWorkspaceRef.current ?? initialState;
      setDemoMode(false);
      setState(workspace);
      setHasOnboarded(hasWorkspaceContent(workspace));
      setActiveCardId(workspace.cards[0]?.id ?? "");
    }
    setEventDescription("");
    setEventScreenshot(null);
    setEventScreenshotError("");
    setEventFocus("");
    setEventGoal("learn");
    setView("prep");
  }

  function startDemoEvent() {
    if (!demoMode) demoWorkspaceRef.current = stateRef.current;
    const demoWorkspace = createDemoWorkspace(stateRef.current.profile);
    setDemoMode(true);
    setEventScreenshot(null);
    setEventScreenshotError("");
    setState(demoWorkspace);
    setHasOnboarded(true);
    setActiveCardId(demoWorkspace.demoCardId);
    setView("brief");
  }

  function removeSampleEvents() {
    const sampleEventIds = new Set(state.events.filter((event) => event.isDemo).map((event) => event.id));
    if (!sampleEventIds.size) return;

    const sampleCardIds = new Set(
      state.cards.filter((card) => sampleEventIds.has(card.eventId)).map((card) => card.id)
    );
    const sampleContactIds = new Set(
      state.contacts
        .filter((contact) => sampleEventIds.has(contact.eventId) || sampleCardIds.has(contact.cardId))
        .map((contact) => contact.id)
    );
    const remainingWorkspace: NametagState = {
      ...state,
      events: state.events.filter((event) => !sampleEventIds.has(event.id)),
      cards: state.cards.filter((card) => !sampleCardIds.has(card.id)),
      contacts: state.contacts.filter((contact) => !sampleContactIds.has(contact.id)),
      followUps: state.followUps.filter((followUp) => !sampleContactIds.has(followUp.contactId)),
      eventNotes: (state.eventNotes ?? []).filter((note) => !sampleEventIds.has(note.eventId))
    };

    setState(remainingWorkspace);
    setActiveCardId(remainingWorkspace.cards[0]?.id ?? "");
    setHasOnboarded(hasWorkspaceContent(remainingWorkspace));
    setView("home");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    setMenuOpen(false);
    setCloudReady(false);
    setCloudStatus("saved");
    syncedWorkspaceRef.current = "";
    if (supabase) await supabase.auth.signOut({ scope: "local" });
    setState(resetState());
    setHasOnboarded(false);
    setActiveCardId("");
    setView("home");
    setDemoMode(false);
    setPasswordRecoveryMode(false);
    demoWorkspaceRef.current = null;
  }

  if (authConfigured && !authReady) return <AccountLoadingScreen />;
  if (authConfigured && passwordRecoveryMode && session) {
    return <AuthScreen onTryDemo={startDemoEvent} initialMode="reset-password" onPasswordUpdated={() => setPasswordRecoveryMode(false)} />;
  }
  if (authConfigured && !session && !demoMode) return <AuthScreen onTryDemo={startDemoEvent} />;
  if (authConfigured && session && !cloudReady) return <AccountLoadingScreen />;

  function addEventNote(body: string) {
    if (!activeCard || !body.trim()) return;
    const note: EventNote = {
      id: makeId("note"),
      eventId: activeCard.eventId,
      body: body.trim(),
      createdAt: new Date().toISOString()
    };
    setState((current) => ({
      ...current,
      eventNotes: [note, ...(current.eventNotes ?? [])],
      events: current.events.map((event) =>
        event.id === activeCard.eventId ? { ...event, debrief: undefined } : event
      )
    }));
  }

  function addManualContact(input: ManualContactInput) {
    if (!activeCard || !input.name.trim()) return false;
    const contact: Contact = {
      id: makeId("contact"),
      eventId: activeCard.eventId,
      cardId: activeCard.id,
      name: input.name.trim(),
      contact: input.contact.trim(),
      note: input.note.trim() || "Met at this event.",
      promise: input.promise.trim(),
      priority: input.priority,
      createdAt: new Date().toISOString()
    };
    const draft = buildFollowUpDraft(contact, activeEvent?.name ?? "the event");
    const followUp: FollowUp = {
      id: makeId("followup"),
      contactId: contact.id,
      message: draft,
      status: "to_send"
    };

    setState((current) => ({
      ...current,
      contacts: [
        { ...contact, followUpDraft: draft },
        ...current.contacts
      ],
      followUps: [followUp, ...current.followUps],
      events: current.events.map((event) =>
        event.id === activeCard.eventId ? { ...event, debrief: undefined } : event
      )
    }));
    return true;
  }

  return (
    <main className={`min-h-screen ${hasOnboarded ? "bg-white lg:h-[100dvh] lg:overflow-hidden lg:bg-[#f7f8fa]" : "bg-white lg:bg-wash lg:p-6"}`}>
      <div className={`min-h-[100dvh] ${hasOnboarded ? "lg:h-[100dvh] lg:min-h-0 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]" : "lg:flex lg:items-center lg:justify-center"}`}>
        {hasOnboarded && (
          <DesktopSidebar
            view={view}
            activeEvent={activeEvent}
            hasActiveRoom={Boolean(activeCard)}
            accountName={getAccountDisplayName(session?.user) || state.profile.name}
            accountEmail={session?.user.email}
            cloudStatus={cloudStatus}
            workspaceStorageMode={workspaceStorageMode}
            accountSyncAvailable={authConfigured}
            onOpenEvents={() => setView("home")}
            onResearch={() => activeCard ? setView("brief") : startNewEvent()}
            onShowCard={() => activeCard ? setView("share") : startNewEvent()}
            onFollowUp={() => activeCard ? setView("debrief") : startNewEvent()}
            onOpenSettings={() => setView("vault")}
            onPrepareEvent={startNewEvent}
            onSignOut={() => void signOut()}
          />
        )}
      <section
        className={`phone-frame mx-auto flex min-h-[100dvh] w-full max-w-none flex-col overflow-visible bg-white lg:overflow-hidden ${
          hasOnboarded
            ? "workspace-shell lg:mx-0 lg:h-[100dvh] lg:min-h-0 lg:max-w-none lg:bg-[#f7f8fa]"
            : "onboarding-shell lg:mx-auto lg:min-h-[680px] lg:max-w-[1080px] lg:bg-transparent"
        }`}
      >
            <div className="lg:hidden">
            <PhoneTop
              setView={setView}
              onOpenMenu={() => setMenuOpen(true)}
              hasOnboarded={Boolean(session)}
              activeEventName={activeEvent?.name ?? "Your next room"}
            />
            </div>
            {hasOnboarded && (
              <DesktopTopbar
                view={view}
                activeEvent={activeEvent}
                cloudStatus={cloudStatus}
                workspaceStorageMode={workspaceStorageMode}
                onPrepareEvent={startNewEvent}
              />
            )}
            <div
              className={`workspace-scroll mobile-top-clearance safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 ${
                hasOnboarded
                  ? "mobile-nav-clearance lg:h-[calc(100dvh-72px)] lg:px-10 lg:py-8 xl:px-12"
                  : "lg:min-h-[680px] lg:px-0 lg:py-0"
              }`}
            >
              <div className={hasOnboarded ? "lg:mx-auto lg:max-w-[1240px]" : ""}>
              {!hasOnboarded ? (
                <FirstRunScreen
                  profileName={state.profile.name}
                  onCreate={(profile) => {
                    setState((current) => ({
                      ...current,
                      profile: { ...current.profile, ...profile }
                    }));
                    setHasOnboarded(true);
                    setView("prep");
                  }}
                />
              ) : (
                <>
              {view === "vault" && (
                <VaultScreen
                  state={state}
                  updateProfile={updateProfile}
                  addLink={addLink}
                  updateLink={updateLink}
                  deleteLink={deleteLink}
                  accountName={getAccountDisplayName(session?.user)}
                  accountEmail={session?.user.email}
                  cloudStatus={cloudStatus}
                  workspaceStorageMode={workspaceStorageMode}
                  accountSyncAvailable={authConfigured}
                  onSignOut={() => void signOut()}
                />
              )}
              {view === "home" && (
                <EventsHomeScreen
                  state={state}
                  activeCardId={activeCard?.id}
                  selectCard={selectCard}
                  startNewEvent={startNewEvent}
                  startDemoEvent={startDemoEvent}
                  removeSampleEvents={removeSampleEvents}
                  canRemoveSampleEvents={!demoMode && session?.user.email !== "demo@nametag.app"}
                />
              )}
              {view === "prep" && (
                <PrepScreen
                  profileName={state.profile.name}
                  role={state.profile.networkingRole}
                  eventDescription={eventDescription}
                  setEventDescription={setEventDescription}
                  eventScreenshot={eventScreenshot}
                  eventScreenshotError={eventScreenshotError}
                  onEventScreenshotChange={(file) => void selectEventScreenshot(file)}
                  onEventScreenshotRemove={() => {
                    setEventScreenshot(null);
                    setEventScreenshotError("");
                  }}
                  eventGoal={eventGoal}
                  setEventGoal={setEventGoal}
                  hasPrivateContext={Boolean(state.profile.privateContext.trim())}
                  onOpenSettings={() => setView("vault")}
                  isGenerating={isGenerating}
                  generationError={generationError}
                  generateNametag={generateNametag}
                />
              )}
              {view === "brief" && activeCard && (
                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <BriefScreen
                    card={activeCard}
                    event={activeEvent}
                    profile={state.profile}
                    role={activeEvent?.networkingRole ?? state.profile.networkingRole}
                    updateCard={updateCard}
                    onContinue={() => setView("card")}
                    onNavigate={setView}
                  />
                  <DesktopResearchPanel
                    card={activeCard}
                    event={activeEvent}
                    profile={state.profile}
                    role={activeEvent?.networkingRole ?? state.profile.networkingRole}
                  />
                </div>
              )}
              {view === "card" && activeCard && (
                <CardReviewScreen
                  card={activeCard}
                  event={activeEvent}
                  links={state.links}
                  profile={state.profile}
                  role={activeEvent?.networkingRole ?? state.profile.networkingRole}
                  updateCard={updateCard}
                  updateProfile={updateProfile}
                  toggleCardLink={toggleCardLink}
                  setPrimaryCardLink={setPrimaryCardLink}
                  onNavigate={setView}
                />
              )}
              {view === "share" && activeCard && (
                <ShareScreen publicUrl={publicUrl} />
              )}
              {view === "debrief" && activeCard && (
                <DebriefScreen
                  state={state}
                  card={activeCard}
                  event={activeEvent}
                  addEventNote={addEventNote}
                  addManualContact={addManualContact}
                  setState={setState}
                  onNavigate={setView}
                />
                  )}
                </>
              )}
              </div>
            </div>
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
              {hasOnboarded && (
                <div className="pointer-events-auto">
                  <AppBottomNav
                    view={view}
                    onOpenEvents={() => setView("home")}
                    onOpenResearch={() => activeCard ? setView("brief") : startNewEvent()}
                    onOpenSettings={() => setView("vault")}
                  />
                </div>
              )}
            </div>
            <div className="lg:hidden">
            {session && menuOpen && (
              <AppMenu
                accountName={getAccountDisplayName(session.user)}
                accountEmail={session?.user.email}
                cloudStatus={cloudStatus}
                workspaceStorageMode={workspaceStorageMode}
                onClose={() => setMenuOpen(false)}
                onSignOut={() => void signOut()}
              />
            )}
            </div>
      </section>
      </div>
    </main>
  );
}

function workspaceFingerprint(workspace: NametagState) {
  return JSON.stringify(workspace);
}

function notifyWorkspaceWindows(userId: string, workspace: NametagState) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(`nametag-workspace:${userId}`);
  channel.postMessage({ workspace });
  channel.close();
}

function saveWorkspace(userId: string, workspace: NametagState) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return Promise.resolve({ error: new Error("Account sync is not configured.") });
  return supabase.from("user_workspaces").upsert(
    {
      user_id: userId,
      state: workspace,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}

function getAccountDisplayName(user?: Session["user"]) {
  const candidates = [
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
    user?.user_metadata?.preferred_username,
    user?.email?.split("@")[0]
  ];

  return candidates.find((candidate): candidate is string => typeof candidate === "string" && Boolean(candidate.trim()))?.trim() ?? "";
}

function getCloudStatusText(status: CloudStatus) {
  if (status === "saving") return "Saving changes";
  if (status === "error") return "Cloud sync needs a retry";
  return "Saved to your account";
}

function getWorkspaceStorageText(mode: WorkspaceStorageMode, status: CloudStatus) {
  if (mode === "sample") return "Sample workspace - changes are temporary";
  if (mode === "device") return "Stored on this device only";
  return getCloudStatusText(status);
}

function getWorkspaceStorageBadge(mode: WorkspaceStorageMode, status: CloudStatus) {
  if (mode === "sample") return "Sample data";
  if (mode === "device") return "This device";
  if (status === "saving") return "Saving";
  if (status === "error") return "Check sync";
  return "Auto-save on";
}

function claimStateForUser(workspace: NametagState, userId: string, accountName = ""): NametagState {
  return {
    ...workspace,
    profile: {
      ...workspace.profile,
      id: userId,
      name: workspace.profile.name.trim() || accountName
    },
    links: workspace.links.map((link) => ({ ...link, userId })),
    events: workspace.events.map((event) => ({ ...event, userId })),
    cards: workspace.cards.map((card) => ({ ...card, userId }))
  };
}

function createInitialWorkspaceForAccount(localWorkspace: NametagState, userId: string, accountName = "") {
  // A first-time sign-in may import a device-only workspace, but never one
  // already associated with another account or the temporary sample event.
  const canImportDeviceWorkspace = localWorkspace.profile.id === "user_local" || localWorkspace.profile.id === userId;
  return claimStateForUser(canImportDeviceWorkspace ? localWorkspace : initialState, userId, accountName);
}

function hasWorkspaceContent(workspace: NametagState) {
  return Boolean(
    workspace.profile.name ||
      workspace.profile.headline ||
      workspace.profile.defaultBio ||
      workspace.links.length ||
      workspace.events.length
  );
}

function buildPublicCard(card: NametagCard, event: Event, state: NametagState): PublicCard {
  const orderedLinkIds =
    card.primaryLinkId && card.selectedLinkIds.includes(card.primaryLinkId)
      ? [card.primaryLinkId, ...card.selectedLinkIds.filter((linkId) => linkId !== card.primaryLinkId)]
      : card.selectedLinkIds;
  const links = orderedLinkIds.flatMap((linkId) => {
    const link = state.links.find((item) => item.id === linkId);
    if (!link) return [];
    const normalized = normalizeLinkUrl(link.url, link.type);
    if ("error" in normalized) return [];
    return [{ label: link.label, type: link.type, url: normalized.url }];
  });

  return {
    id: card.id,
    version: 2,
    eventId: event.id,
    ownerName: state.profile.name,
    headline: state.profile.headline.trim() || undefined,
    bio: state.profile.defaultBio.trim() || undefined,
    eventName: event.name,
    links,
    createdAt: card.createdAt
  };
}

function inferEventName(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "Untitled event";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).hostname.replace(/^www\./, "");
    } catch {
      return "Untitled event";
    }
  }

  return conciseEventName(trimmed.split(/[.\n]/)[0]?.trim().replace(/[,:;]+$/, "") || "Untitled event");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image")));
    reader.readAsDataURL(file);
  });
}

function conciseEventName(name: string) {
  if (name.length <= 56) return name;
  const visibleRange = name.slice(0, 56);
  const lastWholeWord = visibleRange.lastIndexOf(" ");
  const shortened = (lastWholeWord > 28 ? visibleRange.slice(0, lastWholeWord) : visibleRange).trim();
  return `${shortened}...`;
}

function DesktopTopbar({
  view,
  activeEvent,
  cloudStatus,
  workspaceStorageMode,
  onPrepareEvent
}: {
  view: View;
  activeEvent?: Event;
  cloudStatus: CloudStatus;
  workspaceStorageMode: WorkspaceStorageMode;
  onPrepareEvent: () => void;
}) {
  const labels: Record<View, { title: string; eyebrow: string }> = {
    home: { title: "Your events", eyebrow: "Workspace" },
    vault: { title: "Profile and links", eyebrow: "Settings" },
    prep: { title: "Research an event", eyebrow: "New room" },
    brief: { title: "Research", eyebrow: "Current event" },
    card: { title: "Review your public card", eyebrow: "Your NameTag" },
    share: { title: "Show your QR", eyebrow: "During the room" },
    debrief: { title: "Follow through", eyebrow: "After the room" }
  };
  const current = labels[view];

  return (
    <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-line bg-white px-10 lg:flex xl:px-12">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-soft">
          <span>{current.eyebrow}</span>
          {activeEvent && view !== "home" && view !== "vault" && (
            <>
              <span className="text-slate-300">/</span>
              <span className="max-w-[360px] truncate text-slate-600">{conciseEventName(activeEvent.name)}</span>
            </>
          )}
        </div>
        <h1 className="mt-0.5 text-xl font-bold tracking-normal text-ink">{current.title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${workspaceStorageMode === "account" && cloudStatus === "error" ? "text-coral" : "text-slate-soft"}`}>
          <span className={`size-1.5 rounded-full ${workspaceStorageMode === "sample" ? "bg-amber-400" : workspaceStorageMode === "device" ? "bg-slate-300" : cloudStatus === "error" ? "bg-coral" : cloudStatus === "saving" ? "bg-amber-400" : "bg-mint"}`} />
          {getWorkspaceStorageText(workspaceStorageMode, cloudStatus)}
        </span>
        <button
          type="button"
          onClick={onPrepareEvent}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ink px-3.5 text-sm font-bold text-white transition hover:bg-cobalt"
        >
          <Plus className="size-4" />
          New event
        </button>
      </div>
    </header>
  );
}

function DesktopSidebar({
  view,
  activeEvent,
  hasActiveRoom,
  accountName,
  accountEmail,
  cloudStatus,
  workspaceStorageMode,
  accountSyncAvailable,
  onOpenEvents,
  onResearch,
  onShowCard,
  onFollowUp,
  onOpenSettings,
  onPrepareEvent,
  onSignOut
}: {
  view: View;
  activeEvent?: Event;
  hasActiveRoom: boolean;
  accountName: string;
  accountEmail?: string;
  cloudStatus: CloudStatus;
  workspaceStorageMode: WorkspaceStorageMode;
  accountSyncAvailable: boolean;
  onOpenEvents: () => void;
  onResearch: () => void;
  onShowCard: () => void;
  onFollowUp: () => void;
  onOpenSettings: () => void;
  onPrepareEvent: () => void;
  onSignOut: () => void;
}) {
  const items: Array<{
    label: string;
    icon: typeof CalendarDays;
    active: boolean;
    onClick: () => void;
  }> = [
    { label: "Research", icon: BookOpenText, active: view === "brief" || view === "prep", onClick: onResearch },
    { label: "Events", icon: CalendarDays, active: view === "home", onClick: onOpenEvents },
    { label: "My QR", icon: QrCode, active: view === "card" || view === "share", onClick: onShowCard },
    { label: "Follow-up", icon: ListChecks, active: view === "debrief", onClick: onFollowUp },
    { label: "Settings", icon: Settings2, active: view === "vault", onClick: onOpenSettings }
  ];

  return (
    <aside className="hidden h-[100dvh] w-[260px] shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
      <button type="button" onClick={onOpenEvents} className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-left">
        <span className="grid size-9 place-items-center rounded-lg bg-coral text-white shadow-sm shadow-coral/20">
          <span className="text-base font-black">N</span>
        </span>
        <span>
          <span className="block text-[15px] font-bold tracking-normal text-ink">NameTag</span>
          <span className="block whitespace-nowrap text-[10px] font-medium text-slate-soft">Make networking easier.</span>
        </span>
      </button>

      <section className="mt-7 border-y border-line py-4">
        <div className="text-[11px] font-semibold uppercase tracking-normal text-slate-soft">Current event</div>
        <div className="mt-2 flex items-start gap-2.5">
          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${hasActiveRoom ? "bg-mint" : "bg-slate-300"}`} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-5 text-ink">{hasActiveRoom ? conciseEventName(activeEvent?.name ?? "") : "No event selected"}</div>
            <p className="mt-1 text-xs leading-4 text-slate-soft">
              {hasActiveRoom ? "Research, QR, and follow-up stay together." : "Start one when you are ready."}
            </p>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onPrepareEvent}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cobalt px-3 text-sm font-bold text-white shadow-sm shadow-cobalt/15 transition hover:bg-ink"
      >
        <Plus className="size-4" />
        Research an event
      </button>

      <nav className="mt-6 space-y-1" aria-label="Desktop workspace navigation">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
              className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition ${
                item.active
                  ? "bg-cobalt/10 text-cobalt"
                  : "text-slate-600 hover:bg-wash hover:text-ink"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-4">
        <div className="flex items-start gap-2.5 px-1">
          <Cloud className={`mt-0.5 size-4 shrink-0 ${workspaceStorageMode === "account" && cloudStatus === "error" ? "text-coral" : workspaceStorageMode === "account" ? "text-mint" : "text-slate-400"}`} />
          <div className="min-w-0">
            <div className="text-xs font-medium text-ink">{getWorkspaceStorageText(workspaceStorageMode, cloudStatus)}</div>
            <div className="mt-0.5 truncate text-[11px] text-slate-soft">
              {workspaceStorageMode === "account"
                ? accountEmail
                : workspaceStorageMode === "sample"
                  ? "Explore freely - it will reset when you leave."
                  : accountSyncAvailable
                    ? "Sign in to save across devices."
                    : "Account sync is not configured in this browser."}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 px-1">
          <span className="min-w-0 truncate text-xs font-semibold text-ink">{workspaceStorageMode === "sample" ? "Sample event" : accountName || "Your NameTag account"}</span>
          {workspaceStorageMode === "account" && accountEmail && (
            <button
              type="button"
              onClick={onSignOut}
              className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-coral/10 hover:text-coral"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function PhoneTop({
  setView,
  onOpenMenu,
  hasOnboarded,
  activeEventName
}: {
  setView: (view: View) => void;
  onOpenMenu: () => void;
  hasOnboarded: boolean;
  activeEventName: string;
}) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 shrink-0 border-b border-line bg-white/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] text-ink backdrop-blur-md lg:pt-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView("home")}
          className="grid size-9 place-items-center rounded-lg bg-wash text-ink transition hover:bg-line"
          title="Open events"
        >
          <CalendarDays className="size-5" />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-sm font-black">
            <span className="grid size-4 place-items-center rounded-[4px] bg-coral text-[10px] text-white">N</span>
            NameTag
          </div>
          <div className="max-w-[210px] truncate font-badge-mono text-[9px] font-black uppercase text-slate-soft">
            {activeEventName}
          </div>
        </div>
        {hasOnboarded ? (
          <button
            type="button"
            onClick={onOpenMenu}
            className="grid size-9 place-items-center rounded-lg bg-wash text-ink transition hover:bg-line"
            title="Open account"
            aria-label="Open account"
          >
            <UserRound className="size-5" />
          </button>
        ) : (
          <span className="size-9" aria-hidden />
        )}
      </div>
    </div>
  );
}

function AppMenu({
  accountName,
  accountEmail,
  cloudStatus,
  workspaceStorageMode,
  onClose,
  onSignOut
}: {
  accountName: string;
  accountEmail?: string;
  cloudStatus: CloudStatus;
  workspaceStorageMode: WorkspaceStorageMode;
  onClose: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/45 p-3 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Account menu">
      <section className="ml-auto flex h-full w-full max-w-[328px] flex-col rounded-lg border border-ink bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div>
            <div className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-slate-soft">NameTag</div>
            <div className="mt-1 text-lg font-black text-ink">Account</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg border border-line text-ink transition hover:bg-wash"
            aria-label="Close menu"
            title="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <section className="rounded-lg border border-line bg-wash p-3">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink text-mint">
                <UserRound className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-ink">{workspaceStorageMode === "sample" ? "Sample event" : accountName || "Your NameTag account"}</div>
                {workspaceStorageMode === "account" && accountEmail && <div className="mt-0.5 truncate text-xs font-semibold text-slate-soft">{accountEmail}</div>}
                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-soft">
                  <Cloud className="size-3.5" />
                  {getWorkspaceStorageText(workspaceStorageMode, cloudStatus)}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-mint/25 bg-mint/10 p-3 text-xs font-semibold leading-5 text-teal-800">
            Your private profile, notes, and follow-up queue are never shown on a QR card. Each event controls its own public links.
          </section>
        </div>

        {workspaceStorageMode === "account" && (
          <div className="mt-auto border-t border-line bg-wash p-4">
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink transition hover:border-coral hover:text-coral"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function AppBottomNav({
  view,
  onOpenEvents,
  onOpenResearch,
  onOpenSettings
}: {
  view: View;
  onOpenEvents: () => void;
  onOpenResearch: () => void;
  onOpenSettings: () => void;
}) {
  const eventsActive = view === "home" || view === "card" || view === "share" || view === "debrief";
  const researchActive = view === "prep" || view === "brief";
  const settingsActive = view === "vault";

  return (
    <nav className="shrink-0 border-t border-line bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 shadow-[0_-8px_24px_rgb(24_34_53_/_0.08)] backdrop-blur-xl" aria-label="Primary navigation">
      <div className="mx-auto grid max-w-[430px] grid-cols-3 items-center gap-2">
        <AppNavButton
          icon={CalendarDays}
          label="Events"
          active={eventsActive}
          onClick={onOpenEvents}
        />
        <button
          type="button"
          onClick={onOpenResearch}
          aria-current={researchActive ? "page" : undefined}
          className={`inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border px-3 text-[10px] font-black transition ${
            researchActive
              ? "border-cobalt bg-cobalt text-white"
              : "border-cobalt bg-cobalt text-white shadow-sm shadow-cobalt/25 hover:bg-ink hover:border-ink"
          }`}
        >
          <Plus className="size-5" />
          Research
        </button>
        <AppNavButton
          icon={Settings2}
          label="Settings"
          active={settingsActive}
          onClick={onOpenSettings}
        />
      </div>
    </nav>
  );
}

function AppNavButton({
  icon: Icon,
  label,
  active,
  onClick
}: {
  icon: typeof CalendarDays;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-3 text-[10px] font-black transition ${
        active ? "bg-cobalt/10 text-cobalt" : "text-slate-soft hover:bg-wash hover:text-ink"
      }`}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

function FirstRunScreen({
  profileName,
  onCreate
}: {
  profileName: string;
  onCreate: (profile: Pick<UserProfile, "name" | "headline" | "defaultBio" | "location" | "networkingRole">) => void;
}) {
  const [name, setName] = useState(profileName);
  const [headline, setHeadline] = useState("");
  const [networkingRole, setNetworkingRole] = useState<NetworkingRole>("exploring");

  function createIdentity(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    if (!name.trim()) return;
    onCreate(
      {
        name: name.trim(),
        headline: headline.trim(),
        defaultBio: "",
        location: "",
        networkingRole
      }
    );
  }

  return (
    <form onSubmit={createIdentity} className="space-y-5 pb-4 pt-5 lg:grid lg:min-h-[680px] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.82fr)] lg:gap-8 lg:space-y-0 lg:py-8">
      <section className="flex overflow-hidden rounded-lg border border-ink bg-ink text-white shadow-sm lg:min-h-[560px] lg:flex-col lg:rounded-xl">
        <div className="h-2 bg-coral" />
        <div className="flex flex-1 flex-col p-4 lg:p-8">
          <div className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-coral">NameTag</div>
          <h1 className="mt-3 text-3xl font-black leading-8 tracking-tight lg:max-w-[480px] lg:text-[40px] lg:leading-[46px]">
            Networking, without the pressure.
          </h1>
          <p className="mt-3 max-w-[460px] text-sm font-semibold leading-6 text-white/70 lg:text-base lg:leading-7">
            See the room clearly, share one QR, and leave with a follow-up plan.
          </p>

          <div className="hidden border-t border-white/10 pt-5 lg:mt-auto lg:grid lg:grid-cols-3 lg:gap-3">
            {[
              ["Before", "Know the room"],
              ["During", "Share one QR"],
              ["After", "Keep the next step"]
            ].map(([moment, detail]) => (
              <div key={moment} className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
                <div className="app-kicker text-mint">{moment}</div>
                <div className="mt-1 text-xs font-bold leading-5 text-white/86">{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-4 lg:flex lg:min-h-[560px] lg:flex-col lg:justify-center">
        <div className="lg:px-1">
          <div className="app-kicker text-cobalt">Start simply</div>
          <h2 className="mt-1 text-xl font-bold text-ink lg:text-2xl">Make your first event easier.</h2>
          <p className="app-info-copy mt-2 text-slate-600">Just a name is enough. Add links only when they help.</p>
        </div>

        <div className="space-y-4 rounded-lg border border-line bg-white p-4 shadow-sm lg:p-6">
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              onChange={(eventChange) => setName(eventChange.target.value)}
              placeholder="How people should see you"
              autoComplete="name"
              required
            />
          </Field>
          <Field label="What you do (optional)">
            <input
              className={inputClass}
              value={headline}
              onChange={(eventChange) => setHeadline(eventChange.target.value)}
              placeholder="Product designer, student founder, developer..."
            />
          </Field>
          <details className="rounded-lg border border-line bg-wash p-3">
            <summary className="cursor-pointer text-xs font-black text-ink">
              Personalize my event help <span className="font-semibold text-slate-soft">(optional)</span>
            </summary>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-soft">
              Tell NameTag what kinds of rooms you usually enter. You can always change this in Settings.
            </p>
            <RolePicker value={networkingRole} onChange={setNetworkingRole} className="mt-3" />
          </details>
        </div>

        <PrimaryButton type="submit">
          Start an event
          <ArrowRight className="size-4" />
        </PrimaryButton>
        <p className="text-center text-xs font-semibold leading-5 text-slate-soft">
          Your changes save automatically to your account.
        </p>
      </div>
    </form>
  );
}

function RolePicker({
  value,
  onChange,
  className = ""
}: {
  value: NetworkingRole;
  onChange: (role: NetworkingRole) => void;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {networkingRoleOptions.map((role) => {
        const selected = value === role.value;
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            aria-pressed={selected}
            className={`${role.value === "exploring" ? "col-span-2" : ""} min-h-[64px] rounded-lg border p-2.5 text-left transition ${
              selected
                ? "border-ink bg-ink text-white shadow-sm"
                : "border-line bg-white text-ink hover:border-ink hover:bg-wash"
            }`}
          >
            <span className="block text-xs font-black leading-4">{role.shortLabel}</span>
            <span className={`mt-1 block text-[10px] font-semibold leading-4 ${selected ? "text-white/68" : "text-slate-soft"}`}>
              {role.pickerHint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EventsHomeScreen({
  state,
  activeCardId,
  selectCard,
  startNewEvent,
  startDemoEvent,
  removeSampleEvents,
  canRemoveSampleEvents
}: {
  state: NametagState;
  activeCardId?: string;
  selectCard: (cardId: string, nextView?: View) => void;
  startNewEvent: () => void;
  startDemoEvent: () => void;
  removeSampleEvents: () => void;
  canRemoveSampleEvents: boolean;
}) {
  const activeCard = state.cards.find((card) => card.id === activeCardId) ?? state.cards[0];
  const activeEvent = activeCard
    ? state.events.find((event) => event.id === activeCard.eventId)
    : state.events[0];
  const savedCards = state.cards.filter((card) => card.id !== activeCard?.id);
  const sampleEventCount = state.events.filter((event) => event.isDemo).length;

  if (!state.cards.length) {
    return (
      <div className="space-y-4 lg:max-w-[780px] lg:space-y-6">
        <section className="overflow-hidden rounded-lg border border-ink bg-ink text-white shadow-sm lg:rounded-xl">
          <div className="h-2 bg-coral" />
          <div className="p-4 lg:p-7">
            <div className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-coral">
              No room yet
            </div>
            <h2 className="app-screen-title mt-3 lg:max-w-[500px]">What are you walking into next?</h2>
            <p className="app-info-copy mt-3 max-w-[540px] text-white/70">
              Make one calm, useful next step before you walk into the room.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 sm:max-w-[520px]">
              <button
                type="button"
                onClick={startDemoEvent}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cobalt px-4 text-sm font-bold text-white transition hover:bg-ink"
              >
                Explore a sample event
                <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={startNewEvent}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Research an event
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-wash p-4">
          <div className="app-section-title text-ink">One real next step, end to end.</div>
          <div className="app-info-copy mt-3 space-y-3 text-slate-600">
            <div className="flex gap-3"><span className="font-badge-mono text-coral">01</span><span>Understand the room, people, and questions that matter.</span></div>
            <div className="flex gap-3"><span className="font-badge-mono text-coral">02</span><span>Share one QR when the conversation has earned it.</span></div>
            <div className="flex gap-3"><span className="font-badge-mono text-coral">03</span><span>Turn the conversation into a follow-up within 48 hours.</span></div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7">
      <div className="hidden lg:flex lg:items-end lg:justify-between lg:gap-6">
        <div>
          <div className="text-xs font-semibold text-slate-soft">Your event workspace</div>
          <h2 className="app-screen-title mt-1 text-ink">Keep the next room simple.</h2>
          <p className="app-info-copy mt-2 text-slate-600">Research what matters, share one clear card, then keep every promise in view.</p>
        </div>
      </div>
      {sampleEventCount > 0 && canRemoveSampleEvents && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-semibold leading-5 text-amber-900">
            {sampleEventCount === 1 ? "A sample event is in this workspace." : `${sampleEventCount} sample events are in this workspace.`}
          </p>
          <button
            type="button"
            onClick={removeSampleEvents}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 text-xs font-black text-amber-900 transition hover:border-coral hover:text-coral"
          >
            <Trash2 className="size-3.5" />
            Remove sample event
          </button>
        </section>
      )}
      {activeCard && activeEvent && (
        <CompactEventSummary
          card={activeCard}
          event={activeEvent}
          contactsCount={state.contacts.filter((contact) => contact.eventId === activeEvent.id).length}
          pendingCount={state.contacts.filter((contact) =>
            contact.eventId === activeEvent.id &&
            (state.followUps.find((followUp) => followUp.contactId === contact.id)?.status ?? "to_send") === "to_send"
          ).length}
          selectCard={selectCard}
          startNewEvent={startNewEvent}
        />
      )}

      {savedCards.length > 0 && (
        <EventHistorySections
          cards={savedCards}
          state={state}
          selectCard={selectCard}
        />
      )}
    </div>
  );
}

function EventHistorySections({
  cards,
  state,
  selectCard
}: {
  cards: NametagCard[];
  state: NametagState;
  selectCard: (cardId: string, nextView?: View) => void;
}) {
  const now = Date.now();
  const groups = [
    { label: "Last 48 hours", cards: [] as NametagCard[] },
    { label: "Past week", cards: [] as NametagCard[] },
    { label: "Earlier", cards: [] as NametagCard[] }
  ];

  cards.forEach((card) => {
    const age = Math.max(0, now - new Date(card.createdAt).getTime());
    const target = age <= 48 * 60 * 60 * 1000 ? groups[0] : age <= 7 * 24 * 60 * 60 * 1000 ? groups[1] : groups[2];
    target.cards.push(card);
  });

  return (
    <section className="space-y-2">
      <div className="px-1 font-badge-mono text-[10px] font-black uppercase text-slate-soft">Past events</div>
      {groups.map((group) => group.cards.length > 0 && (
        <details key={group.label} className="rounded-lg border border-line bg-white">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3">
            <span className="text-sm font-black text-ink">{group.label}</span>
            <MiniBadge tone="slate">{group.cards.length}</MiniBadge>
          </summary>
          <div className="space-y-2 border-t border-line p-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {group.cards.map((card) => {
              const event = state.events.find((item) => item.id === card.eventId);
              const contacts = state.contacts.filter((contact) => contact.eventId === card.eventId);
              const pending = contacts.filter(
                (contact) => (state.followUps.find((followUp) => followUp.contactId === contact.id)?.status ?? "to_send") === "to_send"
              ).length;
              return (
                <button
                  type="button"
                  onClick={() => selectCard(card.id, "brief")}
                  key={card.id}
                  className="flex w-full items-center gap-3 rounded-lg border border-line bg-wash p-3 text-left transition hover:border-ink hover:bg-white"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-mint">
                    <CalendarDays className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-ink">{event?.name ?? "Untitled event"}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-soft">{pending ? `${pending} follow-ups waiting` : `${contacts.length} connections`}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </details>
      ))}
    </section>
  );
}

function CompactEventSummary({
  card,
  event,
  contactsCount,
  pendingCount,
  selectCard,
  startNewEvent
}: {
  card: NametagCard;
  event: Event;
  contactsCount: number;
  pendingCount: number;
  selectCard: (cardId: string, nextView?: View) => void;
  startNewEvent: () => void;
}) {
  const primaryView: View = "brief";
  const activityLabel = pendingCount > 0
    ? `${pendingCount} follow-up${pendingCount === 1 ? "" : "s"} waiting after your research`
    : contactsCount > 0
      ? `${contactsCount} connection${contactsCount === 1 ? "" : "s"}`
      : "Research ready";

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="font-badge-mono text-[10px] font-black uppercase text-coral">Event now</div>
        <button
          type="button"
          onClick={startNewEvent}
          className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-xs font-black text-cobalt transition hover:bg-cobalt/5 hover:text-ink"
        >
          <Plus className="size-3.5" />
          New
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => selectCard(card.id, primaryView)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md px-2 text-left transition hover:bg-wash"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-ink text-mint">
            <CalendarDays className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-ink">{conciseEventName(event.name)}</span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-slate-soft">{activityLabel}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-slate-400" />
        </button>
        <button
          type="button"
          onClick={() => selectCard(card.id, "share")}
          className="grid size-10 shrink-0 place-items-center rounded-md border border-line bg-wash text-ink transition hover:border-ink hover:bg-white"
          title="Show QR"
          aria-label="Show QR"
        >
          <QrCode className="size-4" />
        </button>
      </div>
    </section>
  );
}

function RoomStepper({
  current,
  onNavigate
}: {
  current: RoomView;
  onNavigate: (view: RoomView) => void;
}) {
  const steps: Array<{ view: RoomView; label: string }> = [
    { view: "brief", label: "Research" },
    { view: "card", label: "Links" },
    { view: "share", label: "QR" },
    { view: "debrief", label: "Follow up" }
  ];
  const currentIndex = steps.findIndex((step) => step.view === current);

  return (
    <nav aria-label="Room journey" className="rounded-lg border border-line bg-wash p-1">
      <div className="grid grid-cols-4 gap-1">
        {steps.map((step, index) => {
          const active = step.view === current;
          const complete = index < currentIndex;
          return (
            <button
              key={step.view}
              type="button"
              onClick={() => onNavigate(step.view)}
              aria-current={active ? "step" : undefined}
              className={`min-h-10 rounded-md px-1 text-[11px] font-black transition ${
                active
                  ? "bg-ink text-white shadow-sm"
                  : complete
                    ? "bg-white text-coral"
                    : "text-slate-soft hover:bg-white hover:text-ink"
              }`}
            >
              <span className="block font-badge-mono text-[9px] leading-3 opacity-70">{`0${index + 1}`}</span>
              <span className="block leading-4">{step.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function EventContextStrip({
  event,
  stage
}: {
  event?: Event;
  stage: "links" | "follow-up";
}) {
  const sourceLabel = getResearchSourceLabel(event);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-line bg-wash px-3 py-2 text-[11px] font-semibold leading-4 text-slate-600">
      <span className="font-badge-mono text-[9px] font-black uppercase tracking-normal text-cobalt">Room context</span>
      <span className="font-black text-ink">{event?.name ?? "Current event"}</span>
      <span className="text-slate-400">{sourceLabel}</span>
      <span className="basis-full text-slate-soft sm:basis-auto">
        {stage === "links" ? "Guides your choices here; it never appears after the QR." : "Keeps each person, promise, and first message together for this event."}
      </span>
    </div>
  );
}

function getResearchSourceLabel(event?: Event) {
  if (event?.researchQuality === "body") return "Event page";
  if (event?.researchQuality === "metadata") return "Page details";
  if (event?.researchQuality === "screenshot") return "Screenshot";
  if (event?.researchQuality === "thin") return "Limited page details";
  return "Your description";
}

function describeResearchPersonalization(profile: UserProfile, role: NetworkingRole) {
  const roleLabel = getNetworkingRole(role).shortLabel;
  const hasPrivateBackground = Boolean(profile.privateContext.trim());
  const anchors = [profile.organization, profile.school, profile.interests]
    .map((item) => item.trim())
    .filter(Boolean);

  if (hasPrivateBackground) {
    return `Tailored to your ${roleLabel.toLowerCase()} lens and private background.`;
  }
  if (anchors.length) {
    return `Tailored to your ${roleLabel.toLowerCase()} lens and the context in your profile.`;
  }
  return `Tailored to your ${roleLabel.toLowerCase()} lens. Add private background in Settings when you want more specific advice.`;
}

function buildResearchPrompts(brief: PrepBrief, role: NetworkingRole) {
  const roleLabel = getNetworkingRole(role).shortLabel.toLowerCase();
  const sourceTopic = brief.keyTopics[1] ?? brief.keyTopics[0] ?? "this event";
  const hasSourceFact = brief.roomSignals.some((signal) => signal.startsWith("Source:"));
  const peoplePrompt = brief.speakerHighlights.length
    ? "Which named speaker or host should I prioritize?"
    : "What should I listen for in the room?";

  const roomPrompt = hasSourceFact
    ? `What does the source actually confirm about ${sourceTopic}?`
    : "What do we actually know about this event?";

  return brief.speakerHighlights.length
    ? [roomPrompt, peoplePrompt, `Give me three questions that are specific to ${sourceTopic}.`]
    : [roomPrompt, `What should I focus on here as a ${roleLabel}?`, `Give me three questions that are specific to ${sourceTopic}.`];
}

function PrepScreen({
  profileName,
  role,
  eventDescription,
  setEventDescription,
  eventScreenshot,
  eventScreenshotError,
  onEventScreenshotChange,
  onEventScreenshotRemove,
  eventGoal,
  setEventGoal,
  hasPrivateContext,
  onOpenSettings,
  isGenerating,
  generationError,
  generateNametag
}: {
  profileName: string;
  role: NetworkingRole;
  eventDescription: string;
  setEventDescription: (value: string) => void;
  eventScreenshot: EventScreenshot | null;
  eventScreenshotError: string;
  onEventScreenshotChange: (file?: File) => void;
  onEventScreenshotRemove: () => void;
  eventGoal: EventGoal;
  setEventGoal: (value: EventGoal) => void;
  hasPrivateContext: boolean;
  onOpenSettings: () => void;
  isGenerating: boolean;
  generationError: string;
  generateNametag: (eventSubmit?: FormEvent<HTMLFormElement>) => void;
}) {
  const roleMeta = getNetworkingRole(role);
  const entries = Object.entries(goalLabels) as Array<
    [EventGoal, { label: string; description: string }]
  >;
  const quickGoals = entries.filter(([key]) =>
    ["find_collaborators", "show_project", "meet_mentors", "find_opportunities"].includes(key)
  );
  const moreGoals = entries.filter(([key]) => !quickGoals.some(([quickKey]) => quickKey === key));

  return (
    <form onSubmit={generateNametag} className="space-y-4 lg:max-w-[820px] lg:space-y-5">
      <div>
        <MiniBadge tone="coral">Subway mode</MiniBadge>
        <h2 className="app-screen-title mt-3 text-ink">What room are you walking into?</h2>
        <p className="app-info-copy mt-2 text-slate-600">
          Paste a link, write one sentence, or add a screenshot. NameTag reads the room first, then gives you the facts, people, and questions that matter.
        </p>
      </div>

      <Field label="Paste the event link or describe the event">
        <textarea
          className={`${inputClass} min-h-28 resize-none`}
          value={eventDescription}
          onChange={(event) => setEventDescription(event.target.value)}
          placeholder="https://event-page.com or ‘AI builder meetup with demos and founders in Taipei’"
          required={!eventScreenshot}
        />
      </Field>

      <section className="rounded-lg border border-line bg-wash p-3">
        {eventScreenshot ? (
          <div className="flex items-center gap-3">
            <img
              src={eventScreenshot.dataUrl}
              alt="Event screenshot ready to read"
              className="size-14 shrink-0 rounded-md border border-line object-cover bg-white"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-black text-ink">
                <ImagePlus className="size-4 text-cobalt" />
                Screenshot ready
              </div>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-soft">{eventScreenshot.name}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-teal-800">NameTag will read visible event facts, then discard the image.</p>
            </div>
            <button
              type="button"
              onClick={onEventScreenshotRemove}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-soft transition hover:border-coral hover:text-coral"
              title="Remove screenshot"
              aria-label="Remove event screenshot"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white text-cobalt shadow-sm">
                <ImagePlus className="size-4" />
              </span>
              <div>
                <div className="text-sm font-black text-ink">Only have a flyer or event post?</div>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-soft">Upload one screenshot and NameTag will read the visible event details.</p>
              </div>
            </div>
            <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-xs font-black text-ink transition hover:border-cobalt hover:text-cobalt">
              <ImagePlus className="size-3.5" />
              Add screenshot
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  onEventScreenshotChange(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        )}
        {!eventScreenshot && <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-soft">JPEG, PNG, or WebP up to 3 MB. The original image is not saved to your event.</p>}
        {eventScreenshotError && <p role="alert" className="mt-2 text-xs font-bold leading-5 text-red-600">{eventScreenshotError}</p>}
      </section>

      <details className="rounded-lg border border-line bg-white p-3">
        <summary className="app-meta cursor-pointer text-ink">Tailor the research (optional)</summary>
        <p className="app-meta mt-1 text-slate-soft">
          Leave this alone to understand the event first. Pick one intention only when it changes which questions or people would be most useful.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {quickGoals.map(([key, goal]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEventGoal(key)}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 text-left transition ${
                eventGoal === key
                  ? "border-ink bg-ink text-white shadow-sm"
                  : "border-line bg-white text-ink hover:border-ink hover:bg-wash"
              }`}
            >
              <span className="app-meta">{goal.label}</span>
              {eventGoal === key && <CheckCircle2 className="size-4 shrink-0" />}
            </button>
          ))}
          {moreGoals.map(([key, goal]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEventGoal(key)}
              className={`app-meta min-h-11 rounded-lg border px-3 py-2 text-left transition ${
                eventGoal === key
                  ? "border-cobalt bg-cobalt text-white"
                  : "border-line bg-white text-ink hover:border-ink"
              }`}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </details>

      <PrimaryButton type="submit" disabled={isGenerating}>
        {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <ClipboardList className="size-4" />}
        Research this event
      </PrimaryButton>
      {generationError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
          {generationError}
        </p>
      )}

      <details className="rounded-lg border border-cobalt/20 bg-cobalt/5 p-3">
        <summary className="app-meta cursor-pointer text-cobalt">Personalize this research</summary>
        <div className="app-meta mt-3 border-t border-cobalt/15 pt-3 text-cobalt">
          <span className="app-kicker">{roleMeta.shortLabel} lens</span>
          <p className="mt-1.5">{roleMeta.prepNudge}</p>
          <p className="mt-1 text-cobalt/75">
            {hasPrivateContext
              ? `Prepared privately for ${profileName} using the profile context you saved.`
              : `Prepared privately for ${profileName}. Add a LinkedIn About or CV snippet to make future questions more specific.`}
          </p>
          {!hasPrivateContext && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-cobalt/25 bg-white px-2.5 text-xs font-black text-cobalt transition hover:border-cobalt hover:bg-cobalt hover:text-white"
            >
              Add private context in Settings
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      </details>
    </form>
  );
}

function VaultScreen({
  state,
  updateProfile,
  addLink,
  updateLink,
  deleteLink,
  accountName,
  accountEmail,
  cloudStatus,
  workspaceStorageMode,
  accountSyncAvailable,
  onSignOut
}: {
  state: NametagState;
  updateProfile: (patch: Partial<UserProfile>) => void;
  addLink: (formData: FormData) => string | undefined;
  updateLink: (linkId: string, patch: Partial<UserLink>) => void;
  deleteLink: (linkId: string) => void;
  accountName: string;
  accountEmail?: string;
  cloudStatus: CloudStatus;
  workspaceStorageMode: WorkspaceStorageMode;
  accountSyncAvailable: boolean;
  onSignOut: () => void;
}) {
  const [linkError, setLinkError] = useState("");
  const [savedLinkErrors, setSavedLinkErrors] = useState<Record<string, string>>({});
  const [newLinkType, setNewLinkType] = useState<LinkType>("linkedin");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [linkTypeWasChosen, setLinkTypeWasChosen] = useState(false);
  const [showLinkDetails, setShowLinkDetails] = useState(false);
  const inferredLinkType = inferLinkType(newLinkUrl);
  const ActiveLinkIcon = linkTypeIcons[newLinkType];

  function validateSavedLink(link: UserLink) {
    const normalized = normalizeLinkUrl(link.url, link.type);
    if ("error" in normalized) {
      setSavedLinkErrors((current) => ({
        ...current,
        [link.id]: normalized.error ?? "That does not look like a usable link."
      }));
      return;
    }
    updateLink(link.id, { url: normalized.url });
    setSavedLinkErrors((current) => {
      const { [link.id]: _removed, ...remaining } = current;
      return remaining;
    });
  }

  return (
    <div className="space-y-5 lg:max-w-[1080px]">
      <div>
        <MiniBadge tone="blue">Settings</MiniBadge>
        <h2 className="app-screen-title mt-3 text-ink">Your details, on your terms.</h2>
        <p className="app-info-copy mt-2 text-slate-600">
          Keep this light. NameTag uses private context to make event research more useful, and only the public text and links you choose can appear on your QR card.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-line bg-wash p-3">
        <SectionTitle
          icon={UserRound}
          title={workspaceStorageMode === "account" ? "Account" : workspaceStorageMode === "sample" ? "Sample workspace" : "This device"}
          action={<MiniBadge tone={workspaceStorageMode === "account" && cloudStatus === "error" ? "coral" : workspaceStorageMode === "account" ? "mint" : "blue"}>{getWorkspaceStorageBadge(workspaceStorageMode, cloudStatus)}</MiniBadge>}
        />
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink text-mint">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-ink">{workspaceStorageMode === "sample" ? "Founder Meetup sample" : accountName || state.profile.name || "Your NameTag account"}</div>
            {workspaceStorageMode === "account" && accountEmail && <div className="mt-0.5 truncate text-xs font-semibold text-slate-soft">{accountEmail}</div>}
            <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${workspaceStorageMode === "account" && cloudStatus === "error" ? "text-coral" : workspaceStorageMode === "account" ? "text-teal-800" : "text-slate-600"}`}>
              <Cloud className="size-3.5" />
              {getWorkspaceStorageText(workspaceStorageMode, cloudStatus)}
            </div>
            {workspaceStorageMode === "sample" && <p className="mt-2 text-xs font-semibold leading-5 text-slate-soft">Try the full flow, then sign in to keep your own rooms.</p>}
            {workspaceStorageMode === "device" && (
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-soft">
                {accountSyncAvailable
                  ? "Your edits stay in this browser. Sign in to take them across devices."
                  : "Your edits stay in this browser. Account sync is not connected in this build yet."}
              </p>
            )}
          </div>
        </div>
        {workspaceStorageMode === "account" && (
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-ink transition hover:border-coral hover:text-coral"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-slate-50 p-3">
        <SectionTitle icon={UserRound} title="Your profile" />
        <p className="-mt-1 text-xs font-semibold leading-5 text-slate-soft">
          Add only what helps NameTag understand your point of view. School, organization, interests, and your pasted background guide research privately; they never appear on a shared card.
        </p>
        <input
          className={inputClass}
          value={state.profile.name}
          onChange={(eventChange) => updateProfile({ name: eventChange.target.value })}
          placeholder="Your name"
        />
        <input
          className={inputClass}
          value={state.profile.headline}
          onChange={(eventChange) => updateProfile({ headline: eventChange.target.value })}
          placeholder="Public headline, for example: Product builder"
        />
        <Field label="Your networking lens">
          <select
            className={inputClass}
            value={state.profile.networkingRole}
            onChange={(eventChange) => updateProfile({ networkingRole: eventChange.target.value as NetworkingRole })}
          >
            {networkingRoleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </Field>
        <p className="-mt-1 text-xs font-semibold leading-5 text-slate-soft">
          {getNetworkingRole(state.profile.networkingRole).description}
        </p>
        <input
          className={inputClass}
          value={state.profile.organization}
          onChange={(eventChange) => updateProfile({ organization: eventChange.target.value })}
          placeholder="Organization, company, or community (private AI context)"
        />
        <input
          className={inputClass}
          value={state.profile.school}
          onChange={(eventChange) => updateProfile({ school: eventChange.target.value })}
          placeholder="School, university, or program (private AI context)"
        />
        <textarea
          className={`${inputClass} min-h-16 resize-none`}
          value={state.profile.interests}
          onChange={(eventChange) => updateProfile({ interests: eventChange.target.value })}
          placeholder="What are you exploring or hoping to learn? (private AI context)"
        />
        <Field label="Private profile context (optional)">
          <textarea
            className={`${inputClass} min-h-24 resize-none`}
            value={state.profile.privateContext}
            onChange={(eventChange) => updateProfile({ privateContext: eventChange.target.value })}
            placeholder="Paste a few CV bullets or your LinkedIn About. NameTag uses this only to tailor research and questions."
          />
        </Field>
        <textarea
          className={`${inputClass} min-h-20 resize-none`}
          value={state.profile.defaultBio}
          onChange={(eventChange) => updateProfile({ defaultBio: eventChange.target.value })}
          placeholder="Optional public introduction, written by you"
        />
        <input
          className={inputClass}
          value={state.profile.location}
          onChange={(eventChange) => updateProfile({ location: eventChange.target.value })}
          placeholder="City"
        />
      </section>

      <form
        onSubmit={(eventSubmit) => {
          eventSubmit.preventDefault();
          const error = addLink(new FormData(eventSubmit.currentTarget));
          if (error) {
            setLinkError(error);
            return;
          }
          eventSubmit.currentTarget.reset();
          setLinkError("");
          setNewLinkType("linkedin");
          setNewLinkUrl("");
          setLinkTypeWasChosen(false);
          setShowLinkDetails(false);
        }}
        className="space-y-3 rounded-lg border border-line bg-white p-3"
      >
        <SectionTitle icon={Plus} title="Links (optional)" />
        <p className="-mt-1 text-xs font-semibold leading-5 text-slate-soft">
          Add the places you would actually want to share. NameTag keeps the rest private unless you choose otherwise.
        </p>
        <Field label="Paste a destination">
          <input
            className={inputClass}
            name="url"
            value={newLinkUrl}
            placeholder="Paste a URL or email"
            onChange={(eventChange) => {
              setLinkError("");
              const value = eventChange.target.value;
              setNewLinkUrl(value);
              const inferredType = inferLinkType(value);
              if (inferredType && !linkTypeWasChosen) setNewLinkType(inferredType);
            }}
          />
        </Field>
        <input type="hidden" name="type" value={newLinkType} />
        <div className="rounded-lg border border-line bg-wash p-2.5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white text-cobalt shadow-sm">
              <ActiveLinkIcon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-soft">Use as</div>
              <select
                className="mt-0.5 w-full cursor-pointer bg-transparent text-sm font-black text-ink outline-none"
                aria-label="Link type"
                value={newLinkType}
                onChange={(eventChange) => {
                  setNewLinkType(eventChange.target.value as LinkType);
                  setLinkTypeWasChosen(true);
                }}
              >
                <optgroup label="Most used">
                  {commonLinkTypes.map((type) => (
                    <option key={type} value={type}>{linkTypeLabels[type]}</option>
                  ))}
                </optgroup>
                <optgroup label="More options">
                  {additionalLinkTypes.map((type) => (
                    <option key={type} value={type}>{linkTypeLabels[type]}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            {inferredLinkType && !linkTypeWasChosen && (
              <MiniBadge tone="mint">Recognized</MiniBadge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Quick link types">
          {commonLinkTypes.map((type) => {
            const Icon = linkTypeIcons[type];
            const selected = newLinkType === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setNewLinkType(type);
                  setLinkTypeWasChosen(true);
                }}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition ${
                  selected
                    ? "border-cobalt bg-cobalt text-white"
                    : "border-line bg-white text-slate-600 hover:border-cobalt hover:text-cobalt"
                }`}
              >
                <Icon className="size-3.5" />
                {linkTypeLabels[type]}
              </button>
            );
          })}
        </div>
        <details
          open={showLinkDetails}
          onToggle={(eventToggle) => setShowLinkDetails(eventToggle.currentTarget.open)}
          className="rounded-lg border border-line bg-slate-50 px-3 py-2.5"
        >
          <summary className="cursor-pointer text-sm font-black text-ink">Add a label, description, or privacy rule</summary>
          <div className="mt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inputClass} name="label" placeholder="Label (optional)" aria-label="Label (optional)" />
              <input className={inputClass} name="note" placeholder="Description (optional)" aria-label="Description (optional)" />
            </div>
            <label className="flex items-start gap-2 text-sm font-bold text-slate-700">
              <input name="sensitive" type="checkbox" className="mt-0.5 size-4 accent-cobalt" />
              <span>
                <span className="block">Keep private by default</span>
                <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-soft">NameTag will not recommend it for a public event card unless you turn it on.</span>
              </span>
            </label>
          </div>
        </details>
        <SecondaryButton type="submit">
          <Plus className="size-4" />
          Add link
        </SecondaryButton>
        {linkError && <p className="text-xs font-bold leading-5 text-red-600">{linkError}</p>}
      </form>

      <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {state.links.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-wash p-3 text-sm font-semibold leading-5 text-slate-600">
            No links yet. That is completely fine; add one when you want a scanner to take something with them.
          </div>
        ) : state.links.map((link) => (
          <div key={link.id} className="rounded-lg border border-line bg-white p-3">
            <div className="mb-3 flex items-start gap-3">
              <LinkIcon type={link.type} />
              <div className="min-w-0 flex-1">
                <input
                  className="w-full border-0 bg-transparent text-sm font-black text-ink outline-none"
                  value={link.label}
                  onChange={(event) => updateLink(link.id, { label: event.target.value })}
                />
                <input
                  className="mt-1 w-full border-0 bg-transparent text-xs font-semibold text-slate-soft outline-none"
                  value={link.url}
                  onChange={(event) => updateLink(link.id, { url: event.target.value })}
                  onBlur={() => validateSavedLink(link)}
                />
                {savedLinkErrors[link.id] && (
                  <p className="mt-1 text-xs font-bold leading-5 text-red-600">{savedLinkErrors[link.id]}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-cobalt/5 hover:text-cobalt"
                  title="Open link"
                  aria-label={`Open ${link.label}`}
                >
                  <ArrowUpRight className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={() => deleteLink(link.id)}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                  title="Delete link"
                  aria-label={`Delete ${link.label}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <details className="mb-3 rounded-md bg-wash px-2.5 py-2">
              <summary className="cursor-pointer text-xs font-black text-ink">
                {link.note ? "Edit description" : "Add a description"}
              </summary>
              <textarea
                className={`${inputClass} mt-2 min-h-16 resize-none text-xs`}
                value={link.note ?? ""}
                onChange={(event) => updateLink(link.id, { note: event.target.value })}
                placeholder="What should this link help someone understand?"
                aria-label={`Description for ${link.label}`}
              />
            </details>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <div className="min-w-0">
                <MiniBadge tone={link.isSensitive ? "coral" : "blue"}>{linkTypeLabels[link.type]}</MiniBadge>
                <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  {link.isSensitive ? <Lock className="size-3.5" /> : <Eye className="size-3.5" />}
                  {link.isSensitive ? "Private by default" : "Ready for events"}
                </div>
              </div>
              <Toggle
                checked={Boolean(link.isSensitive)}
                onChange={() => updateLink(link.id, { isSensitive: !link.isSensitive })}
                label="Toggle sensitivity"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefScreen({
  card,
  event,
  profile,
  role,
  updateCard,
  onContinue,
  onNavigate
}: {
  card: NametagCard;
  event?: Event;
  profile: UserProfile;
  role: NetworkingRole;
  updateCard: (patch: Partial<NametagCard>) => void;
  onContinue: () => void;
  onNavigate: (view: RoomView) => void;
}) {
  const brief = card.prepBrief;
  const roomSignals = brief.roomSignals ?? [];
  const sourceLabel = getResearchSourceLabel(event);
  const personalization = describeResearchPersonalization(profile, role);

  return (
    <div className="space-y-4 lg:space-y-5">
      <RoomStepper current="brief" onNavigate={onNavigate} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <MiniBadge tone="mint">Research</MiniBadge>
          <h2 className="app-screen-title mt-3 text-ink">Understand this room.</h2>
          <p className="app-info-copy mt-2 text-slate-600">{event?.name}</p>
        </div>
        <MiniBadge tone="blue">{sourceLabel}</MiniBadge>
      </div>

      {event?.isDemo && (
        <div className="rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-xs font-semibold leading-5 text-coral">
          This is a fictional demo room. The people and context are only here to make the full flow easy to try.
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-wash px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="app-kicker text-cobalt">Your room read</div>
            {event?.researchSourceUrl && (
              <a
                href={event.researchSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 items-center gap-1.5 text-xs font-black text-cobalt underline decoration-cobalt/30 underline-offset-4 transition hover:text-ink"
              >
                Source
                <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </div>
          <div className="mt-1 text-sm font-black text-ink">What the event material tells us</div>
        </div>
        <div className="space-y-3 p-4">
          <p className="app-info-copy line-clamp-3 text-slate-700">{brief.eventSummary}</p>
          <div className="flex items-start gap-2 rounded-lg border border-mint/20 bg-mint/10 px-3 py-2.5 text-xs font-semibold leading-5 text-teal-800">
            <BadgeCheck className="mt-0.5 size-4 shrink-0" />
            <span>{personalization}</span>
          </div>
          <details className="rounded-lg border border-line bg-white px-3 py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-ink">
              Show source details
              <span className="text-xs font-semibold text-slate-soft">Brief summary</span>
            </summary>
            <div className="mt-3 space-y-3 border-t border-line pt-3">
              <div>
                <div className="app-kicker text-slate-soft">What is confirmed</div>
                <ul className="mt-2 space-y-2">
                  {roomSignals.length ? roomSignals.slice(0, 2).map((signal) => <CheckLine key={signal}>{signal}</CheckLine>) : <CheckLine>The supplied event details are light, so NameTag keeps this research broad instead of inventing context.</CheckLine>}
                </ul>
              </div>
              {brief.keyTopics.length > 0 && (
                <div>
                  <div className="app-kicker text-slate-soft">Topics in the source</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {brief.keyTopics.slice(0, 4).map((topic) => <MiniBadge key={topic} tone="slate">{topic}</MiniBadge>)}
                  </div>
                </div>
              )}
            </div>
          </details>
          <p className="app-meta text-slate-soft">Need speakers, questions, or a next move? Ask below.</p>
        </div>
      </section>

      <ResearchChat key={`${card.id}-${role}`} card={card} event={event} profile={profile} role={role} brief={brief} updateCard={updateCard} />

      <PrimaryButton onClick={onContinue}>
        Choose public links
        <ArrowRight className="size-4" />
      </PrimaryButton>
      <p className="-mt-2 text-center text-xs font-semibold leading-5 text-slate-soft">
        Your research, private background, and hidden links never appear after the QR scan.
      </p>
    </div>
  );
}

function DesktopResearchPanel({
  card,
  event,
  profile,
  role
}: {
  card: NametagCard;
  event?: Event;
  profile: UserProfile;
  role: NetworkingRole;
}) {
  const brief = card.prepBrief;
  const peopleMentioned = Array.from(new Set([...brief.speakerHighlights, ...brief.suggestedPeople]));
  const hasPeopleSignal =
    peopleMentioned.length > 0 &&
    hasSpecificPeopleSignal(event?.researchContext ?? event?.urlOrDescription ?? "", peopleMentioned);
  const sourceLabel = getResearchSourceLabel(event);
  const personalization = describeResearchPersonalization(profile, role);

  return (
    <aside className="hidden lg:sticky lg:top-0 lg:block">
      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm shadow-slate-900/[0.03]">
        <div className="border-b border-line bg-[#fbfcfe] px-5 py-4">
          <div className="app-kicker text-cobalt">Research context</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <h3 className="app-section-title text-ink">What this answer is based on.</h3>
            <MiniBadge tone="blue">{sourceLabel}</MiniBadge>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <section>
            <div className="app-kicker text-slate-soft">Source</div>
            <p className="app-info-copy mt-1.5 text-slate-700">
              NameTag uses the event material you provided. It labels missing facts instead of filling them in.
            </p>
            {event?.researchSourceUrl && (
              <a
                href={event.researchSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="app-meta mt-2 inline-flex min-h-8 items-center gap-1.5 text-cobalt underline decoration-cobalt/30 underline-offset-4 transition hover:text-ink"
              >
                View event source
                <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </section>

          <section className="border-t border-line pt-4">
            <div className="app-kicker text-slate-soft">Personalization</div>
            <p className="app-info-copy mt-1.5 text-slate-700">{personalization}</p>
          </section>

          <details className="border-t border-line pt-4">
            <summary className="cursor-pointer text-sm font-black text-ink">Source details</summary>
            <div className="mt-3 space-y-4">
              <div>
                <div className="app-kicker text-slate-soft">Signals</div>
                <ul className="mt-2 space-y-2">
                  {(brief.roomSignals ?? []).slice(0, 3).map((signal) => <CheckLine key={signal}>{signal}</CheckLine>)}
                  {!brief.roomSignals?.length && <CheckLine>The room details are light, so this plan stays broad instead of inventing context.</CheckLine>}
                </ul>
              </div>
              {brief.keyTopics.length > 0 && (
                <div>
                  <div className="app-kicker text-slate-soft">Topics</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {brief.keyTopics.slice(0, 5).map((topic) => <MiniBadge key={topic} tone="slate">{topic}</MiniBadge>)}
                  </div>
                </div>
              )}
              <div>
                <div className="app-kicker text-slate-soft">{hasPeopleSignal ? "People named in the source" : "Mingle plan"}</div>
                {hasPeopleSignal ? (
                  <ul className="mt-2 space-y-2">
                    {peopleMentioned.slice(0, 4).map((person) => <CheckLine key={person}>{person}</CheckLine>)}
                  </ul>
                ) : (
                  <p className="app-info-copy mt-1.5 text-slate-600">No named speaker list was provided. Ask one useful question instead of assuming who is in the room.</p>
                )}
              </div>
            </div>
          </details>
        </div>

      </section>
    </aside>
  );
}

function ResearchChat({
  card,
  event,
  profile,
  role,
  brief,
  updateCard
}: {
  card: NametagCard;
  event?: Event;
  profile: UserProfile;
  role: NetworkingRole;
  brief: PrepBrief;
  updateCard: (patch: Partial<NametagCard>) => void;
}) {
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState(() => buildResearchPrompts(brief, role));
  const [answerMode, setAnswerMode] = useState<"GPT-5.6" | "Prepared fallback" | null>(null);
  const messages = card.researchMessages ?? [];
  const sourceLabel = getResearchSourceLabel(event);

  async function askResearchQuestion(value: string) {
    const content = value.trim();
    if (!content || isThinking || !event) return;

    const userMessage: ResearchMessage = {
      id: makeId("research"),
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    const nextMessages = [...messages, userMessage].slice(-8);
    updateCard({ researchMessages: nextMessages });
    setQuestion("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/research-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          event: {
            name: event.name,
            goal: event.goal,
            focus: event.focus,
            urlOrDescription: event.urlOrDescription,
            researchContext: event.researchContext,
            researchSourceUrl: event.researchSourceUrl
          },
          brief: card.prepBrief,
          question: content,
          history: nextMessages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        })
      });
      const data = (await response.json()) as { mode?: string; result?: ResearchChatResult; error?: string };
      if (!response.ok || !data.result) {
        throw new Error(data.error ?? "Research chat was unavailable");
      }

      const assistantMessage: ResearchMessage = {
        id: makeId("research"),
        role: "assistant",
        content: data.result.answer,
        createdAt: new Date().toISOString()
      };
      updateCard({ researchMessages: [...nextMessages, assistantMessage].slice(-8) });
      if (data.result.suggestedQuestions.length) {
        setSuggestedQuestions(data.result.suggestedQuestions.slice(0, 3));
      }
      setAnswerMode(data.mode === "openai" ? "GPT-5.6" : "Prepared fallback");
    } catch {
      const fallbackMessage: ResearchMessage = {
        id: makeId("research"),
        role: "assistant",
        content:
          "I could not reach the research assistant just now. Your event research above is still saved; try again in a moment or use one of the prepared questions.",
        createdAt: new Date().toISOString()
      };
      updateCard({
        researchMessages: [...nextMessages, fallbackMessage].slice(-8)
      });
      setAnswerMode("Prepared fallback");
    } finally {
      setIsThinking(false);
    }
  }

  function submitQuestion(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    void askResearchQuestion(question);
  }

  return (
    <section className="overflow-hidden rounded-xl border-2 border-ink bg-white shadow-sm shadow-slate-900/[0.06]">
      <div className="flex items-start gap-3 bg-ink px-4 py-4 text-white">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-mint text-ink">
          <MessageCircle className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black">Ask until the room makes sense.</div>
            {answerMode && <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-black text-white/75">{answerMode}</span>}
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/70">
            Grounded in {sourceLabel.toLowerCase()}. Advice uses any background you choose to save; missing facts stay explicit.
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {messages.length === 0 && (
          <div className="rounded-lg bg-wash px-3 py-2.5 text-xs font-semibold leading-5 text-slate-700">
            Start with what you need to understand, then ask for questions you can use in the room. NameTag will not pretend the source gave it facts it did not.
          </div>
        )}

        {messages.length > 0 && (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-7 rounded-lg bg-ink px-3 py-2 text-sm font-semibold leading-5 text-white"
                    : "mr-3 whitespace-pre-wrap rounded-lg border border-cobalt/20 bg-cobalt/5 px-3 py-2 text-sm font-semibold leading-5 text-slate-700"
                }
              >
                {message.content}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitQuestion} className="flex items-end gap-2">
          <textarea
            className={`${inputClass} min-h-11 flex-1 resize-none py-2.5`}
            value={question}
            onChange={(eventChange) => setQuestion(eventChange.target.value)}
            placeholder="What do you want to understand before you walk in?"
            aria-label="Ask NameTag about this event"
            rows={1}
            maxLength={600}
          />
          <button
            type="submit"
            disabled={!question.trim() || isThinking}
            className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink text-white transition hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-45"
            title="Ask about this event"
          >
            {isThinking ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
          </button>
        </form>

        <div>
          <div className="mb-2 app-kicker text-slate-soft">Try one</div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={isThinking}
                onClick={() => void askResearchQuestion(suggestion)}
                className="rounded-md border border-line bg-white px-2.5 py-1.5 text-left text-xs font-bold leading-4 text-slate-700 transition hover:border-ink hover:bg-wash disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CardReviewScreen({
  card,
  event,
  links,
  profile,
  role,
  updateCard,
  updateProfile,
  toggleCardLink,
  setPrimaryCardLink,
  onNavigate
}: {
  card: NametagCard;
  event?: Event;
  links: UserLink[];
  profile: UserProfile;
  role: NetworkingRole;
  updateCard: (patch: Partial<NametagCard>) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  toggleCardLink: (linkId: string) => void;
  setPrimaryCardLink: (linkId: string) => void;
  onNavigate: (view: RoomView) => void;
}) {
  const selectedLinks = card.selectedLinkIds
    .map((id) => links.find((link) => link.id === id))
    .filter(Boolean) as UserLink[];
  const mainLink = selectedLinks.find((link) => link.id === card.primaryLinkId);
  const shownLinks = mainLink
    ? [mainLink, ...selectedLinks.filter((link) => link.id !== mainLink.id)]
    : selectedLinks;
  const hiddenLinks = card.hiddenLinkIds
    .map((id) => links.find((link) => link.id === id))
    .filter(Boolean) as UserLink[];
  const profileName = profile.name;
  const publicHeadline = profile.headline.trim();
  const publicBio = profile.defaultBio.trim();

  return (
    <div className="space-y-4 lg:space-y-6">
      <RoomStepper current="card" onNavigate={onNavigate} />
      <EventContextStrip event={event} stage="links" />

      <section className="overflow-hidden rounded-lg border border-ink bg-ink text-white shadow-sm lg:rounded-xl">
        <div className="h-2 bg-coral" />
        <div className="p-4 lg:flex lg:items-end lg:justify-between lg:gap-8 lg:p-6">
          <div className="lg:max-w-[640px]">
            <div className="app-kicker text-coral">Public links</div>
            <h2 className="app-screen-title mt-3">Choose what this QR shares.</h2>
            <p className="app-info-copy mt-2 text-white/70">Your scanner sees your own public text and the links you choose here. Event research stays private.</p>
          </div>
          <div className="mt-5 rounded-lg border border-white/15 bg-white/[0.08] p-3 lg:mt-0 lg:min-w-[270px]">
            <div className="text-lg font-bold">{profileName}</div>
            <div className="app-meta mt-1 text-mint">{shownLinks.length} public {shownLinks.length === 1 ? "link" : "links"}</div>
          </div>
        </div>
      </section>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-start lg:gap-8">
        <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-ink bg-ink shadow-sm">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.06] px-3 py-2.5 text-white">
          <div>
            <div className="app-kicker text-mint">Scanner preview</div>
            <div className="app-section-title mt-0.5">Exactly what opens after the QR</div>
          </div>
          <Eye className="size-4 text-mint" />
        </div>
        <div className="p-3">
          <div className="overflow-hidden rounded-md border border-white/20 bg-white">
            <div className="border-b-4 border-coral p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-2xl font-black leading-7 tracking-tight text-ink">{profileName}</div>
                  {publicHeadline && <div className="mt-1 text-sm font-bold text-cobalt">{publicHeadline}</div>}
                </div>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {shownLinks.length ? (
                shownLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 rounded-md border border-line bg-wash px-2.5 py-2">
                    <LinkIcon type={link.type} />
                    <span className="min-w-0 flex-1 truncate text-xs font-black text-ink">{link.label}</span>
                    <span className="text-[10px] font-bold text-slate-soft">{linkTypeLabels[link.type]}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-line bg-wash p-2.5 text-xs font-semibold leading-5 text-slate-soft">
                  No public links on this card yet.
                </div>
              )}
              {publicBio && <p className="border-t border-line pt-3 text-xs font-semibold leading-5 text-slate-600">{publicBio}</p>}
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-white/65">
            Only your name, optional public introduction, and selected links appear after the QR scan.
          </p>
        </div>
      </section>

        </div>
        <div className="mt-4 space-y-4 lg:mt-0">

      <section className="rounded-lg border border-cobalt/25 bg-cobalt/5 p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-cobalt">Shown</div>
            <div className="mt-1 text-sm font-black text-ink">What people can open from this card</div>
          </div>
          <MiniBadge tone="blue">{shownLinks.length} public</MiniBadge>
        </div>
        {shownLinks.length ? (
          <div className="space-y-2">
            {shownLinks.map((link) => (
              <div key={link.id} className="rounded-lg border border-cobalt/20 bg-white p-3">
                <div className="flex items-center gap-3">
                  <LinkIcon type={link.type} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-ink">{link.label}</div>
                    <div className="truncate text-xs font-semibold text-slate-soft">{link.url}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrimaryCardLink(link.id)}
                    aria-pressed={card.primaryLinkId === link.id}
                    title={card.primaryLinkId === link.id ? "Main link" : `Make ${link.label} the main link`}
                    className={`grid size-8 place-items-center rounded-md border transition ${
                      card.primaryLinkId === link.id
                        ? "border-coral bg-coral text-white"
                        : "border-line bg-white text-slate-soft hover:border-coral hover:text-coral"
                    }`}
                  >
                    <Star className="size-3.5" fill={card.primaryLinkId === link.id ? "currentColor" : "none"} />
                  </button>
                  <Toggle checked onChange={() => toggleCardLink(link.id)} label={`Hide ${link.label} from this card`} />
                </div>
                <p className="mt-2 border-t border-cobalt/10 pt-2 text-[11px] font-semibold leading-4 text-cobalt">
                  <span className="font-badge-mono mr-1 text-[9px] font-black uppercase tracking-normal">Why shown</span>
                  {shownReason(card, link, event, role)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-cobalt/30 bg-white p-3 text-sm font-semibold leading-5 text-slate-600">
            Add links in your Vault, then return here to choose what this room sees.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-coral/25 bg-coral/5 p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-coral">Kept private</div>
            <div className="mt-1 text-sm font-black text-ink">What stays with you</div>
          </div>
          <MiniBadge tone="coral">{hiddenLinks.length} hidden</MiniBadge>
        </div>
        {hiddenLinks.length ? (
          <div className="space-y-2">
            {hiddenLinks.map((link) => (
              <div key={link.id} className="rounded-lg border border-coral/20 bg-white p-3">
                <div className="flex items-center gap-3">
                  <span className="opacity-45"><LinkIcon type={link.type} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-600">{link.label}</div>
                    <div className="mt-1 text-xs font-bold leading-5 text-coral">{hiddenReason(card, link)}</div>
                  </div>
                  <Toggle checked={false} onChange={() => toggleCardLink(link.id)} label={`Show ${link.label} on this card`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-coral/30 bg-white p-3 text-sm font-semibold leading-5 text-slate-600">
            Nothing is hidden for this room. You can keep personal links private from the Vault or turn off a public link above.
          </p>
        )}
        {(card.overrideNotes ?? []).length > 0 && (
          <div className="mt-3 space-y-2 border-t border-coral/15 pt-3">
            {(card.overrideNotes ?? []).map((note) => (
              <div key={note} className="rounded-md border border-coral/20 bg-coral/10 px-2 py-1.5 text-xs font-black text-coral">
                {note}
              </div>
            ))}
          </div>
        )}
      </section>

      <details className="rounded-lg border border-line bg-white p-3">
        <summary className="cursor-pointer text-sm font-black text-ink">Optional public introduction</summary>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-soft">
          Write this in your own words. It is the only introduction that can appear after someone scans; AI research never does.
        </p>
        <textarea
          className={`${inputClass} mt-3 min-h-20 resize-none`}
          value={profile.defaultBio}
          onChange={(eventChange) => updateProfile({ defaultBio: eventChange.target.value })}
          placeholder="Optional public introduction"
        />
      </details>

      <PrimaryButton onClick={() => onNavigate("share")}>
        Save choices and show QR
        <ArrowRight className="size-4" />
      </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function hiddenReason(card: NametagCard, link: UserLink) {
  return (
    card.reasoning.find((reason) => reason.toLowerCase().startsWith(link.label.toLowerCase())) ??
    `${link.label} hidden — less relevant for this room.`
  );
}

function shownReason(card: NametagCard, link: UserLink, event: Event | undefined, role: NetworkingRole) {
  if (link.isSensitive) {
    return "You intentionally kept this personal channel public for this event.";
  }
  if (card.primaryLinkId === link.id) {
    return "This is the clearest first stop after someone scans your card.";
  }

  const goal = event ? goalLabels[event.goal].label.toLowerCase() : "this event";
  if (["demo", "github", "devpost"].includes(link.type)) {
    return "It gives people concrete proof of what you are building.";
  }
  if (["resume", "portfolio"].includes(link.type)) {
    return "It gives this room a fast, professional view of your work.";
  }
  if (link.type === "linkedin") {
    return "It makes a professional follow-up easy after the event.";
  }
  if (["instagram", "youtube", "tiktok"].includes(link.type)) {
    return getNetworkingRole(role).shortLabel === "Community"
      ? "It is the best public window into the work and community you are part of."
      : `It supports your goal to ${goal} in this room.`;
  }
  return `It supports your goal to ${goal} in this room.`;
}

function hasSpecificPeopleSignal(eventText: string, speakerHighlights: string[]) {
  const source = [eventText, ...speakerHighlights].join(" ");
  const possibleNames = source.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g) ?? [];
  const nonPersonWords = [
    "Build",
    "Week",
    "Career",
    "Fair",
    "Product",
    "Developer",
    "Design",
    "Open",
    "Taipei",
    "NameTag",
    "LinkedIn",
    "GitHub",
    "Devpost",
    "Codex"
  ];

  return possibleNames.some((candidate) => {
    const words = candidate.split(/\s+/);
    return words.length >= 2 && !words.some((word) => nonPersonWords.includes(word));
  });
}

function organizeSeminarNotes(notes: EventNote[]) {
  const bodies = notes.map((note) => note.body.toLowerCase());
  const mentionsMemory = bodies.some((body) => body.includes("memory"));
  const mentionsDemo = bodies.some((body) => body.includes("demo") || body.includes("story"));
  const mentionsHandoff = bodies.some((body) => body.includes("handoff") || body.includes("automation"));

  return {
    takeaways: [
      mentionsMemory
        ? "Scope memory to the event or task so summaries stay relevant."
        : "Seminar notes point to practical context, not generic automation.",
      mentionsDemo
        ? "The strongest product story starts from the user's urgent moment."
        : "Keep the event flow anchored in what the attendee needs next.",
      mentionsHandoff
        ? "Preparation should still leave user control and handoff visible."
        : "Small notes can become follow-up prompts, product ideas, or questions for speakers."
    ],
    actions: [
      "Turn the notes into one follow-up question for a speaker or mentor.",
      "Add the strongest takeaway to the post-event debrief.",
      "Use one note as a conversation starter with someone nearby."
    ]
  };
}

function buildFollowUpDraft(contact: Contact, eventName: string) {
  const context = (contact.note || "we had a good conversation").replace(/[.!?]+$/, "");
  const nextStep = contact.promise
    ? ` As promised, I will ${contact.promise.charAt(0).toLowerCase()}${contact.promise.slice(1)}.`
    : " I would love to keep the conversation going.";
  return `Hi ${contact.name.split(" ")[0]}, great meeting you at ${eventName}. I remembered: ${context}.${nextStep}`;
}

function followUpWindowLabel(window?: Contact["followUpWindow"]) {
  if (window === "today") return "Suggested timing: today";
  if (window === "within_48_hours") return "Suggested timing: within 48 hours";
  if (window === "this_week") return "Suggested timing: this week";
  return "Suggested timing: choose a time";
}

function ShareScreen({ publicUrl }: { publicUrl: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-180px)] items-center justify-center lg:min-h-[calc(100dvh-136px)]">
      <QRShare publicUrl={publicUrl} />
    </div>
  );
}

function DebriefScreen({
  state,
  card,
  event,
  addEventNote,
  addManualContact,
  setState,
  onNavigate
}: {
  state: NametagState;
  card: NametagCard;
  event?: Event;
  addEventNote: (body: string) => void;
  addManualContact: (input: ManualContactInput) => boolean;
  setState: (value: NametagState | ((state: NametagState) => NametagState)) => void;
  onNavigate: (view: RoomView) => void;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const [personName, setPersonName] = useState("");
  const [personContact, setPersonContact] = useState("");
  const [personNote, setPersonNote] = useState("");
  const [personPromise, setPersonPromise] = useState("");
  const [personPriority, setPersonPriority] = useState<Contact["priority"]>("medium");
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeError, setOrganizeError] = useState("");
  const contacts = state.contacts.filter((contact) => contact.eventId === card.eventId);
  const eventNotes = (state.eventNotes ?? []).filter((note) => note.eventId === card.eventId);
  const statusFor = (contact: Contact): FollowUp["status"] =>
    state.followUps.find((followUp) => followUp.contactId === contact.id)?.status ??
    (contact.done ? "done" : "to_send");
  const nextFollowUp =
    contacts.find((contact) => statusFor(contact) === "to_send" && contact.priority === "high") ??
    contacts.find((contact) => statusFor(contact) === "to_send");
  const counts = {
    high: contacts.filter((contact) => contact.priority === "high").length,
    medium: contacts.filter((contact) => contact.priority === "medium").length,
    low: contacts.filter((contact) => contact.priority === "low").length,
    done: contacts.filter((contact) => contact.done).length,
    notes: eventNotes.length
  };

  function setFollowUpStatus(contactId: string, status: FollowUp["status"]) {
    setState((current) => {
      const target = current.contacts.find((contact) => contact.id === contactId);
      const draft = target?.followUpDraft ?? buildFollowUpDraft(target ?? {
        id: contactId,
        eventId: card.eventId,
        cardId: card.id,
        name: "there",
        contact: "",
        note: "",
        promise: "",
        priority: "medium",
        createdAt: ""
      }, event?.name ?? "the event");
      const existingFollowUp = current.followUps.find((followUp) => followUp.contactId === contactId);
      return {
        ...current,
        contacts: current.contacts.map((contact) =>
          contact.id === contactId ? { ...contact, done: status === "done" } : contact
        ),
        followUps: existingFollowUp
          ? current.followUps.map((followUp) =>
              followUp.contactId === contactId ? { ...followUp, status } : followUp
            )
          : [{ id: makeId("followup"), contactId, message: draft, status }, ...current.followUps]
      };
    });
  }

  function submitManualContact(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    const added = addManualContact({
      name: personName,
      contact: personContact,
      note: personNote,
      promise: personPromise,
      priority: personPriority
    });
    if (!added) return;
    setPersonName("");
    setPersonContact("");
    setPersonNote("");
    setPersonPromise("");
    setPersonPriority("medium");
  }

  async function organizeEvent() {
    if (!event || !contacts.length || isOrganizing) return;
    setIsOrganizing(true);
    setOrganizeError("");

    try {
      const response = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: {
            id: event.id,
            name: event.name,
            goal: event.goal,
            focus: event.focus,
            networkingRole: event.networkingRole ?? "exploring"
          },
          contacts,
          notes: eventNotes
        })
      });
      const data = (await response.json()) as { result?: EventDebriefResult; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "Could not organize this event");

      const suggestions = new Map(data.result.contacts.map((item) => [item.contactId, item]));
      setState((current) => {
        const eventContactIds = new Set(
          current.contacts.filter((contact) => contact.eventId === card.eventId).map((contact) => contact.id)
        );
        const updatedContacts = current.contacts.map((contact) => {
          const suggestion = suggestions.get(contact.id);
          return suggestion
            ? {
                ...contact,
                priority: suggestion.priority,
                followUpDraft: suggestion.followUpDraft,
                followUpReason: suggestion.followUpReason,
                followUpWindow: suggestion.followUpWindow
              }
            : contact;
        });
        const existingFollowUpIds = new Set(current.followUps.map((followUp) => followUp.contactId));
        const updatedFollowUps = current.followUps.map((followUp) => {
          const suggestion = suggestions.get(followUp.contactId);
          return suggestion ? { ...followUp, message: suggestion.followUpDraft } : followUp;
        });
        const createdFollowUps = data.result!.contacts
          .filter(
            (suggestion) =>
              eventContactIds.has(suggestion.contactId) && !existingFollowUpIds.has(suggestion.contactId)
          )
          .map((suggestion) => ({
            id: makeId("followup"),
            contactId: suggestion.contactId,
            message: suggestion.followUpDraft,
            status: "to_send" as const
          }));

        return {
          ...current,
          contacts: updatedContacts,
          followUps: [...createdFollowUps, ...updatedFollowUps],
          events: current.events.map((item) =>
            item.id === event.id
              ? {
                  ...item,
                  debrief: {
                    summary: data.result!.summary,
                    actionPlan: data.result!.actionPlan,
                    organizedAt: new Date().toISOString()
                  }
                }
              : item
          )
        };
      });
    } catch (error) {
      setOrganizeError(error instanceof Error ? error.message : "Could not organize this event.");
    } finally {
      setIsOrganizing(false);
    }
  }

  function updateFollowUpDraft(contactId: string, message: string) {
    setState((current) => {
      const existing = current.followUps.find((followUp) => followUp.contactId === contactId);
      return {
        ...current,
        contacts: current.contacts.map((contact) =>
          contact.id === contactId ? { ...contact, followUpDraft: message } : contact
        ),
        followUps: existing
          ? current.followUps.map((followUp) =>
              followUp.contactId === contactId ? { ...followUp, message } : followUp
            )
          : [
              {
                id: makeId("followup"),
                contactId,
                message,
                status: "to_send" as const
              },
              ...current.followUps
            ]
      };
    });
  }

  async function copyFollowUp(contact: Contact) {
    const draft =
      contact.followUpDraft ??
      state.followUps.find((followUp) => followUp.contactId === contact.id)?.message ??
      buildFollowUpDraft(contact, event?.name ?? "the event");
    await navigator.clipboard?.writeText(draft).catch(() => undefined);
  }

  return (
    <div className="space-y-4 lg:max-w-[1120px] lg:space-y-5">
      <RoomStepper current="debrief" onNavigate={onNavigate} />
      <EventContextStrip event={event} stage="follow-up" />
      <div>
        <MiniBadge tone="mint">After the room</MiniBadge>
        <h2 className="app-screen-title mt-3 text-ink">Your follow-up queue.</h2>
        <p className="app-info-copy mt-2 text-slate-600">
          Review the context, edit or copy the draft, send it where you normally message, then mark it sent or done. NameTag never sends a message for you.
        </p>
      </div>

      <section aria-labelledby="follow-up-how-it-works" className="border-y border-line py-3">
        <div id="follow-up-how-it-works" className="app-kicker text-cobalt">Follow-up in three moves</div>
        <ol className="mt-2 grid grid-cols-3 gap-2">
          <li className="min-w-0">
            <span className="font-badge-mono text-[10px] font-black text-coral">01</span>
            <div className="mt-1 text-xs font-black text-ink">Capture</div>
            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-soft">Name, context, promise.</p>
          </li>
          <li className="min-w-0 border-l border-line pl-2">
            <span className="font-badge-mono text-[10px] font-black text-cobalt">02</span>
            <div className="mt-1 text-xs font-black text-ink">Send</div>
            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-soft">Edit or copy the draft.</p>
          </li>
          <li className="min-w-0 border-l border-line pl-2">
            <span className="font-badge-mono text-[10px] font-black text-teal-800">03</span>
            <div className="mt-1 text-xs font-black text-ink">Close</div>
            <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-soft">Mark sent, then done.</p>
          </li>
        </ol>
      </section>

      {nextFollowUp ? (
        <section className="overflow-hidden rounded-lg border border-ink bg-ink text-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
            <div className="app-kicker text-coral">
              Your next real step
            </div>
            <MiniBadge tone="coral">{nextFollowUp.priority} priority</MiniBadge>
          </div>
          <div className="p-3">
            <div className="app-section-title">Follow up with {nextFollowUp.name}</div>
            <p className="app-meta mt-1 text-white/65 line-clamp-2">{nextFollowUp.note}</p>
            <p className="app-kicker mt-2 text-mint">
              {followUpWindowLabel(nextFollowUp.followUpWindow)}
            </p>
            {nextFollowUp.followUpReason && (
              <p className="app-meta mt-2 border-l-2 border-mint pl-2 text-mint">
                {nextFollowUp.followUpReason}
              </p>
            )}
            <button
              type="button"
              onClick={() => void copyFollowUp(nextFollowUp)}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-coral px-3 text-sm font-black text-white"
            >
              Copy draft to send
              <Copy className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setFollowUpStatus(nextFollowUp.id, "sent")}
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-white/20 px-3 text-sm font-black text-white/85 transition hover:bg-white/10"
            >
              Mark as sent
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-mint/25 bg-mint/10 p-3">
          <div className="app-section-title text-teal-800">Your to-send queue is clear.</div>
          <p className="app-meta mt-1 text-teal-800/75">
            Add someone below, or new people who connect through the QR will appear here automatically.
          </p>
        </section>
      )}

      <details className="overflow-hidden rounded-lg border border-cobalt/25 bg-cobalt/5 shadow-sm">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 border-b border-cobalt/15 bg-white px-3 py-3">
          <div>
            <div className="app-kicker text-cobalt">AI event debrief</div>
            <div className="app-section-title mt-1 text-ink">Organize the rest when you are ready.</div>
          </div>
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-cobalt" />
        </summary>
        <div className="space-y-3 p-3">
          {event?.debrief ? (
            <>
              <p className="app-info-copy text-slate-700">{event.debrief.summary}</p>
              <ul className="space-y-2 border-t border-cobalt/15 pt-3">
                {event.debrief.actionPlan.map((action) => (
                  <CheckLine key={action}>{action}</CheckLine>
                ))}
              </ul>
            </>
          ) : (
            <p className="app-info-copy text-slate-700">
              Once you have people or notes, NameTag sorts the queue, explains why each person matters, and drafts a first message you can edit before sending.
            </p>
          )}
          <button
            type="button"
            onClick={() => void organizeEvent()}
            disabled={!contacts.length || isOrganizing}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cobalt px-4 text-sm font-black text-white shadow-sm shadow-cobalt/20 transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isOrganizing ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
            {event?.debrief ? "Refresh my follow-up plan" : "Organize everyone with AI"}
          </button>
          {!contacts.length && (
            <p className="text-xs font-semibold leading-5 text-slate-soft">
              Add someone below or wait for an opted-in QR connection, then NameTag can organize the queue.
            </p>
          )}
          {organizeError && <p className="text-xs font-bold leading-5 text-red-600">{organizeError}</p>}
        </div>
      </details>

      <details className="rounded-lg border border-line bg-white px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-black text-ink">Event details</summary>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 lg:grid-cols-4 lg:gap-3">
          <Metric label="People met" value={contacts.length} icon={UsersRound} />
          <Metric label="Private notes" value={counts.notes} icon={NotebookPen} />
          <Metric label="High priority" value={counts.high} icon={Flag} />
          <Metric label="Done" value={counts.done} icon={Save} />
        </div>
      </details>

      <details open={!contacts.length} className="rounded-lg border border-line bg-white p-3 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-black text-ink">Add someone manually</span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-soft">For a paper card, introduction, or someone who did not scan.</span>
          </span>
          <Plus className="size-4 shrink-0 text-cobalt" />
        </summary>
        <form onSubmit={submitManualContact} className="mt-4 space-y-3 border-t border-line pt-4">
          <p className="-mt-1 text-xs font-semibold leading-5 text-slate-soft">
            Add only what you remember. NameTag will turn it into an editable first follow-up.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name">
              <input
                className={inputClass}
                value={personName}
                onChange={(eventChange) => setPersonName(eventChange.target.value)}
                placeholder="Jamie Park"
                required
              />
            </Field>
            <Field label="Contact (optional)">
              <input
                className={inputClass}
                value={personContact}
                onChange={(eventChange) => setPersonContact(eventChange.target.value)}
                placeholder="Email or LinkedIn"
              />
            </Field>
          </div>
          <Field label="What did you talk about?">
            <textarea
              className={`${inputClass} min-h-20 resize-none`}
              value={personNote}
              onChange={(eventChange) => setPersonNote(eventChange.target.value)}
              placeholder="They are testing the same problem and asked to see the prototype."
            />
          </Field>
          <div className="grid grid-cols-[1fr_118px] gap-2">
            <Field label="Promise or next step (optional)">
              <input
                className={inputClass}
                value={personPromise}
                onChange={(eventChange) => setPersonPromise(eventChange.target.value)}
                placeholder="Send the prototype link"
              />
            </Field>
            <Field label="Priority">
              <select
                className={inputClass}
                value={personPriority}
                onChange={(eventChange) => setPersonPriority(eventChange.target.value as Contact["priority"])}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
          </div>
          <PrimaryButton type="submit">
            <Plus className="size-4" />
            Add to follow-up queue
          </PrimaryButton>
        </form>
      </details>

      <details className="rounded-lg border border-line bg-white p-3">
        <summary className="cursor-pointer text-sm font-black text-ink">Priority overview</summary>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <PriorityPill label="High" count={counts.high} tone="coral" />
          <PriorityPill label="Medium" count={counts.medium} tone="blue" />
          <PriorityPill label="Low" count={counts.low} tone="mint" />
        </div>
      </details>

      <details className="rounded-lg border border-line bg-white p-3">
        <summary className="cursor-pointer text-sm font-black text-ink">Private notes</summary>
        <div className="mt-3 border-t border-line pt-3">
        {eventNotes.length === 0 ? (
          <p className="text-sm leading-5 text-slate-600">
            Notes from talks or hallway conversations will appear here after you add them.
          </p>
        ) : (
          <ul className="space-y-2">
            {organizeSeminarNotes(
            eventNotes
            ).takeaways.map((takeaway) => (
              <CheckLine key={takeaway}>{takeaway}</CheckLine>
            ))}
          </ul>
        )}
        <details className="mt-3 rounded-lg border border-line bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-black text-ink">Add private event note</summary>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-soft">
            Optional. Use this after a talk or hallway conversation.
          </p>
          <textarea
            className={`${inputClass} mt-2 min-h-20 resize-none`}
            value={noteDraft}
            onChange={(eventChange) => setNoteDraft(eventChange.target.value)}
            placeholder="Example: mentor said privacy choices need a close-up in the demo..."
          />
          <div className="mt-2 flex justify-end">
            <SecondaryButton
              onClick={() => {
                addEventNote(noteDraft);
                setNoteDraft("");
              }}
            >
              <Plus className="size-4" />
              Save note
            </SecondaryButton>
          </div>
        </details>
        </div>
      </details>

      <section className="space-y-2">
        <SectionTitle icon={UsersRound} title="Follow-up queue" />
        {contacts.length === 0 ? (
          <EmptyState
            title="No follow-ups yet"
            body="Add someone you met above, or let a scanner opt in through your public card."
          />
        ) : (
          contacts.map((contact) => {
            const draft =
              contact.followUpDraft ??
              state.followUps.find((followUp) => followUp.contactId === contact.id)?.message ??
              buildFollowUpDraft(contact, event?.name ?? "the event");
            const status = statusFor(contact);
            return (
              <div key={contact.id} className="rounded-lg border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-ink">{contact.name}</div>
                    <div className="text-xs font-bold text-slate-soft">{contact.contact}</div>
                  </div>
                  <MiniBadge
                    tone={
                      contact.priority === "high"
                        ? "coral"
                        : contact.priority === "medium"
                          ? "blue"
                          : "mint"
                    }
                  >
                    {contact.priority}
                  </MiniBadge>
                </div>
                <p className="mt-3 text-sm leading-5 text-slate-700">{contact.note}</p>
                {contact.promise && (
                  <div className="mt-2 rounded-md border border-coral/20 bg-coral/10 px-2 py-1.5 text-xs font-bold leading-5 text-coral">
                    Next step: {contact.promise}
                  </div>
                )}
                {(contact.followUpReason || contact.followUpWindow) && (
                  <div className="mt-2 rounded-md border border-cobalt/20 bg-cobalt/5 px-2 py-2 text-xs font-semibold leading-5 text-slate-700">
                    <div className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-cobalt">
                      {followUpWindowLabel(contact.followUpWindow)}
                    </div>
                    {contact.followUpReason && <div className="mt-1">{contact.followUpReason}</div>}
                  </div>
                )}
                <div className="mt-3 rounded-lg border border-line bg-white p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-black text-ink">Follow-up draft</span>
                    <select
                      className="rounded-md border border-line bg-white px-2 py-1 text-xs font-black text-ink outline-none focus:border-cobalt"
                      value={status}
                      onChange={(eventChange) =>
                        setFollowUpStatus(contact.id, eventChange.target.value as FollowUp["status"])
                      }
                      aria-label={`Follow-up status for ${contact.name}`}
                    >
                      <option value="to_send">To send</option>
                      <option value="sent">Sent</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <p className="text-xs leading-5 text-slate-600">{draft}</p>
                  <details className="mt-2 rounded-md border border-line bg-wash p-2">
                    <summary className="cursor-pointer text-xs font-black text-ink">Edit this draft</summary>
                    <textarea
                      className={`${inputClass} mt-2 min-h-24 resize-none bg-white text-xs leading-5`}
                      value={draft}
                      onChange={(eventChange) => updateFollowUpDraft(contact.id, eventChange.target.value)}
                      aria-label={`Edit follow-up draft for ${contact.name}`}
                    />
                  </details>
                  <button
                    type="button"
                    onClick={() => void copyFollowUp(contact)}
                    className="mt-3 w-full rounded-lg bg-cobalt px-3 py-2 text-sm font-black text-white"
                  >
                    Copy draft
                  </button>
                  {status === "sent" && (
                    <button
                      type="button"
                      onClick={() => setFollowUpStatus(contact.id, "done")}
                      className="mt-2 w-full rounded-lg border border-mint/35 bg-mint/10 px-3 py-2 text-sm font-black text-teal-800 transition hover:bg-mint/20"
                    >
                      Mark follow-up done
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: number;
  icon: typeof UsersRound;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <Icon className="mb-3 size-4 text-mint" />
      <div className="text-2xl font-black text-ink">{value}</div>
      <div className="text-xs font-bold text-slate-soft">{label}</div>
    </div>
  );
}

function PriorityPill({
  label,
  count,
  tone
}: {
  label: string;
  count: number;
  tone: "mint" | "blue" | "coral";
}) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-2 text-center">
      <MiniBadge tone={tone}>{label}</MiniBadge>
      <div className="mt-1 text-lg font-black text-ink">{count}</div>
    </div>
  );
}
