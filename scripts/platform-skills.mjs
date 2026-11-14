// Writes one Chinese-first skill per platform (小红书数据助手 okdata, 抖音数据助手 okdata, ...) from the okdata
// catalog: the whole SKILL.md is generated, so edit PLATFORM_SKILLS or the template here, never the files.
// People search skill markets in Chinese by platform name; these skills are named the way they search.
//
//   node scripts/platform-skills.mjs                                    reads ../okdata/docs/catalog.json
//   node scripts/platform-skills.mjs --catalog https://api.okdata.online/v1/catalog
//   node scripts/platform-skills.mjs --check                            exit 1 if a file is out of date
//   node scripts/platform-skills.mjs --list                             print slug<TAB>display name, for publishing
//
// No dependencies, no key: /v1/catalog is free.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const DEFAULT_CATALOG = path.resolve(ROOT, '..', 'okdata', 'docs', 'catalog.json');
const SITE = 'https://okdata.online';
const MCP_URL = 'https://api.okdata.online/mcp';

/** One skill per platform. `uses` are the jobs people bring and must only name what live endpoints can do; `en` is
 *  how English speakers search for it; `summary` replaces the catalog's platform summary when that one also
 *  describes endpoints that are not live yet. */
export const PLATFORM_SKILLS = [
  {
    slug: 'okdata-xiaohongshu', name: '小红书数据助手 okdata', platforms: ['xiaohongshu'], link: '小红书笔记链接',
    en: 'Xiaohongshu / XHS / RedNote',
    uses: ['小红书数据分析、选题和爆款笔记调研', '盯竞品账号和竞品笔记', '看笔记评论区的口碑、提问和购买意向', '找博主、筛达人，看粉丝和互动'],
  },
  {
    slug: 'okdata-douyin', name: '抖音数据助手 okdata', platforms: ['douyin'], link: '抖音视频或主页链接',
    en: 'Douyin (China TikTok)',
    uses: ['抖音视频数据分析和爆款调研', '查抖音账号的粉丝、获赞和全部作品', '导出视频评论做口碑和舆情分析', '看抖音热搜榜，找达人和星图报价'],
  },
  {
    slug: 'okdata-wechat-mp', name: '公众号数据助手 okdata', platforms: ['wechat_mp'], link: '公众号文章链接',
    en: 'WeChat Official Accounts',
    uses: ['读公众号文章全文，交给 AI 总结或改写', '导出一个公众号的历史文章', '查文章的阅读、点赞等数据', '盯竞品公众号的更新'],
  },
  {
    slug: 'okdata-wechat-search', name: '微信搜一搜与微信指数 okdata', platforms: ['wechat'], link: null,
    en: 'WeChat Search (Sou Yi Sou) and WeChat Index',
    uses: ['在微信搜一搜里搜文章、视频号和小程序', '查关键词的微信指数走势', '找某个领域的公众号', '看搜一搜的推荐词，挖用户在搜什么'],
  },
  {
    slug: 'okdata-wechat-channels', name: '视频号数据助手 okdata', platforms: ['wechat_channels'], link: '视频号视频链接',
    en: 'WeChat Channels',
    uses: ['搜视频号视频和账号', '查视频号作品的点赞、评论和转发', '读视频号评论区', '盯竞品视频号和直播回放'],
  },
  {
    slug: 'okdata-kuaishou', name: '快手数据助手 okdata', platforms: ['kuaishou'], link: '快手视频链接',
    en: 'Kuaishou',
    uses: ['搜快手视频和账号', '查快手作品数据和评论', '看快手热榜', '盯竞品快手号'],
  },
  {
    slug: 'okdata-bilibili', name: 'B站数据助手 okdata', platforms: ['bilibili'], link: 'B站视频链接或 BV 号',
    en: 'Bilibili',
    uses: ['搜 B站视频，查播放、投币、弹幕等数据', '抓 B站视频评论做口碑分析', '看 B站热门榜和热搜', '找某个领域的 UP 主'],
  },
  {
    slug: 'okdata-weibo', name: '微博数据助手 okdata', platforms: ['weibo'], link: '微博链接',
    en: 'Weibo',
    uses: ['看微博热搜和话题', '按关键词搜微博做舆情监测', '查微博账号和它发的内容', '读微博评论区'],
  },
  {
    slug: 'okdata-zhihu', name: '知乎数据助手 okdata', platforms: ['zhihu'], link: '知乎问题链接',
    en: 'Zhihu', summary: '问题、回答和文章',
    uses: ['搜知乎上的问题、回答和文章', '读一个问题下的回答', '看大家在知乎上怎么讨论一个话题或一类产品'],
  },
  {
    slug: 'okdata-tiktok', name: 'TikTok 数据助手 okdata', platforms: ['tiktok'], link: 'TikTok 视频链接',
    en: 'TikTok',
    uses: ['做海外市场和跨境选品调研', '查 TikTok 视频和账号数据', '导出 TikTok 评论，看海外用户怎么说', '看 TikTok Shop 商品评价'],
  },
  {
    slug: 'okdata-x', name: 'X（推特）数据助手 okdata', platforms: ['x'], link: '推文链接',
    en: 'X (Twitter)',
    uses: ['搜推特帖子，支持 X 的搜索语法', '读一条推文的内容和互动数据', '查账号和它最近发的帖子', '看各国家和地区的 X 趋势'],
  },
  {
    slug: 'okdata-youtube', name: 'YouTube 数据助手 okdata', platforms: ['youtube'], link: 'YouTube 视频链接',
    en: 'YouTube',
    uses: ['取 YouTube 视频字幕，交给 AI 总结', '搜 YouTube 视频和频道', '查视频的播放和点赞数据', '读视频评论区'],
  },
  {
    slug: 'okdata-instagram', name: 'Instagram 数据助手 okdata', platforms: ['instagram'], link: 'Instagram 帖子或 Reels 链接',
    en: 'Instagram',
    uses: ['查 Instagram 账号和帖子数据', '读帖子和 Reels 的评论', '看话题标签下的内容', '取 Reels 里说了什么'],
  },
  {
    slug: 'okdata-reddit', name: 'Reddit 数据助手 okdata', platforms: ['reddit'], link: 'Reddit 帖子链接',
    en: 'Reddit',
    uses: ['搜 Reddit 帖子，看海外用户的真实讨论', '读帖子下的评论', '看某个社区（subreddit）的热帖', '查用户发过什么'],
  },
  {
    slug: 'okdata-ad-library', name: '海外广告库查询 okdata', platforms: ['meta', 'google'], link: null,
    en: 'Meta Ad Library and Google Ads Transparency Center',
    uses: ['看竞品在 Facebook、Instagram 上在投什么广告', '查一个广告主在 Google 搜索、YouTube 上的广告', '按关键词找在投广告，做投放素材调研'],
  },
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function loadCatalog(source) {
  const text = /^https?:\/\//.test(source)
    ? await fetch(source).then((r) => {
      if (!r.ok) throw new Error(`${source} answered HTTP ${r.status}`);
      return r.text();
    })
    : await readFile(source, 'utf8');
  const body = JSON.parse(text);
  const catalog = body.code === 'ok' ? body.data : body;
  if (!Array.isArray(catalog?.endpoints) || !Array.isArray(catalog?.platforms)) throw new Error(`${source} does not look like the okdata catalog`);
  return catalog;
}

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const zhPrice = (e) => (e.unit === 'item' ? `每条 $${e.price}，单次最多 $${e.maxCharge}` : `每次 $${e.price}`);
const apiPath = (e) => e.path ?? `/v1/${e.id.split('.').join('/')}`;

/** Parameters a call must carry: required ones, and "a 或 b" for each group where one of several is needed. */
export function zhNeeds(e) {
  const groups = e.oneOf ?? [];
  const grouped = new Set(groups.flat());
  const either = groups.map((g) => g.map((n) => `\`${n}\``).join(' 或 '));
  const required = e.params.filter((p) => p.required && !grouped.has(p.name)).map((p) => `\`${p.name}\``);
  const all = [...required, ...either];
  return all.length ? all.join('、') : '不用传';
}

const live = (e) => !e.paused;
const zhList = (items) => items.join('、');

/** The platform's main search for the curl example: the first live GET endpoint, in catalog order, that takes a query. */
export function exampleEndpoint(endpoints) {
  const gets = endpoints.filter((e) => live(e) && e.method === 'GET');
  return gets.find((e) => e.params.some((p) => p.name === 'query' && p.required && p.example)) ?? gets[0];
}

function description(skill, platforms, endpoints) {
  const names = zhList(platforms.map((p) => p.name.zh));
  const what = zhList([...new Set(endpoints.filter(live).map((e) => e.short?.zh ?? e.title.zh))].slice(0, 8));
  const text = `${skill.name.replace(/ okdata$/, '')}：用 okdata 接口读${names}的公开数据，包括${what}等，`
    + `不用登录、不用 Cookie，按次付费、失败不收费。适用于${zhList(skill.uses)}。`
    + ` ${skill.en} public data for AI agents through the okdata API (remote MCP or HTTP), paid per call.`;
  return text.length > 1000 ? `${text.slice(0, 997)}...` : text;
}

function endpointTable(catalog, endpoints) {
  const rows = endpoints.filter(live).map((e) => `| \`${e.id}\` | ${cell(e.title.zh)}：${cell(e.summary.zh)} | ${zhNeeds(e)} | ${e.list ? `一页约 ${e.pageSize ?? '?'} 条` : '一条'} | ${zhPrice(e)} |`);
  return [
    `目录版本 ${catalog.revision}，价目表 ${catalog.priceBook}。价格单位是美元，调用失败不收费。`,
    '',
    '| 接口 | 能拿到什么 | 需要传 | 每次返回 | 价格 |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

function howTo(example) {
  const query = example.params.find((p) => p.name === 'query');
  // Single quotes in the shell and JSON escaping in the MCP example: X examples carry double quotes.
  const dataArg = query?.example ? ` \\\n  --data-urlencode 'query=${query.example.replace(/'/g, "'\\''")}'` : '';
  return `**用 MCP（已接上 \`okdata\` MCP 服务时优先用）**：先用 \`describe\` 看一个接口的参数、返回字段和价格（免费），再用 \`call\` 调用，
\`capability\` 填接口 id，参数跟在旁边，例如 \`{"capability": "${example.id}", ${query ? `"query": ${JSON.stringify(query.example)}, ` : ''}"max_price": "0.05", "idempotency_key": "<uuid>"}\`。
\`find\` 能用中文或英文描述找接口，\`read_more\` 取长结果的剩余部分，这两个也免费。
还没接上的话，远程 MCP 地址是 \`${MCP_URL}\`，认证头是 \`Authorization: Bearer <key>\`，详见 \`okdata-setup\` 技能。

**用 HTTP（没有 MCP 时）**：路径是接口 id 把点换成斜杠、放在 \`/v1\` 下面，参数放在查询串里，key 从环境变量读，不要贴进对话：

\`\`\`bash
curl -sG "https://api.okdata.online${apiPath(example)}" \\
  -H "Authorization: Bearer $OKDATA_API_KEY" \\
  -H "Idempotency-Key: $(uuidgen)"${dataArg}
\`\`\`

每个返回都带 \`code\`。\`"ok"\` 时数据在 \`data.items\`（列表，翻页看 \`page.next_cursor\`）或 \`data.item\` 里，
\`meta.billing.amount\` 是这次花了多少钱。其他 \`code\` 都是出错，会说明 \`charged\` 和 \`retry\`：\`not_found\` 不要重试，
\`rate_limited\` 等 \`retry_after_seconds\` 再试，\`timeout\` 用同一个 \`Idempotency-Key\` 重发，不会重复扣费。`;
}

export function renderSkill(skill, catalog) {
  const platforms = skill.platforms.map((id) => {
    const p = catalog.platforms.find((x) => x.id === id);
    if (!p) throw new Error(`${skill.slug}: platform ${id} is not in the catalog`);
    return p;
  });
  const endpoints = catalog.endpoints.filter((e) => skill.platforms.includes(e.platform));
  if (!endpoints.some(live)) throw new Error(`${skill.slug}: no live endpoints`);
  const title = skill.name.replace(/ okdata$/, '');
  const homepage = `${SITE}/zh/apis/${skill.platforms[0]}/`;
  const signup = `${SITE}/zh/signup/?src=skill-${skill.slug}`;
  const linkTip = skill.link
    ? `用户直接发来${skill.link}时，表格里「需要传」写着 \`url\` 的接口可以直接传链接，不用自己拆 id。`
    : '搜索类接口拿到的结果里带着后续接口要用的 id。';
  return `---
name: ${skill.slug}
description: ${description(skill, platforms, endpoints)}
license: MIT
metadata:
  openclaw:
    primaryEnv: OKDATA_API_KEY
    requires:
      env:
        - OKDATA_API_KEY
    homepage: ${homepage}
---

<!-- Generated by scripts/platform-skills.mjs from the okdata catalog. Do not edit by hand. -->

# ${title}（okdata）

用 okdata 的接口读${zhList(platforms.map((p) => p.name.zh))}的公开数据：${skill.summary ?? zhList(platforms.map((p) => p.summary.zh.replace(/[。.]$/, '')))}。
不用登录${zhList(platforms.map((p) => p.name.zh))}，也不用 Cookie，按次付费，调用失败不收费。

## 什么时候用

${skill.uses.map((u) => `- ${u}`).join('\n')}
${skill.link ? `- 用户发来${skill.link}，${endpoints.some((e) => live(e) && /comments|replies/.test(e.id)) ? '想看内容、数据或评论' : '想看内容和数据'}\n` : ''}
## 能拿到的数据

${endpointTable(catalog, endpoints)}

## 怎么调用

${howTo(exampleEndpoint(endpoints))}

## 用法建议

1. 先用搜索类接口找到内容或账号，再查详情、评论或作品列表。${linkTip}
2. 列表接口一次返回一页。要更多就带上 \`page.next_cursor\` 再调一次，在 MCP 里也可以用 \`read_more\`。
3. 调用前先算一下要调几次、大概多少钱，告诉用户再动手。给 \`call\` 设 \`max_price\`：这次可能花得比它多时，调用会被拒绝，不扣钱。
4. 只读公开数据：不发帖、不点赞、不评论、不私信。
5. 还没有 key：到 ${signup} 注册，在控制台创建 key，设成环境变量 \`OKDATA_API_KEY\`。不要让用户把 key 贴进对话。

## 相关技能

- \`okdata-setup\`：接入 MCP、保存 key、查价格和余额、排查报错
- \`okdata-comments\`：跨平台读评论，做口碑分析
- \`okdata-competitors\`：竞品账号监控和对比
- \`okdata-creators\`：按领域找达人、筛博主
- \`okdata-trends\`：各平台热搜热榜
- \`okdata-content-research\`：爆款内容调研

接口说明和价格：${homepage}
`;
}

async function main() {
  const catalog = await loadCatalog(arg('--catalog') ?? DEFAULT_CATALOG);
  if (process.argv.includes('--list')) {
    for (const s of PLATFORM_SKILLS) console.log(`${s.slug}\t${s.name}`);
    return;
  }
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const skill of PLATFORM_SKILLS) {
    const file = path.join(SKILLS, skill.slug, 'SKILL.md');
    const next = renderSkill(skill, catalog);
    const prev = await readFile(file, 'utf8').catch(() => null);
    if (prev === next) continue;
    stale += 1;
    if (check) {
      console.log(`out of date: ${path.relative(ROOT, file)}`);
      continue;
    }
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, next);
    console.log(`wrote ${path.relative(ROOT, file)}`);
  }
  if (check && stale) process.exit(1);
  if (!stale) console.log('platform skills are up to date');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
