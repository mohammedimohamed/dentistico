<script lang="ts">
    import { onMount } from "svelte";
    import { APP_CONFIG } from "$lib/config/app.config";

    interface CDTCode {
        code: string;
        category: string;
        description: string;
        default_fee: number;
        requires_surfaces: any; // Can be number or boolean from DB
        color_code: string;
    }

    interface Props {
        selectedCode: string;
        onSelect: (code: CDTCode) => void;
    }

    let { selectedCode = $bindable(""), onSelect }: Props = $props();

    let codes = $state<CDTCode[]>([]);
    let searchTerm = $state("");
    let selectedCategory = $state("all");
    let loading = $state(true);
    let error = $state<string | null>(null);
    let resultsContainer = $state<HTMLDivElement | null>(null);

    const categories = [
        { id: "all", label: "Tous" },
        { id: "Diagnostic", label: "Diagnostic" },
        { id: "Preventive", label: "Prévention" },
        { id: "Restorative", label: "Conservateur" },
        { id: "Endodontics", label: "Endodontie" },
        { id: "Surgery", label: "Chirurgie" },
        { id: "Crowns", label: "Prothèse Fixe" },
        { id: "Prosthetics", label: "Prothèse Amov." },
        { id: "Implants", label: "Implantologie" },
        { id: "Esthetic", label: "Esthétique" },
        { id: "Orthodontics", label: "ODF" },
        { id: "General", label: "Autre" },
    ];

    let filteredCodes = $derived.by(() => {
        let result = codes;

        // Filter by category
        if (selectedCategory !== "all") {
            result = result.filter((c) => c.category === selectedCategory);
        }

        // Filter by search
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (c) =>
                    c.code.toLowerCase().includes(term) ||
                    c.description.toLowerCase().includes(term),
            );
        }

        return result;
    });

    onMount(async () => {
        try {
            console.log("QuickTreatmentPicker: Fetching acts...");
            const res = await fetch("/api/dental/cdt-codes");
            if (!res.ok) {
                const text = await res.text();
                error = `Erreur API (${res.status})`;
                console.error("API error:", text);
                return;
            }
            const data = await res.json();
            if (data.error) {
                error = data.error;
            } else {
                codes = data.codes || [];
            }
        } catch (e: any) {
            console.error("Fetch error:", e);
            error = "Impossible de se connecter au serveur";
        } finally {
            loading = false;
        }
    });

    function selectCategory(catId: string) {
        selectedCategory = catId;
        if (resultsContainer) {
            resultsContainer.scrollTop = 0;
        }
    }
</script>

<div class="treatment-picker">
    <!-- Search Input -->
    <div class="search-zone">
        <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
                type="text"
                bind:value={searchTerm}
                placeholder="Rechercher par code ou nom..."
                class="search-input"
                autofocus
            />
            {#if searchTerm}
                <button class="clear-btn" onclick={() => (searchTerm = "")}
                    >✕</button
                >
            {/if}
        </div>
    </div>

    <!-- Category Chips -->
    <div class="category-chips-wrapper">
        <div class="category-chips">
            {#each categories as cat}
                <button
                    type="button"
                    class="chip"
                    class:active={selectedCategory === cat.id}
                    onclick={() => selectCategory(cat.id)}
                >
                    {cat.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- Results Area -->
    <div class="results-area" bind:this={resultsContainer}>
        {#if loading}
            <div class="empty-state">
                <span class="spinner">⏳</span>
                <p>Chargement des actes...</p>
            </div>
        {:else if error}
            <div class="empty-state error">
                <span class="icon">⚠️</span>
                <p>{error}</p>
                <button
                    class="retry-btn"
                    onclick={() => window.location.reload()}>Réessayer</button
                >
            </div>
        {:else if filteredCodes.length === 0}
            <div class="empty-state">
                <span class="icon">🔎</span>
                <p>Aucun acte trouvé</p>
            </div>
        {:else}
            <div class="code-grid">
                {#each filteredCodes as code}
                    <button
                        type="button"
                        class="code-card"
                        class:selected={selectedCode === code.code}
                        onclick={() => onSelect(code)}
                    >
                        <div class="card-header">
                            <span
                                class="code-tag"
                                style="background: {code.color_code}20; color: {code.color_code}; border-color: {code.color_code}40;"
                            >
                                {code.code}
                            </span>
                            <span class="fee">
                                {APP_CONFIG.currencySymbol}{code.default_fee.toLocaleString()}
                            </span>
                        </div>
                        <p class="description">{code.description}</p>
                        {#if code.requires_surfaces}
                            <span class="badge">Surfaces requises</span>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .treatment-picker {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 0;
        min-height: 400px; /* Ensure visible height */
    }

    .search-zone {
        padding: 0 0 1rem 0;
        flex-shrink: 0;
    }

    .search-box {
        position: relative;
        display: flex;
        align-items: center;
    }

    .search-icon {
        position: absolute;
        left: 1rem;
        font-size: 1rem;
        opacity: 0.5;
    }

    .search-input {
        width: 100%;
        padding: 0.875rem 2.5rem 0.875rem 2.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    .search-input:focus {
        outline: none;
        border-color: #3b82f6;
        background: white;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }

    .clear-btn {
        position: absolute;
        right: 0.75rem;
        background: #e5e7eb;
        border: none;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        font-size: 0.75rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .category-chips-wrapper {
        flex-shrink: 0;
        padding-bottom: 1rem;
        border-bottom: 1px solid #f3f4f6;
        margin-bottom: 1rem;
    }

    .category-chips {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        white-space: nowrap;
        padding-bottom: 0.25rem;
        scrollbar-width: none;
    }

    .category-chips::-webkit-scrollbar {
        display: none;
    }

    .chip {
        flex-shrink: 0;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(229, 231, 235, 0.8);
        color: #4b5563;
        backdrop-filter: blur(8px);
    }

    .chip.active {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .results-area {
        flex: 1;
        overflow-y: auto;
        min-height: 300px;
        padding-bottom: 1rem;
    }

    .code-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.75rem;
    }

    .code-card {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        min-height: 100px;
    }

    .code-card:hover {
        border-color: #93c5fd;
        background: #f0f9ff;
        transform: translateY(-2px);
    }

    .code-card.selected {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border-color: #3b82f6;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .code-tag {
        font-weight: 700;
        font-size: 0.8rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        border: 1px solid;
    }

    .fee {
        font-weight: 700;
        color: #059669;
        font-size: 0.95rem;
    }

    .description {
        font-size: 0.85rem;
        color: #374151;
        line-height: 1.4;
        margin: 0;
    }

    .badge {
        display: inline-block;
        margin-top: 0.5rem;
        padding: 0.2rem 0.5rem;
        background: #fef3c7;
        color: #92400e;
        font-size: 0.7rem;
        border-radius: 0.25rem;
        font-weight: 600;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: #9ca3af;
        gap: 0.5rem;
    }

    .empty-state.error {
        color: #dc2626;
    }

    .retry-btn {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #ef4444;
        color: white;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
    }

    .spinner {
        font-size: 2rem;
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
