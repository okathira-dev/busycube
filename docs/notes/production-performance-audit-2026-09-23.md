# Production performance audit — 2026-09-23

## Scope

This audit covers the production deployment at
<https://busycube.okathira.com/> and the shared application UI:

- the stage catalogue landing page;
- Settings;
- About;
- production response headers, caching, compression, console errors, and
  DevTools Issues;
- initial shared JavaScript, CSS, and DOM cost.

Individual stage behavior and the stage review checklist are explicitly out of
scope. `docs/notes/stage-review.md` was not changed.

## Method

- Lighthouse CLI 13.5.0 with the installed Chrome, using a fresh Chrome process
  for every run.
- Five sequential runs for the landing page in the default mobile profile.
- Five sequential runs for the landing page with the desktop preset.
- Three sequential mobile runs each for Settings and About.
- A PageSpeed Insights mobile run as an independent remote-lab comparison.
- Live Chrome inspection for DOM counts and the scripts injected into the
  resulting document.
- Direct production HTTP requests for headers, cache behavior, and content
  encoding.
- A clean production build to compare the deployed asset hashes and sizes with
  the current source tree.

Runs were sequential rather than concurrent so that they did not compete for
CPU. The tables report medians and observed ranges, not a selected best run.

## Results

### Lighthouse categories

| Page and profile | Runs | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: | ---: |
| Catalogue, mobile | 5 | 94 (93–94) | 100 | 92 | 100 |
| Catalogue, desktop | 5 | 100 | 100 | 92 | 100 |
| Settings, mobile | 3 | 91 (90–95) | 100 | 92 | 100 |
| About, mobile | 3 | 92 (91–92) | 100 | 92 | 100 |

The PageSpeed Insights remote mobile run scored 92, with FCP 2.3 s, LCP
2.3 s, TBT 220 ms, CLS 0, and Speed Index 2.4 s. The difference from the local
repeated runs demonstrates why the score must be treated as a range rather than
a deterministic test result.

### Catalogue loading metrics

| Metric | Mobile median (range) | Desktop median (range) |
| --- | ---: | ---: |
| FCP | 2,444 ms (2,434–2,476) | 617 ms (610–625) |
| LCP | 2,594 ms (2,584–2,626) | 617 ms (610–625) |
| Speed Index | 2,444 ms (2,434–2,476) | 617 ms (610–625) |
| TBT | 47.8 ms (36.8–60.0) | 0 ms |
| CLS | 0 | 0 |
| Main-thread work | 651 ms (646–658) | 164 ms (164–165) |
| JavaScript execution | 226 ms (224–230) | 55.8 ms (55.2–56.2) |
| Initial transfer | 203,094 bytes | 203,117 bytes |
| DOM elements reported by Lighthouse | 1,649 | 1,649 |

In the representative median mobile trace, main-thread work consisted of:

- Style and Layout: 286 ms;
- Script Evaluation: 234 ms;
- Other: 106 ms;
- Rendering: 13.8 ms;
- Garbage Collection: 13.1 ms.

That trace contained two long tasks: 183 ms attributed to
`client-DOl403eP.js`, and 142 ms attributed to the document.

### Other shared pages

| Page | FCP median (range) | LCP median (range) | TBT median (range) | DOM elements |
| --- | ---: | ---: | ---: | ---: |
| Settings | 2,626 ms (2,294–2,637) | 2,998 ms (2,396–3,011) | 18 ms (17.5–26.5) | 70 |
| About | 2,561 ms (2,551–2,590) | 2,853 ms (2,841–2,887) | 11 ms (11–12.5) | 60 |

Settings had the highest observed LCP and the largest variance. Its additional
route chunks transferred about 13 KiB. About loaded about 5.9 KiB of additional
route chunks. TBT remained low on both pages.

## Findings

### P0 — Cloudflare Web Analytics is injected but blocked by CSP

