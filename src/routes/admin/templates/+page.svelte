<script lang="ts">
    import { enhance } from "$app/forms";
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";

    export let data: any;
    // Data.templates is an array of {name, html_content, css_content, ...}

    let selectedTemplateName = "";
    let htmlContent = "";
    let cssContent = "";
    let previewHtml = "";
    let isPreviewLoading = false;
    let saveMessage = "";
    let timer: any;

    // Use reactive statement to select first template if none selected or on load
    $: sortedTemplates = data.templates || [];

    function selectTemplate(name: string) {
        const t = sortedTemplates.find((t: any) => t.name === name);
        if (t) {
            selectedTemplateName = t.name;
            htmlContent = t.html_content;
            cssContent = t.css_content || "";
            triggerPreview();
        }
    }

    // Debounced Preview Trigger
    function handleInput() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            triggerPreview();
        }, 800);
    }

    async function triggerPreview() {
        if (!selectedTemplateName) return;

        isPreviewLoading = true;
        try {
            const res = await fetch("/api/admin/templates/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    template_type: selectedTemplateName, // "Invoice" or "Prescription"
                    html_content: htmlContent,
                    css_content: cssContent,
                }),
            });
            const result = await res.json();
            if (result.html) {
                previewHtml = result.html;
            }
        } catch (e) {
            console.error(e);
        } finally {
            isPreviewLoading = false;
        }
    }

    // Auto-select first template on mount
    onMount(() => {
        if (sortedTemplates.length > 0) {
            selectTemplate(sortedTemplates[0].name);
        }
    });
</script>

<div class="flex h-screen bg-slate-50 overflow-hidden">
    <!-- Sidebar: Template List -->
    <aside
        class="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm"
    >
        <div class="p-6 border-b border-slate-100">
            <h2 class="text-xl font-black text-indigo-900 tracking-tight">
                {$t('admin.templates.templates')}
            </h2>
            <p class="text-xs text-slate-400 font-bold uppercase mt-1">
                {$t('admin.templates.print_engine')}
            </p>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
            {#each sortedTemplates as tpl}
                <button
                    class="w-full text-left px-4 py-3 rounded-xl transition-all font-bold text-sm
                    {selectedTemplateName === tpl.name
                        ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-500'}"
                    on:click={() => selectTemplate(tpl.name)}
                >
                    {tpl.name}
                </button>
            {/each}
        </div>
        <div class="p-4 border-t border-slate-100 text-center">
            <a
                href="/admin/settings"
                class="text-xs font-bold text-slate-400 hover:text-slate-600"
                >{$t('admin.templates.back_to_settings')}</a
            >
        </div>
    </aside>

    <!-- Main Editor Area -->
    <main class="flex-1 flex flex-col h-full overflow-hidden">
        <!-- Toolbar -->
        <header
            class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0"
        >
            <div class="flex items-center gap-2">
                <span class="text-slate-400">{$t('admin.templates.editing')}</span>
                <h1 class="font-black text-slate-700 text-lg">
                    {selectedTemplateName}
                </h1>
            </div>

            <div class="flex items-center gap-4">
                {#if saveMessage}
                    <span
                        class="text-emerald-500 text-sm font-bold animate-pulse"
                        >{saveMessage}</span
                    >
                {/if}

                <form
                    method="POST"
                    action="?/save"
                    use:enhance={() => {
                        return async ({ result }) => {
                            if (result.type === "success") {
                                saveMessage = "Saved!";
                                setTimeout(() => (saveMessage = ""), 2000);
                                // Refresh data to keep sync
                                const tpl = sortedTemplates.find(
                                    (t: any) => t.name === selectedTemplateName,
                                );
                                if (tpl) {
                                    tpl.html_content = htmlContent;
                                    tpl.css_content = cssContent;
                                }
                            }
                        };
                    }}
                >
                    <input
                        type="hidden"
                        name="name"
                        value={selectedTemplateName}
                    />
                    <input
                        type="hidden"
                        name="html_content"
                        value={htmlContent}
                    />
                    <input
                        type="hidden"
                        name="css_content"
                        value={cssContent}
                    />

                    <button
                        type="submit"
                        class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                    >
                        <span>{$t('admin.templates.save_changes')}</span>
                    </button>
                </form>
            </div>
        </header>

        <!-- Split View -->
        <div class="flex-1 flex overflow-hidden">
            <!-- Left: Code Editors -->
            <div
                class="w-1/2 flex flex-col border-r border-slate-200 bg-slate-900"
            >
                <!-- HTML Editor -->
                <div
                    class="flex-1 flex flex-col min-h-0 border-b border-slate-700"
                >
                    <div
                        class="bg-slate-800 px-4 py-2 text-xs font-bold text-slate-400 flex justify-between"
                    >
                        <span>{$t('admin.templates.html_handlebars')}</span>
                    </div>
                    <textarea
                        bind:value={htmlContent}
                        on:input={handleInput}
                        class="flex-1 w-full bg-slate-900 text-slate-300 font-mono text-sm p-4 outline-none resize-none focus:bg-slate-800/50 transition-colors leading-relaxed"
                        placeholder={$t('admin.templates.div_div')}
                        spellcheck="false"
                    ></textarea>
                </div>

                <!-- CSS Editor -->
                <div class="h-1/3 flex flex-col min-h-0">
                    <div
                        class="bg-slate-800 px-4 py-2 text-xs font-bold text-slate-400 border-t border-slate-700"
                    >
                        <span>{$t('admin.templates.css_styles')}</span>
                    </div>
                    <textarea
                        bind:value={cssContent}
                        on:input={handleInput}
                        class="flex-1 w-full bg-slate-900 text-emerald-300 font-mono text-sm p-4 outline-none resize-none focus:bg-slate-800/50 transition-colors leading-relaxed"
                        placeholder={".class { ... }"}
                        spellcheck="false"
                    ></textarea>
                </div>
            </div>

            <!-- Right: Preview -->
            <div class="w-1/2 flex flex-col bg-slate-100 relative">
                <div
                    class="bg-white border-b border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 flex justify-between items-center"
                >
                    <span>{$t('admin.templates.live_preview_mock_data')}</span>
                    {#if isPreviewLoading}
                        <span class="text-indigo-500 animate-pulse"
                            >{$t('admin.templates.rendering')}</span
                        >
                    {/if}
                </div>
                <div
                    class="flex-1 p-8 overflow-auto flex justify-center bg-slate-100"
                >
                    <!-- A4 Paper Simulation -->
                    <div
                        class="bg-white shadow-xl relative transition-all duration-300"
                        style="width: 210mm; min-height: 297mm;"
                    >
                        <iframe
                            srcdoc={previewHtml}
                            title={$t('admin.templates.preview')}
                            class="w-full h-full absolute inset-0 border-none print-preview-frame"
                            style="width: 210mm; height: 297mm;"
                        ></iframe>
                    </div>
                </div>
            </div>
        </div>
    </main>
</div>

<style>
    /* Custom Scrollbar for editors */
    textarea::-webkit-scrollbar {
        width: 10px;
        background: #0f172a;
    }
    textarea::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 5px;
    }
</style>
