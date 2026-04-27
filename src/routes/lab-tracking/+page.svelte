<script lang="ts">
    import { onMount } from "svelte";

    let { data }: { data: any } = $props();

    // ─── State ────────────────────────────────────────────────────────────────
    let items = $state<any[]>([]);
    let loading = $state(true);
    let showModal = $state(false);
    let editingItem = $state<any | null>(null);
    let filterStatus = $state("all");
    let searchQuery = $state("");

    const STATUSES = [
        { value: "pending",    label: "En attente",  color: "amber" },
        { value: "in_progress", label: "En cours",   color: "blue"  },
        { value: "ready",      label: "Prêt",        color: "green" },
        { value: "delivered",  label: "Livré",       color: "indigo"},
        { value: "cancelled",  label: "Annulé",      color: "red"   },
    ];

    const STATUS_STYLES: Record<string, string> = {
        pending:     "bg-amber-100 text-amber-700 border border-amber-200",
        in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
        ready:       "bg-green-100 text-green-700 border border-green-200",
        delivered:   "bg-indigo-100 text-indigo-700 border border-indigo-200",
        cancelled:   "bg-red-100 text-red-700 border border-red-200",
    };

    const STATUS_DOTS: Record<string, string> = {
        pending:     "bg-amber-400",
        in_progress: "bg-blue-500 animate-pulse",
        ready:       "bg-green-500",
        delivered:   "bg-indigo-500",
        cancelled:   "bg-red-400",
    };

    // ─── Form ─────────────────────────────────────────────────────────────────
    let form = $state({
        patient_id: "",
        patient_name: "",
        description: "",
        status: "pending",
        notes: "",
        treatment_id: "",
    });

    // patient search
    let patientQuery = $state("");
    let patientResults = $state<any[]>([]);
    let patientTimer: any;

    async function searchPatients(q: string) {
        if (q.length < 2) { patientResults = []; return; }
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
            const d = await res.json();
            patientResults = d || [];
        }
    }

    function selectPatient(p: any) {
        form.patient_id = p.id;
        form.patient_name = p.full_name;
        patientQuery = p.full_name;
        patientResults = [];
    }

    // ─── Data loading ─────────────────────────────────────────────────────────
    async function loadItems() {
        loading = true;
        const res = await fetch("/api/lab-tracking");
        if (res.ok) {
            const d = await res.json();
            items = d.items || [];
        }
        loading = false;
    }

    // ─── Derived ──────────────────────────────────────────────────────────────
    const filtered = $derived(
        items.filter((i) => {
            const matchStatus = filterStatus === "all" || i.status === filterStatus;
            const matchSearch =
                !searchQuery ||
                i.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.description?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchStatus && matchSearch;
        })
    );

    const stats = $derived({
        total: items.length,
        pending:     items.filter(i => i.status === "pending").length,
        in_progress: items.filter(i => i.status === "in_progress").length,
        ready:       items.filter(i => i.status === "ready").length,
        delivered:   items.filter(i => i.status === "delivered").length,
    });

    // ─── CRUD ─────────────────────────────────────────────────────────────────
    function openNew() {
        editingItem = null;
        form = { patient_id: "", patient_name: "", description: "", status: "pending", notes: "", treatment_id: "" };
        patientQuery = "";
        patientResults = [];
        showModal = true;
    }

    function openEdit(item: any) {
        editingItem = item;
        form = {
            patient_id: item.patient_id,
            patient_name: item.patient_name,
            description: item.description,
            status: item.status,
            notes: item.notes || "",
            treatment_id: item.treatment_id || "",
        };
        patientQuery = item.patient_name;
        patientResults = [];
        showModal = true;
    }

    async function saveItem() {
        if (!form.patient_id || !form.description) {
            alert("Veuillez renseigner le patient et la description.");
            return;
        }

        if (editingItem) {
            await fetch(`/api/lab-tracking/${editingItem.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: form.status, notes: form.notes }),
            });
        } else {
            await fetch("/api/lab-tracking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patient_id: Number(form.patient_id),
                    description: form.description,
                    status: form.status,
                    notes: form.notes,
                    treatment_id: form.treatment_id ? Number(form.treatment_id) : null,
                }),
            });
        }

        showModal = false;
        await loadItems();
    }

    async function quickUpdateStatus(item: any, newStatus: string) {
        await fetch(`/api/lab-tracking/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus, notes: item.notes }),
        });
        await loadItems();
    }

    async function deleteItem(item: any) {
        if (!confirm(`Supprimer le suivi labo pour ${item.patient_name} ?`)) return;
        await fetch(`/api/lab-tracking/${item.id}`, { method: "DELETE" });
        await loadItems();
    }

    function formatDate(d: string) {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    function getStatusLabel(v: string) {
        return STATUSES.find(s => s.value === v)?.label || v;
    }

    onMount(() => { loadItems(); });
</script>

<svelte:head>
    <title>Lab Tracking — Dentistico</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 md:p-8 space-y-8">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
            <div class="flex items-center gap-3 mb-1">
                <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-200">
                    🧪
                </div>
                <h1 class="text-2xl font-black text-gray-900 tracking-tight">Lab Tracking</h1>
            </div>
            <p class="text-sm text-gray-500 font-medium ml-[52px]">Suivi des travaux de laboratoire</p>
        </div>
        <button
            onclick={openNew}
            class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
            <span class="text-lg">+</span> Nouveau suivi
        </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {#each [
            { label: "Total", value: stats.total, color: "indigo", icon: "📋" },
            { label: "En attente", value: stats.pending, color: "amber", icon: "⏳" },
            { label: "En cours", value: stats.in_progress, color: "blue", icon: "🔬" },
            { label: "Prêts", value: stats.ready, color: "green", icon: "✅" },
        ] as stat}
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div class="text-2xl">{stat.icon}</div>
                <div>
                    <p class="text-2xl font-black text-gray-900">{stat.value}</p>
                    <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
                </div>
            </div>
        {/each}
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
        <!-- Search -->
        <div class="relative flex-grow">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Rechercher patient ou description..."
                class="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-gray-900 font-medium"
            />
        </div>

        <!-- Status filter tabs -->
        <div class="flex gap-2 flex-wrap">
            {#each [{ value: "all", label: "Tous" }, ...STATUSES] as s}
                <button
                    onclick={() => filterStatus = s.value}
                    class="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all {filterStatus === s.value
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200 hover:text-indigo-600'}"
                >
                    {s.label}
                </button>
            {/each}
        </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        {#if loading}
            <div class="flex items-center justify-center py-24 gap-4">
                <div class="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                <p class="text-gray-400 font-bold">Chargement...</p>
            </div>
        {:else if filtered.length === 0}
            <div class="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div class="text-5xl opacity-40">🧪</div>
                <div>
                    <p class="text-gray-500 font-bold text-lg">Aucun suivi labo</p>
                    <p class="text-gray-400 text-sm">Créez un nouveau suivi pour commencer</p>
                </div>
            </div>
        {:else}
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-50/70 border-b border-gray-100">
                        <th class="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Patient</th>
                        <th class="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Description</th>
                        <th class="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Statut</th>
                        <th class="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest hidden lg:table-cell">Mis à jour</th>
                        <th class="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Notes</th>
                        <th class="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    {#each filtered as item (item.id)}
                        <tr class="hover:bg-gray-50/50 transition-colors group">
                            <td class="px-6 py-4">
                                <div class="font-bold text-gray-900 text-sm">{item.patient_name || "—"}</div>
                                {#if item.doctor_name}
                                    <div class="text-xs text-gray-400 mt-0.5">Dr. {item.doctor_name}</div>
                                {/if}
                            </td>
                            <td class="px-6 py-4 hidden md:table-cell">
                                <p class="text-sm text-gray-700 max-w-xs truncate">{item.description}</p>
                            </td>
                            <td class="px-6 py-4">
                                <div class="relative group/status">
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold {STATUS_STYLES[item.status] || ''}">
                                        <span class="w-1.5 h-1.5 rounded-full {STATUS_DOTS[item.status] || 'bg-gray-400'}"></span>
                                        {getStatusLabel(item.status)}
                                    </span>
                                    <!-- Quick status change dropdown -->
                                    <div class="absolute left-0 top-full mt-1 z-10 hidden group-hover/status:block bg-white border border-gray-100 rounded-2xl shadow-xl p-1 min-w-[150px]">
                                        {#each STATUSES as s}
                                            <button
                                                class="w-full text-left px-3 py-2 text-xs font-bold rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2"
                                                onclick={() => quickUpdateStatus(item, s.value)}
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full {STATUS_DOTS[s.value] || 'bg-gray-400'}"></span>
                                                {s.label}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 hidden lg:table-cell">
                                <span class="text-xs text-gray-400 font-mono">{formatDate(item.updated_at)}</span>
                            </td>
                            <td class="px-6 py-4 hidden md:table-cell">
                                <p class="text-xs text-gray-500 max-w-[180px] truncate italic">{item.notes || "—"}</p>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onclick={() => openEdit(item)}
                                        class="p-2 rounded-xl hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                                        title="Modifier"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onclick={() => deleteItem(item)}
                                        class="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Supprimer"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>

<!-- Modal -->
{#if showModal}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onclick={() => showModal = false}
        role="presentation"
    ></div>

    <!-- Dialog -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">
            <!-- Modal header -->
            <div class="px-8 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">🧪</span>
                    <h2 class="text-xl font-black text-white">
                        {editingItem ? "Modifier le suivi" : "Nouveau suivi labo"}
                    </h2>
                </div>
                <button
                    onclick={() => showModal = false}
                    class="text-white/70 hover:text-white text-2xl leading-none"
                >×</button>
            </div>

            <div class="p-8 space-y-5">
                <!-- Patient Search (only for new entries) -->
                {#if !editingItem}
                    <div class="relative">
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Patient <span class="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            bind:value={patientQuery}
                            oninput={() => {
                                clearTimeout(patientTimer);
                                patientTimer = setTimeout(() => searchPatients(patientQuery), 300);
                            }}
                            placeholder="Rechercher un patient..."
                            class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium text-gray-900"
                        />
                        {#if patientResults.length > 0}
                            <div class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-10 overflow-hidden">
                                {#each patientResults as p}
                                    <button
                                        class="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors text-sm font-medium text-gray-800 border-b border-gray-50 last:border-0"
                                        onclick={() => selectPatient(p)}
                                    >
                                        {p.full_name}
                                        {#if p.phone}<span class="text-gray-400 text-xs ml-2">{p.phone}</span>{/if}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>

                    <!-- Description -->
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            Description du travail <span class="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            bind:value={form.description}
                            placeholder="Ex: Couronne céramo-métallique dent 16..."
                            class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium text-gray-900"
                        />
                    </div>
                {:else}
                    <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p class="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Patient</p>
                        <p class="font-black text-gray-900">{editingItem.patient_name}</p>
                        <p class="text-sm text-gray-500 mt-1">{editingItem.description}</p>
                    </div>
                {/if}

                <!-- Status -->
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Statut</label>
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {#each STATUSES as s}
                            <button
                                type="button"
                                onclick={() => form.status = s.value}
                                class="px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all text-left flex items-center gap-2 {form.status === s.value
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}"
                            >
                                <span class="w-2 h-2 rounded-full {STATUS_DOTS[s.value]}"></span>
                                {s.label}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Notes -->
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Notes</label>
                    <textarea
                        bind:value={form.notes}
                        rows="3"
                        placeholder="Instructions spéciales, date de retour attendue..."
                        class="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium text-gray-900 resize-none"
                    ></textarea>
                </div>

                <!-- Actions -->
                <div class="flex justify-end gap-3 pt-2">
                    <button
                        onclick={() => showModal = false}
                        class="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
                    >
                        Annuler
                    </button>
                    <button
                        onclick={saveItem}
                        class="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        {editingItem ? "Mettre à jour" : "Créer le suivi"}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
