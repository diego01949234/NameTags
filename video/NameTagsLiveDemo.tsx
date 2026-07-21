import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
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

const between = (
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

const sceneFade = (frame: number, duration: number, fps: number) => {
  const fadeFrames = sec(0.48, fps);
  return Math.min(
    between(frame, 0, fadeFrames),
    1 - between(frame, sec(duration, fps) - fadeFrames, fadeFrames),
  );
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
  const { height, width } = useVideoConfig();
  const scale = Math.min(width / 1920, height / 1080);

  return (
    <AbsoluteFill style={{ backgroundColor: background, opacity, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: (height - 1080 * scale) / 2,
          left: (width - 1920 * scale) / 2,
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
          color: C.ink,
          fontFamily: font,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const Grid = ({ dark = false, opacity = 0.08 }: { dark?: boolean; opacity?: number }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,.6)" : "rgba(24,34,53,.42)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,.6)" : "rgba(24,34,53,.42)"} 1px, transparent 1px)`,
      backgroundSize: "46px 46px",
    }}
  />
);

const NIcon = ({ size = 44 }: { size?: number }) => (
  <div
    style={{
      display: "flex",
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Math.max(10, Math.round(size * 0.24)),
      backgroundColor: C.coral,
      color: C.white,
      fontSize: Math.round(size * 0.66),
      fontWeight: 900,
      lineHeight: 1,
      boxShadow: "0 16px 28px rgba(232,109,80,.22)",
    }}
  >
    N
  </div>
);

const Topline = ({ label, dark = false }: { label: string; dark?: boolean }) => (
  <div
    style={{
      position: "absolute",
      top: 55,
      left: 76,
      display: "flex",
      alignItems: "center",
      gap: 12,
      color: dark ? "rgba(255,255,255,.7)" : C.muted,
      fontSize: 15,
      fontWeight: 830,
      letterSpacing: 0,
      textTransform: "uppercase",
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: C.coral }} />
    {label}
  </div>
);

const Pill = ({ children, color = C.cobalt }: { children: ReactNode; color?: string }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "9px 12px",
      borderRadius: 999,
      backgroundColor: color === C.coral ? C.coralPale : color === C.mint ? C.mintPale : C.cobaltPale,
      color: C.ink,
      fontSize: 13,
      fontWeight: 820,
      lineHeight: 1,
      letterSpacing: 0,
    }}
  >
    {children}
  </div>
);

const AppScreen = ({
  src,
  scroll = 0,
  zoom = 1,
  dim = 0,
}: {
  src: string;
  scroll?: number;
  zoom?: number;
  dim?: number;
}) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: C.paper }}>
    <Img
      src={staticFile(`video-demo/${src}`)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 390,
        height: "auto",
        transform: `translateY(${scroll}px) scale(${zoom})`,
        transformOrigin: "top left",
      }}
    />
    {dim > 0 ? <div style={{ position: "absolute", inset: 0, backgroundColor: C.ink, opacity: dim }} /> : null}
  </div>
);

const Phone = ({
  x,
  y,
  scale = 1,
  rotate = 0,
  opacity = 1,
  screen,
  style,
}: {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  screen: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: 426,
      height: 880,
      padding: 11,
      boxSizing: "border-box",
      overflow: "hidden",
      border: "5px solid #0F1726",
      borderRadius: 51,
      backgroundColor: "#0F1726",
      boxShadow: "0 42px 92px rgba(24,34,53,.28)",
      opacity,
      transform: `perspective(1100px) rotateY(${rotate}deg) scale(${scale})`,
      transformOrigin: "center",
      ...style,
    }}
  >
    <div style={{ position: "absolute", zIndex: 4, top: 14, left: "50%", width: 116, height: 27, borderRadius: 16, backgroundColor: "#0F1726", transform: "translateX(-50%)" }} />
    <div style={{ position: "relative", width: 390, height: 844, overflow: "hidden", borderRadius: 34, backgroundColor: C.paper }}>{screen}</div>
  </div>
);

