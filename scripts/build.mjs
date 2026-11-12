// Builds the homepage post cards, feed.xml and sitemap.xml from data/posts.json.
//
//   node scripts/build.mjs          rewrite the generated files
//   node scripts/build.mjs --check  fail if any generated file is out of date (used in CI)
//
// Post fields: title, url, date (YYYY-MM-DD, or YYYY-MM when only the month is known),
// source, type (must match a filter pill on the homepage), tags (space separated).
// Posts hosted on this site (url starting "blogs/") also take a summary for the feed and a
// lastmod for the sitemap.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const { site, pages, posts } = JSON.parse(read('data/posts.json'));

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const escape = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isLocal = (post) => !/^https?:\/\//.test(post.url);
const absoluteUrl = (post) => (isLocal(post) ? site + post.url : post.url);
// Month-only dates sort and publish as the 1st of the month.
const fullDate = (date) => (date.length === 7 ? date + '-01' : date);

function ordinal(day) {
    if (day % 100 >= 11 && day % 100 <= 13) return day + 'th';
    return day + ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
}

function displayDate(date) {
    const [year, month, day] = date.split('-').map(Number);
    const monthYear = MONTHS[month - 1] + ' ' + year;
    return day ? ordinal(day) + ' ' + monthYear : monthYear;
}

function rfc822(date) {
    const d = new Date(fullDate(date) + 'T09:00:00Z');
    const pad = (n) => String(n).padStart(2, '0');
    return `${DAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ` +
        `${d.getUTCFullYear()} 09:00:00 +0000`;
}

function validate(indexHtml) {
    const types = new Set([...indexHtml.matchAll(/data-type="([^"]+)"/g)].map((m) => m[1]));
    const errors = [];
    posts.forEach((post, i) => {
        const name = post.title || `post ${i + 1}`;
        for (const field of ['title', 'url', 'date', 'source', 'type', 'tags']) {
            if (!post[field]) errors.push(`${name}: missing "${field}"`);
        }
        if (post.date && !/^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/.test(post.date)) {
            errors.push(`${name}: date "${post.date}" must be YYYY-MM-DD or YYYY-MM`);
        }
        if (post.type && !types.has(post.type)) {
            errors.push(`${name}: type "${post.type}" has no matching filter pill in index.html`);
        }
        if (isLocal(post) && !post.lastmod) errors.push(`${name}: local posts need a "lastmod"`);
    });
    if (errors.length) {
        console.error(errors.join('\n'));
        process.exit(1);
    }
}

function card(post) {
    const external = !isLocal(post);
    const newTab = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    const newTabNote = external ? '<span class="visually-hidden"> (opens in a new tab)</span>' : '';
    return `            <a href="${escape(post.url)}" class="blog-card"${newTab} data-title="${escape(post.title)}" data-tags="${escape(post.tags)}" data-type="${escape(post.type)}">
                <h3>${escape(post.title)}${newTabNote}</h3>
                <time class="post-date" datetime="${post.date}">${displayDate(post.date)}</time>
                <span class="post-source">${escape(post.source)}</span>
            </a>`;
}

function buildIndex(indexHtml, sorted) {
    const pattern = /(<!-- posts:start[^>]*-->\n)[\s\S]*?(\n\s*<!-- posts:end -->)/;
    if (!pattern.test(indexHtml)) throw new Error('index.html is missing the posts:start/posts:end markers');
    return indexHtml.replace(pattern, (_, start, end) => start + sorted.map(card).join('\n') + end);
}

function buildFeed(sorted) {
    const items = sorted.map((post) => {
        const url = escape(absoluteUrl(post));
        const description = post.summary ? `\n      <description>${escape(post.summary)}</description>` : '';
        return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>${description}
    </item>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated from data/posts.json by scripts/build.mjs, do not edit by hand -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mike Tattersall — Blog</title>
    <link>${site}</link>
    <atom:link href="${site}feed.xml" rel="self" type="application/rss+xml" />
    <description>Writing on product management, service design, delivery leadership and AI from Mike Tattersall, Chief Delivery Officer at Hippo Digital, wherever it's published.</description>
    <language>en-gb</language>
    <managingEditor>michaelrwtattersall@gmail.com (Mike Tattersall)</managingEditor>
${items.join('\n')}
  </channel>
</rss>
`;
}

function buildSitemap(sorted) {
    const newestPost = fullDate(sorted[0].date);
    const entries = [
        ...pages.map((page) => ({
            ...page,
            // The homepage changes whenever a post is added.
            lastmod: page.path === '' && newestPost > page.lastmod ? newestPost : page.lastmod,
        })),
        ...sorted.filter(isLocal).map((post) => ({
            path: post.url, lastmod: post.lastmod, changefreq: 'yearly', priority: '0.6',
        })),
    ];
    const urls = entries.map((entry) => `  <url>
    <loc>${site}${entry.path}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`);
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated from data/posts.json by scripts/build.mjs, do not edit by hand -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

const indexHtml = read('index.html');
validate(indexHtml);
// Newest first; Array.prototype.sort is stable, so same-day posts keep their order in the data file.
const sorted = [...posts].sort((a, b) => fullDate(b.date).localeCompare(fullDate(a.date)));

const outputs = {
    'index.html': buildIndex(indexHtml, sorted),
    'feed.xml': buildFeed(sorted),
    'sitemap.xml': buildSitemap(sorted),
};

if (process.argv.includes('--check')) {
    const stale = Object.keys(outputs).filter((file) => read(file) !== outputs[file]);
    if (stale.length) {
        console.error(`Out of date: ${stale.join(', ')}. Run "node scripts/build.mjs" and commit the result.`);
        process.exit(1);
    }
    console.log('Generated files are up to date.');
} else {
    for (const [file, content] of Object.entries(outputs)) writeFileSync(join(root, file), content);
    console.log(`Built ${posts.length} posts into ${Object.keys(outputs).join(', ')}.`);
}
