import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily as spaceGrotesk, loadFont } from "@remotion/google-fonts/SpaceGrotesk";

const C = {
  ink: "#182235",
  inkSoft: "#2C3952",
  cobalt: "#315DD3",
  cobaltPale: "#E4ECFF",
  coral: "#E86D50",
  coralPale: "#F8E2CF",
  mint: "#168779",
  mintPale: "#D7F0E9",
  paper: "#FEFEFD",
  wash: "#F1F4F8",
  line: "#DCE3EB",
  muted: "#71809A",
  white: "#FFFFFF",
} as const;

loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const font = `${spaceGrotesk}, Avenir Next, Avenir, Inter, Helvetica Neue, Arial, sans-serif`;
const enterEase = Easing.bezier(0.16, 1, 0.3, 1);
const settleEase = Easing.bezier(0.65, 0, 0.35, 1);
const sec = (value: number, fps: number) => Math.round(value * fps);

const tween = (
  frame: number,
  start: number,
  duration: number,
  from = 0,
  to = 1,
  easing = enterEase,
) =>
  interpolate(frame, [start, start + duration], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const sceneOpacity = (frame: number, duration: number, fps: number) => {
  const fade = sec(0.38, fps);
  const total = sec(duration, fps);
  return Math.min(tween(frame, 0, fade), 1 - tween(frame, total - fade, fade));
};

const Canvas = ({ children, background, opacity = 1 }: { children: ReactNode; background: string; opacity?: number }) => {
  const { height, width } = useVideoConfig();
  const scale = Math.min(width / 1920, height / 1080);

  return (
    <AbsoluteFill style={{ backgroundColor: background, overflow: "hidden", opacity }}>
      <div
        style={{
          position: "absolute",
          top: (height - 1080 * scale) / 2,
          left: (width - 1920 * scale) / 2,
          width: 1920,
          height: 1080,
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily: font,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Grid = ({ dark = false }: { dark?: boolean }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity: dark ? 0.075 : 0.055,
      backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,.75)" : "rgba(24,34,53,.55)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,.75)" : "rgba(24,34,53,.55)"} 1px, transparent 1px)`,
      backgroundSize: "46px 46px",
    }}
  />
);

const NMark = ({ size = 42 }: { size?: number }) => (
  <div
    style={{
      display: "grid",
      width: size,
      height: size,
      placeItems: "center",
      borderRadius: Math.max(10, Math.round(size * 0.24)),
      backgroundColor: C.coral,
      color: C.white,
      fontSize: Math.round(size * 0.62),
      fontWeight: 900,
      lineHeight: 1,
      boxShadow: "0 13px 30px rgba(232,109,80,.24)",
    }}
  >
    N
  </div>
);

const BrandHeader = ({ dark = false, label = "MOTION STORY" }: { dark?: boolean; label?: string }) => (
  <div
    style={{
      position: "absolute",
      top: 44,
      left: 64,
      display: "flex",
      alignItems: "center",
      gap: 12,
      color: dark ? C.white : C.ink,
    }}
  >
    <NMark size={40} />
    <span style={{ fontSize: 24, fontWeight: 830, letterSpacing: 0 }}>NameTags</span>
    <span style={{ width: 1, height: 23, backgroundColor: dark ? "rgba(255,255,255,.28)" : C.line }} />
    <span style={{ color: dark ? "rgba(255,255,255,.6)" : C.muted, fontSize: 13, fontWeight: 760, letterSpacing: 0.4 }}>{label}</span>
  </div>
);

const Kicker = ({ text, accent, dark = false }: { text: string; accent: string; dark?: boolean }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 15px",
      border: `1px solid ${dark ? `${accent}99` : `${accent}66`}`,
      borderRadius: 999,
      backgroundColor: dark ? `${accent}25` : accent === C.coral ? C.coralPale : accent === C.mint ? C.mintPale : C.cobaltPale,
      color: dark ? C.white : C.ink,
      fontSize: 14,
      fontWeight: 840,
      letterSpacing: 0.48,
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: accent, boxShadow: dark ? `0 0 18px ${accent}` : "none" }} />
    {text}
  </div>
);

