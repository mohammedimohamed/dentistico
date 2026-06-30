<script lang="ts">
    import { t } from "svelte-i18n";
    import type { PageData } from "./$types";
    import CarteDentaireV2 from "$lib/components/dental-v2/CarteDentaireV2.svelte";
    import ToothEditPanelV2 from "$lib/components/dental-v2/ToothEditPanelV2.svelte";
    import { ChevronLeft, Info, Activity } from "lucide-svelte";
    import { invalidateAll } from "$app/navigation";

    let { data }: { data: PageData } = $props();

    // State
    let selectedToothFdi = $state<number | null>(null);
    let selectedTeethFdis = $state<number[]>([]);
    let allAnnotations = $state<Record<number, any>>({ ...data.annotations });

    async function createBridge() {
        const bridgeId = crypto.randomUUID();
        const promises = selectedTeethFdis.map(fdi => {
            const annotation = allAnnotations[fdi] || {};
            // If the tooth is missing, it's a 'Pontique', otherwise it's a 'Pilier'
            const newStatus = (annotation.global_status === 'Absent' || annotation.global_status === 'Absente') ? 'Pontique' : 'Pilier';
            
            return handleSave({
                fdi,
                zones: annotation.zones || {},
                notes: annotation.notes || '',
                globalStatus: newStatus,
                bridgeId: bridgeId
            });
        });

        await Promise.all(promises);
        selectedTeethFdis = []; // Reset selection
    }

    async function handleDeleteBridge(bridgeId: string) {
        if (!confirm($t('doctor.patients.confirm_delete_bridge'))) return;
        
        const teethToUpdate = Object.entries(allAnnotations)
            .filter(([_, data]: [any, any]) => data.bridge_id === bridgeId)
            .map(([fdiStr, _]) => parseInt(fdiStr));

        const promises = teethToUpdate.map(fdiToUpdate => {
            const data = allAnnotations[fdiToUpdate];
            const status = data.global_status || data.globalStatus || '';
            const newStatus = (status === 'Pontique' || status === 'Pontic') ? 'Absent' : 'Sain';
            
            return handleSave({
                fdi: fdiToUpdate,
                zones: data.zones || {},
                notes: data.notes || '',
                globalStatus: newStatus,
                bridgeId: null
            });
        });

        await Promise.all(promises);
    }

    async function handleSave(payload: any) {
        try {
            const formData = new FormData();
            formData.append('fdi', payload.fdi.toString());
            formData.append('zones', JSON.stringify(payload.zones));
            formData.append('notes', payload.notes || '');
            formData.append('globalStatus', payload.globalStatus || 'sain');
            if (payload.bridgeId) formData.append('bridgeId', payload.bridgeId);

            const response = await fetch("?/saveAnnotation", {
                method: "POST",
                body: formData,
                headers: {
                    "x-sveltekit-action": "true"
                }
            });

            if (response.ok) {
                // Update local state instantly
                allAnnotations[payload.fdi] = {
                    ...allAnnotations[payload.fdi],
                    zones: payload.zones,
                    notes: payload.notes,
                    global_status: payload.globalStatus,
                    bridge_id: payload.bridgeId
                };
                allAnnotations = { ...allAnnotations };
            } else {
                alert("Erreur lors de l'enregistrement");
            }
        } catch (e) {
            console.error(e);
            alert($t('common.errors.connection_error'));
        }
    }

    function handleToothSelect(fdi: number, event?: MouseEvent) {
        if (event?.ctrlKey || event?.metaKey) {
            if (selectedTeethFdis.includes(fdi)) {
                selectedTeethFdis = selectedTeethFdis.filter(id => id !== fdi);
            } else {
                selectedTeethFdis = [...selectedTeethFdis, fdi];
            }
            selectedToothFdi = null; // Close panel if multi-selecting
        } else {
            selectedToothFdi = fdi;
            selectedTeethFdis = [fdi];
        }
    }
</script>

<div class="min-h-screen bg-slate-50 font-sans p-8">
    
    <!-- Top Header -->
    <header class="max-w-[1400px] mx-auto mb-12 flex justify-between items-center">
        <div class="flex items-center gap-6">
            <a href="/doctor/patients/{data.patient.id}" class="p-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
                <ChevronLeft class="w-6 h-6" />
            </a>
            <div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight">
                    {$t('doctor.patients.clinical_record_v2')} <span class="text-slate-300 mx-2">/</span> <span class="text-indigo-600">{data.patient.full_name}</span>
                </h1>
                <div class="flex items-center gap-4 mt-1">
                    <span class="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Activity class="w-3.5 h-3.5 text-indigo-400" /> {$t('doctor.patients.anatomical_mode')}
                    </span>
                </div>
            </div>
        </div>

        <div class="flex gap-3">
            {#if selectedTeethFdis.length >= 2}
                <button 
                    onclick={createBridge}
                    class="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all animate-in fade-in slide-in-from-right-4"
                >
                    <Activity class="w-4 h-4" /> Créer un Bridge ({selectedTeethFdis.length} dents)
                </button>
            {/if}
            <button class="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
                <Info class="w-4 h-4" /> {$t('common.legend')}
            </button>
        </div>
    </header>

    <!-- Main Chart View -->
    <main class="max-w-[1400px] mx-auto">
        <div class="bg-white/50 backdrop-blur-md rounded-[48px] p-12 border border-white shadow-xl shadow-slate-200/50">
            <CarteDentaireV2 
                {allAnnotations}
                {selectedTeethFdis}
                onToothSelect={handleToothSelect}
            />
        </div>
        
        <div class="mt-12 grid grid-cols-3 gap-8">
            <div class="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100">
                <h3 class="font-black text-xl mb-2">{$t('doctor.patients.quick_diagnosis')}</h3>
                <p class="text-indigo-100 text-sm font-medium leading-relaxed">Sélectionnez une dent pour ouvrir le panneau d'examen détaillé et annoter chaque surface.</p>
            </div>
            <div class="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                <h3 class="font-black text-xl text-slate-900 mb-2">{$t('doctor.patients.endodontic_tracking')}</h3>
                <p class="text-slate-500 text-sm font-medium leading-relaxed">{$t('doctor.patients.odontogram_v2_desc')}</p>
            </div>
            <div class="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                <h3 class="font-black text-xl text-slate-900 mb-2">Synchronisation</h3>
                <p class="text-slate-500 text-sm font-medium leading-relaxed">{$t('doctor.patients.realtime_save_desc')}</p>
            </div>
        </div>
    </main>

    <!-- Edit Panel Overlay -->
    {#if selectedToothFdi}
        <ToothEditPanelV2 
            fdi={selectedToothFdi}
            annotations={allAnnotations[selectedToothFdi] || {}}
            onSave={handleSave}
            onDeleteBridge={handleDeleteBridge}
            onClose={() => selectedToothFdi = null}
        />
    {/if}

</div>

<style>
    :global(body) {
        background-color: #f8fafc;
    }
</style>
