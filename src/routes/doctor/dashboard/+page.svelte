<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import Calendar from '$lib/components/Calendar.svelte';

    let { data }: { data: PageData } = $props();
    
    let viewMode = $state('list'); // 'list' or 'calendar'
    
    // UI State
    let selectedAppointment: any = $state(null);
    let isEditing = $state(false);
    let activeTab = $state('today');
    let searchQuery = $state('');

    function openModal(appt: any) {
        selectedAppointment = appt;
        isEditing = true;
    }

    function closeModal() {
        isEditing = false;
        selectedAppointment = null;
    }

    function getStatusColor(status: string) {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'confirmed': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // Computed filtered lists
    const filteredToday = $derived(
        data.appointments.filter((a: any) => 
            a.patient_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const filteredUpcoming = $derived(
        data.upcomingAppointments.filter((a: any) => 
            a.patient_name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const activeList = $derived(activeTab === 'today' ? filteredToday : filteredUpcoming);

    // Map appointments to FC events
    const allAppointments = [...data.appointments, ...data.upcomingAppointments];
    // deduplicate by id
    const uniqueAppts = Array.from(new Map(allAppointments.map(a => [a.id, a])).values());

    const calendarEvents = $derived(uniqueAppts.map((a: any) => ({
        id: a.id,
        title: `${a.patient_name} - ${a.appointment_type?.replace('_', ' ') || 'Consult'}`,
        start: a.start_time,
        end: a.end_time || new Date(new Date(a.start_time).getTime() + (a.duration_minutes || 30) * 60000).toISOString(),
        extendedProps: a,
        backgroundColor: a.status === 'confirmed' ? '#10b981' : a.status === 'scheduled' ? '#3b82f6' : '#9ca3af'
    })));

    function handleEventClick(info: any) {
        openModal(info.event.extendedProps);
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

<div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-4 sm:px-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Welcome, Dr. {data.user?.full_name}</h1>
            <p class="text-sm text-gray-500">You have {data.appointments.length} appointments today.</p>
        </div>
        
        <div class="flex items-center gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:w-64">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
                <input 
                    type="text" 
                    bind:value={searchQuery}
                    placeholder="Search patients..." 
                    class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>

            <div class="flex items-center bg-gray-100 p-1 rounded-lg">
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
        </div>
    </div>

    <!-- Tabs -->
    <div class="mt-4 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-4 sm:px-0">
            <button 
                onclick={() => activeTab = 'today'}
                class="{activeTab === 'today' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            >
                Today ({filteredToday.length})
            </button>
            <button 
                onclick={() => activeTab = 'upcoming'}
                class="{activeTab === 'upcoming' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
            >
                Upcoming ({filteredUpcoming.length})
            </button>
        </nav>
    </div>

    <div class="mt-6">
        {#if viewMode === 'list'}
            {#if activeList.length === 0}
                <div class="bg-white overflow-hidden shadow rounded-lg p-12 text-center text-gray-500 border-2 border-dashed border-gray-200">
                    {searchQuery ? 'No appointments match your search.' : `No appointments scheduled for ${activeTab}.`}
                </div>
            {:else}
                <div class="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul role="list" class="divide-y divide-gray-200">
                        {#each activeList as appt}
                            <li>
                                <button onclick={() => openModal(appt)} class="block hover:bg-gray-50 w-full text-left focus:outline-none transition-colors">
                                    <div class="px-4 py-5 sm:px-6">
                                        <div class="flex items-center justify-between">
                                            <div class="flex flex-col">
                                                <p class="text-sm font-bold text-indigo-600">
                                                    {new Date(appt.start_time).toLocaleDateString()} @ {new Date(appt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    <span class="text-gray-400 font-normal ml-2">({appt.duration_minutes} min)</span>
                                                </p>
                                                <p class="mt-1 text-lg font-bold text-gray-900">{appt.patient_name}</p>
                                            </div>
                                            <div class="flex flex-col items-end gap-2">
                                                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full {getStatusColor(appt.status)} shadow-sm">
                                                    {appt.status.toUpperCase()}
                                                </span>
                                                <span class="text-xs text-gray-400 italic">Click to view/edit</span>
                                            </div>
                                        </div>
                                        <div class="mt-4 sm:flex sm:justify-between items-center bg-gray-50 p-2 rounded">
                                            <div class="flex flex-wrap gap-x-6 gap-y-2">
                                                <p class="flex items-center text-sm text-gray-600">
                                                    <span class="mr-2">📅</span> DOB: {appt.patient_dob || 'N/A'}
                                                </p>
                                                <p class="flex items-center text-sm text-gray-600">
                                                    <span class="mr-2">📞</span> {appt.patient_phone || appt.secondary_phone || 'N/A'}
                                                </p>
                                                {#if appt.appointment_type}
                                                    <p class="flex items-center text-sm text-gray-600">
                                                        <span class="mr-2">🦷</span> {appt.appointment_type.replace('_', ' ')}
                                                    </p>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        {:else}
            <Calendar 
                events={calendarEvents} 
                onEventClick={handleEventClick} 
                onEventDrop={handleEventChange}
                onEventResize={handleEventChange}
                editable={true}
            />
        {/if}
    </div>
</div>

{#if isEditing && selectedAppointment}
    <div class="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" aria-hidden="true" onclick={closeModal}></div>

        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                    <form method="POST" action="?/updateAppointment" use:enhance={() => {
                        return async ({ result }) => {
                            if (result.type === 'success') {
                                closeModal();
                            }
                        };
                    }}>
                        <input type="hidden" name="id" value={selectedAppointment.id} />
                        <div class="bg-white px-6 py-6 sm:p-8">
                            <div class="flex justify-between items-start mb-6">
                                <h3 class="text-xl font-bold text-gray-900" id="modal-title">
                                    Clinical Record & Appointment
                                </h3>
                                <button type="button" onclick={closeModal} class="text-gray-400 hover:text-gray-600">
                                    <span class="text-2xl">&times;</span>
                                </button>
                            </div>

                            <div class="space-y-6">
                                <div class="bg-indigo-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Patient Name</label>
                                        <div class="flex items-baseline gap-3 mt-1">
                                            <p class="text-base font-bold text-gray-900">{selectedAppointment.patient_name}</p>
                                            <a href="/doctor/patients/{selectedAppointment.patient_id}" class="text-xs font-semibold text-indigo-600 hover:underline">Full History &rarr;</a>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Contact</label>
                                        <p class="mt-1 text-sm text-gray-900 font-medium">
                                            {selectedAppointment.patient_phone || selectedAppointment.secondary_phone || 'No phone'}
                                            {#if !selectedAppointment.patient_phone && selectedAppointment.secondary_phone}
                                                <span class="text-gray-400 ml-1 italic">(Parent)</span>
                                            {/if}
                                        </p>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Age / DOB</label>
                                        <p class="mt-1 text-sm text-gray-900 font-medium">{selectedAppointment.patient_dob || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Email</label>
                                        <p class="mt-1 text-sm text-gray-900 font-medium truncate">{selectedAppointment.patient_email || selectedAppointment.secondary_email || 'N/A'}</p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label for="status" class="block text-sm font-bold text-gray-700 mb-2">Appointment Status</label>
                                        <select id="status" name="status" class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={selectedAppointment.status}>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="completed">Completed (Mark as Treated)</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col justify-end pb-1">
                                         <p class="text-xs text-gray-500">
                                            <strong>Last updated:</strong> {new Date().toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label for="notes" class="block text-sm font-bold text-gray-700 mb-2">Clinical Notes & Observations</label>
                                    <textarea id="notes" name="notes" rows="6" class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Enter findings, treatments discussed, or reminders...">{selectedAppointment.notes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-8 gap-3">
                            <button type="submit" class="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 transition-all sm:w-auto">
                                Save Clinical Record
                            </button>
                            <button type="button" class="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" onclick={closeModal}>
                                Close
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
{/if}
