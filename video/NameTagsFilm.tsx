import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { QRCodeSVG } from "qrcode.react";

const COLORS = {
  ink: "#182235",
  inkSoft: "#26324A",
  cobalt: "#315DD3",
  coral: "#E86D50",
  coralPale: "#F8E2CF",
  mint: "#168779",
  mintPale: "#D7F0E9",
  paper: "#FCFDFE",
  wash: "#F2F5F8",
  line: "#DCE3EB",
  muted: "#667187",
  white: "#FFFFFF",
} as const;

const FILM_SECONDS = 50;
const PRODUCTION_URL = "https://nametags-network.vercel.app";
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const clamp = (frame: number, start: number, duration: number, from = 0, to = 1) =>
  interpolate(frame, [start, start + duration], [from, to], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const frameAt = (seconds: number, fps: number) => Math.round(seconds * fps);

const canvasText: CSSProperties = {
  fontFamily: "Avenir Next, Avenir, Inter, Helvetica Neue, Arial, sans-serif",
  letterSpacing: 0,
  color: COLORS.ink,
};

const sceneOpacity = (frame: number, duration: number, fps: number) => {
  const fade = frameAt(0.42, fps);
  const enter = clamp(frame, 0, fade);
  const exit = 1 - clamp(frame, Math.max(0, duration - fade), fade);
  return Math.min(enter, exit);
};

const SceneCanvas = ({ children, opacity = 1 }: { children: ReactNode; opacity?: number }) => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width / 1920, height / 1080);
  const left = (width - 1920 * scale) / 2;
  const top = (height - 1080 * scale) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.wash, overflow: "hidden", opacity }}>
      <div
        style={{
          position: "absolute",
          width: 1920,
          height: 1080,
          left,
          top,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
          ...canvasText,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Grain = ({ opacity = 0.16 }: { opacity?: number }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      backgroundImage:
        "linear-gradient(rgba(24,34,53,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(24,34,53,.035) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
      pointerEvents: "none",
    }}
  />
);

