// Interior scenes: Thorne Archival, inserts, the rules, retrospection, the 1962
// workshop, the door, the seam, the TV news.
import { W, H, FONTS, cached, glow, additive, vGradient, poly, smoothPath, setFont, fillScreen, strokeGlowPath, lightningPath, limb, text } from '../draw.js';
import { drawRain, drawDust, drawIncursionSky, drawClockFace } from '../world.js';
import { humanoid, makePose, lerpPose } from '../figures.js';
import { drawKey } from './execution.js';
import { clamp, lerp, ease, hash, hashRange, mulberry32, rgba, smoothstep, TAU, fract } from '../util.js';
import { speaker } from '../../cast.js';

// ── SHOP ─────────────────────────────────────────────────────────────────────
const PALETTE = {
  morning: { wall: ['#3a2716', '#1a0f08'], window: ['#fff1c8', '#ffcf7a'], shaft: '#ffd99a', shaftA: 0.14, rim: '#ffd28a', lamp: 0.25 },
  afternoon: { wall: ['#3b2212', '#170b05'], window: ['#ffd08a', '#e08a45'], shaft: '#ffb766', shaftA: 0.12, rim: '#ffb35c', lamp: 0.35 },
  night: { wall: ['#171014', '#07040a'], window: ['#1b2440', '#0a0e1c'], shaft: '#6f7fff', shaftA: 0.0, rim: '#ffb066', lamp: 0.9 },
};

function shelves(time) {
  return cached(`shelves-${time}`, W, H, (ctx) => {
    const rnd = mulberry32(42);
    const dark = time === 'night';
    const tone = (k) => {
      const c = [
        [92, 62, 38], [120, 84, 52], [70, 50, 34], [138, 104, 66], [84, 46, 30], [60, 70, 62],
      ][k % 6];
      const m = dark ? 0.35 : 1;
      return `rgb(${c[0] * m},${c[1] * m},${c[2] * m})`;
    };
    // shelf unit
    ctx.fillStyle = dark ? '#120a07' : '#2a180c';
    ctx.fillRect(640, 110, 1000, 760);
    for (let r = 0; r < 5; r++) {
      const y = 250 + r * 140;
      let x = 660;
      while (x < 1620) {
        const kind = rnd();
        if (kind < 0.45) {
          const w = 50 + rnd() * 80, h = 50 + rnd() * 70;
          ctx.fillStyle = tone(Math.floor(rnd() * 6));
          ctx.fillRect(x, y - h, w, h);
          ctx.fillStyle = dark ? 'rgba(200,190,160,0.25)' : 'rgba(240,226,190,0.8)';
          ctx.fillRect(x + w * 0.25, y - h * 0.65, w * 0.5, h * 0.22);
          x += w + 4;
        } else if (kind < 0.8) {
          const n = 3 + Math.floor(rnd() * 6);
          for (let i = 0; i < n && x < 1620; i++) {
            const w = 12 + rnd() * 12, h = 70 + rnd() * 50;
            ctx.fillStyle = tone(Math.floor(rnd() * 6) + 1);
            ctx.fillRect(x, y - h, w, h);
            x += w + 1;
          }
          x += 6;
        } else if (kind < 0.92) {
          ctx.fillStyle = dark ? '#3a3328' : '#b49a68';
          ctx.beginPath();
          ctx.arc(x + 30, y - 32, 28, 0, TAU);
          ctx.fill();
          ctx.fillStyle = dark ? '#5a5244' : '#efe3c6';
          ctx.beginPath();
          ctx.arc(x + 30, y - 32, 21, 0, TAU);
          ctx.fill();
          x += 66;
        } else {
          ctx.fillStyle = dark ? 'rgba(120,140,140,0.3)' : 'rgba(170,200,190,0.5)';
          ctx.fillRect(x, y - 60, 40, 60);
          x += 48;
        }
      }
      ctx.fillStyle = dark ? '#1c120c' : '#4a2e18';
      ctx.fillRect(640, y, 1000, 14);
    }
  });
}

function drawWindow(ctx, s, pal, time) {
  const x0 = 60, y0 = 140, w = 340, h = 600;
  ctx.fillStyle = vGradient(ctx, 0, y0, 0, y0 + h, [[0, pal.window[0]], [1, pal.window[1]]]);
  ctx.fillRect(x0, y0, w, h);
  if (time === 'night') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();
    drawRain(ctx, s.T, { count: 90, speed: 900, color: 'rgba(170,190,255,0.35)', slant: 0.05 });
    // lightning
    const fl = hash(Math.floor(s.T * 3), 7) > 0.93 ? 1 : 0;
    if (fl) {
      ctx.fillStyle = 'rgba(200,210,255,0.6)';
      ctx.fillRect(x0, y0, w, h);
    }
    // streetlamp
    additive(ctx, () => glow(ctx, x0 + 260, y0 + 200, 140, '#ffb066', 0.6));
    ctx.restore();
  } else {
    additive(ctx, () => glow(ctx, x0 + w / 2, y0 + h * 0.35, 520, pal.window[0], 0.45));
  }
  ctx.strokeStyle = '#120a05';
  ctx.lineWidth = 16;
  ctx.strokeRect(x0, y0, w, h);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x0 + w / 2, y0);
  ctx.lineTo(x0 + w / 2, y0 + h);
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(x0, y0 + (h * i) / 3);
    ctx.lineTo(x0 + w, y0 + (h * i) / 3);
  }
  ctx.stroke();
  // shop name painted on the glass, seen from inside (mirrored)
  ctx.save();
  ctx.translate(x0 + w / 2, y0 + 120);
  ctx.scale(-1, 1);
  setFont(ctx, FONTS.title, 30, 700);
  ctx.textAlign = 'center';
  ctx.fillStyle = time === 'night' ? 'rgba(255,214,140,0.35)' : 'rgba(60,30,8,0.55)';
  ctx.fillText('THORNE', 0, 0);
  ctx.restore();
}

