// Background treatments for the CAD explorer (viewer + part inspector), to
// compare side by side. `viewer` paints behind the transparent 3D canvas;
// `panel` is the inspector beside it. Temporary: once one is picked it moves
// into the component and this file and the picker go.

export interface CadTheme { name: string; viewer: string; panel: string }

export const cadThemes: CadTheme[] = [
  {
    name: 'Slate pool (current)',
    viewer: 'radial-gradient(ellipse at 50% 40%, var(--slate-a7), var(--slate-a3) 70%)',
    panel: 'var(--slate-a3)',
  },
  {
    name: 'Flat graphite',
    viewer: '#1d1e21',
    panel: '#1d1e21',
  },
  {
    name: 'Soft graphite pool',
    viewer: 'radial-gradient(ellipse at 50% 45%, #2b2d31, #1b1c1f 75%)',
    panel: '#1b1c1f',
  },
  {
    name: 'Studio grey',
    viewer: 'radial-gradient(ellipse at 50% 40%, #44484f, #2a2c31 72%)',
    panel: '#2a2c31',
  },
  {
    name: 'Fusion fade',
    viewer: 'linear-gradient(180deg, #34373d 0%, #1c1d21 100%)',
    panel: 'linear-gradient(180deg, #2b2e33 0%, #1c1d21 100%)',
  },
  {
    name: 'Near black spotlight',
    viewer: 'radial-gradient(ellipse at 50% 42%, #26282c, #0e0e10 68%)',
    panel: '#101012',
  },
  {
    name: 'Night blueprint',
    viewer: 'radial-gradient(ellipse at 50% 40%, #1d2c48, #0f1627 72%)',
    panel: '#111a2d',
  },
  {
    name: 'Blueprint grid',
    viewer:
      'linear-gradient(rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 28px 28px, radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)',
    panel: '#101829',
  },
  {
    name: 'Indigo haze',
    viewer: 'radial-gradient(ellipse at 50% 40%, var(--indigo-4), var(--indigo-2) 72%)',
    panel: 'var(--indigo-2)',
  },
  {
    name: 'Workshop teal',
    viewer: 'radial-gradient(ellipse at 50% 40%, #213234, #131c1d 72%)',
    panel: '#152021',
  },
  {
    name: 'Warm charcoal',
    viewer: 'radial-gradient(ellipse at 50% 40%, #33302c, #1b1917 72%)',
    panel: '#1d1b19',
  },
  {
    name: 'Graph paper',
    viewer:
      'linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px) 0 0 / 24px 24px, radial-gradient(ellipse at 50% 40%, #2c2e33, #18191c 75%)',
    panel: '#1a1b1e',
  },
  {
    name: 'Horizon floor',
    viewer: 'linear-gradient(180deg, #2a2d33 0%, #22252a 55%, #16171a 56%, #111214 100%)',
    panel: '#1a1b1e',
  },
];
