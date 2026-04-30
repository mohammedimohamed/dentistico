<script lang="ts">
    import type { PageData } from "./$types";
    import { enhance } from "$app/forms";
    import { page as pageStore } from "$app/stores";
    import { goto } from "$app/navigation";
    import { t } from "svelte-i18n";
    import { patientStore } from "$lib/stores/patients.svelte";
    import { browser } from "$app/environment";
    import { untrack } from "svelte";
    import QuickViewModal from "$lib/components/patients/QuickViewModal.svelte";
    import { LayoutGrid, List, Search, Filter, Settings, Save, RotateCcw, User, Phone, Calendar, Eye, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Wind, Download } from 'lucide-svelte';
    import { downloadCSV } from "$lib/utils/export";


    let { data }: { data: PageData } = $props();

    let isCreateModalOpen = $state(false);
    let searchDebounceTimer: any;

    // Initialize store with raw data from server
    $effect(() => {
        patientStore.rawPatients = data.patients;
    });

    // Reactive filtering: when store filters change, update URL
    $effect(() => {
        const query = patientStore.filters.search;
        const balance = patientStore.filters.balanceStatus;
        const gender = patientStore.filters.gender;
        const ageMin = patientStore.filters.ageRange[0];
        const ageMax = patientStore.filters.ageRange[1];
        const pageSize = patientStore.pageSize;

        untrack(() => {
            if (!browser) return;
            const url = new URL(window.location.href);
            let changed = false;

            if (url.searchParams.get("search") !== query) {
                url.searchParams.set("search", query);
                changed = true;
            }

            let filterVal = "";
            if (balance === "debtor") filterVal = "debt";
            else if (balance === "creditor") filterVal = "credit";
            else if (gender === "Male") filterVal = "male";
            else if (gender === "Female") filterVal = "female";
            
            if (url.searchParams.get("filter") !== filterVal) {
                if (filterVal) url.searchParams.set("filter", filterVal);
                else url.searchParams.delete("filter");
                changed = true;
            }

            if (url.searchParams.get("limit") !== pageSize.toString()) {
                url.searchParams.set("limit", pageSize.toString());
                changed = true;
            }

            if (changed) {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    url.searchParams.set("page", "1");
                    goto(url.toString(), {
                        keepFocus: true,
                        noScroll: true,
                        replaceState: true,
                    });
                }, 300);
            }
        });
    });

    function calculateAge(dob: string) {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    const patients = $derived(patientStore.filteredPatients);
    const totalPages = $derived(data.totalPages as number);
    const currentPage = $derived(data.page as number);
    const totalPatients = $derived(data.totalPatients as number);
    const searchQuery = $derived(data.searchQuery as string);
    const currentLimit = $derived(data.limit as number);

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("fr-DZ", {
            style: "currency",
            currency: "DZD",
        }).format(Math.abs(amount));
    }

    function formatRelativeDate(dateStr: string) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const diffDays = Math.ceil(
            (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
        if (date.toDateString() === tomorrow.toDateString()) return "Demain";
        if (diffDays > 0 && diffDays <= 7) return `Dans ${diffDays}j`;
        return date.toLocaleDateString("fr-FR");
    }

    let isPresetModalOpen = $state(false);
    let newPresetName = $state("");

    function saveCurrentPreset() {
        if (newPresetName) {
            patientStore.savePreset(newPresetName);
            newPresetName = "";
            isPresetModalOpen = false;
        }
    }
</script>

<div class="max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <!-- Header Section -->
    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
            <h1 class="text-4xl font-black text-gray-900 tracking-tight mb-2">
                {$t("patients.directory")}
            </h1>
            <p class="text-gray-500 font-medium">
                Total : {totalPatients} patients
            </p>
        </div>

                <div class="flex items-center gap-4 w-full lg:w-auto">
            <button onclick={() => downloadCSV(patientStore.filteredPatients, "patients_export")} class="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl hover:bg-gray-50 hover:border-gray-200 font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap">
                <Download size={18} />
                Exporter
            </button>
            <!-- View Toggle -->
            <div class="bg-gray-100 p-1 rounded-2xl flex items-center shadow-inner">
                <button
                    onclick={() => (patientStore.viewMode = "grid")}
                    class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 {patientStore.viewMode === 'grid' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}"
                >
                    <span class="flex items-center"><LayoutGrid size={20} /></span>
                    <span class="hidden sm:inline">Cards</span>
                </button>
                <button
                    onclick={() => (patientStore.viewMode = "table")}
                    class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 {patientStore.viewMode === 'table' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'}"
                >
                    <span class="flex items-center"><List size={20} /></span>
                    <span class="hidden sm:inline">Table</span>
                </button>
            </div>

            <button
                onclick={() => (isCreateModalOpen = true)}
                class="bg-indigo-600 text-white px-8 py-3 rounded-2xl hover:bg-indigo-700 font-bold shadow-xl shadow-indigo-100 transition-all flex items-center gap-3 group whitespace-nowrap"
            >
                
                {$t("patients.new_patient")}
            </button>
        </div>
    </div>

    <!-- Main Workspace -->
    <div class="space-y-6">
        <!-- Search & Quick Filters Bar -->
        <div class="flex flex-col xl:flex-row gap-4 items-stretch">
            <div class="relative flex-1 group">
                <div class="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <span class="text-gray-400 group-focus-within:text-indigo-500 transition-all"><Search size={20} /></span>
                </div>
                <input
                    type="text"
                    bind:value={patientStore.filters.search}
                    placeholder="Rechercher par nom, téléphone, ville ou ID..."
                    class="w-full pl-16 pr-6 py-5 bg-white border-2 border-gray-100 rounded-[2rem] shadow-sm focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-500 outline-none transition-all text-lg font-medium placeholder:text-gray-400"
                />
            </div>

            <div class="flex items-center gap-3">
                <button
                    onclick={() => (patientStore.isFilterPanelOpen = !patientStore.isFilterPanelOpen)}
                    class="flex items-center gap-3 px-8 py-5 rounded-[2rem] font-bold transition-all border-2 {patientStore.isFilterPanelOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200 shadow-sm'}"
                >
                    <span><Filter size={20} /></span>
                    Filtres Avancés
                    {#if Object.values(patientStore.filters).some((f) => (Array.isArray(f) ? f[0] !== 0 || (f[1] !== 100 && f[1] !== "") : f !== "" && f !== "all"))}
                        <span class="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                    {/if}
                </button>

                <div class="relative">
                    <button
                        class="p-5 bg-white border-2 border-gray-100 rounded-[2rem] text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                        title="Paramètres des colonnes"
                        onclick={() => {
                            const menu = document.getElementById('column-menu');
                            menu?.classList.toggle('hidden');
                        }}
                    >
                        <Settings size={20} />
                    </button>
                    <!-- Column Picker Dropdown -->
                    <div id="column-menu" class="hidden absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-30">
                        <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Colonnes Affichées</h4>
                        <div class="space-y-1">
                            {#each patientStore.columns as col}
                                <button
                                    onclick={() => patientStore.toggleColumn(col.id)}
                                    class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <span class="text-sm font-bold {col.visible ? 'text-gray-900' : 'text-gray-400'}">{col.label}</span>
                                    <div class="w-10 h-5 rounded-full transition-colors relative {col.visible ? 'bg-indigo-600' : 'bg-gray-200'}">
                                        <div class="absolute top-1 w-3 h-3 bg-white rounded-full transition-all {col.visible ? 'right-1' : 'left-1'}"></div>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Advanced Filter Panel (Collapsible) -->
        {#if patientStore.isFilterPanelOpen}
            <div class="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-100/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <!-- Age Range -->
                <div class="space-y-5">
                    <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tranche d'Âge</label>
                    <div class="flex items-center gap-4">
                        <input
                            type="number"
                            bind:value={patientStore.filters.ageRange[0]}
                            placeholder="Min"
                            class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-lg"
                        />
                        <span class="text-gray-300 font-black">to</span>
                        <input
                            type="number"
                            bind:value={patientStore.filters.ageRange[1]}
                            placeholder="Max"
                            class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-lg"
                        />
                    </div>
                </div>

                <!-- Gender -->
                <div class="space-y-5">
                    <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest">Sexe</label>
                    <div class="flex p-2 bg-gray-50 rounded-2xl border-2 border-transparent">
                        <button
                            onclick={() => (patientStore.filters.gender = "")}
                            class="flex-1 py-4 text-sm font-black rounded-xl transition-all {patientStore.filters.gender === '' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}"
                        >TOUS</button>
                        <button
                            onclick={() => (patientStore.filters.gender = "Male")}
                            class="flex-1 py-4 text-sm font-black rounded-xl transition-all {patientStore.filters.gender === 'Male' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}"
                        >HOMME</button>
                        <button
                            onclick={() => (patientStore.filters.gender = "Female")}
                            class="flex-1 py-4 text-sm font-black rounded-xl transition-all {patientStore.filters.gender === 'Female' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}"
                        >FEMME</button>
                    </div>
                </div>

                <!-- Balance -->
                <div class="space-y-5">
                    <label class="text-[11px] font-black text-gray-400 uppercase tracking-widest">État Financier</label>
                    <div class="relative">
                        <select
                            bind:value={patientStore.filters.balanceStatus}
                            class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-lg appearance-none cursor-pointer"
                        >
                            <option value="all">Tous les soldes</option>
                            <option value="debtor">Débiteurs (Dettes)</option>
                            <option value="creditor">Créditeurs (Avance)</option>
                        </select>
                        <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                    </div>
                </div>

                <!-- Presets & Actions -->
                <div class="flex flex-col justify-end gap-4">
                    <div class="flex gap-3">
                        <button
                            onclick={() => (isPresetModalOpen = true)}
                            class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                        >
                            <span><Save size={18} /></span>
                            SAUVEGARDER PRESET
                        </button>
                        <button
                            onclick={() => patientStore.resetFilters()}
                            class="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                        ><RotateCcw size={18} /></button>
                    </div>
                    
                    {#if patientStore.savedPresets.length > 0}
                        <div class="flex flex-wrap gap-2 mt-2">
                            {#each patientStore.savedPresets as preset}
                                <div class="group relative">
                                    <button
                                        onclick={() => patientStore.applyPreset(preset)}
                                        class="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-100 transition-all"
                                    >
                                        {preset.name}
                                    </button>
                                    <button
                                        onclick={() => patientStore.deletePreset(preset.name)}
                                        class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                                    >✕</button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Data Visualization -->
        {#if patients.length === 0}
            <div class="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-gray-50 shadow-sm">
                <div class="mb-6 flex justify-center"><Wind size={48} class="text-gray-300 mx-auto" /></div>
                <p class="text-gray-400 text-xl font-bold mb-6">Aucun patient trouvé correspondant à vos critères</p>
                <button
                    onclick={() => patientStore.resetFilters()}
                    class="text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-widest text-sm underline underline-offset-8"
                >Réinitialiser les filtres</button>
            </div>
        {:else if patientStore.viewMode === "grid"}
            <!-- Enhanced Card Grid -->
            <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {#each patients as patient}
                    <div class="bg-white group overflow-hidden shadow-sm hover:shadow-[0_20px_50px_rgba(79,70,229,0.15)] hover:-translate-y-2 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-100 transition-all duration-500 p-2">
                        <div class="bg-gray-50/50 rounded-[2rem] p-6 h-full flex flex-col">
                            <div class="flex items-start justify-between mb-6">
                                <div class="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform text-indigo-500">
                                    <User size={24} />
                                </div>
                                <div class="flex flex-col items-end gap-2">
                                    <span class="px-3 py-1 rounded-full text-[10px] font-black bg-white shadow-sm text-gray-400 uppercase tracking-widest">ID: #{patient.id.toString().padStart(4, '0')}</span>
                                    {#if patient.net_balance !== 0}
                                        <span class="px-3 py-1 rounded-full text-[10px] font-black {patient.net_balance < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} uppercase tracking-widest">
                                            {patient.net_balance < 0 ? 'Dette' : 'Crédit'}
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <h3 class="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-1">{patient.full_name}</h3>
                            
                            <div class="flex flex-wrap gap-2 mb-6">
                                <span class="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase">{patient.age ?? calculateAge(patient.date_of_birth)} ANS</span>
                                <span class="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg uppercase">{patient.city || "Alger"}</span>
                            </div>

                            <div class="space-y-3 mb-8 flex-1">
                                <div class="flex items-center gap-3 text-sm font-bold text-gray-500">
                                    <span class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-indigo-500"><Phone size={16} /></span>
                                    {patient.phone || "---"}
                                </div>
                                <div class="flex items-center gap-3 text-sm font-bold text-gray-500">
                                    <span class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-indigo-500"><Calendar size={16} /></span>
                                    <span class="text-indigo-600">{patient.next_appointment ? formatRelativeDate(patient.next_appointment) : "Pas de RDV"}</span>
                                </div>
                            </div>

                            <div class="flex gap-2">
                                <button
                                    onclick={() => patientStore.openQuickView(patient)}
                                    class="flex-1 py-4 bg-white border-2 border-gray-100 hover:border-indigo-600 hover:text-indigo-600 rounded-2xl text-xs font-black transition-all"
                                >APERCU</button>
                                <a
                                    href="/doctor/patients/{patient.id}"
                                    class="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 hover:bg-indigo-700"
                                >DOSSIER →</a>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <!-- Professional Table Engine -->
            <div class="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm overflow-hidden h-[800px] max-h-[75vh] flex flex-col">
                <div class="overflow-y-auto custom-scrollbar flex-1">
                    <table class="w-full text-left border-collapse relative">
                        <thead class="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm shadow-sm">
                            <tr>
                                {#each patientStore.columns as col}
                                    {#if col.visible}
                                        <th class="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 group cursor-pointer" onclick={() => patientStore.toggleSort(col.id)}>
                                            <div class="flex items-center justify-between gap-2">
                                                <div class="flex items-center gap-2 transition-colors {patientStore.sortKey === col.id ? 'text-indigo-600' : ''}">
                                                    {col.label}
                                                    {#if col.sortable}
                                                        <span class="text-[10px] transition-all {patientStore.sortKey === col.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}">
                                                            {#if patientStore.sortKey === col.id && patientStore.sortDirection === 'asc'}
                                                                <ChevronUp size={14} />
                                                            {:else if patientStore.sortKey === col.id && patientStore.sortDirection === 'desc'}
                                                                <ChevronDown size={14} />
                                                            {:else}
                                                                <ChevronsUpDown size={14} />
                                                            {/if}
                                                        </span>
                                                    {/if}
                                                </div>
                                                <button class="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all" onclick={(e) => { e.stopPropagation(); patientStore.isFilterPanelOpen = true; }}>
                                                    <Search size={16} />
                                                </button>
                                            </div>
                                        </th>
                                    {/if}
                                {/each}
                                <th class="px-6 py-6 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            {#each patients as patient, idx}
                                <tr class="hover:bg-indigo-50/30 transition-colors group">
                                    {#each patientStore.columns as col}
                                        {#if col.visible}
                                            <td class="px-6 py-5 text-sm font-bold text-gray-700">
                                                {#if col.id === 'index'}
                                                    <span class="text-gray-300 font-black">{(currentPage - 1) * 24 + idx + 1}</span>
                                                {:else if col.id === 'full_name'}
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs">{patient.full_name.charAt(0)}</div>
                                                        <span class="text-gray-900">{patient.full_name}</span>
                                                    </div>
                                                {:else if col.id === 'age'}
                                                    {patient.age ?? calculateAge(patient.date_of_birth)}
                                                {:else if col.id === 'net_balance'}
                                                    <span class={patient.net_balance < 0 ? 'text-red-500' : patient.net_balance > 0 ? 'text-green-500' : 'text-gray-300'}>
                                                        {formatCurrency(patient.net_balance)}
                                                    </span>
                                                {:else if col.id === 'last_visit'}
                                                    {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : '---'}
                                                {:else if col.id === 'next_appointment'}
                                                    <span class="text-indigo-600">{patient.next_appointment ? formatRelativeDate(patient.next_appointment) : '---'}</span>
                                                {:else}
                                                    {patient[col.id] || '---'}
                                                {/if}
                                            </td>
                                        {/if}
                                    {/each}
                                    <td class="px-6 py-5 text-right">
                                        <button
                                            onclick={() => patientStore.openQuickView(patient)}
                                            class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-sm"
                                        ><Eye size={20} /></button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}

        <!-- Pagination & Display Controls -->
        {#if totalPatients > 0}
            <div class="flex flex-col sm:flex-row items-center justify-between bg-white px-8 py-6 rounded-[2rem] border-2 border-gray-100 shadow-sm gap-6">
                
                <!-- Display Count Info -->
                <div class="flex items-center gap-4 text-sm font-bold text-gray-500 w-full sm:w-auto justify-between sm:justify-start">
                    <p>
                        {#if currentLimit === -1}
                            Affichage de <span class="text-indigo-600">{totalPatients}</span> patients
                        {:else}
                            Affichage de <span class="text-indigo-600">{(currentPage - 1) * currentLimit + 1}</span> à <span class="text-indigo-600">{Math.min(currentPage * currentLimit, totalPatients)}</span> sur <span class="text-indigo-600">{totalPatients}</span> patients
                        {/if}
                    </p>
                    
                    <div class="flex items-center gap-2 border-l-2 border-gray-100 pl-4 ml-2">
                        <label for="pageSize" class="text-xs uppercase tracking-widest font-black text-gray-400">Afficher par page:</label>
                        <select 
                            id="pageSize"
                            bind:value={patientStore.pageSize}
                            class="bg-gray-50 border-none rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none text-indigo-700"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={-1}>Tout</option>
                        </select>
                    </div>
                </div>

                <!-- Page Navigation -->
                {#if totalPages > 1}
                    <nav class="flex items-center gap-2">
                        <a href="?page={currentPage - 1}&search={searchQuery}&limit={currentLimit}" class="p-3 rounded-xl hover:bg-gray-50 transition-all {currentPage <= 1 ? 'pointer-events-none opacity-20' : ''}"><ChevronLeft size={20} /></a>
                        {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let start = Math.max(1, currentPage - 2);
                            let end = Math.min(totalPages, start + 4);
                            if (end === totalPages) start = Math.max(1, end - 4);
                            return start + i;
                        }) as pageNum}
                            <a href="?page={pageNum}&search={searchQuery}&limit={currentLimit}" class="w-12 h-12 flex items-center justify-center rounded-xl font-black text-sm transition-all {currentPage === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}">{pageNum}</a>
                        {/each}
                        <a href="?page={currentPage + 1}&search={searchQuery}&limit={currentLimit}" class="p-3 rounded-xl hover:bg-gray-50 transition-all {currentPage >= totalPages ? 'pointer-events-none opacity-20' : ''}"><ChevronRight size={20} /></a>
                    </nav>
                {/if}
            </div>
        {/if}
    </div>
</div>

<!-- Preset Save Modal -->
{#if isPresetModalOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onclick={() => isPresetModalOpen = false}></div>
        <div class="relative bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 class="text-2xl font-black text-gray-900 mb-6">Sauvegarder les filtres</h3>
            <div class="space-y-6">
                <div>
                    <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nom du Preset</label>
                    <input type="text" bind:value={newPresetName} placeholder="Ex: Patients Débiteurs - Alger" class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div class="flex gap-4">
                    <button onclick={saveCurrentPreset} class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all">SAUVEGARDER</button>
                    <button onclick={() => isPresetModalOpen = false} class="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">ANNULER</button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Quick View Modal -->
{#if patientStore.isQuickViewOpen && patientStore.selectedPatient}
    <QuickViewModal patient={patientStore.selectedPatient} />
{/if}

<!-- Create Patient Modal -->
{#if isCreateModalOpen}
    <div class="fixed inset-0 z-[100] overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
            <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onclick={() => isCreateModalOpen = false}></div>
            <div class="relative transform overflow-hidden rounded-[3rem] bg-white text-start shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-gray-100">
                <form method="POST" action="?/createPatient" use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === "success") isCreateModalOpen = false;
                        await update();
                    };
                }}>
                    <div class="px-10 pt-10 pb-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div class="flex justify-between items-center mb-10">
                            <h3 class="text-3xl font-black text-gray-900">Nouveau Patient</h3>
                            <button type="button" onclick={() => isCreateModalOpen = false} class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">✕</button>
                        </div>
                        <div class="space-y-10">
                            <div class="space-y-6">
                                <h4 class="text-xs font-black text-indigo-300 uppercase tracking-[0.3em]">Informations Personnelles</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Nom Complet *</label>
                                        <input type="text" name="full_name" required class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Date de Naissance *</label>
                                        <input type="date" name="date_of_birth" required class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Sexe</label>
                                        <select name="gender" class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none">
                                            <option value="">Non spécifié</option>
                                            <option value="Male">Homme</option>
                                            <option value="Female">Femme</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-6">
                                <h4 class="text-xs font-black text-indigo-300 uppercase tracking-[0.3em]">Contact</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
                                        <input type="tel" name="phone" class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                        <input type="email" name="email" class="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="px-10 py-8 bg-gray-50/50 flex gap-4 border-t border-gray-100">
                        <button type="submit" class="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl hover:bg-indigo-700 transition-all">CRÉER PATIENT</button>
                        <button type="button" onclick={() => isCreateModalOpen = false} class="px-10 py-5 bg-white text-gray-500 rounded-[1.5rem] font-black text-sm border-2 border-gray-100 hover:bg-gray-50 transition-all">ANNULER</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>