All 16 Lighthouse reports contained both of these failures:

- `errors-in-console`;
- `inspector-issues` with issue type `Content security policy`.

The blocked script was:

```text
https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495
```

The live browser DOM also contained this script alongside the application entry
script. The static HTML returned to a command-line HTTP client did not contain
it, demonstrating that it is injected at the Cloudflare/browser delivery layer
rather than emitted by the Vite build.

The production policy currently allows only `'self'` and
`https://accounts.google.com` for scripts. Consequently, Cloudflare attempts to
inject analytics on every audited route and the browser blocks it before any
analytics code executes.

Decision required:

1. If Cloudflare Web Analytics is not intentionally used, disable the
   Cloudflare-side injection. This preserves the current CSP.
2. If it is intentionally used, document the telemetry decision and add the
   exact required script and beacon origins to the CSP. Do not add a broad
   wildcard.

Removing the conflict should clear the only two scored Best Practices failures;
the result must still be verified with a new production audit.

### P1 — Catalogue renders all 89 cards and keeps them mounted when collapsed

Live Chrome measurements on the initial catalogue:

| State | Total DOM elements | Stage cards | Buttons | List items |
| --- | ---: | ---: | ---: | ---: |
| Initial | 1,674 | 89 | 93 | 89 |
| First Accordion collapsed | 1,674 | 89 | 93 | 89 |
| Search narrowed to one result | 138 | 1 | 4 | 1 |

Collapsing an Accordion changes visibility but does not remove its cards from
the DOM. Lighthouse independently measured 1,649 elements, maximum depth 20,
and 38 children in the largest stage list.

The large catalogue is not a scored Lighthouse failure, but it coincides with
286 ms of Style and Layout work and the largest share of the page's 651 ms
mobile main-thread cost. The measurement supports an optimization experiment;
it does not by itself prove that DOM count is the only cause.

Compare at least these alternatives under the same five-run protocol:

- mount collapsed groups only when they are opened;
- render an initial subset and progressively add more cards;
- window the long lists while preserving keyboard navigation, search, focus
  restoration, and screen-reader semantics.

Accept an alternative only if it materially lowers main-thread Style and Layout
time and does not regress accessibility or catalogue behavior.

### P1 — Every catalogue card fails the label/content-name consistency audit

Lighthouse reported `label-content-name-mismatch` for all 89 catalogue cards in
all ten catalogue runs: 890 findings in total. The audit is currently
experimental and has zero category weight, so the headline Accessibility score
still displays 100.

Example:

- visible content: `D-001`, `0/1`, `最初の箱`;
- visually hidden card text: `箱を見る`;
- accessible name: `D-001 最初の箱、0/1、挑戦できる`.

The visually hidden `箱を見る` text is not part of the accessible name because
the card also has an overriding `aria-label`. The redundant label and hidden
text should be removed in the shared `StageCard` component, then checked with
an accessibility test and Lighthouse.

### P1 — Initial JavaScript is the dominant transfer and contains unused code

The representative catalogue run transferred 198 KiB in total:

- scripts: 191,476 bytes across seven successful requests;
- stylesheets: 6,207 bytes across two requests;
- document, manifest, and icons: the remaining bytes.

Scripts therefore accounted for about 94% of the initial transfer. Lighthouse
estimated 65,301 bytes of unused JavaScript:

| Asset | Transfer bytes used by audit | Estimated unused | Unused share |
| --- | ---: | ---: | ---: |
| `index-3sVCMlaX.js` | 78,080 | 34,050 | 43.6% |
| `client-DOl403eP.js` | 67,339 | 31,251 | 46.4% |

Settings and About each reported about 67 KiB of unused JavaScript. The current
source build reproduced the same production asset hashes, so these measurements
correspond to the checked-out code.

Use a bundle composition report before changing chunk boundaries. The first
target is code that is not required to render the shared shell and selected
route. Do not merge stage chunks into the entry path.

