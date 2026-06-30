<script lang="ts">
    import { t } from "svelte-i18n";
    import { enhance } from "$app/forms";
    import { dentalColors, updateDentalColors } from "$lib/stores/dentalSettings.svelte";
    import { Save, RefreshCcw, Palette, X } from "lucide-svelte";
    import { onMount } from "svelte";

    let { show = $bindable(), colors }: { show: boolean, colors?: Record<string, string> } = $props();

    // Sync store with DB values on load if provided
    onMount(() => {
        if (colors) {
            updateDentalColors(colors);
        }
    });

    const colorKeys = [
        { id: 'sain', label: 'Sain / Intact', key: 'SAIN' },
        { id: 'carie', label: 'Carie / Pathologie', key: 'CARIE' },
        { id: 'obturation', label: 'Obturation / Composite', key: 'OBTURATION' },
        { id: 'abces', label: 'Abcès / Infection', key: 'ABSCES' },
        { id: 'canal', label: 'Traitement de Canal', key: 'CANAL' },
        { id: 'traitement', label: 'Soin en cours', key: 'TRAITEMENT' },
    ];

    let isSaving = $state(false);

    function handleColorChange(key: string, value: string) {
        updateDentalColors({ [key]: value });
    }
</script>

{#if show}
    <div
        class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
    >
        <div
            class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl border border-gray-100 animate-in fade-in zoom-in duration-200 overflow-hidden"
        >
            <header class="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                        <Palette class="w-6 h-6" />
                    </div>
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 leading-none">{$t('components.dental_color_modal.couleurs_de_lodontogramme')}</h3>
                        <p class="text-slate-500 font-medium text-sm mt-1">{$t('components.dental_color_modal.personnalisez_les_couleurs_globales')}</p>
                    </div>
                </div>
                <button 
                    onclick={() => show = false}
                    class="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
                >
                    <X class="w-6 h-6" />
                </button>
            </header>

            <form 
                method="POST" 
                action="?/saveDentalColors" 
                use:enhance={() => {
                    isSaving = true;
                    return async ({ result }) => {
                        isSaving = false;
                        if (result.type === 'success') {
                            show = false;
                        }
                    };
                }}
            >
                <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
                    {#each colorKeys as { id, label, key }}
                        <div class="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all group">
                            <div>
                                <p class="text-sm font-black text-slate-900 mb-1">{label}</p>
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{key}</p>
                            </div>
                            <div class="flex items-center gap-4">
                                <div 
                                    class="w-12 h-12 rounded-2xl shadow-inner border-2 border-white transition-transform group-hover:scale-110" 
                                    style="background: {(dentalColors as any)[key]}"
                                ></div>
                                <input 
                                    type="color" 
                                    name="dental_color_{id}" 
                                    value={(dentalColors as any)[key]}
                                    oninput={(e) => handleColorChange(key, e.currentTarget.value)}
                                    class="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>
                    {/each}
                </div>

                <div class="p-8 bg-amber-50/50 border-t border-amber-100/50 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div class="flex gap-4 items-start max-w-md">
                        <div class="text-amber-500 text-xl">⚠️</div>
                        <div>
                            <p class="text-xs font-bold text-amber-900">{$t('components.dental_color_modal.note_importante')}</p>
                            <p class="text-[10px] text-amber-700 leading-relaxed font-medium">{$t('components.dental_color_modal.ces_couleurs_affecteront_laffichage')}</p>
                        </div>
                    </div>

                    <div class="flex gap-4 w-full md:w-auto">
                        <button 
                            type="button"
                            onclick={() => show = false}
                            class="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            class="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                            {#if isSaving}
                                <RefreshCcw class="w-4 h-4 animate-spin" /> {$t('components.dental_color_modal.enregistrement')}
                            {:else}
                                <Save class="w-4 h-4" /> {$t('components.dental_color_modal.sauvegarder')}
                            {/if}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
{/if}
