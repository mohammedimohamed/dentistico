<script lang="ts">
    import { enhance } from "$app/forms";
    import { invalidateAll, beforeNavigate } from "$app/navigation";
    import { t } from "svelte-i18n";
    import { onMount } from "svelte";
    import { fade, slide, scale } from "svelte/transition";
    import DentalChart from "$lib/components/dental/DentalChart.svelte";
    import { calculateAge } from "$lib/dental/tooth-data";
    import { quintOut } from "svelte/easing";
    import SmartDateTimePicker from "$lib/components/SmartDateTimePicker.svelte";

    import ResponsiveShield from "$lib/components/common/ResponsiveShield.svelte";

    let { data } = $props();

    let chart: any = $state();
    let showNotesModal = $state(false);
    let clinicalNote = $state("");
    let noteImportance = $state("low");

    let showRescheduleModal = $state(false);
    let rescheduleDate = $state("");
    let rescheduleTime = $state("");

    let isPaymentModalOpen = $state(false);
    let showPrescriptionModal = $state(false);
    let errorMessage = $state("");

    // Prescription State
    let currentPrescriptionItems = $state<any[]>([]);
    let prescriptionNotes = $state("");
    let prescriptionType = $state("Standard");
    let selectedMedicationId = $state<string | null>(null);
    let medDosage = $state("");
    let medDuration = $state("");
    let medInstructions = $state("");
    let showSaveTemplateModal = $state(false);
    let templateName = $state("");

    $effect(() => {
        if (selectedMedicationId) {
            const med = (data.medications as any[]).find(
                (m) => m.id === Number(selectedMedicationId),
            );
            if (med) {
                if (!medDosage) medDosage = med.default_dosage || "";
                if (!medInstructions) medInstructions = med.instructions || "";
            }
        }
    });

    function addMedicationToPrescription() {
        const med = (data.medications as any[]).find(
            (m) => m.id === Number(selectedMedicationId),
        );
        if (med) {
            currentPrescriptionItems = [
                ...currentPrescriptionItems,
                {
                    medication_id: med.id,
                    medication_name: med.name,
                    dosage: medDosage || med.default_dosage || "",
                    duration: medDuration || "",
                    instructions: medInstructions || med.instructions || "",
                },
            ];
            medDosage = "";
            medDuration = "";
            medInstructions = "";
            selectedMedicationId = null;
        }
    }

    function removeMedicationFromPrescription(index: number) {
        currentPrescriptionItems = currentPrescriptionItems.filter(
            (_, i) => i !== index,
        );
    }

    function useTemplate(template: any) {
        currentPrescriptionItems = template.items.map((item: any) => ({
            ...item,
        }));
        if (!prescriptionNotes) {
            prescriptionNotes = template.description || "";
        }
    }

    let isInvoiceModalOpen = $state(false);
    let invoiceSelection = $state<string[]>([]);
    let invoiceType = $state<"detailed" | "global">("detailed");
    let invoiceGlobalDescription = $state("Soins et Traitements Dentaires");
    let invoiceShake = $state(false);

    function handleGenerateInvoice(e: Event) {
        if (invoiceSelection.length === 0) {
            e.preventDefault();
            invoiceShake = true;
            setTimeout(() => (invoiceShake = false), 500);
            return;
        }
    }

    function toggleTreatmentForInvoice(id: string) {
        if (invoiceSelection.includes(id)) {
            invoiceSelection = invoiceSelection.filter((i) => i !== id);
        } else {
            invoiceSelection = [...invoiceSelection, id];
        }
    }

    function selectAllTreatments() {
        if (data.uninvoicedTreatments) {
            invoiceSelection = data.uninvoicedTreatments.map(
                (t: any) => t.unique_id,
            );
        }
    }

    const invoiceTotal = $derived.by(() => {
        if (!data.uninvoicedTreatments) return 0;
        return (data.uninvoicedTreatments as any[])
            .filter((t: any) => invoiceSelection.includes(t.unique_id))
            .reduce((sum: number, t: any) => sum + t.amount, 0);
    });

    async function printInvoice(id: number) {
        try {
            const res = await fetch(`/api/invoices/${id}`);
            if (!res.ok) throw new Error("Failed to load invoice");
            const invoice = await res.json();

            const printWindow = window.open(
                "",
                "_blank",
                "width=800,height=900",
            );
            if (!printWindow) return;

            const itemsHtml =
                invoice.invoice_type === "global"
                    ? `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; color: #1f2937;">${invoice.global_description || "Soins et Traitements Dentaires"}</td>
                    <td style="padding: 10px; text-align: right; color: #111827; font-weight: bold;">${invoice.total_amount.toFixed(2)} ${data.config?.currencySymbol || "DH"}</td>
                </tr>
            `
                    : invoice.items
                          .map(
                              (item: any) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; color: #1f2937;">${item.description}</td>
                    <td style="padding: 10px; text-align: right; color: #111827; font-weight: bold;">${item.amount.toFixed(2)} ${data.config?.currencySymbol || "DH"}</td>
                </tr>
            `,
                          )
                          .join("");

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Facture - ${invoice.invoice_number}</title>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; line-height: 1.6; }
                            .header { display: flex; justify-content: space-between; margin-bottom: 60px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                            .clinic-info h1 { font-weight: 900; margin: 0; font-size: 1.5rem; text-transform: uppercase; color: #4f46e5; }
                            .clinic-info p { margin: 2px 0; color: #64748b; font-size: 0.9rem; }
                            .invoice-info { text-align: right; }
                            .invoice-info h2 { font-weight: 900; font-size: 2rem; margin: 0; color: #1e293b; }
                            .invoice-info p { margin: 2px 0; color: #94a3b8; font-weight: bold; }
                            .client-section { background: #f8fafc; padding: 25px; border-radius: 20px; margin-bottom: 40px; }
                            .client-section h3 { margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
                            .client-name { font-weight: 900; font-size: 1.4rem; color: #1e293b; }
                            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                            .items-table theta { text-align: left; }
                            .items-table th { text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0; font-size: 0.8rem; text-transform: uppercase; color: #94a3b8; }
                            .total-section { display: flex; justify-content: flex-end; }
                            .total-box { background: #4f46e5; color: white; padding: 20px 40px; border-radius: 15px; text-align: center; }
                            .total-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; }
                            .total-value { font-size: 2rem; font-weight: 900; }
                            .footer { margin-top: 80px; text-align: center; color: #94a3b8; font-size: 0.8rem; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="clinic-info">
                                <h1>${data.config?.clinicName || "Dentistico Clinic"}</h1>
                                <p>Soins Dentaires & Esthétiques</p>
                            </div>
                            <div class="invoice-info">
                                <h2>FACTURE</h2>
                                <p>N° ${invoice.invoice_number}</p>
                                <p>Date: ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div class="client-section">
                            <h3>Facturé à</h3>
                            <div class="client-name">${invoice.patient_name}</div>
                            <div>${invoice.patient_address || ""}</div>
                            <div>${invoice.patient_city || ""}</div>
                        </div>

                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th style="text-align: right;">Montant</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <div class="total-section">
                            <div class="total-box">
                                <div class="total-label">Total à Payer</div>
                                <div class="total-value">${invoice.total_amount.toFixed(2)} ${data.config?.currencySymbol || "DH"}</div>
                            </div>
                        </div>

                        <div class="footer">
                            Merci pour votre confiance.
                        </div>

                        <div class="no-print" style="position: fixed; bottom: 20px; right: 20px;">
                            <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);">
                                Imprimer maintenant
                            </button>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'impression de la facture");
        }
    }

    async function printPrescription(id: number) {
        try {
            const res = await fetch(`/api/prescriptions/${id}`);
            if (!res.ok) throw new Error("Failed to load for printing");
            const prescription = await res.json();

            const printWindow = window.open(
                "",
                "_blank",
                "width=800,height=900",
            );
            if (!printWindow) return;

            const medsHtml = prescription.items
                .map(
                    (item: any) => `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; font-size: 1.2em;">${item.medication_name}</div>
                    <div style="margin-left: 15px;">
                        <span>Dosage: ${item.dosage}</span>
                        ${item.duration ? `<span style="margin-left: 20px;">Durée: ${item.duration}</span>` : ""}
                    </div>
                    ${item.instructions ? `<div style="margin-left: 15px; font-style: italic;">Instructions: ${item.instructions}</div>` : ""}
                </div>
            `,
                )
                .join("");

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Ordonnance - ${prescription.prescription_number}</title>
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 50px; color: #1e293b; line-height: 1.6; }
                            .header { display: flex; justify-content: space-between; margin-bottom: 60px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                            .doctor-info h1 { font-weight: 900; margin: 0; font-size: 1.5rem; text-transform: uppercase; color: #4f46e5; }
                            .doctor-info p { margin: 2px 0; color: #64748b; font-weight: 600; font-size: 0.9rem; }
                            .prescription-info { text-align: right; }
                            .prescription-info h2 { font-weight: 900; font-size: 2rem; margin: 0; color: #1e293b; }
                            .prescription-info p { margin: 2px 0; color: #94a3b8; font-weight: bold; }
                            .patient-section { background: #f8fafc; padding: 25px; border-radius: 20px; margin-bottom: 50px; }
                            .patient-section h3 { margin: 0 0 10px 0; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
                            .patient-name { font-weight: 900; font-size: 1.4rem; color: #1e293b; }
                            .meds-list { min-height: 400px; padding: 0 10px; }
                            .notes-section { margin-top: 50px; padding-top: 20px; border-top: 1px dashed #e2e8f0; }
                            .footer { margin-top: 100px; display: flex; justify-content: space-between; align-items: flex-end; }
                            .signature-box { border-top: 2px solid #1e293b; width: 200px; text-align: center; padding-top: 10px; font-weight: bold; font-size: 0.8rem; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="doctor-info">
                                <h1>Dr. ${prescription.doctor_name}</h1>
                                <p>${prescription.doctor_specialties || "Chirurgien Dentiste"}</p>
                            </div>
                            <div class="prescription-info">
                                <h2>ORDONNANCE</h2>
                                <p>N° ${prescription.prescription_number}</p>
                                <p>Date: ${new Date(prescription.prescription_date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div class="patient-section">
                            <h3>Patient</h3>
                            <div class="patient-name">${prescription.patient_name}</div>
                            ${prescription.patient_dob ? `<div style="font-weight: bold; color: #64748b; font-size: 0.9rem;">Âge: ${calculateAge(prescription.patient_dob)} ans</div>` : ""}
                        </div>

                        <div class="meds-list">
                            ${medsHtml}
                        </div>

                        ${
                            prescription.notes
                                ? `
                        <div class="notes-section">
                            <h3 style="font-size: 0.8rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">Notes & Conseils</h3>
                            <p style="white-space: pre-wrap; font-weight: 500;">${prescription.notes}</p>
                        </div>
                        `
                                : ""
                        }

                        <div class="footer">
                            <div style="font-size: 0.7rem; color: #94a3b8; max-width: 300px;">
                                Cette ordonnance est valable pour une durée limitée. 
                                En cas d'urgence, veuillez contacter la clinique directement.
                            </div>
                            <div class="signature-box">Signature & Cachet</div>
                        </div>

                        <div class="no-print" style="position: fixed; bottom: 20px; right: 20px;">
                            <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);">
                                Imprimer maintenant
                            </button>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la préparation de l'impression");
        }
    }

    let visitTimer = $state(0);
    let timerInterval: any;

    const avgDurationSeconds = $derived((data.config?.avgDuration || 20) * 60);

    // Keyboard Shortcuts
    function handleKeydown(e: KeyboardEvent) {
        // Ignore if typing in an input
        const target = e.target as HTMLElement;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
            if (e.key === "Escape") {
                target.blur();
            }
            return;
        }

        switch (e.key.toLowerCase()) {
            case "n":
                e.preventDefault();
                showNotesModal = true;
                break;
            case "a":
                e.preventDefault();
                chart?.openGeneralTreatment();
                break;
            case "p":
                e.preventDefault();
                isPaymentModalOpen = true;
                break;
            case "r":
                e.preventDefault();
                showPrescriptionModal = true;
                break;
            case "i":
            case "f":
                e.preventDefault();
                isInvoiceModalOpen = true;
                break;
            case "escape":
                showNotesModal = false;
                showRescheduleModal = false;
                isPaymentModalOpen = false;
                showPrescriptionModal = false;
                isInvoiceModalOpen = false;
                break;
        }
    }

    interface ClinicalStandard {
        id: number;
        category: string;
        treatment_name: string;
        min_duration: number;
        max_duration: number;
        gap_days_min: number;
        gap_days_max: number;
        typical_sessions: number;
        complexity: number;
    }

    // Clinical Standard Intelligence
    const targetStandard = $derived.by(() => {
        if (!data.clinicalStandards) return null;
        const type = data.appointment.appointment_type
            ?.toLowerCase()
            .replace(/_/g, " ");
        const results = data.clinicalStandards as any[];
        const std =
            results.find((s: any) => s.treatment_name.toLowerCase() === type) ||
            results.find((s: any) =>
                type?.includes(s.treatment_name.toLowerCase()),
            ) ||
            results.find(
                (s: any) => s.category.toLowerCase() === "consultation",
            );
        return (std as ClinicalStandard) || null;
    });

    const maxDurationSeconds = $derived(
        targetStandard ? targetStandard.max_duration * 60 : avgDurationSeconds,
    );

    const timerStatus = $derived.by(() => {
        const padding = 600; // 10 mins tolerance
        if (visitTimer < maxDurationSeconds) return "green";
        if (visitTimer < maxDurationSeconds + padding) return "orange";
        return "red";
    });

    // Rescheduling Intelligence
    let recommendedRescheduleDate = $state("");
    $effect(() => {
        if (
            showRescheduleModal &&
            targetStandard &&
            targetStandard.gap_days_min > 0
        ) {
            const d = new Date();
            d.setDate(d.getDate() + targetStandard.gap_days_min);
            recommendedRescheduleDate = d.toISOString().split("T")[0];
            rescheduleDate = recommendedRescheduleDate; // Auto-set
        }
    });

    // Lab Warning
    const hasPendingProsthesis = $derived.by(() => {
        if (
            targetStandard?.category.includes("Prothèse") ||
            data.appointment.appointment_type?.includes("prosthesis")
        ) {
            return !data.labTracking?.some((l: any) => l.status === "received");
        }
        return false;
    });

    // Derived values
    const plannedActs = $derived((data.plannedActs || []) as any[]);
    const labTrackingItems = $derived((data.labTracking || []) as any[]);
    const highPriorityNotes = $derived((data.clinicalNotes || []) as any[]); // Use all notes for sidebar logic

    let isLeftSidebarOpen = $state(false);
    let isNotesSidebarOpen = $state(false);
    let sidebarTab = $state("notes"); // 'notes' or 'finance'
    const totalPaid = $derived(
        (data.payments || []).reduce(
            (sum: number, p: any) => sum + p.amount,
            0,
        ),
    );

    // Smart Notification Logic
    const notesStatus = $derived.by(() => {
        const notes = (data.clinicalNotes || []) as any[];
        if (notes.some((n: any) => n.importance === "critical"))
            return "critical";
        if (notes.some((n: any) => n.importance === "high")) return "high";
        if (notes.length > 0) return "normal";
        return "empty";
    });

    const notesSummary = $derived.by(() => {
        const notes = (data.clinicalNotes || []) as any[];
        if (notes.length === 0) return "Aucune note";
        const critical = notes.filter(
            (n: any) => n.importance === "critical",
        ).length;
        const urgent = notes.filter((n: any) => n.importance === "high").length;
        return `${notes.length} Notes: ${critical > 0 ? critical + " Crities, " : ""}${urgent > 0 ? urgent + " Urgentes" : ""}`;
    });

    let localSessionStarted = $state(false);

    const isSessionActive = $derived(
        localSessionStarted ||
            (!!data.appointment.actual_start_time &&
                !data.appointment.actual_end_time),
    );

    // Reactive timer effect
    $effect(() => {
        if (isSessionActive) {
            const startStr =
                data.appointment.actual_start_time || new Date().toISOString();
            const start = new Date(startStr).getTime();
            // Immediate update
            visitTimer = Math.floor((Date.now() - start) / 1000);

            // Clear any existing interval to prevent duplicates
            if (timerInterval) clearInterval(timerInterval);

            timerInterval = setInterval(() => {
                visitTimer = Math.floor((Date.now() - start) / 1000);
            }, 1000);
        } else {
            if (timerInterval) clearInterval(timerInterval);
        }
        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    });

    function formatTime(seconds: number) {
        const totalSeconds = Math.floor(seconds);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) {
            return `${h}h ${m.toString().padStart(2, "0")}m`;
        }
        if (m > 0) {
            return `${m}m ${s.toString().padStart(2, "0")}s`;
        }
        return `${s}s`;
    }

    async function handleTreatmentAdded() {
        if (!isSessionActive) {
            localSessionStarted = true; // Instant feedback
            // Auto-start session using the existing action
            try {
                const formData = new FormData();
                const response = await fetch("?/startVisit", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    await invalidateAll();
                } else {
                    localSessionStarted = false; // Revert on failure
                }
            } catch (e) {
                console.error("Failed to auto-start session:", e);
                localSessionStarted = false;
            }
        }
    }

    // Auto-end session on navigation if active
    beforeNavigate(async ({ cancel }) => {
        if (isSessionActive) {
            const formData = new FormData();
            // Use sendBeacon for reliability on unload, but here fetch is okay for SPA nav
            // We use the existing endVisit action
            try {
                fetch("?/endVisit", {
                    method: "POST",
                    body: formData,
                    keepalive: true,
                });
            } catch (e) {
                console.error("Failed to auto-end visit:", e);
            }
        }
    });

    const completedDuration = $derived.by(() => {
        if (
            data.appointment.status === "completed" &&
            data.appointment.actual_start_time &&
            data.appointment.actual_end_time
        ) {
            const start = new Date(
                data.appointment.actual_start_time,
            ).getTime();
            const end = new Date(data.appointment.actual_end_time).getTime();
            const diff = (end - start) / 1000;
            return formatTime(diff);
        }
        return "";
    });

    const patientAge = $derived(calculateAge(data.patient.date_of_birth));
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="journey-workspace overflow-hidden bg-slate-50 flex flex-col">
    <!-- 1. Header Identity Bar -->
    <header
        class="identity-bar sticky top-0 bg-white border-b border-slate-200 flex items-center px-4 h-14 justify-between z-50 shadow-sm shrink-0"
    >
        <div class="flex items-center gap-4">
            <a href="/doctor/journey" class="btn-back scale-90"> ← </a>
            <div class="patient-id-card">
                <div class="flex items-center gap-2">
                    <h2
                        class="text-lg font-black text-slate-900 leading-none mb-0.5"
                    >
                        {data.patient.full_name}
                    </h2>
                    {#if targetStandard?.complexity}
                        <div
                            class="flex gap-0.5 scale-75 origin-left"
                            title="Complexité: {targetStandard.complexity}/5"
                        >
                            {#each Array(targetStandard.complexity) as _}
                                <span class="text-yellow-400 text-sm">★</span>
                            {/each}
                        </div>
                    {/if}
                </div>
                <div
                    class="flex gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider"
                >
                    <span>{patientAge} ANS</span>
                    <span class="text-slate-200">|</span>
                    <span
                        >{data.patient.gender === "F" ? "Femme" : "Homme"}</span
                    >
                    {#if targetStandard && targetStandard.typical_sessions > 1}
                        <span
                            class="text-indigo-400 border-l border-slate-100 pl-2"
                        >
                            S1 / {targetStandard.typical_sessions}
                        </span>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Center: Intelligent Timer -->
        <div class="flex flex-col items-center">
            {#if isSessionActive}
                <div class="timer-display {timerStatus} scale-90" in:scale>
                    <span
                        class="time font-mono text-2xl font-black tracking-tight"
                        >{formatTime(visitTimer)}</span
                    >
                    {#if timerStatus !== "green"}
                        <span
                            class="absolute -bottom-4 text-[9px] font-bold uppercase tracking-widest text-red-500 animate-pulse"
                            >Dépassement</span
                        >
                    {/if}
                </div>
            {:else if data.appointment.status === "completed"}
                <div
                    class="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm animate-in fade-in zoom-in duration-500"
                >
                    <div
                        class="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px]"
                    >
                        ✓
                    </div>
                    <div class="flex flex-col -space-y-1">
                        <span
                            class="text-[9px] font-black text-emerald-400 uppercase tracking-widest"
                            >{$t("journey.completed")}</span
                        >
                        <span
                            class="text-sm font-black text-emerald-700 font-mono"
                            >{completedDuration || "--:--"}</span
                        >
                    </div>
                </div>
            {:else if hasPendingProsthesis}
                <div class="flex flex-col items-center gap-2">
                    <div
                        class="flex items-center gap-2 px-4 py-1.5 bg-rose-50 rounded-full border border-rose-100 shadow-sm animate-bounce"
                    >
                        <div
                            class="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px]"
                        >
                            ⚠️
                        </div>
                        <div class="flex flex-col -space-y-1">
                            <span
                                class="text-[9px] font-black text-rose-400 uppercase tracking-widest"
                                >Bloqué</span
                            >
                            <span class="text-xs font-black text-rose-700"
                                >Prothèse non reçue</span
                            >
                        </div>
                    </div>
                </div>
            {:else}
                <div
                    class="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm animate-pulse"
                >
                    <div
                        class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-[10px]"
                    >
                        ⌛
                    </div>
                    <div class="flex flex-col -space-y-1">
                        <span
                            class="text-[9px] font-black text-indigo-400 uppercase tracking-widest"
                            >{$t("journey.status") || "Statut"}</span
                        >
                        <span class="text-sm font-black text-indigo-700"
                            >{$t("journey.waiting")}</span
                        >
                    </div>
                </div>
            {/if}
        </div>

        <div class="flex items-center gap-4">
            <!-- Critical Info & Balance (High Visibility) -->
            <div class="flex gap-2">
                {#if data.patient.allergies}
                    <div class="alert-box critical scale-95 px-2.5 py-1">
                        <span class="icon text-sm">⚠️</span>
                        <div class="flex flex-col">
                            <span class="label text-[8px]"
                                >{$t("journey.allergies")}</span
                            >
                            <span class="value text-xs"
                                >{data.patient.allergies}</span
                            >
                        </div>
                    </div>
                {/if}
                {#if data.patient.medical_conditions}
                    <div class="alert-box warning scale-95 px-2.5 py-1">
                        <span class="icon text-sm">🩺</span>
                        <div class="flex flex-col">
                            <span class="label text-[8px]"
                                >{$t("journey.medical_conditions")}</span
                            >
                            <span class="value text-xs"
                                >{data.patient.medical_conditions}</span
                            >
                        </div>
                    </div>
                {/if}
                <button
                    class="alert-box balance cursor-pointer hover:scale-105 active:scale-95 transition-all text-left border-none bg-transparent p-0 scale-95 px-2.5 py-1"
                    class:negative={data.patient.balance_due > 0}
                    onclick={() => {
                        sidebarTab = "finance";
                        isNotesSidebarOpen = true;
                    }}
                >
                    <span class="icon text-sm">💰</span>
                    <div class="flex flex-col">
                        <span class="label text-[8px]"
                            >{$t("journey.solde")}</span
                        >
                        <span class="value text-xs"
                            >{data.patient.balance_due.toLocaleString()}
                            {data.config?.currencySymbol || "دج"}</span
                        >
                    </div>
                </button>
            </div>

            <!-- Visit Control -->
            <div class="flex items-center gap-2">
                {#if !data.appointment.actual_start_time}
                    <form
                        action="?/startVisit"
                        method="POST"
                        use:enhance
                        onsubmit={(e) => {
                            if (
                                hasPendingProsthesis &&
                                !confirm(
                                    "La prothèse n'est pas reçue. Continuer quand même ?",
                                )
                            )
                                e.preventDefault();
                        }}
                    >
                        <button
                            class="btn-commencer scale-90"
                            class:warning={hasPendingProsthesis}
                        >
                            <span class="control-icon"
                                >{hasPendingProsthesis ? "⚠️" : "▶"}</span
                            >
                            <span class="text-xs"
                                >{$t("journey.start_visit")}</span
                            >
                        </button>
                    </form>
                {:else if !data.appointment.actual_end_time}
                    <form action="?/endVisit" method="POST" use:enhance>
                        <button class="btn-terminer scale-90">
                            <span class="control-icon">■</span>
                            <span class="text-xs"
                                >{$t("journey.end_visit")}</span
                            >
                        </button>
                    </form>
                {/if}
            </div>
        </div>
    </header>
    <!-- 2. Main Content Grid - Dynamic Collapsible Layout -->
    <main
        class="flex-1 grid gap-0 overflow-hidden transition-all duration-300 ease-out"
        style="grid-template-columns: 5rem 1fr 5rem;"
    >
        <!-- Left Section: Action Grid & Clinical Intelligence (Retractable) -->
        <section
            class="relative bg-slate-50 border-r border-slate-200"
            style="z-index: {isLeftSidebarOpen ? 100 : 30};"
        >
            <div
                class="h-full transition-all duration-300 ease-out flex flex-col bg-slate-50 {isLeftSidebarOpen
                    ? 'absolute top-0 left-0 w-[280px] shadow-2xl border-r border-slate-200 z-[100]'
                    : 'w-full'}"
                onclick={(e) => e.stopPropagation()}
                role="presentation"
            >
                {#if isLeftSidebarOpen}
                    <div
                        class="p-4 overflow-y-auto flex-1 flex flex-col gap-4"
                        in:fade
                    >
                        <div class="flex justify-between items-center">
                            <span
                                class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
                                >Espace Travail</span
                            >
                            <button
                                class="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm text-xs"
                                onclick={() => (isLeftSidebarOpen = false)}
                            >
                                ←
                            </button>
                        </div>

                        <!-- 1. Planned Acts Notification -->
                        {#if plannedActs.length > 0}
                            <div
                                class="planned-acts-alert animate-bounce-subtle p-3 rounded-xl border-indigo-100"
                                in:slide
                            >
                                <div class="flex items-center gap-2 mb-1.5">
                                    <span class="text-lg">📅</span>
                                    <h4
                                        class="font-black text-indigo-900 leading-none text-xs"
                                    >
                                        {$t("journey.planned_today")}
                                    </h4>
                                </div>
                                <ul class="space-y-0.5">
                                    {#each plannedActs as act}
                                        <li
                                            class="text-indigo-700 text-[10px] font-bold flex items-center gap-1.5"
                                        >
                                            <span
                                                class="w-1 h-1 rounded-full bg-indigo-400"
                                            ></span>
                                            {act.treatment_type}
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}

                        <!-- 2. Main Actions -->
                        <div class="action-group">
                            <h3 class="group-title mb-2">
                                {$t("journey.clinical_actions")}
                            </h3>
                            <div class="action-grid dense">
                                <button
                                    class="pos-btn-compact"
                                    style="--color: #6366f1"
                                    onclick={() =>
                                        chart?.openGeneralTreatment({
                                            cdt_code: "CONS",
                                            procedure_description:
                                                "Consultation générale",
                                            fee: 1500,
                                            status: "completed",
                                            color: "#6B7280",
                                        })}
                                >
                                    <span class="icon">🦷</span>
                                    <span class="label"
                                        >{$t("journey.acte_general")}</span
                                    >
                                </button>
                                <button
                                    class="pos-btn-compact"
                                    style="--color: #10b981"
                                    onclick={() => (isPaymentModalOpen = true)}
                                >
                                    <span class="icon">💳</span>
                                    <span class="label"
                                        >{$t("journey.paiement")}</span
                                    >
                                </button>
                                <button
                                    class="pos-btn-compact"
                                    style="--color: #8b5cf6"
                                    onclick={() =>
                                        (showPrescriptionModal = true)}
                                >
                                    <span class="icon">📜</span>
                                    <span class="label"
                                        >{$t("journey.ordonnance")}</span
                                    >
                                </button>
                                <button
                                    class="pos-btn-compact"
                                    style="--color: #3b82f6"
                                    onclick={() => (isInvoiceModalOpen = true)}
                                >
                                    <span class="icon">📑</span>
                                    <span class="label"
                                        >{$t("journey.facture")}</span
                                    >
                                </button>
                            </div>
                        </div>

                        <!-- 3. Exception Handling (Quick Status) -->
                        <div class="action-group">
                            <h3 class="group-title mb-2">
                                {$t("journey.appointment_management")}
                            </h3>
                            <div class="grid grid-cols-2 gap-2">
                                <form
                                    action="?/updateStatus"
                                    method="POST"
                                    use:enhance
                                    class="contents"
                                >
                                    <input
                                        type="hidden"
                                        name="status"
                                        value="scheduled"
                                    />
                                    <button
                                        class="status-action-btn postponed flex items-center justify-center gap-2 py-2"
                                        disabled={isSessionActive}
                                    >
                                        <span class="text-sm">🕒</span>
                                        <span class="text-[9px]"
                                            >{$t("journey.postpone")}</span
                                        >
                                    </button>
                                </form>
                                <form
                                    action="?/updateStatus"
                                    method="POST"
                                    use:enhance
                                    class="contents"
                                >
                                    <input
                                        type="hidden"
                                        name="status"
                                        value="cancelled"
                                    />
                                    <button
                                        class="status-action-btn cancelled flex items-center justify-center gap-2 py-2"
                                        disabled={isSessionActive}
                                    >
                                        <span class="text-sm">❌</span>
                                        <span class="text-[9px]"
                                            >{$t("journey.cancel")}</span
                                        >
                                    </button>
                                </form>
                                <button
                                    class="status-action-btn reschedule col-span-2 flex items-center justify-center gap-2 py-2"
                                    disabled={isSessionActive}
                                    onclick={() => (showRescheduleModal = true)}
                                >
                                    <span class="text-sm">📅</span>
                                    <span class="text-[9px]"
                                        >{$t("journey.reschedule")}</span
                                    >
                                </button>
                            </div>
                        </div>

                        <!-- 4. Lab Tracking -->
                        <div class="action-group">
                            <h3 class="group-title mb-2">
                                {$t("journey.lab_tracking")}
                            </h3>
                            <div class="lab-tracking-container gap-2">
                                {#if labTrackingItems.length > 0}
                                    {#each labTrackingItems as item}
                                        <div
                                            class="lab-item {item.status} p-2.5 rounded-xl"
                                        >
                                            <div
                                                class="flex justify-between items-start mb-0.5"
                                            >
                                                <span
                                                    class="lab-name font-bold text-slate-700 text-[11px]"
                                                    >{item.description}</span
                                                >
                                                <span
                                                    class="status-pill px-1 py-0"
                                                    >{item.status}</span
                                                >
                                            </div>
                                            <span
                                                class="text-[9px] text-slate-400 font-bold uppercase"
                                                >{new Date(
                                                    item.updated_at,
                                                ).toLocaleDateString()}</span
                                            >
                                        </div>
                                    {/each}
                                {:else}
                                    <div class="empty-lab-state py-4">
                                        <span
                                            class="text-xs font-medium text-slate-400"
                                            >{$t("journey.no_prosthesis")}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- COLLAPSED STATE -->
                    <div
                        class="h-full w-full flex flex-col items-center py-6 gap-8 overflow-y-auto"
                        in:fade
                    >
                        <button
                            class="action-icon toggle-btn"
                            onclick={() => (isLeftSidebarOpen = true)}
                        >
                            →
                        </button>

                        <!-- Clinical Actions Icons -->
                        <div class="flex flex-col items-center gap-3">
                            <button
                                class="action-icon"
                                style="--color: #6366f1"
                                title={$t("journey.acte_general")}
                                onclick={() =>
                                    chart?.openGeneralTreatment({
                                        cdt_code: "CONS",
                                        procedure_description:
                                            "Consultation générale",
                                        fee: 1500,
                                        status: "completed",
                                        color: "#6B7280",
                                    })}>🦷</button
                            >
                            <button
                                class="action-icon"
                                style="--color: #10b981"
                                title={$t("journey.paiement")}
                                onclick={() => (isPaymentModalOpen = true)}
                                >💳</button
                            >
                            <button
                                class="action-icon"
                                style="--color: #8b5cf6"
                                title={$t("journey.ordonnance")}
                                onclick={() => (showPrescriptionModal = true)}
                                >📜</button
                            >
                            <button
                                class="action-icon"
                                style="--color: #3b82f6"
                                title={$t("journey.facture")}
                                onclick={() => (isInvoiceModalOpen = true)}
                                >📑</button
                            >
                        </div>

                        <!-- Appointment Management Icons -->
                        <div class="flex flex-col items-center gap-3">
                            <form
                                action="?/updateStatus"
                                method="POST"
                                use:enhance
                                class="contents"
                            >
                                <input
                                    type="hidden"
                                    name="status"
                                    value="scheduled"
                                />
                                <button
                                    class="action-icon status-scheduled"
                                    disabled={isSessionActive}
                                    title={$t("journey.postpone")}
                                >
                                    🕒
                                </button>
                            </form>
                            <form
                                action="?/updateStatus"
                                method="POST"
                                use:enhance
                                class="contents"
                            >
                                <input
                                    type="hidden"
                                    name="status"
                                    value="cancelled"
                                />
                                <button
                                    class="action-icon status-cancelled"
                                    disabled={isSessionActive}
                                    title={$t("journey.cancel")}
                                >
                                    ❌
                                </button>
                            </form>
                            <button
                                class="action-icon status-reschedule"
                                disabled={isSessionActive}
                                title={$t("journey.reschedule")}
                                onclick={() => (showRescheduleModal = true)}
                                >📅</button
                            >
                        </div>

                        <!-- Lab Tracking Icon -->
                        <div class="flex flex-col items-center gap-3">
                            <button
                                class="action-icon"
                                style="--color: #6366f1"
                                title={$t("journey.lab_tracking")}>🧪</button
                            >
                        </div>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Center Section: Interactive Odontogram (Flexible) -->
        <section class="bg-white relative border-r-2 border-slate-100">
            <DentalChart
                bind:this={chart}
                patientId={data.patient.id}
                {patientAge}
                onTreatmentAdded={handleTreatmentAdded}
            />
        </section>

        <!-- Right Section: Collapsible Clinical Sidebar -->
        <section
            class="relative bg-slate-50 border-l border-slate-100"
            style="z-index: {isNotesSidebarOpen ? 100 : 30};"
        >
            <div
                class="h-full transition-all duration-300 ease-out flex flex-col bg-slate-50 {isNotesSidebarOpen
                    ? 'absolute top-0 right-0 h-full w-[280px] shadow-2xl border-l border-slate-200 z-[100]'
                    : 'w-full'}"
                onclick={(e) => e.stopPropagation()}
                role="presentation"
            >
                {#if !isNotesSidebarOpen}
                    <!-- COLLAPSED: Toggle Handle with Smart Indicators -->
                    <button
                        class="h-full w-full flex flex-col items-center py-4 gap-4 hover:bg-slate-100 transition-colors group cursor-pointer"
                        onclick={() => (isNotesSidebarOpen = true)}
                        title={notesSummary}
                    >
                        <!-- Status Badge -->
                        <div class="relative">
                            <div
                                class="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-all group-hover:scale-110 {notesStatus ===
                                'critical'
                                    ? 'bg-red-50 border-red-200 text-red-500 animate-pulse'
                                    : notesStatus === 'high'
                                      ? 'bg-orange-50 border-orange-200 text-orange-500'
                                      : notesStatus === 'normal'
                                        ? 'bg-blue-50 border-blue-200 text-blue-500'
                                        : 'bg-white border-slate-200 text-slate-300'}"
                            >
                                <span class="text-lg font-black">
                                    {notesStatus === "empty" ? "📝" : "i"}
                                </span>
                            </div>
                            {#if notesStatus !== "empty"}
                                <div
                                    class="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white {notesStatus ===
                                    'critical'
                                        ? 'bg-red-500'
                                        : notesStatus === 'high'
                                          ? 'bg-orange-500'
                                          : 'bg-blue-500'}"
                                ></div>
                            {/if}
                        </div>

                        <!-- Vertical Label -->
                        <div
                            class="writing-vertical-rl rotate-180 flex items-center gap-3 py-2"
                        >
                            <span
                                class="font-black text-slate-400 text-[10px] tracking-[0.3em] uppercase whitespace-nowrap group-hover:text-indigo-500 transition-colors"
                            >
                                {sidebarTab === "notes"
                                    ? $t("journey.clinical_notes")
                                    : $t("journey.paiement")}
                            </span>
                        </div>
                    </button>
                {:else}
                    <!-- EXPANDED: Full Note Panel -->
                    <div
                        class="absolute inset-0 flex flex-col"
                        in:fade={{ duration: 300 }}
                    >
                        <div
                            class="p-4 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col gap-3"
                        >
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-2">
                                    <button
                                        class="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors text-xs"
                                        onclick={() =>
                                            (isNotesSidebarOpen = false)}
                                    >
                                        →
                                    </button>
                                    <h3
                                        class="font-black text-slate-800 uppercase tracking-wider text-[10px]"
                                    >
                                        {sidebarTab === "notes"
                                            ? $t("journey.clinical_notes")
                                            : $t("journey.finance_details")}
                                    </h3>
                                </div>
                                {#if sidebarTab === "notes"}
                                    <button
                                        class="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        onclick={() => (showNotesModal = true)}
                                    >
                                        <span
                                            class="text-base leading-none pb-0.5"
                                            >+</span
                                        >
                                    </button>
                                {:else}
                                    <button
                                        class="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm text-xs"
                                        onclick={() =>
                                            (isPaymentModalOpen = true)}
                                        title={$t("journey.paiement")}
                                    >
                                        <span>💳</span>
                                    </button>
                                {/if}
                            </div>

                            <!-- Tabs -->
                            <div
                                class="flex p-0.5 bg-slate-100 rounded-lg gap-0.5"
                            >
                                <button
                                    class="flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all {sidebarTab ===
                                    'notes'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'}"
                                    onclick={() => (sidebarTab = "notes")}
                                >
                                    📝 Notes
                                </button>
                                <button
                                    class="flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all {sidebarTab ===
                                    'finance'
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'}"
                                    onclick={() => (sidebarTab = "finance")}
                                >
                                    💰 Finance
                                </button>
                            </div>
                        </div>

                        <div
                            class="p-4 overflow-y-auto flex-1 flex flex-col gap-3"
                        >
                            {#if sidebarTab === "notes"}
                                {#if highPriorityNotes.length === 0}
                                    <div class="text-center py-10 opacity-50">
                                        <span class="text-4xl block mb-2"
                                            >📝</span
                                        >
                                        <span
                                            class="text-xs font-bold text-slate-400 uppercase"
                                            >{$t("journey.no_notes")}</span
                                        >
                                    </div>
                                {/if}

                                {#each highPriorityNotes as note}
                                    <div
                                        class="post-it {note.importance} pointer-events-auto"
                                        in:slide
                                    >
                                        <div
                                            class="flex items-center justify-between mb-2"
                                        >
                                            <span class="importance-badge"
                                                >{note.importance}</span
                                            >
                                            <span
                                                class="text-[10px] font-bold text-slate-400"
                                                >{new Date(
                                                    note.created_at,
                                                ).toLocaleDateString()}</span
                                            >
                                        </div>
                                        <p class="note-text">{note.content}</p>
                                    </div>
                                {/each}
                            {:else}
                                <!-- Financial Tab Content -->
                                <div class="space-y-6">
                                    <div
                                        class="p-5 bg-rose-50 rounded-[2rem] border-2 border-rose-100 flex flex-col gap-4"
                                    >
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span
                                                class="text-xs font-black text-rose-600 uppercase tracking-widest"
                                                >{$t(
                                                    "assistant.dashboard.payment.modal.totalDue",
                                                )}</span
                                            >
                                            <span
                                                class="text-2xl font-black text-rose-600"
                                                >{data.config?.currencySymbol ||
                                                    "DH"}{data.patient.balance_due.toFixed(
                                                    2,
                                                )}</span
                                            >
                                        </div>
                                        {#if data.patient.parent_name}
                                            <div
                                                class="pt-3 border-t border-rose-200 flex flex-col gap-1"
                                            >
                                                <span
                                                    class="text-[10px] font-black text-rose-400 uppercase tracking-widest"
                                                    >{$t(
                                                        "patient_details.parent_guardian",
                                                    )}</span
                                                >
                                                <div
                                                    class="flex justify-between items-center"
                                                >
                                                    <span
                                                        class="text-sm font-black text-rose-700"
                                                        >{data.patient
                                                            .parent_name}</span
                                                    >
                                                    <a
                                                        href="tel:{data.patient
                                                            .parent_phone}"
                                                        class="text-xs font-bold text-rose-500 hover:underline"
                                                        >{data.patient
                                                            .parent_phone}</a
                                                    >
                                                </div>
                                            </div>
                                        {/if}
                                    </div>

                                    <div class="space-y-3">
                                        <span
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                        >
                                            {$t(
                                                "patient_details.encaissements",
                                            )}
                                        </span>
                                        <div class="flex flex-col gap-3">
                                            {#if data.payments && data.payments.length > 0}
                                                {#each [...(data.payments as any[])].reverse() as p}
                                                    {@const payment = p as any}
                                                    <div
                                                        class="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                                                    >
                                                        <div
                                                            class="flex justify-between items-start mb-2"
                                                        >
                                                            <div
                                                                class="flex flex-col"
                                                            >
                                                                <span
                                                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                                                >
                                                                    {new Date(
                                                                        payment.payment_date,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                                <span
                                                                    class="text-sm font-black text-slate-700"
                                                                >
                                                                    {$t(
                                                                        `assistant.dashboard.payment.methods.${payment.payment_method}`,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <span
                                                                class="text-lg font-black text-emerald-600"
                                                            >
                                                                {data.config
                                                                    ?.currencySymbol}{payment.amount.toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                        </div>
                                                        {#if payment.notes}
                                                            <p
                                                                class="text-xs text-slate-400 font-medium italic"
                                                            >
                                                                {payment.notes}
                                                            </p>
                                                        {/if}
                                                    </div>
                                                {/each}
                                            {:else}
                                                <div
                                                    class="text-center py-10 opacity-50 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"
                                                >
                                                    <span
                                                        class="text-4xl block mb-2"
                                                        >💰</span
                                                    >
                                                    <span
                                                        class="text-[10px] font-bold text-slate-400 uppercase"
                                                        >{$t(
                                                            "patient_details.no_payments",
                                                        )}</span
                                                    >
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </section>
    </main>

    {#if showNotesModal}
        <div
            class="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            transition:fade
        >
            <div
                class="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border-4 border-white"
                in:scale={{ start: 0.9, duration: 400, easing: quintOut }}
            >
                <form
                    action="?/saveNote"
                    method="POST"
                    use:enhance={() => {
                        return async ({ update }) => {
                            await update();
                            showNotesModal = false;
                            clinicalNote = "";
                        };
                    }}
                >
                    <div
                        class="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
                    >
                        <div class="flex flex-col">
                            <h3
                                class="text-3xl font-black text-slate-800 tracking-tighter"
                            >
                                {$t("journey.note_clinique")}
                            </h3>
                            <p
                                class="text-slate-400 font-bold text-sm uppercase tracking-wider"
                            >
                                {$t("journey.evolved_notes")}
                            </p>
                        </div>
                        <button
                            type="button"
                            class="w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                            onclick={() => (showNotesModal = false)}>✕</button
                        >
                    </div>

                    <div class="p-10 space-y-8">
                        <!-- Importance Trigger -->
                        <div class="flex flex-col gap-3">
                            <label
                                class="text-xs font-black text-slate-400 uppercase tracking-widest"
                                for="importance"
                            >
                                {$t("journey.importance_level")}
                            </label>
                            <div class="grid grid-cols-3 gap-4">
                                {#each ["low", "high", "critical"] as level}
                                    <label
                                        class="importance-selector {level}"
                                        class:active={noteImportance === level}
                                    >
                                        <input
                                            type="radio"
                                            name="importance"
                                            value={level}
                                            bind:group={noteImportance}
                                            class="hidden"
                                        />
                                        <span
                                            class="capitalize font-black text-sm"
                                            >{level}</span
                                        >
                                    </label>
                                {/each}
                            </div>
                        </div>

                        <div class="flex flex-col gap-3">
                            <label
                                class="text-xs font-black text-slate-400 uppercase tracking-widest"
                                for="content"
                            >
                                {$t("journey.note_content")}
                            </label>
                            <textarea
                                name="content"
                                bind:value={clinicalNote}
                                placeholder="Saisissez vos notes cliniques ici..."
                                class="w-full h-48 p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 focus:bg-white transition-all text-xl font-medium outline-none resize-none shadow-inner"
                            ></textarea>
                        </div>
                    </div>

                    <div class="p-10 bg-slate-50 flex gap-4">
                        <button
                            type="submit"
                            class="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-indigo-700 hover:scale-[1.02] transition-all shadow-xl shadow-indigo-200"
                        >
                            {$t("common.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    {#if showRescheduleModal}
        <div
            class="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
            transition:fade
        >
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border-4 border-white"
                in:scale={{ start: 0.95, duration: 300, easing: quintOut }}
            >
                <form
                    action="?/reschedule"
                    method="POST"
                    use:enhance={() => {
                        return async ({ update }) => {
                            await update();
                            showRescheduleModal = false;
                        };
                    }}
                >
                    <div
                        class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
                    >
                        <h3
                            class="text-2xl font-black text-slate-800 tracking-tight"
                        >
                            {$t("journey.reschedule")}
                        </h3>
                        <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                            onclick={() => (showRescheduleModal = false)}
                            >✕</button
                        >
                    </div>

                    <div class="p-8 space-y-6">
                        {#if targetStandard && targetStandard.gap_days_min > 0}
                            <div
                                class="bg-indigo-50 border-2 border-indigo-100 p-5 rounded-2xl flex items-start gap-4"
                            >
                                <span class="text-2xl">ℹ️</span>
                                <div>
                                    <p
                                        class="font-black text-indigo-900 text-xs uppercase tracking-widest mb-1"
                                    >
                                        Standard Clinique
                                    </p>
                                    <p
                                        class="font-bold text-indigo-600 text-sm"
                                    >
                                        Délai médical conseillé : {targetStandard.gap_days_min}
                                        jours.
                                    </p>
                                </div>
                            </div>
                        {/if}

                        <div class="grid grid-cols-2 gap-4">
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                    for="reschedule_date"
                                >
                                    Date
                                </label>
                                <input
                                    id="reschedule_date"
                                    type="date"
                                    bind:value={rescheduleDate}
                                    min={recommendedRescheduleDate}
                                    class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    required
                                />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                    for="reschedule_time"
                                >
                                    Heure
                                </label>
                                <input
                                    id="reschedule_time"
                                    type="time"
                                    bind:value={rescheduleTime}
                                    class="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <!-- Hidden concatenated input for server -->
                        <input
                            type="hidden"
                            name="start_time"
                            value="{rescheduleDate}T{rescheduleTime || '09:00'}"
                        />
                    </div>

                    <div class="p-8 bg-slate-50">
                        <button
                            type="submit"
                            class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 hover:scale-[1.02] transition-all shadow-lg shadow-indigo-200"
                        >
                            {$t("common.confirm")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Record Payment Modal -->
    {#if isPaymentModalOpen}
        <div
            class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            transition:fade={{ duration: 200 }}
        >
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl w-[80%] max-w-7xl overflow-hidden border-4 border-white"
                in:scale={{ start: 0.95, duration: 300, easing: quintOut }}
            >
                <form
                    method="POST"
                    action="?/recordPayment"
                    use:enhance={() => {
                        errorMessage = "";
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isPaymentModalOpen = false;
                            } else {
                                errorMessage =
                                    (result as any).data?.error ||
                                    "Payment failed";
                            }
                            await update();
                        };
                    }}
                >
                    <div
                        class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50"
                    >
                        <h3
                            class="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3"
                        >
                            <span class="w-1.5 h-8 bg-emerald-500 rounded-full"
                            ></span>
                            {$t("assistant.dashboard.payment.modal.title")}
                        </h3>
                        <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                            onclick={() => (isPaymentModalOpen = false)}
                            >✕</button
                        >
                    </div>

                    <div class="p-8">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <!-- Left Column: Form -->
                            <div class="space-y-6">
                                <span
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                >
                                    {$t("patient_details.record_payment")}
                                </span>

                                <div class="space-y-4">
                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                            for="payment_amount"
                                        >
                                            {$t(
                                                "assistant.dashboard.payment.fields.amount",
                                            )}
                                        </label>
                                        <div class="relative">
                                            <input
                                                id="payment_amount"
                                                type="number"
                                                step="0.01"
                                                name="amount"
                                                required
                                                class="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 font-black text-2xl text-emerald-600 focus:border-emerald-500 focus:bg-white outline-none transition-all pl-12"
                                                value={data.patient.balance_due}
                                            />
                                            <span
                                                class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold"
                                                >{data.config?.currencySymbol ||
                                                    "DH"}</span
                                            >
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                            for="payment_method"
                                        >
                                            {$t(
                                                "assistant.dashboard.payment.fields.paymentMethod",
                                            )}
                                        </label>
                                        <select
                                            id="payment_method"
                                            name="payment_method"
                                            class="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            {#if data.config?.paymentMethods}
                                                {#each data.config.paymentMethods as method}
                                                    <option value={method}
                                                        >{method}</option
                                                    >
                                                {/each}
                                            {:else}
                                                <option value="cash"
                                                    >{$t(
                                                        "assistant.dashboard.payment.methods.cash",
                                                    )}</option
                                                >
                                                <option value="card"
                                                    >{$t(
                                                        "assistant.dashboard.payment.methods.card",
                                                    )}</option
                                                >
                                            {/if}
                                        </select>
                                    </div>

                                    <div class="flex flex-col gap-2">
                                        <label
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                            for="payment_notes"
                                        >
                                            {$t("journey.note_clinique")} (Optionnel)
                                        </label>
                                        <textarea
                                            id="payment_notes"
                                            name="notes"
                                            rows="2"
                                            class="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-medium text-slate-600 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none"
                                            placeholder="Ex: Paiement d'avance, chèque n°..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column: History & Summary -->
                            <div class="space-y-6">
                                <div class="grid grid-cols-2 gap-4">
                                    <div
                                        class="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex flex-col gap-1"
                                    >
                                        <span
                                            class="text-[10px] font-black text-rose-400 uppercase tracking-widest"
                                            >{$t(
                                                "assistant.dashboard.payment.modal.totalDue",
                                            )}</span
                                        >
                                        <span
                                            class="text-2xl font-black text-rose-600"
                                            >{data.config?.currencySymbol ||
                                                "DH"}{data.patient.balance_due.toFixed(
                                                2,
                                            )}</span
                                        >
                                    </div>
                                    <div
                                        class="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-3xl flex flex-col gap-1"
                                    >
                                        <span
                                            class="text-[10px] font-black text-emerald-400 uppercase tracking-widest"
                                            >Total Payé</span
                                        >
                                        <span
                                            class="text-2xl font-black text-emerald-600"
                                            >{data.config?.currencySymbol ||
                                                "DH"}{totalPaid.toFixed(
                                                2,
                                            )}</span
                                        >
                                    </div>
                                </div>

                                <!-- Payment History -->
                                {#if data.payments && data.payments.length > 0}
                                    <div class="space-y-3">
                                        <span
                                            class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                                        >
                                            {$t(
                                                "patient_details.encaissements",
                                            )}
                                        </span>
                                        <div
                                            class="max-h-[220px] overflow-y-auto pr-2 space-y-2"
                                        >
                                            {#each (data.payments || [])
                                                .slice()
                                                .reverse() as p}
                                                {@const payment = p as any}
                                                <div
                                                    class="flex justify-between items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-sm transition-all"
                                                >
                                                    <div class="flex flex-col">
                                                        <span
                                                            class="text-[10px] font-black text-slate-800"
                                                        >
                                                            {new Date(
                                                                payment.payment_date,
                                                            ).toLocaleDateString(
                                                                "fr-FR",
                                                                {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                },
                                                            )}
                                                        </span>
                                                        <span
                                                            class="text-[9px] font-bold text-slate-400 uppercase"
                                                        >
                                                            {$t(
                                                                `assistant.dashboard.payment.methods.${payment.payment_method}`,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <span
                                                        class="text-sm font-black text-emerald-600"
                                                    >
                                                        {data.config
                                                            ?.currencySymbol}{payment.amount.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {:else}
                                    <div
                                        class="flex flex-col items-center justify-center py-10 opacity-30 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200"
                                    >
                                        <span class="text-4xl mb-2">💰</span>
                                        <span
                                            class="text-[10px] font-black uppercase tracking-widest"
                                            >{$t(
                                                "patient_details.no_payments",
                                            )}</span
                                        >
                                    </div>
                                {/if}

                                {#if errorMessage}
                                    <div
                                        class="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl text-sm font-bold flex items-center gap-3"
                                    >
                                        <span class="text-lg">⚠️</span>
                                        {errorMessage}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <div class="p-8 bg-slate-50">
                        <button
                            type="submit"
                            class="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-emerald-700 hover:scale-[1.02] transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                        >
                            <span class="text-xl">💰</span>
                            {$t("assistant.dashboard.payment.modal.confirm")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Prescription Modal -->
    {#if showPrescriptionModal}
        <div
            class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            transition:fade={{ duration: 200 }}
        >
            <div
                class="bg-white rounded-[2.5rem] shadow-2xl w-[90%] h-[90vh] max-w-7xl overflow-hidden border-4 border-white flex flex-col"
                in:scale={{ start: 0.95, duration: 300, easing: quintOut }}
            >
                <!-- Modal Header -->
                <div
                    class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0"
                >
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100"
                        >
                            <span class="text-2xl">📜</span>
                        </div>
                        <div>
                            <h3
                                class="text-2xl font-black text-slate-800 tracking-tight"
                            >
                                {$t("patient_details.new_prescription")}
                            </h3>
                            <p
                                class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                            >
                                Patient: {data.patient.full_name}
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-4">
                        <select
                            bind:value={prescriptionType}
                            class="p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all"
                        >
                            <option value="Standard"
                                >{$t(
                                    "patient_details.prescription_type_standard",
                                )}</option
                            >
                            <option value="Urgente"
                                >{$t(
                                    "patient_details.prescription_type_urgent",
                                )}</option
                            >
                            <option value="Spécialisée"
                                >{$t(
                                    "patient_details.prescription_type_specialized",
                                )}</option
                            >
                        </select>
                        <button
                            type="button"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                            onclick={() => (showPrescriptionModal = false)}
                            >✕</button
                        >
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="flex-1 flex overflow-hidden">
                    <!-- Left Sidebar -->
                    <aside
                        class="w-1/3 border-r-2 border-slate-100 bg-slate-50/30 overflow-y-auto p-8 space-y-8"
                    >
                        <div class="space-y-4">
                            <h4
                                class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                            >
                                {$t("patient_details.templates")}
                            </h4>
                            <div class="grid grid-cols-1 gap-3">
                                {#each (data.prescriptionTemplates as any[]) || [] as template}
                                    <button
                                        class="template-card hover:bg-white group"
                                        onclick={() => useTemplate(template)}
                                    >
                                        <div
                                            class="flex justify-between items-start mb-1"
                                        >
                                            <span
                                                class="font-black text-slate-800 group-hover:text-indigo-600 transition-colors"
                                                >{template.name}</span
                                            >
                                            <span
                                                class="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold uppercase"
                                                >{template.items.length} meds</span
                                            >
                                        </div>
                                        <p
                                            class="text-xs text-slate-500 line-clamp-1"
                                        >
                                            {template.description || ""}
                                        </p>
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <div class="space-y-4 pt-4">
                            <h4
                                class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                            >
                                {$t("patient_details.patient_history")}
                            </h4>
                            <div class="space-y-3">
                                {#each (data.prescriptions as any[]) || [] as p}
                                    <div class="past-prescription-card group">
                                        <div
                                            class="flex justify-between font-bold text-slate-700 mb-1"
                                        >
                                            <span
                                                >#{p.prescription_number ||
                                                    p.id}</span
                                            >
                                            <span
                                                >{new Date(
                                                    p.prescription_date,
                                                ).toLocaleDateString()}</span
                                            >
                                        </div>
                                        <p
                                            class="text-[10px] text-slate-400 line-clamp-1 italic mb-3"
                                        >
                                            {p.meds_summary || ""}
                                        </p>
                                        <div
                                            class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <button
                                                class="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                                                onclick={() =>
                                                    loadPrescription(p.id)}
                                            >
                                                Réouvrir
                                            </button>
                                            <button
                                                class="w-10 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-200"
                                                onclick={() =>
                                                    printPrescription(p.id)}
                                            >
                                                🖨️
                                            </button>
                                        </div>
                                    </div>
                                {:else}
                                    <p
                                        class="text-xs text-slate-400 italic pl-2"
                                    >
                                        {$t("patient_details.no_prescriptions")}
                                    </p>
                                {/each}
                            </div>
                        </div>
                    </aside>

                    <!-- Main Builder -->
                    <main class="flex-1 flex flex-col bg-white overflow-hidden">
                        <div class="p-8 border-b-2 border-slate-100 space-y-6">
                            <div class="grid grid-cols-12 gap-4 items-end">
                                <div class="col-span-4 flex flex-col gap-2">
                                    <label
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2"
                                        for="med_select"
                                        >{$t(
                                            "patient_details.medication",
                                        )}</label
                                    >
                                    <select
                                        id="med_select"
                                        bind:value={selectedMedicationId}
                                        class="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                                    >
                                        <option value={null}
                                            >{$t("common.select")}...</option
                                        >
                                        {#each (data.medications as any[]) || [] as med}
                                            <option value={med.id.toString()}
                                                >{med.name}</option
                                            >
                                        {/each}
                                    </select>
                                </div>
                                <div class="col-span-2 flex flex-col gap-2">
                                    <label
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2"
                                        for="med_dosage"
                                        >{$t("patient_details.dosage")}</label
                                    >
                                    <input
                                        id="med_dosage"
                                        type="text"
                                        bind:value={medDosage}
                                        placeholder="ex: 1g"
                                        class="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div class="col-span-2 flex flex-col gap-2">
                                    <label
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2"
                                        for="med_duration"
                                        >{$t("patient_details.duration")}</label
                                    >
                                    <input
                                        id="med_duration"
                                        type="text"
                                        bind:value={medDuration}
                                        placeholder="ex: 7 days"
                                        class="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div class="col-span-3 flex flex-col gap-2">
                                    <label
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2"
                                        for="med_instr"
                                        >{$t(
                                            "patient_details.instructions",
                                        )}</label
                                    >
                                    <input
                                        id="med_instr"
                                        type="text"
                                        bind:value={medInstructions}
                                        placeholder="ex: 1 tab x 2/day"
                                        class="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div class="col-span-1">
                                    <button
                                        class="w-full h-[58px] bg-slate-800 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg"
                                        onclick={addMedicationToPrescription}
                                        disabled={!selectedMedicationId}
                                        >+</button
                                    >
                                </div>
                            </div>
                        </div>

                        <div class="flex-1 overflow-y-auto p-8">
                            <div class="space-y-4">
                                {#each currentPrescriptionItems as item, i}
                                    <div class="prescription-item-row group">
                                        <div class="flex flex-col">
                                            <span
                                                class="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "patient_details.medication",
                                                )}</span
                                            >
                                            <span
                                                class="text-xl font-black text-slate-800"
                                                >{item.medication_name}</span
                                            >
                                        </div>
                                        <div class="flex flex-col">
                                            <span
                                                class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "patient_details.dosage",
                                                )}</span
                                            >
                                            <span
                                                class="text-lg font-bold text-slate-700"
                                                >{item.dosage}</span
                                            >
                                        </div>
                                        <div class="flex flex-col">
                                            <span
                                                class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "patient_details.duration",
                                                )}</span
                                            >
                                            <span
                                                class="text-lg font-bold text-slate-700"
                                                >{item.duration}</span
                                            >
                                        </div>
                                        <div class="flex flex-col">
                                            <span
                                                class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "patient_details.instructions",
                                                )}</span
                                            >
                                            <span
                                                class="text-sm font-medium text-slate-600 italic"
                                                >"{item.instructions}"</span
                                            >
                                        </div>
                                        <button
                                            class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                            onclick={() =>
                                                removeMedicationFromPrescription(
                                                    i,
                                                )}>✕</button
                                        >
                                    </div>
                                {:else}
                                    <div
                                        class="h-full flex flex-col items-center justify-center py-20 opacity-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-100"
                                    >
                                        <span class="text-8xl mb-4">💊</span>
                                        <p
                                            class="text-2xl font-black uppercase tracking-tighter text-slate-600"
                                        >
                                            {$t(
                                                "patient_details.empty_prescription",
                                            )}
                                        </p>
                                        <p class="font-bold text-slate-400">
                                            {$t(
                                                "patient_details.add_meds_instruction",
                                            )}
                                        </p>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <div
                            class="p-8 border-t-2 border-slate-100 bg-slate-50/50 flex gap-10 shrink-0"
                        >
                            <div class="flex-1 flex flex-col gap-2">
                                <label
                                    class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4"
                                    for="presc_notes"
                                    >{$t(
                                        "patient_details.notes_additional",
                                    )}</label
                                >
                                <textarea
                                    id="presc_notes"
                                    bind:value={prescriptionNotes}
                                    placeholder="ex: Repos complet, Éviter les aliments chauds..."
                                    class="w-full h-24 p-4 bg-white border-2 border-slate-100 rounded-3xl outline-none focus:border-indigo-500 transition-all font-medium resize-none shadow-inner"
                                ></textarea>
                            </div>

                            <div class="w-1/3 flex flex-col gap-4 justify-end">
                                <form
                                    action="?/savePrescription"
                                    method="POST"
                                    use:enhance={() => {
                                        return async ({ result, update }) => {
                                            if (result.type === "success") {
                                                const pid = (result.data as any)
                                                    ?.prescriptionId;
                                                showPrescriptionModal = false;
                                                currentPrescriptionItems = [];
                                                prescriptionNotes = "";
                                                if (pid) printPrescription(pid);
                                            }
                                            await update();
                                        };
                                    }}
                                >
                                    <input
                                        type="hidden"
                                        name="patient_id"
                                        value={data.patient.id}
                                    />
                                    <input
                                        type="hidden"
                                        name="items"
                                        value={JSON.stringify(
                                            currentPrescriptionItems,
                                        )}
                                    />
                                    <input
                                        type="hidden"
                                        name="notes"
                                        value={prescriptionNotes}
                                    />
                                    <input
                                        type="hidden"
                                        name="type"
                                        value={prescriptionType}
                                    />

                                    <button
                                        type="button"
                                        onclick={() =>
                                            (showSaveTemplateModal = true)}
                                        class="w-full py-3 mb-2 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                        disabled={currentPrescriptionItems.length ===
                                            0}
                                    >
                                        <span class="text-lg">💾</span>
                                        Sauvegarder comme Modèle
                                    </button>

                                    <button
                                        type="submit"
                                        class="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl hover:bg-indigo-700 hover:scale-[1.02] transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-4"
                                        disabled={currentPrescriptionItems.length ===
                                            0}
                                    >
                                        <span class="text-2xl">🖨️</span>
                                        {$t("patient_details.save_print")}
                                    </button>
                                </form>
                                <button
                                    onclick={() =>
                                        (showPrescriptionModal = false)}
                                    class="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                                    >{$t("common.cancel")}</button
                                >
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    {/if}

    <!-- Save Template Modal -->
    {#if showSaveTemplateModal}
        <div
            class="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            transition:fade={{ duration: 200 }}
        >
            <div
                class="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 border-4 border-white"
                transition:scale={{
                    duration: 300,
                    start: 0.95,
                    easing: quintOut,
                }}
            >
                <h3 class="text-2xl font-black text-slate-800 mb-6">
                    Enregistrer comme Modèle
                </h3>

                <form
                    action="?/createTemplate"
                    method="POST"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                showSaveTemplateModal = false;
                                templateName = "";
                                // Refresh templates list
                                await invalidateAll();
                            }
                            await update();
                        };
                    }}
                    class="space-y-6"
                >
                    <input
                        type="hidden"
                        name="items"
                        value={JSON.stringify(currentPrescriptionItems)}
                    />
                    <input
                        type="hidden"
                        name="description"
                        value={prescriptionNotes}
                    />

                    <div class="space-y-2">
                        <label
                            class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2"
                            for="template_name">Nom du Modèle</label
                        >
                        <input
                            type="text"
                            id="template_name"
                            name="name"
                            bind:value={templateName}
                            placeholder="ex: Post-Extraction, Traitement Abcès..."
                            class="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none"
                            required
                        />
                    </div>

                    <div class="flex gap-4 pt-4">
                        <button
                            type="button"
                            onclick={() => (showSaveTemplateModal = false)}
                            class="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.25rem] font-bold hover:bg-slate-200 transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            class="flex-1 py-4 bg-indigo-600 text-white rounded-[1.25rem] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Record Invoice Modal -->
    {#if isInvoiceModalOpen}
        <div
            class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            transition:fade={{ duration: 200 }}
        >
            <div
                class="bg-white rounded-2xl shadow-2xl w-[90%] h-[85vh] max-w-7xl overflow-hidden border-2 border-white flex flex-col"
                in:scale={{ start: 0.95, duration: 300, easing: quintOut }}
            >
                <div
                    class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0"
                >
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100"
                        >
                            <span class="text-xl">📑</span>
                        </div>
                        <div>
                            <h3
                                class="text-lg font-black text-slate-800 tracking-tight leading-none mb-1"
                            >
                                {$t("patient_details.new_invoice")}
                            </h3>
                            <p
                                class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none"
                            >
                                Patient: {data.patient.full_name}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        class="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-400 hover:text-rose-500 transition-all border border-slate-100"
                        onclick={() => (isInvoiceModalOpen = false)}>✕</button
                    >
                </div>

                <!-- Billing Status Bar -->
                <div
                    class="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0"
                >
                    <div class="flex gap-6">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-400"
                                >{$t(
                                    "patient_details.billing_summary.total_acts",
                                )}:</span
                            >
                            <span
                                class="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[10px] font-black"
                                >{data.billingSummary?.totalActs || 0}</span
                            >
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-400"
                                >{$t(
                                    "patient_details.billing_summary.already_invoiced",
                                )}:</span
                            >
                            <span
                                class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-black"
                                >{data.billingSummary?.invoicedActs || 0}</span
                            >
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-400"
                                >{$t(
                                    "patient_details.billing_summary.remaining_to_invoice",
                                )}:</span
                            >
                            <span
                                class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-black"
                            >
                                {(data.billingSummary?.uninvoicedActs || 0) -
                                    invoiceSelection.length}
                            </span>
                        </div>
                    </div>
                    {#if invoiceSelection.length > 0}
                        <div
                            class="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse"
                        >
                            {$t(
                                "patient_details.billing_summary.selected_count",
                                { values: { count: invoiceSelection.length } },
                            )}
                        </div>
                    {/if}
                </div>

                <div class="flex-1 flex overflow-hidden">
                    <!-- Left Sidebar: History -->
                    <aside
                        class="w-1/3 border-r border-slate-100 bg-slate-50/30 overflow-y-auto p-4 space-y-4"
                    >
                        <div class="space-y-4">
                            <h4
                                class="text-xs font-black text-slate-400 uppercase tracking-widest pl-2"
                            >
                                Historique des Factures
                            </h4>
                            <div class="space-y-3">
                                {#each (data.invoices as any[]) || [] as inv}
                                    <div class="past-prescription-card group">
                                        <div
                                            class="flex justify-between font-bold text-slate-700 mb-1"
                                        >
                                            <span>{inv.invoice_number}</span>
                                            <span
                                                >{new Date(
                                                    inv.invoice_date,
                                                ).toLocaleDateString()}</span
                                            >
                                        </div>
                                        <div
                                            class="flex justify-between items-center mt-2"
                                        >
                                            <span
                                                class="text-base font-black text-slate-800"
                                            >
                                                {inv.total_amount.toFixed(2)}
                                                {data.config?.currencySymbol}
                                            </span>
                                            <span
                                                class="badge-small"
                                                class:bg-emerald-100={inv.status ===
                                                    "paid"}
                                                class:text-emerald-700={inv.status ===
                                                    "paid"}
                                            >
                                                {inv.status}
                                            </span>
                                        </div>
                                        <div
                                            class="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <button
                                                class="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                                                onclick={() =>
                                                    printInvoice(inv.id)}
                                            >
                                                Imprimer
                                            </button>
                                        </div>
                                    </div>
                                {:else}
                                    <p
                                        class="text-xs text-slate-400 italic pl-2"
                                    >
                                        Aucune facture précédente
                                    </p>
                                {/each}
                            </div>
                        </div>
                    </aside>

                    <!-- Main content: Treatment Selection -->
                    <main class="flex-1 flex flex-col bg-white overflow-hidden">
                        <div
                            class="p-4 border-b border-slate-100 flex flex-col gap-4 shrink-0"
                        >
                            <div class="flex justify-between items-center">
                                <h4
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest"
                                >
                                    Type de Facture
                                </h4>
                                <div
                                    class="flex bg-slate-100 p-0.5 rounded-lg gap-0.5"
                                >
                                    <button
                                        type="button"
                                        class="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all {invoiceType ===
                                        'detailed'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'}"
                                        onclick={() =>
                                            (invoiceType = "detailed")}
                                    >
                                        Détaillée
                                    </button>
                                    <button
                                        type="button"
                                        class="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all {invoiceType ===
                                        'global'
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'}"
                                        onclick={() => (invoiceType = "global")}
                                    >
                                        Globale
                                    </button>
                                </div>
                            </div>

                            {#if invoiceType === "global"}
                                <div transition:slide>
                                    <label
                                        for="global_desc"
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block"
                                    >
                                        Libellé de la prestation globale
                                    </label>
                                    <input
                                        id="global_desc"
                                        type="text"
                                        bind:value={invoiceGlobalDescription}
                                        class="w-full px-3 py-2 rounded-lg border border-slate-100 focus:border-blue-500 focus:outline-none font-bold text-sm text-slate-700 transition-all bg-slate-50/50"
                                    />
                                </div>
                            {/if}

                            <div class="flex justify-between items-center mt-2">
                                <h4
                                    class="text-xs font-black text-slate-400 uppercase tracking-widest"
                                >
                                    Actes non facturés
                                </h4>
                                <button
                                    class="text-xs font-bold text-indigo-600 hover:underline"
                                    onclick={selectAllTreatments}
                                >
                                    Tout sélectionner
                                </button>
                            </div>
                        </div>

                        <div class="flex-1 overflow-y-auto p-4">
                            <div class="space-y-3">
                                {#each (data.uninvoicedTreatments as any[]) || [] as treatment}
                                    <button
                                        class="w-full p-3 rounded-xl border transition-all text-left flex items-center justify-between {invoiceSelection.includes(
                                            treatment.unique_id,
                                        )
                                            ? 'border-indigo-500 bg-indigo-50/30'
                                            : 'border-slate-100 hover:border-indigo-200'}"
                                        onclick={() =>
                                            toggleTreatmentForInvoice(
                                                treatment.unique_id,
                                            )}
                                    >
                                        <div class="flex items-center gap-4">
                                            <div
                                                class="w-6 h-6 rounded-full border-2 flex items-center justify-center {invoiceSelection.includes(
                                                    treatment.unique_id,
                                                )
                                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                                    : 'border-slate-200'}"
                                            >
                                                {#if invoiceSelection.includes(treatment.unique_id)}
                                                    ✓
                                                {/if}
                                            </div>
                                            <div class="flex flex-col">
                                                <span
                                                    class="text-xs font-black text-slate-400 uppercase"
                                                >
                                                    {new Date(
                                                        treatment.treatment_date,
                                                    ).toLocaleDateString()}
                                                    {#if treatment.tooth_number}•
                                                        Dent {treatment.tooth_number}{/if}
                                                </span>
                                                <span
                                                    class="text-sm font-black text-slate-800"
                                                    >{treatment.description}</span
                                                >
                                            </div>
                                        </div>
                                        <span
                                            class="text-base font-black text-slate-800"
                                        >
                                            {treatment.amount.toFixed(2)}
                                            {data.config?.currencySymbol}
                                        </span>
                                    </button>
                                {:else}
                                    <div
                                        class="h-full flex flex-col items-center justify-center py-20 opacity-20"
                                    >
                                        <span class="text-8xl mb-4">✨</span>
                                        <p
                                            class="text-2xl font-black uppercase text-slate-600"
                                        >
                                            Tout est à jour
                                        </p>
                                        <p class="font-bold text-slate-400">
                                            Aucun acte à facturer pour le moment
                                        </p>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <!-- Footer -->
                        <div
                            class="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-4 shrink-0 items-center"
                        >
                            <div class="flex-1">
                                <div class="flex flex-col">
                                    <span
                                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2"
                                        >Total Sélectionné</span
                                    >
                                    <span
                                        class="text-2xl font-black text-slate-800"
                                    >
                                        {invoiceTotal.toFixed(2)}
                                        {data.config?.currencySymbol}
                                    </span>
                                </div>
                            </div>

                            <div class="w-1/3">
                                <form
                                    action="?/createInvoice"
                                    method="POST"
                                    use:enhance={() => {
                                        return async ({ result, update }) => {
                                            if (result.type === "success") {
                                                const invId = (
                                                    result.data as any
                                                )?.invoiceId;
                                                isInvoiceModalOpen = false;
                                                invoiceSelection = [];
                                                if (invId) printInvoice(invId);
                                            }
                                            await update();
                                        };
                                    }}
                                >
                                    <input
                                        type="hidden"
                                        name="patient_id"
                                        value={data.patient.id}
                                    />
                                    <input
                                        type="hidden"
                                        name="invoice_type"
                                        value={invoiceType}
                                    />
                                    <input
                                        type="hidden"
                                        name="global_description"
                                        value={invoiceGlobalDescription}
                                    />
                                    <input
                                        type="hidden"
                                        name="items"
                                        value={JSON.stringify(
                                            (
                                                (data.uninvoicedTreatments as any[]) ||
                                                []
                                            )
                                                .filter((t) =>
                                                    invoiceSelection.includes(
                                                        t.unique_id,
                                                    ),
                                                )
                                                .map((t) => ({
                                                    treatment_id:
                                                        t.treatment_id,
                                                    dental_treatment_id:
                                                        t.dental_treatment_id,
                                                    description: t.description,
                                                    amount: t.amount,
                                                })),
                                        )}
                                    />

                                    {#if invoiceSelection.length === 0}
                                        <div
                                            class="flex items-center gap-2 mb-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-700 text-xs font-bold animate-fade-in"
                                        >
                                            <span>⚠️</span>
                                            Veuillez sélectionner au moins un acte
                                            dans la liste pour générer votre facture.
                                        </div>
                                    {/if}

                                    <button
                                        type="submit"
                                        class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-base hover:bg-blue-700 hover:scale-[1.01] transition-all shadow-lg flex items-center justify-center gap-3 {invoiceShake
                                            ? 'animate-shake'
                                            : ''} {invoiceSelection.length === 0
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''}"
                                        onclick={handleGenerateInvoice}
                                    >
                                        <span class="text-xl">📝</span>
                                        Générer & Imprimer
                                    </button>
                                </form>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    {/if}

    {#if isLeftSidebarOpen || isNotesSidebarOpen}
        <button
            class="fixed inset-0 z-[90] bg-slate-900/10 backdrop-blur-[2px] cursor-default w-full h-full border-none p-0 m-0"
            onclick={() => {
                isLeftSidebarOpen = false;
                isNotesSidebarOpen = false;
            }}
            aria-label="Close sidebars"
            transition:fade={{ duration: 200 }}
        ></button>
    {/if}
</div>

<style>
    .journey-workspace {
        font-family: "Outfit", "Inter", sans-serif;
    }

    .identity-bar {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    }

    /* Unified Compact Design */

    .alert-box {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.75rem;
        border-radius: 1rem;
        border: 1px solid transparent;
        min-width: 110px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .alert-box .icon {
        font-size: 1.1rem;
    }
    .alert-box .label {
        font-size: 0.6rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.8;
    }
    .alert-box .value {
        font-weight: 900;
        font-size: 0.85rem;
        line-height: 1;
        letter-spacing: -0.02em;
    }

    .alert-box.critical {
        background: #fff1f2;
        border-color: #fecdd3;
        color: #e11d48;
    }

    .alert-box.warning {
        background: #fffbeb;
        border-color: #fef3c7;
        color: #d97706;
    }

    .alert-box.balance {
        background: #f0fdf4;
        border-color: #dcfce7;
        color: #16a34a;
        padding: 0rem 1.25rem;
    }

    .alert-box.balance.negative {
        background: #fef2f2;
        border-color: #fee2e2;
        color: #dc2626;
    }

    /* 2. Intelligent Timer */
    .timer-display {
        background: #0f172a;
        color: white;
        padding: 0.5rem 2rem;
        border-radius: 2rem;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4);
        border: 3px solid #1e293b;
        transition: all 0.5s ease;
    }

    .timer-display.green {
        border-color: #10b981;
        color: #10b981;
    }
    .timer-display.orange {
        border-color: #f59e0b;
        color: #f59e0b;
    }
    .timer-display.red {
        border-color: #ef4444;
        color: #ef4444;
        animation: pulse-red 2s infinite;
    }

    @keyframes pulse-red {
        0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        }
        70% {
            box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
    }

    /* 3. Action Grid & Group */
    .group-title {
        font-size: 0.7rem;
        font-weight: 900;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.15em;
        margin-bottom: 1rem;
    }

    .action-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }

    .pos-btn-compact {
        height: 52px;
        background: white;
        border: 1px solid #f1f5f9;
        border-radius: 1rem;
        display: flex;
        align-items: center;
        padding: 0 0.75rem;
        gap: 0.75rem;
        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1);
        box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.05);
        width: 100%;
        text-align: left;
    }

    .dense {
        grid-template-columns: 1fr !important;
        gap: 0.5rem !important;
    }

    .pos-btn-compact:hover {
        transform: translateX(4px);
        border-color: var(--color);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .pos-btn-compact .icon {
        font-size: 1.25rem;
        flex-shrink: 0;
    }

    .pos-btn-compact .label {
        font-weight: 900;
        font-size: 0.75rem;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    /* 4. Collapsed Sidebar Styling */
    .action-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 1.25rem;
        background: white;
        border: 2px solid #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        cursor: pointer;
        position: relative;
    }

    .action-icon::after {
        content: "";
        position: absolute;
        top: -10px;
        left: -10px;
        right: -10px;
        bottom: -10px;
    }

    .action-icon:hover:not(:disabled) {
        transform: scale(1.15) rotate(5deg);
        border-color: var(--color, #6366f1);
        color: var(--color, #6366f1);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 10;
    }

    .action-icon:active:not(:disabled) {
        transform: scale(0.9);
    }

    .action-icon:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        filter: grayscale(1);
    }

    .action-icon.toggle-btn {
        margin-bottom: 1rem;
        border-color: #e2e8f0;
        color: #94a3b8;
    }

    .action-icon.toggle-btn:hover {
        background: #f8fafc;
        color: #6366f1;
        border-color: #6366f1;
    }

    .action-icon.status-scheduled {
        --color: #64748b;
        background: #f8fafc;
    }
    .action-icon.status-cancelled {
        --color: #e11d48;
        background: #fff1f2;
        border-color: #fecdd3;
    }
    .action-icon.status-reschedule {
        --color: #4f46e5;
        background: #eef2ff;
        border-color: #c7d2fe;
    }

    /* 4. Status Actions (Exceptions) */
    .status-action-btn {
        padding: 0.75rem;
        border-radius: 1rem;
        font-weight: 900;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 2px solid transparent;
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .status-action-btn:hover:not(:disabled) {
        transform: translateY(-3px) scale(1.03);
        box-shadow: 0 10px 15px -10px rgba(0, 0, 0, 0.1);
    }

    .status-action-btn:active:not(:disabled) {
        transform: scale(0.95);
    }

    .status-action-btn.postponed {
        background: #f8fafc;
        color: #64748b;
        border-color: #e2e8f0;
    }
    .status-action-btn.cancelled {
        background: #fff1f2;
        color: #e11d48;
        border-color: #fecdd3;
    }
    .status-action-btn.reschedule {
        background: #eef2ff;
        color: #4f46e5;
        border-color: #c7d2fe;
    }

    .status-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .status-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        filter: grayscale(0.5);
    }

    /* 5. Lab Tracking */
    .lab-tracking-container {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .lab-item {
        background: white;
        padding: 1rem;
        border-radius: 1.25rem;
        border: 2px solid #f1f5f9;
        transition: all 0.2s;
    }

    .lab-item.received {
        border-color: #10b981;
        background: #f0fdf4;
    }
    .lab-item.ordered {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .status-pill {
        font-size: 0.55rem;
        font-weight: 900;
        text-transform: uppercase;
        padding: 0.1rem 0.4rem;
        border-radius: 0.4rem;
        background: #f1f5f9;
        color: #64748b;
    }

    /* 6. Post-it Notes */
    .post-it {
        padding: 0.75rem;
        border-radius: 1rem;
        box-shadow: 0 5px 10px -2px rgba(0, 0, 0, 0.05);
        transform: rotate(1deg);
        transition: all 0.3s;
    }

    .post-it:hover {
        transform: scale(1.02) rotate(0deg);
        z-index: 40;
    }

    .post-it.critical {
        background: #fee2e2;
        border-left: 5px solid #ef4444;
        color: #991b1b;
    }
    .post-it.high {
        background: #fef3c7;
        border-left: 5px solid #f59e0b;
        color: #92400e;
    }
    .post-it.low {
        background: #f0f9ff;
        border-left: 5px solid #0ea5e9;
        color: #075985;
    }

    .importance-badge {
        font-size: 0.55rem;
        font-weight: 900;
        text-transform: uppercase;
        padding: 0.15rem 0.4rem;
        border-radius: 0.4rem;
        background: rgba(0, 0, 0, 0.05);
    }

    .note-text {
        font-weight: 600;
        font-size: 0.75rem;
        line-height: 1.3;
    }

    .btn-add-note-floating {
        background: #1e293b;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 1.5rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 800;
        transition: all 0.2s;
    }

    .btn-add-note-floating:hover {
        background: #0f172a;
        transform: scale(1.05);
    }

    /* 7. Modal & Forms */
    .importance-selector {
        padding: 1rem;
        border-radius: 1.25rem;
        text-align: center;
        border: 3px solid #f1f5f9;
        cursor: pointer;
        transition: all 0.2s;
        background: #f8fafc;
    }

    .importance-selector.active {
        transform: scale(1.05);
        border-color: currentColor;
    }
    .importance-selector.low {
        color: #0ea5e9;
    }
    .importance-selector.high {
        color: #f59e0b;
    }
    .importance-selector.critical {
        color: #ef4444;
    }

    .writing-vertical-rl {
        writing-mode: vertical-rl;
    }

    /* Planned Acts Alert */
    .planned-acts-alert {
        background: #eef2ff;
        border: 2px solid #c7d2fe;
        padding: 1.25rem;
        border-radius: 1.5rem;
    }

    @keyframes bounce-subtle {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }

    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        25% {
            transform: translateX(-5px);
        }
        50% {
            transform: translateX(5px);
        }
        75% {
            transform: translateX(-5px);
        }
    }

    .animate-shake {
        animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-in {
        animation: fadeIn 0.3s ease-out forwards;
    }

    .animate-bounce-subtle {
        animation: bounce-subtle 4s infinite ease-in-out;
    }

    /* 8. Player-style Visit Controls */
    .btn-commencer,
    .btn-terminer {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.5rem;
        border-radius: 99px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.85rem;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        color: white;
    }

    .btn-commencer {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .btn-commencer:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
    }

    .btn-commencer.warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
    }

    .btn-terminer {
        background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
        box-shadow: 0 4px 15px rgba(244, 63, 94, 0.3);
    }

    .btn-terminer:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 25px rgba(244, 63, 94, 0.4);
    }

    .control-icon {
        font-size: 1.2rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
    }

    /* 9. Prescription UI Classes */
    .prescription-item-row {
        background: #f8fafc;
        border: 2px solid #f1f5f9;
        border-radius: 1.25rem;
        padding: 1.25rem;
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 2fr auto;
        gap: 1.5rem;
        align-items: center;
        transition: all 0.2s;
    }
    .prescription-item-row:hover {
        border-color: #8b5cf6;
        background: white;
        box-shadow: 0 10px 15px -10px rgba(139, 92, 246, 0.1);
    }
    .template-card {
        background: white;
        border: 2px solid #f1f5f9;
        border-radius: 1.25rem;
        padding: 1rem;
        text-align: left;
        transition: all 0.2s;
        cursor: pointer;
        width: 100%;
        display: block;
    }
    .template-card:hover {
        border-color: #8b5cf6;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .past-prescription-card {
        background: white;
        border: 2px solid #f1f5f9;
        border-radius: 1.25rem;
        padding: 1rem;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .past-prescription-card:hover {
        background: #f1f5f9;
        color: #8b5cf6;
        border-color: #c7d2fe;
    }
</style>
