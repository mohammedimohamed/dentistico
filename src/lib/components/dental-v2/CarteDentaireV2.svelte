<script lang="ts">
    import { t } from "svelte-i18n";
    import { onMount } from "svelte";
    import InteractiveToothV2 from "./InteractiveToothV2.svelte";
    import TreatmentHistoryTable from "./TreatmentHistoryTable.svelte";
    import { ADULT_TEETH_FDI, PEDIATRIC_TEETH_FDI } from "$lib/dental/tooth-data";

    interface Props {
        allAnnotations?: Record<number, any>;
        treatments?: any[];
        selectedTeethFdis?: number[];
        onToothSelect: (fdi: number, event?: MouseEvent) => void;
        onEditTreatment?: (treatment: any) => void;
        patientAge?: number;
    }

    let { 
        allAnnotations = {}, 
        treatments = [], 
        selectedTeethFdis = [], 
        onToothSelect,
        onEditTreatment,
        patientAge = 0
    }: Props = $props();

    let dentitionMode = $state<"adult" | "pediatric" | "mixed">("adult");

    onMount(() => {
        if (patientAge > 0) {
            if (patientAge < 6) dentitionMode = "pediatric";
            else if (patientAge <= 12) dentitionMode = "mixed";
            else dentitionMode = "adult";
        }
    });

    // FDI Groups
    const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
    const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
    const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
    const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

    // Pediatric FDI Groups
    const pedUpperRight = [55, 54, 53, 52, 51];
    const pedUpperLeft = [61, 62, 63, 64, 65];
    const pedLowerRight = [85, 84, 83, 82, 81];
    const pedLowerLeft = [71, 72, 73, 74, 75];

    // Bridge Logic: Group teeth by bridge_id
    const bridges = $derived.by(() => {
        const groups: Record<string, number[]> = {};
        Object.entries(allAnnotations).forEach(([fdiStr, data]: [string, any]) => {
            if (data.bridge_id) {
                if (!groups[data.bridge_id]) groups[data.bridge_id] = [];
                groups[data.bridge_id].push(parseInt(fdiStr));
            }
        });
        return Object.values(groups).filter(g => g.length >= 2);
    });

    // Helper: get bridge connection directions for a tooth
    function getBridgeConnections(fdi: number, row: number[]): { left?: boolean, right?: boolean } {
        const result: { left?: boolean, right?: boolean } = {};
        for (const bridgeGroup of bridges) {
            if (!bridgeGroup.includes(fdi)) continue;
            const idx = row.indexOf(fdi);
            if (idx === -1) continue;
            const prev = row[idx - 1];
            const next = row[idx + 1];
            if (prev !== undefined && bridgeGroup.includes(prev)) result.left = true;
            if (next !== undefined && bridgeGroup.includes(next)) result.right = true;
        }
        return result;
    }
</script>