const LogoMark = ({ size = 42, color = COLORS.ink }: { size?: number; color?: string }) => {
  const stroke = Math.max(2, Math.round(size * 0.085));
  const unit = size / 3.6;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {[
        { x: 0, y: unit, rotate: 0 },
        { x: unit, y: 0, rotate: 90 },
        { x: unit * 2, y: unit, rotate: 180 },
        { x: unit, y: unit * 2, rotate: 270 },
      ].map((piece, index) => (
        <div
          // The mark intentionally resembles four connected event passes.
          key={index}
          style={{
            position: "absolute",
            width: unit * 1.62,
            height: unit * 1.62,
            left: piece.x,
            top: piece.y,
            border: `${stroke}px solid ${color}`,
            borderRadius: unit * 0.42,
            transform: `rotate(${piece.rotate}deg)`,
            boxSizing: "border-box",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          width: unit * 1.16,
          height: unit * 1.16,
          left: unit * 1.23,
          top: unit * 1.23,
          backgroundColor: color,
          borderRadius: unit * 0.32,
        }}
      />
    </div>
  );
};

const BrandLockup = ({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14 }}>
    <LogoMark size={compact ? 26 : 36} color={dark ? COLORS.white : COLORS.ink} />
    <span
      style={{
        fontSize: compact ? 22 : 32,
        fontWeight: 760,
        lineHeight: 1,
        color: dark ? COLORS.white : COLORS.ink,
      }}
    >
      NameTags
    </span>
  </div>
);

const CornerKicker = ({ text, dark = false }: { text: string; dark?: boolean }) => (
  <div
    style={{
      position: "absolute",
      top: 56,
      left: 64,
      display: "flex",
      alignItems: "center",
      gap: 14,
      color: dark ? "rgba(255,255,255,.72)" : COLORS.muted,
      fontSize: 17,
      fontWeight: 720,
      letterSpacing: 0,
      textTransform: "uppercase",
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 3,
        backgroundColor: dark ? COLORS.coral : COLORS.cobalt,
      }}
    />
    {text}
  </div>
);

const BigLine = ({ children, color = COLORS.ink }: { children: ReactNode; color?: string }) => (
  <div
    style={{
      fontSize: 72,
      lineHeight: 1.03,
      fontWeight: 760,
      color,
      maxWidth: 670,
    }}
  >
    {children}
  </div>
);

const Pill = ({
  children,
  tone = "paper",
  style,
}: {
  children: ReactNode;
  tone?: "paper" | "coral" | "mint" | "ink" | "cobalt";
  style?: CSSProperties;
}) => {
  const tones = {
    paper: { background: COLORS.white, color: COLORS.ink, border: `1px solid ${COLORS.line}` },
    coral: { background: COLORS.coralPale, color: COLORS.ink, border: "1px solid transparent" },
    mint: { background: COLORS.mintPale, color: COLORS.ink, border: "1px solid transparent" },
    ink: { background: COLORS.ink, color: COLORS.white, border: "1px solid transparent" },
    cobalt: { background: COLORS.cobalt, color: COLORS.white, border: "1px solid transparent" },
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        borderRadius: 999,
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 1,
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const SmallArrow = ({ color = COLORS.ink }: { color?: string }) => (
  <span style={{ fontSize: 20, lineHeight: 0.7, color }}>→</span>
);

const CardShell = ({
  children,
  style,
  dark = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  dark?: boolean;
}) => (
  <div
    style={{
      position: "absolute",
      background: dark ? COLORS.ink : COLORS.white,
      border: dark ? "1px solid rgba(255,255,255,.1)" : `1px solid ${COLORS.line}`,
      boxShadow: dark ? "0 18px 48px rgba(24,34,53,.25)" : "0 18px 48px rgba(24,34,53,.10)",
      borderRadius: 12,
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

const PhoneFrame = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      position: "absolute",
      width: 382,
      height: 760,
      borderRadius: 48,
      padding: 12,
      boxSizing: "border-box",
      background: COLORS.ink,
      boxShadow: "0 34px 90px rgba(24,34,53,.25)",
      border: "5px solid #0D1422",
      ...style,
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        width: 116,
        height: 28,
        borderRadius: 18,
        background: "#0D1422",
        zIndex: 3,
      }}
    />
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 34,
        overflow: "hidden",
        background: COLORS.paper,
      }}
    >
      {children}
    </div>
  </div>
);

const EventSourceCard = ({
  label,
  value,
  color,
  frame,
  delay,
  x,
  y,
  rotate,
}: {
  label: string;
  value: string;
  color: string;
  frame: number;
  delay: number;
  x: number;
  y: number;
  rotate: number;
}) => {
  const { fps } = useVideoConfig();
  const lift = (1 - clamp(frame, frameAt(delay, fps), frameAt(0.72, fps))) * 50;
  const opacity = clamp(frame, frameAt(delay, fps), frameAt(0.44, fps));

  return (
    <CardShell
      style={{
        width: 240,
        height: 134,
        left: x,
        top: y + lift,
        transform: `rotate(${rotate}deg)`,
        opacity,
      }}
    >
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color, fontWeight: 800, fontSize: 15 }}>
          <span style={{ width: 8, height: 8, background: color, borderRadius: 2 }} />
          {label}
        </div>
        <div style={{ marginTop: 14, fontSize: 18, lineHeight: 1.16, fontWeight: 720, color: COLORS.ink }}>{value}</div>
      </div>
    </CardShell>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const titleIn = clamp(frame, frameAt(0.42, fps), frameAt(0.8, fps));
  const titleY = interpolate(titleIn, [0, 1], [52, 0]);
  const coreScale = interpolate(clamp(frame, frameAt(2.1, fps), frameAt(1.0, fps)), [0, 1], [0.84, 1]);

  return (
    <SceneCanvas opacity={sceneOpacity(frame, durationInFrames, fps)}>
      <Grain />
      <CornerKicker text="A calmer way into the room" />
      <EventSourceCard label="EVENT URL" value="OpenAI Build Week" color={COLORS.cobalt} frame={frame} delay={0.1} x={112} y={238} rotate={-8} />
      <EventSourceCard label="SCREENSHOT" value="Founder meetup flyer" color={COLORS.coral} frame={frame} delay={0.26} x={171} y={662} rotate={6} />
      <EventSourceCard label="A QUICK NOTE" value="I do not know anyone" color={COLORS.mint} frame={frame} delay={0.42} x={1552} y={232} rotate={8} />
      <EventSourceCard label="YOUR GOAL" value="Find one collaborator" color={COLORS.ink} frame={frame} delay={0.58} x={1490} y={672} rotate={-7} />

      <div
        style={{
          position: "absolute",
          left: 510,
          top: 300,
          width: 900,
          textAlign: "center",
          transform: `translateY(${titleY}px)`,
          opacity: titleIn,
        }}
      >
        <BrandLockup />
        <div style={{ marginTop: 74, display: "flex", justifyContent: "center" }}>
          <BigLine>
            Networking, <span style={{ color: COLORS.coral }}>without</span> the pressure.
          </BigLine>
        </div>
        <div style={{ marginTop: 28, color: COLORS.muted, fontSize: 23, lineHeight: 1.45, fontWeight: 560 }}>
          One private event copilot for research, connection, and the next step.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 840,
          top: 790,
          width: 240,
          height: 114,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          background: COLORS.ink,
          color: COLORS.white,
          fontSize: 18,
          fontWeight: 740,
          boxShadow: "0 24px 54px rgba(24,34,53,.22)",
          transform: `scale(${coreScale})`,
        }}
      >
        A real next step <SmallArrow color={COLORS.coral} />
      </div>
    </SceneCanvas>
  );
};

