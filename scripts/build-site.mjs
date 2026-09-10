#!/usr/bin/env node
// Builds the documentation site from the repository itself.
//
//   npm run build                         write dist/index.html
//   node scripts/build-site.mjs --check   fail if dist/ is stale
//
// Two content sources feed the site.
//
//   1. site/content/*.md    Hand written pages. Frontmatter carries the title,
//                           the section, the spec strip, and the links out to
//                           the Claude Code docs.
//   2. The repository       Every examples/NN-name/README.md, PROMPT.md and
//                           reset.json, plus MEMORY.md and docs/. Add a new
//                           example and it shows up here with no edit to this
//                           script.
//
// Output is one self contained file, dist/index.html. No build step to
// install, no server to run, no network needed except the web font.
// dist/artifact-body.html holds the same page without the document wrapper.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, listWorkspaces, readJson, c, CLAUDE_CODE_TESTED_VERSION } from './lib.mjs';

// site/ holds the sources. dist/ holds the build, and nothing else writes
// there, so it is safe to wipe.
const SITE_DIR = path.join(REPO_ROOT, 'site');
const CONTENT_DIR = path.join(SITE_DIR, 'content');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const OUT_PAGE = path.join(DIST_DIR, 'index.html');
const OUT_BODY = path.join(DIST_DIR, 'artifact-body.html');

// The talk itself. The PDF is copied into dist/ beside the page and linked,
// not inlined: half a megabyte of slides does not belong in the HTML. Its
// cover is a rendered still, committed next to it, so the build stays plain
// Node and does not need a PDF renderer on the machine that runs it.
const DECK_FILE = 'claude-code-crash-course.pdf';
const DECK_SRC = path.join(SITE_DIR, DECK_FILE);
const DECK_COVER = path.join(SITE_DIR, 'deck-cover.jpg');
const DECK_SLIDES = 22;

const SECTION_ORDER = [
  'Getting started with Claude',
  'Repo staples',
  'Claude Code concepts',
  'The examples',
  'Scripts',
  'Field notes',
];

const DOCS_ROOT = 'https://code.claude.com/docs/en/';

// The repository this site documents. Every page carries a link back to the
// file or directory it was built from, so a reader can go straight to the code.
const REPO_URL = 'https://github.com/kamauwashington/cccc';
const REPO_BRANCH = 'main';

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

