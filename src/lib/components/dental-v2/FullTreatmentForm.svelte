<script lang="ts">
    import { t } from "svelte-i18n";
    import { APP_CONFIG } from "$lib/config/app.config";
    import { getToothName } from "$lib/dental/tooth-naming";
    import QuickTreatmentPicker from "../dental/QuickTreatmentPicker.svelte";
    import SurfaceSelector from "../dental/SurfaceSelector.svelte";
    import { X, Save, ShieldCheck } from "lucide-svelte";

    interface Props {
        patientId: number;
        toothNumber: string;
        initialData?: any;
        onSave: (data: any) => Promise<void>;
        onClose: () => void;
    }

    let { patientId, toothNumber, initialData = {}, onSave, onClose }: Props = $props();

    let treatment = $state({
        surfaces: initialData.surfaces ? initialData.surfaces.split(",") : [] as string[],
        cdt_code: initialData.cdt_code || "",
        procedure_description: initialData.treatment_type || "",
        fee: initialData.fee || 0,
        status: initialData.status || "completed" as "existing" | "completed" | "planned",
        date_performed: initialData.date_performed || new Date().toISOString().split("T")[0],
        diagnosis: initialData.diagnosis || "",
        notes: initialData.notes || "",
        color: initialData.color || "#3B82F6",
        isCustom: initialData.cdt_code === "CUSTOM",
    });

    let requiresSurfaces = $state(false);
    let isSaving = $state(false);

    function handleCodeSelect(code: any) {
        treatment.cdt_code = code.code;
        treatment.procedure_description = code.description;
        treatment.fee = code.default_fee;
        treatment.color = code.color_code;
        requiresSurfaces = code.requires_surfaces;
        
        if (!code.requires_surfaces) {
            treatment.surfaces = [];
        }
    }

    function toggleSurface(surface: string) {
        const index = treatment.surfaces.indexOf(surface);
        if (index > -1) {
            treatment.surfaces.splice(index, 1);
        } else {
            treatment.surfaces.push(surface);
        }
        treatment.surfaces = [...treatment.surfaces];
    }

    async function submit() {
        if (!treatment.cdt_code) return alert("Sélectionnez un acte");
        isSaving = true;
        await onSave({
            ...treatment,
            patient_id: patientId,
            tooth_number: toothNumber,
            surfaces: treatment.surfaces.join(","),
        });
        isSaving = false;
        onClose();
    }
</script>

<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
    <div class="bg-white w-full max-w-6xl h-[90vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col border border-white/20">
        
        <!-- Header -->
        <div class="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-indigo-100">
                    {toothNumber}
                </div>
                <div>
                    <h2 class="text-3xl font-black text-slate-900 tracking-tight">Planifier un Soin</h2>
                    <p class="text-slate-500 font-bold flex items-center gap-2">
                        <ShieldCheck class="w-4 h-4 text-emerald-500" /> {getToothName(toothNumber)}
                    </p>
                </div>
            </div>
            <button onclick={onClose} class="p-4 hover:bg-white rounded-3xl transition-all hover:shadow-md border border-transparent hover:border-slate-100">
                <X class="w-8 h-8 text-slate-400" />
            </button>
        </div>

        <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
            <!-- Left: Picker -->
            <div class="w-full md:w-7/12 border-r border-slate-100 overflow-y-auto p-10 bg-slate-50/20">
                <QuickTreatmentPicker onSelect={handleCodeSelect} />
            </div>

            <!-- Right: Form -->
            <div class="w-full md:w-5/12 overflow-y-auto p-10 space-y-8 bg-white">
                {#if requiresSurfaces || treatment.surfaces.length > 0}
                    <section>
                        <SurfaceSelector selectedSurfaces={treatment.surfaces} onToggle={toggleSurface} />
                    </section>
                {/if}

                <section class="space-y-6">
                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Statut de l'acte</label>
                        <div class="grid grid-cols-3 gap-3">
                            {#each ['existing', 'completed', 'planned'] as s}
                                <button 
                                    onclick={() => treatment.status = s as any}
                                    class="py-3 rounded-2xl text-xs font-black uppercase border-2 transition-all {treatment.status === s ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-50 bg-slate-50 text-slate-400'}"
                                >
                                    {s === 'existing' ? 'Existant' : s === 'completed' ? 'Terminé' : 'Prévu'}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Honoraires (DZD)</label>
                            <input 
                                type="number" 
                                bind:value={treatment.fee} 
                                class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-xl text-emerald-600 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Date</label>
                            <input 
                                type="date" 
                                bind:value={treatment.date_performed} 
                                class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Diagnostic</label>
                        <input 
                            type="text" 
                            bind:value={treatment.diagnosis} 
                            placeholder="Ex: Pulpite irréversible"
                            class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Notes</label>
                        <textarea 
                            bind:value={treatment.notes} 
                            class="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-medium text-slate-700 focus:border-indigo-500 outline-none transition-all"
                        ></textarea>
                    </div>
                </section>
            </div>
        </div>

        <!-- Footer -->
        <div class="p-10 border-t border-slate-100 flex justify-end bg-white">
            <button 
                onclick={submit}
                disabled={isSaving || !treatment.cdt_code}
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-12 rounded-[2rem] shadow-2xl shadow-indigo-200 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
                <Save class="w-6 h-6" />
                {isSaving ? "Enregistrement..." : "Enregistrer l'Acte"}
            </button>
        </div>
    </div>
</div>
