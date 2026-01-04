# Electron GIF 捕获工具

软件包:<https://github.com/Coeur101/GIF-Capture/releases>

## 一、项目目标

实现一个基于 **Electron** 的桌面端 GIF 录制工具，支持以下功能：

- 全局快捷键触发
- 截取并锁定固定区域
- 实时录制屏幕内容
- 手动结束录制
- 按用户配置路径保存 GIF
- 应用内读取并预览生成的 GIF 文件

---

## 二、总体架构设计

### 2.1 技术选型

| 模块 | 技术 |
|---|---|
| 桌面框架 | Electron |
| 屏幕采集 | getDisplayMedia + MediaRecorder |
| 视频转码 | ffmpeg |
| 通信机制 | IPC（Main / Renderer） |
| 配置存储 | JSON 文件 |
| GIF 预览 | `<img>` + base64 |
