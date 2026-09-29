// The frame's top-level sections. Placeholder names until the Figma concept lands;
// the nav, routes and mobile bar are all generated from this list.
export interface Section {
  id: string;
  label: string;
  path: string;
}

export const sections: Section[] = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'aircraft', label: 'Aircraft', path: '/aircraft' },
  { id: 'specs', label: 'Specs', path: '/specs' },
  { id: 'work', label: 'Work', path: '/work' },
  { id: 'dao', label: 'DAO', path: '/dao' },
];
