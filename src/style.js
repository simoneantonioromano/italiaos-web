export const logo = '<svg class="brand-mark" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><rect x=".5" y=".5" width="55" height="55" rx="8" fill="#14242d" stroke="#3b7587"/><path d="M10 40V16h6M46 16v24h-6M21 18h14M28 18v20M21 38h14" fill="none" stroke="#d9f7ff" stroke-width="2.8" stroke-linecap="square"/><path d="M16 40h2M38 16h2" stroke="#59d8ef" stroke-width="2.8" stroke-linecap="square"/></svg>';

export default `
:root {
  color-scheme: dark;
  --paper: #10151a;
  --surface: #171f26;
  --wash: #1c2730;
  --ink: #eff4f7;
  --muted: #aebbc5;
  --line: #2d3a44;
  --strong-line: #52636f;
  --accent: #59d8ef;
  --accent-bright: #88e7f7;
  --green: #a6e2d4;
  --green-wash: #1b3538;
  --display: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --text: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --mono: ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  --page: 1320px;
  --gutter: clamp(18px, 4vw, 56px);
}

* { box-sizing: border-box; }
html { min-width: 280px; background: var(--paper); }
body { margin: 0; color: var(--ink); font: 16px/1.55 var(--text); }
img, svg { display: block; max-width: 100%; }
img { height: auto; }
a { color: inherit; text-decoration-color: var(--strong-line); text-underline-offset: .19em; }
a:hover { color: var(--accent-bright); text-decoration-color: currentColor; }
a:focus-visible, button:focus-visible, input:focus-visible, summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}
::selection { background: var(--accent); color: var(--paper); }
h1, h2, h3, h4, p, figure { margin: 0; }
h1, h2, h3 { overflow-wrap: anywhere; }
button, input, select { font: inherit; }
.skip-link { position: absolute; top: 8px; left: 8px; z-index: 10; transform: translateY(-160%); padding: .7rem 1rem; background: var(--surface); color: var(--ink); }
.skip-link:focus { transform: translateY(0); }
.wrap { width: min(100%, var(--page)); margin-inline: auto; padding-inline: var(--gutter); }

.topline { background: #0b1014; color: #c0cfd9; border-bottom: 1px solid var(--line); font: 600 .71rem/1.4 var(--mono); letter-spacing: .05em; }
.topline .wrap { min-height: 33px; display: flex; justify-content: space-between; align-items: center; gap: .65rem 1.1rem; flex-wrap: wrap; padding-block: .42rem; }
.topline a:hover { color: var(--accent-bright); }
.updated { display: inline-flex; align-items: center; gap: .45rem; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #78dcb2; flex: 0 0 auto; box-shadow: 0 0 0 3px #78dcb225; }
.masthead { background: var(--surface); border-bottom: 1px solid var(--line); }
.masthead .wrap { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding-block: clamp(20px, 4vw, 36px); }
.masthead.wrap { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding-block: clamp(20px, 4vw, 36px); }
.brand { display: inline-flex; gap: clamp(.6rem, 2vw, .9rem); align-items: center; color: var(--ink); text-decoration: none; }
.brand:hover { color: var(--ink); }
.brand-mark { width: clamp(39px, 6vw, 56px); height: auto; flex: 0 0 auto; }
.brand-title { display: block; font: 750 clamp(2rem, 5.1vw, 3.65rem)/.88 var(--text); letter-spacing: -.085em; white-space: nowrap; }
.brand-subtitle { display: block; margin-top: .45rem; color: var(--muted); font: 500 clamp(.77rem, 1.45vw, .92rem)/1.15 var(--text); letter-spacing: -.015em; }

.nav { background: var(--surface); border-bottom: 1px solid var(--strong-line); }
.nav-inner { display: flex; align-items: stretch; gap: clamp(1.1rem, 2.65vw, 2.45rem); overflow-x: auto; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.nav a { display: inline-flex; align-items: center; flex-shrink: 0; min-height: 47px; padding: .45rem 1px .3rem; border-bottom: 3px solid transparent; color: var(--muted); font-size: .85rem; font-weight: 680; line-height: 1.15; white-space: nowrap; text-decoration: none; }
.nav a:hover, .nav .active, .nav a[aria-current="page"] { color: var(--accent-bright); border-bottom-color: var(--accent); }
.nav a:focus-visible { outline-offset: -3px; }

main.wrap { padding-bottom: clamp(40px, 7vw, 92px); }
.intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem 3rem; padding: clamp(26px, 5.5vw, 66px) 0 clamp(20px, 3vw, 39px); border-bottom: 1px solid var(--strong-line); }
.intro > * { min-width: 0; }
.intro:has(> .headline) { display: grid; gap: .52rem; }
.eyebrow { display: block; color: var(--accent-bright); font: 700 .73rem/1.35 var(--mono); letter-spacing: .085em; text-transform: uppercase; }
.headline { margin-top: .32rem; font: 690 clamp(2.45rem, 5.6vw, 4.9rem)/.99 var(--display); letter-spacing: -.071em; text-wrap: balance; }
.lede { max-width: 58ch; margin-top: .75rem; color: var(--muted); font-size: clamp(.93rem, 1.5vw, 1.08rem); line-height: 1.6; }
.edition { position: relative; min-width: min(100%, 215px); padding: .6rem 0 .6rem 1rem; border-left: 3px solid var(--accent); color: var(--muted); font: 600 .75rem/1.55 var(--mono); }
.edition > strong { display: block; color: var(--ink); }
.edition-index { display: block; color: var(--ink); font: 600 1.65rem/1.02 var(--display); }

.layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(228px, .33fr); gap: clamp(24px, 3.3vw, 52px); padding-top: clamp(21px, 3.2vw, 40px); }
.stream, .sidebar { min-width: 0; }
.sidebar { align-self: start; }
.section-title { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; margin-bottom: .85rem; color: var(--ink); font: 600 clamp(1.25rem, 2.7vw, 1.7rem)/1.14 var(--display); letter-spacing: -.04em; }
.section-title small { color: var(--muted); font: 600 .68rem/1.4 var(--mono); letter-spacing: .045em; text-transform: uppercase; }
.lead { position: relative; display: grid; overflow: hidden; background: var(--surface); border: 1px solid var(--line); border-top: 3px solid var(--accent); }
.lead:has(.lead-media img) { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
.lead-media { min-width: 0; margin: 0; background: var(--wash); overflow: hidden; }
.lead-media a, .story-media a { display: block; }
.lead-media img, .story-media img { width: 100%; height: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
.lead-media img { min-height: 265px; max-height: 465px; }
.lead-media:has(.media-credit) { display: flex; flex-direction: column; }
.lead-media:has(.media-credit) img { height: auto; flex: 1; }
.lead-body { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: clamp(19px, 3.3vw, 40px); }
.lead-body h1, .lead-body h2, .lead-body h3 { margin-top: .53rem; font: 680 clamp(1.75rem, 3.5vw, 3.2rem)/1.06 var(--display); letter-spacing: -.051em; text-wrap: pretty; }
.lead:has(.lead-media img) .lead-body :is(h1, h2, h3) { font-size: clamp(1.64rem, 3vw, 2.8rem); }
.lead-body :is(h1, h2, h3) a, .story-body :is(h2, h3, h4) a { text-decoration: none; }
.lead-body :is(h1, h2, h3) a:hover, .story-body :is(h2, h3, h4) a:hover { text-decoration: underline; text-decoration-thickness: .055em; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(14px, 2vw, 23px); }
.lead + .grid, .lead + .section-title, .grid + .section-title { margin-top: clamp(23px, 3.6vw, 43px); }
.story { min-width: 0; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-top-color: var(--strong-line); }
.story-media { margin: 0; overflow: hidden; background: var(--wash); }
.story-body { display: flex; flex: 1; flex-direction: column; align-items: flex-start; padding: clamp(15px, 2.3vw, 25px); }
.story-body :is(h2, h3, h4) { margin-top: .5rem; font: 620 clamp(1.35rem, 2.2vw, 1.93rem)/1.08 var(--display); letter-spacing: -.048em; text-wrap: pretty; }
.story-meta { display: flex; align-items: baseline; flex-wrap: wrap; gap: .25rem .55rem; color: var(--muted); font: 600 .71rem/1.38 var(--mono); }
.story-meta time { white-space: nowrap; }
.category { color: var(--accent-bright); font: 700 .7rem/1.35 var(--mono); letter-spacing: .055em; text-transform: uppercase; text-decoration: none; }
a.category:hover { text-decoration: underline; }
.source { color: var(--green); font-weight: 700; }
.meta-separator { color: var(--strong-line); }
.summary { margin-top: .75rem; margin-bottom: .95rem; color: var(--muted); font-size: .94rem; line-height: 1.6; }
.story-link { display: inline-flex; align-items: center; gap: .35rem; min-height: 35px; color: var(--ink); font-size: .83rem; font-weight: 720; text-decoration: underline; text-decoration-color: var(--strong-line); }
.story-body > .story-link { margin-top: auto; }
.media-credit { display: block; padding: .35rem .65rem; background: var(--wash); color: var(--muted); font: .65rem/1.38 var(--mono); overflow-wrap: anywhere; }

.panel { margin-bottom: 1.15rem; padding: clamp(15px, 2.4vw, 23px); background: var(--surface); border: 1px solid var(--line); border-top: 3px solid var(--accent); }
.panel .section-title { margin-bottom: .65rem; }
.panel > h2, .panel > h3 { margin-bottom: .5rem; font: 620 1.46rem/1.12 var(--display); letter-spacing: -.04em; }
.panel p { margin-top: .47rem; color: var(--muted); font-size: .9rem; }
.panel-list { margin: .35rem 0 0; padding: 0; list-style: none; }
.panel-list li { padding: .57rem 0; border-bottom: 1px solid var(--line); font-size: .86rem; }
.panel-list li:last-child { border-bottom: 0; padding-bottom: .12rem; }
.panel-list a { font-weight: 650; }
.panel-list small { display: block; color: var(--muted); font: .7rem/1.4 var(--mono); }
.tag { display: inline-block; padding: .23rem .46rem; background: var(--green-wash); color: var(--green); font: 700 .65rem/1.2 var(--mono); letter-spacing: .03em; }
.empty { padding: clamp(20px, 4vw, 45px); background: var(--surface); border: 1px dashed var(--strong-line); color: var(--muted); }
.empty > :is(h2, h3) { margin-bottom: .5rem; color: var(--ink); font: 600 1.6rem/1.1 var(--display); }

.page { max-width: 880px; margin-inline: auto; padding-top: clamp(27px, 5vw, 64px); }
.page > .headline { margin-bottom: .55rem; }
.page > .story-meta { margin-block: .85rem 1.15rem; }
.page > :is(figure, .lead-media) { margin-block: 1.3rem; }
.page > :is(figure, .lead-media) img { width: 100%; max-height: 520px; object-fit: cover; }
.prose { max-width: 72ch; margin-top: 1.35rem; }
.prose > * + * { margin-top: .93rem; }
.prose :is(h2, h3) { margin-top: 1.6rem; font: 620 clamp(1.45rem, 3.3vw, 2.12rem)/1.08 var(--display); letter-spacing: -.045em; }
.prose li + li { margin-top: .4rem; }
.prose table { width: 100%; border-collapse: collapse; }
.prose :is(th, td) { padding: .65rem .45rem; border-bottom: 1px solid var(--line); text-align: start; overflow-wrap: anywhere; }
.prose img { margin-block: .7rem; }
.article-back { display: inline-flex; align-items: center; min-height: 40px; margin-bottom: .45rem; color: var(--muted); font-size: .83rem; }
.button { display: inline-flex; align-items: center; justify-content: center; gap: .45rem; width: fit-content; min-height: 44px; padding: .63rem .92rem; background: var(--accent); color: var(--paper); font-size: .87rem; font-weight: 700; text-decoration: none; }
.button:hover { background: var(--accent-bright); color: var(--paper); }
.button--light { background: var(--surface); border: 1px solid var(--strong-line); color: var(--ink); }

.footer { border-top: 1px solid var(--strong-line); background: var(--wash); color: var(--muted); font-size: .84rem; }
.footer .wrap, .footer.wrap, .footer-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .8rem 1.4rem; padding-block: 1.35rem; }
.footer nav { display: flex; flex-wrap: wrap; gap: .55rem 1rem; }
.footer strong { color: var(--ink); }
.footer a { font-weight: 640; }

@media (max-width: 950px) {
  .layout { gap: 22px; grid-template-columns: minmax(0, 1fr) minmax(195px, .38fr); }
  .lead:has(.lead-media img) { grid-template-columns: minmax(0, 1fr); }
  .lead-media img { min-height: 0; max-height: 330px; }
}

@media (max-width: 690px) {
  .topline .wrap { gap: .2rem .75rem; min-height: 30px; font-size: .65rem; }
  .masthead .wrap, .masthead.wrap { gap: .85rem; }
  .nav-inner { gap: 1.05rem; }
  .nav a { min-height: 43px; font-size: .8rem; }
  .intro { flex-direction: column; align-items: flex-start; gap: .9rem; }
  .edition { min-width: 0; }
  .layout { grid-template-columns: minmax(0, 1fr); }
  .lead-media img { max-height: 310px; }
  .footer .wrap, .footer.wrap, .footer-inner { align-items: flex-start; }
}

@media (max-width: 445px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
  .masthead .wrap, .masthead.wrap { flex-wrap: wrap; }
  .story-body :is(h2, h3, h4) { font-size: 1.55rem; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; }
}
`;

