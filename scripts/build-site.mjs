#!/usr/bin/env node
// Builds the documentation site from the repository itself.
//
//   node scripts/build-site.mjs           write site/index.html
//   node scripts/build-site.mjs --check   fail if the committed file is stale
//
// Two content sources feed the site.
//
//   1. site/content/*.md    Hand written pages. Frontmatter carries the title,
//                           the section, the spec strip, and the links out to
//                           the Claude Code docs.
//   2. The repository       Every examples/NN-name/README.md, PROMPT.md and
//                           reset.json, plus MEMORY.md and docs/. Add a ninth
//                           example and it shows up here with no edit to this
//                           script.
//
// Output is one self contained file. No build step to install, no server to
// run, no network needed except the web font. site/artifact-body.html holds
// the same page without the document wrapper, for publishing as an Artifact.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, listWorkspaces, readJson, c, CLAUDE_CODE_TESTED_VERSION } from './lib.mjs';

const SITE_DIR = path.join(REPO_ROOT, 'site');
const CONTENT_DIR = path.join(SITE_DIR, 'content');
const OUT_PAGE = path.join(SITE_DIR, 'index.html');
const OUT_BODY = path.join(SITE_DIR, 'artifact-body.html');

const SECTION_ORDER = [
  'Start here',
  'Repo staples',
  'Claude Code concepts',
  'The eight examples',
  'Scripts',
  'Field notes',
];

const DOCS_ROOT = 'https://code.claude.com/docs/en/';

/* ------------------------------------------------------------------ *
 * Small markdown renderer. No dependency, on purpose. The workspaces
 * share nothing and the repository tooling stays installable from a
 * clean clone with one npm install.
 * ------------------------------------------------------------------ */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Code spans are parked behind a sentinel so the bold, italic and link rules
// cannot reach inside them. A bare number would collide with real text.
const SENTINEL = '\u0000';
const CODE_SLOT = /\u0000(\d+)\u0000/g;

