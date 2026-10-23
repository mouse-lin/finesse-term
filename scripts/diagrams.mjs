/**
 * finesse-term docs 页的示意图库。
 *
 * 每条词条给一组图（1–3 张），不是一张。一张图只讲一件事：
 * 「错的长什么样 / 对的长什么样」是一张，「它由哪几块组成」是另一张，
 * 「按时间怎么走」再是一张。挤在同一张里就谁也看不清。
 *
 * 不画任何应用截图或 UI mockup——那是在冒充没发生过的真实界面。
 * 只画抽象的几何图示（手机轮廓、屏幕框、区块、时间轴、曲线），
 * 配色全部走 CSS 变量，跟随页面明暗主题。
 *
 * 每个条目是 fig(caption, svgInner) 的数组，svgInner 是 <svg> 的内部子节点
 * （不含外层 <svg> 标签），由 build-docs.mjs 统一套壳、统一 viewBox。
 */

const W = 260, H = 100;

/* ---------------------------------------------------------------- 图元 */

function fig(cap, svg) { return { cap: cap, svg: svg }; }

// 手机轮廓：圆角机身 + 顶部刘海胶囊 + 底部 Home 条
function phone(x, y, w, h) {
  const nx = x + w / 2 - w * 0.16, nw = w * 0.32;
  const hx = x + w / 2 - w * 0.14, hw = w * 0.28;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" class="dgm-chrome"/>
    <rect x="${nx}" y="${y + 3}" width="${nw}" height="${h * 0.045}" rx="${h * 0.022}" class="dgm-chrome-fill"/>
    <rect x="${hx}" y="${y + h - 6}" width="${hw}" height="3" rx="1.5" class="dgm-chrome-fill"/>
  `;
}

// 无刘海的通用屏幕框：给 Web 概念用（modal、truncate……不是移动端专属）
function screen(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="dgm-chrome"/>`;
}

// 桌面浏览器窗口：标题栏三个点 + 分隔线
function browser(x, y, w, h) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" class="dgm-chrome"/>
    <line x1="${x}" y1="${y + 11}" x2="${x + w}" y2="${y + 11}" class="dgm-div"/>
    <circle cx="${x + 7}" cy="${y + 5.5}" r="1.5" class="dgm-chrome-fill"/>
    <circle cx="${x + 13}" cy="${y + 5.5}" r="1.5" class="dgm-chrome-fill"/>
    <circle cx="${x + 19}" cy="${y + 5.5}" r="1.5" class="dgm-chrome-fill"/>
  `;
}

function badBox(x, y, w, h, r = 3) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="dgm-bad"/>`;
}
function okBox(x, y, w, h, r = 3) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="dgm-ok"/>`;
}
// 中性内容块：页面里「随便什么内容」的占位
function neu(x, y, w, h, o = 0.32, r = 2) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="dgm-chrome-fill" opacity="${o}"/>`;
}
function accent(x, y, w, h, o = 1, r = 3) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="dgm-accent-fill" opacity="${o}"/>`;
}
function frame(x, y, w, h, r = 3) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="dgm-frame"/>`;
}
// 占位文字行：最后一行短一点，看起来才像段落
function lines(x, y, w, n, gap = 7, h = 3, o = 0.3) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const lw = i === n - 1 ? w * 0.62 : w;
    out += neu(x, y + i * gap, lw, h, o, 1.5);
  }
  return out;
}
function label(x, y, text, anchor = "middle") {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="dgm-label">${text}</text>`;
}
function mono(x, y, text, anchor = "start") {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="dgm-mono">${text}</text>`;
}
function mark(x, y, ok) {
  return ok
    ? `<text x="${x}" y="${y}" text-anchor="middle" class="dgm-mark dgm-mark-ok">✓</text>`
    : `<text x="${x}" y="${y}" text-anchor="middle" class="dgm-mark dgm-mark-bad">✗</text>`;
}
function arrow(x1, y1, x2, y2, ok = true) {
  const cls = ok ? "dgm-arrow-ok" : "dgm-arrow-bad";
  const mk = ok ? "dgm-arrow-ok" : "dgm-arrow-bad";
  return `<path d="M${x1} ${y1} L${x2} ${y2}" class="${cls}" marker-end="url(#${mk})"/>`;
}
function curveArrow(d, ok = true) {
  const cls = ok ? "dgm-arrow-ok" : "dgm-arrow-bad";
  const mk = ok ? "dgm-arrow-ok" : "dgm-arrow-bad";
  return `<path d="${d}" class="${cls}" marker-end="url(#${mk})"/>`;
}
// 鼠标指针
function cursor(x, y) {
  return `<path d="M${x} ${y} l0 11.5 l3.2-3.2 l2 4.8 l2.2-1 l-2-4.8 l4.4 0 z" class="dgm-chrome-fill" opacity=".85"/>`;
}
// 手指触点：实心圆 + 一圈波纹
function touch(x, y, r = 4) {
  return `<circle cx="${x}" cy="${y}" r="${r}" class="dgm-accent-fill" opacity=".9"/>
    <circle cx="${x}" cy="${y}" r="${r + 3.5}" fill="none" class="dgm-accent-stroke" opacity=".45"/>`;
}
// 左右对照：左边错误示范，右边正确示范，共用同一个内容生成函数
function pair(leftInner, rightInner) {
  return `
    ${mark(46, 14, false)}${leftInner(6)}
    <line x1="130" y1="10" x2="130" y2="94" class="dgm-div"/>
    ${mark(216, 14, true)}${rightInner(140)}
  `;
}
// 时序：N 帧从左到右，帧间画箭头，帧下写小字
function steps(items) {
  const n = items.length, gapArrow = 15, bw = (W - 8 - (n - 1) * gapArrow) / n;
  let out = "";
  items.forEach(function (it, i) {
    const x = 4 + i * (bw + gapArrow);
    out += it.inner(x, bw);
    out += label(x + bw / 2, 96, it.cap);
    if (i < n - 1) out += arrow(x + bw + 2, 48, x + bw + gapArrow - 3, 48);
  });
  return out;
}
// 事件时间轴：一行名字 + 一条轨道 + 若干时刻标记（t 取 0..1）
function eventRow(y, name, ts, cls = "dgm-accent-fill") {
  return label(4, y + 3, name, "start") +
    `<line x1="66" y1="${y}" x2="252" y2="${y}" class="dgm-div"/>` +
    ts.map(function (t) {
      return `<rect x="${66 + t * 186 - 1.1}" y="${y - 5}" width="2.2" height="10" rx="1.1" class="${cls}"/>`;
    }).join("");
}
// 曲线图：坐标框 + 一条路径（路径用 0..1 归一化坐标，左下为原点）
function plot(x, y, w, h, pts, cls = "dgm-accent-line", dash = false) {
  const d = pts.map(function (p, i) {
    return (i ? "L" : "M") + (x + p[0] * w).toFixed(1) + " " + (y + h - p[1] * h).toFixed(1);
  }).join(" ");
  return frame(x, y, w, h, 2) +
    `<path d="${d}" class="${cls}"${dash ? ' stroke-dasharray="3 2.5"' : ""}/>`;
}
// 噪点：Lehmer 伪随机撒点。同种子每次结果相同，产物才是可复现的
function noiseDots(x, y, w, h, n, seed, r = 0.7, op = 0.5) {
  let s = seed, out = "";
  const next = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) {
    out += `<circle cx="${(x + next() * w).toFixed(1)}" cy="${(y + next() * h).toFixed(1)}" r="${r}" class="dgm-chrome-fill" opacity="${op}"/>`;
  }
  return out;
}

// 采样一条缓动曲线为点集
function samples(fn, n = 26) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n; out.push([t, fn(t)]); }
  return out;
}

/* ------------------------------------------------------------ H5 / 移动端 */

