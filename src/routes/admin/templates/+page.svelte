<script lang="ts">
    import { onMount } from "svelte";
    import { enhance } from "$app/forms";
    import { fade, slide, scale } from "svelte/transition";
    import { quintOut } from "svelte/easing";

    // We'll import these dynamically or hope npm finishes
    let CodeMirror: any;
    let htmlLanguage: any;
    let cssLanguage: any;
    let oneDark: any;

    let { data } = $props();

    let selectedTemplate = $state(
        data.templates[0] || {
            name: "New Template",
            html_content: "",
            css_content: "",
        },
    );
    let htmlContent = $state(selectedTemplate.html_content);
    let cssContent = $state(selectedTemplate.css_content);
    let activeTab = $state("html");
    let showMockData = $state(false);

    const mockData = {
        clinic_name: "Dentistico Clinic",
        clinic_address: "123 Rue de la Santé, Paris",
        clinic_phone: "+33 1 23 45 67 89",
        doctor_name: "Mohamed",
        patient_name: "Test Patient",
        patient_age: 30,
        date: new Date().toLocaleDateString(),
        items: [
            {
                description: "Extraction dentaire",
                amount: 2500,
                tooth_number: "46",
            },
            {
                description: "Soins conservateurs",
                amount: 1500,
                tooth_number: "45",
            },
            { description: "Consultation", amount: 1000, tooth_number: null },
        ],
        total_amount: 5000,
        status: "paid",
        prescription_number: "ORD-2024-001",
        prescription_type: "Standard",
        notes: "Prendre les médicaments après les repas.",
    };

    let previewHtml = $state("");

    function updatePreview() {
        // Use a simple regex-based placeholder replacement for basic preview if Handlebars is not client-side
        // Or we can use a client-side Handlebars build
        try {
            // For now, let's just show the raw structure or try a simple replace
            let rendered = htmlContent;

            // Simple replacement for mock data keys
            Object.entries(mockData).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    // Very primitive list rendering for preview
                    const listRegex = new RegExp(
                        `{{#each ${key}}}(.*?){{\\/each}}`,
                        "gs",
                    );
                    rendered = rendered.replace(listRegex, (match, p1) => {
                        return value
                            .map((item) => {
                                let itemHtml = p1;
                                Object.entries(item).forEach(([ik, iv]) => {
                                    itemHtml = itemHtml.replace(
                                        new RegExp(`{{${ik}}}`, "g"),
                                        iv,
                                    );
                                });
                                return itemHtml;
                            })
                            .join("");
                    });
                } else {
                    rendered = rendered.replace(
                        new RegExp(`{{${key}}}`, "g"),
                        value,
                    );
                }
            });

            const styleOpen = "<" + "style" + ">";
            const styleClose = "<" + "/" + "style" + ">";

            previewHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    ${styleOpen}
                        body { margin: 0; padding: 20px; font-family: sans-serif; }
                        ${cssContent}
                    ${styleClose}
                </head>
                <body>
                    ${rendered}
                </body>
                </html>
            `;
        } catch (e) {
            console.error("Preview error:", e);
        }
    }

    $effect(() => {
        updatePreview();
    });

    let htmlEditorContainer: HTMLElement;
    let cssEditorContainer: HTMLElement;
    let htmlEditor: any;
    let cssEditor: any;

    onMount(async () => {
        // Dynamic import to avoid SSR issues and wait for npm
        try {
            const cm = await import("codemirror");
            const { html } = await import("@codemirror/lang-html");
            const { css } = await import("@codemirror/lang-css");
            const { oneDark: theme } = await import(
                "@codemirror/theme-one-dark"
            );
            const { EditorView, basicSetup } = cm;
            const { EditorState } = await import("@codemirror/state");

            const createEditor = (
                container: HTMLElement,
                doc: string,
                language: any,
            ) => {
                return new EditorView({
                    state: EditorState.create({
                        doc,
                        extensions: [
                            basicSetup,
                            language(),
                            theme,
                            EditorView.updateListener.of((v) => {
                                if (v.docChanged) {
                                    if (language === html)
                                        htmlContent = v.state.doc.toString();
                                    else cssContent = v.state.doc.toString();
                                }
                            }),
                        ],
                    }),
                    parent: container,
                });
            };

            htmlEditor = createEditor(htmlEditorContainer, htmlContent, html);
            cssEditor = createEditor(cssEditorContainer, cssContent, css);
        } catch (e) {
            console.error("CodeMirror load failed:", e);
        }
    });

    function selectTemplate(template: any) {
        selectedTemplate = template;
        htmlContent = template.html_content;
        cssContent = template.css_content;

        // Update editors
        if (htmlEditor) {
            htmlEditor.dispatch({
                changes: {
                    from: 0,
                    to: htmlEditor.state.doc.length,
                    insert: htmlContent,
                },
            });
        }
        if (cssEditor) {
            cssEditor.dispatch({
                changes: {
                    from: 0,
                    to: cssEditor.state.doc.length,
                    insert: cssContent,
                },
            });
        }
    }

    let isSaved = $state(false);
</script>

<div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
    <!-- Header -->
    <header
        class="h-16 border-b border-slate-800 flex items-center px-6 justify-between shrink-0 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50"
    >
        <div class="flex items-center gap-4">
            <a
                href="/admin"
                class="text-slate-400 hover:text-white transition-colors"
                >← Dashboard</a
            >
            <div class="h-4 w-px bg-slate-700"></div>
            <h1 class="text-lg font-black tracking-tight uppercase">
                Template Designer
            </h1>
        </div>

        <div class="flex items-center gap-3">
            <button
                class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all"
                onclick={() => (showMockData = !showMockData)}
            >
                {showMockData ? "Hide Data" : "View Mock Data"}
            </button>
            <form
                method="POST"
                action="?/saveTemplate"
                use:enhance={() => {
                    return async ({ result }) => {
                        if (result.type === "success") {
                            isSaved = true;
                            setTimeout(() => (isSaved = false), 2000);
                        }
                    };
                }}
            >
                <input
                    type="hidden"
                    name="name"
                    value={selectedTemplate.name}
                />
                <input type="hidden" name="html_content" value={htmlContent} />
                <input type="hidden" name="css_content" value={cssContent} />
                <button
                    type="submit"
                    class="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                >
                    {isSaved ? "✓ Saved" : "Save Template"}
                </button>
            </form>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar: Template List -->
        <aside
            class="w-64 border-r border-slate-800 flex flex-col shrink-0 bg-slate-900/30"
        >
            <div class="p-4 border-b border-slate-800">
                <span
                    class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
                    >Select Template</span
                >
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                {#each data.templates as template}
                    <button
                        class="w-full text-left px-4 py-3 rounded-xl transition-all {selectedTemplate.name ===
                        template.name
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'hover:bg-slate-800/50 text-slate-400 border border-transparent'}"
                        onclick={() => selectTemplate(template)}
                    >
                        <div class="font-bold text-sm">{template.name}</div>
                        <div class="text-[10px] opacity-50">
                            Last update: {new Date(
                                template.updated_at,
                            ).toLocaleDateString()}
                        </div>
                    </button>
                {/each}
                <button
                    class="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 border border-dashed border-slate-700 mt-4 transition-all"
                    onclick={() =>
                        selectTemplate({
                            name: "template_" + Date.now(),
                            html_content: "<h1>New Template</h1>",
                            css_content: "",
                        })}
                >
                    <span class="text-xs font-bold">+ New Template</span>
                </button>
            </div>

            <!-- Image Manager -->
            <div class="p-4 border-t border-slate-800 flex flex-col gap-4">
                <span
                    class="text-[10px] font-black text-slate-500 uppercase tracking-widest"
                    >Resources</span
                >
                <div class="grid grid-cols-4 gap-2">
                    {#each data.resources as resource}
                        <button
                            class="relative group aspect-square rounded-lg border border-slate-800 overflow-hidden hover:border-indigo-500 transition-all"
                            title={resource.filename}
                            onclick={() => {
                                navigator.clipboard.writeText(resource.path);
                                alert("URL copied to clipboard!");
                            }}
                        >
                            <img
                                src={resource.path}
                                alt=""
                                class="w-full h-full object-cover opacity-60 group-hover:opacity-100"
                            />
                            <div
                                class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/60 transition-opacity"
                            >
                                <span
                                    class="text-[8px] font-black uppercase text-white"
                                    >Copy URL</span
                                >
                            </div>
                        </button>
                    {/each}
                    <div
                        class="aspect-square relative flex items-center justify-center rounded-lg border-2 border-dashed border-slate-800 hover:border-slate-700 transition-all cursor-pointer overflow-hidden"
                    >
                        <form
                            method="POST"
                            action="?/uploadResource"
                            enctype="multipart/form-data"
                            use:enhance
                            class="absolute inset-0 opacity-0 cursor-pointer"
                        >
                            <input
                                type="file"
                                name="file"
                                onchange={(e) =>
                                    e.currentTarget.form?.requestSubmit()}
                                class="absolute inset-0 cursor-pointer"
                            />
                        </form>
                        <span class="text-xl">+</span>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Editor Area -->
        <main class="flex-1 flex flex-col overflow-hidden">
            <!-- Tabs -->
            <div
                class="h-10 bg-slate-950/50 flex items-center px-4 border-b border-slate-800 gap-4"
            >
                <button
                    class="text-[10px] font-black uppercase tracking-widest transition-all {activeTab ===
                    'html'
                        ? 'text-indigo-400 border-b-2 border-indigo-500 h-full'
                        : 'text-slate-500 hover:text-slate-300'}"
                    onclick={() => (activeTab = "html")}
                >
                    HTML Structure
                </button>
                <button
                    class="text-[10px] font-black uppercase tracking-widest transition-all {activeTab ===
                    'css'
                        ? 'text-indigo-400 border-b-2 border-indigo-500 h-full'
                        : 'text-slate-500 hover:text-slate-300'}"
                    onclick={() => (activeTab = "css")}
                >
                    CSS Styling
                </button>
            </div>

            <!-- Editors -->
            <div class="flex-1 relative overflow-hidden flex bg-slate-950">
                <div
                    class="absolute inset-0 transition-opacity duration-300 flex flex-col {activeTab ===
                    'html'
                        ? 'opacity-100'
                        : 'opacity-0 pointer-events-none'}"
                    bind:this={htmlEditorContainer}
                ></div>
                <div
                    class="absolute inset-0 transition-opacity duration-300 flex flex-col {activeTab ===
                    'css'
                        ? 'opacity-100'
                        : 'opacity-0 pointer-events-none'}"
                    bind:this={cssEditorContainer}
                ></div>
            </div>
        </main>

        <!-- Preview Area -->
        <div
            class="w-[500px] border-l border-slate-800 flex flex-col bg-slate-100 shrink-0 shadow-2xl z-10"
        >
            <div
                class="h-10 bg-white border-b border-slate-200 flex items-center px-4 justify-between"
            >
                <span
                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                    >Live Preview (Mock Data)</span
                >
                <div class="flex gap-1">
                    <div class="w-2 h-2 rounded-full bg-slate-200"></div>
                    <div class="w-2 h-2 rounded-full bg-slate-200"></div>
                    <div class="w-2 h-2 rounded-full bg-slate-200"></div>
                </div>
            </div>

            <div
                class="flex-1 bg-slate-500 p-8 overflow-y-auto flex flex-col items-center"
            >
                <div
                    class="bg-white shadow-2xl w-full aspect-[1/1.414] min-h-[600px] origin-top scale-[0.85] rounded-sm overflow-hidden"
                >
                    <iframe
                        title="Preview"
                        srcdoc={previewHtml}
                        class="w-full h-full border-none shadow-inner"
                    ></iframe>
                </div>
            </div>
        </div>
    </div>

    {#if showMockData}
        <div
            class="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-sm"
            onclick={() => (showMockData = false)}
        >
            <div
                class="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                onclick={(e) => e.stopPropagation()}
            >
                <div
                    class="p-6 border-b border-slate-800 flex justify-between items-center"
                >
                    <h2 class="text-xl font-black uppercase tracking-tight">
                        Available Variables
                    </h2>
                    <button
                        class="text-slate-400 hover:text-white"
                        onclick={() => (showMockData = false)}>✕</button
                    >
                </div>
                <div
                    class="flex-1 overflow-y-auto p-6 font-mono text-xs text-indigo-400 bg-slate-950"
                >
                    <pre>{JSON.stringify(mockData, null, 2)}</pre>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    :global(.cm-editor) {
        height: 100%;
        font-size: 13px;
        font-family: "JetBrains Mono", "Fira Code", monospace;
    }

    :global(.cm-scroller) {
        overflow: auto;
    }

    /* Hide horizontal scrollbar on basic editors */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
    }
</style>
