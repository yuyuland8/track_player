# 唱片跑道 · Vinyl Track Player

把播放器的黑胶唱片变成一条好友共同奔跑的跑道：唱片盘面是跑道，中间的专辑封面像唱片标贴一样恒定转动，1–8 个小人（含用户本人）沿盘面上的同心椭圆跑道奔跑、相遇、击掌，三首歌各有专属彩蛋。黑客松 Demo，纯前端、无后端、可静态部署。

主标语：**这一程，有人陪你跑。**

---

## 1. 快速开始

```bash
# ⚠️ 本机（开发机）没有系统级 Node，运行时装在用户目录，先加 PATH：
export PATH="$HOME/.local/node/node-v24.18.1-darwin-arm64/bin:$PATH"
# （其他机器只要 Node ≥ 18 即可，无此步骤）

npm install
npm run dev       # 开发服务器 http://localhost:5173
npm run build     # tsc 类型检查 + vite 构建 → dist/
npm run preview   # 生产构建预览 http://localhost:4173
```

`scripts/run-npm.sh` 是给 IDE/launch 配置用的 npm 包装（自动注入上述 PATH），`.claude/launch.json` 里的 dev/preview 配置引用它。

部署：`dist/` 整个目录扔到任意静态托管即可（`vite.config.ts` 设了 `base: "./"`，放域名根目录或子目录都能跑）。无后端、无密钥、无远程资源依赖。

---

## 2. 技术栈与硬性约定

| 项 | 选型 | 说明 |
|---|---|---|
| 构建 | Vite 5 + `base: "./"` | 相对路径产物，子目录可部署 |
| 框架 | React 18 + TypeScript（strict） | 无 Router、无 Zustand，状态全用 hooks |
| 样式 | CSS Modules + CSS 变量 | 设计 token 见 `src/styles/global.css`，遵循 `KUGOU-design-guidelines.md` |
| 图标 | lucide-react | 不用 emoji 当图标；爱心/毕业帽/星光用 CSS/SVG 画 |
| 动画 | DOM + CSS transform + rAF | 人物运动是命令式 rAF 引擎直接写 DOM style，不走 React 状态 |
| 音频 | `new Audio()`（不挂 DOM） | **`audio.currentTime` 是全局唯一时间源** |

**不可破坏的行为约定**（验收底线）：

- 暂停时：音频、歌词、进度条、人物运动、彩蛋时间轴**必须一起停**。
- 拖动进度 / 切歌后：歌词高亮、彩蛋场景**必须由当前时间重新推导**，不允许依赖一次性 `setTimeout`。
- 唱片盘面 `music_player_disk.png` **静止不转**；只有中孔下的专辑封面自转；人物公转是独立动画层，三者互不耦合。
- 彩蛋触发只认 `tracks.ts` 里的 `sceneCues` 时间配置，**禁止**用"当前歌词字符串包含某句话"来触发。
- 用户本人（`me`）不可被踢；跑道含本人最多 8 人。
- 不用 `alert()`；弹层支持遮罩关闭、关闭按钮、Escape；按钮点击区 ≥ 44px。

---

## 3. 素材与资源路径

原始素材在 `唱片跑道素材/` 和 `songs/`，**不要修改原始文件**，构建用的是副本：

| 原始文件 | 项目内副本 | 用途 |
|---|---|---|
| `唱片跑道素材/music_player_disk.png` | `src/assets/music-player-disk.png` | 唱片盘面（带透明中孔），经 import 进构建 |
| `唱片跑道素材/Runaway_Baby_Cover.jpeg` | `src/assets/runaway-baby-cover.jpeg` | 封面 1 |
| `唱片跑道素材/青春修炼手册_cover.PNG` | `src/assets/youth-training-manual-cover.png` | 封面 2 |
| `唱片跑道素材/star_crossing_night_cover.PNG` | `src/assets/star-crossing-night-cover.png` | 封面 3 |
| `songs/*.mp3` | `public/assets/audio/*.mp3` | 三首歌音频 |
| `songs/*.lrc` | `public/assets/lyrics/*.lrc` | 三份歌词（`Star Crossing Night (feat. GALI).lrc` 已复制为 `star-crossing-night.lrc`） |

