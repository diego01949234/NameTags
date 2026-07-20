import {
  BriefcaseBusiness,
  Calendar,
  Code2,
  FileText,
  Github,
  Globe2,
  Instagram,
  Linkedin,
  Mail,
  Monitor,
  PlaySquare,
  Send,
  UserRound,
  Video
} from "lucide-react";
import type { LinkType } from "@/lib/types";

export const linkTypeLabels: Record<LinkType, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  instagram: "Instagram",
  line: "LINE",
  email: "Email",
  portfolio: "Portfolio",
  resume: "Resume",
  demo: "Demo",
  devpost: "Devpost",
  website: "Website",
  calendar: "Calendar",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Other"
};

export const linkTypeIcons = {
  linkedin: Linkedin,
  github: Github,
  instagram: Instagram,
  line: Send,
  email: Mail,
  portfolio: BriefcaseBusiness,
  resume: FileText,
  demo: Monitor,
  devpost: Code2,
  website: Globe2,
  calendar: Calendar,
  youtube: PlaySquare,
  tiktok: Video,
  other: UserRound
};

export function normalizeLinkUrl(value: string, type: LinkType) {
  const raw = value.trim();
  if (!raw) return { error: "Add a link before saving." } as const;

  if (type === "email") {
    const email = raw.replace(/^mailto:/i, "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Use a valid email address for an email link." } as const;
    }
    return { url: `mailto:${email}` } as const;
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { error: "Links need to start with https:// or http://." } as const;
    }
    if (!parsed.hostname || parsed.hostname === "localhost") {
      return { error: "Use a public web link, not a local address." } as const;
    }
    return { url: parsed.toString() } as const;
  } catch {
    return { error: "That does not look like a usable link." } as const;
  }
}

export function defaultLinkLabel(url: string, type: LinkType) {
  if (type === "email") return linkTypeLabels.email;
  if (type !== "website" && type !== "other") return linkTypeLabels[type];

  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname || linkTypeLabels[type];
  } catch {
    return linkTypeLabels[type];
  }
}

export function inferLinkType(value: string): LinkType | undefined {
  const raw = value.trim().toLowerCase();
  if (!raw) return undefined;
  if (/^mailto:/i.test(raw) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return "email";

  const source = raw.startsWith("http") ? raw : `https://${raw}`;
  try {
    const hostname = new URL(source).hostname.replace(/^www\./i, "");
    if (hostname.endsWith("linkedin.com")) return "linkedin";
    if (hostname.endsWith("github.com")) return "github";
    if (hostname.endsWith("devpost.com")) return "devpost";
    if (hostname.endsWith("instagram.com")) return "instagram";
    if (hostname.endsWith("youtube.com") || hostname === "youtu.be") return "youtube";
    if (hostname.endsWith("tiktok.com")) return "tiktok";
    if (hostname.endsWith("cal.com") || hostname.endsWith("calendly.com")) return "calendar";
    if (hostname === "lin.ee" || hostname.endsWith("line.me")) return "line";
  } catch {
    return undefined;
  }

  return undefined;
}
