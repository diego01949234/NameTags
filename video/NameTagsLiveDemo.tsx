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
  const fade = sec(0.42, fps);
  const totalFrames = sec(duration, fps);
  return Math.min(tween(frame, 0, fade), 1 - tween(frame, totalFrames - fade, fade));
};

const Canvas = ({
  children,
  background,
  opacity = 1,
}: {
  children: ReactNode;
  background: string;
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

const Grid = ({ dark = false }: { dark?: boolean }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity: dark ? 0.075 : 0.06,
      backgroundImage: `linear-gradient(${dark ? "rgba(255,255,255,.7)" : "rgba(24,34,53,.5)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(255,255,255,.7)" : "rgba(24,34,53,.5)"} 1px, transparent 1px)`,
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

const BrandHeader = ({ dark = false }: { dark?: boolean }) => (
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
    <span style={{ color: dark ? "rgba(255,255,255,.6)" : C.muted, fontSize: 13, fontWeight: 760, letterSpacing: 0.4 }}>
      LIVE PRODUCT WALKTHROUGH
    </span>
  </div>
);

const FlowRail = ({ active, dark = false }: { active: number; dark?: boolean }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const steps = ["Understand the room", "Share the right card", "Follow through"];

  return (
    <div style={{ position: "absolute", left: 64, top: 130, display: "flex", gap: 8 }}>
      {steps.map((step, index) => {
        const inValue = spring({ frame: Math.max(0, frame - sec(0.14 * index, fps)), fps, config: { damping: 15, stiffness: 128 } });
        const isActive = index === active;
        const done = index < active;
        const color = [C.cobalt, C.coral, C.mint][index];
        return (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 193,
              padding: "10px 13px",
              boxSizing: "border-box",
              border: `1px solid ${isActive ? color : dark ? "rgba(255,255,255,.18)" : C.line}`,
              borderRadius: 10,
              backgroundColor: isActive ? color : dark ? "rgba(255,255,255,.05)" : C.white,
              color: isActive ? C.white : dark ? "rgba(255,255,255,.72)" : C.inkSoft,
              opacity: 0.62 + inValue * 0.38,
              transform: `translateY(${(1 - inValue) * 14}px)`,
              boxShadow: isActive ? `0 12px 28px ${color}33` : "none",
            }}
          >
            <span
              style={{
                display: "grid",
                width: 24,
                height: 24,
                placeItems: "center",
                borderRadius: 7,
                backgroundColor: isActive ? "rgba(255,255,255,.2)" : done ? color : dark ? "rgba(255,255,255,.1)" : C.wash,
                color: done && !isActive ? C.white : "inherit",
                fontSize: 11,
                fontWeight: 850,
              }}
            >
              0{index + 1}
            </span>
            <span style={{ fontSize: 14, fontWeight: 760, letterSpacing: 0 }}>{step}</span>
          </div>
        );
      })}
    </div>
  );
};

const CopyBlock = ({
  step,
  title,
  body,
  detail,
  color,
  dark = false,
  frame,
  start = 0,
  opacity = 1,
}: {
  step: string;
  title: ReactNode;
  body: ReactNode;
  detail?: ReactNode;
  color: string;
  dark?: boolean;
  frame: number;
  start?: number;
  opacity?: number;
}) => {
  const { fps } = useVideoConfig();
  const inValue = tween(frame, sec(start, fps), sec(0.58, fps));
  return (
    <div
      style={{
        position: "absolute",
        left: 76,
        top: 268,
        width: 700,
        opacity: inValue * opacity,
        transform: `translateY(${(1 - inValue) * 24}px)`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "9px 12px",
          borderRadius: 999,
          backgroundColor: dark ? `${color}44` : color === C.coral ? C.coralPale : color === C.mint ? C.mintPale : C.cobaltPale,
          color: dark ? C.white : C.ink,
          fontSize: 13,
          fontWeight: 840,
          letterSpacing: 0.2,
        }}
      >
        {step}
      </div>
      <div style={{ marginTop: 25, color: dark ? C.white : C.ink, fontSize: 64, lineHeight: 1.02, fontWeight: 850, letterSpacing: 0 }}>{title}</div>
      <div style={{ marginTop: 22, width: 600, color: dark ? "rgba(255,255,255,.68)" : C.muted, fontSize: 22, lineHeight: 1.45, fontWeight: 570 }}>{body}</div>
      {detail ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            width: 570,
            marginTop: 34,
            padding: "15px 17px",
            boxSizing: "border-box",
            border: dark ? "1px solid rgba(255,255,255,.14)" : `1px solid ${C.line}`,
            borderRadius: 12,
            backgroundColor: dark ? "rgba(255,255,255,.06)" : C.white,
            color: dark ? "rgba(255,255,255,.84)" : C.inkSoft,
            fontSize: 16,
            lineHeight: 1.35,
            fontWeight: 690,
            boxShadow: dark ? "none" : "0 14px 28px rgba(24,34,53,.07)",
          }}
        >
          <span style={{ width: 10, height: 10, flex: "0 0 auto", borderRadius: 3, backgroundColor: color }} />
          {detail}
        </div>
      ) : null}
    </div>
  );
};

