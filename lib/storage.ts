import { initialState } from "@/lib/sample-data";
import { makeSecret } from "@/lib/ids";
import type { NametagState } from "@/lib/types";

export const STORAGE_KEY = "nametag.app.state.v2";

export function loadState(): NametagState {
  if (typeof window === "undefined") return initialState;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialState;
    return normalizeState(JSON.parse(stored) as Partial<NametagState>);
  } catch {
    return initialState;
  }
}

export function normalizeState(parsed: Partial<NametagState>): NametagState {
  const state: NametagState = {
    ...initialState,
    ...parsed,
    profile: { ...initialState.profile, ...parsed.profile },
    links: parsed.links ?? [],
    events: parsed.events ?? [],
    cards: parsed.cards ?? [],
    contacts: parsed.contacts ?? [],
    followUps: parsed.followUps ?? [],
    eventNotes: parsed.eventNotes ?? []
  };

  return {
      ...state,
      events: state.events.map((event) => ({
        ...event,
        goals: event.goals ?? [event.goal],
        customGoal: event.customGoal ?? "",
        focus: event.focus ?? "",
        networkingRole: event.networkingRole ?? state.profile.networkingRole ?? "exploring",
        debrief: event.debrief,
        cardId: event.cardId ?? state.cards.find((card) => card.eventId === event.id)?.id
      })),
      cards: state.cards.map((card) => ({
        ...card,
        ownerSyncKey: card.ownerSyncKey ?? makeSecret("owner"),
        primaryLinkId: card.primaryLinkId ?? card.selectedLinkIds[0],
        reasoning: card.reasoning ?? [],
        focus: card.focus ?? state.events.find((event) => event.id === card.eventId)?.focus ?? ""
      })),
      contacts: state.contacts.map((contact) => ({
        ...contact,
        followUpDraft:
          contact.followUpDraft ??
          state.followUps.find((followUp) => followUp.contactId === contact.id)?.message,
        followUpReason: contact.followUpReason ?? "",
        followUpWindow: contact.followUpWindow,
        done: contact.done ?? state.followUps.find((followUp) => followUp.contactId === contact.id)?.status === "done"
      }))
  };
}

export function saveState(state: NametagState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  if (typeof window === "undefined") return initialState;
  window.localStorage.removeItem(STORAGE_KEY);
  return initialState;
}
