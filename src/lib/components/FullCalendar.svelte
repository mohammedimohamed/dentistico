<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { Calendar } from "@fullcalendar/core";
    import dayGridPlugin from "@fullcalendar/daygrid";
    import timeGridPlugin from "@fullcalendar/timegrid";
    import interactionPlugin from "@fullcalendar/interaction";
    import frLocale from "@fullcalendar/core/locales/fr";
    import arLocale from "@fullcalendar/core/locales/ar";

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
        height?: string | number;
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
        height = "auto",
    }: Props = $props();

    let calendarEl: HTMLElement;
    let calendar = $state<Calendar | null>(null);
    let isFullscreen = $state(false);

    // Reactive update of events
    $effect(() => {
        if (calendar && events) {
            console.log(
                "📅 FullCalendar: Updating events",
                events.length,
                "events",
            );

            calendar.batchRendering(() => {
                // Remove all existing event sources
                const sources = calendar.getEventSources();
                sources.forEach((source) => source.remove());

                // Add new events as a source
                calendar.addEventSource({
                    id: "dynamic-events",
                    events: events,
                });
            });

            // Force update size after a short delay
            setTimeout(() => {
                if (calendar) calendar.updateSize();
            }, 500);
        }
    });

    // Reactive update of options
    $effect(() => {
        if (calendar) {
            calendar.setOption("locale", locale);
            calendar.setOption("direction", direction);
        }
    });

    function toggleFullscreen() {
        isFullscreen = !isFullscreen;
        // Immediate size update for responsive feel
        if (calendar) {
            setTimeout(() => {
                calendar.updateSize();
            }, 100);
        }
    }

    onMount(async () => {
        calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView,
            locales: [frLocale, arLocale],
            locale,
            direction,
            headerToolbar: {
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
            },
            editable,
            selectable: true,
            eventClick: onEventClick,
            eventDrop: onEventDrop,
            eventResize: onEventResize,
            dateClick: onDateClick,
            eventMouseEnter: onEventMouseEnter,
            eventMouseLeave: onEventMouseLeave,
            height: "auto",
            contentHeight: "auto",
            nowIndicator: true,
            allDaySlot: false,
            slotMinTime: "08:00:00",
            slotMaxTime: "20:00:00",
            businessHours: {
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: "09:00",
                endTime: "18:00",
            },
            eventTimeFormat: {
                hour: "2-digit",
                minute: "2-digit",
                meridiem: false,
                hour12: false,
            },
            slotLabelFormat: {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            },
            events: [],
        });

        calendar.render();

        // Specific clinic settings
        try {
            const res = await fetch("/api/admin/clinic-settings");
            const data = await res.json();
            if (calendar && data.settings) {
                const start = data.settings.work_start_time || "09:00";
                const end = data.settings.work_end_time || "18:00";
                calendar.setOption(
                    "slotMinTime",
                    `${start.split(":")[0].padStart(2, "0")}:00:00`,
                );
                calendar.setOption(
                    "slotMaxTime",
                    `${(parseInt(end.split(":")[0]) + 1).toString().padStart(2, "0")}:00:00`,
                );
            }
        } catch (e) {
            console.warn("Could not load clinic settings", e);
        }
    });

    onDestroy(() => {
        if (calendar) calendar.destroy();
    });
</script>

<div
    class={isFullscreen
        ? "fixed inset-0 z-[9999] bg-white h-screen w-screen p-6 overflow-hidden"
        : "relative min-h-[700px]"}
>
    <button
        class="absolute top-2 left-2 z-[50] px-3 py-1.5 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 text-xs font-bold transition-all flex items-center gap-2"
        onclick={toggleFullscreen}
    >
        <span>{isFullscreen ? "✕" : "⛶"}</span>
        <span>{isFullscreen ? "Quitter Plein Écran" : "Plein Écran"}</span>
    </button>

    <div bind:this={calendarEl} class="full-calendar-container h-full"></div>
</div>

<style>
    .full-calendar-container {
        background: white;
        padding: 1rem;
        border-radius: 1rem;
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
        width: 100%;
        min-height: 600px;
    }

    :global(.fc) {
        --fc-border-color: #f1f5f9;
        --fc-button-bg-color: #4f46e5;
        --fc-button-border-color: #4f46e5;
        --fc-button-hover-bg-color: #4338ca;
        --fc-button-hover-border-color: #4338ca;
        --fc-button-active-bg-color: #3730a3;
        --fc-button-active-border-color: #3730a3;
        --fc-event-bg-color: #4f46e5;
        --fc-event-border-color: #4f46e5;
        --fc-today-bg-color: #f8fafc;
        font-family: inherit;
    }

    :global(.fc-toolbar-title) {
        font-size: 1.1rem !important;
        font-weight: 800 !important;
        color: #1e293b;
        text-transform: capitalize;
    }

    :global(.fc-button) {
        border-radius: 0.75rem !important;
        font-weight: 700 !important;
        font-size: 0.75rem !important;
        padding: 0.5rem 0.8rem !important;
        transition: all 0.2s ease !important;
    }

    :global(.fc-event) {
        cursor: pointer;
        padding: 2px 4px;
        font-size: 0.7rem;
        font-weight: 600;
        border: none !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    :global(.fc-timegrid-slot) {
        height: 3rem !important;
    }

    :global(.fc-v-event .fc-event-title) {
        font-weight: 700;
    }

    :global(.fc-daygrid-event) {
        white-space: normal !important;
    }
</style>