const Phone = ({
  x,
  y,
  scale = 1,
  rotate = 0,
  opacity = 1,
  children,
  style,
}: {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  children: ReactNode;
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
    <div style={{ position: "absolute", zIndex: 8, top: 14, left: "50%", width: 116, height: 27, borderRadius: 16, backgroundColor: "#0F1726", transform: "translateX(-50%)" }} />
    <div style={{ position: "relative", width: 390, height: 844, overflow: "hidden", borderRadius: 34, backgroundColor: C.paper }}>{children}</div>
  </div>
);

const AppScreen = ({
  src,
  opacity = 1,
  scroll = 0,
  zoom = 1,
  offsetX = 0,
}: {
  src: string;
  opacity?: number;
  scroll?: number;
  zoom?: number;
  offsetX?: number;
}) => (
  <Img
    src={staticFile(`video-demo/${src}`)}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: 390,
      height: "auto",
      opacity,
      transform: `translate(${offsetX}px, ${scroll}px) scale(${zoom})`,
      transformOrigin: "top left",
    }}
  />
);

const Tap = ({ x, y, frame, start, color = C.coral }: { x: number; y: number; frame: number; start: number; color?: string }) => {
  const { fps } = useVideoConfig();
  const p = tween(frame, sec(start, fps), sec(0.75, fps));
  const size = 18 + p * 50;
  return (
    <>
      <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, border: `2px solid ${color}`, borderRadius: "50%", opacity: 1 - p }} />
      <div style={{ position: "absolute", left: x - 7, top: y - 7, width: 14, height: 14, border: "3px solid white", borderRadius: "50%", backgroundColor: color, boxShadow: "0 4px 12px rgba(24,34,53,.24)", opacity: p < 0.72 ? 1 : 0 }} />
    </>
  );
};

