<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';

    let { data }: { data: PageData } = $props();

    let isCreateModalOpen = $state(false);
    let searchInput = $state(data.searchQuery || '');

    function calculateAge(dob: string) {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
</script>

<div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-4 sm:px-0 flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Patient Directory</h1>
        <div class="flex gap-4">
            <a href="/doctor/patients/archived" class="text-sm text-gray-500 hover:text-indigo-600 self-center font-medium">
                View Archived
            </a>
            <button onclick={() => isCreateModalOpen = true} class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all flex items-center gap-2">
                <span>➕</span> New Patient
            </button>
        </div>
    </div>
        <!-- Search -->
        <div class="mb-6 px-4 sm:px-0">
            <form action="/doctor/patients" method="GET" class="relative rounded-md shadow-sm max-w-lg">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span class="text-gray-500 sm:text-sm">🔍</span>
                </div>
                <input 
                    type="text" 
                    name="search" 
                    bind:value={searchInput}
                    class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-3" 
                    placeholder="Search by patient name..."
                >
                <button type="submit" class="absolute inset-y-0 right-0 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-r-md border-l border-gray-300 text-sm font-medium">
                    Search
                </button>
            </form>
        </div>

        {#if data.patients.length === 0}
            <div class="text-center py-12">
                <p class="text-gray-500 text-lg">No patients found.</p>
                {#if data.searchQuery}
                    <a href="/doctor/patients" class="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">Clear search</a>
                {/if}
            </div>
        {:else}
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 px-4 sm:px-0">
                {#each data.patients as patient}
                    <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                        <div class="px-4 py-5 sm:p-6">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg leading-6 font-medium text-gray-900 truncate">
                                    {patient.full_name}
                                </h3>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Age: {calculateAge(patient.date_of_birth)}
                                </span>
                            </div>
                            <div class="mt-4 text-sm text-gray-500 space-y-2">
                                <p class="flex items-center">
                                    📞 <span class="ml-2">{patient.phone}</span>
                                </p>
                                <p class="flex items-center">
                                    📧 <span class="ml-2">{patient.email || 'N/A'}</span>
                                </p>
                            </div>
                            <!-- Quick Indicators -->
                            <div class="mt-4 flex gap-2">
                                {#if patient.allergies && patient.allergies !== 'None'}
                                    <span class="h-2 w-2 rounded-full bg-red-400" title="Has Allergies"></span>
                                {/if}
                                {#if patient.medical_conditions && patient.medical_conditions !== 'None'}
                                    <span class="h-2 w-2 rounded-full bg-yellow-400" title="Medical Conditions"></span>
                                {/if}
                            </div>
                        </div>
                        <div class="bg-gray-50 px-4 py-4 sm:px-6">
                            <a href="/doctor/patients/{patient.id}" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                View Full Profile &rarr;
                            </a>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

    <!-- Create Patient Modal -->
    {#if isCreateModalOpen}
        <div class="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onclick={() => isCreateModalOpen = false}></div>

            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                        <form method="POST" action="?/createPatient" use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') {
                                    isCreateModalOpen = false;
                                    // SvelteKit automatically invalidates load function
                                }
                            };
                        }}>
                            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-h-[80vh] overflow-y-auto">
                                <h3 class="text-lg font-semibold leading-6 text-gray-900 mb-4" id="modal-title">Add New Patient</h3>
                                <div class="space-y-4">
                                    <!-- Personal Information -->
                                    <div class="border-b pb-3">
                                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Personal Information</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label for="full_name" class="block text-sm font-medium text-gray-700">Full Name *</label>
                                                <input type="text" name="full_name" id="full_name" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="date_of_birth" class="block text-sm font-medium text-gray-700">Date of Birth *</label>
                                                <input type="date" name="date_of_birth" id="date_of_birth" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="gender" class="block text-sm font-medium text-gray-700">Gender</label>
                                                <select name="gender" id="gender" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                                    <option value="">Select...</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                    <option value="Prefer not to say">Prefer not to say</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Contact Information -->
                                    <div class="border-b pb-3">
                                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label for="phone" class="block text-sm font-medium text-gray-700">Phone</label>
                                                <input type="tel" name="phone" id="phone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                                                <input type="email" name="email" id="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="secondary_phone" class="block text-sm font-medium text-gray-700">Secondary Phone</label>
                                                <input type="tel" name="secondary_phone" id="secondary_phone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="secondary_email" class="block text-sm font-medium text-gray-700">Secondary Email</label>
                                                <input type="email" name="secondary_email" id="secondary_email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Address -->
                                    <div class="border-b pb-3">
                                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Address</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div class="md:col-span-2">
                                                <label for="address" class="block text-sm font-medium text-gray-700">Street Address</label>
                                                <input type="text" name="address" id="address" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="city" class="block text-sm font-medium text-gray-700">City</label>
                                                <input type="text" name="city" id="city" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="postal_code" class="block text-sm font-medium text-gray-700">Postal Code</label>
                                                <input type="text" name="postal_code" id="postal_code" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Emergency Contact -->
                                    <div class="border-b pb-3">
                                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label for="emergency_contact_name" class="block text-sm font-medium text-gray-700">Name</label>
                                                <input type="text" name="emergency_contact_name" id="emergency_contact_name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="emergency_contact_phone" class="block text-sm font-medium text-gray-700">Phone</label>
                                                <input type="tel" name="emergency_contact_phone" id="emergency_contact_phone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="emergency_contact_relationship" class="block text-sm font-medium text-gray-700">Relationship</label>
                                                <input type="text" name="emergency_contact_relationship" id="emergency_contact_relationship" placeholder="e.g., Spouse, Parent" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Insurance -->
                                    <div class="border-b pb-3">
                                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Insurance</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label for="insurance_provider" class="block text-sm font-medium text-gray-700">Provider</label>
                                                <input type="text" name="insurance_provider" id="insurance_provider" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                            <div>
                                                <label for="insurance_number" class="block text-sm font-medium text-gray-700">Policy Number</label>
                                                <input type="text" name="insurance_number" id="insurance_number" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="submit" class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto">Create</button>
                                <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onclick={() => isCreateModalOpen = false}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