function drawDoor(ctx, s, time, openK = 0) {
  const x0 = 430, y0 = 300, w = 180, h = 700;
  ctx.fillStyle = time === 'night' ? '#0c0810' : '#1c120a';
  ctx.fillRect(x0 - 12, y0 - 12, w + 24, h + 12);
  ctx.fillStyle = time === 'night' ? '#141c30' : '#e8c88a';
  ctx.fillRect(x0 + 24, y0 + 30, w - 48, 260);
  ctx.strokeStyle = '#0a0604';
  ctx.lineWidth = 6;
  ctx.strokeRect(x0, y0, w, h);
  // bell
  const swing = Math.sin(s.T * 9) * 0.3 * (s.params.bell ? 1 : 0);
  ctx.save();
  ctx.translate(x0 + w + 30, y0 - 4);
  ctx.rotate(swing);
  ctx.fillStyle = '#b48a3c';
  ctx.beginPath();
  ctx.moveTo(-14, 28);
  ctx.quadraticCurveTo(-14, 4, 0, 4);
  ctx.quadraticCurveTo(14, 4, 14, 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function grandfatherClock(ctx, s, frozenAt = null) {
  const x = 1700, y = 180;
  ctx.fillStyle = '#1d110a';
  ctx.fillRect(x, y, 130, 840);
  ctx.fillStyle = '#2c1a0e';
  ctx.fillRect(x + 12, y + 20, 106, 120);
  drawClockFace(ctx, x + 65, y + 80, 46, 3, 12 + Math.floor(s.T / 60), { face: '#d9c9a2', ink: '#1a120a' });
  ctx.fillStyle = '#0e0805';
  ctx.fillRect(x + 25, y + 200, 80, 400);
  const tt = frozenAt != null ? frozenAt : s.T;
  const ang = frozenAt != null && s.hum > 0.5 ? 0.21 : Math.sin(tt * Math.PI) * 0.21;
  ctx.save();
  ctx.translate(x + 65, y + 210);
  ctx.rotate(ang);
  ctx.strokeStyle = '#b48a3c';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 300);
  ctx.stroke();
  ctx.fillStyle = '#c99c40';
  ctx.beginPath();
  ctx.arc(0, 320, 26, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function desk(ctx, s, pal, o = {}) {
  const top = 720;
  // lamp
  const lx = 1390;
  additive(ctx, () => glow(ctx, lx, top - 40, 520, '#ffc27a', pal.lamp * (o.flicker ?? 1)));
  ctx.fillStyle = '#1c2a1a';
  ctx.beginPath();
  ctx.moveTo(lx - 70, top - 140);
  ctx.lineTo(lx + 70, top - 140);
  ctx.lineTo(lx + 50, top - 175);
  ctx.lineTo(lx - 50, top - 175);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b48a3c';
  ctx.fillRect(lx - 4, top - 140, 8, 130);
  ctx.fillRect(lx - 40, top - 14, 80, 14);
  // desk body
  ctx.fillStyle = '#2a170b';
  ctx.fillRect(860, top, 660, 24);
  ctx.fillStyle = vGradient(ctx, 0, top + 24, 0, 1040, [[0, '#1f1108'], [1, '#0b0603']]);
  ctx.fillRect(880, top + 24, 620, 316);
  ctx.strokeStyle = 'rgba(255,200,140,0.12)';
  ctx.lineWidth = 3;
  ctx.strokeRect(910, top + 60, 260, 120);
  ctx.strokeRect(1210, top + 60, 260, 120);
  // items
  ctx.fillStyle = '#efe6d2';
  ctx.save();
  ctx.translate(1180, top - 6);
  ctx.rotate(-0.06);
  ctx.fillRect(-70, -10, 140, 12);
  ctx.restore();
  ctx.fillStyle = '#b48a3c';
  ctx.beginPath();
  ctx.arc(1185, top - 20, 16, Math.PI, TAU);
  ctx.fill();
  // tea cup
  ctx.fillStyle = '#d9d0c0';
  ctx.fillRect(960, top - 34, 40, 34);
  ctx.beginPath();
  ctx.arc(1002, top - 18, 10, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = '#d9d0c0';
  ctx.lineWidth = 4;
  ctx.stroke();
  if (o.radio) {
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(1240, top - 70, 110, 70);
    additive(ctx, () => glow(ctx, 1320, top - 40, 40, '#ffb35c', 0.6));
  }
}

function smallTV(ctx, s, on) {
  const x = 1460, y = 470;
  ctx.fillStyle = '#1a120c';
  ctx.fillRect(x, y, 170, 130);
  ctx.fillStyle = on > 0 ? `rgba(150,190,230,${0.5 * on})` : '#0a0a0c';
  ctx.fillRect(x + 14, y + 14, 120, 98);
  if (on > 0) additive(ctx, () => glow(ctx, x + 74, y + 62, 220, '#9cc8ff', 0.35 * on));
}

export function shop(ctx, s) {
  const { T, t } = s;
  const time = s.params.time || 'morning';
  const pal = PALETTE[time];
  const night = time === 'night';
  const hum = s.v('hum', 0);
  ctx.save();
  if (s.params.letterFocus) {
    const z = lerp(1, 1.18, ease.inOut(s.p));
    ctx.translate(1180, 700);
    ctx.scale(z, z);
    ctx.translate(-1180, -700);
  }
  fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, pal.wall[0]], [1, pal.wall[1]]]));
  drawWindow(ctx, s, pal, time);
  drawDoor(ctx, s, time);
  ctx.drawImage(shelves(night ? 'night' : 'day'), 0, 0);
  grandfatherClock(ctx, { ...s, hum }, hum > 0.5 ? 0 : null);
  if (time === 'afternoon') smallTV(ctx, s, s.params.tvOff ? 1 - clamp(t / 0.3) : s.params.radio ? 0 : 0.2);
  // floor
  ctx.fillStyle = vGradient(ctx, 0, 1000, 0, H, [[0, night ? '#0c0806' : '#2a1a0e'], [1, '#050302']]);
  ctx.fillRect(0, 1000, W, 80);
  // light shafts
  if (pal.shaftA > 0) {
    additive(ctx, () => {
      for (let i = 0; i < 3; i++) {
        const g = ctx.createLinearGradient(400, 200, 1300, 1000);
        g.addColorStop(0, rgba(pal.shaft, pal.shaftA * (1 - i * 0.25)));
        g.addColorStop(1, rgba(pal.shaft, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        poly(ctx, [[400, 160 + i * 190], [400, 330 + i * 190], [1500 + i * 80, 1080], [1150 + i * 80, 1080]]);
        ctx.fill();
      }
    });
    drawDust(ctx, T, { count: 110, color: pal.shaft, alpha: 0.55, frozen: hum > 0.5 ? 1 : 0, freezeAt: s.shotStart + 2 });
  }
  // night: violet pulse from the key / seam
  const seren = s.params.seren;
  if (night && seren) additive(ctx, () => glow(ctx, 700, 760, 700, '#9b5cff', 0.18 + 0.08 * Math.sin(T * 4)));

  // ── characters ──
  const rim = pal.rim;
  const eliasMode = s.params.elias;
  const gloveOff = s.v('glove', 0);
  const drawElias = () => {
    const common = { costume: 'elias', body: '#0a0705', rim, rimDy: -2, t: T, bare: gloveOff > 0.5 };
    let r;
    if (eliasMode === 'desk') r = humanoid(ctx, 800, 1005, 640, { ...common, dir: 1, pose: makePose('seated') });
    else if (eliasMode === 'standing') r = humanoid(ctx, 1180, 1000, 660, { ...common, dir: -1, pose: makePose('stand', gloveOff > 0 && gloveOff < 1 ? 'holdBoth' : null) });
    else if (eliasMode === 'backing') r = humanoid(ctx, 1290, 1000, 660, { ...common, dir: -1, pose: makePose('stand', 'backing'), lean: -0.12 });
    else if (eliasMode === 'floor') r = humanoid(ctx, 1080, 1010, 620, { ...common, dir: 1, pose: makePose('floor'), bare: true });
    if (r && s.params.nosebleed) {
      ctx.strokeStyle = '#c4141f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const dx = eliasMode === 'floor' ? 30 : eliasMode === 'desk' ? 30 : -30;
      ctx.moveTo(r.head[0] + dx * 0.9, r.head[1] + 8);
      ctx.lineTo(r.head[0] + dx * 0.8, r.head[1] + 34);
      ctx.stroke();
    }
    // the glove coming off
    if (r && gloveOff > 0 && gloveOff < 1) {
      const p = r.handF;
      ctx.fillStyle = '#efe9dc';
      ctx.beginPath();
      ctx.ellipse(p[0] - 60 * gloveOff, p[1] - 10 * gloveOff, 22, 14, -0.4, 0, TAU);
      ctx.fill();
    }
    return r;
  };
  // Standing behind the counter: the desk occludes his legs.
  if (eliasMode === 'standing' || eliasMode === 'backing') drawElias();
  if (s.params.customer) {
    humanoid(ctx, 700, 1000, 540, { costume: 'pemberton', body: '#0b0806', rim, rimDy: -2, dir: 1, pose: makePose('stand', 'holdBoth', { head: [0.04, -0.9] }), lean: 0.06, t: T });
  }
  if (seren) {
    const st = { costume: 'seren', body: '#08060a', rim: night ? '#c9a2ff' : rim, rimDy: -2, dir: 1, t: T };
    if (seren === 'door') {
      const sr = humanoid(ctx, 620, 1000, 650, { ...st, pose: makePose('stand', { ...{ elF: [0.13, -0.6], haF: [0.12, -0.66] }, elB: [-0.06, -0.62], haB: [0.0, -0.55] }), lean: 0.12, sigil: 0.8 });
      additive(ctx, () => glow(ctx, sr.handF[0], sr.handF[1], 110, '#a66bff', 0.7 + 0.2 * Math.sin(T * 5)));
    } else if (seren === 'standing') humanoid(ctx, 760, 1000, 660, { ...st, pose: makePose('stand', 'side'), sigil: 0.6 });
    else if (seren === 'exhausted') humanoid(ctx, 740, 1000, 650, { ...st, pose: makePose('stand', 'side'), lean: 0.16, sigil: 0.3 });
    else if (seren === 'kneeling') humanoid(ctx, 830, 1012, 640, { ...st, pose: makePose('kneel', { elF: [0.13, -0.55], haF: [0.19, -0.48], elB: [0.06, -0.52], haB: [0.15, -0.46] }), sigil: 0.5 });
  }
  desk(ctx, s, pal, { radio: s.params.radio, flicker: night ? 0.85 + 0.15 * Math.sin(T * 13) * (seren ? 1 : 0) : 1 });
  // Seated at the desk or on the floor in front of it: drawn over the desk.
  if (eliasMode === 'desk' || eliasMode === 'floor') drawElias();
  ctx.restore();
  // night ambience
  if (night) {
    fillScreen(ctx, 'rgba(10,6,20,0.25)');
  }
  if (hum > 0) {
    ctx.fillStyle = rgba('#3a1250', 0.12 * hum);
    ctx.fillRect(0, 0, W, H);
  }
}

// ── MACRO inserts ────────────────────────────────────────────────────────────
function woodSurface(ctx, warm = 1) {
  fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, warm ? '#3a2312' : '#120c0a'], [1, warm ? '#1a0e06' : '#060404']]));
  ctx.strokeStyle = warm ? 'rgba(255,190,120,0.06)' : 'rgba(140,110,90,0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const y = i * 28 + hash(i, 151) * 10;
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 120) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * 10);
    ctx.stroke();
  }
}

