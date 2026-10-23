#!/usr/bin/env node
/**
 * 生成 docs/index.html —— finesse-term 术语库的静态浏览页。
 *
 * 数据来自 skills/finesse-term/data/*.json，全部内联进产物里：
 * 打开页面不需要网络就能查（字体走 Google Fonts CDN，离线时回退系统字体）。
 * 页面内的检索逻辑（normalize / bigrams / coverage）是 term.mjs 打分算法的
 * JS 移植，改动打分要两边一起改。
 *
 * 视觉上参考了仓库里 showcase/ 的暗色编辑室风格（linea / cortex 那条路子）：
 * 近黑底 + 暖白字 + 单一强调色，Space Grotesk 做标题，JetBrains Mono 做
 * 追踪大写的标签和「怎么说 / 坑」代码块，不是照搬某一页，是抽同一套语言。
 *
 * 用法：node scripts/build-docs.mjs
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DIAGRAMS } from "./diagrams.mjs";
import { DEMOS } from "./demos.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "skills", "finesse-term", "data");
const OUT_DIR = join(ROOT, "docs");
const OUT_FILE = join(OUT_DIR, "index.html");

// 平台只分两本：Web 和 Mobile。h5 / 小程序 / 动效 / 基础都归 Mobile 那本，
// 因为用户找词的时候问的是「我在做哪端」，不是「这条收在哪个文件里」。
const BOOK_LABEL = {
  "web.json": "Web",
  "h5.json": "Mobile", "mp.json": "Mobile", "motion.json": "Mobile", "base.json": "Mobile",
};

/* -------------------------------------------------------------------- 读数据 */

// 文件顺序就是首页的默认排序，所以显式写死：移动适配打头，基础概念收尾。
// 交给 readdirSync().sort() 的话，首页第一屏会变成按文件名字母序，跟内容轻重无关。
const FILE_ORDER = ["h5.json", "motion.json", "web.json", "mp.json", "base.json"];

