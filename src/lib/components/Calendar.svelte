<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Calendar } from "@fullcalendar/core";
    import dayGridPlugin from "@fullcalendar/daygrid";
    import timeGridPlugin from "@fullcalendar/timegrid";
    import interactionPlugin from "@fullcalendar/interaction";

    interface Props {
        events: any[];
        onEventClick?: (info: any) => void;
        onEventDrop?: (info: any) => void;
        onEventResize?: (info: any) => void;
        onDateClick?: (info: any) => void;
        onEventMouseEnter?: (info: any) => void;
        onEventMouseLeave?: (info: any) => void;
        initialView?: string;
        editable?: boolean;
        locale?: string;
        direction?: "ltr" | "rtl";
    }

    let {
        events = [],
        onEventClick,
        onEventDrop,
        onEventResize,
        onDateClick,
        onEventMouseEnter,
        onEventMouseLeave,
        initialView = "timeGridWeek",
        editable = false,
        locale = "fr",
        direction = "ltr",
    }: Props = $props();

    let calendarEl: HTMLElement;
    let calendar: Calendar;

    $effect(() => {
        if (calendar) {
            // Remove existing event sources
            const sources = calendar.getEventSources();
            for (const source of sources) {
                source.remove();
            }
            // Add new events
            calendar.addEventSource(events);
        }
    });

    $effect(() => {
        if (calendar) {
            calendar.setOption("locale", locale);
            calendar.setOption("direction", direction);
        }
    });

    let clinicSettings = $state<any>(null);
    let workStartHour = $state(9);
    let workEndHour = $state(18);

    async function loadClinicSettings() {
        try {
            const res = await fetch("/api/admin/clinic-settings");
            const data = await res.json();
            if (data.settings) {
                clinicSettings = data.settings;
                workStartHour = parseInt(
                    data.settings.work_start_time.split(":")[0],
                );
                workEndHour = parseInt(
                    data.settings.work_end_time.split(":")[0],
                );

                if (calendar) {
                    calendar.setOption(
                        "slotMinTime",
                        `${workStartHour.toString().padStart(2, "0")}:00:00`,
                    );
                    calendar.setOption(
                        "slotMaxTime",
                        `${workEndHour.toString().padStart(2, "0")}:00:00`,
                    );
                    calendar.setOption("businessHours", {
                        daysOfWeek: [1, 2, 3, 4, 5],
                        startTime: data.settings.work_start_time,
                        endTime: data.settings.work_end_time,
                    });
                }
            }
        } catch (e) {
            console.error("Failed to load clinic settings in calendar:", e);
        }
    }

    onMount(async () => {
        calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView,
            locale,
            direction,
            headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
            },
            events,
            editable,
            eventClick: onEventClick,
            eventDrop: onEventDrop,
            eventResize: onEventResize,
            dateClick: onDateClick,
            eventMouseEnter: (info) => {
                console.log("Calendar: mouseenter fired", info);
                if (onEventMouseEnter) onEventMouseEnter(info);
            },
            eventMouseLeave: (info) => {
                if (onEventMouseLeave) onEventMouseLeave(info);
            },
            height: "auto",
            nowIndicator: true,
            slotMinTime: `${workStartHour.toString().padStart(2, "0")}:00:00`,
            slotMaxTime: `${workEndHour.toString().padStart(2, "0")}:00:00`,
            allDaySlot: false,
            businessHours: {
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: "09:00",
                endTime: "18:00",
            },
        });

        calendar.render();
        await loadClinicSettings();
    });

    onDestroy(() => {
        if (calendar) {
            calendar.destroy();
        }
    });
</script>

<div bind:this={calendarEl} class="bg-white p-4 rounded-lg shadow"></div>

<style>
    :global(.fc) {
        --fc-border-color: #e5e7eb;
        --fc-button-bg-color: #4f46e5;
        --fc-button-border-color: #4f46e5;
        --fc-button-hover-bg-color: #4338ca;
        --fc-button-hover-border-color: #4338ca;
        --fc-button-active-bg-color: #3730a3;
        --fc-button-active-border-color: #3730a3;
        --fc-event-bg-color: #4f46e5;
        --fc-event-border-color: #4f46e5;
    }

    :global(.fc-toolbar-title) {
        font-size: 1.25rem !important;
        font-weight: 700 !important;
        color: #111827;
    }

    :global(.fc-button) {
        text-transform: capitalize !important;
        font-weight: 600 !important;
        font-size: 0.875rem !important;
        padding: 0.5rem 1rem !important;
        border-radius: 0.5rem !important;
    }

    :global(.fc-v-event) {
        border-radius: 4px !important;
        padding: 2px 4px !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
</style>
