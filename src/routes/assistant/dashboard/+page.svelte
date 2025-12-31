<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';

    let { data }: { data: PageData } = $props();
    let activeTab = $state('schedule');
    
    // UI state
    let isPatientModalOpen = $state(false);
    let isPaymentModalOpen = $state(false);
    let selectedPaymentPatient = $state(null);
    let searchPatientQuery = $state('');
    let errorMessage = $state('');

    $effect(() => {
        if (!isPatientModalOpen) {
            errorMessage = '';
        }
    });

    const tabs = [
        { id: 'schedule', label: 'Appointments' },
        { id: 'create_appt', label: 'New Appointment' },
        { id: 'patients', label: 'Manage Patients' },
        { id: 'payments', label: 'Payment Follow-Up' }
    ];

    function openPaymentModal(patient: any) {
        selectedPaymentPatient = patient;
        isPaymentModalOpen = true;
    }

    // Filter patients
    function getFilteredPatients() {
        if (!searchPatientQuery) return data.patients;
        return data.patients.filter(p => p.full_name.toLowerCase().includes(searchPatientQuery.toLowerCase()));
    }
</script>

<div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 class="text-3xl font-bold text-gray-900">Assistant Dashboard</h1>
            <div class="flex items-center gap-6">
                <a href="/inventory" class="text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-4 py-2 rounded-lg transition-colors border border-indigo-100 flex items-center gap-2">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Stock & Matériel
                </a>
                <div class="flex items-center gap-4">
                <span class="text-gray-500 text-sm">Welcome, {data.user.full_name}</span>
                <span class="text-gray-300">|</span>
                <form action="/logout" method="POST" use:enhance>
                    <button type="submit" class="text-sm text-red-600 hover:text-red-800 font-medium">Logout</button>
                </form>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
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
        
        <!-- SCHEDULE TAB -->
        {#if activeTab === 'schedule'}
            <div class="bg-white shadow overflow-hidden sm:rounded-md">
                <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Upcoming Appointments</h3>
                    <button onclick={() => activeTab = 'create_appt'} class="text-sm text-indigo-600 hover:text-indigo-900">Schedule New &rarr;</button>
                </div>
                <ul class="divide-y divide-gray-200">
                    {#each data.appointments as appt}
                        <li>
                            <div class="px-4 py-4 sm:px-6">
                                <div class="flex items-center justify-between">
                                    <div class="flex flex-col">
                                        <div class="flex items-center gap-2">
                                            <p class="text-sm font-bold text-indigo-600">
                                                {new Date(appt.start_time).toLocaleString()}
                                            </p>
                                            {#if appt.notes?.includes('Online booking')}
                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                                                    Online Request
                                                </span>
                                            {/if}
                                        </div>
                                        <p class="text-sm font-medium text-gray-900">
                                            {appt.patient_name}
                                            {#if appt.booked_by_name && appt.booked_by_name !== appt.patient_name}
                                                <span class="text-xs text-gray-400 font-normal">
                                                    (Requested by {appt.booked_by_name} - {appt.relationship_to_primary})
                                                </span>
                                            {/if}
                                        </p>
                                        <p class="text-sm text-gray-500">{appt.appointment_type} with Dr. {appt.doctor_name}</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            {appt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                                             appt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                                            {appt.status}
                                        </span>
                                        {#if appt.status === 'scheduled'}
                                            <form method="POST" action="?/updateStatus" use:enhance>
                                                <input type="hidden" name="appointment_id" value={appt.id}>
                                                <input type="hidden" name="status" value="confirmed">
                                                <button type="submit" class="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded hover:bg-green-100">Confirm</button>
                                            </form>
                                        {/if}
                                        {#if appt.status !== 'cancelled' && appt.status !== 'completed'}
                                            <form method="POST" action="?/updateStatus" use:enhance>
                                                <input type="hidden" name="appointment_id" value={appt.id}>
                                                <input type="hidden" name="status" value="cancelled">
                                                <button type="submit" class="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-100" onclick={(e) => !confirm('Cancel appointment?') && e.preventDefault()}>Cancel</button>
                                            </form>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        </li>
                    {:else}
                         <li class="px-4 py-4 text-center text-gray-500">No upcoming appointments.</li>
                    {/each}
                </ul>
            </div>
        {/if}

        <!-- CREATE APPOINTMENT TAB -->
        {#if activeTab === 'create_appt'}
            <div class="bg-white shadow sm:rounded-lg p-6 max-w-3xl mx-auto">
                <h3 class="text-lg font-medium text-gray-900 mb-6">Schedule New Appointment</h3>
                <form method="POST" action="?/createAppointment" use:enhance={() => {
                    return async ({ result }) => {
                         if (result.type === 'success') activeTab = 'schedule';
                    };
                }}>
                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Patient</label>
                            <select name="patient_id" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                <option value="">Select a patient...</option>
                                {#each data.patients as patient}
                                    <option value={patient.id}>{patient.full_name} ({patient.date_of_birth})</option>
                                {/each}
                            </select>
                            <p class="mt-1 text-xs text-gray-500">Can't find patient? <button type="button" onclick={() => activeTab = 'patients'} class="text-indigo-600 hover:underline">Add new patient first</button>.</p>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Doctor</label>
                                <select name="doctor_id" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">Select a doctor...</option>
                                    {#each data.doctors as doctor}
                                        <option value={doctor.id}>{doctor.full_name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Type</label>
                                <select name="appointment_type" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="consultation">Consultation</option>
                                    <option value="checkup">Checkup</option>
                                    <option value="cleaning">Cleaning</option>
                                    <option value="emergency">Emergency</option>
                                    <option value="follow_up">Follow Up</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Date & Time</label>
                                <input type="datetime-local" name="start_time" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                                <select name="duration_minutes" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="15">15 min</option>
                                    <option value="30" selected>30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                    <option value="90">90 min</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea name="notes" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"></textarea>
                        </div>

                        <div class="pt-4 border-t">
                            <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:text-sm">
                                Schedule Appointment
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        {/if}

        <!-- PATIENTS TAB -->
        {#if activeTab === 'patients'}
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Patient Management</h3>
                        <p class="mt-1 max-w-2xl text-sm text-gray-500">Limited view (Contact Info Only)</p>
                    </div>
                    <button onclick={() => isPatientModalOpen = true} class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium">
                        Add New Patient
                    </button>
                </div>
                
                <!-- Search -->
                <div class="px-4 pb-4">
                    <input type="text" bind:value={searchPatientQuery} placeholder="Search patients..." class="w-full border p-2 rounded-md">
                </div>

                <ul class="divide-y divide-gray-200 h-96 overflow-y-auto">
                    {#each getFilteredPatients() as patient}
                        <li class="px-6 py-4 hover:bg-gray-50">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-indigo-600">{patient.full_name}</p>
                                    <div class="flex text-sm text-gray-500 gap-4 mt-1">
                                        <span>📞 {patient.phone || patient.secondary_phone || '-'}</span>
                                        <span>📧 {patient.email || patient.secondary_email || '-'}</span>
                                        <span>🎂 {patient.date_of_birth}</span>
                                        {#if !patient.phone && patient.secondary_phone}
                                            <span class="text-xs text-orange-500 italic">(Secondary)</span>
                                        {/if}
                                    </div>
                                </div>
                                <div class="flex items-center">
                                    <button onclick={() => { activeTab = 'create_appt'; /* Pre-select logic todo */ }} class="text-xs text-indigo-600 hover:text-indigo-900 mr-4">Book Appt</button>
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}

        <!-- PAYMENTS TAB -->
        {#if activeTab === 'payments'}
             <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Payment Follow-Up</h3>
                    <p class="mt-1 max-w-2xl text-sm text-gray-500">Patients with outstanding balances</p>
                </div>
                <div class="border-t border-gray-200">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Due</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            {#each data.pendingPayments as p}
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.full_name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {p.phone}<br>
                                        <span class="text-xs">{p.email || ''}</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">€{p.balance_due.toFixed(2)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onclick={() => openPaymentModal(p)} class="text-indigo-600 hover:text-indigo-900">Record Payment</button>
                                    </td>
                                </tr>
                            {:else}
                                <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No pending payments found. Good job!</td></tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}

    </main>

    <!-- Modal: Add Patient -->
    {#if isPatientModalOpen}
        <div class="relative z-10" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onclick={() => isPatientModalOpen = false}></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                        <form method="POST" action="?/createPatient" use:enhance={() => {
                            errorMessage = '';
                            return async ({ result }) => { 
                                if (result.type === 'success') {
                                    isPatientModalOpen = false;
                                } else if (result.type === 'failure') {
                                    errorMessage = result.data?.error || 'An error occurred';
                                }
                            };
                        }}>
                            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 class="text-lg leading-6 font-medium text-gray-900">New Patient Registration</h3>
                                
                                {#if errorMessage}
                                    <div class="mt-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                                        <span class="block sm:inline">{errorMessage}</span>
                                    </div>
                                {/if}

                                <div class="mt-4 space-y-4">
                                    <div class="flex items-center gap-2 bg-indigo-50 p-2 rounded border border-indigo-100">
                                        <input type="checkbox" id="is_secondary" name="is_secondary" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                        <label for="is_secondary" class="text-xs text-indigo-700 font-medium">Contact info is secondary (e.g., Parent's info)</label>
                                    </div>
                                    <div><label class="block text-sm">Full Name *</label><input name="full_name" required class="w-full border p-2 rounded placeholder:text-gray-400" placeholder="e.g. John Doe Child"></div>
                                    <div><label class="block text-sm">Phone *</label><input name="phone" required class="w-full border p-2 rounded" placeholder="e.g. 555-0000"></div>
                                    <div><label class="block text-sm">DOB *</label><input type="date" name="date_of_birth" required class="w-full border p-2 rounded"></div>
                                    <div><label class="block text-sm">Email</label><input name="email" class="w-full border p-2 rounded" placeholder="Optional"></div>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">Save</button>
                                <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onclick={() => isPatientModalOpen = false}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Modal: Record Payment -->
    {#if isPaymentModalOpen && selectedPaymentPatient}
        <div class="relative z-10" role="dialog" aria-modal="true">
            <div class="fixed inset-0 bg-gray-500/75 transition-opacity" aria-hidden="true" onclick={() => isPaymentModalOpen = false}></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                        <form method="POST" action="?/recordPayment" use:enhance={() => {
                            errorMessage = '';
                            return async ({ result }) => { 
                                if (result.type === 'success') {
                                    isPaymentModalOpen = false;
                                } else if (result.type === 'failure' || result.type === 'error') {
                                    errorMessage = result.data?.error || 'Failed to record payment';
                                }
                            };
                        }}>
                            <input type="hidden" name="patient_id" value={selectedPaymentPatient.patient_id}>
                            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 class="text-lg leading-6 font-medium text-gray-900">Record Payment</h3>
                                <p class="text-gray-500 text-sm mb-4">For {selectedPaymentPatient.full_name} (Due: €{selectedPaymentPatient.balance_due.toFixed(2)})</p>

                                {#if errorMessage}
                                    <div class="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                                        <span class="block sm:inline">{errorMessage}</span>
                                    </div>
                                {/if}

                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm">Amount (€) *</label>
                                        <input type="number" step="0.01" name="amount" required class="w-full border p-2 rounded" placeholder="0.00">
                                    </div>
                                    <div>
                                        <label class="block text-sm">Payment Method</label>
                                        <select name="payment_method" class="w-full border p-2 rounded">
                                            <option value="cash">Cash</option>
                                            <option value="card">Card</option>
                                            <option value="insurance">Insurance</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="check">Check</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-sm">Notes</label>
                                        <input type="text" name="notes" class="w-full border p-2 rounded">
                                    </div>
                                </div>
                            </div>
                             <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">Confirm Payment</button>
                                <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm" onclick={() => isPaymentModalOpen = false}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
