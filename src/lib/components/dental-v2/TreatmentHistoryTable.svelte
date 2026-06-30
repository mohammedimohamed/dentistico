<script lang="ts">
    import { getToothName } from "$lib/dental/tooth-naming";
    import { t } from "svelte-i18n";

    interface Props {
        treatments: any[];
        readOnly?: boolean;
        onEdit?: (treatment: any) => void;
    }

    let { treatments, readOnly = false, onEdit }: Props = $props();

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'DZD' }).format(amount);
    }
</script>

<div class="treatment-history mt-8">
    <div class="flex items-center justify-between mb-6 px-1">
        <div>
            <h3 class="text-xl font-black text-slate-900">{$t("dental.treatment_history")}</h3>
            <p class="text-sm font-medium text-slate-500">{treatments.length} {$t('components.treatment_history_table.actes_enregistr_s')}</p>
        </div>
    </div>

    {#if treatments.length === 0}
        <div class="text-center py-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm">📋</div>
            <p class="text-slate-400 font-bold">{$t("dental.no_treatments")}</p>
        </div>
    {:else}
        <div class="overflow-hidden border border-slate-200 rounded-[2.5rem] shadow-sm bg-white">
            <table class="min-w-full divide-y divide-slate-100">
                <thead class="bg-slate-50/50">
                    <tr>
                        <th scope="col" class="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('common.date')}</th>
                        <th scope="col" class="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('components.treatment_history_table.dent_zone')}</th>
                        <th scope="col" class="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('components.treatment_history_table.description_de_lacte')}</th>
                        <th scope="col" class="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('admin.cdt_codes.categories.Diagnostic')}</th>
                        <th scope="col" class="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('components.dental_chart.statut')}</th>
                        <th scope="col" class="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{$t('components.treatment_history_table.montant')}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    {#each treatments as treatment}
                        <tr class="transition-colors group border-b border-slate-50 last:border-0">
                            <!-- Date -->
                            <td class="px-6 py-5 whitespace-nowrap">
                                <div class="flex flex-col">
                                    <span class="text-sm font-black text-slate-900">
                                        {treatment.treatment_date ? new Date(treatment.treatment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : "---"}
                                    </span>
                                    <span class="text-[10px] font-bold text-slate-400 uppercase">
                                        {treatment.treatment_date ? new Date(treatment.treatment_date).getFullYear() : ""}
                                    </span>
                                </div>
                            </td>

                            <!-- Tooth / Context -->
                            <td class="px-6 py-5 whitespace-nowrap">
                                {#if treatment.source === "general"}
                                    <span class="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">{$t('components.dental_chart.g_n_ral')}</span>
                                {:else}
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black border border-indigo-100 shadow-sm">
                                            {treatment.tooth_number}
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{$t('components.clinical_workstation.dent')}</span>
                                            <span class="text-xs font-bold text-slate-700">{getToothName(treatment.tooth_number)}</span>
                                        </div>
                                    </div>
                                {/if}
                            </td>

                            <!-- Description -->
                            <td class="px-6 py-5">
                                <div class="flex flex-col gap-1">
                                    <span class="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {treatment.treatment_type || "Soin sans titre"}
                                    </span>
                                    <div class="flex items-center gap-2">
                                        {#if treatment.cdt_code}
                                            <span class="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded leading-none">{treatment.cdt_code}</span>
                                        {/if}
                                        {#if treatment.surfaces}
                                            <span class="text-[10px] font-bold text-slate-400 font-mono">{$t('components.treatment_history_table.surfaces')} {treatment.surfaces}</span>
                                        {/if}
                                    </div>
                                </div>
                            </td>

                            <!-- Diagnosis -->
                            <td class="px-6 py-5">
                                {#if treatment.diagnosis}
                                    <span class="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full">{treatment.diagnosis}</span>
                                {:else}
                                    <span class="text-slate-300">—</span>
                                {/if}
                            </td>

                            <!-- Status -->
                            <td class="px-6 py-5">
                                {#if treatment.status === 'completed'}
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        {$t('components.dental_chart.termin')}
                                    </span>
                                {:else if treatment.status === 'planned'}
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase">
                                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        {$t('components.treatment_history_table.pr_vu')}
                                    </span>
                                {:else}
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase">
                                        {$t('components.dental_chart.existant')}
                                    </span>
                                {/if}
                            </td>

                            <!-- Amount -->
                            <td class="px-6 py-5 text-right font-black text-slate-900">
                                {formatCurrency(treatment.fee || 0)}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
