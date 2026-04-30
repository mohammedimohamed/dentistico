<script lang="ts">
    import { onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { Search, Plus, CheckCircle2, Clock, AlertCircle, CreditCard, ChevronDown, ChevronUp, MessageSquare, Zap, X } from "lucide-svelte";

    interface CDTCode {
        code: string;
        category: string;
        description: string;
        default_fee: number;
        requires_surfaces: any;
        color_code: string;
    }

    interface PlanItem {
        id: string;
        fdi: number | null;
        cdtCode: string;
        description: string;
        fee: number;
        color: string;
        status: "planned" | "completed" | "existing";
        note: string;
        showNote: boolean;
        showPay: boolean;
        payMethod: "cash" | "card" | "insurance" | "bank_transfer" | "check";
        isSaving: boolean;
    }

    interface Props {
        patientId: number;
        selectedFdi?: number | null;
        providerId: number;
    }

    let { patientId, selectedFdi = null, providerId }: Props = $props();

    // ── State ──────────────────────────────────────────────────────
    let codes = $state<CDTCode[]>([]);
    let loading = $state(true);
    let searchTerm = $state("");
    let showFullCatalog = $state(false);
    let plan = $state<PlanItem[]>([]);

    const TOP_FAVORITES = ["D0120", "D2391", "D7140", "D2150", "D3310", "D1110"];

    const PAYMENT_METHODS = [
        { value: "cash",          label: "Espèces" },
        { value: "card",          label: "Carte bancaire" },
        { value: "insurance",     label: "Assurance" },
        { value: "bank_transfer", label: "Virement" },
        { value: "check",         label: "Chèque" },
    ];

    // ── Derived ────────────────────────────────────────────────────
    const favorites = $derived(
        codes.filter(c => TOP_FAVORITES.includes(c.code)).sort((a, b) =>
            TOP_FAVORITES.indexOf(a.code) - TOP_FAVORITES.indexOf(b.code)
        )
    );

    const filtered = $derived.by(() => {
        if (!searchTerm.trim()) return codes;
        const t = searchTerm.toLowerCase();
        return codes.filter(c =>
            c.code.toLowerCase().includes(t) ||
            c.description.toLowerCase().includes(t)
        );
    });

    // ── Lifecycle ──────────────────────────────────────────────────
    onMount(async () => {
        const res = await fetch("/api/dental/cdt-codes");
        if (res.ok) {
            const data = await res.json();
            codes = data.codes || [];
        }
        loading = false;
    });

    // ── Actions ────────────────────────────────────────────────────
    function addToPlan(code: CDTCode) {
        if (!selectedFdi) {
            alert("Voulez-vous sélectionner une dent sur l'odontogramme avant d'ajouter cet acte ?");
            return;
        }
        plan = [...plan, {
            id: crypto.randomUUID(),
            fdi: selectedFdi,
            cdtCode: code.code,
            description: code.description,
            fee: code.default_fee,
            color: code.color_code,
            status: "planned",
            note: "",
            showNote: false,
            showPay: false,
            payMethod: "cash",
            isSaving: false,
        }];
    }

    function removeFromPlan(id: string) {
        plan = plan.filter(p => p.id !== id);
    }

    function toggleStatus(item: PlanItem) {
        item.status = item.status === "completed" ? "planned" : "completed";
        item.showPay = item.status === "completed";
        plan = [...plan];
    }

    async function savePlanItem(item: PlanItem) {
        item.isSaving = true;
        plan = [...plan];

        try {
            const treatRes = await fetch("/api/dental/treatments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_id: patientId,
                    tooth_number: item.fdi?.toString() || null,
                    cdt_code: item.cdtCode,
                    treatment_type: item.description,
                    status: item.status,
                    fee: item.fee,
                    color: item.color,
                    notes: item.note,
                    provider_id: providerId,
                    date_performed: new Date().toISOString().split("T")[0],
                    is_custom: 0,
                    paidNow: item.status === "completed" && item.showPay,
                    paymentMethod: item.payMethod,
                }),
            });

            if (!treatRes.ok) throw new Error("Treatment save failed");
            
            await invalidateAll();
            removeFromPlan(item.id);
        } catch (e) {
            console.error("Failed to save plan item", e);
        } finally {
            item.isSaving = false;
            plan = [...plan];
        }
    }

    function statusLabel(s: string) {
        if (s === "existing") return "Historique";
        if (s === "completed") return "Terminé";
        return "À Prévoir";
    }

    function statusColor(s: string) {
        if (s === "completed") return "#10b981";
        if (s === "existing") return "#94a3b8";
        return "#f59e0b";
    }
