<script lang="ts">
    import { getAnatomy } from "$lib/utils/toothLogicV2";
    import { dentalColors } from "$lib/stores/dentalSettings.svelte";
    import { createEventDispatcher } from "svelte";

    interface Props {
        fdi: number;
        zones?: Record<string, string>; // e.g. { 'O': 'CARIE', 'M': 'SAIN' }
        status?: string;
        selected?: boolean;
        bridgeConnections?: { left?: boolean, right?: boolean };
    }

    let { fdi, zones = {}, status = '', selected = false, bridgeConnections = {} }: Props = $props();

    const dispatch = createEventDispatcher();
    const anatomy = $derived(getAnatomy(fdi));
    const isUpper = $derived((fdi >= 11 && fdi <= 28) || (fdi >= 51 && fdi <= 65));

    function handleZoneClick(zoneName: string, event: MouseEvent) {
        dispatch("zoneClick", { fdi, zoneName, originalEvent: event });
    }

    function getFill(zoneName: string) {
        if (status === 'Absent' || status === 'Absente') return dentalColors.ABSENT;
        const statusVal = zones[zoneName];
        if (!statusVal) return dentalColors.SAIN;
        return (dentalColors as any)[statusVal] || statusVal;
    }

    // --- Crown Paths (Standard anatomical rounded template) ---
    // These paths create a 5-zone rounded crown within Y: 5-45
    const pathsCrown = {
        O: "M 18,15 Q 25,12 32,15 Q 35,25 32,35 Q 25,38 18,35 Q 15,25 18,15 Z",
        B: "M 10,8 Q 25,2 40,8 L 32,15 Q 25,12 18,15 Z",
        L: "M 10,42 Q 25,48 40,42 L 32,35 Q 25,38 18,35 Z",
        M: "M 10,8 Q 5,25 10,42 L 18,35 Q 15,25 18,15 Z",
        D: "M 40,8 Q 45,25 40,42 L 32,35 Q 35,25 32,15 Z"
    };

    // --- Root Paths (Dynamic based on root count) ---
    // Roots occupy Y: 45-95
</script>

