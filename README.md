# AMDL - Apple Music Downloader

> [English README](README_en.md)

一个基于 [gamdl](https://github.com/glomatico/gamdl) 的桌面端 Apple Music 下载工具，拥有美观的暗色 Web 界面。

[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/DerekH-233/AMDL)
[![Python](https://img.shields.io/badge/python-3.9%2B-blue)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-Unlicense-lightgrey)](LICENSE)

灵感来自 [wenfeng110402/AppleMusic-Downloader](https://github.com/wenfeng110402/AppleMusic-Downloader)。

![截图](Screenshot/1.png)

---

## 功能

- **歌曲 / 专辑 / 歌单 / MV 下载** — 支持 AAC 256kbps、ALAC 无损、Dolby Atmos 等多种编码
- **歌单自动识别** — 检测到歌单链接后自动以歌单名建文件夹，文件名仅保留歌曲名
- **实时进度条** — WebSocket 实时推送下载进度，每完成一首立即更新
- **Cookies 检测** — 一键验证 cookies 文件是否有效、Apple Music 订阅是否激活
- **下载后格式转换** — 支持转为 MP3 / FLAC / WAV / AAC / OGG / ALAC 等格式
- **歌词下载开关** — 可关闭歌词下载，减少资源占用
- **多任务队列** — 支持排队下载、取消任务
- **下载历史** — 自动记录所有下载任务，支持清空
- **配置持久化** — 所有设置自动保存，重启不丢失
- **深色主题** — 全局暗色 UI，护眼

---

## 下载

从 [Releases](https://github.com/DerekH-233/AMDL/releases) 页面下载最新版本：

| 文件 | 说明 |
|------|------|
| `AMDL_Setup_v1.0.0.exe` | 安装程序（推荐），自动创建桌面快捷方式和开始菜单 |
| `AMDL_v1.0.0_portable.zip` | 便携版，解压后运行 `启动.bat` |

> **注意**：启动请使用 `启动.bat`，它已预设了 UTF-8 编码环境变量。直接双击 `AMDL.exe` 可能在中文 Windows 上出现编码问题。

---

## 使用

1. 导出浏览器中 Apple Music 的 cookies 为 **Netscape 格式**
   - Firefox：[Get cookies.txt LOCALLY](https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally)
   - Chrome/Edge：[Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/cclelndahbckbenkjhflpdbgdldlbecc?utm_source=item-share-cb)
2. 启动 AMDL，点击「浏览」选择 `cookies.txt`，点击「检测」验证有效性
3. 粘贴 Apple Music 链接（支持歌曲、专辑、歌单、MV、艺人页面）
4. 设置保存路径，点击「开始下载」
5. 切换到「任务」页面查看实时进度

> **需要有效的 Apple Music 订阅。下载内容仅供个人使用，请尊重版权。**

### 注意事项

- **区域限制**：确保要下载的歌曲在你的 Apple Music 账户所属区域可用。例如美国区账户无法下载仅在中国区上架的歌曲。如果遇到「Resource Not Found (404)」错误，请检查歌曲是否在你的账户区域可播放。
- **启动方式**：请使用 `启动.bat` 启动，直接双击 `AMDL.exe` 可能在中文 Windows 上出现编码问题。
- **Cookies 有效期**：cookies 过期后需要重新导出。

---

## 开发

```bash
# 克隆
git clone https://github.com/DerekH-233/AMDL.git
cd AMDL

# 后端依赖
pip install -r requirements.txt

# 前端依赖
cd gui && npm install

# 开发模式（两个终端）
# 终端 1: 前端 dev server
cd gui && npm run dev
# 终端 2: 桌面应用
python desktop.py

# 一键打包
python build.py
```

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 下载引擎 | [gamdl](https://github.com/glomatico/gamdl) + [yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| 后端 | FastAPI + WebSocket + SQLite |
| 前端 | Next.js + TypeScript + Tailwind CSS |
| 桌面壳 | pywebview |
| 打包 | PyInstaller + NSIS |

## 平台支持

目前仅提供 Windows 安装包。核心组件（gamdl、FastAPI、Next.js、pywebview）均跨平台，macOS / Linux 用户可参考上方「开发」一节从源码运行。欢迎贡献 macOS 适配。

## 鸣谢

- [glomatico/gamdl](https://github.com/glomatico/gamdl) — Apple Music 下载引擎
- [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) — 通用视频下载器
- [wenfeng110402/AppleMusic-Downloader](https://github.com/wenfeng110402/AppleMusic-Downloader) — 项目灵感来源

## 免责声明

本工具仅供学习与研究使用。使用者需自行提供合法的 Apple Music 订阅凭证，并对自己的行为承担全部责任。本项目不提供、不存储任何受版权保护的内容。
