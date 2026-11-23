# Orion

[中文](#中文) · [English](#english)

一个本地运行的 Windows 桌面 AI 客户端，前端为原生 HTML/CSS/JS，外壳为 Electron。内置「工作任务」本机代理：模型可以执行 PowerShell、读写文件、截屏、操作鼠标键盘、启动程序。

A Windows desktop AI client running fully locally: plain HTML/CSS/JS front end, Electron shell, and a built-in "Work Task" agent that can run PowerShell, read and write files, take screenshots, control the mouse and keyboard, and launch programs.

## 下载 / Download

到 [Releases](https://github.com/Seven-Wang14/orion-desktop/releases/latest) 下载 `Orion-Setup-x.y.z.exe`，双击安装即可，无需 Node.js。

Download `Orion-Setup-x.y.z.exe` from [Releases](https://github.com/Seven-Wang14/orion-desktop/releases/latest) and run the installer. No Node.js required.

安装包未做代码签名，Windows 可能提示"未知发布者"，这是自签名项目的正常现象。

The installer is unsigned, so Windows may warn about an unknown publisher. This is expected for an independent build.

## 中文

### 功能

- 流式对话、多会话、Markdown 与代码块、深浅主题
- 附件与粘贴图片、OCR、语音输入、语音朗读、联网搜索（可选，走真实接口并计入 token）
- 侧栏余额与 token 估算，上下文轮数可调
- 工作任务：`pwsh`、`read`、`write`、`edit`、`list_dir`、`screenshot`、`click`、`type`、`key`、`launch`、`finish`
- 三档权限（只读 / 工作区写入 / 完全访问），主进程强制执行

### 数据与隐私

- API Key 只保存在本机 `%APPDATA%\Orion`，不写进源码，不经过作者服务器
- 聊天记录、任务记录只在本机该目录
- 发送的文字、图片、附件会提交给你自己配置的接口服务商

### 权限模型

| 等级 | 允许 | 禁止 |
| --- | --- | --- |
| 只读 | 读文件、列目录、截屏 | 写文件、执行命令 |
| 工作区写入（默认） | 工作区内读写、安全命令 | 工作区外路径、危险命令、鼠标键盘 |
| 完全访问 | 任意命令、任意路径、桌面操作 | — |

路径校验按绝对路径解析后比对工作区根目录，`..` 无法逃逸。

### 免责声明

使用「完全访问」等于把本机命令行交给模型，模型可能覆盖文件、修改系统设置、操作你的桌面。所有后果由使用者承担。完整条款见 [DISCLAIMER.md](DISCLAIMER.md)。

## English

### Features

- Streaming chat, multiple conversations, Markdown and code blocks, light and dark themes
- Attachments and pasted images, OCR, speech input, text-to-speech, web search (optional, real APIs, token usage counted)
- Balance and token estimate in the sidebar, adjustable context length
- Work Task agent tools: `pwsh`, `read`, `write`, `edit`, `list_dir`, `screenshot`, `click`, `type`, `key`, `launch`, `finish`
- Three permission levels (read-only / workspace write / full access), enforced in the main process

### Data and privacy

- Your API key stays on this machine in `%APPDATA%\Orion`; it is never written into source code and never sent to the author's servers
- Chat history and task history also live only in that local directory
- Text, images and attachments you send are submitted to the API provider you configure

### Permission model

| Level | Allowed | Blocked |
| --- | --- | --- |
| Read-only | Read files, list directories, screenshot | Writing files, running commands |
| Workspace write (default) | Read/write inside workspace, safe commands | Paths outside workspace, destructive commands, mouse/keyboard |
| Full access | Any command, any path, desktop control | — |

Paths are resolved to absolute form and compared against the workspace root, so `..` cannot escape.

### Disclaimer

"Full access" hands your local command line and desktop to the model. It may overwrite files, change system settings, or control your input devices. You are responsible for every consequence. See [DISCLAIMER.md](DISCLAIMER.md) for the full text.

## 构建 / Build

国内网络直接用镜像，不要用默认源，否则 Electron 二进制下载会非常慢。

For users in mainland China, use the mirrors below instead of the default registries. Downloading the Electron binary from the default source is extremely slow.

```bash
npm config set registry https://registry.npmmirror.com
npm install
npm run dist
```

仓库已带 `.npmrc`，其中固定了 npm 源、Electron 与 electron-builder 的国内镜像；直接 `npm install` 即可。若仍想手动指定：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npm install
npm run dist
```

其它平台或只想本地运行：

```bash
npm start
```

产物在 `release/`，安装后程序位于安装目录，数据在 `%APPDATA%\Orion`。

## 目录结构 / Layout

```
main.js            Electron 主进程、IPC 工具层、权限与路径监狱
preload.js         暴露 window.orion（tool / abort / info / 工作区选择）
index.html         页面结构
styles.css         全部样式
core.js            存储、图标、Markdown
ui.js              渲染、额度、主题、设置、任务卡片
app.js             发送、流式、本机代理循环、工作台菜单与事件绑定
orion-mark.svg     品牌矢量图
```

## 许可 / License

MIT，见 [LICENSE](LICENSE)。本项目与深度求索（DeepSeek）无隶属关系，非官方客户端。

MIT, see [LICENSE](LICENSE). This project is not affiliated with DeepSeek and is not an official client.
