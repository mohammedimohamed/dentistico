<script lang="ts">
    interface Props {
        selectedSurfaces: string[];
        onToggle: (surface: string) => void;
        disabled?: boolean;
    }

    let {
        selectedSurfaces = $bindable([]),
        onToggle,
        disabled = false,
    }: Props = $props();

    const surfaces = [
        { id: "M", label: "Mesial", position: "left" },
        { id: "D", label: "Distal", position: "right" },
        { id: "O", label: "Occlusal", position: "top" },
        { id: "B", label: "Buccal", position: "front" },
        { id: "L", label: "Lingual", position: "back" },
    ];

    function isSelected(surface: string): boolean {
        return selectedSurfaces.includes(surface);
    }
</script>

<div class="surface-selector">
    <div class="surface-title">Select Surfaces (tap to toggle)</div>

    <div class="tooth-diagram">
        <!-- Interactive SVG tooth with clickable surfaces -->
        <svg viewBox="0 0 200 240" class="tooth-svg">
            <!-- Tooth outline -->
            <rect
                x="40"
                y="40"
                width="120"
                height="160"
                rx="20"
                fill="#F3F4F6"
                stroke="#1F2937"
                stroke-width="2"
            />

            <!-- Mesial (M) - Left -->
            <rect
                x="40"
                y="40"
                width="30"
                height="160"
                class="surface-area"
                class:selected={isSelected("M")}
                onclick={() => !disabled && onToggle("M")}
            />
            <text x="55" y="125" class="surface-label">M</text>

            <!-- Distal (D) - Right -->
            <rect
                x="130"
                y="40"
                width="30"
                height="160"
                class="surface-area"
                class:selected={isSelected("D")}
                onclick={() => !disabled && onToggle("D")}
            />
            <text x="145" y="125" class="surface-label">D</text>

            <!-- Occlusal (O) - Top -->
            <rect
                x="70"
                y="40"
                width="60"
                height="35"
                class="surface-area"
                class:selected={isSelected("O")}
                onclick={() => !disabled && onToggle("O")}
            />
            <text x="100" y="62" class="surface-label">O</text>

            <!-- Buccal (B) - Front middle -->
            <rect
                x="70"
                y="75"
                width="30"
                height="65"
                class="surface-area"
                class:selected={isSelected("B")}
                onclick={() => !disabled && onToggle("B")}
            />
            <text x="85" y="112" class="surface-label">B</text>

            <!-- Lingual (L) - Back middle -->
            <rect
                x="100"
                y="75"
                width="30"
                height="65"
                class="surface-area"
                class:selected={isSelected("L")}
                onclick={() => !disabled && onToggle("L")}
            />
            <text x="115" y="112" class="surface-label">L</text>

            <!-- Root (bottom third - not clickable) -->
            <path
                d="M 70 200 L 100 230 L 130 200 Z"
                fill="#E5E7EB"
                stroke="#1F2937"
                stroke-width="1"
            />
        </svg>
    </div>

    <!-- Surface chips below diagram -->
    <div class="surface-chips">
        {#each surfaces as surface}
            <button
                type="button"
                class="surface-chip"
                class:selected={isSelected(surface.id)}
                onclick={() => !disabled && onToggle(surface.id)}
                {disabled}
            >
                {surface.id} - {surface.label}
            </button>
        {/each}
    </div>
</div>

<style>
    .surface-selector {
        padding: 1rem;
        background: #f9fafb;
        border-radius: 0.5rem;
    }

    .surface-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 1rem;
        text-align: center;
    }

    .tooth-diagram {
        display: flex;
        justify-content: center;
        margin-bottom: 1rem;
    }

    .tooth-svg {
        width: 200px;
        height: 240px;
    }

    .surface-area {
        fill: rgba(59, 130, 246, 0.1);
        stroke: #3b82f6;
        stroke-width: 1.5;
        cursor: pointer;
        transition: all 0.2s;
    }

    .surface-area:hover {
        fill: rgba(59, 130, 246, 0.3);
    }

    .surface-area.selected {
        fill: #3b82f6;
        stroke: #1e40af;
        stroke-width: 2.5;
    }

    .surface-label {
        font-size: 14px;
        font-weight: bold;
        fill: #1f2937;
        pointer-events: none;
        text-anchor: middle;
    }

    .surface-area.selected + .surface-label {
        fill: white;
    }

    .surface-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
    }

    .surface-chip {
        padding: 0.5rem 1rem;
        border: 2px solid #d1d5db;
        border-radius: 0.375rem;
        background: white;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 80px;
    }

    .surface-chip:hover:not(:disabled) {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .surface-chip.selected {
        background: #3b82f6;
        color: white;
        border-color: #1e40af;
    }

    .surface-chip:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
