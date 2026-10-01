// Longshot: Arrow's own battery pack, meant as a drop-in replacement for the
// Tattu 4.0 30 Ah on Quiver. Facts from Arrow-air/project-longshot (README,
// #26, PR #27, SL_PCB) and project-quiver #188, #248. Where the sources
// disagree, both figures are shown.

const LS = 'https://github.com/Arrow-air/project-longshot';
export const longshotLinks = {
  repo: LS,
  specs: `${LS}/issues/26`,
  model: `${LS}/pull/27`,
  board: `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md`,
};

export const specRows: { label: string; longshot: string; tattu: string; source: string; url: string }[] = [
  { label: 'Cells', longshot: '126 × BAK 21700 65E, 14S9P', tattu: 'LiHV pouch, 14S1P', source: 'LS #26', url: `${LS}/issues/26` },
  { label: 'Voltage', longshot: '58.8 V full, 50.4–51.8 V nominal', tattu: '60.9 V full (4.35 V/cell), 53.2 V nominal', source: 'LS README, #26', url: `${LS}/issues/26` },
  { label: 'Capacity', longshot: '58.5 Ah', tattu: '30 Ah', source: 'LS #26', url: `${LS}/issues/26` },
  { label: 'Energy', longshot: '~2,200–2,950 Wh (sources differ)', tattu: '~1,600–2,200 Wh (sources differ)', source: 'LS README, #26; Quiver #188', url: `${LS}/issues/26` },
  { label: 'Mass', longshot: '11.2 kg, weighed Aug 29', tattu: '~11.4–11.5 kg', source: 'LS #26', url: `${LS}/issues/26` },
  { label: 'BMS', longshot: 'v0 board: none (fuse and cell-sense pass-through). v1: STM32 smart BMS, isolated CAN', tattu: 'Built-in, DroneCAN node 125', source: 'SL_PCB README, LS #26, Quiver #248', url: `${LS}/blob/main/engineering/electronics/pcbs/SL_PCB/README.md` },
  { label: 'Connector', longshot: 'ET60S-D06 on the SL board', tattu: 'Mates 2 × Molex 46437-9206 on the battery connector PCB (3320)', source: 'LS PR #27; Quiver BC-PCB guide', url: `${LS}/pull/27` },
  { label: 'Charger', longshot: 'Tattu TA3200 plus a balance connector', tattu: '14S LiHV charger', source: 'LS #16, Pilot\'s Handbook', url: `${LS}/issues/16` },
];

export type StepStatus = 'open' | 'blocked' | 'done';
export const integration: { id: string; title: string; status: StepStatus; statusText: string; detail: string; thread?: string }[] = [
  { id: 'build', title: 'PT1 pack built', status: 'done', statusText: 'Done', detail: 'Built and weighed at 11.2 kg (LS #26). About 364 g of parts are still unweighed.' },
  { id: 'fit', title: 'Fit in the battery bay and connector', status: 'open', statusText: 'Not checked', detail: 'Designed around Tattu geometry and the Tattu clip, but no fit check against the slider (2211) or the battery connector PCB (3320) is recorded.', thread: 'Q-18' },
  { id: 'bms', title: 'BMS and telemetry', status: 'blocked', statusText: 'No working BMS yet', detail: 'The v0 board has no BMS, so the flight controller gets no battery data from the pack. The protocol for v1 is undecided.', thread: 'Q-19' },
  { id: 'failsafe', title: 'Failsafe values for 58.5 Ah', status: 'open', statusText: 'Sized for Tattu', detail: 'The values adopted in #248 read the Tattu BMS and are sized for 30 Ah.', thread: 'Q-20' },
  { id: 'charge', title: 'Charging', status: 'open', statusText: 'Cutoffs differ', detail: 'Longshot charges to 58.8 V; the Tattu LiHV profile goes to 60.9 V. Chargers and docks must handle both (LS #26).', thread: 'Q-21' },
  { id: 'test', title: 'First pack test on Quiver', status: 'open', statusText: 'Not planned yet', detail: 'No pack-level test is recorded; the only data is a cell discharge.', thread: 'Q-22' },
];