</script>

<div class="workstation">
    <!-- ═══ HEADER ═══════════════════════════════════════════════════════ -->
    <div class="ws-header">
        <div class="ws-title">
            <Zap size={16} />
            <span>Station Clinique</span>
            {#if selectedFdi}
                <span class="fdi-badge">Dent {selectedFdi}</span>
            {/if}
        </div>
        {#if plan.length > 0}
            <span class="plan-count">{plan.length} acte{plan.length > 1 ? "s" : ""} en cours</span>
        {/if}
    </div>

    <!-- ═══ DUAL COLUMN ══════════════════════════════════════════════════ -->
    <div class="ws-body">

        <!-- LEFT: Live Treatment Plan -->
        <div class="plan-column">
            <h3 class="col-title">Plan de Traitement</h3>

            {#if plan.length === 0}
                <div class="plan-empty">
                    <Plus size={24} />
                    <p>Sélectionnez un acte dans le catalogue →</p>
                </div>
            {:else}
                <div class="plan-list">
                    {#each plan as item (item.id)}
                        <div class="plan-item" style="--act-color: {item.color}">
                            <!-- Row 1: Info + Controls -->
                            <div class="plan-row">
                                <div class="act-dot" style="background:{item.color}"></div>
                                <div class="act-info">
                                    <span class="act-desc">{item.description}</span>
                                    {#if item.fdi}
                                        <span class="act-fdi">Dent {item.fdi}</span>
                                    {/if}
                                </div>
                                <span class="act-fee">{item.fee.toLocaleString()} DZD</span>

                                <!-- Intent Toggle -->
                                <button
                                    class="intent-btn"
                                    style="background:{statusColor(item.status)}20; color:{statusColor(item.status)}; border-color:{statusColor(item.status)}40"
                                    onclick={() => toggleStatus(item)}
                                >
                                    {statusLabel(item.status)}
                                </button>

                                <!-- Quick Note -->
                                <button
                                    class="icon-btn {item.showNote ? 'active' : ''}"
                                    onclick={() => { item.showNote = !item.showNote; plan = [...plan]; }}
                                    title="Note rapide"
                                >
                                    <MessageSquare size={14} />
                                </button>

                                <!-- Remove -->
                                <button class="icon-btn danger" onclick={() => removeFromPlan(item.id)}>
                                    <X size={14} />
                                </button>
                            </div>

                            <!-- Quick Note Input -->
                            {#if item.showNote}
                                <div class="plan-note">
                                    <input
                                        type="text"
                                        bind:value={item.note}
                                        placeholder="Observation clinique..."
                                        class="note-input"
                                    />
                                </div>
                            {/if}

                            <!-- Inline Payment -->
                            {#if item.status === "completed"}
                                <div class="pay-zone">
                                    <label class="pay-toggle">
                                        <input type="checkbox" bind:checked={item.showPay}
                                            onchange={() => plan = [...plan]} />
                                        <span>Encaisser maintenant</span>
                                    </label>
                                    {#if item.showPay}
                                        <div class="pay-row">
                                            <select bind:value={item.payMethod} class="pay-select">
                                                {#each PAYMENT_METHODS as m}
                                                    <option value={m.value}>{m.label}</option>
                                                {/each}
                                            </select>
                                            <button
                                                class="save-paid-btn"
                                                disabled={item.isSaving}
                                                onclick={() => savePlanItem(item)}
                                            >
                                                <CreditCard size={13} />
                                                {item.isSaving ? "..." : "Valider & Encaisser"}
                                            </button>
                                        </div>
                                    {:else}
                                        <button
                                            class="save-btn"
                                            disabled={item.isSaving}
                                            onclick={() => savePlanItem(item)}
                                        >
                                            {item.isSaving ? "Enregistrement..." : "Enregistrer"}
                                        </button>
                                    {/if}
                                </div>
                            {:else}
                                <div class="plan-actions">
                                    <button class="save-btn" disabled={item.isSaving} onclick={() => savePlanItem(item)}>
                                        {item.isSaving ? "..." : "Enregistrer"}
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- RIGHT: Catalog -->
        <div class="catalog-column">
            <h3 class="col-title">Catalogue d'Actes</h3>

            <!-- Search -->
            <div class="search-wrap">
                <Search size={14} class="search-icon-inner" />
                <input
                    type="text"
                    bind:value={searchTerm}
                    placeholder="Rechercher un acte..."
                    class="search-input"
                />
                {#if searchTerm}
                    <button class="clear-search" onclick={() => searchTerm = ""}><X size={12} /></button>
                {/if}
            </div>

            {#if loading}
                <div class="catalog-loading">Chargement...</div>
            {:else if searchTerm}
                <!-- Search Results -->
                <div class="search-results">
                    {#each filtered.slice(0, 20) as code}
                        <button class="result-row" onclick={() => addToPlan(code)}>
                            <span class="code-badge" style="background:{code.color_code}20;color:{code.color_code};border-color:{code.color_code}40">{code.code}</span>
                            <span class="result-desc">{code.description}</span>
                            <span class="result-fee">{code.default_fee.toLocaleString()} DZD</span>
                        </button>
                    {/each}
                </div>
            {:else}
                <!-- Top 6 Favorites -->
                <div class="favorites-grid">
                    {#each favorites as code}
                        <button class="fav-card" onclick={() => addToPlan(code)}>
                            <span class="fav-dot" style="background:{code.color_code}"></span>
                            <span class="fav-desc">{code.description}</span>
                            <span class="fav-fee">{code.default_fee.toLocaleString()} DZD</span>
                        </button>
                    {/each}
                </div>

                <!-- Full Catalog toggle -->
                <button class="voir-plus" onclick={() => showFullCatalog = !showFullCatalog}>
                    {#if showFullCatalog}
                        <ChevronUp size={14} /> Réduire
                    {:else}
                        <ChevronDown size={14} /> Voir tous les actes ({codes.length})
                    {/if}
                </button>

                {#if showFullCatalog}
                    <div class="full-list">
                        {#each codes as code}
                            <button class="result-row" onclick={() => addToPlan(code)}>
                                <span class="code-badge" style="background:{code.color_code}20;color:{code.color_code};border-color:{code.color_code}40">{code.code}</span>
                                <span class="result-desc">{code.description}</span>
                                <span class="result-fee">{code.default_fee.toLocaleString()} DZD</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</div>

<style>
    .workstation {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        overflow: hidden;
        font-family: inherit;
    }

    /* Header */
    .ws-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }
    .ws-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 900;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .fdi-badge {
        padding: 2px 10px;
        background: #4f46e5;
        color: white;
        border-radius: 20px;
        font-size: 11px;
    }
    .plan-count {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
    }

    /* Body */
    .ws-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-height: 360px;
    }

    /* Columns */
    .plan-column {
        padding: 16px;
        border-right: 1px solid #f1f5f9;
        overflow-y: auto;
        max-height: 480px;
    }
    .catalog-column {
        padding: 16px;
        overflow-y: auto;
        max-height: 480px;
    }
    .col-title {
        font-size: 10px;
        font-weight: 900;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin: 0 0 12px 0;
    }

    /* Empty plan */
    .plan-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 40px 16px;
        color: #cbd5e1;
        text-align: center;
    }
    .plan-empty p { font-size: 12px; font-weight: 600; margin: 0; }

    /* Plan List */
    .plan-list { display: flex; flex-direction: column; gap: 8px; }
    .plan-item {
        border: 1.5px solid #f1f5f9;
        border-radius: 14px;
        padding: 10px 12px;
        background: #fafafa;
        transition: border-color 0.2s;
    }
    .plan-item:hover { border-color: var(--act-color, #e2e8f0); }
    .plan-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }
    .act-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .act-info { flex: 1; min-width: 0; }
    .act-desc {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .act-fdi {
        font-size: 10px;
        color: #94a3b8;
        font-weight: 600;
    }
    .act-fee {
        font-size: 11px;
        font-weight: 900;
        color: #059669;
        flex-shrink: 0;
    }
    .intent-btn {
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 900;
        border: 1.5px solid;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        flex-shrink: 0;
    }
    .intent-btn:hover { filter: brightness(0.95); transform: scale(1.03); }
    .icon-btn {
        width: 26px;
        height: 26px;
        border-radius: 8px;
        border: 1.5px solid #e2e8f0;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #94a3b8;
        transition: all 0.15s;
        flex-shrink: 0;
    }
    .icon-btn:hover { border-color: #94a3b8; color: #475569; }
    .icon-btn.active { background: #eff6ff; border-color: #3b82f6; color: #3b82f6; }
    .icon-btn.danger:hover { border-color: #fca5a5; color: #ef4444; background: #fef2f2; }

    /* Note */
    .plan-note { margin-top: 8px; }
    .note-input {
        width: 100%;
        padding: 6px 10px;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 500;
        color: #334155;
        outline: none;
        box-sizing: border-box;
    }
    .note-input:focus { border-color: #6366f1; }

    /* Pay zone */
    .pay-zone {
        margin-top: 10px;
        padding: 10px;
        background: #f0fdf4;
        border: 1.5px solid #bbf7d0;
        border-radius: 12px;
    }
    .pay-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #166534;
        cursor: pointer;
        margin-bottom: 6px;
    }
    .pay-row {
        display: flex;
        gap: 6px;
        align-items: center;
        margin-top: 8px;
    }
    .pay-select {
        flex: 1;
        padding: 5px 8px;
        border: 1.5px solid #d1fae5;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        outline: none;
        background: white;
        color: #166534;
    }
    .save-paid-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        background: #10b981;
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
    }
    .save-paid-btn:hover { background: #059669; }
    .save-paid-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .plan-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
    .save-btn {
        padding: 5px 14px;
        background: #1e293b;
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 900;
        cursor: pointer;
        transition: all 0.2s;
    }
    .save-btn:hover { background: #0f172a; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Catalog */
    .search-wrap {
        position: relative;
        margin-bottom: 12px;
    }
    .search-input {
        width: 100%;
        padding: 8px 32px;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        outline: none;
        background: #f8fafc;
        box-sizing: border-box;
        color: #1e293b;
        transition: border-color 0.2s;
    }
    .search-input:focus { border-color: #6366f1; background: white; }
    :global(.search-icon-inner) {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
    }
    .clear-search {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: #e2e8f0;
        border: none;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #64748b;
    }
    .catalog-loading { font-size: 12px; color: #94a3b8; text-align: center; padding: 20px; }

    /* Favorites grid */
    .favorites-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        margin-bottom: 10px;
    }
    .fav-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        padding: 10px 10px;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        background: white;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
    }
    .fav-card:hover {
        border-color: #6366f1;
        background: #f5f3ff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(99,102,241,0.1);
    }
    .fav-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
    .fav-desc {
        font-size: 11px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.3;
    }
    .fav-fee {
        font-size: 10px;
        font-weight: 900;
        color: #059669;
    }

    /* Voir plus */
    .voir-plus {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        width: 100%;
        border: 1.5px dashed #e2e8f0;
        border-radius: 12px;
        background: transparent;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
        justify-content: center;
        margin-bottom: 8px;
    }
    .voir-plus:hover { border-color: #94a3b8; color: #475569; }

    /* Full list / Search results */
    .full-list, .search-results {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .result-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border-radius: 10px;
        cursor: pointer;
        border: none;
        background: transparent;
        text-align: left;
        transition: background 0.15s;
    }
    .result-row:hover { background: #f1f5f9; }
    .code-badge {
        flex-shrink: 0;
        padding: 2px 7px;
        border-radius: 6px;
        border: 1px solid;
        font-size: 10px;
        font-weight: 800;
    }
    .result-desc {
        flex: 1;
        font-size: 11px;
        font-weight: 600;
        color: #334155;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .result-fee {
        flex-shrink: 0;
        font-size: 10px;
        font-weight: 800;
        color: #059669;
    }
</style>
