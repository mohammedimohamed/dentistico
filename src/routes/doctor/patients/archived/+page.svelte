<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import { t } from 'svelte-i18n';

    let { data }: { data: PageData } = $props();
    let searchQuery = $state('');

    function getFilteredPatients() {
        if (!searchQuery) return data.patients;
        return data.patients.filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
</script>

<div class="min-h-screen bg-gray-50 pb-12">
    <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div class="text-start">
                <a href="/doctor/patients" class="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center group">
                    <span class="margin-inline-end-2 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform inline-block">&larr;</span> 
                    {$t('patients.back_to_active')}
                </a>
                <h1 class="text-3xl font-bold text-gray-900 mt-4">{$t('patients.archived_directory')}</h1>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-start">
        <div class="bg-white shadow-sm overflow-hidden rounded-3xl border border-gray-100 mb-8">
            <div class="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center gap-4">
                <span class="text-xl">🔍</span>
                <input 
                    type="text" 
                    bind:value={searchQuery} 
                    placeholder="{$t('patients.search_placeholder')}" 
                    class="block w-full bg-transparent border-none focus:ring-0 font-medium text-gray-900"
                >
            </div>
            
            <ul class="divide-y divide-gray-100">
                {#each getFilteredPatients() as patient}
                    <li class="px-6 py-6 hover:bg-gray-50/50 transition-all">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 class="text-lg font-bold text-gray-900">{patient.full_name}</h3>
                                <div class="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 font-medium">
                                    <span class="flex items-center gap-1.5">
                                        <span class="text-base text-gray-400">📞</span> {patient.phone || $t('common.none')}
                                    </span>
                                    <span class="flex items-center gap-1.5">
                                        <span class="text-base text-gray-400">✉️</span> {patient.email || $t('common.none')}
                                    </span>
                                </div>
                                <p class="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">
                                    {$t('patients.archived_on')}: {patient.last_updated || 'Unknown'}
                                </p>
                            </div>
                            <div class="flex items-center gap-3 w-full md:w-auto">
                                <a href="/doctor/patients/{patient.id}" class="flex-1 md:flex-none text-center bg-white text-gray-700 border border-gray-200 px-6 py-2 rounded-xl hover:bg-gray-50 font-bold transition-all text-sm">
                                    {$t('patients.view_profile')}
                                </a>
                                <form method="POST" action="?/unarchivePatient" use:enhance class="flex-1 md:flex-none">
                                    <input type="hidden" name="id" value={patient.id}>
                                    <button type="submit" class="w-full bg-green-50 text-green-700 border border-green-200 px-6 py-2 rounded-xl hover:bg-green-100 font-bold transition-all text-sm">
                                        {$t('patient_details.unarchive')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </li>
                {:else}
                    <li class="px-6 py-24 text-center text-gray-400 font-bold">
                        <p class="mb-4 text-4xl opacity-20">📁</p>
                        {$t('patients.no_archived_patients')}
                    </li>
                {/each}
            </ul>
        </div>
    </main>
</div>

<style>
    /* Logical spacing */
    :global([dir="rtl"]) .margin-inline-end-2 { margin-left: 0.5rem; }
    :global([dir="ltr"]) .margin-inline-end-2 { margin-right: 0.5rem; }
</style>