const Pointer = ({
  frame,
  start,
  duration,
  from,
  to,
  color = C.ink,
}: {
  frame: number;
  start: number;
  duration: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color?: string;
}) => {
  const { fps } = useVideoConfig();
  const p = tween(frame, sec(start, fps), sec(duration, fps), 0, 1, settleEase);
  const visible = Math.min(tween(frame, sec(start, fps), sec(0.18, fps)), 1 - tween(frame, sec(start + duration + 0.45, fps), sec(0.2, fps)));
  const x = interpolate(p, [0, 1], [from.x, to.x]);
  const y = interpolate(p, [0, 1], [from.y, to.y]);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 29,
        height: 40,
        zIndex: 11,
        opacity: visible,
        transform: `translate(-4px, -4px) rotate(-8deg) scale(${0.82 + visible * 0.18})`,
      }}
    >
      <div
        style={{
          width: 29,
          height: 40,
          backgroundColor: C.white,
          clipPath: "polygon(3% 0, 100% 48%, 62% 58%, 76% 95%, 58% 100%, 42% 64%, 4% 89%)",
          filter: `drop-shadow(0 3px 3px ${color}88)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 2,
          backgroundColor: color,
          clipPath: "polygon(3% 0, 100% 48%, 62% 58%, 76% 95%, 58% 100%, 42% 64%, 4% 89%)",
        }}
      />
    </div>
  );
};

const Focus = ({
  x,
  y,
  width,
  height,
  frame,
  start,
  color,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  frame: number;
  start: number;
  color: string;
}) => {
  const { fps } = useVideoConfig();
  const p = tween(frame, sec(start, fps), sec(0.42, fps));
  return <div style={{ position: "absolute", left: x, top: y, width, height, border: `3px solid ${color}`, borderRadius: 14, boxShadow: `0 0 0 10px ${color}22`, opacity: p, transform: `scale(${0.94 + p * 0.06})` }} />;
};

const InPhoneToast = ({ frame, start, text, color = C.mint }: { frame: number; start: number; text: string; color?: string }) => {
  const { fps } = useVideoConfig();
  const inValue = spring({ frame: Math.max(0, frame - sec(start, fps)), fps, config: { damping: 15, stiffness: 170 } });
  const out = tween(frame, sec(start + 3.1, fps), sec(0.3, fps));
  const opacity = inValue * (1 - out);
  return (
    <div
      style={{
        position: "absolute",
        left: 22,
        right: 22,
        bottom: 88,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "11px 12px",
        borderRadius: 12,
        backgroundColor: C.ink,
        color: C.white,
        boxShadow: "0 14px 30px rgba(24,34,53,.28)",
        opacity,
        transform: `translateY(${(1 - inValue) * 22}px) scale(${0.96 + inValue * 0.04})`,
        zIndex: 10,
        fontSize: 12,
        fontWeight: 760,
      }}
    >
      <span style={{ display: "grid", width: 20, height: 20, placeItems: "center", borderRadius: 7, backgroundColor: color, fontSize: 13 }}>OK</span>
      {text}
    </div>
  );
};

const ChatPanel = ({ frame, start }: { frame: number; start: number }) => {
  const { fps } = useVideoConfig();
  const panel = spring({ frame: Math.max(0, frame - sec(start, fps)), fps, config: { damping: 17, stiffness: 132 } });
  const question = spring({ frame: Math.max(0, frame - sec(start + 0.45, fps)), fps, config: { damping: 17, stiffness: 150 } });
  const answer = spring({ frame: Math.max(0, frame - sec(start + 1.05, fps)), fps, config: { damping: 17, stiffness: 140 } });
  const answerText = "Start with someone testing an early idea. Ask what they are learning before you explain your own product.";
  const typed = Math.round(tween(frame, sec(start + 1.2, fps), sec(4.0, fps)) * answerText.length);
  return (
    <div
      style={{
        position: "absolute",
        left: 77,
        top: 744,
        width: 610,
        padding: "16px 17px",
        boxSizing: "border-box",
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        backgroundColor: C.white,
        boxShadow: "0 18px 38px rgba(24,34,53,.1)",
        opacity: panel,
        transform: `translateY(${(1 - panel) * 22}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.cobalt, fontSize: 12, fontWeight: 860, letterSpacing: 0.3 }}>
        <span style={{ display: "grid", width: 20, height: 20, placeItems: "center", borderRadius: 7, backgroundColor: C.cobaltPale, fontSize: 13 }}>+</span>
        ASK NAMETAGS
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, opacity: question, transform: `translateY(${(1 - question) * 10}px)` }}>
        <div style={{ maxWidth: 340, padding: "9px 12px", borderRadius: "12px 12px 3px 12px", backgroundColor: C.cobalt, color: C.white, fontSize: 14, fontWeight: 680 }}>Who should I talk to first?</div>
      </div>
      <div style={{ display: "flex", marginTop: 10, opacity: answer, transform: `translateY(${(1 - answer) * 10}px)` }}>
        <div style={{ maxWidth: 490, padding: "10px 12px", borderRadius: "12px 12px 12px 3px", backgroundColor: C.wash, color: C.inkSoft, fontSize: 14, lineHeight: 1.36, fontWeight: 640 }}>
          {answerText.slice(0, typed)}
          {typed < answerText.length ? <span style={{ color: C.cobalt }}>|</span> : null}
        </div>
      </div>
    </div>
  );
};

