// Where Longshot's facts come from, for links across its data files.
import type { SourceRef } from '../../modules/threads/data';

export const LS = 'https://github.com/Arrow-air/project-longshot';
/** The Project Longshot proposal on the Arrow forum (Julius, Mar 10, 2026), approved on Snapshot in April. */
export const PROPOSAL = 'https://dao.arrowair.com/t/project-longshot-proposal-discussion/154';
export const SNAPSHOT = 'https://snapshot.box/#/s:arrowair.eth/proposal/0xe11e4b620177b6f1b65b07efa2f9be8aa85e335d46c6469106983e0b6e738772';
/** The Spearhead wiki's call notes; Longshot's battery and BMS calls are among them. */
export const W09 = 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9009';
export const W10 = 'https://github.com/Arrow-air/project-spearhead/wiki/2026%E2%80%9010';
export const SEP29 = 'https://discord.com/channels/853833144037277726/1478778896361980035/1554521669400526873';
export const TATTU_STORE = 'https://genstattu.com/tattu-dual-channel-smart-charger-60a-3200w-for-6s-14s-lipo-tattu-smart-battery/';
export const TATTU_TA3200 = 'https://www.tattuworld.com/products/ta3200-series-smart-drone-battery-charger.html';
export const COPPER_QUOTE = `${LS}/blob/main/engineering/builds/PT1/design/copper-busbars/order-copper-longshot-pt1/README.md`;
export const AIP007 = 'https://github.com/Arrow-air/dao-aips/blob/main/AIPs/AIP-007.md';
export const AIP006 = 'https://github.com/Arrow-air/dao-aips/blob/main/AIPs/AIP-006.md';
export const HANDBOOK = 'https://github.com/Arrow-air/project-quiver/blob/main/docs/Operations/Pilot-Handbook.md';
export const HANDBOOK_DRAFT = 'https://github.com/Arrow-air/project-quiver/pull/274';
export const DEVKIT_REPORT = 'https://github.com/Arrow-air/project-quiver/blob/main/docs/Engineering-Reports/Dev-Kit-Engineering-Report.md';
export const VESC_DRIVERS = 'https://github.com/vedderb/vesc_bms_fw/tree/main/drivers';

export const src = (label: string, url: string) => ({ label, url });

// Thread and comment sources, in the shape the thread store uses.
export const lsIssue = (n: number): SourceRef => ({ kind: 'issue', ref: `LS-${n}`, label: `LS #${n}`, url: `${LS}/issues/${n}` });
export const lsPr = (n: number): SourceRef => ({ kind: 'pr', ref: `LS-PR-${n}`, label: `LS PR #${n}`, url: `${LS}/pull/${n}` });
export const doc = (label: string, url: string): SourceRef => ({ kind: 'doc', ref: url, label, url });
export const proposal: SourceRef = doc('Longshot proposal', PROPOSAL);
/** A call item in Longshot's call notes (calls.ts); opens in the app. */
export const lsCall = (ref: string, date: string): SourceRef => ({ kind: 'call', ref, label: `${date} call` });
