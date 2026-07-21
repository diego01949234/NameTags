import type { CSSProperties, ReactNode } from "react";
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
import { QRCodeSVG } from "qrcode.react";

const C = {
  ink: "#182235",
  ink2: "#26324A",
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

const URL = "https://nametags-network.vercel.app";
loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const baseFont = `${spaceGrotesk}, Avenir Next, Avenir, Inter, Helvetica Neue, Arial, sans-serif`;
const enterEase = Easing.bezier(0.16, 1, 0.3, 1);
const balanceEase = Easing.bezier(0.65, 0, 0.35, 1);

const seconds = (value: number, fps: number) => Math.round(value * fps);

const tween = (frame: number, start: number, duration: number, from = 0, to = 1, easing = enterEase) =>
  interpolate(frame, [start, start + duration], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const random = (index: number, salt = 1) => {
  const raw = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return raw - Math.floor(raw);
};

const sceneFade = (frame: number, durationSeconds: number, fps: number) => {
  const fade = seconds(0.44, fps);
  const enter = tween(frame, 0, fade);
  const exit = 1 - tween(frame, seconds(durationSeconds, fps) - fade, fade);
  return Math.min(enter, exit);
};

const Canvas = ({
  children,
  background = C.wash,
  opacity = 1,
}: {
  children: ReactNode;
  background?: string;
  opacity?: number;
}) => {
  const { width, height } = useVideoConfig();
  const scale = Math.min(width / 1920, height / 1080);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: background, opacity }}>
      <div
        style={{
          position: "absolute",
          left: (width - 1920 * scale) / 2,
          top: (height - 1080 * scale) / 2,
          width: 1920,
          height: 1080,
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily: baseFont,
          color: C.ink,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Grid = ({ dark = false, opacity = 0.12, step = 48 }: { dark?: boolean; opacity?: number; step?: number }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,.6)" : "rgba(24,34,53,.44)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,.6)" : "rgba(24,34,53,.44)"} 1px, transparent 1px)`,
      backgroundSize: `${step}px ${step}px`,
    }}
  />
);

const NIcon = ({ size = 46, pulse = 1 }: { size?: number; pulse?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Math.max(10, Math.round(size * 0.25)),
      backgroundColor: C.coral,
      color: C.white,
      fontSize: Math.round(size * 0.66),
      fontWeight: 900,
      lineHeight: 1,
      letterSpacing: 0,
      boxShadow: `0 18px 34px rgba(232,109,80,${0.18 * pulse})`,
      transform: `scale(${pulse})`,
    }}
  >
    N
  </div>
);

const Wordmark = ({ dark = false, size = 30 }: { dark?: boolean; size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.34) }}>
    <NIcon size={size} />
    <span style={{ color: dark ? C.white : C.ink, fontSize: Math.round(size * 0.77), fontWeight: 790, lineHeight: 1 }}>NameTags</span>
  </div>
);

const TopTag = ({ label, dark = false }: { label: string; dark?: boolean }) => (
  <div
    style={{
      position: "absolute",
      top: 56,
      left: 62,
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: 15,
      fontWeight: 820,
      color: dark ? "rgba(255,255,255,.72)" : C.muted,
      textTransform: "uppercase",
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: C.coral }} />
    {label}
  </div>
);

const Headline = ({ children, dark = false, width = 720 }: { children: ReactNode; dark?: boolean; width?: number }) => (
  <div style={{ width, fontSize: 72, lineHeight: 0.99, letterSpacing: 0, fontWeight: 820, color: dark ? C.white : C.ink }}>{children}</div>
);

const Label = ({ children, color = C.cobalt, style }: { children: ReactNode; color?: string; style?: CSSProperties }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 13px",
      borderRadius: 999,
      color: C.ink,
      backgroundColor: color === C.coral ? C.coralPale : color === C.mint ? C.mintPale : C.cobaltPale,
      fontSize: 14,
      lineHeight: 1,
      fontWeight: 800,
      ...style,
    }}
  >
    {children}
  </div>
);

const StatusDot = ({ color = C.cobalt }: { color?: string }) => <span style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color, display: "inline-block" }} />;

const LinkGlyph = ({ kind, size = 24 }: { kind: "mail" | "in" | "ig" | "chat" | "code" | "play"; size?: number }) => {
  const glyphs = { mail: "@", in: "in", ig: "◎", chat: "●", code: "</>", play: "▶" };
  const fills = { mail: C.coral, in: C.cobalt, ig: C.coral, chat: C.mint, code: C.ink, play: C.cobalt };
  return <span style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: Math.max(5, Math.round(size * 0.27)), color: C.white, backgroundColor: fills[kind], fontSize: kind === "code" ? Math.round(size * 0.36) : Math.round(size * 0.46), fontWeight: 850, lineHeight: 1 }}>{glyphs[kind]}</span>;
};

const PainToSolution = ({ step, pain, solution, color, compact = false }: { step: string; pain: string; solution: string; color: string; compact?: boolean }) => (
  <div style={{ display: "flex", gap: compact ? 10 : 14, alignItems: "stretch", fontSize: compact ? 13 : 15 }}>
    <div style={{ minWidth: compact ? 62 : 80, padding: compact ? "9px 10px" : "11px 12px", borderRadius: 9, boxSizing: "border-box", color: C.white, backgroundColor: color, fontSize: compact ? 11 : 12, fontWeight: 850, lineHeight: 1.2 }}>{step}</div>
    <div style={{ flex: 1, padding: compact ? "8px 0" : "10px 0" }}><span style={{ color: C.muted, fontWeight: 800 }}>PAIN </span><span style={{ color: C.ink, fontWeight: 700 }}>{pain}</span></div>
    <div style={{ width: 1, backgroundColor: C.line }} />
    <div style={{ flex: 1, padding: compact ? "8px 0" : "10px 0" }}><span style={{ color, fontWeight: 850 }}>NAME TAGS </span><span style={{ color: C.ink, fontWeight: 760 }}>{solution}</span></div>
  </div>
);

