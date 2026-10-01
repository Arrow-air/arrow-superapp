// The attachment catalog, from the payload-systems repository: the payloads
// with their own folder (built or prototyped), the spreader adapter issue in
// project-quiver, and the concepts whose requirements are written. Each entry
// links to where its facts come from.

export type AttachmentStatus = 'flown' | 'prototype' | 'reference' | 'defined';

export interface Attachment {
  id: string;
  name: string;
  status: AttachmentStatus;
  /** One line: what it does. */
  what: string;
  port?: string;
  power?: string;
  data?: string;
  champion?: string[];
  zone?: string;
  links: { label: string; url: string }[];
}

const PS = 'https://github.com/Arrow-air/payload-systems';
const REQ = 'https://github.com/Arrow-air/project-quiver/tree/main/task-grant-bounty/equipment/attachment/0002-detailed_attachment_requirement_for_bounty';

export const statusLabel: Record<AttachmentStatus, string> = {
  flown: 'Flown, V1',
  prototype: 'Prototype',
  reference: 'Reference design',
  defined: 'Requirements written',
};

export const attachments: Attachment[] = [
  {
    id: 'payload-latch', name: 'Payload latch', status: 'flown', zone: 'payload-latch', champion: ['erick', 'alperen'],
    what: 'Servo-actuated cargo hook for slung loads. Flown with a 370 g load and a 1 kg drop at the August meetup.',
    port: 'Bottom', power: '12V_PL via buck at 6 V', data: 'PWM (FMU_CH1)',
    links: [
      { label: 'V1 note', url: `${PS}/tree/main/payloads/Payload-latch` },
      { label: 'Bounty 155', url: 'https://dao.arrowair.com/t/bounty-v1-quiver-actuated-payload-latch/155' },
    ],
  },
  {
    id: 'multispectral', name: 'Multispectral camera', status: 'flown', zone: 'multispectral', champion: ['erick', 'alperen'],
    what: 'Nadir mount for the MAPIR Survey3 RGN, triggered by the flight controller on each pulse.',
    port: 'Bottom as flown, side 1 in design', power: '12V_PL via buck at 5.3 V, ~2 W', data: 'PWM (FMU_CH1 as flown)',
    links: [
      { label: 'V1 note', url: `${PS}/tree/main/payloads/Multispectral-Camera` },
      { label: 'Bounty 156', url: 'https://dao.arrowair.com/t/bounty-v1-quiver-multispectral-camera-payload/156' },
    ],
  },
  {
    id: 'ram-ball', name: 'RAM ball mount (Size C)', status: 'prototype', zone: 'ram-ball',
    what: 'Puts a 1.5" RAM ball on any port, with wiring routed through. First article printed in PA6-CF.',
    port: 'Any', power: 'None (mechanical)', data: 'Pass-through',
    links: [{ label: 'Design', url: `${PS}/tree/main/payloads/ram-ball-c` }],
  },
  {
    id: 'spreader', name: 'Granular spreader adapter', status: 'reference', zone: 'spreader',
    what: 'DroneCAN adapter board for the JMRRC FS2516 granular spreader.',
    data: 'DroneCAN',
    links: [{ label: '#233', url: 'https://github.com/Arrow-air/project-quiver/issues/233' }],
  },
  { id: 'cargo', name: 'Universal cargo container', status: 'defined', zone: 'concepts', what: 'Fixed or deployable cargo pod; stackable and carried by hand.', links: [{ label: 'Requirements', url: REQ }] },
  { id: 'lidar', name: 'General aerial LiDAR', status: 'defined', zone: 'concepts', what: 'Nadir or forward scanner: 32 channels or more, 20 Hz, 1 cm at 100 m.', links: [{ label: 'Requirements', url: REQ }] },
  { id: 'vision', name: 'Ground target machine vision', status: 'defined', zone: 'concepts', what: 'On-board inference to find and count targets, with KML output.', links: [{ label: 'Requirements', url: REQ }] },
  { id: 'zoom', name: 'Standard magnification camera', status: 'defined', zone: 'concepts', what: '3-axis gimbal, 1/2" sensor or larger, 24 mm and 85 mm+ focal lengths.', links: [{ label: 'Requirements', url: REQ }] },
  { id: 'carrier', name: 'General stabilized sensor carrier', status: 'defined', zone: 'concepts', what: '3-axis gimbal with a 1/4-20 mount for 5 to 8 kg.', links: [{ label: 'Requirements', url: REQ }] },
  { id: 'flood', name: 'High-capacity flood light', status: 'defined', zone: 'concepts', what: 'Train-light brightness, 45 to 60° beam, flash and breathe modes.', links: [{ label: 'Requirements', url: REQ }] },
];

export const attachmentById = (id: string | undefined) => attachments.find((a) => a.id === id);