const CenterTitle = ({
  frame,
  start = 0,
  lines,
  accent,
  dark = false,
  kicker,
  body,
}: {
  frame: number;
  start?: number;
  lines: string[];
  accent: string;
  dark?: boolean;
  kicker?: string;
  body?: string;
}) => {
  const { fps } = useVideoConfig();
  const color = dark ? C.white : C.ink;
  const bodyColor = dark ? "rgba(255,255,255,.68)" : C.muted;
  const kickerIn = spring({ frame: Math.max(0, frame - sec(start, fps)), fps, config: { damping: 18, stiffness: 120 } });
  const bodyIn = spring({ frame: Math.max(0, frame - sec(start + 0.68, fps)), fps, config: { damping: 18, stiffness: 120 } });

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 150px 96px", boxSizing: "border-box", textAlign: "center" }}>
      {kicker ? <div style={{ opacity: kickerIn, transform: `translateY(${(1 - kickerIn) * 18}px)` }}><Kicker text={kicker} accent={accent} dark={dark} /></div> : null}
      <div style={{ marginTop: kicker ? 29 : 0, color, fontSize: 120, lineHeight: 0.91, fontWeight: 850, letterSpacing: 0, maxWidth: 1480 }}>
        {lines.map((line, index) => {
          const lineIn = spring({ frame: Math.max(0, frame - sec(start + 0.14 + index * 0.2, fps)), fps, config: { damping: 15, stiffness: 118 } });
          return <div key={line} style={{ opacity: lineIn, transform: `translateY(${(1 - lineIn) * 55}px) scale(${0.955 + lineIn * 0.045})` }}>{line}</div>;
        })}
      </div>
      {body ? <div style={{ maxWidth: 880, marginTop: 32, color: bodyColor, fontSize: 25, lineHeight: 1.42, fontWeight: 570, opacity: bodyIn, transform: `translateY(${(1 - bodyIn) * 20}px)` }}>{body}</div> : null}
    </div>
  );
};

const WordChip = ({ label, x, y, frame, start, color, dark = false }: { label: string; x: number; y: number; frame: number; start: number; color: string; dark?: boolean }) => {
  const { fps } = useVideoConfig();
  const inValue = spring({ frame: Math.max(0, frame - sec(start, fps)), fps, config: { damping: 16, stiffness: 140 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: "12px 16px",
        border: `1px solid ${dark ? `${color}77` : `${color}55`}`,
        borderRadius: 999,
        backgroundColor: dark ? `${color}24` : C.white,
        color: dark ? C.white : C.inkSoft,
        fontSize: 15,
        fontWeight: 780,
        boxShadow: dark ? "none" : "0 14px 30px rgba(24,34,53,.08)",
        opacity: inValue,
        transform: `translateY(${(1 - inValue) * 28}px) rotate(${(1 - inValue) * -5}deg)`,
      }}
    >
      <span style={{ display: "inline-block", width: 8, height: 8, marginRight: 8, borderRadius: "50%", backgroundColor: color }} />
      {label}
    </div>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 7;
  const orbit = tween(frame, sec(0.4, fps), sec(5.8, fps), 0, 1, settleEase);
  return (
    <Canvas background={C.ink} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid dark />
      <BrandHeader dark label="EVENT COPILOT" />
      <div style={{ position: "absolute", left: 220, top: 208, width: 1480, height: 660, opacity: 0.8 }}>
        <div style={{ position: "absolute", left: 10 + orbit * 160, top: 20, width: 260, height: 260, borderRadius: "50%", background: `${C.cobalt}2B`, filter: "blur(30px)" }} />
        <div style={{ position: "absolute", right: 30 + orbit * 160, bottom: 0, width: 330, height: 330, borderRadius: "50%", background: `${C.coral}30`, filter: "blur(32px)" }} />
      </div>
      <WordChip label="No time to research" x={164} y={778} frame={frame} start={1.12} color={C.cobalt} dark />
      <WordChip label="Too many ways to connect" x={1316} y={278} frame={frame} start={1.32} color={C.coral} dark />
      <WordChip label="Too much to remember" x={1248} y={760} frame={frame} start={1.52} color={C.mint} dark />
      <CenterTitle frame={frame} start={0.45} lines={["Networking should not", "begin with panic."]} accent={C.coral} dark kicker="THE EVENT MOMENT" body="NameTags turns event anxiety into one real next step." />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, display: "flex", justifyContent: "center", gap: 10, opacity: tween(frame, sec(4.7, fps), sec(0.4, fps)) }}>
        {[C.cobalt, C.coral, C.mint].map((color, index) => <span key={color} style={{ width: index === 1 ? 46 : 12, height: 5, borderRadius: 99, backgroundColor: color }} />)}
      </div>
    </Canvas>
  );
};

