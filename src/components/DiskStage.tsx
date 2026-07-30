import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { Friend, TrackMeta } from "../types";
import { BESTIE_ID, ME_ID } from "../data/friends";
import diskImg from "../assets/music-player-disk.png";
import styles from "./DiskStage.module.css";

/* 三条车道半径（cx = 舞台半宽的倍数）。盘面实测可跑区间为 0.551（中孔边缘）
   到 0.957（盘面外缘），车道落在其中，确保小人踩在唱片纹路上而不是封面上。 */
const LANE_RX = [0.65, 0.76, 0.87];
/* 萝卜以身体中心对齐赛道，因此原尺寸也能完整留在中孔与外缘之间。 */
const FAN_LANE_RX = [0.76, 0.8, 0.84];
const RY_RATIO = 0.94;
const GOLDEN = 2.399963;
const HIFIVE_DIST = 28;
const HIFIVE_COOLDOWN = 12;
const ENTER_DURATION = 0.8;
const EXIT_WAVE = 0.45;
const EXIT_DURATION = 0.95;
const TWO_PI = Math.PI * 2;

type Sim = {
  friend: Friend;
  lane: number;
  theta: number;
  pace: number;
  phase: "enter" | "run" | "exit";
  phaseT: number;
  enterDelay: number;
  freezeUntil: number;
  boostUntil: number;
  boost: number;
  lastPose: string;
  lastBaton: boolean;
  lastShout: string;
};

type FX = {
  id: number;
  kind: "hifive" | "heart" | "relay";
  x: number;
  y: number;
};

type Props = {
  track: TrackMeta;
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  /** 跑道上的所有人（含正在退场的），按加入顺序 */
  runners: Friend[];
  exitingIds: string[];
  reducedMotion: boolean;
  onExitDone: (id: string) => void;
  onHighFive: (a: Friend, b: Friend) => void;
  onLap: () => void;
  onRelay: () => void;
  onRunnerClick: (f: Friend) => void;
};

function paceOf(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 0.94 + (h % 13) / 100;
}

function normAngle(a: number): number {
  let r = a % TWO_PI;
  if (r > Math.PI) r -= TWO_PI;
  if (r < -Math.PI) r += TWO_PI;
  return r;
}

function lerpAngle(from: number, to: number, p: number): number {
  return from + normAngle(to - from) * p;
}

function easeInOut(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  return c * c * (3 - 2 * c);
}

