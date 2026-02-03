<script lang="ts">
    import { onMount } from "svelte";
    import flatpickr from "flatpickr";
    import "flatpickr/dist/flatpickr.css";
    import { t } from "svelte-i18n";

    interface Props {
        doctorId?: string | number;
        selectedDate?: string;
        selectedTime?: string;
        onDateChange?: (date: string) => void;
        onTimeChange?: (time: string) => void;
        compact?: boolean;
    }

    let {
        doctorId = "",
        selectedDate = $bindable(""),
        selectedTime = $bindable(""),
        onDateChange,
        onTimeChange,
        compact = false,
    }: Props = $props();

    let timeSlots = $state<
        Array<{ time: string; status: "available" | "pending" | "booked" }>
    >([]);
    let loading = $state(false);
    let error = $state("");
    let datepickerContainer: HTMLElement;
    let fp: any;

    // Reactive: refetch slots when doctorId changes
    $effect(() => {
        if (selectedDate && doctorId) {
            fetchAvailableSlots(selectedDate, doctorId);
        }
    });

    async function fetchAvailableSlots(date: string, docId?: string | number) {
        if (!date) {
            timeSlots = [];
            return;
        }

        loading = true;
        error = "";

        try {
            const url = new URL(
                "/api/booking/available-slots",
                window.location.origin,
            );
            url.searchParams.append("date", date);
            if (docId) url.searchParams.append("doctor_id", docId.toString());

            const response = await fetch(url);
            const data = await response.json();

            if (response.ok) {
                timeSlots = data.slots || [];
                if (timeSlots.length === 0) {
                    error = $t("booking.fully_booked");
                }
            } else {
                error = data.error || "Échec du chargement";
                timeSlots = [];
            }
        } catch (e) {
            error = "Erreur de connexion";
            timeSlots = [];
        } finally {
            loading = false;
        }
    }

    function handleTimeSelect(time: string) {
        const dateTime = `${selectedDate}T${time}`;
        selectedTime = dateTime;
        if (onTimeChange) onTimeChange(dateTime);
    }

    let unavailableDates = $state<string[]>([]);
    let nonWorkingDays = $state<number[]>([]);

    async function loadUnavailableDates() {
        const today = new Date();
        const threeMonthsLater = new Date();
        threeMonthsLater.setMonth(today.getMonth() + 3);

        try {
            const res = await fetch(
                `/api/booking/unavailable-dates?start_date=${today.toISOString().split("T")[0]}&end_date=${threeMonthsLater.toISOString().split("T")[0]}`,
            );
            const data = await res.json();

            unavailableDates = data.closureDates || [];
            nonWorkingDays = data.nonWorkingDays || [];

            if (fp) {
                fp.set("disable", [
                    function (date: Date) {
                        if (nonWorkingDays.includes(date.getDay())) return true;
                        const dateStr = date.toISOString().split("T")[0];
                        if (unavailableDates.includes(dateStr)) return true;
                        return false;
                    },
                ]);
            }
        } catch (e) {
            console.error("Failed to load unavailable dates:", e);
        }
    }

    onMount(() => {
        fp = flatpickr(datepickerContainer as HTMLElement, {
            inline: true,
            minDate: "today",
            dateFormat: "Y-m-d",
            defaultDate: selectedDate || undefined,
            disable: [
                function (date: Date) {
                    return false;
                },
            ],
            onChange: (selectedDates: Date[], dateStr: string) => {
                selectedDate = dateStr;
                if (onDateChange) onDateChange(dateStr);
                selectedTime = "";
                if (onTimeChange) onTimeChange("");
                fetchAvailableSlots(dateStr, doctorId);
            },
        });

        loadUnavailableDates();

        if (selectedDate) {
            fetchAvailableSlots(selectedDate, doctorId);
        }

        return () => {
            if (fp) {
                fp.destroy();
            }
        };
    });
</script>

