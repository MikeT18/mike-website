# miketattersall.com

Plain static HTML and CSS, served by GitHub Pages.

## Adding a post

1. Add an entry to `data/posts.json`: `title`, `url`, `date` (`YYYY-MM-DD`, or `YYYY-MM` if you only know the
   month), `source`, `type` (one of the homepage filter pills) and `tags`. For a post hosted here (a `blogs/`
   page), also add a `summary` for the RSS feed and a `lastmod` date for the sitemap.
2. Run `node scripts/build.mjs`. It rewrites the post cards in `index.html`, `feed.xml` and `sitemap.xml`.
3. Commit the data file and the regenerated files together.

Don't edit the post cards, the feed or the sitemap by hand. CI fails if they don't match `data/posts.json`.

## Checks

These run on every pull request (`.github/workflows/checks.yml`):

- `npm run check:generated`: the generated files match `data/posts.json`.
- `npm run check:links`: no broken links within the site.
- `npm run check:a11y`: pa11y-ci (axe and HTML_CodeSniffer, WCAG AA) on every page. Needs the site served
  locally first with `npm run serve`.

External links are checked weekly with `npm run check:links:external`, because outside sites going down
shouldn't block a pull request.
