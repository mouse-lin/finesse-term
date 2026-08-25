#!/usr/bin/env node
/**
 * finesse-term —— Web / H5 术语本地检索器
 *
 * 与常见「术语搜索」相反：用户给的是症状（「按钮被挡住」），不是术语（「安全区」）。
 * 所以检索的主入口是词条的 trigger 字段 —— 用户会怎么说这件事，而不是它叫什么。
 *
 * 零依赖，Node 20+。
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

const HELP = `finesse-term —— Web / H5 术语检索器

用法:
  node scripts/term.mjs find --q "按钮被挡住" [--q "点了没反应"] [选项]
  node scripts/term.mjs get safe-area [sticky-footer ...]
  node scripts/term.mjs list [--surface h5] [--layer layout]
  node scripts/term.mjs check

命令:
  find    用大白话反查术语。这是主入口。
  get     按 id 取完整词条。
  list    列出词条（只给 id 和标题）。
  check   校验数据完整性，CI 用。

选项:
  --q <描述>       用户的原话或其中一个片段。可重复，最多 5 次。
  --surface <名>   限定 web | h5 | both。默认全查。
  --layer <名>     限定 layer（layout / interaction / state / component /
                   motion / visual / a11y / perf / form / platform）。
  --limit <1-8>    每条查询返回几个候选。默认 3。
  --brief          只返回 title / en / say，不带 plain 和 trap。
  --help           显示本帮助。
`;

const REQUIRED_FIELDS = ["id", "title", "en", "layer", "plain", "say", "trap", "pairs", "trigger"];
const KNOWN_LAYERS = new Set([
  "layout", "interaction", "state", "component",
  "motion", "visual", "a11y", "perf", "form", "platform",
]);

/* ------------------------------------------------------------------ 数据加载 */

function loadCorpus() {
  const files = readdirSync(DATA_DIR).filter((name) => name.endsWith(".json")).sort();
  const terms = [];
  const files_seen = [];
  for (const name of files) {
    const raw = JSON.parse(readFileSync(join(DATA_DIR, name), "utf8"));
    const surface = raw.surface || "both";
    files_seen.push(name);
    for (const term of raw.terms || []) {
      terms.push({ ...term, surface: term.surface || surface, source: name });
    }
  }
  return { terms, files: files_seen };
}

/* -------------------------------------------------------------------- 归一化 */

