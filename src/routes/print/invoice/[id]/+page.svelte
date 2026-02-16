<script lang="ts">
    import { onMount } from "svelte";

    let { data } = $props();

    onMount(() => {
        setTimeout(() => {
            window.print();
        }, 500);
    });

    const clinic = $derived(data.config || {});
    const invoice = $derived(data.invoice);
    const items = $derived(invoice.items || []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-DZ", {
            style: "currency",
            currency: "DZD",
        }).format(amount);
    };

    const subtotal = $derived(
        items.reduce(
            (acc: number, item: any) => acc + item.unit_price * item.quantity,
            0,
        ),
    );
    const totalAmount = $derived(invoice.total_amount || subtotal);
    const amountPaid = $derived(invoice.amount_paid || 0);
    const balanceDue = $derived(totalAmount - amountPaid);
</script>

<svelte:head>
    <title>Facture - {invoice.patient_name}</title>
</svelte:head>

<div class="a4-page p-[20mm] flex flex-col min-h-[297mm] text-gray-900">
    <!-- Header -->
    <header class="flex justify-between items-start mb-16">
        <div class="clinic-info">
            <div class="flex items-center gap-4 mb-4">
                {#if clinic.logo_data}
                    <img
                        src={clinic.logo_data}
                        alt="Logo"
                        class="h-16 w-auto object-contain"
                    />
                {:else if clinic.logo_url}
                    <img
                        src={clinic.logo_url}
                        alt="Logo"
                        class="h-16 w-auto object-contain"
                    />
                {/if}
                <h1
                    class="text-3xl font-black text-indigo-700 uppercase tracking-widest leading-none"
                >
                    {clinic.clinicName || "DENTISTICO"}
                </h1>
            </div>
            <p class="text-sm text-gray-400 font-bold mb-6">
                EXCELLENCE EN ETABLISSEMENT DENTAIRE
            </p>
            <div class="text-xs text-gray-600 space-y-1 font-semibold">
                <p>{clinic.address || "Adresse de la clinique"}</p>
                <p>Tél: {clinic.phone || "N° de téléphone"}</p>
                <p>Email: {clinic.email || "contact@clinic.com"}</p>
            </div>
        </div>

        <div class="doc-type-box text-right flex flex-col items-end">
            <div
                class="bg-indigo-900 text-white px-6 py-4 rounded-xl shadow-lg mb-6"
            >
                <h2 class="text-3xl font-black uppercase tracking-widest">
                    FACTURE
                </h2>
                <p class="text-[10px] font-black opacity-60 tracking-widest">
                    OFFICIAL INVOICE / REÇU
                </p>
            </div>
            <div class="text-right space-y-1">
                <p
                    class="text-xs font-black text-gray-400 uppercase tracking-widest"
                >
                    Numéro de Facture
                </p>
                <p class="text-xl font-black text-gray-900">
                    #{invoice.invoice_number || invoice.id}
                </p>
                <div class="h-px bg-indigo-100 w-24 ml-auto my-2"></div>
                <p
                    class="text-xs font-black text-gray-400 uppercase tracking-widest"
                >
                    Date d'émission
                </p>
                <p class="text-sm font-bold text-gray-800">
                    {new Date(
                        invoice.created_at || Date.now(),
                    ).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                    })}
                </p>
            </div>
        </div>
    </header>

    <!-- Info Grid -->
    <div class="grid grid-cols-2 gap-12 mb-16">
        <div>
            <h3
                class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4"
            >
                FACTURE À (CLIENT)
            </h3>
            <div class="border-l-4 border-indigo-600 pl-6">
                <p class="text-xl font-black text-gray-900 mb-1">
                    {invoice.patient_name}
                </p>
                <p class="text-sm text-gray-600 font-medium">
                    {invoice.patient_address || "Adresse non renseignée"}
                </p>
                {#if invoice.patient_city}
                    <p class="text-sm text-gray-600 font-medium">
                        {invoice.patient_city}
                    </p>
                {/if}
            </div>
        </div>

        <div class="flex flex-col justify-end">
            <div
                class="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex justify-between items-center"
            >
                <div>
                    <p
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none"
                    >
                        Statut du Paiement
                    </p>
                    <p
                        class="text-lg font-black mt-2 {balanceDue <= 0
                            ? 'text-emerald-600'
                            : 'text-amber-600'}"
                    >
                        {balanceDue <= 0 ? "✓ RÉGLÉE" : "⚠ EN ATTENTE"}
                    </p>
                </div>
                <div class="text-right">
                    <p
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none"
                    >
                        Reste à Payer
                    </p>
                    <p class="text-xl font-black mt-1 text-gray-900">
                        {formatCurrency(balanceDue)}
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Data Table -->
    <main class="flex-grow">
        <table class="w-full">
            <thead>
                <tr class="bg-gray-900 text-white">
                    <th
                        class="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest rounded-l-xl"
                        >DÉSIGNATION / ACTE DENTAIRE</th
                    >
                    <th
                        class="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest"
                        >QTÉ</th
                    >
                    <th
                        class="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest"
                        >PRIX UNITAIRE</th
                    >
                    <th
                        class="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest rounded-r-xl"
                        >TOTAL</th
                    >
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
                {#each items as item}
                    <tr class="group">
                        <td class="px-6 py-5">
                            <p
                                class="font-black text-gray-900 uppercase tracking-tight"
                            >
                                {item.description}
                            </p>
                            {#if item.notes}
                                <p
                                    class="text-[10px] text-gray-400 font-bold mt-1 italic"
                                >
                                    {item.notes}
                                </p>
                            {/if}
                        </td>
                        <td
                            class="px-6 py-5 text-center font-bold text-gray-600"
                        >
                            {item.quantity}
                        </td>
                        <td
                            class="px-6 py-5 text-right font-black text-gray-900"
                        >
                            {formatCurrency(item.unit_price)}
                        </td>
                        <td
                            class="px-6 py-5 text-right font-black text-indigo-600"
                        >
                            {formatCurrency(item.unit_price * item.quantity)}
                        </td>
                    </tr>
                {:else}
                    <tr>
                        <td
                            colspan="4"
                            class="px-6 py-12 text-center text-gray-400 italic"
                            >Aucun article enregistré.</td
                        >
                    </tr>
                {/each}
            </tbody>
        </table>
    </main>

    <!-- Totals Section -->
    <div class="mt-12 flex justify-end">
        <div class="w-80 space-y-3">
            <div
                class="flex justify-between items-center text-sm font-bold text-gray-500 px-2 uppercase tracking-widest"
            >
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
            </div>

            <div
                class="flex justify-between items-center text-sm font-bold text-emerald-600 px-2 uppercase tracking-widest"
            >
                <span>Total Payé</span>
                <span>{formatCurrency(amountPaid)}</span>
            </div>

            <div class="h-px bg-gray-200 my-2"></div>

            <div
                class="flex justify-between items-center px-6 py-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl"
            >
                <span
                    class="text-sm font-black text-indigo-900 uppercase tracking-widest"
                    >TOTAL DZD</span
                >
                <span class="text-2xl font-black text-indigo-700"
                    >{formatCurrency(totalAmount)}</span
                >
            </div>
        </div>
    </div>

    <!-- Legal Footer -->
    <footer class="mt-24 border-t border-gray-100 pt-8">
        <div
            class="grid grid-cols-2 gap-8 text-[9px] font-bold text-gray-400 uppercase tracking-widest"
        >
            <div>
                <p class="mb-2 text-gray-900">Notes & Conditions:</p>
                <p class="italic">
                    Cette facture est établie pour servir et valoir ce que de
                    droit. Les actes médicaux sont exonérés de TVA selon la
                    législation en vigueur.
                </p>
            </div>
            <div class="text-right">
                <p class="mb-2 text-gray-900">Signature Authorisée:</p>
                <p class="italic underline underline-offset-4">
                    Clinique {clinic.clinicName || "Dentistico"}
                </p>
            </div>
        </div>

        <div class="mt-12 pt-8 border-t border-gray-50 text-center">
            <p
                class="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em]"
            >
                {clinic.clinicName || "Dentistico"} • Document Fiscal • Support:
                {clinic.phone}
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