### P2 — Two small stylesheets block first render

Lighthouse consistently identified these render-blocking requests:

| Asset | Transfer size | Reported duration |
| --- | ---: | ---: |
| `index-DBLwGZHm.css` | 4,315 bytes | 457 ms |
| `GiftBox-CO41RPk2.css` | 1,892 bytes | 157 ms |

The estimated opportunity was 150 ms. The catalogue LCP element was the
`Busycube` heading; its representative render delay was 286 ms after a 57.6 ms
TTFB. Any critical-CSS experiment should be judged by repeated LCP measurements,
not by eliminating the audit label alone.

### Correction — Production supports Brotli

The initial HTTP client advertised gzip but not Brotli. Its gzip responses
therefore did not establish that Brotli was unavailable. A follow-up GET
request for the production JavaScript asset with
`Accept-Encoding: gzip, deflate, br` returned `Content-Encoding: br`.
An HTML HEAD request advertising `br` also returned Brotli. No compression
configuration change is justified by these measurements.

For reference, recompressing the nine initial script and stylesheet assets
locally at maximum settings produced:

| Encoding | Combined bytes |
| --- | ---: |
| gzip | 184,721 |
| Brotli | 156,019 |

The 28,702-byte difference is only a local comparison of compression formats,
not an available production saving. It must not be used as an implementation
target without measuring the actual Brotli responses received by browsers.

### Passing production characteristics

The following checks passed in Lighthouse or direct response inspection:

- HTTPS and HTTP/3;
- hashed assets with `Cache-Control: public, max-age=31536000, immutable`;
- HTML served from Cloudflare cache with revalidation semantics;
- TTFB around 30–42 ms in the repeated catalogue runs;
- CLS 0 in every run;
- no mixed-content, deprecated-API, image sizing, image aspect-ratio, duplicate
  JavaScript, legacy JavaScript, forced-reflow, or third-party-cookie failures;
- no automatic geolocation or notification permission request;
- back/forward cache audit passed;
- document charset and doctype passed.

### Security hardening observations

These are not current scored failures, but Lighthouse returned the following
hardening guidance:

- CSP uses a host allowlist and has no nonce/hash plus `strict-dynamic`;
- no Trusted Types directive;
- HSTS has a one-year `max-age`, but no `includeSubDomains` or `preload`.

These settings affect subdomains and external Google integration, so they should
be handled as a separate security decision rather than changed solely for a
Lighthouse label.

## Recommended implementation order

1. Resolve the Cloudflare Analytics/CSP ownership decision and re-audit
   production.
2. Fix the shared catalogue card accessible-name mismatch.
3. Produce a bundle composition report for the initial `index`, `client`, and
   locale chunks; split only code that the selected shared route does not need.
4. Prototype one catalogue DOM-reduction strategy and compare five-run medians
   for DOM size, Style and Layout time, LCP, and TBT.
5. Evaluate critical CSS only if a specific low-risk change is identified;
   leave Brotli configuration unchanged.
6. Add repeatable production/preview checks:
   - unexpected console errors and DevTools Issues fail the smoke test;
   - Lighthouse CI records multiple runs and uses median assertions;
   - performance budgets start as warnings until a stable CI baseline exists.

## Suggested initial budgets

These should be introduced as warnings and tightened after several CI runs:

- Best Practices: 100 after the CSP conflict is resolved;
- Accessibility: no automated audit failures, including zero-weight audits;
- mobile LCP: no regression above the current five-run upper bound of 2.63 s;
- mobile TBT: no regression above the current five-run upper bound of 60 ms;
- CLS: 0;
- initial transfer: no regression above 203 KiB;
- initial DOM: no regression above 1,649 elements, followed by a lower threshold
  only after the catalogue experiment succeeds.

## Follow-up on the work branch

