// THE ANCHOR OF YESTERDAY — Episode 1: "Two Skies, One Grave"
// Production script: the single source of truth for picture, dialogue and sound.
//
// Shot fields
//   scene   renderer to use (src/engine/scenes/*)      params  scene parameters
//   dur     minimum seconds (grows to fit dialogue)     action  screenplay action line
//   lines   dialogue: { who, text, dir (delivery direction → TTS), fx (kinetic type mode),
//           pre (pause before), at (fixed offset), reuse (replay another line's take),
//           nonverbal (laughs/gasps: skip transcript QA) }
//   audio   cues: { cue, at, dur, ...opts }   `at` may be seconds, 'L2' (line 2 start),
//           'L2e+0.3' (line 2 end + 0.3), 'end-1', 'p0.5' (fraction of shot)
//   supers  on-screen titles      post  grain/vignette/shake/glitch/fades/flash
//   events  named moments (resolved like `at`) that scenes can key animation to
//
// Kinetic type modes: sub · whisper · slam · scream · glitch · type · echo · none

export default {
  id: 'ep01',
  series: 'The Anchor of Yesterday',
  part: 'Part One — The Bruised Sky',
  number: 1,
  title: 'Two Skies, One Grave',
  defaults: {
    post: { grain: 0.05, vignette: 0.55, letterbox: 0.0 },
  },
  sequences: [
    // ────────────────────────────────────────────────────────────── FLASH-FORWARD
    {
      id: 'F',
      title: 'Flash-Forward',
      shots: [
        {
          id: 'F01',
          scene: 'black',
          params: { flashes: [0.6, 1.9, 2.6] },
          dur: 3.4,
          action:
            'Total black. A deep, distant concussion, like a planet being struck. Two-frame subliminal flashes: a sky crowded with colliding Earths.',
          audio: [
            { cue: 'drone', at: 0, dur: 'seq', note: 38, vol: 0.5, fadeIn: 1.5 },
            { cue: 'boom', at: 0.55, vol: 0.7 },
            { cue: 'boom', at: 1.85, vol: 0.45 },
          ],
        },
        {
          id: 'F02',
          scene: 'black',
          params: { flashes: [0.2, 3.1], hand: true },
          dur: 6,
          action: 'Out of the dark, two voices. One begging. One certain.',
          lines: [
            {
              who: 'SEREN',
              text: "Elias, stop! You'll kill everyone!",
              dir: 'a desperate, breaking scream across a vast echoing void, begging',
              fx: 'scream',
              os: true,
            },
            {
              who: 'ELIAS',
              text: '...Yes.',
              dir: 'calm, quiet, very close to the microphone, utterly certain, almost peaceful',
              fx: 'whisper',
              pre: 2.2,
              os: true,
            },
          ],
          tail: 1.3,
          audio: [{ cue: 'reverse', at: 'L0e-1.8', dur: 1.8, vol: 0.5 }],
        },
        {
          id: 'F03',
          scene: 'black',
          dur: 1.6,
          action: 'A single clock tick. Silence.',
          audio: [{ cue: 'tick', at: 0.3, vol: 0.9 }],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── COLD OPEN
    {
      id: 'C',
      title: 'Cold Open — The Execution',
      defaults: { post: { letterbox: 0.11, grain: 0.065 } },
      tracks: [
        {
          type: 'countdown',
          label: 'IMPACT',
          keys: [
            ['C02', 'start', 221],
            ['C17', 'start', 60],
            ['C21', 'end', 2],
            ['C22', 'end', 0],
          ],
          hold: 0.8,
        },
      ],
      shots: [
        {
          id: 'C01',
          scene: 'black',
          dur: 4.6,
          action: 'Black. Two words type themselves out of the dark.',
          supers: [
            { at: 0.4, dur: 3.9, text: 'SOMEWHERE ELSE.', style: 'type', y: 0.46 },
            { at: 2.1, dur: 2.2, text: 'YESTERDAY.', style: 'glitch', y: 0.56 },
          ],
          audio: [
            { cue: 'ticking', at: 0, dur: 4.6, rate: 1, vol: 0.35 },
            { cue: 'riser', at: 1.6, dur: 3.0, vol: 0.45 },
          ],
        },
        {
          id: 'C02',
          scene: 'city',
          params: { mode: 'incursion', ruin: 0.7, tilt: [[0, 1], [9, 0]] },
          dur: 9.5,
          action:
            "WIDE. Merridale, but wrong. An upside-down Earth fills the upper sky, its oceans hanging overhead. Where the two atmospheres meet, magenta lightning crawls. Rain falls UP. Chunks of street peel away and drift skyward. St. Ansel's Clocktower is cracked, frozen at 11:58.",
          post: { fadeIn: 0.2, shake: 0.18 },
          audio: [
            { cue: 'impact', at: 0, vol: 0.9 },
            { cue: 'grind', at: 0, dur: 'toEnd:C21', vol: 0.55, rise: 0.4 },
            { cue: 'wind', at: 0, dur: 'toEnd:C21', vol: 0.3 },
            { cue: 'drone', at: 0.5, dur: 'to:C17', note: 38, vol: 0.45, fadeIn: 3 },
            { cue: 'thunder', at: 3.2, vol: 0.5 },
            { cue: 'thunder', at: 7.4, vol: 0.4 },
          ],
        },
        {
          id: 'C03',
          scene: 'rooftop',
          params: { view: 'wide' },
          dur: 5,
          action:
            'A broken rooftop. A tall silhouette in a storm coat, MISTER YESTERDAY, holds a kneeling woman by the collar: SEREN (of this world), bleeding light from a wound in her chest. We never see his face. Only two pale cyan eyes.',
          post: { shake: 0.08 },
        },
        {
          id: 'C04',
          scene: 'rooftop',
          params: { view: 'medium' },
          action: 'He bends to her ear, gentle as a father.',
          lines: [
            { who: 'YESTERDAY', text: 'Shhh.', dir: 'a tender, intimate hush, like soothing a frightened child', fx: 'whisper' },
            { who: 'YESTERDAY', text: "Don't look up.", dir: 'soft, almost a lullaby, kind', fx: 'whisper', pre: 0.5 },
          ],
        },
        {
          id: 'C05',
          scene: 'rooftop',
          params: { view: 'low', lookUp: [[0, 0], [1.2, 1]] },
          action: 'She looks up anyway. Her eyes fill with the falling sky.',
          lines: [
            { who: 'YESTERDAY', text: 'Two skies.', dir: 'quiet, savoring each word', fx: 'slam', pre: 1.0 },
            { who: 'YESTERDAY', text: 'One grave.', dir: 'a low whisper with a smile in it', fx: 'slam', pre: 0.5 },
            { who: 'YESTERDAY', text: '...I told you not to look.', dir: 'gentle disappointment, almost sad', pre: 0.8 },
          ],
          audio: [{ cue: 'sub', at: 'L1', vol: 0.6 }],
        },
        {
          id: 'C06',
          scene: 'watch',
          params: { mode: 'yesterday' },
          action: 'INSERT: a cracked pocket watch in a scarred hand. Its hands are running BACKWARDS.',
          lines: [
            { who: 'YESTERDAY', text: 'Three minutes, forty seconds.', dir: 'matter-of-fact, precise, checking the time' },
            { who: 'YESTERDAY', text: 'Plenty.', dir: 'relaxed, amused, unhurried', pre: 0.6 },
          ],
          tail: 1.8,
          audio: [
            { cue: 'ticking', at: 0, dur: 'shot', rate: -1, vol: 0.3 },
            { cue: 'lullaby', at: 'L1e+0.2', vol: 0.4, detune: 0.35 },
          ],
        },
        {
          id: 'C07',
          scene: 'rooftop',
          params: { view: 'medium', handGlow: [[0, 0], [3.5, 1]] },
          action: 'He opens his empty hand. It glows a cold cyan.',
          lines: [
            {
              who: 'YESTERDAY',
              text: 'You know, the first time I did this, I was so scared I couldn’t even hold the knife.',
              dir: 'conversational, nostalgic, a little fond, like telling an old story',
            },
            { who: 'YESTERDAY', text: "Now I don't even need one.", dir: 'soft, cold pride', fx: 'whisper', pre: 0.7 },
          ],
          audio: [{ cue: 'shimmer', at: 'L1', dur: 3, vol: 0.25, cold: true }],
        },
        {
          id: 'C08',
          scene: 'rooftop',
          params: { view: 'front-seren' },
          action: 'Her face, lit violet from below. Blood at her lip.',
          lines: [
            { who: 'ALT_SEREN', text: "You don't... have to do this...", dir: 'weak, pleading, struggling to breathe' },
          ],
        },
        {
          id: 'C09',
          scene: 'rooftop',
          params: { view: 'medium' },
          events: { rage: 'L0', calm: 'L2' },
          action:
            'He EXPLODES. The sky seems to scream with him. Then, mid-breath, he is calm again, almost embarrassed.',
          post: { shakeAt: 'rage' },
          lines: [
            { who: 'YESTERDAY', text: 'HAVE TO?!', dir: 'a sudden, explosive, unhinged roar of rage', fx: 'scream', pre: 0.5 },
            {
              who: 'YESTERDAY',
              text: 'Hah... hahaha...',
              dir: 'a broken, rising laugh that teeters on the edge of a sob',
              fx: 'glitch',
              pre: 0.3,
              nonverbal: true,
            },
            { who: 'YESTERDAY', text: '...Sorry. Sorry.', dir: 'instantly calm, polite, a little embarrassed', pre: 0.7 },
            { who: 'YESTERDAY', text: 'I get loud near the end.', dir: 'wry, intimate, confiding' },
            { who: 'YESTERDAY', text: 'Everyone does.', dir: 'a soft, knowing whisper', fx: 'whisper', pre: 0.8 },
          ],
          audio: [
            { cue: 'impact', at: 'L0', vol: 0.7 },
            { cue: 'glitch', at: 'L0', dur: 1.2, vol: 0.35 },
            { cue: 'thunder', at: 'L0+0.2', vol: 0.6 },
          ],
        },
        {
          id: 'C10',
          scene: 'rooftop',
          params: { view: 'orbit' },
          action: 'He begins to circle her, slow, like the hand of a clock. Each number is a step.',
          lines: [
            { who: 'YESTERDAY', text: 'Four thousand.', dir: 'counting slowly, sing-song, each number a step, savoring it', fx: 'slam' },
            { who: 'YESTERDAY', text: 'One hundred.', dir: 'counting slowly, sing-song, savoring it', fx: 'slam', pre: 0.6 },
            { who: 'YESTERDAY', text: 'And twelve.', dir: 'the last step, almost tender', fx: 'slam', pre: 0.6 },
          ],
          audio: [
            { cue: 'stamp', at: 'L0', vol: 0.45, deep: true },
            { cue: 'stamp', at: 'L1', vol: 0.45, deep: true },
            { cue: 'stamp', at: 'L2', vol: 0.55, deep: true },
          ],
        },
        {
          id: 'C11',
          scene: 'number',
          params: { text: '4,112' },
          dur: 4.5,
          action: 'The number 4,112 slams into the frame, each digit cracking like glass.',
          lines: [
            { who: 'YESTERDAY', text: "That's how many skies I've watched fall.", dir: 'low, almost reverent, haunted', pre: 0.9 },
          ],
          audio: [
            { cue: 'impact', at: 0, vol: 0.8 },
            { cue: 'shatter', at: 0.15, vol: 0.35 },
          ],
        },
        {
          id: 'C12',
          scene: 'rooftop',
          params: { view: 'close' },
          action: 'He leans in close, conspiratorial.',
          lines: [
            {
              who: 'YESTERDAY',
              text: 'Do you know what every single one of them had in common?',
              dir: 'leaning in close, a conspiratorial whisper, playful',
            },
            { who: 'YESTERDAY', text: 'Me.', dir: 'one word, intimate, devastating, almost tender', fx: 'slam', pre: 1.3 },
          ],
          tail: 1.2,
          audio: [{ cue: 'sub', at: 'L1', vol: 0.9 }],
        },
        {
          id: 'C13',
          scene: 'rooftop',
          params: { view: 'front-seren' },
          action: 'She spits blood. Defiant to the last. We hear his name for the first time.',
          lines: [
            {
              who: 'ALT_SEREN',
              text: 'The Keepers will find you, Mister Yesterday.',
              dir: 'spitting blood, defiant through the pain, every word a fight',
              emph: ['Mister', 'Yesterday.'],
            },
          ],
        },
        {
          id: 'C14',
          scene: 'rooftop',
          params: { view: 'medium' },
          action: 'He snorts, almost fond.',
          lines: [
            { who: 'YESTERDAY', text: 'The Keepers.', dir: 'a dry, amused snort' },
            {
              who: 'YESTERDAY',
              text: 'The Keepers are knitting a sweater for a corpse.',
              dir: 'dark, bemused contempt, a little theatrical',
              pre: 0.5,
            },
          ],
        },
        {
          id: 'C15',
          scene: 'eyes',
          params: { who: 'yesterday', push: [[0, 1], [8, 1.12]] },
          action:
            'He crouches to her eye level. EXTREME CLOSE-UP: his eyes. Pale cyan irises ringed like clock faces, their tick-marks turning.',
          lines: [
            { who: 'YESTERDAY', text: "You think I'm taking your life.", dir: 'a low whisper, very close, gentle', fx: 'whisper' },
            { who: 'YESTERDAY', text: "I'm not.", dir: 'gentle, sincere, a whisper', fx: 'whisper', pre: 0.6 },
            {
              who: 'YESTERDAY',
              text: "I'm taking it somewhere it will finally matter.",
              dir: 'hushed, solemn, like a promise',
              fx: 'whisper',
              pre: 0.5,
            },
          ],
          audio: [{ cue: 'heartbeat', at: 0, dur: 'shot', bpm: 52, vol: 0.4 }],
        },
        {
          id: 'C16',
          scene: 'rooftop',
          params: { view: 'medium', threads: [[0.3, 0], [4, 1]] },
          dur: 6.2,
          action:
            'He presses his palm to her chest. Light TEARS out of her, golden-violet threads spiralling into his fist. Her scream is swallowed by the roar of the sky.',
          post: { shake: 0.35, chroma: 0.6 },
          lines: [{ who: 'ALT_SEREN', text: 'Aaah—!', dir: 'a sharp, agonized cry of pain', fx: 'none', at: 0.6, nonverbal: true }],
          audio: [
            { cue: 'threads', at: 0.2, dur: 6, vol: 0.6 },
            { cue: 'roar', at: 0.9, dur: 5, vol: 0.7 },
            { cue: 'riser', at: 1, dur: 5, vol: 0.5 },
          ],
        },
        {
          id: 'C17',
          scene: 'rooftop',
          params: { view: 'medium', threads: 1, freeze: true, turn: [[1.4, 0], [4.2, 1]] },
          dur: 4.6,
          action:
            'The countdown hits 01:00. The roar CUTS OUT. He stops. Tilts his head, listening. Then slowly turns... toward the CAMERA.',
          audio: [{ cue: 'tick', at: 0.05, vol: 1 }, { cue: 'tick', at: 1.05, vol: 0.7 }, { cue: 'tick', at: 2.05, vol: 0.7 }, { cue: 'tick', at: 3.05, vol: 0.7 }],
        },
        {
          id: 'C18',
          scene: 'rooftop',
          params: { view: 'front-yesterday', threads: 1 },
          action: 'He looks straight down the lens. At us.',
          lines: [
            { who: 'YESTERDAY', text: 'Oh.', dir: 'mild surprise, almost delighted', pre: 0.3 },
            { who: 'YESTERDAY', text: 'And you.', dir: 'slow and amused, addressing someone unseen', fx: 'slam', pre: 0.5 },
            { who: 'YESTERDAY', text: 'Yes. You.', dir: 'playful, pointed, leaning toward the listener', pre: 0.7 },
            {
              who: 'YESTERDAY',
              text: "Standing there in the dark, pretending you're not there.",
              dir: 'a teasing whisper, savoring it',
              fx: 'whisper',
            },
            { who: 'YESTERDAY', text: 'I know that trick.', dir: 'a smile in the voice', pre: 0.5 },
            { who: 'YESTERDAY', text: 'I invented it.', dir: 'a soft, chilling whisper', fx: 'whisper', pre: 0.7 },
          ],
          audio: [{ cue: 'drone', at: 0, dur: 'toEnd:C21', note: 33, vol: 0.5, fadeIn: 0.5 }],
        },
        {
          id: 'C19',
          scene: 'eyes',
          params: { who: 'yesterday', push: [[0, 1.05], [7, 1.45]] },
          action: 'Push in until his eyes fill the frame.',
          lines: [
            { who: 'YESTERDAY', text: "Watch closely. Don't blink.", dir: 'an intense, quiet command' },
            { who: 'YESTERDAY', text: 'This...', dir: 'slow, as if gesturing at the dying world', pre: 0.6 },
            { who: 'YESTERDAY', text: '...is what you become.', dir: 'a cold, final whisper, a prophecy', fx: 'slam', pre: 0.4 },
          ],
          audio: [{ cue: 'sub', at: 'L2', vol: 0.8 }],
        },
        {
          id: 'C20',
          scene: 'key',
          params: { mode: 'forming', form: [[0, 0], [3.2, 1]], crack: [[3.6, 0], [4.2, 1]] },
          action:
            'INSERT: the light hardens in his fist into a black, glassy shape. An OBSIDIAN KEY, violet veins pulsing inside it. A crack races through it.',
          lines: [
            { who: 'YESTERDAY', text: 'Hate me.', dir: 'a whisper, almost begging', fx: 'whisper', pre: 1.6 },
            { who: 'YESTERDAY', text: 'Good.', dir: 'quiet, satisfied', fx: 'whisper', pre: 0.9 },
            {
              who: 'YESTERDAY',
              text: "Hate's a better teacher than fear.",
              dir: 'low and gentle, like advice from a father',
              pre: 0.5,
            },
          ],
          audio: [
            { cue: 'crystal', at: 0.2, dur: 3.2, vol: 0.5 },
            { cue: 'shatter', at: 3.6, vol: 0.45, small: true },
          ],
        },
        {
          id: 'C21',
          scene: 'rooftop',
          params: { view: 'front-seren', eyesToCamera: true },
          action: '00:05. Her eyes slide past him... to US. Her lips barely move.',
          lines: [{ who: 'ALT_SEREN', text: '...Elias...', dir: 'a dying whisper, barely audible, looking past him', fx: 'whisper', pre: 0.6 }],
          tail: 0.6,
          audio: [{ cue: 'riser', at: 0, dur: 'shot', vol: 0.8 }],
        },
        {
          id: 'C22',
          scene: 'city',
          params: { mode: 'impact' },
          dur: 2.2,
          action: 'The two Earths TOUCH. Everything goes WHITE.',
          post: { flash: [0, 2.2], shake: 0.9 },
          audio: [{ cue: 'impact', at: 0, vol: 1.2, huge: true }],
        },
        {
          id: 'C23',
          scene: 'black',
          dur: 2.6,
          action: 'SMASH TO BLACK. Silence. One tick.',
          post: { letterbox: 0 },
          audio: [{ cue: 'tick', at: 1.2, vol: 1 }],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── TITLE
    {
      id: 'T',
      title: 'Main Title',
      shots: [
        {
          id: 'T01',
          scene: 'title',
          dur: 17,
          action:
            'In the dark, violet threads weave themselves into the obsidian key. It hangs, turning. Then it SHATTERS, and the shards become the title: THE ANCHOR OF YESTERDAY. Episode One: Two Skies, One Grave.',
          audio: [
            { cue: 'threads', at: 0, dur: 7, vol: 0.35 },
            { cue: 'lullaby', at: 1.0, vol: 0.45, detune: 0.1, variant: 'low' },
            { cue: 'riser', at: 4.2, dur: 3.3, vol: 0.6 },
            { cue: 'shatter', at: 7.5, vol: 0.7 },
            { cue: 'title', at: 7.5, dur: 9.5, vol: 0.8 },
          ],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── ACT ONE
    {
      id: 'A1',
      title: 'Act One — The Archivist',
      tracks: [{ type: 'ring', color: 'gold', keys: [['A1-11', 'start', 180], ['A1-12', 'end', 0]] }],
      shots: [
        {
          id: 'A1-01',
          scene: 'city',
          params: { mode: 'dawn' },
          dur: 7.5,
          action:
            'MATCH CUT: the same wide of Merridale, now intact, at dawn. Gulls. Gold light. St. Ansel’s Clocktower whole and ticking. The countdown HUD flickers once, a ghost, and is gone.',
          supers: [
            { at: 1.2, dur: 5.5, text: 'MERRIDALE.', style: 'type', y: 0.46 },
            { at: 2.6, dur: 4.1, text: 'TODAY.', style: 'type', y: 0.54 },
            { at: 0.5, dur: 0.35, text: 'IMPACT 03:41', style: 'hud-ghost' },
          ],
          post: { fadeIn: 0.6 },
          audio: [
            { cue: 'warm', at: 0.5, dur: 'toEnd:A1-09', vol: 0.4 },
            { cue: 'birds', at: 0, dur: 7.5, vol: 0.35 },
            { cue: 'clockChime', at: 4.5, vol: 0.25 },
          ],
        },
        {
          id: 'A1-02',
          scene: 'shop',
          params: { time: 'morning', elias: 'desk' },
          action:
            "INT. THORNE ARCHIVAL. Dust turns in shafts of morning light. Shelves of labelled boxes, ledgers, clocks. ELIAS THORNE (34, cardigan, wire glasses, white cotton gloves) catalogues an antique compass.",
          lines: [
            { who: 'ELIAS', vo: true, text: 'Everything that was ever made remembers being made.', dir: 'warm, quiet narration, intimate, a little wistful', fx: 'type', pre: 0.8 },
            { who: 'ELIAS', vo: true, text: 'A chair remembers the carpenter.', dir: 'quiet narration', fx: 'type', pre: 0.5 },
            { who: 'ELIAS', vo: true, text: 'A ring remembers the furnace.', dir: 'quiet narration', fx: 'type', pre: 0.3 },
            {
              who: 'ELIAS',
              vo: true,
              text: 'A letter remembers the hand that shook while it was written.',
              dir: 'quiet narration, tender',
              fx: 'type',
              pre: 0.3,
            },
          ],
          audio: [
            { cue: 'ticking', at: 0, dur: 'toEnd:A1-04', rate: 1, vol: 0.12 },
            { cue: 'room', at: 0, dur: 'toEnd:A1-09', vol: 0.3 },
          ],
        },
        {
          id: 'A1-03',
          scene: 'macro',
          params: { object: 'gloves' },
          action: 'CLOSE: gloved fingers turn the compass. Careful. Never skin.',
          lines: [
            { who: 'ELIAS', vo: true, text: "When I touch them, I'm there. The exact moment they were made.", dir: 'quiet narration', fx: 'type' },
            { who: 'ELIAS', vo: true, text: 'Watching. Invisible.', dir: 'quiet narration, slightly haunted', fx: 'type', pre: 0.4 },
            { who: 'ELIAS', vo: true, text: "So I don't touch much.", dir: 'dry, self-deprecating', fx: 'type', pre: 0.8 },
          ],
        },
        {
          id: 'A1-04',
          scene: 'rules',
          action: 'His rules STAMP onto the screen one by one, like museum labels.',
          lines: [
            { who: 'ELIAS', vo: true, text: 'I have rules.', dir: 'precise, a little proud', fx: 'none' },
            { who: 'ELIAS', vo: true, text: 'One. Wear the gloves.', dir: 'precise, listing', fx: 'none', pre: 0.5 },
            { who: 'ELIAS', vo: true, text: 'Two. Never stay longer than three minutes.', dir: 'precise, listing', fx: 'none', pre: 0.4 },
            { who: 'ELIAS', vo: true, text: "Three. Never touch anything that's still warm.", dir: 'precise, a little uneasy', fx: 'none', pre: 0.4 },
            { who: 'ELIAS', vo: true, text: 'Four.', dir: 'hesitating', fx: 'none', pre: 0.5 },
            { who: 'ELIAS', vo: true, text: "Don't open the letter.", dir: 'quiet, avoiding something', fx: 'none', pre: 0.9 },
          ],
          audio: [
            { cue: 'stamp', at: 'L1', vol: 0.6 },
            { cue: 'stamp', at: 'L2', vol: 0.6 },
            { cue: 'stamp', at: 'L3', vol: 0.6 },
            { cue: 'stamp', at: 'L5', vol: 0.8 },
          ],
        },
        {
          id: 'A1-05',
          scene: 'macro',
          params: { object: 'phone' },
          action: 'His phone buzzes on the desk: DR. HALE — NEUROLOGY. He watches it ring out. The voicemail plays.',
          lead: 3.2,
          lines: [
            { who: 'RECEPTIONIST', text: "Mr. Thorne, it's Dr. Hale's office again.", dir: 'a polite receptionist leaving a voicemail' },
            { who: 'RECEPTIONIST', text: "It's about your scans. The lesions are... progressing.", dir: 'hesitant, sympathetic' },
            {
              who: 'RECEPTIONIST',
              text: 'We really need to talk about how much time—',
              dir: 'careful, then cut off abruptly mid-sentence',
            },
          ],
          tail: 0.3,
          audio: [
            { cue: 'phoneBuzz', at: 0.2, vol: 0.5 },
            { cue: 'phoneBuzz', at: 1.4, vol: 0.5 },
            { cue: 'beep', at: 2.7, vol: 0.4 },
            { cue: 'beep', at: 'L2e-0.05', vol: 0.5, low: true },
          ],
        },
        {
          id: 'A1-06',
          scene: 'macro',
          params: { object: 'letter' },
          dur: 5.5,
          action:
            'He deletes it. INSERT: an unopened envelope. ST. ANSEL’S HOSPITAL, DEPARTMENT OF NEUROLOGY, URGENT. A brass paperweight slides onto it.',
          audio: [{ cue: 'cloth', at: 3.2, vol: 0.4 }],
        },
        {
          id: 'A1-07',
          scene: 'shop',
          params: { time: 'morning', elias: 'standing', customer: true },
          action: 'The door bell. MRS. ODILE PEMBERTON (80s) holds a small box with both hands.',
          lines: [
            {
              who: 'PEMBERTON',
              text: "Mr. Thorne? They said you're the man who... finds things out. About old things.",
              dir: 'elderly, gentle, a little shy',
              pre: 1.2,
            },
            { who: 'ELIAS', text: 'I do provenance, Mrs....?', dir: 'polite, guarded, professional' },
            { who: 'PEMBERTON', text: 'Pemberton. Odile.', dir: 'soft' },
          ],
          audio: [{ cue: 'bell', at: 0.1, vol: 0.5 }],
        },
        {
          id: 'A1-08',
          scene: 'watch',
          params: { mode: 'pemberton' },
          action: 'She opens the box. A gold pocket watch, stopped.',
          lines: [
            { who: 'PEMBERTON', text: "It was Henry's. It stopped the night he died.", dir: 'quiet, steady, an old grief' },
            { who: 'PEMBERTON', text: "I don't need it fixed.", dir: 'gentle' },
            {
              who: 'PEMBERTON',
              text: 'I just want to know if he was happy. When he bought it.',
              dir: 'fragile, hopeful',
              pre: 0.6,
            },
            { who: 'PEMBERTON', text: 'He never told me.', dir: 'a small, sad smile in the voice', pre: 0.4 },
          ],
        },
        {
          id: 'A1-09',
          scene: 'shop',
          params: { time: 'morning', elias: 'standing', customer: true, glove: [[2.6, 0], [4.4, 1]] },
          action: 'Elias looks at her trembling hands. Every rule says no. He peels off one glove.',
          lines: [
            {
              who: 'ELIAS',
              text: '...Three minutes.',
              dir: 'reluctant, soft, deciding against his better judgement',
              pre: 1.6,
            },
          ],
          tail: 2.4,
          audio: [{ cue: 'cloth', at: 'L0e+0.4', vol: 0.5 }],
        },
        {
          id: 'A1-10',
          scene: 'retro',
          params: { phase: 'in' },
          dur: 5,
          action:
            'RETROSPECTION. His fingertip touches the gold, and the shop UNSPOOLS into a billion golden threads. They rewind and reweave into another place and another time.',
          audio: [
            { cue: 'reverse', at: 0, dur: 2.2, vol: 0.6 },
            { cue: 'shimmer', at: 0.4, dur: 'toEnd:A1-12', vol: 0.35 },
            { cue: 'whoosh', at: 1.6, vol: 0.5 },
          ],
        },
        {
          id: 'A1-11',
          scene: 'workshop',
          params: { focus: 'wide' },
          action:
            "INT. ABERNATHY & SON, WATCHMAKERS. 1962. Washed in gold like an old photograph. Elias stands translucent among the workbenches. The watchmaker, MR. ABERNATHY, finishes an engraving while YOUNG HENRY PEMBERTON paces.",
          supers: [{ at: 0.3, dur: 3.5, text: '1962', style: 'type', y: 0.18 }],
          lines: [
            {
              who: 'ABERNATHY',
              text: "Engraving's done. 'For Odile, every second, yours.'",
              dir: 'a gruff old craftsman, fond, reading it aloud',
              pre: 1.2,
            },
            { who: 'ABERNATHY', text: "Bit much, isn't it?", dir: 'teasing' },
            { who: 'HENRY', text: "It's not enough.", dir: 'a young man, nervous, earnest' },
            { who: 'HENRY', text: "I'm asking her tonight.", dir: 'excited, scared' },
            { who: 'HENRY', text: "I'm terrified, Mr. Abernathy.", dir: 'a nervous laugh in his voice' },
            { who: 'ABERNATHY', text: 'Good. Means it matters.', dir: 'warm, wise, matter-of-fact', pre: 0.6 },
          ],
        },
        {
          id: 'A1-12',
          scene: 'workshop',
          params: { focus: 'henry' },
          action: 'Henry holds the watch like it is the whole world. Elias, unseen, smiles. The gold ring hits zero and the threads SNAP.',
          lines: [
            { who: 'HENRY', text: 'Every second.', dir: 'an awed whisper, looking at the watch', fx: 'whisper' },
            { who: 'HENRY', text: 'Every single one.', dir: 'a whisper, full of love', fx: 'whisper', pre: 0.5 },
          ],
          tail: 1.6,
        },
        {
          id: 'A1-13',
          scene: 'retro',
          params: { phase: 'out' },
          dur: 1.4,
          action: 'SNAP BACK.',
          audio: [{ cue: 'snap', at: 0, vol: 0.8 }],
        },
        {
          id: 'A1-14',
          scene: 'shop',
          params: { time: 'morning', elias: 'standing', customer: true, nosebleed: true },
          action: 'Elias sways. A bright line of blood runs from his nose.',
          lines: [
            { who: 'PEMBERTON', text: "Mr. Thorne, you're bleeding—", dir: 'alarmed, worried' },
            { who: 'ELIAS', text: "It's nothing. It's—", dir: 'flustered, waving it off' },
            { who: 'ELIAS', text: 'He was terrified.', dir: 'gentle, careful', pre: 1.1 },
            { who: 'ELIAS', text: "And he was the happiest man I've ever seen.", dir: 'warm, moved, almost smiling', pre: 0.6 },
            { who: 'PEMBERTON', text: 'Every second...', dir: 'tearful, smiling, a whisper', fx: 'whisper', pre: 1.0 },
            { who: 'PEMBERTON', text: 'He used to say that.', dir: 'tearful, soft', pre: 0.4 },
          ],
          audio: [{ cue: 'warm', at: 'L2', dur: 'toEnd:A1-15', vol: 0.35, variant: 'tender' }],
        },
        {
          id: 'A1-15',
          scene: 'shop',
          params: { time: 'afternoon', elias: 'desk', letterFocus: true },
          action: 'Later. She is gone. Elias alone, a bloodied tissue in his fist, staring at the letter under the paperweight.',
          audio: [{ cue: 'room', at: 0, dur: 'shot', vol: 0.3 }],
          lines: [
            { who: 'ELIAS', vo: true, text: 'Everything remembers being made.', dir: 'quiet narration', fx: 'type', pre: 1.2 },
            {
              who: 'ELIAS',
              vo: true,
              text: "I've just never wanted to know how anything ends.",
              dir: 'quiet, honest, afraid',
              fx: 'type',
              pre: 0.6,
            },
          ],
          tail: 1.5,
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── ACT TWO
    {
      id: 'A2',
      title: 'Act Two — The Bruised Sky',
      shots: [
        {
          id: 'A2-01',
          scene: 'shop',
          params: { time: 'afternoon', elias: 'desk', radio: true, hum: [[2, 0], [5, 1]] },
          dur: 5.5,
          action: 'A cheerful radio jingle. It dissolves into static. Under it, a low HUM rises.',
          audio: [
            { cue: 'jingle', at: 0.2, dur: 2.6, vol: 0.35 },
            { cue: 'static', at: 2.6, dur: 3, vol: 0.3 },
            { cue: 'hum', at: 2.2, dur: 'toEnd:A2-08', vol: 0.35 },
            { cue: 'room', at: 0, dur: 'toEnd:A2-03', vol: 0.3 },
          ],
        },
        {
          id: 'A2-02',
          scene: 'macro',
          params: { object: 'pendulum', stopAt: 1.6 },
          dur: 4.2,
          action: 'The grandfather clock’s pendulum STOPS mid-swing, held at an impossible angle.',
          audio: [{ cue: 'tick', at: 0.4, vol: 0.5 }, { cue: 'tick', at: 1.3, vol: 0.5 }, { cue: 'sub', at: 1.6, vol: 0.5 }],
        },
        {
          id: 'A2-03',
          scene: 'macro',
          params: { object: 'tea' },
          dur: 4.2,
          action: 'Dust motes freeze in the air. A drop of tea lifts out of his cup and floats UPWARD.',
          audio: [{ cue: 'reverse', at: 0.5, dur: 2.5, vol: 0.3 }],
        },
        {
          id: 'A2-04',
          scene: 'street',
          params: { bruise: [[0.5, 0], [7, 1]], people: true, elias: true },
          dur: 8,
          action:
            'EXT. HARBOUR STREET. Elias steps outside. The sky is turning a bruised purple, bleeding down from the zenith like ink dropped in water. People stop. Phones rise. A flock of starlings hangs motionless in the air.',
          audio: [
            { cue: 'crowd', at: 0, dur: 'toEnd:A2-08', vol: 0.3 },
            { cue: 'drone', at: 1, dur: 'toEnd:A2-07', note: 41, vol: 0.4, fadeIn: 4 },
            { cue: 'glitch', at: 6.5, dur: 0.6, vol: 0.3 },
          ],
        },
        {
          id: 'A2-05',
          scene: 'street',
          params: { bruise: 1, people: true, child: true },
          action: 'A small girl tugs her mother’s sleeve.',
          lines: [{ who: 'CHILD', text: 'Mum... why is the sky bleeding?', dir: 'a small child, curious, a little scared', pre: 0.6 }],
        },
        {
          id: 'A2-06',
          scene: 'city',
          params: { mode: 'bruise', ghost: [[0.6, 0], [2.2, 1], [4.2, 0]] },
          dur: 5,
          action:
            'For one instant, in the purple, a GHOST: an upside-down skyline hanging over theirs. The same clocktower, inverted. Then gone.',
          audio: [{ cue: 'whoosh', at: 0.6, vol: 0.4 }, { cue: 'reverse', at: 2.0, dur: 2.2, vol: 0.4 }],
        },
        {
          id: 'A2-07',
          scene: 'whispers',
          dur: 9,
          action:
            'Elias’s bare hand brushes a lamppost, and EVERY OBJECT IN THE STREET REMEMBERS AT ONCE. A storm of memories in kinetic type. It lasts exactly nine seconds.',
          post: { shake: 0.25, chroma: 0.5 },
          audio: [
            { cue: 'whispers', at: 0, dur: 9, vol: 0.55 },
            { cue: 'riser', at: 0, dur: 9, vol: 0.4 },
            { cue: 'heartbeat', at: 0, dur: 9, bpm: 120, vol: 0.4 },
          ],
        },
        {
          id: 'A2-08',
          scene: 'street',
          params: { bruise: [[0, 1], [0.9, 0]], people: true, birds: 'resume' },
          dur: 4.5,
          action: 'The sky SNAPS back to blue. The birds fly on. People laugh nervously.',
          audio: [{ cue: 'snap', at: 0, vol: 0.6 }, { cue: 'birds', at: 0.4, dur: 4, vol: 0.3 }],
        },
        {
          id: 'A2-09',
          scene: 'tv',
          params: { segment: 'anchor' },
          action: 'TV NEWS. A lower third: ATMOSPHERIC GLITCH, NORTHERN HEMISPHERE.',
          lines: [
            {
              who: 'ANCHOR',
              text: "...a phenomenon meteorologists are calling an 'atmospheric glitch', reported across the entire northern hemisphere at three-twelve this afternoon.",
              dir: 'a crisp professional TV news anchor',
              pre: 0.2,
            },
          ],
          audio: [{ cue: 'tvSting', at: 0, vol: 0.3 }],
        },
        {
          id: 'A2-10',
          scene: 'tv',
          params: { segment: 'marlowe' },
          action: 'DR. INES MARLOWE, atmospheric physicist, beside a graph with a nine-second spike.',
          lines: [
            {
              who: 'MARLOWE',
              text: 'Our instruments registered a gravitational anomaly lasting exactly nine seconds.',
              dir: 'a scientist, precise, quietly unsettled',
            },
            { who: 'MARLOWE', text: "Gravity didn't fail. It... doubled.", dir: 'hesitant, searching for words', pre: 0.5 },
            {
              who: 'MARLOWE',
              text: 'As though the atmosphere was rejecting something.',
              dir: 'quiet, uneasy, almost to herself',
              pre: 0.6,
              emph: ['rejecting'],
            },
          ],
        },
        {
          id: 'A2-11',
          scene: 'tv',
          params: { segment: 'anchor' },
          action: 'Back to the anchor, smiling too hard.',
          lines: [{ who: 'ANCHOR', text: 'Officials insist there is no cause for alarm.', dir: 'reassuring, a little too bright' }],
        },
        {
          id: 'A2-12',
          scene: 'shop',
          params: { time: 'afternoon', elias: 'standing', tvOff: true, glove: [[0, 1], [3, 0]] },
          action: 'He switches the TV off. Pulls his glove back on. His hands are shaking.',
          lines: [
            { who: 'ELIAS', vo: true, text: 'Nine seconds.', dir: 'quiet narration', fx: 'type', pre: 0.8 },
            { who: 'ELIAS', vo: true, text: 'I told myself it was nothing.', dir: 'quiet narration', fx: 'type', pre: 0.5 },
            { who: 'ELIAS', vo: true, text: "I'm very good at that.", dir: 'dry, rueful', fx: 'type', pre: 0.6 },
          ],
          tail: 1.3,
          audio: [
            { cue: 'static', at: 0, dur: 0.25, vol: 0.4 },
            { cue: 'room', at: 0, dur: 'shot', vol: 0.3 },
          ],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── ACT THREE
    {
      id: 'A3',
      title: 'Act Three — The Woman with the Key',
      shots: [
        {
          id: 'A3-01',
          scene: 'street',
          params: { night: true, rain: true },
          dur: 5,
          action: 'EXT. THORNE ARCHIVAL. NIGHT. Rain. The shop sign buzzes and flickers.',
          post: { fadeIn: 0.8 },
          audio: [
            { cue: 'rain', at: 0, dur: 'toEnd:A3-11', vol: 0.4 },
            { cue: 'buzzSign', at: 0, dur: 5, vol: 0.2 },
            { cue: 'thunder', at: 2.5, vol: 0.4, far: true },
            { cue: 'tension', at: 0, dur: 'toEnd:A3-06', vol: 0.3, bpm: 60 },
            { cue: 'room', at: 5, dur: 'toEnd:A3-11', vol: 0.3 },
          ],
        },
        {
          id: 'A3-02',
          scene: 'macro',
          params: { object: 'sign' },
          dur: 3,
          action: 'Elias flips the sign: CLOSED.',
          audio: [{ cue: 'cloth', at: 1.0, vol: 0.4 }],
        },
        {
          id: 'A3-03',
          scene: 'door',
          dur: 4,
          action: 'BANG. The door flies open and the bell SHRIEKS. A woman staggers in out of the storm, one hand pressed to her bleeding side, the other clutching a bundle that glows violet through the cloth.',
          post: { shakeAt: 0.3 },
          audio: [
            { cue: 'doorBang', at: 0.3, vol: 0.9 },
            { cue: 'bellShriek', at: 0.32, vol: 0.6 },
            { cue: 'thunder', at: 0.5, vol: 0.7 },
          ],
        },
        {
          id: 'A3-04',
          scene: 'shop',
          params: { time: 'night', elias: 'standing', seren: 'door' },
          action: 'SEREN: late twenties, rain-dark coat, a silver sigil on her wrist. Breathless. Sharp.',
          lines: [
            { who: 'SEREN', text: 'Elias Thorne.', dir: 'breathless, wounded, but sharp and certain' },
            { who: 'SEREN', text: 'The man who touches things.', dir: 'dry, knowing', pre: 0.5 },
            {
              who: 'ELIAS',
              text: "We're— we're closed. There's a hospital two streets—",
              dir: 'startled, stammering, backing away',
            },
            { who: 'SEREN', text: "Hospitals can't fix what's wrong with me.", dir: 'dry, pained' },
            { who: 'SEREN', text: 'Or with you.', dir: 'pointed, quiet', pre: 0.7 },
          ],
        },
        {
          id: 'A3-05',
          scene: 'key',
          params: { mode: 'shattered', lean: [[0.5, 0], [3, 1]] },
          action:
            'She unwraps it on his desk: a SHATTERED OBSIDIAN KEY, smoking, violet light pulsing through its cracks. Every object in the shop LEANS toward it. Jars rattle. His gloves begin to smoke.',
          lines: [
            { who: 'ELIAS', text: 'Where did you get that?', dir: 'hushed, afraid', pre: 1.8 },
            { who: 'SEREN', text: 'From a world that died yesterday.', dir: 'flat, haunted', pre: 0.6 },
          ],
          audio: [
            { cue: 'crystal', at: 0.4, dur: 'shot', vol: 0.3 },
            { cue: 'rattle', at: 0.6, dur: 3, vol: 0.4 },
          ],
        },
        {
          id: 'A3-06',
          scene: 'shop',
          params: { time: 'night', elias: 'backing', seren: 'standing' },
          action: 'He backs into his own shelves.',
          lines: [
            {
              who: 'ELIAS',
              text: "No. No, whatever this is, I catalogue things. I date furniture. I'm not—",
              dir: 'panicked, rambling, backing away',
            },
            { who: 'SEREN', text: 'Brave? I know.', dir: 'cutting, then softening' },
            { who: 'SEREN', text: "I'm not asking you to be brave.", dir: 'gentle', pre: 0.5 },
            { who: 'SEREN', text: "I'm asking you to touch it.", dir: 'firm, quiet', pre: 0.4 },
          ],
        },
        {
          id: 'A3-07',
          scene: 'seam',
          params: { phase: 'open' },
          action:
            'Thunder. The lights flicker violet. A hairline crack splits the AIR in the middle of the shop: a SEAM. Purple light and the grinding roar of the cold open leak through. Something glitching, a black, pixel-broken HAND, claws through.',
          post: { glitch: 0.4, shake: 0.2 },
          lines: [
            { who: 'ELIAS', text: 'What is THAT?!', dir: 'a terrified shout', fx: 'scream', pre: 2.2 },
            { who: 'SEREN', text: 'A Fray. Leftovers.', dir: 'tense, focused, raising her hands' },
            { who: 'SEREN', text: 'When two worlds touch, things get... mixed.', dir: 'tense, dry', pre: 0.4 },
          ],
          audio: [
            { cue: 'thunder', at: 0, vol: 0.7 },
            { cue: 'glitch', at: 0.6, dur: 2, vol: 0.5 },
            { cue: 'grind', at: 0.6, dur: 'toEnd:A3-08', vol: 0.4 },
            { cue: 'shatter', at: 0.8, vol: 0.3, small: true },
          ],
        },
        {
          id: 'A3-08',
          scene: 'seam',
          params: { phase: 'stitch' },
          dur: 6.5,
          action:
            'Seren raises her hands. Violet-silver threads spill from her fingertips: AETHER. She stitches the air shut like a surgeon. The Fray’s hand is severed and dissolves into static.',
          audio: [
            { cue: 'threads', at: 0.3, dur: 5.5, vol: 0.6 },
            { cue: 'glitch', at: 4.6, dur: 0.8, vol: 0.6 },
            { cue: 'sub', at: 5.2, vol: 0.6 },
          ],
        },
        {
          id: 'A3-09',
          scene: 'shop',
          params: { time: 'night', elias: 'standing', seren: 'exhausted' },
          action: 'She sways, spent.',
          lines: [
            { who: 'SEREN', text: "They're coming through faster.", dir: 'exhausted, urgent', pre: 0.8 },
            { who: 'SEREN', text: 'Please.', dir: 'quiet, pleading', pre: 0.4 },
            { who: 'ELIAS', text: "It's warm.", dir: 'shaking, clinging to his rule' },
            { who: 'ELIAS', text: "Rule three. I don't touch anything that's still warm.", dir: 'shaking, stubborn', pre: 0.3 },
            { who: 'SEREN', text: 'In nine days...', dir: 'low, fierce, deliberate', pre: 0.8 },
            { who: 'SEREN', text: '...everything you love will be cold.', dir: 'low, fierce, a promise', fx: 'slam', pre: 0.3 },
          ],
          audio: [{ cue: 'drone', at: 'L4', dur: 'toEnd:A3-10', note: 36, vol: 0.4, fadeIn: 1 }],
        },
        {
          id: 'A3-10',
          scene: 'macro',
          params: { object: 'hand' },
          dur: 4,
          action: 'He won’t move. So she grabs his wrist, STRIPS the glove, and presses the key into his bare palm.',
          lines: [{ who: 'ELIAS', text: "Wait, don't—!", dir: 'panicked, too late', fx: 'glitch', at: 0.4 }],
          audio: [{ cue: 'cloth', at: 0.3, vol: 0.6 }, { cue: 'crystal', at: 1.6, dur: 2.4, vol: 0.6, shriek: true }],
        },
        {
          id: 'A3-11',
          scene: 'face',
          params: { who: 'seren', light: 0.6 },
          dur: 3.4,
          action: 'Over his shoulder, as he is ripped away: Seren’s face. Not relief. Calculation. A breath, to herself.',
          lines: [{ who: 'SEREN', text: 'Good.', dir: 'barely audible, cold, satisfied, to herself', fx: 'whisper', pre: 0.9 }],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── ACT FOUR
    {
      id: 'A4',
      title: 'Act Four — The Incursion',
      defaults: { post: { letterbox: 0.11, grain: 0.065 } },
      tracks: [
        { type: 'ring', color: 'violet', cracked: true, keys: [['A4-01', 'start', 180], ['A4-01', 'end', 140]] },
        {
          type: 'countdown',
          label: 'IMPACT',
          keys: [['A4-02', 'start', 68], ['A4-12', 'end', 2], ['A4-13', 'end', 0]],
          hold: 0.5,
        },
      ],
      shots: [
        {
          id: 'A4-01',
          scene: 'tunnel',
          dur: 7,
          action:
            'The shop SHATTERS like glass. Elias is hurled down a tunnel of violet threads, past thousands of Earths. His gold ring timer CRACKS and bleeds violet.',
          post: { shake: 0.5, chroma: 0.8 },
          audio: [
            { cue: 'shatter', at: 0, vol: 1 },
            { cue: 'whoosh', at: 0.3, vol: 0.8 },
            { cue: 'roar', at: 0.5, dur: 6.5, vol: 0.6 },
            { cue: 'riser', at: 1, dur: 6, vol: 0.6 },
          ],
        },
        {
          id: 'A4-02',
          scene: 'rooftop',
          params: { view: 'behind', observer: true, threads: 0.6 },
          action: 'He lands on the rooftop from the cold open, right BEHIND Mister Yesterday. Nobody turns. He is a ghost here.',
          post: { shake: 0.15 },
          lines: [
            { who: 'ELIAS', text: 'Where— what is this?', dir: 'disoriented, frightened, shouting into a gale', pre: 0.4 },
            { who: 'ELIAS', text: 'Hey! HEY!', dir: 'shouting desperately, no one can hear him', fx: 'scream', pre: 0.5 },
          ],
          audio: [
            { cue: 'impact', at: 0, vol: 0.8 },
            { cue: 'grind', at: 0, dur: 'toEnd:A4-12', vol: 0.55, rise: 0.5 },
            { cue: 'wind', at: 0, dur: 'toEnd:A4-12', vol: 0.3 },
            { cue: 'drone', at: 0, dur: 'toEnd:A4-12', note: 38, vol: 0.45, fadeIn: 2 },
          ],
        },
        {
          id: 'A4-03',
          scene: 'rooftop',
          params: { view: 'behind', observer: true, threads: 0.8, reach: [[0.4, 0], [1.8, 1]] },
          dur: 3.6,
          action: 'He grabs Mister Yesterday’s arm. His hand passes through it like smoke.',
          audio: [{ cue: 'whoosh', at: 1.5, vol: 0.3 }],
        },
        {
          id: 'A4-04',
          scene: 'rooftop',
          params: { view: 'behind', observer: true, threads: 1 },
          action: 'The same words. The same moment. Now from where Elias stands.',
          lines: [{ reuse: 'C15-2', fx: 'whisper' }],
          tail: 0.6,
        },
        {
          id: 'A4-05',
          scene: 'rooftop',
          params: { view: 'behind', observer: true, threads: 1, freeze: true, turn: [[0.8, 0], [3.4, 1]] },
          dur: 4,
          action: 'He stops. Tilts his head. Turns. The light of the colliding worlds sweeps across his face...',
          audio: [{ cue: 'tick', at: 0.05, vol: 0.9 }, { cue: 'riser', at: 1, dur: 3, vol: 0.6 }],
        },
        {
          id: 'A4-06',
          scene: 'face',
          params: { who: 'yesterday', sweep: [[0, 0], [3.2, 1]] },
          dur: 5.2,
          action:
            'REVEAL. It is ELIAS: older, gaunt, grey at the temples, a scar through his left eye, clock-ring irises glowing cyan.',
          audio: [{ cue: 'impact', at: 3.1, vol: 1, huge: true }, { cue: 'sub', at: 3.1, vol: 0.9 }],
        },
        {
          id: 'A4-07',
          scene: 'face',
          params: { who: 'split' },
          dur: 3.8,
          action: 'SPLIT FRAME: our Elias, warm, young, terrified | Mister Yesterday, cold, old, smiling. The same face.',
          audio: [{ cue: 'glitch', at: 0, dur: 0.5, vol: 0.4 }],
        },
        {
          id: 'A4-08',
          scene: 'face',
          params: { who: 'yesterday', sweep: 1 },
          action: 'He speaks to Elias, and every line of the cold open finally finds its target.',
          lines: [
            { reuse: 'C18-0' },
            { reuse: 'C18-1', pre: 0.4 },
            { reuse: 'C18-2', pre: 0.5 },
            { reuse: 'C18-3' },
            { reuse: 'C18-4', pre: 0.4 },
            { reuse: 'C18-5', pre: 0.6 },
          ],
        },
        {
          id: 'A4-09',
          scene: 'rooftop',
          params: { view: 'elias-front', observer: true, threads: 1 },
          action: 'Elias staggers back from his own face.',
          lines: [
            { who: 'ELIAS', text: '...No.', dir: 'a whispered, horrified disbelief', fx: 'whisper' },
            { who: 'ELIAS', text: 'No, no, no—', dir: 'breaking, panicking, breathless', pre: 0.4 },
          ],
        },
        {
          id: 'A4-10',
          scene: 'face',
          params: { who: 'yesterday', sweep: 1, close: true },
          action: 'Mister Yesterday steps closer. Gentle. Intimate. Worse than shouting.',
          lines: [
            { who: 'YESTERDAY', text: 'Hello, Elias.', dir: 'warm, intimate, almost loving, and utterly chilling', fx: 'whisper', pre: 0.6 },
            { who: 'YESTERDAY', text: 'Watch closely.', dir: 'quiet, intense', pre: 0.7 },
            { reuse: 'C19-2', pre: 0.4 },
          ],
          audio: [{ cue: 'sub', at: 'L0', vol: 0.6 }],
        },
        {
          id: 'A4-11',
          scene: 'key',
          params: { mode: 'forming', form: [[0, 0.6], [1.6, 1]], crack: [[1.8, 0], [2.4, 1]] },
          action: 'The key forms and cracks again. He leans close to Elias’s ear, and for the first time he sounds afraid.',
          lines: [
            { reuse: 'C20-0', pre: 0.4 },
            { reuse: 'C20-1', pre: 0.7 },
            {
              who: 'YESTERDAY',
              text: 'And when she comes for you, and she will—',
              dir: 'urgent, low, leaning close, a real warning, suddenly afraid, cut off mid-sentence',
              pre: 0.6,
            },
          ],
          tail: 0.2,
          audio: [{ cue: 'roar', at: 'L2e-0.35', dur: 2.6, vol: 1 }, { cue: 'impact', at: 'L2e-0.3', vol: 0.8 }],
        },
        {
          id: 'A4-12',
          scene: 'rooftop',
          params: { view: 'seren-sees', observer: true, threads: 1 },
          action: 'The dying woman’s eyes find Elias. She SEES him.',
          post: { chroma: 0.3 },
          lines: [
            { reuse: 'C21-0', pre: 0.9 },
            {
              who: 'ALT_SEREN',
              text: "You aren't trying to stop the incursions.",
              dir: 'faint and urgent, every word costs her',
              fx: 'whisper',
              pre: 0.7,
            },
            {
              who: 'ALT_SEREN',
              text: 'You are causing them.',
              dir: 'a final, devastating whisper',
              fx: 'glitch',
              pre: 0.9,
              emph: ['causing'],
            },
          ],
          tail: 1.0,
          audio: [{ cue: 'riser', at: 'L2', dur: 2.5, vol: 0.8 }],
        },
        {
          id: 'A4-13',
          scene: 'city',
          params: { mode: 'incursion', ruin: 0.95, masked: [0.9, 1.15] },
          dur: 2.6,
          action:
            'WIDE. The worlds are an instant from touching. Blink and you miss it: high above, on a floating shard, a MASKED FIGURE watches.',
          post: { shake: 0.6 },
          audio: [{ cue: 'whoosh', at: 0.9, vol: 0.4 }],
        },
        {
          id: 'A4-14',
          scene: 'city',
          params: { mode: 'impact' },
          dur: 1.6,
          action: 'WHITE.',
          post: { flash: [0, 1.6] },
          audio: [{ cue: 'impact', at: 0, vol: 1.2, huge: true }],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── TAG
    {
      id: 'G',
      title: 'Tag — Nine Days',
      shots: [
        {
          id: 'G01',
          scene: 'shop',
          params: { time: 'night', elias: 'floor', seren: 'standing', nosebleed: true },
          dur: 4,
          action: 'SNAP BACK. The shop floor. Elias convulses awake, gasping. Blood from his nose. From his ear.',
          post: { flash: [0, 0.35] },
          lines: [{ who: 'ELIAS', text: 'Hhhah—!', dir: 'a violent, ragged gasp for air, like surfacing from deep water', fx: 'none', at: 0.15, nonverbal: true }],
          audio: [
            { cue: 'snap', at: 0, vol: 1 },
            { cue: 'rain', at: 0.3, dur: 'toEnd:G03', vol: 0.25 },
            { cue: 'room', at: 0, dur: 'toEnd:G05', vol: 0.3 },
          ],
        },
        {
          id: 'G02',
          scene: 'key',
          params: { mode: 'cooling' },
          dur: 3.6,
          action: 'The key lies on the floorboards. Its glow fades. Cooling.',
          audio: [{ cue: 'crystal', at: 0, dur: 3.2, vol: 0.2, fade: true }],
        },
        {
          id: 'G03',
          scene: 'shop',
          params: { time: 'night', elias: 'floor', seren: 'kneeling', nosebleed: true },
          action: 'Seren kneels and holds his face in both hands.',
          lines: [
            { who: 'SEREN', text: 'Elias.', dir: 'urgent, steady' },
            { who: 'SEREN', text: 'What did you see?', dir: 'intense, a little too eager', pre: 0.4 },
            { who: 'ELIAS', text: 'Me.', dir: 'hollow, in shock', pre: 1.3 },
            { who: 'ELIAS', text: 'I saw me.', dir: 'hollow, in shock', pre: 0.5 },
            { who: 'ELIAS', text: 'He— I— killed you.', dir: 'broken, confused, struggling', pre: 0.5 },
            { who: 'SEREN', text: 'Not me.', dir: 'careful, gentle', pre: 0.8 },
            { who: 'SEREN', text: 'A me.', dir: 'gentle, a little sad', pre: 0.3 },
            { who: 'SEREN', text: 'Then you understand why I came.', dir: 'quiet, resolute', pre: 0.6 },
            { who: 'ELIAS', text: 'Who are you?', dir: 'barely a whisper', fx: 'whisper', pre: 1.1 },
          ],
          audio: [{ cue: 'lullaby', at: 'L5', vol: 0.3, detune: 0.05, variant: 'clean' }],
        },
        {
          id: 'G04',
          scene: 'window',
          params: { blind: [[0.2, 0], [2.4, 1]] },
          action:
            'She stands, crosses to the window and raises the blind. The rain has stopped. The night sky is faintly bruised, and on the horizon, enormous and pale, is the curve of ANOTHER EARTH, like a moon too big for the sky.',
          lines: [
            { who: 'SEREN', text: 'Seren.', dir: 'calm, quiet, resolute', pre: 2.4 },
            { who: 'SEREN', text: 'Keeper of the Loom.', dir: 'calm, with quiet weight', pre: 0.4 },
            { who: 'SEREN', text: 'And that...', dir: 'quiet, ominous', pre: 1.0 },
            { who: 'SEREN', text: "...is the world that's going to kill yours.", dir: 'quiet, matter-of-fact, devastating', pre: 0.3 },
            { who: 'ELIAS', text: 'How long?', dir: 'small, scared', pre: 1.0 },
            { who: 'SEREN', text: 'Nine days.', dir: 'quiet, final', fx: 'slam', pre: 0.9 },
          ],
          audio: [
            { cue: 'cloth', at: 0.2, vol: 0.4 },
            { cue: 'drone', at: 1.5, dur: 'toEnd:G05', note: 40, vol: 0.45, fadeIn: 3 },
            { cue: 'sub', at: 'L5', vol: 0.7 },
          ],
        },
        {
          id: 'G05',
          scene: 'macro',
          params: { object: 'hand-bare' },
          action: 'Elias stares at his bare, trembling hand. On the desk, the hospital letter flutters in the draught. Still unopened.',
          lines: [
            { who: 'ELIAS', vo: true, text: "Rule three. Never touch anything that's still warm.", dir: 'quiet narration, shaken', fx: 'type', pre: 0.8 },
            { who: 'ELIAS', vo: true, text: 'I should have had a rule about people.', dir: 'rueful, quiet, bitter', fx: 'type', pre: 0.8 },
          ],
          tail: 1.2,
        },
        {
          id: 'G06',
          scene: 'clock',
          params: { label: 'INCURSION', from: 9 * 86400 - 1 },
          dur: 5,
          action: 'BLACK. A stark HUD: INCURSION 08D 23H 59M 59S. One second ticks away. CUT TO BLACK.',
          audio: [{ cue: 'tick', at: 1.0, vol: 1 }, { cue: 'impact', at: 4.1, vol: 0.8 }],
        },
        {
          id: 'G07',
          scene: 'credits',
          dur: 14,
          action: 'END CREDITS over drifting threads. The four-note lullaby on a lone music box.',
          audio: [{ cue: 'lullaby', at: 0.5, vol: 0.5, variant: 'full', detune: 0.08 }],
        },
      ],
    },

    // ────────────────────────────────────────────────────────────── STINGER
    {
      id: 'S',
      title: 'Stinger — Atropos',
      shots: [
        {
          id: 'S01',
          scene: 'loom',
          action:
            'THE LOOM. A void strung with thousands of luminous threads. A figure in a PORCELAIN MASK with a golden kintsugi crack runs a finger along them. One thread flares gold. She lifts silver scissors to the thread beside it. SNIP. Far away, a world winks out.',
          events: { flare: 'L0-1.2', snip: 'L0e+1.4' },
          lines: [
            { who: 'ATROPOS', text: 'There you are.', dir: 'ancient, layered, a hushed and quiet satisfaction', fx: 'echo', pre: 3.2 },
            { who: 'ATROPOS', text: "...I'm sorry.", dir: 'suddenly human, tired, sorrowful', fx: 'echo', pre: 3.4 },
          ],
          tail: 2.2,
          audio: [
            { cue: 'threads', at: 0, dur: 'shot', vol: 0.3 },
            { cue: 'drone', at: 0, dur: 'shot', note: 31, vol: 0.4, fadeIn: 2 },
            { cue: 'snip', at: 'L0e+1.4', vol: 0.8 },
            { cue: 'boom', at: 'L0e+1.9', vol: 0.4, far: true },
          ],
        },
        {
          id: 'S02',
          scene: 'black',
          dur: 2.5,
          action: 'BLACK.',
          audio: [{ cue: 'tick', at: 0.8, vol: 0.6 }],
        },
      ],
    },
  ],
};
