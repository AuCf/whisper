# Whisper — Markdown 编辑与预览工具实现计划与设计文档

本文档为 **Whisper** 桌面应用程序的完整研发计划、架构设计与实现文档。

---

## 🛠️ 技术栈选型

| 层级 | 选用技术 | 说明 / 优势 |
|---|---|---|
| **桌面客户端容器** | **Tauri 2.0 (Rust)** | 超轻量级（打包体积仅 ~4.6MB，内存占用仅 ~40MB），高安全性原生 Rust 文件系统 API |
| **前端应用框架** | **Vue 3 (Composition API) + Vite** | 响应式状态驱动，极速 HMR 开发体验与高性能构建 |
| **全局状态管理** | **Pinia** | 管理多标签页 (Tabs)、工作区文件树、当前选中文件、全屏模式等状态 |
| **代码/文本编辑器** | **CodeMirror 6** | 工业级现代编辑器引擎，内置 Markdown 语法高亮、行号显示、光标选区操控 |
| **Markdown 解析引擎** | **marked.js** | 极速 GFM 标准 Markdown 解析 |
| **代码语法高亮** | **highlight.js** | 支持 100+ 编程语言高亮着色，内置拷贝按钮 |
| **数学公式渲染** | **KaTeX** | 高性能 LaTeX 数学公式渲染（支持行内 `$E=mc^2$` 与块级 `$$...$$`） |
| **图表渲染引擎** | **Mermaid.js** | 流程图、时序图、甘特图、状态图离线矢量渲染 |
| **视觉与设计系统** | **Vanilla CSS (CSS 变量)** | GitHub 暗黑设计语言风格，完美配色的深色主题系统 |

---

## 💡 核心功能规划

### 1. 编辑与预览体验
- **双栏响应式布局**：左侧 CodeMirror 6 编辑区 + 右侧渲染预览区，支持无极拖拽调节宽度比例。
- **比例同步联动滚动**：根据编辑区与预览区滚动高度百分比，实现精准无缝的同步滚动。
- **可视化快捷工具栏**：支持加粗、斜体、删除线、标题 (H1~H3)、引用、代码块、表格、无序/有序列表、任务列表、链接、图片一键插入。
- **键盘快捷键**：
  - `Ctrl + B`：加粗
  - `Ctrl + I`：斜体
  - `Ctrl + S`：保存当前文件
  - `Ctrl + W`：关闭当前标签页
  - `F11`：全屏专注写作模式

### 2. 本地工作区与文件管理
- **工作区文件夹管理**：一键打开本地任意文件夹作为工作区，展示层级递归文件树。
- **多标签页 (Tab Bar)**：支持同时打开并编辑多个文件，未保存文件自动标注状态提示。
- **文件与目录 CRUD**：支持右键菜单以及工具栏按钮完成文件/文件夹的创建、重命名、删除。
- **2 秒自动保存**：编辑过程中后台定时自动写回本地磁盘，防止内容丢失。

### 3. 高级渲染增强
- **代码块着色与复制**：按语言类型自动染色，代码块顶部浮条支持一键复制代码。
- **LaTeX 公式**：无缝解析与渲染行内及独立块级数学公式。
- **Mermaid 矢量图表**：自动识别 `mermaid` 代码块并渲染为矢量图。
- **自动大纲/目录面板**：实时解析全文 H1~H6 标题生成可点击跳转的目录树。
- **底栏状态统计**：实时统计当前文件的字符数、中英文单词数、总行数及当前光标行/列位置。

---

## 📐 软件界面布局架构

