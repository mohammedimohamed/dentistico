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
        field_type: 'text' | 'number' | 'float' | 'tel' | 'email' | 'select' | 'date' | 'file';
        unit: string;
        min_range: number | null;
        max_range: number | null;
        options: string;
        is_required: number;
        is_auditable: number;
        is_full_width: number;
        icon: string;
        validation_regex: string;
        tab_name: string;
        group_name: string;
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

    function checkNorm(value: any, min: number | null, max: number | null): 'GOOD' | 'WARNING' | 'NEUTRAL' {
        if (!min && !max) return 'NEUTRAL';
        if (value === undefined || value === '') return 'NEUTRAL';
        const num = parseFloat(value);
        if (isNaN(num)) return 'NEUTRAL';
        
        const isMinOk = min !== null ? num >= min : true;
        const isMaxOk = max !== null ? num <= max : true;
        
        return (isMinOk && isMaxOk) ? 'GOOD' : 'WARNING';
    }

    // Grouping Logic
    const organizedFields = $derived.by(() => {
        const result: Record<string, Record<string, Definition[]>> = {};
        for (const def of definitions) {
            const tab = def.tab_name || "Général";
            const group = def.group_name || "Informations";
            
            if (!result[tab]) result[tab] = {};
            if (!result[tab][group]) result[tab][group] = [];
            
            result[tab][group].push(def);
        }
        return result;
    });

    const tabs = $derived(Object.keys(organizedFields));
    let activeTab = $state("");
    
    $effect(() => {
        if (tabs.length > 0 && !activeTab) {
            activeTab = tabs[0];
        }
    });

</script>

