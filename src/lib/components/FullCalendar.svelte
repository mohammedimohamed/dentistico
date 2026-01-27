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

            // Using batchRendering for performance and reliability
            calendar.batchRendering(() => {
                // Remove all existing dynamic event sources
                const sources = calendar.getEventSources();
                sources.forEach((source) => {
                    if (source.id === "dynamic-events") source.remove();
                });

                // Add new events source
                calendar.addEventSource({
                    id: "dynamic-events",
                    events: events,
                });
            });

            // Force update size to handle visibility changes (like modal opening/transitions)
            setTimeout(() => {
                if (calendar) calendar.updateSize();
            }, 300);
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
        if (calendar) {
            setTimeout(() => {
                calendar.updateSize();
            }, 100);
        }
    }

    onMount(async () => {
        console.log(
            "📅 FullCalendar: Initializing with",
            events.length,
            "events",
        );

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
            height: isFullscreen ? "100vh" : height,
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
            // Add initial events
            events: events,
        });

        calendar.render();
        console.log("📅 FullCalendar: Rendered");

        // Specific clinic settings fetch to override slot boundaries and working days
        try {
            const res = await fetch("/api/admin/clinic-settings");
            const data = await res.json();

            if (calendar) {
                if (data.settings) {
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

                if (data.workingDays) {
                    const hiddenDays = data.workingDays
                        .filter((d: any) => d.is_working === 0)
                        .map((d: any) => d.day_of_week);

                    calendar.setOption("hiddenDays", hiddenDays);

                    const businessHours = data.workingDays
                        .filter((d: any) => d.is_working === 1)
                        .map((d: any) => ({
                            daysOfWeek: [d.day_of_week],
                            startTime:
                                d.custom_start_time ||
                                data.settings?.work_start_time ||
                                "09:00",
                            endTime:
                                d.custom_end_time ||
                                data.settings?.work_end_time ||
                                "18:00",
                        }));

                    calendar.setOption("businessHours", businessHours);
                }
            }
        } catch (e) {
            console.warn("Could not load clinic settings for calendar", e);
        }
    });

    onDestroy(() => {
        if (calendar) {
            calendar.destroy();
        }
    });
</script>

<div class="relative {isFullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}">
    {#if isFullscreen}
        <button
            onclick={toggleFullscreen}
            class="absolute top-6 right-6 z-10 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-lg transition-all flex items-center gap-2"
        >
            <span>✕</span>
            <span>Exit Fullscreen</span>
        </button>
    {:else}
        <button
            onclick={toggleFullscreen}
            class="absolute top-2 right-2 z-10 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs shadow-md transition-all flex items-center gap-1"
        >
            <span>⛶</span>
            <span>Fullscreen</span>
        </button>
    {/if}

    <div bind:this={calendarEl} class="full-calendar-container"></div>
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
