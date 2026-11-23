# Orion

一个本地运行的 Windows 桌面 AI 客户端，单文件前端 + Electron 外壳。自带一个可以直接操作本机的「工作任务」代理：模型可以执行 PowerShell、读写文件、截屏、操作鼠标键盘、启动程序。

- 前端是一个不依赖构建工具的单文件 `Orion.html`（HTML/CSS/JS 全内联），Electron 只负责窗口、托盘级能力与 IPC。
- 适配 DeepSeek 开放平台的 `/chat/completions` 与 `/user/balance` 接口，也可指向兼容 OpenAI 格式的中转地址。
- 品牌标识为作者自绘的 Orion 星座星环，不使用任何第三方品牌素材。

## 功能

- 流式对话、多会话管理、Markdown 与代码块渲染、深浅主题
- 附件与粘贴图片、OCR、语音输入、语音朗读、联网搜索（均为可选，走真实接口并计入 token）
- 侧栏实时余额与 token 估算，上下文轮数可调（省 token 开关）
- 工作任务（本机代理）：pwsh / read / write / edit / list_dir / screenshot / click / type / key / launch / finish
- 三档权限（只读 / 工作区写入 / 完全访问），在主进程强制执行，越权与危险命令直接拒绝

## 数据与隐私

- API Key 只保存在本机 `%APPDATA%\Orion` 的浏览器存储里，不写进任何源码文件。
- 聊天记录、任务记录同样只在本机该目录；仓库里没有、也不应该有这些数据。
- 你发送的文字、图片、附件会提交给你自己配置的接口服务商处理。
- 本软件与深度求索（DeepSeek）及其关联主体没有隶属或合作关系，不是官方客户端。

## 开发与构建

需要 Node.js 18+ 与 npm。

```bash
npm install
npm start          # 直接用 Electron 打开 Orion.html（调试用，取决于本地 electron 安装方式）
```

打包 Windows 安装器（NSIS）：

```bash
npm run dist       # 或：npx electron-builder --win nsis --x64
```

国内网络可设置镜像：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

产物在 `release/`，安装后程序位于安装目录，数据在 `%APPDATA%\Orion`。

## 权限模型

| 等级 | 允许 | 禁止 |
| --- | --- | --- |
| 只读 | 读文件、列目录、截屏 | 写文件、执行命令 |
| 工作区写入（默认） | 工作区内读写、安全命令 | 工作区外路径、关机/格式化/批量删除等危险命令、鼠标键盘 |
| 完全访问 | 任意命令、任意路径、桌面操作 | — |

路径校验按绝对路径解析后比对工作区根目录，`..` 无法逃逸。

## 免责

本软件按现状提供，不对模型输出与代理执行结果作任何担保。使用「完全访问」意味着模型可以修改你的文件与系统状态，请自行评估风险并承担后果。

## 许可

MIT，见 [LICENSE](LICENSE)。
