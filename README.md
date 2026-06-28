# 中华护理学会 自动刷课 🏥📚

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-4.5-green)]()

[English](./README-en.md) | 简体中文

一键安装👇

⚡[**点此安装脚本**](https://github.com/JhHarry/cna-auto-course/raw/master/%E4%B8%AD%E5%8D%8E%E6%8A%A4%E7%90%86%E5%8D%8F%E4%BC%9A%E5%88%B7%E5%AE%A2%E8%84%9A%E6%9C%AC.user.js)

> 需要先安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🎬 倍速播放 | 1x ~ 16x 可调，加速剩余时间实时计算 |
| 🔇 自动静音 | 默认静音，可一键切换 |
| 📝 自动答题 | 多题连答，答完自动下一题 |
| ⭐ 自动评分 | 五星评分 / 满意度选择，评完自动提交 |
| 🔀 自动切课 | 子课程间自动切换，全播完自动跳到下一门课 |
| 🔄 自动刷新 | 评分后刷新确保状态同步 |
| 📦 可拖动面板 | 浮窗不遮挡页面内容 |

## 🎮 控制面板

```
🤖 中华护理学会 刷课助手
播放速度: 1x 1.5x 2x 2.5x 3x 4x
自定义: [16.0] 应用
▶ 23.0% 剩39min → ≈2min x16
[1/4节完成] ⭐评分!
⏳ 待完成: xxx（二）
→ 下一门: 精神障碍患者的心理护理

[📝 答题] [🔍 下一节]
[⏯ 暂停] [🔀 纠正]
[⭐ 评分] [🔇 已静音]
```

## 🔄 工作流程

```
登录课程页 → 脚本自动开始
    │
    ├─ 视频倍速 + 静音播放
    │   ├─ 有题目弹窗 → 自动答题 → 下一题
    │   └─ 无题目 → 视频播完
    ├─ 自动切到下一节（子课程）
    ├─ 全部子课程播完 → 弹出评分
    │   └─ 自动五星 + 提交
    └─ 评分完成 → 刷新 → 跳到下一门课
        └─ 循环以上流程
```

## 📋 支持平台

- `study.zhhlxh.org.cn` — 课程学习
- `course.zhhlxh.org.cn` — 课程评分

## ⚙️ 技术实现

- **Vue 注入**：直接操作 `__vue__` 实例，绕过 Element UI 的 DOM 屏障
- **防重复机制**：`lastRatedVideoId` + `goNextCourseCalled` 锁防重入
- **异步初始化**：`initWhenReady()` 轮询确保 SPA 页面挂载完毕
- **GM API**：`GM_setValue` / `GM_getValue` 持久化速度/静音设置

## ⚠️ 免责声明

本项目仅供学习和研究使用。使用者应自行承担使用本脚本的全部风险和责任。作者不对因使用本脚本而导致的任何后果负责，包括但不限于账号封禁、学习记录作废等。

请遵守平台的使用条款，合理使用本工具。

## 📄 License

Apache License 2.0 — 详见 [LICENSE](LICENSE)

---

⭐ 如果这个脚本帮到了你，请给我一个 Star！

**作者**: [JhHarry](https://github.com/JhHarry)