const ResearchPhone = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const card1 = clamp(frame, frameAt(1.1, fps), frameAt(0.45, fps));
  const card2 = clamp(frame, frameAt(1.46, fps), frameAt(0.45, fps));
  const card3 = clamp(frame, frameAt(1.82, fps), frameAt(0.45, fps));

  return (
    <PhoneFrame style={{ left: 1062, top: 166 }}>
      <div style={{ padding: "58px 24px 26px" }}>
        <BrandLockup compact />
        <div style={{ marginTop: 36, fontSize: 13, fontWeight: 780, color: COLORS.muted, textTransform: "uppercase" }}>Research</div>
        <div style={{ marginTop: 11, fontSize: 28, lineHeight: 1.1, fontWeight: 760 }}>OpenAI Build Week</div>
        <div style={{ marginTop: 10, color: COLORS.muted, fontSize: 15, lineHeight: 1.35 }}>July 24 · Brooklyn · 6:00 PM</div>
        <div style={{ marginTop: 25, height: 8, borderRadius: 99, background: COLORS.line, overflow: "hidden" }}>
          <div
            style={{
              width: `${Math.round(interpolate(clamp(frame, frameAt(0.45, fps), frameAt(2.7, fps)), [0, 1], [8, 100]))}%`,
              height: "100%",
              background: COLORS.cobalt,
            }}
          />
        </div>
        <div style={{ marginTop: 14, color: COLORS.muted, fontSize: 14, fontWeight: 650 }}>Reading event context</div>
        {[
          [card1, COLORS.cobalt, "What this room is about", "Builders sharing demos and early ideas."],
          [card2, COLORS.coral, "A question worth asking", "What are you testing with real users?"],
          [card3, COLORS.mint, "One useful angle", "Bring your work, not a perfect pitch."],
        ].map(([opacity, color, heading, copy], index) => (
          <div
            key={index}
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              border: `1px solid ${COLORS.line}`,
              opacity: Number(opacity),
              transform: `translateY(${(1 - Number(opacity)) * 18}px)`,
              background: COLORS.white,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: String(color), fontSize: 12, fontWeight: 800 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: String(color) }} />
              {heading}
            </div>
            <div style={{ marginTop: 7, fontSize: 14, lineHeight: 1.32, color: COLORS.ink, fontWeight: 620 }}>{copy}</div>
          </div>
        ))}
      </div>
    </PhoneFrame>
  );
};

const ResearchScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const wire = clamp(frame, frameAt(0.75, fps), frameAt(2.3, fps));
  const panelIn = clamp(frame, frameAt(0.6, fps), frameAt(0.7, fps));

  return (
    <SceneCanvas opacity={sceneOpacity(frame, durationInFrames, fps)}>
      <Grain />
      <CornerKicker text="Before the event" />
      <div style={{ position: "absolute", left: 130, top: 216, opacity: panelIn, transform: `translateY(${(1 - panelIn) * 28}px)` }}>
        <Pill tone="cobalt">SUBWAY MODE</Pill>
        <div style={{ marginTop: 28 }}>
          <BigLine>Understand the room before you arrive.</BigLine>
        </div>
        <div style={{ marginTop: 27, width: 620, fontSize: 23, lineHeight: 1.45, color: COLORS.muted, fontWeight: 560 }}>
          Paste a link, a name, a screenshot, or a rough description. NameTags turns it into a clear, grounded brief.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 42 }}>
          <Pill tone="paper">Event URL</Pill>
          <Pill tone="paper">Screenshot</Pill>
          <Pill tone="paper">A rough note</Pill>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 752,
          top: 512,
          width: 430 * wire,
          height: 2,
          overflow: "hidden",
          background: COLORS.cobalt,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 750 + 430 * wire,
          top: 500,
          width: 26,
          height: 26,
          borderRadius: 7,
          background: COLORS.cobalt,
          transform: `scale(${wire}) rotate(45deg)`,
        }}
      />
      <ResearchPhone frame={frame} />
      <div
        style={{
          position: "absolute",
          right: 84,
          bottom: 60,
          color: COLORS.muted,
          fontSize: 15,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        Source-aware research <span style={{ color: COLORS.cobalt }}>●</span>
      </div>
    </SceneCanvas>
  );
};