const ResearchMoment = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const typedText = "What should I know before I walk into this event?";
  const typed = Math.round(tween(frame, sec(3.9, fps), sec(1.7, fps)) * typedText.length);
  const sent = spring({ frame: Math.max(0, frame - sec(5.9, fps)), fps, config: { damping: 15, stiffness: 160 } });
  const result = spring({ frame: Math.max(0, frame - sec(7.3, fps)), fps, config: { damping: 16, stiffness: 122 } });
  const analysis = ["READING EVENT CONTEXT", "FINDING THE SIGNALS", "MAKING IT PERSONAL"];
  const cards = [
    ["The room", "What this event is really about"],
    ["Who matters", "People and patterns to look for"],
    ["Ask this", "A question that earns a real reply"],
  ];

  return (
    <>
      <div style={{ position: "absolute", left: 340, top: 232, width: 1240, padding: 28, boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 22, backgroundColor: C.white, boxShadow: "0 34px 80px rgba(24,34,53,.12)", opacity: tween(frame, sec(3.05, fps), sec(0.5, fps)), transform: `translateY(${(1 - tween(frame, sec(3.05, fps), sec(0.5, fps))) * 32}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.cobalt, fontSize: 13, fontWeight: 860, letterSpacing: 0.5 }}><span style={{ display: "grid", width: 25, height: 25, placeItems: "center", borderRadius: 8, backgroundColor: C.cobaltPale }}>✦</span> ASK NAMETAGS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 22, padding: "18px 18px", border: `2px solid ${C.cobalt}55`, borderRadius: 15, backgroundColor: "#FBFDFF", color: C.inkSoft }}>
          <span style={{ flex: 1, fontSize: 21, fontWeight: 650 }}>{typedText.slice(0, typed)}{typed < typedText.length ? <span style={{ color: C.cobalt }}>|</span> : null}</span>
          <span style={{ display: "grid", width: 44, height: 44, placeItems: "center", borderRadius: 13, backgroundColor: C.cobalt, color: C.white, fontSize: 25, fontWeight: 850, opacity: typed === typedText.length ? 1 : 0.45, transform: `scale(${0.8 + sent * 0.2})` }}>↑</span>
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 18, opacity: sent }}>
          {analysis.map((item, index) => {
            const status = spring({ frame: Math.max(0, frame - sec(6.35 + index * 0.42, fps)), fps, config: { damping: 16, stiffness: 142 } });
            const done = frame > sec(7.48 + index * 0.18, fps);
            return <div key={item} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 12px", borderRadius: 999, backgroundColor: C.wash, color: C.inkSoft, fontSize: 12, fontWeight: 800, opacity: status, transform: `translateY(${(1 - status) * 12}px)` }}><span style={{ display: "grid", width: 17, height: 17, placeItems: "center", borderRadius: 6, backgroundColor: done ? C.mint : C.cobaltPale, color: done ? C.white : C.cobalt, fontSize: 11, fontWeight: 900 }}>{done ? "✓" : "…"}</span>{item}</div>;
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 244, right: 244, top: 626, display: "flex", gap: 16, opacity: result, transform: `translateY(${(1 - result) * 36}px)` }}>
        {cards.map(([title, body], index) => {
          const card = spring({ frame: Math.max(0, frame - sec(7.8 + index * 0.18, fps)), fps, config: { damping: 15, stiffness: 126 } });
          return <div key={title} style={{ flex: 1, minHeight: 178, padding: 24, boxSizing: "border-box", borderRadius: 17, backgroundColor: C.white, border: `1px solid ${C.line}`, boxShadow: "0 16px 34px rgba(24,34,53,.07)", opacity: card, transform: `translateY(${(1 - card) * 22}px)` }}><div style={{ color: [C.cobalt, C.coral, C.mint][index], fontSize: 16, fontWeight: 850 }}>0{index + 1}</div><div style={{ marginTop: 15, color: C.ink, fontSize: 29, fontWeight: 820 }}>{title}</div><div style={{ marginTop: 8, color: C.muted, fontSize: 16, lineHeight: 1.35, fontWeight: 570 }}>{body}</div></div>;
        })}
      </div>
    </>
  );
};

const ResearchScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 12;
  const titleOut = tween(frame, sec(2.68, fps), sec(0.46, fps));
  return (
    <Canvas background={C.paper} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid />
      <BrandHeader label="01 / BEFORE THE ROOM" />
      <div style={{ opacity: 1 - titleOut }}><CenterTitle frame={frame} start={0.22} lines={["Understand the room", "before you enter."]} accent={C.cobalt} kicker="01 / RESEARCH" body="Paste a link, screenshot, or messy note. Then ask the question you actually have." /></div>
      <ResearchMoment frame={frame} />
    </Canvas>
  );
};

const QrGlyph = ({ frame, start }: { frame: number; start: number }) => {
  const { fps } = useVideoConfig();
  const tiles = Array.from({ length: 49 }, (_, index) => index);
  return (
    <div style={{ position: "absolute", left: 1160, top: 315, display: "grid", gridTemplateColumns: "repeat(7, 19px)", gap: 6, padding: 28, borderRadius: 23, backgroundColor: C.coralPale, boxShadow: "0 26px 55px rgba(24,34,53,.22)" }}>
      {tiles.map((tile) => {
        const x = tile % 7;
        const y = Math.floor(tile / 7);
        const finder = (x < 2 && y < 2) || (x > 4 && y < 2) || (x < 2 && y > 4);
        const active = finder || (tile * 17 + x * 5 + y * 3) % 5 < 2;
        const inValue = spring({ frame: Math.max(0, frame - sec(start + tile * 0.018, fps)), fps, config: { damping: 18, stiffness: 190 } });
        return <div key={tile} style={{ width: 19, height: 19, borderRadius: finder ? 4 : 2, backgroundColor: active ? C.ink : "transparent", opacity: active ? inValue : 0 }} />;
      })}
    </div>
  );
};

const ShareScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 11;
  const titleOut = tween(frame, sec(2.65, fps), sec(0.46, fps));
  const tokens = [
    ["LinkedIn", 785, 377, C.cobalt],
    ["Portfolio", 865, 560, C.mint],
    ["Email", 815, 472, C.coral],
    ["Instagram", 820, 718, C.muted],
  ] as const;
  const selected = ["LINKEDIN", "PORTFOLIO", "EMAIL"];
  return (
    <Canvas background={C.ink} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid dark />
      <BrandHeader dark label="02 / IN THE ROOM" />
      <div style={{ opacity: 1 - titleOut }}><CenterTitle frame={frame} start={0.22} lines={["Share the right card.", "Not every link."]} accent={C.coral} dark kicker="02 / YOUR BOUNDARY" body="One QR for the room. You decide what it opens." /></div>
      <div style={{ position: "absolute", left: 174, top: 312, width: 590, opacity: tween(frame, sec(3.18, fps), sec(0.44, fps)) }}>
        <Kicker text="YOUR LINK VAULT" accent={C.coral} dark />
        <div style={{ marginTop: 26, color: C.white, fontSize: 57, lineHeight: 1.02, fontWeight: 840 }}>You choose what<br />enters the room.</div>
        <div style={{ marginTop: 20, color: "rgba(255,255,255,.64)", fontSize: 20, lineHeight: 1.42, fontWeight: 570 }}>Selected links travel to the QR card. Everything else stays private with you.</div>
      </div>
      {tokens.map(([label, x, y, color], index) => {
        const inValue = spring({ frame: Math.max(0, frame - sec(3.58 + index * 0.2, fps)), fps, config: { damping: 16, stiffness: 138 } });
        const towardQr = tween(frame, sec(6.45 + index * 0.16, fps), sec(1.25, fps), 0, 1, settleEase);
        const privateLink = label === "Instagram";
        const endX = privateLink ? x : 1060;
        const endY = privateLink ? y : 480 + index * 55;
        return <div key={label} style={{ position: "absolute", left: interpolate(towardQr, [0, 1], [x, endX]), top: interpolate(towardQr, [0, 1], [y, endY]), padding: "13px 16px", borderRadius: 999, border: `1px solid ${privateLink ? "rgba(255,255,255,.18)" : `${color}99`}`, backgroundColor: privateLink ? "rgba(255,255,255,.06)" : `${color}2A`, color: privateLink ? "rgba(255,255,255,.5)" : C.white, fontSize: 16, fontWeight: 780, opacity: inValue * (privateLink ? 1 - tween(frame, sec(7.8, fps), sec(0.7, fps)) : 1), transform: `translateY(${(1 - inValue) * 22}px)` }}>{privateLink ? "PRIVATE  " : "SHOW  "}{label}</div>;
      })}
      <QrGlyph frame={frame} start={7.25} />
      <div style={{ position: "absolute", left: 1082, top: 748, width: 395, color: C.white, fontSize: 26, fontWeight: 830, lineHeight: 1.14, opacity: tween(frame, sec(8.0, fps), sec(0.46, fps)) }}>One QR.<br /><span style={{ color: C.coral }}>Only the links you choose.</span></div>
      <div style={{ position: "absolute", left: 760, top: 543, width: 290, height: 1, backgroundColor: `${C.coral}88`, transform: `scaleX(${tween(frame, sec(6.4, fps), sec(1.2, fps))})`, transformOrigin: "left" }} />
      <div style={{ position: "absolute", right: 148, bottom: 76, display: "flex", gap: 9, opacity: tween(frame, sec(8.25, fps), sec(0.45, fps)) }}>{selected.map((item) => <span key={item} style={{ padding: "9px 11px", borderRadius: 999, backgroundColor: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.72)", fontSize: 11, fontWeight: 800 }}>{item}</span>)}</div>
    </Canvas>
  );
};

const FollowScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 10;
  const titleOut = tween(frame, sec(2.65, fps), sec(0.46, fps));
  const note = spring({ frame: Math.max(0, frame - sec(3.65, fps)), fps, config: { damping: 16, stiffness: 126 } });
  const draft = spring({ frame: Math.max(0, frame - sec(5.3, fps)), fps, config: { damping: 16, stiffness: 126 } });
  const message = "Hi Sienna, it was great meeting you at the event. I loved hearing how you are thinking about community-led funding...";
  const typed = Math.round(tween(frame, sec(6.05, fps), sec(2.8, fps)) * message.length);
  return (
    <Canvas background={C.paper} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid />
      <BrandHeader label="03 / AFTER THE ROOM" />
      <div style={{ opacity: 1 - titleOut }}><CenterTitle frame={frame} start={0.22} lines={["Follow through", "while it is fresh."]} accent={C.mint} kicker="03 / THE NEXT STEP" body="Conversations are easy to lose. Keep the promise, the context, and a respectful first draft together." /></div>
      <div style={{ position: "absolute", left: 225, top: 324, width: 470, padding: 28, boxSizing: "border-box", borderRadius: 21, backgroundColor: C.white, border: `1px solid ${C.line}`, boxShadow: "0 18px 40px rgba(24,34,53,.09)", opacity: note, transform: `translateY(${(1 - note) * 34}px)` }}>
        <Kicker text="CONNECTION" accent={C.mint} />
        <div style={{ marginTop: 23, color: C.ink, fontSize: 34, fontWeight: 830 }}>Sienna</div>
        <div style={{ marginTop: 6, color: C.muted, fontSize: 17, fontWeight: 630 }}>STUF United Fund</div>
        <div style={{ marginTop: 24, padding: "15px 16px", borderRadius: 13, backgroundColor: C.mintPale, color: C.inkSoft, fontSize: 16, lineHeight: 1.38, fontWeight: 650 }}>We discussed sharing the NameTags link and continuing the conversation about community-led funding.</div>
      </div>
      <div style={{ position: "absolute", left: 782, top: 306, width: 865, padding: 28, boxSizing: "border-box", borderRadius: 22, backgroundColor: C.ink, color: C.white, boxShadow: "0 25px 58px rgba(24,34,53,.22)", opacity: draft, transform: `translateY(${(1 - draft) * 34}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.74)", fontSize: 13, fontWeight: 830, letterSpacing: 0.5 }}><span style={{ display: "grid", width: 25, height: 25, placeItems: "center", borderRadius: 8, backgroundColor: `${C.mint}55`, color: C.white }}>✦</span> AI FOLLOW-UP DRAFT</div>
        <div style={{ minHeight: 126, marginTop: 23, color: C.white, fontSize: 25, lineHeight: 1.42, fontWeight: 570 }}>{message.slice(0, typed)}{typed < message.length ? <span style={{ color: C.mint }}>|</span> : null}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 22, opacity: tween(frame, sec(8.1, fps), sec(0.38, fps)) }}><span style={{ padding: "11px 13px", borderRadius: 10, backgroundColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.82)", fontSize: 13, fontWeight: 780 }}>REVIEW</span><span style={{ padding: "11px 13px", borderRadius: 10, backgroundColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.82)", fontSize: 13, fontWeight: 780 }}>COPY</span><span style={{ padding: "11px 13px", borderRadius: 10, backgroundColor: C.mint, color: C.white, fontSize: 13, fontWeight: 800 }}>MARK SENT</span></div>
      </div>
      <div style={{ position: "absolute", left: 697, top: 548, width: 62, height: 3, borderRadius: 4, backgroundColor: C.mint, transform: `scaleX(${tween(frame, sec(4.6, fps), sec(0.65, fps))})`, transformOrigin: "left", boxShadow: `0 0 16px ${C.mint}99` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 74, color: C.ink, textAlign: "center", fontSize: 28, fontWeight: 830, opacity: tween(frame, sec(8.22, fps), sec(0.42, fps)) }}>AI does the organizing. <span style={{ color: C.mint }}>You decide what gets sent.</span></div>
    </Canvas>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 5;
  const mark = spring({ frame: Math.max(0, frame - sec(0.25, fps)), fps, config: { damping: 13, stiffness: 140 } });
  const inValue = spring({ frame: Math.max(0, frame - sec(0.72, fps)), fps, config: { damping: 16, stiffness: 120 } });
  const steps = [["01", "Understand the room", C.cobalt], ["02", "Share the right card", C.coral], ["03", "Follow through", C.mint]] as const;
  return (
    <Canvas background={C.ink} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid dark />
      <BrandHeader dark label="NAME TAGS" />
      <div style={{ position: "absolute", left: 0, right: 0, top: 174, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ transform: `scale(${0.58 + mark * 0.42})`, opacity: mark }}><NMark size={112} /></div>
        <div style={{ marginTop: 22, color: C.white, fontSize: 72, fontWeight: 850, lineHeight: 1, opacity: inValue }}>NameTags</div>
        <div style={{ marginTop: 15, color: "rgba(255,255,255,.66)", fontSize: 27, fontWeight: 620, opacity: inValue }}>Networking, without the pressure.</div>
      </div>
      <div style={{ position: "absolute", left: 280, top: 622, display: "flex", gap: 14 }}>
        {steps.map(([number, label, color], index) => {
          const step = spring({ frame: Math.max(0, frame - sec(1.42 + index * 0.16, fps)), fps, config: { damping: 15, stiffness: 130 } });
          return <div key={number} style={{ width: 440, padding: "20px 22px", boxSizing: "border-box", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, backgroundColor: "rgba(255,255,255,.06)", color: C.white, opacity: step, transform: `translateY(${(1 - step) * 24}px)` }}><div style={{ color, fontSize: 13, fontWeight: 860 }}>{number}</div><div style={{ marginTop: 8, fontSize: 21, fontWeight: 760 }}>{label}</div></div>;
        })}
      </div>
    </Canvas>
  );
};

export const NameTagsMotionTitles = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const total = sec(45, fps);
  const opacity = Math.min(tween(frame, 0, sec(0.14, fps)), 1 - tween(frame, total - sec(0.18, fps), sec(0.18, fps)));
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, opacity }}>
      <Sequence from={sec(0, fps)} durationInFrames={sec(7, fps)}><IntroScene /></Sequence>
      <Sequence from={sec(7, fps)} durationInFrames={sec(12, fps)}><ResearchScene /></Sequence>
      <Sequence from={sec(19, fps)} durationInFrames={sec(11, fps)}><ShareScene /></Sequence>
      <Sequence from={sec(30, fps)} durationInFrames={sec(10, fps)}><FollowScene /></Sequence>
      <Sequence from={sec(40, fps)} durationInFrames={sec(5, fps)}><ClosingScene /></Sequence>
    </AbsoluteFill>
  );
};