const SmallCard = ({
  x,
  y,
  w = 210,
  h = 116,
  rotation = 0,
  opacity = 1,
  scale = 1,
  children,
  dark = false,
  shadow = true,
  style,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  opacity?: number;
  scale?: number;
  children: ReactNode;
  dark?: boolean;
  shadow?: boolean;
  style?: CSSProperties;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: 12,
      boxSizing: "border-box",
      overflow: "hidden",
      border: dark ? "1px solid rgba(255,255,255,.16)" : `1px solid ${C.line}`,
      backgroundColor: dark ? C.ink2 : C.white,
      boxShadow: shadow ? "0 19px 36px rgba(24,34,53,.13)" : "none",
      transform: `rotate(${rotation}deg) scale(${scale})`,
      transformOrigin: "center center",
      opacity,
      ...style,
    }}
  >
    {children}
  </div>
);

const Phone = ({ children, x, y, scale = 1, rotate = 0, opacity = 1, style }: { children: ReactNode; x: number; y: number; scale?: number; rotate?: number; opacity?: number; style?: CSSProperties }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: 380,
      height: 754,
      padding: 11,
      boxSizing: "border-box",
      borderRadius: 49,
      border: "5px solid #0F1726",
      backgroundColor: C.ink,
      boxShadow: "0 38px 80px rgba(24,34,53,.30)",
      transform: `rotate(${rotate}deg) scale(${scale})`,
      transformOrigin: "center",
      opacity,
      ...style,
    }}
  >
    <div style={{ position: "absolute", zIndex: 3, left: "50%", top: 14, width: 118, height: 27, borderRadius: 16, backgroundColor: "#0F1726", transform: "translateX(-50%)" }} />
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 34, backgroundColor: C.paper }}>{children}</div>
  </div>
);

const CardRainScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 7.0;
  const entrance = tween(frame, seconds(0.25, fps), seconds(0.8, fps));
  const title = tween(frame, seconds(2.0, fps), seconds(0.72, fps));
  const iconPop = spring({ frame: Math.max(0, frame - seconds(5.05, fps)), fps, config: { damping: 13, stiffness: 150, mass: 0.8 } });
  const cardCount = 36;

  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.10} step={50} />
      <TopTag label="The problem · networking is scary" dark />
      <div style={{ position: "absolute", left: 126, top: 228, opacity: title, transform: `translateY(${(1 - title) * 28}px)` }}>
        <Label color={C.coral}>EVENT OVERLOAD</Label>
        <div style={{ marginTop: 26, width: 560, fontSize: 72, lineHeight: 0.99, fontWeight: 820, color: C.white }}>Networking is scary.</div>
        <div style={{ marginTop: 22, width: 545, color: "rgba(255,255,255,.76)", fontSize: 29, lineHeight: 1.16, fontWeight: 710 }}>Figuring out what to say, share, and remember should not be.</div>
        <div style={{ marginTop: 24, width: 535, color: "rgba(255,255,255,.58)", fontSize: 19, lineHeight: 1.42, fontWeight: 570 }}>Gmail, Instagram, WhatsApp, LinkedIn and business cards arrive all at once - then the useful context disappears.</div>
      </div>
      <SmallCard x={1268} y={220} w={274} h={158} rotation={-8} opacity={entrance} scale={0.72 + entrance * 0.28} dark>
        <div style={{ padding: 22, color: C.white }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.coral, fontSize: 12, fontWeight: 850 }}><StatusDot color={C.coral} /> MET AT</div>
          <div style={{ marginTop: 17, fontSize: 23, fontWeight: 780 }}>Founder Meetup</div>
          <div style={{ marginTop: 7, fontSize: 14, color: "rgba(255,255,255,.58)" }}>Follow up tomorrow?</div>
        </div>
      </SmallCard>
      {Array.from({ length: cardCount }).map((_, index) => {
        const delay = seconds(1.1 + random(index, 2) * 2.1, fps);
        const progress = tween(frame, delay, seconds(2.8 + random(index, 4) * 0.9, fps), 0, 1, balanceEase);
        const lane = 690 + random(index, 3) * 1080;
        const startY = -250 - random(index, 5) * 560;
        const targetY = 700 + (index % 5) * 28 + random(index, 6) * 95;
        const x = interpolate(progress, [0, 1], [lane, 1015 + (index % 7) * 16 - 70]);
        const y = interpolate(progress, [0, 1], [startY, targetY]);
        const rotation = interpolate(progress, [0, 1], [-26 + random(index, 7) * 54, -9 + (index % 5) * 4]);
        const opacity = Math.min(tween(frame, delay, seconds(0.24, fps)), 1 - tween(frame, seconds(6.1, fps), seconds(0.7, fps)) * 0.55);
        const channels = ["Gmail", "Instagram", "WhatsApp", "LinkedIn", "Portfolio"];
        const channel = channels[index % channels.length];
        return (
          <SmallCard key={index} x={x} y={y} w={132 + (index % 3) * 12} h={78} rotation={rotation} opacity={opacity} scale={0.86} shadow={false} style={{ backgroundColor: index % 4 === 0 ? C.coralPale : index % 5 === 0 ? C.mintPale : C.white }}>
            <div style={{ padding: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ height: 7, width: 33 + (index % 4) * 10, borderRadius: 5, backgroundColor: index % 4 === 0 ? C.coral : C.ink }} /><LinkGlyph kind={(["mail", "ig", "chat", "in", "code"] as const)[index % 5]} size={14} /></div>
              <div style={{ marginTop: 8, color: C.ink2, fontSize: 10, fontWeight: 820 }}>{channel}</div>
              <div style={{ marginTop: 6, height: 5, width: 68, borderRadius: 5, backgroundColor: C.line }} />
            </div>
          </SmallCard>
        );
      })}
      <div style={{ position: "absolute", left: 870, top: 766, zIndex: 5, opacity: iconPop, transform: `translateY(${(1 - iconPop) * 70}px) scale(${0.7 + iconPop * 0.3})` }}>
        <NIcon size={148} pulse={1 + Math.sin(frame / 5) * 0.025} />
      </div>
      <div style={{ position: "absolute", right: 68, bottom: 54, color: "rgba(255,255,255,.52)", fontSize: 15, fontWeight: 760 }}>One event. One clear next step.</div>
    </Canvas>
  );
};

const DeskScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 7.1;
  const drift = tween(frame, seconds(0.2, fps), seconds(5.0, fps), 0, 1, balanceEase);
  const phoneIn = spring({ frame: Math.max(0, frame - seconds(4.4, fps)), fps, config: { damping: 16, stiffness: 125 } });
  const notification = spring({ frame: Math.max(0, frame - seconds(5.0, fps)), fps, config: { damping: 14, stiffness: 160 } });

  return (
    <Canvas background={C.coralPale} opacity={sceneFade(frame, duration, fps)}>
      <Grid opacity={0.11} step={42} />
      <TopTag label="Pain 01 · before the event" />
      <div style={{ position: "absolute", left: 126, top: 204 }}>
        <Label color={C.cobalt}>TOO MANY TABS</Label>
        <div style={{ marginTop: 25 }}><Headline width={690}>What am I walking into? What do I say first?</Headline></div>
        <div style={{ marginTop: 24, width: 540, color: C.muted, fontSize: 22, lineHeight: 1.42, fontWeight: 570 }}>An event page, a half-read speaker bio, three unread messages, and no idea what to say first.</div>
      </div>
      <div style={{ position: "absolute", left: interpolate(drift, [0, 1], [970, 345]), top: 164, width: 1420, height: 720 }}>
        <SmallCard x={0} y={42} w={540} h={390} rotation={-7} style={{ backgroundColor: C.paper }}>
          <div style={{ padding: 32 }}>
            <div style={{ color: C.cobalt, fontSize: 13, fontWeight: 850 }}>EVENT AGENDA</div>
            {["Speaker introductions", "Founder lightning demos", "Open networking"].map((item, index) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 25, fontSize: 20, fontWeight: 720, color: index === 1 ? C.muted : C.ink }}>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${index === 1 ? C.coral : C.cobalt}`, display: "inline-block", transform: index === 1 ? "rotate(45deg)" : "none" }} />
                <span style={{ textDecoration: index === 1 ? "line-through" : "none" }}>{item}</span>
              </div>
            ))}
          </div>
        </SmallCard>
        <SmallCard x={508} y={-4} w={240} h={208} rotation={9} style={{ backgroundColor: C.cobaltPale }}>
          <div style={{ padding: 24 }}><div style={{ fontSize: 22, fontWeight: 800 }}>Who is speaking?</div><div style={{ marginTop: 20, width: 118, height: 6, backgroundColor: C.cobalt, borderRadius: 5 }} /><div style={{ marginTop: 10, width: 154, height: 6, backgroundColor: C.cobalt, borderRadius: 5 }} /></div>
        </SmallCard>
        <div style={{ position: "absolute", left: 698, top: 214, width: 214, height: 310, border: `13px solid ${C.ink}`, borderRadius: "50%", transform: `rotate(${frame * 1.5}deg)`, opacity: 0.75 }}>
          <div style={{ position: "absolute", left: 88, top: -96, width: 14, height: 132, borderRadius: 11, backgroundColor: C.ink }} />
          <div style={{ position: "absolute", left: 98, top: -97, width: 150, height: 9, borderRadius: 9, backgroundColor: C.coral }} />
        </div>
        <SmallCard x={860} y={88} w={360} h={222} rotation={-5} style={{ backgroundColor: C.mintPale }}>
          <div style={{ padding: 24 }}><div style={{ fontSize: 15, color: C.mint, fontWeight: 850 }}>YOUR NOTE</div><div style={{ marginTop: 18, fontSize: 25, lineHeight: 1.15, fontWeight: 790 }}>"Please don't make this awkward."</div></div>
        </SmallCard>
      </div>
      <Phone x={1305} y={176} scale={0.68 + phoneIn * 0.32} rotate={interpolate(phoneIn, [0, 1], [8, 0])} opacity={phoneIn}>
        <div style={{ padding: "62px 24px 24px" }}>
          <Wordmark size={28} />
          <div style={{ marginTop: 52, color: C.muted, fontSize: 14, fontWeight: 830, textTransform: "uppercase" }}>Ready when you are</div>
          <div style={{ marginTop: 10, fontSize: 29, lineHeight: 1.08, fontWeight: 820 }}>Start with the event.</div>
          <div style={{ marginTop: 22, height: 82, padding: 16, boxSizing: "border-box", borderRadius: 12, backgroundColor: C.coralPale, fontSize: 16, lineHeight: 1.3, fontWeight: 730 }}>Paste a URL, screenshot, or a rough note.</div>
        </div>
      </Phone>
      <SmallCard x={1190} y={662 - (1 - notification) * 28} w={306} h={92} rotation={0} opacity={notification} style={{ zIndex: 4 }}>
        <div style={{ display: "flex", padding: 15, gap: 12, alignItems: "center" }}><NIcon size={42} /><div><div style={{ fontWeight: 820, fontSize: 14 }}>NameTags</div><div style={{ marginTop: 3, color: C.muted, fontSize: 13 }}>Your event is ready to understand.</div></div></div>
      </SmallCard>
    </Canvas>
  );
};

const OrbitScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 7.1;
  const spin = tween(frame, seconds(0.4, fps), seconds(5.0, fps));
  const phoneIn = spring({ frame: Math.max(0, frame - seconds(0.6, fps)), fps, config: { damping: 15, stiffness: 115 } });
  const collapse = tween(frame, seconds(5.1, fps), seconds(1.2, fps), 0, 1, balanceEase);
  const orbitCards = ["Event URL", "Speaker bio", "Your goal", "A question", "Screenshot", "Past notes", "LinkedIn"];

  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.08} step={60} />
      <TopTag label="Pain 01 · no time to prepare" dark />
      <div style={{ position: "absolute", left: 120, top: 206 }}>
        <Label color={C.cobalt}>CONTEXT, NOT CLUTTER</Label>
        <div style={{ marginTop: 26 }}><Headline dark width={600}>Too much information. No plan.</Headline></div>
        <div style={{ marginTop: 24, width: 520, color: "rgba(255,255,255,.64)", fontSize: 21, lineHeight: 1.42, fontWeight: 570 }}>NameTags finds what matters for this room, with your actual goal in mind.</div>
      </div>
      <div style={{ position: "absolute", left: 1230, top: 528, width: 2, height: 2, zIndex: 2 }}>
        {orbitCards.map((label, index) => {
          const angle = spin * Math.PI * 3 + (index / orbitCards.length) * Math.PI * 2;
          const radiusX = interpolate(collapse, [0, 1], [350 + (index % 2) * 58, 42]);
          const radiusY = interpolate(collapse, [0, 1], [244 + (index % 3) * 30, 34]);
          const depth = (Math.sin(angle) + 1) / 2;
          const x = Math.cos(angle) * radiusX;
          const y = Math.sin(angle) * radiusY;
          return (
            <SmallCard key={label} x={x - 88} y={y - 42} w={176} h={84} rotation={Math.cos(angle) * 12} opacity={0.45 + depth * 0.55} scale={0.73 + depth * 0.28} dark shadow={false} style={{ filter: `blur(${(1 - depth) * 1.6}px)`, zIndex: Math.round(depth * 10) }}>
              <div style={{ padding: "17px 15px", color: C.white }}><div style={{ color: index % 2 ? C.coral : C.mint, fontSize: 10, fontWeight: 850 }}>SOURCE</div><div style={{ marginTop: 7, fontSize: 15, fontWeight: 750 }}>{label}</div></div>
            </SmallCard>
          );
        })}
      </div>
      <Phone x={1040} y={176} scale={0.7 + phoneIn * 0.3} rotate={0} opacity={phoneIn} style={{ zIndex: 3 }}>
        <div style={{ padding: "62px 24px" }}>
          <Wordmark size={28} />
          <div style={{ marginTop: 52, color: C.muted, fontSize: 13, fontWeight: 850, textTransform: "uppercase" }}>Researching your room</div>
          <div style={{ marginTop: 12, fontSize: 29, lineHeight: 1.1, fontWeight: 820 }}>OpenAI Build Week</div>
          <div style={{ marginTop: 16, height: 10, borderRadius: 10, backgroundColor: C.line, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.round(interpolate(spin, [0, 1], [16, 100]))}%`, backgroundColor: C.cobalt }} /></div>
          <div style={{ marginTop: 22, padding: 18, borderRadius: 12, backgroundColor: C.cobaltPale }}><div style={{ color: C.cobalt, fontSize: 13, fontWeight: 850 }}>ONE CLEAR BRIEF</div><div style={{ marginTop: 9, fontSize: 17, lineHeight: 1.3, fontWeight: 760 }}>Builders are sharing early work - lead with curiosity, not a polished pitch.</div></div>
        </div>
      </Phone>
    </Canvas>
  );
};

const BreakthroughScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 7.1;
  const burst = tween(frame, seconds(0.2, fps), seconds(2.0, fps));
  const whiteWash = tween(frame, seconds(4.55, fps), seconds(1.1, fps));
  const icon = spring({ frame: Math.max(0, frame - seconds(5.0, fps)), fps, config: { damping: 13, stiffness: 145 } });
  const phrase = tween(frame, seconds(5.45, fps), seconds(0.72, fps));

  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.07} step={56} />
      {Array.from({ length: 32 }).map((_, index) => {
        const originX = 120 + random(index, 2) * 1650;
        const originY = 90 + random(index, 3) * 920;
        const x = interpolate(burst, [0, 1], [originX, 960]);
        const y = interpolate(burst, [0, 1], [originY, 540]);
        const rotate = interpolate(burst, [0, 1], [-28 + random(index, 4) * 56, 0]);
        const opacity = 1 - tween(frame, seconds(2.85, fps), seconds(1.3, fps));
        return <SmallCard key={index} x={x - 80} y={y - 48} w={160} h={96} rotation={rotate} opacity={opacity} scale={0.7 + random(index, 5) * 0.32} shadow={false} style={{ backgroundColor: index % 3 === 0 ? C.coralPale : index % 3 === 1 ? C.cobaltPale : C.mintPale }}><div style={{ padding: 14 }}><div style={{ width: 38, height: 7, borderRadius: 9, backgroundColor: C.ink }} /><div style={{ marginTop: 12, width: 88, height: 6, borderRadius: 9, backgroundColor: "rgba(24,34,53,.25)" }} /></div></SmallCard>;
      })}
      <div style={{ position: "absolute", inset: 0, backgroundColor: C.paper, opacity: whiteWash }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 355, display: "flex", flexDirection: "column", alignItems: "center", opacity: icon, zIndex: 5, transform: `translateY(${(1 - icon) * 44}px) scale(${0.78 + icon * 0.22})` }}>
        <NIcon size={150} pulse={1 + Math.sin(frame / 6) * 0.022} />
        <div style={{ marginTop: 30, opacity: phrase, color: C.ink, fontSize: 58, fontWeight: 840, lineHeight: 1 }}>One room. One plan. One QR.</div>
        <div style={{ marginTop: 20, opacity: phrase, color: C.muted, fontSize: 21, fontWeight: 630 }}>NameTags turns uncertainty into a next step you can actually take.</div>
      </div>
    </Canvas>
  );
};

const ResearchScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 8.1;
  const sourceIn = tween(frame, seconds(0.7, fps), seconds(0.58, fps));
  const briefIn = tween(frame, seconds(2.1, fps), seconds(0.65, fps));
  const questionIn = tween(frame, seconds(3.9, fps), seconds(0.72, fps));
  const typed = "openai.com/build-week".slice(0, Math.floor(interpolate(frame, [seconds(0.75, fps), seconds(2.1, fps)], [0, 21], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));

  return (
    <Canvas background={C.wash} opacity={sceneFade(frame, duration, fps)}>
      <Grid opacity={0.10} step={44} />
      <TopTag label="01 · before - subway mode research" />
      <div style={{ position: "absolute", left: 126, top: 194 }}>
        <Label color={C.cobalt}>UNDERSTAND THE ROOM FAST</Label>
        <div style={{ marginTop: 25 }}><Headline width={670}>I don't understand this event. Give me a way in.</Headline></div>
        <div style={{ marginTop: 24, width: 560, color: C.muted, fontSize: 22, lineHeight: 1.42, fontWeight: 570 }}>Paste an event URL, a screenshot, or the one sentence you have. Ask follow-up questions until the plan feels useful.</div>
        <div style={{ marginTop: 34, width: 650 }}><PainToSolution step="BEFORE" pain="No time to research." solution="Subway Mode turns the event into a tailored brief." color={C.cobalt} /></div>
      </div>
      <Phone x={1070} y={146} scale={0.91} rotate={0} opacity={1}>
        <div style={{ padding: "62px 22px 24px" }}>
          <Wordmark size={28} />
          <div style={{ marginTop: 38, fontSize: 13, color: C.muted, fontWeight: 850, textTransform: "uppercase" }}>Event research</div>
          <div style={{ marginTop: 13, height: 55, display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 12, backgroundColor: C.white, fontFamily: "SFMono-Regular, Menlo, monospace", fontSize: 15, color: C.ink }}>
            <span style={{ color: C.cobalt, marginRight: 8 }}>⌕</span>{typed}<span style={{ width: 2, height: 18, marginLeft: 2, backgroundColor: C.cobalt, opacity: Math.sin(frame / 4) > 0 ? 1 : 0 }} />
          </div>
          <div style={{ marginTop: 17, padding: 16, borderRadius: 12, backgroundColor: C.cobaltPale, opacity: sourceIn, transform: `translateY(${(1 - sourceIn) * 18}px)` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: C.cobalt, fontSize: 12, fontWeight: 850 }}><StatusDot color={C.cobalt} /> SOURCE RECOGNIZED</div>
            <div style={{ marginTop: 9, fontSize: 16, lineHeight: 1.3, fontWeight: 760 }}>OpenAI Build Week · builders, demos, and hands-on projects.</div>
          </div>
          <div style={{ marginTop: 14, padding: 16, borderRadius: 12, border: `1px solid ${C.line}`, backgroundColor: C.white, opacity: briefIn, transform: `translateY(${(1 - briefIn) * 18}px)` }}>
            <div style={{ color: C.mint, fontSize: 12, fontWeight: 850 }}>YOUR ANGLE</div>
            <div style={{ marginTop: 8, fontSize: 16, lineHeight: 1.3, fontWeight: 760 }}>Look for people testing something early and ask about the user moment that changed their direction.</div>
          </div>
          <div style={{ marginTop: 14, padding: 16, borderRadius: 12, backgroundColor: C.coralPale, opacity: questionIn, transform: `translateY(${(1 - questionIn) * 18}px)` }}>
            <div style={{ color: C.coral, fontSize: 12, fontWeight: 850 }}>ASK THIS</div>
            <div style={{ marginTop: 8, fontSize: 16, lineHeight: 1.3, fontWeight: 760 }}>"What did a real user do that changed the way you think about the product?"</div>
          </div>
        </div>
      </Phone>
      <SmallCard x={820} y={704} w={340} h={78} opacity={questionIn} style={{ zIndex: 4 }}>
        <div style={{ display: "flex", height: "100%", alignItems: "center", padding: "0 16px", justifyContent: "space-between" }}><span style={{ color: C.muted, fontSize: 15, fontWeight: 650 }}>Ask about this event</span><span style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, backgroundColor: C.cobalt, fontSize: 21 }}>↑</span></div>
      </SmallCard>
    </Canvas>
  );
};

