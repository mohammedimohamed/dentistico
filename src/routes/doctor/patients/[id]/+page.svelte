<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import { APP_CONFIG } from '$lib/config/app.config';

    let { data }: { data: PageData } = $props();
    let activeTab = $state('overview');
    let isEditModalOpen = $state(false);
    let isTreatmentModalOpen = $state(false);
    let formError = $state<string | null>(null);
    let formSuccess = $state<string | null>(null);

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'medical', label: 'Medical History' },
        { id: 'dental', label: 'Dental Records' },
        { id: 'appointments', label: 'Appointments' },
        { id: 'prescriptions', label: 'Ordonnances' },
        { id: 'financial', label: 'Financial' }
    ];

    import PrescriptionBuilder from '$lib/components/PrescriptionBuilder.svelte';
    import ToothSelector from '$lib/components/ToothSelector.svelte';
    import DentalChart from '$lib/components/DentalChart.svelte';
    let showPrescriptionBuilder = $state(false);
    let selectedTreatmentsForInvoice = $state<number[]>([]);
    let isInvoiceModalOpen = $state(false);
    let isPaymentModalOpen = $state(false);
    let selectedInvoice = $state<any>(null);

    let isToothModalOpen = $state(false);
    let selectedTooth = $state<string | null>(null);
    let toothForm = $state({
        treatments: '',
        color: '#ffffff',
        notes: ''
    });

    let selectedTeeth = $state<string[]>([]);
    function toggleTooth(tooth: string) {
        if (selectedTeeth.includes(tooth)) {
            selectedTeeth = selectedTeeth.filter(t => t !== tooth);
        } else {
            selectedTeeth = [...selectedTeeth, tooth];
        }
    }

    function calculateAge(dob: string) {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    const age = $derived(calculateAge(data.patient.date_of_birth));
    const isChild = $derived(typeof age === 'number' && age < 18);

    function openToothModal(toothNum: string) {
        selectedTooth = toothNum;
        const currentData = JSON.parse(data.patient.teeth_treatments || '{}')[`tooth_${toothNum}`] || {};
        toothForm = {
            treatments: (currentData.treatments || []).join(', '),
            color: currentData.color || '#ffffff',
            notes: currentData.notes || ''
        };
        isToothModalOpen = true;
    }
</script>

<div class="min-h-screen bg-gray-50 pb-12">
    <!-- Header -->
    <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-start">
            <div>
                <div class="flex items-center gap-2">
                    <a href="/doctor/patients" class="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to List</a>
                </div>
                <div class="flex items-center gap-2">
                    <h1 class="text-3xl font-bold text-gray-900 mt-2">{data.patient.full_name}</h1>
                    {#if data.patient.is_archived}
                        <span class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            Archived
                        </span>
                    {/if}
                    <span class="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {isChild ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                        {isChild ? 'Child' : 'Adult'}
                    </span>
                </div>
                <p class="text-gray-500">Patient ID: #{data.patient.id} • DOB: {data.patient.date_of_birth} ({age} yrs)</p>
            </div>
            <div class="flex gap-3">
                <button onclick={() => isTreatmentModalOpen = true} class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium">
                    + Add Treatment
                </button>
                <button onclick={() => isEditModalOpen = true} class="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 font-medium">
                    Edit Profile
                </button>
                {#if data.patient.is_archived}
                    <form method="POST" action="?/unarchivePatient" use:enhance>
                        <button type="submit" class="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-md hover:bg-green-100 font-medium">
                            Unarchive Patient
                        </button>
                    </form>
                {:else}
                    <form method="POST" action="?/archivePatient" use:enhance={() => {
                        return async ({ result }) => {
                            if (result.type === 'failure') {
                                alert(result.data?.error || 'Failed to archive patient');
                            }
                        };
                    }}>
                        <button type="submit" class="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-md hover:bg-red-100 font-medium" onclick={(e) => !confirm('Archive this patient? They must have 0 balance and no future appointments.') && e.preventDefault()}>
                            Archive Patient
                        </button>
                    </form>
                {/if}
            </div>
        </div>
        
        <!-- Tabs -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                {#each tabs as tab}
                    <button 
                        class="{activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                        onclick={() => activeTab = tab.id}
                    >
                        {tab.label}
                    </button>
                {/each}
            </nav>
        </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        
        <!-- OVERVIEW TAB -->
        {#if activeTab === 'overview'}
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                <!-- Personal Info -->
                <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div class="px-4 py-5 sm:px-6">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
                    </div>
                    <div class="border-t border-gray-200 px-4 py-5 sm:p-0">
                        <dl class="sm:divide-y sm:divide-gray-200">
                            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">Full name</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{data.patient.full_name}</dd>
                            </div>
                            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">Gender</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{data.patient.gender || 'N/A'}</dd>
                            </div>
                            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">Phone</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {#if data.patient.phone}
                                        <a href="tel:{data.patient.phone}" class="text-indigo-600 hover:text-indigo-900">{data.patient.phone}</a>
                                    {:else}
                                        <span class="text-gray-400">N/A</span>
                                    {/if}
                                    
                                    {#if data.patient.secondary_phone}
                                        <div class="mt-1 flex items-center gap-2">
                                            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Secondary</span>
                                            <a href="tel:{data.patient.secondary_phone}" class="text-indigo-600 hover:text-indigo-900 text-sm">{data.patient.secondary_phone}</a>
                                        </div>
                                    {/if}
                                </dd>
                            </div>
                            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">Email</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {#if data.patient.email}
                                        <a href="mailto:{data.patient.email}" class="text-indigo-600 hover:text-indigo-900">{data.patient.email}</a>
                                    {:else}
                                        <span class="text-gray-400">N/A</span>
                                    {/if}

                                    {#if data.patient.secondary_email}
                                        <div class="mt-1 flex items-center gap-2">
                                            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Secondary</span>
                                            <a href="mailto:{data.patient.secondary_email}" class="text-indigo-600 hover:text-indigo-900 text-sm">{data.patient.secondary_email}</a>
                                        </div>
                                    {/if}
                                </dd>
                            </div>
                            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">Address</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {data.patient.address || ''}<br>
                                    {data.patient.city || ''} {data.patient.postal_code || ''}
                                </dd>
                            </div>
                            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">Emergency Contact</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {data.patient.emergency_contact_name || 'N/A'}
                                    {#if data.patient.emergency_contact_relationship}
                                        <span class="text-gray-500"> ({data.patient.emergency_contact_relationship})</span>
                                    {/if}
                                    <br>
                                    <span class="text-gray-500">{data.patient.emergency_contact_phone || ''}</span>
                                </dd>
                            </div>
                            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">Insurance</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {#if data.patient.insurance_provider}
                                        {data.patient.insurance_provider}
                                        {#if data.patient.insurance_number}
                                            <span class="text-gray-500"> - {data.patient.insurance_number}</span>
                                        {/if}
                                    {:else}
                                        <span class="text-gray-400">N/A</span>
                                    {/if}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <!-- Snapshot / Alerts -->
                <div class="space-y-6">
                    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div class="px-4 py-5 sm:px-6">
                            <h3 class="text-lg leading-6 font-medium text-gray-900">Medical Alerts</h3>
                        </div>
                        <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
                            {#if data.patient.allergies}
                                <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                    <div class="flex">
                                        <div class="flex-shrink-0">⚠️</div>
                                        <div class="ml-3">
                                            <h3 class="text-sm font-medium text-red-800">Allergies</h3>
                                            <div class="mt-2 text-sm text-red-700">
                                                <p>{data.patient.allergies}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {:else}
                                <p class="text-green-600">No known allergies.</p>
                            {/if}

                            {#if data.patient.medical_conditions}
                                <div class="mt-4">
                                    <h4 class="text-sm font-medium text-gray-500">Conditions</h4>
                                    <p class="mt-1 text-sm text-gray-900">{data.patient.medical_conditions}</p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                        <div class="px-4 py-5 sm:px-6">
                            <h3 class="text-lg leading-6 font-medium text-gray-900">Financial Snapshot</h3>
                        </div>
                        <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
                            <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                <div class="sm:col-span-1">
                                    <dt class="text-sm font-medium text-gray-500">Total Billed</dt>
                                    <dd class="mt-1 text-2xl font-semibold text-gray-900">{APP_CONFIG.currencySymbol}{data.balance.total_billed.toFixed(2)}</dd>
                                </div>
                                <div class="sm:col-span-1">
                                    <dt class="text-sm font-medium text-gray-500">Balance Due</dt>
                                    <dd class="mt-1 text-2xl font-semibold {data.balance.balance_due > 0 ? 'text-red-600' : 'text-green-600'}">
                                        {APP_CONFIG.currencySymbol}{data.balance.balance_due.toFixed(2)}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- MEDICAL TAB -->
        {#if activeTab === 'medical'}
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Comprehensive Medical History</h3>
                    <p class="mt-1 max-w-2xl text-sm text-gray-500">Medical background and health status.</p>
                </div>
                <div class="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Blood Type</h4>
                            <p class="mt-1 text-lg text-gray-900">{data.patient.blood_type || 'Unknown'}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Gender</h4>
                            <p class="mt-1 text-lg text-gray-900">{data.patient.gender || 'Not specified'}</p>
                        </div>
                        {#if data.patient.pregnancy_status === 1}
                            <div class="md:col-span-2">
                                <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                    <p class="text-sm font-medium text-yellow-800">⚠️ Pregnancy Status: Active</p>
                                </div>
                            </div>
                        {/if}
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Allergies</h4>
                        <div class="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                            {data.patient.allergies || 'None reported'}
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Current Medications</h4>
                        <div class="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                            {data.patient.current_medications || 'None reported'}
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-medium text-gray-500">Medical Conditions</h4>
                        <div class="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                            {data.patient.medical_conditions || 'None reported'}
                        </div>
                    </div>
                    {#if data.patient.surgical_history}
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Surgical History</h4>
                            <div class="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                                {data.patient.surgical_history}
                            </div>
                        </div>
                    {/if}
                    {#if data.patient.family_medical_history}
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Family Medical History</h4>
                            <div class="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                                {data.patient.family_medical_history}
                            </div>
                        </div>
                    {/if}
                    {#if data.patient.oral_habits}
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Oral Habits</h4>
                            <div class="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                                {data.patient.oral_habits}
                            </div>
                        </div>
                    {/if}
                    {#if data.patient.substance_use}
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Substance Use</h4>
                            <div class="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                                {data.patient.substance_use}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- DENTAL TAB -->
        {#if activeTab === 'dental'}
            <div class="space-y-6">
                <div class="bg-white shadow sm:rounded-lg">
                    <div class="px-4 py-5 sm:px-6">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Dental Information</h3>
                    </div>
                    <div class="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-4">
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Previous Dentist</h4>
                            <p class="mt-1 text-gray-900">{data.patient.previous_dentist || 'Not specified'}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Last Visit Date</h4>
                            <p class="mt-1 text-gray-900">{data.patient.last_visit_date || 'Not recorded'}</p>
                        </div>
                        <div>
                            <h4 class="text-sm font-medium text-gray-500">Dental Notes</h4>
                            <div class="mt-1 prose max-w-none text-gray-900 whitespace-pre-line p-3 bg-gray-50 rounded-md border border-gray-200">
                                {data.patient.dental_notes || 'No general notes.'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dental Records Tab -->
                {#if activeTab === 'dental'}
                    <div class="space-y-6">
                        <div class="bg-white shadow rounded-lg p-6">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">Interactive Odontogram</h3>
                            <DentalChart 
                                teethData={JSON.parse(data.patient.teeth_treatments || '{}')} 
                                isPediatric={isChild}
                                onToothClick={openToothModal}
                            />
                        </div>

                        <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div class="px-4 py-5 sm:px-6">
                                <h3 class="text-lg leading-6 font-medium text-gray-900">Treatment History</h3>
                            </div>
                            <div class="border-t border-gray-200">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tooth</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Treatment</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        {#each data.treatments as treatment}
                                            <tr>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{treatment.treatment_date}</td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{treatment.tooth_number || '-'}</td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{treatment.treatment_type}</td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{APP_CONFIG.currencySymbol}{treatment.cost.toFixed(2)}</td>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {treatment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                                        {treatment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                {/if}
                <div class="bg-white shadow sm:rounded-lg">
                    <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Treatment History</h3>
                    </div>
                    <div class="border-t border-gray-200 overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tooth</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each data.treatments as treatment}
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{treatment.treatment_date}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{treatment.tooth_number || '-'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{treatment.treatment_type.replace('_', ' ')}</td>
                                        <td class="px-6 py-4 text-sm text-gray-500 max-w-xs">{treatment.description}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{APP_CONFIG.currencySymbol}{treatment.cost.toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                {treatment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                                {treatment.status}
                                            </span>
                                        </td>
                                    </tr>
                                {:else}
                                    <tr>
                                        <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">No treatments recorded.</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        {/if}

        <!-- APPOINTMENTS TAB -->
        {#if activeTab === 'appointments'}
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul class="divide-y divide-gray-200">
                    {#each data.appointments as appt}
                        <li>
                            <div class="px-4 py-4 sm:px-6">
                                <div class="flex items-center justify-between">
                                    <p class="text-sm font-medium text-indigo-600 truncate">
                                        {#if appt.start_time.includes('T')}
                                            {appt.start_time.split('T')[0]} {appt.start_time.split('T')[1].substring(0,5)}
                                        {:else}
                                            {appt.start_time.substring(0, 16)}
                                        {/if}
                                    </p>
                                    <div class="ml-2 flex-shrink-0 flex">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            {appt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                                             appt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                                            {appt.status}
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-2 sm:flex sm:justify-between">
                                    <div class="sm:flex">
                                        <p class="flex items-center text-sm text-gray-500">
                                            {appt.appointment_type} ({appt.duration_minutes} min) with Dr. {appt.doctor_name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    {:else}
                         <li class="px-4 py-4 text-center text-gray-500">No appointments found.</li>
                    {/each}
                </ul>
            </div>
        {/if}
    
        <!-- PRESCRIPTIONS TAB -->
        {#if activeTab === 'prescriptions'}
            <div class="space-y-6">
                <div class="flex justify-between items-center px-4 sm:px-0">
                    <h2 class="text-xl font-bold text-gray-900">Historique des Ordonnances</h2>
                    <button 
                        onclick={() => showPrescriptionBuilder = !showPrescriptionBuilder}
                        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white {showPrescriptionBuilder ? 'bg-gray-600 hover:bg-gray-700' : 'bg-indigo-600 hover:bg-indigo-700'}"
                    >
                        {showPrescriptionBuilder ? 'Annuler' : '+ Nouvelle Ordonnance'}
                    </button>
                </div>

                {#if showPrescriptionBuilder}
                    <PrescriptionBuilder 
                        medications={data.medications} 
                        patientId={data.patient.id} 
                        doctorId={data.user.id} 
                        onPrescriptionCreated={() => showPrescriptionBuilder = false}
                    />
                {/if}

                <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médecin</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médicaments</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            {#each data.prescriptions as prescription}
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(prescription.prescription_date).toLocaleDateString()}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {prescription.doctor_name}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-500">
                                        <!-- Note: Items are not pre-loaded in the list query by default in the current helper 
                                             but we could fetch them or just show a count if we wanted. 
                                             Actually, let's keep it simple. -->
                                        Ordonnance médicale
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a href="/print/prescription/{prescription.id}" target="_blank" class="text-indigo-600 hover:text-indigo-900">Imprimer</a>
                                    </td>
                                </tr>
                            {:else}
                                <tr>
                                    <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                                        Aucune ordonnance pour ce patient.
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}

        <!-- FINANCIAL TAB -->
        {#if activeTab === 'financial'}
            <div class="space-y-6">
                <!-- Summary Card -->
                <div class="bg-white shadow rounded-lg p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-medium text-gray-900">Financial Summary</h3>
                        <button 
                            onclick={() => isInvoiceModalOpen = true}
                            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                        >
                            Générer Facture
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <p class="text-sm text-gray-500">Total Billed (Invoiced)</p>
                            <p class="text-2xl font-bold text-gray-900">{APP_CONFIG.currencySymbol}{data.balance.total_billed.toFixed(2)}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <p class="text-sm text-gray-500">Total Paid</p>
                            <p class="text-2xl font-bold text-green-600">{APP_CONFIG.currencySymbol}{data.balance.total_paid.toFixed(2)}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <p class="text-sm text-gray-500">Outstanding Balance</p>
                            <p class="text-2xl font-bold {data.balance.balance_due > 0 ? 'text-red-600' : 'text-gray-900'}">
                                {APP_CONFIG.currencySymbol}{data.balance.balance_due.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Invoices Table -->
                <div class="bg-white shadow sm:rounded-lg">
                    <div class="px-4 py-5 sm:px-6">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Factures</h3>
                    </div>
                    <div class="border-t border-gray-200 overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Facture</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each data.invoices as invoice}
                                    <tr>
                                        <td class="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                                        <td class="px-6 py-4 text-sm text-gray-500">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                        <td class="px-6 py-4 text-sm text-gray-900 font-bold">{APP_CONFIG.currencySymbol}{invoice.total_amount.toFixed(2)}</td>
                                        <td class="px-6 py-4 text-sm">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                {invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                                 invoice.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 text-right text-sm font-medium">
                                            <a href="/print/invoice/{invoice.id}" target="_blank" class="text-indigo-600 hover:text-indigo-900 mr-4">Imprimer</a>
                                            {#if invoice.status !== 'paid'}
                                                <button 
                                                    onclick={() => {
                                                        selectedInvoice = invoice;
                                                        isPaymentModalOpen = true;
                                                    }}
                                                    class="text-green-600 hover:text-green-900"
                                                >
                                                    Payer
                                                </button>
                                            {/if}
                                        </td>
                                    </tr>
                                {:else}
                                    <tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Aucune facture émise.</td></tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Payments Table -->
                <div class="bg-white shadow sm:rounded-lg">
                    <div class="px-4 py-5 sm:px-6">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Encaissements Directs</h3>
                    </div>
                    <div class="border-t border-gray-200 overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                             <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded By</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each data.payments as payment}
                                    <tr>
                                        <td class="px-6 py-4 text-sm text-gray-900">{payment.payment_date}</td>
                                        <td class="px-6 py-4 text-sm font-medium text-green-600">+{APP_CONFIG.currencySymbol}{payment.amount.toFixed(2)}</td>
                                        <td class="px-6 py-4 text-sm text-gray-500 capitalize">{payment.payment_method}</td>
                                        <td class="px-6 py-4 text-sm text-gray-500">{payment.recorded_by_name}</td>
                                        <td class="px-6 py-4 text-sm text-gray-500">{payment.notes || '-'}</td>
                                    </tr>
                                {:else}
                                    <tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No payments recorded.</td></tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        {/if}

    </main>

    <!-- Invoice Modal -->
    {#if isInvoiceModalOpen}
        <div class="relative z-10" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500/75" aria-hidden="true" onclick={() => isInvoiceModalOpen = false}></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white shadow-xl">
                        <form method="POST" action="?/createInvoice" use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') {
                                    isInvoiceModalOpen = false;
                                    selectedTreatmentsForInvoice = [];
                                }
                            };
                        }}>
                             <div class="bg-white px-4 py-5 sm:p-6">
                                <h3 class="text-lg font-semibold mb-4">Générer une Facture</h3>
                                <p class="text-sm text-gray-500 mb-4">Sélectionnez les soins à inclure dans cette facture.</p>

                                <div class="max-h-60 overflow-y-auto border rounded-md">
                                    <table class="min-w-full divide-y divide-gray-200">
                                        <thead class="bg-gray-50">
                                            <tr>
                                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Soin</th>
                                                <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-gray-200">
                                            {#each data.treatments as treatment}
                                                <tr class="hover:bg-gray-50">
                                                    <td class="px-4 py-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedTreatmentsForInvoice.includes(treatment.id)}
                                                            onchange={(e) => {
                                                                if (e.currentTarget.checked) {
                                                                    selectedTreatmentsForInvoice.push(treatment.id);
                                                                } else {
                                                                    selectedTreatmentsForInvoice = selectedTreatmentsForInvoice.filter(id => id !== treatment.id);
                                                                }
                                                            }}
                                                            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td class="px-4 py-2 text-sm text-gray-900">
                                                        <div class="font-medium">{treatment.treatment_type}</div>
                                                        <div class="text-xs text-gray-500">{treatment.treatment_date}</div>
                                                    </td>
                                                    <td class="px-4 py-2 text-sm text-gray-900 text-right font-bold">{APP_CONFIG.currencySymbol}{treatment.cost.toFixed(2)}</td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>

                                <input type="hidden" name="items" value={JSON.stringify(
                                    data.treatments
                                        .filter(t => selectedTreatmentsForInvoice.includes(t.id))
                                        .map(t => ({ treatment_id: t.id, description: t.treatment_type, amount: t.cost }))
                                )} />

                                <div class="mt-4 pt-4 border-t flex justify-between items-center text-lg font-bold">
                                    <span>Total Sélectionné</span>
                                    <span class="text-indigo-600">
                                        {APP_CONFIG.currencySymbol}{data.treatments
                                            .filter(t => selectedTreatmentsForInvoice.includes(t.id))
                                            .reduce((sum, t) => sum + t.cost, 0)
                                            .toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="submit" disabled={selectedTreatmentsForInvoice.length === 0} class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50">Confirmer la Facture</button>
                                <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onclick={() => isInvoiceModalOpen = false}>Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Edit Profile Modal -->
    {#if isEditModalOpen}
        <div class="relative z-10" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500/75" aria-hidden="true" onclick={() => isEditModalOpen = false}></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="relative w-full max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl">
                        <form method="POST" action="?/updatePatient" use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') isEditModalOpen = false;
                            };
                        }}>
                            <div class="bg-white px-4 py-5 sm:p-6 max-h-[85vh] overflow-y-auto">
                                <h3 class="text-lg font-semibold mb-4">Edit Patient Profile</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <!-- Personal Information -->
                                    <div class="col-span-2 border-b pb-3">
                                        <p class="font-semibold text-gray-900 mb-3">Personal Information</p>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Full Name *</label>
                                        <input type="text" name="full_name" value={data.patient.full_name} required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Date of Birth *</label>
                                        <input type="date" name="date_of_birth" value={data.patient.date_of_birth} required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Gender</label>
                                        <select name="gender" value={data.patient.gender || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Blood Type</label>
                                        <input type="text" name="blood_type" value={data.patient.blood_type || ''} placeholder="e.g., A+, O-" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>

                                    <!-- Contact Information -->
                                    <div class="col-span-2 border-t pt-4 mt-2 border-b pb-3">
                                        <p class="font-semibold text-gray-900 mb-3">Contact Information</p>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Phone</label>
                                        <input type="tel" name="phone" value={data.patient.phone || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Email</label>
                                        <input type="email" name="email" value={data.patient.email || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Secondary Phone</label>
                                        <input type="tel" name="secondary_phone" value={data.patient.secondary_phone || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Secondary Email</label>
                                        <input type="email" name="secondary_email" value={data.patient.secondary_email || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Address</label>
                                        <input type="text" name="address" value={data.patient.address || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">City</label>
                                        <input type="text" name="city" value={data.patient.city || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Postal Code</label>
                                        <input type="text" name="postal_code" value={data.patient.postal_code || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>

                                    <!-- Emergency Contact -->
                                    <div class="col-span-2 border-t pt-4 mt-2 border-b pb-3">
                                        <p class="font-semibold text-gray-900 mb-3">Emergency Contact</p>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                                        <input type="text" name="emergency_contact_name" value={data.patient.emergency_contact_name || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
                                        <input type="tel" name="emergency_contact_phone" value={data.patient.emergency_contact_phone || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Relationship</label>
                                        <input type="text" name="emergency_contact_relationship" value={data.patient.emergency_contact_relationship || ''} placeholder="e.g., Spouse, Parent" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>

                                    <!-- Insurance -->
                                    <div class="col-span-2 border-t pt-4 mt-2 border-b pb-3">
                                        <p class="font-semibold text-gray-900 mb-3">Insurance</p>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Insurance Provider</label>
                                        <input type="text" name="insurance_provider" value={data.patient.insurance_provider || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Insurance Number</label>
                                        <input type="text" name="insurance_number" value={data.patient.insurance_number || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>

                                    <!-- Medical Information -->
                                    <div class="col-span-2 border-t pt-4 mt-2 border-b pb-3">
                                        <p class="font-semibold text-gray-900 mb-3">Medical Information</p>
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Allergies</label>
                                        <textarea name="allergies" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.allergies || ''}</textarea>
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Current Medications</label>
                                        <textarea name="current_medications" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.current_medications || ''}</textarea>
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Medical Conditions</label>
                                        <textarea name="medical_conditions" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.medical_conditions || ''}</textarea>
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Surgical History</label>
                                        <textarea name="surgical_history" rows="2" placeholder="e.g., Heart surgery 2020" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.surgical_history || ''}</textarea>
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Family Medical History</label>
                                        <textarea name="family_medical_history" rows="2" placeholder="Genetic dental-relevant information" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.family_medical_history || ''}</textarea>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox" name="pregnancy_status" value="1" checked={data.patient.pregnancy_status === 1 || false} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                            <span class="text-sm font-medium text-gray-700">Pregnancy Status</span>
                                        </label>
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Oral Habits</label>
                                        <textarea name="oral_habits" rows="2" placeholder="e.g., Smoking: Yes, 1 pack/day; Bruxism: Yes" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.oral_habits || ''}</textarea>
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Substance Use</label>
                                        <textarea name="substance_use" rows="2" placeholder="e.g., Alcohol: Moderate; Drugs: None" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.substance_use || ''}</textarea>
                                    </div>

                                    <!-- Dental Information -->
                                    <div class="col-span-2 border-t pt-4 mt-2 border-b pb-3">
                                        <p class="font-semibold text-gray-900 mb-3">Dental Information</p>
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Previous Dentist</label>
                                        <input type="text" name="previous_dentist" value={data.patient.previous_dentist || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2 md:col-span-1">
                                        <label class="block text-sm font-medium text-gray-700">Last Visit Date</label>
                                        <input type="date" name="last_visit_date" value={data.patient.last_visit_date || ''} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">
                                    </div>
                                    <div class="col-span-2">
                                        <label class="block text-sm font-medium text-gray-700">Dental Notes</label>
                                        <textarea name="dental_notes" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2">{data.patient.dental_notes || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="submit" class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto">Save Changes</button>
                                <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onclick={() => isEditModalOpen = false}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Add Treatment Modal -->
    {#if isTreatmentModalOpen}
        <div class="relative z-10" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500/75" aria-hidden="true" onclick={() => isTreatmentModalOpen = false}></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white shadow-xl">
                        <form method="POST" action="?/addTreatment" use:enhance={() => {
                            formError = null;
                            formSuccess = null;
                            return async ({ result }) => {
                                if (result.type === 'success') {
                                    formSuccess = "Treatment added successfully!";
                                    setTimeout(() => {
                                        isTreatmentModalOpen = false;
                                        formSuccess = null;
                                    }, 1500);
                                } else if (result.type === 'failure' || result.type === 'error') {
                                    formError = result.data?.error || "An unexpected error occurred.";
                                }
                            };
                        }}>
                             <div class="bg-white px-4 py-5 sm:p-6">
                                <h3 class="text-lg font-semibold mb-4">Add New Treatment</h3>

                                {#if formError}
                                    <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                                        {formError}
                                    </div>
                                {/if}
                                {#if formSuccess}
                                    <div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                                        {formSuccess}
                                    </div>
                                {/if}

                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Date</label>
                                        <input type="date" name="treatment_date" value={new Date().toISOString().split('T')[0]} required class="mt-1 block w-full border p-2 rounded-md">
                                    </div>
                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Type</label>
                                            <select name="treatment_type" required class="mt-1 block w-full border p-2 rounded-md">
                                                <option value="consultation">Consultation</option>
                                                <option value="cleaning">Cleaning</option>
                                                <option value="filling">Filling</option>
                                                <option value="root_canal">Root Canal</option>
                                                <option value="extraction">Extraction</option>
                                                <option value="crown">Crown</option>
                                                <option value="whitening">Whitening</option>
                                                <option value="x_ray">X-Ray</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700">Tooth #</label>
                                            <input type="text" name="tooth_number" value={selectedTeeth.join(', ')} placeholder="Select from below or type..." class="mt-1 block w-full border p-2 rounded-md">
                                        </div>
                                    </div>
                                    <div class="py-2">
                                        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Visual Tooth Selector</label>
                                        <ToothSelector selectedTeeth={selectedTeeth} onToggle={toggleTooth} />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Description</label>
                                        <input type="text" name="description" placeholder="Short description" class="mt-1 block w-full border p-2 rounded-md">
                                    </div>
                                    <div>
                                         <label class="block text-sm font-medium text-gray-700">Cost ({APP_CONFIG.currencySymbol})</label>
                                         <input type="number" step="0.01" name="cost" required placeholder="0.00" class="mt-1 block w-full border p-2 rounded-md">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Diagnosis</label>
                                        <input type="text" name="diagnosis" placeholder="Primary diagnosis" class="mt-1 block w-full border p-2 rounded-md">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Treatment Notes</label>
                                        <textarea name="treatment_notes" rows="2" placeholder="Clinical notes..." class="mt-1 block w-full border p-2 rounded-md"></textarea>
                                    </div>
                                    <div>
                                         <label class="block text-sm font-medium text-gray-700">Status</label>
                                         <select name="status" class="mt-1 block w-full border p-2 rounded-md">
                                             <option value="pending">Pending</option>
                                             <option value="in_progress">In Progress</option>
                                             <option value="completed">Completed</option>
                                         </select>
                                    </div>
                                </div>
                            </div>
                             <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="submit" class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto">Add Treatment</button>
                                <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onclick={() => isTreatmentModalOpen = false}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
    <!-- Payment Modal -->
    {#if isPaymentModalOpen && selectedInvoice}
        <div class="relative z-10" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500/75" aria-hidden="true" onclick={() => isPaymentModalOpen = false}></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4">
                    <div class="relative w-full max-md transform overflow-hidden rounded-lg bg-white shadow-xl">
                        <form method="POST" action="?/recordPayment" use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') isPaymentModalOpen = false;
                            };
                        }}>
                             <div class="bg-white px-4 py-5 sm:p-6">
                                <h3 class="text-lg font-semibold mb-4">Enregistrer un Paiement</h3>
                                <p class="text-sm text-gray-500 mb-4">Facture: {selectedInvoice.invoice_number}</p>
                                
                                <input type="hidden" name="invoice_id" value={selectedInvoice.id} />
                                
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Montant à payer</label>
                                        <div class="mt-1 relative rounded-md shadow-sm">
                                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span class="text-gray-500 sm:text-sm">{APP_CONFIG.currencySymbol}</span>
                                            </div>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                name="amount" 
                                                value={selectedInvoice.total_amount} 
                                                required 
                                                class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2 border"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Moyen de paiement</label>
                                        <select name="payment_method" class="mt-1 block w-full border p-2 rounded-md">
                                            <option value="cash">Espèces</option>
                                            <option value="card">Carte Bancaire</option>
                                            <option value="check">Chèque</option>
                                            <option value="bank_transfer">Virement</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="submit" class="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto">Confirmer le Paiement</button>
                                <button type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onclick={() => isPaymentModalOpen = false}>Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
    <!-- Tooth Update Modal -->
    {#if isToothModalOpen && selectedTooth}
        <div class="relative z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onclick={() => isToothModalOpen = false}></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                    <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:max-w-md sm:w-full">
                        <form method="POST" action="?/updateDentalChart" use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') isToothModalOpen = false;
                            };
                        }}>
                            <input type="hidden" name="tooth_number" value={selectedTooth} />
                            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 class="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Edit Tooth #{selectedTooth}</h3>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Treatments (comma separated)</label>
                                        <input type="text" name="treatments" value={toothForm.treatments} class="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm" placeholder="e.g., Filling, Crown" />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Display Color</label>
                                        <div class="flex gap-2 mt-2">
                                            {#each ['#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'] as c}
                                                <button 
                                                    type="button"
                                                    onclick={() => toothForm.color = c}
                                                    class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 {toothForm.color === c ? 'border-gray-900 scale-110' : 'border-gray-200'}"
                                                    style="background-color: {c}"
                                                ></button>
                                            {/each}
                                        </div>
                                        <input type="hidden" name="color" value={toothForm.color} />
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Odontogram Notes</label>
                                        <textarea name="notes" rows="3" class="mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm" placeholder="Internal notes for this tooth...">{toothForm.notes}</textarea>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">Save Tooth Status</button>
                                <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onclick={() => isToothModalOpen = false}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

