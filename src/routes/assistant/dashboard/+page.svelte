<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import { APP_CONFIG } from '$lib/config/app.config';
    import Calendar from '$lib/components/Calendar.svelte';

    let { data }: { data: PageData } = $props();
    let activeTab = $state('schedule');
    let viewMode = $state('list'); // 'list' or 'calendar'
    let isBookingModalOpen = $state(false);
    
    // UI state
    let isPatientModalOpen = $state(false);
    let isPaymentModalOpen = $state(false);
    let selectedPaymentPatient = $state<any>(null);
    let selectedAppointment = $state<any>(null); // For booking/editing
    let searchPatientQuery = $state('');
    let errorMessage = $state('');

    $effect(() => {
        if (!isPatientModalOpen) {
            errorMessage = '';
        }
    });

    const tabs = [
        { id: 'schedule', label: 'Appointments', icon: '📅' },
        { id: 'patients', label: 'Patients', icon: '👥' },
        { id: 'payments', label: 'Financials', icon: '💰' }
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

    function closeModal() {
        isBookingModalOpen = false;
        selectedAppointment = null;
    }

    function openBookingModal(appt: any = null, startTime: string | null = null) {
        if (appt) {
            selectedAppointment = appt;
        } else if (startTime) {
            selectedAppointment = { start_time: startTime };
        } else {
            selectedAppointment = null;
        }
        isBookingModalOpen = true;
    }

    function handleDateClick(info: any) {
        openBookingModal(null, info.dateStr);
    }

    // Map appointments to FC events
    const calendarEvents = $derived(data.appointments.map((a: any) => ({
        id: a.id,
        title: `${a.patient_name} - ${a.appointment_type.replace('_', ' ')}`,
        start: a.start_time,
        end: a.end_time,
        extendedProps: a,
        backgroundColor: a.status === 'confirmed' ? '#10b981' : a.status === 'scheduled' ? '#3b82f6' : '#9ca3af'
    })));

    function handleEventClick(info: any) {
        openBookingModal(info.event.extendedProps);
    }

    async function handleEventChange(info: any) {
        const formData = new FormData();
        formData.append('id', info.event.id);
        formData.append('start_time', info.event.start.toISOString());
        formData.append('end_time', info.event.end.toISOString());

        const response = await fetch('?/rescheduleAppointment', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            alert('Failed to reschedule appointment');
            info.revert();
        }
    }
</script>

<div class="p-4 sm:p-6 lg:p-8">
    <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            {#each tabs as tab}
                <button 
                    class="{activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                    onclick={() => activeTab = tab.id}
                >
                    <span class="mr-2">{tab.icon}</span>
                    {tab.label}
                </button>
            {/each}
        </nav>
    </div>

    <!-- SCHEDULE TAB -->
    {#if activeTab === 'schedule'}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div class="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900">Upcoming Appointments</h3>
                <div class="flex items-center gap-4">
                    <div class="flex items-center bg-gray-200 p-1 rounded-lg">
                        <button 
                            onclick={() => viewMode = 'list'}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
                        >
                            List
                        </button>
                        <button 
                            onclick={() => viewMode = 'calendar'}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode === 'calendar' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
                        >
                            Calendar
                        </button>
                    </div>
                    <button onclick={() => openBookingModal()} class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all flex items-center gap-2">
                        <span class="text-xl">+</span>
                        Book New
                    </button>
                </div>
            </div>

            <div class="p-6">
                {#if viewMode === 'list'}
                    <ul role="list" class="divide-y divide-gray-100">
                        {#each data.appointments as appt}
                            <li class="group">
                                <div class="px-4 py-5 hover:bg-indigo-50/50 transition-colors rounded-xl flex items-center justify-between">
                                    <div class="flex flex-col">
                                        <div class="flex items-center gap-3 mb-1">
                                            <span class="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                {new Date(appt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            <span class="text-xs font-medium text-gray-400">
                                                {new Date(appt.start_time).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p class="text-base font-bold text-gray-900">{appt.patient_name}</p>
                                        <p class="text-xs text-gray-500 uppercase tracking-wider font-semibold">{appt.appointment_type} • Dr. {appt.doctor_name}</p>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
                                            {appt.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                                             appt.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                                            {appt.status}
                                        </span>
                                        <div class="flex gap-2">
                                            {#if appt.status === 'scheduled'}
                                                <form method="POST" action="?/updateStatus" use:enhance>
                                                    <input type="hidden" name="appointment_id" value={appt.id}>
                                                    <input type="hidden" name="status" value="confirmed">
                                                    <button type="submit" class="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors" title="Confirm">✓</button>
                                                </form>
                                            {/if}
                                            <button onclick={() => openBookingModal(appt)} class="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="Edit">✎</button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        {:else}
                            <li class="px-4 py-12 text-center text-gray-500 italic">No upcoming appointments scheduled.</li>
                        {/each}
                    </ul>
                {:else}
                    <Calendar 
                        events={calendarEvents} 
                        onEventClick={handleEventClick} 
                        onEventDrop={handleEventChange}
                        onEventResize={handleEventChange}
                        onDateClick={handleDateClick}
                        editable={true}
                    />
                {/if}
            </div>
        </div>
    {/if}

    <!-- PATIENTS TAB -->
    {#if activeTab === 'patients'}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div class="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900">Patient Management</h3>
                <button onclick={() => isPatientModalOpen = true} class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all">
                    Add Patient
                </button>
            </div>
            <div class="p-6">
                <div class="relative mb-6">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
                    <input type="text" bind:value={searchPatientQuery} placeholder="Search patients..." class="w-full pl-10 border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500">
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[500px] overflow-y-auto pr-2">
                    {#each getFilteredPatients() as patient}
                        <div class="p-4 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group bg-white">
                            <p class="font-bold text-gray-900 group-hover:text-indigo-600 flex justify-between">
                                {patient.full_name}
                                <span class="text-[10px] text-gray-300">#{patient.id}</span>
                            </p>
                            <div class="mt-3 space-y-1">
                                <p class="text-sm text-gray-600 flex items-center gap-2">
                                    <span class="opacity-50">📞</span> {patient.phone || '-'}
                                </p>
                                <p class="text-sm text-gray-600 flex items-center gap-2">
                                    <span class="opacity-50">🎂</span> {patient.date_of_birth}
                                </p>
                            </div>
                            <button 
                                onclick={() => openBookingModal(null, new Date().toISOString().split('T')[0] + 'T09:00')} 
                                class="mt-4 w-full py-2 bg-gray-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                                Schedule Visit
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    <!-- PAYMENTS TAB -->
    {#if activeTab === 'payments'}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900">Financial Follow-Up</h3>
                <p class="text-xs text-gray-500 font-medium">Outstanding balances to collect</p>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-100">
                    <thead class="bg-gray-50/50">
                        <tr>
                            <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient</th>
                            <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance Due</th>
                            <th class="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.pendingPayments as p}
                            <tr class="hover:bg-gray-50/50">
                                <td class="px-6 py-4">
                                    <p class="text-sm font-bold text-gray-900">{p.full_name}</p>
                                    <p class="text-xs text-gray-500">{p.phone}</p>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="text-sm font-black text-red-600">{APP_CONFIG.currencySymbol}{p.balance_due.toFixed(2)}</span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick={() => openPaymentModal(p)} class="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                                        Collect Payment
                                    </button>
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td colspan="3" class="px-6 py-12 text-center text-gray-400 italic">No outstanding payments found.</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>

<!-- MODALS -->

<!-- Modal: Booking / Edit -->
{#if isBookingModalOpen}
    <div class="relative z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onclick={closeModal}></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                    <form method="POST" action={selectedAppointment?.id ? "?/updateAppointment" : "?/createAppointment"} use:enhance={() => {
                        errorMessage = '';
                        return async ({ result, update }) => {
                            if (result.type === 'success') {
                                closeModal();
                            } else if (result.type === 'failure') {
                                errorMessage = (result.data as any)?.error || 'Error occurred';
                            }
                            await update();
                        };
                    }}>
                        {#if selectedAppointment?.id}
                            <input type="hidden" name="id" value={selectedAppointment.id}>
                        {/if}
                        <div class="bg-white px-6 pt-6 pb-6">
                            <h3 class="text-xl font-black text-gray-900 mb-6 border-b pb-4 flex items-center gap-2">
                                <span class="w-2 h-8 bg-indigo-600 rounded-full"></span>
                                {selectedAppointment?.id ? 'Edit Appointment' : 'New Appointment'}
                            </h3>
                            
                            {#if errorMessage}
                                <div class="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                                    {errorMessage}
                                </div>
                            {/if}

                            <div class="space-y-5">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Patient</label>
                                    <select name="patient_id" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500" value={selectedAppointment?.patient_id || ''}>
                                        <option value="">Select a patient...</option>
                                        {#each data.patients as patient}
                                            <option value={patient.id}>{patient.full_name}</option>
                                        {/each}
                                    </select>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Doctor</label>
                                        <select name="doctor_id" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" value={selectedAppointment?.doctor_id || ''}>
                                            {#each data.doctors as doctor}
                                                <option value={doctor.id}>Dr. {doctor.full_name}</option>
                                            {/each}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Type</label>
                                        <select name="appointment_type" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" value={selectedAppointment?.appointment_type || 'consultation'}>
                                            <option value="consultation">Consultation</option>
                                            <option value="checkup">Checkup</option>
                                            <option value="cleaning">Cleaning</option>
                                            <option value="emergency">Emergency</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Start Time</label>
                                        <input type="datetime-local" name="start_time" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" value={selectedAppointment?.start_time ? new Date(selectedAppointment.start_time).toISOString().slice(0, 16) : ''}>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duration</label>
                                        <select name="duration_minutes" class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" value={selectedAppointment?.duration_minutes || '30'}>
                                            <option value="15">15 min</option>
                                            <option value="30">30 min</option>
                                            <option value="45">45 min</option>
                                            <option value="60">60 min</option>
                                        </select>
                                    </div>
                                </div>

                                {#if selectedAppointment?.id}
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                                        <select name="status" class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" value={selectedAppointment.status}>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="cancelled">Cancelled</option>
                                            <option value="no_show">No Show</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                {/if}

                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</label>
                                    <textarea name="notes" rows="2" class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" placeholder="Additional notes...">{selectedAppointment?.notes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button type="submit" class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                                {selectedAppointment?.id ? 'Save Changes' : 'Schedule'}
                            </button>
                            <button type="button" class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100 hover:bg-gray-100 transition-all" onclick={closeModal}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Modal: Add Patient -->
{#if isPatientModalOpen}
    <div class="relative z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onclick={() => isPatientModalOpen = false}></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                    <form method="POST" action="?/createPatient" use:enhance={() => {
                        errorMessage = '';
                        return async ({ result, update }) => { 
                            if (result.type === 'success') {
                                isPatientModalOpen = false;
                            } else {
                                errorMessage = (result.data as any)?.error || 'Registration failed';
                            }
                            await update();
                        };
                    }}>
                        <div class="p-6">
                            <h3 class="text-xl font-black text-gray-900 mb-6 border-b pb-4 flex items-center gap-2">
                                <span class="w-2 h-8 bg-indigo-600 rounded-full"></span>
                                New Patient Registration
                            </h3>
                            {#if errorMessage}
                                <div class="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">{errorMessage}</div>
                            {/if}
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                                    <input name="full_name" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" placeholder="e.g. Jean Dupont">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Phone</label>
                                    <input name="phone" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" placeholder="0XXXXXXXXX">
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">DOB</label>
                                        <input type="date" name="date_of_birth" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</label>
                                        <input name="email" class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium" placeholder="Optional">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button type="submit" class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg">Register Patient</button>
                            <button type="button" class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100" onclick={() => isPatientModalOpen = false}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Modal: Record Payment -->
{#if isPaymentModalOpen && selectedPaymentPatient}
    <div class="relative z-50 overflow-y-auto" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onclick={() => isPaymentModalOpen = false}></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md">
                    <form method="POST" action="?/recordPayment" use:enhance={() => {
                        errorMessage = '';
                        return async ({ result, update }) => { 
                            if (result.type === 'success') {
                                isPaymentModalOpen = false;
                            } else {
                                errorMessage = (result.data as any)?.error || 'Payment failed';
                            }
                            await update();
                        };
                    }}>
                        <input type="hidden" name="patient_id" value={selectedPaymentPatient.patient_id}>
                        <div class="p-6">
                            <h3 class="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
                                <span class="w-2 h-8 bg-indigo-600 rounded-full"></span>
                                Record Payment
                            </h3>
                            <p class="text-gray-400 text-xs font-bold uppercase mb-6 tracking-widest">{selectedPaymentPatient.full_name}</p>
                            
                            <div class="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6 flex justify-between items-center">
                                <span class="text-xs font-bold text-red-600 uppercase tracking-widest">Total Due</span>
                                <span class="text-xl font-black text-red-600">{APP_CONFIG.currencySymbol}{selectedPaymentPatient.balance_due.toFixed(2)}</span>
                            </div>

                            {#if errorMessage}
                                <div class="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm">{errorMessage}</div>
                            {/if}

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount to pay</label>
                                    <input type="number" step="0.01" name="amount" required class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-lg font-black text-indigo-600" value={selectedPaymentPatient.balance_due}>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                                    <select name="payment_method" class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-bold">
                                        <option value="cash">Cash 💵</option>
                                        <option value="card">Card 💳</option>
                                        <option value="insurance">Insurance 🏥</option>
                                        <option value="bank_transfer">Bank Transfer 🏦</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button type="submit" class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all">Confirm Collection</button>
                            <button type="button" class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100" onclick={() => isPaymentModalOpen = false}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
{/if}