<div class="space-y-10">
    <!-- Tab Switcher (Sub-tabs) -->
    {#if tabs.length > 1}
        <div class="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-[22px] border border-slate-200/60 overflow-x-auto no-scrollbar w-fit shadow-inner">
            {#each tabs as tab}
                <button 
                    onclick={() => activeTab = tab}
                    class="px-6 py-2.5 rounded-[16px] font-black text-[11px] uppercase tracking-[0.1em] transition-all whitespace-nowrap
                        {activeTab === tab ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 scale-[1.02]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/30'}"
                >
                    {tab}
                </button>
            {/each}
        </div>
    {/if}

    <!-- Tab Content -->
    {#if activeTab && organizedFields[activeTab]}
        <div class="space-y-8" in:fade>
            {#each Object.entries(organizedFields[activeTab]) as [groupName, fields]}
                <div class="bg-white border-2 border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                        <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest">{groupName}</h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {#each fields as def (def.id)}
                            {@const normStatus = (def.field_type === 'number' || def.field_type === 'float') ? checkNorm(values[def.name], def.min_range, def.max_range) : 'NEUTRAL'}
                            {@const isValid = ['text', 'tel', 'email'].includes(def.field_type) && def.validation_regex ? validateRegex(values[def.name] || '', def.validation_regex) : true}
                                                        <div class="space-y-3 {def.is_full_width ? 'md:col-span-2' : ''}" in:fade>
                                <div class="flex flex-wrap items-start justify-between gap-3 px-1">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-3 min-w-0 flex-1">
                                        <div class="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                                            <svelte:component this={iconMap[def.icon] || FileText} size={14} />
                                        </div>
                                        <span class="truncate">{def.name}</span>
                                        {#if def.is_required}
                                            <span class="text-rose-500 font-black shrink-0">*</span>
                                        {/if}
                                    </label>
                                    
                                    <div class="flex items-center gap-2 shrink-0">
                                        {#if normStatus === 'GOOD'}
                                            <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 animate-in fade-in zoom-in">
                                                <CheckCircle2 size={10} />
                                                <span class="text-[8px] font-black uppercase">Normal</span>
                                            </div>
                                        {:else if normStatus === 'WARNING'}
                                            <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 animate-bounce-subtle">
                                                <AlertCircle size={10} />
                                                <span class="text-[8px] font-black uppercase">Hors normes</span>
                                            </div>
                                        {/if}

                                        {#if !isValid && values[def.name]}
                                            <div class="flex items-center gap-1 text-rose-500">
                                                <AlertCircle size={12} />
                                                <span class="text-[8px] font-bold uppercase tracking-tighter">Format invalide</span>
                                            </div>
                                        {/if}

                                        {#if def.is_auditable}
                                            <button 
                                                type="button"
                                                onclick={() => openHistory(def.name)}
                                                class="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-amber-50 hover:text-amber-500 border border-slate-100 transition-all group"
                                            >
                                                <Clock size={14} class="group-hover:rotate-12 transition-transform" />
                                            </button>
                                        {/if}
                                    </div>
                                </div>

                                <div class="relative group/field">
                                    {#if ['text', 'number', 'float', 'tel', 'email', 'date'].includes(def.field_type)}
                                        <div class="flex items-stretch">
                                            <input 
                                                type={def.field_type === 'float' ? 'number' : def.field_type}
                                                step={def.field_type === 'float' ? '0.01' : undefined}
                                                value={values[def.name] || ''}
                                                oninput={(e) => handleChange(def.name, e.currentTarget.value)}
                                                required={def.is_required === 1}
                                                class="w-full px-6 py-4 bg-slate-50/50 border-2 rounded-[22px] outline-none transition-all font-bold text-base shadow-sm min-w-0
                                                    {def.unit ? 'rounded-r-none border-r-0' : ''}
                                                    {normStatus === 'WARNING' ? 'border-rose-200 bg-rose-50/30 text-rose-900 focus:border-rose-500' : 
                                                     normStatus === 'GOOD' ? 'border-emerald-100 bg-emerald-50/20 text-emerald-900 focus:border-emerald-500' : 
                                                     !isValid && values[def.name] ? 'border-rose-200 bg-rose-50/30 focus:border-rose-500' :
                                                     'border-slate-100 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 text-slate-900'}"
                                                placeholder={`Saisir ${def.name.toLowerCase()}...`}
                                            />
                                            {#if def.unit}
                                                <div class="flex items-center px-4 bg-slate-50 border-2 border-l-0 rounded-r-[22px] text-[10px] font-black text-slate-400 uppercase tracking-tighter shadow-sm
                                                    {normStatus === 'WARNING' ? 'border-rose-200 bg-rose-50/30 text-rose-600' : 
                                                     normStatus === 'GOOD' ? 'border-emerald-100 bg-emerald-50/20 text-emerald-600' : 
                                                     'border-slate-100 text-slate-400'}">
                                                    {def.unit}
                                                </div>
                                            {/if}
                                        </div>
                                    {:else if def.field_type === 'select'}

                                        {@const options = JSON.parse(def.options || '[]')}
                                        <div class="relative">
                                            <select 
                                                value={values[def.name] || ''}
                                                onchange={(e) => handleChange(def.name, e.currentTarget.value)}
                                                required={def.is_required === 1}
                                                class="w-full px-6 py-4 bg-slate-50/50 border-2 border-slate-100 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-[22px] outline-none transition-all font-bold text-base text-slate-900 appearance-none cursor-pointer shadow-sm"
                                            >
                                                <option value="">-- Choisir --</option>
                                                {#each options as opt}
                                                    <option value={opt}>{opt}</option>
                                                {/each}
                                            </select>
                                            <div class="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ListOrdered size={18} />
                                            </div>
                                        </div>
                                    {:else if def.field_type === 'file'}
                                        <div class="relative group">
                                            {#if values[def.name]}
                                                <div class="flex items-center justify-between p-4 bg-indigo-50/50 rounded-[22px] border border-indigo-100" in:slide>
                                                    <div class="flex items-center gap-3 overflow-hidden">
                                                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div class="overflow-hidden">
                                                            <p class="text-xs font-black text-indigo-900 truncate leading-none">{values[def.name].name}</p>
                                                            <p class="text-[9px] text-indigo-400 font-bold mt-1.5 uppercase tracking-tighter">
                                                                {(values[def.name].size / 1024).toFixed(1)} KB
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onclick={() => handleChange(def.name, null)}
                                                        class="w-8 h-8 rounded-full hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center text-indigo-300 transition-all"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            {:else}
                                                <label class="flex flex-col items-center justify-center w-full h-16 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[22px] cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
                                                    <div class="flex items-center gap-3">
                                                        <Upload size={18} class="text-slate-400 group-hover:text-indigo-600" />
                                                        <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Joindre un document</span>
                                                    </div>
                                                    <input type="file" class="hidden" onchange={(e) => handleFileChange(def.name, e)} />
                                                </label>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    @keyframes bounce-subtle {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
    }
    .animate-bounce-subtle {
        animation: bounce-subtle 2s infinite;
    }
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>

<FieldHistoryModal 
    isOpen={historyModalOpen} 
    onClose={() => historyModalOpen = false} 
    patientId={patientId} 
    fieldName={historyFieldName} 
/>
