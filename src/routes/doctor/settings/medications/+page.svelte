<script lang="ts">
    import { enhance } from '$app/forms';
    import { page } from '$app/state';
    
    let { data } = $props();
    let showAddModal = $state(false);
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-900">Bibliothèque de Médicaments</h1>
            <p class="mt-2 text-sm text-gray-600">Gérez vos médicaments favoris et posologies par défaut.</p>
        </div>
        <button 
            onclick={() => showAddModal = true}
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un médicament
        </button>
    </div>

    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médicament</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage par défaut</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructions</th>
                    <th scope="col" class="relative px-6 py-3">
                        <span class="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                {#each data.medications as medication}
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">{medication.name}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-500">{medication.default_dosage || '-'}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="text-sm text-gray-500 line-clamp-1">{medication.instructions || '-'}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <form action="?/deleteMedication" method="POST" use:enhance>
                                <input type="hidden" name="id" value={medication.id} />
                                <button type="submit" class="text-red-600 hover:text-red-900 ml-4">Supprimer</button>
                            </form>
                        </td>
                    </tr>
                {/each}
                {#if data.medications.length === 0}
                    <tr>
                        <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                            Aucun médicament enregistré. Commencez par en ajouter un.
                        </td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>

    {#if showAddModal}
        <div class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onclick={() => showAddModal = false}></div>

                <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <div>
                        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                            <svg class="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div class="mt-3 text-center sm:mt-5">
                            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">Nouveau Médicament</h3>
                        </div>
                    </div>
                    <form action="?/addMedication" method="POST" use:enhance={() => {
                        return async ({ result }) => {
                            if (result.type === 'success') {
                                showAddModal = false;
                            }
                        };
                    }} class="mt-5 sm:mt-6 space-y-4">
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-700">Nom du médicament</label>
                            <input type="text" name="name" id="name" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="ex: Amoxicilline">
                        </div>
                        <div>
                            <label for="default_dosage" class="block text-sm font-medium text-gray-700">Dosage par défaut</label>
                            <input type="text" name="default_dosage" id="default_dosage" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="ex: 1g">
                        </div>
                        <div>
                            <label for="instructions" class="block text-sm font-medium text-gray-700">Instructions par défaut</label>
                            <textarea name="instructions" id="instructions" rows="3" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="ex: 1 comprimé matin et soir"></textarea>
                        </div>
                        <div class="mt-5 sm:mt-6 flex space-x-3">
                            <button type="button" onclick={() => showAddModal = false} class="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm">
                                Annuler
                            </button>
                            <button type="submit" class="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm">
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    {/if}
</div>
