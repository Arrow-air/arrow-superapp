// Placeholder icon set (24px grid, filled). Swap for the Figma icons when exported.
export const icons = {
  'half-diamond': 'M12 2 22 12 12 22 2 12Zm0 3.2V18.8L18.8 12Z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 0 1 6.9 6H5.1A7 7 0 0 1 12 5Z',
  cylinder: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3v12c0 1.7-3.1 3-7 3s-7-1.3-7-3Zm2 5.5V14c1.3.7 3 1 5 1s3.7-.3 5-1v-2.5c-1.3.6-3 1-5 1s-3.7-.4-5-1Z',
  gear: 'M12 1.5 14 4l3.2-.9.6 3.2 3.2.6-.9 3.2L22.5 12 20 14l.9 3.2-3.2.6-.6 3.2-3.2-.9L12 22.5 10 20l-3.2.9-.6-3.2-3.2-.6.9-3.2L1.5 12 4 10l-.9-3.2 3.2-.6.6-3.2 3.2.9Zm-1 6.5v3H8v2h3v3h2v-3h3v-2h-3V8Z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7Z',
  chip: 'M8 2h2v2h4V2h2v2h2a2 2 0 0 1 2 2v2h2v2h-2v4h2v2h-2v2a2 2 0 0 1-2 2h-2v2h-2v-2h-4v2H8v-2H6a2 2 0 0 1-2-2v-2H2v-2h2v-4H2V8h2V6a2 2 0 0 1 2-2h2Z',
  store: 'M3 4h18l1 5a3 3 0 0 1-5 2.2A3 3 0 0 1 12 11a3 3 0 0 1-5 .2A3 3 0 0 1 2 9Zm1 9.5a4.6 4.6 0 0 0 4-.6 4.9 4.9 0 0 0 4 .9 4.9 4.9 0 0 0 4-.9 4.6 4.6 0 0 0 4 .6V20H4Zm5 1.5v5h6v-5Z',
  hexagon: 'M12 2 21 7v10l-9 5-9-5V7Zm0 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  diamond: 'M12 2 20 12 12 22 4 12Zm0 4.5L7.6 12 12 17.5 16.4 12Z',
  list: 'M3 4h4v4H3Zm6 1h12v2H9ZM3 10h4v4H3Zm6 1h12v2H9Zm-6 5h4v4H3Zm6 1h12v2H9Z',
  grid: 'M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z',
  'chevrons-v': 'M12 4 17 9.5H7Zm0 16-5-5.5h10Z',
  'chevron-right': 'm9 5 7 7-7 7-1.4-1.4L13.2 12 7.6 6.4Z',
  sort: 'M7 3 11 8H8v13H6V8H3Zm10 18-4-5h3V3h2v13h3ZM13 5h8v2h-8Zm0 4h6v2h-6Z',
  arrow: 'M12 2 20 21 12 16.5 4 21Z',
  menu: 'M3 5h18v2H3Zm0 6h18v2H3Zm0 6h18v2H3Z',
  comment: 'M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-9l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  share: 'M18 2a3 3 0 1 1-2.8 4.1L8.9 9.3a3 3 0 0 1 0 1.4l6.3 3.2A3 3 0 1 1 15 16l-6.3-3.2a3 3 0 1 1 0-5.6L15 4a3 3 0 0 1 3-2Z',
} as const;

export type IconName = keyof typeof icons;
