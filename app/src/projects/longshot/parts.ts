// Longshot's parts, by their build123d BOM number (engineering/cad/build123d/
// BOM.csv): a short name for rows and tiles, the zone a change to each one is
// discussed in, and a colour family for the 3D model.
import { lsBomById } from './github';

const SHORT: Record<string, string> = {
  'PW-CELL-001-21700': '21700 cell',
  'PW-BUS-001-N_Terminal': 'Negative terminal busbar',
  'PW-BUS-002-P_Terminal': 'Positive terminal busbar',
  'PW-BUS-003-Bridge_1': 'Series bridge busbar',
  'PW-BUS-004-Bridge_2': 'Mid-pack bridge busbar',
  'PW-BUS-005-Screw_Terminal_Negative': 'Negative screw terminal bar',
  'PW-BUS-006-Screw_Terminal_Positive': 'Positive screw terminal bar',
  'EN-CELL-001-Upper_Cell_Holder': 'Upper cell holder',
  'EN-CELL-001-Bottom_Cell_Holder': 'Bottom cell holder',
  'EN-PC-001-Top_Plate': 'Top plate',
  'EN-PC-002-Bottom_Plate': 'Bottom plate',
  'EN-SHEET-001-Reinfocement_Right': 'Right reinforcement sheet',
  'EN-SHEET-002-Reinfocement_Left': 'Left reinforcement sheet',
  'EN-PRINT-001-3D-Printable_Battery_Base': 'Printed base',
  'EN-PRINT-002-3D-Printable_Battery_Top_Cover': 'Printed top cover',
  'EN-STRAP-001-Metal_piece': 'Strap metal piece',
  'EN-STRAP-002-Rubber_Part': 'Strap rubber part',
  'EN-STRAP-003-Metal_End': 'Strap metal end',
  'SL_PCB-002-SL_PCB_V3': 'SL board (main battery PCB)',
  'VS_PCB_COMPLETE_TOP_LEFT': 'Voltage-sense board, top left',
  'VS_PCB_COMPLETE_TOP_RIGHT': 'Voltage-sense board, top right',
  'VS_PCB_COMPLETE_BOTTOM_LEFT': 'Voltage-sense board, bottom left',
  'VS_PCB_COMPLETE_BOTTOM_RIGHT': 'Voltage-sense board, bottom right',
  'ET60S-D06-0-00-D06-L-V1-S': 'ET60S-D06 battery connector',
  'EL-FUSE-001-AMXL-200': 'AMXL-200 main fuse',
  'FUSE-SMD_L10_0-W5_0-H3_8': 'SMD fuse',
  'AMT0450003DB0000G': 'AMT0450003DB0000G (on the SL board)',
  'CONN-TH_430451612': 'Through-hole connector 430451612',
  'CONN-SMD_SM7B-GHS-TB-LF-SN': 'JST GH 7-pin connector',
  'Tattu_4_0_30Ah_Clip': 'Tattu 4.0 30 Ah clip',
  'EN-INSERT-001-ruthex_RX-M3x5_7': 'M3 heat-set insert',
  'EN-INSERT-002-ruthex_RX-M4x8_1': 'M4 heat-set insert',
};

export const lsPartName = (id: string) => SHORT[id] ?? lsBomById(id)?.description.split(/[.;(]/)[0].trim();
export const isLongshotPart = (id: string) => id in SHORT || !!lsBomById(id);

/** The Longshot zone a change to this part is discussed in. */
export function lsZoneForPart(id: string): string {
  if (/^PW-CELL|^EN-CELL/.test(id)) return 'cells';
  if (/^PW-BUS/.test(id)) return 'busbars';
  if (/^EN-(PC|SHEET|PRINT)/.test(id)) return 'enclosure';
  if (/^EN-(STRAP|INSERT)|^Tattu/.test(id)) return 'mounting';
  return 'connector'; // the SL board, voltage-sense boards, connector, fuses
}

/** Colour family on the model: cells, copper, printed structure, plates and sheets, electronics, hardware. */
export function lsFamily(id: string): 'cell' | 'copper' | 'print' | 'plate' | 'pcb' | 'hardware' {
  if (/^PW-CELL/.test(id)) return 'cell';
  if (/^PW-BUS/.test(id)) return 'copper';
  if (/^EN-(CELL|PRINT)/.test(id)) return 'print';
  if (/^EN-(PC|SHEET)/.test(id)) return 'plate';
  if (/^EN-(STRAP|INSERT)|^Tattu/.test(id)) return 'hardware';
  return 'pcb';
}
