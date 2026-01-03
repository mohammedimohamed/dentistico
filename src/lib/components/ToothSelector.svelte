<script lang="ts">
    import { t } from 'svelte-i18n';

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

<div class="tooth-selector select-none font-inter">
    <div class="flex justify-center mb-6 gap-3">
        <button 
            type="button"
            onclick={() => view = 'adult'}
            class="px-5 py-2 text-xs font-black rounded-xl transition-all {view === 'adult' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
        >
            {$t('patient_details.adult')} (18-48)
        </button>
        <button 
            type="button"
            onclick={() => view = 'pedo'}
            class="px-5 py-2 text-xs font-black rounded-xl transition-all {view === 'pedo' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
        >
            {$t('patient_details.child')} (51-85)
        </button>
    </div>

    <div class="grid grid-rows-2 gap-8 border border-gray-100 p-8 rounded-3xl bg-gray-50/50">
        <!-- Upper Arch -->
        <div class="flex justify-center gap-1.5 border-b border-gray-200/50 pb-6">
            <div class="flex gap-1.5 border-inline-end border-gray-200/50 padding-inline-end-3">
                {#each currentTeeth.upper.right as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-9 h-11 flex items-center justify-center rounded-lg border transition-all text-[11px] font-black
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100 scale-105 z-10' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:shadow-sm'}"
                    >
                        {tooth}
                    </button>
                {/each}
            </div>
            <div class="flex gap-1.5 padding-inline-start-1">
                {#each currentTeeth.upper.left as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-9 h-11 flex items-center justify-center rounded-lg border transition-all text-[11px] font-black
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100 scale-105 z-10' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:shadow-sm'}"
                    >
                        {tooth}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Lower Arch -->
        <div class="flex justify-center gap-1.5">
            <div class="flex gap-1.5 border-inline-end border-gray-200/50 padding-inline-end-3">
                {#each currentTeeth.lower.right as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-9 h-11 flex items-center justify-center rounded-lg border transition-all text-[11px] font-black
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100 scale-105 z-10' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:shadow-sm'}"
                    >
                        {tooth}
                    </button>
                {/each}
            </div>
            <div class="flex gap-1.5 padding-inline-start-1">
                {#each currentTeeth.lower.left as tooth}
                    <button 
                        type="button"
                        onclick={() => onToggle(tooth)}
                        class="w-9 h-11 flex items-center justify-center rounded-lg border transition-all text-[11px] font-black
                            {isSelected(tooth) ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100 scale-105 z-10' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:shadow-sm'}"
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

    /* Logical properties for borders and padding */
    :global([dir="rtl"]) .border-inline-end { border-left-width: 1px; }
    :global([dir="ltr"]) .border-inline-end { border-right-width: 1px; }

    :global([dir="rtl"]) .padding-inline-end-3 { padding-left: 0.75rem; }
    :global([dir="ltr"]) .padding-inline-end-3 { padding-right: 0.75rem; }

    :global([dir="rtl"]) .padding-inline-start-1 { padding-right: 0.25rem; }
    :global([dir="ltr"]) .padding-inline-start-1 { padding-left: 0.25rem; }
</style>
