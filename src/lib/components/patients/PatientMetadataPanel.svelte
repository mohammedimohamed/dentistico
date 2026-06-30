<script lang="ts">
    import { t } from "svelte-i18n";
    import { 
        Smartphone, 
        Phone, 
        Mail, 
        MapPin, 
        Calendar, 
        Banknote,
        User
    } from "lucide-svelte";

    let { 
        patient, 
        onAppointmentClick, 
        onPaymentClick,
        isCollapsed = false
    } = $props();

</script>

<div class="space-y-6">
    <!-- Quick Actions -->
    <div class="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{$t('components.patient_metadata_panel.actions_rapides')}</h3>
        <div class="space-y-3">
            <button 
                onclick={onAppointmentClick} 
                class="flex items-center gap-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 group"
            >
                <Calendar size={20} class="group-hover:scale-110 transition-transform" />
                <span class="truncate">{$t('components.patient_metadata_panel.fixer_prochain_rdv')}</span>
            </button>
            
            <button 
                onclick={onPaymentClick} 
                class="flex items-center gap-3 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 p-4 rounded-2xl font-bold transition-all"
            >
                <Banknote size={20} />
                <span class="truncate">{$t('components.patient_metadata_panel.encaisser_payment')}</span>
            </button>
        </div>
    </div>

    <!-- Secondary Info -->
    <div class="bg-slate-100/50 rounded-3xl p-5 border border-slate-200/50">
        <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{$t('components.patient_metadata_panel.infos_patient')}</h4>
        <div class="space-y-4">
            <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Smartphone size={10} /> {$t('components.patient_metadata_panel.t_l_phone')}</p>
                <p class="text-sm font-semibold text-slate-700">{patient.phone || '—'}</p>
            </div>
            {#if patient.secondary_phone}
            <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Phone size={10} /> {$t('components.patient_metadata_panel.fixe_autre')}</p>
                <p class="text-sm font-semibold text-slate-700">{patient.secondary_phone}</p>
            </div>
            {/if}
            <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Mail size={10} /> {$t('common.email')}</p>
                <p class="text-sm font-semibold text-slate-700 truncate" title={patient.email}>{patient.email || '—'}</p>
            </div>
            <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><MapPin size={10} /> {$t('components.patient_metadata_panel.adresse')}</p>
                <p class="text-sm font-semibold text-slate-700">
                    {patient.address || ''}
                    {patient.city ? `, ${patient.city}` : ''}
                    {!patient.address && !patient.city ? '—' : ''}
                </p>
            </div>
        </div>
    </div>
</div>
