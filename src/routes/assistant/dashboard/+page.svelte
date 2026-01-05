<script lang="ts">
    import type { PageData } from "./$types";
    import { enhance } from "$app/forms";
    import { APP_CONFIG } from "$lib/config/app.config";
    import Calendar from "$lib/components/Calendar.svelte";
    import { t } from "svelte-i18n";

    import { page } from "$app/stores";
    import { goto, invalidateAll } from "$app/navigation";

    let { data }: { data: PageData } = $props();
    let activeTab = $state("schedule");
    
    // Set max date to today for date of birth (cannot be in the future)
    const maxDateOfBirth = new Date().toISOString().split('T')[0];

    // Initialize viewMode from URL param or default to 'list'
    let viewMode = $state($page.url.searchParams.get("view") || "list");

    let isBookingModalOpen = $state(false);

    // UI state
    let isPatientModalOpen = $state(false);
    let isPaymentModalOpen = $state(false);
    let selectedPaymentPatient = $state<any>(null);
    let selectedAppointment = $state<any>(null); // For booking/editing
    let searchPatientQuery = $state("");
    let errorMessage = $state("");
    
    // Confirmation modal state
    let isConfirmModalOpen = $state(false);
    let pendingAction = $state<{
        type: 'single' | 'bulk';
        status: string;
        appointmentId?: number;
        appointmentIds?: number[];
        count?: number;
    } | null>(null);
    let pendingFormElement = $state<HTMLFormElement | null>(null);
    // New search & filter state for appointments
    let searchQuery = $state("");
    let statusFilter = $state("");

    // Table view state
    let tableSortColumn = $state<string | null>(null);
    let tableSortDirection = $state<"asc" | "desc">("asc");
    let selectedRows = $state<Set<number>>(new Set());
    let columnFilters = $state<Record<string, string>>({
        patient: "",
        doctor: "",
        status: "",
        type: "",
        date: ""
    });

    // Reactive filtered appointments list using $derived.by for complex logic
    const filteredAppointments = $derived.by(() => {
        const appointments = data.appointments ?? [];
        return appointments.filter((appt: any) => {
            const matchesSearch = searchQuery
                ? appt.patient_name
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  appt.doctor_name
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  (appt.notes &&
                      appt.notes
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()))
                : true;
            const matchesStatus = statusFilter
                ? appt.status === statusFilter
                : true;
            return matchesSearch && matchesStatus;
        });
    });

    // Table filtered and sorted appointments
    const tableAppointments = $derived.by(() => {
        let result = [...filteredAppointments];
        
        // Apply column filters
        if (columnFilters.patient) {
            result = result.filter((appt: any) =>
                appt.patient_name?.toLowerCase().includes(columnFilters.patient.toLowerCase())
            );
        }
        if (columnFilters.doctor) {
            result = result.filter((appt: any) =>
                appt.doctor_name?.toLowerCase().includes(columnFilters.doctor.toLowerCase())
            );
        }
        if (columnFilters.status) {
            result = result.filter((appt: any) => appt.status === columnFilters.status);
        }
        if (columnFilters.type) {
            result = result.filter((appt: any) => appt.appointment_type === columnFilters.type);
        }
        if (columnFilters.date) {
            const filterDate = columnFilters.date;
            result = result.filter((appt: any) => {
                const apptDate = new Date(appt.start_time).toISOString().split('T')[0];
                return apptDate === filterDate;
            });
        }

        // Apply sorting
        if (tableSortColumn) {
            result.sort((a: any, b: any) => {
                let aVal: any;
                let bVal: any;

                switch (tableSortColumn) {
                    case "patient":
                        aVal = a.patient_name || "";
                        bVal = b.patient_name || "";
                        break;
                    case "doctor":
                        aVal = a.doctor_name || "";
                        bVal = b.doctor_name || "";
                        break;
                    case "status":
                        aVal = a.status || "";
                        bVal = b.status || "";
                        break;
                    case "type":
                        aVal = a.appointment_type || "";
                        bVal = b.appointment_type || "";
                        break;
                    case "date":
                        aVal = new Date(a.start_time).getTime();
                        bVal = new Date(b.start_time).getTime();
                        break;
                    case "time":
                        aVal = new Date(a.start_time).getTime();
                        bVal = new Date(b.start_time).getTime();
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return tableSortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return tableSortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    });

    function toggleSort(column: string) {
        if (tableSortColumn === column) {
            tableSortDirection = tableSortDirection === "asc" ? "desc" : "asc";
        } else {
            tableSortColumn = column;
            tableSortDirection = "asc";
        }
    }

    function toggleRowSelection(id: number) {
        const newSelection = new Set(selectedRows);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        selectedRows = newSelection;
    }

    function toggleSelectAll() {
        if (selectedRows.size === tableAppointments.length) {
            selectedRows = new Set();
        } else {
            selectedRows = new Set(tableAppointments.map((appt: any) => appt.id));
        }
    }

    function clearFilters() {
        columnFilters = {
            patient: "",
            doctor: "",
            status: "",
            type: "",
            date: ""
        };
    }

    function showConfirmation(event: Event, type: 'single' | 'bulk', status: string, appointmentId?: number, appointmentIds?: number[]) {
        event.preventDefault();
        event.stopPropagation();
        
        const form = (event.target as HTMLElement).closest('form') as HTMLFormElement;
        pendingFormElement = form;
        
        pendingAction = {
            type,
            status,
            appointmentId,
            appointmentIds,
            count: type === 'bulk' ? appointmentIds?.length : 1
        };
        isConfirmModalOpen = true;
    }

    function confirmAction() {
        if (pendingFormElement && pendingAction) {
            // Submit the form
            pendingFormElement.requestSubmit();
            isConfirmModalOpen = false;
            pendingAction = null;
            pendingFormElement = null;
        }
    }

    function cancelConfirmation() {
        isConfirmModalOpen = false;
        pendingAction = null;
        pendingFormElement = null;
    }

    $effect(() => {
        if (!isPatientModalOpen) {
            errorMessage = "";
        }
    });

    const tabs = [
        {
            id: "schedule",
            label: $t("assistant.dashboard.tabs.schedule.label"),
            icon: $t("assistant.dashboard.tabs.schedule.icon"),
        },
        {
            id: "patients",
            label: $t("assistant.dashboard.tabs.patients.label"),
            icon: $t("assistant.dashboard.tabs.patients.icon"),
        },
        {
            id: "payments",
            label: $t("assistant.dashboard.tabs.payments.label"),
            icon: $t("assistant.dashboard.tabs.payments.icon"),
        },
    ];

    function openPaymentModal(patient: any) {
        selectedPaymentPatient = patient;
        isPaymentModalOpen = true;
    }

    // Filter patients
    function getFilteredPatients() {
        if (!searchPatientQuery) return data.patients;
        return data.patients.filter((p) =>
            p.full_name
                .toLowerCase()
                .includes(searchPatientQuery.toLowerCase()),
        );
    }

    function closeModal() {
        isBookingModalOpen = false;
        selectedAppointment = null;
    }

    function openBookingModal(
        appt: any = null,
        startTime: string | null = null,
    ) {
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
    const calendarEvents = $derived(
        filteredAppointments.map((a: any) => {
            const icon = a.relationship_to_primary ? "👶" : "👤";
            const webIndicator =
                a.notes && a.notes.includes("Source: Web") ? " 🌐" : "";
            return {
                id: a.id,
                title: `${icon} ${a.patient_name} - ${a.appointment_type.replace("_", " ")}${webIndicator}`,
                // Ensure ISO format for Calendar by replacing space with T if needed
                start: a.start_time.replace(" ", "T"),
                end: a.end_time.replace(" ", "T"),
                extendedProps: a,
                backgroundColor:
                    a.status === "confirmed"
                        ? "#10b981" // green-500
                        : a.status === "cancelled"
                          ? "#ef4444" // red-500
                          : a.status === "no_show"
                            ? "#6b7280" // gray-500
                            : "#3b82f6", // blue-500 (scheduled)
                borderColor:
                    a.status === "confirmed"
                        ? "#059669" // green-600
                        : a.status === "cancelled"
                          ? "#dc2626" // red-600
                          : a.status === "no_show"
                            ? "#4b5563" // gray-600
                            : "#2563eb", // blue-600
            };
        }),
    );

    function handleEventClick(info: any) {
        openBookingModal(info.event.extendedProps);
    }

    async function handleEventChange(info: any) {
        const formData = new FormData();
        formData.append("id", info.event.id);
        formData.append("start_time", info.event.start.toISOString());
        formData.append("end_time", info.event.end.toISOString());

        const response = await fetch("?/rescheduleAppointment", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            alert("Failed to reschedule appointment");
            info.revert();
        }
    }
</script>

<div class="p-4 sm:p-6 lg:p-8">
    <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            {#each tabs as tab}
                <button
                    class="{activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                    onclick={() => (activeTab = tab.id)}
                >
                    <span class="mr-2">{tab.icon}</span>
                    {tab.label}
                </button>
            {/each}
        </nav>
    </div>

    <!-- SCHEDULE TAB -->
    {#if activeTab === "schedule"}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div
                class="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50"
            >
                <h3 class="text-lg font-bold text-gray-900">
                    {$t("assistant.dashboard.tabs.schedule.header")}
                </h3>
                <div class="flex items-center gap-4">
                    <div class="flex items-center bg-gray-200 p-1 rounded-lg">
                        <button
                            onclick={() => (viewMode = "list")}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode ===
                            'list'
                                ? 'bg-white shadow text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'}"
                        >
                            {$t("assistant.dashboard.buttons.list")}
                        </button>
                        <button
                            onclick={() => (viewMode = "calendar")}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode ===
                            'calendar'
                                ? 'bg-white shadow text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'}"
                        >
                            {$t("assistant.dashboard.buttons.calendar")}
                        </button>
                        <button
                            onclick={() => (viewMode = "table")}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode ===
                            'table'
                                ? 'bg-white shadow text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'}"
                        >
                            Table
                        </button>
                    </div>
                    <!-- Search and filter controls -->
                    <div class="flex items-center gap-4 mt-2">
                        <input
                            type="text"
                            placeholder={$t(
                                "assistant.dashboard.search.placeholder",
                            ) || "Search appointments..."}
                            bind:value={searchQuery}
                            class="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                            bind:value={statusFilter}
                            class="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All statuses</option>
                            <option value="scheduled"
                                >{$t(
                                    "assistant.dashboard.appointment.status.scheduled",
                                )}</option
                            >
                            <option value="confirmed"
                                >{$t(
                                    "assistant.dashboard.appointment.status.confirmed",
                                )}</option
                            >
                            <option value="cancelled"
                                >{$t(
                                    "assistant.dashboard.appointment.status.cancelled",
                                )}</option
                            >
                            <option value="no_show"
                                >{$t(
                                    "assistant.dashboard.appointment.status.no_show",
                                )}</option
                            >
                        </select>
                    </div>
                    <button
                        onclick={() => openBookingModal()}
                        class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all flex items-center gap-2"
                    >
                        <span class="text-xl">+</span>
                        {$t("assistant.dashboard.buttons.bookNew")}
                    </button>
                </div>
            </div>

            <div class="p-6">
                {#if viewMode === "list"}
                    <ul role="list" class="divide-y divide-gray-100">
                        {#each filteredAppointments as appt}
                            <li class="group">
                                <div
                                    class="px-4 py-5 transition-colors rounded-xl flex items-center justify-between border-l-4
                                    {appt.status === 'confirmed'
                                        ? 'border-l-green-500 bg-green-50/30 hover:bg-green-50'
                                        : appt.status === 'cancelled'
                                          ? 'border-l-red-500 bg-red-50/30 hover:bg-red-50'
                                          : appt.status === 'no_show'
                                            ? 'border-l-gray-500 bg-gray-50/30 hover:bg-gray-100'
                                            : 'border-l-blue-500 bg-blue-50/30 hover:bg-blue-50'}"
                                >
                                    <div class="flex flex-col">
                                        <div
                                            class="flex items-center gap-3 mb-1"
                                        >
                                            <span
                                                class="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"
                                            >
                                                {new Date(
                                                    appt.start_time,
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                            <span
                                                class="text-xs font-medium text-gray-400"
                                            >
                                                {new Date(
                                                    appt.start_time,
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div
                                            class="flex items-center gap-2 mb-1"
                                        >
                                            {#if appt.relationship_to_primary}
                                                <span
                                                    class="text-lg"
                                                    title="Child/Dependent"
                                                >
                                                    👶
                                                </span>
                                            {:else}
                                                <span
                                                    class="text-lg"
                                                    title="Adult"
                                                >
                                                    👤
                                                </span>
                                            {/if}
                                            <p
                                                class="text-base font-bold text-gray-900"
                                            >
                                                {appt.patient_name}
                                            </p>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-2 mb-1"
                                        >
                                            {#if appt.date_of_birth}
                                                {@const age = Math.floor(
                                                    (new Date().getTime() -
                                                        new Date(
                                                            appt.date_of_birth,
                                                        ).getTime()) /
                                                        (365.25 *
                                                            24 *
                                                            60 *
                                                            60 *
                                                            1000),
                                                )}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {age}
                                                    {age === 1
                                                        ? "year"
                                                        : "years"}
                                                </span>
                                            {/if}
                                            {#if appt.gender}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                                >
                                                    {appt.gender === "male"
                                                        ? "♂️ Male"
                                                        : appt.gender ===
                                                            "female"
                                                          ? "♀️ Female"
                                                          : appt.gender}
                                                </span>
                                            {/if}
                                            {#if appt.notes && appt.notes.includes("Source: Web")}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                                                >
                                                    🌐 Source: Web
                                                </span>
                                            {/if}
                                        </div>
                                        <p
                                            class="text-xs text-gray-500 uppercase tracking-wider font-semibold"
                                        >
                                            {$t(
                                                `assistant.dashboard.appointment.type.${appt.appointment_type}`,
                                            )} • {$t(
                                                "assistant.dashboard.time.dr",
                                            )}
                                            {appt.doctor_name}
                                        </p>
                                        {#if appt.relationship_to_primary && appt.booked_by_name}
                                            <p
                                                class="text-xs text-gray-500 italic mt-1"
                                            >
                                                Booked by: {appt.booked_by_name}
                                                ({appt.relationship_to_primary})
                                            </p>
                                        {/if}
                                        <div
                                            class="flex flex-wrap items-center gap-2 mt-1"
                                        >
                                            {#if appt.created_by_name}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                                >
                                                    ✏️ Created by: {appt.created_by_name}
                                                </span>
                                            {:else if appt.notes && appt.notes.includes("Source: Web")}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"
                                                >
                                                    🌐 Portal Booking
                                                </span>
                                            {/if}
                                            {#if appt.confirmed_by_name}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800"
                                                >
                                                    ✓ Confirmed by: {appt.confirmed_by_name}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <span
                                            class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
                                            {appt.status === 'confirmed'
                                                ? 'bg-green-100 text-green-800'
                                                : appt.status === 'cancelled'
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-blue-100 text-blue-800'}"
                                        >
                                            {$t(
                                                `assistant.dashboard.appointment.status.${appt.status}`,
                                            )}
                                        </span>
                                        <div class="flex gap-2">
                                            {#if appt.status === "scheduled"}
                                                <form
                                                    method="POST"
                                                    action="?/updateStatus"
                                                    use:enhance
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="appointment_id"
                                                        value={appt.id}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="status"
                                                        value="confirmed"
                                                    />
                                                    <button
                                                        type="submit"
                                                        class="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                        title="Confirm"
                                                        >✓</button
                                                    >
                                                </form>
                                            {/if}
                                            <button
                                                onclick={() =>
                                                    openBookingModal(appt)}
                                                class="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                title="Edit">✎</button
                                            >
                                        </div>
                                    </div>
                                </div>
                            </li>
                        {:else}
                            <li
                                class="px-4 py-12 text-center text-gray-500 italic"
                            >
                                {$t("assistant.dashboard.tabs.schedule.empty")}
                            </li>
                        {/each}
                    </ul>
                {:else if viewMode === "calendar"}
                    <!-- Calendar Legend -->
                    <div
                        class="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg justify-center sm:justify-start"
                    >
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-blue-500"
                            ></span>
                            <span class="text-xs font-medium text-gray-700"
                                >{$t(
                                    "assistant.dashboard.appointment.status.scheduled",
                                )}</span
                            >
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-green-500"
                            ></span>
                            <span class="text-xs font-medium text-gray-700"
                                >{$t(
                                    "assistant.dashboard.appointment.status.confirmed",
                                )}</span
                            >
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-red-500"
                            ></span>
                            <span class="text-xs font-medium text-gray-700"
                                >{$t(
                                    "assistant.dashboard.appointment.status.cancelled",
                                )}</span
                            >
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-gray-500"
                            ></span>
                            <span class="text-xs font-medium text-gray-700"
                                >{$t(
                                    "assistant.dashboard.appointment.status.no_show",
                                )}</span
                            >
                        </div>
                    </div>

                    {#key filteredAppointments}
                        <Calendar
                            events={calendarEvents}
                            onEventClick={handleEventClick}
                            onEventDrop={handleEventChange}
                            onEventResize={handleEventChange}
                            onDateClick={handleDateClick}
                            editable={false}
                        />
                    {/key}
                {:else if viewMode === "table"}
                    <!-- Table View -->
                    <div class="overflow-x-auto">
                        <!-- Bulk Actions Bar -->
                        {#if selectedRows.size > 0}
                            <div class="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                                <span class="text-sm font-bold text-indigo-900">
                                    {selectedRows.size} appointment{selectedRows.size === 1 ? '' : 's'} selected
                                </span>
                                <div class="flex gap-2">
                                    <form
                                        method="POST"
                                        action="?/bulkUpdateStatus"
                                        use:enhance
                                        class="inline"
                                        id="bulk-confirm-form"
                                    >
                                        <input type="hidden" name="appointment_ids" value={Array.from(selectedRows).join(',')} />
                                        <input type="hidden" name="status" value="confirmed" />
                                        <button
                                            type="button"
                                            onclick={(e) => showConfirmation(e, 'bulk', 'confirmed', undefined, Array.from(selectedRows))}
                                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm transition-colors"
                                        >
                                            Confirm Selected
                                        </button>
                                    </form>
                                    <form
                                        method="POST"
                                        action="?/bulkUpdateStatus"
                                        use:enhance
                                        class="inline"
                                        id="bulk-cancel-form"
                                    >
                                        <input type="hidden" name="appointment_ids" value={Array.from(selectedRows).join(',')} />
                                        <input type="hidden" name="status" value="cancelled" />
                                        <button
                                            type="button"
                                            onclick={(e) => showConfirmation(e, 'bulk', 'cancelled', undefined, Array.from(selectedRows))}
                                            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm transition-colors"
                                        >
                                            Cancel Selected
                                        </button>
                                    </form>
                                    <button
                                        onclick={() => selectedRows = new Set()}
                                        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold text-sm transition-colors"
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                        {/if}

                        <!-- Column Filters -->
                        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-sm font-bold text-gray-700">Column Filters</h4>
                                <button
                                    onclick={clearFilters}
                                    class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <input
                                    type="text"
                                    placeholder="Filter Patient..."
                                    bind:value={columnFilters.patient}
                                    class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Filter Doctor..."
                                    bind:value={columnFilters.doctor}
                                    class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <select
                                    bind:value={columnFilters.status}
                                    class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="no_show">No Show</option>
                                </select>
                                <select
                                    bind:value={columnFilters.type}
                                    class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">All Types</option>
                                    <option value="consultation">Consultation</option>
                                    <option value="checkup">Checkup</option>
                                    <option value="cleaning">Cleaning</option>
                                    <option value="cosmetic">Cosmetic</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                                <input
                                    type="date"
                                    bind:value={columnFilters.date}
                                    class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <!-- Table -->
                        <table class="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.size === tableAppointments.length && tableAppointments.length > 0}
                                            onchange={toggleSelectAll}
                                            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onclick={() => toggleSort("date")}
                                    >
                                        <div class="flex items-center gap-2">
                                            Date
                                            {#if tableSortColumn === "date"}
                                                {tableSortDirection === "asc" ? "↑" : "↓"}
                                            {/if}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onclick={() => toggleSort("time")}
                                    >
                                        <div class="flex items-center gap-2">
                                            Time
                                            {#if tableSortColumn === "time"}
                                                {tableSortDirection === "asc" ? "↑" : "↓"}
                                            {/if}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onclick={() => toggleSort("patient")}
                                    >
                                        <div class="flex items-center gap-2">
                                            Patient
                                            {#if tableSortColumn === "patient"}
                                                {tableSortDirection === "asc" ? "↑" : "↓"}
                                            {/if}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onclick={() => toggleSort("doctor")}
                                    >
                                        <div class="flex items-center gap-2">
                                            Doctor
                                            {#if tableSortColumn === "doctor"}
                                                {tableSortDirection === "asc" ? "↑" : "↓"}
                                            {/if}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onclick={() => toggleSort("type")}
                                    >
                                        <div class="flex items-center gap-2">
                                            Type
                                            {#if tableSortColumn === "type"}
                                                {tableSortDirection === "asc" ? "↑" : "↓"}
                                            {/if}
                                        </div>
                                    </th>
                                    <th
                                        scope="col"
                                        class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onclick={() => toggleSort("status")}
                                    >
                                        <div class="flex items-center gap-2">
                                            Status
                                            {#if tableSortColumn === "status"}
                                                {tableSortDirection === "asc" ? "↑" : "↓"}
                                            {/if}
                                        </div>
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Notes
                                    </th>
                                    <th scope="col" class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                {#each tableAppointments as appt}
                                    <tr 
                                        class="hover:bg-gray-50 {selectedRows.has(appt.id) ? 'bg-indigo-50' : ''} cursor-pointer"
                                        ondblclick={() => openBookingModal(appt)}
                                        title="Double-click to edit appointment"
                                    >
                                        <td class="px-4 py-3 whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.has(appt.id)}
                                                onchange={() => toggleRowSelection(appt.id)}
                                                ondblclick={(e) => e.stopPropagation()}
                                                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(appt.start_time).toLocaleDateString()}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(appt.start_time).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-900">
                                            <div class="flex items-center gap-2">
                                                {#if appt.relationship_to_primary}
                                                    <span title="Child/Dependent">👶</span>
                                                {:else}
                                                    <span title="Adult">👤</span>
                                                {/if}
                                                <span class="font-semibold">{appt.patient_name}</span>
                                            </div>
                                            {#if appt.date_of_birth}
                                                {@const age = Math.floor(
                                                    (new Date().getTime() - new Date(appt.date_of_birth).getTime()) /
                                                    (365.25 * 24 * 60 * 60 * 1000)
                                                )}
                                                <span class="text-xs text-gray-500">({age} {age === 1 ? 'year' : 'years'})</span>
                                            {/if}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {appt.doctor_name || 'N/A'}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {$t(`assistant.dashboard.appointment.type.${appt.appointment_type}`)}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap">
                                            <span
                                                class="px-2 py-1 text-xs font-bold rounded-full uppercase
                                                {appt.status === 'confirmed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : appt.status === 'cancelled'
                                                      ? 'bg-red-100 text-red-800'
                                                      : appt.status === 'no_show'
                                                        ? 'bg-gray-100 text-gray-800'
                                                        : 'bg-blue-100 text-blue-800'}"
                                            >
                                                {$t(`assistant.dashboard.appointment.status.${appt.status}`)}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                            {appt.notes || '-'}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium" onclick={(e) => e.stopPropagation()}>
                                            <div class="flex items-center gap-4">
                                                {#if appt.status === "scheduled"}
                                                    <form
                                                        method="POST"
                                                        action="?/updateStatus"
                                                        use:enhance
                                                        class="inline"
                                                    >
                                                        <input type="hidden" name="appointment_id" value={appt.id} />
                                                        <input type="hidden" name="status" value="confirmed" />
                                                        <button
                                                            type="button"
                                                            onclick={(e) => showConfirmation(e, 'single', 'confirmed', appt.id)}
                                                            class="px-4 py-3 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors text-2xl font-bold min-w-[50px]"
                                                            title="Confirm"
                                                            ondblclick={(e) => e.stopPropagation()}
                                                        >
                                                            ✓
                                                        </button>
                                                    </form>
                                                {/if}
                                                <button
                                                    onclick={() => openBookingModal(appt)}
                                                    class="px-4 py-3 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors text-2xl font-bold min-w-[50px]"
                                                    title="Edit"
                                                    ondblclick={(e) => e.stopPropagation()}
                                                >
                                                    ✎
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                {:else}
                                    <tr>
                                        <td colspan="9" class="px-4 py-12 text-center text-gray-500 italic">
                                            {$t("assistant.dashboard.tabs.schedule.empty")}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- PATIENTS TAB -->
    {#if activeTab === "patients"}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div
                class="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50"
            >
                <h3 class="text-lg font-bold text-gray-900">
                    {$t("assistant.dashboard.tabs.patients.header")}
                </h3>
                <button
                    onclick={() => (isPatientModalOpen = true)}
                    class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all"
                >
                    {$t("assistant.dashboard.tabs.patients.addButton")}
                </button>
            </div>
            <div class="p-6">
                <div class="relative mb-6">
                    <span
                        class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"
                        >🔍</span
                    >
                    <input
                        type="text"
                        bind:value={searchPatientQuery}
                        placeholder={$t(
                            "assistant.dashboard.tabs.patients.searchPlaceholder",
                        )}
                        class="w-full pl-10 border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[500px] overflow-y-auto pr-2"
                >
                    {#each getFilteredPatients() as patient}
                        <div
                            class="p-4 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group bg-white"
                        >
                            <p
                                class="font-bold text-gray-900 group-hover:text-indigo-600 flex justify-between"
                            >
                                {patient.full_name}
                                <span class="text-[10px] text-gray-300"
                                    >#{$t(
                                        "assistant.dashboard.tabs.patients.patientId",
                                    )}{patient.id}</span
                                >
                            </p>
                            <div class="mt-3 space-y-1">
                                <p
                                    class="text-sm text-gray-600 flex items-center gap-2"
                                >
                                    <span class="opacity-50">📞</span>
                                    {patient.phone || "-"}
                                </p>
                                <p
                                    class="text-sm text-gray-600 flex items-center gap-2"
                                >
                                    <span class="opacity-50">🎂</span>
                                    {patient.date_of_birth}
                                </p>
                            </div>
                            <button
                                onclick={() =>
                                    openBookingModal(
                                        null,
                                        new Date().toISOString().split("T")[0] +
                                            "T09:00",
                                    )}
                                class="mt-4 w-full py-2 bg-gray-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                                {$t(
                                    "assistant.dashboard.tabs.patients.scheduleVisit",
                                )}
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    <!-- PAYMENTS TAB -->
    {#if activeTab === "payments"}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900">
                    {$t("assistant.dashboard.tabs.payments.header")}
                </h3>
                <p class="text-xs text-gray-500 font-medium">
                    {$t("assistant.dashboard.tabs.payments.description")}
                </p>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-100">
                    <thead class="bg-gray-50/50">
                        <tr>
                            <th
                                class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                >{$t("common.patient")}</th
                            >
                            <th
                                class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                >{$t(
                                    "assistant.dashboard.tabs.payments.balanceDue",
                                )}</th
                            >
                            <th
                                class="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                >{$t("common.actions")}</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.pendingPayments as p}
                            <tr class="hover:bg-gray-50/50">
                                <td class="px-6 py-4">
                                    <p class="text-sm font-bold text-gray-900">
                                        {p.full_name}
                                    </p>
                                    <p class="text-xs text-gray-500">
                                        {p.phone}
                                    </p>
                                </td>
                                <td class="px-6 py-4">
                                    <span
                                        class="text-sm font-black text-red-600"
                                        >{APP_CONFIG.currencySymbol}{p.balance_due.toFixed(
                                            2,
                                        )}</span
                                    >
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button
                                        onclick={() => openPaymentModal(p)}
                                        class="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                        {$t(
                                            "assistant.dashboard.tabs.payments.collectPayment",
                                        )}
                                    </button>
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td
                                    colspan="3"
                                    class="px-6 py-12 text-center text-gray-400 italic"
                                    >{$t(
                                        "assistant.dashboard.tabs.payments.empty",
                                    )}</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}

<!-- Confirmation Modal -->
{#if isConfirmModalOpen && pendingAction}
    <div
        class="relative z-50 overflow-y-auto"
        aria-labelledby="confirm-modal-title"
        role="dialog"
        aria-modal="true"
    >
        <div
            class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
            onclick={cancelConfirmation}
        ></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div
                class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
            >
                <div
                    class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                >
                    <div class="bg-white px-6 py-5">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="flex-shrink-0">
                                <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <span class="text-2xl">⚠️</span>
                                </div>
                            </div>
                            <div class="flex-1">
                                <h3
                                    class="text-lg font-bold text-gray-900"
                                    id="confirm-modal-title"
                                >
                                    Confirm Status Change
                                </h3>
                            </div>
                        </div>
                        <div class="mb-6">
                            <p class="text-sm text-gray-600">
                                {#if pendingAction.type === 'bulk'}
                                    Are you sure you want to {pendingAction.status === 'confirmed' ? 'confirm' : 'cancel'} <strong>{pendingAction.count}</strong> appointment{pendingAction.count === 1 ? '' : 's'}?
                                {:else}
                                    Are you sure you want to change this appointment status to <strong>{pendingAction.status}</strong>?
                                {/if}
                            </p>
                        </div>
                        <div class="flex gap-3 justify-end">
                            <button
                                type="button"
                                onclick={cancelConfirmation}
                                class="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onclick={confirmAction}
                                class="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors
                                {pendingAction.status === 'confirmed' 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : pendingAction.status === 'cancelled'
                                      ? 'bg-red-600 hover:bg-red-700'
                                      : 'bg-indigo-600 hover:bg-indigo-700'}"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
</div>

<!-- MODALS -->

<!-- Modal: Booking / Edit -->
{#if isBookingModalOpen}
    <div
        class="relative z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
    >
        <div
            class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
            onclick={closeModal}
        ></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div
                class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
            >
                <div
                    class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                >
                    <form
                        method="POST"
                        action={selectedAppointment?.id
                            ? "?/updateAppointment"
                            : "?/createAppointment"}
                        use:enhance={() => {
                            errorMessage = "";
                            return async ({ result, update }) => {
                                if (result.type === "success") {
                                    closeModal();
                                    // Force reload if in calendar view to ensure fresh data and view persistence
                                    if (viewMode === "calendar") {
                                        window.location.href = "?view=calendar";
                                        return;
                                    }
                                } else if (result.type === "failure") {
                                    errorMessage =
                                        (result.data as any)?.error ||
                                        "Error occurred";
                                }
                                await update();
                            };
                        }}
                    >
                        {#if selectedAppointment?.id}
                            <input
                                type="hidden"
                                name="id"
                                value={selectedAppointment.id}
                            />
                        {/if}
                        <div class="bg-white px-6 pt-6 pb-6">
                            <h3
                                class="text-xl font-black text-gray-900 mb-6 border-b pb-4 flex items-center gap-2"
                            >
                                <span class="w-2 h-8 bg-indigo-600 rounded-full"
                                ></span>
                                {selectedAppointment?.id
                                    ? $t(
                                          "assistant.dashboard.appointment.modals.edit",
                                      )
                                    : $t(
                                          "assistant.dashboard.appointment.modals.new",
                                      )}
                            </h3>

                            {#if errorMessage}
                                <div
                                    class="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium"
                                >
                                    {errorMessage}
                                </div>
                            {/if}

                            <div class="space-y-5">
                                <div>
                                    <label
                                        class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                        >{$t(
                                            "assistant.dashboard.appointment.fields.patient",
                                        )}</label
                                    >
                                    <select
                                        name="patient_id"
                                        required
                                        class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500"
                                        value={selectedAppointment?.patient_id ||
                                            ""}
                                    >
                                        <option value=""
                                            >{$t(
                                                "assistant.dashboard.appointment.selectOptions.selectPatient",
                                            )}</option
                                        >
                                        {#each data.patients as patient}
                                            <option value={patient.id}
                                                >{patient.full_name}</option
                                            >
                                        {/each}
                                    </select>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.doctor",
                                            )}</label
                                        >
                                        <select
                                            name="doctor_id"
                                            required
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                            value={selectedAppointment?.doctor_id ||
                                                ""}
                                        >
                                            {#each data.doctors as doctor}
                                                <option value={doctor.id}
                                                    >{$t(
                                                        "assistant.dashboard.time.dr",
                                                    )}
                                                    {doctor.full_name}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.type",
                                            )}</label
                                        >
                                        <select
                                            name="appointment_type"
                                            required
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                            value={selectedAppointment?.appointment_type ||
                                                "consultation"}
                                        >
                                            <option value="consultation"
                                                >{$t(
                                                    "assistant.dashboard.appointment.type.consultation",
                                                )}</option
                                            >
                                            <option value="checkup"
                                                >{$t(
                                                    "assistant.dashboard.appointment.type.checkup",
                                                )}</option
                                            >
                                            <option value="cleaning"
                                                >{$t(
                                                    "assistant.dashboard.appointment.type.cleaning",
                                                )}</option
                                            >
                                            <option value="emergency"
                                                >{$t(
                                                    "assistant.dashboard.appointment.type.emergency",
                                                )}</option
                                            >
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.startTime",
                                            )}</label
                                        >
                                        <input
                                            type="datetime-local"
                                            name="start_time"
                                            required
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                            value={selectedAppointment?.start_time
                                                ? new Date(
                                                      new Date(
                                                          selectedAppointment.start_time,
                                                      ).getTime() -
                                                          new Date().getTimezoneOffset() *
                                                              60000,
                                                  )
                                                      .toISOString()
                                                      .slice(0, 16)
                                                : ""}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.duration",
                                            )}</label
                                        >
                                        <select
                                            name="duration_minutes"
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                            value={selectedAppointment?.duration_minutes
                                                ? selectedAppointment.duration_minutes.toString()
                                                : "30"}
                                        >
                                            <option value="15"
                                                >15 {$t(
                                                    "common.minutes_short",
                                                )}</option
                                            >
                                            <option value="30"
                                                >30 {$t(
                                                    "common.minutes_short",
                                                )}</option
                                            >
                                            <option value="45"
                                                >45 {$t(
                                                    "common.minutes_short",
                                                )}</option
                                            >
                                            <option value="60"
                                                >60 {$t(
                                                    "common.minutes_short",
                                                )}</option
                                            >
                                        </select>
                                    </div>
                                </div>

                                {#if selectedAppointment?.id}
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.status",
                                            )}</label
                                        >
                                        <select
                                            name="status"
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                            value={selectedAppointment.status}
                                        >
                                            <option value="scheduled"
                                                >{$t(
                                                    "assistant.dashboard.appointment.status.scheduled",
                                                )}</option
                                            >
                                            <option value="confirmed"
                                                >{$t(
                                                    "assistant.dashboard.appointment.status.confirmed",
                                                )}</option
                                            >
                                            <option value="cancelled"
                                                >{$t(
                                                    "assistant.dashboard.appointment.status.cancelled",
                                                )}</option
                                            >
                                            <option value="no_show"
                                                >{$t(
                                                    "assistant.dashboard.appointment.status.no_show",
                                                )}</option
                                            >
                                            <option value="completed"
                                                >{$t(
                                                    "assistant.dashboard.appointment.status.completed",
                                                )}</option
                                            >
                                        </select>
                                    </div>

                                    <!-- Appointment Tracking Info -->
                                    {#if selectedAppointment?.created_by_name || selectedAppointment?.confirmed_by_name}
                                        <div
                                            class="bg-gray-50 rounded-xl p-4 border border-gray-200"
                                        >
                                            <p
                                                class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"
                                            >
                                                Appointment History
                                            </p>
                                            <div class="space-y-1">
                                                {#if selectedAppointment.created_by_name}
                                                    <p
                                                        class="text-sm text-gray-700"
                                                    >
                                                        <span
                                                            class="font-semibold"
                                                            >✏️ Created by:</span
                                                        >
                                                        {selectedAppointment.created_by_name}
                                                    </p>
                                                {:else if selectedAppointment.notes && selectedAppointment.notes.includes("Source: Web")}
                                                    <p
                                                        class="text-sm text-gray-700"
                                                    >
                                                        <span
                                                            class="font-semibold"
                                                            >🌐 Source:</span
                                                        > Portal Booking
                                                    </p>
                                                {/if}
                                                {#if selectedAppointment.confirmed_by_name}
                                                    <p
                                                        class="text-sm text-gray-700"
                                                    >
                                                        <span
                                                            class="font-semibold"
                                                            >✓ Confirmed by:</span
                                                        >
                                                        {selectedAppointment.confirmed_by_name}
                                                    </p>
                                                {/if}
                                            </div>
                                        </div>
                                    {/if}
                                {/if}

                                <div>
                                    <label
                                        class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                        >{$t(
                                            "assistant.dashboard.appointment.fields.notes",
                                        )}</label
                                    >
                                    <textarea
                                        name="notes"
                                        rows="2"
                                        class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                        placeholder={$t(
                                            "assistant.dashboard.appointment.fields.additionalNotes",
                                        )}
                                        >{selectedAppointment?.notes ||
                                            ""}</textarea
                                    >
                                </div>
                            </div>
                        </div>
                        <div
                            class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3"
                        >
                            <button
                                type="submit"
                                class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                            >
                                {selectedAppointment?.id
                                    ? $t(
                                          "assistant.dashboard.appointment.modals.save",
                                      )
                                    : $t(
                                          "assistant.dashboard.appointment.modals.schedule",
                                      )}
                            </button>
                            <button
                                type="button"
                                class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100 hover:bg-gray-100 transition-all"
                                onclick={closeModal}
                                >{$t("common.cancel")}</button
                            >
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
        <div
            class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onclick={() => (isPatientModalOpen = false)}
        ></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div
                class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
            >
                <div
                    class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                >
                    <form
                        method="POST"
                        action="?/createPatient"
                        use:enhance={() => {
                            errorMessage = "";
                            return async ({ result, update }) => {
                                if (result.type === "success") {
                                    isPatientModalOpen = false;
                                } else {
                                    errorMessage =
                                        (result.data as any)?.error ||
                                        "Registration failed";
                                }
                                await update();
                            };
                        }}
                    >
                        <div class="p-6">
                            <h3
                                class="text-xl font-black text-gray-900 mb-6 border-b pb-4 flex items-center gap-2"
                            >
                                <span class="w-2 h-8 bg-indigo-600 rounded-full"
                                ></span>
                                {$t("assistant.dashboard.patient.modals.new")}
                            </h3>
                            {#if errorMessage}
                                <div
                                    class="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm"
                                >
                                    {errorMessage}
                                </div>
                            {/if}
                            <div class="space-y-4">
                                <div>
                                    <label
                                        class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                        >{$t(
                                            "assistant.dashboard.patient.fields.fullName",
                                        )}</label
                                    >
                                    <input
                                        name="full_name"
                                        required
                                        class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                        placeholder={$t(
                                            "assistant.dashboard.patient.fields.namePlaceholder",
                                        )}
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                        >{$t(
                                            "assistant.dashboard.patient.fields.phone",
                                        )}</label
                                    >
                                    <input
                                        name="phone"
                                        required
                                        class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                        placeholder={$t(
                                            "assistant.dashboard.patient.fields.phonePlaceholder",
                                        )}
                                    />
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.patient.fields.dob",
                                            )}</label
                                        >
                                        <input
                                            type="date"
                                            name="date_of_birth"
                                            required
                                            max={maxDateOfBirth}
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.patient.fields.email",
                                            )}</label
                                        >
                                        <input
                                            name="email"
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                            placeholder={$t(
                                                "assistant.dashboard.patient.fields.emailPlaceholder",
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3"
                        >
                            <button
                                type="submit"
                                class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg"
                                >{$t(
                                    "assistant.dashboard.patient.modals.register",
                                )}</button
                            >
                            <button
                                type="button"
                                class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100"
                                onclick={() => (isPatientModalOpen = false)}
                                >{$t("common.cancel")}</button
                            >
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
        <div
            class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onclick={() => (isPaymentModalOpen = false)}
        ></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div
                class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
            >
                <div
                    class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                >
                    <form
                        method="POST"
                        action="?/recordPayment"
                        use:enhance={() => {
                            errorMessage = "";
                            return async ({ result, update }) => {
                                if (result.type === "success") {
                                    isPaymentModalOpen = false;
                                } else {
                                    errorMessage =
                                        (result.data as any)?.error ||
                                        "Payment failed";
                                }
                                await update();
                            };
                        }}
                    >
                        <input
                            type="hidden"
                            name="patient_id"
                            value={selectedPaymentPatient.patient_id}
                        />
                        <div class="p-6">
                            <h3
                                class="text-xl font-black text-gray-900 mb-2 flex items-center gap-2"
                            >
                                <span class="w-2 h-8 bg-indigo-600 rounded-full"
                                ></span>
                                {$t("assistant.dashboard.payment.modal.title")}
                            </h3>
                            <p
                                class="text-gray-400 text-xs font-bold uppercase mb-6 tracking-widest"
                            >
                                {selectedPaymentPatient.full_name}
                            </p>

                            <div
                                class="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6 flex justify-between items-center"
                            >
                                <span
                                    class="text-xs font-bold text-red-600 uppercase tracking-widest"
                                    >{$t(
                                        "assistant.dashboard.payment.modal.totalDue",
                                    )}</span
                                >
                                <span class="text-xl font-black text-red-600"
                                    >{APP_CONFIG.currencySymbol}{selectedPaymentPatient.balance_due.toFixed(
                                        2,
                                    )}</span
                                >
                            </div>

                            {#if errorMessage}
                                <div
                                    class="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm"
                                >
                                    {errorMessage}
                                </div>
                            {/if}

                            <div class="space-y-4">
                                <div>
                                    <label
                                        class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                        >{$t(
                                            "assistant.dashboard.payment.fields.amount",
                                        )}</label
                                    >
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="amount"
                                        required
                                        class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-lg font-black text-indigo-600"
                                        value={selectedPaymentPatient.balance_due}
                                    />
                                </div>
                                <div>
                                    <label
                                        class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                        >{$t(
                                            "assistant.dashboard.payment.fields.paymentMethod",
                                        )}</label
                                    >
                                    <select
                                        name="payment_method"
                                        class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-bold"
                                    >
                                        <option value="cash"
                                            >{$t(
                                                "assistant.dashboard.payment.methods.cash",
                                            )}</option
                                        >
                                        <option value="card"
                                            >{$t(
                                                "assistant.dashboard.payment.methods.card",
                                            )}</option
                                        >
                                        <option value="insurance"
                                            >{$t(
                                                "assistant.dashboard.payment.methods.insurance",
                                            )}</option
                                        >
                                        <option value="bank_transfer"
                                            >{$t(
                                                "assistant.dashboard.payment.methods.bank_transfer",
                                            )}</option
                                        >
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div
                            class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3"
                        >
                            <button
                                type="submit"
                                class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                                >{$t(
                                    "assistant.dashboard.payment.modal.confirm",
                                )}</button
                            >
                            <button
                                type="button"
                                class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100"
                                onclick={() => (isPaymentModalOpen = false)}
                                >{$t("common.cancel")}</button
                            >
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Confirmation Modal -->
{#if isConfirmModalOpen && pendingAction}
    <div
        class="relative z-50 overflow-y-auto"
        aria-labelledby="confirm-modal-title"
        role="dialog"
        aria-modal="true"
    >
        <div
            class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
            onclick={cancelConfirmation}
        ></div>
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div
                class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
            >
                <div
                    class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                >
                    <div class="bg-white px-6 py-5">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="flex-shrink-0">
                                <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <span class="text-2xl">⚠️</span>
                                </div>
                            </div>
                            <div class="flex-1">
                                <h3
                                    class="text-lg font-bold text-gray-900"
                                    id="confirm-modal-title"
                                >
                                    Confirm Status Change
                                </h3>
                            </div>
                        </div>
                        <div class="mb-6">
                            <p class="text-sm text-gray-600">
                                {#if pendingAction.type === 'bulk'}
                                    Are you sure you want to {pendingAction.status === 'confirmed' ? 'confirm' : 'cancel'} <strong>{pendingAction.count}</strong> appointment{pendingAction.count === 1 ? '' : 's'}?
                                {:else}
                                    Are you sure you want to change this appointment status to <strong>{pendingAction.status}</strong>?
                                {/if}
                            </p>
                        </div>
                        <div class="flex gap-3 justify-end">
                            <button
                                type="button"
                                onclick={cancelConfirmation}
                                class="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onclick={confirmAction}
                                class="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors
                                {pendingAction.status === 'confirmed' 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : pendingAction.status === 'cancelled'
                                      ? 'bg-red-600 hover:bg-red-700'
                                      : 'bg-indigo-600 hover:bg-indigo-700'}"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}