const Ticket = ({ frame, x, y, scale = 1, rotateY = 0, opacity = 1 }: { frame: number; x: number; y: number; scale?: number; rotateY?: number; opacity?: number }) => {
  const { fps } = useVideoConfig();
  const scan = tween(frame, seconds(2.15, fps), seconds(1.4, fps), -320, 480, balanceEase);
  const qrIn = spring({ frame: Math.max(0, frame - seconds(1.45, fps)), fps, config: { damping: 15, stiffness: 140 } });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 548, height: 718, borderRadius: 22, overflow: "hidden", backgroundColor: C.coralPale, boxShadow: "0 44px 90px rgba(24,34,53,.25)", opacity, transform: `perspective(1100px) rotateX(${Math.sin(frame / 16) * 2.2}deg) rotateY(${rotateY + Math.sin(frame / 23) * 3.4}deg) scale(${scale})`, transformOrigin: "center" }}>
      <div style={{ height: 18, backgroundColor: C.coral }} />
      <div style={{ padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Wordmark size={34} /><Label color={C.ink2} style={{ color: C.white, backgroundColor: C.ink, fontSize: 11, padding: "8px 10px" }}>ROOM PASS</Label></div>
        <div style={{ marginTop: 47, color: C.muted, fontSize: 13, fontWeight: 850, textTransform: "uppercase" }}>OpenAI Build Week</div>
        <div style={{ marginTop: 11, fontSize: 37, lineHeight: 1, fontWeight: 840 }}>Annie Wu</div>
        <div style={{ marginTop: 10, color: C.ink2, fontSize: 17, lineHeight: 1.35, fontWeight: 580 }}>Curious product builder. Here to compare notes.</div>
        <div style={{ margin: "42px auto 0", display: "flex", alignItems: "center", justifyContent: "center", width: 328, height: 328, padding: 18, boxSizing: "border-box", borderRadius: 14, backgroundColor: C.paper, boxShadow: "0 18px 32px rgba(24,34,53,.10)", opacity: qrIn, transform: `scale(${0.76 + qrIn * 0.24})` }}>
          <QRCodeSVG value={URL} size={292} bgColor={C.paper} fgColor={C.ink} level="H" includeMargin={false} />
        </div>
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 15, fontWeight: 820 }}>Scan to keep the connection</div>
      </div>
      <div style={{ position: "absolute", top: 372, left: -13, width: 26, height: 26, borderRadius: "50%", backgroundColor: C.wash }} />
      <div style={{ position: "absolute", top: 372, right: -13, width: 26, height: 26, borderRadius: "50%", backgroundColor: C.wash }} />
      <div style={{ position: "absolute", top: 330, left: scan, width: 118, height: 276, backgroundColor: "rgba(255,255,255,.40)", transform: "skewX(-18deg)", opacity: scan > -50 && scan < 390 ? 0.72 : 0 }} />
    </div>
  );
};

const RoomPassScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 8.3;
  const copy = tween(frame, seconds(0.7, fps), seconds(0.72, fps));
  const orbit = tween(frame, seconds(0.5, fps), seconds(4.6, fps));
  const iconPop = spring({ frame: Math.max(0, frame - seconds(5.0, fps)), fps, config: { damping: 14, stiffness: 140 } });

  return (
    <Canvas background={C.wash} opacity={sceneFade(frame, duration, fps)}>
      <Grid opacity={0.10} step={52} />
      <TopTag label="02 · during - your custom room pass" />
      <div style={{ position: "absolute", left: 126, top: 187, opacity: copy, transform: `translateY(${(1 - copy) * 26}px)` }}>
        <Label color={C.coral}>THE ROOM PASS</Label>
        <div style={{ marginTop: 25 }}><Headline width={630}>I want to exchange details without the awkward swapping.</Headline></div>
        <div style={{ marginTop: 24, width: 540, fontSize: 22, lineHeight: 1.42, color: C.muted, fontWeight: 570 }}>One QR gives people the links you choose. Private notes stay private. They can share back only when they want to.</div>
        <div style={{ marginTop: 31, width: 650 }}><PainToSolution step="DURING" pain="Contact swapping is clumsy." solution="One customized QR Room Pass." color={C.coral} /></div>
        <div style={{ display: "flex", gap: 10, marginTop: 39 }}><Label color={C.cobalt}>GitHub</Label><Label color={C.mint}>Portfolio</Label><Label color={C.coral}>LinkedIn</Label></div>
      </div>
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = orbit * Math.PI * 2.1 + (index / 8) * Math.PI * 2;
        const x = 1360 + Math.cos(angle) * (344 + (index % 2) * 26);
        const y = 522 + Math.sin(angle) * (290 + (index % 3) * 18);
        return <div key={index} style={{ position: "absolute", left: x, top: y, width: 14, height: 14, borderRadius: 4, backgroundColor: [C.cobalt, C.coral, C.mint][index % 3], opacity: 0.4 + (index % 3) * 0.16, transform: `rotate(${frame * (index % 2 ? -1.1 : 1.2)}deg)` }} />;
      })}
      <Ticket frame={frame} x={1100} y={148} scale={0.96} rotateY={-5} />
      <div style={{ position: "absolute", left: 948, bottom: 90, display: "flex", alignItems: "center", gap: 12, opacity: iconPop, transform: `translateY(${(1 - iconPop) * 25}px)` }}><NIcon size={48} /><span style={{ fontSize: 16, color: C.muted, fontWeight: 720 }}>Designed to scan cleanly. Built to be remembered.</span></div>
    </Canvas>
  );
};

const Panel = ({ x, title, color, frame, delay, children }: { x: number; title: string; color: string; frame: number; delay: number; children: ReactNode }) => {
  const { fps } = useVideoConfig();
  const inValue = spring({ frame: Math.max(0, frame - seconds(delay, fps)), fps, config: { damping: 15, stiffness: 120 } });
  return <SmallCard x={x} y={206 + (1 - inValue) * 90} w={380} h={500} rotation={interpolate(inValue, [0, 1], [x < 780 ? -8 : x > 780 ? 8 : 0, 0])} opacity={inValue} scale={0.84 + inValue * 0.16} style={{ zIndex: 3 }}><div style={{ height: 14, backgroundColor: color }} /><div style={{ padding: 24 }}><div style={{ display: "flex", alignItems: "center", gap: 9, color, fontSize: 12, fontWeight: 850 }}><StatusDot color={color} /> {title}</div>{children}</div></SmallCard>;
};

const FinalScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 7.9;
  const fold = tween(frame, seconds(4.25, fps), seconds(1.55, fps), 0, 1, balanceEase);
  const finalIn = spring({ frame: Math.max(0, frame - seconds(5.55, fps)), fps, config: { damping: 13, stiffness: 135 } });
  const subline = tween(frame, seconds(6.25, fps), seconds(0.7, fps));
  const panelOpacity = 1 - fold;

  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.08} step={50} />
      <TopTag label="03 · after - follow through" dark />
      <div style={{ position: "absolute", left: 0, right: 0, top: 94, textAlign: "center", color: C.white, fontSize: 48, fontWeight: 820, opacity: panelOpacity, transform: `translateY(${fold * -38}px)` }}>I met people. Now what?</div>
      <div style={{ opacity: panelOpacity, transform: `scale(${1 - fold * 0.48}) translateY(${fold * 110}px)`, transformOrigin: "center" }}>
        <Panel x={330} title="RESEARCH" color={C.cobalt} frame={frame} delay={0.3}><div style={{ marginTop: 25, fontSize: 25, lineHeight: 1.12, fontWeight: 800 }}>Understand the room.</div><div style={{ marginTop: 22, height: 14, borderRadius: 8, backgroundColor: C.line }}><div style={{ width: "76%", height: "100%", borderRadius: 8, backgroundColor: C.cobalt }} /></div><div style={{ marginTop: 22, padding: 15, borderRadius: 10, backgroundColor: C.cobaltPale, color: C.ink, fontSize: 16, lineHeight: 1.35, fontWeight: 720 }}>Ask a better question, not a bigger pitch.</div></Panel>
        <Panel x={770} title="ROOM PASS" color={C.coral} frame={frame} delay={0.68}><div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}><div style={{ width: 216, height: 216, padding: 14, boxSizing: "border-box", backgroundColor: C.coralPale, borderRadius: 14 }}><QRCodeSVG value={URL} size={188} bgColor={C.coralPale} fgColor={C.ink} level="H" includeMargin={false} /></div></div><div style={{ marginTop: 22, textAlign: "center", fontSize: 20, lineHeight: 1.2, fontWeight: 800 }}>Share only what belongs in this room.</div></Panel>
        <Panel x={1210} title="FOLLOW-UP" color={C.mint} frame={frame} delay={1.06}><div style={{ marginTop: 24, fontSize: 24, lineHeight: 1.12, fontWeight: 800 }}>Keep the context.</div>{["Maya · Send", "Eli · Draft", "Taylor · Done"].map((row, index) => <div key={row} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingBottom: 15, borderBottom: index === 2 ? "none" : `1px solid ${C.line}`, color: C.ink, fontWeight: 700 }}><span>{row}</span><StatusDot color={index === 2 ? C.mint : index === 1 ? C.cobalt : C.coral} /></div>)}</Panel>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 306, display: "flex", flexDirection: "column", alignItems: "center", opacity: finalIn, transform: `scale(${0.66 + finalIn * 0.34}) translateY(${(1 - finalIn) * 80}px)` }}>
        <NIcon size={170} pulse={1 + Math.sin(frame / 5) * 0.018} />
        <div style={{ marginTop: 32, color: C.white, fontSize: 72, fontWeight: 840, lineHeight: 1 }}>NameTags</div>
        <div style={{ marginTop: 18, color: "rgba(255,255,255,.78)", fontSize: 29, fontWeight: 620, opacity: subline, transform: `translateY(${(1 - subline) * 20}px)` }}>Networking, without the pressure.</div>
        <div style={{ marginTop: 46, width: 260 * subline, height: 3, backgroundColor: C.coral }} />
        <div style={{ marginTop: 20, color: "rgba(255,255,255,.5)", fontSize: 15, fontWeight: 760, textTransform: "uppercase", opacity: subline }}>Research · Connect · Follow through</div>
      </div>
    </Canvas>
  );
};

