# CUMA GARIS. — Interactive Episode (Kiroween 2026 · Frankenstein)

**Watch the anime. Then fight its climax yourself.**

An interactive 1-minute anime episode that runs entirely in the browser.
You watch Episode 1 of the Indonesian anime serial **CUMA GARIS.** — then,
at the exact moment the hero's sword forms, the episode freezes and hands
you the fight: a short Three.js duel mini-game. Win or survive, and the
ending you get is the ending you earned.

## The Frankenstein stitch

This project exists for Kiroween's **Frankenstein** category: technologies
that were never meant to live in one body, sewn into a single creature —

1. **AI-generated anime clips** — scenes of Raka, a boy whose body is a
   single line in a graffiti-magic world, generated from the serial's own
   character design sheets.
2. **Indonesian TTS narration** — a full Bahasa Indonesia voice track with
   synchronized subtitles, produced by a local ffmpeg/TTS assembly
   pipeline originally built for the serial's TikTok episodes.
3. **A Three.js fighting mini-game** — a real-time 3D duel (attack / guard
   / hook with cooldowns, telegraphed enemy strikes) embedded at the
   episode's climax as its branching point.
4. **A scene-player state machine** — vanilla-JS glue that treats video
   scenes, narration, the game, and two fully different endings as one
   continuous episode.

Static site only: no backend, no login. Open the URL and play.

## The story

Raka (16) wakes up in Desa Garis, a village of living drawings, with his
body reduced to a single line — the lowest caste in a world where magic is
painted glyphs. Mocked by everyone ("Cuma garis doang!" — "Just a line,
what can you even do?"), he is beaten down when a wild ink monster attacks
the market… until its magic **shatters on contact** with his empty line
body. His line is natural anti-magic — and it can become a sword.

That sword swing is where you come in.

## Built with Kiro (spec-driven)

This repository is developed with **Kiro** using spec-driven development:

- `.kiro/specs/episode-interaktif/` — requirements (EARS acceptance
  criteria), design, and the ordered task list that drives the build.
- `.kiro/steering/proyek.md` — a steering doc carrying the CUMA GARIS.
  world bible, canon rules, and credit discipline into every session.

*(The `.kiro` folder is intentionally committed — it is part of the
submission.)*

## Disclosure

Per Kiroween rules: the episode adapts Episode 1 of the author's existing
CUMA GARIS. serial project. The narration-assembly approach (ffmpeg + TTS)
and the mini-game code patterns were adapted from the author's prior work
(the serial's episode pipeline and a make.fun FPS entry). **All
interactive-application code, specs, steering, integration, and the
branching/duel design in this repo are new**, created during the Kiroween
period with Kiro.

## Run it

Serve the folder with any static server, e.g.:

```bash
npx serve .
```

Then open the page on a phone (vertical-first 9:16 stage) or desktop.

## Demo video outline (< 3 minutes)

| Time | Content |
|---|---|
| 0:00–0:20 | The idea: an anime episode you don't just watch — you fight its climax |
| 0:20–1:10 | Playthrough: Scenes 1–5 with Indonesian narration + subtitles |
| 1:10–1:45 | The duel, then Ending A; quick replay from branch point → Ending B |
| 1:45–2:30 | How it was built with Kiro: specs → steering → tasks → code (show `.kiro/`) |
| 2:30–2:50 | The Frankenstein stitch recap + closing |

## Status

Specs and script are ready; build in progress for Kiroween 2026
(submission deadline 4 Dec 2026 PT). See `STATUS-PREP.md`.