const H5 = {

  "safe-area": [
    fig("贴底 vs 留出 inset", pair(
      (x) => `${phone(x, 20, 84, 74)}${badBox(x + 8, 82, 68, 10)}${label(x + 42, 78, "按钮贴底，被 Home 条压住")}`,
      (x) => `${phone(x, 20, 84, 74)}${okBox(x + 8, 74, 68, 8)}${label(x + 42, 70, "留 inset-bottom")}`
    )),
    fig("上下两条安全区各是什么", `
      ${phone(88, 4, 84, 92)}
      ${badBox(92, 8, 76, 12)}${label(178, 16, "顶部：刘海 / 状态栏", "start")}
      ${neu(96, 26, 68, 46, 0.22)}${label(178, 52, "这块才是你的地盘", "start")}
      ${badBox(92, 80, 76, 12)}${label(178, 88, "底部：Home 条 / 手势区", "start")}
    `),
  ],

  "viewport-meta": [
    fig("没写 meta vs 写了 device-width", pair(
      (x) => `${phone(x, 20, 84, 74)}${badBox(x + 26, 40, 32, 24)}${label(x + 42, 36, "按 980px 排完再整体缩小")}${label(x + 42, 88, "字小到看不清")}`,
      (x) => `${phone(x, 20, 84, 74)}${okBox(x + 10, 30, 64, 54)}${label(x + 42, 88, "width=device-width")}`
    )),
    fig("逻辑宽度和设备宽度的关系", `
      ${label(6, 20, "设备实际宽 390px", "start")}
      ${frame(6, 26, 120, 20)}${accent(6, 26, 120, 20, 0.18)}
      ${label(6, 62, "默认逻辑视口 980px", "start")}
      ${frame(6, 68, 246, 20)}
      <path d="M126 46 L126 68" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
      ${label(190, 82, "多出来的部分被缩放塞进屏幕")}
    `),
  ],

  "rem-vw-adapt": [
    fig("写死 px vs 跟着屏宽缩放", pair(
      (x) => `${phone(x, 14, 84, 82)}${badBox(x + 6, 30, 96, 22)}${label(x + 42, 62, "卡片按 375 写死，小屏就溢出")}`,
      (x) => `${phone(x, 14, 84, 82)}${okBox(x + 6, 30, 72, 22)}${label(x + 42, 62, "宽度用 vw / rem，按比例收")}`
    )),
    fig("同一份稿子在三种屏宽下", `
      ${frame(6, 24, 52, 56, 6)}${accent(11, 30, 42, 14, 0.4)}${lines(11, 50, 42, 3)}${label(32, 92, "320")}
      ${frame(78, 18, 70, 68, 6)}${accent(84, 25, 58, 18, 0.4)}${lines(84, 49, 58, 3)}${label(113, 92, "390")}
      ${frame(168, 10, 86, 80, 6)}${accent(175, 18, 72, 22, 0.4)}${lines(175, 48, 72, 3)}${label(211, 92, "430")}
      ${label(130, 8, "同样的比例，只是整体等比缩放")}
    `),
  ],

  "hairline": [
    fig("1px 在高清屏上到底多粗", pair(
      (x) => `${frame(x + 4, 30, 76, 34)}<rect x="${x + 4}" y="${30}" width="76" height="3" class="dgm-bad"/>${label(x + 42, 78, "物理 3px，显粗显脏")}`,
      (x) => `${frame(x + 4, 30, 76, 34)}<rect x="${x + 4}" y="${30}" width="76" height="1" class="dgm-ok"/>${label(x + 42, 78, "scaleY(0.33) 后是真的一根细线")}`
    )),
    fig("同一条边在三种 dpr 下的物理厚度", `
      ${label(24, 22, "dpr 1")}<rect x="6" y="30" width="36" height="1.5" class="dgm-chrome-fill"/>
      ${label(96, 22, "dpr 2")}<rect x="78" y="30" width="36" height="3" class="dgm-chrome-fill"/>
      ${label(168, 22, "dpr 3")}<rect x="150" y="30" width="36" height="4.5" class="dgm-bad"/>
      ${label(130, 62, "写的都是 1px，屏幕上却越来越粗")}
      ${label(130, 80, "所以细边框要单独处理，不能靠 border:1px")}
    `),
  ],

  "dpr": [
    fig("同一张图在 3 倍屏上", pair(
      (x) => `${frame(x + 12, 26, 60, 44, 4)}${neu(x + 16, 30, 52, 36, 0.18)}
        <path d="M${x + 20} 60 l10-12 l8 9 l9-14 l14 17 z" class="dgm-chrome-fill" opacity=".35"/>
        ${label(x + 42, 84, "只给 1x 图，放大后发虚")}`,
      (x) => `${frame(x + 12, 26, 60, 44, 4)}${neu(x + 16, 30, 52, 36, 0.28)}
        <path d="M${x + 20} 60 l10-12 l8 9 l9-14 l14 17 z" class="dgm-chrome-fill" opacity=".75"/>
        ${label(x + 42, 84, "给 2x / 3x 图，边缘才是实的")}`
    )),
    fig("一个 CSS 像素装几个物理像素", `
      ${frame(10, 26, 30, 30, 2)}${label(25, 68, "1 CSS px")}${label(25, 82, "= 1 物理像素")}
      ${frame(100, 26, 30, 30, 2)}<line x1="115" y1="26" x2="115" y2="56" class="dgm-div"/><line x1="100" y1="41" x2="130" y2="41" class="dgm-div"/>
      ${label(115, 68, "dpr 2")}${label(115, 82, "= 4 个物理像素")}
      ${frame(190, 26, 30, 30, 2)}<line x1="200" y1="26" x2="200" y2="56" class="dgm-div"/><line x1="210" y1="26" x2="210" y2="56" class="dgm-div"/><line x1="190" y1="36" x2="220" y2="36" class="dgm-div"/><line x1="190" y1="46" x2="220" y2="46" class="dgm-div"/>
      ${label(205, 68, "dpr 3")}${label(205, 82, "= 9 个物理像素")}
    `),
  ],

  "scroll-container": [
    fig("头尾固定，只有中间滚", `
      ${phone(88, 4, 84, 92)}
      ${neu(92, 8, 76, 14, 0.55)}${label(130, 18, "头部固定")}
      ${neu(92, 72, 76, 14, 0.55)}${label(130, 82, "底部固定")}
      ${okBox(92, 24, 76, 46)}
      <rect x="160" y="28" width="3" height="16" rx="1.5" class="dgm-accent-fill"/>
      ${label(130, 50, "中间这块自己滚")}
    `),
    fig("整页滚 vs 局部滚", pair(
      (x) => `${phone(x, 12, 84, 72)}${neu(x + 4, 4, 76, 10, 0.5)}${neu(x + 4, 18, 76, 52, 0.18)}
        <path d="M${x + 42} 26 L${x + 42} 10" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
        ${label(x + 42, 94, "头部跟着一起滚走了")}`,
      (x) => `${phone(x, 12, 84, 72)}${neu(x + 4, 16, 76, 10, 0.55)}${okBox(x + 4, 28, 76, 40)}
        <path d="M${x + 42} 62 L${x + 42} 36" class="dgm-arrow-ok" marker-end="url(#dgm-arrow-ok)"/>
        ${label(x + 42, 94, "只有内容区在动")}`
    )),
  ],

  "scroll-lock": [
    fig("弹层滑到底以后", pair(
      (x) => `${phone(x, 14, 84, 82)}${neu(x + 4, 18, 76, 74, 0.2)}${badBox(x + 8, 46, 68, 40)}
        <path d="M${x + 42} 34 L${x + 42} 22" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
        ${label(x + 42, 10, "背景跟着一起滚")}`,
      (x) => `${phone(x, 14, 84, 82)}<rect x="${x + 4}" y="18" width="76" height="74" rx="8" class="dgm-scrim"/>${okBox(x + 8, 46, 68, 40)}
        <line x1="${x + 20}" y1="30" x2="${x + 64}" y2="30" class="dgm-div"/>
        ${label(x + 42, 10, "背景锁住，只有弹层能滚")}`
    )),
    fig("滚动链是怎么传出去的", `
      ${frame(30, 20, 100, 60, 4)}${label(80, 14, "弹层：已经到底")}
      ${okBox(34, 24, 92, 52)}
      ${curveArrow("M134 50 L176 50", false)}
      ${frame(180, 20, 70, 60, 4)}${label(215, 14, "页面：接着滚")}
      ${neu(184, 24, 62, 52, 0.2)}
      ${label(155, 92, "不锁的话，多余的滚动会往外层传")}
    `),
  ],

  "rubber-band": [
    fig("拉到底再拉一下的三个瞬间", steps([
      { inner: (x, w) => `${frame(x, 10, w, 70, 6)}${neu(x + 5, 15, w - 10, 60, 0.25)}`, cap: "正常滚到顶" },
      { inner: (x, w) => `${frame(x, 10, w, 70, 6)}${neu(x + 5, 30, w - 10, 45, 0.25)}${accent(x + 5, 15, w - 10, 12, 0.2)}`, cap: "继续拉，露出空白" },
      { inner: (x, w) => `${frame(x, 10, w, 70, 6)}${neu(x + 5, 15, w - 10, 60, 0.25)}`, cap: "松手弹回去" },
    ])),
    fig("弹回去的位移曲线", `
      ${plot(20, 16, 220, 62, samples((t) => (t < 0.45 ? t * 1.55 : 0.7 * Math.exp(-(t - 0.45) * 7) )))}
      ${label(60, 92, "手指还按着：越拉越沉")}
      ${label(190, 92, "松手：带阻尼回到边界")}
    `),
  ],

  "keyboard-push": [
    fig("键盘弹起来以后输入框在哪", pair(
      (x) => `${phone(x, 6, 84, 90)}${badBox(x + 6, 54, 72, 12)}${label(x + 42, 50, "输入框")}
        ${neu(x + 4, 60, 76, 32, 0.55)}${label(x + 42, 80, "键盘直接盖住")}`,
      (x) => `${phone(x, 6, 84, 90)}${okBox(x + 6, 44, 72, 12)}${label(x + 42, 40, "输入框被顶到键盘上方")}
        ${neu(x + 4, 60, 76, 32, 0.55)}`
    )),
    fig("可视视口和布局视口的差别", `
      ${frame(20, 10, 100, 80, 6)}${label(70, 6, "layout viewport 不变")}
      ${neu(24, 58, 92, 28, 0.5)}${label(70, 96, "键盘只是盖上来")}
      ${frame(150, 10, 100, 80, 6)}${okBox(154, 14, 92, 40)}${label(200, 6, "visual viewport 变矮")}
      ${neu(154, 58, 92, 28, 0.5)}${label(200, 96, "按它算，才知道剩多少地方")}
    `),
  ],

  "click-penetration": [
    fig("一次点击穿到下一层去了", steps([
      { inner: (x, w) => `${frame(x, 12, w, 68, 5)}${okBox(x + 6, 30, w - 12, 22)}${touch(x + w / 2, 41)}`, cap: "点弹层上的按钮" },
      { inner: (x, w) => `${frame(x, 12, w, 68, 5)}${neu(x + 6, 30, w - 12, 22, 0.18)}`, cap: "弹层立刻消失" },
      { inner: (x, w) => `${frame(x, 12, w, 68, 5)}${badBox(x + 6, 30, w - 12, 22)}${touch(x + w / 2, 41)}`, cap: "click 落到下层" },
    ])),
    fig("touch 和 click 差了多久", `
      ${eventRow(30, "touchend", [0.1], "dgm-accent-fill")}
      ${eventRow(64, "click", [0.42], "dgm-marker-bad")}
      <path d="M84 38 L144 56" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
      ${label(200, 86, "这段空档里，界面已经换人了")}
    `),
  ],

  "tap-highlight": [
    fig("默认高亮 vs 自己定义的按下态", pair(
      (x) => `${badBox(x + 10, 34, 64, 26, 0)}${frame(x + 10, 34, 64, 26, 8)}${label(x + 42, 74, "灰块方角，溢出圆角外")}`,
      (x) => `${okBox(x + 10, 34, 64, 26, 8)}${label(x + 42, 74, "按下态跟着组件形状走")}`
    )),
    fig("不是关掉就完事", `
      ${frame(14, 24, 100, 34, 8)}${label(64, 70, "关掉默认高亮")}${label(64, 84, "但什么都不给")}
      ${mark(64, 18, false)}
      ${frame(146, 24, 100, 34, 8)}${accent(146, 24, 100, 34, 0.22, 8)}${label(196, 70, "关掉之后补一个")}${label(196, 84, ":active 变化")}
      ${mark(196, 18, true)}
    `),
  ],

  "touch-target": [
    fig("图标看着小，热区不能跟着小", pair(
      (x) => `${frame(x + 30, 38, 24, 24, 4)}${badBox(x + 30, 38, 24, 24, 4)}${label(x + 42, 76, "热区就是图标本身，24px")}`,
      (x) => `${okBox(x + 20, 28, 44, 44, 6)}${frame(x + 30, 38, 24, 24, 4)}${label(x + 42, 84, "图标不变，热区外扩到 44px")}`
    )),
    fig("挨得太近，点哪都不对", `
      ${label(64, 16, "间距不足")}${mark(20, 16, false)}
      ${badBox(34, 24, 22, 22, 4)}${badBox(58, 24, 22, 22, 4)}${badBox(82, 24, 22, 22, 4)}
      ${label(64, 58, "相邻热区重叠，误触")}
      ${label(190, 16, "留出间距")}${mark(146, 16, true)}
      ${okBox(160, 24, 22, 22, 4)}${okBox(190, 24, 22, 22, 4)}${okBox(220, 24, 22, 22, 4)}
      ${label(190, 58, "至少空 8px")}
    `),
  ],

  "thumb-zone": [
    fig("单手握持时够得着的范围", `
      ${phone(88, 4, 84, 92)}
      ${badBox(92, 8, 76, 26)}
      ${accent(92, 34, 76, 26, 0.35, 0)}
      ${okBox(92, 60, 76, 26)}
      ${label(176, 20, "要伸手 / 换手", "start")}
      ${label(176, 48, "够得着，勉强", "start")}
      ${label(176, 74, "拇指原生区", "start")}
    `),
    fig("主操作放哪", pair(
      (x) => `${phone(x, 4, 84, 78)}${badBox(x + 40, 10, 36, 10)}${label(x + 42, 32, "主按钮在右上角")}${label(x + 42, 94, "每次都要换手")}`,
      (x) => `${phone(x, 4, 84, 78)}${okBox(x + 8, 62, 68, 12)}${label(x + 42, 50, "主按钮吸在底部")}${label(x + 42, 94, "拇指原地就能按")}`
    )),
  ],

  "sticky-footer": [
    fig("吸底栏贴着 Home 条 vs 留出安全区", pair(
      (x) => `${phone(x, 20, 84, 74)}${badBox(x + 8, 82, 68, 10)}${label(x + 42, 78, "按钮压在手势条上")}`,
      (x) => `${phone(x, 20, 84, 74)}${okBox(x + 8, 74, 68, 8)}${label(x + 42, 70, "条内再留一圈 inset")}`
    )),
    fig("别忘了给内容垫一块同高的底", pair(
      (x) => `${phone(x, 4, 84, 78)}${neu(x + 6, 12, 72, 52, 0.2)}${badBox(x + 4, 64, 76, 14)}
        ${label(x + 42, 94, "最后一行被吸底栏永久盖住")}`,
      (x) => `${phone(x, 4, 84, 78)}${neu(x + 6, 12, 72, 38, 0.2)}<rect x="${x + 6}" y="52" width="72" height="10" class="dgm-dash" fill="none"/>${okBox(x + 4, 64, 76, 14)}
        ${label(x + 42, 94, "内容底部预留等高占位")}`
    )),
  ],

  "tab-bar": [
    fig("标签栏也要吃安全区", pair(
      (x) => `${phone(x, 20, 84, 74)}${badBox(x + 4, 82, 76, 12)}
        <circle cx="${x + 20}" cy="88" r="3" class="dgm-chrome-fill"/><circle cx="${x + 42}" cy="88" r="3" class="dgm-chrome-fill"/><circle cx="${x + 64}" cy="88" r="3" class="dgm-chrome-fill"/>
        ${label(x + 42, 78, "图标贴着 Home 条")}`,
      (x) => `${phone(x, 20, 84, 74)}${okBox(x + 4, 74, 76, 10)}
        <circle cx="${x + 20}" cy="79" r="3" class="dgm-chrome-fill"/><circle cx="${x + 42}" cy="79" r="3" class="dgm-chrome-fill"/><circle cx="${x + 64}" cy="79" r="3" class="dgm-chrome-fill"/>
        ${label(x + 42, 70, "条内再留一圈安全区")}`
    )),
    fig("一根标签栏由什么组成", `
      ${frame(10, 34, 240, 34, 6)}
      <circle cx="40" cy="46" r="4" class="dgm-accent-fill"/>${label(40, 62, "当前项：高亮")}
      <circle cx="100" cy="46" r="4" class="dgm-chrome-fill"/>${label(100, 62, "未选：降调")}
      <circle cx="160" cy="46" r="4" class="dgm-chrome-fill"/>${label(160, 62, "3–5 项封顶")}
      <circle cx="220" cy="46" r="4" class="dgm-chrome-fill"/><circle cx="224" cy="42" r="2.6" class="dgm-marker-bad"/>${label(220, 62, "角标")}
      ${label(130, 22, "始终可见，不随页面滚走")}
    `),
  ],

  "bottom-sheet": [
    fig("从底部升起，上面压暗", `
      ${phone(88, 4, 84, 92)}
      <rect x="92" y="8" width="76" height="84" rx="10" class="dgm-scrim"/>
      <rect x="92" y="52" width="76" height="40" rx="10" class="dgm-ok"/>
      <rect x="120" y="58" width="20" height="3" rx="1.5" class="dgm-chrome-fill"/>
      ${label(130, 76, "抓手 + 半屏内容")}
      ${label(130, 22, "上方遮罩压暗")}
      ${label(178, 66, "背景仍在，只是不能点", "start")}
    `),
    fig("三档高度，拖动切换", steps([
      { inner: (x, w) => `${frame(x, 8, w, 76, 6)}${okBox(x + 3, 60, w - 6, 22, 5)}`, cap: "收起：只露一角" },
      { inner: (x, w) => `${frame(x, 8, w, 76, 6)}${okBox(x + 3, 40, w - 6, 42, 5)}`, cap: "半屏：默认" },
      { inner: (x, w) => `${frame(x, 8, w, 76, 6)}${okBox(x + 3, 14, w - 6, 68, 5)}`, cap: "全屏：内容多时" },
    ])),
  ],

  "action-sheet": [
    fig("一组竖排选项 + 独立的取消", `
      ${phone(88, 2, 84, 80)}
      <rect x="92" y="6" width="76" height="72" rx="10" class="dgm-scrim"/>
      ${okBox(96, 32, 68, 12, 6)}${okBox(96, 46, 68, 12, 6)}
      <rect x="96" y="62" width="68" height="12" rx="6" class="dgm-bad"/>
      ${label(178, 40, "常规选项", "start")}
      ${label(178, 70, "危险项单独红色", "start")}
      ${label(130, 94, "取消永远排在最下、离拇指最近")}
    `),
    fig("和下拉菜单的分工", `
      ${label(64, 14, "动作面板：对「这一条」做什么")}
      ${frame(10, 20, 108, 60, 5)}${okBox(16, 56, 96, 8, 4)}${okBox(16, 66, 96, 8, 4)}
      ${label(64, 44, "从底部升起，选项少而重")}
      ${label(196, 14, "下拉菜单：切换视图 / 次要动作")}
      ${frame(142, 20, 108, 60, 5)}${neu(150, 26, 40, 8, 0.4)}${frame(150, 36, 60, 34, 3)}
      ${label(196, 88, "贴着触发点展开")}
    `),
  ],

  "pull-to-refresh": [
    fig("下拉刷新的四个瞬间", steps([
      { inner: (x, w) => `${frame(x, 10, w, 70, 5)}${neu(x + 4, 14, w - 8, 62, 0.22)}${touch(x + w / 2, 30)}`, cap: "按住往下拉" },
      { inner: (x, w) => `${frame(x, 10, w, 70, 5)}${accent(x + 4, 14, w - 8, 14, 0.2)}${neu(x + 4, 30, w - 8, 46, 0.22)}<circle cx="${x + w / 2}" cy="21" r="4" fill="none" class="dgm-accent-stroke"/>`, cap: "过阈值，图标转正" },
      { inner: (x, w) => `${frame(x, 10, w, 70, 5)}${okBox(x + 4, 14, w - 8, 10)}${neu(x + 4, 26, w - 8, 50, 0.22)}`, cap: "松手，回弹到加载位" },
    ])),
    fig("拉不过阈值就当没发生", `
      ${plot(20, 14, 220, 60, [[0, 0], [0.18, 0.3], [0.36, 0], [0.52, 0.72], [0.7, 0.5], [1, 0.5]], "dgm-accent-line")}
      <line x1="20" y1="${74 - 0.6 * 60}" x2="240" y2="${74 - 0.6 * 60}" class="dgm-dash"/>
      ${label(246, 36, "阈值", "end")}
      ${label(70, 92, "没到线：直接弹回")}
      ${label(180, 92, "过了线：停住并触发刷新")}
    `),
  ],

  "load-more": [
    fig("滚到底自动追加", steps([
      { inner: (x, w) => `${frame(x, 10, w, 70, 5)}${lines(x + 5, 16, w - 10, 6, 10, 6, 0.25)}`, cap: "滚到列表末尾" },
      { inner: (x, w) => `${frame(x, 10, w, 70, 5)}${lines(x + 5, 16, w - 10, 4, 10, 6, 0.25)}${accent(x + 5, 58, w - 10, 8, 0.3)}`, cap: "底部出现加载条" },
      { inner: (x, w) => `${frame(x, 10, w, 70, 5)}${lines(x + 5, 16, w - 10, 4, 10, 6, 0.25)}${okBox(x + 5, 58, w - 10, 18)}`, cap: "新一批接在后面" },
    ])),
    fig("三种收尾状态都要有", `
      ${frame(8, 22, 74, 40, 4)}<circle cx="45" cy="42" r="6" fill="none" class="dgm-accent-stroke"/>${label(45, 74, "加载中")}
      ${frame(93, 22, 74, 40, 4)}${label(130, 45, "没有更多了")}${label(130, 74, "到底：给一句话")}
      ${frame(178, 22, 74, 40, 4)}<rect x="196" y="36" width="38" height="12" rx="6" class="dgm-bad"/>${label(215, 74, "失败：给重试")}
    `),
  ],

  "swipe-gesture": [
    fig("列表项左滑露出操作", steps([
      { inner: (x, w) => `${frame(x, 30, w, 30, 4)}${neu(x + 5, 40, w - 30, 10, 0.3)}`, cap: "静止" },
      { inner: (x, w) => `${frame(x, 30, w, 30, 4)}${badBox(x + w - 26, 30, 26, 30, 4)}${neu(x - 6, 40, w - 30, 10, 0.3)}${touch(x + 14, 45)}`, cap: "左滑，右侧露出删除" },
      { inner: (x, w) => `${frame(x, 30, w, 30, 4)}${neu(x + 5, 40, w - 30, 10, 0.3)}`, cap: "松手复位或执行" },
    ])),
    fig("横滑和纵滚打架", `
      ${frame(16, 16, 100, 68, 5)}${neu(22, 24, 88, 52, 0.2)}
      ${arrow(66, 76, 66, 26)}${label(66, 96, "页面要纵向滚")}
      ${frame(144, 16, 100, 68, 5)}${neu(150, 24, 88, 52, 0.2)}
      ${arrow(228, 50, 154, 50)}${label(194, 96, "组件要横向滑")}
      ${label(130, 10, "同一块区域，得先判断方向再锁定")}
    `),
  ],

  "long-press": [
    fig("按住不放的三个阶段", steps([
      { inner: (x, w) => `${frame(x, 18, w, 54, 5)}${touch(x + w / 2, 45)}`, cap: "手指按下" },
      { inner: (x, w) => `${frame(x, 18, w, 54, 5)}${touch(x + w / 2, 45)}<circle cx="${x + w / 2}" cy="45" r="12" fill="none" class="dgm-accent-stroke" stroke-dasharray="40 30"/>`, cap: "约 500ms 计时" },
      { inner: (x, w) => `${frame(x, 18, w, 54, 5)}${okBox(x + 6, 24, w - 12, 10, 4)}${okBox(x + 6, 36, w - 12, 10, 4)}`, cap: "菜单弹出 + 震一下" },
    ])),
    fig("中途划走就要取消", `
      ${frame(20, 18, 220, 56, 5)}
      ${touch(60, 46)}${label(60, 88, "按下的位置")}
      ${curveArrow("M72 46 L150 46", false)}
      ${touch(165, 46)}${label(165, 88, "手指移出容差圈")}
      <circle cx="60" cy="46" r="14" fill="none" class="dgm-dash"/>
      ${label(210, 30, "长按作废，别弹菜单", "middle")}
    `),
  ],

  "double-tap-zoom": [
    fig("双击被系统抢走", pair(
      (x) => `${frame(x + 6, 22, 76, 50, 5)}${neu(x + 12, 28, 64, 38, 0.22)}${touch(x + 44, 46)}
        ${label(x + 42, 84, "连点两下，整页被放大")}`,
      (x) => `${frame(x + 6, 22, 76, 50, 5)}${okBox(x + 12, 28, 64, 38)}${touch(x + 44, 46)}
        ${label(x + 42, 84, "touch-action 管住，只当两次点击")}`
    )),
    fig("哪些地方该留着缩放", `
      ${frame(14, 20, 100, 52, 5)}${okBox(20, 26, 88, 40)}${label(64, 84, "图片 / 地图：留着能放大")}
      ${mark(64, 14, true)}
      ${frame(146, 20, 100, 52, 5)}${badBox(152, 26, 88, 40)}${label(196, 84, "整站禁缩放：无障碍上是倒退")}
      ${mark(196, 14, false)}
    `),
  ],

  "webview": [
    fig("原生壳子里嵌了一个网页", `
      ${phone(60, 4, 140, 92)}
      ${neu(66, 10, 128, 12, 0.5)}${label(130, 18, "原生导航栏：你改不了")}
      ${okBox(66, 26, 128, 52)}${label(130, 50, "WebView：你的页面在这")}
      ${neu(66, 82, 128, 10, 0.5)}${label(130, 89, "原生底栏 / 手势区")}
    `),
    fig("能力得靠桥要，不是浏览器现成的", `
      ${frame(8, 24, 100, 48, 5)}${label(58, 18, "网页")}
      ${label(58, 44, "想要：拍照 / 支付")}${label(58, 58, "定位 / 分享")}
      ${arrow(112, 40, 148, 40)}${arrow(148, 58, 112, 58)}
      ${label(130, 34, "JSBridge")}
      ${frame(152, 24, 100, 48, 5)}${label(202, 18, "原生宿主")}
      ${label(202, 50, "只有它有系统权限")}
      ${label(130, 92, "同一个页面换个宿主，能力就不一样")}
    `),
  ],

  "status-bar": [
    fig("顶部这一条不是你的地盘", `
      ${phone(88, 4, 84, 92)}
      ${badBox(92, 8, 76, 10)}
      ${label(178, 14, "系统状态栏：时间 / 电量", "start")}
      ${okBox(96, 24, 68, 62)}
      ${label(178, 56, "你能画的从这开始", "start")}
    `),
    fig("深色页面要换成浅色图标", pair(
      (x) => `${phone(x, 8, 84, 86)}<rect x="${x + 4}" y="12" width="76" height="10" class="dgm-chrome-fill" opacity=".15"/>
        ${neu(x + 4, 22, 76, 66, 0.12)}${mono(x + 12, 20, "9:41")}${label(x + 42, 96, "深色底 + 深色图标：看不见")}`,
      (x) => `${phone(x, 8, 84, 86)}<rect x="${x + 4}" y="12" width="76" height="10" class="dgm-scrim"/>
        ${neu(x + 4, 22, 76, 66, 0.12)}<text x="${x + 12}" y="20" class="dgm-mono dgm-ok-text">9:41</text>${label(x + 42, 96, "跟着页面切 light-content")}`
    )),
  ],

  "immersive": [
    fig("内容延伸到系统栏后面", pair(
      (x) => `${phone(x, 20, 84, 74)}<rect x="${x + 4}" y="24" width="76" height="10" class="dgm-chrome-fill" opacity=".9"/>
        ${badBox(x + 8, 36, 68, 20)}${label(x + 42, 66, "内容从状态栏下面才开始")}`,
      (x) => `${phone(x, 20, 84, 74)}${okBox(x + 6, 24, 72, 32)}
        <rect x="${x + 6}" y="24" width="72" height="10" fill="none" class="dgm-dash"/>${label(x + 42, 66, "图延伸到状态栏后面")}`
    )),
    fig("延伸的是背景，不是按钮", `
      ${phone(88, 4, 84, 92)}
      ${okBox(92, 8, 76, 84, 10)}
      <rect x="92" y="8" width="76" height="12" fill="none" class="dgm-dash"/>
      <rect x="92" y="80" width="76" height="12" fill="none" class="dgm-dash"/>
      ${accent(100, 26, 60, 10, 0.6)}${accent(100, 62, 60, 10, 0.6)}
      ${label(178, 14, "背景铺满：可以", "start")}
      ${label(178, 32, "可点的东西留在安全区内", "start")}
      ${label(178, 88, "虚线之外别放按钮", "start")}
    `),
  ],

  "haptic": [
    fig("三档力度对应三种场合", `
      ${label(42, 18, "轻")}${plot(8, 24, 68, 30, samples((t) => 0.5 + 0.12 * Math.sin(t * 34) * Math.exp(-t * 5)))}
      ${label(42, 68, "切换 / 选中")}
      ${label(130, 18, "中")}${plot(96, 24, 68, 30, samples((t) => 0.5 + 0.3 * Math.sin(t * 30) * Math.exp(-t * 4)))}
      ${label(130, 68, "确认 / 提交")}
      ${label(218, 18, "重")}${plot(184, 24, 68, 30, samples((t) => 0.5 + 0.46 * Math.sin(t * 26) * Math.exp(-t * 3)))}
      ${label(218, 68, "错误 / 危险")}
      ${label(130, 90, "同一页里别混用，用户会以为出了别的事")}
    `),
    fig("震动要和视觉同一时刻", `
      ${eventRow(30, "按下", [0.2], "dgm-accent-fill")}
      ${eventRow(58, "视觉反馈", [0.22], "dgm-marker-ok")}
      ${eventRow(86, "震动", [0.24], "dgm-marker-ok")}
      ${label(200, 16, "错开超过 50ms 就变成两件事")}
    `),
  ],

  "orientation": [
    fig("同一块内容旋转 90°", `
      ${phone(30, 6, 64, 88)}${label(62, 97, "竖屏")}
      ${curveArrow("M108 40 Q128 20 148 40")}
      <rect x="150" y="30" width="88" height="46" rx="10" class="dgm-chrome"/>
      <rect x="152" y="32" width="8" height="42" rx="4" class="dgm-chrome-fill"/>
      <rect x="222" y="46" width="3" height="14" rx="1.5" class="dgm-chrome-fill"/>
      ${label(194, 97, "横屏")}
    `),
    fig("横屏不是把竖屏拉宽", pair(
      (x) => `<rect x="${x}" y="30" width="104" height="44" rx="8" class="dgm-chrome"/>${badBox(x + 6, 36, 92, 14)}${lines(x + 6, 56, 92, 2, 6, 3)}
        ${label(x + 52, 88, "一栏被拉到超长行，读不下去")}`,
      (x) => `<rect x="${x}" y="30" width="104" height="44" rx="8" class="dgm-chrome"/>${okBox(x + 5, 36, 44, 32)}${lines(x + 54, 38, 44, 4, 7, 3)}
        ${label(x + 52, 88, "宽了就分两栏，行长保持不变")}`
    )),
  ],

  "desktop-frame": [
    fig("窄内容在大屏上居中", `
      <rect x="4" y="6" width="252" height="88" rx="8" class="dgm-chrome"/>
      <circle cx="16" cy="16" r="2.4" class="dgm-chrome-fill"/><circle cx="24" cy="16" r="2.4" class="dgm-chrome-fill"/><circle cx="32" cy="16" r="2.4" class="dgm-chrome-fill"/>
      ${phone(102, 24, 56, 60)}
      ${label(52, 60, "两侧大片留白")}
      ${label(208, 60, "两侧大片留白")}
    `),
    fig("要么加画框，要么真的做宽屏版", pair(
      (x) => `${browser(x, 16, 104, 68)}${badBox(x + 6, 32, 92, 44)}${label(x + 52, 94, "H5 直接拉满，字长得没法读")}`,
      (x) => `${browser(x, 16, 104, 68)}${neu(x + 6, 32, 92, 44, 0.1)}${okBox(x + 36, 32, 32, 44)}${label(x + 52, 94, "限宽居中，两侧当背景处理")}`
    )),
  ],

  "share-preview": [
    fig("分享卡片由四块拼成", `
      ${frame(30, 12, 200, 74, 6)}
      ${accent(36, 18, 62, 62, 0.28, 4)}${label(67, 50, "缩略图 og:image")}
      ${neu(106, 24, 116, 8, 0.5)}${label(164, 42, "标题 og:title")}
      ${lines(106, 48, 116, 2, 7, 3)}${label(164, 66, "描述 og:description")}
      ${mono(106, 80, "example.com")}
    `),
    fig("没配 og 就是一条裸链接", pair(
      (x) => `${frame(x, 30, 104, 34, 5)}${mono(x + 8, 50, "https://a.example.com/p?id=…")}
        ${label(x + 52, 80, "别人不知道点开是什么")}`,
      (x) => `${frame(x, 20, 104, 56, 5)}${accent(x + 5, 25, 30, 30, 0.3, 3)}${neu(x + 40, 28, 58, 6, 0.5)}${lines(x + 40, 40, 58, 2, 6, 3)}
        ${label(x + 52, 88, "有图有标题，转发才有人点")}`
    )),
  ],

  "offline-state": [
    fig("断网时页面在干什么", pair(
      (x) => `${frame(x + 4, 20, 96, 56, 5)}<circle cx="${x + 52}" cy="48" r="8" fill="none" class="dgm-accent-stroke" opacity=".4"/>
        ${label(x + 52, 88, "一直转圈，转到用户自己退出")}`,
      (x) => `${frame(x + 4, 20, 96, 56, 5)}<path d="M${x + 40} 40 l24 16 M${x + 64} 40 l-24 16" class="dgm-arrow-bad" style="marker-end:none"/>
        ${okBox(x + 32, 62, 40, 10, 5)}${label(x + 52, 88, "说清「网断了」+ 一个重试")}`
    )),
    fig("三种网络状态各有各的界面", steps([
      { inner: (x, w) => `${frame(x, 16, w, 58, 5)}${lines(x + 5, 24, w - 10, 4, 9, 4, 0.28)}`, cap: "在线：正常内容" },
      { inner: (x, w) => `${frame(x, 16, w, 58, 5)}${badBox(x + 5, 20, w - 10, 12)}${lines(x + 5, 40, w - 10, 3, 9, 4, 0.14)}`, cap: "断网：顶部横幅 + 缓存内容" },
      { inner: (x, w) => `${frame(x, 16, w, 58, 5)}${okBox(x + 5, 20, w - 10, 12)}${lines(x + 5, 40, w - 10, 3, 9, 4, 0.28)}`, cap: "恢复：自动重连并刷新" },
    ])),
  ],
};

/* ------------------------------------------------------------ 动效 / 质感 */

