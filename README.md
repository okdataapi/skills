# okdata Agent Skills

[English](#english) · [中文](#中文)

<a id="english"></a>

Skills that teach an AI agent (Claude Code, Codex, Cursor, OpenClaw and anything else that reads `SKILL.md`)
to do marketing and research jobs with [okdata](https://okdata.online): public data from Douyin, Xiaohongshu
(RedNote), WeChat, Kuaishou, Bilibili, Weibo, Zhihu, TikTok, X, YouTube, Instagram, Reddit and more (200+ endpoints
on 17 platforms), paid per call.

| Skill | The job |
|---|---|
| [`okdata-setup`](skills/okdata-setup/SKILL.md) | Connect the MCP server, HTTP API, SDKs or command line, store the key safely, check it works, read the prices |
| [`okdata-competitors`](skills/okdata-competitors/SKILL.md) | What competitor accounts posted, which posts broke out, how big each account is |
| [`okdata-comments`](skills/okdata-comments/SKILL.md) | Word of mouth: what commenters praise, complain about and ask, with quotes and links |
| [`okdata-creators`](skills/okdata-creators/SKILL.md) | Find creators in a niche and check their engagement before reaching out |
| [`okdata-trends`](skills/okdata-trends/SKILL.md) | Hot search boards across platforms and the posts behind a topic |
| [`okdata-content-research`](skills/okdata-content-research/SKILL.md) | Which posts on a topic perform, and the hooks, formats and angles they share |
| [`okdata-transcripts`](skills/okdata-transcripts/SKILL.md) | YouTube transcripts with timestamps: summaries, quotes, time links (TikTok, Instagram and Reddit videos too) |

Each skill says which endpoints it uses and what they cost, asks the agent to state the cost before it spends,
and ends every report with where the data came from and when it was fetched.

**One skill per platform, named in Chinese** (people search skill markets by platform name): `okdata-xiaohongshu`
(小红书数据助手), `okdata-douyin` (抖音), `okdata-wechat-mp` (公众号), `okdata-wechat-search` (微信搜一搜 and 微信指数),
`okdata-wechat-channels` (视频号), `okdata-kuaishou` (快手), `okdata-bilibili` (B站), `okdata-weibo` (微博), `okdata-zhihu`
(知乎), `okdata-tiktok`, `okdata-x`, `okdata-youtube`, `okdata-instagram`, `okdata-reddit` and `okdata-ad-library` (Meta and
Google ad libraries). Each lists every live endpoint of its platform with the price.

## Install

Any agent, with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add okdataapi/skills
```

Claude Code, as a plugin:

```text
/plugin marketplace add okdataapi/skills
/plugin install okdata-skills@okdata
```

Or copy a folder from `skills/` into `~/.claude/skills/` (Claude Code), `~/.codex/skills/` (Codex) or your
agent's skills folder.

Then get a key at [okdata.online](https://okdata.online/signup/?src=gh-skills), put it in `OKDATA_API_KEY`, and
ask the agent to "set up okdata" (the `okdata-setup` skill connects the MCP server
`https://api.okdata.online/mcp`).

## Keeping prices current

The endpoint tables and the "How to call okdata" block in every `SKILL.md` are generated from the okdata
catalog; the rest is written by hand. Endpoints listed as coming soon are left out until they can be called, and
`okdata-setup` gets one row per platform instead of every endpoint.

```bash
node scripts/sync.mjs --catalog https://api.okdata.online/v1/catalog   # or a local docs/catalog.json
node scripts/sync.mjs --check                                         # exit 1 if a table is stale
```

The platform skills are generated whole by `scripts/platform-skills.mjs` (same `--catalog` and `--check`; `--list`
prints each slug with its Chinese display name for publishing). Change the list or the template there, not the files.
Tests: `node --test scripts/*.test.mjs`.

MIT licence. okdata is not affiliated with the platforms it reads.

---

<a id="中文"></a>

## 中文

让 AI 智能体（Claude Code、Codex、Cursor、OpenClaw 等能读 `SKILL.md` 的工具）用 [okdata](https://okdata.online/zh/)
做营销和调研的技能包。okdata 提供抖音、小红书、微信、快手、B站、微博、知乎、TikTok、X、YouTube、Instagram、Reddit
等 17 个平台的公开数据（200 多个接口），按次付费。

| 技能 | 做什么 |
|---|---|
| `okdata-setup` | 接入 MCP 或 HTTP、安全保存 key、确认能用、查价格 |
| `okdata-competitors` | 竞品账号最近发了什么、哪条爆了、账号多大 |
| `okdata-comments` | 口碑：评论区夸什么、骂什么、问什么，附原话和链接 |
| `okdata-creators` | 按领域找博主，联系前先看互动率 |
| `okdata-trends` | 各平台热搜榜，以及话题背后的内容 |
| `okdata-content-research` | 某个话题下什么内容数据好，标题、开头、形式有什么规律 |
| `okdata-transcripts` | YouTube 字幕（带时间戳）：总结、摘录、按时间跳转（也可取 TikTok、Instagram、Reddit 视频字幕） |

每个技能都写明用哪些接口、各花多少钱，要求智能体先报预算再调用，报告最后注明数据来源和抓取时间。

另有按平台拆开的中文技能，一个平台一个，列出该平台全部可用接口和价格：小红书数据助手、抖音数据助手、公众号数据助手、
微信搜一搜与微信指数、视频号数据助手、快手数据助手、B站数据助手、微博数据助手、知乎数据助手、TikTok 数据助手、
X（推特）数据助手、YouTube 数据助手、Instagram 数据助手、Reddit 数据助手、海外广告库查询（目录名都是 `okdata-平台`）。

安装：`npx skills add okdataapi/skills`；Claude Code 里也可以 `/plugin marketplace add okdataapi/skills`。
然后在 [okdata.online](https://okdata.online/zh/signup/?src=gh-skills) 注册拿 key，放进 `OKDATA_API_KEY`，
对智能体说“配置 okdata”即可。

MIT 许可证。okdata 与上述各平台没有关联。
