<script lang="ts">
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import Calendar from '$lib/components/Calendar.svelte';
    import { t } from 'svelte-i18n';

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
            alert($t('common.error'));
            info.revert();
        }
    }
</script>

<div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-4 sm:px-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="text-start">
            <h1 class="text-2xl font-bold text-gray-900">{$t('dashboard.welcome', { values: { name: data.user?.full_name } })}</h1>
            <p class="text-sm text-gray-500">{$t('dashboard.appointments_count', { values: { count: data.appointments.length } })}</p>
        </div>
        
        <div class="flex items-center gap-4 w-full md:w-auto">
            <div class="relative flex-1 md:w-64">
                <span class="absolute inset-y-0 inset-inline-start-0 pl-3 flex items-center text-gray-400">🔍</span>
                <input 
                    type="text" 
                    bind:value={searchQuery}
                    placeholder={$t('dashboard.search_patients')} 
                    class="block w-full ps-10 pe-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>

            <div class="flex items-center bg-gray-100 p-1 rounded-lg">
                <button 
                    onclick={() => viewMode = 'list'}
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
                >
                    {$t('dashboard.list')}
                </button>
                <button 
                    onclick={() => viewMode = 'calendar'}
                    class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode === 'calendar' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
                >
                    {$t('dashboard.calendar')}
                </button>
            </div>
        </div>
    </div>

    <!-- Tabs -->
    <div class="mt-4 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-4 sm:px-0 rtl:space-x-reverse">
            <button 
                onclick={() => activeTab = 'today'}
                class="{activeTab === 'today' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors"
            >
                {$t('dashboard.today')} ({filteredToday.length})
            </button>
            <button 
                onclick={() => activeTab = 'upcoming'}
                class="{activeTab === 'upcoming' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors"
            >
                {$t('dashboard.upcoming')} ({filteredUpcoming.length})
            </button>
        </nav>
    </div>

    <div class="mt-6">
        {#if viewMode === 'list'}
            {#if activeList.length === 0}
                <div class="bg-white overflow-hidden shadow rounded-2xl p-12 text-center text-gray-500 border-2 border-dashed border-gray-200">
                    {searchQuery ? $t('dashboard.no_results') : $t('dashboard.no_appointments', { values: { tab: $t(`dashboard.${activeTab}`) } })}
                </div>
            {:else}
                <div class="bg-white shadow overflow-hidden sm:rounded-2xl">
                    <ul role="list" class="divide-y divide-gray-200">
                        {#each activeList as appt}
                            <li>
                                <button onclick={() => openModal(appt)} class="block hover:bg-gray-50 w-full text-start focus:outline-none transition-colors">
                                    <div class="px-4 py-5 sm:px-6">
                                        <div class="flex items-center justify-between">
                                            <div class="flex flex-col text-start">
                                                <p class="text-sm font-bold text-indigo-600">
                                                    {new Date(appt.start_time).toLocaleDateString()} @ {new Date(appt.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    <span class="text-gray-400 font-normal margin-inline-start-2">({appt.duration_minutes} min)</span>
                                                </p>
                                                <p class="mt-1 text-lg font-bold text-gray-900">{appt.patient_name}</p>
                                            </div>
                                            <div class="flex flex-col items-end gap-2">
                                                <span class="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full {getStatusColor(appt.status)} shadow-sm uppercase tracking-wider">
                                                    {$t(`dashboard.status_${appt.status}`)}
                                                </span>
                                                <span class="text-[10px] text-gray-400 italic">{$t('dashboard.click_to_view')}</span>
                                            </div>
                                        </div>
                                        <div class="mt-4 sm:flex sm:justify-between items-center bg-gray-50 p-3 rounded-xl">
                                            <div class="flex flex-wrap gap-x-6 gap-y-2">
                                                <p class="flex items-center text-xs text-gray-600 font-medium">
                                                    <span class="margin-inline-end-2">📅</span> {$t('dashboard.dob')}: {appt.patient_dob || 'N/A'}
                                                </p>
                                                <p class="flex items-center text-xs text-gray-600 font-medium">
                                                    <span class="margin-inline-end-2">📞</span> {appt.patient_phone || appt.secondary_phone || 'N/A'}
                                                </p>
                                                {#if appt.appointment_type}
                                                    <p class="flex items-center text-xs text-gray-600 font-medium">
                                                        <span class="margin-inline-end-2">🦷</span> {appt.appointment_type.replace('_', ' ')}
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
                locale={data.locale}
                direction={data.locale === 'ar' ? 'rtl' : 'ltr'}
            />
        {/if}
    </div>
</div>

{#if isEditing && selectedAppointment}
    <div class="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" aria-hidden="true" onclick={closeModal}></div>

        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                <div class="relative transform overflow-hidden rounded-2xl bg-white text-start shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                    <form method="POST" action="?/updateAppointment" use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === 'success') {
                                closeModal();
                            }
                            await update();
                        };
                    }}>
                        <input type="hidden" name="id" value={selectedAppointment.id} />
                        <div class="bg-white px-6 py-6 sm:p-10">
                            <div class="flex justify-between items-start mb-8">
                                <h3 class="text-xl font-bold text-gray-900" id="modal-title">
                                    {$t('dashboard.clinical_record')}
                                </h3>
                                <button type="button" onclick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors">
                                    <span class="text-3xl">&times;</span>
                                </button>
                            </div>

                            <div class="space-y-8">
                                <div class="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="text-start">
                                        <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{$t('dashboard.patient_name')}</label>
                                        <div class="flex items-baseline gap-3">
                                            <p class="text-base font-bold text-gray-900">{selectedAppointment.patient_name}</p>
                                            <a href="/doctor/patients/{selectedAppointment.patient_id}" class="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-wider">{$t('dashboard.full_history')} &rarr;</a>
                                        </div>
                                    </div>
                                    <div class="text-start">
                                        <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{$t('dashboard.contact')}</label>
                                        <p class="text-sm text-gray-900 font-bold">
                                            {selectedAppointment.patient_phone || selectedAppointment.secondary_phone || $t('dashboard.no_phone')}
                                            {#if !selectedAppointment.patient_phone && selectedAppointment.secondary_phone}
                                                <span class="text-gray-400 ml-1 italic font-normal">(Parent)</span>
                                            {/if}
                                        </p>
                                    </div>
                                    <div class="text-start">
                                        <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{$t('dashboard.age_dob')}</label>
                                        <p class="text-sm text-gray-900 font-bold">{selectedAppointment.patient_dob || 'N/A'}</p>
                                    </div>
                                    <div class="text-start">
                                        <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{$t('dashboard.email')}</label>
                                        <p class="text-sm text-gray-900 font-bold truncate">{selectedAppointment.patient_email || selectedAppointment.secondary_email || 'N/A'}</p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div class="text-start">
                                        <label for="status" class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{$t('dashboard.appointment_status')}</label>
                                        <select id="status" name="status" class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium sm:text-sm" value={selectedAppointment.status}>
                                            <option value="scheduled">{$t('dashboard.status_scheduled')}</option>
                                            <option value="confirmed">{$t('dashboard.status_confirmed')}</option>
                                            <option value="completed">{$t('dashboard.status_completed')}</option>
                                            <option value="cancelled">{$t('dashboard.status_cancelled')}</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col justify-end pb-1 text-end rtl:text-start">
                                         <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            {$t('dashboard.last_updated')}: {new Date().toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div class="text-start">
                                    <label for="notes" class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{$t('dashboard.clinical_notes')}</label>
                                    <textarea id="notes" name="notes" rows="6" class="block w-full px-4 py-3 border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium sm:text-sm" placeholder={$t('dashboard.notes_placeholder')}>{selectedAppointment.notes || ''}</textarea>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 px-8 py-6 sm:flex sm:flex-row-reverse sm:px-10 gap-4">
                            <button type="submit" class="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] transition-all sm:w-auto">
                                {$t('dashboard.save_record')}
                            </button>
                            <button type="button" class="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all" onclick={closeModal}>
                                {$t('common.cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Logical spacing helpers */
    :global([dir="rtl"]) .margin-inline-start-2 { margin-right: 0.5rem; }
    :global([dir="ltr"]) .margin-inline-start-2 { margin-left: 0.5rem; }
    
    :global([dir="rtl"]) .margin-inline-end-2 { margin-left: 0.5rem; }
    :global([dir="ltr"]) .margin-inline-end-2 { margin-right: 0.5rem; }

    :global([dir="rtl"]) .margin-inline-end-4 { margin-left: 1rem; }
    :global([dir="ltr"]) .margin-inline-end-4 { margin-right: 1rem; }
</style>