```
┌────────────────────────────────────────────────────────────────────────┐
│ 📁 顶栏工具栏：[B] [I] [~] | [H1] [H2] [H3] | [代码] [表格] [图表] | [保存] [全屏] │
├──────────────┬──────────────────────────┬──────────────────────┬───────┤
│              │ 📄 标签页 (Tab Bar)      │                      │       │
│  工作区      ├──────────────────────────┤   Markdown 实时预览  │ 大纲  │
│  文件树      │  CodeMirror 6 编辑器     │                      │ 目录  │
│  (支持展开/  │  - 语法高亮              │   (marked + KaTeX    │ 导航  │
│   折叠与右键)│  - 智能行号              │    + highlight.js    │       │
│              │  - 快捷键绑定            │    + Mermaid)        │       │
├──────────────┴──────────────────────────┴──────────────────────┴───────┤
│ 📊 状态栏：当前文件路径 | 编码: UTF-8 | 行 12, 列 45 | 字数: 1,280 | 行数: 86  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 目录结构与代码架构

```
mdPreview/
├── PLAN.md                     # 本研发计划与架构设计文档
├── package.json                # 项目依赖配置
├── vite.config.js              # Vite 构建配置
├── index.html                  # 应用 HTML 唯一入口
├── src-tauri/                  # Tauri 2.0 (Rust 原生层)
│   ├── src/
│   │   ├── main.rs             # Rust 程序入口
│   │   ├── lib.rs              # Tauri App 插件与命令注册
│   │   └── commands.rs         # 文件读写、目录遍历等 Rust Cmds
│   ├── capabilities/           # Tauri v2 权限管理
│   │   └── default.json
│   └── tauri.conf.json         # Tauri 桌面应用配置文件
└── src/                        # Vue 3 前端应用层
    ├── main.js                 # 前端入口
    ├── App.vue                 # 根组件
    ├── components/             # UI 组件库
    │   ├── Editor.vue          # CodeMirror 6 封装
    │   ├── Preview.vue         # Markdown 渲染与 Mermaid 挂载
    │   ├── FileTree.vue        # 工作区文件树主组件
    │   ├── FileTreeNode.vue    # 递归文件树节点组件
    │   ├── TabBar.vue          # 多标签页导航
    │   ├── Toolbar.vue         # 格式化工具栏
    │   ├── Outline.vue         # 大纲目录跳转
    │   └── StatusBar.vue       # 底部状态栏
    ├── composables/            # 业务逻辑组合式函数
    │   ├── useFileSystem.js    # 封装 Tauri Rust 原生文件 IO
    │   ├── useMarkdown.js      # marked + katex + highlight 渲染管道
    │   └── useSyncScroll.js    # 双栏比例联动滚动
    ├── stores/
    │   └── editorStore.js      # Pinia 全局状态（文件、Tab、全屏等）
    └── styles/
        ├── index.css           # 深色主题全局样式与 CSS 变量
        └── markdown.css        # 预览区 Markdown 排版样式
```

---

## ⚙️ 编译打包与交付产物

利用 Tauri 2.0 原生构建机制，应用在 Windows 下可打包生成 3 种格式：

1. **绿色单文件免安装程序 (`.exe`)**：`src-tauri/target/release/whisper.exe` (~12.9 MB)
2. **NSIS 安装向导 (`.exe`)**：`src-tauri/target/release/bundle/nsis/Whisper_0.1.0_x64-setup.exe` (~4.67 MB)
3. **MSI 标准安装包 (`.msi`)**：`src-tauri/target/release/bundle/msi/Whisper_0.1.0_x64_en-US.msi` (~5.77 MB)

---

## 🚀 后续升级演进规划

- [x] **导出功能扩展**：导出为 PDF（系统打印对话框）、HTML（独立完整文件）及 PNG 图片（html2canvas 截图）。
- [x] **图片本地剪贴板粘贴**：直接粘贴剪贴板图片并自动存入文件同级 `assets/` 子目录，自动插入 Markdown 图片语法。
- [x] **多主题切换**：支持深色 (GitHub Dark)、浅色 (GitHub Light) 与 Solarized 三种主题，含 CodeMirror + Mermaid + highlight.js 联动切换，主题选择持久化至 localStorage。
- [ ] **Vim / Emacs 按键模式**：在 CodeMirror 编辑器中开启经典编辑器按键映射。

