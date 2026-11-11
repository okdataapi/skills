// Fills the generated blocks in every SKILL.md from the okdata catalog: the endpoints a skill
// uses with their prices, and how to call okdata. Everything else in a SKILL.md is hand-written.
//
//   node scripts/sync.mjs                                   reads ../okdata/docs/catalog.json
//   node scripts/sync.mjs --catalog https://api.okdata.online/v1/catalog
//   node scripts/sync.mjs --check                           exit 1 if a block is out of date
//
// No dependencies, no key: /v1/catalog is free.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const DEFAULT_CATALOG = path.resolve(ROOT, '..', 'okdata', 'docs', 'catalog.json');

/** Which catalog job each skill covers; "all" lists every endpoint. */
const JOB_OF = {
  'okdata-setup': 'all',
  'okdata-competitors': 'competitor-monitoring',
  'okdata-comments': 'word-of-mouth',
  'okdata-creators': 'creator-discovery',
  'okdata-trends': 'trend-research',
  'okdata-content-research': 'content-research',
  'okdata-transcripts': 'transcripts',
};

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
  if (!Array.isArray(catalog?.endpoints)) throw new Error(`${source} does not look like the okdata catalog`);
  return catalog;
}

const price = (e) => (e.unit === 'item' ? `$${e.price} per item, at most $${e.maxCharge} per call` : `$${e.price} per call`);
const path_ = (e) => e.path ?? `/v1/${e.id.split('.').join('/')}`;
const cell = (s) => String(s).replace(/\|/g, '\\|');

function needs(e) {
  const required = e.params.filter((p) => p.required).map((p) => `\`${p.name}\``);
  const idOrUrl = e.params.some((p) => p.name === 'id' && !p.required) && e.params.some((p) => p.name === 'url' && !p.required);
  if (idOrUrl) required.unshift('`id` or `url`');
  return required.length ? required.join(', ') : 'nothing';
}

function endpointsBlock(catalog, job) {
  const list = catalog.endpoints.filter((e) => job === 'all' || e.jobs.includes(job));
  const names = Object.fromEntries(catalog.platforms.map((p) => [p.id, p.name.en]));
  const rows = list.map((e) => {
    const page = e.list ? `page of ~${e.pageSize ?? '?'}` : 'one object';
    return `| ${cell(names[e.platform] ?? e.platform)} | \`${e.id}\` | ${cell(e.summary.en)} | ${needs(e)} | ${page} | ${price(e)} |`;
  });
  return [
    `Catalog ${catalog.revision}, price book ${catalog.priceBook}. Prices are in USD; failed calls are free.`,
    '',
    '| Platform | Endpoint | Returns | Needs | Per call | Price |',
    '|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

function howtoBlock(catalog) {
  const sample = catalog.endpoints.find((e) => e.id === 'weibo.trends.list') ?? catalog.endpoints[0];
  return [
    '**Over MCP** (preferred when the `okdata` MCP server is connected): call `describe` with an endpoint id to see',
    'its parameters, fields and price (free), then `call` with `{"endpoint": "<id>", "params": {...}, "idempotency_key": "<uuid>"}`.',
    '`find` searches endpoints by plain words in English or Chinese. Not connected? See the `okdata-setup` skill.',
    '',
    '**Over HTTP** (when there is no MCP): the path is the endpoint id with dots as slashes under `/v1`, parameters',
    'go in the query string, and the key comes from the environment, never from the chat:',
    '',
    '```bash',
    `curl -sG "${catalog.baseUrl}${path_(sample)}" \\`,
    '  -H "Authorization: Bearer $OKDATA_API_KEY" \\',
    '  -H "Idempotency-Key: $(uuidgen)" \\',
    '  --data-urlencode "view=compact"',
    '```',
    '',
    'Every answer has `code`. `"ok"` carries `data.items` (lists, with `page.next_cursor`) or `data.item`, plus',
    '`meta.billing.amount` (what the call cost) and `meta.fetched_at`. Anything else is an error with `charged`',
    'and `retry`: do not retry `not_found`, wait `retry_after_seconds` on `rate_limited`, and resend a `timeout`',
    'with the same `Idempotency-Key` so it cannot be charged twice.',
  ].join('\n');
}

function replaceBlock(text, name, body, file) {
  const start = `<!-- okdata:${name}:start -->`;
  const end = `<!-- okdata:${name}:end -->`;
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`${file} is missing ${start} ... ${end}`);
  return `${text.slice(0, a + start.length)}\n${body}\n${text.slice(b)}`;
}

async function main() {
  const source = arg('--catalog') ?? process.env.OKDATA_CATALOG ?? DEFAULT_CATALOG;
  const check = process.argv.includes('--check');
  const catalog = await loadCatalog(source);
  const dirs = (await readdir(SKILLS, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const unknown = dirs.filter((d) => !(d in JOB_OF));
  if (unknown.length) throw new Error(`no job mapped for ${unknown.join(', ')}; add them to JOB_OF`);
  const stale = [];
  for (const dir of dirs) {
    const file = path.join(SKILLS, dir, 'SKILL.md');
    const before = await readFile(file, 'utf8');
    let after = replaceBlock(before, 'endpoints', endpointsBlock(catalog, JOB_OF[dir]), file);
    after = replaceBlock(after, 'howto', howtoBlock(catalog), file);
    if (after === before) continue;
    stale.push(dir);
    if (!check) await writeFile(file, after);
  }
  if (check && stale.length) {
    console.error(`out of date: ${stale.join(', ')}`);
    process.exit(1);
  }
  console.log(`catalog ${catalog.revision}: ${dirs.length} skills, ${stale.length} ${check ? 'out of date' : 'updated'}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
