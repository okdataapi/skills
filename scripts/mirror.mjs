// Mirrors the okdata skills published on okdata.online into this repo, so the repo, ClawHub and the
// site always carry the same SKILL.md files. The site generates them from the catalog; never edit a
// SKILL.md here, change it at the source and run this again.
//
//   node scripts/mirror.mjs            download every skill in the manifest, drop folders it no longer lists,
//                                      rewrite the plugin lists and the skill tables in README.md
//   node scripts/mirror.mjs --check    exit 1 if anything here differs from the site
//
// No dependencies, no key: the manifest and the SKILL.md files are public.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://okdata.online';
const MANIFEST = `${SITE}/skills/manifest.json`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const MARKETPLACE = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const README = path.join(ROOT, 'README.md');
const CHECK = process.argv.includes('--check');

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/** The name and description from a SKILL.md front matter. */
function frontMatter(md) {
  const head = md.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const field = (key) => {
    const raw = head.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
    return raw.startsWith('"') ? JSON.parse(raw) : raw;
  };
  return { name: field('name'), description: field('description') };
}

/** The first line under the title: the question the skill answers. */
const tagline = (md) => md.match(/^> (.+)$/m)?.[1]?.trim() ?? '';
/** The H1 title without the brand suffix. */
const title = (md) => (md.match(/^# (.+)$/m)?.[1] ?? '').replace(/ with okdata$/, '').trim();

/** Where a skill's own page is: task skills have one under /skills/, platform skills use the platform's API page. */
function landing(skill, lang) {
  const prefix = lang === 'zh' ? '/zh' : '';
  const src = `?src=skill-${skill.name}`;
  if (skill.kind === 'task') return `${SITE}${prefix}/skills/${skill.name.replace(/^okdata-/, '')}/${src}`;
  if (skill.kind === 'platform') return `${SITE}${prefix}/apis/${skill.name.replace(/^okdata-/, '').replace(/-/g, '_')}/${src}`;
  return `${SITE}${prefix}/skills/${src}`;
}

const cell = (s) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

function tables(skills, docs) {
  const row = (s, lang) => {
    const md = docs.get(s.name);
    // A tagline reads "English line. (中文一句。)"; the base skill has English only.
    const zhPart = tagline(md).match(/\(([^()]+)\)\s*$/)?.[1];
    const what = lang === 'zh'
      ? (zhPart ?? (s.kind === 'base' ? '接入 okdata：查接口、看价格、调用，所有平台都能用' : tagline(md)))
      : tagline(md).replace(/\s*\([^()]+\)\s*$/, '');
    const platform = s.kind === 'platform' ? `**${title(md).replace(/ data$/, '')}**: ` : '';
    return `| [\`${s.name}\`](skills/${s.name}/SKILL.md) | ${cell(platform + (what || title(md)))} | [${lang === 'zh' ? '介绍页' : 'page'}](${landing(s, lang)}) |`;
  };
  // English readers mostly work on these platforms, so the English table lists them first (the site does the same).
  const GLOBAL = ['tiktok', 'youtube', 'instagram', 'x', 'reddit', 'amazon', 'aliexpress', 'meta', 'google', 'telegram'];
  const rank = (s) => { const i = GLOBAL.indexOf(s.name.replace(/^okdata-/, '')); return i === -1 ? GLOBAL.length : i; };
  const ordered = (kind, lang) => {
    const list = skills.filter((s) => s.kind === kind);
    return lang === 'en' && kind === 'platform' ? list.map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s) : list;
  };
  const block = (kind, lang) => ordered(kind, lang).map((s) => row(s, lang)).join('\n');
  const en = [
    '| Skill | The job | |', '|---|---|---|', block('base', 'en'), block('task', 'en'), '',
    '**One skill per platform**, each listing every live endpoint of that platform with its price:', '',
    '| Skill | Platform | |', '|---|---|---|', block('platform', 'en'),
  ].join('\n');
  const zh = [
    '| 技能 | 做什么 | |', '|---|---|---|', block('base', 'zh'), block('task', 'zh'), '',
    '**每个平台一个技能**，列出该平台全部可用接口和价格：', '',
    '| 技能 | 平台 | |', '|---|---|---|', block('platform', 'zh'),
  ].join('\n');
  return { en, zh };
}

function replaceBlock(text, tag, body) {
  const re = new RegExp(`(<!-- ${tag}:start -->\\n)[\\s\\S]*?(\\n<!-- ${tag}:end -->)`);
  if (!re.test(text)) throw new Error(`README.md has no ${tag} block`);
  return text.replace(re, `$1${body}$2`);
}

async function main() {
  const manifest = JSON.parse(await fetchText(MANIFEST));
  const skills = manifest.skills;
  const docs = new Map();
  for (const s of skills) {
    const md = await fetchText(s.skill_md);
    if (sha256(md) !== s.skill_md_sha256) throw new Error(`${s.name}: SKILL.md does not match the manifest digest`);
    if (frontMatter(md).name !== s.name) throw new Error(`${s.name}: front matter names ${frontMatter(md).name}`);
    docs.set(s.name, md);
  }

  const changes = [];
  const write = async (file, text) => {
    const old = await readFile(file, 'utf8').catch(() => null);
    if (old === text) return;
    changes.push(path.relative(ROOT, file));
    if (!CHECK) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, text);
    }
  };

  for (const s of skills) await write(path.join(SKILLS, s.name, 'SKILL.md'), docs.get(s.name));

  const listed = new Set(skills.map((s) => s.name));
  for (const dir of await readdir(SKILLS)) {
    if (listed.has(dir)) continue;
    changes.push(`skills/${dir} (removed: no longer published)`);
    if (!CHECK) await rm(path.join(SKILLS, dir), { recursive: true, force: true });
  }

  const market = JSON.parse(await readFile(MARKETPLACE, 'utf8'));
  const pick = (...kinds) => skills.filter((s) => kinds.includes(s.kind)).map((s) => `./skills/${s.name}`);
  for (const plugin of market.plugins) {
    if (plugin.name === 'okdata-skills') plugin.skills = pick('base', 'task');
    if (plugin.name === 'okdata-platforms') plugin.skills = pick('platform');
  }
  await write(MARKETPLACE, `${JSON.stringify(market, null, 2)}\n`);

  const { en, zh } = tables(skills, docs);
  const readme = await readFile(README, 'utf8');
  await write(README, replaceBlock(replaceBlock(readme, 'skills-en', en), 'skills-zh', zh));

  if (CHECK && changes.length) {
    console.error(`Out of date with ${SITE}:\n  ${changes.join('\n  ')}\nRun node scripts/mirror.mjs`);
    process.exit(1);
  }
  console.log(changes.length ? `${CHECK ? 'would change' : 'changed'}:\n  ${changes.join('\n  ')}` : 'up to date');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
