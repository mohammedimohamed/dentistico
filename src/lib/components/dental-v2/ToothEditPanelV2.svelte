<script lang="ts">
    import { getAnatomy, getFrenchName } from "$lib/utils/toothLogicV2";
    import { dentalColors } from "$lib/stores/dentalSettings.svelte";
    import InteractiveToothV2 from "./InteractiveToothV2.svelte";
    import { createEventDispatcher } from "svelte";
    import { X, Save, CalendarPlus, Info, CheckCircle2, History } from "lucide-svelte";

    interface Props {
        fdi: number;
        annotations?: any; // The existing data from DB
        onSave?: (data: any) => Promise<void>;
        onPlanTreatment?: (fdi: number, data: any) => void;
        onDeleteBridge?: (bridgeId: string) => Promise<void>;
        onClose: () => void;
    }

    let { fdi, annotations = {}, onSave, onPlanTreatment, onDeleteBridge, onClose }: Props = $props();

    const dispatch = createEventDispatcher();
    const anatomy = $derived(getAnatomy(fdi));
    const toothName = $derived(getFrenchName(fdi));

    // Local State
    let currentZones = $state<Record<string, string>>({ ...annotations.zones });
    let notes = $state(annotations.notes || "");
    let globalStatus = $state(annotations.globalStatus || "Sain");
    let selectedZone = $state<string | null>(null);
    let isSaving = $state(false);

    const statuses = Object.keys(dentalColors);

    function getContrastColor(hexcolor: string) {
        if (!hexcolor || hexcolor === 'transparent') return 'inherit';
        // Handle hex colors
        const hex = hexcolor.replace('#', '');
        const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
        const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
        const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#0f172a' : '#ffffff';
    }

    function updateZoneStatus(zone: string, status: string) {
        currentZones[zone] = status;
        selectedZone = zone;
    }

    function getFill(zone: string) {
        const status = currentZones[zone];
        if (!status) return '#f1f5f9';
        return (dentalColors as any)[status] || status;
    }

    async function handleDeleteBridge() {
        if (onDeleteBridge && annotations.bridge_id) {
            await onDeleteBridge(annotations.bridge_id);
            onClose();
        }
    }

    async function handleSave(shouldClose = false, treatmentStatus: 'existing' | 'planned' | null = null) {
        isSaving = true;
        
        // If treatmentStatus is provided, we can pass it to the onSave callback 
        // to handle the V1 sync correctly.
        const payload = {
            fdi,
            zones: currentZones,
            notes,
            globalStatus,
            syncStatus: treatmentStatus, // 'existing' for "Déjà Absent", 'planned' for "À extraire"
            bridgeId: annotations.bridge_id
        };
        
        if (onSave) {
            await onSave(payload);
        }
        dispatch("saved", payload);
        isSaving = false;

        if (shouldClose && onClose) {
            onClose();
        }
    }

    function handleZoneClick(e: CustomEvent) {
        selectedZone = e.detail.zoneName;
    }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <div class="bg-white w-full max-w-6xl h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
        
        <!-- LEFT SIDE: Visual Clinical Chart -->
        <div class="w-full md:w-5/12 bg-slate-50 flex items-center justify-center p-12 border-r border-slate-100 relative overflow-hidden">
            <div class="absolute inset-0 opacity-30 pointer-events-none" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 20px 20px;"></div>
            
            <div class="absolute top-8 left-8">
                <span class="px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-indigo-600"></div>
                    Vue Anatomique
                </span>
            </div>
            
            <div class="scale-[3] transform origin-center transition-transform hover:scale-[3.1] duration-700">
                <InteractiveToothV2 
                    {fdi} 
                    zones={currentZones} 
                    status={globalStatus}
                    selected={true}
                    on:zoneClick={handleZoneClick}
                />
            </div>

            {#if selectedZone && globalStatus.toLowerCase() !== 'absent'}
                <div class="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    ZONE : <span class="text-indigo-400">{selectedZone}</span>
                </div>
            {/if}
        </div>

        <!-- RIGHT SIDE: Clinical Controls -->
        <div class="w-full md:w-7/12 flex flex-col bg-white">
            <!-- Header -->
            <div class="p-10 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                <div>
                    <h2 class="text-5xl font-black text-slate-900 tracking-tighter flex items-baseline gap-4">
                        {fdi} <span class="text-xl font-bold text-slate-400 uppercase tracking-normal">{toothName}</span>
                    </h2>
                    <p class="text-slate-400 font-bold text-sm mt-2 flex items-center gap-2">
                        <CheckCircle2 class="w-4 h-4 text-emerald-500" /> Dossier Clinique Informatisé
                    </p>
                    {#if annotations.bridge_id}
                        <div class="mt-4 flex items-center gap-3">
                            <span class="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-200 uppercase tracking-tighter">
                                Fait partie d'un Bridge
                            </span>
                            <button 
                                onclick={handleDeleteBridge}
                                class="text-[10px] font-black text-rose-600 hover:text-rose-700 hover:underline uppercase tracking-tighter"
                            >
                                Supprimer le Bridge
                            </button>
                        </div>
                    {/if}
                </div>
                <button onclick={onClose} class="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                    <X class="w-6 h-6 text-slate-400 group-hover:text-slate-900" />
                </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-10 space-y-10">
                
                <!-- Quick State Selectors -->
                <div class="grid grid-cols-2 gap-4">
                    <button 
                        onclick={() => { globalStatus = 'Sain'; currentZones = {}; handleSave(true, 'existing'); }}
                        class="flex items-center gap-4 p-5 rounded-3xl border-2 border-emerald-50 bg-emerald-50/30 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                    >
                        <div class="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">✓</div>
                        <div class="text-left">
                            <p class="text-sm font-black text-emerald-900">Dent Saine</p>
                            <p class="text-[10px] font-bold text-emerald-600 uppercase">État initial / RàS</p>
                        </div>
                    </button>

                    <button 
                        onclick={() => { globalStatus = 'Absent'; handleSave(true, 'existing'); }}
                        class="flex items-center gap-4 p-5 rounded-3xl border-2 border-rose-50 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-200 transition-all group"
                    >
                        <div class="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-110 transition-transform">X</div>
                        <div class="text-left">
                            <p class="text-sm font-black text-rose-900">Déjà Absente</p>
                            <p class="text-[10px] font-bold text-rose-600 uppercase">Historique / Agénésie</p>
                        </div>
                    </button>
                </div>

                {#if annotations.bridge_id}
                    <div class="p-8 bg-indigo-50/50 border-2 border-indigo-100 rounded-[32px] flex items-center justify-between mb-6">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Système Prothétique</p>
                            <h3 class="text-lg font-black text-indigo-900">Bridge : <span class="text-indigo-600">{globalStatus}</span></h3>
                        </div>
                        <div class="text-right">
                            <span class="px-3 py-1 bg-white text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-200 uppercase">Actif</span>
                        </div>
                    </div>
                {/if}

                {#if globalStatus.toLowerCase() === 'absent'}
                    <div class="bg-indigo-50 border-2 border-indigo-100 rounded-[32px] p-10 text-center">
                        <h3 class="text-xl font-black text-indigo-900 mb-2">Dent Absente</h3>
                        <p class="text-indigo-600 text-sm font-medium">Cette dent est marquée comme absente du schéma dentaire.</p>
                        <button onclick={() => globalStatus = 'Sain'} class="mt-6 text-xs font-black uppercase text-indigo-600 hover:underline">Restaurer l'anatomie</button>
                    </div>
                {:else}
                    <!-- Zone Selection -->
                    <section>
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Info class="w-4 h-4" /> Sélection de la Surface à Traiter
                        </h3>
                        <div class="grid grid-cols-5 gap-4">
                            {#each anatomy.zones.crown as zone}
                                <button 
                                    onclick={() => selectedZone = zone}
                                    class="flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all {selectedZone === zone ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-50' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}"
                                >
                                    <span class="text-xs font-black {selectedZone === zone ? 'text-indigo-600' : 'text-slate-400'}">{zone}</span>
                                    <div class="w-8 h-8 rounded-2xl border-2 border-white shadow-sm" style="background: {getFill(zone)}"></div>
                                </button>
                            {/each}
                        </div>
                    </section>

                    {#if selectedZone}
                        <div class="p-8 bg-slate-900 rounded-[32px] text-white animate-in zoom-in duration-200">
                            <p 
                                class="text-[10px] font-black uppercase tracking-widest mb-4 transition-colors duration-300"
                                style:color={(dentalColors as any)[currentZones[selectedZone!] || 'SAIN']}
                            >
                                Statut de la face {selectedZone}
                            </p>
                            <div class="flex flex-wrap gap-2">
                                {#each statuses as status}
                                    {@const isActive = currentZones[selectedZone!] === status}
                                    {@const color = (dentalColors as any)[status]}
                                    <button 
                                        onclick={() => updateZoneStatus(selectedZone!, status)}
                                        style:background-color={isActive ? color : 'rgba(30, 41, 59, 0.2)'}
                                        style:border-color={isActive ? color : `${color}44`}
                                        style:color={isActive ? getContrastColor(color) : color}
                                        class="px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 hover:scale-105 active:scale-95"
                                    >
                                        {status}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}

                <!-- Notes -->
                <section>
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Notes Cliniques & Observations</label>
                    <textarea 
                        bind:value={notes}
                        placeholder="Détails supplémentaires..."
                        class="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-[32px] p-6 text-sm font-medium focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                    ></textarea>
                </section>
            </div>

            <!-- Footer -->
            <div class="p-10 border-t border-slate-100 bg-white flex items-center gap-4">
                <button 
                    onclick={() => handleSave(true)}
                    disabled={isSaving}
                    class="flex-[2] bg-slate-900 hover:bg-black text-white font-black py-5 px-8 rounded-3xl shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                    <Save class="w-5 h-5 text-indigo-400" /> 
                    {isSaving ? "Synchronisation..." : "Valider l'État Clinique"}
                </button>

                <button 
                    onclick={() => onPlanTreatment?.(fdi, { zones: currentZones, globalStatus })}
                    class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-8 rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                    <CalendarPlus class="w-5 h-5" />
                    Planifier un Soin
                </button>
            </div>
        </div>
    </div>
</div>


<style>
    textarea::placeholder {
        color: #cbd5e1;
    }

    /* Professional scrollbar */
    ::-webkit-scrollbar {
        width: 6px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
</style>
