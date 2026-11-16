// node --test scripts/*.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLATFORM_SKILLS, exampleEndpoint, renderSkill, zhNeeds } from './platform-skills.mjs';

const param = (name, extra = {}) => ({ name, type: 'string', required: false, description: { en: '', zh: '' }, ...extra });
const endpoint = (id, extra = {}) => ({
  id, platform: id.split('.')[0], method: 'GET', paused: false, list: true, pageSize: 20, unit: 'call', price: '0.002',
  maxCharge: '0.002', title: { en: id, zh: `标题 ${id}` }, short: { en: id, zh: `短名 ${id}` }, summary: { en: '', zh: '说明。' },
  params: [], oneOf: [], ...extra,
});

const catalog = {
  revision: 'rev1', priceBook: 'pb1',
  platforms: [{ id: 'x', name: { en: 'X', zh: 'X（推特）' }, summary: { en: '', zh: '帖子和账号。' } }],
  endpoints: [
    endpoint('x.posts.get', { list: false, params: [param('id'), param('url')], oneOf: [['id', 'url']] }),
    endpoint('x.posts.search', { params: [param('query', { required: true, example: '"claude code" lang:zh' })] }),
    endpoint('x.users.search', { price: '0.0001', params: [param('query', { required: true, example: 'cheap' })] }),
    endpoint('x.old.thing', { paused: true }),
  ],
};
const skill = { slug: 'okdata-x', name: 'X（推特）数据助手 okdata', platforms: ['x'], link: '推文链接', en: 'X (Twitter)', uses: ['搜推特帖子'] };

test('zhNeeds names required parameters and either-or groups, or says nothing is needed', () => {
  assert.equal(zhNeeds(catalog.endpoints[0]), '`id` 或 `url`');
  assert.equal(zhNeeds(catalog.endpoints[1]), '`query`');
  assert.equal(zhNeeds(endpoint('x.trends.list')), '不用传');
});

test('the curl example uses the first search in catalog order, not the cheapest one', () => {
  assert.equal(exampleEndpoint(catalog.endpoints).id, 'x.posts.search');
});

test('a rendered skill quotes the example safely for JSON and the shell, and leaves out paused endpoints', () => {
  const md = renderSkill(skill, catalog);
  assert.match(md, /^---\nname: okdata-x\ndescription: X（推特）数据助手：/);
  assert.ok(md.includes('"query": "\\"claude code\\" lang:zh"'), 'MCP example is valid JSON');
  assert.ok(md.includes(`-H "Idempotency-Key: $(uuidgen)" \\\n  --data-urlencode 'query="claude code" lang:zh'`), 'curl continues the line');
  assert.ok(!md.includes('x.old.thing'));
  assert.ok(md.includes('https://okdata.online/zh/signup/?src=skill-okdata-x'));
});

test('every platform skill has a Chinese display name ending in okdata and a unique slug', () => {
  const slugs = new Set(PLATFORM_SKILLS.map((s) => s.slug));
  assert.equal(slugs.size, PLATFORM_SKILLS.length);
  for (const s of PLATFORM_SKILLS) {
    assert.match(s.slug, /^okdata-[a-z-]+$/);
    assert.match(s.name, /[一-鿿].* okdata$/);
  }
});

test('a link from the user only promises comments when the platform has a live comments endpoint', () => {
  assert.ok(renderSkill(skill, catalog).includes('用户发来推文链接，想看内容和数据'));
  for (const id of ['x.posts.comments.list', 'x.posts.replies.list']) {
    const withComments = { ...catalog, endpoints: [...catalog.endpoints, endpoint(id)] };
    assert.ok(renderSkill(skill, withComments).includes('用户发来推文链接，想看内容、数据或评论'), id);
  }
});

test('a summary override replaces the catalog summary in the intro', () => {
  assert.ok(renderSkill({ ...skill, summary: '只有帖子' }, catalog).includes('的公开数据：只有帖子。'));
  assert.ok(renderSkill(skill, catalog).includes('的公开数据：帖子和账号。'));
});

test('a platform missing from the catalog is an error, not a silently empty skill', () => {
  assert.throws(() => renderSkill({ ...skill, platforms: ['nope'] }, catalog), /not in the catalog/);
});

test('a rendered skill says answers that reached the source are charged and a retry is a new paid call', () => {
  const md = renderSkill(skill, catalog);
  assert.ok(!/失败不收费|失败不扣费|不会重复扣费/.test(md), 'never says failed calls are free');
  assert.ok(md.includes('返回为空、查不到或出错也照常计费'));
  assert.ok(md.includes('再调一次就是一次新的付费调用'));
  assert.ok(md.includes('`invalid_params` 不扣费'));
});
