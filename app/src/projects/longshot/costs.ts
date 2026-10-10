// What PT1 is known to have cost, from the PT1 BOM and cost notes in the
// repository (engineering/builds/PT1/BOM.md): the cell order receipt and the
// copper busbar quotation Julius shared on 2026-06-11. Nothing else is priced
// there yet.
const LS = 'https://github.com/Arrow-air/project-longshot';

export const pt1Costs = {
  source: { label: 'PT1 BOM and cost notes', url: `${LS}/blob/main/engineering/builds/PT1/BOM.md` },
  lines: [
    { item: 'Cells: 140 BAK 21700 65E from Shenzhen Vapcell, landed', amount: '€856.39 ($979.55)', note: 'Includes €145.13 shipping and €24.22 insurance: about $7.00 a cell. 126 went into the pack, 14 are spares.' },
    { item: 'The 126 cells in the pack', amount: '€770.75 (≈ $881.60)' },
    { item: 'Copper busbars, one pack', amount: '$108.57', note: 'Supro Manufacturing quotation; $75.90 in parts, with shipping spread over three batteries.' },
    { item: 'Known PT1 material: installed cells and busbars', amount: '≈ $990.17' },
  ],
  caveat: 'PCBs, printed and structural parts, enclosure hardware, connectors, labour and tooling are not priced yet.',
};