<div class="tooth-wrapper" class:selected>
    <svg viewBox="0 -15 50 130" class="tooth-svg">
        <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        <g class="tooth-group" filter={selected ? "url(#glow)" : ""} transform={isUpper ? "rotate(180, 25, 50)" : ""}>
            <!-- FDI Number Label (Counter-rotated for upper teeth) -->
            <text 
                x="25" 
                y="105" 
                text-anchor="middle" 
                class="fdi-text"
                transform={isUpper ? "rotate(180, 25, 105)" : ""}
                dy="10"
            >
                {fdi}
            </text>

            <!-- Bridge Connectors (drawn behind tooth content) -->
            {#if (isUpper ? bridgeConnections.right : bridgeConnections.left)}
                <rect x="-8" y="20" width="10" height="12" rx="2" fill="#94a3b8" opacity="0.8" pointer-events="none" />
            {/if}
            {#if (isUpper ? bridgeConnections.left : bridgeConnections.right)}
                <rect x="48" y="20" width="10" height="12" rx="2" fill="#94a3b8" opacity="0.8" pointer-events="none" />
            {/if}

            <!-- Crown Group (Y: 5 to 45) -->
            <g class="crown-group" opacity={ (status === 'Absent' || status === 'Absente') ? '0.2' : '1'}>
                {#each Object.entries(pathsCrown) as [name, path]}
                    <path
                        d={path}
                        fill={getFill(name)}
                        stroke="#94a3b8"
                        stroke-width="0.5"
                        class="zone-path crown-zone"
                        onclick={(e) => handleZoneClick(name, e)}
                    >
                        <title>{fdi} - Face {name}</title>
                    </path>
                {/each}
            </g>

            <!-- Anatomical Roots -->
            <g class="roots-group" opacity={ (status === 'Absent' || status === 'Absente' || status === 'Implant') ? '0' : '1'}>
                {#if anatomy.roots === 1}
                    <!-- Single Root -->
                    <path
                        d="M 10,42 Q 15,70 23,95 Q 25,98 27,95 Q 35,70 40,42 Z"
                        fill={getFill('R1')}
                        stroke="#94a3b8"
                        stroke-width="0.5"
                        class="zone-path root-zone"
                        onclick={(e) => handleZoneClick('R1', e)}
                    >
                        <title>{fdi} - Canal R1</title>
                    </path>
                {:else if anatomy.roots === 2}
                    <!-- Two Roots (Bifurcation) -->
                    <path
                        d="M 10,42 Q 12,70 18,90 Q 20,93 22,90 Q 24,70 25,42 Z"
                        fill={getFill('R1')}
                        stroke="#94a3b8"
                        stroke-width="0.5"
                        class="zone-path root-zone"
                        onclick={(e) => handleZoneClick('R1', e)}
                    >
                        <title>{fdi} - Canal R1</title>
                    </path>
                    <path
                        d="M 25,42 Q 26,70 30,90 Q 32,93 34,90 Q 38,70 40,42 Z"
                        fill={getFill('R2')}
                        stroke="#94a3b8"
                        stroke-width="0.5"
                        class="zone-path root-zone"
                        onclick={(e) => handleZoneClick('R2', e)}
                    >
                        <title>{fdi} - Canal R2</title>
                    </path>
                {:else if anatomy.roots === 3}
                    <!-- Three Roots (Trifurcation - 2 side, 1 center/longer) -->
                    <!-- Palatal (Longer/Center) -->
                    <path
                        d="M 18,42 Q 25,65 25,96 Q 25,99 28,96 Q 32,65 32,42 Z"
                        fill={getFill('R3')}
                        stroke="#94a3b8"
                        stroke-width="0.5"
                        class="zone-path root-zone"
                        onclick={(e) => handleZoneClick('R3', e)}
                    >
                        <title>{fdi} - Canal Palatin (R3)</title>
                    </path>
                    <!-- Mesio-buccal -->
                    <path
                        d="M 10,42 Q 11,65 16,85 Q 18,88 20,85 Q 22,65 23,42 Z"
                        fill={getFill('R1')}
                        stroke="#94a3b8"
                        stroke-width="0.5"
                        class="zone-path root-zone"
                        onclick={(e) => handleZoneClick('R1', e)}
                    >
                        <title>{fdi} - Canal Mésio-buccal (R1)</title>
                    </path>
                    <!-- Disto-buccal -->
                    <path
                        d="M 27,42 Q 28,65 32,85 Q 34,88 36,85 Q 39,65 40,42 Z"
                        fill={getFill('R2')}
                        stroke="#94a3b8"
                        stroke-width="0.5"
                        class="zone-path root-zone"
                        onclick={(e) => handleZoneClick('R2', e)}
                    >
                        <title>{fdi} - Canal Disto-buccal (R2)</title>
                    </path>
                {/if}
            </g>

            {#if status === 'Implant'}
                <!-- Titanium Implant Screw -->
                <g class="implant-group">
                    <rect x="22" y="45" width="6" height="30" rx="1" fill="#94a3b8" />
                    <path d="M 20,50 L 30,50 M 20,55 L 30,55 M 20,60 L 30,60 M 20,65 L 30,65 M 20,70 L 30,70" stroke="#475569" stroke-width="1" />
                    <path d="M 22,75 L 25,82 L 28,75 Z" fill="#94a3b8" />
                </g>
            {/if}

            {#if status === 'Absent' || status === 'Absente'}
                <!-- Absent/Extracted Overlay -->
                <line x1="10" y1="20" x2="40" y2="80" stroke="#ef4444" stroke-width="3" stroke-linecap="round" opacity="0.8" pointer-events="none" />
                <line x1="40" y1="20" x2="10" y2="80" stroke="#ef4444" stroke-width="3" stroke-linecap="round" opacity="0.8" pointer-events="none" />
            {/if}
        </g>
    </svg>
</div>

<style>
    .tooth-wrapper {
        width: 60px;
        height: 120px;
        display: inline-block;
        transition: transform 0.2s ease;
        padding: 5px;
    }

    .tooth-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
    }

    .zone-path {
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .zone-path:hover {
        stroke-width: 1.5;
        stroke: #4f46e5; /* Indigo 600 */
        filter: brightness(1.1);
    }

    .selected .tooth-group {
        stroke: #3b82f6 !important;
        stroke-width: 1px !important;
    }

    .selected {
        transform: scale(1.05);
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
        z-index: 10;
    }

    /* Anatomical labels or tooltips can be added here */
    .fdi-text {
        font-size: 10px;
        font-weight: 900;
        fill: #cbd5e1; /* slate-300 */
        pointer-events: none;
        user-select: none;
        transition: fill 0.2s ease;
    }

    .selected .fdi-text {
        fill: #3b82f6;
    }
</style>
