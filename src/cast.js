// Series-wide cast: on-screen styling + voice casting for Google TTS.
//
// `voice`      → Gemini TTS prebuilt voice (used by the default "gemini" backend,
//                which understands the per-line delivery directions).
// `cloudVoice` → optional Cloud Text-to-Speech voice for the "cloud" backend
//                (defaults to <TTS_LOCALE>-Chirp3-HD-<voice>).
// `persona`    → description sent with every line so the performance stays in character.
// `post`       → ffmpeg audio filter applied after synthesis (radio, phone, layering…).
//
// Swap voices freely; regenerate with `npm run voices -- --force --who YESTERDAY`.

export const CAST = {
  YESTERDAY: {
    name: 'Mister Yesterday',
    color: '#8ff3ff',
    font: 'Cormorant Garamond',
    voice: 'Algenib',
    persona:
      'Mister Yesterday: a gaunt man around sixty. Gravelly, worn, intelligent. ' +
      'His voice swings from a tender whisper to a full-throated scream in a single breath. Menacing, theatrical, unpredictable, and secretly grieving.',
    post: 'aecho=0.8:0.6:60:0.18',
  },
  ELIAS: {
    name: 'Elias',
    color: '#ffd7a0',
    font: 'Inter',
    voice: 'Charon',
    persona:
      'Elias Thorne: a soft-spoken, careful archivist in his thirties. Precise and dry-humored, with a nervous stammer under pressure. A coward who is slowly becoming brave.',
  },
  SEREN: {
    name: 'Seren',
    color: '#d9b8ff',
    font: 'Inter',
    voice: 'Kore',
    persona:
      'Seren: a woman in her late twenties, a Keeper of a mystic order. Low, confident, guarded and dry. Wounded tonight, but sharp. She knows more than she says.',
  },
  ALT_SEREN: {
    name: 'Seren (another world)',
    color: '#e9d4ff',
    font: 'Cormorant Garamond',
    voice: 'Kore',
    persona:
      'Seren from a dying world, the same woman as Seren, mortally wounded. Her voice is breathy, failing, every word costs her.',
  },
  ATROPOS: {
    name: 'Atropos',
    color: '#f4e7c3',
    font: 'Cinzel',
    voice: 'Kore',
    persona:
      'Atropos: an ancient masked figure, secretly Seren after millennia of war. Slow, hushed, impossibly tired, regal.',
    // Layered, slightly pitched-down chorus so she sounds like many of herself.
    post: 'asetrate=24000*0.93,aresample=24000,chorus=0.6:0.9:55|70|90:0.4|0.32|0.3:0.25|0.4|0.3:2|1.3|1.7,aecho=0.8:0.7:120:0.25',
  },
  PEMBERTON: {
    name: 'Mrs. Pemberton',
    color: '#ffe9c9',
    font: 'Inter',
    voice: 'Gacrux',
    persona: 'Mrs. Odile Pemberton: a gentle widow in her eighties. Soft, shy, a fragile old grief in her voice.',
  },
  HENRY: {
    name: 'Henry (1962)',
    color: '#ffe0a8',
    font: 'Inter',
    voice: 'Puck',
    persona: 'Henry Pemberton in 1962: a young man about to propose. Nervous, earnest, beaming, laughs when scared.',
    post: 'highpass=f=180,lowpass=f=5200',
  },
  ABERNATHY: {
    name: 'Mr. Abernathy',
    color: '#ffe0a8',
    font: 'Inter',
    voice: 'Orus',
    persona: 'Mr. Abernathy: an old watchmaker in 1962. Gruff, warm, unhurried, a craftsman’s wisdom.',
    post: 'highpass=f=180,lowpass=f=5200',
  },
  RECEPTIONIST: {
    name: "Dr. Hale's office",
    color: '#c9d6e3',
    font: 'Inter',
    voice: 'Despina',
    persona: 'A hospital receptionist leaving a voicemail. Polite, careful, sympathetic, a little uncomfortable.',
    post: 'highpass=f=350,lowpass=f=3200,acrusher=bits=10:mix=0.25',
  },
  ANCHOR: {
    name: 'News Anchor',
    color: '#e6eef7',
    font: 'Inter',
    voice: 'Rasalgethi',
    persona: 'A crisp, professional evening-news anchor.',
    post: 'highpass=f=150,lowpass=f=6500',
  },
  MARLOWE: {
    name: 'Dr. Ines Marlowe',
    color: '#e6eef7',
    font: 'Inter',
    voice: 'Sadaltager',
    persona: 'Dr. Ines Marlowe: an atmospheric physicist interviewed on TV. Precise, intelligent, and quietly unsettled.',
    post: 'highpass=f=150,lowpass=f=6500',
  },
  CHILD: {
    name: 'Child',
    color: '#fff3d6',
    font: 'Inter',
    voice: 'Leda',
    persona: 'A small child, about six years old. Curious and a little scared.',
  },
};

export const speaker = (who) => CAST[who] || { name: who, color: '#ffffff', font: 'Inter' };
