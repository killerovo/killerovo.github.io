# 双人五子棋 · 方圆 — 设计文档

> 日期：2026-07-04 | 状态：待实现

---

## 1. 概述

在 killerovo.github.io 个人主页上新增一个**双人五子棋在线对战**页面。两人通过 Supabase Realtime 进入房间后实时对弈，支持聊天、悔棋、重开。视觉风格采用**中国风水墨/新中式**设计。

### 为什么做

现有 Tools 板块已有魔方（单人）、迷宫（单人）、一起听歌（多人音乐），缺少一个**双人对战类游戏**。五子棋规则简洁、实现可控，配合中国风视觉能成为站点亮点。

---

## 2. 技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 通信 | Supabase Realtime | 与 music.html 架构一致，复用现有后端 |
| 棋盘渲染 | HTML5 Canvas | 方便实现水墨纹理、棋子光泽、落子动画 |
| 页面形式 | 独立 HTML + URL 房间参数 | 与 music.html 模式一致，支持链接分享 |
| 视觉风格 | 中国风/新中式 | 宣纸棋盘 + 墨玉/羊脂白棋子 |

---

## 3. 页面布局

```
┌──────────────────────────────────────────────┐
│  ← 返回主页   五子棋 · 方圆    🌙 主题切换    │
├──────────┬───────────────────┬───────────────┤
│ 房间面板  │                   │  聊天面板      │
│ 创建/加入 │    ┌─────────┐   │  消息列表      │
│ 房间号    │    │ 棋 盘   │   │  输入框        │
│ 玩家信息  │    │ (Canvas) │   │               │
│ 黑白分配  │    │ 15 × 15 │   │               │
│ 观战列表  │    └─────────┘   │               │
│ 状态栏    │  悔棋  重新开始  │               │
└──────────┴───────────────────┴───────────────┘
```

**响应式**：宽屏三栏 → 平板两行 → 手机单栏。

---

## 4. 文件清单

### 新建

| 文件 | 说明 |
|------|------|
| `gomoku.html` | 五子棋主页面，含 HTML 结构 + 内联 CSS + Supabase 初始化 |
| `supabase/migrations/005_gomoku.sql` | 数据库表 + RLS + Realtime |

### 修改

| 文件 | 说明 |
|------|------|
| `contents/tools.md` | 添加五子棋入口卡片 |

---

## 5. 棋盘视觉

### 宣纸纹理
- 底色米白 `#f5f0e8`，Canvas 生成随机纤维纹理模拟手工宣纸
- 深色模式改为墨灰 `#2a2520`

### 网格
- 15×15，线色深棕 `#5c4033`，1px
- 4 个星位（天元 + 四角），朱砂红 `#c23b22`
- 行列坐标标注（A-O / 1-15）

### 棋子
- **黑子**：墨玉质感，深黑径向渐变 + 高光，投阴影
- **白子**：羊脂白玉，乳白渐变 + 微暖色调
- 落子动画：scale 0→1，200ms ease-out
- 最后一手中心有小红点标记

---

## 6. 游戏规则

- 15×15 标准棋盘，黑先白后
- 五子连珠即胜（横、竖、斜）
- 满盘无五连判和
- 无禁手规则，保持趣味

---

## 7. Supabase 数据库

### gomoku_rooms

```sql
CREATE TABLE gomoku_rooms (
  id           BIGSERIAL PRIMARY KEY,
  room_id      TEXT UNIQUE NOT NULL,
  player_black TEXT,
  player_white TEXT,
  status       TEXT DEFAULT 'waiting',  -- waiting | playing | finished
  current_turn TEXT DEFAULT 'black',
  winner       TEXT,
  undo_count   INTEGER DEFAULT 0,
  undo_request TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

### gomoku_moves

```sql
CREATE TABLE gomoku_moves (
  id         BIGSERIAL PRIMARY KEY,
  room_id    TEXT NOT NULL,
  x          INTEGER NOT NULL,
  y          INTEGER NOT NULL,
  color      TEXT NOT NULL,
  move_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### gomoku_chat

```sql
CREATE TABLE gomoku_chat (
  id         BIGSERIAL PRIMARY KEY,
  room_id    TEXT NOT NULL,
  username   TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

全部表启用 Realtime + RLS 全开（与项目现有模式一致）。

---

## 8. JavaScript 模块

| 模块 | 职责 |
|------|------|
| `BoardRenderer` | Canvas 绘制：纹理、网格、棋子、动画、高亮 |
| `GameController` | 状态机、落子合法性、回合切换 |
| `WinDetector` | 四方向五连检测，胜利连线坐标返回 |
| `RoomManager` | Supabase 房间 CRUD、加入/离开 |
| `RealtimeSync` | 订阅 gomoku_moves 和 gomoku_chat 推送 |
| `ChatManager` | 聊天收发与历史 |

### 核心状态

```javascript
const gameState = {
  room: { id: null, status: 'waiting' },
  players: { black: null, white: null },
  myColor: null,          // 'black' | 'white' | 'spectator'
  moves: [],              // [{x, y, color}, ...]
  currentTurn: 'black',
  winner: null,
  undoCount: 0,
  chatMessages: [],
};
```

---

## 9. 游戏流程

```
创建房间 → 等待对手 → 对手加入 → 分配黑白 → 对局开始
  → 轮流落子 (Realtime推送)
  → 五连判定 → 游戏结束 → 可重新开始

附带：悔棋（双方确认）、观战、回合计时、对局聊天
```

---

## 10. 验证清单

| # | 测试场景 | 预期结果 |
|---|---------|---------|
| 1 | 打开 gomoku.html | 棋盘渲染，中国风 UI 正常 |
| 2 | 创建房间 "tearoom" | 显示等待，生成分享链接 |
| 3 | 另一个窗口加入 "tearoom" | 分配黑白方，棋盘可点击 |
| 4 | 黑方落子 | 双方实时同步显示 |
| 5 | 白方落子达成五连 | 胜利弹窗 + 连线高亮 |
| 6 | 悔棋 | 对方确认后两子撤回 |
| 7 | 聊天 | 双方实时收到消息 |
| 8 | 深色/浅色切换 | 棋盘配色跟随 |
| 9 | 手机端 (375px) | 纵向布局，触控落子正常 |
| 10 | 观战 | 第三人打开链接可观看不可落子 |

---

## 11. 待确认问题

- [x] 通信方式 → Supabase Realtime
- [x] 入口方式 → 独立页面 + URL 房间参数
- [x] 视觉风格 → 中国风/新中式
- [x] 功能范围 → 对战 + 聊天

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-04 | 初版设计完成 |
