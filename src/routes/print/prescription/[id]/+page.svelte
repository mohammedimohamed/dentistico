<script lang="ts">
    import { onMount } from "svelte";
    let { data } = $props();

    onMount(() => {
        // Automatically open print dialog
        // window.print();
    });
</script>

<svelte:head>
    <title>Ordonnance - {data.prescription.patient_name}</title>
</svelte:head>

<div
    class="print-container bg-white min-h-screen p-8 sm:p-12 max-w-4xl mx-auto text-gray-900 font-serif"
>
    <!-- Header -->
    <div
        class="flex justify-between items-start border-bottom pb-8 mb-8 border-b-2 border-gray-100"
    >
        <div>
            <h1
                class="text-2xl font-bold uppercase tracking-widest text-indigo-900 mb-1"
            >
                {data.config?.clinicName || "DENTISTICO"}
            </h1>
            <p class="text-sm text-gray-600">Cabinet Dentaire Professionnel</p>
            <p class="text-xs text-gray-500 mt-2">
                123 Rue de la Santé, 75000 Paris
            </p>
            <p class="text-xs text-gray-500">Tél: 01 23 45 67 89</p>
        </div>
        <div class="text-right">
            <h2 class="text-lg font-bold">{data.prescription.doctor_name}</h2>
            <p class="text-sm text-gray-600">Chirurgien-Dentiste</p>
            <p class="text-xs text-gray-500 mt-4">
                Paris, le {new Date(
                    data.prescription.prescription_date,
                ).toLocaleDateString()}
            </p>
        </div>
    </div>

    <!-- Patient Info -->
    <div class="mb-12">
        <p class="text-sm text-gray-500 mb-1 uppercase tracking-tighter">
            Ordonnance pour :
        </p>
        <h3 class="text-xl font-bold">{data.prescription.patient_name}</h3>
        <p class="text-sm text-gray-600">
            {data.prescription.patient_address || ""}
        </p>
    </div>

    <!-- Prescriptions -->
    <div class="space-y-8 min-h-[400px]">
        {#each data.prescription.items as item}
            <div class="border-l-4 border-gray-200 pl-6">
                <div class="flex justify-between">
                    <h4 class="text-lg font-bold uppercase">
                        {item.medication_name}
                    </h4>
                    {#if item.dosage}
                        <span class="text-base font-medium">{item.dosage}</span>
                    {/if}
                </div>
                <div class="mt-2 text-gray-700 italic">
                    {item.instructions || ""}
                    {#if item.duration}
                        <span class="block mt-1 font-semibold"
                            >Pendant {item.duration}</span
                        >
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    <!-- Footer / Signature -->
    <div
        class="mt-12 flex justify-between items-end border-t border-gray-100 pt-8"
    >
        <div>
            {#if data.prescription.notes}
                <p class="text-sm text-gray-500 italic max-w-sm">
                    <span class="font-bold not-italic">Note :</span>
                    {data.prescription.notes}
                </p>
            {/if}
        </div>
        <div class="text-center w-64 pb-12">
            <p class="text-sm font-bold border-b border-gray-300 pb-2 mb-12">
                Signature & Tampon
            </p>
        </div>
    </div>

    <div class="mt-12 text-center text-[10px] text-gray-400 no-print">
        Ceci est un document médical confidentiel généré par {data.config
            ?.clinicName || "Dentistico"}.
    </div>

    <!-- Print Button (Visible only on screen) -->
    <div class="fixed bottom-8 right-8 no-print">
        <button
            onclick={() => window.print()}
            class="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 flex items-center gap-2"
        >
            <svg
                class="h-5 v-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 012-2H5a2 2 0 012 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
            </svg>
            Imprimer l'ordonnance
        </button>
    </div>
</div>

<style>
    @media print {
        .no-print {
            display: none !important;
        }
        body {
            background: white !important;
            margin: 0;
            padding: 0;
        }
        .print-container {
            width: 100%;
            max-width: none;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
        }
    }

    /* Ensure font loads for print */
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap");

    :global(body) {
        font-family: "Inter", sans-serif;
    }
</style>