const MOTION = {

  "transition": [
    fig("有没有中间帧的区别", `
      ${label(64, 14, "直接跳变")}${mark(20, 14, false)}
      ${frame(30, 22, 24, 24, 4)}${accent(30, 22, 24, 24, 0.15, 4)}
      ${arrow(60, 34, 76, 34)}
      ${frame(82, 22, 24, 24, 4)}${accent(82, 22, 24, 24, 0.9, 4)}
      ${label(64, 58, "两帧之间没有东西，眼睛跟不上")}
      ${label(196, 14, "过渡")}${mark(150, 14, true)}
      ${frame(150, 22, 20, 20, 3)}${accent(150, 22, 20, 20, 0.15, 3)}
      ${accent(176, 22, 20, 20, 0.4, 3)}${accent(202, 22, 20, 20, 0.65, 3)}
      ${frame(228, 22, 20, 20, 3)}${accent(228, 22, 20, 20, 0.9, 3)}
      ${label(196, 58, "补上中间帧，眼睛能跟住是同一个东西")}
      ${label(130, 82, "过渡不是装饰，是告诉眼睛「这两个状态是同一个元素」")}
    `),
    fig("该给哪些属性加过渡", `
      ${label(66, 20, "便宜：transform / opacity", "start")}${mark(28, 20, true)}
      ${okBox(66, 26, 180, 10, 5)}${label(156, 33, "合成层上跑，不重排")}
      ${label(66, 62, "贵：width / top / left", "start")}${mark(28, 62, false)}
      ${badBox(66, 68, 180, 10, 5)}${label(156, 75, "每帧都触发布局，容易掉帧")}
    `),
  ],

  "duration": [
    fig("常用时长的相对长度", `
      ${label(6, 22, "120ms", "start")}${accent(52, 16, 30, 8, 0.85, 4)}${label(90, 23, "微反馈 · 按下 / 高亮", "start")}
      ${label(6, 44, "200ms", "start")}${accent(52, 38, 52, 8, 0.85, 4)}${label(112, 45, "常规过渡 · 展开 / 淡入", "start")}
      ${label(6, 66, "320ms", "start")}${accent(52, 60, 82, 8, 0.85, 4)}${label(142, 67, "大位移 · 弹层 / 转场", "start")}
      ${label(6, 88, "600ms", "start")}<rect x="52" y="82" width="156" height="8" rx="4" class="dgm-bad"/>${label(214, 89, "开始烦人", "start")}
    `),
    fig("距离越长，时间才越长", `
      ${frame(10, 14, 110, 72, 5)}${accent(16, 60, 16, 16, 0.8, 3)}${curveArrow("M32 68 L58 68")}${frame(60, 60, 16, 16, 3)}
      ${label(65, 96, "移动 30px → 短一点")}
      ${frame(140, 14, 110, 72, 5)}${accent(146, 60, 16, 16, 0.8, 3)}${curveArrow("M162 68 L226 68")}${frame(228, 60, 16, 16, 3)}
      ${label(195, 96, "移动 200px → 长一点")}
      ${label(130, 8, "同一条时长套所有距离，短的拖沓、长的慌张")}
    `),
  ],

  "easing": [
    fig("三条曲线的形状差别", `
      ${label(42, 14, "linear")}${plot(8, 20, 68, 56, samples((t) => t))}
      ${label(42, 92, "机械，像被拖着走")}
      ${label(130, 14, "ease-out")}${plot(96, 20, 68, 56, samples((t) => 1 - Math.pow(1 - t, 3)))}
      ${label(130, 92, "起步快、收尾慢：默认选它")}
      ${label(218, 14, "ease-in-out")}${plot(184, 20, 68, 56, samples((t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2))}
      ${label(218, 92, "两头慢，适合位移大的转场")}
    `),
    fig("进场和退场用不同曲线", `
      ${label(64, 16, "进场：ease-out")}${plot(14, 22, 100, 52, samples((t) => 1 - Math.pow(1 - t, 3)), "dgm-arrow-ok")}
      ${label(64, 92, "先冲进来，稳稳停住")}
      ${label(196, 16, "退场：ease-in")}${plot(146, 22, 100, 52, samples((t) => t * t * t), "dgm-arrow-ok")}
      ${label(196, 92, "慢慢起步，然后果断走掉")}
    `),
  ],

  "spring": [
    fig("弹簧 vs 普通缓动", `
      ${plot(20, 14, 220, 60, samples((t) => 1 - Math.pow(1 - t, 3)), "dgm-arrow-ok", true)}
      <path d="${samples((t) => 1 - Math.exp(-6 * t) * Math.cos(9 * t), 40).map((p, i) => (i ? "L" : "M") + (20 + p[0] * 220).toFixed(1) + " " + (74 - Math.max(-0.1, Math.min(1.3, p[1])) / 1.3 * 60).toFixed(1)).join(" ")}" class="dgm-accent-line"/>
      <line x1="20" y1="${74 - 1 / 1.3 * 60}" x2="240" y2="${74 - 1 / 1.3 * 60}" class="dgm-dash"/>
      ${label(70, 92, "虚线：缓动，到点就停")}
      ${label(190, 92, "实线：弹簧，冲过头再晃回来")}
    `),
    fig("过冲幅度决定气质", `
      ${label(64, 14, "阻尼高：几乎不过冲")}
      <path d="${samples((t) => 1 - Math.exp(-9 * t) * Math.cos(6 * t), 40).map((p, i) => (i ? "L" : "M") + (10 + p[0] * 110).toFixed(1) + " " + (78 - Math.max(0, Math.min(1.2, p[1])) / 1.2 * 48).toFixed(1)).join(" ")}" class="dgm-accent-line"/>
      ${frame(10, 30, 110, 48, 2)}${label(64, 94, "沉稳 · 适合大面积元素")}
      ${label(196, 14, "阻尼低：晃好几下")}
      <path d="${samples((t) => 1 - Math.exp(-3.2 * t) * Math.cos(13 * t), 60).map((p, i) => (i ? "L" : "M") + (142 + p[0] * 110).toFixed(1) + " " + (78 - Math.max(0, Math.min(1.2, p[1])) / 1.2 * 48).toFixed(1)).join(" ")}" class="dgm-accent-line"/>
      ${frame(142, 30, 110, 48, 2)}${label(196, 94, "活泼 · 只适合小图标")}
    `),
  ],

  "micro-interaction": [
    fig("一个按钮的四种手感", steps([
      { inner: (x, w) => `${frame(x + 2, 32, w - 4, 22, 5)}`, cap: "默认" },
      { inner: (x, w) => `${frame(x + 2, 30, w - 4, 22, 5)}${accent(x + 2, 30, w - 4, 22, 0.18, 5)}`, cap: "悬停：微微抬起" },
      { inner: (x, w) => `${frame(x + 4, 34, w - 8, 20, 5)}${accent(x + 4, 34, w - 8, 20, 0.4, 5)}`, cap: "按下：缩一点" },
      { inner: (x, w) => `${okBox(x + 2, 32, w - 4, 22, 5)}<path d="M${x + w / 2 - 6} 43 l4 4 l8-8" class="dgm-arrow-ok" style="marker-end:none"/>`, cap: "成功：打勾" },
    ])),
    fig("微交互只补一件事：你的操作被收到了", `
      ${frame(14, 20, 100, 54, 5)}${neu(30, 38, 68, 18, 0.3, 4)}${cursor(84, 52)}
      ${label(64, 88, "点了没反应，用户会再点一次")}${mark(64, 14, false)}
      ${frame(146, 20, 100, 54, 5)}${accent(162, 38, 68, 18, 0.35, 4)}${cursor(216, 52)}
      <circle cx="196" cy="47" r="14" fill="none" class="dgm-accent-stroke" opacity=".4"/>
      ${label(196, 88, "50ms 内给个变化就够")}${mark(196, 14, true)}
    `),
  ],

  "scale-feedback": [
    fig("按下缩一点，松手弹回来", steps([
      { inner: (x, w) => `${frame(x + 4, 30, w - 8, 30, 6)}${label(x + w / 2, 48, "1.00")}`, cap: "松开" },
      { inner: (x, w) => `${frame(x + 8, 33, w - 16, 24, 5)}${accent(x + 8, 33, w - 16, 24, 0.25, 5)}${label(x + w / 2, 48, "0.96")}`, cap: "按住" },
      { inner: (x, w) => `${frame(x + 4, 30, w - 8, 30, 6)}${label(x + w / 2, 48, "1.00")}`, cap: "松手弹回" },
    ])),
    fig("缩多少才不像坏了", `
      ${label(46, 18, "0.99")}${frame(20, 24, 52, 30, 5)}${label(46, 68, "看不出来，等于没做")}${mark(46, 88, false)}
      ${label(130, 18, "0.96")}${frame(106, 26, 48, 26, 5)}${accent(106, 26, 48, 26, 0.2, 5)}${label(130, 68, "刚好，手感扎实")}${mark(130, 88, true)}
      ${label(214, 18, "0.85")}${frame(196, 30, 36, 18, 4)}${badBox(196, 30, 36, 18, 4)}${label(214, 68, "像塌了一下")}${mark(214, 88, false)}
    `),
  ],

  "page-transition": [
    fig("新页面从右边推进来", steps([
      { inner: (x, w) => `${frame(x, 12, w, 68, 5)}${lines(x + 5, 20, w - 10, 5, 9, 4, 0.28)}`, cap: "当前页" },
      { inner: (x, w) => `${frame(x, 12, w, 68, 5)}${lines(x + 5, 20, (w - 10) * 0.4, 5, 9, 4, 0.12)}${okBox(x + w * 0.45, 12, w * 0.55, 68, 5)}`, cap: "新页覆盖进入" },
      { inner: (x, w) => `${frame(x, 12, w, 68, 5)}${okBox(x, 12, w, 68, 5)}`, cap: "新页占满" },
    ])),
    fig("方向要和层级一致", `
      ${label(64, 16, "进入下一层：从右往左")}
      ${frame(14, 24, 100, 40, 4)}${accent(78, 26, 34, 36, 0.35, 3)}${arrow(96, 44, 44, 44)}
      ${label(196, 16, "返回上一层：反着来")}
      ${frame(146, 24, 100, 40, 4)}${accent(148, 26, 34, 36, 0.35, 3)}${arrow(168, 44, 220, 44)}
      ${label(130, 92, "方向反了，用户就会以为自己走错了")}
    `),
  ],

  "shared-element": [
    fig("同一张图从列表长到详情", steps([
      { inner: (x, w) => `${frame(x, 14, w, 64, 5)}${accent(x + 5, 20, 20, 20, 0.7, 3)}${lines(x + 30, 22, w - 36, 2, 6, 3)}`, cap: "列表里的缩略图" },
      { inner: (x, w) => `${frame(x, 14, w, 64, 5)}${accent(x + 8, 20, 36, 32, 0.7, 3)}`, cap: "同一块在放大移动" },
      { inner: (x, w) => `${frame(x, 14, w, 64, 5)}${accent(x + 3, 17, w - 6, 34, 0.7, 3)}${lines(x + 6, 58, w - 12, 2, 7, 3)}`, cap: "详情页的大图" },
    ])),
    fig("有没有接续，理解成本差很多", pair(
      (x) => `${frame(x, 20, 46, 56, 4)}${accent(x + 4, 25, 14, 14, 0.6, 2)}
        ${frame(x + 56, 20, 46, 56, 4)}${accent(x + 60, 25, 38, 20, 0.6, 2)}
        ${label(x + 52, 88, "两页各自淡入，像是两个东西")}`,
      (x) => `${frame(x, 20, 46, 56, 4)}${accent(x + 4, 25, 14, 14, 0.6, 2)}
        ${frame(x + 56, 20, 46, 56, 4)}${accent(x + 60, 25, 38, 20, 0.6, 2)}
        <path d="M${x + 18} 32 L${x + 60} 30 M${x + 18} 39 L${x + 60} 45" class="dgm-dash"/>
        ${label(x + 52, 88, "连着长过去，一眼知道是同一张")}`
    )),
  ],

  "stagger": [
    fig("同时进场 vs 错峰进场", `
      ${label(64, 16, "全部同时")}${mark(20, 16, false)}
      ${accent(20, 24, 88, 9, 0.55, 3)}${accent(20, 37, 88, 9, 0.55, 3)}${accent(20, 50, 88, 9, 0.55, 3)}${accent(20, 63, 88, 9, 0.55, 3)}
      ${label(64, 88, "一整块闪出来，看不出顺序")}
      ${label(196, 16, "错开 40ms")}${mark(152, 16, true)}
      ${accent(152, 24, 88, 9, 0.85, 3)}${accent(152, 37, 88, 9, 0.65, 3)}${accent(152, 50, 88, 9, 0.45, 3)}${accent(152, 63, 88, 9, 0.25, 3)}
      ${label(196, 88, "像被一条线依次点亮")}
    `),
    fig("间隔怎么定", `
      ${eventRow(24, "第 1 项", [0.02], "dgm-accent-fill")}
      ${eventRow(46, "第 2 项", [0.12], "dgm-accent-fill")}
      ${eventRow(68, "第 3 项", [0.22], "dgm-accent-fill")}
      ${eventRow(90, "第 12 项", [0.62], "dgm-marker-bad")}
      ${label(158, 12, "间隔 × 项数 别超过 400ms")}
    `),
  ],

  "scroll-reveal": [
    fig("进入视口才揭示", `
      ${frame(60, 8, 140, 84, 5)}${label(52, 16, "视口", "end")}
      <line x1="60" y1="70" x2="200" y2="70" class="dgm-dash"/>${label(212, 70, "触发线", "start")}
      ${accent(70, 16, 120, 16, 0.85, 3)}${label(130, 26, "已揭示")}
      ${accent(70, 40, 120, 16, 0.45, 3)}${label(130, 50, "正在淡入上移")}
      ${neu(70, 76, 120, 12, 0.12, 3)}${label(130, 85, "还没进来，先不动")}
    `),
    fig("别做成滚一下才出来的迷宫", pair(
      (x) => `${frame(x, 14, 104, 70, 5)}${neu(x + 6, 20, 92, 58, 0.06)}
        ${label(x + 52, 50, "首屏也等揭示")}${label(x + 52, 94, "一进来是空的，像没加载出来")}`,
      (x) => `${frame(x, 14, 104, 70, 5)}${accent(x + 6, 20, 92, 24, 0.5, 3)}${neu(x + 6, 50, 92, 28, 0.12)}
        ${label(x + 52, 94, "首屏直接显示，往下才用揭示")}`
    )),
  ],

  "parallax": [
    fig("同一次滚动，两层走不同距离", `
      ${frame(14, 10, 110, 80, 5)}${label(69, 6, "滚动前")}
      ${neu(20, 16, 98, 30, 0.25)}${accent(30, 52, 78, 30, 0.5, 3)}
      ${frame(146, 10, 110, 80, 5)}${label(201, 6, "滚动后")}
      ${neu(152, 8, 98, 30, 0.25)}${accent(162, 28, 78, 30, 0.5, 3)}
      ${label(69, 96, "背景 · 前景")}
      ${label(201, 96, "背景挪一点，前景挪很多")}
    `),
    fig("速度差别太大就晕", `
      ${label(6, 20, "背景 0.3×", "start")}${accent(62, 14, 40, 8, 0.5, 4)}
      ${label(6, 42, "内容 1.0×", "start")}${accent(62, 36, 130, 8, 0.85, 4)}
      ${label(6, 64, "前景 1.8×", "start")}<rect x="62" y="58" width="186" height="8" rx="4" class="dgm-bad"/>
      ${label(130, 88, "差得越多越像 3D，也越容易让人不舒服")}
    `),
  ],

  "shimmer": [
    fig("一道高光扫过骨架", steps([
      { inner: (x, w) => `${neu(x, 30, w, 10, 0.2, 3)}${neu(x, 46, w, 10, 0.2, 3)}${accent(x, 30, w * 0.25, 10, 0.35, 3)}`, cap: "高光在左" },
      { inner: (x, w) => `${neu(x, 30, w, 10, 0.2, 3)}${neu(x, 46, w, 10, 0.2, 3)}${accent(x + w * 0.38, 30, w * 0.25, 10, 0.35, 3)}`, cap: "扫到中间" },
      { inner: (x, w) => `${neu(x, 30, w, 10, 0.2, 3)}${neu(x, 46, w, 10, 0.2, 3)}${accent(x + w * 0.72, 30, w * 0.25, 10, 0.35, 3)}`, cap: "扫出右侧后重来" },
    ])),
    fig("微光只说明「在动」，不说明进度", `
      ${frame(14, 22, 100, 46, 4)}${neu(22, 32, 84, 8, 0.22, 3)}${neu(22, 46, 60, 8, 0.22, 3)}
      ${label(64, 84, "不知道还要多久 → 可以用微光")}
      ${frame(146, 22, 100, 46, 4)}${neu(154, 40, 84, 8, 0.2, 4)}${accent(154, 40, 50, 8, 0.85, 4)}
      ${label(196, 84, "知道百分比 → 该用进度条")}
    `),
  ],

  "reduced-motion": [
    fig("开了这个开关之后", pair(
      (x) => `${frame(x, 20, 104, 56, 5)}${accent(x + 6, 60, 30, 12, 0.5, 3)}${curveArrow("M" + (x + 36) + " 66 Q" + (x + 60) + " 24 " + (x + 88) + " 34")}
        ${label(x + 52, 90, "照旧大幅位移 / 视差：会诱发眩晕")}`,
      (x) => `${frame(x, 20, 104, 56, 5)}${accent(x + 30, 36, 44, 24, 0.2, 3)}${accent(x + 30, 36, 44, 24, 0.6, 3)}
        ${label(x + 52, 90, "换成纯淡入，信息一点没少")}`
    )),
    fig("要减的是位移，不是全部反馈", `
      ${label(66, 22, "该关：视差 / 大位移 / 自动轮播", "start")}${mark(28, 22, false)}
      <line x1="28" y1="34" x2="248" y2="34" class="dgm-div"/>
      ${label(66, 54, "该留：焦点环 / 加载指示 / 状态变色", "start")}${mark(28, 54, true)}
      ${label(130, 82, "全部动画一刀切成 0，用户会分不清界面有没有响应")}
    `),
  ],

  "type-scale": [
    fig("一套字阶只有几档", `
      <text x="10" y="30" class="dgm-mono" style="font-size:15px">34</text>
      <text x="48" y="30" class="dgm-mono" style="font-size:11px">25</text>
      <text x="80" y="30" class="dgm-mono" style="font-size:8.5px">18</text>
      <text x="106" y="30" class="dgm-mono" style="font-size:7px">15</text>
      <text x="128" y="30" class="dgm-mono" style="font-size:6px">13</text>
      ${label(130, 48, "标题 → 小标题 → 正文 → 辅助 → 标注")}
      ${label(130, 72, "档与档之间保持固定倍率（约 1.25–1.33）")}
      ${label(130, 90, "凑不出的字号说明这一档本来就不该存在")}
    `),
    fig("随手取值 vs 落在阶上", pair(
      (x) => `${lines(x + 4, 26, 90, 1, 0, 7)}${lines(x + 4, 40, 90, 1, 0, 6)}${lines(x + 4, 52, 90, 1, 0, 5.4)}${lines(x + 4, 63, 90, 1, 0, 5)}
        ${label(x + 50, 88, "17/16/15/14：差别看不出")}`,
      (x) => `${lines(x + 4, 24, 90, 1, 0, 10)}${lines(x + 4, 42, 90, 1, 0, 5)}${lines(x + 4, 54, 90, 1, 0, 5)}${lines(x + 4, 66, 90, 1, 0, 3.4)}
        ${label(x + 50, 88, "25 / 15 / 13：层级一眼就分得开")}`
    )),
  ],

  "font-weight": [
    fig("靠字重拉开层级", pair(
      (x) => `${neu(x + 4, 28, 88, 6, 0.45)}${neu(x + 4, 42, 88, 6, 0.45)}${neu(x + 4, 56, 60, 6, 0.45)}
        ${label(x + 50, 84, "全都一个字重，找不到入口")}`,
      (x) => `${neu(x + 4, 24, 66, 10, 0.85)}${neu(x + 4, 44, 88, 5, 0.35)}${neu(x + 4, 56, 60, 5, 0.35)}
        ${label(x + 50, 84, "标题重、正文轻，眼睛先落在标题")}`
    )),
    fig("对比要够，别只差一档", `
      ${label(64, 18, "400 vs 500")}${neu(20, 26, 88, 7, 0.5)}${neu(20, 40, 88, 6, 0.4)}
      ${label(64, 70, "差别太小，等于没分层")}${mark(64, 90, false)}
      ${label(196, 18, "400 vs 700")}${neu(152, 24, 88, 10, 0.9)}${neu(152, 42, 88, 5, 0.35)}
      ${label(196, 70, "一眼分得清主次")}${mark(196, 90, true)}
    `),
  ],

  "whitespace": [
    fig("同样的内容，密度不同", pair(
      (x) => `${frame(x, 14, 104, 72, 5)}${lines(x + 4, 20, 96, 9, 7, 4, 0.35)}
        ${label(x + 52, 94, "填满每一寸，看着廉价又累")}`,
      (x) => `${frame(x, 14, 104, 72, 5)}${neu(x + 14, 26, 76, 8, 0.7)}${lines(x + 14, 46, 76, 3, 9, 4, 0.3)}
        ${label(x + 52, 94, "留白不是没用完，是让重点单独站着")}`
    )),
    fig("留白要有节奏，不是到处一样宽", `
      ${frame(20, 14, 220, 72, 5)}
      ${neu(34, 24, 100, 8, 0.7)}
      ${lines(34, 40, 192, 2, 8, 4, 0.3)}
      ${neu(34, 64, 60, 10, 0.5, 4)}
      <line x1="20" y1="20" x2="34" y2="20" class="dgm-dash"/>
      ${label(160, 22, "组内间距小 · 组间间距大", "start")}
      ${label(130, 96, "间距本身就在说明「哪几块是一伙的」")}
    `),
  ],

  "elevation": [
    fig("三级高度对应三种角色", `
      ${frame(12, 26, 68, 44, 5)}${label(46, 84, "0 · 平铺内容")}
      <rect x="94" y="28" width="68" height="44" rx="5" class="dgm-chrome-fill" opacity=".1"/>
      ${frame(92, 26, 68, 44, 5)}${label(126, 84, "1 · 卡片 / 吸顶")}
      <rect x="176" y="32" width="68" height="44" rx="5" class="dgm-chrome-fill" opacity=".18"/>
      ${frame(172, 26, 68, 44, 5)}${label(206, 84, "3 · 弹层 / 菜单")}
      ${label(130, 14, "阴影越重，表示离用户越近、越该先看它")}
    `),
    fig("阴影是给层级用的，不是给好看用的", pair(
      (x) => `${frame(x + 6, 24, 90, 20, 4)}<rect x="${x + 8}" y="28" width="90" height="20" rx="4" class="dgm-chrome-fill" opacity=".2"/>
        ${frame(x + 6, 54, 90, 20, 4)}<rect x="${x + 8}" y="58" width="90" height="20" rx="4" class="dgm-chrome-fill" opacity=".2"/>
        ${label(x + 52, 92, "每块都有阴影，等于都没有")}`,
      (x) => `${neu(x + 6, 24, 90, 20, 0.1, 4)}${frame(x + 6, 24, 90, 20, 4)}
        <rect x="${x + 8}" y="58" width="90" height="20" rx="4" class="dgm-chrome-fill" opacity=".22"/>${frame(x + 6, 54, 90, 20, 4)}
        ${label(x + 52, 92, "只有真的浮起来的那块有")}`
    )),
  ],

  "glassmorphism": [
    fig("毛玻璃靠的是背后有东西", `
      ${accent(10, 14, 110, 72, 0.35, 6)}${neu(20, 24, 40, 40, 0.5, 20)}
      <rect x="18" y="34" width="94" height="34" rx="6" class="dgm-scrim"/>${frame(18, 34, 94, 34, 6)}
      ${label(64, 96, "背后有内容：糊出来才有层次")}
      ${frame(140, 14, 110, 72, 6)}
      <rect x="148" y="34" width="94" height="34" rx="6" class="dgm-scrim"/>${frame(148, 34, 94, 34, 6)}
      ${label(196, 96, "背后是纯色：等于加了个灰块")}
    `),
    fig("糊了之后，字还得看得清", pair(
      (x) => `${accent(x, 20, 104, 56, 0.5, 5)}<rect x="${x + 8}" y="34" width="88" height="28" rx="5" class="dgm-scrim" opacity=".3"/>
        ${neu(x + 16, 44, 60, 5, 0.4)}${label(x + 52, 90, "只糊不压暗，文字浮在花背景上")}`,
      (x) => `${accent(x, 20, 104, 56, 0.5, 5)}<rect x="${x + 8}" y="34" width="88" height="28" rx="5" class="dgm-scrim"/>
        ${neu(x + 16, 44, 60, 5, 0.95)}${label(x + 52, 90, "模糊 + 一层压暗，再放文字")}`
    )),
  ],

  "grain": [
    fig("平涂 vs 加了噪点", `
      ${accent(10, 20, 110, 56, 0.35, 5)}${label(65, 90, "纯色渐变：容易出色带")}
      ${accent(140, 20, 110, 56, 0.35, 5)}
      ${noiseDots(142, 22, 106, 52, 150, 7919, 0.65, 0.45)}
      ${label(195, 90, "加一层极淡噪点：像纸，不像塑料")}
    `),
    fig("噪点要淡到几乎察觉不到", `
      ${label(46, 18, "3–6%")}${accent(14, 24, 64, 40, 0.3, 4)}
      ${noiseDots(14, 24, 64, 40, 40, 104729, 0.55, 0.4)}
      ${label(46, 78, "对，几乎看不见")}${mark(46, 94, true)}
      ${label(196, 18, "20%+")}${accent(150, 24, 64, 40, 0.3, 4)}
      ${noiseDots(150, 24, 64, 40, 220, 15485863, 0.8, 0.8)}
      ${label(182, 78, "脏了，像信号不好")}${mark(182, 94, false)}
    `),
  ],

  "vignette": [
    fig("四角压暗，视线被收进中间", `
      ${frame(70, 12, 120, 76, 6)}
      <rect x="70" y="12" width="120" height="76" rx="6" class="dgm-scrim" opacity=".55"/>
      <ellipse cx="130" cy="50" rx="42" ry="26" fill="var(--panel)" opacity=".9"/>
      ${accent(112, 42, 36, 16, 0.5, 3)}
      ${label(130, 96, "边缘暗、中心亮：眼睛自动往中间走")}
    `),
    fig("过重就变成看隧道", pair(
      (x) => `${frame(x, 20, 104, 58, 5)}<rect x="${x}" y="20" width="104" height="58" rx="5" class="dgm-scrim"/>
        <ellipse cx="${x + 52}" cy="49" rx="20" ry="13" fill="var(--panel)"/>
        ${label(x + 52, 92, "压太狠，四角内容直接没法看")}`,
      (x) => `${frame(x, 20, 104, 58, 5)}<rect x="${x}" y="20" width="104" height="58" rx="5" class="dgm-scrim" opacity=".4"/>
        <ellipse cx="${x + 52}" cy="49" rx="42" ry="24" fill="var(--panel)" opacity=".85"/>
        ${label(x + 52, 92, "只在最外圈轻轻收一下")}`
    )),
  ],

  "accent-ratio": [
    fig("强调色只占很小一块", `
      ${label(6, 22, "克制", "start")}
      ${neu(40, 16, 190, 12, 0.25, 3)}${accent(230, 16, 20, 12, 0.9, 3)}
      ${label(130, 42, "≈ 90% 中性 + 10% 强调")}
      ${label(6, 68, "失控", "start")}
      ${accent(40, 62, 62, 12, 0.9, 3)}${neu(106, 62, 30, 12, 0.25, 3)}${accent(140, 62, 50, 12, 0.9, 3)}${accent(194, 62, 56, 12, 0.9, 3)}
      ${label(130, 90, "到处都是强调色 = 没有强调色")}
    `),
    fig("整页只有一个「最想让你点的东西」", `
      ${frame(20, 12, 220, 76, 6)}
      ${neu(32, 22, 120, 8, 0.55)}${lines(32, 38, 196, 2, 8, 4, 0.28)}
      ${neu(32, 62, 52, 14, 0.25, 4)}${label(58, 71, "次要")}
      ${accent(94, 62, 52, 14, 0.9, 4)}${label(120, 71, "主操作")}
      ${label(200, 71, "其余全部降调", "middle")}
    `),
  ],

  "radius-consistency": [
    fig("圆角混用 vs 成套", pair(
      (x) => `${frame(x + 4, 22, 42, 26, 1)}${frame(x + 54, 22, 42, 26, 10)}${frame(x + 4, 54, 42, 26, 6)}${frame(x + 54, 54, 42, 26, 16)}
        ${label(x + 50, 92, "1/10/6/16 随手写，像拼凑")}`,
      (x) => `${frame(x + 4, 22, 42, 26, 6)}${frame(x + 54, 22, 42, 26, 6)}${frame(x + 4, 54, 42, 26, 6)}${frame(x + 54, 54, 42, 26, 6)}
        ${label(x + 50, 92, "同一档尺寸用同一个圆角")}`
    )),
    fig("嵌套时外圆角要比内圆角大", pair(
      (x) => `${frame(x + 8, 22, 88, 52, 6)}${frame(x + 16, 30, 72, 36, 12)}
        ${label(x + 52, 90, "内比外还圆，中间会挤出怪缝")}`,
      (x) => `${frame(x + 8, 22, 88, 52, 12)}${frame(x + 16, 30, 72, 36, 6)}
        ${label(x + 52, 90, "外 = 内 + 内边距，边距才均匀")}`
    )),
  ],
};

