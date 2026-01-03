<script lang="ts">
    import type { PageData } from './$types';
    import { APP_CONFIG } from '$lib/config/app.config';

    let { data }: { data: PageData } = $props();

    let search = $state(data.search);
    let startDate = $state(data.startDate);
    let endDate = $state(data.endDate);

    function exportToCSV() {
        const headers = ['Invoice Number', 'Patient Name', 'Date', 'Total Amount', 'Status'];
        const rows = data.invoices.map((inv: any) => [
            inv.invoice_number,
            inv.patient_name,
            new Date(inv.invoice_date).toLocaleDateString(),
            inv.total_amount.toFixed(2),
            inv.status
        ]);

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map((e: any) => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
</script>

<div class="p-4 sm:p-6 lg:p-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h2 class="text-2xl font-black text-gray-900">Billing History</h2>
            <p class="text-gray-500 text-sm">Review and export client invoices</p>
        </div>
        <button 
            onclick={exportToCSV}
            class="bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 font-bold shadow-lg shadow-green-100 transition-all flex items-center gap-2"
        >
            <span>📊</span> Export CSV
        </button>
    </div>

    <!-- Filters -->
    <div class="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 mb-8">
        <form class="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div class="md:col-span-2">
                <label for="search" class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Search Patient or Invoice #</label>
                <input 
                    type="text" 
                    name="search" 
                    id="search" 
                    bind:value={search}
                    placeholder="Ex: Alice Smith or FAC-2024-0001"
                    class="w-full border-gray-100 bg-gray-50 p-3 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                >
            </div>
            <div>
                <label for="startDate" class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">From</label>
                <input 
                    type="date" 
                    name="startDate" 
                    id="startDate" 
                    bind:value={startDate}
                    class="w-full border-gray-100 bg-gray-50 p-3 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                >
            </div>
            <div>
                <label for="endDate" class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">To</label>
                <input 
                    type="date" 
                    name="endDate" 
                    id="endDate" 
                    bind:value={endDate}
                    class="w-full border-gray-100 bg-gray-50 p-3 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                >
            </div>
            <div class="md:col-span-4 flex justify-end gap-3 pt-2">
                <a href="/assistant/invoices" class="text-xs font-bold text-gray-400 hover:text-gray-600 self-center mr-4">Reset Filters</a>
                <button type="submit" class="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all">
                    Apply Filters
                </button>
            </div>
        </form>
    </div>

    <!-- Invoices Table -->
    <div class="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
        <table class="min-w-full divide-y divide-gray-100">
            <thead class="bg-gray-50/50">
                <tr>
                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Number</th>
                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient</th>
                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                    <th class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th class="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
                {#each data.invoices as invoice}
                    <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900">
                            <span class="bg-gray-100 px-2 py-1 rounded-lg">{invoice.invoice_number}</span>
                        </td>
                        <td class="px-6 py-5 whitespace-nowrap text-sm font-bold text-indigo-600">
                            <a href="/doctor/patients/{invoice.patient_id}" class="hover:underline">{invoice.patient_name}</a>
                        </td>
                        <td class="px-6 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                        <td class="px-6 py-5 whitespace-nowrap text-sm font-black text-gray-900">{APP_CONFIG.currencySymbol}{invoice.total_amount.toFixed(2)}</td>
                        <td class="px-6 py-5 whitespace-nowrap">
                            <span class="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full 
                                {invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                                {invoice.status}
                            </span>
                        </td>
                        <td class="px-6 py-5 whitespace-nowrap text-right">
                            <a href="/print/invoice/{invoice.id}" target="_blank" class="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                                ⎙ Print
                            </a>
                        </td>
                    </tr>
                {:else}
                    <tr>
                        <td colspan="6" class="px-6 py-20 text-center text-gray-400 italic font-medium">
                            No billing records found matching your selection.
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