规则：图片走模块 `import`（进 hash 产物）；音频/歌词放 `public/assets/`，运行时 URL 一律用 `import.meta.env.BASE_URL` 拼接（见 `src/data/tracks.ts`），**禁止**绝对路径或硬编码域名。公开文件名只用英文小写和连字符。

---

## 4. 目录结构

```
src/
├── main.tsx                    # 入口（无 StrictMode，避免双挂载干扰引擎）
├── App.tsx                     # 状态中枢：陪跑名单、会话统计、所有浮层编排
├── App.module.css
├── types.ts                    # LyricLine / SceneCue / TrackMeta / Friend
├── styles/global.css           # 设计 token（色彩/字体/间距/圆角）+ reset
├── data/
│   ├── tracks.ts               # ★ 三首歌配置 + 全部彩蛋 cue 时间表
│   └── friends.ts              # ★ 用户 + 8 个演示角色、基础统计、常量
├── utils/
│   ├── lrc.ts                  # LRC 解析（[mm:ss.xx]，多标签、排序）+ 行定位
│   └── time.ts                 # mm:ss 格式化
├── hooks/
│   ├── useAudioPlayer.ts       # 音频状态机（唯一时间源的封装）
│   └── useToasts.tsx           # Toast 队列
└── components/
    ├── DiskStage.tsx           # ★★ 唱片舞台 + 人物运动引擎（全项目核心）
    ├── DiskStage.module.css    # 小人 SVG 动画、姿态、彩蛋特效样式
    ├── Lyrics.tsx              # 当前行 + 下一行
    ├── ProgressBar.tsx         # 可点可拖进度条（Pointer Events）
    ├── Controls.tsx            # 上一首/播放暂停/下一首
    ├── Modal.tsx               # 通用弹层（sheet/center，遮罩+Esc+锁滚动）
    ├── ConfirmDialog.tsx       # 二次确认（踢人用）
    ├── FriendPanel.tsx         # 好友管理面板（上下线开关、一键 2/4/8 人）
    ├── FriendCard.tsx          # 好友信息卡（数据+踢出入口）
    └── ReportModal.tsx         # 陪跑周报：Canvas 画 1080×1920 PNG + 下载
```

★ = 改产品行为大概率只动这几个文件。

---

## 5. 架构总览

```
useAudioPlayer ──(audio.currentTime 唯一时间源)──┐
      │ time(节流120ms)/duration/isPlaying        │ audioRef（引擎每帧直读）
      ▼                                           ▼
    App.tsx ──props──▶ DiskStage（React 层只管"谁在场上"）
      │                    │
      │                    └─ rAF 引擎（命令式，不经 React）：
      │                       每帧读 currentTime → 推导 cue 状态
      │                       → 算 θ/坐标/缩放/层级/姿态 → 直接写 DOM style
      │
      ├─ 陪跑名单状态：onlineIds / onTrackIds / exitingIds
      ├─ 会话统计：sessionLaps / fivesWith（引擎回调驱动）
      └─ 浮层：FriendPanel / FriendCard / Confirm / Report / Toast
```

### 5.1 时间与同步（useAudioPlayer.ts）

- `new Audio()` 常驻，切歌只换 `src`；`ended` 自动下一首循环。
- React 侧 `time` 用 **setInterval 120ms** 从 `audio.currentTime` 节流同步（歌词/进度条够用，页面隐藏时也不掉队）；引擎则**每帧直接读** `audioRef.current.currentTime`，二者永远一致，因为源头相同。
- `listenedRef` 累计真实收听秒数 → 「本周同听分钟」= 126（基础）+ 收听分钟，全局联动。
- 音频 error → 非阻塞 Toast，界面照常可切歌。

### 5.2 人物运动引擎（DiskStage.tsx，读懂这节 = 读懂项目）

三层数据，全部绕过 React 渲染循环：

- `simsRef: Map<id, Sim>` —— 每个小人的模拟状态：`theta`（参数角）、`lane`（0/1/2 车道）、`pace`（0.94–1.06 稳定个人系数，由 id 哈希得出）、`phase`（enter/run/exit）、`freezeUntil`/`boostUntil`（击掌冻结/加速）、`lastPose`。
- `elsRef: Map<id, HTMLDivElement>` —— React 渲染出的小人 DOM 节点（callback ref 收集），引擎每帧写 `style.transform/zIndex/opacity` 和 `dataset.pose/moving/baton`。
- `transientRef` —— 跨帧瞬态：模拟时钟 `clock`、击掌冷却表、接力状态机、相遇编排捕获、圈数累计。**切歌和 seek 都会重置相关字段**。