/* ------------------------------------------------------------ Web · 状态 / 反馈 */

const WEB_STATE = {

  "hover-state": [
    fig("鼠标移上去要有变化", pair(
      (x) => `${frame(x + 14, 30, 68, 24, 5)}${cursor(x + 44, 40)}
        ${label(x + 48, 78, "移上去毫无变化，不知道能不能点")}`,
      (x) => `${frame(x + 14, 30, 68, 24, 5)}${accent(x + 14, 30, 68, 24, 0.22, 5)}${cursor(x + 44, 40)}
        ${label(x + 48, 78, "底色 / 边框变一下 + 手型光标")}`
    )),
    fig("触屏上没有悬停这回事", `
      ${frame(14, 22, 100, 46, 5)}${cursor(60, 40)}${accent(30, 32, 68, 20, 0.22, 4)}
      ${label(64, 84, "鼠标：hover 是探路，可以藏东西")}${mark(64, 14, true)}
      ${frame(146, 22, 100, 46, 5)}${touch(196, 45)}
      ${label(196, 84, "手指没有 hover 这一态")}${mark(196, 14, false)}
    `),
  ],

  "active-state": [
    fig("一个可点元素的三态", steps([
      { inner: (x, w) => `${frame(x + 2, 32, w - 4, 24, 5)}`, cap: "默认" },
      { inner: (x, w) => `${frame(x + 2, 32, w - 4, 24, 5)}${accent(x + 2, 32, w - 4, 24, 0.2, 5)}${cursor(x + w / 2, 40)}`, cap: "悬停" },
      { inner: (x, w) => `${frame(x + 4, 34, w - 8, 22, 5)}${accent(x + 4, 34, w - 8, 22, 0.5, 5)}${cursor(x + w / 2, 40)}`, cap: "按下：更深 + 缩一点" },
    ])),
    fig("按下态要在手指抬起前就出现", `
      ${eventRow(28, "按下", [0.16], "dgm-accent-fill")}
      ${eventRow(56, "按下态出现", [0.19], "dgm-marker-ok")}
      ${eventRow(84, "松手 / 真正执行", [0.6], "dgm-chrome-fill")}
      ${label(158, 14, "这段空白 = 「点了没反应」")}
    `),
  ],

  "focus-visible": [
    fig("键盘用户全靠这一圈", pair(
      (x) => `${frame(x + 14, 32, 68, 24, 5)}${label(x + 48, 78, "outline:none：Tab 到哪靠猜")}`,
      (x) => `${frame(x + 14, 32, 68, 24, 5)}<rect x="${x + 11}" y="29" width="74" height="30" rx="7" fill="none" class="dgm-accent-stroke"/>
        ${label(x + 48, 78, "焦点环：离元素 2px，够粗够亮")}`
    )),
    fig("鼠标点不该冒出焦点环", `
      ${label(64, 18, ":focus 老写法")}${mark(20, 18, false)}
      ${frame(30, 26, 68, 24, 5)}<rect x="27" y="23" width="74" height="30" rx="7" fill="none" class="dgm-accent-stroke"/>${cursor(58, 34)}
      ${label(64, 72, "鼠标点一下也留一圈，设计师就想删掉它")}
      ${label(196, 18, ":focus-visible")}${mark(152, 18, true)}
      ${frame(162, 26, 68, 24, 5)}${cursor(190, 34)}
      ${label(196, 72, "只在键盘导航时出现，两边都满意")}
    `),
  ],

  "disabled-state": [
    fig("禁用要看得出来", pair(
      (x) => `${accent(x + 14, 32, 68, 24, 0.85, 5)}${label(x + 48, 78, "长得和可用的一样，点了没反应")}`,
      (x) => `${accent(x + 14, 32, 68, 24, 0.22, 5)}${label(x + 48, 78, "降透明 / 去掉阴影 + 禁用光标")}`
    )),
    fig("光禁用不够，还得说为什么", `
      ${frame(14, 20, 100, 52, 5)}${accent(30, 40, 68, 18, 0.22, 4)}
      ${label(64, 88, "只是灰着，用户卡在这里")}${mark(64, 14, false)}
      ${frame(146, 20, 100, 52, 5)}${accent(162, 34, 68, 18, 0.22, 4)}${lines(162, 60, 68, 1, 0, 3, 0.5)}
      ${label(196, 88, "下面一行说明「还差什么」")}${mark(196, 14, true)}
    `),
  ],

  "empty-state": [
    fig("空不等于什么都不放", pair(
      (x) => `${frame(x, 18, 104, 60, 5)}${label(x + 52, 94, "一片空白，像是坏了")}`,
      (x) => `${frame(x, 18, 104, 60, 5)}<circle cx="${x + 52}" cy="34" r="7" fill="none" class="dgm-chrome" opacity=".6"/>
        ${lines(x + 22, 48, 60, 2, 7, 3, 0.4)}${accent(x + 32, 64, 40, 9, 0.8, 4)}
        ${label(x + 52, 94, "图形 + 一句解释 + 一个下一步")}`
    )),
    fig("三种「空」不是一回事", `
      ${frame(8, 22, 74, 42, 4)}${label(45, 46, "还没有数据")}${label(45, 76, "引导去创建第一条")}
      ${frame(93, 22, 74, 42, 4)}${label(130, 46, "筛没了")}${label(130, 76, "给「清除筛选」")}
      ${frame(178, 22, 74, 42, 4)}${label(215, 46, "搜不到")}${label(215, 76, "给建议词 / 改关键词")}
      ${label(130, 14, "文案和按钮都不一样，别共用一个组件了事")}
    `),
  ],

  "loading-state": [
    fig("按范围选加载形式", `
      ${frame(8, 24, 74, 40, 4)}${accent(24, 38, 42, 12, 0.4, 6)}<circle cx="34" cy="44" r="3.5" fill="none" class="dgm-accent-stroke"/>
      ${label(45, 76, "按钮内：只锁这一个操作")}
      ${frame(93, 24, 74, 40, 4)}${neu(99, 28, 62, 10, 0.4)}${okBox(99, 42, 62, 18)}
      ${label(130, 76, "局部：只有这块在换")}
      ${frame(178, 24, 74, 40, 4)}<rect x="178" y="24" width="74" height="40" rx="4" class="dgm-scrim"/><circle cx="215" cy="44" r="6" fill="none" class="dgm-accent-stroke"/>
      ${label(215, 76, "整页：慎用，会挡住一切")}
    `),
    fig("超过一秒就该换说法", `
      ${eventRow(30, "0–300ms", [0.05], "dgm-marker-ok")}${label(200, 22, "什么都别显示，闪一下更烦")}
      ${eventRow(60, "0.3–1s", [0.3], "dgm-accent-fill")}${label(200, 52, "转圈 / 骨架屏")}
      ${eventRow(90, "> 3s", [0.8], "dgm-marker-bad")}${label(200, 82, "给进度或「还在处理」的具体说明")}
    `),
  ],

  "skeleton": [
    fig("骨架屏 vs 转圈", pair(
      (x) => `${frame(x, 18, 104, 60, 5)}<circle cx="${x + 52}" cy="48" r="8" fill="none" class="dgm-accent-stroke"/>
        ${label(x + 52, 92, "只知道在等，不知道等出来什么")}`,
      (x) => `${frame(x, 18, 104, 60, 5)}${neu(x + 8, 26, 28, 28, 0.2, 3)}${lines(x + 42, 28, 54, 3, 8, 5, 0.2)}${neu(x + 8, 60, 88, 6, 0.2, 3)}
        ${label(x + 52, 92, "先把版式摆出来，内容到位就替换")}`
    )),
    fig("骨架要和真实内容同形", pair(
      (x) => `${neu(x + 6, 26, 88, 40, 0.2, 3)}
        ${label(x + 50, 84, "一整块灰，加载完位置全变")}`,
      (x) => `${neu(x + 6, 26, 30, 30, 0.2, 3)}${lines(x + 42, 28, 52, 3, 8, 5, 0.2)}${neu(x + 6, 62, 60, 5, 0.2, 2)}
        ${label(x + 50, 84, "行数、块位和真实结构一致，不跳")}`
    )),
  ],

  "error-state": [
    fig("错误要说清三件事", `
      ${frame(30, 14, 200, 62, 5)}
      <rect x="30" y="14" width="3" height="62" class="dgm-bad" rx="1.5"/>
      ${neu(44, 24, 90, 7, 0.7)}${label(150, 30, "① 出了什么事", "start")}
      ${lines(44, 40, 120, 1, 0, 4, 0.35)}${label(180, 45, "② 影响是什么", "start")}
      <rect x="44" y="54" width="40" height="12" rx="6" class="dgm-bad"/>${label(150, 62, "③ 现在能做什么", "start")}
      ${label(130, 92, "少一件，用户就只能刷新碰运气")}
    `),
    fig("别把技术错误直接甩出来", pair(
      (x) => `${frame(x, 26, 104, 34, 4)}${mono(x + 6, 40, "Error 500")}${mono(x + 6, 52, "at fetchUser (a.js:42)")}
        ${label(x + 52, 80, "用户看不懂，也不知道该干嘛")}`,
      (x) => `${frame(x, 26, 104, 34, 4)}${lines(x + 6, 34, 90, 2, 8, 4, 0.5)}<rect x="${x + 6}" y="50" width="30" height="8" rx="4" class="dgm-ok"/>
        ${label(x + 52, 80, "人话 + 重试；技术细节收进详情")}`
    )),
  ],

  "retry": [
    fig("失败之后要能自己爬起来", steps([
      { inner: (x, w) => `${frame(x, 20, w, 50, 4)}${badBox(x + 5, 38, w - 10, 14)}`, cap: "请求失败" },
      { inner: (x, w) => `${frame(x, 20, w, 50, 4)}${accent(x + 5, 38, w - 10, 14, 0.35, 3)}<circle cx="${x + w / 2}" cy="45" r="4" fill="none" class="dgm-accent-stroke"/>`, cap: "退避一会儿再试" },
      { inner: (x, w) => `${frame(x, 20, w, 50, 4)}${okBox(x + 5, 30, w - 10, 30)}`, cap: "成功，页面照常" },
    ])),
    fig("重试间隔要越拉越长", `
      ${eventRow(34, "指数退避", [0.04, 0.12, 0.28, 0.6], "dgm-accent-fill")}
      ${label(200, 20, "1s → 2s → 4s → 8s，最多几次就停")}
      ${eventRow(72, "死循环重试", [0.04, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.92], "dgm-marker-bad")}
      ${label(200, 92, "把已经挂了的服务再压一遍")}
    `),
  ],

  "optimistic-update": [
    fig("先改界面，再等服务器", `
      ${eventRow(26, "用户点赞", [0.08], "dgm-accent-fill")}
      ${eventRow(52, "界面立刻变", [0.1], "dgm-marker-ok")}
      ${eventRow(78, "请求回来", [0.62], "dgm-chrome-fill")}
      ${label(200, 14, "这段等待用户完全感觉不到")}
      <path d="M84 58 L84 74" class="dgm-dash"/>
    `),
    fig("失败了要能干净地退回去", steps([
      { inner: (x, w) => `${frame(x, 22, w, 46, 4)}<path d="M${x + w / 2 - 6} 45 l6 6 l8-12" class="dgm-arrow-ok" style="marker-end:none"/>`, cap: "先当成功显示" },
      { inner: (x, w) => `${frame(x, 22, w, 46, 4)}${badBox(x + 5, 38, w - 10, 14)}`, cap: "服务器说失败" },
      { inner: (x, w) => `${frame(x, 22, w, 46, 4)}${neu(x + 5, 38, w - 10, 14, 0.25)}${accent(x + 5, 56, w - 10, 8, 0.5, 4)}`, cap: "回滚 + 一句提示" },
    ])),
  ],

  "undo": [
    fig("撤销比二次确认更顺手", steps([
      { inner: (x, w) => `${frame(x, 18, w, 52, 4)}${lines(x + 5, 26, w - 10, 3, 9, 5, 0.3)}${touch(x + w - 14, 30)}`, cap: "点删除，立即生效" },
      { inner: (x, w) => `${frame(x, 18, w, 52, 4)}${lines(x + 5, 26, w - 10, 2, 9, 5, 0.3)}${accent(x + 5, 54, w - 10, 12, 0.35, 4)}${label(x + w / 2, 63, "已删除 · 撤销")}`, cap: "轻提示带撤销" },
      { inner: (x, w) => `${frame(x, 18, w, 52, 4)}${lines(x + 5, 26, w - 10, 3, 9, 5, 0.3)}${okBox(x + 5, 26, w - 10, 5, 2)}`, cap: "点撤销，原样回来" },
    ])),
    fig("什么时候还是得拦一下", `
      ${label(64, 18, "可撤销")}${mark(20, 18, true)}
      ${frame(30, 26, 68, 30, 4)}${label(64, 44, "删一条记录")}
      ${label(64, 72, "先做，给后悔药")}
      ${label(196, 18, "不可逆")}${mark(152, 18, false)}
      ${frame(162, 26, 68, 30, 4)}${label(196, 44, "注销账号")}
      ${label(196, 72, "这种才值得二次确认")}
    `),
  ],

  "cls": [
    fig("内容在你眼皮底下跳走", steps([
      { inner: (x, w) => `${frame(x, 14, w, 66, 4)}${neu(x + 5, 20, w - 10, 8, 0.5)}${accent(x + 5, 34, w - 10, 12, 0.6, 3)}`, cap: "你正要点这个按钮" },
      { inner: (x, w) => `${frame(x, 14, w, 66, 4)}${neu(x + 5, 20, w - 10, 8, 0.5)}${badBox(x + 5, 32, w - 10, 18)}${accent(x + 5, 54, w - 10, 12, 0.6, 3)}`, cap: "广告 / 图片插进来" },
      { inner: (x, w) => `${frame(x, 14, w, 66, 4)}${badBox(x + 5, 32, w - 10, 18)}${touch(x + w / 2, 41)}`, cap: "点到了别的东西" },
    ])),
    fig("三个常见的跳动来源", `
      ${label(6, 22, "图片没写尺寸", "start")}${badBox(92, 16, 40, 10, 3)}${label(136, 23, "→ 用 aspect-ratio 先占位", "start")}
      ${label(6, 48, "字体切换", "start")}${badBox(92, 42, 40, 10, 3)}${label(136, 49, "→ font-display + 尺寸对齐", "start")}
      ${label(6, 74, "顶部横幅后插入", "start")}${badBox(92, 68, 40, 10, 3)}${label(136, 75, "→ 一开始就把位置留出来", "start")}
    `),
  ],
};

/* ------------------------------------------------------------ Web · 组件 */