const QuestionCard = ({
  frame,
  index,
  number,
  question,
  detail,
  tone,
}: {
  frame: number;
  index: number;
  number: string;
  question: string;
  detail: string;
  tone: "cobalt" | "coral" | "mint";
}) => {
  const { fps } = useVideoConfig();
  const visible = clamp(frame, frameAt(0.78 + index * 0.28, fps), frameAt(0.56, fps));
  const tones = { cobalt: COLORS.cobalt, coral: COLORS.coral, mint: COLORS.mint };
  const color = tones[tone];

  return (
    <div
      style={{
        width: 610,
        padding: 24,
        borderRadius: 12,
        border: `1px solid ${COLORS.line}`,
        background: COLORS.white,
        opacity: visible,
        transform: `translateX(${(1 - visible) * 44}px)`,
        boxShadow: "0 13px 30px rgba(24,34,53,.06)",
      }}
    >
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <span
          style={{
            width: 30,
            height: 30,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: 8,
            background: color,
            color: COLORS.white,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          {number}
        </span>
        <div>
          <div style={{ fontSize: 22, lineHeight: 1.25, fontWeight: 730 }}>{question}</div>
          <div style={{ marginTop: 8, color: COLORS.muted, fontSize: 16, lineHeight: 1.4 }}>{detail}</div>
        </div>
      </div>
    </div>
  );
};

const ConversationScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const chatIn = clamp(frame, frameAt(2.0, fps), frameAt(0.62, fps));
  const active = Math.floor(interpolate(frame, [frameAt(2.7, fps), frameAt(5.6, fps)], [0, 2.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <SceneCanvas opacity={sceneOpacity(frame, durationInFrames, fps)}>
      <Grain opacity={0.11} />
      <CornerKicker text="Your next question" />
      <div style={{ position: "absolute", left: 130, top: 188 }}>
        <Pill tone="coral">MAKE IT HUMAN</Pill>
        <div style={{ marginTop: 28 }}>
          <BigLine>Questions that start a real conversation.</BigLine>
        </div>
        <div style={{ marginTop: 24, maxWidth: 630, fontSize: 23, lineHeight: 1.45, color: COLORS.muted, fontWeight: 560 }}>
          The plan uses your goal and the event context. You can keep asking until it feels like your own voice.
        </div>
      </div>

      <div style={{ position: "absolute", left: 1024, top: 162, display: "flex", flexDirection: "column", gap: 16 }}>
        <QuestionCard frame={frame} index={0} number="01" tone="cobalt" question="What are you hoping people take away from this demo?" detail="Directly tied to the event's show-and-tell format." />
        <QuestionCard frame={frame} index={1} number="02" tone="coral" question="What did you learn after putting it in front of users?" detail="Lets the other person talk about the work, not their title." />
        <QuestionCard frame={frame} index={2} number="03" tone="mint" question="Who are you hoping to meet tonight?" detail="A natural way to offer help or make a useful introduction." />
      </div>

      <div
        style={{
          position: "absolute",
          left: 1024,
          bottom: 104,
          width: 610,
          height: 76,
          padding: "0 20px",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 12,
          background: COLORS.ink,
          color: COLORS.white,
          opacity: chatIn,
          transform: `translateY(${(1 - chatIn) * 22}px)`,
        }}
      >
        <span style={{ fontSize: 18, color: "rgba(255,255,255,.68)" }}>Ask anything about this room</span>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: [COLORS.cobalt, COLORS.coral, COLORS.mint][active] ?? COLORS.cobalt,
            color: COLORS.white,
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          ↑
        </span>
      </div>
    </SceneCanvas>
  );
};

const LinkCard = ({
  label,
  detail,
  x,
  y,
  frame,
  delay,
  angle,
  hidden = false,
}: {
  label: string;
  detail: string;
  x: number;
  y: number;
  frame: number;
  delay: number;
  angle: number;
  hidden?: boolean;
}) => {
  const { fps } = useVideoConfig();
  const entry = clamp(frame, frameAt(delay, fps), frameAt(0.48, fps));
  const settle = clamp(frame, frameAt(4.6, fps), frameAt(1.4, fps));
  const targetX = hidden ? 530 : 948;
  const targetY = hidden ? 522 : 468;
  const left = interpolate(settle, [0, 1], [x, targetX]);
  const top = interpolate(settle, [0, 1], [y, targetY]);
  const rotation = interpolate(settle, [0, 1], [angle, hidden ? -10 : 8]);
  const scale = interpolate(settle, [0, 1], [1, 0.74]);
  const opacity = entry * (hidden ? 1 - clamp(frame, frameAt(5.35, fps), frameAt(0.65, fps)) * 0.76 : 1);

  return (
    <CardShell
      style={{
        width: 226,
        height: 126,
        left,
        top,
        opacity,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        transformOrigin: "center",
        zIndex: hidden ? 2 : 4,
      }}
    >
      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: hidden ? COLORS.muted : COLORS.cobalt, fontSize: 12, fontWeight: 820 }}>{hidden ? "PRIVATE" : "SHARE"}</span>
          <span style={{ color: hidden ? COLORS.muted : COLORS.mint, fontSize: 16 }}>{hidden ? "×" : "✓"}</span>
        </div>
        <div style={{ marginTop: 13, fontSize: 18, fontWeight: 760 }}>{label}</div>
        <div style={{ marginTop: 5, color: COLORS.muted, fontSize: 13 }}>{detail}</div>
      </div>
    </CardShell>
  );
};

const QRPass = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const show = clamp(frame, frameAt(5.1, fps), frameAt(0.7, fps));
  const glow = 0.85 + Math.sin(frame / 8) * 0.15;

  return (
    <div
      style={{
        position: "absolute",
        width: 554,
        height: 730,
        left: 1110,
        top: 144,
        opacity: show,
        transform: `translateY(${(1 - show) * 46}px) rotate(${interpolate(show, [0, 1], [5, 0])}deg)`,
        background: COLORS.coralPale,
        borderRadius: 20,
        boxShadow: `0 34px 80px rgba(232,109,80,${0.17 * glow})`,
        overflow: "hidden",
      }}
    >
      <div style={{ height: 18, background: COLORS.coral }} />
      <div style={{ padding: 34 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BrandLockup compact />
          <Pill tone="ink" style={{ padding: "8px 11px", fontSize: 12 }}>ROOM PASS</Pill>
        </div>
        <div style={{ marginTop: 48, color: COLORS.muted, fontSize: 14, fontWeight: 800, textTransform: "uppercase" }}>OpenAI Build Week</div>
        <div style={{ marginTop: 10, fontSize: 38, lineHeight: 1.02, fontWeight: 780 }}>Annie Wu</div>
        <div style={{ marginTop: 12, color: COLORS.inkSoft, fontSize: 18, lineHeight: 1.35 }}>Researching the room. Building with care.</div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: 340,
            height: 340,
            margin: "42px auto 24px",
            padding: 20,
            boxSizing: "border-box",
            background: COLORS.paper,
            borderRadius: 14,
            boxShadow: "0 14px 28px rgba(24,34,53,.10)",
          }}
        >
          <QRCodeSVG value={PRODUCTION_URL} size={300} bgColor={COLORS.paper} fgColor={COLORS.ink} level="H" includeMargin={false} />
        </div>
        <div style={{ textAlign: "center", color: COLORS.ink, fontSize: 16, fontWeight: 760 }}>Scan to keep the connection</div>
      </div>
      <div
        style={{
          position: "absolute",
          width: 26,
          height: 26,
          borderRadius: "50%",
          left: -13,
          top: 368,
          background: COLORS.wash,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 26,
          height: 26,
          borderRadius: "50%",
          right: -13,
          top: 368,
          background: COLORS.wash,
        }}
      />
    </div>
  );
};

const QRScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const headline = clamp(frame, frameAt(0.45, fps), frameAt(0.7, fps));

  return (
    <SceneCanvas opacity={sceneOpacity(frame, durationInFrames, fps)}>
      <Grain opacity={0.1} />
      <CornerKicker text="In the room" />
      <div style={{ position: "absolute", left: 126, top: 168, opacity: headline, transform: `translateY(${(1 - headline) * 28}px)` }}>
        <Pill tone="mint">YOUR LINK VAULT</Pill>
        <div style={{ marginTop: 26 }}>
          <BigLine>One QR. The links that belong in this room.</BigLine>
        </div>
        <div style={{ marginTop: 22, width: 570, color: COLORS.muted, fontSize: 22, lineHeight: 1.42, fontWeight: 560 }}>
          You decide what to share. Everything else stays with you.
        </div>
        <div style={{ marginTop: 38, display: "flex", alignItems: "center", gap: 12 }}>
          <Pill tone="paper">GitHub</Pill>
          <Pill tone="paper">Portfolio</Pill>
          <Pill tone="paper">LinkedIn</Pill>
        </div>
        <div style={{ marginTop: 14, color: COLORS.muted, fontSize: 15, fontWeight: 670 }}>Why shown: relevant to a builder room.</div>
      </div>

      <LinkCard label="GitHub" detail="Projects and code" x={650} y={162} frame={frame} delay={0.68} angle={-9} />
      <LinkCard label="Portfolio" detail="Selected work" x={760} y={332} frame={frame} delay={0.92} angle={5} />
      <LinkCard label="LinkedIn" detail="Stay in touch" x={670} y={563} frame={frame} delay={1.16} angle={-4} />
      <LinkCard label="Instagram" detail="Personal, hidden" x={1080} y={768} frame={frame} delay={1.4} angle={8} hidden />
      <LinkCard label="Private notes" detail="Never public" x={890} y={154} frame={frame} delay={1.64} angle={-6} hidden />
      <QRPass frame={frame} />
    </SceneCanvas>
  );
};

