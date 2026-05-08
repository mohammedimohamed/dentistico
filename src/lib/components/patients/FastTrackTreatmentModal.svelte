<script lang="ts">
    import { enhance } from "$app/forms";
    import { X, Check, Stethoscope, Info } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";

    interface Props {
        isOpen: boolean;
        patientId: number;
        onClose: () => void;
    }

    let { isOpen, patientId, onClose }: Props = $props();

    let isSubmitting = $state(false);
    let title = $state("");
    let description = $state("");
    let amount = $state<number>(0);
    let status = $state("planned"); // planned | completed

    $effect(() => {
        if (isOpen) {
            title = "";
            description = "";
            amount = 0;
            status = "planned";
        }
    });

    function formatCurrency(val: number) {
        return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(val).replace('DZD', 'DA');
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" transition:fade>
        <div 
            class="bg-white rounded-[32px] w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <!-- Header -->
            <div class="p-8 border-b border-slate-100 flex justify-between items-center bg-amber-50/30">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-100">
                        <Stethoscope size={24} />
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-slate-900 leading-tight">Fast-Track Traitement</h3>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Saisie Manuelle Rapide</p>
                    </div>
                </div>
                <button 
                    onclick={onClose} 
                    class="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            <form 
                method="POST" 
                action="?/createBasicTreatment" 
                use:enhance={() => {
                    isSubmitting = true;
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'success') {
                            onClose();
                        }
                        await update();
                    };
                }} 
                class="flex flex-col flex-1 overflow-hidden"
            >
                <div class="p-8 space-y-6 overflow-y-auto flex-1">
                    <input type="hidden" name="patient_id" value={patientId} />
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <!-- Left: Main Info -->
                        <div class="space-y-6">
                            <!-- Title -->
                            <div class="space-y-2">
                                <label for="title" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Acte / Titre</label>
                                <input 
                                    id="title" 
                                    name="title" 
                                    type="text"
                                    placeholder="Ex: Consultation, Détartrage..."
                                    bind:value={title}
                                    required
                                    class="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-900 focus:bg-white focus:border-amber-500 transition-all outline-none"
                                />
                            </div>

                            <!-- Description -->
                            <div class="space-y-2">
                                <label for="description" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description (Détails)</label>
                                <textarea 
                                    id="description" 
                                    name="description" 
                                    placeholder="Détails optionnels sur l'intervention..."
                                    bind:value={description}
                                    rows="4"
                                    class="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-700 focus:bg-white focus:border-amber-500 transition-all outline-none resize-none"
                                ></textarea>
                            </div>
                        </div>

                        <!-- Right: Financial & Status -->
                        <div class="space-y-6">
                            <div class="grid grid-cols-1 gap-6">
                                <!-- Amount -->
                                <div class="space-y-2">
                                    <label for="amount" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Montant (DZD)</label>
                                    <div class="relative group">
                                        <input 
                                            id="amount" 
                                            name="amount" 
                                            type="number" 
                                            step="0.01" 
                                            bind:value={amount}
                                            required 
                                            class="w-full bg-slate-50 border-2 border-slate-100 p-4 pr-12 rounded-2xl font-black text-3xl text-slate-900 focus:bg-white focus:border-amber-500 transition-all outline-none" 
                                        />
                                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">DA</span>
                                    </div>
                                </div>

                                <!-- Status -->
                                <div class="space-y-2">
                                    <label for="status" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">État de l'acte</label>
                                    <div class="grid grid-cols-2 gap-3">
                                        <button 
                                            type="button"
                                            onclick={() => status = 'planned'}
                                            class="p-5 rounded-2xl border-2 transition-all font-black text-sm uppercase {status === 'planned' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}"
                                        >
                                            Planifié
                                        </button>
                                        <button 
                                            type="button"
                                            onclick={() => status = 'completed'}
                                            class="p-5 rounded-2xl border-2 transition-all font-black text-sm uppercase {status === 'completed' ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}"
                                        >
                                            Terminé
                                        </button>
                                    </div>
                                    <input type="hidden" name="status" value={status} />
                                </div>
                            </div>

                            <!-- Warning for Completed -->
                            {#if status === 'completed'}
                                <div class="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 flex gap-4 text-emerald-700" in:fade>
                                    <Info size={20} class="shrink-0 mt-0.5" />
                                    <p class="text-xs font-bold leading-relaxed">
                                        En marquant cet acte comme <span class="font-black underline uppercase">Terminé</span>, un débit de <span class="font-black underline">{formatCurrency(amount)}</span> sera automatiquement inscrit au Journal Financier du patient.
                                    </p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !title || amount < 0}
                        class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white p-6 rounded-3xl font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-4 group mt-4"
                    >
                        {#if isSubmitting}
                            <div class="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {:else}
                            <Check size={24} class="group-hover:scale-110 transition-transform" />
                            ENREGISTRER L'ACTE
                        {/if}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}
