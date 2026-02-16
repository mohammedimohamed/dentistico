<script lang="ts">
    import { onMount } from "svelte";

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
    const clinic = $derived(data.config || {});

    onMount(() => {
        setTimeout(() => {
            window.print();
        }, 500); // Allow dynamic content like logos to render
    });
</script>

<svelte:head>
    <title>Ordonnance - {data.prescription.patient_name}</title>
</svelte:head>

<div class="a4-page p-[20mm] flex flex-col min-h-[297mm]">
    <!-- Header -->
    <header
        class="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-8"
    >
        <div class="clinic-info">
            <div class="flex items-center gap-4 mb-3">
                {#if clinic.logo_data}
                    <img
                        src={clinic.logo_data}
                        alt="Logo"
                        class="h-14 w-auto object-contain"
                    />
                {:else if clinic.logo_url}
                    <!-- Fallback to logo_url assuming it's a local static path -->
                    <img
                        src={clinic.logo_url}
                        alt="Logo"
                        class="h-14 w-auto object-contain"
                    />
                {/if}
                <h1
                    class="text-2xl font-black text-indigo-700 uppercase tracking-widest leading-none"
                >
                    {clinic.clinicName || "DENTISTICO"}
                </h1>
            </div>
            <p class="text-xs text-gray-500 font-medium">
                Centre Médico-Dentaire Professionnel
            </p>
            <div
                class="mt-4 text-xs text-gray-600 leading-relaxed font-semibold"
            >
                <p>{clinic.address || "Adresse de la clinique"}</p>
                <p>Tél: {clinic.phone || "N° de téléphone"}</p>
                <p>Email: {clinic.email || "contact@clinic.com"}</p>
            </div>
        </div>

        <div class="doctor-info text-right">
            <h2
                class="text-xl font-black text-gray-900 uppercase tracking-tight mb-1"
            >
                DR. {data.prescription.doctor_name || "MEDECIN"}
            </h2>
            <p class="text-sm font-bold text-indigo-600 mb-4">
                {data.prescription.doctor_specialties || "Chirurgien-Dentiste"}
            </p>
            <div class="text-xs text-gray-500 font-medium">
                <p>
                    Date: {new Date(
                        data.prescription.prescription_date,
                    ).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                    })}
                </p>
                <p>Nº: {data.prescription.prescription_number || "---"}</p>
            </div>
        </div>
    </header>

    <!-- Patient Bar -->
    <div
        class="bg-gray-50 border border-gray-100 rounded-xl px-6 py-4 flex justify-between items-center mb-12 shadow-sm"
    >
        <div class="flex items-center gap-2">
            <span
                class="text-[10px] font-black text-gray-400 uppercase tracking-widest"
                >Patient:</span
            >
            <span class="text-base font-black text-gray-900"
                >{data.prescription.patient_name}</span
            >
        </div>
        <div class="flex gap-8">
            <div class="flex items-center gap-2">
                <span
                    class="text-[10px] font-black text-gray-400 uppercase tracking-widest"
                    >Age:</span
                >
                <span class="text-sm font-bold text-gray-700">{age} Ans</span>
            </div>
            <div class="flex items-center gap-2">
                <span
                    class="text-[10px] font-black text-gray-400 uppercase tracking-widest"
                    >Sexe:</span
                >
                <span class="text-sm font-bold text-gray-700 capitalize"
                    >{data.prescription.patient_gender || "N/A"}</span
                >
            </div>
        </div>
    </div>

    <!-- Title -->
    <div class="text-center mb-12">
        <h2
            class="inline-block border-b-4 border-indigo-600 pb-1 text-3xl font-black text-gray-900 uppercase tracking-[0.2em]"
        >
            ORDONNANCE
        </h2>
    </div>

    <!-- Medication List -->
    <main class="flex-grow">
        <div class="space-y-6">
            {#each data.prescription.items as item, i}
                <div class="medication-item pl-4 border-l-4 border-indigo-50">
                    <div class="flex justify-between items-baseline mb-1">
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-black text-indigo-300"
                                >#{i + 1}</span
                            >
                            <h3
                                class="text-lg font-black text-gray-900 uppercase tracking-tight"
                            >
                                {item.medication_name}
                            </h3>
                        </div>
                        {#if item.dosage}
                            <span
                                class="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"
                            >
                                {item.dosage}
                            </span>
                        {/if}
                    </div>

                    <div class="pl-10">
                        {#if item.instructions}
                            <p class="text-gray-700 font-medium italic mb-2">
                                {item.instructions}
                            </p>
                        {/if}
                        {#if item.duration}
                            <div
                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 border border-slate-200 uppercase tracking-widest"
                            >
                                ⏱️ Pendant {item.duration}
                            </div>
                        {/if}
                    </div>
                </div>
            {:else}
                <p class="text-center text-gray-400 italic py-12">
                    Aucun médicament prescrit.
                </p>
            {/each}
        </div>

        {#if data.prescription.notes}
            <div
                class="mt-16 p-4 bg-amber-50/50 border border-amber-100 rounded-xl"
            >
                <span
                    class="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-2"
                    >Instructions Complémentaires:</span
                >
                <p class="text-sm text-gray-700 font-medium italic">
                    {data.prescription.notes}
                </p>
            </div>
        {/if}
    </main>

    <!-- Footer / Signature -->
    <footer class="mt-auto pt-12">
        <div class="flex justify-end mb-12">
            <div class="signature-box text-center">
                <p
                    class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-16"
                >
                    Signature & Cachet du Praticien
                </p>
                <div
                    class="w-64 h-24 border-2 border-dashed border-gray-100 rounded-2xl mb-4 mx-auto"
                ></div>
                <p class="text-sm font-black text-indigo-900 uppercase">
                    Dr. {data.prescription.doctor_name}
                </p>
            </div>
        </div>

        <div class="border-t border-gray-100 pt-6 text-center">
            <p
                class="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]"
            >
                Documents généré par {clinic.clinicName || "Dentistico"} Management
                System • {new Date().getFullYear()}
            </p>
        </div>
    </footer>
</div>

<style>
    .a4-page {
        width: 210mm;
        margin: 0 auto;
        box-sizing: border-box;
    }

    @media print {
        .a4-page {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 20mm;
        }
    }
</style>
