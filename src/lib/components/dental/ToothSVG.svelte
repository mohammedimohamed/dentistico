<script lang="ts">
    import { SURFACES, STATUS_COLORS } from "$lib/dental/tooth-data";

    interface Props {
        toothNumber: string | number;
        treatments?: Array<{
            surface?: string;
            treatment_type: string;
            status: "existing" | "completed" | "planned";
            color: string;
        }>;
        onClick?: () => void;
        selected?: boolean;
    }

    let {
        toothNumber,
        treatments = [],
        onClick,
        selected = false,
    }: Props = $props();

    // Get treatment color for each surface
    function getSurfaceColor(surface: string): string {
        const treatment = treatments.find((t) => t.surface === surface);
        return treatment ? treatment.color : "#FFFFFF";
    }

    // Get whole tooth color if no surface specified
    function getWholeToothColor(): string {
        const wholeTreatment = treatments.find((t) => !t.surface);
        return wholeTreatment ? wholeTreatment.color : "#FFFFFF";
    }

    // Check if tooth has any treatments
    const hasTreatments = treatments.length > 0;
</script>

<svg
    width="60"
    height="80"
    viewBox="0 0 60 80"
    class="tooth-svg"
    class:selected
    onclick={onClick}
    role="button"
    tabindex="0"
>
    <!-- Tooth outline -->
    <rect
        x="5"
        y="10"
        width="50"
        height="60"
        rx="8"
        fill={getWholeToothColor()}
        stroke={selected ? "#3B82F6" : "#1F2937"}
        stroke-width={selected ? "3" : "1.5"}
    />

    <!-- Surface divisions (only show if there are surface-level treatments) -->
    {#if treatments.some((t) => t.surface)}
        <!-- Mesial (M) - Left side -->
        <rect
            x="5"
            y="10"
            width="10"
            height="60"
            fill={getSurfaceColor("M")}
            opacity="0.9"
        />

        <!-- Distal (D) - Right side -->
        <rect
            x="45"
            y="10"
            width="10"
            height="60"
            fill={getSurfaceColor("D")}
            opacity="0.9"
        />

        <!-- Occlusal (O) - Top middle -->
        <rect
            x="15"
            y="10"
            width="30"
            height="15"
            fill={getSurfaceColor("O")}
            opacity="0.9"
        />

        <!-- Buccal (B) - Front middle (represented as center-front) -->
        <rect
            x="15"
            y="25"
            width="15"
            height="30"
            fill={getSurfaceColor("B")}
            opacity="0.9"
        />

        <!-- Lingual (L) - Back middle (represented as center-back) -->
        <rect
            x="30"
            y="25"
            width="15"
            height="30"
            fill={getSurfaceColor("L")}
            opacity="0.9"
        />

        <!-- Surface labels (tiny) -->
        <text x="8" y="45" font-size="6" fill="#fff" opacity="0.7">M</text>
        <text x="48" y="45" font-size="6" fill="#fff" opacity="0.7">D</text>
        <text x="28" y="20" font-size="6" fill="#fff" opacity="0.7">O</text>
        <text x="20" y="42" font-size="6" fill="#fff" opacity="0.7">B</text>
        <text x="35" y="42" font-size="6" fill="#fff" opacity="0.7">L</text>
    {/if}

    <!-- Tooth number label -->
    <text
        x="30"
        y="78"
        text-anchor="middle"
        font-size="12"
        font-weight="bold"
        fill="#1F2937"
    >
        {toothNumber}
    </text>

    <!-- Treatment indicator dot -->
    {#if hasTreatments}
        <circle
            cx="52"
            cy="12"
            r="4"
            fill="#EF4444"
            stroke="#fff"
            stroke-width="1"
        />
    {/if}
</svg>

<style>
    .tooth-svg {
        cursor: pointer;
        transition: transform 0.2s;
    }

    .tooth-svg:hover {
        transform: scale(1.1);
    }

    .tooth-svg.selected {
        filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
    }
</style>
