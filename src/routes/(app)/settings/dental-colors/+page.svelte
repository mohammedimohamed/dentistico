<script lang="ts">
    import { enhance } from "$app/forms";
    import { dentalColors, updateDentalColors } from "$lib/stores/dentalSettings.svelte";
    import { Save, RefreshCcw, Palette } from "lucide-svelte";
    import type { PageData } from "./$types";
    import { onMount } from "svelte";

    let { data }: { data: PageData } = $props();

    // Sync store with DB values on load
    onMount(() => {
        if (data.colors) {
            updateDentalColors(data.colors);
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

<div class="max-w-4xl mx-auto p-8">
    <header class="mb-12">
        <div class="flex items-center gap-4 mb-2">
            <div class="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                <Palette class="w-6 h-6" />
            </div>
            <h1 class="text-3xl font-black text-slate-900">Palette de l'Odontogramme</h1>
        </div>
        <p class="text-slate-500 font-medium">Personnalisez les couleurs utilisées pour marquer les pathologies et les soins sur la carte dentaire.</p>
    </header>

    <form 
        method="POST" 
        action="?/saveColors" 
        use:enhance={() => {
            isSaving = true;
            return async ({ result }) => {
                isSaving = false;
            };
        }}
        class="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden"
    >
        <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {#each colorKeys as { id, label, key }}
                <div class="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all group">
                    <div>
                        <p class="text-sm font-black text-slate-900 mb-1">{label}</p>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{key}</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div 
                            class="w-12 h-12 rounded-2xl shadow-inner border-2 border-white" 
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

        <div class="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-4">
            <button 
                type="button"
                onclick={() => window.location.reload()}
                class="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
                <RefreshCcw class="w-4 h-4" /> Annuler
            </button>
            <button 
                type="submit"
                disabled={isSaving}
                class="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
                <Save class="w-4 h-4" /> {isSaving ? 'Enregistrement...' : 'Sauvegarder la palette'}
            </button>
        </div>
    </form>

    <div class="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4 items-start">
        <div class="text-amber-500 mt-1">⚠️</div>
        <div>
            <p class="text-sm font-bold text-amber-900">Note Importante</p>
            <p class="text-xs text-amber-700 leading-relaxed">Ces couleurs sont globales pour tout le cabinet. Les changer affectera l'affichage de tous les patients existants.</p>
        </div>
    </div>
</div>
