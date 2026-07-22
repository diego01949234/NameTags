import type { NametagState } from "@/lib/types";

export const goalLabels = {
  find_collaborators: {
    label: "Find collaborators",
    description: "Meet builders and potential co-founders"
  },
  show_project: {
    label: "Show my project",
    description: "Lead with demo, GitHub, and what you are shipping"
  },
  find_users: {
    label: "Find users",
    description: "Talk to potential early users"
  },
  learn: {
    label: "Learn and get inspired",
    description: "Meet experts and learn what is possible"
  },
  find_opportunities: {
    label: "Find opportunities",
    description: "Find jobs, clients, investors, or partnerships"
  },
  make_friends: {
    label: "Make friends",
    description: "Keep it casual and approachable"
  },
  meet_mentors: {
    label: "Meet mentors",
    description: "Find people who can give sharp feedback"
  },
  meet_founders: {
    label: "Meet founders",
    description: "Find founder peers, users, and product feedback"
  }
} as const;

export const initialState: NametagState = {
  setupComplete: false,
  profile: {
    id: "user_local",
    name: "",
    headline: "",
    defaultBio: "",
    privateContext: "",
    location: "",
    organization: "",
    school: "",
    interests: "",
    networkingRole: "exploring"
  },
  links: [],
  events: [],
  cards: [],
  contacts: [],
  followUps: [],
  eventNotes: []
};
