// The Dev Kit assembly as a 3D model: public/quiver.glb, exported from the
// build123d CAD on project-quiver main (unchanged since 2026-06-12) and
// compressed. Every mesh sits under a node named for its BOM number, so a
// click on the model resolves to a part. Fasteners are not in the export.
//
// Each part belongs to the v1.1 zone a change to it would be discussed in.
export function zoneForPart(id: string): string {
  if (/^31/.test(id)) return 'propulsion'; // motors, ESCs, propellers
  if (/^1/.test(id)) return 'airframe'; // plates, battery walls, cockpit beams, landing gear, arms
  if (['2111', '2112', '2131', '3331'].includes(id)) return 'interface'; // attachment plates, spacers, PCB
  if (/^4/.test(id)) return 'harness'; // busbars and harnesses
  if (['2211', '3260', '3320', '3410'].includes(id)) return 'power'; // battery, slider, switch, connector PCB
  if (['2331', '2332', '3230', '3240', '3250', '3280'].includes(id)) return 'gps-rf'; // GNSS and its mount, telemetry and antennas
  if (/^24/.test(id)) return 'airframe'; // enclosure, top cap, hinge, latch
  return 'avionics'; // PCBs and mounts, PPP adapter, Remote ID, lidar, radars, camera
}
