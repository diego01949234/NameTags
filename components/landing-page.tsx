"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  CirclePlay,
  Github,
  MessageCircle,
  QrCode,
  Search,
  Sparkles
} from "lucide-react";
import { BrandMark } from "@/components/ui-primitives";

const steps = [
  {
    number: "01",
    label: "Before",
    icon: Search,
    title: "Understand the room.",
    body: "Paste an event link, description, or screenshot. Get the context, questions, and a research chat before you walk in.",
    accent: "#315DD3"
  },
  {
    number: "02",
    label: "During",
    icon: QrCode,
    title: "Share the right card.",
    body: "Create one room-specific QR pass with only the links you want to share for this event.",
    accent: "#E86D50"
  },
  {
    number: "03",
    label: "After",
    icon: MessageCircle,
    title: "Follow through.",
    body: "Keep the person, the conversation, the promise, and a human-editable follow-up in one place.",
    accent: "#168779"
  }
];

const proofPoints = [
  "GPT-5.6 event research and follow-up reasoning",
  "Event-specific public QR cards",
  "Explicit scanner consent",
  "Private notes stay private"
];

export function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-x-hidden bg-[#fcfcfa] text-[#182235]">
      <header className="sticky top-0 z-30 border-b border-[#182235]/10 bg-[#fcfcfa]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/landing" className="flex items-center gap-2.5" aria-label="NameTags home">
            <BrandMark />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-bold text-[#526077] md:flex" aria-label="Landing navigation">
            <a href="#how-it-works" className="transition hover:text-[#182235]">How it works</a>
            <a href="#story" className="transition hover:text-[#182235]">Why NameTags</a>
            <a href="#watch" className="transition hover:text-[#182235]">Watch</a>
          </nav>
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#182235] px-4 text-sm font-bold text-white transition hover:bg-[#315DD3]">
            Open app <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <section className="relative border-b border-[#182235]/10 bg-[#fcfcfa]">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:pb-24 lg:pt-24">
          <div className="landing-rise max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-[#e86d50]/35 bg-[#fff0e5] px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-[#a6472b]">
              <span className="size-1.5 rounded-full bg-[#e86d50]" /> Built for unfamiliar rooms
            </div>
            <h1 className="mt-6 text-5xl font-bold leading-[0.96] tracking-normal text-[#182235] sm:text-6xl lg:text-7xl">
              Networking,
              <br />
              without the pressure.
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-[#657184] sm:text-xl">
              NameTags turns event anxiety into one clear next step: understand the room, share the right information, and follow through after the conversation.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#e86d50] px-5 text-sm font-bold text-white transition hover:bg-[#c8553c]">
                Start with an event <ArrowRight className="size-4" />
              </Link>
              <a href="#watch" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#182235]/20 bg-white px-5 text-sm font-bold text-[#182235] transition hover:border-[#182235]">
                <CirclePlay className="size-4" /> Watch the product
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#526077]">
              <span>Private by default</span><span className="text-[#e86d50]">+</span><span>Built with GPT-5.6</span><span className="text-[#e86d50]">+</span><span>Human in control</span>
            </div>
          </div>

          <div className="landing-float relative mx-auto w-full max-w-[590px]">
            <div className="relative overflow-hidden border border-[#182235] bg-[#182235] p-4 shadow-[14px_14px_0_#e86d50] sm:p-5">
              <div className="flex items-center justify-between border-b border-white/15 pb-3 text-white">
                <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-md bg-[#e86d50] font-bold">N</span><span className="text-sm font-bold">NameTags</span></div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-white/55">Event workspace</span>
              </div>
              <div className="grid gap-3 py-5 sm:grid-cols-[1fr_.82fr]">
                <div className="border border-white/15 bg-white/[.06] p-4">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-[#ffc5af]">Researching</div>
                  <div className="mt-3 text-2xl font-bold leading-tight text-white">OpenAI Build Week</div>
                  <div className="mt-4 h-2 w-full overflow-hidden bg-white/10"><div className="landing-scan h-full w-2/3 bg-[#e86d50]" /></div>
                  <div className="mt-5 space-y-2.5">
                    {['What is this room about?', 'Questions I can ask', 'Who should I meet?'].map((line) => <div key={line} className="flex items-center gap-2 text-xs font-medium text-white/70"><Check className="size-3.5 text-[#78cfbe]" />{line}</div>)}
                  </div>
                </div>
                <div className="border border-[#e86d50] bg-[#fff0e5] p-4 text-[#182235]">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-[#a6472b]">Your room pass</div>
                  <div className="mt-3 text-base font-bold">Only the links you choose.</div>
                  <div className="mt-4 grid aspect-square place-items-center bg-white p-4">
                    <QrCode className="size-full max-w-28 stroke-[2.5]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold"><span>3 links shown</span><span className="text-[#a6472b]">Private notes hidden</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-white/15 pt-3 text-xs font-semibold text-white/65"><Sparkles className="size-4 text-[#ffc5af]" />One event context, carried through every next step.</div>
            </div>
            <div className="absolute -bottom-7 -left-5 hidden border border-[#182235]/15 bg-white px-4 py-3 shadow-lg sm:flex sm:items-center sm:gap-3"><span className="grid size-8 place-items-center rounded-full bg-[#d7f0e9] text-[#168779]"><Check className="size-4" /></span><div><div className="text-xs font-bold">Connection saved</div><div className="text-[11px] font-medium text-[#657184]">Ready for follow-up</div></div></div>
          </div>
        </div>
      </section>

      <section id="story" className="border-b border-[#182235]/10 bg-[#182235] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:py-24">
          <div className="font-mono text-xs font-bold uppercase tracking-wide text-[#ffc5af]">Why I built it</div>
          <div>
            <p className="max-w-4xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">I came to New York for a summer internship and suddenly found myself surrounded by meetups, founder events, and rooms full of strangers.</p>
            <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-white/65">As a non-native English speaker in a new city, the pressure was not only starting a conversation. It was researching fast, knowing what to share, and remembering what to do after. NameTags makes those invisible tasks lighter without taking the human interaction away.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-[#182235]/10 bg-[#f2f5f8]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="flex flex-col justify-between gap-5 border-b border-[#182235]/15 pb-8 md:flex-row md:items-end">
            <div><div className="font-mono text-xs font-bold uppercase tracking-wide text-[#315dd3]">One calm flow</div><h2 className="mt-3 text-4xl font-bold leading-none sm:text-5xl">Three moments. One context.</h2></div>
            <p className="max-w-sm text-base font-medium leading-7 text-[#657184]">The same event context flows from research to QR connection to follow-up, so the person never has to start over.</p>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden border border-[#182235]/15 bg-[#182235]/15 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return <article key={step.number} className="group min-h-[340px] bg-[#fcfcfa] p-6 transition hover:bg-white sm:p-8">
                <div className="flex items-center justify-between"><span className="font-mono text-xs font-bold" style={{ color: step.accent }}>{step.number} / {step.label}</span><Icon className="size-5 transition duration-300 group-hover:scale-125" style={{ color: step.accent }} /></div>
                <h3 className="mt-16 max-w-xs text-3xl font-bold leading-none">{step.title}</h3>
                <p className="mt-5 max-w-sm text-base font-medium leading-7 text-[#657184]">{step.body}</p>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold" style={{ color: step.accent }}>See step {index + 1} <ArrowDownRight className="size-4" /></div>
              </article>;
            })}
          </div>
        </div>
      </section>

      <section id="watch" className="border-b border-[#182235]/10 bg-[#fcfcfa]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-2xl"><div className="font-mono text-xs font-bold uppercase tracking-wide text-[#e86d50]">Watch NameTags</div><h2 className="mt-3 text-4xl font-bold leading-none sm:text-5xl">The story, then the product.</h2><p className="mt-5 text-lg font-medium leading-8 text-[#657184]">A short introduction to the networking problem, followed by a full walkthrough of the real product flow.</p></div>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <VideoEmbed title="NameTags introduction" videoId="0qzK_V6rFSE" label="01 / Introduction" />
            <VideoEmbed title="NameTags product demo" videoId="thJ5UXM9Owo" label="02 / Product demo" />
          </div>
        </div>
      </section>

      <section className="bg-[#fff0e5]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:py-24">
          <div><div className="font-mono text-xs font-bold uppercase tracking-wide text-[#a6472b]">Private, practical, event-first</div><h2 className="mt-3 max-w-3xl text-4xl font-bold leading-none sm:text-5xl">Networking should not require perfect English, endless preparation, or a flawless memory.</h2></div>
          <div><ul className="space-y-3">{proofPoints.map((point) => <li key={point} className="flex items-center gap-3 text-sm font-bold"><span className="grid size-6 place-items-center rounded-full bg-[#e86d50] text-white"><Check className="size-3.5" /></span>{point}</li>)}</ul><Link href="/" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-md bg-[#182235] px-5 text-sm font-bold text-white transition hover:bg-[#315dd3]">Try NameTags <ArrowRight className="size-4" /></Link></div>
        </div>
      </section>

      <footer className="bg-[#182235] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between"><BrandMark inverse /><div className="flex items-center gap-5 text-sm font-semibold text-white/60"><a href="https://github.com/diego01949234/NameTags" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition hover:text-white"><Github className="size-4" />GitHub</a><Link href="/" className="transition hover:text-white">Open app</Link></div></div></footer>
    </main>
  );
}

function VideoEmbed({ title, videoId, label }: { title: string; videoId: string; label: string }) {
  return (
    <article className="overflow-hidden border border-[#182235]/15 bg-[#182235] shadow-[8px_8px_0_#e86d50]">
      <div className="flex items-center justify-between border-b border-white/15 px-4 py-3 text-white"><span className="font-mono text-[11px] font-bold uppercase tracking-wide text-[#ffc5af]">{label}</span><CirclePlay className="size-4 text-white/70" /></div>
      <div className="aspect-video bg-black"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
    </article>
  );
}
