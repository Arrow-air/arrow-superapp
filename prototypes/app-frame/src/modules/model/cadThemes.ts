// Background treatments for the CAD explorer (viewer + part inspector), to
// compare side by side. `viewer` paints behind the transparent 3D canvas;
// `panel` is the inspector beside it. Temporary: once one is picked it moves
// into the component and this file and the picker go.

export interface CadTheme { name: string; viewer: string; panel: string }

export const cadThemes: CadTheme[] = [
  // Round two: the blueprint family (the first round's 7 and 8 were the favourites).
  {
    name: 'Night blueprint (7)',
    viewer: 'radial-gradient(ellipse at 50% 40%, #1d2c48, #0f1627 72%)',
    panel: '#111a2d',
  },
  {
    name: 'Blueprint grid (8)',
    viewer: 'linear-gradient(rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 28px 28px, radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)',
    panel: '#101829',
  },
  {
    name: 'Fine faint grid',
    viewer: 'linear-gradient(rgb(120 150 220 / 0.045) 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(90deg, rgb(120 150 220 / 0.045) 1px, transparent 1px) 0 0 / 16px 16px, radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)',
    panel: '#101829',
  },
  {
    name: 'Drafting grid (major + minor)',
    viewer: 'linear-gradient(rgb(120 150 220 / 0.09) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(90deg, rgb(120 150 220 / 0.09) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(rgb(120 150 220 / 0.04) 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(90deg, rgb(120 150 220 / 0.04) 1px, transparent 1px) 0 0 / 16px 16px, radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)',
    panel: '#101829',
  },
  {
    name: 'Grid fading to the edges',
    viewer: 'radial-gradient(ellipse at 50% 42%, transparent 35%, #0e1526 85%), linear-gradient(rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px, radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)',
    panel: '#0f1628',
  },
  {
    name: 'Deep ink grid',
    viewer: 'linear-gradient(rgb(120 150 220 / 0.06) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.06) 1px, transparent 1px) 0 0 / 24px 24px, radial-gradient(ellipse at 50% 40%, #152139, #090e1a 75%)',
    panel: '#0b1120',
  },
  {
    name: 'Bright blueprint',
    viewer: 'linear-gradient(rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px, radial-gradient(ellipse at 50% 40%, #24395f, #13213b 75%)',
    panel: '#15233d',
  },
  {
    name: 'Blueprint, grid on the panel too',
    viewer: 'linear-gradient(rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 24px 24px, radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)',
    panel: 'linear-gradient(rgb(120 150 220 / 0.05) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.05) 1px, transparent 1px) 0 0 / 24px 24px, #101829',
  },
  {
    name: 'Dot grid',
    viewer: 'radial-gradient(rgb(140 170 235 / 0.16) 1px, transparent 1.5px) 0 0 / 20px 20px, radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)',
    panel: '#101829',
  },
];
