<script lang="ts">
    import { enhance } from '$app/forms';
    import { t } from 'svelte-i18n';

    let { medications, patientId, doctorId, onPrescriptionCreated } = $props();

    let searchTerm = $state('');
    let selectedItems = $state<any[]>([]);
    let notes = $state('');
    let showSuggestions = $state(false);

    let filteredMedications = $derived(
        medications.filter((m: any) => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    function addItem(med: any) {
        selectedItems.push({
            medication_id: med.id,
            medication_name: med.name,
            dosage: med.default_dosage || '',
            duration: '',
            instructions: med.instructions || ''
        });
        searchTerm = '';
        showSuggestions = false;
    }

    function addCustomItem() {
        if (!searchTerm) return;
        selectedItems.push({
            medication_id: null,
            medication_name: searchTerm,
            dosage: '',
            duration: '',
            instructions: ''
        });
        searchTerm = '';
        showSuggestions = false;
    }

    function removeItem(index: number) {
        selectedItems.splice(index, 1);
    }
</script>

<div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-start font-inter">
    <h3 class="text-xl font-bold text-gray-900 mb-6">{$t('patient_details.prescription_new_title')}</h3>

    <!-- Medik Search -->
    <div class="relative mb-8">
        <label for="med-search" class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{$t('patient_details.prescription_search_meds')}</label>
        <div class="flex gap-3">
            <div class="relative flex-grow">
                <input 
                    type="text" 
                    id="med-search"
                    bind:value={searchTerm}
                    onfocus={() => showSuggestions = true}
                    class="block w-full border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                    placeholder="{$t('patient_details.prescription_search_placeholder')}"
                />
                {#if showSuggestions && searchTerm}
                    <div class="absolute z-20 mt-2 w-full bg-white shadow-2xl rounded-2xl py-2 text-base ring-1 ring-gray-100 overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                        {#each filteredMedications as med}
                            <button 
                                class="w-full text-start px-4 py-3 hover:bg-gray-50 flex flex-col gap-0.5 transition-colors border-b border-gray-50 last:border-0"
                                onclick={() => addItem(med)}
                            >
                                <span class="font-bold text-gray-900">{med.name}</span>
                                {#if med.default_dosage}
                                    <span class="text-xs text-gray-500">{med.default_dosage}</span>
                                {/if}
                            </button>
                        {/each}
                        {#if filteredMedications.length === 0}
                            <button 
                                class="w-full text-start px-4 py-4 text-indigo-600 font-bold hover:bg-indigo-50/50 transition-colors"
                                onclick={addCustomItem}
                            >
                                <span class="text-sm">{$t('patient_details.prescription_add_custom', { values: { name: searchTerm } })}</span>
                            </button>
                        {/if}
                    </div>
                {/if}
            </div>
            <button 
                onclick={addCustomItem}
                disabled={!searchTerm}
                class="bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all text-sm disabled:opacity-50 disabled:shadow-none"
            >
                {$t('common.add')}
            </button>
        </div>
    </div>

    <!-- Basket -->
    {#if selectedItems.length > 0}
        <div class="space-y-6 mb-8">
            {#each selectedItems as item, i}
                <div class="p-6 bg-gray-50/50 rounded-2xl border border-gray-100 relative group transition-all hover:bg-white hover:shadow-md">
                    <button 
                        onclick={() => removeItem(i)}
                        class="absolute top-4 inset-inline-end-4 text-gray-300 hover:text-red-500 transition-colors"
                    >
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="md:col-span-1">
                            <h4 class="text-lg font-black text-indigo-600 mb-1">{item.medication_name}</h4>
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{$t('patient_details.prescription_item_medication')}</span>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{$t('patient_details.prescription_dosage')}</label>
                            <input 
                                type="text" 
                                bind:value={item.dosage}
                                class="block w-full border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 border p-2.5 text-sm font-medium"
                                placeholder="{$t('patient_details.prescription_dosage_placeholder')}"
                            />
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{$t('patient_details.prescription_duration')}</label>
                            <input 
                                type="text" 
                                bind:value={item.duration}
                                class="block w-full border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 border p-2.5 text-sm font-medium"
                                placeholder="{$t('patient_details.prescription_duration_placeholder')}"
                            />
                        </div>
                        <div class="md:col-span-3">
                            <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{$t('patient_details.prescription_instructions')}</label>
                            <input 
                                type="text" 
                                bind:value={item.instructions}
                                class="block w-full border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 border p-2.5 text-sm font-medium"
                                placeholder="{$t('patient_details.prescription_instructions_placeholder')}"
                            />
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <div class="mb-8">
            <label for="prescription-notes" class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{$t('patient_details.prescription_notes_label')}</label>
            <textarea 
                id="prescription-notes"
                bind:value={notes}
                rows="3"
                class="block w-full border-gray-200 rounded-2xl bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium py-3 px-4 border"
                placeholder="{$t('patient_details.prescription_notes_placeholder')}"
            ></textarea>
        </div>

        <form 
            action="?/createPrescription" 
            method="POST" 
            use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        selectedItems = [];
                        notes = '';
                        onPrescriptionCreated();
                    }
                };
            }}
        >
            <input type="hidden" name="items" value={JSON.stringify(selectedItems)} />
            <input type="hidden" name="notes" value={notes} />
            <div class="flex justify-end">
                <button 
                    type="submit"
                    class="bg-indigo-600 text-white px-10 py-4 rounded-2xl hover:bg-indigo-700 font-black shadow-xl shadow-indigo-100 transition-all text-base"
                >
                    {$t('patient_details.prescription_generate_button')}
                </button>
            </div>
        </form>
    {:else}
        <div class="text-center py-16 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-3xl">💊</div>
            <p class="text-gray-400 font-bold">{$t('patient_details.prescription_empty_prompt')}</p>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }

    /* Logical positioning for close button */
    :global([dir="rtl"]) .inset-inline-end-4 { left: 1rem; }
    :global([dir="ltr"]) .inset-inline-end-4 { right: 1rem; }
</style>
