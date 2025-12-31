<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from '../../routes/doctor/patients/[id]/$types';

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

<div class="bg-white p-6 rounded-lg shadow border border-gray-200">
    <h3 class="text-xl font-bold text-gray-900 mb-6">Nouvelle Ordonnance</h3>

    <!-- Medik Search -->
    <div class="relative mb-6">
        <label for="med-search" class="block text-sm font-medium text-gray-700 mb-1">Rechercher un médicament</label>
        <div class="flex gap-2">
            <div class="relative flex-grow">
                <input 
                    type="text" 
                    id="med-search"
                    bind:value={searchTerm}
                    onfocus={() => showSuggestions = true}
                    class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Tapez le nom d'un médicament..."
                />
                {#if showSuggestions && searchTerm}
                    <div class="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        {#each filteredMedications as med}
                            <button 
                                class="w-full text-left px-4 py-2 hover:bg-indigo-600 hover:text-white"
                                onclick={() => addItem(med)}
                            >
                                {med.name} <span class="text-xs opacity-50">({med.default_dosage})</span>
                            </button>
                        {/each}
                        {#if filteredMedications.length === 0}
                            <button 
                                class="w-full text-left px-4 py-2 text-indigo-600 italic hover:bg-indigo-50"
                                onclick={addCustomItem}
                            >
                                Ajouter "{searchTerm}" comme médicament personnalisé
                            </button>
                        {/if}
                    </div>
                {/if}
            </div>
            <button 
                onclick={addCustomItem}
                disabled={!searchTerm}
                class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                Ajouter
            </button>
        </div>
    </div>

    <!-- Basket -->
    {#if selectedItems.length > 0}
        <div class="space-y-4 mb-6">
            {#each selectedItems as item, i}
                <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                    <button 
                        onclick={() => removeItem(i)}
                        class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="md:col-span-1">
                            <p class="text-sm font-bold text-gray-900">{item.medication_name}</p>
                            <p class="text-xs text-gray-500">Médicament</p>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500">Posologie</label>
                            <input 
                                type="text" 
                                bind:value={item.dosage}
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="ex: 1 comprimé 3x/jour"
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500">Durée</label>
                            <input 
                                type="text" 
                                bind:value={item.duration}
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="ex: 7 jours"
                            />
                        </div>
                        <div class="md:col-span-3">
                            <label class="block text-xs font-medium text-gray-500">Instructions complémentaires</label>
                            <input 
                                type="text" 
                                bind:value={item.instructions}
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="ex: Pendant les repas"
                            />
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <div class="mb-6">
            <label for="prescription-notes" class="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea 
                id="prescription-notes"
                bind:value={notes}
                rows="2"
                class="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Instructions générales pour l'ordonnance..."
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
                    class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Générer l'ordonnance
                </button>
            </div>
        </form>
    {:else}
        <div class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="mt-2 text-sm text-gray-500">Ajoutez des médicaments pour commencer l'ordonnance.</p>
        </div>
    {/if}
</div>
