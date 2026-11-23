# Drawing: layout, data, recipes, determinism

## Layout and data

- Lay out inside a layer with CSS flex and grid, not hand-placed coordinates.
- Data drives the picture: bars, ticks and dots are a `.map` over a table, positioned by a scale function; a key comes from the same table.
- Draw with SVG; HTML for text; a canvas only for thousands of particles. three.js (provided) for real 3D: create the renderer once with `preserveDrawingBuffer: true`, render once a frame in a `useLayoutEffect` keyed on `useTime()`, and keep every word in HTML over the canvas.

## Recipes (inside a layer, `const t = useTime()`)

- **Count up**: `const n = Math.round(interpolate(t, [0.5, 2], [0, 76], {easing: Easing.outQuart, clamp: true}))`.
- **Stagger a series**: offset each item's window by its index, `interpolate(t, [0.4 + i * 0.12, 0.9 + i * 0.12], [0, 1], {easing: Easing.outCubic, clamp: true})`, or wrap each in `<Sequence from={0.4 + i * 0.12}>`.
- **A stroke that draws itself**: `const draw = interpolate(t, [1, 2.5], [0, 1], {easing: Easing.inOutCubic, clamp: true})`, then `<path strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />`.
- **Typing**: `text.slice(0, Math.round(interpolate(t, [0, 2], [0, text.length], {clamp: true})))`.
- **A slow move on a photo**: `transform: scale(${interpolate(t, [0, 8], [1, 1.08], {easing: Easing.inOutSine})})`.
- **A long film's chapter rail**: a layer in `<Film>`, filled by `useCompositionTime()` against the scenes' spans.

## Formulas

Variables in italic; `<sup>` and `<sub>` for powers and indices; a fraction is a column over a rule. Each term is its own element, lit on the line that names it. The lines say what a term means; they do not read the formula out.

## Determinism

Beyond film-format.md (time from `useTime()` only, `seededRandom`, no clocks or CSS animations):
- Round computed positions to whole pixels (`Math.round`) for crisp edges.
- Draw an arrow as one filled shape, not a line and a head.
- Use only the font weights the face has.
- Drive three.js from `useTime()`, never from its own clock or loop.
- Keep a growing shape's scale off exactly 0 when it must be seen.
