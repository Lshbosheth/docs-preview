# ranran Chinese Page GSAP Migration Plan

## Background

Target repository:

- `https://github.com/Lshbosheth/ranran`
- Target folder: `chinese/`

This is an older static Chinese-style page created around 2016. The page uses:

- HTML / CSS / Less
- jQuery
- jquery.fullPage
- wow.js
- animate.css

The page theme is Chinese literary / classical style, including sections related to `楚辞`, `九歌`, `山鬼`, `河伯`, `东皇太一`, `湘夫人`, `离骚`, and `七谏`.

Goal: modernize the animation layer with GSAP while preserving the original visual identity and static-page character.

## Main Goal

Replace old jQuery/wow/fullPage animation behavior with GSAP-based animation.

Do not rewrite the whole project into React/Vue unless explicitly requested later.

Keep the first migration small and reversible:

1. Preserve existing HTML structure as much as possible.
2. Preserve existing images and Chinese-style visual assets.
3. Replace interaction animations in `china.js` with GSAP.
4. Only remove `wow.js`, `animate.css`, or `jquery.fullPage` after equivalent GSAP behavior is verified.

## Suggested Migration Phases

### Phase 1: Audit Current Behavior

Inspect these files first:

- `chinese/index.html`
- `chinese/js/china.js`
- `chinese/css/china.css`
- `chinese/css/china.less`
- `chinese/css/banner.css`

Document the current behavior:

- Which elements trigger panel changes.
- Which sections are full-page sections.
- Which `.intro`, `.intro1`, `.intro2`, `.know`, or similar panels are shown/hidden.
- Which animations come from `animate.css` / `wow.js`.
- Which behavior is controlled by `jquery.fullPage`.

### Phase 2: Add GSAP

Use GSAP from npm if the project is converted to a small build setup.

If keeping the page fully static, use CDN script tags:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollToPlugin.min.js"></script>
```

Register plugins when needed:

```js
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
```

### Phase 3: Replace Simple jQuery Effects First

Replace old effects like:

```js
$(".know").fadeOut(1000);
$(".intro").eq(0).show(1000);
```

with GSAP equivalents:

```js
gsap.to(".know", {
  autoAlpha: 0,
  duration: 0.6,
  ease: "power2.out"
});

gsap.fromTo(
  ".intro",
  { autoAlpha: 0, scale: 0.98 },
  { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power2.out" }
);
```

Prefer `autoAlpha` instead of manually mixing `display`, `visibility`, and `opacity`.

### Phase 4: Organize Animation Code

Refactor `china.js` into small functions.

Suggested structure:

```js
function initPageTransitions() {}
function initIntroPanels() {}
function initChapterAnimations() {}
function initScrollScenes() {}
function showPanel(selector) {}
function hidePanel(selector) {}

document.addEventListener("DOMContentLoaded", () => {
  initPageTransitions();
  initIntroPanels();
  initChapterAnimations();
  initScrollScenes();
});
```

Avoid a large chain of `nth-child` click handlers if possible. Prefer data attributes:

```html
<button data-panel-target="#shangui">山鬼</button>
```

```js
document.querySelectorAll("[data-panel-target]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    showPanel(trigger.dataset.panelTarget);
  });
});
```

### Phase 5: Replace wow.js / animate.css

Use GSAP entrance animations instead of `wow.js`.

Example:

```js
gsap.utils.toArray("[data-gsap-reveal]").forEach((el) => {
  gsap.from(el, {
    autoAlpha: 0,
    y: 24,
    duration: 0.8,
    ease: "power2.out",
    scrollTrigger: {
      trigger: el,
      start: "top 80%"
    }
  });
});
```

### Phase 6: Replace fullPage Behavior Carefully

If the page should keep one-screen-per-section navigation, consider:

- `ScrollTrigger` pinned sections.
- `ScrollToPlugin` for section navigation.
- `Observer` only if wheel/touch section snapping needs to be very strict.

Do not remove `jquery.fullPage` until the section navigation is visually verified.

Suggested intermediate approach:

1. Keep `jquery.fullPage`.
2. Replace panel and entrance animations with GSAP.
3. Verify behavior.
4. Then replace `jquery.fullPage` with GSAP scroll behavior if still desired.

## Visual Direction

Keep the original Chinese-style atmosphere.

Possible GSAP upgrades:

- Soft ink-like fade-in for text.
- Slow parallax for background mountains, clouds, or decorative images.
- Scroll-triggered chapter reveals.
- Slight scale and opacity changes for character / poem panels.
- Pinned section transitions for major literary sections.

Avoid over-modernizing the page into a generic flashy landing page.

The goal is:

- More fluid.
- More maintainable.
- Still classical and restrained.

## Acceptance Criteria

The migration is done when:

1. The page opens normally from `chinese/index.html`.
2. Existing sections and content remain visible.
3. Existing click interactions still work.
4. The page no longer depends on `wow.js` for reveal animations.
5. jQuery animation calls such as `fadeIn`, `fadeOut`, `show(duration)`, and `hide(duration)` are replaced with GSAP.
6. No obvious layout overlap or broken image appears on desktop.
7. If full-page scroll behavior is changed, section navigation remains smooth and predictable.

## Verification

After implementation:

1. Open `chinese/index.html` locally or through a simple static server.
2. Test all major click interactions.
3. Scroll through the page from top to bottom.
4. Check browser console for errors.
5. Verify the page at desktop width first.
6. If mobile layout already existed, verify mobile width as a follow-up.

## Notes for Codex

Keep the first pass conservative.

This is a 2016 static project with personal / nostalgic value. Preserve its original structure and atmosphere unless a change is required for the GSAP migration.

Do not replace all CSS or redesign the page from scratch.

Do not introduce a heavy frontend framework in the first migration pass.

