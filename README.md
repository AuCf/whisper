# Whisper

Whisper 是一个基于 Tauri 2、Vue 3 和 CodeMirror 6 的本地 Markdown 编辑与实时预览工具。

## 环境准备

需要安装：

- Node.js 和 npm
- Rust、Cargo
- Windows C++ 构建工具

首次拉取项目后安装前端依赖：

```powershell
npm install
```

如果 PowerShell 提示找不到 `cargo`，在当前终端临时加入 Rust 工具目录：

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
```

## 开发启动

启动 Tauri 开发版窗口：

```powershell
npm run tauri dev
```

开发模式支持前端热更新，日常功能修改优先使用该命令验证。关闭 Whisper 窗口后，开发进程会随之退出。

如果只需要查看前端页面，可以运行：

```powershell
npm run dev
```

仅前端模式无法完整测试文件对话框、文件系统和窗口关闭等 Tauri 原生能力。

## 正式打包

生成 Windows 正式程序和安装包：

```powershell
npm run tauri build
```

构建完成后的主要产物：

- 免安装程序：`src-tauri/target/release/whisper.exe`
- NSIS 安装程序：`src-tauri/target/release/bundle/nsis/Whisper_0.1.0_x64-setup.exe`
- MSI 安装包：`src-tauri/target/release/bundle/msi/Whisper_0.1.0_x64_en-US.msi`

如果打包时报无法删除或拒绝访问 `whisper.exe`，请先关闭正在运行的 Whisper 开发版或正式版，再重新执行打包命令。

## 图标生成

修改 `src-tauri/icons/icon-source.png` 后，可以重新生成 Tauri 所需的 ICO 和各尺寸图标：

```powershell
npm run tauri icon src-tauri\icons\icon-source.png
```
