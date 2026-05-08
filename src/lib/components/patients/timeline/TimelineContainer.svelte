<script lang="ts">
    import TimelineEntry from "./TimelineEntry.svelte";
    import TreatmentEvent from "./renderers/TreatmentEvent.svelte";
    import PaymentEvent from "./renderers/PaymentEvent.svelte";
    import NoteEvent from "./renderers/NoteEvent.svelte";
    import AppointmentEvent from "./renderers/AppointmentEvent.svelte";
    import { Filter, Calendar, Stethoscope, Banknote, MessageSquare } from "lucide-svelte";
    import { fade } from "svelte/transition";

    let { 
        events = [], 
        user, 
        appConfig,
        onEditTreatment,
        onCancelTreatment,
        onDeleteTreatment,
        onReverseTransaction,
        onDeleteNote,
        onRescheduleAppointment,
        onCancelAppointment
    } = $props();

    let activeFilter = $state("all");

    const filteredEvents = $derived(
        activeFilter === "all" 
            ? events 
            : events.filter((e: any) => e.category === activeFilter)
    );

    // Grouping by Month Year
    const groupedEvents = $derived.by(() => {
        const groups: Record<string, any[]> = {};
        filteredEvents.forEach((event: any) => {
            const date = new Date(event.date.replace(' ', 'T'));
            const groupKey = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(event);
        });
        return Object.entries(groups).sort((a, b) => {
            // Sort groups descending by date
            const dateA = new Date(a[1][0].date.replace(' ', 'T'));
            const dateB = new Date(b[1][0].date.replace(' ', 'T'));
            return dateB.getTime() - dateA.getTime();
        });
    });

    const filters = [
        { id: "all", label: "Tout", icon: Filter },
        { id: "treatment", label: "Soins", icon: Stethoscope },
        { id: "transaction", label: "Finance", icon: Banknote },
        { id: "appointment", label: "RDV", icon: Calendar },
        { id: "note", label: "Notes", icon: MessageSquare }
    ];
</script>

<div class="space-y-12">
    <!-- Filters -->
    <div class="flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-30 py-4 -mx-4 px-4 rounded-2xl border-b border-slate-100 mb-8">
        <div class="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar gap-1">
            {#each filters as f}
                <button 
                    onclick={() => activeFilter = f.id}
                    class="px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2
                        {activeFilter === f.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'}"
                >
                    <f.icon size={12} />
                    {f.label}
                </button>
            {/each}
        </div>
        
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 hidden md:block">
            {filteredEvents.length} ÉVÉNEMENTS
        </div>
    </div>

    {#if groupedEvents.length === 0}
        <div class="py-20 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200" in:fade>
            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border border-slate-100 shadow-sm">
                <Filter size={32} />
            </div>
            <p class="text-slate-400 font-bold">Aucun événement trouvé pour ce filtre</p>
        </div>
    {:else}
        <div class="space-y-20">
            {#each groupedEvents as [monthYear, monthEvents], groupIndex}
                <section>
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-12 flex items-center gap-4">
                        <span class="bg-white px-2 pr-4 shrink-0">{monthYear}</span>
                        <div class="h-px w-full bg-slate-100"></div>
                    </h3>

                    <div class="space-y-2">
                        {#each monthEvents as event, i}
                            <TimelineEntry 
                                date={event.date} 
                                isLast={groupIndex === groupedEvents.length - 1 && i === monthEvents.length - 1}
                            >
                                {#if event.category === 'treatment'}
                                    <TreatmentEvent 
                                        {event} 
                                        {user} 
                                        {appConfig}
                                        onEdit={onEditTreatment}
                                        onCancel={onCancelTreatment}
                                        onDelete={onDeleteTreatment}
                                    />
                                {:else if event.category === 'transaction'}
                                    <PaymentEvent 
                                        {event} 
                                        {user}
                                        onReverse={onReverseTransaction}
                                    />
                                {:else if event.category === 'note'}
                                    <NoteEvent 
                                        {event} 
                                        {user}
                                        onDelete={onDeleteNote}
                                    />
                                {:else if event.category === 'appointment'}
                                    <AppointmentEvent 
                                        {event}
                                        onReschedule={onRescheduleAppointment}
                                        onCancel={onCancelAppointment}
                                    />
                                {/if}
                            </TimelineEntry>
                        {/each}
                    </div>
                </section>
            {/each}
        </div>
    {/if}
</div>
