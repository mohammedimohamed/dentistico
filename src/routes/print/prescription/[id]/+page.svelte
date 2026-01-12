<script lang="ts">
    import { onMount } from "svelte";
    import QRCode from "qrcode";
    let { data } = $props();

    function calculateAge(dob: string) {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    const age = $derived(calculateAge(data.prescription.patient_dob));
    const itemsCount = data.prescription.items.length;

    // Auto-Scaling Mode Logic
    const scalingMode = $derived(
        itemsCount > 7
            ? "ultra-compact"
            : itemsCount > 4
              ? "compact"
              : "normal",
    );

    // Payload: idDoctor_idPatient_Date_PrescriptionNumber
    const qrPayload = $derived(
        `${data.prescription.doctor_id}_${data.prescription.patient_id}_${data.prescription.prescription_date}_${data.prescription.prescription_number}`,
    );

    let qrDataUrl = $state("");

    $effect(() => {
        QRCode.toDataURL(qrPayload, { margin: 1, width: 200 }, (err, url) => {
            if (!err) qrDataUrl = url;
        });
    });

    onMount(() => {
        // Automatically open print dialog
        // window.print();
    });
</script>

<svelte:head>
    <title>Ordonnance - {data.prescription.patient_name}</title>
</svelte:head>

<!-- Add dir="auto" to main container to handle Arabic clinic/patient names automatically -->
<div
    dir="auto"
    class="print-container bg-white min-h-screen max-w-4xl mx-auto text-gray-900 font-sans relative scaling-{scalingMode}"
>
    <!-- Main content wrapper for flex-grow logic -->
    <div class="print-content flex flex-col">
        <!-- Header: Based on the provided image architecture -->
        <div
            class="header-grid grid grid-cols-2 sm:grid-cols-3 gap-4 items-start border-b-2 border-indigo-900/10"
        >
            <!-- Doctor Info (Left) -->
            <div class="text-start">
                <h2
                    class="doctor-name font-black text-indigo-950 uppercase tracking-tight"
                >
                    Dr. {data.prescription.doctor_name
                        .toUpperCase()
                        .startsWith("DR.")
                        ? data.prescription.doctor_name.substring(3).trim()
                        : data.prescription.doctor_name}
                </h2>
                <div
                    class="doctor-specialties text-indigo-900/70 font-bold whitespace-pre-line mt-1 leading-relaxed"
                >
                    {data.prescription.doctor_specialties ||
                        "Chirurgien-Dentiste\nConsultations Générales"}
                </div>
            </div>

            <!-- Center: Branding -->
            <div
                class="hidden sm:flex flex-col items-center justify-center pt-1"
            >
                {#if data.config?.logo_url}
                    <img
                        src={data.config.logo_url}
                        alt="Logo"
                        class="branding-logo h-auto mb-1"
                    />
                {:else if data.config?.logo_data}
                    <img
                        src={data.config.logo_data}
                        alt="Logo"
                        class="branding-logo h-auto mb-1"
                    />
                {:else}
                    <div
                        class="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center mb-1 border border-indigo-100 shadow-inner"
                    >
                        <span class="text-xl"></span>
                    </div>
                {/if}
                <h1
                    class="clinic-name font-black text-indigo-900 uppercase tracking-[0.2em]"
                >
                    {data.config?.clinicName || "DENTISTICO"}
                </h1>
                <div class="branding-bar h-0.5 bg-indigo-500 mt-1"></div>
            </div>

            <!-- QR Code & metadata (Right) -->
            <div class="flex flex-col items-end">
                <div
                    class="text-[8px] font-black text-indigo-900/40 uppercase tracking-widest mb-1"
                >
                    Authentification QR
                </div>
                {#if qrDataUrl}
                    <img
                        src={qrDataUrl}
                        alt="Verification QR"
                        class="qr-code border border-gray-100 p-1 bg-white shadow-sm"
                    />
                {/if}
            </div>
        </div>

        <!-- Document Info Bar -->
        <div
            class="doc-info flex justify-between items-center bg-indigo-50/50 rounded-lg border border-indigo-100"
        >
            <div class="flex gap-6">
                <div>
                    <span
                        class="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest"
                        >Date</span
                    >
                    <span class="info-text font-black text-indigo-950">
                        {new Date(
                            data.prescription.prescription_date,
                        ).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                        })}
                    </span>
                </div>
                <div>
                    <span
                        class="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest"
                        >Type</span
                    >
                    <span class="info-text font-black text-indigo-950"
                        >{data.prescription.prescription_type}</span
                    >
                </div>
            </div>
            <div class="text-end">
                <span
                    class="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest"
                    >Nº Ordonnance</span
                >
                <span class="info-text font-black text-indigo-950"
                    >{data.prescription.prescription_number}</span
                >
            </div>
        </div>

        <!-- Patient Section -->
        <div class="patient-section border-l-4 border-indigo-600 pl-4 py-1">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span
                        class="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-1"
                        >Nom & Prénom / الاسم</span
                    >
                    <h3 class="patient-name font-black text-indigo-950">
                        {data.prescription.patient_name}
                    </h3>
                </div>
                <div class="text-end">
                    <span
                        class="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-1"
                        >Age</span
                    >
                    <h3 class="patient-age font-black text-indigo-950">
                        {age} Ans
                    </h3>
                </div>
            </div>
        </div>

        <!-- Body: Prescriptions -->
        <div class="med-body flex-grow overflow-hidden">
            {#each data.prescription.items as item, i}
                <div class="med-item relative group">
                    <div
                        class="flex justify-between items-baseline border-b border-gray-100 pb-1"
                    >
                        <div class="flex items-center gap-3">
                            <span
                                class="med-index font-black text-indigo-600/30"
                                >#{i + 1}</span
                            >
                            <h4
                                class="med-title font-black text-gray-900 uppercase"
                            >
                                {item.medication_name}
                            </h4>
                        </div>
                        {#if item.dosage}
                            <span class="med-dosage font-black text-indigo-900"
                                >{item.dosage}</span
                            >
                        {/if}
                    </div>
                    <div
                        class="med-instructions text-gray-700 leading-snug pl-10"
                    >
                        <p class="font-medium">
                            {item.instructions || ""}
                        </p>
                        {#if item.duration}
                            <p
                                class="duration-badge inline-flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded text-gray-600 border border-gray-100"
                            >
                                Pendant {item.duration}
                            </p>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        <!-- Signature Area -->
        <div
            class="signature-area flex justify-between items-end border-t-2 border-indigo-900/10"
        >
            <div>
                {#if data.prescription.notes}
                    <div
                        class="notes-box max-w-xs bg-amber-50/30 rounded-lg border border-amber-100/50"
                    >
                        <span
                            class="block text-[7px] font-bold text-amber-600 uppercase tracking-widest mb-1"
                            >Note</span
                        >
                        <p
                            class="notes-text text-gray-700 italic leading-relaxed"
                        >
                            {data.prescription.notes}
                        </p>
                    </div>
                {/if}
            </div>
            <div class="flex flex-col items-center">
                <div
                    class="signature-box border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-end bg-gray-50/30"
                >
                    <span
                        class="text-[7px] font-bold text-gray-400 uppercase tracking-widest"
                        >Signature</span
                    >
                </div>
                <p
                    class="sig-doctor font-black text-indigo-900 uppercase tracking-widest"
                >
                    Dr. {data.prescription.doctor_name}
                </p>
            </div>
        </div>
    </div>

    <div class="print-footer text-center bg-indigo-950 text-white rounded-none">
        <div
            class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[7px] font-bold uppercase tracking-widest w-full"
        >
            <div class="flex items-center justify-start gap-1 sm:gap-2">
                <svg
                    class="w-2 h-2 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
                <span class="text-start truncate"
                    >{data.config?.address ||
                        "123 Rue de la Santé, 75000 Paris"}</span
                >
            </div>
            <div
                class="flex items-center justify-center gap-1 sm:gap-2 sm:border-x sm:border-white/10"
            >
                <svg
                    class="w-2 h-2 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                </svg>
                <span>{data.config?.phone || "+33 1 23 45 67 89"}</span>
            </div>
            <div class="flex items-center justify-end gap-1 sm:gap-2">
                <svg
                    class="w-2 h-2 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                </svg>
                <span class="truncate"
                    >{data.config?.email || "contact@clinic.com"}</span
                >
            </div>
        </div>
    </div>

    <!-- Print Button (Visible only on screen) -->
    <div
        class="fixed bottom-8 right-8 no-print z-50 flex flex-col items-end gap-2"
    >
        <div
            class="px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
        >
            <span
                class="w-2 h-2 rounded-full {scalingMode === 'ultra-compact'
                    ? 'bg-red-500'
                    : scalingMode === 'compact'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'}"
            ></span>
            Mode: {scalingMode === "ultra-compact"
                ? "Ultra-Compact"
                : scalingMode === "compact"
                  ? "Compact"
                  : "Normal"}
        </div>
        <button
            onclick={() => window.print()}
            class="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 font-black uppercase text-xs tracking-widest"
        >
            <svg
                class="h-4 w-4"
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
            Imprimer (A5)
        </button>
    </div>
</div>

<style>
    :root {
        --header-spacing: 1.5rem;
        --doc-info-spacing: 1.25rem;
        --patient-spacing: 1.25rem;
        --med-spacing: 1.25rem;
        --signature-top: 1rem;
        --footer-height: 20mm;

        --doctor-name-size: 1.25rem;
        --doctor-spec-size: 0.65rem;
        --clinic-name-size: 0.75rem;
        --logo-height: 4.5rem;
        --qr-size: 4rem;

        --info-text-size: 0.8rem;
        --patient-name-size: 1.25rem;

        --med-title-size: 1.2rem;
        --med-instr-size: 0.9rem;
        --med-badge-size: 0.65rem;
        --med-index-size: 1rem;

        --signature-box-w: 12rem;
        --signature-box-h: 5rem;
    }

    .scaling-compact {
        --header-spacing: 1rem;
        --doc-info-spacing: 0.75rem;
        --patient-spacing: 0.75rem;
        --med-spacing: 0.75rem;
        --signature-top: 0.75rem;
        --footer-height: 18mm;

        --med-title-size: 1rem;
        --med-instr-size: 0.8rem;
        --patient-name-size: 1.1rem;
        --logo-height: 2.5rem;
        --doctor-name-size: 1.1rem;
    }

    .scaling-ultra-compact {
        --header-spacing: 0.5rem;
        --doc-info-spacing: 0.5rem;
        --patient-spacing: 0.5rem;
        --med-spacing: 0.4rem;
        --signature-top: 0.5rem;
        --footer-height: 15mm;

        --med-title-size: 0.85rem;
        --med-instr-size: 0.65rem;
        --med-index-size: 0.7rem;
        --patient-name-size: 0.85rem;
        --logo-height: 1.8rem;
        --qr-size: 2.5rem;
        --signature-box-w: 8rem;
        --signature-box-h: 3rem;
        --doctor-name-size: 0.9rem;
    }

    /* A5 Optimization - Exact physical dimensions */
    @page {
        size: 148mm 210mm;
        margin: 5mm;
    }

    @media print {
        .no-print {
            display: none !important;
        }
        body {
            background: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .print-container {
            width: 100%;
            height: 200mm; /* Full page minus @page margins (210 - 5 - 5) */
            max-height: 200mm;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        }
    }

    /* Variable Mappings */
    .print-container {
        padding: 5mm;
    }
    .header-grid {
        margin-bottom: var(--header-spacing);
        padding-bottom: calc(var(--header-spacing) / 2);
    }
    .doctor-name {
        font-size: var(--doctor-name-size);
    }
    .doctor-specialties {
        font-size: var(--doctor-spec-size);
    }
    .branding-logo {
        height: var(--logo-height);
    }
    .clinic-name {
        font-size: var(--clinic-name-size);
    }
    .branding-bar {
        width: calc(var(--logo-height) * 0.6);
    }
    .qr-code {
        width: var(--qr-size);
        height: var(--qr-size);
    }

    .doc-info {
        margin-bottom: var(--doc-info-spacing);
        padding: calc(var(--doc-info-spacing) / 2.5);
    }
    .info-text {
        font-size: var(--info-text-size);
    }

    .patient-section {
        margin-bottom: var(--patient-spacing);
    }
    .patient-name,
    .patient-age {
        font-size: var(--patient-name-size);
    }

    .med-body {
        space-y: var(--med-spacing);
    }
    .med-item {
        margin-bottom: var(--med-spacing);
    }
    .med-title,
    .med-dosage {
        font-size: var(--med-title-size);
    }
    .med-index {
        font-size: var(--med-index-size);
    }
    .med-instructions p {
        font-size: var(--med-instr-size);
    }
    .duration-badge {
        font-size: var(--med-badge-size);
    }

    .signature-area {
        margin-top: var(--signature-top);
        padding-top: calc(var(--signature-top) / 1.5);
    }
    .signature-box {
        width: var(--signature-box-w);
        height: var(--signature-box-h);
    }
    .sig-doctor {
        font-size: calc(var(--med-badge-size) * 1.2);
    }
    .notes-box {
        padding: calc(var(--med-spacing) / 1.5);
    }
    .notes-text {
        font-size: var(--med-instr-size);
    }

    .print-footer {
        height: var(--footer-height);
        margin-top: auto;
        padding: 0 1rem;
        display: flex;
        align-items: center;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
    }

    /* RTL Support */
    :global([dir="rtl"]) .text-start {
        text-align: right;
    }
    :global([dir="rtl"]) .text-end {
        text-align: left;
    }
    :global([dir="rtl"]) .border-l-4 {
        border-left-width: 0;
        border-right-width: 4px;
        padding-left: 0;
        padding-right: 1rem;
    }
    :global([dir="rtl"]) .pl-10 {
        padding-left: 0;
        padding-right: 2.5rem;
    }
    :global([dir="rtl"]) .pl-4 {
        padding-left: 0;
        padding-right: 1rem;
    }
    :global([dir="rtl"]) .sm\:gap-2 {
        gap: 0.5rem;
    }

    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+Arabic:wght@400;700;900&display=swap");

    :global(body) {
        font-family: "Inter", "Noto Sans Arabic", sans-serif;
        background-color: #f8fafc;
    }
</style>
