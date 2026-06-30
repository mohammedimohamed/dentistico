<script lang="ts">
    import { patientStore } from "$lib/stores/patients.svelte";
    import { t } from "svelte-i18n";
    import { fade, scale } from "svelte/transition";
    import { User, Calendar, TrendingDown, Wallet, X } from 'lucide-svelte';


    let { patient } = $props<{ patient: any }>();

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("fr-DZ", {
            style: "currency",
            currency: "DZD",
        }).format(Math.abs(amount));
    }

    // In a real app, we might fetch recent notes here if they aren't in the object
    // For now, we assume they might be passed or we show placeholders if missing
    const recentNotes = patient.recent_notes || [
        { date: '2024-03-15', content: 'Détartrage complet effectué. Patient satisfait.' },
        { date: '2024-02-10', content: 'Consultation initiale. Carie sur la 26.' },
        { date: '2024-01-05', content: 'Radiographie panoramique réalisée.' }
    ];
</script>

{#if patientStore.isQuickViewOpen}
    <div 
        class="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        transition:fade={{ duration: 200 }}
    >
        <!-- Backdrop -->
        <div 
            class="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            onclick={() => patientStore.isQuickViewOpen = false}
        ></div>

        <!-- Modal Content -->
        <div 
            class="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <!-- Header Area -->
            <div class="bg-indigo-600 p-10 text-white relative">
                <button 
                    onclick={() => patientStore.isQuickViewOpen = false}
                    class="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white"
                >
                    <X size={20} />
                </button>
                <div class="flex items-center gap-6">
                    <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-lg">
                        <User size={32} class="text-indigo-600" />
                    </div>

                    <div>
                        <h2 class="text-3xl font-black mb-1">{patient.full_name}</h2>
                        <div class="flex items-center gap-3 opacity-80 font-bold text-sm">
                            <span>{$t('components.quick_view_modal.id')}{patient.id.toString().padStart(4, '0')}</span>
                            <span class="w-1 h-1 bg-white rounded-full"></span>
                            <span>{patient.age} {$t('components.quick_view_modal.ans')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Body Area -->
            <div class="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/30">
                <!-- Quick Stats -->
                <div class="space-y-6">
                    <div>
                        <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{$t('components.quick_view_modal.derni_re_visite')}</h4>
                        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                            <Calendar size={20} class="text-gray-400" />
                            <span class="font-bold text-gray-700">{patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'Aucune'}</span>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{$t('components.quick_view_modal.solde_actuel')}</h4>
                        <div class="p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between {patient.net_balance < 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}">
                            <div class="flex items-center gap-3">
                                {#if patient.net_balance < 0}
                                    <TrendingDown size={20} class="text-red-500" />
                                {:else}
                                    <Wallet size={20} class="text-green-500" />
                                {/if}
                                <span class="font-black text-lg">{formatCurrency(patient.net_balance)}</span>
                            </div>
                            <span class="text-[10px] font-black uppercase tracking-tighter">
                                {patient.net_balance < 0 ? 'À régler' : 'Crédit'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Recent Notes -->
                <div class="space-y-4">
                    <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{$t('components.quick_view_modal.3_derni_res_notes')}</h4>
                    <div class="space-y-3">
                        {#each recentNotes as note}
                            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div class="text-[9px] font-bold text-indigo-400 mb-1">{new Date(note.date).toLocaleDateString()}</div>
                                <p class="text-sm text-gray-600 font-medium line-clamp-2">{note.content}</p>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="p-8 border-t border-gray-100 flex gap-4 bg-white">
                <a 
                    href="/doctor/patients/{patient.id}" 
                    class="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm text-center hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                    {$t('components.quick_view_modal.ouvrir_dossier_complet')}
                </a>
                <button 
                    onclick={() => patientStore.isQuickViewOpen = false}
                    class="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                >
                    FERMER
                </button>
            </div>
        </div>
    </div>
{/if}
