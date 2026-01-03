<script lang="ts">
    import Sidebar from '$lib/components/Sidebar.svelte';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';

    let { data }: { data: any } = $props();

    const doctorNav = [
        { label: 'Dashboard', href: '/doctor/dashboard', icon: '📊' },
        { label: 'Patients', href: '/doctor/patients', icon: '👥' },
        { label: 'Stock', href: '/inventory', icon: '📦' },
        { label: 'Medications', href: '/doctor/settings/medications', icon: '💊' }
    ];

    const assistantNav = [
        { label: 'Schedule', href: '/assistant/dashboard', icon: '📅' },
        { label: 'Inventory', href: '/inventory', icon: '📦' },
        { label: 'Invoices', href: '/assistant/invoices', icon: '📄' }
    ];

    const adminNav = [
        { label: 'Admin Dashboard', href: '/admin', icon: '📊' },
        { label: 'User Management', href: '/admin/users', icon: '👥' },
        { label: 'System Settings', href: '/admin/settings', icon: '⚙️' },
        { label: 'Inventory', href: '/inventory', icon: '📦' }
    ];

    const navItems = $derived(
        data.user.role === 'doctor' ? doctorNav : 
        data.user.role === 'admin' ? adminNav : 
        assistantNav
    );

    let isMoveModalOpen = $state(false);
    let moveType = $state('in');
    let selectedItem = $state<any>(null);

    function openMoveModal(item: any, type: 'in' | 'out') {
        selectedItem = item;
        moveType = type;
        isMoveModalOpen = true;
    }
</script>

<div class="flex min-h-screen bg-gray-50 overflow-hidden">
    <Sidebar 
        items={navItems} 
        title="Dentistico" 
        userName={data.user.full_name} 
    />

    <div class="flex-1 flex flex-col overflow-hidden">
        <header class="bg-white shadow-sm border-b border-gray-200 py-4 px-8 flex justify-between items-center">
            <h1 class="text-xl font-bold text-gray-900">Inventory & Stock House</h1>
            <div class="flex items-center gap-4">
                <span class="text-sm text-gray-500 italic uppercase tracking-widest font-bold text-[10px] px-2 py-1 rounded {data.user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'}">
                    Portal: {data.user.role}
                </span>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Inventaire Actuel</h3>
                        <p class="mt-1 max-w-2xl text-sm text-gray-500">Suivi des consommables et fournitures.</p>
                    </div>
                </div>

                <div class="border-t border-gray-200 overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unité</th>
                                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            {#each data.inventory as item}
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-bold text-gray-900">{item.name}</div>
                                        <div class="text-xs text-gray-500">REF: {item.sku || 'N/A'}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.category || '-'}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-center">
                                        <span class="text-lg font-bold {item.current_quantity <= item.min_threshold ? 'text-red-600' : 'text-gray-900'}">
                                            {item.current_quantity}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.unit}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-center">
                                        {#if item.current_quantity <= item.min_threshold}
                                            <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 animate-pulse">
                                                Stock Bas
                                            </span>
                                        {:else}
                                            <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                OK
                                            </span>
                                        {/if}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onclick={() => openMoveModal(item, 'in')}
                                            class="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            + Réappro
                                        </button>
                                        <button 
                                            onclick={() => openMoveModal(item, 'out')}
                                            class="text-orange-600 hover:text-orange-900"
                                        >
                                            - Sortie
                                        </button>
                                    </td>
                                </tr>
                            {:else}
                                <tr>
                                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                                        L'inventaire est vide.
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>

        {#if isMoveModalOpen && selectedItem}
            <div class="relative z-10" role="dialog" aria-modal="true">
                <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onclick={() => isMoveModalOpen = false}></div>
                <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div class="flex min-h-full items-center justify-center p-4">
                        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:w-full sm:max-w-md">
                            <form method="POST" action={moveType === 'in' ? '?/addStock' : '?/removeStock'} use:enhance={() => {
                                return async ({ result }) => {
                                    if (result.type === 'success') isMoveModalOpen = false;
                                };
                            }}>
                                <input type="hidden" name="item_id" value={selectedItem.id}>
                                <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
                                    <h3 class="text-xl font-bold text-gray-900 mb-4">
                                        {moveType === 'in' ? 'Ajouter du Stock' : 'Enregistrer une Sortie'}
                                    </h3>
                                    <p class="text-sm text-gray-500 mb-6">
                                        Article : <span class="font-bold text-gray-900">{selectedItem.name}</span>
                                    </p>

                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Quantité ({selectedItem.unit})</label>
                                            <input type="number" step="0.01" name="quantity" required class="mt-1 block w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Motif / Commentaire</label>
                                            <input type="text" name="reason" placeholder={moveType === 'in' ? 'ex: Commande n°45' : 'ex: Chirurgie patient X'} class="mt-1 block w-full border p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
                                        </div>
                                    </div>
                                </div>
                                <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    <button type="submit" class="inline-flex w-full justify-center rounded-md {moveType === 'in' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700'} px-4 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto">
                                        Confirmer
                                    </button>
                                    <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onclick={() => isMoveModalOpen = false}>
                                        Annuler
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
