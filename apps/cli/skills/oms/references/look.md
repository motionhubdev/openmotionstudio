# The look: kit, type, frame, colour

## A look of the film's own

- A project's motion decides colour, type and timing by its tokens; its rules are binding (film-format.md, "Motions"). When the person asks for a look change, decide first whether it belongs to the motion or to this film, and ask when it is unclear.
- Without a motion, write the look in `parts/kit.tsx` before drawing: a comment with one look line taken from the subject's own world ("an observatory's star chart at night; ground #0D1320, ink #EEF2F8, one accent #F2B44C for the comet; a serif at 600 for headings"), then the palette `C`, the type scale `T` and a shared `Frame` component. A look from the subject's world holds together; an adjective ("modern", "clean") leaves the choice to a default.
- The ground is a layer in `<Film>`, drawn across every scene.

## Type

- A motion's type scale comes first: its sizes, as its `MOTION.md` and tokens give them, even below the defaults here. Without one: four or five sizes in all, weight and colour doing the rest; headlines 84 px or more, other text 40 px or more (film-format.md), key text 80 px from the frame's sides.
- Name only faces the film loads (its motion's, or one declared from the project's files). A family that is not loaded draws in the machine's fallback, so frames differ between machines, and so does every character the loaded faces lack (Chinese after a Latin face): load a face for each script the film writes. `check` names both. Never look for fonts on the system.
- Large lowercase letters in a sans face can read as capitals; set such a name in the mono face.

## The frame

- **One thing first** in each scene, taking at least a third of the stage; size a hero picture to 70 percent of the width or more.
- **The same frame in every scene**: the heading, the key line and the figure sit in the same layer boxes throughout (the kit's `Frame`), so the eye knows where to look.
- **Clear of the caption**: with `<Film captions>`, keep text and key graphics out of the bottom sixth of the frame (below about y 900 of 1080 at the default caption size; scale it with a motion's `caption` tokens).
- **Pointers read at once**: an arrow, bracket or callout sits where the viewer sees what it refers to; a label that seems to belong to nothing confuses.

## Colour and surface

- One accent for the focus; one meaning a colour through the whole film; the rest dimmed the same way each time.
- Atmosphere at 15 to 25 percent opacity: less vanishes in a video.
- Surfaces separate the figure from the ground: a panel, a shadow, a radial glow. A full-frame linear gradient on a dark ground bands in an MP4; use a radial one or a flat fill.

## Avoid

Small things floating in a dark void; glow, neon and particles as decoration; everything centred, or fading in at once; three cards in a row; corner labels and HUD frames as ornament. Never what a slide deck would give.

## Portrait (9:16)

A portrait film is its own film, not a landscape one squeezed: shorter (30 to 45 seconds, one idea), one figure and one short line a scene, the picture large in the upper part of the frame (about y 160 to 980 of 1920). The last 200 px stay empty: platforms put their name and buttons there.