const StepMapCard = ({ step, pain, solution, outcome, color, frame, delay }: { step: string; pain: string; solution: string; outcome: string; color: string; frame: number; delay: number }) => {
  const { fps } = useVideoConfig();
  const appear = spring({ frame: Math.max(0, frame - seconds(delay, fps)), fps, config: { damping: 15, stiffness: 120 } });
  const flip = tween(frame, seconds(delay + 3.1, fps), seconds(0.7, fps));
  return (
    <div style={{ position: "relative", width: 500, minHeight: 208, opacity: appear, transform: `translateY(${(1 - appear) * 62}px) rotateX(${(1 - appear) * 18}deg)`, transformOrigin: "bottom" }}>
      <div style={{ padding: 22, minHeight: 208, boxSizing: "border-box", borderRadius: 14, border: `1px solid ${C.line}`, backgroundColor: C.white, boxShadow: "0 18px 38px rgba(24,34,53,.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color, fontSize: 13, fontWeight: 850 }}><StatusDot color={color} /> {step}</div>
        <div style={{ marginTop: 17, color: C.muted, fontSize: 12, fontWeight: 850 }}>PAIN</div>
        <div style={{ marginTop: 5, fontSize: 20, lineHeight: 1.18, fontWeight: 800 }}>{pain}</div>
        <div style={{ width: `${flip * 100}%`, height: 2, marginTop: 18, backgroundColor: color }} />
        <div style={{ marginTop: 16, color, fontSize: 12, fontWeight: 850 }}>NAME TAGS SOLUTION</div>
        <div style={{ marginTop: 5, fontSize: 18, lineHeight: 1.25, fontWeight: 790 }}>{solution}</div>
        <div style={{ marginTop: 10, fontSize: 14, color: C.muted, fontWeight: 650 }}>{outcome}</div>
      </div>
    </div>
  );
};

const ThreeStepMapScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 10.0;
  const headline = tween(frame, seconds(0.45, fps), seconds(0.7, fps));
  const flowLine = tween(frame, seconds(1.5, fps), seconds(2.9, fps));
  return (
    <Canvas background={C.wash} opacity={sceneFade(frame, duration, fps)}>
      <Grid opacity={0.10} step={46} />
      <TopTag label="The NameTags loop" />
      <div style={{ position: "absolute", left: 126, top: 144, opacity: headline, transform: `translateY(${(1 - headline) * 24}px)` }}>
        <Label color={C.cobalt}>THE FLOW IS SIMPLE</Label>
        <div style={{ marginTop: 23 }}><Headline width={920}>Three moments. Three real pain points. One connected system.</Headline></div>
      </div>
      <div style={{ position: "absolute", left: 214, top: 533, width: 1490 * flowLine, height: 3, backgroundColor: C.line }} />
      <div style={{ position: "absolute", left: 225, top: 494, display: "flex", gap: 48 }}>
        <StepMapCard step="01 · BEFORE" pain="I have no time to understand the room." solution="Subway Mode research + an interactive event brief." outcome="Arrive with context and a first question." color={C.cobalt} frame={frame} delay={1.0} />
        <StepMapCard step="02 · DURING" pain="Trading the right contact details is awkward." solution="A customized QR Room Pass with only chosen links." outcome="One scan, an intentional connection." color={C.coral} frame={frame} delay={1.45} />
        <StepMapCard step="03 · AFTER" pain="I forget who I met and never follow up." solution="Contacts, notes and an editable AI follow-up queue." outcome="The event becomes a real next step." color={C.mint} frame={frame} delay={1.9} />
      </div>
      <div style={{ position: "absolute", right: 70, bottom: 54, color: C.muted, fontSize: 15, fontWeight: 760 }}>Prepared → Connected → Followed through</div>
    </Canvas>
  );
};

const LiveDemoHandoffScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 6.6;
  const icon = spring({ frame: Math.max(0, frame - seconds(0.45, fps)), fps, config: { damping: 13, stiffness: 135 } });
  const title = tween(frame, seconds(1.05, fps), seconds(0.75, fps));
  const underline = tween(frame, seconds(1.75, fps), seconds(0.68, fps));
  const browser = tween(frame, seconds(2.25, fps), seconds(0.8, fps));
  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.09} step={50} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 158, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ opacity: icon, transform: `scale(${0.64 + icon * 0.36}) translateY(${(1 - icon) * 38}px)` }}><NIcon size={138} /></div>
        <div style={{ marginTop: 30, color: C.white, fontSize: 62, lineHeight: 1, fontWeight: 840, opacity: title, transform: `translateY(${(1 - title) * 24}px)` }}>Now see the real product.</div>
        <div style={{ marginTop: 19, color: "rgba(255,255,255,.68)", fontSize: 23, fontWeight: 580, opacity: title }}>A working app, a real QR, and the complete before / during / after flow.</div>
        <div style={{ marginTop: 35, width: 320 * underline, height: 3, backgroundColor: C.coral }} />
      </div>
      <div style={{ position: "absolute", left: 520, top: 650 - (1 - browser) * 44, width: 880, height: 210, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,.16)", backgroundColor: C.white, opacity: browser, boxShadow: "0 34px 60px rgba(0,0,0,.26)" }}>
        <div style={{ height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", backgroundColor: C.wash }}><span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: C.coral }} /><span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "#F7C25C" }} /><span style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: C.mint }} /><div style={{ marginLeft: 15, width: 460, padding: "8px 12px", borderRadius: 7, backgroundColor: C.white, color: C.muted, fontSize: 12, fontFamily: "SFMono-Regular, Menlo, monospace" }}>nametags-network.vercel.app</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, padding: 30 }}><NIcon size={66} /><div><div style={{ fontSize: 26, fontWeight: 830 }}>NameTags</div><div style={{ marginTop: 7, color: C.muted, fontSize: 16 }}>Networking, without the pressure.</div></div><div style={{ marginLeft: "auto", padding: "13px 19px", borderRadius: 10, backgroundColor: C.ink, color: C.white, fontSize: 15, fontWeight: 800 }}>Live demo →</div></div>
      </div>
    </Canvas>
  );
};

export const NameTagsFilmV2 = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const total = seconds(65, fps);
  const opacity = Math.min(tween(frame, 0, seconds(0.18, fps)), 1 - tween(frame, total - seconds(0.2, fps), seconds(0.2, fps)));
  return (
    <AbsoluteFill style={{ opacity }}>
      <Sequence from={seconds(0, fps)} durationInFrames={seconds(7.0, fps)}><CardRainScene /></Sequence>
      <Sequence from={seconds(6.4, fps)} durationInFrames={seconds(7.1, fps)}><DeskScene /></Sequence>
      <Sequence from={seconds(12.9, fps)} durationInFrames={seconds(7.1, fps)}><OrbitScene /></Sequence>
      <Sequence from={seconds(19.4, fps)} durationInFrames={seconds(7.1, fps)}><BreakthroughScene /></Sequence>
      <Sequence from={seconds(25.9, fps)} durationInFrames={seconds(8.1, fps)}><ResearchScene /></Sequence>
      <Sequence from={seconds(33.4, fps)} durationInFrames={seconds(8.3, fps)}><RoomPassScene /></Sequence>
      <Sequence from={seconds(41.1, fps)} durationInFrames={seconds(8.9, fps)}><FinalScene /></Sequence>
      <Sequence from={seconds(49.4, fps)} durationInFrames={seconds(10.0, fps)}><ThreeStepMapScene /></Sequence>
      <Sequence from={seconds(58.8, fps)} durationInFrames={seconds(6.2, fps)}><LiveDemoHandoffScene /></Sequence>
    </AbsoluteFill>
  );
};
