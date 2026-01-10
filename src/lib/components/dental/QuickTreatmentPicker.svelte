<script lang="ts">
    import { onMount } from "svelte";
    import { APP_CONFIG } from "$lib/config/app.config";

    interface CDTCode {
        code: string;
        category: string;
        description: string;
        default_fee: number;
        requires_surfaces: boolean;
        color_code: string;
    }

    interface Props {
        selectedCode: string;
        onSelect: (code: CDTCode) => void;
    }

    let { selectedCode = $bindable(""), onSelect }: Props = $props();

    let codes = $state<CDTCode[]>([]);
    let filteredCodes = $state<CDTCode[]>([]);
    let searchTerm = $state("");
    let selectedCategory = $state("all");
    let loading = $state(true);

    const categories = [
        { id: "all", label: "All", icon: "📋" },
        { id: "Diagnostic", label: "Exam", icon: "🔍" },
        { id: "Preventive", label: "Cleaning", icon: "🦷" },
        { id: "Restorative", label: "Fillings", icon: "🔵" },
        { id: "Crowns", label: "Crowns", icon: "👑" },
        { id: "Endodontics", label: "Root Canal", icon: "🔴" },
        { id: "Surgery", label: "Extraction", icon: "🔺" },
    ];

    onMount(async () => {
        const res = await fetch("/api/dental/cdt-codes");
        const data = await res.json();
        codes = data.codes || [];
        filteredCodes = codes;
        loading = false;
    });

    $effect(() => {
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

        filteredCodes = result;
    });
</script>

<div class="treatment-picker">
    <!-- Category Quick Filter -->
    <div class="category-tabs">
        {#each categories as cat}
            <button
                type="button"
                class="category-tab"
                class:active={selectedCategory === cat.id}
                onclick={() => (selectedCategory = cat.id)}
            >
                <span class="category-icon">{cat.icon}</span>
                <span class="category-label">{cat.label}</span>
            </button>
        {/each}
    </div>

    <!-- Search -->
    <div class="search-box">
        <input
            type="text"
            bind:value={searchTerm}
            placeholder="Search code or description..."
            class="search-input"
        />
    </div>

    <!-- Code List -->
    <div class="code-list">
        {#if loading}
            <div class="loading">Loading procedures...</div>
        {:else if filteredCodes.length === 0}
            <div class="no-results">No procedures found</div>
        {:else}
            {#each filteredCodes as code}
                <button
                    type="button"
                    class="code-item"
                    class:selected={selectedCode === code.code}
                    onclick={() => onSelect(code)}
                >
                    <div class="code-header">
                        <span
                            class="code-number"
                            style="color: {code.color_code}">{code.code}</span
                        >
                        <span class="code-fee"
                            >{APP_CONFIG.currencySymbol}{code.default_fee.toFixed(2)}</span
                        >
                    </div>
                    <div class="code-description">{code.description}</div>
                    {#if code.requires_surfaces}
                        <div class="code-badge">Requires surfaces</div>
                    {/if}
                </button>
            {/each}
        {/if}
    </div>
</div>

<style>
    .treatment-picker {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .category-tabs {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding-bottom: 0.5rem;
    }

    .category-tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 0.75rem 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 80px;
        flex-shrink: 0;
    }

    .category-tab:hover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .category-tab.active {
        background: #3b82f6;
        color: white;
        border-color: #1e40af;
    }

    .category-icon {
        font-size: 1.5rem;
    }

    .category-label {
        font-size: 0.75rem;
        font-weight: 500;
    }

    .search-box {
        position: relative;
    }

    .search-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 1rem;
    }

    .search-input:focus {
        outline: none;
        border-color: #3b82f6;
    }

    .code-list {
        max-height: 400px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .code-item {
        padding: 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .code-item:hover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .code-item.selected {
        background: #dbeafe;
        border-color: #3b82f6;
        border-width: 3px;
    }

    .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .code-number {
        font-weight: 700;
        font-size: 1.125rem;
    }

    .code-fee {
        font-weight: 600;
        color: #059669;
        font-size: 1.125rem;
    }

    .code-description {
        font-size: 0.875rem;
        color: #4b5563;
    }

    .code-badge {
        display: inline-block;
        margin-top: 0.5rem;
        padding: 0.25rem 0.5rem;
        background: #fef3c7;
        color: #92400e;
        font-size: 0.75rem;
        border-radius: 0.25rem;
        font-weight: 500;
    }

    .loading,
    .no-results {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
    }
</style>
