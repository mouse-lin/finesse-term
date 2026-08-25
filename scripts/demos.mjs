/**
 * finesse-term docs 页的真机演示库。
 *
 * 示意图（diagrams.mjs）讲的是「这件事的结构长什么样」——抽象几何，不冒充界面。
 * 这里讲的是另一件事：「它真的发生的时候是什么样」。
 *
 * 每条演示都是一段**真在跑**的 DOM + CSS + 可选 JS，装在一个手机画框里：
 * 滚动穿透真的会穿透，按下态真的能按，缓动真的在动，布局偏移真的会把按钮挪走。
 * 一个开关切「✗ 错的做法 / ✓ 对的做法」——两侧共用同一段 DOM，
 * 差别只在那一个属性上，这样用户看到的不是两张图，是那一行代码的后果。
 *
 * 它仍然不是应用截图：画框里没有品牌、没有假数据故事、没有冒充某个真实产品。
 * 只有正在发生的行为本身。
 *
 * 字段：
 *   modes   [错的标签, 对的标签]。省略就是没有对照，只有一个演示态。
 *   cap     画框旁边那段话：该看哪里、该动手做什么。演示不告诉用户怎么看就是白演。
 *   note    可选。真机与画框的差别（比如 env() 在桌面取不到值），必须诚实写出来。
 *   html    画框内部的 DOM 字符串。外层由 build-docs 套上 .dm-screen。
 *   css     作用域用 `&` 开头，build 时替换成 .dm[data-demo="<id>"]，不污染页面其余部分。
 *   js      可选，函数体字符串，签名 (root, api)：
 *             root          .dm 元素
 *             api.q/qa      在 root 内选元素
 *             api.on        绑事件，关弹层时自动解绑
 *             api.timer     setTimeout，自动清
 *             api.interval  setInterval，自动清
 *             api.mode()    当前 "bad" | "ok"
 *             api.onMode(f) 切换回调
 *   replay  true 时给一次性动效（布局偏移 / 骨架屏 / 转场）配一个「重放」按钮，
 *           点一下整段 DOM 重建、JS 重跑。
 *
 * 加一条演示的规矩：
 *   1. 两侧必须是同一段 DOM，只差那一个属性——差别一多，演示就不再是证据。
 *   2. cap 必须写「你动手做什么」，不能只写「看这里」。看不出差别的演示等于没有。
 *   3. 桌面上取不到的真机能力（env()、键盘、震动），note 里说清楚画框用什么模拟的。
 */

/* --------------------------------------------------------------- 通用零件 */

// 屏幕顶部状态栏：时间 + 信号，纯装饰，用来让画框里的比例像一台手机
function statusBar() {
  return '<div class="dm-status"><span>9:41</span><span class="dm-status-r">' +
    '<i class="dm-sig"></i><i class="dm-bat"></i></span></div>';
}

// 应用顶栏
function appBar(title) {
  return '<div class="dm-appbar"><span class="dm-back">‹</span><span>' + title + '</span></div>';
}

// n 条占位列表行；第一行可以给个不同高度，避免看起来像纯色块
function rows(n, cls) {
  let out = '';
  for (let i = 0; i < n; i++) {
    out += '<div class="dm-row' + (cls ? ' ' + cls : '') + '">' +
      '<div class="dm-avatar"></div>' +
      '<div class="dm-lines"><b style="width:' + (52 + (i * 13) % 34) + '%"></b>' +
      '<i style="width:' + (68 + (i * 17) % 26) + '%"></i></div></div>';
  }
  return out;
}

function demo(o) { return o; }

/* ------------------------------------------------------------ 移动适配 H5 */

