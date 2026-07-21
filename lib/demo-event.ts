import { makeId, makeSecret } from "@/lib/ids";
import type { Contact, Event, FollowUp, NametagCard, NametagState, UserLink, UserProfile } from "@/lib/types";

type DemoWorkspace = NametagState & {
  demoCardId: string;
};

export function createDemoWorkspace(existingProfile: UserProfile): DemoWorkspace {
  const createdAt = new Date().toISOString();
  const profile: UserProfile = {
    ...existingProfile,
    id: existingProfile.id === "user_local" ? "demo_owner" : existingProfile.id,
    // The reviewer route is intentionally a named fictional product persona,
    // rather than a claim of employment or affiliation with OpenAI.
    name: "Annie Wu",
    headline: "Founder, NameTags · OpenAI Build Week builder",
    defaultBio: "Building calmer ways for people to walk into unfamiliar rooms and leave with a real next step.",
    networkingRole: "builder"
  };

  const prototypeLink: UserLink = {
    id: makeId("demo_link"),
    userId: profile.id,
    label: "See the prototype",
    type: "demo",
    url: "https://example.com/nametag-demo",
    note: "A short demo of the product Annie is testing."
  };
  const linkedinLink: UserLink = {
    id: makeId("demo_link"),
    userId: profile.id,
    label: "Connect on LinkedIn",
    type: "linkedin",
    url: "https://www.linkedin.com",
    note: "A professional way to continue the conversation."
  };

  const event: Event = {
    id: makeId("demo_event"),
    userId: profile.id,
    name: "Founder Meetup: Building in Public",
    urlOrDescription:
      "Demo event, fictional. A small founder meetup for people testing early product ideas, looking for collaborators, and sharing what they are learning.",
    goal: "find_collaborators",
    goals: ["find_collaborators"],
    focus: "meeting one complementary collaborator",
    networkingRole: profile.networkingRole,
    researchContext:
      "Demo event, fictional. Host Maya Park opens a small founder meetup about early product experiments. Jamie Park is a fictional attendee testing a workflow for first-time founders. These names are part of the demo scenario only.",
    researchQuality: "description",
    isDemo: true,
    createdAt
  };

  const card: NametagCard = {
    id: makeId("demo_card"),
    userId: profile.id,
    eventId: event.id,
    ownerSyncKey: makeSecret("owner"),
    personaName: "Curious product builder",
    bio: "Building a calmer way to prepare for unfamiliar events, make one useful connection, and follow through after.",
    cta: "Ask me what makes networking feel hard. I would love a sharp perspective or a collaborator to test it with.",
    selectedLinkIds: [prototypeLink.id, linkedinLink.id],
    primaryLinkId: prototypeLink.id,
    hiddenLinkIds: [],
    focus: event.focus,
    reasoningSummary: "For this founder room, lead with the prototype and keep the follow-up channel simple.",
    reasoning: [
      "See the prototype shown - this room responds best to a concrete problem and something people can react to.",
      "Connect on LinkedIn shown - it gives a low-pressure way to continue a useful conversation."
    ],
    prepBrief: {
      eventSummary:
        "This is a clearly labelled fictional Founder Meetup for the NameTag demo. The room is built around early product experiments, useful feedback, and one or two thoughtful new connections rather than collecting as many contacts as possible.",
      roomSignals: [
        "Demo signal: attendees are testing early ideas, so a specific problem is more useful than a polished pitch.",
        "Collaboration signal: ask what someone is learning before asking for anything.",
        "The named people in this scenario are fictional and exist only to make the demo concrete."
      ],
      peopleToMeet: [
        "A founder who has already talked to the kind of user you care about.",
        "A complementary builder or designer who enjoys early experiments.",
        "One person who can give direct feedback on the prototype."
      ],
      recommendedApproach:
        "Open with one easy question, listen for the problem they are testing, then offer the prototype only when it is relevant. Finish one promising conversation by swapping the card and agreeing on a concrete follow-up.",
      speakerHighlights: ["Maya Park - fictional demo host opening the room with a prompt about early product experiments."],
      keyTopics: ["Early experiments", "User conversations", "Co-founders", "Feedback", "Building in public"],
      suggestedPeople: ["Maya Park - fictional demo host.", "Jamie Park - fictional founder attendee testing an early workflow."],
      questionsToAsk: [
        "What are you testing right now?",
        "What is the hardest part of getting honest feedback?",
        "What would make the next two weeks feel like progress for you?"
      ],
      conversationStarters: [
        "What brought you to this meetup tonight?",
        "What is one thing you are trying to learn before you build more?",
        "I am testing a tool for people who feel unprepared at events. Does that sound familiar to you?"
      ],
      intro:
        "Hi, I am Annie. I am testing a calmer way for people to prepare for events and actually follow up afterward. What are you working on right now?",
      shortPitch:
        "I have noticed that many people arrive at meetups knowing they should network but not knowing how to begin, what to share, or how to keep track of the conversations that mattered. I am building NameTag to turn that anxious moment into one clear next step: understand the room, use a natural opening, share one focused card, and leave with a follow-up that has real context. I am looking for people who have felt that problem themselves and can tell me where the flow still feels awkward.",
      recommendedGoal: "Find one collaborator or feedback partner who understands early product experiments.",
      recommendedPersona: "Curious product builder"
    },
    createdAt
  };
  event.cardId = card.id;

  const contact: Contact = {
    id: makeId("demo_contact"),
    eventId: event.id,
    cardId: card.id,
    name: "Jamie Park (demo)",
    contact: "linkedin.com/in/jamie-demo",
    note: "Fictional demo participant. Jamie is testing a workflow for first-time founders and asked to see the prototype.",
    promise: "Send the prototype link tomorrow.",
    priority: "high",
    followUpReason: "Jamie asked for a specific prototype and is close to the problem NameTag is testing.",
    followUpWindow: "within_48_hours",
    followUpDraft:
      "Hi Jamie, it was great meeting you at Founder Meetup. I appreciated hearing how you are testing the workflow for first-time founders. Here is the NameTag prototype I mentioned. I would love to hear which part feels most useful or unnecessary to you.",
    done: false,
    consentedAt: createdAt,
    createdAt
  };
  const followUp: FollowUp = {
    id: makeId("demo_followup"),
    contactId: contact.id,
    message: contact.followUpDraft ?? "",
    status: "to_send"
  };

  return {
    profile,
    links: [prototypeLink, linkedinLink],
    events: [event],
    cards: [card],
    contacts: [contact],
    followUps: [followUp],
    eventNotes: [],
    demoCardId: card.id
  };
}