function glovedHand(ctx, x, y, s, rot = 0, bare = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = bare ? '#c79a7a' : '#efe9dc';
  ctx.beginPath();
  smoothPath(ctx, [[-120, 160], [-110, 40], [-60, -20], [40, -30], [120, -60], [150, -40], [100, 10], [80, 60], [20, 140]], true, 0.5);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(-60 + i * 36, -50 - (i === 0 ? -10 : 0), 18, 52, -0.2, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = bare ? 'rgba(90,50,40,0.5)' : 'rgba(150,140,120,0.6)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-50 + i * 36, 0);
    ctx.lineTo(-42 + i * 36, 40);
    ctx.stroke();
  }
  ctx.restore();
}

export function macro(ctx, s) {
  const { T, t } = s;
  const obj = s.params.object;
  if (obj === 'gloves') {
    woodSurface(ctx);
    additive(ctx, () => glow(ctx, W * 0.55, H * 0.35, 900, '#ffd99a', 0.3));
    // brass compass
    const cx = W * 0.52, cy = H * 0.55;
    ctx.fillStyle = '#b48a3c';
    ctx.beginPath();
    ctx.arc(cx, cy, 190, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#efe3c6';
    ctx.beginPath();
    ctx.arc(cx, cy, 160, 0, TAU);
    ctx.fill();
    setFont(ctx, FONTS.serif, 44, 700);
    ctx.fillStyle = '#3a2410';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ['N', 'E', 'S', 'W'].forEach((d, i) => ctx.fillText(d, cx + Math.sin((i * Math.PI) / 2) * 120, cy - Math.cos((i * Math.PI) / 2) * 120));
    const na = Math.sin(T * 1.7) * 0.4 + Math.sin(T * 4.3) * 0.1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(na);
    ctx.fillStyle = '#a3132b';
    ctx.beginPath();
    poly(ctx, [[0, -110], [14, 0], [-14, 0]]);
    ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    poly(ctx, [[0, 110], [14, 0], [-14, 0]]);
    ctx.fill();
    ctx.restore();
    glovedHand(ctx, cx - 300, cy + 140, 1.2, 0.3);
    glovedHand(ctx, cx + 330, cy + 150, -1.2, -0.25);
    return;
  }
  if (obj === 'phone') {
    woodSurface(ctx);
    const ring = t < 2.7;
    const shake = ring ? Math.sin(T * 90) * 4 : 0;
    const px = W / 2 + shake, py = H / 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath();
    ctx.roundRect(-190, -380, 380, 760, 48);
    ctx.fill();
    ctx.fillStyle = ring ? '#1a2a3a' : '#121820';
    ctx.beginPath();
    ctx.roundRect(-170, -350, 340, 700, 34);
    ctx.fill();
    additive(ctx, () => glow(ctx, 0, 0, 500, '#7fb8ff', 0.2));
    text(ctx, 'DR. HALE', 0, -170, { family: FONTS.sans, size: 44, weight: 700, color: '#ffffff' });
    text(ctx, 'NEUROLOGY · ST. ANSEL’S', 0, -120, { family: FONTS.sans, size: 22, weight: 500, color: '#a9c4e0' });
    if (ring) {
      text(ctx, 'incoming call', 0, -60, { family: FONTS.sans, size: 24, color: '#a9c4e0' });
      for (const [x, c] of [[-90, '#d33'], [90, '#3c3']]) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, 230, 44, 0, TAU);
        ctx.fill();
      }
    } else {
      const deleted = s.lines.length && T > s.lines[s.lines.length - 1].end - 0.05;
      text(ctx, deleted ? 'Voicemail deleted' : 'Voicemail', 0, -60, { family: FONTS.sans, size: 26, color: deleted ? '#ff7a7a' : '#a9c4e0' });
      if (!deleted) {
        ctx.fillStyle = '#7fb8ff';
        for (let i = 0; i < 28; i++) {
          const speaking = s.lines.some((l) => T >= l.start && T <= l.end);
          const hgt = speaking ? 10 + Math.abs(Math.sin(T * 12 + i * 1.3)) * 60 * hash(i + Math.floor(T * 10), 3) : 6;
          ctx.fillRect(-140 + i * 10, 60 - hgt / 2, 6, hgt);
        }
      }
    }
    ctx.restore();
    return;
  }
  if (obj === 'letter') {
    woodSurface(ctx);
    additive(ctx, () => glow(ctx, W * 0.6, H * 0.2, 1000, '#ffd99a', 0.25));
    ctx.save();
    ctx.translate(W / 2, H / 2 + 20);
    ctx.rotate(-0.05);
    ctx.fillStyle = '#efe6d2';
    ctx.fillRect(-460, -260, 920, 520);
    ctx.strokeStyle = 'rgba(120,100,70,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    poly(ctx, [[-460, -260], [0, 40], [460, -260]], false);
    ctx.stroke();
    text(ctx, 'ST. ANSEL’S HOSPITAL', -400, -190, { family: FONTS.serif, size: 40, weight: 700, color: '#2a2016', align: 'left' });
    text(ctx, 'Department of Neurology', -400, -145, { family: FONTS.serif, size: 30, color: '#4a3c2c', align: 'left' });
    text(ctx, 'Mr. Elias Thorne', 40, 120, { family: FONTS.type, size: 38, color: '#2a2016', align: 'left' });
    text(ctx, '14 Harbour Street, Merridale', 40, 170, { family: FONTS.type, size: 28, color: '#4a3c2c', align: 'left' });
    ctx.save();
    ctx.translate(250, -150);
    ctx.rotate(-0.18);
    ctx.strokeStyle = '#a3132b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-120, -40, 240, 80);
    text(ctx, 'URGENT', 0, 2, { family: FONTS.slam, size: 64, color: '#a3132b' });
    ctx.restore();
    // paperweight slides on
    const k = ease.outCubic(clamp((t - 2.8) / 0.7));
    if (k > 0) {
      const wx = lerp(700, 120, k), wy = lerp(-120, 20, k);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(wx + 20, wy + 70, 150, 40, 0, 0, TAU);
      ctx.fill();
      const g = ctx.createRadialGradient(wx - 40, wy - 40, 10, wx, wy, 140);
      g.addColorStop(0, '#ffe3a0');
      g.addColorStop(0.5, '#b48a3c');
      g.addColorStop(1, '#4a3010');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(wx, wy, 130, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (obj === 'pendulum') {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#24150a'], [1, '#0b0604']]));
    additive(ctx, () => glow(ctx, W / 2, H * 0.3, 800, '#ffb35c', 0.18));
    const stopAt = s.params.stopAt ?? 1.6;
    const tt = Math.min(t, stopAt);
    const ang = Math.sin((tt + 0.5) * Math.PI) * 0.32;
    ctx.save();
    ctx.translate(W / 2, -60);
    ctx.rotate(ang);
    ctx.strokeStyle = '#c99c40';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 820);
    ctx.stroke();
    const g = ctx.createRadialGradient(-30, 840, 10, 0, 860, 120);
    g.addColorStop(0, '#ffe7a8');
    g.addColorStop(0.6, '#c99c40');
    g.addColorStop(1, '#5a3c10');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 860, 110, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (t > stopAt) additive(ctx, () => glow(ctx, W / 2, H / 2, 900, '#9b5cff', 0.1 * smoothstep(stopAt, stopAt + 1, t)));
    drawDust(ctx, T, { count: 60, alpha: 0.4, frozen: t > stopAt ? 1 : 0, freezeAt: s.shotStart + stopAt });
    return;
  }
  if (obj === 'tea') {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#2a190c'], [1, '#0b0604']]));
    additive(ctx, () => glow(ctx, W * 0.3, H * 0.2, 900, '#ffcf8a', 0.25));
    const cx = W / 2, cy = H * 0.68;
    ctx.fillStyle = '#e4dccb';
    ctx.beginPath();
    ctx.moveTo(cx - 260, cy - 160);
    ctx.lineTo(cx + 260, cy - 160);
    ctx.quadraticCurveTo(cx + 250, cy + 140, cx, cy + 150);
    ctx.quadraticCurveTo(cx - 250, cy + 140, cx - 260, cy - 160);
    ctx.fill();
    ctx.strokeStyle = '#e4dccb';
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.arc(cx + 280, cy - 30, 80, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = '#6b3a12';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 160, 250, 40, 0, 0, TAU);
    ctx.fill();
    // the drop rising
    const k = ease.outCubic(clamp((t - 0.6) / 3));
    const dy = cy - 170 - k * 420;
    ctx.fillStyle = '#8a4a18';
    ctx.beginPath();
    ctx.ellipse(cx + 20, dy, 26, 34, 0, 0, TAU);
    ctx.fill();
    additive(ctx, () => glow(ctx, cx + 30, dy - 10, 40, '#ffe0b0', 0.5));
    // ripple
    ctx.strokeStyle = 'rgba(255,220,180,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx + 20, cy - 160, 40 + k * 160, 8 + k * 24, 0, 0, TAU);
    ctx.stroke();
    drawDust(ctx, T, { count: 80, alpha: 0.6, frozen: 1, freezeAt: s.shotStart });
    return;
  }
  if (obj === 'sign') {
    fillScreen(ctx, '#0a0c16');
    drawRain(ctx, T, { count: 200, speed: 900, color: 'rgba(170,190,255,0.3)' });
    additive(ctx, () => glow(ctx, W * 0.7, H * 0.2, 400, '#ffb066', 0.4));
    const k = ease.inOutCubic(clamp((t - 0.8) / 0.7));
    const sx = Math.cos(k * Math.PI);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-160, -240);
    ctx.lineTo(0, -330);
    ctx.lineTo(160, -240);
    ctx.stroke();
    ctx.scale(Math.abs(sx) < 0.02 ? 0.02 : sx, 1);
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(-300, -240, 600, 300);
    ctx.strokeStyle = '#2a1a0c';
    ctx.lineWidth = 10;
    ctx.strokeRect(-280, -220, 560, 260);
    const label = k < 0.5 ? 'OPEN' : 'CLOSED';
    ctx.scale(sx < 0 ? -1 : 1, 1);
    text(ctx, label, 0, -90, { family: FONTS.title, size: 110, weight: 700, color: k < 0.5 ? '#1f5a2a' : '#7a1218' });
    ctx.restore();
    return;
  }
  if (obj === 'hand') {
    fillScreen(ctx, '#07050a');
    const k = clamp(t / 1.2);
    additive(ctx, () => glow(ctx, W / 2, H / 2, 900, '#9b5cff', 0.25 + 0.5 * smoothstep(1.4, 2.2, t)));
    // her hand gripping his wrist
    glovedHand(ctx, W * 0.52, H * 0.55, 1.6, -0.2, k > 0.45);
    ctx.fillStyle = '#1a1018';
    ctx.beginPath();
    smoothPath(ctx, [[-100, 640], [500, 560], [780, 600], [820, 700], [500, 760], [-100, 820]], true, 0.4);
    ctx.fill();
    // the glove flying off
    if (k > 0.3 && k < 1) {
      ctx.save();
      ctx.translate(lerp(W * 0.52, W * 0.95, (k - 0.3) / 0.7), lerp(H * 0.5, H * 0.1, (k - 0.3) / 0.7));
      ctx.rotate(k * 6);
      ctx.fillStyle = '#efe9dc';
      ctx.beginPath();
      ctx.ellipse(0, 0, 70, 40, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    const press = smoothstep(1.2, 1.7, t);
    if (press > 0) drawKey(ctx, W * 0.55, lerp(H * 0.1, H * 0.48, press), 300, { T, glow: 1 + press, crack: 1 });
    if (t > 1.6) {
      const f = clamp((t - 1.6) / 0.5);
      ctx.fillStyle = rgba('#ffffff', f * 0.85);
      ctx.fillRect(0, 0, W, H);
    }
    return;
  }
  if (obj === 'hand-bare') {
    fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#120c16'], [1, '#050306']]));
    additive(ctx, () => glow(ctx, W * 0.75, H * 0.2, 900, '#9b8cff', 0.18));
    // the unopened letter fluttering behind
    ctx.save();
    ctx.translate(W * 0.72, H * 0.72);
    ctx.rotate(-0.1 + Math.sin(T * 6) * 0.03);
    ctx.fillStyle = 'rgba(220,210,190,0.55)';
    ctx.fillRect(-260, -150, 520, 300);
    ctx.restore();
    const tr = Math.sin(T * 23) * 3 + Math.sin(T * 37) * 2;
    glovedHand(ctx, W * 0.38 + tr, H * 0.56, 2.1, -0.35, true);
  }
}

// ── RULES (kinetic museum labels) ────────────────────────────────────────────
export function rules(ctx, s) {
  const { T } = s;
  shop(ctx, { ...s, params: { time: 'morning', elias: 'desk' } });
  fillScreen(ctx, 'rgba(14,8,4,0.72)');
  const L = s.lines;
  const typed = (line, x, y, size, col) => {
    if (!line || T < line.start) return;
    const n = Math.floor(clamp((T - line.start) / Math.max(0.3, line.dur * 0.8)) * line.text.length);
    text(ctx, line.text.slice(0, n), x, y, { family: FONTS.type, size, color: col });
  };
  typed(L[0], W / 2, 130, 56, '#f2ead8');
  const cards = [
    { line: L[1], n: 'RULE ONE', txt: 'Wear the gloves.', x: 560, y: 380, r: -0.04 },
    { line: L[2], n: 'RULE TWO', txt: 'Never stay longer than three minutes.', x: 1360, y: 390, r: 0.03 },
    { line: L[3], n: 'RULE THREE', txt: 'Never touch anything that’s still warm.', x: 560, y: 720, r: 0.025 },
    { line: L[4], n: 'RULE FOUR', txt: 'Don’t open the letter.', x: 1360, y: 730, r: -0.03, red: true, reveal: L[5] },
  ];
  for (const c of cards) {
    if (!c.line || T < c.line.start) continue;
    const k = clamp((T - c.line.start) / 0.22);
    const sc = lerp(1.5, 1, ease.outExpo(k));
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.r);
    ctx.scale(sc, sc);
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-330, -110, 680, 240);
    ctx.fillStyle = '#efe6d2';
    ctx.fillRect(-340, -120, 680, 240);
    ctx.strokeStyle = '#2a2016';
    ctx.lineWidth = 4;
    ctx.strokeRect(-320, -100, 640, 200);
    text(ctx, c.n, 0, -55, { family: FONTS.mono, size: 26, weight: 700, color: c.red ? '#a3132b' : '#6a5a44', spacing: 8 });
    const showTxt = !c.reveal || T > c.reveal.start;
    if (showTxt) {
      setFont(ctx, FONTS.type, 40, 400);
      const fit = Math.min(1, 590 / ctx.measureText(c.txt).width);
      ctx.save();
      ctx.scale(fit, fit);
      text(ctx, c.txt, 0, 25 / fit, { family: FONTS.type, size: 40, color: c.red ? '#a3132b' : '#1e160e' });
      ctx.restore();
    } else {
      text(ctx, '. . .', 0, 25, { family: FONTS.type, size: 40, color: '#6a5a44' });
    }
    ctx.restore();
  }
}

