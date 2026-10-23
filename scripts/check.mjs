#!/usr/bin/env node
/**
 * finesse-term 仓库自检。
 *
 * 两部分：
 *   1. 数据完整性 —— 交给 term.mjs check
 *   2. 检索回归   —— 一组「用户会怎么说」的真实句子，断言能不能查到该查到的词条，
 *                    以及不该命中的句子确实不命中。改打分算法时这一组是防线。
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TERM = join(ROOT, "skills", "finesse-term", "scripts", "term.mjs");

function run(args) {
  const stdout = execFileSync(process.execPath, [TERM, ...args], { encoding: "utf8" });
  return JSON.parse(stdout);
}

/** [用户原话, 必须出现在前 N 个候选里的词条 id] —— null 表示这句话不该命中任何术语 */
const CASES = [
  ["卡片像便当盒一样大小错落", "bento-grid"],
  ["主卡跨两行", "bento-grid"],
  ["卡片里面和外面的圆角要协调", "radius-consistency"],
  ["横向紧一点纵向松一点", "whitespace"],
  ["白底灰卡，黑底深卡", "surface-hierarchy"],
  ["不用阴影也能分层", "surface-hierarchy"],
  ["横向图库可以拖动也可以点按钮", "horizontal-gallery"],
  ["关掉大图回到刚才那张", "horizontal-gallery"],
  ["用苹果官网的风格做产品介绍页", null],
  ["苹果风", null],

  ["底部按钮被那条黑杠挡住了", "safe-area"],
  ["鼠标放上去变个色", "hover-state"],
  ["点下去也要有一下反馈", "active-state"],
  ["这个页面看着有点土", "easing"],
  ["弹窗底下的页面还能滑", "scroll-lock"],
  ["键盘弹出来把输入框挡住了", "keyboard-push"],
  ["列表一条数据都没有的时候", "empty-state"],
  ["图片加载完页面往下跳", "cls"],
  ["鼠标放到下载按钮上加个小提示", "tooltip"],
  ["打一个字就请求一次太频繁了", "debounce-throttle"],
  ["这个太挤了不透气", "whitespace"],
  ["在微信里打开显示不对", "webview"],
  ["电脑上打开这个 H5 很怪", "desktop-frame"],
  ["列表太长了滚起来卡", "virtual-list"],
  ["字太浅了看不清", "contrast-ratio"],
  ["从下面弹出来半个屏幕", "bottom-sheet"],
  ["按下去没有分量", "press-rebound"],
  ["开关切换太生硬", "elastic-toggle"],
  ["点哪波从哪散", "tap-ripple"],
  ["点赞要有爆炸感", "like-burst"],
  ["打勾要画出来", "checkmark-draw"],
  ["拖动滑块要联动显示", "synced-slider"],
  ["数据要跳着涨", "number-roll"],
  ["骨架屏切真实内容会抖", "skeleton-handoff"],
  ["点了翻到背面", "card-flip-3d"],
  ["汉堡菜单变叉", "icon-morph"],
  ["堆叠卡片抽走一张", "card-stack-swipe"],
  ["弹出来太快看不清", "sheet-hold"],
  ["后台页面没有重点", "hero-module"],
  ["模块东一块西一块", "stacked-bands"],
  ["一滚下去提醒就没了", "sticky"],
  ["图和数字各占一半", "full-bleed-canvas"],
  ["不知道进行到哪一步", "kanban-columns"],
  ["看不出谁和谁撞了", "timeline-swimlanes"],
  ["顶部菜单去掉底色融进背景", "transparent-nav"],
  ["菜单放到页面右边竖着一条图标", "right-rail"],
  ["选中的菜单展开显示文字其余只留图标", "expanding-tab"],
  ["菜单不写字分不清当前页", "page-title"],
  ["图标菜单鼠标停上去弹出文字", "icon-rail"],
  ["菜单旁边放一列常用操作圆形按钮", "quick-actions"],
  ["鼠标停住显示文字", "tooltip"],
  ["知道自己在哪", "breadcrumb"],
  ["帮我把这个接口的返回值改成数组", null],
  ["把这段代码抽成一个函数", null],
];

const failures = [];

const data = run(["check"]);
if (!data.ok) failures.push(...data.problems.map((p) => `数据：${p}`));

for (const [sentence, expected] of CASES) {
  const result = run(["find", "--q", sentence, "--limit", "3", "--brief"]);
  const ids = result.candidates.map((c) => c.id);
  if (expected === null) {
    if (ids.length) failures.push(`检索：「${sentence}」不该命中，却返回了 ${ids.join(", ")}`);
  } else if (!ids.includes(expected)) {
    failures.push(`检索：「${sentence}」应查到 ${expected}，实际 ${ids.join(", ") || "无命中"}`);
  }
}

if (failures.length) {
  process.stdout.write(`✗ ${failures.length} 项未通过\n\n${failures.map((f) => `  · ${f}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`✓ ${data.total} 条词条，${CASES.length} 条检索用例全部通过\n`);
}