const ScannerCard = ({ frame }: { frame: number }) => {
  const { fps } = useVideoConfig();
  const enter = clamp(frame, frameAt(0.85, fps), frameAt(0.7, fps));
  const consent = clamp(frame, frameAt(3.05, fps), frameAt(0.72, fps));

  return (
    <PhoneFrame style={{ left: 1088, top: 150, opacity: enter, transform: `translateY(${(1 - enter) * 54}px)` }}>
      <div style={{ padding: "58px 24px 22px" }}>
        <BrandLockup compact />
        <div style={{ marginTop: 37, color: COLORS.muted, fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>OpenAI Build Week</div>
        <div style={{ marginTop: 12, fontSize: 32, fontWeight: 780 }}>Annie Wu</div>
        <div style={{ marginTop: 8, color: COLORS.muted, fontSize: 16, lineHeight: 1.4 }}>Product builder and curious collaborator.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
          {["View portfolio", "Open GitHub", "Connect on LinkedIn"].map((label, index) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 16px",
                borderRadius: 12,
                border: `1px solid ${COLORS.line}`,
                background: index === 0 ? COLORS.coralPale : COLORS.white,
                color: COLORS.ink,
                fontSize: 16,
                fontWeight: 730,
              }}
            >
              {label}<SmallArrow color={index === 0 ? COLORS.coral : COLORS.cobalt} />
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 24,
            padding: 17,
            borderRadius: 12,
            background: COLORS.mintPale,
            opacity: consent,
            transform: `translateY(${(1 - consent) * 20}px)`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>Keep the connection?</div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.35, color: COLORS.inkSoft }}>Share your name and one contact method only if you want to.</div>
          <div style={{ display: "flex", marginTop: 13, gap: 8 }}>
            <Pill tone="ink" style={{ padding: "8px 10px", fontSize: 12 }}>Share LinkedIn</Pill>
            <Pill tone="paper" style={{ padding: "8px 10px", fontSize: 12 }}>Not now</Pill>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
};

const ConnectionScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const privateOut = clamp(frame, frameAt(2.5, fps), frameAt(0.82, fps));
  const linkLine = clamp(frame, frameAt(1.8, fps), frameAt(1.25, fps));

  return (
    <SceneCanvas opacity={sceneOpacity(frame, durationInFrames, fps)}>
      <Grain />
      <CornerKicker text="A private connection" />
      <div style={{ position: "absolute", left: 130, top: 202 }}>
        <Pill tone="mint">SCANNER VIEW</Pill>
        <div style={{ marginTop: 28 }}>
          <BigLine>Share the right card, not your whole life.</BigLine>
        </div>
        <div style={{ marginTop: 25, width: 590, color: COLORS.muted, fontSize: 23, lineHeight: 1.42, fontWeight: 560 }}>
          Public links stay simple. A scanner chooses whether to share a contact detail back.
        </div>
        <div style={{ marginTop: 48, display: "flex", alignItems: "center", gap: 15 }}>
          <Pill tone="paper">Public card</Pill>
          <SmallArrow color={COLORS.cobalt} />
          <Pill tone="mint">Explicit consent</Pill>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          width: 410,
          height: 2,
          left: 726,
          top: 510,
          background: COLORS.mint,
          transformOrigin: "left",
          transform: `scaleX(${linkLine})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 18,
          height: 18,
          borderRadius: 5,
          left: 1128,
          top: 502,
          background: COLORS.mint,
          transform: `scale(${linkLine}) rotate(45deg)`,
        }}
      />
      <ScannerCard frame={frame} />
      <CardShell
        style={{
          width: 266,
          height: 190,
          left: 794 + privateOut * 90,
          top: 656 + privateOut * 46,
          opacity: 1 - privateOut,
          transform: `rotate(${privateOut * 12}deg)`,
          border: `1px dashed ${COLORS.line}`,
          boxShadow: "none",
        }}
      >
        <div style={{ padding: 24, color: COLORS.muted }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>PRIVATE NOTES</div>
          <div style={{ marginTop: 13, fontSize: 16, lineHeight: 1.38 }}>Never shown in the public card.</div>
        </div>
      </CardShell>
    </SceneCanvas>
  );
};

const FollowupRow = ({
  frame,
  index,
  name,
  context,
  status,
}: {
  frame: number;
  index: number;
  name: string;
  context: string;
  status: "TO SEND" | "SENT" | "DONE";
}) => {
  const { fps } = useVideoConfig();
  const visible = clamp(frame, frameAt(1.12 + index * 0.34, fps), frameAt(0.55, fps));
  const statusColors = {
    "TO SEND": { background: COLORS.coralPale, color: COLORS.ink },
    SENT: { background: "#E4ECFF", color: COLORS.cobalt },
    DONE: { background: COLORS.mintPale, color: COLORS.mint },
  };
  const tone = statusColors[status];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: 746,
        minHeight: 88,
        padding: "0 18px",
        boxSizing: "border-box",
        borderTop: `1px solid ${COLORS.line}`,
        opacity: visible,
        transform: `translateY(${(1 - visible) * 18}px)`,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: [COLORS.coralPale, "#E4ECFF", COLORS.mintPale][index],
          color: COLORS.ink,
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        {name.charAt(0)}
      </div>
      <div style={{ marginLeft: 14, flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 760 }}>{name}</div>
        <div style={{ marginTop: 3, fontSize: 14, color: COLORS.muted }}>{context}</div>
      </div>
      <div style={{ ...tone, padding: "8px 10px", borderRadius: 999, fontSize: 11, fontWeight: 820 }}>{status}</div>
    </div>
  );
};

const FollowupScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const desktopIn = clamp(frame, frameAt(0.65, fps), frameAt(0.72, fps));
  const draft = clamp(frame, frameAt(3.15, fps), frameAt(0.7, fps));
  const send = clamp(frame, frameAt(5.65, fps), frameAt(0.78, fps));

  return (
    <SceneCanvas opacity={sceneOpacity(frame, durationInFrames, fps)}>
      <Grain opacity={0.1} />
      <CornerKicker text="After the event" />
      <div style={{ position: "absolute", left: 130, top: 206 }}>
        <Pill tone="cobalt">CONTEXT STAYS WITH THE WORK</Pill>
        <div style={{ marginTop: 28 }}>
          <BigLine>Turn the people you met into a next step.</BigLine>
        </div>
        <div style={{ marginTop: 24, width: 600, color: COLORS.muted, fontSize: 23, lineHeight: 1.42, fontWeight: 560 }}>
          NameTags carries the event, your note, and the promise made into a draft you can make your own.
        </div>
      </div>

      <CardShell
        style={{
          left: 946,
          top: 144,
          width: 786,
          height: 770,
          opacity: desktopIn,
          transform: `translateY(${(1 - desktopIn) * 45}px)`,
        }}
      >
        <div style={{ height: 64, padding: "0 24px", display: "flex", alignItems: "center", borderBottom: `1px solid ${COLORS.line}` }}>
          <BrandLockup compact />
          <div style={{ marginLeft: "auto", color: COLORS.muted, fontSize: 14, fontWeight: 740 }}>OpenAI Build Week · Follow-up</div>
        </div>
        <div style={{ padding: "26px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 28, fontWeight: 780 }}>Your next steps</div>
            <div style={{ color: COLORS.coral, fontWeight: 800, fontSize: 14 }}>3 people met</div>
          </div>
          <div style={{ marginTop: 22, border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
            <FollowupRow frame={frame} index={0} name="Maya Chen" context="Asked for your usability notes" status={send > 0.6 ? "SENT" : "TO SEND"} />
            <FollowupRow frame={frame} index={1} name="Eli Rodriguez" context="Shared a founder story after the demo" status="TO SEND" />
            <FollowupRow frame={frame} index={2} name="Taylor Kim" context="Offered an intro to a pilot user" status="DONE" />
          </div>
          <div
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 12,
              background: COLORS.wash,
              border: `1px solid ${COLORS.line}`,
              opacity: draft,
              transform: `translateY(${(1 - draft) * 20}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: COLORS.cobalt, fontSize: 12, fontWeight: 850 }}>AI DRAFT <span style={{ color: COLORS.muted, fontWeight: 650 }}>for Maya</span></div>
            <div style={{ marginTop: 10, fontSize: 16, lineHeight: 1.48, color: COLORS.inkSoft }}>
              Hi Maya, I enjoyed comparing notes after the demo. I kept thinking about your question on onboarding. Here is the flow I mentioned - I would love to hear what stands out to you.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <Pill tone="paper" style={{ padding: "8px 10px", fontSize: 12 }}>Edit</Pill>
              <Pill tone={send > 0.6 ? "mint" : "ink"} style={{ padding: "8px 10px", fontSize: 12 }}>{send > 0.6 ? "Sent" : "Copy & send"}</Pill>
            </div>
          </div>
        </div>
      </CardShell>
    </SceneCanvas>
  );
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const logo = clamp(frame, frameAt(0.38, fps), frameAt(0.78, fps));
  const claim = clamp(frame, frameAt(1.02, fps), frameAt(0.7, fps));
  const line = clamp(frame, frameAt(1.72, fps), frameAt(0.75, fps));
  const ripple = 1 + Math.sin(frame / 11) * 0.022;

  return (
    <SceneCanvas opacity={sceneOpacity(frame, durationInFrames, fps)}>
      <div style={{ position: "absolute", inset: 0, background: COLORS.ink }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div style={{ position: "absolute", left: 130, top: 62 }}><BrandLockup dark /></div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 330,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${ripple})`,
        }}
      >
        <div style={{ opacity: logo, transform: `translateY(${(1 - logo) * 32}px)` }}>
          <LogoMark size={128} color={COLORS.coral} />
        </div>
        <div style={{ marginTop: 38, opacity: logo, transform: `translateY(${(1 - logo) * 24}px)`, color: COLORS.white, fontSize: 75, lineHeight: 1, fontWeight: 780 }}>NameTags</div>
        <div style={{ marginTop: 20, opacity: claim, transform: `translateY(${(1 - claim) * 20}px)`, color: "rgba(255,255,255,.78)", fontSize: 30, fontWeight: 600 }}>Networking, without the pressure.</div>
        <div style={{ marginTop: 56, width: 310 * line, height: 2, background: COLORS.coral }} />
        <div style={{ marginTop: 20, opacity: line, color: "rgba(255,255,255,.58)", fontSize: 16, fontWeight: 730, textTransform: "uppercase" }}>Research · Connect · Follow through</div>
      </div>
      <div style={{ position: "absolute", right: 70, bottom: 56, color: "rgba(255,255,255,.45)", fontSize: 15, fontWeight: 700 }}>nametags-network.vercel.app</div>
    </SceneCanvas>
  );
};

export const NameTagsFilm = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const totalFrames = frameAt(FILM_SECONDS, fps);

  // Lightly fade the first and final frames so the video enters and exits cleanly in an edit.
  const filmOpacity = Math.min(
    clamp(frame, 0, frameAt(0.16, fps)),
    1 - clamp(frame, totalFrames - frameAt(0.18, fps), frameAt(0.18, fps)),
  );

  return (
    <AbsoluteFill style={{ opacity: filmOpacity }}>
      <Sequence from={frameAt(0, fps)} durationInFrames={frameAt(5.4, fps)}><IntroScene /></Sequence>
      <Sequence from={frameAt(4.8, fps)} durationInFrames={frameAt(8.2, fps)}><ResearchScene /></Sequence>
      <Sequence from={frameAt(12.4, fps)} durationInFrames={frameAt(8.8, fps)}><ConversationScene /></Sequence>
      <Sequence from={frameAt(20.6, fps)} durationInFrames={frameAt(10.4, fps)}><QRScene /></Sequence>
      <Sequence from={frameAt(30.4, fps)} durationInFrames={frameAt(9.7, fps)}><ConnectionScene /></Sequence>
      <Sequence from={frameAt(39.5, fps)} durationInFrames={frameAt(8.2, fps)}><FollowupScene /></Sequence>
      <Sequence from={frameAt(47.0, fps)} durationInFrames={frameAt(3.0, fps)}><OutroScene /></Sequence>
    </AbsoluteFill>
  );
};