const WEB_COMP = {

  "tooltip": [
    fig("文字提示由哪几块组成", `
      ${frame(84, 40, 26, 26, 5)}${label(97, 76, "触发元素")}
      ${accent(58, 12, 80, 20, 0.9, 4)}${label(98, 25, "一句短说明")}
      <path d="M92 32 l6 6 l6-6 z" class="dgm-accent-fill"/>
      ${label(178, 20, "小箭头指回触发点", "start")}
      ${label(178, 52, "跟着元素走，不占布局", "start")}
    `),
    fig("提示里不能放关键信息", pair(
      (x) => `${frame(x + 34, 44, 26, 22, 4)}${accent(x + 10, 18, 84, 18, 0.85, 4)}${label(x + 52, 30, "点这里会永久删除")}
        ${label(x + 52, 88, "手机上根本没有悬停，这句话不存在")}`,
      (x) => `${frame(x + 34, 44, 26, 22, 4)}${accent(x + 22, 18, 60, 16, 0.85, 4)}${label(x + 52, 29, "删除")}
        ${lines(x + 16, 74, 72, 1, 0, 3.5, 0.5)}
        ${label(x + 52, 96, "提示只补充名称，后果写在页面上")}`
    )),
  ],

  "popover": [
    fig("气泡卡片比提示能装更多", `
      ${frame(94, 66, 40, 18, 4)}${label(114, 92, "锚点")}
      ${frame(66, 14, 96, 44, 5)}${neu(72, 20, 60, 6, 0.6)}${lines(72, 32, 84, 2, 7, 3)}
      <rect x="112" y="46" width="30" height="8" rx="4" class="dgm-accent-fill" opacity=".8"/>
      <path d="M108 58 l6 7 l6-7 z" class="dgm-chrome-fill" opacity=".5"/>
      ${label(174, 26, "里面可以有按钮 / 输入", "start")}
      ${label(174, 46, "点外面才关", "start")}
    `),
    fig("靠边时要自己翻个面", pair(
      (x) => `${frame(x, 14, 104, 72, 5)}${frame(x + 76, 22, 24, 14, 3)}${accent(x + 62, 40, 76, 26, 0.5, 4)}
        ${label(x + 52, 94, "照原方向展开，一半跑到屏幕外")}`,
      (x) => `${frame(x, 14, 104, 72, 5)}${frame(x + 76, 22, 24, 14, 3)}${accent(x + 24, 40, 76, 26, 0.5, 4)}
        ${label(x + 52, 94, "撞到边界就翻到另一侧")}`
    )),
  ],

  "modal": [
    fig("背景锁不锁的区别", pair(
      (x) => `${screen(x, 14, 84, 78)}
        <line x1="${x + 10}" y1="26" x2="${x + 74}" y2="26" class="dgm-chrome-fill" opacity=".5"/>
        <line x1="${x + 10}" y1="34" x2="${x + 60}" y2="34" class="dgm-chrome-fill" opacity=".5"/>
        <line x1="${x + 10}" y1="72" x2="${x + 74}" y2="72" class="dgm-chrome-fill" opacity=".5"/>
        ${badBox(x + 22, 46, 40, 20)}${label(x + 42, 96, "背景没锁，弹窗像浮在上面")}`,
      (x) => `${screen(x, 14, 84, 78)}<rect x="${x}" y="14" width="84" height="78" rx="8" class="dgm-scrim"/>
        ${okBox(x + 18, 32, 48, 44)}${label(x + 42, 96, "遮罩压暗 + 背景锁定")}`
    )),
    fig("一个模态框该有的零件", `
      ${screen(20, 8, 220, 84)}<rect x="20" y="8" width="220" height="84" rx="8" class="dgm-scrim"/>
      ${frame(56, 18, 148, 64, 6)}<rect x="56" y="18" width="148" height="64" rx="6" fill="var(--panel)"/>${frame(56, 18, 148, 64, 6)}
      ${neu(64, 26, 70, 7, 0.7)}${label(30, 30, "标题", "start")}
      <text x="194" y="32" class="dgm-mono">×</text>
      ${lines(64, 42, 132, 2, 7, 3)}
      ${neu(120, 62, 34, 11, 0.3, 4)}${accent(160, 62, 36, 11, 0.85, 4)}
      ${label(210, 70, "次要 / 主操作", "start")}
      ${label(130, 98, "Esc 能关 · 焦点关在里面 · 打开时聚焦到第一个可操作项")}
    `),
  ],

  "drawer": [
    fig("从边缘滑出的一块面板", steps([
      { inner: (x, w) => `${frame(x, 16, w, 60, 4)}${lines(x + 5, 24, w - 10, 4, 9, 4, 0.28)}`, cap: "页面原样" },
      { inner: (x, w) => `${frame(x, 16, w, 60, 4)}<rect x="${x}" y="16" width="${w}" height="60" rx="4" class="dgm-scrim"/>${okBox(x + w * 0.5, 16, w * 0.5, 60, 4)}`, cap: "从右侧推入" },
      { inner: (x, w) => `${frame(x, 16, w, 60, 4)}<rect x="${x}" y="16" width="${w}" height="60" rx="4" class="dgm-scrim"/>${okBox(x + w * 0.35, 16, w * 0.65, 60, 4)}`, cap: "停在覆盖一部分" },
    ])),
    fig("左边放导航，右边放细节", `
      ${frame(14, 16, 100, 64, 5)}${okBox(14, 16, 34, 64, 5)}${neu(56, 26, 50, 6, 0.3)}${lines(56, 40, 50, 3, 8, 4, 0.2)}
      ${label(64, 92, "左抽屉：一级导航 / 账号")}
      ${frame(146, 16, 100, 64, 5)}${okBox(212, 16, 34, 64, 5)}${neu(154, 26, 50, 6, 0.3)}${lines(154, 40, 50, 3, 8, 4, 0.2)}
      ${label(196, 92, "右抽屉：筛选 / 详情 / 设置")}
    `),
  ],

  "toast": [
    fig("轻提示不打断，也别抢焦点", `
      ${frame(20, 10, 220, 72, 5)}
      ${lines(32, 22, 120, 3, 9, 4, 0.25)}
      ${accent(150, 60, 78, 14, 0.4, 5)}${label(189, 69, "已保存")}
      ${label(30, 96, "内容照常可用", "start")}
      ${label(240, 96, "提示浮在角上，几秒后自己走", "end")}
    `),
    fig("停留时间和内容长度挂钩", `
      ${eventRow(28, "「已保存」", [0.06, 0.32], "dgm-accent-fill")}${label(200, 16, "约 3s 够了")}
      ${eventRow(60, "带撤销按钮", [0.06, 0.62], "dgm-marker-ok")}${label(200, 48, "留到 6–8s，给人反应时间")}
      ${eventRow(92, "报错信息", [0.06], "dgm-marker-bad")}${label(200, 80, "别自动消失，或干脆别用 toast")}
    `),
  ],

  "confirm-dialog": [
    fig("危险操作的确认框长这样", `
      ${frame(40, 12, 180, 76, 6)}
      ${neu(52, 24, 96, 8, 0.7)}${label(30, 28, "说清后果", "start")}
      ${lines(52, 40, 156, 2, 7, 3)}
      ${neu(120, 62, 42, 13, 0.28, 4)}${label(141, 71, "取消")}
      <rect x="168" y="62" width="42" height="13" rx="4" class="dgm-bad"/>${label(189, 71, "删除")}
      ${label(130, 98, "按钮上写具体动作，不要写「确定」")}
    `),
    fig("不是所有事都值得拦一下", pair(
      (x) => `${frame(x + 6, 22, 92, 46, 5)}${label(x + 52, 40, "确定要退出编辑吗？")}${neu(x + 20, 50, 26, 10, 0.3, 3)}${accent(x + 56, 50, 26, 10, 0.7, 3)}
        ${label(x + 52, 86, "每一步都问，用户会闭眼点确定")}`,
      (x) => `${frame(x + 6, 22, 92, 46, 5)}${lines(x + 16, 34, 72, 2, 8, 4, 0.28)}${accent(x + 16, 56, 44, 9, 0.4, 4)}${label(x + 38, 63, "已退出 · 撤销")}
        ${label(x + 52, 86, "可撤销的事，直接做 + 给撤销")}`
    )),
  ],

  "dropdown": [
    fig("触发器和菜单的关系", `
      ${frame(70, 12, 80, 18, 4)}${neu(76, 18, 40, 6, 0.5)}<path d="M136 19 l5 5 l5-5" class="dgm-chrome" fill="none"/>
      ${label(46, 22, "触发器", "end")}
      ${frame(70, 34, 96, 54, 4)}
      ${neu(78, 42, 60, 6, 0.4)}${neu(78, 54, 70, 6, 0.4)}
      <line x1="74" y1="64" x2="162" y2="64" class="dgm-div"/>
      ${neu(78, 72, 52, 6, 0.4)}
      ${label(176, 48, "对齐触发器边缘", "start")}
      ${label(176, 70, "分隔线区分动作组", "start")}
    `),
    fig("下面不够就往上开", pair(
      (x) => `${frame(x, 6, 104, 72, 5)}${frame(x + 16, 50, 60, 14, 3)}${badBox(x + 16, 66, 60, 24, 3)}
        ${label(x + 52, 96, "菜单被裁在容器外，选不到")}`,
      (x) => `${frame(x, 6, 104, 72, 5)}${frame(x + 16, 50, 60, 14, 3)}${okBox(x + 16, 20, 60, 26, 3)}
        ${label(x + 52, 96, "空间不够就朝上展开")}`
    )),
  ],

  "segmented": [
    fig("分段控件：几个互斥选项挤在一条里", `
      ${frame(50, 34, 160, 24, 6)}
      ${accent(52, 36, 52, 20, 0.8, 5)}${label(78, 49, "全部")}
      ${label(130, 49, "进行中")}${label(182, 49, "已完成")}
      <line x1="104" y1="38" x2="104" y2="54" class="dgm-div"/><line x1="156" y1="38" x2="156" y2="54" class="dgm-div"/>
      ${label(130, 22, "总数固定、彼此互斥、当前项永远高亮")}
      ${label(130, 76, "滑块从上一项滑到下一项，别直接闪现")}
    `),
    fig("超过四项就不该用它", pair(
      (x) => `${frame(x, 36, 104, 20, 5)}
        ${["全部", "待办", "进行", "复核", "完成", "归档"].map((t, i) => label(x + 9 + i * 17, 49, "·")).join("")}
        ${label(x + 52, 74, "六项挤成一条，字都放不下")}`,
      (x) => `${frame(x, 36, 104, 20, 5)}${accent(x + 2, 38, 24, 16, 0.8, 4)}
        ${label(x + 14, 49, "全部")}${label(x + 44, 49, "进行中")}${label(x + 82, 49, "已完成")}
        ${label(x + 52, 74, "两到四项，或者改用标签页")}`
    )),
  ],

  "tabs": [
    fig("标签页由标签行和面板组成", `
      ${frame(20, 14, 220, 76, 5)}
      ${label(44, 27, "概览")}${label(88, 27, "明细")}${label(132, 27, "设置")}
      <rect x="30" y="32" width="28" height="2.4" rx="1.2" class="dgm-accent-fill"/>
      <line x1="20" y1="34" x2="240" y2="34" class="dgm-div"/>
      ${lines(32, 46, 196, 3, 10, 5, 0.25)}
      ${label(200, 84, "面板换内容，页面不跳走", "middle")}
    `),
    fig("标签太多怎么办", pair(
      (x) => `${frame(x, 26, 104, 40, 4)}${Array.from({ length: 7 }, (_, i) => neu(x + 4 + i * 14, 32, 11, 6, 0.4)).join("")}
        ${label(x + 52, 78, "挤成两行，第二行像是另一组")}
        ${Array.from({ length: 4 }, (_, i) => neu(x + 4 + i * 14, 44, 11, 6, 0.4)).join("")}`,
      (x) => `${frame(x, 26, 104, 40, 4)}${Array.from({ length: 6 }, (_, i) => neu(x + 4 + i * 17, 34, 14, 6, 0.4)).join("")}
        <rect x="${x + 4}" y="48" width="40" height="2" rx="1" class="dgm-accent-fill"/><rect x="${x + 4}" y="48" width="96" height="2" rx="1" class="dgm-chrome-fill" opacity=".2"/>
        ${label(x + 52, 78, "保持一行，可横向滚 + 边缘渐隐")}`
    )),
  ],

  "stepper": [
    fig("步骤条要交代三件事", `
      <line x1="34" y1="40" x2="226" y2="40" class="dgm-div"/>
      <circle cx="34" cy="40" r="7" class="dgm-ok"/><path d="M31 40 l2.4 2.6 l5-5.6" class="dgm-arrow-ok" style="marker-end:none"/>
      ${label(34, 62, "已完成")}
      <circle cx="130" cy="40" r="8" class="dgm-accent-fill"/>${label(130, 62, "当前在第几步")}
      <circle cx="226" cy="40" r="7" fill="none" class="dgm-chrome"/>${label(226, 62, "还剩几步")}
      ${label(130, 88, "总步数一开始就要露出来，别边走边加")}
    `),
    fig("能不能回头改，得说清楚", pair(
      (x) => `${frame(x, 24, 104, 40, 4)}<circle cx="${x + 20}" cy="44" r="6" class="dgm-ok"/><circle cx="${x + 52}" cy="44" r="6" class="dgm-accent-fill"/><circle cx="${x + 84}" cy="44" r="6" fill="none" class="dgm-chrome"/>
        ${label(x + 52, 80, "走过的步骤点不回去，只能重来")}`,
      (x) => `${frame(x, 24, 104, 40, 4)}<circle cx="${x + 20}" cy="44" r="6" class="dgm-ok"/><circle cx="${x + 52}" cy="44" r="6" class="dgm-accent-fill"/><circle cx="${x + 84}" cy="44" r="6" fill="none" class="dgm-chrome"/>
        ${curveArrow("M" + (x + 46) + " 34 Q" + (x + 33) + " 24 " + (x + 22) + " 34")}
        ${label(x + 52, 80, "已完成的步骤可点回去，数据留着")}`
    )),
  ],
};

/* ------------------------------------------------------------ Web · 导航 / 布局 / 性能 / 无障碍 */

