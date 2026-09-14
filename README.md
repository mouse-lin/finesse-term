![finesse-term cover](assets/cover.jpg)

<div align="center">

# finesse-term —— 说法层

**它不决定做什么，也不决定做得好不好看。它只决定这件事该怎么说。**

[![version](https://img.shields.io/badge/version-0.1.0-111?style=flat-square)](.claude-plugin/plugin.json)
[![license](https://img.shields.io/badge/license-MIT-111?style=flat-square)](LICENSE)
[![terms](https://img.shields.io/badge/术语词条-128_条-c9863f?style=flat-square)](skills/finesse-term/data)
[![cases](https://img.shields.io/badge/检索用例-30_条-5ee9c8?style=flat-square)](scripts/check.mjs)

[快速开始](#快速开始) · [它长这样](#它长这样) · [三条硬门禁](#三条硬门禁) · [术语库](#术语库) · [可以这样问](#可以这样问) · [安装](#安装--工具支持) · [开发](#开发)

</div>

---

用户说不出「安全区」，不是因为词汇量小，是因为他描述的是**症状**（按钮被下面那条黑杠挡住了），而术语描述的是**成因**。这中间的翻译，是他自己做不到、而每一轮对话都需要的那一步。

`finesse-term` 做两件事，不打断你手上的活：

1. 把说不准的界面描述，换成一句**能直接发给 Agent** 的准确需求。
2. 主动点出你刚刚描述了、却叫不出名字的那个术语 —— 连同它最常见的那个坑。

> 作者：西瓜同学 · MIT · finesse 家族第五个 Skill

---

## 快速开始

```bash
npx skills add https://github.com/mouse-lin/finesse-term
```

装完不用专门调用它，照常干活、照常用大白话描述界面就行：

> "底下那个按钮在我 iPhone 上被挡住了一半，帮我修一下"
> "弹窗底下还能滑，关掉又回到顶部了"
> "这个卡片看着有点土，说不出哪儿不对"

它会先把活干完，再在结果里顺手点出术语和那个坑。想主动用，就 `/finesse-term say 你的原话`（其它命令见[动作命令](#动作命令)）。

> [!TIP]
> 装完想确认它在工作：问一句「底下那条黑杠挡住按钮了，这个专业上叫什么」。答出**安全区（Safe Area）**，并提醒吸底操作栏要一起处理，就对了。

> [!NOTE]
> 本地检索器需要 **Node.js 20+**（零依赖、不联网）。Claude Code 自带 Node 环境，一般不用额外装。

---

## 它长这样

你说：

```text
底下那个按钮在我 iPhone 上被挡住了一半
```

它一边帮你改，一边告诉你：

```text
已把底部操作栏的内边距接上安全区（Safe Area）—— 全面屏底部那条 Home 指示条会压掉 fixed 元素的下半截，
模拟器看不出来，只有真机会暴露。同时给内容区补了等高的底部内边距，否则列表最后一条永远被这条栏盖住。
```

两个术语一起给，不是为了凑数：**吸底和安全区不一起做就会出事。**

---

## 和其它「术语表」的区别

普通术语表假设你**知道要查什么**。这个库假设你不知道 —— 你只有症状。

所以每条词条的检索主键不是它叫什么，而是 **`trigger`：用户会怎么描述这件事**。

| 你会说 | 它叫 |
|:---|:---|
| 按钮被挡住 · 下面那条黑杠 | 安全区 Safe Area |
| 点了没反应 · 点下去要有反馈 | 按下态 Active State |
| 看着有点土 · 很机械 · 像 PPT | 缓动曲线 Easing |
| 弹窗底下还能滑 · 关掉回到顶部 | 滚动穿透 Scroll Lock |
| 太挤了 · 不透气 | 留白 Whitespace |
| 图片加载完页面往下跳 | 布局偏移 CLS |
| 一条数据都没有的时候 | 空状态 Empty State |
| 电脑上打开这个 H5 很怪 | 桌面手机画框 |

检索是**本地**的，零网络依赖，几毫秒返回。

---

## 三条硬门禁

这三条是这个 Skill 存在的意义 —— 违反任何一条，它就从「帮你说准」变成了炫技。

### ① 指得出触发的那几个字

每一条给出的术语，都必须能指着用户这一轮的**原话**说出是哪几个字触发的。指不出来就不提。

**宁可一条都不提。**「不用说」是这个 Skill 最常见的正确输出。

### ② H5 的搭档必须一起给

移动端的坑几乎都是成对的。只说一半等于埋雷：

| 只说了 | 就必须一起说 | 否则 |
|:---|:---|:---|
| 吸底操作栏 | 安全区 | 全面屏上按钮被 Home 条压掉一半 |
| 弹层 | 滚动穿透 | 弹窗底下的页面跟着滑，关掉还弹回顶部 |
| 输入框 | 键盘顶起 | iOS 上键盘把提交按钮顶出屏幕 |
| 图片 | 宽高比容器 | 图一加载完，用户正要点的按钮跑了 |
| 头尾固定 | 滚动容器 | iOS 地址栏一收缩，固定栏开始抖 |

### ③ 结果在前，术语在后

先把用户要的活干完，术语长在结果的行文里。一次最多 1–3 条。不生成学习路线、课程、练习或术语清单。

---

## 术语库

128 条，五册：

| 册 | 收什么 | 条数 |
|:---|:---|:---|
| `data/web.json` | 通用 Web：布局 · 组件 · 状态 · 交互 · 表单 · 无障碍 · 性能 | 44 |
| `data/h5.json` | 移动 H5 专属：适配 · 容器 · 手势 · 键盘 · 弹层 · WebView | 30 |
| `data/motion.json` | 动效与质感：过渡 · 转场 · 反馈 · 材质 · 排版节奏 · 高级交互手法 | 34 |
| `data/mp.json` | 小程序专属：分包 · 页面栈 · 生命周期 · 自定义组件 · 登录与消息 · 云开发 | 10 |
| `data/base.json` | 前端基础概念：盒模型 · 弹性布局 · 定位 · 事件流 · 跨域 · 缓存 · 首屏 · 存储 | 10 |

每条十个字段。其中三个是这个库和普通术语表的差别：

- **`trigger`** —— 用户会怎么描述这件事。检索的主键。
- **`say`** —— 可以直接复制给 Agent 的一句标准表达，带具体数值，不绑任何框架。
- **`trap`** —— 这个术语最常见的翻车方式。**多数时候它比定义更值得说。**

`trap` 只收「知道这个词的人也照样会犯的错」：

> 锁滚动时直接给 body 加 `overflow: hidden` —— iOS 上页面会瞬间弹回顶部，关掉弹窗用户发现自己回到了第一屏。必须先存 scrollTop，关闭时还原。

---

## 浏览页：43 条可以上手摸

`docs/index.html` 是这个库的静态浏览页——零依赖、离线能开、按你的原话搜（`npm run docs` 生成）。

打开方式：clone 仓库后直接双击 `docs/index.html`，或者在地址后面加 `#词条id` 直接展开某一条：

```bash
open docs/index.html#safe-area        # macOS；Windows 用 start，Linux 用 xdg-open
```

116 条词条带一组示意图讲结构，其中 **43 条另带一块「真机演示」**：不是截图，是一段真在跑的界面，装在手机画框里。

- 滚动穿透真的会穿透，关掉弹层真的弹回第一屏
- 下拉刷新、左滑删除、长按菜单、底部弹层，都能用手指拖
- 一个开关切「✗ 错的做法 / ✓ 对的做法」，两侧共用同一段 DOM，差别只在那一个属性上——看到的不是两张图，是那一行代码的后果

覆盖移动 H5 册全部 30 条，加动效册 13 条。手机上打开这一页最划算：`tap-highlight` 那侧的系统高亮、`haptic` 的震动、`prefers-reduced-motion` 的降级，都是真机才认。桌面上取不到的能力（`env()`、系统键盘、马达），画框旁写明了用什么模拟、真机上由谁提供——不拿模拟冒充真的。

演示写在 `scripts/demos.mjs`，加一条的规矩写在那个文件的头部。

---

## 可以这样问

| 你想做什么 | 直接说 |
|:---|:---|
| 把需求说准确 | `把这句话改成能直接发给 Agent 的需求：我想让卡片鼠标放上去浮起来一点` |
| 主动获得术语提示 | `听我描述的时候顺手告诉我最该用的 1–3 个术语，别等我问` |
| 只问名字 | `底下那条黑杠挡住按钮了，这个专业上叫什么` |
| 看懂别人的话 | `他说这里要做乐观更新和错误回滚，结合我这个点赞功能用大白话讲，我下一步该问他什么` |
| 审一段需求 | `check：帮我看看这段需求里哪里含糊、哪里漏了成对的东西` |
| 统一说法 | `align：这个项目里同一个东西有三种叫法，给我一张对齐表` |

---

## 动作命令

| 命令 | 干什么 |
|:---|:---|
| `say <原话>` | 改写成可直接发给 Agent 的准确需求（不带命令时的默认动作） |
| `name <原话>` | 只回答「这叫什么」，附一句解释和那个坑 |
| `explain <别人的话>` | 拆解听不懂的一段，只讲影响下一步的那个概念 |
| `check <一段需求>` | 审需求：哪里含糊、哪里漏了成对的搭档 |
| `align` | 生成 `.finesse/lexicon.md` 说法对齐表 |
| `list [--surface h5]` | 列出术语库里有什么 |

---

## 可选产出：说法对齐表

一个项目里同一个组件常有三种叫法（「弹窗」「浮层」「模态框」），需求文档、代码命名和口头沟通各用一种，久了没人确定说的是不是同一个东西。

`align` 把每个概念钉死成一个说法，落到 `.finesse/lexicon.md`：

```markdown
| 本项目统一叫 | 术语 | 代码里的名字 | 别再叫 |
|:---|:---|:---|:---|
| 底部弹层 | Bottom Sheet | `<BottomSheet>` | 半屏弹窗 · 上拉框 · 抽屉 |
| 空状态 | Empty State | `<EmptyState>` | 缺省页 · 无数据页 |
```

只在你要求、或者同一个东西出现第三种叫法时才写。

---

## 在 finesse 家族里的位置

其余几个 Skill 各占流水线上的一段。**这一个是横着的** —— 它不占任何一段，在每一段里都开着：

```
finesse-brief   做什么       → .workbench/spec.md
finesse-route   按谁的规则做  → .finesse/brief.md
finesse-gallery 长什么样     → .finesse/look.md
finesse-ui      做出来       → 页面
─────────────────────────────────────────────
finesse-term    怎么说       ← 上面每一段里都在跑
```

它对上游最直接的作用是：用户提给 `finesse-brief` 的那句需求，本来是「我想让它好看点」，经过说法层变成一句写得进 spec 的话。对下游的作用是：你看得懂 `finesse-ui` 交付说明里的每一个词，也知道该怎么否决它。

单独用也完全成立 —— 它不读也不写上面任何一个文件。

---

## 范围之外

- 后端、数据库、部署、构建工具的术语 —— 这个库只管**看得见的那一层**
- 某个框架/组件库的专有名词（`v-model`、`useState`、`el-table`）—— 换个技术栈就作废
- 教学：不生成学习路线、课程计划、练习题、术语背诵清单
- 不对用户已经说准确的话做任何修饰

---

## 安装 & 工具支持

> [!NOTE]
> 推荐用 `npx skills`，一条命令通用于所有 agent，运行时会让你选装到哪个 agent。其他装法在下面的折叠区里。

```bash
npx skills add https://github.com/mouse-lin/finesse-term
```

整个 Skill 就是 `skills/finesse-term/` 这一个目录（`SKILL.md` + `data/` + `references/` + `scripts/`），手动装也只是把它放到 agent 能读到的地方。

| 工具 | 深度 | 装法 |
|:---|:---|:---|
| **Claude Code** | 完整 | `npx skills`，或复制目录到 `~/.claude/skills/` |
| **Trae / Trae 国内版** | 完整 | 复制目录到项目的 `.trae/skills/` / `.trae-cn/skills/` |
| **CodeBuddy** | 完整 | 复制目录到项目的 `.codebuddy/skills/` |
| **豆包 Doubao** | 完整 | 复制目录到豆包用户技能目录（[见下](#豆包doubao)） |
| **Cursor / OpenAI Codex / GitHub Copilot** | 手动引用 | 目录放进项目，在规则文件里指向 `SKILL.md`（[见下](#cursor--openai-codex--github-copilot)） |
| **其他（ChatGPT / API）** | 仅规则 | 把 `SKILL.md` 粘进 system prompt；跑不了检索器，只能按规则说话，查不了本地库 |

<details>
<summary><b>各工具的具体命令</b></summary>

<br>

先把仓库拉下来：

```bash
git clone https://github.com/mouse-lin/finesse-term
cd finesse-term
```

### Claude Code

```bash
# 全局可用
cp -r skills/finesse-term ~/.claude/skills/
# 或只在某个项目里用
cp -r skills/finesse-term your-project/.claude/skills/
```

对话里描述界面时自动触发，也可以 `/finesse-term` 直接调用。

### Trae

```bash
cp -r skills/finesse-term your-project/.trae/skills/
# 国内版：
cp -r skills/finesse-term your-project/.trae-cn/skills/
```

### CodeBuddy

```bash
cp -r skills/finesse-term your-project/.codebuddy/skills/
```

### 豆包（Doubao）

豆包桌面版的技能目录与 Claude Code 同构，但它是**全局安装**，不放进项目：

```bash
# macOS 豆包桌面版
DOUBAO=~/"Library/Application Support/Doubao/Default/.doubao/agent_mode/workspace/.user_skills"
mkdir -p "$DOUBAO" && cp -r skills/finesse-term "$DOUBAO"/
```

装完重启豆包，问一句「你现在能用哪些技能」确认它在列表里。豆包没有斜杠命令，只能自然语言触发；环境里没有 node 时，Skill 会退回直接读 `data/*.json` 查词条。

### Cursor / OpenAI Codex / GitHub Copilot

这三个不认 Skill 目录，需要把目录放进项目，再用各自的规则文件告诉它去读：

```bash
cp -r skills/finesse-term your-project/skills/
```

然后在 `.cursor/rules/finesse-term.mdc`、`AGENTS.md` 或 `.github/copilot-instructions.md` 里加一句：

```text
用户用大白话描述网页或 H5 的效果、交互、状态或故障时，按 skills/finesse-term/SKILL.md 执行；
其中的 <skill-root> 就是 skills/finesse-term。
```

</details>

---

## 开发

需要 Node.js 20 或更高版本，零依赖。

```bash
npm test        # 数据完整性 + 30 条检索回归用例
```

直接查库：

```bash
node skills/finesse-term/scripts/term.mjs find --q "底部按钮被那条黑杠挡住了"
node skills/finesse-term/scripts/term.mjs find --q "弹窗底下还能滑" --surface h5
node skills/finesse-term/scripts/term.mjs get safe-area sticky-footer
node skills/finesse-term/scripts/term.mjs list --layer motion
node skills/finesse-term/scripts/term.mjs check
```

<details>
<summary>仓库结构</summary>

```text
skills/finesse-term/
├── SKILL.md                    # 唯一真源
├── data/
│   ├── web.json                # 通用 Web           44 条
│   ├── h5.json                 # 移动 H5 专属       30 条
│   ├── motion.json             # 动效与质感         34 条
│   ├── mp.json                 # 小程序专属         10 条
│   └── base.json               # 前端基础概念       10 条
├── references/
│   ├── entry-format.md         # 词条契约：十个字段怎么写，怎么加新词
│   ├── retrieval.md            # 检索策略：拆子句、控噪音、零命中怎么办
│   └── speaking.md             # 输出形态：三种场景的措辞，和不该说话的时候
└── scripts/term.mjs            # 本地检索器（find · get · list · check）

scripts/check.mjs               # 仓库自检：数据完整性 + 检索回归
scripts/build-docs.mjs          # 生成 docs/index.html
scripts/diagrams.mjs            # 示意图库：抽象几何，讲结构
scripts/demos.mjs               # 真机演示库：真跑的 DOM/CSS/JS，讲后果
```

</details>

### 加一条词条

1. 选册 → 按十个字段写全 → `trigger` 至少四条**口语**
2. 双向挂 `pairs`
3. `node skills/finesse-term/scripts/term.mjs check` 必须零问题
4. 在 `scripts/check.mjs` 的 `CASES` 里加一条检索用例（句子要用口语，不用术语）
5. `npm test` 全绿

规矩写在 `skills/finesse-term/references/entry-format.md`。

---

## 许可

[MIT](LICENSE)