// ── RETROSPECTION transition ─────────────────────────────────────────────────
export function retro(ctx, s) {
  const { t, T, p } = s;
  if (s.params.phase === 'out') {
    fillScreen(ctx, '#1a1006');
    additive(ctx, () => {
      for (let i = 0; i < 80; i++) {
        const y = hash(i, 161) * H;
        const snap = ease.outExpo(clamp(t / 0.5));
        const len = W * (1 - snap) * hashRange(i, 162, 0.4, 1);
        const x = hash(i, 163) * W;
        ctx.strokeStyle = rgba('#ffd27a', 0.6 * (1 - snap));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - len / 2, y);
        ctx.lineTo(x + len / 2, y + Math.sin(i) * 20);
        ctx.stroke();
      }
    });
    ctx.fillStyle = rgba('#fff4dc', 1 - clamp(t / 0.6));
    ctx.fillRect(0, 0, W, H);
    return;
  }
  // phase 'in': the shop unspools into golden threads
  shop(ctx, { ...s, params: { time: 'morning', elias: 'standing', customer: true } });
  const k = ease.inOutCubic(clamp(p * 1.15));
  fillScreen(ctx, rgba('#2a1806', k * 0.95));
  additive(ctx, () => {
    const n = 140;
    for (let i = 0; i < n; i++) {
      const y0 = (i / n) * H;
      const on = smoothstep(hash(i, 171) * 0.6, hash(i, 171) * 0.6 + 0.3, k);
      if (on <= 0) continue;
      ctx.strokeStyle = rgba(i % 4 === 0 ? '#fff0c8' : '#ffc860', 0.35 * on);
      ctx.lineWidth = 1.5 + (i % 5 === 0 ? 1.5 : 0);
      ctx.beginPath();
      for (let x = -40; x <= W + 40; x += 40) {
        const y = y0 + Math.sin(x * 0.006 + T * 3 + i) * 30 * on + Math.sin(x * 0.02 - T * 6) * 6;
        x === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    glow(ctx, W * 0.6, H * 0.55, 900 * k, '#ffd27a', 0.6 * k);
  });
  ctx.fillStyle = rgba('#fff4dc', smoothstep(0.85, 1, p) * 0.9);
  ctx.fillRect(0, 0, W, H);
}

// ── WORKSHOP (1962, gold monochrome) ─────────────────────────────────────────
export function workshop(ctx, s) {
  const { T, t } = s;
  const focus = s.params.focus || 'wide';
  ctx.save();
  if (focus === 'henry') {
    ctx.translate(W * 0.55, H * 0.55);
    ctx.scale(1.55, 1.55);
    ctx.translate(-W * 0.62, -H * 0.55);
  }
  fillScreen(ctx, vGradient(ctx, 0, 0, 0, H, [[0, '#3a2708'], [1, '#120a02']]));
  // wall of clocks
  for (let i = 0; i < 14; i++) {
    const x = 160 + (i % 7) * 230, y = 170 + Math.floor(i / 7) * 210;
    drawClockFace(ctx, x, y, 52 + (i % 3) * 10, (i * 5) % 12, (T * 60 * (1 + i * 0.1)) % 60, { face: '#e9c873', ink: '#3a2708' });
  }
  // window light
  additive(ctx, () => glow(ctx, 1700, 300, 700, '#ffe6a8', 0.35));
  // workbench
  ctx.fillStyle = '#1e1404';
  ctx.fillRect(140, 700, 900, 30);
  ctx.fillRect(170, 730, 40, 300);
  ctx.fillRect(960, 730, 40, 300);
  // magnifier lamp
  additive(ctx, () => glow(ctx, 640, 600, 380, '#fff0c0', 0.45));
  ctx.strokeStyle = '#2a1c06';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(900, 700);
  ctx.lineTo(820, 460);
  ctx.lineTo(680, 520);
  ctx.stroke();
  ctx.fillStyle = '#2a1c06';
  ctx.beginPath();
  ctx.arc(660, 540, 50, 0, TAU);
  ctx.fill();
  // Abernathy at the bench
  humanoid(ctx, 500, 1010, 640, { costume: 'abernathy', body: '#1a1004', rim: '#ffe0a0', rimDy: -2, dir: 1, pose: makePose('seated', { haF: [0.24, -0.47], haB: [0.19, -0.47] }), t: T });
  // Henry pacing
  const px = 1300 + Math.sin(T * 0.9) * 120;
  const hr = humanoid(ctx, focus === 'henry' ? 1250 : px, 1010, 700, {
    costume: 'henry',
    body: '#1a1004',
    rim: '#ffe6b0',
    rimDy: -2,
    dir: focus === 'henry' ? -1 : Math.cos(T * 0.9) > 0 ? 1 : -1,
    pose: focus === 'henry' ? makePose('stand', 'watch') : makePose('stand'),
    t: T,
  });
  if (focus === 'henry') additive(ctx, () => glow(ctx, hr.handF[0], hr.handF[1], 90, '#fff0b0', 0.9));
  // Elias, translucent observer
  ctx.save();
  ctx.globalAlpha = 0.45 + 0.1 * Math.sin(T * 4);
  humanoid(ctx, focus === 'henry' ? 1500 : 1700, 1010, 680, { costume: 'elias', body: 'rgba(255,220,150,0.12)', rim: 'rgba(255,230,170,0.9)', rimDy: -2, dir: -1, t: T, bare: true });
  ctx.restore();
  ctx.restore();
  // monochrome film treatment
  ctx.fillStyle = 'rgba(255,200,90,0.08)';
  ctx.fillRect(0, 0, W, H);
  const fr = Math.floor(T * 24);
  ctx.strokeStyle = 'rgba(255,240,200,0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    if (hash(fr * 3 + i, 177) > 0.5) continue;
    const x = hash(fr * 3 + i, 178) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + hashRange(fr + i, 179, -20, 20), H);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(0,0,0,${0.06 + hash(fr, 180) * 0.06})`;
  ctx.fillRect(0, 0, W, H);
}

// ── DOOR (Seren's entrance) ──────────────────────────────────────────────────
export function door(ctx, s) {
  const { t, T } = s;
  fillScreen(ctx, '#07050a');
  const open = ease.outExpo(clamp((t - 0.3) / 0.35));
  const dx = 760, dy = 120, dw = 420, dh = 900;
  // outside: rain, streetlamp, lightning
  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  const flash = t > 0.45 && t < 0.75 ? 1 - (t - 0.45) / 0.3 : 0;
  fillScreen(ctx, vGradient(ctx, 0, dy, 0, dy + dh, [[0, flash ? '#c8d0ff' : '#141a2e'], [1, '#05060c']]));
  additive(ctx, () => glow(ctx, dx + 330, dy + 180, 260, '#ffb066', 0.6));
  drawRain(ctx, T, { count: 220, speed: 1100, color: 'rgba(180,200,255,0.4)' });
  // Seren silhouette in the doorway, staggering forward
  const st = clamp((t - 0.5) / 2.5);
  const sr = humanoid(ctx, dx + dw * 0.5 - st * 40, dy + dh + 10 + st * 30, 820 + st * 120, {
    costume: 'seren',
    body: '#040306',
    rim: '#ffb066',
    rimDy: -2,
    dir: 1,
    pose: makePose('stand', { elF: [0.13, -0.6], haF: [0.12, -0.66], elB: [-0.06, -0.62], haB: [0.0, -0.55] }),
    lean: 0.15,
    t: T,
    wind: 0.5,
    sigil: 0.8,
  });
  additive(ctx, () => glow(ctx, sr.handF[0], sr.handF[1], 160, '#a66bff', 0.8 + 0.2 * Math.sin(T * 6)));
  ctx.restore();
  // the door leaf swinging inward
  const leafW = dw * (1 - open * 0.85);
  ctx.fillStyle = '#1a110a';
  ctx.fillRect(dx, dy, leafW, dh);
  ctx.fillStyle = '#2a3a5a';
  ctx.fillRect(dx + leafW * 0.15, dy + 60, leafW * 0.7, 360);
  // frame
  ctx.strokeStyle = '#120a05';
  ctx.lineWidth = 30;
  ctx.strokeRect(dx - 15, dy - 15, dw + 30, dh + 30);
  // bell swinging hard
  const sw = Math.sin(T * 14) * 0.6 * Math.exp(-Math.max(0, t - 0.3) * 1.2) * (t > 0.3 ? 1 : 0);
  ctx.save();
  ctx.translate(dx + dw + 60, dy - 20);
  ctx.rotate(sw);
  ctx.fillStyle = '#c99c40';
  ctx.beginPath();
  ctx.moveTo(-26, 60);
  ctx.quadraticCurveTo(-26, 10, 0, 10);
  ctx.quadraticCurveTo(26, 10, 26, 60);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // warm interior spill on the floor
  additive(ctx, () => glow(ctx, dx + dw / 2, dy + dh, 500, '#ffb066', 0.12 + flash * 0.3));
}

// ── SEAM (a crack in the air; a Fray; Aether stitches) ───────────────────────
export function seam(ctx, s) {
  const { t, T } = s;
  const stitch = s.params.phase === 'stitch';
  shop(ctx, { ...s, params: { time: 'night', elias: 'backing', seren: stitch ? 'exhausted' : 'standing' } });
  fillScreen(ctx, 'rgba(6,2,12,0.45)');
  const cx = 1060, top = 160, bottom = 900;
  const open = stitch ? 1 - ease.inOutCubic(clamp((t - 1.2) / 3.4)) : ease.outCubic(clamp((t - 0.4) / 2.2));
  const width = 120 * open;
  // jagged seam polygon
  const rnd = mulberry32(19);
  const spine = [];
  for (let i = 0; i <= 18; i++) spine.push([cx + (rnd() - 0.5) * 120, lerp(top, bottom, i / 18)]);
  const left = spine.map(([x, y], i) => [x - width * Math.sin((i / 18) * Math.PI) * (0.6 + rnd() * 0.4), y]);
  const right = spine.map(([x, y], i) => [x + width * Math.sin((i / 18) * Math.PI) * (0.6 + rnd() * 0.4), y]).reverse();
  if (open > 0.01) {
    ctx.save();
    ctx.beginPath();
    poly(ctx, [...left, ...right]);
    ctx.clip();
    drawIncursionSky(ctx, T, { intensity: 1.2 });
    ctx.restore();
  }
  strokeGlowPath(ctx, spine, '#e9a8ff', 3 + open * 3, 0.8);
  additive(ctx, () => glow(ctx, cx, (top + bottom) / 2, 500 * (0.3 + open), '#b04bff', 0.35));
  // the Fray hand: blocky, glitching
  const reach = stitch ? clamp(1 - t / 1.0) : ease.outCubic(clamp((t - 1.4) / 1.6));
  if (reach > 0) {
    const fr = Math.floor(T * 20);
    const hx = cx + 30 - reach * 320, hy = 520;
    for (let i = 0; i < 70; i++) {
      const u = i / 70;
      const bx = lerp(cx + 20, hx, u) + (hash(i + fr * 70, 191) - 0.5) * 40;
      const by = hy + Math.sin(u * 6) * 30 + (hash(i, 192) - 0.5) * 80 * (u > 0.85 ? 2 : 1);
      const sz = hashRange(i, 193, 14, 34) * (u > 0.85 ? 1.3 : 1);
      ctx.fillStyle = hash(i + fr, 194) > 0.85 ? '#ff4fd8' : '#030104';
      ctx.fillRect(bx - sz / 2, by - sz / 2, sz, sz);
    }
    // severed: dissolving static
    if (stitch && t > 0.4) {
      for (let i = 0; i < 90; i++) {
        const u = clamp((t - 0.4) / 2);
        const px = hx + hashRange(i, 195, -120, 120) + u * hashRange(i, 196, -200, 200);
        const py = hy + hashRange(i, 197, -100, 100) - u * 200;
        ctx.fillStyle = rgba(hash(i, 198) > 0.5 ? '#ffffff' : '#ff4fd8', 1 - u);
        ctx.fillRect(px, py, 6, 6);
      }
    }
  }
  // Aether threads from Seren's fingertips, stitching
  if (stitch) {
    const k = clamp((t - 0.2) / 4.6);
    const hand = [860, 470];
    additive(ctx, () => {
      glow(ctx, hand[0], hand[1], 140, '#c9a2ff', 0.8);
      const stitches = 14;
      for (let i = 0; i < stitches; i++) {
        const u = i / stitches;
        if (u > k) break;
        const sp = spine[Math.round(u * 18)];
        const y = sp[1];
        ctx.strokeStyle = rgba('#e6d6ff', 0.85);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sp[0] - 70, y - 18);
        ctx.lineTo(sp[0] + 70, y + 18);
        ctx.stroke();
        ctx.strokeStyle = rgba('#b48cff', 0.35);
        ctx.lineWidth = 10;
        ctx.stroke();
      }
      const target = spine[Math.min(18, Math.round(k * 18))];
      for (let j = 0; j < 4; j++) {
        ctx.strokeStyle = rgba(j % 2 ? '#e6d6ff' : '#b48cff', 0.55);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hand[0], hand[1]);
        ctx.quadraticCurveTo(lerp(hand[0], target[0], 0.5), hand[1] - 120 + j * 40 + Math.sin(T * 6 + j) * 30, target[0], target[1]);
        ctx.stroke();
      }
    });
    humanoid(ctx, 700, 1000, 660, { costume: 'seren', body: '#08060a', rim: '#c9a2ff', rimDy: -2, dir: 1, pose: makePose('stand', 'cast'), t: T, sigil: 1 });
  }
}

// ── TV news ──────────────────────────────────────────────────────────────────
export function tv(ctx, s) {
  const { T, t } = s;
  const seg = s.params.segment || 'anchor';
  fillScreen(ctx, '#0c0806');
  additive(ctx, () => glow(ctx, W / 2, H / 2, 1100, '#7fa8d8', 0.18));
  const sx = 260, sy = 110, sw = 1400, sh = 860;
  ctx.fillStyle = '#2a1c12';
  ctx.beginPath();
  ctx.roundRect(sx - 60, sy - 60, sw + 120, sh + 120, 50);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, 40);
  ctx.clip();
  if (seg === 'anchor') {
    ctx.fillStyle = vGradient(ctx, 0, sy, 0, sy + sh, [[0, '#0d2a52'], [1, '#04101f']]);
    ctx.fillRect(sx, sy, sw, sh);
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = 'rgba(120,170,255,0.08)';
      ctx.beginPath();
      ctx.arc(sx + sw * 0.75, sy + sh * 0.35, 60 + i * 40, 0, TAU);
      ctx.stroke();
    }
    // anchor at desk
    humanoid(ctx, sx + sw * 0.42, sy + sh * 1.05, 900, { costume: 'person', body: '#0a1220', rim: '#9cc8ff', rimDy: -2, dir: 1, pose: makePose('stand', 'hands'), t: T });
    ctx.fillStyle = '#0a1a33';
    ctx.fillRect(sx, sy + sh * 0.72, sw, sh * 0.3);
    // inset graphic: purple sky
    ctx.save();
    ctx.translate(sx + sw * 0.62, sy + 90);
    ctx.fillStyle = '#5a1a6a';
    ctx.fillRect(0, 0, 440, 260);
    ctx.fillStyle = '#c86bd8';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, 440, 120);
    ctx.globalAlpha = 1;
    text(ctx, 'LIVE · 3:12 PM', 20, 230, { family: FONTS.mono, size: 22, weight: 700, color: '#ffffff', align: 'left' });
    ctx.restore();
  } else {
    ctx.fillStyle = vGradient(ctx, 0, sy, 0, sy + sh, [[0, '#1d2630'], [1, '#0a0e14']]);
    ctx.fillRect(sx, sy, sw, sh);
    humanoid(ctx, sx + sw * 0.25, sy + sh * 1.08, 950, { costume: 'seren', body: '#0e1218', rim: '#cfe3ff', rimDy: -2, dir: 1, t: T, sigil: false });
    // graph: gravity reading with the nine-second spike
    const gx = sx + sw * 0.5, gy = sy + 120, gw = 620, gh = 380;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = 'rgba(160,200,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + (gh * i) / 6);
      ctx.lineTo(gx + gw, gy + (gh * i) / 6);
      ctx.stroke();
    }
    const drawK = clamp(t / 4);
    ctx.strokeStyle = '#7fd4ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 200 * drawK; i++) {
      const u = i / 200;
      const spike = u > 0.45 && u < 0.62 ? 1 : 0;
      const yv = gh * 0.7 - spike * gh * 0.45 + Math.sin(i * 1.7) * 4 * (1 + spike * 3);
      i ? ctx.lineTo(gx + u * gw, gy + yv) : ctx.moveTo(gx + u * gw, gy + yv);
    }
    ctx.stroke();
    text(ctx, 'g  (m/s²)', gx + 16, gy + 26, { family: FONTS.mono, size: 20, color: '#a9c4e0', align: 'left' });
    if (drawK > 0.6) text(ctx, '9.0 s', gx + gw * 0.53, gy + gh * 0.12, { family: FONTS.mono, size: 26, weight: 700, color: '#ff7ae6' });
  }
  // lower third + ticker
  const name = seg === 'anchor' ? ['CHANNEL 6 · MERRIDALE', 'ATMOSPHERIC GLITCH · NORTHERN HEMISPHERE'] : ['DR. INES MARLOWE', 'ATMOSPHERIC PHYSICIST · MERRIDALE UNIVERSITY'];
  ctx.fillStyle = '#b3121b';
  ctx.fillRect(sx + 60, sy + sh - 230, 760, 64);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(sx + 60, sy + sh - 166, 760, 50);
  text(ctx, name[0], sx + 84, sy + sh - 198, { family: FONTS.sans, size: 34, weight: 800, color: '#fff', align: 'left' });
  text(ctx, name[1], sx + 84, sy + sh - 141, { family: FONTS.sans, size: 22, weight: 600, color: '#222', align: 'left' });
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(sx, sy + sh - 70, sw, 70);
  const tick = '   ATMOSPHERIC GLITCH REPORTED ACROSS NORTHERN HEMISPHERE · SKY TURNED PURPLE FOR NINE SECONDS · GRAVITATIONAL ANOMALY RECORDED · OFFICIALS: "NO CAUSE FOR ALARM" · BIRDS FROZE MID-FLIGHT, SAY WITNESSES ·';
  setFont(ctx, FONTS.sans, 30, 700);
  const tw = ctx.measureText(tick).width;
  const off = (T * 180) % tw;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tick, sx + sw - off - tw, sy + sh - 35);
  ctx.fillText(tick, sx + sw - off, sy + sh - 35);
  // scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = sy; y < sy + sh; y += 4) ctx.fillRect(sx, y, sw, 2);
  ctx.restore();
  additive(ctx, () => glow(ctx, sx + sw * 0.3, sy + sh * 0.2, 500, '#ffffff', 0.05));
}