const WEB_REST = {

  "breadcrumb": [
    fig("面包屑说明你在树的哪一层", `
      ${label(24, 34, "首页", "start")}<path d="M52 30 l4 4 l-4 4" class="dgm-chrome" fill="none"/>
      ${label(66, 34, "订单", "start")}<path d="M94 30 l4 4 l-4 4" class="dgm-chrome" fill="none"/>
      ${label(108, 34, "2024", "start")}<path d="M140 30 l4 4 l-4 4" class="dgm-chrome" fill="none"/>
      <text x="152" y="34" class="dgm-label" style="fill:var(--fg)">详情</text>
      ${label(24, 54, "可点", "start")}${label(160, 54, "当前页不可点", "start")}
      ${label(130, 82, "它描述的是层级位置，不是你走过的路径")}
    `),
    fig("和返回按钮不是一回事", `
      ${frame(14, 20, 100, 50, 5)}${curveArrow("M92 45 L38 45")}${label(64, 84, "返回：回到上一个页面")}
      ${frame(146, 20, 100, 50, 5)}
      ${label(160, 40, "A", "start")}<path d="M170 36 l3 4 l-3 4" class="dgm-chrome" fill="none"/>${label(182, 40, "B", "start")}<path d="M192 36 l3 4 l-3 4" class="dgm-chrome" fill="none"/>${label(206, 40, "C", "start")}
      ${label(196, 84, "面包屑：跳回任意上层")}
    `),
  ],

  "pagination": [
    fig("页码条的组成", `
      ${frame(28, 34, 204, 24, 5)}
      ${label(44, 50, "‹")}
      ${accent(56, 38, 18, 16, 0.85, 3)}${label(65, 50, "1")}
      ${label(88, 50, "2")}${label(110, 50, "3")}${label(132, 50, "…")}
      ${label(158, 50, "24")}${label(186, 50, "›")}
      ${label(214, 50, "共 480 条")}
      ${label(130, 76, "当前页高亮 · 总量可见 · 能直接跳到最后一页")}
    `),
    fig("什么时候该分页，什么时候该无限滚", `
      ${label(64, 18, "分页")}${frame(14, 24, 100, 44, 4)}${lines(24, 32, 80, 3, 8, 4, 0.28)}${neu(38, 58, 52, 6, 0.5, 3)}
      ${label(64, 84, "要能回到「第 3 页」· 要能记住位置")}
      ${label(196, 18, "无限滚")}${frame(146, 24, 100, 44, 4)}${lines(156, 32, 80, 4, 8, 4, 0.28)}
      ${label(196, 84, "只是往下逛，不需要定位")}
    `),
  ],

  "infinite-scroll": [
    fig("滚到底就自动接上", steps([
      { inner: (x, w) => `${frame(x, 12, w, 66, 4)}${lines(x + 5, 18, w - 10, 6, 10, 6, 0.25)}`, cap: "滚近底部" },
      { inner: (x, w) => `${frame(x, 12, w, 66, 4)}${lines(x + 5, 18, w - 10, 5, 10, 6, 0.25)}<circle cx="${x + w / 2}" cy="70" r="4" fill="none" class="dgm-accent-stroke"/>`, cap: "自动请求下一页" },
      { inner: (x, w) => `${frame(x, 12, w, 66, 4)}${lines(x + 5, 18, w - 10, 4, 10, 6, 0.25)}${okBox(x + 5, 58, w - 10, 16)}`, cap: "接在后面继续" },
    ])),
    fig("页脚会永远够不着", pair(
      (x) => `${frame(x, 14, 104, 62, 4)}${lines(x + 6, 20, 92, 5, 10, 6, 0.25)}${badBox(x + 6, 66, 92, 8)}
        ${label(x + 52, 92, "页脚被不断推走，联系方式永远看不到")}`,
      (x) => `${frame(x, 14, 104, 62, 4)}${lines(x + 6, 20, 92, 4, 10, 6, 0.25)}${accent(x + 30, 58, 44, 9, 0.6, 4)}${label(x + 52, 65, "加载更多")}
        ${label(x + 52, 92, "改成按钮触发，或把页脚固定在侧边")}`
    )),
  ],

  "virtual-list": [
    fig("只渲染看得见的那几行", `
      ${label(50, 14, "真实数据 1 万条")}
      ${frame(24, 20, 52, 70, 3)}${Array.from({ length: 14 }, (_, i) => neu(28, 23 + i * 5, 44, 3, 0.25, 1)).join("")}
      ${arrow(84, 54, 118, 54)}
      ${label(180, 14, "DOM 里只有十几个节点")}
      ${frame(126, 20, 120, 70, 3)}
      <rect x="126" y="34" width="120" height="42" class="dgm-ok"/>
      ${Array.from({ length: 5 }, (_, i) => neu(134, 37 + i * 8, 100, 5, 0.35, 1)).join("")}
      ${label(186, 30, "视口上下各留一屏缓冲")}
    `),
    fig("代价：这些都得自己接回来", `
      ${label(66, 24, "浏览器搜索 Ctrl+F 找不到", "start")}${mark(28, 24, false)}
      ${label(66, 46, "锚点跳转 / 滚动位置要自己存", "start")}${mark(28, 46, false)}
      ${label(66, 68, "行高不固定时要先测量", "start")}${mark(28, 68, false)}
      ${label(130, 90, "列表不到几百条，先别上虚拟列表")}
    `),
  ],

  "truncate": [
    fig("硬裁 vs 省略号", pair(
      (x) => `${frame(x + 4, 40, 76, 20)}${mono(x + 8, 53, "the quick brow")}
        <rect x="${x + 78}" y="40" width="2" height="20" class="dgm-bad"/>
        ${label(x + 42, 76, "硬裁，最后一个字断在半截")}`,
      (x) => `${frame(x + 4, 40, 76, 20)}${mono(x + 8, 53, "the quick…")}
        ${label(x + 42, 76, "line-clamp 收在词边界")}`
    )),
    fig("一行还是多行", `
      ${frame(14, 22, 100, 20, 3)}${mono(20, 35, "单行标题在这里…")}
      ${label(64, 54, "1 行：标题 / 表格单元格")}
      ${frame(146, 18, 100, 34, 3)}${mono(152, 30, "两行摘要，第一行完整")}${mono(152, 44, "第二行收在这里…")}
      ${label(196, 64, "2–3 行：摘要 / 卡片描述")}
      ${label(130, 88, "被截掉的全文要能拿到：title 属性、点开、或悬停展开")}
    `),
  ],

  "sticky": [
    fig("滚过之后贴在顶部", `
      ${frame(20, 8, 60, 84)}
      ${neu(24, 12, 52, 10, 0.4)}${neu(24, 26, 52, 60, 0.15)}
      ${label(50, 97, "原位置")}
      ${arrow(96, 50, 134, 50)}${label(115, 42, "滚动经过")}
      ${frame(150, 8, 90, 84)}
      ${accent(150, 8, 90, 10, 1, 0)}
      ${label(195, 97, "贴顶后固定在这")}
    `),
    fig("两个粘性头会互相顶替", steps([
      { inner: (x, w) => `${frame(x, 12, w, 66, 3)}${accent(x, 12, w, 9, 0.8, 0)}${label(x + w / 2, 19, "A")}${lines(x + 4, 28, w - 8, 4, 9, 4, 0.25)}${neu(x, 66, w, 9, 0.5)}`, cap: "A 组吸顶" },
      { inner: (x, w) => `${frame(x, 12, w, 66, 3)}${accent(x, 12, w, 9, 0.8, 0)}${label(x + w / 2, 19, "A")}${neu(x, 22, w, 9, 0.5)}${label(x + w / 2, 29, "B")}`, cap: "B 组顶上来" },
      { inner: (x, w) => `${frame(x, 12, w, 66, 3)}${accent(x, 12, w, 9, 0.8, 0)}${label(x + w / 2, 19, "B")}${lines(x + 4, 28, w - 8, 4, 9, 4, 0.25)}`, cap: "B 接替，A 让位" },
    ])),
  ],

  "responsive-breakpoint": [
    fig("同一份内容在三种宽度下的列数", `
      ${frame(4, 20, 40, 60)}${neu(10, 28, 28, 8, 0.5)}${neu(10, 40, 28, 8, 0.5)}${label(24, 96, "一栏")}
      ${frame(76, 20, 88, 60)}${neu(82, 28, 36, 16, 0.5)}${neu(122, 28, 36, 16, 0.5)}${label(120, 96, "两栏")}
      ${frame(196, 20, 60, 60)}${neu(200, 28, 16, 16, 0.5)}${neu(220, 28, 16, 16, 0.5)}${neu(240, 28, 12, 16, 0.5)}${label(226, 96, "三栏")}
    `),
    fig("断点是内容排不下的地方，不是设备型号", pair(
      (x) => `${label(x + 52, 26, "iPhone / iPad / 笔记本")}
        ${badBox(x + 6, 34, 28, 20, 3)}${badBox(x + 40, 34, 28, 20, 3)}${badBox(x + 74, 34, 24, 20, 3)}
        ${label(x + 52, 76, "按机型定，明年出新尺寸就崩")}`,
      (x) => `<line x1="${x + 4}" y1="44" x2="${x + 100}" y2="44" class="dgm-div"/>
        ${["1 栏", "2 栏", "3 栏"].map((t, i) => label(x + 20 + i * 34, 38, t)).join("")}
        ${["|", "|"].map((t, i) => `<rect x="${x + 36 + i * 34}" y="40" width="1.6" height="9" class="dgm-accent-fill"/>`).join("")}
        ${label(x + 52, 66, "换行 / 溢出的那一刻才是断点")}
        ${label(x + 52, 84, "先写窄屏，再往宽了加")}`
    )),
  ],

  "grid-layout": [
    fig("等宽列 + 一格横跨两列", `
      ${accent(20, 16, 220, 26, 0.35, 3)}${label(130, 33, "跨两列")}
      ${frame(20, 50, 70, 34)}${frame(98, 50, 70, 34)}${frame(176, 50, 64, 34)}
    `),
    fig("列宽 / 间距 / 外边距分别是什么", `
      ${frame(10, 24, 240, 44, 3)}
      ${accent(24, 30, 46, 32, 0.35, 2)}${accent(84, 30, 46, 32, 0.35, 2)}${accent(144, 30, 46, 32, 0.35, 2)}${accent(204, 30, 32, 32, 0.35, 2)}
      <path d="M70 71 L70 77 M70 74 L84 74 M84 71 L84 77" class="dgm-accent-line"/>
      ${label(77, 88, "间距")}
      ${label(47, 88, "列")}
      <path d="M10 15 L10 21 M10 18 L24 18 M24 15 L24 21" class="dgm-accent-line"/>
      ${label(30, 20, "外边距", "start")}
      ${label(200, 88, "对齐靠的是这三个数，不是每块自己调")}
    `),
  ],

  "aspect-ratio": [
    fig("提前占位 vs 加载完才撑开", pair(
      (x) => `${neu(x + 4, 30, 76, 4, 0.5)}<rect x="${x + 4}" y="70" width="76" height="4" class="dgm-bad"/>
        <path d="M${x + 42} 66 L${x + 42} 46" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
        ${label(x + 42, 90, "图加载完，下面内容跳一下")}`,
      (x) => `${neu(x + 4, 30, 76, 4, 0.5)}${okBox(x + 4, 38, 76, 30)}${neu(x + 4, 72, 76, 4, 0.5)}
        ${label(x + 42, 90, "空间提前占好，位置不挪")}`
    )),
    fig("常用比例", `
      ${frame(14, 30, 64, 36, 3)}${label(46, 78, "16 : 9 · 视频 / 封面")}
      ${frame(102, 24, 48, 48, 3)}${label(126, 78, "1 : 1 · 头像 / 网格")}
      ${frame(178, 26, 60, 44, 3)}${label(208, 78, "4 : 3 · 图文卡片")}
      ${label(130, 14, "写比例而不是写死高度，宽度一变高度自己跟")}
    `),
  ],

  "z-index-layer": [
    fig("三张卡片的前后关系", `
      ${frame(30, 46, 90, 40, 6)}${label(48, 80, "z:1")}
      <rect x="70" y="30" width="90" height="40" rx="6" fill="var(--panel)"/>${frame(70, 30, 90, 40, 6)}${label(88, 64, "z:2")}
      ${accent(110, 14, 90, 40, 0.5, 6)}${label(155, 38, "z:3 · 弹窗在最上层")}
    `),
    fig("先定一张层级表，别现场写数字", `
      ${label(60, 22, "内容", "start")}${neu(110, 16, 130, 8, 0.35, 3)}${label(30, 22, "0", "start")}
      ${label(60, 40, "吸顶 / 吸底", "start")}${neu(110, 34, 130, 8, 0.5, 3)}${label(30, 40, "10", "start")}
      ${label(60, 58, "下拉 / 气泡", "start")}${accent(110, 52, 130, 8, 0.5, 3)}${label(30, 58, "100", "start")}
      ${label(60, 76, "弹层 / toast", "start")}${accent(110, 70, 130, 8, 0.9, 3)}${label(30, 76, "1000", "start")}
      ${label(130, 94, "z-index:9999 出现的那天，说明这张表没人维护")}
    `),
  ],

  "debounce-throttle": [
    fig("同一串事件，三种处理方式", `
      ${eventRow(24, "原始事件", [0.02, 0.06, 0.1, 0.14, 0.18, 0.22, 0.5, 0.54, 0.58, 0.62, 0.86, 0.9], "dgm-chrome-fill")}
      ${eventRow(54, "防抖 debounce", [0.34, 0.74, 0.99], "dgm-marker-ok")}
      ${eventRow(84, "节流 throttle", [0.02, 0.22, 0.5, 0.7, 0.86], "dgm-accent-fill")}
      ${label(200, 12, "防抖：安静下来才做一次")}
    `),
    fig("各自适合什么场合", `
      ${label(64, 20, "防抖")}${mark(20, 20, true)}
      ${frame(30, 28, 84, 30, 4)}${label(72, 46, "搜索建议 / 表单校验")}
      ${label(64, 74, "只关心「最后一次」的结果")}
      ${label(196, 20, "节流")}${mark(152, 20, true)}
      ${frame(162, 28, 84, 30, 4)}${label(204, 46, "滚动 / 拖拽 / 窗口缩放")}
      ${label(196, 74, "过程中要一直有反馈，但别每帧都算")}
    `),
  ],

  "lazy-load": [
    fig("进了视口才真的去下载", `
      ${frame(70, 8, 120, 50, 5)}${label(62, 16, "视口", "end")}
      ${accent(78, 16, 104, 34, 0.5, 3)}${label(130, 36, "已加载")}
      <line x1="20" y1="60" x2="240" y2="60" class="dgm-dash"/>
      ${neu(78, 66, 104, 20, 0.12, 3)}${label(130, 78, "还在下面：只占位，不发请求")}
      ${label(24, 66, "视口下沿", "start")}
    `),
    fig("首屏的图不能懒加载", pair(
      (x) => `${frame(x, 16, 104, 62, 5)}${neu(x + 6, 22, 92, 30, 0.1, 3)}${lines(x + 6, 58, 92, 2, 8, 4, 0.3)}
        ${label(x + 52, 92, "首屏主图也懒加载，打开先看到空框")}`,
      (x) => `${frame(x, 16, 104, 62, 5)}${accent(x + 6, 22, 92, 30, 0.5, 3)}${lines(x + 6, 58, 92, 2, 8, 4, 0.3)}
        ${label(x + 52, 92, "首屏直接加载，下面的才延后")}`
    )),
  ],

  "contrast-ratio": [
    fig("同样的字，两种可读性", `
      ${neu(14, 22, 100, 46, 0.12, 4)}<text x="64" y="48" text-anchor="middle" class="dgm-label" style="opacity:.35">正文文字</text>
      ${label(64, 84, "2.1 : 1 · 阳光下基本看不见")}${mark(64, 14, false)}
      ${neu(146, 22, 100, 46, 0.12, 4)}<text x="196" y="48" text-anchor="middle" class="dgm-label" style="fill:var(--fg);opacity:1">正文文字</text>
      ${label(196, 84, "7 : 1 · 稳稳能读")}${mark(196, 14, true)}
    `),
    fig("三条线要记住", `
      ${label(60, 24, "正文 ≥ 4.5 : 1", "start")}${okBox(150, 18, 96, 8, 4)}
      ${label(60, 48, "大字 / 粗体 ≥ 3 : 1", "start")}${okBox(150, 42, 70, 8, 4)}
      ${label(60, 72, "图标 / 边框 ≥ 3 : 1", "start")}${okBox(150, 66, 70, 8, 4)}
      ${label(130, 94, "占位符文字、禁用态也算，别靠「淡一点更高级」蒙混")}
    `),
  ],

  "form-validation": [
    fig("什么时候报错", `
      ${eventRow(26, "边打字边报错", [0.06, 0.12, 0.18, 0.24], "dgm-marker-bad")}${label(210, 14, "还没写完就被骂")}
      ${eventRow(58, "失焦时校验", [0.42], "dgm-marker-ok")}${label(210, 46, "刚刚好")}
      ${eventRow(90, "提交才校验", [0.94], "dgm-marker-bad")}${label(210, 78, "一次性甩出五条错")}
    `),
    fig("错误要贴着出错的那一格", pair(
      (x) => `${badBox(x + 4, 20, 96, 12, 3)}${label(x + 52, 28, "有 3 个字段填写有误")}
        ${frame(x + 4, 40, 96, 12, 3)}${frame(x + 4, 56, 96, 12, 3)}${frame(x + 4, 72, 96, 12, 3)}
        ${label(x + 52, 96, "顶部一句总结，用户得自己找是哪几个")}`,
      (x) => `${frame(x + 4, 24, 96, 12, 3)}
        <rect x="${x + 4}" y="44" width="96" height="12" rx="3" fill="none" stroke="var(--bad)" stroke-width="1.4"/>
        ${lines(x + 4, 60, 60, 1, 0, 3, 0.6)}${label(x + 52, 70, "手机号少一位")}
        ${frame(x + 4, 76, 96, 12, 3)}
        ${label(x + 52, 96, "错在哪就在哪说，并把焦点送过去")}`
    )),
  ],

  "inline-message": [
    fig("字段下面那一行小字有三种", `
      ${frame(30, 16, 200, 14, 3)}${lines(34, 36, 90, 1, 0, 3, 0.4)}${label(130, 42, "提示：还没出错，先说清规则")}
      ${frame(30, 48, 200, 14, 3)}
      <rect x="30" y="48" width="200" height="14" rx="3" fill="none" stroke="var(--bad)" stroke-width="1.2"/>
      <text x="34" y="76" class="dgm-label dgm-bad-text">错误：具体哪里不对、怎么改</text>
      <text x="34" y="92" class="dgm-label dgm-ok-text">成功：确认这一格已经过了</text>
    `),
    fig("内联提示不该抖动布局", pair(
      (x) => `${frame(x + 4, 30, 96, 14, 3)}${frame(x + 4, 50, 96, 14, 3)}
        <path d="M${x + 52} 68 L${x + 52} 78" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
        ${label(x + 52, 92, "报错插进来，下面全体往下跳")}`,
      (x) => `${frame(x + 4, 26, 96, 14, 3)}<rect x="${x + 4}" y="42" width="96" height="9" fill="none" class="dgm-dash"/>
        ${frame(x + 4, 56, 96, 14, 3)}
        ${label(x + 52, 92, "一开始就留出一行的位置")}`
    )),
  ],

  "search": [
    fig("搜索区通常有四块", `
      ${frame(20, 14, 160, 16, 8)}<circle cx="32" cy="22" r="3.4" fill="none" class="dgm-chrome"/>${label(56, 25, "输入框", "start")}
      <text x="170" y="26" class="dgm-mono">×</text>${label(200, 25, "一键清空", "start")}
      ${accent(20, 38, 34, 12, 0.35, 6)}${accent(58, 38, 40, 12, 0.35, 6)}${neu(102, 38, 34, 12, 0.25, 6)}${label(160, 47, "已选筛选条件可见可删", "start")}
      ${label(20, 66, "找到 128 条", "start")}${label(120, 66, "结果计数：让人知道筛窄了没有", "start")}
      ${lines(20, 76, 220, 2, 8, 4, 0.22)}
    `),
    fig("搜不到时别只说「无结果」", pair(
      (x) => `${frame(x, 20, 104, 56, 5)}${label(x + 52, 50, "无结果")}
        ${label(x + 52, 92, "死路一条")}`,
      (x) => `${frame(x, 20, 104, 56, 5)}${label(x + 52, 36, "没找到「订单号 123」")}
        ${accent(x + 12, 46, 36, 10, 0.35, 5)}${accent(x + 54, 46, 36, 10, 0.35, 5)}
        ${label(x + 52, 68, "换个词 / 清除筛选")}
        ${label(x + 52, 92, "给出下一步，别让人退回去重来")}`
    )),
  ],

  "chip": [
    fig("标签块的两种用法", `
      ${label(64, 18, "只读标签")}
      ${neu(20, 26, 32, 13, 0.28, 6)}${neu(56, 26, 40, 13, 0.28, 6)}
      ${label(64, 52, "描述属性，点不了")}
      ${label(196, 18, "可选 / 可删")}
      ${accent(152, 26, 36, 13, 0.4, 6)}<text x="184" y="35" class="dgm-mono">×</text>
      ${neu(196, 26, 40, 13, 0.22, 6)}
      ${label(196, 52, "选中态明显 · 带 × 能摘掉")}
      ${label(130, 82, "混在一起用，用户会去点那些点不动的")}
    `),
    fig("一行放不下怎么办", pair(
      (x) => `${frame(x, 30, 104, 20, 4)}${Array.from({ length: 5 }, (_, i) => neu(x + 4 + i * 24, 34, 20, 12, 0.3, 6)).join("")}
        ${label(x + 52, 70, "强行一行，右边的直接被裁掉")}`,
      (x) => `${Array.from({ length: 3 }, (_, i) => neu(x + 4 + i * 34, 26, 30, 12, 0.3, 6)).join("")}
        ${Array.from({ length: 2 }, (_, i) => neu(x + 4 + i * 34, 44, 30, 12, 0.3, 6)).join("")}
        ${accent(x + 72, 44, 26, 12, 0.35, 6)}${label(x + 85, 53, "+6")}
        ${label(x + 52, 76, "换行 + 折叠计数，或整行可横滚")}`
    )),
  ],

  "badge": [
    fig("角标的两种形态", `
      ${frame(40, 28, 30, 30, 6)}<circle cx="72" cy="28" r="4" class="dgm-marker-bad"/>
      ${label(55, 74, "圆点：有新的，但不说几条")}
      ${frame(150, 28, 30, 30, 6)}<rect x="172" y="20" width="20" height="13" rx="6.5" class="dgm-marker-bad"/><text x="182" y="29" text-anchor="middle" class="dgm-label" style="fill:var(--bg)">12</text>
      ${label(175, 74, "计数：数字要有上限，如 99+")}
    `),
    fig("角标位置和可读性", pair(
      (x) => `${frame(x + 30, 30, 30, 30, 6)}<rect x="${x + 46}" y="26" width="26" height="12" rx="6" class="dgm-marker-bad"/><text x="${x + 59}" y="35" text-anchor="middle" class="dgm-label" style="fill:var(--bg)">1284</text>
        ${label(x + 50, 78, "数字太长，盖住图标本身")}`,
      (x) => `${frame(x + 30, 30, 30, 30, 6)}<rect x="${x + 52}" y="24" width="20" height="12" rx="6" class="dgm-marker-bad"/><text x="${x + 62}" y="33" text-anchor="middle" class="dgm-label" style="fill:var(--bg)">99+</text>
        ${label(x + 50, 78, "封顶显示，永远只占那么大")}`
    )),
  ],

  "progress": [
    fig("知道进度和不知道进度", `
      ${label(64, 20, "确定进度")}
      ${neu(20, 28, 88, 8, 0.2, 4)}${accent(20, 28, 56, 8, 0.9, 4)}${label(64, 50, "63% · 能预估还要多久")}
      ${label(196, 20, "不确定进度")}
      ${neu(152, 28, 88, 8, 0.2, 4)}${accent(178, 28, 26, 8, 0.9, 4)}${label(196, 50, "只表示还在跑")}
      ${label(130, 78, "能算出百分比就别用转圈；算不出就别假装有进度条")}
    `),
    fig("长流程要分段说人话", `
      ${neu(20, 34, 220, 10, 0.18, 5)}
      ${accent(20, 34, 88, 10, 0.9, 5)}
      <line x1="108" y1="30" x2="108" y2="48" class="dgm-div"/><line x1="174" y1="30" x2="174" y2="48" class="dgm-div"/>
      ${label(64, 60, "① 上传中")}${label(141, 60, "② 转码")}${label(207, 60, "③ 发布")}
      ${label(130, 84, "写清楚当前在哪一段，比一根跑不完的条有用得多")}
    `),
  ],

  "master-detail": [
    fig("窄列表 + 宽详情", `
      ${frame(16, 10, 72, 80)}${accent(22, 18, 60, 10, 0.5, 2)}${neu(22, 34, 60, 8, 0.35)}${neu(22, 46, 60, 8, 0.35)}
      ${label(52, 96, "列表：窄")}
      ${frame(96, 10, 150, 80)}${neu(106, 20, 90, 12, 0.5)}${neu(106, 40, 130, 34, 0.15)}
      ${label(171, 96, "详情：宽")}
    `),
    fig("窄屏时退化成两级页面", steps([
      { inner: (x, w) => `${frame(x, 14, w, 64, 4)}${accent(x + 5, 20, w - 10, 9, 0.5, 2)}${neu(x + 5, 33, w - 10, 7, 0.3)}${neu(x + 5, 44, w - 10, 7, 0.3)}`, cap: "只显示列表" },
      { inner: (x, w) => `${frame(x, 14, w, 64, 4)}${neu(x + 5, 20, w * 0.5, 8, 0.4)}${okBox(x + 5, 34, w - 10, 36)}`, cap: "点一条，整页换成详情" },
      { inner: (x, w) => `${frame(x, 14, w, 64, 4)}<path d="M${x + 16} 24 l-6 5 l6 5" class="dgm-chrome" fill="none"/>${okBox(x + 5, 38, w - 10, 32)}`, cap: "靠返回回到列表" },
    ])),
  ],

  "hero-module": [
    fig("一块最大，其余贴着它排", `
      ${browser(40, 6, 180, 86)}
      ${accent(48, 24, 104, 44, 0.85, 3)}${label(100, 49, "主模块")}
      ${neu(156, 24, 56, 20, 0.4)}${neu(156, 48, 56, 20, 0.4)}
      ${neu(48, 72, 50, 14, 0.3)}${neu(102, 72, 50, 14, 0.3)}${neu(156, 72, 56, 14, 0.3)}
    `),
    fig("主角只能有一个", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${badBox(x + 6, 26, 44, 22)}${badBox(x + 54, 26, 44, 22)}${badBox(x + 6, 52, 92, 22)}
        ${label(x + 52, 94, "三块都放大，等于没主角")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${okBox(x + 6, 26, 62, 34)}${neu(x + 72, 26, 26, 15, 0.4)}${neu(x + 72, 45, 26, 15, 0.4)}
        ${neu(x + 6, 64, 28, 10, 0.3)}${neu(x + 38, 64, 30, 10, 0.3)}${neu(x + 72, 64, 26, 10, 0.3)}
        ${label(x + 52, 94, "其余至少小一半")}`
    )),
  ],

  "stacked-bands": [
    fig("从上到下三条，每条横贯全宽", `
      ${browser(40, 6, 180, 86)}
      ${accent(48, 22, 164, 14, 0.8, 2)}${label(130, 32, "概览")}
      ${neu(48, 42, 164, 22, 0.4)}${label(130, 56, "趋势")}
      ${neu(48, 70, 164, 16, 0.25)}${label(130, 81, "明细")}
    `),
    fig("一条横带只放一类内容", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${badBox(x + 6, 26, 28, 12)}${badBox(x + 38, 26, 60, 20)}
        ${badBox(x + 6, 42, 28, 32)}${badBox(x + 38, 50, 26, 24)}${badBox(x + 68, 50, 30, 14)}
        ${label(x + 52, 94, "带里又切碎，变回散块")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${okBox(x + 6, 26, 92, 10)}${okBox(x + 6, 42, 92, 16)}${okBox(x + 6, 64, 92, 10)}
        ${label(x + 52, 94, "条间距比条内大一档")}`
    )),
  ],

  "full-bleed-canvas": [
    fig("大图铺满当底，面板浮在四角", `
      ${browser(40, 6, 180, 86)}
      ${neu(41, 18, 178, 73, 0.18, 0)}${label(130, 58, "画布")}
      ${accent(48, 24, 46, 20, 0.85, 3)}${accent(166, 24, 46, 26, 0.85, 3)}
      ${accent(48, 66, 60, 20, 0.85, 3)}${accent(152, 66, 60, 20, 0.85, 3)}
    `),
    fig("面板别把图盖没了", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}${neu(x + 1, 21, 102, 58, 0.15, 3)}
        ${badBox(x + 5, 25, 46, 24)}${badBox(x + 54, 25, 45, 24)}${badBox(x + 5, 52, 94, 23)}
        ${label(x + 52, 94, "面板盖掉一大半")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}${neu(x + 1, 21, 102, 58, 0.15, 3)}
        ${okBox(x + 5, 25, 26, 14)}${okBox(x + 73, 25, 26, 14)}${okBox(x + 5, 61, 32, 14)}${okBox(x + 67, 61, 32, 14)}
        ${label(x + 52, 94, "中间留给图")}`
    )),
  ],

  "kanban-columns": [
    fig("按状态分列，列头写名称和数量", `
      ${browser(40, 6, 180, 86)}
      ${[0, 1, 2, 3].map((i) => `${accent(48 + i * 42, 22, 38, 8, 0.8, 2)}${neu(48 + i * 42, 34, 38, 14, 0.4)}${neu(48 + i * 42, 52, 38, 14, 0.4)}${i % 2 ? "" : neu(48 + i * 42, 70, 38, 14, 0.4)}`).join("")}
    `),
    fig("列宽固定，列多了横着滚", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${badBox(x + 5, 26, 52, 48)}${badBox(x + 60, 26, 18, 48)}${badBox(x + 81, 26, 18, 48)}
        ${label(x + 52, 94, "一列字多，把别的挤窄")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${okBox(x + 5, 26, 28, 48)}${okBox(x + 37, 26, 28, 48)}${okBox(x + 69, 26, 28, 48)}
        ${arrow(x + 74, 86, x + 98, 86)}${label(x + 40, 94, "等宽，整体横向滚")}`
    )),
  ],

  "timeline-swimlanes": [
    fig("顶上时间刻度，一行一条泳道", `
      ${browser(30, 6, 200, 86)}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${72 + i * 26}" y="20" width="1" height="5" class="dgm-chrome-fill"/>`).join("")}
      ${[0, 1, 2].map((i) => `${neu(38, 32 + i * 19, 24, 10, 0.4)}<line x1="66" y1="${45 + i * 19}" x2="224" y2="${45 + i * 19}" class="dgm-div"/>`).join("")}
      ${accent(76, 32, 50, 10, 0.85, 3)}${accent(150, 32, 40, 10, 0.5, 3)}
      ${accent(100, 51, 70, 10, 0.85, 3)}${accent(70, 70, 34, 10, 0.5, 3)}${accent(176, 70, 44, 10, 0.85, 3)}
      <rect x="146" y="20" width="1.6" height="68" class="dgm-accent-fill"/>${label(147, 16, "现在")}
    `),
    fig("时间重叠就分行错开", pair(
      (x) => `${frame(x, 24, 104, 40, 4)}
        ${badBox(x + 10, 36, 54, 14)}${badBox(x + 44, 36, 50, 14)}
        ${label(x + 52, 82, "画在同一行，互相盖住")}`,
      (x) => `${frame(x, 24, 104, 40, 4)}
        ${okBox(x + 10, 29, 54, 12)}${okBox(x + 44, 46, 50, 12)}
        ${label(x + 52, 82, "泳道内分两行，撞期看得见")}`
    )),
  ],

  "transparent-nav": [
    fig("菜单没有自己的底，字直接落在背景上", `
      ${browser(40, 6, 180, 86)}
      ${neu(41, 18, 178, 73, 0.16, 0)}
      ${accent(50, 23, 26, 9, 0.85, 4)}${neu(82, 26, 18, 3, 0.55, 1.5)}${neu(106, 26, 18, 3, 0.55, 1.5)}${neu(130, 26, 18, 3, 0.55, 1.5)}
      ${neu(50, 44, 70, 8, 0.45)}${neu(50, 56, 46, 4, 0.3)}
      ${neu(50, 70, 50, 16, 0.28)}${neu(105, 70, 50, 16, 0.28)}${neu(160, 70, 50, 16, 0.28)}
      ${label(63, 30, "当前")}
    `),
    fig("滚到浅色内容，菜单要补一层底", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${badBox(x + 1, 21, 102, 12, 2)}
        ${lines(x + 8, 40, 88, 4, 9)}
        ${label(x + 52, 94, "字和底一个色，看不见")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${okBox(x + 1, 21, 102, 12, 2)}${neu(x + 8, 25, 14, 4, 0.7, 2)}${neu(x + 28, 25, 14, 4, 0.5, 2)}${neu(x + 48, 25, 14, 4, 0.5, 2)}
        ${lines(x + 8, 40, 88, 4, 9)}
        ${label(x + 52, 94, "滚过首屏补底色或毛玻璃")}`
    )),
  ],

  "right-rail": [
    fig("菜单收到最右边，左边整块留给内容", `
      ${browser(40, 6, 180, 86)}
      ${neu(48, 24, 140, 62, 0.25)}${label(118, 58, "内容")}
      ${accent(196, 20, 20, 70, 0.85, 4)}
      ${[0, 1, 2, 3].map((i) => `<circle cx="206" cy="${40 + i * 12}" r="3" class="dgm-chrome-fill" opacity="${i === 1 ? 0.95 : 0.45}"/>`).join("")}
      <circle cx="206" cy="27" r="3.4" class="dgm-chrome" />
    `),
    fig("抽屉别和菜单抢同一条边", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${neu(x + 90, 22, 12, 56, 0.4, 2)}
        ${badBox(x + 50, 22, 52, 56)}
        ${label(x + 52, 94, "抽屉一开，菜单被盖住")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${okBox(x + 90, 22, 12, 56)}
        ${okBox(x + 42, 22, 44, 56)}
        ${label(x + 52, 94, "抽屉从菜单内侧出来")}`
    )),
  ],

  "expanding-tab": [
    fig("选中的那一项拉长带字，其余只留图标", `
      ${frame(40, 30, 180, 30, 15)}
      <circle cx="60" cy="45" r="7" class="dgm-chrome-fill" opacity=".4"/>
      ${accent(74, 36, 62, 18, 0.9, 9)}<circle cx="85" cy="45" r="4" class="dgm-chrome-fill" opacity=".9"/>${label(112, 47.5, "当前项")}
      <circle cx="152" cy="45" r="7" class="dgm-chrome-fill" opacity=".4"/>
      <circle cx="174" cy="45" r="7" class="dgm-chrome-fill" opacity=".4"/>
      <circle cx="196" cy="45" r="7" class="dgm-chrome-fill" opacity=".4"/>
      ${label(130, 78, "一排能放下更多入口")}
    `),
    fig("换一项，别的图标不该跟着挪", pair(
      (x) => `${frame(x, 26, 104, 18, 9)}${badBox(x + 6, 29, 40, 12, 6)}${badBox(x + 52, 29, 12, 12, 6)}${badBox(x + 70, 29, 12, 12, 6)}
        ${frame(x, 52, 104, 18, 9)}${badBox(x + 6, 55, 12, 12, 6)}${badBox(x + 24, 55, 40, 12, 6)}${badBox(x + 70, 55, 12, 12, 6)}
        ${label(x + 52, 88, "整排被推来推去")}`,
      (x) => `${frame(x, 26, 104, 18, 9)}${okBox(x + 6, 29, 40, 12, 6)}${neu(x + 52, 29, 12, 12, 0.4, 6)}${neu(x + 70, 29, 12, 12, 0.4, 6)}${neu(x + 86, 29, 12, 12, 0.4, 6)}
        ${frame(x, 52, 104, 18, 9)}${neu(x + 6, 55, 12, 12, 0.4, 6)}${okBox(x + 24, 55, 40, 12, 6)}${neu(x + 70, 55, 12, 12, 0.4, 6)}${neu(x + 86, 55, 12, 12, 0.4, 6)}
        ${label(x + 52, 88, "总宽固定，只变当前项")}`
    )),
  ],

  "page-title": [
    fig("菜单只有图标，页面名放大写在左上角", `
      ${browser(40, 6, 180, 86)}
      ${neu(44, 20, 14, 70, 0.22, 3)}
      ${[0, 1, 2, 3].map((i) => `<circle cx="51" cy="${30 + i * 13}" r="3.2" class="${i === 1 ? "dgm-accent-fill" : "dgm-chrome-fill"}" opacity="${i === 1 ? 1 : 0.45}"/>`).join("")}
      ${accent(66, 24, 64, 12, 0.85, 2)}${frame(136, 26, 30, 9, 4)}
      ${neu(66, 44, 70, 42, 0.28)}${neu(140, 44, 72, 19, 0.28)}${neu(140, 67, 72, 19, 0.28)}
      ${label(98, 33, "页面名")}${label(151, 33, "范围")}
    `),
    fig("标题和菜单项必须是同一个词", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${neu(x + 4, 24, 10, 52, 0.25, 2)}${badBox(x + 20, 26, 50, 12)}
        ${label(x + 45, 35, "数据总览")}${label(x + 52, 60, "菜单项叫「看板」")}
        ${label(x + 52, 94, "两处叫法不一样")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${neu(x + 4, 24, 10, 52, 0.25, 2)}${okBox(x + 20, 26, 50, 12)}
        ${label(x + 45, 35, "看板")}${label(x + 52, 60, "菜单项叫「看板」")}
        ${label(x + 52, 94, "同名，切换时一起换")}`
    )),
  ],

  "icon-rail": [
    fig("侧边只留一列图标，悬停才出名字", `
      ${browser(40, 6, 180, 86)}
      ${neu(44, 20, 16, 70, 0.22, 3)}
      ${[0, 1, 2].map((i) => `<circle cx="52" cy="${28 + i * 11}" r="3.2" class="${i === 1 ? "dgm-accent-fill" : "dgm-chrome-fill"}" opacity="${i === 1 ? 1 : 0.45}"/>`).join("")}
      <line x1="47" y1="57" x2="57" y2="57" class="dgm-div"/>
      ${[0, 1].map((i) => `<circle cx="52" cy="${65 + i * 11}" r="3.2" class="dgm-chrome-fill" opacity=".45"/>`).join("")}
      ${accent(64, 33, 34, 12, 0.9, 3)}${label(81, 41.5, "名称")}${cursor(55, 41)}
      ${neu(108, 24, 104, 62, 0.25)}${label(160, 58, "内容")}
    `),
    fig("键盘切过去也要出提示", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${neu(x + 6, 24, 14, 52, 0.25, 3)}${badBox(x + 8, 40, 10, 10, 5)}
        ${mono(x + 30, 48, "Tab →")}
        ${label(x + 52, 94, "只认鼠标，聚焦没提示")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${neu(x + 6, 24, 14, 52, 0.25, 3)}${okBox(x + 8, 40, 10, 10, 5)}${okBox(x + 24, 39, 34, 12)}
        ${label(x + 41, 47.5, "名称")}
        ${label(x + 52, 94, "悬停和聚焦都出名字")}`
    )),
  ],

  "quick-actions": [
    fig("常用动作排在菜单旁边，点了直接做", `
      ${browser(40, 6, 180, 86)}
      ${neu(44, 20, 16, 70, 0.22, 3)}
      ${[0, 1, 2, 3].map((i) => `<circle cx="52" cy="${30 + i * 13}" r="3.2" class="dgm-chrome-fill" opacity=".45"/>`).join("")}
      <circle cx="74" cy="32" r="7" class="dgm-accent-fill"/>
      ${[1, 2, 3].map((i) => `<circle cx="74" cy="${32 + i * 17}" r="7" class="dgm-chrome"/>`).join("")}
      ${neu(90, 24, 122, 62, 0.25)}${label(151, 58, "内容")}
    `),
    fig("只放天天用的，亮色只给一个", pair(
      (x) => `${frame(x, 20, 104, 60, 4)}
        ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${x + 12 + i * 13.4}" cy="50" r="5.4" class="dgm-bad"/>`).join("")}
        ${label(x + 52, 94, "七八个全是亮色")}`,
      (x) => `${frame(x, 20, 104, 60, 4)}
        <circle cx="${x + 22}" cy="50" r="7" class="dgm-ok"/>
        ${[1, 2, 3].map((i) => `<circle cx="${x + 22 + i * 20}" cy="50" r="7" class="dgm-chrome"/>`).join("")}
        ${label(x + 52, 94, "三到五个，一个主色")}`
    )),
  ],

  "tab-order": [
    fig("Tab 的顺序要和眼睛一致", pair(
      (x) => `${frame(x, 16, 104, 62, 4)}
        ${frame(x + 8, 24, 40, 14, 3)}<text x="${x + 28}" y="34" text-anchor="middle" class="dgm-label">3</text>
        ${frame(x + 56, 24, 40, 14, 3)}<text x="${x + 76}" y="34" text-anchor="middle" class="dgm-label">1</text>
        ${frame(x + 8, 48, 40, 14, 3)}<text x="${x + 28}" y="58" text-anchor="middle" class="dgm-label">4</text>
        ${frame(x + 56, 48, 40, 14, 3)}<text x="${x + 76}" y="58" text-anchor="middle" class="dgm-label">2</text>
        ${label(x + 52, 92, "焦点在页面上乱跳")}`,
      (x) => `${frame(x, 16, 104, 62, 4)}
        ${frame(x + 8, 24, 40, 14, 3)}<text x="${x + 28}" y="34" text-anchor="middle" class="dgm-label">1</text>
        ${frame(x + 56, 24, 40, 14, 3)}<text x="${x + 76}" y="34" text-anchor="middle" class="dgm-label">2</text>
        ${frame(x + 8, 48, 40, 14, 3)}<text x="${x + 28}" y="58" text-anchor="middle" class="dgm-label">3</text>
        ${frame(x + 56, 48, 40, 14, 3)}<text x="${x + 76}" y="58" text-anchor="middle" class="dgm-label">4</text>
        ${label(x + 52, 92, "从左到右、从上到下")}`
    )),
    fig("弹层打开时，焦点不能漏出去", `
      ${screen(20, 10, 220, 80)}<rect x="20" y="10" width="220" height="80" rx="8" class="dgm-scrim"/>
      ${frame(70, 24, 120, 52, 5)}<rect x="70" y="24" width="120" height="52" rx="5" fill="var(--panel)"/>${frame(70, 24, 120, 52, 5)}
      ${frame(80, 34, 44, 12, 3)}${frame(134, 34, 44, 12, 3)}${frame(80, 54, 44, 12, 3)}
      ${curveArrow("M124 40 L134 40")}${curveArrow("M172 46 Q150 56 124 60")}
      ${curveArrow("M80 66 Q60 80 84 40")}
      ${label(130, 96, "Tab 到最后一个就绕回第一个，Esc 关闭并把焦点还回去")}
    `),
  ],

  "a11y-label": [
    fig("只有图标的按钮要补名字", pair(
      (x) => `${frame(x + 34, 32, 26, 26, 5)}<path d="M${x + 42} 40 l10 10 M${x + 52} 40 l-10 10" class="dgm-chrome" fill="none"/>
        ${label(x + 47, 76, "读屏器只能念出「按钮」")}`,
      (x) => `${frame(x + 34, 32, 26, 26, 5)}<path d="M${x + 42} 40 l10 10 M${x + 52} 40 l-10 10" class="dgm-chrome" fill="none"/>
        ${mono(x + 6, 74, "aria-label = 关闭")}
        ${label(x + 47, 92, "补上名字，键盘和读屏都能用")}`
    )),
    fig("三种常见的漏标", `
      ${label(66, 24, "图标按钮没名字", "start")}${mark(28, 24, false)}${label(240, 24, "aria-label", "end")}
      ${label(66, 48, "输入框没有关联的 label", "start")}${mark(28, 48, false)}${label(240, 48, "for / id", "end")}
      ${label(66, 72, "状态变化不出声", "start")}${mark(28, 72, false)}${label(240, 72, "aria-live", "end")}
      ${label(130, 94, "占位符不是标签：一开始打字它就消失了")}
    `),
  ],
};

/* ------------------------------------------------------------ 小程序 */

const MP = {

  "mp-subpackage": [
    fig("主包和分包的下载顺序", `
      ${frame(10, 22, 66, 44, 4)}${okBox(14, 26, 58, 36)}${label(43, 78, "主包 · 首页要用的")}${label(43, 92, "≤ 2MB，一进来就下")}
      ${arrow(82, 44, 108, 44)}
      ${frame(114, 16, 58, 24, 3)}${label(143, 30, "分包 A")}
      ${frame(114, 48, 58, 24, 3)}${label(143, 62, "分包 B")}
      ${frame(186, 32, 58, 24, 3)}${label(215, 46, "分包 C")}
      ${label(180, 88, "进到哪个模块才下哪个包", "middle")}
    `),
    fig("全塞主包 vs 按模块拆", pair(
      (x) => `${badBox(x + 6, 24, 92, 50, 4)}${label(x + 52, 52, "全部页面 5.4MB")}
        ${label(x + 52, 90, "超 2MB 审核直接不过")}`,
      (x) => `${okBox(x + 6, 24, 40, 50, 4)}${label(x + 26, 52, "主包 1.6M")}
        ${frame(x + 52, 24, 46, 15, 3)}${frame(x + 52, 42, 46, 15, 3)}${frame(x + 52, 60, 46, 14, 3)}
        ${label(x + 52, 90, "首页秒开，其余按需下载")}`
    )),
  ],

  "mp-page-stack": [
    fig("navigateTo 会一层层叠上去", `
      ${frame(30, 62, 90, 26, 4)}${label(75, 78, "首页")}
      <rect x="56" y="42" width="90" height="26" rx="4" fill="var(--panel)"/>${frame(56, 42, 90, 26, 4)}${label(101, 58, "列表")}
      <rect x="82" y="22" width="90" height="26" rx="4" fill="var(--panel)"/>${accent(82, 22, 90, 26, 0.35, 4)}${label(127, 38, "详情 · 当前")}
      ${label(186, 34, "最多 10 层", "start")}
      ${label(186, 56, "第 11 次跳转失败", "start")}
      ${label(186, 78, "返回要点 3 次", "start")}
    `),
    fig("深流程中间要换栈", pair(
      (x) => `${Array.from({ length: 6 }, (_, i) => frame(x + 4 + i * 3, 26 + i * 8, 70, 12, 2)).join("")}
        ${label(x + 52, 92, "一路 navigateTo，返回要点到手酸")}`,
      (x) => `${frame(x + 4, 26, 76, 12, 2)}${frame(x + 8, 40, 76, 12, 2)}
        ${arrow(x + 46, 56, x + 46, 64)}
        ${okBox(x + 4, 68, 76, 12, 2)}${label(x + 42, 77, "reLaunch")}
        ${label(x + 52, 92, "关键节点重开栈，返回一步到位")}`
    )),
  ],

  "mp-lifecycle": [
    fig("两套生命周期各管各的", `
      ${frame(10, 14, 240, 34, 4)}${label(28, 32, "App", "start")}
      ${accent(52, 20, 52, 12, 0.35, 3)}${label(78, 29, "onLaunch")}
      ${neu(110, 20, 52, 12, 0.3, 3)}${label(136, 29, "onShow")}
      ${neu(168, 20, 52, 12, 0.3, 3)}${label(194, 29, "onHide")}
      ${frame(10, 56, 240, 34, 4)}${label(28, 74, "页面", "start")}
      ${accent(46, 62, 44, 12, 0.35, 3)}${label(68, 71, "onLoad")}
      ${neu(94, 62, 44, 12, 0.3, 3)}${label(116, 71, "onShow")}
      ${neu(142, 62, 44, 12, 0.3, 3)}${label(164, 71, "onHide")}
      ${neu(190, 62, 52, 12, 0.3, 3)}${label(216, 71, "onUnload")}
    `),
    fig("请求写在哪个钩子里", `
      ${eventRow(26, "写进 onShow", [0.08, 0.3, 0.52, 0.74, 0.94], "dgm-marker-bad")}
      ${label(200, 14, "每次切回来都重拉，滚动位置也丢了")}
      ${eventRow(64, "写进 onLoad", [0.08], "dgm-marker-ok")}
      ${label(200, 52, "只在首次进入拉一次")}
      ${label(130, 92, "onShow 里只做轻量刷新：未读数、状态回填")}
    `),
  ],

  "mp-custom-component": [
    fig("同一块卡片抄十份 vs 抽成组件", pair(
      (x) => `${Array.from({ length: 3 }, (_, i) => `${frame(x + 2 + i * 34, 26, 30, 30, 3)}${badBox(x + 5 + i * 34, 29, 24, 24, 2)}`).join("")}
        ${label(x + 52, 68, "每页各写一份 wxml")}
        ${label(x + 52, 88, "改一处样式要改十个文件")}`,
      (x) => `${okBox(x + 34, 22, 36, 22, 3)}${label(x + 52, 36, "组件")}
        ${arrow(x + 40, 48, x + 20, 62)}${arrow(x + 52, 48, x + 52, 62)}${arrow(x + 64, 48, x + 84, 62)}
        ${frame(x + 8, 64, 24, 18, 2)}${frame(x + 40, 64, 24, 18, 2)}${frame(x + 72, 64, 24, 18, 2)}
        ${label(x + 52, 94, "改一次，三个页面一起变")}`
    )),
    fig("组件的样式是隔离的", `
      ${frame(16, 16, 100, 64, 5)}${label(66, 12, "页面")}
      ${mono(24, 32, ".card { color:red }")}
      ${frame(24, 42, 84, 30, 4)}${label(66, 60, "组件内部")}
      <path d="M118 40 L146 40" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
      ${label(196, 34, "页面的类名传不进组件")}
      ${label(196, 56, "要传值就用 properties")}
      ${label(196, 74, "要开口子就用 externalClasses")}
    `),
  ],

  "mp-capsule": [
    fig("右上角这块是系统的", `
      ${phone(70, 4, 120, 92)}
      ${badBox(140, 12, 44, 14, 7)}${label(162, 21, "胶囊")}
      ${neu(76, 12, 56, 14, 0.3, 3)}${label(104, 21, "你的标题")}
      ${label(186, 20, "位置和大小随机型变", "start")}
      ${okBox(76, 32, 108, 56, 4)}${label(130, 62, "自定义导航栏要自己避开它")}
    `),
    fig("写死留白 vs 按接口算", pair(
      (x) => `${frame(x, 20, 104, 30, 4)}${badBox(x + 66, 24, 34, 12, 6)}${neu(x + 4, 24, 40, 12, 0.3, 3)}
        ${mono(x + 4, 62, "right: 90px")}
        ${label(x + 52, 84, "换台安卓机就要么挡住要么空一大块")}`,
      (x) => `${frame(x, 20, 104, 30, 4)}${okBox(x + 66, 24, 34, 12, 6)}${neu(x + 4, 24, 40, 12, 0.3, 3)}
        ${mono(x + 4, 58, "getMenuButton")}${mono(x + 4, 70, "BoundingClientRect()")}
        ${label(x + 52, 84, "按接口返回的实际位置算留白")}`
    )),
  ],

  "mp-share": [
    fig("转发出去的卡片长什么样", `
      ${frame(30, 12, 200, 74, 6)}
      ${accent(36, 18, 62, 62, 0.28, 4)}${label(67, 50, "imageUrl")}
      ${neu(106, 24, 116, 8, 0.5)}${label(164, 42, "title：写商品名，不是小程序名")}
      ${mono(106, 62, "path=/pages/detail?id=…")}
      ${label(164, 78, "点开直接落到这一页")}
    `),
    fig("不写 onShareAppMessage 的下场", pair(
      (x) => `${frame(x, 22, 104, 46, 5)}${neu(x + 5, 27, 36, 36, 0.2, 3)}${neu(x + 46, 32, 52, 7, 0.35)}
        ${label(x + 72, 52, "默认封面 + 小程序名")}
        ${label(x + 52, 84, "跟内容毫无关系，没人点")}`,
      (x) => `${frame(x, 22, 104, 46, 5)}${accent(x + 5, 27, 36, 36, 0.4, 3)}${neu(x + 46, 32, 52, 7, 0.7)}${lines(x + 46, 44, 52, 2, 6, 3)}
        ${label(x + 52, 84, "商品图 + 商品名 + 直达路径")}`
    )),
  ],

  "mp-login": [
    fig("识别身份走的是 code，不是授权框", `
      ${frame(8, 26, 66, 34, 4)}${label(41, 46, "小程序")}
      ${arrow(78, 36, 108, 36)}${label(93, 28, "wx.login")}
      ${frame(112, 26, 46, 34, 4)}${label(135, 46, "微信")}
      ${arrow(108, 52, 78, 52)}${label(93, 62, "临时 code")}
      ${arrow(162, 43, 194, 43)}
      ${frame(198, 26, 54, 34, 4)}${label(225, 46, "你的后端")}
      ${label(130, 88, "后端拿 code 换 openid —— 全程不需要用户点任何授权")}
    `),
    fig("识别身份 和 要头像昵称 是两件事", pair(
      (x) => `${frame(x, 20, 104, 56, 5)}<rect x="${x + 14}" y="32" width="76" height="32" rx="4" class="dgm-bad"/>
        ${label(x + 52, 48, "请授权头像昵称")}
        ${label(x + 52, 90, "一进来就弹，用户直接划走")}`,
      (x) => `${frame(x, 20, 104, 56, 5)}${lines(x + 8, 28, 88, 3, 8, 4, 0.3)}${okBox(x + 24, 56, 56, 12, 4)}${label(x + 52, 65, "需要时才请求")}
        ${label(x + 52, 90, "先静默识别，真要用到资料再问")}`
    )),
  ],

  "mp-code": [
    fig("scene 只有 32 个字符", `
      ${frame(28, 20, 56, 56, 5)}
      ${Array.from({ length: 16 }, (_, i) => neu(34 + (i % 4) * 12, 26 + Math.floor(i / 4) * 12, 9, 9, 0.45, 1)).join("")}
      <circle cx="56" cy="48" r="8" class="dgm-accent-fill" opacity=".9"/>
      ${label(56, 88, "小程序码")}
      ${arrow(90, 40, 118, 40)}${mono(122, 34, "scene=a3f")}${label(186, 50, "只放一个短 id", "start")}
      ${arrow(118, 62, 90, 62)}${label(172, 68, "拿 id 去后端查完整参数", "start")}
    `),
    fig("塞整段 JSON 一定失败", pair(
      (x) => `${frame(x, 26, 104, 34, 4)}${mono(x + 4, 40, "scene={ id:1024,")}${mono(x + 4, 52, "from:'push' }")}
        ${label(x + 52, 78, "超 32 字符，生成接口直接报错")}`,
      (x) => `${frame(x, 26, 104, 34, 4)}${mono(x + 4, 46, "scene=a3f")}
        ${label(x + 52, 78, "短 id 进码，业务数据留在后端")}`
    )),
  ],

  "mp-subscribe-msg": [
    fig("订阅是一次性的", steps([
      { inner: (x, w) => `${frame(x, 20, w, 50, 4)}${accent(x + 5, 38, w - 10, 14, 0.5, 4)}${label(x + w / 2, 47, "提醒我")}`, cap: "用户主动点按钮" },
      { inner: (x, w) => `${frame(x, 20, w, 50, 4)}<rect x="${x}" y="20" width="${w}" height="50" rx="4" class="dgm-scrim"/>${okBox(x + 5, 34, w - 10, 24, 3)}`, cap: "系统弹窗，用户同意" },
      { inner: (x, w) => `${frame(x, 20, w, 50, 4)}${okBox(x + 5, 26, w - 10, 12, 3)}${neu(x + 5, 44, w - 10, 12, 0.15, 3)}`, cap: "只能发一条，用完作废" },
    ])),
    fig("什么时候弹订阅", pair(
      (x) => `${frame(x, 20, 104, 56, 5)}<rect x="${x}" y="20" width="104" height="56" rx="5" class="dgm-scrim"/>${badBox(x + 12, 32, 80, 30, 4)}
        ${label(x + 52, 90, "一进页面自动弹，被当骚扰直接拒绝")}`,
      (x) => `${frame(x, 20, 104, 56, 5)}${lines(x + 8, 28, 88, 2, 8, 4, 0.3)}${okBox(x + 22, 52, 60, 14, 5)}${label(x + 52, 62, "开售提醒我")}
        ${label(x + 52, 90, "用户点了这个按钮，才谈得上订阅")}`
    )),
  ],

  "mp-cloud": [
    fig("云开发替你省掉哪几块", `
      ${frame(10, 22, 62, 46, 4)}${label(41, 48, "小程序端")}
      ${arrow(78, 44, 104, 44)}
      ${okBox(108, 14, 68, 22, 3)}${label(142, 28, "云函数 · 当接口")}
      ${okBox(108, 40, 68, 22, 3)}${label(142, 54, "云数据库")}
      ${okBox(108, 66, 68, 22, 3)}${label(142, 80, "云存储 · 放文件")}
      ${label(186, 40, "不用买服务器", "start")}
      ${label(186, 58, "不用配域名和证书", "start")}
    `),
    fig("它的天花板在哪", `
      ${label(66, 24, "云函数有执行时长 / 并发上限", "start")}${mark(28, 24, false)}
      ${label(66, 48, "复杂查询、事务能力弱于自建库", "start")}${mark(28, 48, false)}
      ${label(66, 72, "迁出去要重写数据访问层", "start")}${mark(28, 72, false)}
      ${label(130, 94, "适合验证期和轻业务；量起来了要提前规划迁移")}
    `),
  ],
};

/* ------------------------------------------------------------ 基础概念 */

const BASE = {

  "box-model": [
    fig("由内到外四层", `
      ${frame(50, 10, 160, 80, 4)}${label(30, 18, "margin", "start")}
      ${neu(66, 22, 128, 56, 0.12, 3)}${frame(66, 22, 128, 56, 3)}${label(102, 32, "border")}
      ${neu(80, 34, 100, 32, 0.18, 2)}${label(146, 42, "padding")}
      ${accent(96, 42, 68, 16, 0.5, 2)}${label(130, 53, "content")}
      ${label(130, 98, "width 到底从哪一层算起，由盒模型类型决定")}
    `),
    fig("content-box vs border-box", pair(
      (x) => `${mono(x + 2, 22, "width:100px")}
        ${accent(x + 4, 30, 60, 24, 0.45, 2)}${neu(x + 64, 30, 20, 24, 0.2, 2)}${frame(x + 4, 30, 96, 24, 2)}
        ${label(x + 52, 68, "实际占 100 + padding + border")}
        ${label(x + 52, 86, "= 撑破父容器")}`,
      (x) => `${mono(x + 2, 22, "box-sizing:border-box")}
        ${accent(x + 14, 30, 50, 24, 0.45, 2)}${neu(x + 4, 30, 10, 24, 0.2, 2)}${neu(x + 64, 30, 10, 24, 0.2, 2)}${frame(x + 4, 30, 70, 24, 2)}
        ${label(x + 52, 68, "100 就是最终宽度")}
        ${label(x + 52, 86, "padding 往里挤，不往外撑")}`
    )),
  ],

  "flexbox": [
    fig("两根轴决定怎么排", `
      ${frame(20, 20, 220, 50, 4)}
      ${accent(30, 30, 40, 30, 0.4, 3)}${accent(80, 30, 40, 30, 0.4, 3)}${accent(130, 30, 40, 30, 0.4, 3)}
      <path d="M20 78 L240 78" class="dgm-arrow-ok" marker-end="url(#dgm-arrow-ok)"/>
      ${label(130, 92, "主轴 · justify-content 管这个方向怎么分布")}
      <path d="M248 20 L248 70" class="dgm-arrow-ok" marker-end="url(#dgm-arrow-ok)"/>
      ${label(214, 14, "交叉轴 · align-items")}
    `),
    fig("float 拼横排 vs flex", pair(
      (x) => `${frame(x, 24, 104, 44, 4)}${neu(x + 4, 28, 30, 20, 0.35, 2)}${neu(x + 36, 28, 30, 20, 0.35, 2)}${badBox(x + 68, 28, 30, 20, 2)}
        ${neu(x + 4, 50, 30, 14, 0.35, 2)}
        ${label(x + 52, 84, "多一个就掉行，垂直居中靠魔法数字")}`,
      (x) => `${frame(x, 24, 104, 44, 4)}${okBox(x + 4, 34, 28, 24, 2)}${okBox(x + 38, 34, 28, 24, 2)}${okBox(x + 72, 34, 26, 24, 2)}
        ${label(x + 52, 84, "数量随便变，对齐和间距都归容器管")}`
    )),
  ],

  "position-types": [
    fig("四种定位各相对谁", `
      ${label(30, 20, "static", "start")}${neu(78, 14, 40, 10, 0.35, 2)}${label(210, 21, "跟着正常文档流", "middle")}
      ${label(30, 42, "relative", "start")}${frame(78, 34, 40, 12, 2)}${accent(84, 37, 40, 10, 0.5, 2)}${label(210, 43, "相对自己原来的位置挪", "middle")}
      ${label(30, 64, "absolute", "start")}${frame(78, 56, 40, 12, 2)}${accent(102, 58, 22, 10, 0.5, 2)}${label(210, 65, "相对最近的已定位祖先", "middle")}
      ${label(30, 86, "fixed", "start")}${accent(78, 80, 40, 10, 0.5, 2)}${label(210, 87, "相对屏幕，滚动也不动", "middle")}
    `),
    fig("父级忘了 relative 会怎样", pair(
      (x) => `${frame(x, 14, 104, 72, 4)}${label(x + 52, 10, "页面")}
        ${frame(x + 20, 44, 60, 34, 3)}${label(x + 50, 62, "父容器 static")}
        ${badBox(x + 2, 18, 26, 14, 2)}
        ${label(x + 52, 96, "子元素跑到页面左上角去了")}`,
      (x) => `${frame(x, 14, 104, 72, 4)}
        ${frame(x + 20, 44, 60, 34, 3)}${label(x + 50, 70, "父容器 relative")}
        ${okBox(x + 22, 46, 26, 12, 2)}
        ${label(x + 52, 96, "定位锚点是父容器，位置才可控")}`
    )),
  ],

  "event-bubbling": [
    fig("点击会一层层往外传", `
      ${frame(30, 10, 200, 80, 5)}${label(46, 22, "body", "start")}
      ${frame(52, 24, 156, 56, 4)}${label(68, 36, "遮罩", "start")}
      ${frame(76, 38, 108, 34, 3)}${label(92, 50, "弹层", "start")}
      ${accent(104, 50, 52, 16, 0.5, 3)}${label(130, 60, "按钮")}
      ${curveArrow("M158 58 L176 58")}${curveArrow("M186 48 L200 42")}${curveArrow("M210 34 L222 26")}
      ${label(130, 96, "点按钮 = 按钮 → 弹层 → 遮罩 → body 全都收到")}
    `),
    fig("弹层被自己关掉的经典原因", pair(
      (x) => `${frame(x, 18, 104, 58, 4)}<rect x="${x}" y="18" width="104" height="58" rx="4" class="dgm-scrim"/>
        ${badBox(x + 18, 32, 68, 30, 3)}${touch(x + 52, 47)}
        ${label(x + 52, 92, "点击冒泡到遮罩，弹层跟着关了")}`,
      (x) => `${frame(x, 18, 104, 58, 4)}<rect x="${x}" y="18" width="104" height="58" rx="4" class="dgm-scrim"/>
        ${okBox(x + 18, 32, 68, 30, 3)}${touch(x + 52, 47)}
        <path d="M${x + 18} 26 L${x + 86} 26" class="dgm-dash"/>
        ${label(x + 52, 92, "弹层内 stopPropagation")}`
    )),
  ],

  "cors": [
    fig("拦的是浏览器，不是服务器", `
      ${frame(8, 26, 62, 40, 4)}${label(39, 50, "你的页面")}
      ${arrow(74, 38, 116, 38)}${label(95, 30, "请求发出去了")}
      ${frame(120, 26, 62, 40, 4)}${label(151, 50, "别的域接口")}
      <path d="M116 54 L78 54" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>
      ${label(97, 66, "响应也回来了")}
      <path d="M84 44 l12 12 M96 44 l-12 12" class="dgm-arrow-bad" style="marker-end:none"/>
      ${label(200, 40, "浏览器在最后一步", "start")}
      ${label(200, 58, "把响应扣下不给 JS", "start")}
    `),
    fig("能解决它的只有这两个地方", pair(
      (x) => `${frame(x, 24, 104, 44, 4)}${label(x + 52, 40, "改前端代码")}${label(x + 52, 56, "加 header / 换 fetch 写法")}
        ${label(x + 52, 84, "怎么改都没用，限制不在前端")}`,
      (x) => `${okBox(x, 22, 104, 20, 3)}${label(x + 52, 34, "服务端加 Access-Control-Allow-*")}
        ${okBox(x, 48, 104, 20, 3)}${label(x + 52, 60, "或者走同域代理转发")}
        ${label(x + 52, 88, "二选一，没有第三条路")}`
    )),
  ],

  "http-cache": [
    fig("两种缓存差在发不发请求", `
      ${label(6, 24, "强缓存", "start")}
      ${frame(56, 14, 60, 20, 3)}${label(86, 27, "本地直接用")}
      <path d="M120 24 L180 24" class="dgm-arrow-bad" style="marker-end:none" stroke-dasharray="3 3"/>
      ${label(216, 25, "请求根本没发出去")}
      ${label(6, 66, "协商缓存", "start")}
      ${frame(56, 56, 60, 20, 3)}${label(86, 69, "先问一句")}
      ${arrow(120, 60, 180, 60)}${arrow(180, 72, 120, 72)}
      ${label(216, 60, "服务器答 304")}${label(216, 78, "没变，还是用本地的")}
    `),
    fig("永久强缓存的坑", pair(
      (x) => `${mono(x + 2, 26, "app.js")}${badBox(x + 4, 32, 96, 14, 3)}${label(x + 52, 42, "max-age=1年")}
        ${label(x + 52, 66, "内容更新了，用户还在用旧的")}
        ${label(x + 52, 84, "而且你没法让他刷掉")}`,
      (x) => `${mono(x + 2, 26, "app.a3f91c.js")}${okBox(x + 4, 32, 96, 14, 3)}${label(x + 52, 42, "max-age=1年")}
        ${label(x + 52, 66, "内容一变，文件名跟着变")}
        ${label(x + 52, 84, "等于自动换了一份新缓存")}`
    )),
  ],

  "first-screen": [
    fig("白屏就是这一段", `
      ${eventRow(28, "打开页面", [0.02], "dgm-accent-fill")}
      ${eventRow(58, "看到内容", [0.56], "dgm-marker-ok")}
      <rect x="70" y="20" width="103" height="46" class="dgm-bad" opacity=".22"/>
      ${label(122, 88, "这段空白 = 用户眼里的「卡住了」")}
      ${label(224, 88, "越短越好")}
    `),
    fig("等齐所有接口 vs 首屏先出", `
      ${mark(14, 26, false)}
      ${eventRow(26, "全都等齐", [0.9], "dgm-marker-bad")}
      ${label(200, 14, "首屏被最慢的那个非核心接口拖住")}
      ${mark(14, 62, true)}
      ${eventRow(62, "核心先渲染", [0.18], "dgm-marker-ok")}
      ${eventRow(86, "非核心后补", [0.9], "dgm-accent-fill")}
      ${label(200, 50, "能看的先画出来，慢的补在后面")}
    `),
  ],

  "jsbridge": [
    fig("H5 想用原生能力得过桥", `
      ${frame(8, 22, 88, 46, 4)}${label(52, 34, "H5 页面")}
      ${label(52, 52, "拍照 / 支付 / 扫码")}
      ${arrow(100, 36, 140, 36)}${label(120, 28, "调用")}
      ${arrow(140, 56, 100, 56)}${label(120, 66, "回调结果")}
      ${frame(144, 22, 108, 46, 4)}${label(198, 40, "App 原生容器")}
      ${label(198, 58, "只有它有系统权限")}
      ${label(130, 90, "桥两头都得有：页面调得出，容器接得住")}
    `),
    fig("换个环境打开就白屏", pair(
      (x) => `${browser(x, 20, 104, 50)}${mono(x + 8, 48, "window.JSBridge.scan()")}
        <path d="M${x + 40} 40 l12 12 M${x + 52} 40 l-12 12" class="dgm-arrow-bad" style="marker-end:none"/>
        ${label(x + 52, 86, "普通浏览器里没有这个对象，直接报错")}`,
      (x) => `${browser(x, 20, 104, 50)}${mono(x + 6, 44, "if (isInApp()) 走原生")}${mono(x + 6, 58, "else 走网页兜底")}
        ${label(x + 52, 86, "先判环境，再决定走哪条路")}`
    )),
  ],

  "semantic-html": [
    fig("div 汤 vs 有名字的结构", pair(
      (x) => `${frame(x + 4, 20, 96, 12, 2)}${mono(x + 8, 29, "div")}
        ${frame(x + 4, 34, 96, 26, 2)}${mono(x + 8, 50, "div")}
        ${frame(x + 4, 62, 96, 12, 2)}${mono(x + 8, 71, "div")}
        ${label(x + 52, 92, "读屏器只能一路念「分组」")}`,
      (x) => `${okBox(x + 4, 20, 96, 12, 2)}${mono(x + 8, 29, "header / nav")}
        ${okBox(x + 4, 34, 96, 26, 2)}${mono(x + 8, 50, "main > article")}
        ${okBox(x + 4, 62, 96, 12, 2)}${mono(x + 8, 71, "footer")}
        ${label(x + 52, 92, "结构自带含义，能跳着读")}`
    )),
    fig("可点的东西必须是 button / a", `
      ${frame(14, 24, 100, 40, 4)}${mono(20, 48, "&lt;div onclick&gt;")}
      ${label(64, 78, "Tab 聚不上 · 回车没反应")}${mark(64, 16, false)}
      ${frame(146, 24, 100, 40, 4)}${mono(152, 48, "&lt;button&gt;")}
      ${label(196, 78, "键盘、读屏、右键全都白送")}${mark(196, 16, true)}
    `),
  ],

  "storage": [
    fig("三种存法的差别", `
      ${label(6, 26, "Cookie", "start")}${neu(60, 18, 24, 12, 0.4, 2)}${label(100, 27, "≈4KB", "start")}${label(200, 27, "每个请求都自动带上", "middle")}
      ${label(6, 54, "localStorage", "start")}${neu(60, 46, 70, 12, 0.4, 2)}${label(146, 55, "≈5MB", "start")}${label(200, 55, "只在本地，关了浏览器还在", "middle")}
      ${label(6, 82, "sessionStorage", "start")}${neu(60, 74, 70, 12, 0.4, 2)}${label(146, 83, "≈5MB", "start")}${label(200, 83, "关掉标签页就没了", "middle")}
    `),
    fig("塞错地方的代价", pair(
      (x) => `${badBox(x + 4, 26, 96, 16, 3)}${label(x + 52, 37, "整份用户配置塞进 Cookie")}
        ${Array.from({ length: 4 }, (_, i) => `<path d="M${x + 10 + i * 24} 50 L${x + 10 + i * 24} 66" class="dgm-arrow-bad" marker-end="url(#dgm-arrow-bad)"/>`).join("")}
        ${label(x + 52, 84, "每个请求都背着它，越走越慢")}`,
      (x) => `${okBox(x + 4, 26, 96, 16, 3)}${label(x + 52, 37, "配置放 localStorage")}
        ${neu(x + 30, 56, 44, 10, 0.35, 3)}${label(x + 52, 64, "只留身份票据")}
        ${label(x + 52, 84, "请求只带该带的那一小份")}`
    )),
  ],
};

/* -------------------------------------------------------------------- 汇总 */

const DIAGRAMS = Object.assign({}, H5, MP, BASE, MOTION, WEB_STATE, WEB_COMP, WEB_REST);

Object.assign(DIAGRAMS, {
  "bento-grid": [fig("主卡获得更大面积，辅助内容按阅读顺序排列。", '<rect x="12" y="12" width="140" height="76" rx="10" class="dgm-ok"/><rect x="160" y="12" width="88" height="34" rx="8" class="dgm-chrome"/><rect x="160" y="54" width="88" height="34" rx="8" class="dgm-chrome"/>')],
  "surface-hierarchy": [fig("用表面明暗差分层，文字仍需清楚。", '<rect x="10" y="10" width="240" height="80" rx="10" fill="#ddd"/><rect x="24" y="24" width="96" height="52" rx="8" fill="#fff"/><rect x="140" y="24" width="96" height="52" rx="8" fill="#333"/><path d="M38 42h65M38 54h42" stroke="#222" stroke-width="4"/><path d="M154 42h65M154 54h42" stroke="#fff" stroke-width="4"/>')],
  "horizontal-gallery": [fig("横向浏览同时提供明确的前后操作。", '<rect x="38" y="18" width="78" height="64" rx="8" class="dgm-ok"/><rect x="124" y="18" width="78" height="64" rx="8" class="dgm-chrome"/><path d="m24 38-12 12 12 12M230 38l12 12-12 12" fill="none" stroke="currentColor" stroke-width="3"/>')]
});
export { DIAGRAMS, W, H };
