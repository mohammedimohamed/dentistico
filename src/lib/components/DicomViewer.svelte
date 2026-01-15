<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { App, AppOptions, ViewConfig } from "dwv";

    interface Props {
        fileUrl: string;
        fileName: string;
        onClose: () => void;
    }

    let { fileUrl, fileName, onClose }: Props = $props();

    // Plain variable - NOT a $state to avoid Svelte 5 proxy interference
    let dwvApp: App | null = null;
    let container: HTMLDivElement;

    // UI state using $state for reactivity
    let loading = $state(true);
    let error = $state<string | null>(null);
    let metadata = $state({
        studyDate: "N/A",
        modality: "N/A",
        patientName: "N/A",
    });
    let currentTool = $state("WindowLevel");

    onMount(async () => {
        // Wait for DOM to be fully rendered and sized
        await tick();

        // Additional small delay to ensure browser has calculated layout
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Configure local decoder scripts paths (served from /static)
        // These are the worker files for decoding compressed DICOM images
        const decoderBasePath = "/lib/dwv/decoders";

        try {
            // Create a plain instance - not tracked by Svelte reactivity
            const app = new App();

            // Override the getDecoderScripts method on the prototype or instance
            // This tells dwv where to find the decoder worker scripts
            (app as any).getDecoderScripts = () => ({
                jpeg2000: `${decoderBasePath}/jpeg2000.worker.min.js`,
                "jpeg-lossless": `${decoderBasePath}/jpegloss.worker.min.js`,
                "jpeg-baseline": `${decoderBasePath}/jpegbaseline.worker.min.js`,
                rle: `${decoderBasePath}/rle.worker.min.js`,
            });

            // Define view config - the container div ID
            const viewConfig = new ViewConfig("dwv-container");
            const options = new AppOptions();
            options.dataViewConfigs = { "*": [viewConfig] };

            // Configure available tools
            options.tools = {
                WindowLevel: {} as any,
                ZoomAndPan: {} as any,
                Scroll: {} as any,
            };

            // Initialize the dwv app
            app.init(options);

            // Assign to component-level variable after init
            dwvApp = app;

            // Set default tool
            dwvApp.setTool("WindowLevel");

            // Event: Load started
            dwvApp.addEventListener("loadstart", () => {
                console.log("[DWV] Load started");
            });

            // Event: Load progress
            dwvApp.addEventListener("loadprogress", (event: any) => {
                console.log(
                    `[DWV] Progress: ${Math.round((event.loaded / event.total) * 100)}%`,
                );
            });

            // Event: Load completed successfully
            dwvApp.addEventListener("load", () => {
                console.log("[DWV] Load complete");
                loading = false;

                // Extract metadata
                try {
                    const ids = dwvApp?.getDataIds();
                    if (ids && ids.length > 0) {
                        const data = dwvApp?.getMetaData(ids[0]);
                        if (data) {
                            // DICOM tags: StudyDate=00080020, Modality=00080060, PatientName=00100010
                            metadata = {
                                studyDate:
                                    (data["00080020"] as any)?.value?.[0] ||
                                    "N/A",
                                modality:
                                    (data["00080060"] as any)?.value?.[0] ||
                                    "N/A",
                                patientName:
                                    (data["00100010"] as any)?.value?.[0]
                                        ?.Alphabetic ||
                                    (data["00100010"] as any)?.value?.[0] ||
                                    "N/A",
                            };
                        }
                    }
                } catch (metaErr) {
                    console.warn("[DWV] Could not extract metadata:", metaErr);
                }
            });

            // Event: Load error
            dwvApp.addEventListener("error", (event: any) => {
                console.error("[DWV] Load error:", event);
                loading = false;
                const errorMsg =
                    event.error?.message || event.error || "Unknown error";
                error = `Failed to load DICOM: ${errorMsg}`;
            });

            // Build absolute URL for the DICOM file
            const absoluteUrl = fileUrl.startsWith("http")
                ? fileUrl
                : window.location.origin + fileUrl;

            console.log("[DWV] Loading URL:", absoluteUrl);

            // Load the DICOM file
            dwvApp.loadURLs([absoluteUrl]);
        } catch (err: any) {
            console.error("[DWV] Critical initialization error:", err);
            error = `Could not initialize viewer: ${err.message || err}`;
            loading = false;
        }
    });

    onDestroy(() => {
        if (dwvApp) {
            try {
                dwvApp.reset();
            } catch (e) {
                // Ignore cleanup errors
            }
            dwvApp = null;
        }
    });

    function setTool(tool: string) {
        currentTool = tool;
        dwvApp?.setTool(tool);
    }

    function resetView() {
        dwvApp?.resetZoomPan();
    }
</script>

