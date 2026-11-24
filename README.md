# CUMA GARIS. — Interactive Episode (Kiroween 2026 · Frankenstein)

**Watch the anime. Then fight its climax yourself.**

An interactive one-minute anime episode that runs entirely in the browser.
You watch Episode 1 of the Indonesian anime serial **CUMA GARIS.** — then,
at the exact moment the hero's sword forms, the episode freezes and hands
you the fight: a short Three.js duel mini-game. Win or survive, and the
ending you get is the ending you earned.

- **Play it:** GitHub Pages link — *to be added once Pages is enabled
  (see "Run it locally" below in the meantime).*
- **Demo video (2:12):** YouTube link — *to be added after upload.*
- **Built for:** Kiroween 2026 (Devpost) — **Frankenstein** category.

## The Frankenstein stitch

This project exists for Kiroween's **Frankenstein** category: technologies
that were never meant to live in one body, sewn into a single creature —

1. **AI-generated anime clips** — scenes of Raka, a boy whose body is a
   single line in a graffiti-magic world, generated from the serial's own
   character design sheets.
2. **Indonesian TTS narration** — a full Bahasa Indonesia voice track,
   rendered sentence by sentence and joined per scene, with subtitles
   synchronized to each sentence. Produced by a local ffmpeg/TTS assembly
   pipeline originally built for the serial's TikTok/Facebook episodes.
3. **A Three.js fighting mini-game** — a real-time 3D duel (attack /
   guard / hook with a cooldown, telegraphed enemy strikes) embedded at
   the episode's climax as its branching point.
4. **A scene-player state machine** — vanilla-JavaScript glue that treats
   video scenes, narration, the game, and two completely different
   endings as one continuous episode.

Static site only: no backend, no build step, no login. Open the page
and play.

## The story

Raka (16) wakes up in Desa Garis, a village of living drawings, with his
body reduced to a single line — the lowest caste in a world where magic
is painted glyphs. Mocked by everyone ("Cuma garis doang!" — "Just a
line, what can you even do?"), he is beaten down when a Wild Scribble, a
formless ink monster, attacks the market… until its magic **shatters on
contact** with his empty line body. His line is natural anti-magic — and
it can become a sword.

That sword swing is where you come in.

## How to play

1. **Watch** Scenes 1–5 (about 50 seconds) with Indonesian narration and
   synchronized subtitles — the format of a subbed anime episode.
   Subtitles are bilingual: use the **EN/ID toggle** in the control bar
   to switch subtitles and UI text between English (default) and
   Indonesian; the narration audio stays Indonesian either way.
2. **The branch point:** the frame freezes as Raka's line-sword forms.
   An overlay appears: *"GILIRANMU — Lawan Coretan Liar!"* ("Your turn —
   fight the Wild Scribble!").
3. **Fight the duel** as Raka. Both sides have 100 HP and the duel is
   capped at 45 seconds:
   - **Sword Swing** — 15 damage.
   - **Weaver's Hook** — 30 damage, 4-second cooldown.
   - **Line Shield** — blocks the next incoming strike, cutting its
     damage by 40%.
   - The Wild Scribble telegraphs its claw strike (700 ms warning) and
     hits for 18 damage roughly every 2.8 seconds — shield or out-damage
     it.
   - A **skip-duel button** is always available; skipping counts as the
     "survive" outcome, honestly recorded in the end card's duel summary.
   - If WebGL is unavailable or the Three.js CDN import fails, the duel
     automatically falls back to a quick-time button mode with identical
     balance and outcome rules — the episode never dead-ends.
4. **Your result picks the ending** — not a menu:
   - **Ending A (Win):** the market is saved; the boy they laughed at
     protects them all.
   - **Ending B (Survive):** Raka holds on, but something far bigger is
     erasing the world.
   Both endings are fully animated with their own narration and end
   cards, and both end on the serial's signature cliffhanger:
   *"BERSAMBUNG — Episode 2 besok."* ("To be continued — Episode 2
   tomorrow.") **Play Again** restarts from the branch point, not from
   Scene 1.

## Tech stack

- **Vanilla JavaScript (ES modules)** — scene player, state machine,
  subtitle renderer, endings logic (`src/`).
- **Three.js 0.169.0** — the duel, lazy-loaded as an ES module from the
  unpkg CDN (`src/duel/duelGame.js`); DOM quick-time fallback in
  `src/duel/duelFallback.js`.
- **HTML5 video/audio + a JSON episode script** — all story content
  (scenes, narration timing, branch, endings) lives in
  `data/episode.json`; no narration text is hard-coded in the game code.
- **ffmpeg + TTS pipeline** — narration rendered per sentence (11
  sentences) and joined per scene; clips and posters under `assets/`.
- **Static hosting** — designed for GitHub Pages; no server code.

## Built with Kiro (spec-driven)

This repository was developed with **Kiro** using spec-driven
development. The `.kiro/` folder is committed on purpose — it is part of
the submission:

- `.kiro/specs/episode-interaktif/requirements.md` — requirements
  written as EARS acceptance criteria.
- `.kiro/specs/episode-interaktif/design.md` — the design document the
  implementation follows.
- `.kiro/specs/episode-interaktif/tasks.md` — the ordered task list
  that drove each build phase, checked off as work completed.
- `.kiro/steering/proyek.md` — a steering file carrying the CUMA GARIS.
  world bible, canon rules (natural anime movement, Raka's single
  red-black line, anti-magic as a property of his body), and credit
  discipline into every Kiro session.

## Disclosure

Per Kiroween rules: the episode adapts Episode 1 of the author's
existing CUMA GARIS. serial project. The narration-assembly approach
(ffmpeg + TTS) and mini-game code patterns were adapted from the
author's prior work (the serial's episode pipeline and a make.fun FPS
entry). **All interactive-application code, specs, steering, integration,
and the branching/duel design in this repo are new**, created during the
Kiroween period with Kiro.

## Run it locally

Serve the folder with any static file server, for example:

```bash
npx serve .
```

or

```bash
python3 -m http.server
```

Then open the page on a phone (the stage is vertical-first, 9:16) or a
desktop browser. An internet connection is needed for the Three.js CDN
module; if it cannot load, the duel's no-WebGL fallback mode takes over
automatically.

## Demo video outline (< 3 minutes)

The demo video (2:12, English voice-over with burned-in English
subtitles) follows this outline:

| Segment | Content |
|---|---|
| Hook | The idea: an anime episode you don't just watch — you fight its climax |
| Playthrough | Scenes 1–5 with Indonesian narration + subtitles |
| The duel | The branch point and the duel, then Ending A; quick replay → Ending B |
| Built with Kiro | Specs → steering → tasks → code (showing `.kiro/`) |
| Close | The Frankenstein stitch recap + closing |

## Known pre-submission TODOs

- GitHub Pages activation and the public play link.
- Demo video upload (YouTube) and the final Devpost submission.

## License

No license file has been added yet; all rights are reserved by the
author unless a license is added later.

## Status

Build complete (all spec phases implemented and verified); submission
package in final preparation for Kiroween 2026 (deadline 5 December
2026, 05:00 WIB).
