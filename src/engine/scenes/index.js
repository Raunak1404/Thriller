// Scene registry: shot.scene name → draw function (ctx, s).
import { city, rooftop, eyes, face, key, watch, number } from './execution.js';
import { shop, macro, rules, retro, workshop, door, seam, tv } from './interior.js';
import { street, whispers, windowScene, tunnel, loom, black, title, clock, credits } from './exterior.js';

export const SCENES = {
  city, rooftop, eyes, face, key, watch, number,
  shop, macro, rules, retro, workshop, door, seam, tv,
  street, whispers, window: windowScene, tunnel, loom, black, title, clock, credits,
};