<div class="dicom-viewer-overlay">
    <!-- Header -->
    <div class="dicom-header">
        <div class="header-left">
            <button onclick={onClose} class="close-btn" title="Close">
                <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                </svg>
            </button>
            <div class="header-info">
                <h2 class="file-name">{fileName}</h2>
                <div class="metadata-row">
                    <span>DATE: {metadata.studyDate}</span>
                    <span>MODALITY: {metadata.modality}</span>
                    <span>PATIENT: {metadata.patientName}</span>
                </div>
            </div>
        </div>

        <div class="toolbar">
            <button
                onclick={() => setTool("WindowLevel")}
                class="tool-btn {currentTool === 'WindowLevel' ? 'active' : ''}"
            >
                ✨ Levels
            </button>
            <button
                onclick={() => setTool("ZoomAndPan")}
                class="tool-btn {currentTool === 'ZoomAndPan' ? 'active' : ''}"
            >
                🔍 Zoom/Pan
            </button>
            <button onclick={resetView} class="tool-btn"> 🔄 Reset </button>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="dicom-content">
        {#if loading}
            <div class="loading-overlay">
                <div class="spinner"></div>
                <p class="loading-text">Processing Medical Imaging...</p>
            </div>
        {/if}

        {#if error}
            <div class="error-panel">
                <div class="error-icon">⚠️</div>
                <h3 class="error-title">Error Loading Image</h3>
                <p class="error-message">{error}</p>
                <div class="error-actions">
                    <a href={fileUrl} download class="download-btn">
                        Download Raw File
                    </a>
                    <button onclick={onClose} class="cancel-btn">
                        Cancel
                    </button>
                </div>
            </div>
        {/if}

        <!-- DWV Container - MUST have explicit dimensions -->
        <div
            id="dwv-container"
            class="dwv-container {loading || error ? 'hidden' : ''}"
            style="width: 100%; height: 600px; min-height: 600px; display: block;"
            bind:this={container}
        ></div>
    </div>

    <!-- Instructions Footer -->
    {#if !loading && !error}
        <div class="instructions">
            {#if currentTool === "WindowLevel"}
                DRAG to adjust level (brightness) and window (contrast)
            {:else if currentTool === "ZoomAndPan"}
                DRAG to move • SCROLL to zoom
            {/if}
        </div>
    {/if}
</div>

<style>
    .dicom-viewer-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(0, 0, 0, 0.98);
        display: flex;
        flex-direction: column;
        font-family: "Inter", system-ui, sans-serif;
    }

    .dicom-header {
        padding: 1rem;
        background: #111;
        border-bottom: 1px solid #333;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .close-btn {
        padding: 0.5rem;
        background: transparent;
        border: none;
        border-radius: 0.5rem;
        color: #888;
        cursor: pointer;
        transition: all 0.2s;
    }
    .close-btn:hover {
        background: #222;
        color: white;
    }

    .header-info {
        text-align: left;
    }
    .file-name {
        color: white;
        font-weight: 700;
        font-size: 1.1rem;
        margin: 0;
    }
    .metadata-row {
        display: flex;
        gap: 1rem;
        font-size: 10px;
        color: #666;
        font-family: monospace;
        margin-top: 0.25rem;
    }

    .toolbar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .tool-btn {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        background: transparent;
        color: #888;
    }
    .tool-btn:hover {
        background: #222;
        color: white;
    }
    .tool-btn.active {
        background: #4f46e5;
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }

    .dicom-content {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 600px;
        background: #000;
    }

    .loading-overlay {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        position: absolute;
        z-index: 10;
    }
    .spinner {
        width: 48px;
        height: 48px;
        border: 4px solid rgba(79, 70, 229, 0.3);
        border-top-color: #4f46e5;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
    .loading-text {
        color: #818cf8;
        font-weight: 600;
        font-size: 0.875rem;
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    .error-panel {
        max-width: 400px;
        padding: 2rem;
        background: #1a1a1a;
        border-radius: 1.5rem;
        border: 1px solid #333;
        text-align: center;
    }
    .error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    .error-title {
        color: white;
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
    }
    .error-message {
        color: #888;
        font-size: 0.875rem;
        margin: 0 0 1.5rem;
    }
    .error-actions {
        display: flex;
        gap: 0.75rem;
    }
    .download-btn {
        flex: 1;
        padding: 0.75rem 1rem;
        background: #4f46e5;
        color: white;
        border-radius: 0.75rem;
        font-weight: 600;
        text-decoration: none;
        text-align: center;
        transition: background 0.2s;
    }
    .download-btn:hover {
        background: #4338ca;
    }
    .cancel-btn {
        flex: 1;
        padding: 0.75rem 1rem;
        background: #333;
        color: #ccc;
        border: none;
        border-radius: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }
    .cancel-btn:hover {
        background: #444;
    }

    /* DWV Container - CRITICAL: Must have explicit dimensions */
    .dwv-container {
        width: 100%;
        height: 100%;
        min-height: 500px;
        position: absolute;
        inset: 0;
        background: #000;
    }
    .dwv-container.hidden {
        visibility: hidden;
    }

    /* DWV internal layer styling */
    :global(#dwv-container .layerGroup) {
        width: 100% !important;
        height: 100% !important;
        position: absolute !important;
        inset: 0 !important;
    }
    :global(#dwv-container .layer) {
        width: 100% !important;
        height: 100% !important;
    }
    :global(#dwv-container canvas) {
        display: block;
        max-width: 100%;
        max-height: 100%;
        margin: auto;
    }

    .instructions {
        padding: 0.75rem;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        text-align: center;
        font-size: 10px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 600;
        flex-shrink: 0;
    }
</style>
