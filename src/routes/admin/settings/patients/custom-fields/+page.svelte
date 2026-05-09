<script lang="ts">
    import { enhance } from '$app/forms';
    import { fade, slide, scale } from 'svelte/transition';
    import { 
        Plus, 
        Trash2, 
        GripVertical, 
        Settings2, 
        Type, 
        Hash, 
        ListOrdered, 
        FileText, 
        AlertCircle,
        Save,
        X,
        Edit3,
        Activity,
        Heart,
        Scale,
        Clock,
        FileSearch,
        Stethoscope,
        Dna,
        FlaskConical,
        Phone,
        Mail,
        Calendar,
        Zap
    } from 'lucide-svelte';

    import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';

    let { data, form } = $props();

    let isModalOpen = $state(false);
    let editingDefinition = $state<any>(null);

    // DND state
    let items = $state<any[]>([]);

    // Sync items with data.definitions
    $effect(() => {
        if (data.definitions) {
            items = [...data.definitions].sort((a, b) => a.display_order - b.display_order);
        }
    });

    let existingTabs = $derived([...new Set(items.map(d => d.tab_name).filter(Boolean))]);
    let existingGroups = $derived([...new Set(items.map(d => d.group_name).filter(Boolean))]);

    const flipDurationMs = 200;

    function handleDndConsider(e: any) {
        items = e.detail.items;
    }

    async function handleDndFinalize(e: any) {
        items = e.detail.items;
        
        // Prepare the new order
        const newOrder = items.map((item, index) => ({
            id: item.id,
            display_order: index
        }));

        // Send to server
        const formData = new FormData();
        formData.append('items', JSON.stringify(newOrder));
        
        const response = await fetch('?/updateOrder', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            console.error("Failed to update order");
        }
    }

    const availableIcons = [
        { id: 'FileText', component: FileText, label: 'Document' },
        { id: 'Activity', component: Activity, label: 'Activité' },
        { id: 'Heart', component: Heart, label: 'Cœur' },
        { id: 'Scale', component: Scale, label: 'Balance' },
        { id: 'Stethoscope', component: Stethoscope, label: 'Médical' },
        { id: 'Dna', component: Dna, label: 'Génétique' },
        { id: 'FlaskConical', component: FlaskConical, label: 'Labo' },
        { id: 'FileSearch', component: FileSearch, label: 'Examen' }
    ];

    // Form state for options (Select type)
    let optionsList = $state<string[]>([]);
    let newOption = $state("");

    function addOption() {
        if (newOption.trim()) {
            optionsList = [...optionsList, newOption.trim()];
            newOption = "";
        }
    }

    function removeOption(index: number) {
        optionsList = optionsList.filter((_, i) => i !== index);
    }

    function openCreate() {
        editingDefinition = {
            name: "",
            field_type: "text",
            unit: "",
            min_range: null,
            max_range: null,
            display_order: 0,
            is_required: false,
            is_auditable: false,
            icon: "FileText",
            validation_regex: "",
            tab_name: "Général",
            group_name: "Informations"
        };
        optionsList = [];
        isModalOpen = true;
    }

    function openEdit(def: any) {
        editingDefinition = { 
            ...def,
            is_required: !!def.is_required
        };
        optionsList = def.options ? JSON.parse(def.options) : [];
        isModalOpen = true;
    }

    const typeIcons = {
        text: Type,
        number: Hash,
        float: Zap,
        tel: Phone,
        email: Mail,
        select: ListOrdered,
        date: Calendar,
        file: FileText
    };

</script>