<div class="carte-pro-layout flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-20">
    <div class="carte-dentaire-container flex flex-col items-center gap-8 p-12 bg-white rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
        
        <!-- Controls & Mode Switcher -->
        <div class="w-full flex items-center justify-between mb-4">
            <div class="flex items-center gap-3 px-6 py-3 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl text-[11px] font-bold text-indigo-600">
                <div class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">i</div>
                <span>{$t('components.carte_dentaire_v2.astuce_maintenez')} <span class="px-1.5 py-0.5 bg-indigo-100 rounded text-indigo-700 mx-0.5 font-black">{$t('components.carte_dentaire_v2.ctrl')}</span> {$t('components.carte_dentaire_v2.et_cliquez_sur_plusieurs')}</span>
            </div>

            <div class="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                <button 
                    onclick={() => dentitionMode = "adult"}
                    class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all {dentitionMode === 'adult' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}"
                >Adulte</button>
                <button 
                    onclick={() => dentitionMode = "pediatric"}
                    class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all {dentitionMode === 'pediatric' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}"
                >Enfant</button>
                <button 
                    onclick={() => dentitionMode = "mixed"}
                    class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all {dentitionMode === 'mixed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}"
                >Mixte</button>
            </div>
        </div>

        <div class="flex flex-col items-center gap-4 w-full">
            <!-- ARCH 1: ADULT SUPERIOR (Shown in Adult & Mixed) -->
            {#if dentitionMode !== "pediatric"}
                <div class="arch-section animate-in fade-in zoom-in duration-300">
                    <div class="arch-header mb-2 flex justify-center">
                        <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{$t('components.carte_dentaire_v2.maxillaire_adulte')}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex gap-1">
                            {#each upperRight as fdi}
                                <InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} bridgeConnections={getBridgeConnections(fdi, upperRight)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} />
                            {/each}
                        </div>
                        <div class="w-px h-16 bg-slate-100 mx-2"></div>
                        <div class="flex gap-1">
                            {#each upperLeft as fdi}
                                <InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} bridgeConnections={getBridgeConnections(fdi, upperLeft)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} />
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            <!-- ARCH 2: CHILD SUPERIOR (Shown in Pediatric & Mixed) -->
            {#if dentitionMode !== "adult"}
                <div class="arch-section animate-in fade-in zoom-in duration-300">
                    <div class="arch-header mb-2 flex justify-center">
                        <span class="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">{$t('components.carte_dentaire_v2.maxillaire_temporaire')}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex gap-1 items-center">
                            {#each pedUpperRight as fdi}
                                <div class="scale-75"><InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} /></div>
                            {/each}
                        </div>
                        <div class="w-px h-12 bg-indigo-50 mx-2"></div>
                        <div class="flex gap-1 items-center">
                            {#each pedUpperLeft as fdi}
                                <div class="scale-75"><InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} /></div>
                            {/each}
                        </div>
                    </div>
                </div>
            {/if}

            <!-- GAP / OCCLUSAL PLANE -->
            <div class="h-px w-full bg-gradient-to-r from-transparent via-slate-100 to-transparent my-4"></div>

            <!-- ARCH 3: CHILD INFERIOR (Shown in Pediatric & Mixed) -->
            {#if dentitionMode !== "adult"}
                <div class="arch-section animate-in fade-in zoom-in duration-300">
                    <div class="flex items-center gap-2">
                        <div class="flex gap-1 items-center">
                            {#each pedLowerRight as fdi}
                                <div class="scale-75"><InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} /></div>
                            {/each}
                        </div>
                        <div class="w-px h-12 bg-indigo-50 mx-2"></div>
                        <div class="flex gap-1 items-center">
                            {#each pedLowerLeft as fdi}
                                <div class="scale-75"><InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} /></div>
                            {/each}
                        </div>
                    </div>
                    <div class="arch-header mt-2 flex justify-center">
                        <span class="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em]">{$t('components.carte_dentaire_v2.mandibule_temporaire')}</span>
                    </div>
                </div>
            {/if}

            <!-- ARCH 4: ADULT INFERIOR (Shown in Adult & Mixed) -->
            {#if dentitionMode !== "pediatric"}
                <div class="arch-section animate-in fade-in zoom-in duration-300">
                    <div class="flex items-center gap-2">
                        <div class="flex gap-1">
                            {#each lowerRight as fdi}
                                <InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} bridgeConnections={getBridgeConnections(fdi, lowerRight)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} />
                            {/each}
                        </div>
                        <div class="w-px h-16 bg-slate-100 mx-2"></div>
                        <div class="flex gap-1">
                            {#each lowerLeft as fdi}
                                <InteractiveToothV2 {fdi} zones={allAnnotations[fdi]?.zones || {}} status={allAnnotations[fdi]?.global_status || ''} selected={selectedTeethFdis.includes(fdi)} bridgeConnections={getBridgeConnections(fdi, lowerLeft)} on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)} />
                            {/each}
                        </div>
                    </div>
                    <div class="arch-header mt-2 flex justify-center">
                        <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{$t('components.carte_dentaire_v2.mandibule_adulte')}</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <!-- INTEGRATED HISTORY TABLE -->
    <div class="animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
        <TreatmentHistoryTable {treatments} onEdit={onEditTreatment} />
    </div>
</div>

<style>
    .carte-dentaire-container {
        min-width: 1000px;
        max-width: fit-content;
        margin: 0 auto;
    }

    .arch-section {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>