主循环（`pump`）：优先 `requestAnimationFrame`；`document.visibilityState === "hidden"` 时退回 `setTimeout(66ms)` 并把 dt 上限从 0.05s 放宽到 1.5s——后台标签 rAF 停摆、定时器被节流到 ~1s，这样回前台时人物位置不落后于音频。

**轨迹数学**（每帧）：

```
θ += bpm × 0.09(°/s系数) × styleMul × pace × boost × dt      // 只在播放中推进
x = cx + rx·cosθ ; y = cy + ry·sinθ                          // rx = 半宽 × LANE_RX[lane]
LANE_RX = [0.65, 0.76, 0.87]（详见 5.4 节盘面实测）；ry = rx × 0.94
depth = (sinθ+1)/2 → scale = 0.8+0.34·depth；zIndex = 20+40·depth   // 下前上后
朝向 dir = -sinθ ≥ 0 ? 右 : 左（scaleX 翻转，永不倒着跑）
步频：CSS 变量 --step = 60/bpm 秒（walk ×1.5），肢体摆动动画时长与速度绑定
```

**落地点锚定**（易踩坑）：小人 DOM 用 `translate(-50%, -100%)` 定位，且 SVG 的
`viewBox="0 0 36 44"` 底边正好是脚底、名字标签用绝对定位脱离文档流——三者配合
才能让**脚底**精确落在轨道半径上。若把标签放回文档流或改回 `-92%`，锚点会变成
"含标签的按钮底部"，小人会整体内缩十几像素踩到封面上。触控区由 `.hit::after`
提供，并用 `scale(calc(1 / var(--s)))` 反向抵消远近缩放，保证恒为 44×44 屏幕像素。

`styleMul`：run=1（Runaway Baby）、walk=0.55（青春修炼手册散步）、duo=0.8（Star Crossing Night）。

**入场/退场**：enter 0.8s（半径 1.3→1 收进 + 淡入，批量加入按 120ms 间隔错峰）；exit 0.95s（前 0.45s 停步挥手 `pose=wave`，随后半径外扩淡出），完成后回调 `onExitDone(id)` 让 App 把人从名单里删掉。入退场用墙钟驱动，暂停时也能完成（这是操作反馈，不属于"播放态运动"）。

**相遇击掌**：每帧对 run 态小人两两测屏幕距离，< 28px 且该组合冷却 > 12s → 双方冻结 0.7s、`pose=hifive`、中点粒子、回调 `onHighFive`。接力追赶双方与相遇 cue 期间跳过。

### 5.3 三首歌彩蛋（cue 状态机）

所有 cue 集中在 `src/data/tracks.ts`，引擎每帧用 `t = currentTime` 查找活动 cue；seek 检测（|Δt| > 1.5s）会清空瞬态并把 `t < start` 的已触发记录删掉，允许重新触发。

| 歌曲 | 类型 | 时间 | 行为 |
|---|---|---|---|
| Runaway Baby (bpm128) | `relay` ×2 | 29.25–37.95 / 79.07–87.73 | cue 开始时选**当前角距最近的两名跑者**，落后者持棒 1.5× 加速追赶；角距 < 0.15 rad（或超时 4.5s 兜底）→ 递棒、粒子 + 「默契接棒 +1」浮标、领跑者 1.35× 冲刺 2.5s。每 cue 每播放周期一次 |
| 青春修炼手册 (bpm96) | `leftRightMove` ×4 | 3.33–12.17 / 82.07–90.03 / 159.49–167.58 / 209.20–217.58 | 全员戴毕业帽走路（track 级），cue 前半举左手、后半举右手（`dataset.pose` → CSS）；舞台飘 2 只纸飞机 |
| Star Crossing Night (bpm84) | `firstMeet` | 81.95–88.45 | track 级：我+阿杰高亮占 0/1 车道，其他人淡化 (0.45) 挤到外圈 0.75×速。cue 前 3s 把两人 θ 插值到底部 π/2±0.14；cue 内停步、面对面、抬头，头顶手绘描边爱心 + 3 颗星光；结束后好友原地"目送" 1.2s 再起步（防止长期重叠） |