<div class="max-w-6xl mx-auto py-10 px-6">
    <!-- Header -->
    <div class="flex justify-between items-end mb-12">
        <div>
            <nav class="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">
                <a href="/admin" class="hover:text-indigo-600 transition-colors">Admin</a>
                <span class="text-slate-300">/</span>
                <a href="/admin/settings" class="hover:text-indigo-600 transition-colors">Paramètres</a>
                <span class="text-slate-300">/</span>
                <span class="text-slate-900">Champs Personnalisés</span>
            </nav>
            <h1 class="text-4xl font-black text-slate-900 tracking-tight">Champs Personnalisés</h1>
            <p class="text-slate-500 font-medium mt-2">Définissez des informations supplémentaires à collecter pour chaque patient.</p>
        </div>

        <button 
            onclick={openCreate}
            class="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3"
        >
            <Plus size={20} />
            AJOUTER UN CHAMP
        </button>
    </div>

    {#if form?.error}
        <div class="mb-8 p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 font-bold" in:slide>
            <AlertCircle size={20} />
            {form.error}
        </div>
    {/if}

    <!-- Fields List -->
    <div 
        class="grid grid-cols-1 gap-4 outline-none"
        use:dndzone={{ items, flipDurationMs, dragDisabled: false, dropTargetStyle: {} }}
        onconsider={handleDndConsider}
        onfinalize={handleDndFinalize}
    >
        {#each items as def (def.id)}
            {@const Icon = typeIcons[def.field_type as keyof typeof typeIcons]}
            <div 
                class="bg-white border-2 border-slate-100 rounded-3xl p-6 flex items-center justify-between group hover:border-indigo-100 hover:shadow-xl hover:shadow-slate-100/50 transition-all mb-4"
                in:fade
            >
                {#if def[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
                    <div class="absolute inset-0 bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-200 animate-pulse"></div>
                {/if}

                <div class="flex items-center gap-6">
                    <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                        <Icon size={24} />
                    </div>
                    <div>
                        <div class="flex items-center gap-3">
                            <h3 class="font-black text-slate-900 text-lg">{def.name}</h3>
                            {#if def.is_required}
                                <span class="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-500 text-[10px] font-black uppercase">Requis</span>
                            {/if}
                            {#if def.is_full_width}
                                <span class="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-500 text-[10px] font-black uppercase">Large</span>
                            {/if}
                        </div>
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Type: {def.field_type} 
                            {#if def.unit} • Unité: {def.unit}{/if}
                            {#if def.field_type === 'select'}
                                • {JSON.parse(def.options || '[]').length} options
                            {/if}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                        onclick={() => openEdit(def)}
                        class="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                        <Edit3 size={20} />
                    </button>
                    <form method="POST" action="?/delete" use:enhance>
                        <input type="hidden" name="id" value={def.id} />
                        <button 
                            type="submit"
                            class="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                            <Trash2 size={20} />
                        </button>
                    </form>
                    <div class="p-3 text-slate-400 cursor-grab active:cursor-grabbing hover:bg-slate-50 rounded-xl transition-all">
                        <GripVertical size={20} />
                    </div>
                </div>
            </div>
        {/each}
        {#if items.length === 0}
            <div class="py-24 text-center bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-100">
                <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-sm">
                    <Settings2 size={40} />
                </div>
                <h3 class="text-xl font-black text-slate-400">Aucun champ défini</h3>
                <p class="text-slate-400 font-medium mt-2">Commencez par ajouter votre premier champ personnalisé.</p>
                <button 
                    onclick={openCreate}
                    class="mt-8 text-indigo-600 font-black text-sm hover:underline"
                >
                    Ajouter maintenant
                </button>
            </div>
        {/if}
    </div>
</div>

<!-- Modal -->
{#if isModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-6" in:fade={{ duration: 200 }}>
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onclick={() => isModalOpen = false}></div>
        
        <div 
            class="relative bg-white w-full max-w-xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
            in:scale={{ duration: 300, start: 0.95 }}
        >
            <form 
                method="POST" 
                action={editingDefinition?.id ? "?/update" : "?/create"} 
                class="flex flex-col min-h-0"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === 'success') {
                            isModalOpen = false;
                        }
                        await update();
                    };
                }}
            >
                <div class="p-10 overflow-y-auto flex-1 custom-scrollbar">
                    <div class="flex justify-between items-center mb-10">
                        <h2 class="text-3xl font-black text-slate-900">
                            {editingDefinition?.id ? "Modifier le champ" : "Nouveau champ"}
                        </h2>
                        <button 
                            type="button" 
                            onclick={() => isModalOpen = false}
                            class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div class="space-y-8">
                        {#if form?.error}
                            <div class="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-2 text-rose-600 animate-in fade-in slide-in-from-top-2">
                                <div class="flex items-center gap-3">
                                    <AlertCircle size={20} />
                                    <p class="text-sm font-bold">{form.error}</p>
                                </div>
                                {#if form.details}
                                    <p class="text-[10px] font-mono bg-white/50 p-2 rounded-lg break-all">{form.details}</p>
                                {/if}
                            </div>
                        {/if}

                        {#if editingDefinition}
                            <input type="hidden" name="id" value={editingDefinition.id} />
                        {/if}

                        <div>
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Nom du champ</label>
                            <input 
                                type="text" 
                                name="name" 
                                required 
                                bind:value={editingDefinition.name}
                                placeholder="Ex: Groupe Sanguin, Référence..."
                                class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-lg"
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Onglet (Tab)</label>
                                <input 
                                    type="text" 
                                    name="tab_name" 
                                    required 
                                    list="tabs-list"
                                    bind:value={editingDefinition.tab_name}
                                    placeholder="Ex: Général, Médical..."
                                    class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                />
                                <datalist id="tabs-list">
                                    {#each existingTabs as tab}
                                        <option value={tab}></option>
                                    {/each}
                                </datalist>
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Groupe</label>
                                <input 
                                    type="text" 
                                    name="group_name" 
                                    required 
                                    list="groups-list"
                                    bind:value={editingDefinition.group_name}
                                    placeholder="Ex: Informations, Antécédents..."
                                    class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                />
                                <datalist id="groups-list">
                                    {#each existingGroups as group}
                                        <option value={group}></option>
                                    {/each}
                                </datalist>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Type de donnée</label>
                                <select 
                                    name="type" 
                                    required 
                                    bind:value={editingDefinition.field_type}
                                    class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="text">Texte</option>
                                    <option value="number">Nombre (Entier)</option>
                                    <option value="float">Nombre (Décimal)</option>
                                    <option value="tel">Téléphone</option>
                                    <option value="email">Email</option>
                                    <option value="select">Liste (Choix)</option>
                                    <option value="date">Date</option>
                                    <option value="file">Fichier</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Unité (Optionnel)</label>
                                <input 
                                    type="text" 
                                    name="unit" 
                                    bind:value={editingDefinition.unit}
                                    placeholder="Ex: kg, mg/dl, mm/h..."
                                    class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                />
                            </div>
                        </div>

                        {#if editingDefinition.field_type === 'number' || editingDefinition.field_type === 'float'}
                            <div class="grid grid-cols-2 gap-6" in:slide>
                                <div>
                                    <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Norme Min</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        name="min_range" 
                                        bind:value={editingDefinition.min_range}
                                        placeholder="Min..."
                                        class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Norme Max</label>
                                    <input 
                                        type="number" 
                                        step="any"
                                        name="max_range" 
                                        bind:value={editingDefinition.max_range}
                                        placeholder="Max..."
                                        class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                                    />
                                </div>
                            </div>
                        {/if}

                        <div>
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Ordre d'affichage</label>
                            <input 
                                type="number" 
                                name="display_order" 
                                bind:value={editingDefinition.display_order}
                                class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold"
                            />
                        </div>

                        <div>
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Icône Visuelle</label>
                            <input type="hidden" name="icon" value={editingDefinition.icon} />
                            <div class="grid grid-cols-4 gap-3">
                                {#each availableIcons as icon}
                                    <button 
                                        type="button"
                                        class="p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 {editingDefinition.icon === icon.id ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}"
                                        onclick={() => editingDefinition.icon = icon.id}
                                    >
                                        <svelte:component this={icon.component} size={20} />
                                        <span class="text-[8px] font-black uppercase tracking-tighter">{icon.label}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <div class="flex flex-col gap-4">
                            <div class="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-slate-100 transition-all">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <p class="text-sm font-black text-slate-900">Champ obligatoire</p>
                                        <p class="text-[10px] text-slate-400 font-medium">Bloquer l'enregistrement si vide</p>
                                    </div>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="is_required" 
                                        bind:checked={editingDefinition.is_required}
                                        class="peer sr-only"
                                    />
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div class="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-slate-100 transition-all">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                                        <div class="w-5 h-3 border-2 border-blue-600 rounded-sm"></div>
                                    </div>
                                    <div>
                                        <p class="text-sm font-black text-slate-900">Pleine largeur</p>
                                        <p class="text-[10px] text-slate-400 font-medium">Prendre toute la largeur de la ligne</p>
                                    </div>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="is_full_width" 
                                        bind:checked={editingDefinition.is_full_width}
                                        class="peer sr-only"
                                    />
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div class="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-slate-100 transition-all">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p class="text-sm font-black text-slate-900">Historique d'audit</p>
                                        <p class="text-[10px] text-slate-400 font-medium">Suivre toutes les modifications historiques</p>
                                    </div>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="is_auditable" 
                                        bind:checked={editingDefinition.is_auditable}
                                        class="peer sr-only"
                                    />
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                </label>
                            </div>
                        </div>

                        {#if ['text', 'number', 'float', 'tel', 'email'].includes(editingDefinition.field_type)}
                            <div in:slide>
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Validation Regex (Optionnel)</label>
                                <input 
                                    type="text" 
                                    name="validation_regex" 
                                    bind:value={editingDefinition.validation_regex}
                                    placeholder="Ex: ^[0-9]{10}$"
                                    class="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-mono text-sm"
                                />
                                <p class="text-[10px] text-slate-400 mt-2">Utilisez une expression régulière pour valider le contenu du champ.</p>
                            </div>
                        {/if}

                        {#if editingDefinition.field_type === 'select'}
                            <div in:slide>
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Options de la liste</label>
                                <div class="space-y-3">
                                    <div class="flex gap-2">
                                        <input 
                                            type="text" 
                                            bind:value={newOption}
                                            placeholder="Ajouter une option..."
                                            class="flex-1 px-4 py-2 bg-slate-50 rounded-xl border-none outline-none font-bold"
                                            onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                                        />
                                        <button 
                                            type="button" 
                                            onclick={addOption}
                                            class="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        {#each optionsList as opt, i}
                                            <div class="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm">
                                                {opt}
                                                <button type="button" onclick={() => removeOption(i)} class="text-slate-300 hover:text-rose-500 transition-colors">&times;</button>
                                            </div>
                                        {/each}
                                    </div>
                                    <input type="hidden" name="options" value={JSON.stringify(optionsList)} />
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="p-8 bg-slate-50 flex gap-4 shrink-0 border-t border-slate-100">
                    <button 
                        type="submit"
                        class="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                    >
                        <Save size={20} />
                        ENREGISTRER LE CHAMP
                    </button>
                    <button 
                        type="button" 
                        onclick={() => isModalOpen = false}
                        class="px-8 py-5 bg-white text-slate-500 rounded-2xl font-black text-sm border-2 border-slate-100 hover:bg-slate-50 transition-all"
                    >
                        ANNULER
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
</style>
