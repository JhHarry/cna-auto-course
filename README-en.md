# CNA Auto Course 🏥📚

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.8-green)]()

One-click install👇

[**⚡ Install Script**](https://github.com/JhHarry/cna-auto-course/raw/master/%E4%B8%AD%E5%8D%8E%E6%8A%A4%E7%90%86%E5%8D%8F%E4%BC%9A%E5%88%B7%E5%AE%A2%E8%84%9A%E6%9C%AC.user.js)

> Requires [Tampermonkey](https://www.tampermonkey.net/) browser extension

[中文 README](./README.md)

---

Fully automated course completion script for the [Chinese Nursing Association (中华护理学会) Continuing Education Platform](https://study.zhhlxh.org.cn). Install and let it run unattended.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎬 Speed Control | 1x ~ 16x adjustable, with real-time accelerated remaining time display |
| 🔇 Auto Mute | Default muted, one-click toggle |
| 📝 Auto Quiz | Multi-question auto-answer, auto-advance to next question |
| ⭐ Auto Rating | 5-star rating / satisfaction survey auto-selection |
| 🔀 Auto Switch | Auto-switch between sub-courses, then to the next full course |
| 🔄 Auto Refresh | Refresh after rating to sync state |
| 📦 Draggable Panel | Floating panel that doesn't block page content |

## 🎮 Control Panel

```
🤖 中华护理学会 刷课助手
Speed: 1x 1.5x 2x 2.5x 3x 4x
Custom: [__] Apply
▶ 23.0% 37min left → ≈2min x16
[1/4 done] ⭐Rating!
⏳ Pending: xxx (Part 2)
→ Next: Psychiatric Nursing Communication

[📝 Quiz] [🔍 Next]
[⏯ Pause] [🔀 Fix]
[⭐ Rate] [🔇 Muted]
```

## 🔄 Workflow

```
Login → Script auto-starts
    │
    ├─ Video playback with speed + mute
    │   ├─ Quiz popup → auto-answer → next question
    │   └─ No quiz → video finishes
    ├─ Auto-switch to next sub-course
    ├─ All sub-courses done → rating popup
    │   └─ Auto 5-star + submit
    └─ Rating done → refresh → next full course
        └─ Loop
```

## 📋 Supported Domains

- `study.zhhlxh.org.cn` — Course learning
- `course.zhhlxh.org.cn` — Course rating

## ⚙️ Technical Details

- **Vue Injection**: Directly manipulates the `__vue__` instance on `body-container`, bypassing Element UI DOM barriers
- **Anti-duplicate**: `lastRatedVideoId` + `goNextCourseCalled` lock prevents re-entry
- **Async Init**: `initWhenReady()` polling ensures SPA mount is complete
- **GM APIs**: `GM_setValue` / `GM_getValue` for persisting speed/mute preferences

## 📄 License

MIT

---

⭐ Star this repo if it helped you!

**Author**: [JhHarry](https://github.com/JhHarry)
