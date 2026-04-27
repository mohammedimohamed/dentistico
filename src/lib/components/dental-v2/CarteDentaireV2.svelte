<script lang="ts">
    import InteractiveToothV2 from "./InteractiveToothV2.svelte";
    import { ADULT_TEETH_FDI } from "$lib/dental/tooth-data";

    interface Props {
        allAnnotations?: Record<number, any>;
        selectedTeethFdis?: number[];
        onToothSelect: (fdi: number, event?: MouseEvent) => void;
    }

    let { allAnnotations = {}, selectedTeethFdis = [], onToothSelect }: Props = $props();

    // FDI Groups
    const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
    const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
    const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
    const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

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

<div class="carte-viewport">
    <div class="carte-dentaire-container flex flex-col items-center gap-12 p-8 bg-white rounded-[40px] border border-slate-100 shadow-sm">
        
        <!-- Instructional Banner -->
        <div class="flex items-center gap-3 px-6 py-3 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl text-[11px] font-bold text-indigo-600 animate-in fade-in slide-in-from-top-4">
            <div class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">i</div>
            <span>💡 Astuce : Maintenez <span class="px-1.5 py-0.5 bg-indigo-100 rounded text-indigo-700 mx-0.5 font-black">Ctrl</span> et cliquez sur plusieurs dents pour créer un bridge.</span>
        </div>

        <!-- MAXILLAIRE (Upper Arch) -->
        <div class="arch-section">
            <div class="arch-header mb-6 flex justify-center">
                <span class="px-4 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Arcade Supérieure (Maxillaire)</span>
            </div>
            <div class="flex items-center gap-2">
                <!-- Upper Right -->
                <div class="flex gap-1">
                    {#each upperRight as fdi}
                        <InteractiveToothV2 
                            {fdi} 
                            zones={allAnnotations[fdi]?.zones || {}}
                            status={allAnnotations[fdi]?.global_status || ''}
                            selected={selectedTeethFdis.includes(fdi)}
                            bridgeConnections={getBridgeConnections(fdi, upperRight)}
                            on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)}
                        />
                    {/each}
                </div>
                
                <!-- Midline Divider -->
                <div class="w-px h-24 bg-slate-200 mx-4"></div>
                
                <!-- Upper Left -->
                <div class="flex gap-1">
                    {#each upperLeft as fdi}
                        <InteractiveToothV2 
                            {fdi} 
                            zones={allAnnotations[fdi]?.zones || {}}
                            status={allAnnotations[fdi]?.global_status || ''}
                            selected={selectedTeethFdis.includes(fdi)}
                            bridgeConnections={getBridgeConnections(fdi, upperLeft)}
                            on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)}
                        />
                    {/each}
                </div>
            </div>
        </div>

        <!-- MANDIBULE (Lower Arch) -->
        <div class="arch-section">
            <div class="flex items-center gap-2">
                <!-- Lower Right -->
                <div class="flex gap-1">
                    {#each lowerRight as fdi}
                        <InteractiveToothV2 
                            {fdi} 
                            zones={allAnnotations[fdi]?.zones || {}}
                            status={allAnnotations[fdi]?.global_status || ''}
                            selected={selectedTeethFdis.includes(fdi)}
                            bridgeConnections={getBridgeConnections(fdi, lowerRight)}
                            on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)}
                        />
                    {/each}
                </div>
                
                <!-- Midline Divider -->
                <div class="w-px h-24 bg-slate-200 mx-4"></div>
                
                <!-- Lower Left -->
                <div class="flex gap-1">
                    {#each lowerLeft as fdi}
                        <InteractiveToothV2 
                            {fdi} 
                            zones={allAnnotations[fdi]?.zones || {}}
                            status={allAnnotations[fdi]?.global_status || ''}
                            selected={selectedTeethFdis.includes(fdi)}
                            bridgeConnections={getBridgeConnections(fdi, lowerLeft)}
                            on:zoneClick={(e: any) => onToothSelect(fdi, e.detail.originalEvent)}
                        />
                    {/each}
                </div>
            </div>
            <div class="arch-header mt-6 flex justify-center">
                <span class="px-4 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Arcade Inférieure (Mandibule)</span>
            </div>
        </div>

    </div>
</div>

<style>
    .carte-viewport {
        width: 100%;
        overflow-x: auto;
        padding: 20px;
        display: flex;
        justify-content: center;
    }

    .carte-dentaire-container {
        min-width: 1100px; /* Ensure 32 teeth fit */
        max-width: fit-content;
        margin: 0 auto;
        transform-origin: center top;
    }

    @media (max-width: 1400px) {
        .carte-dentaire-container {
            transform: scale(0.9);
        }
    }

    @media (max-width: 1200px) {
        .carte-dentaire-container {
            transform: scale(0.8);
        }
    }

    .arch-section {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>