export default function DiskStage({
  track,
  audioRef,
  isPlaying,
  runners,
  exitingIds,
  reducedMotion,
  onExitDone,
  onHighFive,
  onLap,
  onRelay,
  onRunnerClick,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 320, h: 320 });
  const simsRef = useRef<Map<string, Sim>>(new Map());
  const elsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const joinCountRef = useRef(0);
  const [fxs, setFxs] = useState<FX[]>([]);
  const [neonOn, setNeonOn] = useState(false);

  const propsRef = useRef({
    track,
    isPlaying,
    reducedMotion,
    onExitDone,
    onHighFive,
    onLap,
    onRelay,
  });
  propsRef.current = {
    track,
    isPlaying,
    reducedMotion,
    onExitDone,
    onHighFive,
    onLap,
    onRelay,
  };

  const transientRef = useRef({
    clock: 0,
    lastAudioT: 0,
    cooldown: new Map<string, number>(),
    relay: {
      cueId: "",
      passed: false,
      fired: new Set<string>(),
      followerId: "",
      leaderId: "",
      batonId: "",
      clearAt: 0,
    },
    meet: { captured: false, fromA: 0, fromB: 0, heartFx: 0 },
    love: { cueId: "", picked: [] as string[], neon: false },
    lapAcc: 0,
    fxSeq: 1,
  });

  // 跑道尺寸
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // 用 offsetWidth/Height 而非 getBoundingClientRect：画框整体 scale 后
    // 前者仍是未缩放的布局尺寸，与 transform 写入的局部坐标系一致
    const ro = new ResizeObserver(() => {
      sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 名单同步：新人入场、退场标记
  useEffect(() => {
    const sims = simsRef.current;
    let batch = 0;
    for (const friend of runners) {
      if (!sims.has(friend.id)) {
        sims.set(friend.id, {
          friend,
          lane: joinCountRef.current % 3,
          theta: (joinCountRef.current * GOLDEN) % TWO_PI,
          pace: paceOf(friend.id),
          phase: "enter",
          phaseT: 0,
          enterDelay: batch * 0.12,
          freezeUntil: 0,
          boostUntil: 0,
          boost: 1,
          lastPose: "",
          lastBaton: false,
          lastShout: "",
        });
        joinCountRef.current += 1;
        batch += 1;
      }
    }
    const ids = new Set(runners.map((f) => f.id));
    for (const [id, sim] of sims) {
      if (exitingIds.includes(id) && sim.phase !== "exit") {
        sim.phase = "exit";
        sim.phaseT = 0;
      }
      if (!ids.has(id)) sims.delete(id);
    }
  }, [runners, exitingIds]);

  // 切歌：重置彩蛋瞬态
  useEffect(() => {
    const tr = transientRef.current;
    tr.relay.cueId = "";
    tr.relay.passed = false;
    tr.relay.fired.clear();
    tr.relay.followerId = "";
    tr.relay.leaderId = "";
    tr.relay.batonId = "";
    tr.relay.clearAt = 0;
    tr.meet.captured = false;
    tr.love.cueId = "";
    tr.love.picked = [];
    tr.love.neon = false;
    setNeonOn(false);
    if (tr.meet.heartFx) {
      const heartId = tr.meet.heartFx;
      setFxs((list) => list.filter((f) => f.id !== heartId));
      tr.meet.heartFx = 0;
    }
    for (const sim of simsRef.current.values()) {
      sim.freezeUntil = 0;
      sim.boostUntil = 0;
      sim.boost = 1;
    }
  }, [track.id]);

  // 主循环
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const spawnFx = (kind: FX["kind"], x: number, y: number, ttl: number) => {
      const tr = transientRef.current;
      const id = tr.fxSeq++;
      setFxs((list) => [...list, { id, kind, x, y }]);
      if (ttl > 0) {
        window.setTimeout(() => {
          setFxs((list) => list.filter((f) => f.id !== id));
        }, ttl);
      }
      return id;
    };

    const frame = (now: number) => {
      // 可见时按帧限幅；隐藏时定时器被节流，放宽上限让模拟时间跟上真实时间
      const dtCap = document.visibilityState === "hidden" ? 1.5 : 0.05;
      const dt = Math.min((now - last) / 1000, dtCap);
      last = now;

      const {
        track: tk,
        isPlaying: playing,
        reducedMotion: rm,
      } = propsRef.current;
      const tr = transientRef.current;
      const sims = simsRef.current;
      tr.clock += dt;
      const clock = tr.clock;

      const audio = audioRef.current;
      const t = audio ? audio.currentTime : 0;

      // 拖动进度：由当前时间重新推导场景状态
      if (Math.abs(t - tr.lastAudioT) > 1.5) {
        tr.relay.cueId = "";
        tr.relay.batonId = "";
        tr.relay.followerId = "";
        tr.relay.leaderId = "";
        tr.relay.clearAt = 0;
        for (const c of tk.sceneCues) {
          if (t < c.start - 0.3) tr.relay.fired.delete(c.id);
        }
        tr.meet.captured = false;
        tr.love.cueId = "";
        for (const sim of sims.values()) {
          sim.freezeUntil = 0;
          sim.boostUntil = 0;
          sim.boost = 1;
        }
      }
      tr.lastAudioT = t;

      const { w, h } = sizeRef.current;
      const cx = w / 2;
      const cy = h / 2;

      // 主角对（duo / relay 共用）：我 + 阿杰（或首位好友）
      const meSim = sims.get(ME_ID) ?? null;
      let buddySim = sims.get(BESTIE_ID) ?? null;
      if (!buddySim) {
        for (const sim of sims.values()) {
          if (sim.friend.id !== ME_ID && sim.phase !== "exit") {
            buddySim = sim;
            break;
          }
        }
      }

      const activeCue = tk.sceneCues.find((c) => t >= c.start && t <= c.end);
      const activeLoveCallCue = tk.sceneCues.find(
        (c) => c.type === "loveCall" && t >= c.start - 0.5 && t <= c.end,
      );
      const meetCue = tk.sceneCues.find((c) => c.type === "firstMeet");
      const inMeetPre =
        tk.style === "duo" &&
        !!meetCue &&
        t >= meetCue.start - 3 &&
        t < meetCue.start;
      const inMeet =
        tk.style === "duo" &&
        !!meetCue &&
        t >= meetCue.start &&
        t <= meetCue.end;

      // 速度：BPM × 个人 pace × 场景系数
      const styleMul =
        tk.style === "walk"
          ? 0.55
          : tk.style === "duo"
            ? 0.8
            : tk.style === "fan"
              ? 0.9
              : 1;
      const baseW = ((tk.bpm * 0.09 * styleMul) / 180) * Math.PI;
      const motionMul = rm ? 0.35 : 1;

      // ---- 相遇编排（star crossing night） ----
      const TARGET_ME = Math.PI / 2 + 0.14;
      const TARGET_BUDDY = Math.PI / 2 - 0.14;
      const meetPair = new Set<string>();
      if ((inMeetPre || inMeet) && meSim && buddySim && meetCue) {
        meetPair.add(meSim.friend.id).add(buddySim.friend.id);
        if (inMeetPre) {
          if (!tr.meet.captured) {
            tr.meet.captured = true;
            tr.meet.fromA = meSim.theta;
            tr.meet.fromB = buddySim.theta;
          }
          const p = easeInOut((t - (meetCue.start - 3)) / 3);
          meSim.theta = lerpAngle(tr.meet.fromA, TARGET_ME, p);
          buddySim.theta = lerpAngle(tr.meet.fromB, TARGET_BUDDY, p);
        } else {
          meSim.theta = TARGET_ME;
          buddySim.theta = TARGET_BUDDY;
        }
      } else {
        tr.meet.captured = false;
      }
      // 相遇结束：好友原地目送片刻再起步，避免两人长期重叠
      if (!inMeet && tr.meet.heartFx && buddySim) {
        buddySim.freezeUntil = clock + 1.2;
      }
      // 爱心与星光
      if (inMeet && meSim && buddySim && !tr.meet.heartFx) {
        const lane0 = LANE_RX[0];
        const hx = cx + cx * lane0 * Math.cos(Math.PI / 2);
        const hy = cy + cy * lane0 * RY_RATIO * Math.sin(Math.PI / 2) - 52;
        tr.meet.heartFx = spawnFx("heart", hx, hy, 0);
      } else if (!inMeet && tr.meet.heartFx) {
        const heartId = tr.meet.heartFx;
        tr.meet.heartFx = 0;
        setFxs((list) => list.filter((f) => f.id !== heartId));
      }

      // ---- 接力彩蛋（Runaway Baby） ----
      const relayCue = activeCue?.type === "relay" ? activeCue : undefined;
      const relay = tr.relay;
      if (relayCue && !relay.fired.has(relayCue.id) && meSim && buddySim) {
        if (relay.cueId !== relayCue.id) {
          relay.cueId = relayCue.id;
          relay.passed = false;
          // 选取当前角距最近的两名跑者作为“前后两人”，落后者持棒追赶
          const candidates = [...sims.values()].filter(
            (s) => s.phase === "run",
          );
          let best: [Sim, Sim] | null = null;
          let bestGap = Infinity;
          for (let i = 0; i < candidates.length; i++) {
            for (let j = i + 1; j < candidates.length; j++) {
              const gap = Math.abs(
                normAngle(candidates[i].theta - candidates[j].theta),
              );
              if (gap > 0.01 && gap < bestGap) {
                bestGap = gap;
                best = [candidates[i], candidates[j]];
              }
            }
          }
          const [pa, pb] = best ?? [meSim, buddySim];
          if (normAngle(pa.theta - pb.theta) > 0) {
            relay.leaderId = pa.friend.id;
            relay.followerId = pb.friend.id;
          } else {
            relay.leaderId = pb.friend.id;
            relay.followerId = pa.friend.id;
          }
          relay.batonId = relay.followerId;
        }
        if (!relay.passed && playing) {
          const follower = sims.get(relay.followerId);
          const leader = sims.get(relay.leaderId);
          if (follower && leader) {
            follower.boost = 1.5;
            follower.boostUntil = clock + 0.3;
            const gap = Math.abs(normAngle(leader.theta - follower.theta));
            if (gap < 0.15 || t > relayCue.start + 4.5) {
              relay.passed = true;
              relay.fired.add(relayCue.id);
              relay.batonId = relay.leaderId;
              relay.clearAt = clock + 3;
              follower.boost = 1;
              follower.boostUntil = 0;
              leader.boost = 1.35;
              leader.boostUntil = clock + 2.5;
              const fx = cx + cx * LANE_RX[1] * Math.cos(leader.theta);
              const fy =
                cy + cy * LANE_RX[1] * RY_RATIO * Math.sin(leader.theta) - 46;
              if (!rm) spawnFx("hifive", fx, fy, 900);
              spawnFx("relay", fx, fy - 14, 1800);
              propsRef.current.onRelay();
            }
          }
        }
      } else if (relay.cueId && !relayCue) {
        relay.cueId = "";
        if (!relay.passed) relay.batonId = "";
      }
      if (relay.clearAt && clock > relay.clearAt) {
        relay.batonId = "";
        relay.clearAt = 0;
      }

      // 左右手 cue（青春修炼手册）
      let handPose = "";
      if (activeCue?.type === "leftRightMove") {
        handPose = t < (activeCue.start + activeCue.end) / 2 ? "left" : "right";
      }

      // ---- L.O.V.E 合唱：前半段选 4 只萝卜依次喊字母，后半段整体霓虹字 ----
      let shoutMap: Map<string, string> | null = null;
      if (activeLoveCallCue) {
        const runnable = [...sims.values()].filter((sm) => sm.phase === "run");
        if (runnable.length >= 4) {
          if (tr.love.cueId !== activeLoveCallCue.id) {
            tr.love.cueId = activeLoveCallCue.id;
            const pool = runnable.map((sm) => sm.friend.id);
            for (let i = pool.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            tr.love.picked = pool.slice(0, 4);
          }
          const per = (activeLoveCallCue.end - activeLoveCallCue.start) / 4;
          shoutMap = new Map();
          tr.love.picked.forEach((pid, i) => {
            const leads = [0.5, 0.5, 0.2, 0];
            const lead = leads[i];
            const at = activeLoveCallCue.start + i * per - lead;
            const nextLead = leads[i + 1] ?? 0;
            const until = activeLoveCallCue.start + (i + 1) * per - nextLead;
            // L/O 提前 0.5 秒，V 提前 0.2 秒；后一个字母出现时前一个立即收起。
            if (t >= at && t < until) shoutMap!.set(pid, "LOVE"[i]);
          });
        }
      } else if (tr.love.cueId) {
        tr.love.cueId = "";
      }

      const wantNeon = activeCue?.type === "loveNeon";
      if (wantNeon !== tr.love.neon) {
        tr.love.neon = wantNeon;
        setNeonOn(wantNeon);
      }

      // ---- 运动与渲染 ----
      const positioned: { sim: Sim; x: number; y: number }[] = [];
      for (const [id, sim] of sims) {
        const el = elsRef.current.get(id);
        if (!el) continue;

        const isFeatured =
          tk.style !== "duo" || sim === meSim || sim === buddySim;
        const dim = tk.style === "duo" && !isFeatured;
        const effLane =
          tk.style === "duo"
            ? sim === meSim
              ? 0
              : sim === buddySim
                ? 1
                : 2
            : sim.lane;

        const speed =
          baseW *
          sim.pace *
          motionMul *
          (dim ? 0.75 : 1) *
          (clock < sim.boostUntil ? sim.boost : 1);

        let radiusMul = 1;
        let alpha = 1;
        let advance = 0;

        if (sim.phase === "enter") {
          sim.phaseT += dt;
          const p = (sim.phaseT - sim.enterDelay) / ENTER_DURATION;
          if (p <= 0) {
            alpha = 0;
          } else {
            const e = easeInOut(p);
            radiusMul = 1.3 - 0.3 * e;
            alpha = e;
            advance = speed * dt * 1.4;
            if (p >= 1) sim.phase = "run";
          }
        } else if (sim.phase === "exit") {
          sim.phaseT += dt;
          if (sim.phaseT > EXIT_WAVE) {
            const p = (sim.phaseT - EXIT_WAVE) / (EXIT_DURATION - EXIT_WAVE);
            radiusMul = 1 + 0.35 * easeInOut(p);
            alpha = 1 - easeInOut(p);
            advance = speed * dt;
          }
          if (sim.phaseT >= EXIT_DURATION) {
            propsRef.current.onExitDone(id);
            continue;
          }
        } else if (playing && clock >= sim.freezeUntil && !meetPair.has(id)) {
          advance = speed * dt;
        }

        sim.theta += advance;
        if (sim.friend.id === ME_ID && advance > 0) {
          tr.lapAcc += advance;
          if (tr.lapAcc >= TWO_PI) {
            tr.lapAcc -= TWO_PI;
            propsRef.current.onLap();
          }
        }

        const rxF = (tk.style === "fan" ? FAN_LANE_RX : LANE_RX)[effLane];
        const rx = cx * rxF * radiusMul;
        const ry = cy * rxF * RY_RATIO * radiusMul;
        const x = cx + rx * Math.cos(sim.theta);
        const y = cy + ry * Math.sin(sim.theta);
        const depth = (Math.sin(sim.theta) + 1) / 2;
        const scale = (0.8 + 0.34 * depth) * (dim ? 0.9 : 1);

        let dir = -Math.sin(sim.theta) >= 0 ? 1 : -1;
        if (inMeet && meetPair.has(id) && meSim && buddySim) {
          const other = sim === meSim ? buddySim : meSim;
          const otherX = cx + cx * LANE_RX[0] * Math.cos(other.theta);
          dir = otherX >= x ? 1 : -1;
        }

        // 普通小人用脚底落在轨道点；萝卜较宽厚，改用身体中心落在轨道中心线
        const anchorY = tk.style === "fan" ? "-50%" : "-100%";
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${anchorY}) scale(${scale.toFixed(3)})`;
        el.style.zIndex = String(20 + Math.round(depth * 40));
        el.style.opacity = (alpha * (dim ? 0.45 : 1)).toFixed(2);
        el.style.setProperty("--dir", String(dir));
        el.style.setProperty("--s", scale.toFixed(3));

        // 姿态
        let pose = "";
        if (sim.phase === "exit" && sim.phaseT <= EXIT_WAVE) pose = "wave";
        else if (inMeet && meetPair.has(id)) pose = "gaze";
        else if (clock < sim.freezeUntil) pose = "hifive";
        else if (handPose && sim.phase === "run") pose = handPose;
        if (pose !== sim.lastPose) {
          el.dataset.pose = pose;
          sim.lastPose = pose;
        }

        const shout = shoutMap?.get(id) ?? "";
        if (shout !== sim.lastShout) {
          el.dataset.shout = shout;
          sim.lastShout = shout;
        }

        const baton = relay.batonId === id;
        if (baton !== sim.lastBaton) {
          el.dataset.baton = baton ? "1" : "0";
          sim.lastBaton = baton;
        }

        const moving =
          sim.phase === "enter"
            ? sim.phaseT > sim.enterDelay
            : sim.phase === "exit"
              ? sim.phaseT > EXIT_WAVE
              : advance > 0;
        const movingFlag = moving ? "1" : "0";
        if (el.dataset.moving !== movingFlag) el.dataset.moving = movingFlag;

        if (sim.phase === "run") positioned.push({ sim, x, y });
      }

      // ---- 相遇击掌 ----
      if (playing && !inMeet && !inMeetPre) {
        for (let i = 0; i < positioned.length; i++) {
          for (let j = i + 1; j < positioned.length; j++) {
            const a = positioned[i];
            const b = positioned[j];
            if (
              relayCue &&
              !relay.passed &&
              (relay.followerId === a.sim.friend.id ||
                relay.followerId === b.sim.friend.id)
            ) {
              continue;
            }
            if (clock < a.sim.freezeUntil || clock < b.sim.freezeUntil)
              continue;
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist > HIFIVE_DIST) continue;
            const key = [a.sim.friend.id, b.sim.friend.id].sort().join("|");
            const lastAt = tr.cooldown.get(key) ?? -Infinity;
            if (clock - lastAt < HIFIVE_COOLDOWN) continue;
            tr.cooldown.set(key, clock);
            a.sim.freezeUntil = clock + 0.7;
            b.sim.freezeUntil = clock + 0.7;
            if (!rm) {
              spawnFx("hifive", (a.x + b.x) / 2, (a.y + b.y) / 2 - 34, 900);
            }
            propsRef.current.onHighFive(a.sim.friend, b.sim.friend);
          }
        }
      }
    };

    // 页面不可见时 rAF 停摆，退回 setTimeout 低频驱动，回前台后无缝恢复
    let timer = 0;
    let stopped = false;
    const pump = (now: number) => {
      if (stopped) return;
      frame(now);
      if (document.visibilityState === "hidden") {
        timer = window.setTimeout(() => pump(performance.now()), 66);
      } else {
        raf = requestAnimationFrame(pump);
      }
    };
    pump(performance.now());
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [audioRef]);

  const stepDur =
    track.style === "walk"
      ? (60 / track.bpm) * 1.5
      : track.style === "fan"
        ? (60 / track.bpm) * 2
        : 60 / track.bpm;

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-style={track.style}
      data-playing={isPlaying ? "1" : "0"}
    >
      <div className={styles.coverSpin}>
        <img
          key={track.id}
          className={styles.cover}
          src={track.cover}
          alt={`${track.title} 封面`}
        />
      </div>
      <img className={styles.disk} src={diskImg} alt="唱片跑道" />
      {track.style === "walk" && (
        <>
          <PaperPlane className={styles.planeA} />
          <PaperPlane className={styles.planeB} />
        </>
      )}
      <div className={styles.runnerLayer}>
        {runners.map((friend) => (
          <RunnerView
            key={friend.id}
            friend={friend}
            showHat={track.style === "walk"}
            skinSrc={track.skin}
            stepDur={stepDur}
            onClick={() => onRunnerClick(friend)}
            refCb={(el) => {
              if (el) elsRef.current.set(friend.id, el);
              else elsRef.current.delete(friend.id);
            }}
          />
        ))}
        {fxs.map((fx) => (
          <FxView key={fx.id} fx={fx} />
        ))}
        {neonOn && (
          <div className={styles.neon} aria-hidden="true">
            <span>L</span>
            <span>O</span>
            <span>V</span>
            <span>E</span>
            <b>!!</b>
          </div>
        )}
      </div>
    </div>
  );
}

type RunnerViewProps = {
  friend: Friend;
  showHat: boolean;
  /** 有皮肤图时整体替换掉 SVG 小人 */
  skinSrc?: string;
  stepDur: number;
  onClick: () => void;
  refCb: (el: HTMLDivElement | null) => void;
};

function RunnerView({
  friend,
  showHat,
  skinSrc,
  stepDur,
  onClick,
  refCb,
}: RunnerViewProps) {
  return (
    <div
      ref={refCb}
      className={styles.runner}
      style={
        {
          "--step": `${stepDur.toFixed(2)}s`,
          "--suit": friend.color,
        } as CSSProperties
      }
      data-pose=""
      data-moving="0"
      data-baton="0"
    >
      <button
        type="button"
        className={styles.hit}
        aria-label={friend.isMe ? "我（用户本人）" : `好友 ${friend.name}`}
        onClick={onClick}
      >
        {skinSrc ? (
          <span className={styles.flip}>
            <img className={styles.skin} src={skinSrc} alt="" />
          </span>
        ) : (
          <span className={styles.flip}>
            {/* viewBox 底边 = 脚底（腿部 y=31+13=44），使 SVG 盒底即落地点 */}
            <svg
              className={styles.figure}
              viewBox="0 0 36 44"
              width="30"
              height="37"
              aria-hidden="true"
            >
              <rect
                className={`${styles.limb} ${styles.armBack}`}
                x="16.4"
                y="19"
                width="3"
                height="11"
                rx="1.5"
              />
              <rect
                className={`${styles.limb} ${styles.legBack}`}
                x="16.4"
                y="31"
                width="3.4"
                height="13"
                rx="1.7"
              />
              <rect
                className={styles.torso}
                x="12.5"
                y="17"
                width="11"
                height="16"
                rx="5"
              />
              <g className={styles.headG}>
                <circle className={styles.head} cx="18" cy="10" r="6" />
                <path
                  className={styles.hair}
                  d="M12 10 a6 6 0 0 1 12 0 l0 -2.4 a6 6 0 0 0 -12 0 z"
                />
                {showHat && (
                  <g className={styles.hat}>
                    <rect x="14.6" y="2.6" width="6.8" height="3" rx="1" />
                    <polygon points="18,-1.4 27,2.6 18,6.6 9,2.6" />
                    <line x1="24.6" y1="3.4" x2="26.4" y2="8.2" />
                    <circle cx="26.4" cy="8.8" r="1.2" />
                  </g>
                )}
              </g>
              <rect
                className={`${styles.limb} ${styles.legFront}`}
                x="16.4"
                y="31"
                width="3.4"
                height="13"
                rx="1.7"
              />
              <rect
                className={`${styles.limb} ${styles.armFront}`}
                x="16.4"
                y="19"
                width="3"
                height="11"
                rx="1.5"
              />
              <rect
                className={styles.baton}
                x="19.5"
                y="27.5"
                width="11"
                height="3"
                rx="1.5"
              />
            </svg>
          </span>
        )}
        <span className={friend.isMe ? styles.nameMe : styles.name}>
          {friend.name}
        </span>
      </button>
    </div>
  );
}

function FxView({ fx }: { fx: FX }) {
  const style: CSSProperties = { left: fx.x, top: fx.y };
  if (fx.kind === "relay") {
    return (
      <div className={styles.fxRelay} style={style}>
        默契接棒 +1
      </div>
    );
  }
  if (fx.kind === "heart") {
    return (
      <div className={styles.fxHeart} style={style} aria-hidden="true">
        <svg viewBox="0 0 48 44" width="34" height="31">
          <path
            className={styles.heartPath}
            d="M24 38 C10 28 4 20 6 12 C8 5 16 3 21 8 L24 11 L27 8 C32 3 40 5 42 12 C44 20 38 28 24 38 Z"
          />
        </svg>
        <span className={styles.sparkA} />
        <span className={styles.sparkB} />
        <span className={styles.sparkC} />
      </div>
    );
  }
  return (
    <div className={styles.fxHifive} style={style} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

function PaperPlane({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        d="M2 12 L22 3 L15 21 L11.5 13.5 Z"
        fill="#ffffff"
        stroke="#9CC8EE"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11.5 13.5 L22 3" stroke="#9CC8EE" strokeWidth="1.2" />
    </svg>
  );
}