姿态实现全在 `DiskStage.module.css`：小人是 36×52 viewBox 的 SVG（前后手臂/腿是独立 `<rect>`，`transform-box: fill-box` 绕肩/髋旋转），`[data-pose="left|right|hifive|gaze|wave"]` 属性选择器覆盖动画。接力棒是常驻隐藏的橙色小棒，`[data-baton="1"]` 显示。

### 5.4 唱片视觉分层与盘面实测数据

层次（z-index 由内到外）：

1. `.coverSpin`（z1）：专辑封面圆图，嵌在盘面透明中孔下方，**恒定平面自转 26s/圈**（播放时转、暂停停、reduced-motion 关）。居中用负 margin 而非 transform，避免与旋转动画打架。
2. `.disk`（z2）：`music_player_disk.png` 盘面，**完全静止**（这张图的圆形内容并非完美对称，整体旋转会让外轮廓看起来晃动变形，所以绝不能转它）。
3. `.runnerLayer`（z3）：小人 + 彩蛋特效。

`music_player_disk.png`（866×866）的实测几何，所有尺寸常量都由它推导：

| 量 | 实测值 | 占图宽 | 代码常量 |
|---|---|---|---|
| 透明中孔直径 | 477.5px（正圆，方向偏差 6px） | 55.14% | — |
| 孔心相对图心 | 上偏 4px | −0.46% | `top: 49.54%` / `HOLE_OFFSET_Y` |
| 封面直径 | 取 57%（比孔大 ~1.9%） | 57% | `.coverSpin` width / `COVER_RATIO` |
| 盘面不透明外缘半径 | 414.5px | 47.9%（= 0.957 cx） | 车道上界 |

孔缘有约 6px 羽化（alpha 在 r=238→244 间过渡），所以封面**必须略大于孔**（57% > 55.14%），
让盘面把封面边缘压住，才不会露出缝隙或半透明毛边。封面在 z1、盘面在 z2，超出部分自动被遮住。

车道必须落在 **0.551（孔缘）～0.957（盘面外缘）** 的 cx 区间内，小人才是踩在唱片纹路上而不是封面上；
当前取 `[0.65, 0.76, 0.87]`。改封面尺寸时务必同步检查车道下界。
（小人身体在椭圆下半区会向上盖住一点封面，这是"站在唱片前面"的 2.5D 观感，属预期。）

`ReportModal.tsx` 里画周报卡时用了同一套常量，改动请两边同步。

### 5.5 陪跑名单状态机（App.tsx）

三个数组：`onlineIds`（演示在线）、`onTrackIds`（在跑道，含 `me`，即渲染名单）、`exitingIds`（正在播退场动画）。

- 加入：`joinTrack(ids)` 尊重 8 人上限，超限 Toast「跑道已满」。
- 离开：`leaveTrack(id)` 只是标记 exiting → 引擎播完退场动画 → `handleExitDone` 真正移除。
- 陪跑总开关：关 → 非本人按 120ms 错峰退场（本人留场）；开 → 在线好友批量入场。
- 一键 2/4/8 人：目标集合 = `FRIENDS.slice(0, n-1)`，差集分别退场/入场。
- 踢人：好友卡 →「请 TA 离开跑道」→ ConfirmDialog → 退场 + 置离线。
- 会话统计：引擎回调 `onLap`（本人每满 2π 一圈）、`onHighFive`（per-friend 计数 `fivesWith`），与摘要胶囊、好友卡、周报全部联动。

### 5.6 陪跑周报（ReportModal.tsx）

打开时用**当下**数据在离屏 canvas 画 1080×1920：冰蓝渐变、品牌胶囊、主标题（当前好友数）、唱片+封面（圆形裁切）+按车道摆放的跑者彩点、三项统计（分钟/圈/和阿杰击掌）、情绪文案、歌名+日期、标语。图片用 `Image.onload` Promise 等待（同源本地资源，无跨域污染），`toDataURL` 出 PNG → 预览 `<img>` + `<a download>` 下载。失败走 Toast，不阻塞。

---

