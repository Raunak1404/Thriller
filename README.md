# THE ANCHOR OF YESTERDAY

An animated psychological thriller series, plus the code pipeline that produces it. The pipeline covers the script, Gemini-voiced dialogue, procedural motion graphics, a synthesized score and the final MP4.

> *Everything that was ever made remembers being made.*

A cowardly archivist who can relive the moment any object was made touches a shattered key and watches an older version of himself execute the woman who brought it. The series is built around one scene seen three times: first as a villain's monologue, then from the hero's eyes, and finally as the truth.

## Story

| Document | What's inside |
|---|---|
| [`story/01_SERIES_BIBLE.md`](story/01_SERIES_BIBLE.md) | Characters, world rules, the three reveals of "The Execution", visual language, sound direction |
| [`story/02_EPISODE_01_STORY.md`](story/02_EPISODE_01_STORY.md) | Episode 1 beat sheet, the double-meaning table for every villain line, seeds planted for later |
| [`story/03_SEASON_PLAN.md`](story/03_SEASON_PLAN.md) | All 24 episodes across 3 Parts, and how the "hero is the villain" illusion breaks down |
| [`story/EPISODE_01_SCREENPLAY.md`](story/EPISODE_01_SCREENPLAY.md) | Shot-by-shot screenplay with real timings (generated) |

**Cast:** Elias Thorne (the archivist) · Seren (Keeper of the Loom) · Mister Yesterday (the man who wears Elias's face) · Atropos (the masked one who cuts threads).

## Episode 1: "Two Skies, One Grave" (13:59)

Everything about the episode lives in one file: [`episodes/ep01.js`](episodes/ep01.js). It holds 88 shots and 154 dialogue lines, each with a delivery direction, a kinetic-typography mode, sound cues and timing. Change the script and every downstream step follows: voices, timing, picture, sound and screenplay.

```
episodes/ep01.js ──► tools/generate-voices.js ──► assets/voices/ep01/*.flac  (Gemini TTS, auto-QA'd)
        │                                                   │
        ├──► src/engine (timeline ◄─ voice durations) ──────┤
        │        renderer: 24 scene types, figure rig,      │
        │        kinetic dialogue, HUDs, film post-FX       │
        │                                                   ▼
        ├──► tools/build-soundtrack.js  (synth score + SFX + voices → mix/master)
        └──► tools/render-video.js      (headless Chromium frames → ffmpeg → MP4)
```

## Quick start

Requires Node 20+ and ffmpeg.

```bash
npm install                      # Playwright for headless rendering
npm run soundtrack               # mix build/ep01/soundtrack.{wav,m4a}
npm run preview                  # http://localhost:8080/player/  (watch it live, scrub, chapter jumps)
npm run render                   # build/ep01/ep01.mp4 at 1080p24 (~25 min on 4 cores)
npm run render -- --scale 0.6667 # 720p, about twice as fast
npm run publish-preview          # stage a self-contained web player in build/preview/
```

The voice takes are already in the repo, so you only need an API key to change dialogue.

### Voices (Google Gemini TTS)

Put your key in a git-ignored `.env` file at the repo root:

```
GEMINI_API_KEY=your-key-here
```

```bash
npm run voices                          # generate missing / changed lines only
npm run voices -- --only C09-0,C09-1    # retake specific lines
npm run voices -- --who YESTERDAY --force
npm run voices -- --model gemini-2.5-pro-preview-tts
```

- Default model: `gemini-3.1-flash-tts-preview`, which gave the best-acted takes in testing. `gemini-2.5-pro-preview-tts` is the fallback.
- Each line is sent with the character's persona, the scene's action line and the line's **delivery direction** (for example *"a sudden, explosive, unhinged roar of rage"*).
- **Automatic QA:** a second Gemini model listens to every take and rejects any that read stage directions aloud, drop words or come back silent. Rejected takes are regenerated, and if a safety filter blocks a take, it retries without the scene text.
- Takes are stored raw. Character effects (Atropos's layered chorus, the telephone voicemail, the TV broadcast EQ) live in [`src/cast.js`](src/cast.js) and are applied at mix time, so you can restyle a voice without paying for a new take.

### Visual QA

```bash
npm run check                        # draw every frame at low res and report any scene that throws (~1 min)
npm run stills                       # contact sheet of every shot → build/ep01/contact-sheet.jpg
npm run stills -- --shots C18,A4-06  # specific shots
npm run screenplay                   # regenerate the screenplay from the script
```

## How the engine works

- **Deterministic.** `render(t)` draws the exact frame for second *t*, with no simulation state. Live playback, scrubbing and offline frame export are therefore identical.
- **The figure rig** ([`src/engine/figures.js`](src/engine/figures.js)) is a posable skeleton with costumes (coats that drape when kneeling, anti-gravity hair, white gloves), drawn as rim-lit silhouettes, plus profile and front portraits for close-ups.
- **Kinetic dialogue** ([`src/engine/text.js`](src/engine/text.js)) has seven delivery modes: `sub`, `whisper`, `slam`, `scream`, `glitch`, `type`, `echo`. They are timed word by word to the real voice takes. Slammed words punch the camera, and screams shake it and split the colour channels.
- **Sound** ([`src/audio/`](src/audio)) has 45 synthesized cues: the four-note music-box lullaby, the sub-bass grind of two atmospheres touching, backwards-ticking watches, the Aether choir, glass shatters and room tone. The mixer EQs and loudness-normalizes every line, ducks the score under dialogue, sends each location to a sized reverb, and masters through a look-ahead limiter.

## Making Episode 2

1. Copy `episodes/ep01.js` to `episodes/ep02.js` and write the shots. Existing scenes (rooftop, shop, street, city skies, key, faces) are all reusable through `params`.
2. Add new scene types to `src/engine/scenes/` and register them in `scenes/index.js`.
3. Run `npm run voices -- --episode ep02`, then `npm run soundtrack -- --episode ep02`, then `npm run render -- --episode ep02`.

## Credits & licences

Fonts are Cinzel, Cormorant Garamond, Inter, JetBrains Mono, Bebas Neue and Special Elite (Google Fonts, SIL Open Font License; Special Elite under Apache 2.0), vendored in `assets/fonts`. Voices are generated with Google Gemini TTS.