The implementation was split into two commits on
`codex/production-quality-audit`: first the Cloudflare Web Analytics CSP
allowance, then the catalogue card accessible-name correction. The Cloudflare
script origin was added to both Worker and Static Assets policies. The card's
overriding `aria-label` and redundant visually hidden action text were removed;
the visible model code, progress, and stage name now supply its accessible name.

The pre-deployment production baseline was rechecked once with Lighthouse
13.5.0: Performance 93, Accessibility 100, Best Practices 92, one console
error, one CSP issue, and 89 card-name mismatches. This agrees with the
earlier repeated production audit. The production deployment still serves the
old version; these findings must be rechecked after the branch reaches `main`.

The changed production build was measured in local Cloudflare preview with a
fresh Chrome process for each Lighthouse run:

| Page | Runs | Performance | Accessibility | Best Practices | Console errors | CSP issues | Card-name mismatches |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Catalogue | 5 | 96–97 | 100 | 100 | 0 | 0 | 0 |
| Settings | 3 | 94 | 100 | 100 | 0 | 0 | — |
| About | 3 | 96 | 100 | 100 | 0 | 0 | — |

The catalogue preview's median LCP was 2,126 ms and median TBT was 122 ms.
These local timings are **not** a like-for-like performance improvement over
the production baseline because the network and hosting environments differ.
Local preview does not inject the Cloudflare beacon, so its clean console does
not yet prove that Web Analytics runs in production. The preview response did
contain the intended CSP, and the Worker/Static Assets header consistency
tests passed. The full test suite passed 120 tests, and `pnpm run check` and
`pnpm run build` passed.

The bounded assessment of findings 3–6 did not identify a low-risk change
that could be justified without a tuning experiment:

- A live preview browser measured 1,582 DOM elements and 89 cards initially;
  collapsing the first Accordion left both counts unchanged. Filtering to one
  card reduced the counts to 134 and 1. All groups are initially expanded, so
  unmounting collapsed content alone would not lower initial DOM cost.
- The preview catalogue's initial network requests included seven JavaScript
  files and two CSS files. Lighthouse estimated 30,589 unused bytes in the
  entry chunk and 28,653 in the React DOM chunk. Source-map inspection showed
  that the latter contains React DOM and Scheduler; the entry chunk contains
  the catalogue and Material UI components. Stage implementations remain in
  separate lazy chunks. No clearly accidental large import was found.
- The preview trace measured 298 ms of Style/Layout and 255 ms of script
  evaluation. Its two render-blocking stylesheets were 4,046 and 1,949
  transferred bytes. Changing the catalogue mounting strategy or CSS delivery
  would require a measured comparison and behavior review, which is outside
  this pass.

### Cloudflare PR Preview verification

PR #62 triggered the normal CI and Cloudflare Preview workflow for commit
`c4c9732`; both jobs passed. Wrangler uploaded 127 new assets and reported
version `ed153f9f-cb23-4ec7-b840-fb9c6811c3b8` at the Access-protected alias
`https://pr-62-busycube.okathira.workers.dev/`.

An authenticated Chrome session loaded the actual Cloudflare Preview:

- The catalogue rendered all 89 cards. Its accessibility tree named the first
  card `D-001 0/1 最初の箱`.
- DOM inspection found zero explicit `aria-label` attributes and zero redundant
  `.sr-only` action spans across the 89 card actions.
- Settings and About both loaded their intended headings. The browser's
  captured warning/error log was empty across the three routes.
- The document contained only the application entry script. Cloudflare Web
  Analytics was not injected on this `workers.dev` Preview hostname, so the
  Preview cannot establish that the production beacon loads or reports data.

Unauthenticated HTTP clients receive a Cloudflare Access `302` redirect on the
Preview alias. Consequently, a fresh-process Lighthouse audit of this remote
URL would measure the Access login page, not Busycube. The Lighthouse results
above are for the changed build in local Cloudflare preview; final analytics
and console verification remains pending on the public production hostname
after the PR is merged and deployed.
