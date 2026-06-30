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
        reschedulingAppointment?: any;
    }

    let { isOpen, patient, doctors, onClose, onSubmitSuccess, reschedulingAppointment }: Props = $props();

    let selectedDoctorId = $state("");
    let selectedDate = $state("");
    let selectedTime = $state("");
    let appointmentType = $state("consultation");
    let durationMinutes = $state("30");
    let notes = $state("");
    let errorMessage = $state("");
    let isSubmitting = $state(false);

    // Reset form when opening for a new appointment or rescheduling
    $effect(() => {
        if (isOpen) {
            if (reschedulingAppointment) {
                selectedDoctorId = String(reschedulingAppointment.doctor_id || "");
                // Parse original start time to set initial date/time
                const originalStart = new Date(reschedulingAppointment.start_time.replace(' ', 'T'));
                selectedDate = originalStart.toISOString().split('T')[0];
                selectedTime = reschedulingAppointment.start_time;
                appointmentType = reschedulingAppointment.appointment_type || "consultation";
                durationMinutes = String(reschedulingAppointment.duration_minutes || "30");
                notes = reschedulingAppointment.notes || "";
            } else {
                selectedDoctorId = "";
                selectedDate = "";
                selectedTime = "";
                appointmentType = "consultation";
                durationMinutes = "30";
                notes = "";
            }
            errorMessage = "";
        }
    });

</script>

{#if isOpen}
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" transition:fade>
        <div 
            class="bg-white rounded-[32px] w-[95vw] max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <!-- Header -->
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl {reschedulingAppointment ? 'bg-amber-500' : 'bg-indigo-600'} text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 leading-tight">
                            {reschedulingAppointment ? 'Déplacer le Rendez-vous' : 'Fixer un Rendez-vous'}
                        </h3>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{$t('components.appointment_modal.patient')} {patient.full_name}</p>
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
                action={reschedulingAppointment ? "?/rescheduleAppointment" : "?/createAppointment"} 
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
                {#if reschedulingAppointment}
                    <input type="hidden" name="id" value={reschedulingAppointment.id} />
                {/if}

                <!-- Left Column: Settings -->
                <div class="col-span-12 md:col-span-3 p-8 border-r border-slate-100 bg-slate-50/30 flex flex-col overflow-y-auto">
                    {#if errorMessage}
                        <div class="p-4 mb-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-3">
                            <span class="text-lg">⚠️</span>
                            {errorMessage}
                        </div>
                    {/if}

                    {#if reschedulingAppointment}
                        <!-- UI GHOSTING: Original Appointment Details -->
                        <div class="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <h4 class="text-[10px] font-black uppercase text-amber-600 tracking-wider mb-2">{$t('components.appointment_modal.ancien_rendezvous')}</h4>
                            <div class="space-y-1 text-xs font-bold text-amber-900">
                                <div class="flex items-center gap-2">
                                    <Calendar size={12} />
                                    {new Date(reschedulingAppointment.start_time.replace(' ', 'T')).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </div>
                                <div class="flex items-center gap-2">
                                    <Clock size={12} />
                                    {new Date(reschedulingAppointment.start_time.replace(' ', 'T')).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div class="flex items-center gap-2 text-[10px] text-amber-700 mt-2">
                                    <User size={10} />
                                    {$t('assistant.dashboard.time.dr')} {reschedulingAppointment.doctor_name || 'Inconnu'}
                                </div>
                            </div>
                        </div>
                    {/if}

                    <div class="space-y-6">
                        <!-- Doctor Selection -->
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{$t('components.appointment_modal.praticien')}</label>
                            <div class="relative">
                                <select 
                                    name="doctor_id" 
                                    required 
                                    bind:value={selectedDoctorId}
                                    class="w-full bg-white border border-slate-200 p-3.5 pl-11 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none shadow-sm"
                                >
                                    <option value="" disabled>{$t('components.appointment_modal.s_lectionner_un_m')}</option>
                                    {#each doctors as dr}
                                        <option value={dr.id.toString()}>{$t('assistant.dashboard.time.dr')} {dr.full_name}</option>
                                    {/each}
                                </select>
                                <User size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <!-- Type Selection -->
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{$t('components.appointment_modal.type_de_soin')}</label>
                            <div class="relative">
                                <select 
                                    name="appointment_type" 
                                    required 
                                    bind:value={appointmentType}
                                    class="w-full bg-white border border-slate-200 p-3.5 pl-11 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none shadow-sm"
                                >
                                    <option value="consultation">{$t('patient_details.consultation')}</option>
                                    <option value="checkup">{$t('components.appointment_modal.contr_le')}</option>
                                    <option value="cleaning">{$t('components.appointment_modal.d_tartrage')}</option>
                                    <option value="emergency">{$t('components.appointment_modal.urgence')}</option>
                                    <option value="extraction">{$t('patient_details.extraction')}</option>
                                    <option value="filling">{$t('components.appointment_modal.obturation')}</option>
                                    <option value="root_canal">{$t('components.appointment_modal.traitement_de_canal')}</option>
                                    <option value="prosthesis">{$t('components.appointment_modal.proth_se')}</option>
                                </select>
                                <Stethoscope size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <!-- Duration -->
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{$t('components.appointment_modal.dur_e_du_soin')}</label>
                            <div class="relative">
                                <select 
                                    name="duration_minutes" 
                                    bind:value={durationMinutes}
                                    class="w-full bg-white border border-slate-200 p-3.5 pl-11 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none shadow-sm"
                                >
                                    <option value="15">{$t('components.appointment_modal.15_minutes')}</option>
                                    <option value="30">{$t('components.appointment_modal.30_minutes')}</option>
                                    <option value="45">{$t('components.appointment_modal.45_minutes')}</option>
                                    <option value="60">{$t('components.appointment_modal.1_heure')}</option>
                                    <option value="90">{$t('components.appointment_modal.1h_30m')}</option>
                                    <option value="120">{$t('components.appointment_modal.2_heures')}</option>
                                </select>
                                <Clock size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <!-- {$t('assistant.dashboard.appointment.fields.notes')} -->
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Notes</label>
                            <textarea 
                                name="notes" 
                                bind:value={notes}
                                placeholder={$t('components.appointment_modal.note_particuli_re')}
                                class="w-full bg-white border border-slate-200 p-3 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm min-h-[80px] text-sm"
                            ></textarea>
                        </div>
                    </div>

                    <div class="pt-6 mt-auto">
                        <button 
                            type="submit" 
                            disabled={!selectedTime || isSubmitting}
                            class="w-full {reschedulingAppointment ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:bg-slate-200 disabled:text-slate-400 text-white p-4 rounded-2xl font-black text-base transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                        >
                            {#if isSubmitting}
                                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {:else}
                                <Calendar size={18} />
                                {reschedulingAppointment ? 'Mettre à jour le RDV' : 'Confirmer le RDV'}
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
                            <h4 class="text-slate-900 font-black text-lg">{$t('components.appointment_modal.disponibilit_s')}</h4>
                            <p class="text-slate-400 font-bold text-sm max-w-[240px] mt-2">{$t('components.appointment_modal.veuillez_dabord_s_lectionner')}</p>
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
