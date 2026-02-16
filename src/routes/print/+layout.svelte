<script lang="ts">
    import "../../app.css";
</script>

<div class="print-layout min-h-screen bg-white">
    <!-- Floating Toolbar (Visible only on screen) -->
    <div class="fixed top-4 right-4 flex gap-2 no-print z-50">
        <button
            onclick={() => window.print()}
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 font-bold flex items-center gap-2 transition-all active:scale-95"
        >
            🖨️ Print
        </button>
        <button
            onclick={() => window.close()}
            class="px-4 py-2 bg-gray-600 text-white rounded-lg shadow-lg hover:bg-gray-700 font-bold flex items-center gap-2 transition-all active:scale-95"
        >
            ❌ Close
        </button>
    </div>

    <slot />
</div>

<style>
    /* Reset and A4 Setup */
    @page {
        size: A4;
        margin: 0;
    }

    :global(body) {
        margin: 0;
        padding: 0;
        background-color: white !important;
    }

    .print-layout {
        width: 210mm;
        margin: 0 auto;
        background: white;
    }

    @media print {
        .no-print {
            display: none !important;
        }

        :global(body) {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .print-layout {
            width: 100%;
            margin: 0;
            box-shadow: none;
        }
    }

    /* Using Robust System Font Stack for 100% Offline Capability */
    :global(html) {
        font-family:
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            "Helvetica Neue",
            Arial,
            "Noto Sans",
            sans-serif,
            "Apple Color Emoji",
            "Segoe UI Emoji",
            "Segoe UI Symbol",
            "Noto Color Emoji";
    }
</style>
