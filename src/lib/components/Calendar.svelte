<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Calendar } from '@fullcalendar/core';
    import dayGridPlugin from '@fullcalendar/daygrid';
    import timeGridPlugin from '@fullcalendar/timegrid';
    import interactionPlugin from '@fullcalendar/interaction';

    interface Props {
        events: any[];
        onEventClick?: (info: any) => void;
        onEventDrop?: (info: any) => void;
        onEventResize?: (info: any) => void;
        onDateClick?: (info: any) => void;
        initialView?: string;
        editable?: boolean;
    }

    let { events = [], onEventClick, onEventDrop, onEventResize, onDateClick, initialView = 'timeGridWeek', editable = false }: Props = $props();

    let calendarEl: HTMLElement;
    let calendar: Calendar;

    $effect(() => {
        if (calendar) {
            calendar.removeAllEvents();
            calendar.addEventSource(events);
        }
    });

    onMount(() => {
        calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView,
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events,
            editable,
            eventClick: onEventClick,
            eventDrop: onEventDrop,
            eventResize: onEventResize,
            dateClick: onDateClick,
            height: 'auto',
            nowIndicator: true,
            slotMinTime: '08:00:00',
            slotMaxTime: '20:00:00',
            allDaySlot: false,
            businessHours: {
                daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
                startTime: '08:30',
                endTime: '19:30',
            }
        });

        calendar.render();
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
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
</style>
