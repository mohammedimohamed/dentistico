<script lang="ts">
    import { STATUS_COLORS } from "$lib/dental/tooth-data";

    interface Props {
        toothNumber: string | number;
        treatments?: Array<{
            surfaces?: string;
            surface?: string;
            treatment_type: string;
            status: "existing" | "completed" | "planned";
            color: string;
        }>;
        onClick?: () => void;
        selected?: boolean;
        position?: "upper" | "lower";
        scale?: number;
    }

    let {
        toothNumber,
        treatments = [],
        onClick,
        selected = false,
        position = "upper",
        scale = 1,
    }: Props = $props();

    const tNum = parseInt(toothNumber.toString());

    // Determine tooth type
    function getToothType(
        num: number,
    ): "incisor" | "canine" | "premolar" | "molar" {
        const lastDigit = num % 10;
        if (lastDigit === 1 || lastDigit === 2) return "incisor";
        if (lastDigit === 3) return "canine";
        if (lastDigit === 4 || lastDigit === 5) {
            // Pediatric 4 and 5 are molars
            if (num >= 50 && num <= 85) return "molar";
            return "premolar";
        }
        return "molar";
    }

    const type = getToothType(tNum);

    // Anatomical Paths (Simplified)
    const paths = {
        incisor: "M10,10 L50,10 L45,40 Q40,70 30,75 Q20,70 15,40 Z",
        canine: "M15,10 L45,10 L42,35 Q40,55 30,75 Q20,55 18,35 Z",
        premolar:
            "M12,10 Q10,10 8,15 L8,35 Q10,60 30,75 Q50,60 52,35 L52,15 Q50,10 48,10 Z",
        molar: "M5,10 L55,10 L55,30 Q55,50 45,70 L30,75 L15,70 Q5,50 5,30 Z",
    };

    // Tooth State Logic
    const mostRecentTreatment = $derived([...treatments].reverse()[0]);
    const status = $derived(mostRecentTreatment?.status);

    const fillColor = $derived.by(() => {
        if (status === "completed") return "#10B981"; // Green
        if (status === "existing") return "#9CA3AF"; // Gray
        if (status === "planned") return "#3B82F6"; // Blue
        return "#FFFFFF"; // Empty
    });

    const strokeColor = $derived.by(() => {
        if (selected) return "#6366F1";
        if (status === "planned") return "#EF4444"; // Red border for planned
        return "#D1D5DB";
    });

    const strokeWidth = $derived(
        selected ? "3" : status === "planned" ? "2.5" : "1.5",
    );
</script>

<div
    class="tooth-container {position}"
    onclick={onClick}
    role="button"
    tabindex="0"
    aria-label="Tooth {toothNumber}"
    onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
        }
    }}
    style="--tooth-scale: {scale};"
>
    {#if position === "upper"}
        <span class="tooth-label above" style="font-size: {0.65 * scale}rem"
            >{toothNumber}</span
        >
    {/if}

    <svg
        width={45 * scale}
        height={65 * scale}
        viewBox="0 0 60 80"
        class="tooth-svg"
        class:selected
        class:lower={position === "lower"}
    >
        <path
            d={paths[type]}
            fill={fillColor}
            stroke={strokeColor}
            stroke-width={strokeWidth}
            class="anatomical-path"
        />

        <!-- Surface overlays (Small) -->
        {#if treatments.some((t) => t.surfaces || t.surface)}
            <circle
                cx="30"
                cy="30"
                r="12"
                fill="white"
                opacity="0.3"
                stroke="#000"
                stroke-width="0.5"
            />
        {/if}
    </svg>

    {#if position === "lower"}
        <span class="tooth-label below" style="font-size: {0.65 * scale}rem"
            >{toothNumber}</span
        >
    {/if}
</div>

<style>
    .tooth-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: transform 0.2s;
        padding: 4px;
        border-radius: 8px;
    }

    .tooth-container:hover {
        background: #f8fafc;
        transform: scale(1.05);
    }

    .upper:hover {
        transform: translateY(-4px) scale(1.05);
    }

    .lower:hover {
        transform: translateY(4px) scale(1.05);
    }

    .tooth-svg {
        transition: all 0.2s;
    }

    .tooth-svg.lower {
        transform: rotate(180deg);
    }

    .tooth-label {
        font-size: 0.65rem;
        font-weight: 800;
        color: #64748b;
        margin: 2px 0;
    }

    .anatomical-path {
        transition:
            fill 0.3s,
            stroke 0.3s;
    }

    .selected .anatomical-path {
        filter: drop-shadow(0 0 4px rgba(99, 102, 241, 0.4));
    }
</style>
