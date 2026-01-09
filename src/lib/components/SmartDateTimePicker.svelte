<script lang="ts">
    import { onMount, tick } from "svelte";
    import flatpickr from "flatpickr";
    import "flatpickr/dist/flatpickr.css";
    import { t } from "svelte-i18n";

    interface Props {
        selectedDate: string;
        selectedTime: string;
        onDateChange: (date: string) => void;
        onTimeChange: (time: string) => void;
    }

    let {
        selectedDate = "",
        selectedTime = "",
        onDateChange,
        onTimeChange,
    }: Props = $props();

    let timeSlots = $state<
        Array<{ time: string; status: "available" | "pending" | "booked" }>
    >([]);
    let loading = $state(false);
    let error = $state("");
    let datepickerContainer: HTMLElement;
    let fp: any;

    // Fetch available slots when date changes
    async function fetchAvailableSlots(date: string) {
        if (!date) {
            timeSlots = [];
            return;
        }

        loading = true;
        error = "";

        try {
            const response = await fetch(
                `/api/booking/available-slots?date=${date}`,
            );
            const data = await response.json();

            if (response.ok) {
                timeSlots = data.slots || [];
                if (timeSlots.length === 0) {
                    error = $t("booking.fully_booked");
                }
            } else {
                error = data.error || "Failed to load available slots";
                timeSlots = [];
            }
        } catch (e) {
            error = "Failed to connect to server";
            timeSlots = [];
        } finally {
            loading = false;
        }
    }

    function handleTimeSelect(time: string) {
        const dateTime = `${selectedDate}T${time}`;
        onTimeChange(dateTime);
    }

    onMount(() => {
        // Initialize flatpickr
        fp = flatpickr(datepickerContainer as HTMLElement, {
            inline: true,
            minDate: "today",
            dateFormat: "Y-m-d",
            defaultDate: selectedDate || undefined,
            onChange: (selectedDates, dateStr) => {
                selectedDate = dateStr; // Update internal state
                onDateChange(dateStr);
                selectedTime = ""; // Reset internal time state
                onTimeChange(""); // Reset time when date changes
                fetchAvailableSlots(dateStr);
            },
        });

        // If there's an initial selected date, fetch slots
        if (selectedDate) {
            fetchAvailableSlots(selectedDate);
        }

        return () => {
            if (fp) {
                fp.destroy();
            }
        };
    });
</script>

