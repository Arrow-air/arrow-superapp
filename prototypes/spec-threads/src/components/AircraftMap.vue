<script setup lang="ts">
defineProps<{ projectId: string; systems: string[] }>();
defineEmits<{ select: [system: string] }>();
</script>

<template>
  <div class="aircraft-map">
    <div class="map-caption"><span>01 / AIRCRAFT SYSTEMS</span><span>TOP VIEW</span></div>
    <svg viewBox="0 0 700 340" role="img" :aria-label="projectId === 'spearhead' ? 'Conceptual fixed-wing aircraft systems diagram' : 'Conceptual multirotor aircraft systems diagram'">
      <defs><pattern id="aircraft-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#8196b2" stroke-opacity=".13" stroke-width=".6"/></pattern></defs>
      <rect width="700" height="340" fill="url(#aircraft-grid)"/>
      <g stroke="#9cb0c7" fill="none" opacity=".35" stroke-width=".8"><path d="M350 15v310M80 170h540" stroke-dasharray="4 6"/><circle cx="350" cy="170" r="125" stroke-dasharray="2 8"/><path d="M75 32h18m-9-9v18M607 32h18m-9-9v18M75 308h18m-9-9v18M607 308h18m-9-9v18"/></g>
      <g v-if="projectId === 'spearhead'" stroke="#cad7e7" stroke-width="1.4" fill="#21354c">
        <path d="M331 134 98 191l-16 29 251-25M369 134l233 57 16 29-251-25"/><path d="m340 260-91 43-8 18 103-17m16-44 91 43 8 18-103-17"/>
        <path d="M350 37c-12 17-19 45-21 84l6 143 10 49h10l10-49 6-143c-2-39-9-67-21-84Z" fill="#2b435d"/>
        <path d="M350 45v256M333 130h34M335 202h30M340 261h20" stroke-opacity=".45"/>
        <path d="m338 91 12-13 12 13v26h-24Z" fill="#152a41"/>
        <rect x="336" y="157" width="28" height="34" rx="3" fill="#557ca2"/><path d="M272 158v105m156-105v105" stroke-width="5"/>
        <g stroke="#9faec3" fill="none"><ellipse cx="272" cy="157" rx="33" ry="6"/><ellipse cx="428" cy="157" rx="33" ry="6"/><ellipse cx="272" cy="263" rx="33" ry="6"/><ellipse cx="428" cy="263" rx="33" ry="6"/><ellipse cx="350" cy="66" rx="41" ry="5"/></g>
        <g stroke="#6eaaff" stroke-width="1" fill="none"><path d="M350 174h152l28-30h65"/><path d="M350 66h-95l-20-25h-69"/><circle cx="350" cy="174" r="6"/><circle cx="350" cy="66" r="6"/></g>
        <g fill="#aec9ec" stroke="none" font-size="10" font-family="monospace"><text x="532" y="135">AVIONICS</text><text x="112" y="35">PROPULSION</text></g>
      </g>
      <g v-else stroke="#cad7e7" stroke-width="1.5" fill="#263e57"><path d="m275 100 150 140m-150 0 150-140" stroke-width="13"/><rect x="318" y="132" width="64" height="76" rx="10"/><path d="M329 146h42v48h-42Z" fill="#557ca2"/><g fill="none"><circle cx="262" cy="90" r="57"/><circle cx="438" cy="90" r="57"/><circle cx="262" cy="250" r="57"/><circle cx="438" cy="250" r="57"/><path d="M220 90h84m92 0h84M220 250h84m92 0h84"/></g></g>
    </svg>
    <div class="map-systems"><button v-for="s in systems" :key="s" @click="$emit('select', s)">{{ s }} <span>↗</span></button></div>
    <div class="map-disclaimer">Conceptual system map · not aircraft CAD <span>Select a system to explore changes</span></div>
  </div>
</template>