const FeatureFlow = ({
  frame,
  start,
  items,
  color,
}: {
  frame: number;
  start: number;
  items: string[];
  color: string;
}) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 77, top: 772, display: "flex", alignItems: "center", gap: 8 }}>
      {items.map((item, index) => {
        const inValue = spring({ frame: Math.max(0, frame - sec(start + index * 0.3, fps)), fps, config: { damping: 16, stiffness: 136 } });
        return (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, opacity: inValue, transform: `translateY(${(1 - inValue) * 14}px)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", borderRadius: 10, backgroundColor: color === C.coral ? C.coralPale : color === C.mint ? C.mintPale : C.cobaltPale, color: C.inkSoft, fontSize: 14, fontWeight: 770, whiteSpace: "nowrap" }}>
              <span style={{ display: "grid", width: 20, height: 20, placeItems: "center", borderRadius: 6, backgroundColor: color, color: C.white, fontSize: 10, fontWeight: 850 }}>0{index + 1}</span>
              {item}
            </div>
            {index < items.length - 1 ? <span style={{ color: C.muted, fontSize: 16, fontWeight: 800 }}>-&gt;</span> : null}
          </div>
        );
      })}
    </div>
  );
};

const ScanLine = ({ frame, start }: { frame: number; start: number }) => {
  const { fps } = useVideoConfig();
  const p = tween(frame, sec(start, fps), sec(2.2, fps), 0, 1, settleEase);
  return (
    <>
      <div style={{ position: "absolute", left: 1062, top: 278, width: 320, height: 320, border: `2px solid ${C.coral}`, borderRadius: 22, opacity: 0.45 + Math.sin(frame / 4) * 0.18 }} />
      <div style={{ position: "absolute", left: 1072, top: 296 + p * 270, width: 300, height: 3, backgroundColor: C.coral, boxShadow: "0 0 18px rgba(232,109,80,.78)" }} />
      <div style={{ position: "absolute", left: 1400, top: 519, width: p * 128, height: 2, backgroundColor: C.coral, transformOrigin: "left", opacity: 0.75 }} />
    </>
  );
};

const OpeningScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 9.4;
  const phone = spring({ frame: Math.max(0, frame - sec(0.2, fps)), fps, config: { damping: 17, stiffness: 108 } });
  return (
    <Canvas background={C.ink} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid dark />
      <BrandHeader dark />
      <FlowRail active={0} dark />
      <CopyBlock
        step="THE CALMER EVENT FLOW"
        color={C.coral}
        dark
        frame={frame}
        title={<>One room.<br />One clear next step.</>}
        body={<>NameTags helps Diego understand the room, show only the right links, and follow through while the conversation is still fresh.</>}
        detail={<>A working mobile product walkthrough, not a concept screen.</>}
      />
      <Phone x={1182} y={104} scale={0.94 + phone * 0.07} rotate={interpolate(phone, [0, 1], [7, -2])} opacity={phone}>
        <AppScreen src="mobile-events.png" />
      </Phone>
    </Canvas>
  );
};

const ResearchScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 28.4;
  const phone = spring({ frame: Math.max(0, frame - sec(0.15, fps)), fps, config: { damping: 17, stiffness: 116 } });
  const result = tween(frame, sec(7.6, fps), sec(0.72, fps));
  const scroll = -tween(frame, sec(12.2, fps), sec(5.3, fps), 0, 560, settleEase);
  const calmZoom = tween(frame, sec(10.8, fps), sec(8.6, fps), 1, 1.035, settleEase);
  return (
    <Canvas background={C.paper} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid />
      <BrandHeader />
      <FlowRail active={0} />
      <CopyBlock
        step="01 - BEFORE"
        color={C.cobalt}
        frame={frame}
        title={<>Understand the room<br />before you enter.</>}
        body={<>Paste an event link, screenshot, or rough note. Ask the question you actually have, then get an event read and a path into the room.</>}
        detail={<>Diego asks: “Who should I talk to first?”</>}
      />
      <Phone x={1182} y={104} scale={(0.95 + phone * 0.05) * calmZoom} rotate={interpolate(phone, [0, 1], [7, -2])} opacity={phone}>
        <AppScreen src="mobile-research-question.png" opacity={1 - result} />
        <AppScreen src="mobile-research-full.png" opacity={result} scroll={scroll} />
        <Pointer frame={frame} start={5.1} duration={1.15} from={{ x: 252, y: 530 }} to={{ x: 337, y: 512 }} color={C.cobalt} />
        <Tap x={338} y={512} frame={frame} start={6.2} color={C.cobalt} />
        <Focus x={27} y={472} width={333} height={50} frame={frame} start={5.82} color={C.cobalt} />
      </Phone>
      <ChatPanel frame={frame} start={13.2} />
    </Canvas>
  );
};

const ShareScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 34.6;
  const phone = spring({ frame: Math.max(0, frame - sec(0.1, fps)), fps, config: { damping: 17, stiffness: 120 } });
  const privacyChoice = tween(frame, sec(7.0, fps), sec(0.7, fps));
  const qrStage = tween(frame, sec(14.4, fps), sec(0.72, fps));
  const selectionGone = tween(frame, sec(16.2, fps), sec(0.55, fps));
  const selectionX = interpolate(qrStage, [0, 1], [1182, 1462]);
  const selectionY = interpolate(qrStage, [0, 1], [104, 332]);
  const selectionScale = interpolate(qrStage, [0, 1], [1, 0.48]);
  const qrIn = spring({ frame: Math.max(0, frame - sec(14.4, fps)), fps, config: { damping: 17, stiffness: 115 } });
  const scannerIn = spring({ frame: Math.max(0, frame - sec(17.4, fps)), fps, config: { damping: 16, stiffness: 124 } });
  return (
    <Canvas background={C.wash} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid />
      <BrandHeader />
      <FlowRail active={1} />
      <CopyBlock
        step="02 - DURING"
        color={C.coral}
        frame={frame}
        opacity={1 - qrStage}
        title={<>Choose the version<br />this room meets.</>}
        body={<>Use the actual scanner preview to decide which links are public. Research, private notes, and hidden links stay with Diego.</>}
        detail={<>One public link. One private link. The boundary is visible before anyone scans.</>}
      />
      <CopyBlock
        step="02 - DURING"
        color={C.coral}
        frame={frame}
        opacity={qrStage}
        title={<>One QR.<br />One clear exchange.</>}
        body={<>The room pass opens a lightweight public card. The other person can keep Diego’s selected link and opt into a way back.</>}
        detail={<>No hunting for the right app, profile, or contact channel.</>}
      />
      <Phone x={selectionX} y={selectionY} scale={(0.95 + phone * 0.05) * selectionScale} rotate={interpolate(phone, [0, 1], [7, -2])} opacity={phone * (1 - selectionGone)}>
        <AppScreen src="mobile-links-diego.png" opacity={1 - privacyChoice} />
        <AppScreen src="mobile-links-private-diego.png" opacity={privacyChoice} />
        <Pointer frame={frame} start={4.7} duration={1.15} from={{ x: 317, y: 378 }} to={{ x: 294, y: 332 }} color={C.coral} />
        <Tap x={294} y={332} frame={frame} start={5.75} color={C.coral} />
        <Focus x={29} y={221} width={334} height={82} frame={frame} start={5.42} color={C.coral} />
      </Phone>
      <div style={{ position: "absolute", left: 1004, top: 104, opacity: qrIn, transform: `translateY(${(1 - qrIn) * 48}px) scale(${0.86 + qrIn * 0.14})` }}>
        <Phone x={0} y={0} scale={0.96} rotate={-2}>
          <AppScreen src="mobile-qr-diego.png" />
        </Phone>
      </div>
      {qrStage > 0.1 ? <ScanLine frame={frame} start={17.0} /> : null}
      <div
        style={{
          position: "absolute",
          left: 1501,
          top: 335,
          opacity: scannerIn,
          transform: `translateY(${(1 - scannerIn) * 46}px) rotate(5deg) scale(${0.5 + scannerIn * 0.16})`,
          transformOrigin: "center",
        }}
      >
        <Phone x={0} y={0} scale={0.66} rotate={0}>
          <AppScreen src="mobile-links-diego.png" zoom={1.01} />
        </Phone>
      </div>
      <FeatureFlow frame={frame} start={21.4} color={C.coral} items={["QR room pass", "Public card", "Opt-in connection"]} />
    </Canvas>
  );
};

const FollowUpScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 24.4;
  const phone = spring({ frame: Math.max(0, frame - sec(0.1, fps)), fps, config: { damping: 17, stiffness: 116 } });
  const detailZoom = tween(frame, sec(8.2, fps), sec(8.0, fps), 1, 1.035, settleEase);
  return (
    <Canvas background={C.paper} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid />
      <BrandHeader />
      <FlowRail active={2} />
      <CopyBlock
        step="03 - AFTER"
        color={C.mint}
        frame={frame}
        title={<>Follow through<br />while it is fresh.</>}
        body={<>Each connection carries the memory, the promise, and an editable AI draft. Diego reviews, copies it to the usual channel, then marks it sent.</>}
        detail={<>AI does the organizing. Diego keeps control of the message.</>}
      />
      <Phone x={1182} y={104} scale={(0.95 + phone * 0.05) * detailZoom} rotate={interpolate(phone, [0, 1], [7, -2])} opacity={phone}>
        <AppScreen src="mobile-follow-up-diego.png" />
        <Pointer frame={frame} start={6.1} duration={1.1} from={{ x: 310, y: 660 }} to={{ x: 234, y: 728 }} color={C.mint} />
        <Tap x={234} y={728} frame={frame} start={7.15} color={C.mint} />
        <Focus x={42} y={687} width={307} height={60} frame={frame} start={6.74} color={C.mint} />
        <InPhoneToast frame={frame} start={7.7} text="Draft copied - review it before you send." />
      </Phone>
      <FeatureFlow frame={frame} start={11.8} color={C.mint} items={["Who you met", "What you promised", "Ready to send"]} />
    </Canvas>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = 6.4;
  const mark = spring({ frame: Math.max(0, frame - sec(0.12, fps)), fps, config: { damping: 13, stiffness: 136 } });
  const title = tween(frame, sec(0.55, fps), sec(0.55, fps));
  const cards = [
    ["01", "Understand the room", C.cobalt],
    ["02", "Share the right card", C.coral],
    ["03", "Follow through", C.mint],
  ] as const;
  return (
    <Canvas background={C.ink} opacity={sceneOpacity(frame, duration, fps)}>
      <Grid dark />
      <BrandHeader dark />
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ opacity: mark, transform: `scale(${0.62 + mark * 0.38}) translateY(${(1 - mark) * 30}px)` }}><NMark size={116} /></div>
        <div style={{ marginTop: 22, color: C.white, fontSize: 66, fontWeight: 850, lineHeight: 1, opacity: title }}>NameTags</div>
        <div style={{ marginTop: 14, color: "rgba(255,255,255,.66)", fontSize: 25, fontWeight: 620, opacity: title }}>Networking, without the pressure.</div>
      </div>
      <div style={{ position: "absolute", left: 320, top: 615, display: "flex", gap: 14 }}>
        {cards.map(([number, label, color], index) => {
          const inValue = spring({ frame: Math.max(0, frame - sec(1.4 + index * 0.16, fps)), fps, config: { damping: 15, stiffness: 128 } });
          return (
            <div key={number} style={{ width: 400, padding: "19px 22px", boxSizing: "border-box", border: "1px solid rgba(255,255,255,.14)", borderRadius: 13, backgroundColor: "rgba(255,255,255,.06)", color: C.white, opacity: inValue, transform: `translateY(${(1 - inValue) * 24}px)` }}>
              <div style={{ color, fontSize: 13, fontWeight: 860 }}>{number}</div>
              <div style={{ marginTop: 7, fontSize: 20, fontWeight: 760 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </Canvas>
  );
};

export const NameTagsLiveDemo = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const total = sec(100, fps);
  const fullOpacity = Math.min(tween(frame, 0, sec(0.14, fps)), 1 - tween(frame, total - sec(0.18, fps), sec(0.18, fps)));
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, opacity: fullOpacity }}>
      <Sequence from={sec(0, fps)} durationInFrames={sec(9.4, fps)}><OpeningScene /></Sequence>
      <Sequence from={sec(8.6, fps)} durationInFrames={sec(28.4, fps)}><ResearchScene /></Sequence>
      <Sequence from={sec(36.2, fps)} durationInFrames={sec(34.6, fps)}><ShareScene /></Sequence>
      <Sequence from={sec(70, fps)} durationInFrames={sec(24.4, fps)}><FollowUpScene /></Sequence>
      <Sequence from={sec(93.6, fps)} durationInFrames={sec(6.4, fps)}><ClosingScene /></Sequence>
    </AbsoluteFill>
  );
};
