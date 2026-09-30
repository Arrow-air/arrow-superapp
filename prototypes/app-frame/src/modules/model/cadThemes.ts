// Background treatments for the CAD explorer (viewer + part inspector), to
// compare side by side. `viewer` paints behind the transparent 3D canvas;
// `panel` is the inspector beside it. Temporary: once one is picked it moves
// into the component and this file and the picker go.

/** `base` sits behind the canvas; `grid` is laid over it when the viewer's grid toggle is on. */
export interface CadTheme { name: string; base: string; grid: string; panel: string }

export const cadThemes: CadTheme[] = [
  // Round two: the blueprint family (round one's 7 and 8 were the favourites;
  // 8 is 7 with a grid, which is now the viewer's grid toggle).
  { name: 'Blueprint', base: 'radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)', grid: 'linear-gradient(rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgb(120 150 220 / 0.07) 1px, transparent 1px) 0 0 / 28px 28px', panel: '#101829' },
  { name: 'Blueprint, fine faint grid', base: 'radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)', grid: 'linear-gradient(rgb(120 150 220 / 0.045) 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(90deg, rgb(120 150 220 / 0.045) 1px, transparent 1px) 0 0 / 16px 16px', panel: '#101829' },
  { name: 'Blueprint, drafting grid', base: 'radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)', grid: 'linear-gradient(rgb(120 150 220 / 0.09) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(90deg, rgb(120 150 220 / 0.09) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(rgb(120 150 220 / 0.04) 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(90deg, rgb(120 150 220 / 0.04) 1px, transparent 1px) 0 0 / 16px 16px', panel: '#101829' },
  { name: 'Blueprint, grid fading out', base: 'radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)', grid: 'radial-gradient(ellipse at 50% 42%, transparent 35%, #0e1526 85%), linear-gradient(rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px', panel: '#0f1628' },
  { name: 'Blueprint, dot grid', base: 'radial-gradient(ellipse at 50% 40%, #1b2a45, #0e1526 75%)', grid: 'radial-gradient(rgb(140 170 235 / 0.16) 1px, transparent 1.5px) 0 0 / 20px 20px', panel: '#101829' },
  { name: 'Deep ink', base: 'radial-gradient(ellipse at 50% 40%, #152139, #090e1a 75%)', grid: 'linear-gradient(rgb(120 150 220 / 0.06) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.06) 1px, transparent 1px) 0 0 / 24px 24px', panel: '#0b1120' },
  { name: 'Bright blueprint', base: 'radial-gradient(ellipse at 50% 40%, #24395f, #13213b 75%)', grid: 'linear-gradient(rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgb(120 150 220 / 0.08) 1px, transparent 1px) 0 0 / 24px 24px', panel: '#15233d' },
];
