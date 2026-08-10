<div align="center">

# 📝 Whisper Markdown Editor

**一款基于 Tauri 2.0 + Vue 3 + CodeMirror 6 构建的高性能、极简美观的本地 Markdown 编辑与实时预览桌面应用**

[![Release](https://img.shields.io/github/v/release/AuCf/whisper?color=0969da&style=flat-shadow)](https://github.com/AuCf/whisper/releases)
[![Website](https://img.shields.io/badge/%F0%9F%8D%87_%E5%AE%98%E6%96%B9%E7%BD%91%E7%AB%99-aucf.github.io%2Fwhisper-0969da?style=flat-shadow)](https://aucf.github.io/whisper/)
[![Stars](https://img.shields.io/github/stars/AuCf/whisper?style=flat-shadow&logo=github)](https://github.com/AuCf/whisper/stargazers)
[![Downloads](https://img.shields.io/github/downloads/AuCf/whisper/total?style=flat-shadow&logo=github&color=0969da)](https://github.com/AuCf/whisper/releases)
[![Forks](https://img.shields.io/github/forks/AuCf/whisper?style=flat-shadow&logo=github)](https://github.com/AuCf/whisper/network/members)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri&style=flat-shadow)](https://tauri.app/)
[![Vue 3](https://img.shields.io/badge/Vue-3.4-brightgreen?logo=vuedotjs&style=flat-shadow)](https://vuejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-shadow)](LICENSE)

[🌐 官方网站](https://aucf.github.io/whisper/) • [功能特性](#-功能特性) • [快捷键指南](#-快捷键指南) • [下载安装](#-下载安装) • [开发与构建](#-开发与构建)

</div>

---

## ✨ 功能特性

### 🧠 交互式思维导图模式 (Mindmap Mode)
- **大纲可视化**：基于 `marked` AST 语法树，自动解析文档 `H1~H6` 标题生成交互式思维导图。
- **自由交互**：支持画布鼠标拖拽平移、滚轮 0.4x ~ 3x 无级缩放与一键复位。
- **点击精准跳转**：点击思维导图中的任意标题节点，自动退出导图并平滑滚动（Smooth Scroll）至预览区与编辑区的对应位置，并附带主题蓝脉冲高亮动画。

### 🔍 全局工作区搜索 (`Ctrl+Shift+F`)
- **高性能底层搜索**：Rust 后端原生快速扫描当前工作区所有子文件与子目录。
- **实时结果预览**：面板呈现模糊匹配的文件名、行号与匹配行上下文，点击一键切换标签页并高亮定位所在行。

### ⚡ 快速文件开表面板 (`Ctrl+P`)
- **模糊检索**：输入关键字快速搜索全工作区项目文件，支持键盘上下键选择与 `Enter` 快速打开。

### 🎨 独立双重排版预设与主题控制
- **渲染排版预设**：内置 **GitHub Standard** 与 **VitePress Tech** 两套现代化渲染样式，一键无缝切换。
- **多色主题选择**：支持 **Dark (暗黑)**、**Light (GitHub 亮白)**、**Solarized Dark (日光暗青)** 深度主题。
- **无 AI 味道极简设计**：精致消光配色，摒弃刺眼紫与高饱和渐变，提供极佳的沉浸式写作体验。

### 📑 状态持久化与多标签管理
- **会话持久化 (Tabs Session Persistence)**：应用关闭或重新启动时，自动还原上次打开的所有文件标签页与当前激活的文档。
- **文件树智能排重**：避免同名文件夹节点重复渲染与意外碰撞报错。

### 📊 增强型阅读状态栏
- **精确字数统计**：独立区分**中文字数**、**英文单词数**、**总字符数**。
- **预估阅读时长**：实时计算 `⏱️ 预计阅读 X 分钟`，助您把握文章篇幅。

### 🛡️ 全自定义应用模态框 (Native Modals)
- 彻底摒弃自带 `tauri.localhost` 弹窗头的浏览器原生 `prompt()` 和 `confirm()` 警告框，全站统一使用无感调用的自研 Vue Modal 组件。

---

## ⌨️ 快捷键指南

| 快捷键 | 功能说明 |
| :--- | :--- |
| `Ctrl + N` | 新建空白 Markdown 草稿 |
| `Ctrl + O` | 打开本地 Markdown 文件 |
| `Ctrl + S` | 保存当前文件 |
| `Ctrl + Shift + F` | 开启/关闭 **工作区全局搜索** |
| `Ctrl + P` | 开启/关闭 **文件快速查找面板** |
| `Ctrl + F` | 编辑器内部代码文本查找与替换 |
| `Ctrl + B` | 粗体文本 (`**bold**`) |
| `Ctrl + I` | 斜体文本 (`*italic*`) |
| `Ctrl + K` | 插入超链接 (`[title](url)`) |
| `Ctrl + /` | 切换单行注释 (`<!-- comment -->`) |

---

## 📦 下载安装

请前往 [GitHub Releases](https://github.com/AuCf/whisper/releases) 下载适合您操作系统的最新安装包：

- **Windows**: `Whisper_x64-setup.exe` (NSIS 安装包) 或 `Whisper_x64.msi`
- **macOS**: `Whisper_aarch64.dmg` (Apple Silicon M 系列芯片) / `Whisper_x64.dmg` (Intel 芯片)

### 🍎 macOS 未签名应用无法打开提示修复

由于 macOS Gatekeeper 安全机制，未经过 Apple 开发者证书签名的开源应用在首次运行时可能会提示 **“已损坏，无法打开”** 或 **“无法验证开发者”**。

在 macOS 终端 (Terminal) 中运行以下命令清除隔离属性即可正常打开：

```bash
sudo xattr -rd com.apple.quarantine /Applications/Whisper.app
```
*(注：如果将 `Whisper.app` 放置于其他自定义文件夹，请替换为对应实际路径)*

---

## 🛠️ 开发与构建

### 1. 环境准备
确保您的计算机上已安装：
- **Node.js** (>= 18) 和 `npm`
- **Rust** & `cargo`
- C++ 编译环境 (Windows 上需安装 Visual Studio C++ Build Tools)

### 2. 克隆与依赖安装
```bash
git clone https://github.com/AuCf/whisper.git
cd mdPreview
npm install
```

### 3. 开发启动
```bash
npm run tauri dev
```
支持前端 Vite 热重载 (HMR) 与 Tauri Rust 后端协同调试。

### 4. 正式打包
```bash
npm run tauri build
```
打包成功后，安装程序产物位于 `src-tauri/target/release/bundle/` 目录下。

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。