<div class="space-y-6">
    <!-- Calendar Container -->
    <div class="calendar-card">
        <div class="block text-sm font-semibold text-gray-700 mb-4 px-1">
            <span class="flex items-center gap-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-teal-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
                {$t("booking.select_date")}
            </span>
        </div>
        <div
            bind:this={datepickerContainer}
            class="flatpickr-custom-container"
        ></div>
    </div>

    <!-- Time Slots -->
    {#if selectedDate}
        <div
            class="time-slots-section animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
            <label
                for="time-slots"
                class="block text-sm font-semibold text-gray-700 mb-4 px-1"
            >
                <span class="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-teal-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    {$t("booking.available_slots_for", {
                        values: { date: selectedDate },
                    })}
                </span>
            </label>

            {#if loading}
                <div
                    class="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200"
                >
                    <div
                        class="animate-spin inline-block w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full"
                    ></div>
                    <p class="mt-4 text-gray-500 font-medium">
                        {$t("booking.loading_slots")}
                    </p>
                </div>
            {:else if error}
                <div
                    class="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-amber-800"
                >
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">⚠️</span>
                        <p class="font-medium">{error}</p>
                    </div>
                </div>
            {:else if timeSlots.length > 0}
                <div
                    class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
                >
                    {#each timeSlots as slot}
                        {@const isSelected =
                            selectedTime === `${selectedDate}T${slot.time}`}
                        <button
                            type="button"
                            disabled={slot.status === "booked"}
                            onclick={() => handleTimeSelect(slot.time)}
                            class="group relative px-4 py-4 text-sm font-bold rounded-xl border-2 transition-all duration-300
                                {isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xl shadow-teal-100 -translate-y-1'
                                : ''}
                                {!isSelected && slot.status === 'available'
                                ? 'bg-white text-gray-700 border-gray-100 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 hover:-translate-y-1 hover:shadow-lg'
                                : ''}
                                {!isSelected && slot.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400 hover:-translate-y-1 hover:shadow-lg'
                                : ''}
                                {slot.status === 'booked'
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                                : ''}"
                        >
                            <div class="flex flex-col items-center">
                                <span>{slot.time}</span>
                                {#if slot.status === "pending" && !isSelected}
                                    <span
                                        class="text-[10px] uppercase tracking-tighter opacity-70"
                                        >{$t("booking.status_pending")}</span
                                    >
                                {/if}
                                {#if slot.status === "booked"}
                                    <span
                                        class="text-[10px] uppercase tracking-tighter opacity-70"
                                        >{$t("booking.status_booked")}</span
                                    >
                                {/if}
                            </div>

                            {#if isSelected}
                                <span
                                    class="absolute -top-1 -right-1 flex h-4 w-4"
                                >
                                    <span
                                        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"
                                    ></span>
                                    <span
                                        class="relative inline-flex rounded-full h-4 w-4 bg-teal-500 border-2 border-white"
                                    ></span>
                                </span>
                            {/if}
                        </button>
                    {/each}
                </div>
                <div class="mt-6 flex flex-wrap justify-center gap-4">
                    <span
                        class="flex items-center gap-1.5 text-xs font-bold text-teal-700"
                    >
                        <span class="w-2.5 h-2.5 rounded-full bg-teal-500"
                        ></span>
                        {$t("booking.status_available")}
                    </span>
                    <span
                        class="flex items-center gap-1.5 text-xs font-bold text-amber-600"
                    >
                        <span class="w-2.5 h-2.5 rounded-full bg-amber-500"
                        ></span>
                        {$t("booking.status_pending")}
                    </span>
                    <span
                        class="flex items-center gap-1.5 text-xs font-bold text-gray-400"
                    >
                        <span class="w-2.5 h-2.5 rounded-full bg-gray-300"
                        ></span>
                        {$t("booking.status_booked")}
                    </span>
                </div>
            {:else}
                <div
                    class="bg-gray-50 border-2 border-gray-100 rounded-2xl p-10 text-center"
                >
                    <div class="text-4xl mb-4">🗓️</div>
                    <p class="text-gray-700 font-bold text-lg">
                        {$t("booking.fully_booked")}
                    </p>
                    <p class="text-gray-500 text-sm mt-1">
                        {$t("booking.select_another_date")}
                    </p>
                </div>
            {/if}
        </div>
    {:else}
        <div
            class="bg-white border-2 border-dashed border-teal-100 rounded-2xl p-12 text-center animate-pulse"
        >
            <div
                class="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8 text-teal-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                </svg>
            </div>
            <p class="text-teal-800 font-bold">
                {$t("booking.pick_date_to_begin")}
            </p>
            <p class="text-teal-600/70 text-sm mt-1">
                {$t("booking.select_preferred_day")}
            </p>
        </div>
    {/if}
</div>

<style>
    .calendar-card {
        background: white;
        padding: 1.5rem;
        border-radius: 1.5rem;
        border: 1px solid #f1f5f9;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }

    :global(.flatpickr-custom-container) {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    :global(.flatpickr-calendar) {
        width: 100% !important;
        box-shadow: none !important;
        border: none !important;
        background: transparent !important;
        font-family: inherit !important;
    }

    :global(.flatpickr-innerContainer) {
        width: 100%;
    }

    :global(.flatpickr-rContainer) {
        width: 100%;
    }

    :global(.flatpickr-days) {
        width: 100% !important;
    }

    :global(.dayContainer) {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        justify-content: space-around;
    }

    :global(.flatpickr-day) {
        max-width: none !important;
        height: 48px !important;
        line-height: 48px !important;
        border-radius: 12px !important;
        margin: 2px !important;
        font-weight: 600 !important;
        color: #475569 !important;
        border: 1px solid transparent !important;
        transition: all 0.2s ease !important;
    }

    :global(.flatpickr-day.today) {
        border-color: #0d9488 !important;
        color: #0d9488 !important;
        background: #f0fdfa !important;
    }

    :global(.flatpickr-day.selected) {
        background: #0d9488 !important;
        border-color: #0d9488 !important;
        color: white !important;
        box-shadow: 0 10px 15px -3px rgba(13, 148, 136, 0.3) !important;
    }

    :global(.flatpickr-day:hover) {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
    }

    :global(.flatpickr-weekday) {
        font-weight: 700 !important;
        color: #94a3b8 !important;
    }

    :global(.flatpickr-current-month) {
        font-size: 1.1rem !important;
        font-weight: 700 !important;
        color: #1e293b !important;
    }

    :global(.flatpickr-month) {
        margin-bottom: 1rem !important;
    }

    :global(.flatpickr-prev-month, .flatpickr-next-month) {
        color: #0d9488 !important;
        fill: #0d9488 !important;
        padding: 10px !important;
    }

    :global(.flatpickr-prev-month:hover svg, .flatpickr-next-month:hover svg) {
        fill: #0d9488 !important;
    }
</style>
