<script lang="ts">
    let { data } = $props();
</script>

<svelte:head>
    <title>Facture - {data.invoice.invoice_number}</title>
</svelte:head>

<div class="print-container bg-white min-h-screen p-12 max-w-4xl mx-auto text-gray-900 font-sans">
    <!-- Header -->
    <div class="flex justify-between items-start mb-12">
        <div>
            <h1 class="text-3xl font-extrabold text-indigo-900 mb-2">FACTURE</h1>
            <p class="text-xl font-bold text-gray-700">{data.invoice.invoice_number}</p>
            <p class="text-sm text-gray-500 mt-1">Date : {new Date(data.invoice.invoice_date).toLocaleDateString()}</p>
        </div>
        <div class="text-right">
            <h2 class="text-xl font-bold uppercase tracking-wider">DENTISTICO</h2>
            <p class="text-sm text-gray-600">Cabinet Dentaire</p>
            <p class="text-xs text-gray-500">123 Rue de la Santé, Paris</p>
            <p class="text-xs text-gray-500">SIRET: 123 456 789 00012</p>
        </div>
    </div>

    <!-- Patient / Client Info -->
    <div class="grid grid-cols-2 gap-8 mb-12">
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-100">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Facturé à :</h3>
            <p class="text-lg font-bold">{data.invoice.patient_name}</p>
            <p class="text-sm text-gray-600 mt-1">
                {data.invoice.patient_address || ''}<br>
                {data.invoice.patient_city || ''}
            </p>
        </div>
        <div class="flex flex-col justify-center text-right">
            <div class={`inline-block ml-auto px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${data.invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                Statut : {data.invoice.status === 'paid' ? 'Payée' : 'En attente'}
            </div>
        </div>
    </div>

    <!-- Items Table -->
    <table class="min-w-full mb-12">
        <thead class="bg-gray-900 text-white">
            <tr>
                <th class="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">Désignation</th>
                <th class="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">Dent</th>
                <th class="px-6 py-4 text-right text-sm font-semibold uppercase tracking-wider">Montant</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 border-b border-gray-200">
            {#each data.invoice.items as item}
                <tr>
                    <td class="px-6 py-4 text-sm text-gray-900 font-medium">{item.description}</td>
                    <td class="px-6 py-4 text-center text-sm text-gray-500">{item.tooth_number || '-'}</td>
                    <td class="px-6 py-4 text-right text-sm font-bold">€{item.amount.toFixed(2)}</td>
                </tr>
            {/each}
        </tbody>
    </table>

    <!-- Totals -->
    <div class="flex justify-end">
        <div class="w-64 space-y-3">
            <div class="flex justify-between text-sm text-gray-600">
                <span>Total HT</span>
                <span>€{data.invoice.total_amount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
                <span>TVA (0%)</span>
                <span>€0.00</span>
            </div>
            <div class="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                <span>TOTAL TTC</span>
                <span>€{data.invoice.total_amount.toFixed(2)}</span>
            </div>
            
            {#if data.invoice.status === 'paid'}
                <div class="flex justify-between text-sm font-bold text-green-600 italic">
                    <span>Montant Payé</span>
                    <span>€{data.invoice.total_amount.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-sm font-bold text-gray-900 border-t-2 border-double border-gray-900 pt-2">
                    <span>Reste à Charge</span>
                    <span>€0.00</span>
                </div>
            {:else}
                <div class="flex justify-between text-sm font-bold text-red-600">
                    <span>Reste à Charge</span>
                    <span>€{data.invoice.total_amount.toFixed(2)}</span>
                </div>
            {/if}
        </div>
    </div>

    <!-- Footer -->
    <div class="mt-24 pt-8 border-t border-gray-100 text-center">
        <p class="text-xs text-gray-400 mb-2">Exonération de TVA, article 261-4-1° du CGI.</p>
        <p class="text-sm font-semibold text-gray-700">Merci de votre confiance.</p>
    </div>

    <!-- Print Button (Visible only on screen) -->
    <div class="fixed bottom-8 right-8 no-print">
        <button 
            onclick={() => window.print()}
            class="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 flex items-center gap-2"
        >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 012-2H5a2 2 0 012 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimer la facture
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
    
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
    
    :global(body) {
        font-family: 'Outfit', sans-serif;
    }
</style>