<div class="slot-picker-wrapper" class:compact>
    <!-- Calendar -->
    <div class="calendar-section">
        <div class="section-label">
            <span class="icon">📅</span>
            <span>{$t("booking.select_date")}</span>
        </div>
        <div bind:this={datepickerContainer} class="flatpickr-container"></div>
    </div>

    <!-- Time Slots -->
    {#if selectedDate}
        <div class="slots-section">
            <div class="section-label">
                <span class="icon">🕐</span>
                <span
                    >{$t("booking.available_slots_for", {
                        values: {
                            date: new Date(selectedDate).toLocaleDateString(
                                "fr-FR",
                                {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                },
                            ),
                        },
                    })}</span
                >
            </div>

            {#if loading}
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>{$t("booking.loading_slots")}</p>
                </div>
            {:else if error}
                <div class="error-state">
                    <span>⚠️</span>
                    <p>{error}</p>
                </div>
            {:else if timeSlots.length > 0}
                <div class="slots-grid">
                    {#each timeSlots as slot}
                        {@const isSelected =
                            selectedTime === `${selectedDate}T${slot.time}`}
                        <button
                            type="button"
                            disabled={slot.status === "booked"}
                            onclick={() => handleTimeSelect(slot.time)}
                            class="slot-chip"
                            class:selected={isSelected}
                            class:available={slot.status === "available" &&
                                !isSelected}
                            class:pending={slot.status === "pending" &&
                                !isSelected}
                            class:booked={slot.status === "booked"}
                        >
                            <span class="time">{slot.time}</span>
                            {#if slot.status === "booked"}
                                <span class="status-tag"
                                    >{$t("booking.status_booked")}</span
                                >
                            {:else if slot.status === "pending"}
                                <span class="status-tag"
                                    >{$t("booking.status_pending")}</span
                                >
                            {/if}
                            {#if isSelected}
                                <span class="check-mark">✓</span>
                            {/if}
                        </button>
                    {/each}
                </div>
                <div class="legend">
                    <span class="legend-item available"
                        ><span class="dot"></span>
                        {$t("booking.status_available")}</span
                    >
                    <span class="legend-item pending"
                        ><span class="dot"></span>
                        {$t("booking.status_pending")}</span
                    >
                    <span class="legend-item booked"
                        ><span class="dot"></span>
                        {$t("booking.status_booked")}</span
                    >
                </div>
            {:else}
                <div class="empty-state">
                    <span>📭</span>
                    <p>{$t("booking.fully_booked")}</p>
                </div>
            {/if}
        </div>
    {:else}
        <div class="prompt-state">
            <span>👆</span>
            <p>
                {$t("booking.pick_date_to_begin")}
            </p>
        </div>
    {/if}
</div>

<style>
    .slot-picker-wrapper {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .slot-picker-wrapper.compact {
        gap: 1rem;
    }

    .calendar-section,
    .slots-section {
        background: white;
        border-radius: 1rem;
        border: 1px solid #e5e7eb;
        padding: 1rem;
    }

    .slot-picker-wrapper.compact .calendar-section,
    .slot-picker-wrapper.compact .slots-section {
        padding: 0.75rem;
    }

    .section-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 700;
        color: #374151;
        margin-bottom: 0.75rem;
    }

    .section-label .icon {
        font-size: 1rem;
    }

    .flatpickr-container {
        display: flex;
        justify-content: center;
    }

    :global(.slot-picker-wrapper .flatpickr-calendar) {
        width: 100% !important;
        box-shadow: none !important;
        border: none !important;
        background: transparent !important;
    }

    :global(.slot-picker-wrapper .flatpickr-day) {
        height: 36px !important;
        line-height: 36px !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
    }

    :global(.slot-picker-wrapper .flatpickr-day.selected) {
        background: #4f46e5 !important;
        border-color: #4f46e5 !important;
    }

    :global(.slot-picker-wrapper .flatpickr-day.today) {
        border-color: #4f46e5 !important;
        color: #4f46e5 !important;
    }

    .slots-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 0.5rem;
    }

    .slot-chip {
        position: relative;
        padding: 0.625rem 0.5rem;
        border-radius: 0.5rem;
        font-size: 0.8125rem;
        font-weight: 700;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.125rem;
    }

    .slot-chip.available {
        background: #f0fdf4;
        border-color: #bbf7d0;
        color: #166534;
    }

    .slot-chip.available:hover {
        background: #dcfce7;
        border-color: #22c55e;
        transform: translateY(-2px);
    }

    .slot-chip.pending {
        background: #fffbeb;
        border-color: #fde68a;
        color: #92400e;
    }

    .slot-chip.booked {
        background: #f3f4f6;
        border-color: #e5e7eb;
        color: #9ca3af;
        cursor: not-allowed;
        opacity: 0.7;
    }

    .slot-chip.selected {
        background: #4f46e5;
        border-color: #4f46e5;
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        transform: translateY(-2px);
    }

    .slot-chip .time {
        font-size: 0.875rem;
    }

    .slot-chip .status-tag {
        font-size: 0.625rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.8;
    }

    .slot-chip .check-mark {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 16px;
        height: 16px;
        background: white;
        color: #4f46e5;
        border-radius: 50%;
        font-size: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
    }

    .legend {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-top: 1rem;
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .legend-item .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .legend-item.available .dot {
        background: #22c55e;
    }
    .legend-item.pending .dot {
        background: #f59e0b;
    }
    .legend-item.booked .dot {
        background: #9ca3af;
    }
    .legend-item.available {
        color: #166534;
    }
    .legend-item.pending {
        color: #92400e;
    }
    .legend-item.booked {
        color: #6b7280;
    }

    .loading-state,
    .error-state,
    .empty-state,
    .prompt-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 2rem 1rem;
        text-align: center;
        border-radius: 0.75rem;
    }

    .loading-state {
        background: #f8fafc;
    }

    .loading-state .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #e5e7eb;
        border-top-color: #4f46e5;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .error-state {
        background: #fef2f2;
        color: #b91c1c;
    }

    .empty-state {
        background: #f9fafb;
        color: #6b7280;
    }

    .prompt-state {
        background: #eef2ff;
        color: #4338ca;
        border: 2px dashed #c7d2fe;
    }

    .loading-state p,
    .error-state p,
    .empty-state p,
    .prompt-state p {
        font-size: 0.875rem;
        font-weight: 500;
        margin: 0;
    }

    .loading-state span,
    .error-state span,
    .empty-state span,
    .prompt-state span {
        font-size: 1.5rem;
    }
</style>