// 中文没有词边界，检索靠双向子串。归一化掉标点、空格和大小写，
// 让「鼠标放上去，变个色」和「鼠标放上去变色」落到同一个串上。
function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[，。、！？；：""''（）()【】\[\]{}<>「」·~`!?.,;:'"/\\|@#$%^&*+=_-]+/g, "");
}

/* -------------------------------------------------------------------- 打分 */

// 中文口语不会照抄触发词。「按钮被挡住」在真实句子里长这样：
// 「底部按钮被那条黑杠挡住了」—— 连续子串匹配到这里就断了。
// 所以主匹配走双字组覆盖率：触发词的字组有多少出现在用户这句话里。
function bigrams(value) {
  const set = new Set();
  for (let index = 0; index + 1 < value.length; index += 1) set.add(value.slice(index, index + 2));
  return set;
}

function coverage(valueNorm, queryGrams) {
  const valueGrams = bigrams(valueNorm);
  if (!valueGrams.size) return 0;
  let hit = 0;
  for (const gram of valueGrams) if (queryGrams.has(gram)) hit += 1;
  return hit / valueGrams.size;
}

/**
 * 三条通路，按可信度递减：
 *   1. 正向精确 —— 用户原话里整段包含这个词条的说法
 *   2. 正向模糊 —— 说法被打散在句子里，但字组覆盖率够高
 *   3. 反向     —— 用户只丢了两个字（「吸底」），它是某个别名的一部分
 * 反向权重最低：短查询极易擦到不相干的词条。
 */
function matchField(queryNorm, queryGrams, values, { forward, backward, minBackward = 2, fuzzyMin }) {
  let best = 0;
  let hit = null;
  const take = (weight, value) => { if (weight > best) { best = weight; hit = value; } };

  for (const value of values) {
    const valueNorm = normalize(value);
    if (!valueNorm) continue;

    if (queryNorm.includes(valueNorm) && valueNorm.length >= 2) {
      take(forward + Math.min(12, valueNorm.length * 2), value);
      continue;
    }
    // 太短的说法（两三个字）没有足够字组支撑模糊匹配，只能走精确
    if (valueNorm.length >= 4) {
      const cov = coverage(valueNorm, queryGrams);
      if (cov >= fuzzyMin) take(forward * cov * 0.9, value);
    }
    if (valueNorm.includes(queryNorm) && queryNorm.length >= minBackward) {
      take(backward + Math.min(8, queryNorm.length), value);
    }
  }
  return { score: best, hit };
}

function scoreTerm(term, queryNorm, queryGrams) {
  const matched = [];
  let score = 0;

  if (normalize(term.id) === queryNorm || normalize(term.title) === queryNorm) {
    return { score: 200, matched: ["id"] };
  }

  // trigger 是这个检索器的主键：用户会怎么描述这件事
  const trigger = matchField(queryNorm, queryGrams, term.trigger || [], {
    forward: 60, backward: 30, minBackward: 3, fuzzyMin: 0.6,
  });
  if (trigger.score) { score += trigger.score; matched.push(`trigger:${trigger.hit}`); }

  // 别名是术语不是句子，模糊门槛要高，否则「加载」会擦到半个库
  const alias = matchField(queryNorm, queryGrams, [term.title, term.en, ...(term.aliases || [])], {
    forward: 52, backward: 34, fuzzyMin: 0.8,
  });
  if (alias.score) { score += alias.score * 0.8; matched.push(`alias:${alias.hit}`); }

  // 正文只做「短查询落在正文里」的兜底，权重压到最低，否则整库都会被长句擦到
  if (queryNorm.length >= 2 && queryNorm.length <= 10) {
    for (const [field, text] of [["plain", term.plain], ["say", term.say], ["trap", term.trap]]) {
      if (normalize(text).includes(queryNorm)) { score += 8; matched.push(`${field}`); break; }
    }
  }

  return { score: Math.round(score), matched };
}

/* -------------------------------------------------------------------- 输出 */

function shape(term, corpus, { brief, score, matched }) {
  const base = {
    id: term.id,
    title: term.title,
    en: term.en,
    surface: term.surface,
    layer: term.layer,
    say: term.say,
  };
  if (!brief) {
    base.plain = term.plain;
    base.trap = term.trap;
    // pairs 直接把标题带出来：H5 的坑几乎都是成对的，
    // 让调用方不必为了知道「还差什么」再查一次。
    base.pairs = (term.pairs || []).map((id) => {
      const found = corpus.find((t) => t.id === id);
      return found ? { id, title: found.title } : { id, title: null, missing: true };
    });
  }
  if (score !== undefined) base.match = { score, matched };
  return base;
}

function output(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(code, message) {
  output({ ok: false, error: { code, message } });
  process.exitCode = 1;
}

/* -------------------------------------------------------------------- 参数 */

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { positional: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) { options.positional.push(token); continue; }
    const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (key === "help" || key === "brief") { options[key] = true; continue; }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${token} 缺少取值`);
    if (key === "q") options.q = [...(options.q || []), value];
    else options[key] = value;
    index += 1;
  }
  return { command, options };
}

/* -------------------------------------------------------------------- 命令 */

function filterBySurfaceAndLayer(terms, options) {
  let out = terms;
  if (options.surface) {
    const want = String(options.surface).toLowerCase();
    if (!["web", "h5", "both"].includes(want)) throw new Error("--surface 只能是 web | h5 | both");
    out = out.filter((t) => t.surface === want || t.surface === "both" || want === "both");
  }
  if (options.layer) {
    const want = String(options.layer).toLowerCase();
    if (!KNOWN_LAYERS.has(want)) throw new Error(`--layer 未知：${want}`);
    out = out.filter((t) => t.layer === want);
  }
  return out;
}

