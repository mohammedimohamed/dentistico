<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';

    let { data }: { data: PageData } = $props();
    let searchQuery = $state('');

    function getFilteredPatients() {
        if (!searchQuery) return data.patients;
        return data.patients.filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
</script>

<div class="min-h-screen bg-gray-50 pb-12">
    <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
                <a href="/doctor/patients" class="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to Active Patients</a>
                <h1 class="text-3xl font-bold text-gray-900 mt-2">Archived Patients</h1>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <div class="px-4 py-5 border-b border-gray-200">
                <input 
                    type="text" 
                    bind:value={searchQuery} 
                    placeholder="Search archived patients..." 
                    class="w-full border p-2 rounded-md"
                >
            </div>
            
            <ul class="divide-y divide-gray-200">
                {#each getFilteredPatients() as patient}
                    <li class="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-indigo-600">{patient.full_name}</p>
                            <p class="text-sm text-gray-500">
                                {patient.phone || 'No phone'} • {patient.email || 'No email'}
                            </p>
                            <p class="text-xs text-gray-400 mt-1">Archived on: {patient.last_updated || 'Unknown'}</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <a href="/doctor/patients/{patient.id}" class="text-sm text-indigo-600 hover:text-indigo-900">View History</a>
                            <form method="POST" action="?/unarchivePatient" use:enhance>
                                <input type="hidden" name="id" value={patient.id}>
                                <button type="submit" class="text-sm bg-green-50 text-green-700 px-3 py-1 rounded hover:bg-green-100 border border-green-200">
                                    Unarchive
                                </button>
                            </form>
                        </div>
                    </li>
                {:else}
                    <li class="px-6 py-12 text-center text-gray-500">
                        No archived patients found.
                    </li>
                {/each}
            </ul>
        </div>
    </main>
</div>