// Fences in any of these render as a console pane rather than a code block.
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'term', 'terminal']);

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
    // A shell fence renders as a console pane. Authors keep writing bash.
    if (fence) {
      const marker = fence[1];
      let lang = fence[2].trim().split(/\s+/)[0] || '';
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) {
        body.push(lines[i]);
        i++;
      }
      i++;

      // A switch fence is one console with a pane per platform. Bodies are
      // split on [Label] lines, and the first pane is the one on show.
      if (lang === 'switch') {
        const panes = [];
        let pane = null;
        for (const raw of body) {
          const head = raw.match(/^\s*\[(.+?)\]\s*$/);
          if (head) {
            pane = { name: head[1].trim(), lines: [] };
            panes.push(pane);
            continue;
          }
          if (pane) pane.lines.push(raw);
        }
        if (panes.length) {
          out.push(
            '<div class="switch"><div class="switch-bar" role="tablist">' +
              panes
                .map(
                  (x, i) =>
                    '<button type="button" role="tab" data-sw="' + i + '" aria-selected="' +
                    (i === 0) + '">' + escapeHtml(x.name) + '</button>'
                )
                .join('') +
              '</div>' +
              panes
                .map(
                  (x, i) =>
                    '<div class="code console" data-sw-pane="' + i + '"' +
                    (i === 0 ? '' : ' hidden') + '><pre><code>' +
                    escapeHtml(x.lines.join('\n').replace(/^\n+|\n+$/g, '')) +
                    '</code></pre></div>'
                )
                .join('') +
            '</div>'
          );
          continue;
        }
      }

      // A legend fence annotates the console directly above it. Each line is
      // Label | what that part of the screen is, and the strip renders joined
      // to the pane so the reader stays on the picture instead of dropping
      // into a paragraph underneath it.
      if (lang === 'legend' || lang === 'note') {
        const rows = body
          .map((raw) => raw.trim())
          .filter(Boolean)
          .map((raw) => {
            const cut = raw.indexOf('|');
            return cut === -1
              ? { label: '', text: raw }
              : { label: raw.slice(0, cut).trim(), text: raw.slice(cut + 1).trim() };
          });
        if (rows.length) {
          out.push(
            '<div class="legend' + (lang === 'note' ? ' loose' : '') + '">' +
              rows
                .map(
                  (r) =>
                    '<div class="legend-row">' +
                    (r.label ? '<b>' + inline(r.label) + '</b>' : '<b class="dot">\u2022</b>') +
                    '<span>' + inline(r.text) + '</span></div>'
                )
                .join('') +
            '</div>'
          );
          continue;
        }
      }

      // A callout fence is the one thing on a page that steps out of the walk.
      // The words after the fence tag are its title.
      if (lang === 'callout') {
        const title = fence[2].trim().split(/\s+/).slice(1).join(' ');
        out.push(
          '<div class="callout">' +
            (title ? '<b class="callout-title">' + inline(title) + '</b>' : '') +
            renderBlocks(body.join('\n'), toc, depth).html +
          '</div>'
        );
        continue;
      }

      // capture:<name> prefers a recorded screen over the inline text.
      let text = body.join('\n');
      if (lang.startsWith('capture:')) {
        const name = lang.slice(8).replace(/[^a-zA-Z0-9_-]/g, '');
        const file = path.join(SITE_DIR, 'captures', name + '.txt');
        if (fs.existsSync(file)) text = fs.readFileSync(file, 'utf8').replace(/\s+$/, '');
        lang = 'console';
      }

      out.push(
        '<div class="code' +
          (SHELL_LANGS.has(lang.toLowerCase()) ? ' console' : '') +
          '" data-lang="' +
          escapeHtml(lang) +
          '"><pre><code>' +
          escapeHtml(text) +
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
        // Lines wrapped under an item are the same sentence, not a new block.
        // They join back into the head text so the browser decides where the
        // line breaks, rather than the width the author happened to type at.
        const cont = [];
        let k = 1;
        while (
          k < raw.length &&
          raw[k].trim() &&
          !isListStart(raw[k]) &&
          !/^\s*(```|~~~|#{1,6}\s|>|\||-{3,}|\*{3,}|_{3,})/.test(raw[k].trim())
        ) {
          cont.push(raw[k].trim());
          k++;
        }
        const first = [raw[0]].concat(cont).join(' ');
        const rest = raw.length > k ? stripIndent(raw.slice(k)) : [];
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
        journey: String(meta.journey || '').toLowerCase() === 'true',
        id: name.replace(/\.md$/, '').replace(/^\d+-/, ''),
        title: meta.title || name,
        section: meta.section || 'Start here',
        order: Number(meta.order || 50),
        summary: meta.summary || '',
        facts: (meta.facts || []).map(splitPair),
        docs: (meta.docs || []).map(splitPair).map((d) => ({ label: d.label, value: docHref(d.value) })),
        source: 'site/content/' + name,
        repo: 'site/content/' + name,
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
// covers every one. Anything else the README carries lands under "More".
// Heading names drift between READMEs, so each tab lists every heading it
// will accept. Anything unmatched still ships, in a trailing More tab.
const EXAMPLE_TABS = [
  ['Overview', 'What you will see', 'The point', 'How it works', 'The build', 'The four hooks'],
  ['The prompt', 'The prompt'],
  ['Watch for', 'What to watch for'],
  ['Running it', 'Running it', 'Run it', 'The format is the point', 'Ask two more'],
  ['Try next', 'Try next'],
];

const EXAMPLE_DOCS = {
  '01-ts-conventions': [['Skills', 'skills'], ['Memory and CLAUDE.md', 'memory']],
  '02-hooks': [['Hooks guide', 'hooks-guide'], ['Hooks reference', 'hooks'], ['Settings', 'settings']],
  '03-prompt-craft': [['Skills', 'skills'], ['Slash commands', 'slash-commands']],
  '04-progressive': [['Memory and CLAUDE.md', 'memory'], ['Context window', 'context-window']],
  '05-tools-and-output': [['Costs', 'costs'], ['Settings', 'settings'], ['Permissions', 'permissions']],
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
      section: 'The examples',
      order: index,
      summary,
      facts,
      docs: (EXAMPLE_DOCS[ws.name] || []).map(([label, v]) => ({ label, value: docHref(v) })),
      source: 'examples/' + ws.name + '/README.md',
      repo: 'examples/' + ws.name,
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
    { file: 'docs/captures.md', id: 'captures', title: 'Terminal captures', order: 35,
      summary: 'Every terminal pane on the site, with the exact command to run when replacing it with a real capture.' },
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
        repo: s.file,
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
  --claude:#d27c5c;      /* the Claude Code logo colour, from the terminal */
  --claude-ink:#a84e33;  /* darkened so button text clears 4.5:1 on the ground */
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
.shell[data-view="home"] #nav{display:none}
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
#nav{
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
#nav a{
  display:block;padding:4px 18px 4px 17px;border:0;border-left:2px solid transparent;
  color:var(--ink-2);font-size:13.5px;line-height:1.45;
}
#nav a:hover{background:var(--surface-2);color:var(--ink);border-bottom:0}
#nav a.on{border-left-color:var(--accent);color:var(--ink);background:var(--accent-soft);font-weight:500}
#nav a .n{font-family:var(--mono);font-size:11px;color:var(--muted-text);margin-right:7px}
#nav a.on .n{color:var(--accent)}

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
  align-items:baseline;
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
.tabs button .tnum{
  display:inline-flex;align-items:center;justify-content:center;
  width:17px;height:17px;margin-right:7px;border-radius:50%;
  background:var(--surface-2);color:var(--muted-text);
  font-family:var(--mono);font-size:10.5px;line-height:1;vertical-align:-2px;
}
.tabs button[aria-selected="true"] .tnum{background:var(--accent);color:var(--surface)}
.panel{padding-top:8px}

/* ---------- walkthrough ---------- */
.stephead{display:flex;align-items:center;gap:16px;margin:10px 0 0;flex-wrap:wrap}
.stephead .sn{
  font-family:var(--cond);font-weight:600;font-size:34px;line-height:1;
  color:var(--muted-text);white-space:nowrap;
}
.stephead .sarrow{
  flex:none;width:42px;height:22px;fill:none;stroke:var(--claude);
  stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;
}
.stephead h1.title{margin:0;font-size:38px}
.eyebrow a{color:var(--muted-text);border-bottom-color:var(--line-strong)}
.eyebrow a:hover{color:var(--accent);border-bottom-color:var(--accent)}

.substeps{display:none;margin:2px 0 6px}
.substeps.open{display:block}
#nav a.substep{
  display:flex;align-items:center;gap:9px;
  padding:4px 18px 4px 30px;font-size:13px;color:var(--muted-text);
}
#nav a.substep .sn{
  flex:none;display:inline-flex;align-items:center;justify-content:center;
  width:16px;height:16px;border-radius:50%;background:var(--surface-2);
  font-family:var(--mono);font-size:9.5px;color:var(--muted-text);
}
#nav a.substep:hover{color:var(--ink)}
#nav a.substep.on{
  color:var(--ink);font-weight:500;background:var(--accent-soft);
  border-left-color:var(--accent);
}
#nav a.substep.on .sn{background:var(--accent);color:var(--surface)}

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
/* Anything you would type at a prompt is a console pane. It is the one place
   the page leaves the light palette, which makes it read as a terminal at
   once. The window dots replace the language label. */
.code.console{background:#12161c;border-color:#12161c}
.code.console pre{padding:30px 16px 15px}
.code.console code{color:#c9d1da;font-size:12.5px;line-height:1.75}
.switch{margin:0 0 16px;border:1px solid #12161c;border-radius:4px;overflow:hidden}
.switch-bar{display:flex;gap:2px;padding:0 6px;background:#1b212a;overflow-x:auto}
.switch-bar button{
  flex:none;background:none;border:0;cursor:pointer;padding:9px 12px 8px;
  border-bottom:2px solid transparent;color:#8f9aa8;
  font-family:var(--mono);font-size:11px;letter-spacing:.04em;white-space:nowrap;
}
.switch-bar button:hover{color:#e6eaf0}
.switch-bar button[aria-selected="true"]{color:#f0f3f7;border-bottom-color:var(--claude)}
.switch .code{margin:0;border:0;border-radius:0}
.switch .code::before{display:none}
.switch .code pre{padding:15px 16px}
.code.console::before{content:"";top:11px;left:14px;right:auto;
  width:9px;height:9px;border-radius:50%;background:#3a4553;
  box-shadow:15px 0 0 #3a4553, 30px 0 0 #3a4553;}
.code code{background:none;border:0;padding:0;font-size:13px;line-height:1.6}
pre{overflow-x:auto}

/* A legend is an annotation strip welded to the console above it: the
   explanation sits on the picture rather than in a paragraph after it. */
.legend{
  margin:-16px 0 18px;padding:11px 14px;background:var(--surface-2);
  border:1px solid var(--line);border-top:0;border-radius:0 0 4px 4px;
  display:grid;gap:7px 0;
}
.legend.loose{margin-top:0;border-top:1px solid var(--line);border-radius:4px}
.legend-row{display:grid;grid-template-columns:132px minmax(0,1fr);gap:0 14px;align-items:baseline}
.legend-row b{
  font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted-text);font-weight:500;line-height:1.7;
}
.legend-row b.dot{letter-spacing:0;font-size:13px;text-align:right}
.legend-row span{font-size:13.5px;line-height:1.55;color:var(--ink-2)}
.switch + .legend{border-color:var(--line)}
/* The line straight after a platform switcher is a caption for it. */
.switch + p{font-size:13px;color:var(--ink-2);margin-top:-8px}

.callout{
  margin:0 0 18px;padding:13px 16px;background:var(--accent-soft);
  border:1px solid var(--accent-line);border-left-width:3px;border-radius:4px;
}
.callout > :last-child{margin-bottom:0}
.callout p{font-size:14px}
.callout-title{
  display:block;font-family:var(--cond);font-size:14px;font-weight:600;
  color:var(--ink);margin:0 0 4px;
}

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
.docs{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:10px 20px;margin:6px 0 0}
.docs a{border:0;border-left:2px solid var(--accent-line);padding:2px 0 2px 11px;color:var(--ink-2);font-size:14px}
.docs a:hover{border-left-color:var(--accent);color:var(--accent)}
.docs .host{display:block;font-family:var(--mono);font-size:10px;color:var(--muted-text)}
.pager{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:48px 0 0}
.pager a{
  display:flex;flex-direction:column;gap:5px;border:1px solid var(--line);
  border-radius:5px;padding:14px 16px;background:var(--surface);color:var(--ink);
}
.pager a:hover{border-color:var(--accent-line);background:var(--accent-soft)}
.pager a.next{align-items:flex-end;text-align:right}
/* A step stays on this page. A plain card leaves it. */
.pager a.prev.step{border-left:2px solid var(--accent-line)}
.pager a.next.step{border-right:2px solid var(--accent-line)}
.pager .dir{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-text)}
.pager .t{font-family:var(--cond);font-weight:600;font-size:16px;line-height:1.25}
.srcnote{font-family:var(--mono);font-size:10.5px;color:var(--muted-text);margin:30px 0 0;padding-top:16px;border-top:1px solid var(--line)}
/* Inline, not inline-flex: the note continues in text after this link, and a
   flex box would sit on its own baseline and step out of the line. */
.srcnote .srclink{color:var(--muted-text);border-bottom:1px solid transparent}
.srcnote .srclink:hover{color:var(--accent);border-bottom-color:var(--accent-line)}
.srcnote .gmark{width:12px;height:12px;vertical-align:-2px;margin-right:5px}
.btn.repo{display:inline-flex;align-items:center;gap:8px}
.btn.repo .gmark{width:15px;height:15px;flex:none}

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
.btn.primary{border:1.5px solid var(--claude);color:var(--claude-ink);background:transparent}
.btn.primary:hover{background:#fbf1ed;border-color:var(--claude-ink)}
.btn:hover{border-color:var(--claude);color:var(--ink)}
/* The one hand written thing on the site. It points a first time reader at
   the button they want, in a voice the rest of the page deliberately does
   not use. Hidden on a phone, where the buttons stack and there is no room
   beside them. */
.actions{position:relative}
.newnote{
  position:absolute;left:2px;top:100%;margin-top:14px;
  display:flex;align-items:flex-end;gap:8px;
  transform:rotate(-6deg);transform-origin:left center;pointer-events:none;
}
.newnote span{
  font-family:"Caveat","Bradley Hand","Segoe Script",cursive;
  font-size:22px;line-height:1;color:var(--claude);white-space:nowrap;
  padding-bottom:6px;
}
.newnote svg{flex:none;width:52px;height:46px;fill:none;stroke:var(--claude);
  stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@media (max-width:760px){ .newnote{display:none} }

.srows{margin-top:72px;border-top:1px solid var(--line)}
.srow{
  display:flex;align-items:center;gap:36px;padding:26px 0;
  border-bottom:1px solid var(--line);border-left:0;color:var(--ink);
}
.srow:hover{border-bottom-color:var(--line)}
.srow .who{width:264px;flex:none}
.srow .who h2{
  font-family:var(--cond);font-weight:600;font-size:19px;margin:0;text-wrap:balance;
  display:flex;align-items:center;gap:10px;
}
.srow .sicon{
  flex:none;width:20px;height:20px;color:var(--muted-text);
  transition:color .15s ease;
}
.srow:hover .sicon,.srow:focus-visible .sicon{color:var(--accent)}
.srow .who .lbl{margin-top:6px;display:block;padding-left:30px}
.srow .what{flex:1;font-size:14.5px;color:var(--ink-2);line-height:1.5;min-width:0}
.srow .go{flex:none;font-size:13px;color:var(--accent)}
/* ---------- the deck ---------- */
.deck{
  display:flex;align-items:center;gap:38px;margin-top:56px;padding:30px 32px;
  border:1px solid var(--line);border-radius:6px;background:var(--surface);
  color:var(--ink);
}
.deck:hover{border-color:var(--accent-line)}
/* The cover is lifted off the card, not framed by it. The shadow does the
   lifting, and it deepens on hover so the whole row reads as one target. */
.deckframe{flex:none;width:300px;line-height:0}
.deckshot{
  width:100%;height:auto;border-radius:3px;
  box-shadow:0 1px 2px rgba(19,24,32,.10), 0 10px 22px -6px rgba(19,24,32,.22);
  transition:box-shadow .18s ease, transform .18s ease;
}
.deck:hover .deckshot{
  transform:translateY(-2px);
  box-shadow:0 2px 4px rgba(19,24,32,.12), 0 20px 38px -8px rgba(19,24,32,.30);
}
.decktext{min-width:0}
.decktext h2{font-family:var(--cond);font-weight:600;font-size:21px;margin:8px 0 0}
.decktext p{font-size:14.5px;color:var(--ink-2);line-height:1.5;margin:8px 0 0;text-wrap:pretty}
.deckgo{display:inline-block;margin-top:14px;font-size:13px;color:var(--accent)}
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
  #nav{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:12px 0}
  .doc{padding:26px 20px 80px}
  .stephead .sn{font-size:24px}
  .stephead h1.title{font-size:27px}
  .stephead .sarrow{width:30px}
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
  .deck{flex-direction:column;align-items:flex-start;gap:22px;padding:24px}
  .deckframe{width:100%}
  .docs{grid-template-columns:1fr}
  #q{width:140px}
}
@media (prefers-reduced-motion: reduce){ *{animation:none !important;transition:none !important} }
`;

const SECTION_BLURBS = {
  'Getting started with Claude': 'Install it, run one example, and learn the three rules the rest of the repository depends on.',
  'Repo staples': 'The files every workspace repeats. What each one is for, and what happens when it is wrong.',
  'Claude Code concepts': 'One page per feature. Where it lives, when it loads, and whether it is context or enforcement.',
  'The examples': 'Generated from each workspace README, with its prompt and its reset manifest read off disk.',
  'Scripts': 'The repository tooling, and how to add a page or an example to this site.',
  'Field notes': 'The project memory, the checks that move between versions, and the decisions behind the build.',
};

// One mark per section, drawn inline so the page keeps its single request
// budget. Line art on a 24 box, stroke only, sized and coloured by CSS
// through currentColor. A section with no entry here renders without a mark.
const SECTION_ICONS = {
  'Start here':
    '<path d="M6 3v18"/><path d="M6 4h11l-2.2 3.5L17 11H6"/>',
  'Repo staples':
    '<path d="M9 3h6.5L20 7.5V17a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>' +
    '<path d="M15 3v5h5"/><path d="M4 8v11a2 2 0 0 0 2 2h9"/>',
  'Claude Code concepts':
    '<path d="M12 7.5C10.6 6 8.8 5.2 6.5 5.2H4v12h2.5c2.3 0 4.1.8 5.5 2.3"/>' +
    '<path d="M12 7.5c1.4-1.5 3.2-2.3 5.5-2.3H20v12h-2.5c-2.3 0-4.1.8-5.5 2.3"/>' +
    '<path d="M12 7.5v12"/>',
  'The examples':
    '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/>' +
    '<rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/>' +
    '<rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/>' +
    '<rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
  'Scripts':
    '<rect x="3" y="4.5" width="18" height="15" rx="2"/>' +
    '<path d="M7.5 10l2.5 2.2-2.5 2.2"/><path d="M12.5 15h4"/>',
  'Field notes':
    '<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5l-3-2-3 2-3-2-3 2V5A1.5 1.5 0 0 1 7 3.5Z"/>' +
    '<path d="M9.5 8h5"/><path d="M9.5 11.5h5"/>',
};

function sectionIcon(name) {
  const paths = SECTION_ICONS[name];
  if (!paths) return '';
  return '<svg class="sicon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
}

// site/logo.png rides along as a data URI, so the page stays one file.
// Swap that file and rebuild to change the mark. Drop it and the hero
// falls back to the title on its own.
function readLogoAsset() {
  const file = path.join(SITE_DIR, 'logo.png');
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file);
  // PNG header: the IHDR width and height are big endian at bytes 16 and 20.
  const width = raw.length > 24 ? raw.readUInt32BE(16) : 0;
  const height = raw.length > 24 ? raw.readUInt32BE(20) : 0;
  return {
    dataUri: 'data:image/png;base64,' + raw.toString('base64'),
    width,
    height,
  };
}

function readDeckCover() {
  if (!fs.existsSync(DECK_COVER)) return '';
  return 'data:image/jpeg;base64,' + fs.readFileSync(DECK_COVER).toString('base64');
}

function readLogo() {
  const asset = readLogoAsset();
  return asset ? asset.dataUri : '';
}

// The same mark serves as the tab icon. The logo is taller than it is wide,
// and a browser would squash it to fill a square, so it is centred inside a
// square SVG instead and the padding is transparent. The PNG is offered as a
// fallback for anything that will not take an SVG icon. Both are inline, so
// the tab icon costs no request either.
function buildFavicon() {
  const asset = readLogoAsset();
  if (!asset || !asset.width || !asset.height) return '';

  const side = Math.max(asset.width, asset.height);
  const x = (side - asset.width) / 2;
  const y = (side - asset.height) / 2;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + side + ' ' + side + '">' +
    '<image x="' + x + '" y="' + y + '" width="' + asset.width + '" height="' + asset.height +
    '" href="' + asset.dataUri + '"/></svg>';

  return (
    '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,' +
      Buffer.from(svg, 'utf8').toString('base64') + '" />\n' +
    '<link rel="alternate icon" type="image/png" href="' + asset.dataUri + '" />\n' +
    '<link rel="apple-touch-icon" href="' + asset.dataUri + '" />\n'
  );
}

function buildBody(pages, meta) {
  const logo = readLogo();
  const deckCover = readDeckCover();
  const deckFile = fs.existsSync(DECK_SRC) ? DECK_FILE : '';
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
          const self =
            '<a href="#/' + p.id + '" data-id="' + p.id + '">' + num + escapeHtml(label) + '</a>';
          // A walkthrough hangs its steps under itself, so the whole path is
          // visible from the nav rather than hidden behind a tab bar.
          if (!p.journey || !p.tabs) return self;
          const steps = p.tabs
            .map(
              (t, i) =>
                '<a class="substep" href="#/' + p.id + '/' + (i + 1) + '" data-id="' + p.id +
                '" data-step="' + i + '"><span class="sn">' + (i + 1) + '</span>' +
                escapeHtml(t.name) + '</a>'
            )
            .join('');
          return self + '<div class="substeps" data-for="' + p.id + '">' + steps + '</div>';
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
    .filter((s) => s.name !== 'Getting started with Claude')
    .map((s) => ({
      name: s.name,
      count: s.pages.length,
      first: s.pages[0].id,
      blurb: SECTION_BLURBS[s.name] || '',
      icon: sectionIcon(s.name),
    }));

  const order = bySection.flatMap((sec) => sec.pages.map((p) => p.id));

  // Counts belong to the build, never to the prose. {{examples}} and {{pages}}
  // are filled in here so a ninth workspace does not make a sentence wrong.
  // {{examples}} gives the numeral, {{Examples}} the word, so a sentence can
  // open with it and still read like English.
  const WORDS = [
    'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
    'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
  ];
  const word = (n, capital) => {
    const w = WORDS[n] || String(n);
    return capital ? w : w.toLowerCase();
  };
  const fill = (t) =>
    String(t == null ? '' : t)
      .replace(/\{\{Examples\}\}/g, word(meta.examples, true))
      .replace(/\{\{examplesWord\}\}/g, word(meta.examples, false))
      .replace(/\{\{examples\}\}/g, String(meta.examples))
      .replace(/\{\{pages\}\}/g, String(meta.pages));

  meta.examplesWord = word(meta.examples, false);

  const data = pages.map((p) => ({
    id: p.id,
    title: p.title,
    section: p.section,
    summary: fill(p.summary),
    facts: p.facts,
    docs: p.docs,
    related: p.related || [],
    tabs: p.tabs ? p.tabs.map((t) => ({ name: t.name, html: fill(t.html) })) : null,
    journey: !!p.journey,
    source: p.source,
    repo: p.repo || '',
    generated: p.generated,
    html: fill(p.html),
    text: p.text,
  }));

  const startId = (bySection.find((s) => s.name === 'Getting started with Claude') || { pages: [] }).pages
    .map((p) => p.id)
    .filter((id) => id !== 'index')[0] || 'index';
  const exampleId = (bySection.find((s) => s.name === 'The examples') || { pages: [] }).pages
    .map((p) => p.id)[0] || 'index';

  return `<title>Claude Code Crash Course</title>
<style>${STYLES}</style>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Caveat:wght@600&display=swap" />

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
const ORDER = ${JSON.stringify(order)};
const NEW_NOTE =
  '<div class="newnote" aria-hidden="true">' +
    '<svg viewBox="0 0 52 46">' +
      '<path d="M45 42 C 38 30, 30 18, 15 7" />' +
      '<path d="M15 7 L 26 10" />' +
      '<path d="M15 7 L 14 18" />' +
    '</svg>' +
    '<span>I&rsquo;m new to Claude Code!!!</span>' +
  '</div>';

const BUILT = ${JSON.stringify(meta)};
const LOGO = ${JSON.stringify(logo)};
const REPO = ${JSON.stringify(REPO_URL)};
const DECK_HREF = ${JSON.stringify(deckFile)};
const DECK_COVER_SRC = ${JSON.stringify(deckCover)};
const DECK_SLIDES = ${JSON.stringify(DECK_SLIDES)};
const REPO_BRANCH = ${JSON.stringify(REPO_BRANCH)};
function repoHref(rel){
  const isFile = /\\.[a-z0-9]+$/i.test(rel);
  return REPO + '/' + (isFile ? 'blob' : 'tree') + '/' + REPO_BRANCH + '/' + rel;
}
const GIT_MARK = '<svg class="gmark" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
  'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="7" cy="5.5" r="2.3"/><circle cx="7" cy="18.5" r="2.3"/><circle cx="17" cy="9.5" r="2.3"/>' +
  '<path d="M7 7.8v8.4"/><path d="M17 11.8c0 3.2-2.4 4.6-5.6 5.2"/></svg>';
const START_ID = ${JSON.stringify(startId)};
const EXAMPLE_ID = ${JSON.stringify(exampleId)};
const byId = Object.fromEntries(PAGES.map(p => [p.id, p]));
const shell = document.getElementById('shell');
const main = document.getElementById('main');
let currentPage = null;
let currentTabs = [];      // the tabs of the page on screen
let currentTab = 0;        // which one is open
let stepCount = 0;         // authored steps, so the Docs tab is not counted
let openLastTab = false;   // set when stepping back into the previous page
let requestedStep = 0;     // the step named in the address, for a walkthrough

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

// The deck sits on the page rather than under it: the cover is lifted off the
// ground with a shadow, so it reads as an object you can pick up. It is a
// still of slide one, not an embed, and the link hands over the PDF itself.
function deckCard(){
  if(!DECK_HREF) return '';
  const shot = DECK_COVER_SRC
    ? '<img class="deckshot" src="' + DECK_COVER_SRC + '" alt="The first slide of the deck" ' +
      'width="1120" height="630" loading="lazy" />'
    : '';
  return '<a class="deck" href="' + DECK_HREF + '" target="_blank" rel="noopener">' +
    '<div class="deckframe">' + shot + '</div>' +
    '<div class="decktext">' +
      '<span class="lbl">The talk</span>' +
      '<h2>Claude Code Crash Course</h2>' +
      '<p>The slides the session runs on. ' + DECK_SLIDES + ' of them, as a PDF.</p>' +
      '<span class="deckgo">Open the deck &rarr;</span>' +
    '</div>' +
  '</a>';
}

function renderHome(){
  const p = byId['index'];
  shell.setAttribute('data-view', 'home');
  const rows = SECTIONS.map(sec =>
    '<a class="srow" href="#/' + sec.first + '">' +
      '<div class="who"><h2>' + (sec.icon || '') + '<span>' + esc(sec.name) + '</span></h2>' +
        '<span class="lbl">' + sec.count + ' pages</span></div>' +
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
        '<a class="btn" href="#/' + EXAMPLE_ID + '">The examples</a>' +
        '<a class="btn repo" href="' + REPO + '" target="_blank" rel="noopener">' +
          GIT_MARK + 'The repository</a>' +
        NEW_NOTE +
      '</div>' +
      '<div class="srows">' + rows + '</div>' +
      deckCard() +
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

// Next walks the steps on this page before it moves to the next page, so a
// reader following Next never skips past the middle of a walkthrough.
function pagerHtml(p){
  const at = ORDER.indexOf(p.id);
  const pageAt = (n) => (at === -1 ? null : byId[ORDER[at + n]] || null);

  const count = (i) =>
    p.journey && i < stepCount ? ' &middot; step ' + (i + 1) + ' of ' + stepCount : '';

  const stepCard = (i, dir, label) =>
    '<a class="' + dir + ' step" href="#" data-goto="' + i + '">' +
    '<span class="dir">' + label + count(i) + '</span>' +
    '<span class="t">' + esc(currentTabs[i].name) + '</span></a>';

  const pageCard = (page, dir, label, back) => page
    ? '<a class="' + dir + '" href="#/' + page.id + '"' + (back ? ' data-back="1"' : '') + '>' +
      '<span class="dir">' + label + '</span>' +
      '<span class="t">' + esc(shortTitle(page)) + '</span></a>'
    : '<span></span>';

  // On a walkthrough each step has its own address, so the browser's own back
  // button retraces it too.
  const stepLink = (i, dir, label) =>
    '<a class="' + dir + ' step" href="#/' + p.id + '/' + (i + 1) + '">' +
    '<span class="dir">' + label + count(i) + '</span>' +
    '<span class="t">' + esc(currentTabs[i].name) + '</span></a>';
  const move = p.journey ? stepLink : stepCard;

  const n = currentTabs.length;
  const prev = n && currentTab > 0
    ? move(currentTab - 1, 'prev', 'Back')
    : pageCard(pageAt(-1), 'prev', 'Previous', true);
  const next = n && currentTab < n - 1
    ? move(currentTab + 1, 'next', 'Next')
    : pageCard(pageAt(1), 'next', 'Next');

  return prev + next;
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

  const journey = p.journey && (p.tabs || []).length;
  const tabs = (p.tabs || []).slice();
  stepCount = tabs.length;
  // A walkthrough keeps the docs at the foot of its last step rather than
  // making them an eighth step nobody walks to.
  if (tabs.length && p.docs.length && !journey) tabs.push({ name: 'Docs', html: docsHtml(p) });

  currentTabs = tabs;
  currentTab = openLastTab && tabs.length
    ? tabs.length - 1
    : Math.min(requestedStep, Math.max(0, tabs.length - 1));
  openLastTab = false;

  let bodyHtml;
  if (journey){
    // One step on screen. The path lives in the sidebar and the pager.
    const last = currentTab === tabs.length - 1;
    bodyHtml = '<div class="panel" data-panel="' + currentTab + '">' +
      tabs[currentTab].html +
      (last && p.docs.length ? docsHtml(p) : '') + '</div>';
  } else if (tabs.length){
    bodyHtml =
      '<div class="tabs" role="tablist">' + tabs.map((t, i) =>
        '<button type="button" role="tab" data-tab="' + i + '" aria-selected="' + (i === currentTab) + '">' +
        (p.journey && i < stepCount ? '<span class="tnum">' + (i + 1) + '</span>' : '') +
        esc(t.name) + '</button>').join('') + '</div>' +
      tabs.map((t, i) =>
        '<div class="panel" data-panel="' + i + '"' + (i === currentTab ? '' : ' hidden') + '>' + t.html + '</div>').join('');
  } else {
    bodyHtml = '<div class="panel">' + p.html + (p.docs.length ? docsHtml(p) : '') + '</div>';
  }

  const pager = '<nav class="pager" id="pager">' + pagerHtml(p) + '</nav>';

  const ARROW = '<svg class="sarrow" viewBox="0 0 44 24" aria-hidden="true">' +
    '<path d="M2 12h36" /><path d="M30 4l9 8-9 8" /></svg>';

  const head = journey
    ? '<div class="eyebrow"><a href="#/' + p.id + '">' + esc(shortTitle(p)) + '</a>' +
      ' &middot; step ' + (currentTab + 1) + ' of ' + stepCount + '</div>' +
      '<div class="stephead">' +
        '<span class="sn">Step ' + (currentTab + 1) + '</span>' + ARROW +
        '<h1 class="title">' + esc(tabs[currentTab].name) + '</h1>' +
      '</div>'
    : '<div class="eyebrow">' + esc(p.section) + '</div>' +
      '<h1 class="title">' + num + esc(shortTitle(p)) + '</h1>';

  // The lead and the fact strip introduce the walkthrough, so they belong on
  // its opening step only.
  const intro = !journey || currentTab === 0;

  main.innerHTML =
    '<div class="doc"><article>' +
      head +
      (p.summary && intro ? '<p class="lead">' + md(p.summary) + '</p>' : '') +
      chips + (intro ? strip + more : '') + bodyHtml + pager +
      '<div class="srcnote">' +
        (p.repo
          ? '<a class="srclink" href="' + repoHref(p.repo) + '" target="_blank" rel="noopener">' +
            GIT_MARK + esc(p.repo) + '</a>'
          : esc(p.source)) +
        (p.generated ? ' &middot; generated by npm run build' : ' &middot; edit and rebuild') + '</div>' +
    '</article></div>';

  markNav(p.id, journey ? currentTab : null);
}

function selectTab(i, scroll){
  currentTab = i;
  main.querySelectorAll('[data-tab]').forEach(b =>
    b.setAttribute('aria-selected', String(Number(b.dataset.tab) === i)));
  main.querySelectorAll('[data-panel]').forEach(el => {
    el.hidden = Number(el.dataset.panel) !== i;
  });
  const pager = document.getElementById('pager');
  if(pager && currentPage) pager.innerHTML = pagerHtml(currentPage);
  if(scroll){
    const bar = main.querySelector('.tabs');
    if(bar) bar.scrollIntoView({ block: 'start' });
  }
}

function markNav(id, step){
  document.querySelectorAll('#nav a').forEach(a => {
    const mine = a.dataset.id === id;
    const isStep = a.classList.contains('substep');
    a.classList.toggle('on', mine && (isStep ? Number(a.dataset.step) === step : step === null));
  });
  document.querySelectorAll('.substeps').forEach(el =>
    el.classList.toggle('open', el.dataset.for === id));
  const active = document.querySelector('#nav a.on') ||
    document.querySelector('#nav a[data-id="' + id + '"]');
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
  const [path, anchor] = raw.split('#');
  const bits = (path || 'index').split('/');
  const id = bits[0] || 'index';
  requestedStep = bits[1] ? Math.max(1, parseInt(bits[1], 10)) - 1 : 0;
  const p = byId[id];
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
  const sw = e.target.closest('[data-sw]');
  if(sw){
    const box = sw.closest('.switch');
    const i = Number(sw.dataset.sw);
    box.querySelectorAll('[data-sw]').forEach(btn =>
      btn.setAttribute('aria-selected', String(Number(btn.dataset.sw) === i)));
    box.querySelectorAll('[data-sw-pane]').forEach(el => {
      el.hidden = Number(el.dataset.swPane) !== i;
    });
    return;
  }
  const goto = e.target.closest('[data-goto]');
  if(goto){ e.preventDefault(); selectTab(Number(goto.dataset.goto), true); return; }
  // Stepping back into the previous page lands on its last step, so Back
  // retraces the path Next took.
  if(e.target.closest('[data-back]')) openLastTab = true;
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
    '<meta name="description" content="Field manual for the example workspaces. What each Claude Code feature does, how the repository is put together, and what breaks." />\n' +
    buildFavicon() +
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
      console.log(c.red(c.bold('site stale')) + ': run `npm run build`');
      process.exit(1);
    }
    console.log(c.green(c.bold('site ok')) + ': ' + meta.pages + ' pages, up to date');
    return;
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(OUT_PAGE, page, 'utf8');
  fs.writeFileSync(OUT_BODY, body, 'utf8');

  // The deck rides along beside the page, so the link on the home page
  // resolves both in dist/ and on the published site.
  if (fs.existsSync(DECK_SRC)) fs.copyFileSync(DECK_SRC, path.join(DIST_DIR, DECK_FILE));

  console.log(
    c.green(c.bold('site built')) +
      ': ' +
      meta.pages +
      ' pages (' +
      meta.examples +
      ' examples) into dist/index.html'
  );
  console.log(c.dim('Open it with: open dist/index.html'));
}

main();