const Caption = ({
  step,
  title,
  body,
  color = C.cobalt,
  dark = false,
  frame,
  from = 0,
}: {
  step: string;
  title: ReactNode;
  body: ReactNode;
  color?: string;
  dark?: boolean;
  frame: number;
  from?: number;
}) => {
  const { fps } = useVideoConfig();
  const inValue = between(frame, sec(from, fps), sec(0.65, fps));
  return (
    <div style={{ position: "absolute", left: 118, top: 222, width: 680, opacity: inValue, transform: `translateY(${(1 - inValue) * 30}px)` }}>
      <Pill color={color}>{step}</Pill>
      <div style={{ marginTop: 28, color: dark ? C.white : C.ink, fontSize: 64, lineHeight: 1.01, fontWeight: 830, letterSpacing: 0 }}>{title}</div>
      <div style={{ marginTop: 24, width: 570, color: dark ? "rgba(255,255,255,.68)" : C.muted, fontSize: 22, lineHeight: 1.42, fontWeight: 570 }}>{body}</div>
    </div>
  );
};

const Subtitle = ({
  children,
  frame,
  start,
  end,
  dark = false,
}: {
  children: ReactNode;
  frame: number;
  start: number;
  end: number;
  dark?: boolean;
}) => {
  const { fps } = useVideoConfig();
  const opacity = Math.min(
    between(frame, sec(start, fps), sec(0.36, fps)),
    1 - between(frame, sec(end, fps) - sec(0.32, fps), sec(0.32, fps)),
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 118,
        bottom: 73,
        maxWidth: 720,
        padding: "13px 17px",
        border: dark ? "1px solid rgba(255,255,255,.16)" : `1px solid ${C.line}`,
        borderRadius: 11,
        backgroundColor: dark ? "rgba(255,255,255,.08)" : C.white,
        color: dark ? C.white : C.ink,
        boxShadow: dark ? "none" : "0 14px 30px rgba(24,34,53,.08)",
        fontSize: 18,
        lineHeight: 1.3,
        fontWeight: 680,
        opacity,
        transform: `translateY(${(1 - opacity) * 14}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Tap = ({ x, y, frame, start, color = C.coral }: { x: number; y: number; frame: number; start: number; color?: string }) => {
  const { fps } = useVideoConfig();
  const p = between(frame, sec(start, fps), sec(0.86, fps));
  const ring = 24 + p * 54;
  return (
    <>
      <div style={{ position: "absolute", left: x - ring / 2, top: y - ring / 2, width: ring, height: ring, border: `2px solid ${color}`, borderRadius: "50%", opacity: 1 - p, transform: `scale(${0.72 + p * 0.38})` }} />
      <div style={{ position: "absolute", left: x - 8, top: y - 8, width: 16, height: 16, border: `3px solid ${C.white}`, borderRadius: "50%", backgroundColor: color, boxShadow: "0 4px 12px rgba(24,34,53,.24)", opacity: p < 0.8 ? 1 : 0 }} />
    </>
  );
};

const Focus = ({
  x,
  y,
  width,
  height,
  frame,
  start,
  color = C.coral,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  frame: number;
  start: number;
  color?: string;
}) => {
  const { fps } = useVideoConfig();
  const p = between(frame, sec(start, fps), sec(0.45, fps));
  return <div style={{ position: "absolute", left: x, top: y, width, height, border: `3px solid ${color}`, borderRadius: 14, boxShadow: `0 0 0 10px ${color}22`, opacity: p, transform: `scale(${0.93 + p * 0.07})` }} />;
};

const Scan = ({ x, y, frame, start }: { x: number; y: number; frame: number; start: number }) => {
  const { fps } = useVideoConfig();
  const p = between(frame, sec(start, fps), sec(2.8, fps), 0, 1, settleEase);
  return (
    <>
      <div style={{ position: "absolute", left: x - 176, top: y - 176, width: 352, height: 352, border: `2px solid ${C.coral}`, borderRadius: 22, opacity: 0.6 + Math.sin(frame / 4) * 0.18 }} />
      <div style={{ position: "absolute", left: x - 168, top: y - 150 + p * 300, width: 336, height: 3, backgroundColor: C.coral, boxShadow: "0 0 18px rgba(232,109,80,.75)" }} />
    </>
  );
};

const OpeningScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 10.0;
  const phoneIn = spring({ frame: Math.max(0, frame - sec(0.3, fps)), fps, config: { damping: 16, stiffness: 110 } });
  const phoneZoom = between(frame, sec(2.0, fps), sec(6.4, fps), 0.9, 1.04, settleEase);
  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.07} />
      <Topline label="NameTags live mobile demo" dark />
      <Caption step="A 90-SECOND WALKTHROUGH" color={C.coral} dark frame={frame} title={<>Networking, without<br />the pressure.</>} body={<>One real event flow: understand the room, exchange the right details, then follow through.</>} />
      <Phone x={1216} y={78} scale={(0.84 + phoneIn * 0.16) * phoneZoom} rotate={interpolate(phoneIn, [0, 1], [10, -3])} opacity={phoneIn} screen={<AppScreen src="mobile-events.png" zoom={1.02} />} />
      <div style={{ position: "absolute", right: 91, top: 82, display: "flex", alignItems: "center", gap: 11 }}><NIcon size={42} /><span style={{ color: C.white, fontSize: 21, fontWeight: 820 }}>nametags</span></div>
      <Subtitle frame={frame} start={1.3} end={8.9} dark>You arrive with a real event, not a blank dashboard.</Subtitle>
    </Canvas>
  );
};

const ResearchScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 20.5;
  const phoneIn = spring({ frame: Math.max(0, frame - sec(0.1, fps)), fps, config: { damping: 17, stiffness: 118 } });
  const scroll = -between(frame, sec(6.3, fps), sec(8.4, fps), 0, 970, settleEase);
  const zoom = between(frame, sec(3.0, fps), sec(14.4, fps), 0.95, 1.07, settleEase);
  const callout = between(frame, sec(10.6, fps), sec(0.55, fps));
  return (
    <Canvas background={C.paper} opacity={sceneFade(frame, duration, fps)}>
      <Grid opacity={0.08} />
      <Topline label="01 - Before the room" />
      <Caption step="SUBWAY MODE" color={C.cobalt} frame={frame} title={<>Understand the room<br />before you walk in.</>} body={<>Paste an event link, screenshot, or rough note. The app turns it into an event read, signals to notice, and questions worth asking.</>} />
      <Phone x={1190} y={80} scale={(0.88 + phoneIn * 0.12) * zoom} rotate={interpolate(phoneIn, [0, 1], [8, -2])} opacity={phoneIn} screen={<AppScreen src="mobile-research-full.png" scroll={scroll} />} />
      <Tap x={1416} y={666} frame={frame} start={5.4} color={C.cobalt} />
      <Focus x={1265} y={600} width={315} height={110} frame={frame} start={5.05} color={C.cobalt} />
      <div style={{ position: "absolute", left: 118, top: 755, width: 590, padding: "17px 19px", borderRadius: 13, backgroundColor: C.cobaltPale, opacity: callout, transform: `translateY(${(1 - callout) * 18}px)` }}>
        <div style={{ color: C.cobalt, fontSize: 12, fontWeight: 850 }}>THE INTERACTION</div>
        <div style={{ marginTop: 7, fontSize: 18, lineHeight: 1.35, fontWeight: 720 }}>Ask NameTags a follow-up in your own words. It keeps your profile context private and uses it only to make the advice specific.</div>
      </div>
      <Subtitle frame={frame} start={1.2} end={6.4}>The first job is not a pitch. It is knowing what matters in this room.</Subtitle>
      <Subtitle frame={frame} start={7.5} end={15.9}>Scroll through the event read, then tap a question or ask your own.</Subtitle>
      <Subtitle frame={frame} start={16.3} end={19.9}>Research stays private. You decide what eventually gets shared.</Subtitle>
    </Canvas>
  );
};

const LinksScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 18.5;
  const phoneIn = spring({ frame: Math.max(0, frame - sec(0.1, fps)), fps, config: { damping: 16, stiffness: 122 } });
  const focusZoom = between(frame, sec(6.0, fps), sec(8.4, fps), 0.93, 1.09, settleEase);
  const privacy = between(frame, sec(10.1, fps), sec(0.65, fps));
  return (
    <Canvas background={C.wash} opacity={sceneFade(frame, duration, fps)}>
      <Grid opacity={0.08} />
      <Topline label="02 - During the room" />
      <Caption step="LINKS FOR THIS ROOM" color={C.coral} frame={frame} title={<>Choose what this<br />QR should share.</>} body={<>The scanner preview shows exactly what opens. Event research and private profile context never cross into the public card.</>} />
      <Phone x={1172} y={74} scale={(0.87 + phoneIn * 0.13) * focusZoom} rotate={interpolate(phoneIn, [0, 1], [8, -3])} opacity={phoneIn} screen={<AppScreen src="mobile-links-annie.png" />} />
      <Focus x={1288} y={318} width={330} height={253} frame={frame} start={3.3} color={C.coral} />
      <Tap x={1468} y={692} frame={frame} start={7.8} color={C.coral} />
      <div style={{ position: "absolute", left: 121, top: 750, width: 582, padding: "17px 19px", borderRadius: 13, backgroundColor: C.coralPale, opacity: privacy, transform: `translateY(${(1 - privacy) * 18}px)` }}>
        <div style={{ color: C.coral, fontSize: 12, fontWeight: 850 }}>PRIVACY IS VISIBLE</div>
        <div style={{ marginTop: 7, fontSize: 18, lineHeight: 1.35, fontWeight: 720 }}>The app explains what is public. The person scanning never sees the research, hidden links, or private notes.</div>
      </div>
      <Subtitle frame={frame} start={1.0} end={8.7}>Pick the two links that make sense for this event. Not every link belongs in every room.</Subtitle>
      <Subtitle frame={frame} start={9.4} end={17.8}>The preview makes the privacy boundary obvious before anyone scans.</Subtitle>
    </Canvas>
  );
};

const QrScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 16.5;
  const phoneIn = spring({ frame: Math.max(0, frame - sec(0.15, fps)), fps, config: { damping: 14, stiffness: 124 } });
  const heroZoom = between(frame, sec(2.1, fps), sec(9.2, fps), 0.93, 1.08, settleEase);
  const receiverIn = spring({ frame: Math.max(0, frame - sec(7.5, fps)), fps, config: { damping: 16, stiffness: 118 } });
  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.08} />
      <Topline label="03 - One clean scan" dark />
      <Caption step="YOUR QR ROOM PASS" color={C.coral} dark frame={frame} title={<>One QR. Only the<br />links you choose.</>} body={<>Hold up the pass. The other person gets a clear, mobile public card and can decide whether to share a way back.</>} />
      <Phone x={1105} y={73} scale={(0.86 + phoneIn * 0.14) * heroZoom} rotate={interpolate(phoneIn, [0, 1], [7, -2])} opacity={phoneIn} screen={<AppScreen src="mobile-qr-annie.png" />} />
      <Scan x={1318} y={556} frame={frame} start={4.4} />
      <div style={{ position: "absolute", left: 1582, top: 406, width: 150, height: 270, padding: 7, boxSizing: "border-box", overflow: "hidden", border: "4px solid rgba(255,255,255,.84)", borderRadius: 24, backgroundColor: C.paper, boxShadow: "0 20px 46px rgba(0,0,0,.35)", opacity: receiverIn, transform: `rotate(7deg) scale(${0.7 + receiverIn * 0.3}) translateY(${(1 - receiverIn) * 50}px)` }}>
        <div style={{ position: "relative", width: 132, height: 252, overflow: "hidden", borderRadius: 17 }}><AppScreen src="mobile-links-annie.png" zoom={1.18} /></div>
      </div>
      <div style={{ position: "absolute", left: 1522, top: 722, width: 246, color: "rgba(255,255,255,.7)", fontSize: 15, lineHeight: 1.34, fontWeight: 680, opacity: receiverIn }}>The scanner preview becomes the public experience - no research or private notes included.</div>
      <Subtitle frame={frame} start={1.2} end={7.7} dark>Share the pass instead of hunting for the right app, profile, or contact method.</Subtitle>
      <Subtitle frame={frame} start={8.2} end={15.7} dark>The QR is designed for a real phone screen and a real conversation.</Subtitle>
    </Canvas>
  );
};

const FollowUpScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 20.5;
  const phoneIn = spring({ frame: Math.max(0, frame - sec(0.1, fps)), fps, config: { damping: 16, stiffness: 118 } });
  const scroll = -between(frame, sec(7.2, fps), sec(8.0, fps), 0, 1010, settleEase);
  const zoom = between(frame, sec(2.0, fps), sec(16.5, fps), 0.95, 1.07, settleEase);
  const plan = between(frame, sec(11.3, fps), sec(0.55, fps));
  return (
    <Canvas background={C.paper} opacity={sceneFade(frame, duration, fps)}>
      <Grid opacity={0.08} />
      <Topline label="04 - After the room" />
      <Caption step="FOLLOW THROUGH" color={C.mint} frame={frame} title={<>Turn a conversation<br />into one next step.</>} body={<>Keep the person, what you discussed, and a tailored draft in one place. Review it, edit it, then send through your normal channel.</>} />
      <Phone x={1190} y={80} scale={(0.88 + phoneIn * 0.12) * zoom} rotate={interpolate(phoneIn, [0, 1], [8, -2])} opacity={phoneIn} screen={<AppScreen src="mobile-follow-up-full.png" scroll={scroll} />} />
      <Focus x={1263} y={422} width={318} height={190} frame={frame} start={3.6} color={C.mint} />
      <Tap x={1419} y={648} frame={frame} start={5.8} color={C.mint} />
      <div style={{ position: "absolute", left: 118, top: 755, width: 590, padding: "17px 19px", borderRadius: 13, backgroundColor: C.mintPale, opacity: plan, transform: `translateY(${(1 - plan) * 18}px)` }}>
        <div style={{ color: C.mint, fontSize: 12, fontWeight: 850 }}>AI DOES THE LABOR, YOU SEND</div>
        <div style={{ marginTop: 7, fontSize: 18, lineHeight: 1.35, fontWeight: 720 }}>NameTags prioritizes the thread and proposes a draft. It never sends a message without your review.</div>
      </div>
      <Subtitle frame={frame} start={1.2} end={7.3}>Capture the promise while it is fresh. Keep the context attached to the person.</Subtitle>
      <Subtitle frame={frame} start={8.2} end={15.9}>The AI draft is editable. Copy it to the channel you already use, then mark it sent.</Subtitle>
      <Subtitle frame={frame} start={16.6} end={19.9}>The goal is not more contacts. It is one real next step.</Subtitle>
    </Canvas>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 9.0;
  const mark = spring({ frame: Math.max(0, frame - sec(0.35, fps)), fps, config: { damping: 13, stiffness: 136 } });
  const title = between(frame, sec(0.9, fps), sec(0.7, fps));
  const stages = ["Understand", "Share", "Follow through"];
  return (
    <Canvas background={C.ink} opacity={sceneFade(frame, duration, fps)}>
      <Grid dark opacity={0.08} />
      <div style={{ position: "absolute", top: 148, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ opacity: mark, transform: `scale(${0.62 + mark * 0.38}) translateY(${(1 - mark) * 38}px)` }}><NIcon size={140} /></div>
        <div style={{ marginTop: 28, color: C.white, fontSize: 68, fontWeight: 840, lineHeight: 1, opacity: title, transform: `translateY(${(1 - title) * 24}px)` }}>NameTags</div>
        <div style={{ marginTop: 16, color: "rgba(255,255,255,.72)", fontSize: 27, fontWeight: 600, opacity: title }}>Networking, without the pressure.</div>
      </div>
      <div style={{ position: "absolute", left: 360, top: 578, display: "flex", gap: 14 }}>
        {stages.map((stage, index) => {
          const item = spring({ frame: Math.max(0, frame - sec(2.0 + index * 0.35, fps)), fps, config: { damping: 15, stiffness: 125 } });
          return (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12, width: 352, padding: "20px 22px", boxSizing: "border-box", border: "1px solid rgba(255,255,255,.14)", borderRadius: 13, backgroundColor: "rgba(255,255,255,.06)", color: C.white, opacity: item, transform: `translateY(${(1 - item) * 30}px)` }}>
              <span style={{ display: "flex", width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: [C.cobalt, C.coral, C.mint][index], fontSize: 15, fontWeight: 850 }}>0{index + 1}</span>
              <span style={{ fontSize: 20, fontWeight: 760 }}>{stage}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 82, textAlign: "center", color: "rgba(255,255,255,.54)", fontSize: 17, fontWeight: 650, opacity: title }}>See the working app at nametags-network.vercel.app</div>
    </Canvas>
  );
};

export const NameTagsLiveDemo = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const total = sec(90, fps);
  const fullOpacity = Math.min(between(frame, 0, sec(0.16, fps)), 1 - between(frame, total - sec(0.22, fps), sec(0.22, fps)));
  return (
    <AbsoluteFill style={{ opacity: fullOpacity }}>
      <Sequence from={sec(0, fps)} durationInFrames={sec(10, fps)}><OpeningScene /></Sequence>
      <Sequence from={sec(9.45, fps)} durationInFrames={sec(20.5, fps)}><ResearchScene /></Sequence>
      <Sequence from={sec(29.4, fps)} durationInFrames={sec(18.5, fps)}><LinksScene /></Sequence>
      <Sequence from={sec(47.3, fps)} durationInFrames={sec(16.5, fps)}><QrScene /></Sequence>
      <Sequence from={sec(63.2, fps)} durationInFrames={sec(20.5, fps)}><FollowUpScene /></Sequence>
      <Sequence from={sec(82.8, fps)} durationInFrames={sec(7.2, fps)}><ClosingScene /></Sequence>
    </AbsoluteFill>
  );
};
