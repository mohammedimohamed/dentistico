<script lang="ts">
    import { fade, slide } from 'svelte/transition';
    import { 
        Type, 
        Hash, 
        ListOrdered, 
        FileText, 
        Upload, 
        X,
        CheckCircle2,
        AlertCircle,
        Activity,
        Heart,
        Scale,
        Clock,
        FileSearch,
        Stethoscope,
        Dna,
        FlaskConical
    } from 'lucide-svelte';

    const iconMap: Record<string, any> = {
        FileText,
        Activity,
        Heart,
        Scale,
        Stethoscope,
        Dna,
        FlaskConical,
        FileSearch,
        Type,
        Hash,
        ListOrdered
    };

    interface Definition {
        id: number;
        name: string;
        type: 'text' | 'number' | 'select' | 'file';
        options: string;
        is_required: number;
        is_auditable: number;
        is_full_width: number;
        icon: string;
        validation_regex: string;
    }

    import FieldHistoryModal from './FieldHistoryModal.svelte';

    let { 
        definitions = [], 
        values = {}, 
        patientId = null,
        onUpdate 
    }: { 
        definitions: Definition[], 
        values: Record<string, any>,
        patientId?: number | null,
        onUpdate: (values: Record<string, any>) => void
    } = $props();

    let historyModalOpen = $state(false);
    let historyFieldName = $state("");

    function openHistory(name: string) {
        historyFieldName = name;
        historyModalOpen = true;
    }

    function handleChange(name: string, value: any) {
        const newValues = { ...values, [name]: value };
        onUpdate(newValues);
    }

    function handleFileChange(name: string, e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                handleChange(name, {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: re.target?.result
                });
            };
            reader.readAsDataURL(file);
        }
    }

    function validateRegex(val: string, regexStr: string): boolean {
        if (!regexStr || !val) return true;
        try {
            const regex = new RegExp(regexStr);
            return regex.test(val);
        } catch (e) {
            return true;
        }
    }

</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-1">
    {#each definitions as def (def.id)}
        <div class="space-y-3 {def.is_full_width ? 'md:col-span-2' : ''}" in:fade>
            <div class="flex items-center justify-between px-1">
                <label class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <svelte:component this={iconMap[def.icon] || FileText} size={16} />
                    </div>
                    {def.name}
                    {#if def.is_required}
                        <span class="text-rose-500 font-black text-lg">*</span>
                    {/if}
                    
                    {#if def.is_auditable}
                        <button 
                            type="button"
                            onclick={() => openHistory(def.name)}
                            class="ml-auto w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-amber-100 hover:text-amber-600 border border-slate-100 hover:border-amber-200 transition-all shadow-sm group"
                            title="Voir l'historique"
                        >
                            <Clock size={16} class="group-hover:rotate-12 transition-transform" />
                        </button>
                    {/if}
                </label>
                
                {#if def.type === 'text' && def.validation_regex}
                    {@const isValid = validateRegex(values[def.name] || '', def.validation_regex)}
                    <div class="flex items-center gap-1">
                        {#if values[def.name]}
                            {#if isValid}
                                <CheckCircle2 size={12} class="text-emerald-500" />
                            {:else}
                                <span class="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">Format invalide</span>
                                <AlertCircle size={12} class="text-rose-500" />
                            {/if}
                        {/if}
                    </div>
                {/if}
            </div>

            {#if def.type === 'text' || def.type === 'number'}
                <input 
                    type={def.type}
                    value={values[def.name] || ''}
                    oninput={(e) => handleChange(def.name, e.currentTarget.value)}
                    required={def.is_required === 1}
                    class="w-full px-6 py-4 bg-white border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 rounded-[20px] outline-none transition-all font-bold text-base text-slate-900 shadow-sm placeholder:text-slate-300"
                    placeholder={`Saisir ${def.name.toLowerCase()}...`}
                />
            {:else if def.type === 'select'}
                {@const options = JSON.parse(def.options || '[]')}
                <select 
                    value={values[def.name] || ''}
                    onchange={(e) => handleChange(def.name, e.currentTarget.value)}
                    required={def.is_required === 1}
                    class="w-full px-6 py-4 bg-white border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 rounded-[20px] outline-none transition-all font-bold text-base text-slate-900 appearance-none cursor-pointer shadow-sm"
                >
                    <option value="">-- Choisir --</option>
                    {#each options as opt}
                        <option value={opt}>{opt}</option>
                    {/each}
                </select>
            {:else if def.type === 'file'}
                <div class="relative group">
                    {#if values[def.name]}
                        <div class="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100" in:slide>
                            <div class="flex items-center gap-3 overflow-hidden">
                                <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div class="overflow-hidden">
                                    <p class="text-xs font-black text-indigo-900 truncate leading-none">{values[def.name].name}</p>
                                    <p class="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-tighter">
                                        {(values[def.name].size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onclick={() => handleChange(def.name, null)}
                                class="w-8 h-8 rounded-full hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-indigo-400 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    {:else}
                        <label class="flex flex-col items-center justify-center w-full h-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                            <div class="flex items-center gap-2">
                                <Upload size={14} class="text-slate-400 group-hover:text-indigo-600" />
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Télécharger</span>
                            </div>
                            <input type="file" class="hidden" onchange={(e) => handleFileChange(def.name, e)} />
                        </label>
                    {/if}
                </div>
            {/if}
        </div>
    {/each}
</div>

<FieldHistoryModal 
    isOpen={historyModalOpen} 
    onClose={() => historyModalOpen = false} 
    patientId={patientId} 
    fieldName={historyFieldName} 
/>
