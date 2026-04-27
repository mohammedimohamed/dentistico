<script lang="ts">
    import { getAnatomy, getFrenchName } from "$lib/utils/toothLogicV2";
    import { dentalColors } from "$lib/stores/dentalSettings.svelte";
    import InteractiveToothV2 from "./InteractiveToothV2.svelte";
    import { createEventDispatcher } from "svelte";
    import { X, Save, CalendarPlus, Info } from "lucide-svelte";

    interface Props {
        fdi: number;
        annotations?: any; // The existing data from DB
        onSave?: (data: any) => Promise<void>;
        onClose: () => void;
    }

    let { fdi, annotations = {}, onSave, onClose }: Props = $props();

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

    function updateZoneStatus(zone: string, status: string) {
        currentZones[zone] = status;
        selectedZone = zone;
    }

    function getFill(zone: string) {
        const status = currentZones[zone];
        if (!status) return '#f1f5f9';
        return (dentalColors as any)[status] || status;
    }

    async function handleSave(shouldClose = false) {
        isSaving = true;
        const payload = {
            fdi,
            zones: currentZones,
            notes,
            globalStatus
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
    <div class="bg-white w-full max-w-5xl h-[80vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
        
        <!-- LEFT SIDE: Visual Clinical Chart -->
        <div class="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-12 border-r border-slate-100 relative">
            <div class="absolute top-8 left-8">
                <span class="px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest">Vue Anatomique</span>
            </div>
            
            <div class="scale-[2.5] transform origin-center">
                <InteractiveToothV2 
                    {fdi} 
                    zones={currentZones} 
                    status={globalStatus}
                    selected={true}
                    on:zoneClick={handleZoneClick}
                />
            </div>

            {#if selectedZone && globalStatus.toLowerCase() !== 'absent'}
                <div class="absolute bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl animate-bounce">
                    Zone sélectionnée : {selectedZone}
                </div>
            {/if}
        </div>

        <!-- RIGHT SIDE: Clinical Controls -->
        <div class="w-full md:w-1/2 flex flex-col bg-white">
            <!-- Header -->
            <div class="p-8 border-b border-slate-100 flex justify-between items-start">
                <div>
                    <h2 class="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-3">
                        {fdi} <span class="text-lg font-bold text-slate-400 uppercase tracking-tighter">{toothName}</span>
                    </h2>
                    <p class="text-slate-400 font-medium mt-1">Examen clinique détaillé</p>
                </div>
                <div class="flex gap-2">
                    <div class="flex flex-col gap-2">
                         <button 
                            onclick={() => { 
                                globalStatus = 'Sain';
                                currentZones = {};
                            }} 
                            class="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-lg border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                        >
                            Tout Sain
                        </button>
                        <button 
                            onclick={() => { 
                                globalStatus = 'Absent';
                            }} 
                            class="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-lg border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                        >
                            Marquer Absent
                        </button>
                    </div>
                    <button onclick={onClose} class="p-2 hover:bg-slate-100 rounded-2xl transition-colors">
                        <X class="w-6 h-6 text-slate-400" />
                    </button>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-8 space-y-8">
                
                {#if globalStatus.toLowerCase() === 'absent'}
                    <div class="bg-rose-50 border-2 border-rose-100 rounded-[32px] p-8 text-center">
                        <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black">X</div>
                        <h3 class="text-xl font-black text-rose-900 mb-2">Dent Absente / Extraite</h3>
                        <p class="text-rose-600 text-sm font-medium leading-relaxed">Les contrôles par surface sont désactivés car la dent n'est plus présente anatomiquement.</p>
                        <button 
                            onclick={() => globalStatus = 'Sain'}
                            class="mt-6 px-6 py-2 bg-white text-rose-600 rounded-xl text-xs font-black uppercase border border-rose-200 hover:bg-rose-600 hover:text-white transition-all"
                        >
                            Restaurer la dent
                        </button>
                    </div>
                {:else}
                    <!-- Zone Grid -->
                    <section>
                        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Info class="w-4 h-4" /> État des Surfaces (Couronne)
                        </h3>
                        <div class="grid grid-cols-5 gap-3">
                            {#each anatomy.zones.crown as zone}
                                <button 
                                    onclick={() => selectedZone = zone}
                                    class="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all {selectedZone === zone ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}"
                                >
                                    <span class="text-xs font-black text-slate-600">{zone}</span>
                                    <div class="w-6 h-6 rounded-full border border-slate-200 shadow-inner" style="background: {getFill(zone)}"></div>
                                </button>
                            {/each}
                        </div>
                    </section>

                    <!-- Root Grid -->
                    {#if anatomy.zones.root.length > 0}
                    <section>
                        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Système Endodontique (Racines)</h3>
                        <div class="flex gap-4">
                            {#each anatomy.zones.root as zone}
                                <button 
                                    onclick={() => selectedZone = zone}
                                    class="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all {selectedZone === zone ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}"
                                >
                                    <span class="text-xs font-black text-slate-600">{zone}</span>
                                    <div class="w-5 h-5 rounded-md border border-slate-200" style="background: {getFill(zone)}"></div>
                                </button>
                            {/each}
                        </div>
                    </section>
                    {/if}

                    <!-- Status Picker (Visible when a zone is selected) -->
                    {#if selectedZone}
                        <div class="p-6 bg-slate-50 rounded-[24px] border border-slate-100 space-y-4">
                            <div class="flex justify-between items-center">
                                <span class="text-sm font-bold text-slate-700">Assigner un état à la zone <span class="text-indigo-600">{selectedZone}</span></span>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                {#each statuses as status}
                                    <button 
                                        onclick={() => updateZoneStatus(selectedZone!, status)}
                                        class="px-4 py-2 rounded-xl text-xs font-bold transition-all border {currentZones[selectedZone!] === status ? 'bg-white border-slate-300 shadow-sm scale-105' : 'bg-white/50 border-transparent text-slate-500 hover:bg-white'}"
                                    >
                                        <div class="flex items-center gap-2">
                                            <div class="w-3 h-3 rounded-full" style="background: {(dentalColors as any)[status]}"></div>
                                            {status}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}

                <!-- Global Notes & Status -->
                <div class="grid grid-cols-1 gap-6">
                    <div>
                        <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Observations Cliniques</label>
                        <textarea 
                            bind:value={notes}
                            placeholder="Ex: Mobilité grade I, tartre sous-gingival..."
                            class="w-full h-32 bg-slate-50 border-slate-200 rounded-3xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                        ></textarea>
                    </div>
                    <div>
                        <label class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">État Global de la Dent</label>
                        <select 
                            bind:value={globalStatus}
                            class="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                            <option value="Sain">Sain / Intact</option>
                            <option value="A extraire">À extraire</option>
                            <option value="Absent">Absente</option>
                            <option value="Implant">Implant</option>
                            <option value="Pontique">Pontique (Bridge)</option>
                            <option value="Pilier">Pilier (Bridge)</option>
                            <option value="Couronne">Couronne posée</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-3">
                <button 
                    onclick={() => handleSave(true)}
                    disabled={isSaving}
                    class="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Save class="w-5 h-5" /> 
                    {isSaving ? "Enregistrement..." : "Enregistrer & Fermer"}
                </button>

                <button 
                    onclick={() => handleSave(false)}
                    disabled={isSaving}
                    class="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                    <Save class="w-4 h-4 opacity-50" />
                    Enregistrer
                </button>
                
                <button 
                    class="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                    <CalendarPlus class="w-5 h-5" />
                    Planifier un soin
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
