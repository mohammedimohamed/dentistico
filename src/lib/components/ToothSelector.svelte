<script lang="ts">
    interface Props {
        selectedTeeth: string[];
        onToggle: (tooth: string) => void;
    }

    let { selectedTeeth = [], onToggle }: Props = $props();

    let view = $state('adult'); // 'adult' or 'pedo'

    const adultTeeth = {
        upper: {
            right: ['18', '17', '16', '15', '14', '13', '12', '11'],
            left: ['21', '22', '23', '24', '25', '26', '27', '28']
        },
        lower: {
            right: ['48', '47', '46', '45', '44', '43', '42', '41'],
            left: ['31', '32', '33', '34', '35', '36', '37', '38']
        }
    };

    const pedoTeeth = {
        upper: {
            right: ['55', '54', '53', '52', '51'],
            left: ['61', '62', '63', '64', '65']
        },
        lower: {
            right: ['85', '84', '83', '82', '81'],
            left: ['71', '72', '73', '74', '75']
        }
    };

    let currentTeeth = $derived(view === 'adult' ? adultTeeth : pedoTeeth);

    function isSelected(tooth: string) {
        return selectedTeeth.includes(tooth);
    }
</script>

<div class="tooth-selector select-none">
    <div class="flex justify-center mb-4 gap-2">
        <button 
            type="button"
            onclick={() => view = 'adult'}
            class="px-3 py-1 text-xs font-bold rounded-md {view === 'adult' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}"
        >
            Adult (18-48)
        </button>
        <button 
            type="button"
            onclick={() => view = 'pedo'}
            class="px-3 py-1 text-xs font-bold rounded-md {view === 'pedo' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}"
        >
            Pediatric (51-85)
        </button>
    </div>

    <div class="grid grid-rows-2 gap-8 border p-4 rounded-xl bg-gray-50">
        <!-- Upper Arch -->
        <div class="flex justify-center gap-1 border-b pb-4">
            <div class="flex gap-1 border-r pr-2">
                {#each currentTeeth.upper.right as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-8 h-10 flex items-center justify-center rounded border transition-all text-xs font-bold
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-inner' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}"
                    >
                        {tooth}
                    </button>
                {/each}
            </div>
            <div class="flex gap-1 pl-1">
                {#each currentTeeth.upper.left as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-8 h-10 flex items-center justify-center rounded border transition-all text-xs font-bold
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-inner' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}"
                    >
                        {tooth}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Lower Arch -->
        <div class="flex justify-center gap-1">
            <div class="flex gap-1 border-r pr-2">
                {#each currentTeeth.lower.right as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-8 h-10 flex items-center justify-center rounded border transition-all text-xs font-bold
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-inner' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}"
                    >
                        {tooth}
                    </button>
                {/each}
            </div>
            <div class="flex gap-1 pl-1">
                {#each currentTeeth.lower.left as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-8 h-10 flex items-center justify-center rounded border transition-all text-xs font-bold
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-inner' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}"
                    >
                        {tooth}
                    </button>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .tooth-selector {
        max-width: fit-content;
        margin: 0 auto;
    }
</style>