const H5 = {

  "safe-area": demo({
    modes: ["✗ 没接安全区", "✓ 接了安全区"],
    cap: "看底部那条提交栏。切到 ✗ 一侧：按钮直接贴到屏幕最底，Home 指示条压在它下半截上——手指要按的地方正好是系统要吃掉的地方。切回 ✓：栏底多垫出一层，指示条落在按钮下方的空白里。列表也一起滑到底看最后一条。",
    note: "真机上这层高度是 env(safe-area-inset-bottom) 给的（iPhone 竖屏 34px）；画框里用固定 20px 模拟，因为桌面浏览器取不到这个值。",
    html:
      statusBar() + appBar("确认订单") +
      '<div class="sc">' + rows(9) + '<div class="tail">— 到底了 —</div></div>' +
      '<div class="foot"><button class="btn" type="button">提交订单</button></div>' +
      '<span class="dm-zone"></span>',
    css: `
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto; -webkit-overflow-scrolling:touch}
      & .tail{text-align:center; font-size:10px; color:var(--fg-faint); padding:10px 0 4px; font-family:var(--mono)}
      & .foot{position:absolute; left:0; right:0; bottom:0; background:var(--panel); border-top:1px solid var(--line); padding:8px 12px}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:11px 0; cursor:pointer; font-family:inherit}
      /* 差别只有这两行 */
      &[data-mode="bad"] .foot{padding-bottom:8px}
      &[data-mode="bad"] .sc{padding-bottom:56px}
      &[data-mode="ok"]  .foot{padding-bottom:calc(8px + var(--dm-safe))}
      &[data-mode="ok"]  .sc{padding-bottom:calc(56px + var(--dm-safe))}
    `,
  }),

  "scroll-lock": demo({
    modes: ["✗ 没锁滚动", "✓ 锁了滚动"],
    cap: "先把列表滑到中间，记住停在第几条，再点「筛选」打开弹层，然后在弹层上继续滑动。✗ 一侧：背后的列表跟着一起滑，关掉弹层还会发现自己回到了第一条。✓ 一侧：背景纹丝不动，关掉停在原处。",
    html:
      statusBar() + appBar("商品列表") +
      '<div class="sc" id="sc">' + rows(14) + '</div>' +
      '<div class="foot"><button class="open btn" type="button">筛选</button></div>' +
      '<div class="scrim"></div>' +
      '<div class="sheet"><div class="grab"></div><div class="sheet-t">筛选</div>' +
      rows(4) +
      '<button class="close btn" type="button">关闭</button></div>',
    css: `
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:52px; overflow-y:auto}
      &[data-locked="1"] .sc{overflow:hidden}
      & .foot{position:absolute; left:0; right:0; bottom:0; background:var(--panel); border-top:1px solid var(--line); padding:8px 12px calc(8px + var(--dm-safe))}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:10px 0; cursor:pointer; font-family:inherit}
      & .scrim{position:absolute; inset:0; background:var(--scrim); opacity:0; pointer-events:none; transition:opacity .26s var(--ease)}
      & .sheet{position:absolute; left:0; right:0; bottom:0; background:var(--panel); border-radius:16px 16px 0 0; padding:8px 14px calc(14px + var(--dm-safe)); transform:translateY(102%); transition:transform .34s var(--ease); box-shadow:0 -8px 30px rgba(0,0,0,.18)}
      & .grab{width:34px; height:4px; border-radius:2px; background:var(--line); margin:0 auto 8px}
      & .sheet-t{font-size:12px; font-weight:600; margin-bottom:6px}
      & .sheet .btn{margin-top:8px; background:var(--bg-2); color:var(--fg)}
      &[data-open="1"] .scrim{opacity:1; pointer-events:auto}
      &[data-open="1"] .sheet{transform:translateY(0)}
    `,
    js: `
      var sc = api.q(".sc");
      var saved = 0;
      function open() {
        if (api.mode() === "ok") {
          saved = sc.scrollTop;
          root.dataset.locked = "1";
          sc.style.marginTop = -saved + "px";
          sc.style.paddingTop = saved + "px";
        }
        root.dataset.open = "1";
      }
      function close() {
        root.dataset.open = "0";
        if (root.dataset.locked === "1") {
          root.dataset.locked = "0";
          sc.style.marginTop = "";
          sc.style.paddingTop = "";
          sc.scrollTop = saved;
        } else {
          // ✗ 一侧复刻 body{overflow:hidden} 在 iOS 上的真实后果：位置丢了，回到第一屏
          sc.scrollTop = 0;
        }
      }
      api.on(api.q(".open"), "click", open);
      api.on(api.q(".close"), "click", close);
      api.on(api.q(".scrim"), "click", close);
      api.onMode(close);
    `,
  }),

  "tap-highlight": demo({
    modes: ["✗ 交给系统默认", "✓ 自己给按下态"],
    cap: "按住卡片不放（手机上用手指，桌面上按住鼠标别松）。✗ 一侧：整块盖上一层直角灰蓝，连圆角都盖出去了，松手才退。✓ 一侧：自己接管——按下轻微下沉压暗，抬手弹回，圆角还在。",
    note: "✗ 一侧在 iOS Safari / 安卓 Chrome 上是系统真高亮；桌面浏览器没有这套行为，画框用一层等效的直角遮罩把它演出来。",
    html:
      statusBar() +
      '<div class="pad"><div class="tip">按住下面这张卡片</div>' +
      '<div class="card2"><div class="dm-avatar big"></div><div class="dm-lines"><b style="width:62%"></b><i style="width:84%"></i></div></div>' +
      '<button class="btn" type="button">同一套按下态，按钮上也是这样</button></div>',
    css: `
      & .pad{position:absolute; top:34px; left:0; right:0; padding:14px 14px 0}
      & .tip{font-family:var(--mono); font-size:10.5px; color:var(--fg-faint); margin-bottom:10px; letter-spacing:.03em}
      & .card2{display:flex; gap:10px; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:13px; position:relative; overflow:hidden; cursor:pointer; user-select:none; -webkit-user-select:none}
      & .btn{width:100%; margin-top:12px; border:none; border-radius:12px; background:var(--accent); color:#fff; font-size:12.5px; font-weight:600; padding:12px 0; cursor:pointer; font-family:inherit; position:relative; overflow:hidden}
      &[data-mode="bad"] .card2, &[data-mode="bad"] .btn{transition:none}
      &[data-mode="bad"] .card2::after, &[data-mode="bad"] .btn::after{
        content:""; position:absolute; left:-8px; right:-8px; top:-8px; bottom:-8px;
        background:rgba(0,0,132,.28); opacity:0; border-radius:0;
      }
      &[data-mode="bad"] .card2:active::after, &[data-mode="bad"] .btn:active::after{opacity:1}
      &[data-mode="ok"] .card2, &[data-mode="ok"] .btn{
        -webkit-tap-highlight-color:transparent;
        transition:transform .12s var(--ease), filter .12s var(--ease);
      }
      &[data-mode="ok"] .card2:active, &[data-mode="ok"] .btn:active{transform:scale(.975); filter:brightness(.93)}
    `,
  }),

  "touch-target": demo({
    modes: ["✗ 26px 命中区", "✓ 44px 命中区"],
    cap: "两侧的 × 看起来一样大。对着它连点五下——✗ 一侧点空的那几下会记在右上角的计数里，✓ 一侧几乎不会空。虚线是真实的命中范围，图标本身一个像素都没变。",
    html:
      statusBar() +
      '<div class="hit">命中 <b id="ok">0</b> · 点空 <b class="miss" id="miss">0</b></div>' +
      '<div class="rowbar">' +
      '<div class="dm-lines grow"><b style="width:56%"></b><i style="width:76%"></i></div>' +
      '<button class="x" type="button" aria-label="删除">×</button>' +
      '</div>' +
      '<div class="hintline">虚线 = 手指真正能碰到的范围</div>',
    css: `
      & .hit{position:absolute; top:34px; right:12px; font-family:var(--mono); font-size:10px; color:var(--fg-dim)}
      & .hit .miss{color:var(--bad)}
      & .rowbar{position:absolute; top:74px; left:0; right:0; display:flex; align-items:center; gap:10px; padding:0 14px; height:64px}
      & .grow{flex:1}
      & .x{
        border:none; background:transparent; color:var(--fg-dim); cursor:pointer;
        display:flex; align-items:center; justify-content:center; font-size:17px; line-height:1;
        outline:1px dashed var(--fg-faint); outline-offset:-1px; border-radius:8px; padding:0; flex:none;
      }
      &[data-mode="bad"] .x{width:26px; height:26px}
      &[data-mode="ok"]  .x{width:44px; height:44px; outline-color:var(--ok)}
      & .hintline{position:absolute; top:146px; left:0; right:0; text-align:center; font-family:var(--mono); font-size:9.5px; color:var(--fg-faint)}
      & .flash{position:absolute; inset:0; pointer-events:none; opacity:0}
    `,
    js: `
      var okN = 0, missN = 0;
      api.on(api.q(".x"), "click", function (e) {
        e.stopPropagation();
        api.q("#ok").textContent = ++okN;
      });
      api.on(api.q(".rowbar"), "click", function () {
        api.q("#miss").textContent = ++missN;
      });
      api.onMode(function () {
        okN = missN = 0;
        api.q("#ok").textContent = "0";
        api.q("#miss").textContent = "0";
      });
    `,
  }),

  "sticky-footer": demo({
    modes: ["✗ 跟着内容滚", "✓ 吸在底部"],
    cap: "从上往下滑这一屏表单。✗ 一侧：提交按钮排在内容最后，用户得先滑到底才知道有这么个东西。✓ 一侧：按钮一直在，滑到最后一条也没被它盖住——因为内容区补了跟操作栏等高的底部内边距，这一步漏了就等于把最后一条永久藏起来。",
    html:
      statusBar() + appBar("填写信息") +
      '<div class="sc">' + rows(8) +
      '<div class="inline"><button class="btn" type="button">提交</button></div>' +
      '<div class="last">最后一条内容</div></div>' +
      '<div class="foot"><button class="btn" type="button">提交</button></div>',
    css: `
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto; padding:0 0 10px}
      & .last{font-size:11px; color:var(--fg-dim); padding:10px 14px; border-top:1px dashed var(--line)}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:11px 0; cursor:pointer; font-family:inherit}
      & .inline{padding:12px 14px 4px}
      & .foot{position:absolute; left:0; right:0; bottom:0; background:var(--panel); border-top:1px solid var(--line); padding:8px 12px calc(8px + var(--dm-safe)); transform:translateY(102%); transition:transform .3s var(--ease)}
      &[data-mode="bad"] .foot{transform:translateY(102%)}
      &[data-mode="bad"] .inline{display:block}
      &[data-mode="ok"] .foot{transform:translateY(0)}
      &[data-mode="ok"] .inline{display:none}
      &[data-mode="ok"] .sc{padding-bottom:calc(58px + var(--dm-safe))}
    `,
  }),

  "scroll-container": demo({
    modes: ["✗ 整页一起滚", "✓ 只有中间滚"],
    cap: "往下滑这一屏。✗ 一侧：标题栏和底部栏跟着内容一起滑走了，用户想切页签得先一路滑回顶部；✓ 一侧：头尾钉死，只有中间那段在动，屏幕上永远有一个不动的参照。",
    html:
      statusBar() +
      '<div class="page">' +
        '<div class="head">' + '<div class="dm-appbar-in"><span class="dm-back">‹</span><span>全部订单</span></div>' +
          '<div class="tabs"><span class="on">全部</span><span>待付款</span><span>待收货</span></div></div>' +
        '<div class="sc">' + rows(12) + '</div>' +
        '<div class="foot"><span>合计 ¥0</span><button class="btn" type="button">结算</button></div>' +
      "</div>",
    css: `
      & .page{position:absolute; inset:34px 0 0}
      & .head{background:var(--panel); border-bottom:1px solid var(--line-soft); z-index:3}
      & .dm-appbar-in{display:flex; align-items:center; gap:7px; padding:0 12px; height:32px; font-size:12px; font-weight:600}
      & .tabs{display:flex; gap:14px; padding:0 12px 7px; font-size:11px; color:var(--fg-faint)}
      & .tabs .on{color:var(--accent); font-weight:600; border-bottom:2px solid var(--accent); padding-bottom:2px}
      & .foot{display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + var(--dm-safe)); background:var(--panel); border-top:1px solid var(--line-soft); font-size:11px; color:var(--fg-dim)}
      & .btn{margin-left:auto; border:none; border-radius:8px; background:var(--accent); color:#fff; font-size:12px; font-weight:600; padding:8px 18px; cursor:pointer; font-family:inherit}
      /* ✗：整页一个滚动容器，头尾都在滚动流里 */
      &[data-mode="bad"] .page{overflow-y:auto}
      /* ✓：头尾各自定位，中间才是那个滚动容器 */
      &[data-mode="ok"] .page{display:flex; flex-direction:column; overflow:hidden}
      &[data-mode="ok"] .sc{flex:1; overflow-y:auto}
    `,
  }),

  "rubber-band": demo({
    modes: ["✗ 滚动传给了外层", "✓ contain 截住"],
    cap: "在中间那块评论卡片里往下滚（触控板或滚轮都行），滚到它自己的底再继续滚。✗ 一侧：滚动传了出去，背后整页跟着动，用户以为自己还在看评论；✓ 一侧：到底就是到底，外层一动不动。",
    note: "这是浏览器真实的滚动链行为，两侧只差一行 overscroll-behavior:contain。",
    html:
      statusBar() + appBar("动态详情") +
      '<div class="outer">' + rows(3) +
        '<div class="cardbox"><div class="ct">评论 42</div><div class="inner">' + rows(8) + "</div></div>" +
        rows(6) +
      "</div>",
    css: `
      & .outer{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto}
      & .cardbox{margin:10px; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:var(--panel)}
      & .ct{font-size:11px; font-weight:600; padding:8px 12px; border-bottom:1px solid var(--line-soft)}
      & .inner{height:150px; overflow-y:auto}
      &[data-mode="ok"] .inner{overscroll-behavior:contain}
    `,
  }),

  "tab-bar": demo({
    modes: ["✗ 六个 · 看不出在哪", "✓ 四个 · 当前态 · 安全区"],
    cap: "点几下切换。✗ 一侧：六个入口挤在一起，点完盯半天也说不清自己现在在第几个，图标还被 Home 指示条压着；✓ 一侧：四个，当前项图标和文字一起变色，栏底垫了安全区。",
    html:
      statusBar() + appBar("首页") +
      '<div class="body">' + rows(7) + "</div>" +
      '<nav class="tb">' +
        '<button class="ti on" type="button"><i>●</i><span>首页</span></button>' +
        '<button class="ti" type="button"><i>◍</i><span>分类</span></button>' +
        '<button class="ti" type="button"><i>◆</i><span>发现</span></button>' +
        '<button class="ti" type="button"><i>◐</i><span>消息</span></button>' +
        '<button class="ti x6" type="button"><i>◇</i><span>会员</span></button>' +
        '<button class="ti x6" type="button"><i>○</i><span>我的</span></button>' +
      "</nav>",
    css: `
      & .body{position:absolute; top:66px; left:0; right:0; bottom:56px; overflow-y:auto}
      & .tb{position:absolute; left:0; right:0; bottom:0; display:flex; background:var(--panel); border-top:1px solid var(--line); z-index:7}
      & .ti{flex:1; min-width:0; border:none; background:transparent; cursor:pointer; font-family:inherit; color:var(--fg-faint); display:flex; flex-direction:column; align-items:center; gap:2px; padding:7px 0 6px; font-size:9px}
      & .ti i{font-style:normal; font-size:14px; line-height:1}
      &[data-mode="bad"] .tb{padding-bottom:0}
      &[data-mode="bad"] .ti.on{color:var(--fg-dim)}
      &[data-mode="ok"] .tb{padding-bottom:var(--dm-safe)}
      &[data-mode="ok"] .ti.x6{display:none}
      &[data-mode="ok"] .ti.on{color:var(--accent)}
      &[data-mode="ok"] .ti.on i{transform:translateY(-1px) scale(1.12); transition:transform .2s var(--spring)}
    `,
    js: `
      api.qa(".ti").forEach(function (b) {
        api.on(b, "click", function () {
          api.qa(".ti").forEach(function (o) { o.classList.toggle("on", o === b); });
        });
      });
    `,
  }),

  "bottom-sheet": demo({
    modes: ["✗ 居中弹窗 · 拖不动", "✓ 底部弹层 · 跟手"],
    cap: "点「更多操作」打开，然后<b>按住把手往下拖</b>。✓ 一侧：弹层跟着手指走，拖过三分之一松手就关，点遮罩也关，拇指全程不用离开屏幕下半区；✗ 一侧：弹窗钉在屏幕正中，拖不动，点遮罩没反应，只能去右上角够那个小 ×。",
    html:
      statusBar() + appBar("文件") +
      '<div class="body">' + rows(7) + "</div>" +
      '<div class="foot"><button class="open btn" type="button">更多操作</button></div>' +
      '<div class="scrim"></div>' +
      '<div class="sheet">' +
        '<button class="xx" type="button" aria-label="关闭">×</button>' +
        '<div class="grab"></div><div class="st">更多操作</div>' +
        '<div class="opt">重命名</div><div class="opt">移动到…</div><div class="opt">复制链接</div><div class="opt danger">删除</div>' +
      "</div>",
    css: `
      & .body{position:absolute; top:66px; left:0; right:0; bottom:52px; overflow-y:auto}
      & .foot{position:absolute; left:0; right:0; bottom:0; padding:8px 12px calc(8px + var(--dm-safe)); background:var(--panel); border-top:1px solid var(--line)}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:10px 0; cursor:pointer; font-family:inherit}
      & .scrim{position:absolute; inset:0; background:var(--scrim); opacity:0; pointer-events:none; transition:opacity .26s var(--ease); z-index:8}
      & .sheet{position:absolute; z-index:9; background:var(--panel); box-shadow:0 -8px 30px rgba(0,0,0,.2)}
      & .grab{width:36px; height:4px; border-radius:2px; background:var(--line); margin:0 auto 10px; cursor:grab; touch-action:none}
      & .st{font-size:12px; font-weight:600; margin-bottom:4px; padding:0 4px}
      & .opt{font-size:12px; padding:11px 4px; border-top:1px solid var(--line-soft); cursor:pointer}
      & .opt.danger{color:var(--bad)}
      & .xx{position:absolute; top:8px; right:8px; width:18px; height:18px; border:none; background:transparent; color:var(--fg-faint); font-size:14px; line-height:1; cursor:pointer; padding:0}
      &[data-open="1"] .scrim{opacity:1; pointer-events:auto}
      /* ✗：居中弹窗，位置在拇指够不着的地方，还拖不动 */
      &[data-mode="bad"] .sheet{left:22px; right:22px; top:50%; border-radius:14px; padding:14px; transform:translateY(-50%) scale(.9); opacity:0; pointer-events:none; transition:opacity .2s var(--ease), transform .2s var(--ease)}
      &[data-mode="bad"][data-open="1"] .sheet{opacity:1; transform:translateY(-50%) scale(1); pointer-events:auto}
      &[data-mode="bad"] .grab{display:none}
      /* ✓：贴着屏幕下沿升起，把手可拖 */
      &[data-mode="ok"] .sheet{left:0; right:0; bottom:0; border-radius:18px 18px 0 0; padding:9px 14px calc(14px + var(--dm-safe)); transform:translateY(102%); transition:transform .34s var(--ease)}
      &[data-mode="ok"][data-open="1"] .sheet{transform:translateY(0)}
      &[data-mode="ok"] .xx{display:none}
      &[data-dragging="1"] .sheet{transition:none}
    `,
    js: `
      var sheet = api.q(".sheet"), grab = api.q(".grab");
      function open() { root.dataset.open = "1"; }
      function close() {
        root.dataset.open = "0";
        root.dataset.dragging = "0";
        sheet.style.transform = "";
      }
      api.on(api.q(".open"), "click", open);
      api.on(api.q(".xx"), "click", close);
      api.on(api.q(".scrim"), "click", function () { if (api.mode() === "ok") close(); });
      api.onMode(close);

      var startY = 0, dy = 0, dragging = false;
      api.on(grab, "pointerdown", function (e) {
        if (api.mode() !== "ok") return;
        dragging = true; startY = e.clientY; dy = 0;
        root.dataset.dragging = "1";
        grab.setPointerCapture(e.pointerId);
      });
      api.on(grab, "pointermove", function (e) {
        if (!dragging) return;
        dy = Math.max(0, e.clientY - startY);
        sheet.style.transform = "translateY(" + dy + "px)";
      });
      api.on(grab, "pointerup", function () {
        if (!dragging) return;
        dragging = false;
        root.dataset.dragging = "0";
        // 拖过弹层高度三分之一就当用户想关掉，否则弹回去
        if (dy > sheet.offsetHeight / 3) close();
        else sheet.style.transform = "";
      });
    `,
  }),

  "pull-to-refresh": demo({
    modes: ["✗ 没有阈值和反馈", "✓ 阻尼 · 阈值 · 状态"],
    cap: "在列表顶端<b>按住往下拖</b>。✓ 一侧：越拖越沉（阻尼），拖过那条线文案从「下拉刷新」变成「松手刷新」，松手才真去刷，刷完告诉你更新了几条；✗ 一侧：手指刚动就已经在刷了，屏幕上什么都没说，用户不知道自己触发了什么、有没有成功。",
    html:
      statusBar() + appBar("消息") +
      '<div class="hint"><span class="txt">下拉刷新</span></div>' +
      '<div class="sc">' + rows(10) + "</div>",
    css: `
      & .hint{position:absolute; top:66px; left:0; right:0; height:44px; display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-size:10px; color:var(--fg-faint); letter-spacing:.04em}
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto; background:var(--bg); touch-action:pan-y; will-change:transform}
      &[data-pulling="1"] .sc{transition:none}
      & .sc{transition:transform .3s var(--ease)}
      &[data-mode="bad"] .hint{opacity:0}
    `,
    js: `
      var sc = api.q(".sc"), txt = api.q(".txt");
      var startY = 0, pulling = false, dist = 0, busy = false;
      var THRESHOLD = 56;
      function set(d) {
        dist = d;
        sc.style.transform = d ? "translateY(" + d + "px)" : "";
      }
      function refresh() {
        busy = true;
        txt.textContent = "刷新中…";
        set(40);
        api.timer(function () {
          txt.textContent = "已更新 3 条";
          set(0);
          api.timer(function () { txt.textContent = "下拉刷新"; busy = false; }, 900);
        }, 900);
      }
      api.on(sc, "pointerdown", function (e) {
        if (busy || sc.scrollTop > 0) return;
        pulling = true; startY = e.clientY;
        root.dataset.pulling = "1";
      });
      api.on(sc, "pointermove", function (e) {
        if (!pulling) return;
        var raw = e.clientY - startY;
        if (raw <= 0) { set(0); return; }
        if (api.mode() === "ok") {
          set(raw * 0.42);                       // 阻尼：拖得越远越沉
          txt.textContent = dist > THRESHOLD ? "松手刷新" : "下拉刷新";
        } else {
          set(raw);                              // ✗：一比一跟手，没有阻尼
          if (raw > 6 && !busy) { pulling = false; root.dataset.pulling = "0"; set(0); busy = true; api.timer(function(){ busy = false; }, 600); }
        }
      });
      api.on(sc, "pointerup", function () {
        if (!pulling) return;
        pulling = false;
        root.dataset.pulling = "0";
        if (api.mode() === "ok" && dist > THRESHOLD) refresh();
        else set(0);
      });
      api.onMode(function () { pulling = busy = false; set(0); txt.textContent = "下拉刷新"; });
    `,
  }),

  "swipe-gesture": demo({
    modes: ["✗ 划一下就删了", "✓ 阈值 · 回弹 · 二次确认"],
    cap: "在任意一行上<b>往左拖</b>。✗ 一侧：手指划过十几个像素这条就没了，撤销都来不及点；✓ 一侧：拖不到位会弹回去，拖到位停在那儿露出删除键，真删还要再点一下。",
    html:
      statusBar() + appBar("收件箱") +
      '<div class="sc">' +
        '<div class="sw"><div class="act">删除</div><div class="fg">' + rows(1) + "</div></div>" +
        '<div class="sw"><div class="act">删除</div><div class="fg">' + rows(1) + "</div></div>" +
        '<div class="sw"><div class="act">删除</div><div class="fg">' + rows(1) + "</div></div>" +
        '<div class="sw"><div class="act">删除</div><div class="fg">' + rows(1) + "</div></div>" +
        '<div class="tipbar">左滑试试</div>' +
      "</div>",
    css: `
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto}
      & .sw{position:relative; overflow:hidden; background:var(--bg)}
      & .sw.gone{height:0; opacity:0; transition:height .25s var(--ease), opacity .18s var(--ease)}
      & .act{position:absolute; top:0; right:0; bottom:0; width:76px; background:var(--bad); color:#fff; font-size:12px; display:flex; align-items:center; justify-content:center; cursor:pointer}
      & .fg{position:relative; background:var(--bg); transition:transform .26s var(--ease); touch-action:pan-y}
      & .fg .dm-row{background:var(--bg)}
      & .tipbar{text-align:center; font-family:var(--mono); font-size:10px; color:var(--fg-faint); padding:12px 0}
    `,
    js: `
      var OPEN = 76;
      api.qa(".sw").forEach(function (sw) {
        var fg = sw.querySelector(".fg");
        var startX = 0, dx = 0, on = false, opened = false;
        function move(x) { fg.style.transform = x ? "translateX(" + x + "px)" : ""; }
        function kill() {
          sw.style.height = sw.offsetHeight + "px";
          void sw.offsetWidth;
          sw.classList.add("gone");
          sw.style.height = "0px";
        }
        api.on(fg, "pointerdown", function (e) {
          on = true; dx = 0; startX = e.clientX - (opened ? -OPEN : 0);
          fg.style.transition = "none";
          fg.setPointerCapture(e.pointerId);
        });
        api.on(fg, "pointermove", function (e) {
          if (!on) return;
          dx = Math.min(0, e.clientX - startX);
          if (api.mode() === "bad" && dx < -14) { on = false; kill(); return; }
          move(Math.max(dx, -OPEN - 12));
        });
        api.on(fg, "pointerup", function () {
          if (!on) return;
          on = false;
          fg.style.transition = "";
          opened = dx < -OPEN / 2;
          move(opened ? -OPEN : 0);
        });
        api.on(sw.querySelector(".act"), "click", function () { if (opened) kill(); });
      });
    `,
  }),

  "load-more": demo({
    modes: ["✗ 只有一颗按钮", "✓ 触底自动 · 三个状态"],
    cap: "一直往下滑。✓ 一侧：滑到底自动接着加载，加载中有一行明确的「加载中…」，没有了会说「没有更多了」，用户永远知道现在处在哪一步；✗ 一侧：滑到底只有一颗按钮，点下去毫无反应地卡三秒，用户会连点，然后同一批数据进来两遍。",
    html:
      statusBar() + appBar("列表") +
      '<div class="sc">' + '<div class="items">' + rows(6) + "</div>" +
      '<div class="tail"><button class="more" type="button">加载更多</button><span class="st"></span></div>' + "</div>",
    css: `
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto}
      & .tail{padding:14px 0 22px; text-align:center; font-family:var(--mono); font-size:10.5px; color:var(--fg-faint)}
      & .more{border:1px solid var(--line); background:transparent; color:var(--fg-dim); font-family:var(--mono); font-size:10.5px; padding:6px 16px; border-radius:7px; cursor:pointer}
      &[data-mode="ok"] .more{display:none}
      &[data-mode="bad"] .st{display:none}
    `,
    js: `
      var sc = api.q(".sc"), items = api.q(".items"), st = api.q(".st"), btn = api.q(".more");
      var page = 0, MAX = 4, busy = false;
      function block(n) {
        var out = "";
        for (var i = 0; i < n; i++) {
          out += '<div class="dm-row"><div class="dm-avatar"></div><div class="dm-lines">' +
            '<b style="width:' + (54 + (i * 11) % 30) + '%"></b><i style="width:' + (70 + (i * 13) % 22) + '%"></i></div></div>';
        }
        return out;
      }
      function load(silent) {
        if (busy) return;
        if (page >= MAX) { st.textContent = "没有更多了"; return; }
        busy = true;
        if (!silent) st.textContent = "加载中…";
        api.timer(function () {
          items.insertAdjacentHTML("beforeend", block(5));
          page++;
          busy = false;
          st.textContent = page >= MAX ? "没有更多了" : "";
          if (api.mode() === "ok") check();
        }, 700);
      }
      function check() {
        if (api.mode() !== "ok") return;
        if (sc.scrollTop + sc.clientHeight > sc.scrollHeight - 40) load();
      }
      api.on(sc, "scroll", check);
      api.on(btn, "click", function () { load(true); });   // ✗：点了没有任何状态，连点就重复加载
      api.onMode(function (m) { st.textContent = ""; if (m === "ok") check(); });
    `,
  }),

  "long-press": demo({
    modes: ["✗ 200ms 无声触发", "✓ 500ms + 进度反馈"],
    cap: "按住那张卡片别松。✓ 一侧：边框上有一圈进度在走，走满才弹出菜单，中途松手或手指滑动就取消；✗ 一侧：按下不到一眨眼菜单就跳出来了，用户本来只想滑动列表。",
    html:
      statusBar() +
      '<div class="pad"><div class="tip">按住卡片</div>' +
        '<div class="press"><div class="ring"></div><div class="dm-avatar big"></div><div class="dm-lines"><b style="width:58%"></b><i style="width:80%"></i></div></div>' +
        '<div class="menu"><div class="mi">收藏</div><div class="mi">分享</div><div class="mi danger">删除</div></div>' +
      "</div>",
    css: `
      & .pad{position:absolute; top:34px; left:0; right:0; padding:16px 14px 0}
      & .tip{font-family:var(--mono); font-size:10.5px; color:var(--fg-faint); margin-bottom:10px}
      & .press{position:relative; display:flex; gap:10px; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:13px; overflow:hidden; cursor:pointer; user-select:none; -webkit-user-select:none; touch-action:none}
      & .ring{position:absolute; left:0; top:0; bottom:0; width:0; background:var(--accent); opacity:.16}
      &[data-mode="ok"] .press.holding .ring{width:100%; transition:width 500ms linear}
      & .menu{margin-top:12px; border:1px solid var(--line); border-radius:12px; background:var(--panel); opacity:0; transform:translateY(-6px); transition:opacity .2s var(--ease), transform .2s var(--ease); pointer-events:none}
      &[data-menu="1"] .menu{opacity:1; transform:none; pointer-events:auto}
      & .mi{font-size:12px; padding:10px 13px; border-bottom:1px solid var(--line-soft)}
      & .mi:last-child{border-bottom:none}
      & .mi.danger{color:var(--bad)}
    `,
    js: `
      var press = api.q(".press");
      var t = null;
      function cancel() {
        press.classList.remove("holding");
        if (t) { clearTimeout(t); t = null; }
      }
      api.on(press, "pointerdown", function () {
        root.dataset.menu = "0";
        var ms = api.mode() === "ok" ? 500 : 200;
        if (api.mode() === "ok") press.classList.add("holding");
        t = api.timer(function () {
          cancel();
          root.dataset.menu = "1";
          if (api.mode() === "ok" && navigator.vibrate) navigator.vibrate(12);
        }, ms);
      });
      api.on(press, "pointerup", cancel);
      api.on(press, "pointerleave", cancel);
      api.on(press, "pointercancel", cancel);
      api.on(press, "contextmenu", function (e) { e.preventDefault(); });
      api.onMode(function () { cancel(); root.dataset.menu = "0"; });
    `,
  }),

  "viewport-meta": demo({
    modes: ["✗ 没写 viewport", "✓ width=device-width"],
    cap: "同一个页面、同一段 HTML。✗ 一侧就是没写那一行 meta 的样子：浏览器按 980px 的假想桌面宽度排完版，再整体缩到手机屏上——字全糊了，用户第一件事是双指放大。✓ 一侧写了，1 个 CSS 像素对上 1 个设备独立像素。",
    note: "画框用 transform:scale 复刻了「按 980px 排版再整体缩小」这个过程，和真机上没写 meta 时的结果是同一回事。",
    html:
      statusBar() +
      '<div class="stage"><div class="page">' +
        '<div class="h1">今日订单</div>' +
        '<p>下单后 30 分钟内可以取消，超时请联系客服处理。</p>' +
        rows(4) +
        '<button class="btn" type="button">去结算</button>' +
      "</div></div>",
    css: `
      & .stage{position:absolute; top:34px; left:0; right:0; bottom:0; overflow:hidden}
      & .page{background:var(--bg); padding:14px}
      & .h1{font-size:17px; font-weight:700; margin-bottom:6px}
      & .page p{font-size:13px; color:var(--fg-dim); margin:0 0 10px}
      & .btn{margin-top:12px; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:14px; font-weight:600; padding:11px 22px; cursor:pointer; font-family:inherit}
      /* ✗：按 980px 排版，再整体缩到屏幕宽 */
      &[data-mode="bad"] .page{width:980px; transform:scale(0.24); transform-origin:0 0}
      &[data-mode="ok"] .page{width:100%}
    `,
  }),

  "rem-vw-adapt": demo({
    modes: ["✗ 全用固定 px", "✓ 跟着视口宽换算"],
    cap: "拖屏幕底下那根滑杆，把机型从 6.7 寸拖到 4.7 寸。✗ 一侧：字号间距全是写死的 px，小屏上挤成一团、按钮文字被顶出去；✓ 一侧：整块按视口宽等比缩，大屏小屏是同一个版式的两个尺码。",
    html:
      statusBar() +
      '<div class="hold"><div class="win">' +
        '<div class="ttl">会员卡</div>' +
        '<div class="num">6228 **** **** 3312</div>' +
        '<div class="foot2"><span>有效期 08/29</span><button class="btn" type="button">立即续费</button></div>' +
      "</div></div>" +
      '<div class="ctl"><span class="w">375px</span><input class="rg" type="range" min="240" max="375" value="375"></div>',
    css: `
      & .hold{position:absolute; top:44px; left:0; right:0; display:flex; justify-content:center}
      & .win{--u:calc(var(--w,375) * 1px); width:var(--u); border:1px dashed var(--line); overflow:hidden; padding:14px}
      & .ttl{font-weight:700; margin-bottom:10px}
      & .num{font-family:var(--mono); letter-spacing:.06em; color:var(--fg-dim); margin-bottom:14px; white-space:nowrap}
      & .foot2{display:flex; align-items:center; justify-content:space-between; gap:8px}
      & .foot2 span{color:var(--fg-faint); white-space:nowrap}
      & .btn{border:none; border-radius:8px; background:var(--accent); color:#fff; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap}
      /* ✗：所有尺寸写死 */
      &[data-mode="bad"] .ttl{font-size:19px}
      &[data-mode="bad"] .num{font-size:15px}
      &[data-mode="bad"] .foot2{font-size:13px}
      &[data-mode="bad"] .btn{font-size:14px; padding:11px 20px}
      /* ✓：以视口宽为单位换算，375 是设计稿宽 */
      &[data-mode="ok"] .ttl{font-size:calc(var(--u) * 19 / 375)}
      &[data-mode="ok"] .num{font-size:calc(var(--u) * 15 / 375)}
      &[data-mode="ok"] .foot2{font-size:calc(var(--u) * 13 / 375)}
      &[data-mode="ok"] .btn{font-size:calc(var(--u) * 14 / 375); padding:calc(var(--u) * 11 / 375) calc(var(--u) * 20 / 375)}
      & .ctl{position:absolute; left:14px; right:14px; bottom:calc(14px + var(--dm-safe)); display:flex; align-items:center; gap:9px; font-family:var(--mono); font-size:10px; color:var(--fg-faint)}
      & .rg{flex:1; accent-color:var(--accent)}
    `,
    js: `
      var win = api.q(".win"), rg = api.q(".rg"), lab = api.q(".w");
      function sync() {
        win.style.setProperty("--w", rg.value);
        lab.textContent = rg.value + "px";
      }
      api.on(rg, "input", sync);
      sync();
    `,
  }),

  "hairline": demo({
    modes: ["✗ border:1px", "✓ 0.5px 细线"],
    cap: "盯住行与行之间那条分隔线，来回切两次。✗ 一侧是 1 个 CSS 像素——在 2 倍屏上等于 2 个物理像素，粗得像描边；✓ 一侧用缩放做出半像素，线细下去一档，整屏立刻不吵了。",
    note: "只有在 2 倍及以上的屏幕上才看得出差别（多数手机、Retina 笔记本都是）。1 倍屏上两侧一样粗，这本身就是这条术语的边界。",
    html:
      statusBar() + appBar("设置") +
      '<div class="lst">' +
        '<div class="li"><span>账号与安全</span><span class="ar">›</span></div>' +
        '<div class="li"><span>通知</span><span class="ar">›</span></div>' +
        '<div class="li"><span>隐私</span><span class="ar">›</span></div>' +
        '<div class="li"><span>通用</span><span class="ar">›</span></div>' +
        '<div class="li"><span>关于</span><span class="ar">›</span></div>' +
      "</div>",
    css: `
      & .lst{position:absolute; top:66px; left:0; right:0; background:var(--panel)}
      & .li{position:relative; display:flex; align-items:center; justify-content:space-between; padding:13px 14px; font-size:12.5px}
      & .ar{color:var(--fg-faint)}
      &[data-mode="bad"] .li{border-bottom:1px solid var(--fg-faint)}
      &[data-mode="ok"] .li::after{
        content:""; position:absolute; left:0; right:0; bottom:0; height:1px;
        background:var(--fg-faint); transform:scaleY(.5); transform-origin:0 100%;
      }
    `,
  }),

  "dpr": demo({
    modes: ["✗ 1 倍图拉大用", "✓ 2 倍图缩着用"],
    cap: "两侧的图在屏幕上占的位置一模一样大。✗ 一侧的源图只有 96 像素宽，被拉到 96 个 CSS 像素、也就是 2 倍屏上的 192 个物理像素——边缘发毛；✓ 一侧源图 192 像素，缩着用，边是干净的。",
    note: "画框里的图是页面现画的（canvas），不是两张事先修过的截图，你可以放大浏览器再看一遍。",
    html:
      statusBar() +
      '<div class="pad">' +
        '<div class="tip">同一张图，源尺寸不同</div>' +
        '<img class="pic" alt="示例图案">' +
        '<div class="meta"></div>' +
      "</div>",
    css: `
      & .pad{position:absolute; top:44px; left:0; right:0; padding:0 14px; text-align:center}
      & .tip{font-family:var(--mono); font-size:10px; color:var(--fg-faint); margin-bottom:14px}
      & .pic{width:150px; height:150px; border-radius:14px; border:1px solid var(--line); image-rendering:auto}
      & .meta{margin-top:12px; font-family:var(--mono); font-size:10px; color:var(--fg-dim)}
    `,
    js: `
      function draw(size) {
        var c = document.createElement("canvas");
        c.width = c.height = size;
        var g = c.getContext("2d");
        var u = size / 12;
        g.fillStyle = "#f0eee6"; g.fillRect(0, 0, size, size);
        g.fillStyle = "#b3550f";
        g.beginPath(); g.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#1c1a16"; g.lineWidth = Math.max(1, size / 96);
        for (var i = 1; i < 12; i++) {
          g.beginPath(); g.moveTo(i * u, 0); g.lineTo(i * u, size); g.stroke();
        }
        g.font = "bold " + (size / 4) + "px sans-serif";
        g.fillStyle = "#1c1a16"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText("A", size / 2, size / 2);
        return c.toDataURL();
      }
      var small = draw(96), big = draw(300);
      var img = api.q(".pic"), meta = api.q(".meta");
      function sync() {
        var bad = api.mode() === "bad";
        img.src = bad ? small : big;
        meta.textContent = (bad ? "源图 96px" : "源图 300px") + " → 显示 150px · 屏幕 DPR " + (window.devicePixelRatio || 1);
      }
      api.onMode(sync);
      sync();
    `,
  }),

  "keyboard-push": demo({
    modes: ["✗ 键盘盖住输入框", "✓ 视口收缩 · 滚到可见"],
    cap: "点一下最底下那个输入框，键盘升起来。✗ 一侧：键盘直接盖在输入框和提交键上，用户看不见自己在打什么，只能盲敲；✓ 一侧：可视区跟着收缩，页面自动把输入框滚到键盘上沿，提交键一直露着。",
    note: "画框里的键盘是模拟的；真机上这段高度来自 window.visualViewport，行为一致——收缩的是可视区，不是页面本身。",
    html:
      statusBar() + appBar("发表评论") +
      '<div class="sc">' + rows(6) +
        '<div class="fm"><div class="fl">你的评论</div><input class="ipt" type="text" placeholder="说点什么…"><button class="btn" type="button">提交</button></div>' +
      "</div>" +
      '<div class="kb"><div class="kbrow"></div><div class="kbrow"></div><div class="kbrow"></div><span class="kbt">系统键盘</span></div>',
    css: `
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto; transition:bottom .24s var(--ease)}
      & .fm{padding:14px}
      & .fl{font-size:11px; color:var(--fg-faint); margin-bottom:6px}
      & .ipt{width:100%; border:1px solid var(--line); border-radius:9px; padding:10px 11px; font-size:12.5px; background:var(--panel); color:var(--fg); font-family:inherit}
      & .ipt:focus{outline:2px solid var(--accent); outline-offset:-1px}
      & .btn{width:100%; margin-top:10px; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:10px 0; cursor:pointer; font-family:inherit}
      & .kb{position:absolute; left:0; right:0; bottom:0; height:196px; background:var(--bg-2); border-top:1px solid var(--line); z-index:10; transform:translateY(100%); transition:transform .24s var(--ease); padding:14px 10px}
      & .kbrow{height:30px; margin-bottom:9px; border-radius:6px; background:var(--fg-faint); opacity:.18}
      & .kbt{position:absolute; bottom:10px; left:0; right:0; text-align:center; font-family:var(--mono); font-size:9.5px; color:var(--fg-faint)}
      &[data-kb="1"] .kb{transform:translateY(0)}
      &[data-kb="1"][data-mode="ok"] .sc{bottom:196px}
    `,
    js: `
      var ipt = api.q(".ipt"), sc = api.q(".sc");
      api.on(ipt, "focus", function () {
        root.dataset.kb = "1";
        if (api.mode() === "ok") {
          api.timer(function () { ipt.scrollIntoView({ block: "center", behavior: "smooth" }); }, 260);
        }
      });
      api.on(ipt, "blur", function () { root.dataset.kb = "0"; });
      api.on(api.q(".kb"), "pointerdown", function (e) { e.preventDefault(); });
      api.onMode(function () { ipt.blur(); root.dataset.kb = "0"; sc.scrollTop = 0; });
    `,
  }),

  "click-penetration": demo({
    modes: ["✗ 关掉的同时点到了下层", "✓ 关闭后拦一拍"],
    note: "桌面浏览器不会自己产生那个合成点击（它是移动端触摸事件独有的一拍），画框里用同一坐标上的元素把它原样复刻了出来，✓ 那侧挡的也是同一下。",
    cap: "点一下遮罩关闭弹层——只点这一下，别碰下面那颗按钮。✗ 一侧：弹层关掉的同一瞬间，下层那颗「立即购买」的计数自己加了 1，用户什么都没做就下单了；✓ 一侧：关闭后短暂拦住穿透，计数纹丝不动。",
    html:
      statusBar() + appBar("商品") +
      '<div class="body">' + rows(3) +
        '<div class="buywrap"><button class="buy" type="button">立即购买</button>' +
        '<div class="cnt">下层按钮被点了 <b id="n">0</b> 次</div></div>' +
      "</div>" +
      '<div class="foot"><button class="open btn" type="button">打开优惠券</button></div>' +
      '<div class="scrim"></div>' +
      '<div class="pop"><div class="pt">优惠券</div><div class="pd">满 199 减 30</div><div class="ph">点遮罩关掉它</div></div>',
    css: `
      & .body{position:absolute; top:66px; left:0; right:0; bottom:52px; overflow-y:auto}
      & .buywrap{padding:16px 14px; text-align:center}
      & .buy{width:100%; border:none; border-radius:10px; background:var(--bad); color:#fff; font-size:13px; font-weight:600; padding:12px 0; cursor:pointer; font-family:inherit}
      & .cnt{margin-top:10px; font-family:var(--mono); font-size:10.5px; color:var(--fg-dim)}
      & .cnt b{color:var(--bad); font-size:13px}
      & .foot{position:absolute; left:0; right:0; bottom:0; padding:8px 12px calc(8px + var(--dm-safe)); background:var(--panel); border-top:1px solid var(--line)}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:10px 0; cursor:pointer; font-family:inherit}
      & .scrim{position:absolute; inset:0; background:var(--scrim); opacity:0; pointer-events:none; transition:opacity .2s var(--ease); z-index:8}
      & .pop{position:absolute; z-index:9; left:26px; right:26px; top:120px; background:var(--panel); border-radius:14px; padding:16px; text-align:center; opacity:0; transform:scale(.94); pointer-events:none; transition:opacity .18s var(--ease), transform .18s var(--ease)}
      & .pt{font-weight:700; margin-bottom:4px}
      & .pd{font-size:12px; color:var(--accent)}
      & .ph{margin-top:10px; font-family:var(--mono); font-size:10px; color:var(--fg-faint)}
      &[data-open="1"] .scrim{opacity:1; pointer-events:auto}
      &[data-open="1"] .pop{opacity:1; transform:none}
      &[data-shield="1"] .body{pointer-events:none}
    `,
    js: `
      var n = 0;
      api.on(api.q(".open"), "click", function () { root.dataset.open = "1"; });
      api.on(api.q(".buy"), "click", function () { api.q("#n").textContent = ++n; });
      // 遮罩在 pointerdown 就关掉，随后那一下落到原地还剩下的东西上——
      // 这正是真机上「touchstart 关弹层、300ms 后合成 click 打到下层」的那一拍。
      api.on(api.q(".scrim"), "pointerdown", function (e) {
        var x = e.clientX, y = e.clientY;
        root.dataset.open = "0";
        if (api.mode() === "ok") {
          root.dataset.shield = "1";
          api.timer(function () { root.dataset.shield = "0"; }, 350);
        }
        api.timer(function () {
          var el = document.elementFromPoint(x, y);
          if (el && root.contains(el)) el.click();   // ✓ 那侧这一下会落在挡板上，什么也点不着
        }, 120);
      });
      api.onMode(function () { n = 0; api.q("#n").textContent = "0"; root.dataset.open = "0"; root.dataset.shield = "0"; });
    `,
  }),

  "thumb-zone": demo({
    modes: ["✗ 主操作在左上角", "✓ 主操作在拇指区"],
    cap: "把手机想成握在右手里、只有拇指能动。绿色那片是拇指不挪手就够得到的范围。✗ 一侧：最要紧的那个按钮压在左上角，用户得换手或者把手机往下捋；✓ 一侧：主操作落在屏幕下三分之一，返回、更多这类低频项才留在顶上。",
    html:
      statusBar() +
      '<span class="reach"></span>' +
      '<div class="topbar"><span class="dm-back">‹</span><span class="tt">编辑资料</span><button class="mini a" type="button">保存</button></div>' +
      '<div class="body">' + rows(5) + "</div>" +
      '<div class="foot"><button class="btn a" type="button">保存</button></div>',
    css: `
      & .reach{
        position:absolute; z-index:1; pointer-events:none; right:-40px; bottom:-70px;
        width:330px; height:330px; border-radius:50%;
        background:radial-gradient(circle at 70% 78%, rgba(47,122,61,.26), rgba(47,122,61,.05) 70%, transparent 72%);
      }
      & .topbar{position:absolute; top:34px; left:0; right:0; height:34px; z-index:3; display:flex; align-items:center; gap:8px; padding:0 10px; background:var(--panel); border-bottom:1px solid var(--line-soft); font-size:12px; font-weight:600}
      & .tt{flex:1}
      & .body{position:absolute; top:68px; left:0; right:0; bottom:0; overflow-y:auto; z-index:2}
      & .mini{border:none; border-radius:7px; background:var(--accent); color:#fff; font-size:11px; font-weight:600; padding:5px 12px; cursor:pointer; font-family:inherit}
      & .foot{position:absolute; z-index:4; left:0; right:0; bottom:0; padding:8px 12px calc(8px + var(--dm-safe)); background:var(--panel); border-top:1px solid var(--line)}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:11px 0; cursor:pointer; font-family:inherit}
      &[data-mode="bad"] .foot{display:none}
      &[data-mode="bad"] .topbar .mini{order:-1; margin-right:2px}
      &[data-mode="bad"] .tt{text-align:right}
      &[data-mode="ok"] .topbar .mini{display:none}
    `,
  }),

  "action-sheet": demo({
    modes: ["✗ 系统弹窗 · 取消挨着删除", "✓ 底部动作面板 · 危险项分开"],
    cap: "点「更多」，然后想象自己是在公交车上单手操作。✗ 一侧：弹窗跳在屏幕正中，「删除」和「取消」并排挨着，两个按钮长得还一样，手一抖就删了；✓ 一侧：选项从底部升起来，落在拇指够得到的地方，删除单独一行标红，取消隔开一段距离自成一块。",
    html:
      statusBar() + appBar("相册") +
      '<div class="body">' + rows(6) + "</div>" +
      '<div class="foot"><button class="open btn" type="button">更多</button></div>' +
      '<div class="scrim"></div>' +
      '<div class="as">' +
        '<div class="grp">' +
          '<div class="hd">对这张照片</div>' +
          '<div class="it">分享</div><div class="it">保存到本地</div>' +
          '<div class="it danger">删除</div>' +
        "</div>" +
        '<div class="grp cancel"><div class="it">取消</div></div>' +
      "</div>",
    css: `
      & .body{position:absolute; top:66px; left:0; right:0; bottom:52px; overflow-y:auto}
      & .foot{position:absolute; left:0; right:0; bottom:0; padding:8px 12px calc(8px + var(--dm-safe)); background:var(--panel); border-top:1px solid var(--line)}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:10px 0; cursor:pointer; font-family:inherit}
      & .scrim{position:absolute; inset:0; background:var(--scrim); opacity:0; pointer-events:none; transition:opacity .24s var(--ease); z-index:8}
      & .as{position:absolute; z-index:9; opacity:0; pointer-events:none}
      & .grp{background:var(--panel); border-radius:13px; overflow:hidden}
      & .hd{font-size:10.5px; color:var(--fg-faint); text-align:center; padding:9px 0; border-bottom:1px solid var(--line-soft); font-family:var(--mono)}
      & .it{font-size:13px; text-align:center; padding:12px 0; border-bottom:1px solid var(--line-soft); cursor:pointer}
      & .it:last-child{border-bottom:none}
      & .it.danger{color:var(--bad); font-weight:600}
      &[data-open="1"] .scrim{opacity:1; pointer-events:auto}
      &[data-open="1"] .as{opacity:1; pointer-events:auto}
      /* ✗：屏幕正中的系统式弹窗，删除和取消并排、同一个样子 */
      &[data-mode="bad"] .as{left:26px; right:26px; top:44%; transform:scale(.94); transition:opacity .18s var(--ease), transform .18s var(--ease)}
      &[data-mode="bad"][data-open="1"] .as{transform:none}
      &[data-mode="bad"] .grp{border-radius:12px}
      &[data-mode="bad"] .hd{display:block}
      &[data-mode="bad"] .as{display:flex; flex-direction:column}
      &[data-mode="bad"] .cancel{margin-top:0; border-radius:0 0 12px 12px; border-top:1px solid var(--line-soft)}
      &[data-mode="bad"] .grp{border-radius:12px 12px 0 0}
      &[data-mode="bad"] .it.danger{color:var(--fg); font-weight:400}
      /* ✓：从下沿升起，取消独立成块 */
      &[data-mode="ok"] .as{left:9px; right:9px; bottom:0; padding-bottom:calc(9px + var(--dm-safe)); transform:translateY(102%); transition:transform .3s var(--ease), opacity .2s var(--ease)}
      &[data-mode="ok"][data-open="1"] .as{transform:translateY(0)}
      &[data-mode="ok"] .cancel{margin-top:8px}
      &[data-mode="ok"] .cancel .it{font-weight:600}
    `,
    js: `
      function close() { root.dataset.open = "0"; }
      api.on(api.q(".open"), "click", function () { root.dataset.open = "1"; });
      api.on(api.q(".scrim"), "click", close);
      api.on(api.q(".cancel"), "click", close);
      api.onMode(close);
    `,
  }),

  "double-tap-zoom": demo({
    modes: ["✗ 每一下都等 300ms", "✓ 点了就响应"],
    cap: "连点那颗按钮五下，看它右边报出来的响应耗时。✗ 一侧：浏览器要先等一等，确认你不是在双击放大，每一下都白等 300 毫秒——用户的感觉不是「慢」，是「这按钮是不是坏了」；✓ 一侧：声明了视口宽度、关掉双击缩放之后，按下即响应。",
    note: "现代浏览器在写了 width=device-width 的页面上已经默认去掉了这 300ms，✗ 一侧是用真的 setTimeout(300) 把那段历史行为原样复现出来。",
    html:
      statusBar() +
      '<div class="pad"><div class="tip">连点几下</div>' +
        '<button class="tapbtn" type="button">点我</button>' +
        '<div class="log"></div>' +
      "</div>",
    css: `
      & .pad{position:absolute; top:44px; left:0; right:0; padding:0 16px; text-align:center}
      & .tip{font-family:var(--mono); font-size:10px; color:var(--fg-faint); margin-bottom:14px}
      & .tapbtn{width:100%; border:none; border-radius:12px; background:var(--accent); color:#fff; font-size:14px; font-weight:600; padding:16px 0; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent}
      & .tapbtn:active{transform:scale(.97)}
      & .log{margin-top:16px; font-family:var(--mono); font-size:10.5px; line-height:1.9; color:var(--fg-dim); text-align:left}
      & .log .slow{color:var(--bad)}
      & .log .fast{color:var(--ok)}
    `,
    js: `
      var log = api.q(".log"), lines = [];
      api.on(api.q(".tapbtn"), "pointerdown", function () {
        var t0 = performance.now();
        function fire() {
          var ms = Math.round(performance.now() - t0);
          var slow = api.mode() === "bad";
          lines.unshift('<div><span class="' + (slow ? "slow" : "fast") + '">' + ms + "ms</span> 后才收到这一下</div>");
          log.innerHTML = lines.slice(0, 6).join("");
        }
        if (api.mode() === "bad") api.timer(fire, 300);
        else fire();
      });
      api.onMode(function () { lines = []; log.innerHTML = ""; });
    `,
  }),

  "status-bar": demo({
    modes: ["✗ 深色头图配深色状态栏", "✓ 状态栏跟着背景切"],
    cap: "看屏幕最顶上那行时间和信号。✗ 一侧：页面换成了深色头图，状态栏文字还是黑的，时间几乎糊在背景里；✓ 一侧：同一块头图，状态栏切成浅色字，读得清。切换时只有那一行在变，其余一模一样。",
    note: "真机上这一行归系统管，网页侧由 meta name=theme-color 和 apple-mobile-web-app-status-bar-style 影响；画框里直接改那行字的颜色，看到的结果是一样的。",
    html:
      '<div class="hero"><div class="ht">周末特辑</div><div class="hs">12 篇新内容</div></div>' +
      '<div class="dm-status sb"><span>9:41</span><span class="dm-status-r"><i class="dm-sig"></i><i class="dm-bat"></i></span></div>' +
      '<div class="body">' + rows(5) + "</div>",
    css: `
      & .hero{position:absolute; top:0; left:0; right:0; height:150px; background:linear-gradient(150deg,#2a2622,#4a3527); color:#fff; padding:52px 16px 0}
      & .ht{font-size:19px; font-weight:700}
      & .hs{font-size:12px; opacity:.72; margin-top:3px}
      & .body{position:absolute; top:150px; left:0; right:0; bottom:0; overflow-y:auto; background:var(--bg)}
      & .sb{z-index:5}
      &[data-mode="bad"] .sb{color:#1c1a16}
      &[data-mode="ok"] .sb{color:#fff}
    `,
  }),

  "immersive": demo({
    modes: ["✗ 内容顶到刘海底下", "✓ 背景延伸 · 内容避让"],
    cap: "看标题和返回箭头的位置。✗ 一侧：为了「沉浸」把内容也顶到了最上面，标题被刘海切掉一角，返回箭头和状态栏时间叠在一起；✓ 一侧：背景照样铺满整块屏幕，但文字和按钮从状态栏下面开始排——延伸的是背景，不是内容。",
    html:
      '<div class="hero"></div>' +
      '<div class="ov"><span class="dm-back">‹</span><span class="ttl">城市漫游指南</span></div>' +
      statusBar() +
      '<div class="body">' + rows(5) + "</div>",
    css: `
      & .hero{position:absolute; top:0; left:0; right:0; height:170px; background:linear-gradient(160deg,#3a3128,#7a4a20)}
      & .ov{position:absolute; left:0; right:0; z-index:4; display:flex; align-items:center; gap:8px; padding:0 14px; color:#fff; font-weight:700}
      & .ttl{font-size:16px}
      & .ov .dm-back{color:#fff; font-size:18px}
      & .body{position:absolute; top:170px; left:0; right:0; bottom:0; overflow-y:auto; background:var(--bg)}
      & .dm-status{color:#fff}
      &[data-mode="bad"] .ov{top:6px}
      &[data-mode="ok"] .ov{top:42px}
    `,
  }),

  "haptic": demo({
    modes: ["✗ 一震 200ms / 到处震", "✓ 关键动作 12ms 轻震"],
    cap: "在<b>安卓手机</b>上用手指点这两颗按钮：✗ 一侧震足 200 毫秒，像收到一条错误提示，而它只是加了个收藏；✓ 一侧 12 毫秒一下，手上像被轻轻点了一下，眼睛都不用离开屏幕就知道成了。桌面上没有马达，右侧会把每次真实发出的调用打出来。",
    note: "用的是 Vibration API：安卓 Chrome 真的会震；iOS Safari 至今不支持，所以 iPhone 上只会看到调用记录——这本身就是这条术语要提醒的事，触感不能当成唯一反馈。",
    html:
      statusBar() +
      '<div class="pad"><div class="tip">点一下试试</div>' +
        '<button class="fav" type="button"><span class="ic">♡</span><span class="lb">收藏</span></button>' +
        '<div class="log"></div>' +
        '<div class="sup"></div>' +
      "</div>",
    css: `
      & .pad{position:absolute; top:44px; left:0; right:0; padding:0 16px; text-align:center}
      & .tip{font-family:var(--mono); font-size:10px; color:var(--fg-faint); margin-bottom:16px}
      & .fav{width:100%; border:1px solid var(--line); border-radius:13px; background:var(--panel); color:var(--fg); padding:16px 0; cursor:pointer; font-family:inherit; display:flex; flex-direction:column; align-items:center; gap:6px; -webkit-tap-highlight-color:transparent}
      & .fav .ic{font-size:24px; line-height:1; transition:transform .22s var(--spring), color .2s var(--ease)}
      & .fav .lb{font-size:11.5px; color:var(--fg-dim)}
      & .fav.on .ic{color:var(--bad); transform:scale(1.18)}
      & .log{margin-top:14px; font-family:var(--mono); font-size:10.5px; line-height:1.85; color:var(--fg-dim); text-align:left}
      & .sup{margin-top:10px; font-family:var(--mono); font-size:9.5px; color:var(--fg-faint)}
    `,
    js: `
      var lines = [], log = api.q(".log"), fav = api.q(".fav");
      api.q(".sup").textContent = navigator.vibrate ? "这台设备支持 Vibration API" : "这台设备没有 Vibration API（iOS / 桌面）";
      api.on(fav, "click", function () {
        fav.classList.toggle("on");
        var ms = api.mode() === "bad" ? 200 : 12;
        var done = navigator.vibrate ? navigator.vibrate(ms) : false;
        lines.unshift("vibrate(" + ms + ") → " + (done ? "已发出" : "设备不支持"));
        log.innerHTML = lines.slice(0, 5).map(function (l) { return "<div>" + l + "</div>"; }).join("");
      });
      api.onMode(function () { lines = []; log.innerHTML = ""; fav.classList.remove("on"); });
    `,
  }),

  "offline-state": demo({
    modes: ["✗ 一直转圈", "✓ 说清楚 + 能重试"],
    cap: "点「加载数据」，这次请求一定会失败。✗ 一侧：转圈转到天荒地老，用户不知道是自己网不好、还是应用坏了，只能杀掉重开；✓ 一侧：几秒后就收手，说明是网络断了、上次数据是什么时候的，并给一颗重试——再点一次会成功。",
    html:
      statusBar() + appBar("我的数据") +
      '<div class="area"><div class="spin"></div>' +
        '<div class="fail"><div class="fi">⚡</div><div class="ft">连不上网络</div>' +
        '<div class="fd">检查一下 Wi-Fi 或流量。下面是 3 分钟前缓存的内容。</div>' +
        '<button class="retry" type="button">重试</button></div>' +
        '<div class="okbox">加载成功 · 共 12 条</div>' +
      "</div>" +
      '<div class="cache">' + rows(3) + "</div>" +
      '<div class="foot"><button class="go btn" type="button">加载数据</button></div>',
    css: `
      & .area{position:absolute; top:76px; left:0; right:0; height:186px; display:flex; align-items:center; justify-content:center; padding:0 20px; text-align:center}
      & .spin{width:26px; height:26px; border-radius:50%; border:2.5px solid var(--line); border-top-color:var(--accent); animation:dm-spin .8s linear infinite; display:none}
      @keyframes dm-spin{to{transform:rotate(360deg)}}
      & .fail{display:none}
      & .fi{font-size:22px; margin-bottom:6px}
      & .ft{font-size:13.5px; font-weight:700; margin-bottom:5px}
      & .fd{font-size:11px; color:var(--fg-dim); line-height:1.6}
      & .retry{margin-top:12px; border:1px solid var(--accent); background:transparent; color:var(--accent); font-family:var(--mono); font-size:11px; padding:6px 18px; border-radius:8px; cursor:pointer}
      & .okbox{display:none; font-size:12px; color:var(--ok)}
      & .cache{position:absolute; top:262px; left:0; right:0; opacity:.55}
      & .foot{position:absolute; left:0; right:0; bottom:0; padding:8px 12px calc(8px + var(--dm-safe)); background:var(--panel); border-top:1px solid var(--line)}
      & .btn{width:100%; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:10px 0; cursor:pointer; font-family:inherit}
      &[data-st="loading"] .spin{display:block}
      &[data-st="fail"] .fail{display:block}
      &[data-st="done"] .okbox{display:block}
      &[data-mode="bad"] .cache{display:none}
    `,
    js: `
      var tries = 0;
      function load() {
        root.dataset.st = "loading";
        if (api.mode() === "bad") return;                 // ✗：请求挂了没人接，圈就一直转
        api.timer(function () {
          tries++;
          root.dataset.st = tries > 1 ? "done" : "fail";   // 第二次重试放行，让用户看到「重试真的有用」
        }, 1200);
      }
      api.on(api.q(".go"), "click", load);
      api.on(api.q(".retry"), "click", load);
      api.onMode(function () { tries = 0; root.dataset.st = "idle"; });
    `,
  }),

  "share-preview": demo({
    modes: ["✗ 让抓取器自己猜", "✓ 指定标题 · 描述 · 缩略图"],
    cap: "同一个链接被转发到聊天里的样子。✗ 一侧：没写分享用的元信息，抓取器只好抓页面标题和第一段能找到的文字——标题是模板占位符，描述是导航栏，图是站点 logo；✓ 一侧：三样都指定了，卡片一眼能看出这条链接值不值得点。",
    html:
      statusBar() + appBar("聊天") +
      '<div class="chat">' +
        '<div class="bub in">看看这个</div>' +
        '<div class="bub out"><div class="cardx">' +
          '<div class="thumb"></div>' +
          '<div class="ci"><div class="cti"></div><div class="cde"></div><div class="cdo">example.com</div></div>' +
        "</div></div>" +
      "</div>",
    css: `
      & .chat{position:absolute; top:74px; left:0; right:0; padding:0 12px; display:flex; flex-direction:column; gap:10px}
      & .bub{max-width:78%; font-size:12px; padding:8px 11px; border-radius:12px; background:var(--panel); border:1px solid var(--line-soft)}
      & .bub.out{align-self:flex-end; padding:0; overflow:hidden; max-width:88%}
      & .cardx{width:200px; background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; text-align:left}
      & .thumb{height:96px; background:var(--bg-2); display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-size:10px; color:var(--fg-faint)}
      & .ci{padding:9px 10px}
      & .cti{font-size:12px; font-weight:600; line-height:1.4; margin-bottom:4px}
      & .cde{font-size:10.5px; color:var(--fg-dim); line-height:1.5; margin-bottom:6px}
      & .cdo{font-family:var(--mono); font-size:9.5px; color:var(--fg-faint)}
      &[data-mode="bad"] .thumb{height:40px}
      &[data-mode="bad"] .thumb::after{content:"没有图，回落成 logo"}
      &[data-mode="ok"] .thumb{background:linear-gradient(140deg,#b3550f,#e0a05a)}
    `,
    js: `
      var ti = api.q(".cti"), de = api.q(".cde");
      function sync() {
        if (api.mode() === "bad") {
          ti.textContent = "{{page.title}} - 官网";
          de.textContent = "首页 产品 价格 关于我们 登录 注册 简体中文";
        } else {
          ti.textContent = "三分钟看懂安全区：为什么你的按钮总被挡住";
          de.textContent = "全面屏底部那条指示条会压掉 fixed 元素的下半截，模拟器看不出来。";
        }
      }
      api.onMode(sync);
      sync();
    `,
  }),

  "desktop-frame": demo({
    frame: "wide",
    modes: ["✗ 直接拉满整个窗口", "✓ 居中收进一台手机"],
    cap: "把这个 H5 放到电脑浏览器里打开。✗ 一侧：为手机写的版式被拉到一千多像素宽，一行字横穿整个屏幕，按钮长得像条横幅，用户第一反应是「这页面坏了」；✓ 一侧：内容收在一个手机宽度的画框里居中，两侧留给背景——同一套代码，不必为桌面重做一版。",
    html:
      '<div class="deskbg"><div class="app">' +
        '<div class="ab">城市漫游指南</div>' +
        '<p class="tx">全面屏底部那条 Home 指示条会压掉 fixed 元素的下半截，模拟器看不出来，只有真机会暴露。给底部操作栏的内边距接上安全区，再给内容区补等高的底部内边距。</p>' +
        rows(3) +
        '<button class="btn" type="button">开始阅读</button>' +
      "</div></div>",
    css: `
      & .deskbg{min-height:330px; padding:22px 0; background:var(--bg-2)}
      & .app{background:var(--bg); border:1px solid var(--line)}
      & .ab{font-size:15px; font-weight:700; padding:12px 14px; border-bottom:1px solid var(--line-soft)}
      & .tx{font-size:12.5px; line-height:1.75; color:var(--fg-dim); margin:0; padding:12px 14px}
      & .btn{display:block; border:none; border-radius:9px; background:var(--accent); color:#fff; font-size:13px; font-weight:600; padding:12px 0; cursor:pointer; font-family:inherit; margin:14px}
      &[data-mode="bad"] .app{width:100%; border-radius:0}
      &[data-mode="bad"] .btn{width:calc(100% - 28px)}
      &[data-mode="ok"] .deskbg{display:flex; justify-content:center}
      &[data-mode="ok"] .app{width:390px; border-radius:16px; overflow:hidden; box-shadow:0 14px 40px rgba(0,0,0,.14)}
      &[data-mode="ok"] .btn{width:calc(100% - 28px)}
    `,
  }),

  "orientation": demo({
    frame: "land",
    modes: ["✗ 高度写死 · 内容被切", "✓ 横屏重排"],
    cap: "手机横过来了，屏幕只剩 250 像素高。✗ 一侧：版式还按竖屏那套排，头图仍占 170px，正文和按钮被挤出屏幕外，滚也滚不到；✓ 一侧：头图缩成一条，内容改成左右两栏，操作键留在右下角——横屏不是把竖屏拉宽，是另一套排法。",
    html:
      '<div class="wrap">' +
        '<div class="hero"><span>城市漫游指南</span></div>' +
        '<div class="main"><p class="tx">全面屏底部那条指示条会压掉 fixed 元素的下半截。</p>' + rows(3) + "</div>" +
        '<div class="act"><button class="btn" type="button">开始阅读</button></div>' +
      "</div>",
    css: `
      & .wrap{position:absolute; inset:0; padding:8px 30px 8px 34px}
      & .hero{background:linear-gradient(140deg,#3a3128,#7a4a20); color:#fff; font-size:13px; font-weight:700; display:flex; align-items:flex-end; padding:10px 12px; border-radius:10px}
      & .tx{font-size:11.5px; line-height:1.6; color:var(--fg-dim); margin:0 0 6px}
      & .btn{border:none; border-radius:8px; background:var(--accent); color:#fff; font-size:12px; font-weight:600; padding:9px 18px; cursor:pointer; font-family:inherit}
      &[data-mode="bad"] .hero{height:170px}
      &[data-mode="bad"] .main{margin-top:10px}
      &[data-mode="bad"] .act{margin-top:12px}
      &[data-mode="ok"] .wrap{display:flex; gap:12px}
      &[data-mode="ok"] .hero{width:40%; height:auto; flex:none}
      &[data-mode="ok"] .main{flex:1; min-width:0; overflow-y:auto}
      &[data-mode="ok"] .act{position:absolute; right:30px; bottom:10px}
    `,
  }),

  "webview": demo({
    modes: ["✗ 页面自己又画了一条导航", "✓ 只留容器那一条"],
    cap: "这台手机上，页面是跑在 App 的内嵌浏览器里的——最上面那条灰色导航栏是<b>容器给的</b>，不归你管。✗ 一侧：页面自己又画了一条返回栏，屏幕上两个返回箭头，点页面那个还没反应（历史栈到头了，H5 退无可退）；✓ 一侧：页面不重复画，标题交给容器，省下的那 44 像素还给内容。",
    note: "容器栏在画框里是模拟的；真机上它由宿主 App 绘制，H5 既改不了它的颜色，也删不掉它。",
    html:
      statusBar() +
      '<div class="host"><span class="hb">‹</span><span class="ht">example.com</span><span class="hm">···</span></div>' +
      '<div class="own"><span class="dm-back">‹</span><span>商品详情</span></div>' +
      '<div class="body">' + rows(7) + "</div>" +
      '<div class="toast">页面里的返回按钮没有反应：这已经是这个 WebView 的第一页</div>',
    css: `
      & .host{position:absolute; top:34px; left:0; right:0; height:38px; z-index:4; display:flex; align-items:center; gap:8px; padding:0 12px; background:var(--bg-2); border-bottom:1px solid var(--line); font-size:11.5px; color:var(--fg-dim)}
      & .hb{font-size:15px}
      & .ht{flex:1; font-family:var(--mono); font-size:10.5px; color:var(--fg-faint)}
      & .own{position:absolute; top:72px; left:0; right:0; height:34px; z-index:3; display:flex; align-items:center; gap:7px; padding:0 12px; background:var(--panel); border-bottom:1px solid var(--line-soft); font-size:12px; font-weight:600; cursor:pointer}
      & .body{position:absolute; left:0; right:0; bottom:0; overflow-y:auto}
      & .toast{position:absolute; left:20px; right:20px; bottom:26px; z-index:9; background:rgba(28,26,22,.9); color:#fff; font-size:11px; line-height:1.5; padding:9px 12px; border-radius:9px; opacity:0; transform:translateY(6px); transition:opacity .22s var(--ease), transform .22s var(--ease); pointer-events:none}
      &[data-toast="1"] .toast{opacity:1; transform:none}
      &[data-mode="bad"] .body{top:106px}
      &[data-mode="ok"] .own{display:none}
      &[data-mode="ok"] .body{top:72px}
    `,
    js: `
      api.on(api.q(".own"), "click", function () {
        root.dataset.toast = "1";
        api.timer(function () { root.dataset.toast = "0"; }, 1800);
      });
      api.onMode(function () { root.dataset.toast = "0"; });
    `,
  }),
};