## 6. 设计 token 速查（global.css）

- 背景：`linear-gradient(180deg,#C9E5FD 0%,#EFF6FF 48%,#F0FBFD 100%)`（页面唯一大渐变，不堆玻璃卡）
- 品牌蓝：`--brand-500:#31B5ED` / `--brand-600:#169AF3`
- 文字层级：`--text-500`（近黑）→ 400(70%) → 300(50%) → 200(20%) → 100(15%)
- 圆角：卡片 20 / 底部抽屉顶部 30 / 胶囊 1000；页面水平边距 20px
- 字体：`PingFang SC, -apple-system, …`；标题 semibold(600)
- 安全区：`env(safe-area-inset-*)`；`prefers-reduced-motion` 下关闭封面自转/纸飞机/粒子并把人物速度降到 0.35×

---

## 7. 常见调参速查

| 想改什么 | 位置 |
|---|---|
| 彩蛋时间点 / BPM / 歌曲信息 | `src/data/tracks.ts` |
| 角色名单、衣服颜色、基础统计 | `src/data/friends.ts` |
| 圈速 | `DiskStage.tsx` `baseW` 里的 `0.09` 系数 |
| 车道半径 / 椭圆扁率 | `LANE_RX` / `RY_RATIO`（下界见 5.4 节，别低于 0.60） |
| 封面大小与孔位贴合 | `.coverSpin` 的 `width`/`margin`/`top`（见 5.4 节实测表） |
| 击掌距离/冷却 | `HIFIVE_DIST`(28px) / `HIFIVE_COOLDOWN`(12s) |
| 接力追赶速度/判定角/超时 | relay 分支里的 `1.5` / `0.15` / `start+4.5` |
| 相遇点位置 | `TARGET_ME`/`TARGET_BUDDY`（π/2±0.14） |
| 封面自转速度 | `DiskStage.module.css` `.coverSpin` 26s |
| 摆臂幅度（跑/走） | `--amp`：36deg / walk 19deg |
| 周报文案与排版 | `ReportModal.tsx` `renderReport()` |
| 初始在线/在场名单 | `App.tsx` `onlineIds`/`onTrackIds` 初始值 |

---

## 8. 已知边界与坑

1. **后台标签动画**：页面不可见时 rAF 不跑、定时器节流；引擎已有 setTimeout+宽 dt 兜底，人物会以 ~1fps 粗粒度追上音频，回前台自动恢复 60fps。属预期行为。
2. **相遇 cue 中途换人**：cue 进行中把阿杰踢下线，`buddySim` 兜底切换为场上第一位好友，该好友会瞬移到相遇点。演示可接受，介意可在 firstMeet 分支加"cue 内锁定配对"。
3. **pace 相近的两人会长时间并肩**：属"自然相遇"设定，击掌有 12s 冷却不会刷屏；约 30–60s 会自然拉开。
4. **接力视觉窗口短**：浮标 1.8s、接力棒交接后 3s 消失，演示讲解时建议提前 seek 到 cue 前 2–3 秒。
5. **iOS 自动播放策略**：首次播放必须用户点击（已按此设计，无自动播放）。
6. **本机 Node 非系统安装**：见第 1 节 PATH；CI/其他机器无此问题。

## 9. 验收自测清单（改动后请过一遍）

- [ ] `npm run build` 通过，`npm run preview` 下三 MP3/三 LRC/三封面/盘面 PNG 全部 200/206
- [ ] 三首歌可循环切换并真实出声；歌词随 `currentTime` 滚动高亮
- [ ] 暂停 = 音频+歌词+进度+人物+彩蛋全停；拖进度后场景由时间重推导
- [ ] 盘面静止、封面自转、人物公转三层互不干扰
- [ ] 封面把中孔填满、边缘无缝无毛边；小人脚底在纹路带上（不站在封面上）
- [ ] 陪跑开关有分批入/退场动画；8 人上限与「跑道已满」提示生效；本人不可踢
- [ ] 三首歌彩蛋各自可触发（29.25s 接力 / 3.33s 举手 / 81.95s 相遇爱心）
- [ ] 周报可预览、可下载 PNG，人数与击掌数与本次会话联动
- [ ] 375×812 与 390×844 无横向滚动、无控制台报错、刷新后可正常进入