function loadCorpus() {
  const found = readdirSync(DATA_DIR).filter((name) => name.endsWith(".json"));
  const files = found.slice().sort((a, b) => {
    const ia = FILE_ORDER.indexOf(a), ib = FILE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  const terms = [];
  for (const name of files) {
    const raw = JSON.parse(readFileSync(join(DATA_DIR, name), "utf8"));
    const surface = raw.surface || "both";
    for (const term of raw.terms || []) {
      terms.push({ ...term, surface: term.surface || surface, book: BOOK_LABEL[name] || name });
    }
  }
  return terms;
}

const corpus = loadCorpus();
const byId = new Map(corpus.map((t) => [t.id, t]));

// 每条词条给一组图，不是一张：见 diagrams.mjs 顶部的说明。
// 子节点在这里套上统一的 viewBox 和箭头 defs。
// 箭头 marker 的 id 在整页里只能有一份，所以拆到页面底部单独放一次，
// 每张图只引用不重复定义（190+ 张图各带一份 defs 会白白胖上几十 KB）。
function wrapDiagram(inner) {
  return `<svg viewBox="0 0 260 100" class="dgm" role="img" aria-hidden="true">${inner}</svg>`;
}

function figuresOf(id) {
  const list = DIAGRAMS[id];
  if (!list || !list.length) return [];
  return list.map((f) => ({ cap: f.cap, svg: wrapDiagram(f.svg) }));
}

/* 真机演示（demos.mjs）：示意图讲结构，演示讲后果。
   CSS 里的 & 在这里换成作用域选择器，一条演示的样式碰不到页面其余部分；
   JS 挂到全局 DEMO_JS，弹层打开时才跑，关掉就整段拆干净。 */
function scopeCss(id, css) {
  return String(css || "").replace(/&/g, `.dm[data-demo="${id}"]`);
}

const demoIds = Object.keys(DEMOS).filter((id) => {
  if (byId.has(id)) return true;
  process.stderr.write(`! demos.mjs 里的 ${id} 在术语库里没有对应词条，已跳过\n`);
  return false;
});

const demoCss = demoIds.map((id) => scopeCss(id, DEMOS[id].css)).join("\n");
const demoJs = demoIds
  .filter((id) => DEMOS[id].js)
  .map((id) => `DEMO_JS[${JSON.stringify(id)}] = function (root, api) {${DEMOS[id].js}\n};`)
  .join("\n");

function demoOf(id) {
  const d = DEMOS[id];
  if (!d || !demoIds.includes(id)) return null;
  return {
    frame: d.frame || "phone",
    modes: d.modes || null,
    cap: d.cap || "",
    note: d.note || "",
    html: d.html,
    replay: !!d.replay,
  };
}

// pairs 在生成期把 id 换成 {id, title}，页面里就不用再反查一次。
const payload = corpus.map((t) => ({
  id: t.id,
  title: t.title,
  en: t.en,
  aliases: t.aliases || [],
  layer: t.layer,
  book: t.book,
  plain: t.plain,
  say: t.say,
  trap: t.trap,
  trigger: t.trigger || [],
  pairs: (t.pairs || []).map((id) => ({ id, title: byId.get(id)?.title || id })),
  figures: figuresOf(t.id),
  demo: demoOf(t.id),
}));

const figureCount = payload.reduce((n, t) => n + t.figures.length, 0);
const diagramCount = payload.filter((t) => t.figures.length).length;
const demoCount = payload.filter((t) => t.demo).length;

const LAYER_LABEL = {
  layout: "布局", interaction: "交互", state: "状态", component: "组件",
  motion: "动效", visual: "质感", a11y: "无障碍", perf: "性能",
  form: "表单", platform: "容器/平台",
};

/* -------------------------------------------------------------------- 页面 */

const html = `<!doctype html>
<html lang="zh-CN" data-design="apple">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>finesse-term 术语库</title>
<script>try{document.documentElement.dataset.design=localStorage.getItem('finesse-term-design')==='classic'?'classic':'apple';var t=localStorage.getItem('finesse-term-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}</script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');

:root{
  /* 浅色为默认 token */
  --bg:#faf9f5; --bg-2:#f0eee6; --panel:#ffffff;
  --fg:#1c1a16; --fg-dim:rgba(28,26,22,.62); --fg-faint:rgba(28,26,22,.38);
  --line:rgba(28,26,22,.14); --line-soft:rgba(28,26,22,.08);
  --accent:#b3550f; --accent-dim:#fbead6;
  --ok:#2f7a3d; --bad:#c23b3b; --scrim:rgba(28,26,22,.35);
  --nav-bg:rgba(250,249,245,.88);
  --ease:cubic-bezier(.16,1,.3,1);
  --spring:cubic-bezier(.34,1.56,.64,1);
  --stagger:14ms;
  --sans:'Inter',-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
  --disp:'Space Grotesk',var(--sans);
  --mono:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;
}
/* 系统偏好深色时接管，除非用户已经手动选了浅色 */
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#0a0a08; --bg-2:#131210; --panel:#15140f;
    --fg:#f3efe4; --fg-dim:rgba(243,239,228,.58); --fg-faint:rgba(243,239,228,.32);
    --line:rgba(243,239,228,.12); --line-soft:rgba(243,239,228,.07);
    --accent:#ff8a3d; --accent-dim:rgba(255,138,61,.14);
    --ok:#8fce9c; --bad:#ff6b6b; --scrim:rgba(0,0,0,.5);
    --nav-bg:rgba(10,10,8,.88);
  }
}
/* 用户手动切到深色时，不管系统偏好是什么都生效 */
:root[data-theme="dark"]{
  --bg:#0a0a08; --bg-2:#131210; --panel:#15140f;
  --fg:#f3efe4; --fg-dim:rgba(243,239,228,.58); --fg-faint:rgba(243,239,228,.32);
  --line:rgba(243,239,228,.12); --line-soft:rgba(243,239,228,.07);
  --accent:#ff8a3d; --accent-dim:rgba(255,138,61,.14);
  --ok:#8fce9c; --bad:#ff6b6b; --scrim:rgba(0,0,0,.5);
  --nav-bg:rgba(10,10,8,.88);
}
*{box-sizing:border-box}
body{transition:background-color .2s var(--ease), color .2s var(--ease)}
html{scroll-behavior:smooth}
body{
  margin:0; background:var(--bg); color:var(--fg); font-family:var(--sans);
  line-height:1.55; -webkit-font-smoothing:antialiased;
  opacity:0; animation:page-in .5s var(--ease) .05s forwards;
}
::selection{background:var(--accent);color:#0a0a08}

/* ---- 站内动效自己也是术语库的一部分：错峰入场 / 缓动曲线 / 缩放反馈 都用上了 ---- */
/* opacity only, deliberately no transform here: animating transform on body/html turns it
   into a containing block for position:fixed descendants (the modal), which breaks the
   modal's fixed positioning relative to the viewport. */
@keyframes page-in{ from{opacity:0} to{opacity:1} }
@keyframes pop{ 0%{transform:scale(1)} 40%{transform:scale(1.06)} 100%{transform:scale(1)} }
@keyframes spin-swap{ 0%{transform:rotate(0)} 50%{transform:rotate(160deg) scale(.7); opacity:.3} 100%{transform:rotate(360deg)} }
@keyframes dot-pulse{ 0%,100%{opacity:1; text-shadow:0 0 0 transparent} 50%{opacity:.75; text-shadow:0 0 9px var(--accent)} }
@keyframes dgm-in{ from{opacity:0; transform:translateY(6px) scale(.97)} to{opacity:1; transform:none} }
@keyframes drift-a{ from{transform:translate(0,0)} to{transform:translate(50px,36px)} }
@keyframes drift-b{ from{transform:translate(0,0)} to{transform:translate(-40px,44px)} }

/* 背景氛围光斑：固定在 body 的直接子元素上，不是祖先节点，不影响 modal 的 fixed 定位 */
.bg-blob{position:fixed; z-index:-1; border-radius:50%; filter:blur(90px); background:var(--accent); pointer-events:none; opacity:.16}
.bg-blob.a{width:440px; height:440px; top:-180px; left:-100px; animation:drift-a 24s var(--ease) infinite alternate}
.bg-blob.b{width:380px; height:380px; top:80px; right:-140px; animation:drift-b 28s var(--ease) infinite alternate}
body{overflow-x:hidden}
body::after{
  content:""; position:fixed; inset:0; z-index:1; pointer-events:none; opacity:.05; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@media (prefers-reduced-motion: reduce){
  /* 这个开关本身就是词库里的「减弱动效」—— 说到做到 */
  *, *::before, *::after{animation-duration:.001s !important; animation-delay:0s !important; transition-duration:.001s !important; scroll-behavior:auto !important}
  body{opacity:1; animation:none}
  .card{opacity:1; transform:none}
  .bg-blob{animation:none; opacity:.08}
}

/* ---- 顶栏 ---- */
nav{
  position:sticky; top:0; z-index:30;
  display:flex; align-items:center; gap:22px; flex-wrap:wrap;
  padding:18px 44px; background:var(--nav-bg); backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line-soft); transition:background-color .2s var(--ease);
}
.brand{display:flex; align-items:baseline; gap:9px; white-space:nowrap}
.brand b{font-family:var(--disp); font-weight:700; font-size:17px; letter-spacing:-.01em}
.brand b i{color:var(--accent); font-style:normal; display:inline-block; animation:dot-pulse 2.6s ease-in-out infinite}
.brand span{font-family:var(--mono); font-size:10.5px; letter-spacing:.1em; color:var(--fg-faint); text-transform:uppercase}
.searchwrap{flex:1 1 300px; min-width:200px; position:relative}
.searchwrap svg{position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--fg-faint)}
#q{
  width:100%; padding:10px 14px 10px 36px; border-radius:8px;
  border:1px solid var(--line); background:var(--bg-2); color:var(--fg);
  font-family:var(--sans); font-size:13.5px;
  transition:border-color .2s var(--ease), box-shadow .2s var(--ease);
}
#q::placeholder{color:var(--fg-faint)}
#q:focus{outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-dim)}
.theme-toggle{
  border:1px solid var(--line); background:var(--bg-2); color:var(--fg-dim);
  width:32px; height:32px; border-radius:8px; cursor:pointer;
  display:flex; align-items:center; justify-content:center; flex:none;
  transition:color .15s var(--ease), border-color .15s var(--ease), transform .15s var(--ease);
}
.theme-toggle:hover{color:var(--fg); border-color:rgba(128,128,128,.4); transform:translateY(-1px)}
.theme-toggle:active{transform:translateY(0) scale(.92)}
.theme-toggle svg{width:15px; height:15px}
.theme-toggle.switching svg{animation:spin-swap .38s var(--ease)}

/* ---- 主体：侧栏（平台 → 分类两级）+ 内容 ---- */
/* 侧栏定宽，内容区吃掉剩下的横向空间。上限 1840 只是为了超宽屏上别排出七八列，
   1440 / 1680 这类真实屏幕是铺满的，不再挤在中间一条 1280 的缝里。 */
.shell{display:grid; grid-template-columns:212px minmax(0,1fr); max-width:1840px; margin:0 auto}
aside{padding:30px 14px 44px 44px; position:sticky; top:64px; align-self:start; max-height:calc(100vh - 64px); overflow-y:auto}
.side-label{
  font-family:var(--mono); font-size:10px; letter-spacing:.12em; text-transform:uppercase;
  color:var(--fg-faint); padding:2px 10px 6px; margin-top:20px;
}
.side-label:first-child{margin-top:0}
.side-group{display:flex; flex-direction:column}
.side-item{
  display:flex; justify-content:space-between; width:100%; text-align:left;
  border:none; border-left:2px solid transparent; background:transparent; color:var(--fg-dim);
  font-family:var(--mono); font-size:11.5px; letter-spacing:.06em;
  padding:7px 10px 7px 8px; border-radius:6px; cursor:pointer; margin-bottom:1px;
  transition:background-color .18s var(--ease), color .18s var(--ease), border-color .18s var(--ease);
}
.side-item .n{color:var(--fg-faint); transition:color .18s var(--ease)}
.side-item.active{background:var(--bg-2); color:var(--fg); border-left-color:var(--accent)}
.side-item:hover:not(.active){color:var(--fg)}
.side-item:active{transform:scale(.98)}

main{padding:30px 44px 100px 26px; min-width:0}
#count{font-family:var(--mono); font-size:11px; letter-spacing:.05em; color:var(--fg-faint); margin:2px 2px 16px; text-transform:uppercase}
.grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(430px,1fr)); gap:26px}

/* ---- 卡片：首页只给摘要，点进去看完整用法；默认落进视口才揭示（滚动揭示） ---- */
.card{
  background:var(--panel); border:1px solid var(--line); border-radius:16px;
  padding:30px 32px 26px; display:flex; flex-direction:column; gap:16px;
  cursor:pointer; opacity:0; transform:translateY(16px) scale(.98);
  transition:opacity .5s var(--ease), transform .5s var(--spring), border-color .2s var(--ease), box-shadow .2s var(--ease);
}
.card.in-view{opacity:1; transform:none}
.card:hover{border-color:var(--accent); transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,0,0,.14), 0 0 34px -6px var(--accent-dim)}
.card:active{transform:translateY(-2px) scale(.98); transition-duration:.08s}
.card-head{display:flex; align-items:baseline; gap:9px; flex-wrap:wrap}
.card-title{font-family:var(--disp); font-weight:600; font-size:21px; letter-spacing:-.01em}
.card-en{font-family:var(--mono); color:var(--fg-faint); font-size:12px; letter-spacing:.04em}
.tag{
  margin-left:auto; font-family:var(--mono); font-size:9.5px; letter-spacing:.08em; text-transform:uppercase;
  padding:3px 8px; border-radius:5px; background:var(--bg-2); color:var(--fg-dim); white-space:nowrap;
}
.quote{font-size:14.5px; color:var(--fg-dim); font-style:italic; position:relative; padding-left:14px}
.quote::before{content:'"'; position:absolute; left:-2px; top:-6px; font-family:var(--disp); font-size:28px; color:var(--accent); opacity:.55; font-style:normal}
.quote b{color:var(--accent); font-style:normal; font-weight:600}
.plain{margin:0; font-size:15.5px; color:var(--fg)}
.card-cta{
  margin-top:auto; padding-top:4px; display:flex; align-items:center; gap:6px;
  font-family:var(--mono); font-size:10.5px; letter-spacing:.07em; text-transform:uppercase; color:var(--accent);
}
.card-cta svg{width:12px; height:12px; transition:transform .2s var(--ease)}
.card:hover .card-cta svg{transform:translateX(3px)}

/* ---- 示意图：每条词条一组，纯几何图示，不是截图 ---- */
.dgm-box{border:1px solid var(--line); border-radius:8px; padding:8px 10px 6px; background:var(--bg-2)}
.dgm{width:100%; height:auto; display:block}
/* 一组图排成自适应网格：弹层宽的时候两三张并排，窄了自己掉成一列 */
.dgm-figs{display:grid; grid-template-columns:repeat(auto-fit,minmax(252px,1fr)); gap:14px}
.dgm-fig{display:flex; flex-direction:column; gap:7px; animation:dgm-in .5s var(--ease) backwards}
.dgm-fig .dgm-box{margin:0}
.dgm-cap{font-family:var(--mono); font-size:10.5px; line-height:1.5; letter-spacing:.03em; color:var(--fg-faint)}
/* 卡片上只放第一张，作为「点进去有图」的预告 */
.card .dgm-box{background:transparent; padding:4px 6px 2px}
.card .dgm-figs{gap:0}
/* 箭头 marker 只在页面底部定义一份，232 张图共用 */
.dgm-defs{position:absolute; width:0; height:0; overflow:hidden}
.dgm-chrome{fill:none; stroke:var(--fg-faint); stroke-width:1.6}
.dgm-chrome-fill{fill:var(--fg-faint)}
.dgm-accent-fill{fill:var(--accent)}
.dgm-bad{fill:var(--bad); fill-opacity:.22; stroke:var(--bad); stroke-width:1; stroke-dasharray:2.5 2}
.dgm-ok{fill:var(--ok); fill-opacity:.2; stroke:var(--ok); stroke-width:1}
.dgm-scrim{fill:var(--scrim)}
.dgm-frame{fill:none; stroke:var(--fg-faint); stroke-width:1.4}
.dgm-dash{stroke:var(--ok); stroke-width:1.4; stroke-dasharray:3 3}
.dgm-accent-stroke{fill:none; stroke:var(--accent); stroke-width:1.5}
.dgm-accent-line{fill:none; stroke:var(--accent); stroke-width:1.6; stroke-linejoin:round; stroke-linecap:round}
.dgm-ok-text{fill:var(--ok)}
.dgm-div{stroke:var(--line); stroke-width:1}
.dgm-arrow-bad{fill:none; stroke:var(--bad); stroke-width:1.6}
.dgm-arrow-ok{fill:none; stroke:var(--ok); stroke-width:1.6}
.dgm-marker-ok{fill:var(--ok)}
.dgm-marker-bad{fill:var(--bad)}
.dgm-mark{font-family:var(--mono); font-size:11px; font-weight:700}
.dgm-mark-ok{fill:var(--ok)}
.dgm-mark-bad{fill:var(--bad)}
.dgm-label{font-family:var(--mono); font-size:6.6px; fill:var(--fg-faint); letter-spacing:.01em}
.dgm-mono{font-family:var(--mono); font-size:8px; fill:var(--fg-dim)}
.dgm-bad-text{fill:var(--bad)}

.empty{grid-column:1/-1; text-align:center; color:var(--fg-faint); font-family:var(--mono); font-size:12.5px; padding:80px 20px; text-transform:uppercase; letter-spacing:.05em}

/* ---- 详情弹层：点卡片进来看图 + 完整话术 + 一键复制 ---- */
.modal-backdrop{
  position:fixed; inset:0; z-index:100; background:var(--scrim); backdrop-filter:blur(6px);
  display:flex; align-items:flex-start; justify-content:center; padding:56px 24px;
  overflow-y:auto; opacity:0; visibility:hidden; transition:opacity .2s var(--ease), visibility .2s var(--ease);
}
.modal-backdrop.open{opacity:1; visibility:visible}
.modal{
  background:var(--panel); border:1px solid var(--line); border-radius:16px;
  width:100%; max-width:1000px; padding:40px 46px 46px; position:relative;
  box-shadow:0 30px 70px rgba(0,0,0,.32);
  transform:translateY(14px) scale(.96); transition:transform .38s var(--spring);
}
.modal-backdrop.open .modal{transform:translateY(0) scale(1)}
.modal-close{
  position:absolute; top:18px; right:18px; width:32px; height:32px; border-radius:8px;
  border:1px solid var(--line); background:var(--bg-2); color:var(--fg-dim);
  font-size:18px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center;
  transition:color .15s var(--ease), border-color .15s var(--ease), transform .15s var(--ease);
}
.modal-close:hover{color:var(--fg); border-color:rgba(128,128,128,.4); transform:rotate(90deg)}
.modal-close:active{transform:rotate(90deg) scale(.88)}
.modal-head{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; padding-right:40px; margin-bottom:4px}
.modal-title{font-family:var(--disp); font-weight:700; font-size:25px; letter-spacing:-.01em}
.modal-en{font-family:var(--mono); color:var(--fg-faint); font-size:13px}
.modal-aliases{font-family:var(--mono); font-size:11.5px; color:var(--fg-faint); margin-bottom:6px}
.modal-plain{font-size:15px; color:var(--fg); margin:18px 0 0}
.modal .dgm-figs{margin-top:22px}
/* 弹层宽了以后，「怎么说」和「坑」并排，省一次上下扫视 */
.modal-cols{display:grid; grid-template-columns:1fr 1fr; gap:26px 30px; align-items:start}
.modal-cols .modal-section{margin-top:0}
.modal-section{margin-top:24px}
.sec-label{
  display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:9px;
  font-family:var(--mono); font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--fg-faint);
}
.say-box{
  background:var(--accent-dim); border:1px solid rgba(179,85,15,.28); border-radius:10px;
  padding:14px 16px; font-family:var(--mono); font-size:13.5px; line-height:1.7; color:var(--fg);
}
.trap-box{
  background:var(--bg-2); border-left:2px solid var(--bad); border-radius:6px;
  padding:12px 15px; font-size:13.5px; line-height:1.65; color:var(--fg-dim);
}
.copy-btn{
  flex:none; font-family:var(--mono); font-size:10.5px; letter-spacing:.05em; text-transform:uppercase;
  border:1px solid var(--accent); background:transparent; color:var(--accent);
  padding:4px 10px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;
  transition:all .15s var(--ease);
}
.copy-btn:hover{background:var(--accent-dim); transform:translateY(-1px)}
.copy-btn:active{transform:translateY(0) scale(.94)}
.copy-btn.copied{border-color:var(--ok); color:var(--ok); animation:pop .32s var(--spring)}
.chip-row{display:flex; flex-wrap:wrap; gap:6px}
.trigger-chip-lg{font-family:var(--mono); font-size:11px; color:var(--fg-dim); background:var(--bg-2); border-radius:5px; padding:4px 9px}
.trigger-chip-lg.hit{background:var(--accent-dim); color:var(--accent)}
.pair-chip{
  font-family:var(--mono); font-size:11px; color:var(--accent); background:var(--accent-dim);
  border:none; border-radius:5px; padding:4px 9px; cursor:pointer;
  transition:opacity .15s var(--ease), transform .15s var(--ease);
}
.pair-chip:hover{opacity:.8; transform:translateY(-1px)}
.pair-chip:active{transform:translateY(0) scale(.94)}

@media (max-width:1180px){
  .shell{grid-template-columns:182px minmax(0,1fr)}
  aside{padding:28px 12px 40px 24px}
  main{padding:28px 26px 90px 20px}
  .grid{grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:20px}
}
@media (max-width:900px){
  .modal-cols{grid-template-columns:1fr; gap:0}
  .modal-cols .modal-section{margin-top:24px}
  .modal-cols .modal-section:first-child{margin-top:0}
}
@media (max-width:760px){
  nav{padding:14px 18px}
  .shell{grid-template-columns:1fr}
  aside{position:static; max-height:none; padding:14px 16px 0; display:block}
  .side-label{margin-top:12px}
  .side-group{flex-direction:row; flex-wrap:wrap; gap:4px}
  .side-item{width:auto}
  main{padding:16px 18px 60px}
  .grid{grid-template-columns:1fr; gap:16px}
  .card{padding:22px 22px 18px}
  .dgm-figs{grid-template-columns:1fr}
  .modal-backdrop{padding:0}
  .modal{max-width:none; min-height:100%; border-radius:0; padding:28px 20px 40px}
}
/* ---------------- 真机演示：详情里那台真的在跑的手机 ---------------- */
/* 画框内的一切都是真 DOM：滚动是真滚动，按下态是真的 :active，
   布局偏移是真的把按钮挪走。示意图旁边放它，是为了让用户能验一遍。 */
.demo-wrap{margin-top:26px}
.demo-ctl{display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.demo-switch{display:inline-flex; border:1px solid var(--line); border-radius:7px; overflow:hidden}
.demo-switch button{
  font-family:var(--mono); font-size:10.5px; letter-spacing:.04em; padding:5px 10px;
  border:none; background:transparent; color:var(--fg-faint); cursor:pointer;
  transition:background-color .16s var(--ease), color .16s var(--ease);
}
.demo-switch button + button{border-left:1px solid var(--line)}
.demo-switch button:hover{color:var(--fg-dim)}
.demo-switch button.on[data-m="bad"]{background:rgba(194,59,59,.14); color:var(--bad)}
.demo-switch button.on[data-m="ok"]{background:rgba(47,122,61,.16); color:var(--ok)}
.demo-replay{
  font-family:var(--mono); font-size:10.5px; letter-spacing:.05em;
  border:1px solid var(--accent); background:transparent; color:var(--accent);
  padding:4px 10px; border-radius:6px; cursor:pointer;
  transition:background-color .15s var(--ease), transform .15s var(--ease);
}
.demo-replay:hover{background:var(--accent-dim)}
.demo-replay:active{transform:scale(.94)}
.demo-stage{display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; margin-top:12px}
.demo-say{flex:1 1 250px; min-width:0}
.demo-cap{margin:0; font-size:13.5px; line-height:1.8; color:var(--fg-dim)}
.demo-cap b{color:var(--fg)}
.demo-note{
  margin:14px 0 0; padding-left:11px; border-left:2px solid var(--line);
  font-family:var(--mono); font-size:11px; line-height:1.75; color:var(--fg-faint);
}
.dm{flex:none}
.dm-phone{
  position:relative; width:252px; height:472px; padding:7px; border-radius:31px;
  border:1.5px solid var(--fg-faint); background:var(--panel);
  box-shadow:0 20px 44px rgba(0,0,0,.18);
}
.dm-screen{
  position:relative; width:100%; height:100%; overflow:hidden; border-radius:25px;
  background:var(--bg); color:var(--fg); font-size:12px; line-height:1.5;
  --dm-safe:20px;
}
/* 刘海不跟主题走：真机上它任何时候都是黑的，深色下靠一圈描边留住轮廓 */
.dm-notch{
  position:absolute; top:9px; left:50%; transform:translateX(-50%); z-index:6;
  width:78px; height:20px; border-radius:11px; background:#08080a; pointer-events:none;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);
}
/* Home 指示条：画在屏幕内容之上，因为真机上它就是压在内容之上的 */
.dm-home{
  position:absolute; left:50%; transform:translateX(-50%); bottom:6px; z-index:9;
  width:104px; height:5px; border-radius:3px; background:var(--fg); opacity:.85; pointer-events:none;
  box-shadow:0 0 0 1.5px rgba(255,255,255,.45);
}
/* 安全区标尺：底部那条系统要吃掉的带。演示里画出来，是因为它在真机上看不见却一直在 */
.dm-zone{
  position:absolute; left:0; right:0; bottom:0; height:var(--dm-safe); z-index:8; pointer-events:none;
  border-top:1px dashed var(--fg-faint);
}
.dm[data-mode="bad"] .dm-zone{border-top-color:var(--bad); background:rgba(194,59,59,.16)}
.dm[data-mode="ok"] .dm-zone{border-top-color:var(--ok); background:rgba(47,122,61,.13)}
/* 横过来的手机：竖屏放不下的那几条（横屏重排）在这台上演 */
.dm-phone.land{width:440px; height:250px; border-radius:26px}
.dm-phone.land .dm-notch{top:50%; left:9px; transform:translateY(-50%); width:20px; height:74px}
.dm-phone.land .dm-home{bottom:50%; left:auto; right:6px; transform:translateY(50%); width:5px; height:86px}
/* 桌面浏览器窗口：讲「这个 H5 在电脑上打开是什么样」时才用得上 */
.dm[data-frame="wide"]{flex:1 1 100%; width:100%}
.dm-win{
  position:relative; width:100%; padding:28px 0 0; border-radius:11px;
  border:1.5px solid var(--fg-faint); background:var(--panel); overflow:hidden;
  box-shadow:0 18px 40px rgba(0,0,0,.14);
}
.dm-win::before{
  content:""; position:absolute; top:11px; left:13px; width:7px; height:7px; border-radius:50%;
  background:var(--fg-faint);
  box-shadow:12px 0 0 var(--fg-faint), 24px 0 0 var(--fg-faint);
}
.dm-win .dm-screen{height:330px; border-radius:0}
/* 页面骨架用的是裸标签选择器（nav / aside / main），画框里出现同名标签会被误伤：
   一条 <nav class="tb"> 会莫名其妙变成 sticky 顶栏。先把它们打回普通块级元素，
   演示里就能照常用语义标签写。 */
.dm-screen nav, .dm-screen aside, .dm-screen main{
  position:static; top:auto; z-index:auto; display:block; gap:0; flex-wrap:nowrap;
  padding:0; margin:0; background:none; backdrop-filter:none; border:none;
  max-height:none; overflow:visible; align-self:auto; min-width:0; transition:none;
}
/* 画框里的通用零件 */
.dm-status{
  position:absolute; top:0; left:0; right:0; height:34px; z-index:4; pointer-events:none;
  display:flex; align-items:center; justify-content:space-between; padding:2px 15px 0;
  font-family:var(--mono); font-size:9.5px; color:var(--fg-dim);
}
.dm-status-r{display:flex; align-items:center; gap:4px}
.dm-sig{width:12px; height:8px; border-radius:1.5px; background:currentColor; opacity:.55; display:block}
.dm-bat{width:16px; height:8px; border-radius:2px; border:1px solid currentColor; opacity:.55; display:block}
.dm-appbar{
  position:absolute; top:34px; left:0; right:0; height:32px; z-index:3;
  display:flex; align-items:center; gap:7px; padding:0 12px;
  font-size:12px; font-weight:600; background:var(--panel); border-bottom:1px solid var(--line-soft);
}
.dm-back{color:var(--fg-dim); font-size:16px; line-height:1}
.dm-row{display:flex; gap:9px; align-items:center; padding:10px 14px; border-bottom:1px solid var(--line-soft)}
.dm-avatar{width:30px; height:30px; border-radius:9px; background:var(--fg-faint); opacity:.4; flex:none}
.dm-avatar.big{width:40px; height:40px}
.dm-lines{flex:1; min-width:0; display:flex; flex-direction:column; gap:5px}
.dm-lines b, .dm-lines i{display:block; height:7px; border-radius:3px; background:var(--fg-faint); opacity:.5}
.dm-lines i{height:6px; opacity:.28}
@media (max-width:760px){
  .demo-stage{gap:16px}
  .dm{width:100%; display:flex; justify-content:center}
  /* 窄屏上标题和开关各占一行，开关铺满：这一排本身就是要用手指点的 */
  .demo-wrap .sec-label{flex-direction:column; align-items:flex-start; gap:9px}
  .demo-ctl{width:100%}
  .demo-switch{flex:1}
  .demo-switch button{flex:1; text-align:center; padding:8px 6px}
  .dm-phone{width:272px; height:506px}
}
@media (max-width:330px){
  .dm-phone{width:100%; height:430px}
}

${demoCss}

/* Apple reading surface. Classic styles above remain unchanged. */
.design-switch{display:flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:30px;background:var(--bg-2)}
.design-switch button{min-height:38px;padding:0 14px;border:0;border-radius:24px;background:none;color:var(--fg-dim);font:500 12px var(--sans);cursor:pointer}
.design-switch button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.design-switch button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.apple-intro{display:none}
:root[data-design="apple"]{--bg:#fff;--bg-2:#f5f5f7;--panel:#f5f5f7;--fg:#1d1d1f;--fg-dim:#626267;--fg-faint:#6e6e73;--line:#d2d2d7;--line-soft:#e8e8ed;--accent:#1d1d1f;--accent-dim:#ededf0;--nav-bg:rgba(255,255,255,.9);--sans:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;--disp:var(--sans);--mono:var(--sans)}
:root[data-design="apple"][data-theme="dark"]{--bg:#000;--bg-2:#1d1d1f;--panel:#1d1d1f;--fg:#f5f5f7;--fg-dim:#b6b6bd;--fg-faint:#a1a1a6;--line:#424245;--line-soft:#29292d;--accent:#f5f5f7;--accent-dim:#303033;--nav-bg:rgba(0,0,0,.9)}
@media(prefers-color-scheme:dark){:root[data-design="apple"]:not([data-theme="light"]){--bg:#000;--bg-2:#1d1d1f;--panel:#1d1d1f;--fg:#f5f5f7;--fg-dim:#b6b6bd;--fg-faint:#a1a1a6;--line:#424245;--line-soft:#29292d;--accent:#f5f5f7;--accent-dim:#303033;--nav-bg:rgba(0,0,0,.9)}}
[data-design="apple"] .bg-blob,[data-design="apple"] body::after{display:none}
[data-design="apple"] .brand b i{animation:none}
[data-design="apple"] body>nav{padding:18px 32px;gap:16px}
[data-design="apple"] .brand{gap:10px;flex-wrap:wrap}
[data-design="apple"] .brand b{font-size:21px;letter-spacing:-.055em}
[data-design="apple"] .brand span{font-size:11px;letter-spacing:0}
[data-design="apple"] #q{background:var(--bg-2);border-color:transparent;border-radius:12px}
[data-design="apple"] .shell{max-width:1600px;grid-template-columns:200px minmax(0,1fr)}
[data-design="apple"] aside{padding:34px 16px 30px 30px}
[data-design="apple"] main{padding:44px 36px 80px 28px}
[data-design="apple"] .side-item{font-size:12px;letter-spacing:0;padding:10px;min-height:38px;border-left:0;border-radius:9px}
[data-design="apple"] .side-item.active{background:var(--bg-2)}
[data-design="apple"] .apple-intro{display:block;margin-bottom:52px}
[data-design="apple"] .apple-intro[hidden]{display:none}
.apple-heading{display:flex;align-items:end;justify-content:space-between;gap:32px;margin-bottom:30px}
.apple-heading h1{font-size:clamp(32px,3.5vw,50px);font-weight:600;line-height:1.15;letter-spacing:-.045em;margin:0}
.apple-heading p{font-size:13px;line-height:1.8;color:var(--fg-dim);margin:0;max-width:240px}
.feature-gallery{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;align-items:start;padding:6px 0 12px}
.term-feature{position:relative;text-align:left;border:0;padding:26px 24px 22px;border-radius:24px;min-width:0;height:310px;overflow:hidden;display:flex;flex-direction:column;color:#1d1d1f;background:#f5f5f7;cursor:pointer;font:inherit;transition:transform .25s,box-shadow .25s}
.term-feature:hover{transform:translateY(-4px);box-shadow:0 12px 24px #00000012}
.term-feature:focus-visible{outline:3px solid #0071e3;outline-offset:4px}
.term-feature small{font-size:11px;opacity:.72}
.term-feature h2{font-size:25px;font-weight:600;letter-spacing:-.035em;line-height:1.2;margin:9px 0 0}
.feature-art{margin:auto 0;min-height:120px;display:flex;align-items:center;justify-content:center}
.feature-foot{display:flex;align-items:center;justify-content:space-between;font-size:11px}
.feature-foot b{flex:0 0 28px;line-height:0;display:grid;place-items:center;border-radius:50%;width:28px;height:28px;background:#1d1d1f;color:white;font-size:20px;font-weight:400}
.feature-palette{margin-top:22px;background:#000;color:#f5f5f7}
.feature-palette .feature-foot b{background:#f5f5f7;color:#1d1d1f}
.palette-objects{display:grid;grid-template-columns:1.3fr 1fr;gap:8px;width:100%;height:124px;padding:12px;background:#1d1d1f;border-radius:18px;transform:rotate(-5deg)}
.palette-objects i{display:grid;place-items:center;font-style:normal;background:#343436;border-radius:9px;font-size:16px}
.palette-objects i:first-child{grid-row:span 2;background:#f5f5f7;color:#1d1d1f;font-size:38px;letter-spacing:-3px}
.bento-objects{display:grid;grid-template-columns:1.4fr 1fr;gap:8px;width:100%;height:130px;transform:rotate(-4deg)}
.bento-objects i{border-radius:12px;background:#fff;display:grid;place-items:center;font-style:normal;font-size:12px;color:#626267}
.bento-objects i:first-child{grid-row:span 2;background:#dce9f8;color:#215e9c;font-size:44px;font-weight:600;letter-spacing:-3px}
.feature-spatial{background:radial-gradient(ellipse at 10% 20%,#d3bca5,transparent 60%),radial-gradient(ellipse at 90% 80%,#8b9fac,transparent 65%),#bac4c7;color:#202831}
.glass-objects{display:flex;gap:10px;perspective:500px;width:100%;justify-content:center}
.glass-objects i{height:120px;width:72px;border-radius:16px;border:1px solid #ffffff9c;background:linear-gradient(145deg,#ffffff90,#ffffff20);box-shadow:0 14px 20px #24343c20;backdrop-filter:blur(12px);transform:rotate(-10deg);display:grid;place-items:center;font-style:normal;font-size:30px;color:#334858}
.glass-objects i:nth-child(2){transform:translateY(-8px) rotate(-10deg)}
.glass-objects i:nth-child(3){transform:translateY(8px) rotate(-10deg)}
[data-design="apple"] #count{font-size:13px;letter-spacing:0;color:var(--fg-dim);padding-top:25px;border-top:1px solid var(--line-soft);margin:0 0 20px}
[data-design="apple"] .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
[data-design="apple"] .card{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:12px 20px;min-width:0;padding:24px;border:0;border-radius:20px;box-shadow:none;background:var(--panel);overflow-wrap:anywhere;align-items:start}
[data-design="apple"] .card:hover{transform:translateY(-2px);box-shadow:none;background:var(--bg-2)}
[data-design="apple"] .card-head{display:block;margin:0}
[data-design="apple"] .card-title{font-size:21px;letter-spacing:-.03em;display:block}
[data-design="apple"] .card-en{display:block;font-size:11px;letter-spacing:0;margin-top:4px}
[data-design="apple"] .card .tag,[data-design="apple"] .card .quote{display:none}
[data-design="apple"] .card .plain{grid-column:1;font-size:13px;line-height:1.7;color:var(--fg-dim);margin:0}
[data-design="apple"] .card .dgm-figs{grid-column:2;grid-row:1/4;display:block;align-self:center;margin:0;min-width:0}
[data-design="apple"] .card .dgm-fig{margin:0;display:block}
[data-design="apple"] .card .dgm-box{border:0;padding:0;background:none}
[data-design="apple"] .card-cta{grid-column:1;font-size:10px;letter-spacing:0;color:var(--fg-dim);padding:0;margin:6px 0 0}
[data-design="apple"] .modal{border-radius:24px;background:var(--bg)}
[data-design="apple"] .say-box{border-color:var(--line)}
[data-design="apple"] ::selection{background:var(--fg);color:var(--bg)}
@media(max-width:1200px){[data-design="apple"] .card{grid-template-columns:minmax(0,1fr)}[data-design="apple"] .card .dgm-figs{grid-column:1;grid-row:3;width:100%;max-width:240px;margin:8px auto}[data-design="apple"] .card-cta{grid-row:4}.term-feature{padding:22px 18px;height:295px}.term-feature h2{font-size:22px}}
@media(max-width:760px){[data-design="apple"] body>nav{padding:16px 20px;gap:12px}.searchwrap{order:3;flex-basis:100%}.design-switch{margin-left:auto}[data-design="apple"] .shell{grid-template-columns:minmax(0,1fr)}[data-design="apple"] aside{position:static;max-height:none;padding:16px 20px 0}[data-design="apple"] main{padding:28px 20px 60px}.apple-heading{display:block}.apple-heading p{margin-top:16px}.feature-gallery{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;padding:5px 3px 20px}.term-feature{flex:0 0 84%;scroll-snap-align:start;height:290px}.feature-palette{margin-top:0}[data-design="apple"] .grid{grid-template-columns:minmax(0,1fr)}[data-design="apple"] .card{padding:22px}[data-design="apple"] .card .dgm-figs{max-width:280px}.feature-gallery:focus-visible{outline:2px solid var(--fg);outline-offset:4px}}


/* Shared detail language: calm surfaces, clear controls, generous illustration space. */
.feature-foot{width:100%;min-height:28px}
.feature-foot b svg{display:block;width:16px;height:16px}
[data-design="apple"] .side-label{letter-spacing:0;font-size:11px;color:var(--fg-dim);padding-bottom:10px}
[data-design="apple"] .side-item{transition:background .2s,color .2s}
[data-design="apple"] .side-item.active{background:var(--fg);color:var(--bg);font-weight:500}
[data-design="apple"] .side-item.active .n{color:inherit;opacity:.8}
[data-design="apple"] .side-item:hover:not(.active){background:var(--bg-2)}
[data-design="apple"] #q{min-height:44px;transition:box-shadow .2s}
[data-design="apple"] #q:focus-visible{outline:2px solid #0071e3;outline-offset:3px}
[data-design="apple"] .card{grid-template-columns:minmax(0,1fr) 180px;gap:14px 24px;padding:26px;transition:transform .25s,box-shadow .25s}
[data-design="apple"] .card:hover{box-shadow:0 8px 20px #00000008}
[data-design="apple"] .card .dgm-figs{padding:16px 10px;background:var(--bg);border-radius:14px}
[data-design="apple"] .card-cta{font-size:11px;line-height:1.5}
[data-design="apple"] .modal{max-width:1040px;border:0;padding:44px;border-radius:28px;box-shadow:0 28px 90px #0003}
[data-design="apple"] .modal-head{display:block;margin:0 0 12px;padding-right:44px}
[data-design="apple"] .modal-title{display:block;font-size:34px;font-weight:600;letter-spacing:-.04em;line-height:1.2}
[data-design="apple"] .modal-en{display:inline-block;margin-top:9px;font-size:13px}
[data-design="apple"] .modal-head .tag{display:inline-block;margin-left:12px;padding:5px 10px;border-radius:20px;letter-spacing:0}
[data-design="apple"] .modal-aliases{font-size:12px;line-height:1.7}
[data-design="apple"] .modal-plain{font-size:17px;line-height:1.75;max-width:44em;color:var(--fg-dim);margin-top:20px}
[data-design="apple"] .modal .dgm-figs{gap:18px;margin:28px 0}
[data-design="apple"] .modal .dgm-fig{margin:0;min-width:0}
[data-design="apple"] .modal .dgm-box{background:var(--bg-2);border:0;border-radius:20px;padding:24px}
[data-design="apple"] .modal .dgm{max-height:250px}
[data-design="apple"] .dgm-cap{font-size:12px;letter-spacing:0;padding:8px 4px 0;line-height:1.7}
[data-design="apple"] .modal-cols{gap:24px}
[data-design="apple"] .sec-label{font-size:12px;letter-spacing:0;min-height:40px;margin-bottom:12px}
[data-design="apple"] .say-box{border:0;background:var(--bg-2);border-radius:18px;padding:22px;font:15px/1.8 var(--sans)}
[data-design="apple"] .trap-box{border:0;background:var(--bg-2);border-radius:18px;padding:22px;font-size:15px;line-height:1.8;color:var(--fg-dim)}
[data-design="apple"] .copy-btn{min-height:36px;border:0;border-radius:24px;padding:8px 15px;background:var(--fg);color:var(--bg);font-size:12px;letter-spacing:0}
[data-design="apple"] .copy-btn.copied{background:var(--fg);color:var(--bg)}
[data-design="apple"] .trigger-chip-lg,[data-design="apple"] .pair-chip{border-radius:20px;padding:9px 14px;font-size:12px;line-height:1.5}
[data-design="apple"] .pair-chip{min-height:40px}
[data-design="apple"] .modal-close{width:36px;height:36px;border:0;border-radius:50%;top:20px;right:20px;background:var(--bg-2)}
[data-design="apple"] .empty{border-radius:24px;padding:64px 24px;background:var(--bg-2);font:15px/1.8 var(--sans);letter-spacing:0}
@media(max-width:1200px){[data-design="apple"] .card{grid-template-columns:minmax(0,1fr)}[data-design="apple"] .card .dgm-figs{max-width:none;padding:20px}[data-design="apple"] .card .dgm{max-height:120px}}
@media(max-width:760px){[data-design="apple"] .modal{padding:28px 22px;border-radius:24px}[data-design="apple"] .modal-title{font-size:28px}[data-design="apple"] .modal-plain{font-size:15px}[data-design="apple"] .modal .dgm-box{padding:16px}[data-design="apple"] .modal .dgm-figs{grid-template-columns:minmax(0,1fr)}[data-design="apple"] .say-box,[data-design="apple"] .trap-box{padding:18px;font-size:14px}[data-design="apple"] .card{padding:22px}}


/* Snapshot crossfade keeps rearranging cards from visibly jumping. */
::view-transition-old(root){animation:design-out 220ms cubic-bezier(.2,.7,.2,1) both}
::view-transition-new(root){animation:design-in 320ms cubic-bezier(.2,.7,.2,1) both}
::view-transition-group(root){animation-duration:320ms}
::view-transition{pointer-events:none}
@keyframes design-out{from{opacity:1}to{opacity:0}}
@keyframes design-in{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){::view-transition-old(root),::view-transition-new(root),::view-transition-group(root){animation:none!important}}

</style>
</head>
<body>

<div class="bg-blob a" aria-hidden="true"></div>
<div class="bg-blob b" aria-hidden="true"></div>

<nav>
  <div class="brand"><b>finesse<i>·</i>term</b><span>本地术语库 / ${payload.length} 条</span></div>
  <div class="searchwrap">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
    <input id="q" type="search" placeholder="按你的原话搜，比如「弹窗底下还能滑」「按钮被挡住了」…" autocomplete="off">
  </div>
  <div class="design-switch" role="group" aria-label="页面设计风格"><button type="button" data-design-choice="apple" aria-pressed="true">Apple</button><button type="button" data-design-choice="classic" aria-pressed="false">经典</button></div>
  <button class="theme-toggle" id="theme-toggle" type="button" aria-label="切换深浅色主题" title="切换深浅色主题"></button>
</nav>

<div class="shell">
  <aside>
    <div class="side-label">平台</div>
    <div class="side-group" id="book-list"></div>
    <div class="side-label">分类</div>
    <div class="side-group" id="layer-list"></div>
  </aside>
  <main>
<section class="apple-intro" id="apple-intro" aria-label="设计表达精选"><div class="apple-heading"><h1>把感觉，说清楚。</h1><p>从一张卡片，到一整页界面。<br>找到你想表达的那个细节。</p></div><div class="feature-gallery" tabindex="0" aria-label="三个精选词条，窄屏可横向滚动">
<button class="term-feature" data-feature-term="bento-grid"><small>布局与主次</small><h2>大小之间，<br>看见重点。</h2><div class="feature-art" aria-hidden="true"><div class="bento-objects"><i>Aa</i><i>标题</i><i>留白</i></div></div><span class="feature-foot">便当盒布局 <b aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></b></span></button>
<button class="term-feature feature-palette" data-feature-term="surface-hierarchy"><small>色彩与表面</small><h2>不止黑白。<br>还有层次。</h2><div class="feature-art" aria-hidden="true"><div class="palette-objects"><i>Aa</i><i>明度</i><i>对比</i></div></div><span class="feature-foot">表面明度层级 <b aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></b></span></button>
<button class="term-feature feature-spatial" data-feature-term="horizontal-gallery"><small>浏览与交互</small><h2>让浏览，<br>自然流动。</h2><div class="feature-art" aria-hidden="true"><div class="glass-objects"><i>01</i><i>02</i><i>03</i></div></div><span class="feature-foot">横向图库 <b aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></b></span></button>
</div></section>
    <div id="count"></div>
    <div class="grid" id="list"></div>
  </main>
</div>

<svg class="dgm-defs" aria-hidden="true" focusable="false">
  <defs>
    <marker id="dgm-arrow-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="dgm-marker-ok"/></marker>
    <marker id="dgm-arrow-bad" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="dgm-marker-bad"/></marker>
  </defs>
</svg>

<div class="modal-backdrop" id="modal-backdrop">
  <div class="modal" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <button class="modal-close" id="modal-close" type="button" aria-label="关闭">×</button>
    <div id="modal-body"></div>
  </div>
</div>

<script>
var DEMO_JS = {};
${demoJs}
</script>
<script id="term-data" type="application/json">${JSON.stringify(payload)}</script>
<script id="layer-labels" type="application/json">${JSON.stringify(LAYER_LABEL)}</script>
<script>
(function () {
  var DATA = JSON.parse(document.getElementById("term-data").textContent);
  var LAYER_LABEL = JSON.parse(document.getElementById("layer-labels").textContent);

  /* ---- 深浅色主题：跟随系统，也可手动切换并记住 ---- */

  var THEME_KEY = "finesse-term-theme";
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5a8.5 8.5 0 1 1-9-11.9 7 7 0 0 0 9 11.9z"/></svg>';
  var themeBtn = document.getElementById("theme-toggle");

  function currentIsDark() {
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit) return explicit === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function paintThemeIcon() { themeBtn.innerHTML = currentIsDark() ? SUN : MOON; }

  var savedTheme; try { savedTheme = localStorage.getItem(THEME_KEY); } catch(e) {}
  if (savedTheme === "light" || savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", savedTheme);
  }
  paintThemeIcon();
  themeBtn.addEventListener("click", function () {
    var next = currentIsDark() ? "light" : "dark";
    themeBtn.classList.add("switching");
    setTimeout(function () {
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch(e) {}
      paintThemeIcon();
    }, 190);
    setTimeout(function () { themeBtn.classList.remove("switching"); }, 380);
  });

  var designButtons = document.querySelectorAll('[data-design-choice]');
  function paintDesign(){designButtons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.designChoice===document.documentElement.dataset.design));});}
  var requestedDesign = document.documentElement.dataset.design;
  var designTransition = null, designFade = null;
  var reducedDesignMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function applyDesign(){
    document.documentElement.dataset.design=requestedDesign;
    try{localStorage.setItem('finesse-term-design',requestedDesign);}catch(e){}
    paintDesign();
  }
  function changeDesign(next){
    requestedDesign=next;
    if(designTransition){designTransition.skipTransition();return;}
    if(document.documentElement.dataset.design===next)return;
    if(designFade){designFade.cancel();designFade=null;}
    if(reducedDesignMotion.matches){applyDesign();return;}
    if(document.startViewTransition){
      designTransition=document.startViewTransition(applyDesign);
      designTransition.ready.catch(function(){});
      designTransition.finished.catch(function(){}).finally(function(){
        designTransition=null;
        if(document.documentElement.dataset.design!==requestedDesign)changeDesign(requestedDesign);
      });
    }else{
      applyDesign();
      if(document.body.animate)designFade=document.body.animate([{opacity:.7},{opacity:1}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
  }
  designButtons.forEach(function(b){b.addEventListener('click',function(){changeDesign(b.dataset.designChoice);});});
  reducedDesignMotion.addEventListener('change',function(e){if(e.matches){if(designTransition)designTransition.skipTransition();if(designFade)designFade.cancel();}});
  paintDesign();

  /* ---- 检索算法：term.mjs 的 JS 移植，改动请两边同步 ---- */

  function normalize(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/[\\s\\u3000]+/g, "")
      .replace(/[，。、！？；：""''（）()【】\\[\\]{}<>「」·~\`!?.,;:'"/\\\\|@#$%^&*+=_-]+/g, "");
  }
  function bigrams(v) {
    var set = new Set();
    for (var i = 0; i + 1 < v.length; i++) set.add(v.slice(i, i + 2));
    return set;
  }
  function coverage(valueNorm, queryGrams) {
    var valueGrams = bigrams(valueNorm);
    if (!valueGrams.size) return 0;
    var hit = 0;
    valueGrams.forEach(function (g) { if (queryGrams.has(g)) hit++; });
    return hit / valueGrams.size;
  }
  function matchField(queryNorm, queryGrams, values, opt) {
    var best = 0, hit = null;
    values.forEach(function (value) {
      var valueNorm = normalize(value);
      if (!valueNorm) return;
      if (queryNorm.includes(valueNorm) && valueNorm.length >= 2) {
        var w = opt.forward + Math.min(12, valueNorm.length * 2);
        if (w > best) { best = w; hit = value; }
        return;
      }
      if (valueNorm.length >= 4) {
        var cov = coverage(valueNorm, queryGrams);
        if (cov >= opt.fuzzyMin) {
          var w2 = opt.forward * cov * 0.9;
          if (w2 > best) { best = w2; hit = value; }
        }
      }
      var minBackward = opt.minBackward || 2;
      if (valueNorm.includes(queryNorm) && queryNorm.length >= minBackward) {
        var w3 = opt.backward + Math.min(8, queryNorm.length);
        if (w3 > best) { best = w3; hit = value; }
      }
    });
    return { score: best, hit: hit };
  }
  function scoreTerm(term, queryNorm, queryGrams) {
    if (normalize(term.id) === queryNorm || normalize(term.title) === queryNorm) {
      return { score: 200, hitTriggers: [] };
    }
    var score = 0;
    var hitTriggers = [];
    var trigger = matchField(queryNorm, queryGrams, term.trigger || [], { forward: 60, backward: 30, minBackward: 3, fuzzyMin: 0.6 });
    if (trigger.score) { score += trigger.score; if (trigger.hit) hitTriggers.push(trigger.hit); }
    var alias = matchField(queryNorm, queryGrams, [term.title, term.en].concat(term.aliases || []), { forward: 52, backward: 34, fuzzyMin: 0.8 });
    if (alias.score) score += alias.score * 0.8;
    if (queryNorm.length >= 2 && queryNorm.length <= 10) {
      [term.plain, term.say, term.trap].some(function (text) {
        if (normalize(text).includes(queryNorm)) { score += 8; return true; }
        return false;
      });
    }
    return { score: Math.round(score), hitTriggers: hitTriggers };
  }

  /* ---- 筛选状态 ---- */

  var state = { q: "", book: "全部", layer: "全部" };

  var books = ["全部"].concat(Array.from(new Set(DATA.map(function (t) { return t.book; }))));

  function countFor(book, layer) {
    return DATA.filter(function (t) {
      if (book !== "全部" && t.book !== book) return false;
      if (layer !== "全部" && t.layer !== layer) return false;
      return true;
    }).length;
  }

  var bookList = document.getElementById("book-list");
  function renderBookTabs() {
    bookList.innerHTML = "";
    books.forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "side-item" + (b === state.book ? " active" : "");
      btn.innerHTML = "<span>" + b + '</span><span class="n">' + countFor(b, "全部") + "</span>";
      btn.onclick = function () { state.book = b; state.layer = "全部"; renderAll(); };
      bookList.appendChild(btn);
    });
  }

  var layerList = document.getElementById("layer-list");
  function renderLayerList() {
    var layersInBook = Array.from(new Set(
      DATA.filter(function (t) { return state.book === "全部" || t.book === state.book; })
          .map(function (t) { return t.layer; })
    )).sort();
    var items = ["全部"].concat(layersInBook);
    layerList.innerHTML = "";
    items.forEach(function (l) {
      var btn = document.createElement("button");
      btn.className = "side-item" + (l === state.layer ? " active" : "");
      var label = l === "全部" ? "全部" : (LAYER_LABEL[l] || l);
      btn.innerHTML = "<span>" + label + '</span><span class="n">' + countFor(state.book, l) + "</span>";
      btn.onclick = function () { state.layer = l; renderAll(); };
      layerList.appendChild(btn);
    });
  }

  var qInput = document.getElementById("q");
  qInput.addEventListener("input", function () { state.q = qInput.value; renderList(); });

  /* ---- 渲染 ---- */

  var listEl = document.getElementById("list");
  var countEl = document.getElementById("count");

  /* ---- 滚动揭示：卡片进入视口才翻牌，而不是一次性全部亮出来 ---- */
  var revealObserver = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }) : null;

  function observeCards() {
    var cards = listEl.querySelectorAll(".card");
    if (!revealObserver) {
      cards.forEach(function (el) { el.classList.add("in-view"); });
      return;
    }
    cards.forEach(function (el) { revealObserver.observe(el); });
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---- 一条词条的一组图：limit 用来让卡片只露第一张 ---- */
  function figuresHtml(term, limit) {
    var figs = term.figures || [];
    if (limit) figs = figs.slice(0, limit);
    if (!figs.length) return "";
    return '<div class="dgm-figs">' + figs.map(function (f, i) {
      return '<figure class="dgm-fig" style="animation-delay:' + (60 + i * 70) + 'ms">' +
        '<div class="dgm-box">' + f.svg + "</div>" +
        (limit ? "" : '<figcaption class="dgm-cap">' + escapeHtml(f.cap) + "</figcaption>") +
        "</figure>";
    }).join("") + "</div>";
  }

  function card(term, hitTriggers, idx) {
    var hitSet = new Set(hitTriggers || []);
    var hook = (term.trigger || []).find(function (t) { return hitSet.has(t); }) || (term.trigger || [])[0] || "";
    var delay = "style=\\"transition-delay:" + (Math.min(idx || 0, 26) * 14) + "ms\\"";
    return (
      '<article class="card" data-layer="' + escapeHtml(term.layer) + '" data-id="' + escapeHtml(term.id) + '" ' + delay + '>' +
        '<div class="card-head">' +
          '<span class="card-title">' + escapeHtml(term.title) + "</span>" +
          '<span class="card-en">' + escapeHtml(term.en) + "</span>" +
          '<span class="tag">' + escapeHtml(term.book) + " · " + escapeHtml(LAYER_LABEL[term.layer] || term.layer) + "</span>" +
        "</div>" +
        (hook ? '<p class="quote">' + escapeHtml(hook) + '" <b>→ ' + escapeHtml(term.title) + "</b></p>" : "") +
        '<p class="plain">' + escapeHtml(term.plain) + "</p>" +
        figuresHtml(term, 1) +
        '<div class="card-cta">' + (term.demo ? '真机演示 · ' : '') + '全部示意图 · 复制话术' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
        "</div>" +
      "</article>"
    );
  }

  function renderDetail(term, hitTriggers) {
    var hitSet = new Set(hitTriggers || []);
    var aliasesHtml = (term.aliases && term.aliases.length)
      ? '<div class="modal-aliases">别名：' + term.aliases.map(escapeHtml).join(" · ") + "</div>"
      : "";
    var triggerChips = (term.trigger || []).map(function (t) {
      return '<span class="trigger-chip-lg' + (hitSet.has(t) ? " hit" : "") + '">' + escapeHtml(t) + "</span>";
    }).join("");
    var pairChips = (term.pairs || []).map(function (p) {
      return '<button class="pair-chip" type="button" data-id="' + escapeHtml(p.id) + '">' + escapeHtml(p.title) + "</button>";
    }).join("");
    return (
      '<div class="modal-head">' +
        '<span class="modal-title" id="modal-title">' + escapeHtml(term.title) + "</span>" +
        '<span class="modal-en">' + escapeHtml(term.en) + "</span>" +
        '<span class="tag">' + escapeHtml(term.book) + " · " + escapeHtml(LAYER_LABEL[term.layer] || term.layer) + "</span>" +
      "</div>" +
      aliasesHtml +
      '<p class="modal-plain">' + escapeHtml(term.plain) + "</p>" +
      figuresHtml(term) +
      demoHtml(term) +
      '<div class="modal-section modal-cols">' +
        '<div class="modal-section">' +
          '<div class="sec-label"><span>怎么对 AI 说</span><button class="copy-btn" type="button">⎘ 复制话术</button></div>' +
          '<div class="say-box">' + escapeHtml(term.say) + "</div>" +
        "</div>" +
        '<div class="modal-section">' +
          '<div class="sec-label"><span>常见坑</span></div>' +
          '<div class="trap-box">' + escapeHtml(term.trap) + "</div>" +
        "</div>" +
      "</div>" +
      (triggerChips ? '<div class="modal-section"><div class="sec-label"><span>常见描述</span></div><div class="chip-row">' + triggerChips + "</div></div>" : "") +
      (pairChips ? '<div class="modal-section"><div class="sec-label"><span>搭档术语</span></div><div class="chip-row">' + pairChips + "</div></div>" : "")
    );
  }

  /* ---- 真机演示：详情里那台真在跑的手机 ----
     只在弹层里挂载，关掉就整段拆干净（事件、计时器一个不留），
     否则同时开着几十条演示的动画，页面自己就先违反了这个库里的性能那几条。 */

  var demoLive = null;

  function demoHtml(term) {
    var d = term.demo;
    if (!d) return "";
    var ctl = "";
    if (d.modes) {
      ctl += '<div class="demo-switch">' +
        '<button type="button" data-m="bad" class="on">' + escapeHtml(d.modes[0]) + "</button>" +
        '<button type="button" data-m="ok">' + escapeHtml(d.modes[1]) + "</button>" +
        "</div>";
    }
    if (d.replay) ctl += '<button class="demo-replay" type="button">↻ 重放</button>';
    var frame = d.frame || "phone";
    var shell = frame === "wide"
      ? '<div class="dm-win"><div class="dm-screen">' + d.html + "</div></div>"
      : '<div class="dm-phone' + (frame === "land" ? " land" : "") + '">' +
          '<div class="dm-screen">' + d.html + '<span class="dm-home"></span></div>' +
          '<span class="dm-notch"></span>' +
        "</div>";
    return '<div class="demo-wrap">' +
      '<div class="sec-label"><span>真机演示 · 真的在跑</span>' +
        '<div class="demo-ctl">' + ctl + "</div></div>" +
      '<div class="demo-stage">' +
        '<div class="dm" data-demo="' + escapeHtml(term.id) + '" data-frame="' + frame + '" data-mode="bad">' +
          shell +
        "</div>" +
        '<div class="demo-say"><p class="demo-cap">' + escapeHtml(d.cap) + "</p>" +
          (d.note ? '<p class="demo-note">' + escapeHtml(d.note) + "</p>" : "") +
        "</div>" +
      "</div>" +
    "</div>";
  }

  function mountDemo(term) {
    destroyDemo();
    if (!term.demo) return;
    var root = modalBody.querySelector('.dm[data-demo="' + term.id + '"]');
    if (!root) return;
    var screen = root.querySelector(".dm-screen");
    var pristine = screen.innerHTML;
    var listeners = [], timers = [], modeCbs = [], cleanups = [];

    var api = {
      q: function (sel) { return root.querySelector(sel); },
      qa: function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); },
      on: function (el, type, fn, opt) {
        if (!el) return;
        el.addEventListener(type, fn, opt);
        listeners.push([el, type, fn, opt]);
      },
      timer: function (fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; },
      interval: function (fn, ms) { var id = setInterval(fn, ms); timers.push(id); return id; },
      mode: function () { return root.dataset.mode; },
      cleanup: function (fn) { cleanups.push(fn); },   // 计时器和事件之外还需要收尾的（观察者之类）
      onMode: function (fn) { modeCbs.push(fn); },
    };

    function tearDownInner() {
      cleanups.forEach(function (fn) { try { fn(); } catch (err) {} });
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
      listeners = []; timers = []; modeCbs = []; cleanups = [];
    }

    function runScript() {
      var fn = window.DEMO_JS && window.DEMO_JS[term.id];
      if (!fn) return;
      // 一条演示挂了不该带走整个弹层，但要在控制台留下痕迹
      try { fn(root, api); } catch (err) { console.error("[demo]", term.id, err); }
    }

    // 重建：一次性的动效（布局偏移、骨架屏、转场）靠重挂 DOM 才能再看一遍
    function rebuild() {
      tearDownInner();
      screen.innerHTML = pristine;
      runScript();
    }

    var wrap = modalBody.querySelector(".demo-wrap");
    var ctlListeners = [];
    function bindCtl(el, type, fn) {
      if (!el) return;
      el.addEventListener(type, fn);
      ctlListeners.push([el, type, fn]);
    }

    bindCtl(wrap.querySelector(".demo-switch"), "click", function (e) {
      var btn = e.target.closest("button[data-m]");
      if (!btn || btn.classList.contains("on")) return;
      wrap.querySelectorAll(".demo-switch button").forEach(function (b) {
        b.classList.toggle("on", b === btn);
      });
      root.dataset.mode = btn.getAttribute("data-m");
      modeCbs.forEach(function (fn) { try { fn(root.dataset.mode); } catch (err) {} });
    });
    bindCtl(wrap.querySelector(".demo-replay"), "click", rebuild);

    runScript();

    demoLive = function () {
      tearDownInner();
      ctlListeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
      ctlListeners = [];
    };
  }

  function destroyDemo() {
    if (demoLive) { try { demoLive(); } catch (err) {} }
    demoLive = null;
    // 拆完事件和计时器还不够：CSS 动画（骨架微光那类）不会自己停，
    // 留在关掉的弹层里会一直画帧。等关闭过渡走完，把整块画框摘掉。
    if (!modalBackdrop.classList.contains("open")) {
      setTimeout(function () {
        if (modalBackdrop.classList.contains("open")) return;
        var wrap = modalBody.querySelector(".demo-wrap");
        if (wrap) wrap.remove();
      }, 420);
    }
  }

  /* ---- 详情弹层：点卡片打开，Esc / 点遮罩 / 点关闭按钮都能关 ---- */

  var modalBackdrop = document.getElementById("modal-backdrop");
  var modalBody = document.getElementById("modal-body");
  var modalClose = document.getElementById("modal-close");
  var lastHitMap = {};

  function openModal(id, hitTriggers) {
    var term = DATA.find(function (t) { return t.id === id; });
    if (!term) return;
    modalBody.innerHTML = renderDetail(term, hitTriggers || lastHitMap[id] || []);
    modalBackdrop.classList.add("open");
    mountDemo(term);
    document.body.style.overflow = "hidden";
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
  }
  function closeModal() {
    if (!modalBackdrop.classList.contains("open")) return;
    modalBackdrop.classList.remove("open");
    destroyDemo();
    document.body.style.overflow = "";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", function (e) { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  modalBody.addEventListener("click", function (e) {
    var copyBtn = e.target.closest(".copy-btn");
    if (copyBtn) {
      var sayBox = modalBody.querySelector(".say-box");
      copyText(sayBox ? sayBox.textContent : "", copyBtn);
      return;
    }
    var pairChip = e.target.closest(".pair-chip");
    if (pairChip) openModal(pairChip.getAttribute("data-id"));
  });

  function copyText(text, btn) {
    var original = btn.textContent;
    function done(ok) {
      btn.textContent = ok ? "✓ 已复制" : "复制失败";
      btn.classList.toggle("copied", ok);
      setTimeout(function () { btn.textContent = original; btn.classList.remove("copied"); }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(ok);
      } catch (e) { done(false); }
    }
  }

  function renderList() {
    document.getElementById("apple-intro").hidden = !!state.q || state.book !== "全部" || state.layer !== "全部";
    var pool = DATA.filter(function (t) {
      if (state.book !== "全部" && t.book !== state.book) return false;
      if (state.layer !== "全部" && t.layer !== state.layer) return false;
      return true;
    });

    var rows;
    var qNorm = normalize(state.q);
    if (!qNorm) {
      rows = pool.map(function (t) { return { term: t, hitTriggers: [] }; });
    } else {
      var qGrams = bigrams(qNorm);
      rows = pool
        .map(function (t) {
          var r = scoreTerm(t, qNorm, qGrams);
          return { term: t, score: r.score, hitTriggers: r.hitTriggers };
        })
        .filter(function (r) { return r.score >= 30; })
        .sort(function (a, b) { return b.score - a.score; });
    }

    countEl.textContent = qNorm ? ("Found " + rows.length) : ("All " + rows.length);

    lastHitMap = {};
    rows.forEach(function (r) { lastHitMap[r.term.id] = r.hitTriggers; });

    listEl.innerHTML = rows.length
      ? rows.map(function (r, idx) { return card(r.term, r.hitTriggers, idx); }).join("")
      : '<div class="empty">没查到——说明这轮描述不需要术语，这是正常结果</div>';

    observeCards();
  }

  listEl.addEventListener("click", function (e) {
    var cardEl = e.target.closest(".card");
    if (!cardEl) return;
    openModal(cardEl.getAttribute("data-id"));
  });

  function renderAll() {
    renderBookTabs();
    renderLayerList();
    renderList();
  }

  function tryOpenFromHash() {
    var id = location.hash.replace(/^#/, "");
    if (id && DATA.some(function (t) { return t.id === id; })) openModal(id);
  }
  window.addEventListener("hashchange", tryOpenFromHash);

  document.querySelectorAll("[data-feature-term]").forEach(function(b){b.addEventListener("click",function(){openModal(b.dataset.featureTerm);});});
  renderAll();
  tryOpenFromHash();
})();
</script>
</body>
</html>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, html, "utf8");
process.stdout.write(`✓ 已生成 ${payload.length} 条词条（${diagramCount} 条带示意图，共 ${figureCount} 张；${demoCount} 条带真机演示) -> ${OUT_FILE.replace(ROOT + "/", "")}\n`);
