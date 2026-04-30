<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import SlotPicker from "$lib/components/common/SlotPicker.svelte";
    import { X, Calendar, Clock, User, Stethoscope } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";

    interface Props {
        isOpen: boolean;
        patient: any;
        doctors: any[];
        onClose: () => void;
        onSubmitSuccess?: () => void;
    }

    let { isOpen, patient, doctors, onClose, onSubmitSuccess }: Props = $props();

    let selectedDoctorId = $state("");
    let selectedDate = $state("");
    let selectedTime = $state("");
    let appointmentType = $state("consultation");
    let durationMinutes = $state("30");
    let errorMessage = $state("");
    let isSubmitting = $state(false);

    // Reset form when opening for a new appointment
    $effect(() => {
        if (isOpen) {
            selectedDoctorId = "";
            selectedDate = "";
            selectedTime = "";
            appointmentType = "consultation";
            durationMinutes = "30";
            errorMessage = "";
        }
    });

</script>

{#if isOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" transition:fade>
        <div 
            class="bg-white rounded-[32px] w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <!-- Header -->
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 leading-tight">Fixer un Rendez-vous</h3>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Patient: {patient.full_name}</p>
                    </div>
                </div>
                <button 
                    onclick={onClose} 
                    class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                    <X size={18} />
                </button>
            </div>

            <form 
                method="POST" 
                action="?/createAppointment" 
                use:enhance={() => {
                    isSubmitting = true;
                    errorMessage = "";
                    return async ({ result, update }) => {
                        isSubmitting = false;
                        if (result.type === 'success') {
                            onClose();
                            if (onSubmitSuccess) onSubmitSuccess();
                        } else if (result.type === 'failure') {
                            errorMessage = (result.data as any)?.error || "Une erreur est survenue.";
                        }
                        await update();
                    };
                }} 
                class="flex flex-col md:grid md:grid-cols-12 overflow-hidden flex-1 min-h-0"
            >
                <input type="hidden" name="patient_id" value={patient.id} />
                <input type="hidden" name="start_time" value={selectedTime} />

                <!-- Left Column: Settings -->
                <div class="col-span-12 md:col-span-3 p-8 border-r border-slate-100 bg-slate-50/30 flex flex-col overflow-y-auto">
                    {#if errorMessage}
                        <div class="p-4 mb-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-3">
                            <span class="text-lg">⚠️</span>
                            {errorMessage}
                        </div>
                    {/if}

                    <div class="space-y-6">
                        <!-- Doctor Selection -->
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Praticien</label>
                            <div class="relative">
                                <select 
                                    name="doctor_id" 
                                    required 
                                    bind:value={selectedDoctorId}
                                    class="w-full bg-white border border-slate-200 p-3.5 pl-11 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none shadow-sm"
                                >
                                    <option value="" disabled>Sélectionner un médecin</option>
                                    {#each doctors as dr}
                                        <option value={dr.id.toString()}>Dr. {dr.full_name}</option>
                                    {/each}
                                </select>
                                <User size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <!-- Type Selection -->
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type de Soin</label>
                            <div class="relative">
                                <select 
                                    name="appointment_type" 
                                    required 
                                    bind:value={appointmentType}
                                    class="w-full bg-white border border-slate-200 p-3.5 pl-11 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none shadow-sm"
                                >
                                    <option value="consultation">Consultation</option>
                                    <option value="checkup">Contrôle</option>
                                    <option value="cleaning">Détartrage</option>
                                    <option value="emergency">Urgence</option>
                                    <option value="extraction">Extraction</option>
                                    <option value="filling">Obturation</option>
                                    <option value="root_canal">Traitement de canal</option>
                                    <option value="prosthesis">Prothèse</option>
                                </select>
                                <Stethoscope size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <!-- Duration -->
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Durée du soin</label>
                            <div class="relative">
                                <select 
                                    name="duration_minutes" 
                                    bind:value={durationMinutes}
                                    class="w-full bg-white border border-slate-200 p-3.5 pl-11 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none shadow-sm"
                                >
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="45">45 minutes</option>
                                    <option value="60">1 heure</option>
                                    <option value="90">1h 30m</option>
                                    <option value="120">2 heures</option>
                                </select>
                                <Clock size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <!-- Reminder Placeholder / Future Toggle -->
                        <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <Clock size={16} />
                            </div>
                            <div class="text-[10px] font-bold text-indigo-900 leading-tight">
                                <p>Rappel automatique</p>
                                <p class="text-indigo-400 mt-0.5">SMS envoyé 24h avant</p>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 mt-auto">
                        <button 
                            type="submit" 
                            disabled={!selectedTime || isSubmitting}
                            class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white p-4 rounded-2xl font-black text-base transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                        >
                            {#if isSubmitting}
                                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {:else}
                                <Calendar size={18} />
                                Confirmer le RDV
                            {/if}
                        </button>
                    </div>
                </div>

                <!-- Right Column: Calendar & Slots -->
                <div class="col-span-12 md:col-span-9 p-6 bg-white overflow-y-auto">
                    {#if selectedDoctorId}
                        <div class="h-full min-h-[400px]">
                            <SlotPicker 
                                doctorId={selectedDoctorId} 
                                bind:selectedDate={selectedDate} 
                                bind:selectedTime={selectedTime}
                                compact={false}
                            />
                        </div>
                    {:else}
                        <div class="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-100">
                            <div class="w-20 h-20 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm mb-6">
                                <Calendar size={32} class="text-slate-300" />
                            </div>
                            <h4 class="text-slate-900 font-black text-lg">Disponibilités</h4>
                            <p class="text-slate-400 font-bold text-sm max-w-[240px] mt-2">Veuillez d'abord sélectionner un praticien à gauche</p>
                        </div>
                    {/if}
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    /* Prevent body scroll when modal is open handled by Svelte or parent usually, but for better UX: */
    :global(body.modal-open) {
        overflow: hidden;
    }
</style>