function find(corpus, options) {
  const queries = (options.q || []).map((q) => String(q).trim()).filter(Boolean);
  if (!queries.length) throw new Error("find 需要至少一个 --q");
  if (queries.length > 5) throw new Error("--q 最多重复 5 次");

  const limit = Number(options.limit || 3);
  if (!Number.isInteger(limit) || limit < 1 || limit > 8) throw new Error("--limit 必须是 1 到 8 的整数");

  const pool = filterBySurfaceAndLayer(corpus, options);

  const results = queries.map((query) => {
    const queryNorm = normalize(query);
    const queryGrams = bigrams(queryNorm);
    const scored = pool
      .map((term) => ({ term, ...scoreTerm(term, queryNorm, queryGrams) }))
      .filter((row) => row.score >= 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      query,
      count: scored.length,
      // 没命中不是错误。用户本来就可能只是在正常说话，
      // 这时候正确的行为是不提术语，而不是硬凑一个。
      candidates: scored.map((row) => shape(row.term, corpus, {
        brief: options.brief, score: row.score, matched: row.matched,
      })),
    };
  });

  const head = { ok: true, source: "finesse-term", command: "find", total: corpus.length };
  return results.length === 1 ? { ...head, ...results[0] } : { ...head, results };
}

function get(corpus, options) {
  const ids = options.positional;
  if (!ids.length) throw new Error("get 需要至少一个 id");
  const found = [];
  const missing = [];
  for (const id of ids) {
    const term = corpus.find((t) => t.id === id || normalize(t.title) === normalize(id));
    if (term) found.push(shape(term, corpus, { brief: options.brief }));
    else missing.push(id);
  }
  return { ok: true, source: "finesse-term", command: "get", count: found.length, terms: found, missing };
}

function list(corpus, options) {
  const pool = filterBySurfaceAndLayer(corpus, options);
  const byLayer = {};
  for (const term of pool) {
    (byLayer[term.layer] ||= []).push({ id: term.id, title: term.title, en: term.en, surface: term.surface });
  }
  return { ok: true, source: "finesse-term", command: "list", count: pool.length, layers: byLayer };
}

function check(corpus, files) {
  const problems = [];
  const seen = new Map();

  for (const term of corpus) {
    const where = `${term.source}:${term.id || "<无 id>"}`;
    for (const field of REQUIRED_FIELDS) {
      const value = term[field];
      const empty = value === undefined || value === null || value === ""
        || (Array.isArray(value) && value.length === 0);
      if (empty) problems.push(`${where} 缺少字段 ${field}`);
    }
    if (term.id) {
      if (seen.has(term.id)) problems.push(`${where} 与 ${seen.get(term.id)} 的 id 重复`);
      else seen.set(term.id, where);
      if (!/^[a-z0-9-]+$/.test(term.id)) problems.push(`${where} 的 id 只能用小写字母、数字和连字符`);
    }
    if (term.layer && !KNOWN_LAYERS.has(term.layer)) problems.push(`${where} 的 layer 未知：${term.layer}`);
    if (term.surface && !["web", "h5", "both"].includes(term.surface)) {
      problems.push(`${where} 的 surface 未知：${term.surface}`);
    }
    // trigger 是大白话，写成术语就等于没写 —— 词条自己的标题不能当触发词
    for (const t of term.trigger || []) {
      if (normalize(t) === normalize(term.title)) problems.push(`${where} 的 trigger 里混进了术语本身「${t}」`);
    }
  }

  for (const term of corpus) {
    for (const id of term.pairs || []) {
      if (!seen.has(id)) problems.push(`${term.source}:${term.id} 的 pairs 指向不存在的 ${id}`);
    }
  }

  return {
    ok: problems.length === 0,
    source: "finesse-term",
    command: "check",
    files,
    total: corpus.length,
    problems,
  };
}

/* -------------------------------------------------------------------- 入口 */

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail("invalid_arguments", error.message);
    return;
  }

  if (parsed.options.help || !parsed.command || parsed.command === "--help") {
    process.stdout.write(HELP);
    return;
  }

  let corpus;
  let files;
  try {
    ({ terms: corpus, files } = loadCorpus());
  } catch (error) {
    fail("corpus_unreadable", error.message);
    return;
  }

  try {
    switch (parsed.command) {
      case "find": output(find(corpus, parsed.options)); break;
      case "get": output(get(corpus, parsed.options)); break;
      case "list": output(list(corpus, parsed.options)); break;
      case "check": {
        const report = check(corpus, files);
        output(report);
        if (!report.ok) process.exitCode = 1;
        break;
      }
      default: fail("unknown_command", `未知命令：${parsed.command}`);
    }
  } catch (error) {
    fail("command_failed", error.message);
  }
}

main();
