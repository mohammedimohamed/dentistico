<script lang="ts">
    /**
     * DentalChart Component
     * Renders a visual odontogram using SVG.
     * Supports Adult (11-48) and Pediatric (51-85) numbering.
     */
    
    interface ToothData {
        treatments: string[];
        color: string;
        notes: string;
    }

    interface Props {
        teethData: Record<string, ToothData>;
        isPediatric?: boolean;
        onToothClick?: (toothNumber: string) => void;
    }

    let { teethData = {}, isPediatric = false, onToothClick }: Props = $props();

    // Adult teeth numbering (FDI)
    const adultUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    const adultLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

    // Pediatric teeth numbering (FDI)
    const pedUpper = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
    const pedLower = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

    const upperRow = $derived(isPediatric ? pedUpper : adultUpper);
    const lowerRow = $derived(isPediatric ? pedLower : adultLower);

    function getToothColor(num: number) {
        return teethData[`tooth_${num}`]?.color || '#ffffff';
    }
</script>

<div class="dental-chart bg-white p-6 rounded-xl shadow-inner border border-gray-100 overflow-x-auto">
    <div class="min-w-[800px] flex flex-col gap-8 items-center">
        <!-- Upper Row -->
        <div class="flex gap-2">
            {#each upperRow as num}
                <button 
                    onclick={() => onToothClick?.(num.toString())}
                    class="tooth-btn group relative flex flex-col items-center"
                >
                    <span class="text-[10px] font-bold text-gray-400 mb-1 group-hover:text-indigo-600 transition-colors">{num}</span>
                    <div 
                        class="w-10 h-14 border-2 rounded-t-lg transition-all transform hover:scale-105 shadow-sm"
                        style="background-color: {getToothColor(num)}; border-color: {getToothColor(num) === '#ffffff' ? '#e2e8f0' : getToothColor(num)}"
                    >
                        {#if teethData[`tooth_${num}`]?.treatments?.length}
                            <div class="absolute inset-0 flex items-center justify-center">
                                <span class="text-[10px] font-bold opacity-30">✓</span>
                            </div>
                        {/if}
                    </div>
                    
                    <!-- Tooltip -->
                    {#if teethData[`tooth_${num}`]?.notes}
                        <div class="absolute bottom-full mb-2 hidden group-hover:block z-20 w-32 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg">
                            {teethData[`tooth_${num}`].notes}
                        </div>
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Middle Divider -->
        <div class="w-full h-px bg-gray-100 relative">
            <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Occlusal Plane</span>
        </div>

        <!-- Lower Row -->
        <div class="flex gap-2">
            {#each lowerRow as num}
                <button 
                    onclick={() => onToothClick?.(num.toString())}
                    class="tooth-btn group relative flex flex-col items-center"
                >
                    <div 
                        class="w-10 h-14 border-2 rounded-b-lg transition-all transform hover:scale-105 shadow-sm"
                        style="background-color: {getToothColor(num)}; border-color: {getToothColor(num) === '#ffffff' ? '#e2e8f0' : getToothColor(num)}"
                    >
                        {#if teethData[`tooth_${num}`]?.treatments?.length}
                            <div class="absolute inset-0 flex items-center justify-center">
                                <span class="text-[10px] font-bold opacity-30">✓</span>
                            </div>
                        {/if}
                    </div>
                    <span class="text-[10px] font-bold text-gray-400 mt-1 group-hover:text-indigo-600 transition-colors">{num}</span>

                    <!-- Tooltip -->
                    {#if teethData[`tooth_${num}`]?.notes}
                        <div class="absolute top-full mt-2 hidden group-hover:block z-20 w-32 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg">
                            {teethData[`tooth_${num}`].notes}
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Legend -->
    <div class="mt-8 flex flex-wrap gap-4 justify-center border-t pt-4">
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-red-500 rounded-sm"></div>
            <span class="text-[10px] text-gray-600 font-medium">Critical / Extraction</span>
        </div>
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span class="text-[10px] text-gray-600 font-medium">Restoration / Filling</span>
        </div>
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span class="text-[10px] text-gray-600 font-medium">Prosthesis / Crown</span>
        </div>
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-yellow-500 rounded-sm"></div>
            <span class="text-[10px] text-gray-600 font-medium">Planned</span>
        </div>
    </div>
</div>

<style>
    .tooth-btn:hover div {
        border-color: #6366f1 !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
</style>