/* ------------------------------------------------------------------ 动效 */

const MOTION = {

  "easing": demo({
    replay: true,
    cap: "点「重放」，三条同时出发、同时到达，差别全在中间那段。linear 从头到尾一个速度，像传送带上的货；ease-out 起步快、临到位收住，是界面里绝大多数元素该有的样子；带回弹的那条冲过头再收回来，用在需要一点情绪的地方——用多了就吵。",
    html:
      '<div class="lane"><span class="tag2">linear</span><div class="track"><i class="ball b1"></i></div></div>' +
      '<div class="lane"><span class="tag2">ease-out</span><div class="track"><i class="ball b2"></i></div></div>' +
      '<div class="lane"><span class="tag2">回弹</span><div class="track"><i class="ball b3"></i></div></div>' +
      '<div class="curveline">三条都是 600ms</div>',
    css: `
      & .lane{position:relative; margin:0 16px 26px; padding-top:52px}
      & .lane:first-child{margin-top:46px}
      & .tag2{position:absolute; top:32px; left:0; font-family:var(--mono); font-size:10px; color:var(--fg-faint); letter-spacing:.04em}
      & .track{position:relative; height:2px; background:var(--line); border-radius:1px}
      & .ball{position:absolute; top:-9px; left:0; width:20px; height:20px; border-radius:50%; background:var(--accent); display:block}
      & .run .b1{animation:dm-run 600ms linear forwards}
      & .run .b2{animation:dm-run 600ms cubic-bezier(.16,1,.3,1) forwards}
      & .run .b3{animation:dm-run 600ms cubic-bezier(.34,1.56,.64,1) forwards}
      & .curveline{position:absolute; bottom:22px; left:0; right:0; text-align:center; font-family:var(--mono); font-size:10px; color:var(--fg-faint)}
      @keyframes dm-run{ from{transform:translateX(0)} to{transform:translateX(var(--dm-run,178px))} }
    `,
    js: `
      var scr = root.querySelector(".dm-screen");
      function run() {
        var w = api.q(".track").clientWidth - 20;
        scr.style.setProperty("--dm-run", w + "px");
        api.qa(".ball").forEach(function (b) { b.style.animation = "none"; });
        void scr.offsetWidth;
        api.qa(".ball").forEach(function (b) { b.style.animation = ""; });
        root.classList.remove("run");
        void scr.offsetWidth;
        root.classList.add("run");
      }
      api.timer(run, 120);   // 重放按钮会整段重挂 DOM，这里只管第一次
    `,
  }),

  "transition": demo({
    modes: ["✗ 状态瞬间跳过去", "✓ 用过渡接上"],
    cap: "点那一行展开、再收起，来回切两侧各做一次。✗ 一侧：面板一帧之内从没有变成有，眼睛来不及跟，用户得回头确认「刚才是不是我点的」；✓ 一侧：220 毫秒把两个状态接上，视线跟着高度长出来，不用重新找位置。",
    html:
      statusBar() + appBar("常见问题") +
      '<div class="lst">' +
        '<div class="acc"><div class="q"><span>下单后能改地址吗</span><span class="cv">›</span></div>' +
          '<div class="a"><p>发货前可以在订单详情页自助修改一次；已发货的需要联系客服。</p></div></div>' +
        '<div class="acc"><div class="q"><span>多久能到</span><span class="cv">›</span></div>' +
          '<div class="a"><p>同城次日达，跨省 2–4 天。</p></div></div>' +
      "</div>",
    css: `
      & .lst{position:absolute; top:66px; left:0; right:0}
      & .acc{border-bottom:1px solid var(--line-soft); background:var(--panel)}
      & .q{display:flex; align-items:center; justify-content:space-between; padding:13px 14px; font-size:12.5px; cursor:pointer}
      & .cv{color:var(--fg-faint); display:inline-block}
      & .a{overflow:hidden; height:0}
      & .a p{margin:0; padding:0 14px 13px; font-size:11.5px; line-height:1.7; color:var(--fg-dim)}
      & .acc.on .a{height:auto}
      &[data-mode="ok"] .a{transition:height .22s var(--ease)}
      &[data-mode="ok"] .cv{transition:transform .22s var(--ease)}
      &[data-mode="ok"] .acc.on .cv{transform:rotate(90deg)}
      &[data-mode="bad"] .acc.on .cv{transform:rotate(90deg)}
    `,
    js: `
      api.qa(".acc").forEach(function (acc) {
        var a = acc.querySelector(".a"), p = acc.querySelector("p");
        api.on(acc.querySelector(".q"), "click", function () {
          var open = acc.classList.toggle("on");
          // 高度过渡要有具体数值可算，auto 是过渡不了的——这行本身就是这条术语的坑
          a.style.height = open ? p.offsetHeight + 13 + "px" : "0px";
        });
      });
      api.onMode(function () {
        api.qa(".acc").forEach(function (acc) { acc.classList.remove("on"); acc.querySelector(".a").style.height = "0px"; });
      });
    `,
  }),

  "duration": demo({
    replay: true,
    cap: "点「重放」，三块面板同时展开，只差时长。80ms 那块动完你还没看清它从哪儿长出来，等于没做；700ms 那块每点一次都要等，第三次就开始烦；240ms 左右是界面里绝大多数展开、切换、淡入该待的区间。",
    html:
      '<div class="row2"><span class="lb">80ms</span><div class="pn p1"></div></div>' +
      '<div class="row2"><span class="lb">240ms</span><div class="pn p2"></div></div>' +
      '<div class="row2"><span class="lb">700ms</span><div class="pn p3"></div></div>' +
      '<div class="foot2">短了看不见 · 长了要等</div>',
    css: `
      & .row2{margin:0 16px 20px}
      & .row2:first-child{margin-top:52px}
      & .lb{font-family:var(--mono); font-size:10px; color:var(--fg-faint); display:block; margin-bottom:6px}
      & .pn{height:52px; border-radius:10px; background:var(--accent); opacity:.9; transform-origin:0 50%; transform:scaleX(0)}
      & .run .p1{animation:dm-grow 80ms var(--ease) forwards}
      & .run .p2{animation:dm-grow 240ms var(--ease) forwards}
      & .run .p3{animation:dm-grow 700ms var(--ease) forwards}
      & .foot2{position:absolute; bottom:24px; left:0; right:0; text-align:center; font-family:var(--mono); font-size:10px; color:var(--fg-faint)}
      @keyframes dm-grow{ from{transform:scaleX(0)} to{transform:scaleX(1)} }
    `,
    js: `
      api.timer(function () { root.classList.add("run"); }, 140);
    `,
  }),

  "spring": demo({
    replay: true,
    modes: ["✗ 匀速推到位", "✓ 弹簧收尾"],
    cap: "点「重放」看卡片弹出来的那一下。✗ 一侧到位就停，像被人推了一把；✓ 一侧临到位置时略微冲过头再收回来，像有质量的东西自己停下——差别只在最后 15% 的行程里，但用户会说「这个更贵」。",
    note: "冲过头的幅度别超过 6%：过冲一大，「有弹性」就变成「在抖」。",
    html:
      statusBar() +
      '<div class="pad"><div class="tip">卡片入场</div>' +
        '<div class="cardz"><div class="dm-avatar big"></div><div class="dm-lines"><b style="width:60%"></b><i style="width:82%"></i></div></div>' +
        '<div class="cardz two"><div class="dm-avatar big"></div><div class="dm-lines"><b style="width:52%"></b><i style="width:74%"></i></div></div>' +
      "</div>",
    css: `
      & .pad{position:absolute; top:44px; left:0; right:0; padding:0 14px}
      & .tip{font-family:var(--mono); font-size:10px; color:var(--fg-faint); margin-bottom:12px}
      & .cardz{display:flex; gap:10px; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px; margin-bottom:12px; transform:translateY(26px) scale(.96); opacity:0}
      &[data-mode="bad"] .run .cardz{animation:dm-in2 420ms linear forwards}
      &[data-mode="ok"] .run .cardz{animation:dm-in2 480ms cubic-bezier(.34,1.42,.64,1) forwards}
      & .run .two{animation-delay:90ms}
      @keyframes dm-in2{ to{transform:none; opacity:1} }
    `,
    js: `
      function run() {
        root.classList.remove("run");
        void root.offsetWidth;
        root.classList.add("run");
      }
      api.timer(run, 120);
      api.onMode(run);
    `,
  }),

  "micro-interaction": demo({
    modes: ["✗ 只有颜色变了一下", "✓ 一整套微反馈"],
    cap: "点那颗心，两侧各点两下。✗ 一侧：图标闷头变了个色，用户不确定这一下有没有算数；✓ 一侧：图标弹一下、数字往上滚一格、周围散开一圈——三样加起来不到 300 毫秒，但「我这一下生效了」这件事不用再去别处确认。",
    html:
      statusBar() +
      '<div class="pad">' +
        '<div class="post"><div class="dm-avatar big"></div><div class="dm-lines"><b style="width:64%"></b><i style="width:86%"></i></div></div>' +
        '<div class="bar2"><button class="like" type="button"><span class="ic">♥</span><span class="num"><span class="roll"><i>128</i><i>129</i></span></span></button>' +
        '<span class="ring2"></span></div>' +
      "</div>",
    css: `
      & .pad{position:absolute; top:44px; left:0; right:0; padding:0 16px}
      & .post{display:flex; gap:10px; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px}
      & .bar2{position:relative; margin-top:16px; display:flex; align-items:center}
      & .like{position:relative; display:flex; align-items:center; gap:8px; border:none; background:transparent; cursor:pointer; font-family:inherit; color:var(--fg-dim); padding:6px 4px; -webkit-tap-highlight-color:transparent}
      & .ic{font-size:22px; line-height:1; color:var(--fg-faint)}
      & .num{display:inline-block; height:15px; overflow:hidden; font-family:var(--mono); font-size:12.5px}
      & .roll{display:block}
      & .roll i{display:block; height:15px; font-style:normal}
      & .ring2{position:absolute; left:11px; top:50%; width:26px; height:26px; margin:-13px 0 0 -13px; border-radius:50%; border:2px solid var(--bad); opacity:0; pointer-events:none}
      &[data-liked="1"] .ic{color:var(--bad)}
      &[data-liked="1"] .roll{transform:translateY(-15px)}
      /* ✓：弹一下 + 数字滚一格 + 散一圈 */
      &[data-mode="ok"] .ic{transition:transform .26s var(--spring), color .2s var(--ease)}
      &[data-mode="ok"] .roll{transition:transform .26s var(--ease)}
      &[data-mode="ok"][data-liked="1"] .ic{transform:scale(1.24)}
      &[data-mode="ok"][data-liked="1"] .ring2{animation:dm-ring .5s var(--ease)}
      /* ✗：只有颜色，数字直接跳 */
      &[data-mode="bad"] .ic{transition:color .12s linear}
      @keyframes dm-ring{ 0%{opacity:.9; transform:scale(.5)} 100%{opacity:0; transform:scale(2.1)} }
    `,
    js: `
      api.on(api.q(".like"), "click", function () {
        root.dataset.liked = root.dataset.liked === "1" ? "0" : "1";
      });
      api.onMode(function () { root.dataset.liked = "0"; });
    `,
  }),

  "scale-feedback": demo({
    modes: ["✗ 按下缩到 0.85", "✓ 按下缩到 0.97"],
    cap: "按住两侧的按钮各三秒再松开。✗ 一侧缩到 0.85，整块塌下去一截，文字跟着糊——像按坏了；✓ 一侧只缩 3%，加上一点点压暗，手指底下有东西在回应，但界面没有变形。",
    html:
      statusBar() +
      '<div class="pad"><div class="tip">按住不放</div>' +
        '<button class="big2" type="button">立即预约</button>' +
        '<div class="two2"><button class="sm" type="button">取消</button><button class="sm" type="button">稍后</button></div>' +
      "</div>",
    css: `
      & .pad{position:absolute; top:44px; left:0; right:0; padding:0 16px}
      & .tip{font-family:var(--mono); font-size:10px; color:var(--fg-faint); margin-bottom:14px}
      & .big2{width:100%; border:none; border-radius:13px; background:var(--accent); color:#fff; font-size:14.5px; font-weight:600; padding:16px 0; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent}
      & .two2{display:flex; gap:10px; margin-top:12px}
      & .sm{flex:1; border:1px solid var(--line); border-radius:11px; background:var(--panel); color:var(--fg); font-size:12.5px; padding:11px 0; cursor:pointer; font-family:inherit; -webkit-tap-highlight-color:transparent}
      & .big2, & .sm{transition:transform .12s var(--ease), filter .12s var(--ease)}
      &[data-mode="bad"] .big2:active, &[data-mode="bad"] .sm:active{transform:scale(.85)}
      &[data-mode="ok"] .big2:active, &[data-mode="ok"] .sm:active{transform:scale(.97); filter:brightness(.94)}
    `,
  }),

  "page-transition": demo({
    modes: ["✗ 直接闪过去", "✓ 推入 · 原路退回"],
    cap: "点任意一行进详情，再点左上角返回，两侧各走一遍。✗ 一侧：屏幕整块闪掉换成另一屏，用户说不清新页面是从哪儿来的、返回会回到哪儿；✓ 一侧：详情从右侧推进来盖住列表，返回时原路退回去——方向本身就在告诉用户「你现在在往里走 / 往回走」。",
    html:
      statusBar() +
      '<div class="pg list"><div class="ab">收藏夹</div><div class="ls">' + rows(7) + "</div></div>" +
      '<div class="pg detail"><div class="ab"><span class="bk">‹</span> 详情</div>' +
        '<div class="dt"><div class="cover"></div><p>全面屏底部那条指示条会压掉 fixed 元素的下半截，模拟器看不出来，只有真机会暴露。</p>' + rows(3) + "</div></div>",
    css: `
      & .pg{position:absolute; inset:34px 0 0; background:var(--bg); overflow:hidden}
      & .ab{height:34px; display:flex; align-items:center; gap:6px; padding:0 12px; font-size:12px; font-weight:600; background:var(--panel); border-bottom:1px solid var(--line-soft)}
      & .bk{font-size:16px; color:var(--fg-dim); cursor:pointer}
      & .ls{position:absolute; top:34px; left:0; right:0; bottom:0; overflow-y:auto}
      & .dt{position:absolute; top:34px; left:0; right:0; bottom:0; overflow-y:auto}
      & .cover{height:110px; background:linear-gradient(140deg,#3a3128,#7a4a20)}
      & .dt p{font-size:12px; line-height:1.75; color:var(--fg-dim); margin:0; padding:12px 14px}
      & .detail{z-index:3; transform:translateX(100%)}
      &[data-page="detail"] .detail{transform:none}
      &[data-mode="ok"] .detail{transition:transform .32s var(--ease); box-shadow:-8px 0 24px rgba(0,0,0,.14)}
      &[data-mode="ok"] .list{transition:transform .32s var(--ease)}
      &[data-mode="ok"][data-page="detail"] .list{transform:translateX(-24%)}
    `,
    js: `
      api.qa(".ls .dm-row").forEach(function (r) {
        api.on(r, "click", function () { root.dataset.page = "detail"; });
      });
      api.on(api.q(".bk"), "click", function () { root.dataset.page = "list"; });
      api.onMode(function () { root.dataset.page = "list"; });
    `,
  }),

  "shared-element": demo({
    modes: ["✗ 缩略图和大图各来各的", "✓ 同一块图长过去"],
    cap: "点第一行那张缩略图。✗ 一侧：列表整屏换掉，大图从零淡进来，用户得重新找「我刚点的是哪张」；✓ 一侧：那张图自己从列表里的位置长到详情页的位置，眼睛一路跟着它走，不需要重新定位。返回时它再缩回原处。",
    html:
      statusBar() +
      '<div class="pg list"><div class="ab">相册</div><div class="ls">' +
        '<div class="li"><div class="th"></div><div class="dm-lines"><b style="width:56%"></b><i style="width:78%"></i></div></div>' +
        rows(4) +
      "</div></div>" +
      '<div class="pg detail"><div class="ab"><span class="bk">‹</span> 详情</div>' +
        '<div class="hero"></div><p>点左上角返回，看它怎么回去。</p></div>' +
      '<div class="fly"></div>',
    css: `
      & .pg{position:absolute; inset:34px 0 0; background:var(--bg); overflow:hidden}
      & .ab{height:34px; display:flex; align-items:center; gap:6px; padding:0 12px; font-size:12px; font-weight:600; background:var(--panel); border-bottom:1px solid var(--line-soft)}
      & .bk{font-size:16px; color:var(--fg-dim); cursor:pointer}
      & .ls{position:absolute; top:34px; left:0; right:0; bottom:0; overflow-y:auto}
      & .li{display:flex; gap:10px; align-items:center; padding:10px 14px; border-bottom:1px solid var(--line-soft); cursor:pointer}
      & .th, & .hero{background:linear-gradient(140deg,#b3550f,#e0a05a); border-radius:9px}
      & .th{width:52px; height:52px; flex:none}
      & .hero{margin:12px 14px 0; height:180px; border-radius:12px}
      & .detail p{font-size:11.5px; color:var(--fg-dim); padding:10px 14px; margin:0}
      & .detail{z-index:3; opacity:0; pointer-events:none}
      &[data-page="detail"] .detail{opacity:1; pointer-events:auto}
      &[data-mode="bad"] .detail{transition:opacity .3s var(--ease)}
      & .fly{position:absolute; z-index:9; border-radius:9px; background:linear-gradient(140deg,#b3550f,#e0a05a); opacity:0; pointer-events:none}
      &[data-flying="1"] .fly{opacity:1}
      &[data-flying="1"] .hero{visibility:hidden}
      &[data-flying="1"] .th{visibility:hidden}
    `,
    js: `
      var fly = api.q(".fly"), th = api.q(".th"), hero = api.q(".hero");
      var scr = root.querySelector(".dm-screen");
      function box(el) {
        var a = el.getBoundingClientRect(), b = scr.getBoundingClientRect();
        return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
      }
      // FLIP：先量两端的位置，再让同一块图在两端之间走一趟
      function flip(from, to, radius, after) {
        var f = box(from), t = box(to);
        fly.style.transition = "none";
        fly.style.left = f.x + "px"; fly.style.top = f.y + "px";
        fly.style.width = f.w + "px"; fly.style.height = f.h + "px";
        fly.style.borderRadius = "9px";
        root.dataset.flying = "1";
        void fly.offsetWidth;
        fly.style.transition = "all .38s cubic-bezier(.16,1,.3,1)";
        fly.style.left = t.x + "px"; fly.style.top = t.y + "px";
        fly.style.width = t.w + "px"; fly.style.height = t.h + "px";
        fly.style.borderRadius = radius;
        api.timer(function () { root.dataset.flying = "0"; if (after) after(); }, 400);
      }
      api.on(api.q(".li"), "click", function () {
        root.dataset.page = "detail";
        if (api.mode() === "ok") flip(th, hero, "12px");
      });
      api.on(api.q(".bk"), "click", function () {
        if (api.mode() === "ok") flip(hero, th, "9px", function () { root.dataset.page = "list"; });
        else root.dataset.page = "list";
      });
      api.onMode(function () { root.dataset.page = "list"; root.dataset.flying = "0"; });
    `,
  }),

  "stagger": demo({
    replay: true,
    modes: ["✗ 六条一起冒出来", "✓ 每条错开 45ms"],
    cap: "点「重放」各看两遍。✗ 一侧：六条同时出现，屏幕像闪了一下，用户不知道该先看哪条；✓ 一侧：从上往下依次进场，每条错 45 毫秒，视线自然被带着从第一条读到最后一条。错峰只对入场有意义——一屏二三十条还错峰，最后一条要等到天亮。",
    html:
      statusBar() + appBar("消息") +
      '<div class="ls">' +
        '<div class="it2">' + rows(1) + "</div>" +
        '<div class="it2">' + rows(1) + "</div>" +
        '<div class="it2">' + rows(1) + "</div>" +
        '<div class="it2">' + rows(1) + "</div>" +
        '<div class="it2">' + rows(1) + "</div>" +
        '<div class="it2">' + rows(1) + "</div>" +
      "</div>",
    css: `
      & .ls{position:absolute; top:66px; left:0; right:0}
      & .it2{opacity:0; transform:translateY(12px)}
      & .run .it2{animation:dm-rise .42s var(--ease) forwards}
      &[data-mode="ok"] .run .it2:nth-child(1){animation-delay:0ms}
      &[data-mode="ok"] .run .it2:nth-child(2){animation-delay:45ms}
      &[data-mode="ok"] .run .it2:nth-child(3){animation-delay:90ms}
      &[data-mode="ok"] .run .it2:nth-child(4){animation-delay:135ms}
      &[data-mode="ok"] .run .it2:nth-child(5){animation-delay:180ms}
      &[data-mode="ok"] .run .it2:nth-child(6){animation-delay:225ms}
      @keyframes dm-rise{ to{opacity:1; transform:none} }
    `,
    js: `
      function run() { root.classList.remove("run"); void root.offsetWidth; root.classList.add("run"); }
      api.timer(run, 120);
      api.onMode(run);
    `,
  }),

  "scroll-reveal": demo({
    modes: ["✗ 每次划过都重播一遍", "✓ 只揭示一次"],
    cap: "把列表往下滑，再往回滑，来回两趟。✗ 一侧：同一批卡片每次进入视野都重新淡入一次，用户往回找刚看过的东西，它却在自己动，很快就烦；✓ 一侧：揭示只发生在第一次进入的时候，回滚时它们老老实实待着。",
    note: "两侧都是真的 IntersectionObserver，差别只在 ✓ 那侧看到一次之后就 unobserve。",
    html:
      statusBar() + appBar("发现") +
      '<div class="sc">' +
        '<div class="rv"></div><div class="rv"></div><div class="rv"></div>' +
        '<div class="rv"></div><div class="rv"></div><div class="rv"></div>' +
        '<div class="rv"></div><div class="rv"></div>' +
      "</div>",
    css: `
      & .sc{position:absolute; top:66px; left:0; right:0; bottom:0; overflow-y:auto; padding:10px 14px}
      & .rv{height:88px; border-radius:12px; background:var(--panel); border:1px solid var(--line); margin-bottom:12px; opacity:0; transform:translateY(16px); transition:opacity .45s var(--ease), transform .45s var(--ease)}
      & .rv.seen{opacity:1; transform:none}
    `,
    js: `
      var sc = api.q(".sc");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("seen");
            if (api.mode() === "ok") io.unobserve(en.target);   // ✓：看过就不再管它
          } else if (api.mode() === "bad") {
            en.target.classList.remove("seen");                 // ✗：出了视野就重置，回滚时又演一遍
          }
        });
      }, { root: sc, threshold: 0.15 });
      api.qa(".rv").forEach(function (el) { io.observe(el); });
      api.onMode(function () {
        sc.scrollTop = 0;
        api.qa(".rv").forEach(function (el) { el.classList.remove("seen"); io.observe(el); });
      });
      // 弹层关掉时把观察者一并断开，别让它攥着已经拆掉的 DOM
      api.cleanup(function () { io.disconnect(); });
    `,
  }),

  "parallax": demo({
    modes: ["✗ 头图跑得比手指快", "✓ 0.3 倍的错位"],
    cap: "按住内容往上滑。✗ 一侧：头图以 0.8 倍速反向跑，滑一点点它就飘走了，用户会觉得页面在跟自己较劲；✓ 一侧：0.3 倍，只是让头图比正文慢半拍，产生一点纵深——察觉不到才是对的，一察觉就是过头了。",
    html:
      '<div class="hero"><span class="ht">城市漫游</span></div>' +
      statusBar() +
      '<div class="sc"><div class="spacer"></div><div class="sheetc">' +
        '<p>全面屏底部那条指示条会压掉 fixed 元素的下半截。</p>' + rows(8) +
      "</div></div>",
    css: `
      & .hero{position:absolute; top:0; left:0; right:0; height:200px; background:linear-gradient(160deg,#3a3128,#8a5220); overflow:hidden; will-change:transform}
      & .ht{position:absolute; left:16px; bottom:64px; color:#fff; font-size:19px; font-weight:700}
      & .sc{position:absolute; inset:0; overflow-y:auto; z-index:2}
      & .spacer{height:170px}
      & .sheetc{background:var(--bg); border-radius:16px 16px 0 0; min-height:400px; box-shadow:0 -6px 20px rgba(0,0,0,.12)}
      & .sheetc p{font-size:12px; line-height:1.7; color:var(--fg-dim); margin:0; padding:14px}
      & .dm-status{z-index:3; color:#fff}
    `,
    js: `
      var sc = api.q(".sc"), hero = api.q(".hero");
      function onScroll() {
        var k = api.mode() === "bad" ? 0.8 : 0.3;
        hero.style.transform = "translateY(" + (-sc.scrollTop * k) + "px)";
      }
      api.on(sc, "scroll", onScroll);
      api.onMode(function () { sc.scrollTop = 0; onScroll(); });
    `,
  }),

  "shimmer": demo({
    modes: ["✗ 一动不动的灰块", "✓ 微光扫过"],
    cap: "两侧都是同一套骨架屏，都在等同一个接口。✗ 一侧：灰块一动不动，停够三秒用户就会怀疑是不是卡死了，开始退出重进；✓ 一侧：一道很淡的光每 1.4 秒扫过一次——它不代表进度，只负责说明「这屏还活着，在等」。",
    note: "光要淡、要慢：扫得又快又亮，就从「在加载」变成了「在闪」，比不动还烦人。",
    html:
      statusBar() + appBar("动态") +
      '<div class="sk">' +
        '<div class="sc2"><div class="sq"></div><div class="col"><div class="ln w1"></div><div class="ln w2"></div></div></div>' +
        '<div class="sc2"><div class="sq"></div><div class="col"><div class="ln w3"></div><div class="ln w1"></div></div></div>' +
        '<div class="sc2"><div class="sq"></div><div class="col"><div class="ln w2"></div><div class="ln w3"></div></div></div>' +
        '<div class="bigblk"></div>' +
      "</div>",
    css: `
      & .sk{position:absolute; top:66px; left:0; right:0; padding:14px}
      & .sc2{display:flex; gap:11px; margin-bottom:16px}
      & .sq{width:44px; height:44px; border-radius:10px; flex:none}
      & .col{flex:1; display:flex; flex-direction:column; gap:8px; justify-content:center}
      & .ln{height:9px; border-radius:5px}
      & .w1{width:70%} & .w2{width:88%} & .w3{width:54%}
      & .bigblk{height:120px; border-radius:12px; margin-top:4px}
      & .sq, & .ln, & .bigblk{background:var(--bg-2); border:1px solid var(--line-soft); position:relative; overflow:hidden}
      &[data-mode="ok"] .sq::after, &[data-mode="ok"] .ln::after, &[data-mode="ok"] .bigblk::after{
        content:""; position:absolute; inset:0;
        background:linear-gradient(100deg, transparent 20%, rgba(128,128,128,.22) 50%, transparent 80%);
        transform:translateX(-100%);
        animation:dm-shim 1.4s ease-in-out infinite;
      }
      @keyframes dm-shim{ to{transform:translateX(100%)} }
    `,
  }),

  "reduced-motion": demo({
    modes: ["✗ 无视系统设置", "✓ 尊重「减弱动效」"],
    cap: "两侧都在跑同一段入场。✗ 一侧不管系统怎么设，位移和缩放照做；✓ 一侧在系统打开「减弱动效」时自动退成一次淡入——去系统设置里把它打开再回来，✓ 那侧的动作会消失，✗ 那侧还在动。屏幕底下那行会实时显示当前检测到的值。",
    note: "读的是真的 prefers-reduced-motion 媒体查询（macOS：辅助功能 › 显示 › 减少动态效果；iOS：辅助功能 › 动态效果）。对前庭功能敏感的人来说，这不是偏好，是能不能用的问题。",
    html:
      statusBar() +
      '<div class="pad">' +
        '<div class="cd c1"><div class="dm-avatar big"></div><div class="dm-lines"><b style="width:58%"></b><i style="width:80%"></i></div></div>' +
        '<div class="cd c2"><div class="dm-avatar big"></div><div class="dm-lines"><b style="width:66%"></b><i style="width:72%"></i></div></div>' +
        '<button class="again" type="button">再放一次</button>' +
      "</div>" +
      '<div class="state"></div>',
    css: `
      & .pad{position:absolute; top:48px; left:0; right:0; padding:0 14px}
      & .cd{display:flex; gap:10px; align-items:center; background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px; margin-bottom:12px; opacity:0}
      & .again{width:100%; margin-top:4px; border:1px solid var(--line); background:transparent; color:var(--fg-dim); font-family:var(--mono); font-size:10.5px; padding:7px 0; border-radius:8px; cursor:pointer}
      & .run .cd{animation:dm-big-in .5s var(--ease) forwards}
      & .run .c2{animation-delay:80ms}
      @keyframes dm-big-in{ from{opacity:0; transform:translateY(28px) scale(.9)} to{opacity:1; transform:none} }
      @keyframes dm-fade{ from{opacity:0} to{opacity:1} }
      @media (prefers-reduced-motion: reduce){
        &[data-mode="ok"] .run .cd{animation:dm-fade .3s var(--ease) forwards}
      }
      & .state{position:absolute; left:0; right:0; bottom:calc(14px + var(--dm-safe)); text-align:center; font-family:var(--mono); font-size:9.5px; color:var(--fg-faint); padding:0 10px; line-height:1.6}
    `,
    js: `
      var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      function label() {
        api.q(".state").textContent = mq.matches
          ? "系统当前：减弱动效 已打开"
          : "系统当前：减弱动效 关闭（打开它再看 ✓ 那侧）";
      }
      function run() { root.classList.remove("run"); void root.offsetWidth; root.classList.add("run"); }
      api.on(mq, "change", function () { label(); run(); });
      api.on(api.q(".again"), "click", run);
      api.onMode(run);
      label();
      api.timer(run, 120);
    `,
  }),
};

const DEMOS = Object.assign({}, H5, MOTION);

export { DEMOS };