function inline(text) {
  let out = escapeHtml(text);
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (_, body) => {
    codes.push(body);
    return SENTINEL + (codes.length - 1) + SENTINEL;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:/.test(href);
    const attrs = external ? ' target="_blank" rel="noopener"' : '';
    return '<a href="' + href + '"' + attrs + '>' + label + '</a>';
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(CODE_SLOT, (_, i) => '<code>' + codes[Number(i)] + '</code>');
  return out;
}

function stripIndent(lines) {
  const width = lines
    .filter((l) => l.trim())
    .reduce((min, l) => Math.min(min, l.match(/^ */)[0].length), 99);
  return lines.map((l) => l.slice(width));
}

// Renders a block of markdown. Returns { html, toc }.
function renderBlocks(src, toc, depth) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const isListStart = (l) => /^\s*([-*]|\d+\.)\s+/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Raw HTML block. A line that starts an element at column zero is passed
    // straight through until the next blank line. The hand written pages use
    // this for the card grid on the home page.
    if (/^<[a-zA-Z]/.test(line)) {
      const block = [];
      while (i < lines.length && lines[i].trim()) {
        block.push(lines[i]);
        i++;
      }
      out.push(block.join('\n'));
      continue;
    }

    // Fenced code.
    const fence = line.match(/^\s*(```|~~~)(.*)$/);
    if (fence) {
      const marker = fence[1];
      const lang = fence[2].trim().split(/\s+/)[0] || '';
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        '<div class="code" data-lang="' +
          escapeHtml(lang) +
          '"><pre><code>' +
          escapeHtml(body.join('\n')) +
          '</code></pre></div>'
      );
      continue;
    }

    // Heading.
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length + depth;
      const raw = heading[2].trim();
      const id = slug(raw);
      if (depth === 0 && (level === 2 || level === 3)) {
        toc.push({ id, text: raw.replace(/[`*]/g, ''), level });
      }
      const tag = 'h' + Math.min(level, 6);
      out.push('<' + tag + ' id="' + id + '">' + inline(raw) + '</' + tag + '>');
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr />');
      i++;
      continue;
    }

    // Table.
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = (l) =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((x) => x.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }
      out.push(
        '<div class="table-wrap"><table><thead><tr>' +
          head.map((h) => '<th>' + inline(h) + '</th>').join('') +
          '</tr></thead><tbody>' +
          rows
            .map(
              (r) =>
                '<tr>' + r.map((cell) => '<td>' + inline(cell) + '</td>').join('') + '</tr>'
            )
            .join('') +
          '</tbody></table></div>'
      );
      continue;
    }

    // Blockquote.
    if (/^\s*>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push('<blockquote>' + renderBlocks(body.join('\n'), toc, depth).html + '</blockquote>');
      continue;
    }

    // List. Items may carry indented continuation blocks.
    if (isListStart(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const baseIndent = line.match(/^ */)[0].length;
      const items = [];
      while (i < lines.length) {
        const cur = lines[i];
        if (!cur.trim()) {
          const next = lines[i + 1] || '';
          const deeper = next.trim() && next.match(/^ */)[0].length > baseIndent;
          if (!deeper) break;
          if (items.length) items[items.length - 1].push('');
          i++;
          continue;
        }
        const indent = cur.match(/^ */)[0].length;
        if (indent < baseIndent) break;
        if (indent === baseIndent && isListStart(cur)) {
          items.push([cur.replace(/^\s*([-*]|\d+\.)\s+/, '')]);
          i++;
          continue;
        }
        if (!items.length) break;
        items[items.length - 1].push(cur);
        i++;
      }

      const rendered = items.map((raw) => {
        const first = raw[0];
        const rest = raw.length > 1 ? stripIndent(raw.slice(1)) : [];
        const task = first.match(/^\[([ xX])\]\s*(.*)$/);
        const headText = task ? task[2] : first;
        const mark = task
          ? '<span class="task ' +
            (task[1] === ' ' ? 'open' : 'done') +
            '">' +
            (task[1] === ' ' ? 'open' : 'done') +
            '</span> '
          : '';
        const body = rest.length ? renderBlocks(rest.join('\n'), toc, depth + 3).html : '';
        return (
          '<li' +
          (task ? ' class="task-item"' : '') +
          '>' +
          mark +
          inline(headText) +
          body +
          '</li>'
        );
      });

      const tag = ordered ? 'ol' : 'ul';
      out.push('<' + tag + '>' + rendered.join('') + '</' + tag + '>');
      continue;
    }

    // Paragraph.
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(```|~~~|#{1,6}\s|>|\|)/.test(lines[i]) &&
      !isListStart(lines[i]) &&
      !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) out.push('<p>' + inline(para.join(' ')) + '</p>');
  }

  return { html: out.join('\n') };
}

function renderMarkdown(src) {
  const toc = [];
  const { html } = renderBlocks(src, toc, 0);
  return { html, toc };
}

function plainText(src) {
  return src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

/* ------------------------------------------------------------------ *
 * Tabs. A page groups its own H2 sections into a handful of tabs, so a
 * long reference page arrives a screen at a time. The grouping is
 * declared in frontmatter as "Tab name | Heading | Heading". A heading
 * nobody claimed still shows up, under "More", so a new section can
 * never go missing.
 * ------------------------------------------------------------------ */

function splitByH2(html) {
  const parts = html.split(/(?=<h2 )/);
  const intro = parts.length && !parts[0].startsWith('<h2') ? parts.shift() : '';
  return {
    intro,
    sections: parts.map((chunk) => {
      const m = chunk.match(/^<h2 id="[^"]*">([\s\S]*?)<\/h2>/);
      return { text: m ? m[1].replace(/<[^>]+>/g, '').trim() : '', html: chunk };
    }),
  };
}

function buildTabs(html, spec) {
  if (!spec || !spec.length) return null;
  const { intro, sections } = splitByH2(html);
  if (!sections.length) return null;

  const used = new Set();
  const tabs = [];
  for (const group of spec) {
    const [name, ...heads] = group;
    const body = heads
      .map((h) => {
        const found = sections.find((sec) => sec.text === h && !used.has(sec));
        if (found) used.add(found);
        return found ? found.html : '';
      })
      .join('');
    if (body.trim()) tabs.push({ name, html: body });
  }
  if (!tabs.length) return null;

  const leftover = sections.filter((sec) => !used.has(sec));
  if (leftover.length) tabs.push({ name: 'More', html: leftover.map((sec) => sec.html).join('') });
  if (intro.trim()) tabs[0].html = intro + tabs[0].html;
  return tabs;
}

function parseTabSpec(lines) {
  return (lines || [])
    .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
    .filter((group) => group.length >= 2);
}

/* ------------------------------------------------------------------ *
 * Frontmatter. A tiny subset of YAML, enough for these pages.
 *
 *   title:    string
 *   section:  string, one of SECTION_ORDER
 *   order:    number
 *   summary:  string
 *   facts:    list of "Label | Value" for the spec strip
 *   docs:     list of "Label | url-slug-or-full-url"
 * ------------------------------------------------------------------ */

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  let key = null;
  for (const raw of match[1].split('\n')) {
    if (!raw.trim()) continue;
    // A list item is any indented line under a key that was left empty.
    // Both "  - value" and "  value" are accepted.
    const item = raw.match(/^\s+(?:-\s+)?(.*\S)\s*$/);
    if (item && key && Array.isArray(meta[key])) {
      meta[key].push(item[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const pair = raw.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (pair) {
      key = pair[1];
      const value = pair[2].trim().replace(/^["']|["']$/g, '');
      meta[key] = value === '' ? [] : value;
    }
  }
  return { meta, body: text.slice(match[0].length) };
}

function splitPair(entry) {
  const idx = entry.indexOf('|');
  if (idx === -1) return { label: entry.trim(), value: '' };
  return { label: entry.slice(0, idx).trim(), value: entry.slice(idx + 1).trim() };
}

function docHref(value) {
  return /^https?:/.test(value) ? value : DOCS_ROOT + value.replace(/^\/+/, '');
}

/* ------------------------------------------------------------------ *
 * Collect pages.
 * ------------------------------------------------------------------ */

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function handWrittenPages() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((n) => n.endsWith('.md'))
    .sort()
    .map((name) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, name), 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const { html, toc } = renderMarkdown(body);
      return {
        tabs: buildTabs(html, parseTabSpec(meta.tabs)),
        id: name.replace(/\.md$/, '').replace(/^\d+-/, ''),
        title: meta.title || name,
        section: meta.section || 'Start here',
        order: Number(meta.order || 50),
        summary: meta.summary || '',
        facts: (meta.facts || []).map(splitPair),
        docs: (meta.docs || []).map(splitPair).map((d) => ({ label: d.label, value: docHref(d.value) })),
        source: 'site/content/' + name,
        generated: false,
        html,
        toc,
        text: plainText(body),
      };
    });
}

// Reads the shape of a workspace so the example page can state the facts
// without anybody keeping a table up to date by hand.
function workspaceFacts(ws) {
  const facts = [];
  const prompt = (readIfExists(path.join(ws.dir, 'PROMPT.md')) || '').trim();
  const manifest = readJson(path.join(ws.dir, 'reset.json'), {});
  const claudeDir = path.join(ws.dir, '.claude');

  const has = (rel) => fs.existsSync(path.join(claudeDir, rel));
  const count = (rel) => {
    const abs = path.join(claudeDir, rel);
    if (!fs.existsSync(abs)) return 0;
    return fs.readdirSync(abs).filter((n) => !n.startsWith('.')).length;
  };

  const carries = [];
  if (count('skills')) carries.push(count('skills') + ' skill' + (count('skills') > 1 ? 's' : ''));
  if (count('agents')) carries.push(count('agents') + ' subagents');
  if (count('output-styles')) carries.push('an output style');
  if (count('rules')) carries.push('rules files');
  const hookFiles = count('hooks');
  if (hookFiles) carries.push(hookFiles + ' hooks');
  if (count('commands')) carries.push(count('commands') + ' commands');
  if (fs.existsSync(path.join(ws.dir, '.mcp.json'))) carries.push('an MCP server');

  facts.push({ label: 'Launch from', value: '`examples/' + ws.name + '/`' });
  facts.push({ label: '.claude/ carries', value: carries.join(', ') || 'the bare skeleton' });
  facts.push({
    label: 'Reset restores',
    value: (manifest.restore || []).map((r) => '`' + r + '`').join(', ') || 'nothing',
  });
  facts.push({
    label: 'Has a .solution/',
    value: fs.existsSync(path.join(ws.dir, '.solution')) ? 'yes' : 'no',
  });
  return { facts, prompt, hasPristine: has('..') };
}

// Maps a workspace to the concept pages it demonstrates, so every example
// links back into the concept section and every concept lists its examples.
const EXAMPLE_CONCEPTS = {
  '01-ts-conventions': ['skills', 'claude-md'],
  '02-hooks': ['hooks', 'claude-md', 'settings'],
  '03-prompt-craft': ['skills', 'commands'],
  '04-progressive': ['claude-md', 'rules', 'context'],
  '05-tools-and-output': ['mcp', 'hooks', 'skills', 'context'],
  '06-agent-board': ['subagents', 'skills', 'hooks', 'settings'],
  '07-commands': ['commands', 'skills'],
  '08-report-style': ['output-styles', 'settings', 'claude-md'],
};

// Every example README follows the template's headings, so one grouping
// covers all eight. Anything else the README carries lands under "More".
const EXAMPLE_TABS = [
  ['Overview', 'What you will see', 'How it works'],
  ['The prompt', 'The prompt'],
  ['Watch for', 'What to watch for'],
  ['Speaker notes', 'Speaker notes'],
  ['Try next', 'Try next'],
];

const EXAMPLE_DOCS = {
  '01-ts-conventions': [['Skills', 'skills'], ['Memory and CLAUDE.md', 'memory']],
  '02-hooks': [['Hooks guide', 'hooks-guide'], ['Hooks reference', 'hooks'], ['Settings', 'settings']],
  '03-prompt-craft': [['Skills', 'skills'], ['Slash commands', 'slash-commands']],
  '04-progressive': [['Memory and CLAUDE.md', 'memory'], ['Context window', 'context-window']],
  '05-tools-and-output': [['MCP', 'mcp'], ['Hooks reference', 'hooks'], ['Costs', 'costs']],
  '06-agent-board': [['Subagents', 'sub-agents'], ['Hooks reference', 'hooks'], ['Permissions', 'permissions']],
  '07-commands': [['Slash commands', 'slash-commands'], ['Command reference', 'commands']],
  '08-report-style': [['Output styles', 'output-styles'], ['Settings', 'settings']],
};

function examplePages() {
  return listWorkspaces().map((ws, index) => {
    const readme = readIfExists(path.join(ws.dir, 'README.md')) || '# ' + ws.name;
    const { facts, prompt } = workspaceFacts(ws);

    // The README opens with one paragraph saying what the example teaches.
    // That becomes the page summary, and it is dropped from the body so the
    // page does not print it twice.
    const afterTitle = readme.replace(/^#\s+.*\n/, '').replace(/^\s+/, '');
    const split = afterTitle.indexOf('\n\n');
    const opener = split === -1 ? afterTitle : afterTitle.slice(0, split);
    const isProse = opener.trim().length > 0 && !/^[#|>`*-]/.test(opener.trim());
    const summary = isProse ? opener.replace(/\s+/g, ' ').trim() : '';
    const rest = isProse ? afterTitle.slice(opener.length) : afterTitle;

    const { html, toc } = renderMarkdown(rest);

    // PROMPT.md is the verbatim prompt. It leads the tab that the README's
    // own "The prompt" section also lands in, so the two never split up.
    const tabs = buildTabs(html, EXAMPLE_TABS);
    const card = prompt
      ? '<div class="prompt-card"><div class="lbl">Paste this, verbatim</div><pre><code>' +
        escapeHtml(prompt) +
        '</code></pre></div>'
      : '';
    if (tabs && card) {
      const slot = tabs.find((t) => t.name === 'The prompt');
      if (slot) slot.html = card + slot.html;
      else tabs.splice(1, 0, { name: 'The prompt', html: card });
    }

    return {
      tabs,
      related: EXAMPLE_CONCEPTS[ws.name] || [],
      id: ws.name,
      title: ws.name,
      section: 'The eight examples',
      order: index,
      summary,
      facts,
      docs: (EXAMPLE_DOCS[ws.name] || []).map(([label, v]) => ({ label, value: docHref(v) })),
      source: 'examples/' + ws.name + '/README.md',
      generated: true,
      html,
      toc,
      text: plainText(readme),
    };
  });
}

