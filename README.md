![finesse-term cover](assets/cover.jpg)

<div align="center">

# finesse-term

面向开发对话的界面与交互术语对齐工具。将口语化、症状式的界面描述，转化为可以直接发给 Agent 的准确技术需求。

[![version](https://img.shields.io/badge/version-0.1.0-111?style=flat-square)](.claude-plugin/plugin.json)
[![license](https://img.shields.io/badge/license-MIT-111?style=flat-square)](LICENSE)
[![terms](https://img.shields.io/badge/术语词条-133_条-c9863f?style=flat-square)](skills/finesse-term/data)
[![cases](https://img.shields.io/badge/检索用例-30_条-5ee9c8?style=flat-square)](scripts/check.mjs)

[快速开始](#快速开始) · [实际效果](#实际效果) · [核心原则](#核心设计原则) · [术语库](#术语库) · [交互文档](#交互文档) · [指令说明](#动作命令) · [安装与集成](#安装--工具支持)

</div>

---

## 为什么需要它

描述界面问题时，我们通常描述的是现象（"底下那个按钮在 iPhone 上被黑条挡住了"），而开发和 Agent 需要的是成因和实现方式（"吸底操作栏的安全区适配"）。

finesse-term 在对话中自动完成这层转换：

1. **需求转换**：把模糊的界面描述改写成 Agent 能直接执行的技术需求。
2. **术语提示**：交付代码或方案的同时，指出对应的前端术语和常见实现误区（trap）。

词条按用户的描述方式检索，而不是按术语名称：

| 常见描述 | 对应术语 |
|:---|:---|
| 按钮被挡住 · 下面那条黑杠 | 安全区 Safe Area |
| 点了没反应 · 点下去要有反馈 | 按下态 Active State |
| 看着有点土 · 很机械 · 像 PPT | 缓动曲线 Easing |
| 弹窗底下还能滑 · 关掉回到顶部 | 滚动穿透 Scroll Lock |
| 太挤了 · 不透气 | 留白 Whitespace |
| 图片加载完页面往下跳 | 布局偏移 CLS |
| 一条数据都没有的时候 | 空状态 Empty State |

---

## 快速开始

```bash
npx skills add https://github.com/mouse-lin/finesse-term
```

安装后无需单独调用，正常用口语描述界面问题即可：

- "底下那个按钮在我 iPhone 上被挡住了一半，帮我修一下"
- "弹窗底下还能滑，关掉又回到顶部了"
- "这个卡片悬停效果很机械，像 PPT"

它会直接完成改动，并在说明中带出相关术语和注意事项。

> [!NOTE]
> 环境要求 Node.js 20+。无第三方依赖，本地离线检索，毫秒级返回。

装完可以这样验证：问"底下那条黑杠挡住按钮了，这个专业上叫什么"，回答应为**安全区（Safe Area）**，并提示吸底操作栏需要一起处理。

---

## 实际效果

输入：

```text
底下那个按钮在我 iPhone 上被挡住了一半
```

输出：

```text
已为底部操作栏补充安全区适配（Safe Area）：padding-bottom: env(safe-area-inset-bottom)。
iOS 全面屏底部的 Home 指示条会遮挡 fixed 元素，模拟器上通常看不出来。
同时为列表容器补充了等高的底部内边距，避免最后一行内容被吸底栏遮挡。
```

---

## 核心设计原则

为避免过度输出和无关科普，Skill 遵循三条规则：

1. **原话触发**：只有命中用户原话中的描述（`trigger`）时才给出术语；没有明确匹配时只处理任务，不输出术语。
2. **关联问题一起提示**：移动端布局的问题往往成对出现，命中其中一个时会同时提示关联项：
   - 吸底操作栏 → 安全区、内容区底部留白
   - 弹层 / 模态框 → 滚动穿透（Scroll Lock）、关闭后的滚动位置还原
   - 输入框 → 软键盘顶起遮挡
   - 图片 → 宽高比占位（Aspect Ratio），避免布局偏移（CLS）
3. **任务优先，术语后置**：先给出方案和代码，术语和注意事项放在简要说明中，单次 1–3 个，不输出教学内容。

---

## 术语库

共 133 条前端 / 移动端常见概念，分 5 册：

| 文件 | 覆盖范围 | 条数 |
|:---|:---|:---|
| `data/web.json` | 通用 Web：布局、组件、界面状态、交互、表单、无障碍、性能、Dashboard 整页布局 | 49 |
| `data/h5.json` | 移动端 H5：视口适配、滚动容器、手势、键盘、弹层、WebView | 30 |
| `data/motion.json` | 动效与质感：缓动曲线、过渡转场、微交互反馈、排版节奏 | 34 |
| `data/mp.json` | 小程序：分包加载、页面栈、生命周期、自定义组件、登录与消息 | 10 |
| `data/base.json` | 前端基础：盒模型、Flex 布局、定位、事件冒泡、跨域、缓存、首屏、存储 | 10 |

每条词条有 10 个字段，其中三个最关键：

- **`trigger`**：用户的常见口语描述，检索主键。
- **`say`**：标准化的需求表达，带具体参数，不绑定框架。
- **`trap`**：该概念最常见的实现错误。例如锁滚动时直接给 body 加 `overflow: hidden`，iOS 上页面会跳回顶部，需要先保存 scrollTop，关闭时还原。

---

## 交互文档

仓库内置离线静态浏览页 `docs/index.html`（由 `npm run docs` 生成）：

- 支持用口语描述直接检索词条。
- 116 条词条带结构示意图。
- 43 条带可操作的交互演示（H5 册 30 条 + 动效册 13 条），在手机画框中直接操作，例如滚动穿透、下拉刷新、左滑删除。
- 演示可切换"错误做法 / 正确做法"，两侧共用同一段 DOM，只差一个属性。

部分能力只有真机支持（`env()`、系统键盘、触感反馈），在手机上打开效果最好；桌面端的模拟方式在演示旁有说明。

本地打开：用浏览器打开 `docs/index.html`（macOS 可执行 `open docs/index.html`），在地址末尾加 `#词条id`（如 `#safe-area`）可直接展开对应词条。

新增演示的规范写在 `scripts/demos.mjs` 文件头部。

---

## 动作命令

| 指令 | 说明 |
|:---|:---|
| `/finesse-term say <原话>` | 将口语改写为可发给 Agent 的技术需求（默认行为） |
| `/finesse-term name <原话>` | 只查询对应术语及常见 trap |
| `/finesse-term explain <文本>` | 解析一段技术描述中影响下一步开发的核心概念 |
| `/finesse-term check <需求描述>` | 审查需求文本，指出表述模糊或缺少关联处理的地方 |
| `/finesse-term align` | 为当前项目生成 `.finesse/lexicon.md` 术语对齐表 |
| `/finesse-term list [--surface h5]` | 列出术语库词条 |

不支持斜杠命令的工具（如豆包）里，直接说"say：……""check：……"即可。

### 术语对齐表示例（align）

用于统一同一组件在需求文档、口头沟通和代码命名中的不同叫法：

| 统一命名 | 英文术语 | 组件命名建议 | 避免使用的别名 |
|:---|:---|:---|:---|
| 底部弹层 | Bottom Sheet | `<BottomSheet>` | 半屏弹窗 / 上拉框 / 抽屉 |
| 空状态 | Empty State | `<EmptyState>` | 缺省页 / 无数据页 |

只在主动要求，或同一个概念在对话中出现第三种叫法时才生成。

---

## 非适用范围

- 后端、数据库、CI/CD 及构建工具相关术语。
- 特定框架的专有 API（如 `v-model`、`useState`、特定 UI 库组件名）。
- 教程、学习路线或练习题。

---

## 安装 & 工具支持

推荐使用 `npx skills` 安装，运行时可选择装到哪个 agent：

```bash
npx skills add https://github.com/mouse-lin/finesse-term
```

Skill 本体只有 `skills/finesse-term/` 一个目录（`SKILL.md` + `data/` + `references/` + `scripts/`），手动安装即复制这个目录。

| 工具 | 支持方式 | 配置路径 |
|:---|:---|:---|
| **Claude Code** | 原生支持 | `npx skills` 或复制至 `~/.claude/skills/` |
| **Trae / Trae 国内版** | 原生支持 | 复制至项目 `.trae/skills/` 或 `.trae-cn/skills/` |
| **CodeBuddy** | 原生支持 | 复制至项目 `.codebuddy/skills/` |
| **豆包 Doubao** | 原生支持 | 复制至豆包用户技能目录（[见下](#豆包doubao)） |
| **Cursor / Copilot / Codex** | 规则引用 | 将目录放入项目，在规则文件中引用 `SKILL.md`（[见下](#cursor--copilot--codex)） |
| **Web 聊天 / API** | Prompt 导入 | 将 `SKILL.md` 放入 System Prompt（仅规则生效，无本地检索） |

<details>
<summary><b>各工具的具体命令</b></summary>

<br>

先克隆仓库：

```bash
git clone https://github.com/mouse-lin/finesse-term
cd finesse-term
```

### Claude Code

```bash
# 全局
cp -r skills/finesse-term ~/.claude/skills/
# 单个项目
cp -r skills/finesse-term your-project/.claude/skills/
```

### Trae

```bash
cp -r skills/finesse-term your-project/.trae/skills/
# 国内版
cp -r skills/finesse-term your-project/.trae-cn/skills/
```

### CodeBuddy

```bash
cp -r skills/finesse-term your-project/.codebuddy/skills/
```

### 豆包（Doubao）

豆包桌面版的技能目录结构与 Claude Code 相同，但为全局安装：

```bash
# macOS 豆包桌面版
DOUBAO=~/"Library/Application Support/Doubao/Default/.doubao/agent_mode/workspace/.user_skills"
mkdir -p "$DOUBAO" && cp -r skills/finesse-term "$DOUBAO"/
```

安装后重启豆包，询问"你现在能用哪些技能"确认已加载。豆包不支持斜杠命令，通过自然语言触发；环境中没有 Node 时，Skill 会改为直接读取 `data/*.json`。

### Cursor / Copilot / Codex

这三个工具不识别 Skill 目录，需要将目录放入项目，再在规则文件中引用：

```bash
cp -r skills/finesse-term your-project/skills/
```

在 `.cursor/rules/finesse-term.mdc`、`.github/copilot-instructions.md` 或 `AGENTS.md` 中加入：

```text
用户用口语描述网页或 H5 的效果、交互、状态或故障时，按 skills/finesse-term/SKILL.md 执行；
其中的 <skill-root> 为 skills/finesse-term。
```

</details>

---

## 本地开发与测试

```bash
# 数据校验 + 检索回归测试
npm test

# 在终端直接检索词条
node skills/finesse-term/scripts/term.mjs find --q "底部按钮被黑杠挡住"
node skills/finesse-term/scripts/term.mjs find --q "弹窗底下还能滑" --surface h5
node skills/finesse-term/scripts/term.mjs get safe-area sticky-footer
node skills/finesse-term/scripts/term.mjs list --layer motion
node skills/finesse-term/scripts/term.mjs check

# 重新生成浏览页
npm run docs
```

<details>
<summary>仓库结构</summary>

```text
skills/finesse-term/
├── SKILL.md                    # Skill 定义（唯一真源）
├── data/
│   ├── web.json                # 通用 Web           49 条
│   ├── h5.json                 # 移动 H5            30 条
│   ├── motion.json             # 动效与质感         34 条
│   ├── mp.json                 # 小程序             10 条
│   └── base.json               # 前端基础           10 条
├── references/
│   ├── entry-format.md         # 词条字段规范与新增流程
│   ├── retrieval.md            # 检索策略：拆分子句、控制噪音、零命中处理
│   └── speaking.md             # 输出格式：各场景的措辞模板
└── scripts/term.mjs            # 本地检索器（find · get · list · check）

scripts/check.mjs               # 数据完整性 + 检索回归
scripts/build-docs.mjs          # 生成 docs/index.html
scripts/diagrams.mjs            # 示意图
scripts/demos.mjs               # 交互演示
```

</details>

### 贡献新词条

1. 补全 10 个字段，`trigger` 至少包含 4 条常见口语表达。
2. 配置双向关联的 `pairs` 词条。
3. 运行 `node skills/finesse-term/scripts/term.mjs check`，确保没有问题。
4. 在 `scripts/check.mjs` 的 `CASES` 中添加口语检索用例，确保 `npm test` 通过。

详细规范见 `skills/finesse-term/references/entry-format.md`。

---

## 许可

[MIT](LICENSE) © 西瓜同学