function fieldNotePages() {
  const sources = [
    { file: 'MEMORY.md', id: 'memory-log', title: 'Project memory', order: 10,
      summary: 'One line per durable fact, with the date it was learned.' },
    { file: 'docs/before-the-talk.md', id: 'before-the-talk', title: 'Verify before the talk', order: 20,
      summary: 'The checks that move between Claude Code versions.' },
    { file: 'docs/decisions.md', id: 'decisions', title: 'Decisions', order: 30,
      summary: 'Five open questions from the build plan, and what got chosen.' },
    { file: 'CLAUDE.md', id: 'repo-claude-md', title: 'The root CLAUDE.md', order: 40,
      summary: 'The writing rules and the layout rules for this repository.' },
    { file: 'template/README.md', id: 'template', title: 'The workspace template', order: 50,
      summary: 'The canonical skeleton every example is a copy of.' },
  ];

  return sources
    .map((s) => {
      const raw = readIfExists(path.join(REPO_ROOT, s.file));
      if (!raw) return null;
      const { html, toc } = renderMarkdown(raw.replace(/^#\s+.*\n/, ''));
      return {
        tabs: null,
        id: s.id,
        title: s.title,
        section: 'Field notes',
        order: s.order,
        summary: s.summary,
        facts: [],
        docs: [],
        source: s.file,
        generated: true,
        html,
        toc,
        text: plainText(raw),
      };
    })
    .filter(Boolean);
}

/* ------------------------------------------------------------------ *
 * The page shell.
 * ------------------------------------------------------------------ */

const STYLES = `
/* Light only, deliberately. Every colour is declared here and the body
   paints its own background, so the page holds whatever ground it lands on. */
:root{
  color-scheme: light;
  --ground:#f6f7f9;
  --surface:#ffffff;
  --surface-2:#eef1f5;
  --ink:#131820;
  --ink-2:#3d4756;
  --muted-text:#5d6775;
  --line:#dde1e8;
  --line-strong:#c3cad4;
  --accent:#8a5606;
  --accent-soft:#f6ecd9;
  --accent-line:#dcb877;
  --code-bg:#f2f4f7;
  --shadow:0 1px 2px rgba(19,24,32,.05), 0 8px 24px -18px rgba(19,24,32,.35);
  --sans:"IBM Plex Sans","Segoe UI",system-ui,-apple-system,sans-serif;
  --cond:"IBM Plex Sans Condensed","IBM Plex Sans","Segoe UI Semibold",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
body{
  margin:0;background:var(--ground);color:var(--ink);
  font-family:var(--sans);font-size:15.5px;line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid var(--accent-line)}
a:hover{border-bottom-color:var(--accent)}
a:focus-visible,button:focus-visible,input:focus-visible{
  outline:2px solid var(--accent);outline-offset:2px;border-radius:2px;
}
.lbl{
  font-family:var(--mono);font-size:10px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted-text);
}

/* ---------- frame ---------- */
.shell{display:grid;grid-template-columns:206px minmax(0,1fr);min-height:100vh}
.shell[data-view="home"]{grid-template-columns:minmax(0,1fr)}
.shell[data-view="home"] nav{display:none}
.masthead{
  grid-column:1 / -1;display:flex;align-items:center;gap:16px;
  padding:0 24px;height:56px;border-bottom:1px solid var(--line);
  background:var(--surface);position:sticky;top:0;z-index:20;
}
.wordmark{display:flex;align-items:baseline;gap:10px;border:0}
.wordmark:hover{border:0}
.wordmark b{font-family:var(--cond);font-weight:600;font-size:16px;color:var(--ink)}
.wordmark span{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-text)}
.masthead .grow{flex:1}
#q{
  width:220px;padding:6px 10px;font-family:var(--sans);font-size:13px;
  background:var(--ground);color:var(--ink);
  border:1px solid var(--line-strong);border-radius:3px;
}
#q::placeholder{color:var(--muted-text)}

/* ---------- nav ---------- */
nav{
  border-right:1px solid var(--line);background:var(--surface);
  padding:20px 0 60px;position:sticky;top:56px;align-self:start;
  height:calc(100vh - 56px);overflow-y:auto;
}
.navgroup{margin-bottom:6px}
.navhead{
  display:flex;align-items:center;gap:8px;width:100%;
  padding:7px 18px;background:none;border:0;cursor:pointer;text-align:left;
  font-family:var(--mono);font-size:10px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted-text);
}
.navhead:hover{color:var(--ink)}
.navhead .chev{
  flex:none;width:7px;height:7px;border-right:1.5px solid currentColor;
  border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform .16s ease;
}
.navgroup.open .navhead .chev{transform:rotate(45deg)}
.navhead .nm{flex:1}
.navgroup.open .navhead .ct{opacity:0}
.navlinks{display:none;padding-bottom:10px}
.navgroup.open .navlinks{display:block}
nav a{
  display:block;padding:4px 18px 4px 17px;border:0;border-left:2px solid transparent;
  color:var(--ink-2);font-size:13.5px;line-height:1.45;
}
nav a:hover{background:var(--surface-2);color:var(--ink);border-bottom:0}
nav a.on{border-left-color:var(--accent);color:var(--ink);background:var(--accent-soft);font-weight:500}
nav a .n{font-family:var(--mono);font-size:11px;color:var(--muted-text);margin-right:7px}
nav a.on .n{color:var(--accent)}

/* ---------- main ---------- */
main{min-width:0}
.doc{padding:34px 48px 120px;max-width:812px}
article{min-width:0}

.eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-text)}
h1.title{
  font-family:var(--cond);font-weight:600;font-size:38px;line-height:1.12;
  letter-spacing:-.005em;margin:12px 0 0;text-wrap:balance;
}
h1.title .num{color:var(--accent-line);margin-right:12px;font-variant-numeric:tabular-nums}
.lead{font-size:18px;line-height:1.55;color:var(--ink-2);margin:14px 0 0;max-width:64ch;text-wrap:pretty}

/* facts strip */
.spec{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
  border:1px solid var(--line);border-radius:4px;background:var(--surface);
  margin:26px 0 0;overflow:hidden;box-shadow:var(--shadow);
}
.spec > div{padding:13px 16px;border-left:1px solid var(--line);min-width:0}
.spec > div:first-child{border-left:0}
.spec .v{font-size:13.5px;margin-top:7px;overflow-wrap:anywhere}
.spec .v code{font-size:12.5px}
.spec:has(+ .morefacts){border-radius:4px 4px 0 0}
.morefacts{
  display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 20px;
  margin:-1px 0 0;padding:14px 16px;background:var(--surface);
  border:1px solid var(--line);border-radius:0 0 4px 4px;
}
.morefacts dt{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted-text);white-space:nowrap}
.morefacts dd{margin:0;font-size:13.5px}

/* tabs */
.tabs{display:flex;gap:22px;margin:30px 0 0;border-bottom:1px solid var(--line);overflow-x:auto}
.tabs button{
  flex:none;background:none;border:0;cursor:pointer;padding:0 0 11px;
  border-bottom:2px solid transparent;color:var(--muted-text);
  font-family:var(--sans);font-size:13.5px;white-space:nowrap;
}
.tabs button:hover{color:var(--ink)}
.tabs button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--accent);font-weight:500}
.panel{padding-top:8px}

/* prose */
article h2{font-family:var(--cond);font-weight:600;font-size:22px;line-height:1.25;margin:30px 0 10px;text-wrap:balance}
article h3{font-family:var(--cond);font-weight:600;font-size:16.5px;margin:24px 0 8px;text-wrap:balance}
article h4{font-family:var(--cond);font-weight:600;font-size:14.5px;margin:20px 0 6px;color:var(--ink-2)}
article p{margin:0 0 15px}
article ul,article ol{margin:0 0 15px;padding-left:20px}
article li{margin:0 0 7px}
article li > ul,article li > ol{margin-top:7px}
article li > p{margin:7px 0}
hr{border:0;border-top:1px solid var(--line);margin:26px 0}
blockquote{margin:0 0 16px;padding:2px 0 2px 16px;border-left:2px solid var(--accent-line);color:var(--ink-2)}

code{
  font-family:var(--mono);font-size:.875em;background:var(--code-bg);
  border:1px solid var(--line);border-radius:3px;padding:1px 4px;overflow-wrap:anywhere;
}
.code{background:var(--code-bg);border:1px solid var(--line);border-radius:4px;margin:0 0 16px;overflow-x:auto;position:relative}
.code::before{
  content:attr(data-lang);position:absolute;top:0;right:8px;
  font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-text);
}
.code pre{margin:0;padding:13px 15px}
.code code{background:none;border:0;padding:0;font-size:13px;line-height:1.6}
pre{overflow-x:auto}

.table-wrap{overflow-x:auto;margin:0 0 18px;border:1px solid var(--line);border-radius:4px}
table{border-collapse:collapse;width:100%;font-size:14px}
th{
  text-align:left;font-family:var(--mono);font-size:10.5px;letter-spacing:.11em;
  text-transform:uppercase;color:var(--muted-text);font-weight:500;
  padding:9px 13px;background:var(--surface-2);border-bottom:1px solid var(--line);white-space:nowrap;
}
td{padding:9px 13px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:last-child td{border-bottom:0}
td code{font-size:12.5px}
.task{
  font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;
  border:1px solid var(--line-strong);border-radius:2px;padding:0 4px;color:var(--muted-text);margin-right:5px;
}
li.task-item{list-style:none;margin-left:-20px}

/* prompt card and chips */
.prompt-card{border:1px solid var(--line);border-radius:4px;background:var(--surface);padding:14px 16px 16px;margin:26px 0 0;box-shadow:var(--shadow)}
.prompt-card pre{margin:10px 0 0;font-family:var(--mono);font-size:12.5px;line-height:1.6;white-space:pre-wrap;color:var(--ink)}
.prompt-card code{background:none;border:0;padding:0;font-size:12.5px}
.chips{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:18px 0 0}
.chip{
  font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;
  border:1px solid var(--line-strong);border-radius:99px;padding:3px 10px;
  color:var(--ink-2);background:var(--surface);
}
a.chip{border-bottom:1px solid var(--line-strong)}
a.chip:hover{border-color:var(--accent);color:var(--accent)}

/* docs panel */
.docs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 26px;margin:6px 0 0}
.docs a{border:0;border-left:2px solid var(--accent-line);padding:2px 0 2px 11px;color:var(--ink-2);font-size:14px}
.docs a:hover{border-left-color:var(--accent);color:var(--accent)}
.docs .host{display:block;font-family:var(--mono);font-size:10px;color:var(--muted-text)}
.srcnote{font-family:var(--mono);font-size:10.5px;color:var(--muted-text);margin:44px 0 0;padding-top:16px;border-top:1px solid var(--line)}

/* ---------- home ---------- */
.home-wrap{max-width:920px;margin:0 auto;padding:88px 40px 110px}
.hero{display:flex;align-items:center;gap:34px}
/* The mark's height comes from the title and lead beside it. It is a stretched
   flex item with no content of its own, so the row height is set by the text
   and the mark fills it. Its width is the matching share of the ratio, set by
   fitMark() once the text has laid out. The number here is the fallback. */
.hero .mark{
  flex:none;align-self:stretch;width:165px;
  background-position:center;background-size:contain;background-repeat:no-repeat;
}
.hero-text{min-width:0}
.home-wrap h1{font-family:var(--cond);font-weight:600;font-size:46px;line-height:1.1;letter-spacing:-.01em;margin:0;text-wrap:balance}
.home-wrap .lead{font-size:19px;max-width:58ch;margin-top:20px}
.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.btn{
  display:inline-flex;align-items:center;height:40px;padding:0 18px;border-radius:3px;
  font-size:13.5px;border:1px solid var(--line-strong);color:var(--ink-2);background:var(--surface);
}
.btn:hover{border-color:var(--accent-line);color:var(--ink)}
.btn.primary{border:1.5px solid var(--accent);color:var(--accent);background:transparent}
.btn.primary:hover{background:var(--accent-soft)}
.srows{margin-top:72px;border-top:1px solid var(--line)}
.srow{
  display:flex;align-items:center;gap:36px;padding:26px 0;
  border-bottom:1px solid var(--line);border-left:0;color:var(--ink);
}
.srow:hover{border-bottom-color:var(--line)}
.srow .who{width:264px;flex:none}
.srow .who h2{font-family:var(--cond);font-weight:600;font-size:19px;margin:0;text-wrap:balance}
.srow .who .lbl{margin-top:6px;display:block}
.srow .what{flex:1;font-size:14.5px;color:var(--ink-2);line-height:1.5;min-width:0}
.srow .go{flex:none;font-size:13px;color:var(--accent)}
.homefoot{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-text);margin-top:40px}

/* ---------- search ---------- */
.results a{display:block;border:0;border-bottom:1px solid var(--line);padding:12px 0;color:var(--ink)}
.results a:hover{color:var(--accent)}
.results .sec{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-text)}
.results .t{font-family:var(--cond);font-weight:600;font-size:16px;display:block}
.results .x{font-size:13px;color:var(--muted-text)}
mark{background:var(--accent-soft);color:var(--accent);padding:0 1px}

@media (max-width:900px){
  .shell{grid-template-columns:1fr}
  nav{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:12px 0}
  .doc{padding:26px 20px 80px}
  .home-wrap{padding:56px 20px 80px}
  .home-wrap h1{font-size:34px}
  .hero{flex-direction:column;align-items:flex-start;gap:22px}
  .hero .mark{align-self:flex-start;width:104px;aspect-ratio:369 / 420}
  h1.title{font-size:30px}
  .spec{grid-template-columns:1fr}
  .spec > div{border-left:0;border-top:1px solid var(--line)}
  .spec > div:first-child{border-top:0}
  .srow{flex-wrap:wrap;gap:12px}
  .srow .who{width:100%}
  .docs{grid-template-columns:1fr}
  #q{width:140px}
}
@media (prefers-reduced-motion: reduce){ *{animation:none !important;transition:none !important} }
`;

const SECTION_BLURBS = {
  'Start here': 'Install it, run one example, and learn the three rules the rest of the repository depends on.',
  'Repo staples': 'The files every workspace repeats. What each one is for, and what happens when it is wrong.',
  'Claude Code concepts': 'One page per feature. Where it lives, when it loads, and whether it is context or enforcement.',
  'The eight examples': 'Generated from each workspace README, with its prompt and its reset manifest read off disk.',
  'Scripts': 'The repository tooling, and how to add a page or a ninth example to this site.',
  'Field notes': 'The project memory, the checks that move between versions, and the decisions behind the build.',
};

// site/logo.png rides along as a data URI, so the page stays one file.
// Swap that file and rebuild to change the mark. Drop it and the hero
// falls back to the title on its own.
function readLogo() {
  const file = path.join(SITE_DIR, 'logo.png');
  if (!fs.existsSync(file)) return '';
  return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
}

function buildBody(pages, meta) {
  const logo = readLogo();
  const bySection = SECTION_ORDER.map((name) => ({
    name,
    pages: pages.filter((p) => p.section === name).sort((a, b) => a.order - b.order),
  })).filter((s) => s.pages.length);

  // The nav shows one section open at a time. Which one is decided in the
  // browser, from the page you are on.
  const nav = bySection
    .map((s, gi) => {
      const links = s.pages
        .map((p) => {
          const num = /^\d\d-/.test(p.id) ? '<span class="n">' + p.id.slice(0, 2) + '</span>' : '';
          const label = /^\d\d-/.test(p.id) ? p.title.slice(3) : p.title;
          return '<a href="#/' + p.id + '" data-id="' + p.id + '">' + num + escapeHtml(label) + '</a>';
        })
        .join('');
      const gid = 'g' + gi;
      return (
        '<div class="navgroup" data-group="' + escapeHtml(s.name) + '">' +
        '<button class="navhead" type="button" aria-expanded="false" aria-controls="' + gid + '">' +
        '<span class="chev" aria-hidden="true"></span>' +
        '<span class="nm">' + escapeHtml(s.name) + '</span>' +
        '<span class="ct">' + s.pages.length + '</span>' +
        '</button>' +
        '<div class="navlinks" id="' + gid + '">' + links + '</div>' +
        '</div>'
      );
    })
    .join('');

  const sections = bySection
    .filter((s) => s.name !== 'Start here')
    .map((s) => ({
      name: s.name,
      count: s.pages.length,
      first: s.pages[0].id,
      blurb: SECTION_BLURBS[s.name] || '',
    }));

  const data = pages.map((p) => ({
    id: p.id,
    title: p.title,
    section: p.section,
    summary: p.summary,
    facts: p.facts,
    docs: p.docs,
    related: p.related || [],
    tabs: p.tabs || null,
    source: p.source,
    generated: p.generated,
    html: p.html,
    text: p.text,
  }));

  const startId = (bySection.find((s) => s.name === 'Start here') || { pages: [] }).pages
    .map((p) => p.id)
    .filter((id) => id !== 'index')[0] || 'index';
  const exampleId = (bySection.find((s) => s.name === 'The eight examples') || { pages: [] }).pages
    .map((p) => p.id)[0] || 'index';

  return `<title>Claude Code Crash Course</title>
<style>${STYLES}</style>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" />

<div class="shell" id="shell" data-view="doc">
  <header class="masthead">
    <a class="wordmark" href="#/index"><b>Claude Code Crash Course</b><span>field manual</span></a>
    <div class="grow"></div>
    <input id="q" type="search" placeholder="Search the manual" aria-label="Search" autocomplete="off" />
  </header>
  <nav id="nav">${nav}</nav>
  <main id="main"></main>
</div>

<script>
const PAGES = ${JSON.stringify(data)};
const SECTIONS = ${JSON.stringify(sections)};
const BUILT = ${JSON.stringify(meta)};
const LOGO = ${JSON.stringify(logo)};
const START_ID = ${JSON.stringify(startId)};
const EXAMPLE_ID = ${JSON.stringify(exampleId)};
const byId = Object.fromEntries(PAGES.map(p => [p.id, p]));
const shell = document.getElementById('shell');
const main = document.getElementById('main');
let currentPage = null;

function esc(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function md(s){
  return esc(s)
    .replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>')
    .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
}
function shortTitle(p){ return /^\\d\\d-/.test(p.id) ? p.title.slice(3) : p.title; }

function docsHtml(p){
  return '<div class="docs">' + p.docs.map(d =>
    '<a href="' + d.value + '" target="_blank" rel="noopener">' + esc(d.label) +
    '<span class="host">code.claude.com</span></a>').join('') + '</div>';
}

function renderHome(){
  const p = byId['index'];
  shell.setAttribute('data-view', 'home');
  const rows = SECTIONS.map(sec =>
    '<a class="srow" href="#/' + sec.first + '">' +
      '<div class="who"><h2>' + esc(sec.name) + '</h2><span class="lbl">' + sec.count + ' pages</span></div>' +
      '<div class="what">' + esc(sec.blurb) + '</div>' +
      '<div class="go">Browse</div>' +
    '</a>').join('');

  const mark = LOGO ? '<div class="mark" style="background-image:url(&quot;' + LOGO + '&quot;)"></div>' : '';

  main.innerHTML =
    '<div class="home-wrap">' +
      '<div class="hero">' + mark +
        '<div class="hero-text">' +
          '<h1>' + esc(p.title) + '</h1>' +
          '<p class="lead">' + md(p.summary) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="actions">' +
        '<a class="btn primary" href="#/' + START_ID + '">Start here</a>' +
        '<a class="btn" href="#/' + EXAMPLE_ID + '">The eight examples</a>' +
      '</div>' +
      '<div class="srows">' + rows + '</div>' +
      '<div class="homefoot">Built from the repository &middot; ' + BUILT.pages +
        ' pages &middot; ' + BUILT.examples + ' examples &middot; tested on ' + esc(BUILT.version) + '</div>' +
      (p.html ? '<div class="srcnote" style="margin-top:56px"></div>' + p.html : '') +
    '</div>';
  markNav('index');
  fitMark();
  // The web font swaps in after first paint and changes the text height.
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitMark);
}

// The mark is 369x420. Give it the width that matches whatever height the
// title and lead ended up occupying, so the two line up exactly.
const MARK_RATIO = 369 / 420;
function fitMark(){
  const mark = main.querySelector('.hero .mark');
  const text = main.querySelector('.hero-text');
  if(!mark || !text) return;
  if(window.matchMedia('(max-width: 900px)').matches){ mark.style.width = ''; return; }
  const h = text.getBoundingClientRect().height;
  if(h > 0) mark.style.width = Math.round(h * MARK_RATIO) + 'px';
}

function renderDoc(p){
  shell.setAttribute('data-view', 'doc');
  const isNumbered = /^\\d\\d-/.test(p.id);
  const num = isNumbered ? '<span class="num">' + p.id.slice(0, 2) + '</span>' : '';

  const strip = p.facts.length
    ? '<div class="spec">' + p.facts.slice(0, 3).map(f =>
        '<div><span class="lbl">' + esc(f.label) + '</span><div class="v">' + md(f.value) + '</div></div>').join('') + '</div>'
    : '';
  const rest = p.facts.slice(3);
  const more = rest.length
    ? '<dl class="morefacts">' + rest.map(f =>
        '<dt>' + esc(f.label) + '</dt><dd>' + md(f.value) + '</dd>').join('') + '</dl>'
    : '';

  const chips = p.related.length
    ? '<div class="chips"><span class="lbl">Concepts on show</span>' +
      p.related.map(id => '<a class="chip" href="#/' + id + '">' + esc(id) + '</a>').join('') + '</div>'
    : '';

  const tabs = (p.tabs || []).slice();
  if (tabs.length && p.docs.length) tabs.push({ name: 'Docs', html: docsHtml(p) });

  let bodyHtml;
  if (tabs.length){
    bodyHtml =
      '<div class="tabs" role="tablist">' + tabs.map((t, i) =>
        '<button type="button" role="tab" data-tab="' + i + '" aria-selected="' + (i === 0) + '">' +
        esc(t.name) + '</button>').join('') + '</div>' +
      tabs.map((t, i) =>
        '<div class="panel" data-panel="' + i + '"' + (i === 0 ? '' : ' hidden') + '>' + t.html + '</div>').join('');
  } else {
    bodyHtml = '<div class="panel">' + p.html + (p.docs.length ? docsHtml(p) : '') + '</div>';
  }

  main.innerHTML =
    '<div class="doc"><article>' +
      '<div class="eyebrow">' + esc(p.section) + '</div>' +
      '<h1 class="title">' + num + esc(shortTitle(p)) + '</h1>' +
      (p.summary ? '<p class="lead">' + md(p.summary) + '</p>' : '') +
      chips + strip + more + bodyHtml +
      '<div class="srcnote">' + esc(p.source) +
        (p.generated ? ' &middot; generated by npm run site' : ' &middot; edit and rebuild') + '</div>' +
    '</article></div>';

  markNav(p.id);
}

function selectTab(i){
  main.querySelectorAll('[data-tab]').forEach(b =>
    b.setAttribute('aria-selected', String(Number(b.dataset.tab) === i)));
  main.querySelectorAll('[data-panel]').forEach(el => {
    el.hidden = Number(el.dataset.panel) !== i;
  });
}

function markNav(id){
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.id === id));
  const active = document.querySelector('#nav a.on');
  document.querySelectorAll('.navgroup').forEach(g => {
    const holds = active && g.contains(active);
    g.classList.toggle('open', !!holds);
    g.querySelector('.navhead').setAttribute('aria-expanded', holds ? 'true' : 'false');
  });
}

function search(term){
  const t = term.trim().toLowerCase();
  if(t.length < 2){ route(); return; }
  const hits = PAGES.map(p => {
    const hay = (p.title + ' ' + p.summary + ' ' + p.text).toLowerCase();
    const at = hay.indexOf(t);
    return at === -1 ? null : { p, snippet: (p.title + ' ' + p.summary + ' ' + p.text).slice(Math.max(0, at - 60), at + 120) };
  }).filter(Boolean).slice(0, 30);

  shell.setAttribute('data-view', 'doc');
  main.innerHTML =
    '<div class="doc"><article><div class="eyebrow">Search</div>' +
    '<h1 class="title">' + hits.length + ' page' + (hits.length === 1 ? '' : 's') +
    ' match "' + esc(term) + '"</h1><div class="results" style="margin-top:26px">' +
    hits.map(h => '<a href="#/' + h.p.id + '"><span class="sec">' + esc(h.p.section) + '</span>' +
      '<span class="t">' + esc(shortTitle(h.p)) + '</span>' +
      '<span class="x">' + esc(h.snippet).replace(new RegExp('(' + t.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'ig'), '<mark>$1</mark>') +
      '</span></a>').join('') + '</div></article></div>';
}

function route(){
  const raw = location.hash.replace(/^#\\//, '');
  const [id, anchor] = raw.split('#');
  const p = byId[id || 'index'];
  currentPage = p || byId['index'];
  if(currentPage.id === 'index') renderHome(); else renderDoc(currentPage);
  window.scrollTo(0, 0);
  if(anchor){
    const el = document.getElementById(anchor);
    if(el){
      const panel = el.closest('[data-panel]');
      if(panel) selectTab(Number(panel.dataset.panel));
      el.scrollIntoView({ block: 'start' });
    }
  }
}

main.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]');
  if(tab) selectTab(Number(tab.dataset.tab));
});
document.getElementById('nav').addEventListener('click', e => {
  const head = e.target.closest('.navhead');
  if(!head) return;
  const group = head.parentElement;
  const open = !group.classList.contains('open');
  group.classList.toggle('open', open);
  head.setAttribute('aria-expanded', open ? 'true' : 'false');
});

window.addEventListener('hashchange', route);
window.addEventListener('resize', fitMark);
document.getElementById('q').addEventListener('input', e => search(e.target.value));
// This manual is light only, on purpose. There is no dark palette and no
// toggle, so clear a preference an earlier build may have stored.
try { localStorage.removeItem('ccc-theme'); } catch (err) {}

route();
</script>`;
}

function buildDocument(body) {
  return (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '<meta name="description" content="Field manual for the eight example workspaces. What each Claude Code feature does, how the repository is put together, and what breaks." />\n' +
    '<style>html,body{margin:0}img{max-width:100%}[hidden]{display:none !important}</style>\n' +
    '</head>\n<body>\n' +
    body +
    '\n</body>\n</html>\n'
  );
}

/* ------------------------------------------------------------------ */

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(c.red('build-site: site/content/ is missing.'));
    process.exit(1);
  }

  const pages = [...handWrittenPages(), ...examplePages(), ...fieldNotePages()];
  if (!pages.some((p) => p.id === 'index')) {
    console.error(c.red('build-site: site/content needs a page whose id is "index".'));
    process.exit(1);
  }

  const meta = {
    built: new Date().toISOString().slice(0, 10),
    version: CLAUDE_CODE_TESTED_VERSION,
    examples: listWorkspaces().length,
    pages: pages.length,
  };

  const body = buildBody(pages, meta);
  const page = buildDocument(body);

  if (process.argv.includes('--check')) {
    const current = readIfExists(OUT_PAGE);
    // The build date changes every day, so compare everything except that line.
    const strip = (s) => String(s).replace(/"built":"\d{4}-\d\d-\d\d"/, '');
    if (strip(current) !== strip(page)) {
      console.log(c.red(c.bold('site stale')) + ': run `npm run site` and commit site/index.html');
      process.exit(1);
    }
    console.log(c.green(c.bold('site ok')) + ': ' + meta.pages + ' pages, up to date');
    return;
  }

  fs.mkdirSync(SITE_DIR, { recursive: true });
  fs.writeFileSync(OUT_PAGE, page, 'utf8');
  fs.writeFileSync(OUT_BODY, body, 'utf8');

  console.log(
    c.green(c.bold('site built')) +
      ': ' +
      meta.pages +
      ' pages (' +
      meta.examples +
      ' examples) into site/index.html'
  );
  console.log(c.dim('Open it with: open site/index.html'));
}

main();
