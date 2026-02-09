<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import Header from "$lib/components/Header.svelte";
    import { page } from "$app/state";
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import { goto } from "$app/navigation";

    import { NAVIGATION } from "$lib/config/navigation";
    let { data }: { data: any } = $props();

    const navItems = $derived(
        data.user.role === "doctor"
            ? NAVIGATION.doctor
            : data.user.role === "admin"
              ? NAVIGATION.admin
              : NAVIGATION.assistant,
    );

    // Modal States
    let isEntryModalOpen = $state(false);
    let isUsageModalOpen = $state(false);
    let isProductModalOpen = $state(false);
    let isSupplierModalOpen = $state(false);
    let isEditBatchModalOpen = $state(false);
    let isAdjustStockModalOpen = $state(false);

    let selectedProduct = $state<any>(null);
    let selectedBatch = $state<any>(null);
    let expandedProductId = $state<number | null>(null);

    // Real-time Entry Calc
    let entryQty = $state(0);
    let entryCost = $state(0);
    const entryTotalValue = $derived(entryQty * entryCost);

    // Filters
    let filters = $state({
        search: "",
        status: "",
        supplier_id: "" as string | number,
        expiration: "",
    });

    $effect(() => {
        filters.search = data.filters.search || "";
        filters.status = data.filters.status || "";
        filters.supplier_id = data.filters.supplier_id || "";
        filters.expiration = data.filters.expiration || "";
    });

    function applyFilters() {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.status) params.set("status", filters.status);
        if (filters.supplier_id)
            params.set("supplier_id", filters.supplier_id.toString());
        if (filters.expiration) params.set("expiration", filters.expiration);
        goto(`?${params.toString()}`, { keepFocus: true });
    }

    function toggleProduct(id: number) {
        expandedProductId = expandedProductId === id ? null : id;
    }
</script>

<PortalShell
    {navItems}
    userName={data.user.full_name}
    headerTitle="inventory.title"
    roleLabel={data.user?.role === "doctor"
        ? "common.doctor"
        : data.user?.role === "admin"
          ? "common.admin"
          : "common.assistant"}
>
    {#snippet headerChildren()}
        <div class="flex gap-2">
            {#if data.user.role === "admin" || (data.user.role === "doctor" && data.clinicSettings?.allow_doctor_create_supplier === 1) || (data.user.role === "assistant" && data.clinicSettings?.allow_assistant_create_supplier === 1)}
                <button
                    onclick={() => (isSupplierModalOpen = true)}
                    class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all font-sans"
                >
                    + Supplier
                </button>
            {/if}
            {#if data.user.role === "admin" || (data.user.role === "doctor" && data.clinicSettings?.allow_doctor_create_product === 1) || (data.user.role === "assistant" && data.clinicSettings?.allow_assistant_create_product === 1)}
                <button
                    onclick={() => (isProductModalOpen = true)}
                    class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-all font-sans"
                >
                    + Product
                </button>
            {/if}
        </div>
    {/snippet}

    <div class="space-y-6">
        <!-- KPI Dashboard -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div
                class="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5"
            >
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-indigo-50 rounded-xl p-3">
                        <span class="text-2xl">💰</span>
                    </div>
                    <div class="ml-5 w-0 flex-1 text-start">
                        <dl>
                            <dt
                                class="text-sm font-medium text-gray-500 truncate"
                            >
                                Inventory Value
                            </dt>
                            <dd class="text-lg font-bold text-gray-900">
                                {data.kpis.totalValue.toLocaleString()} دج
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>

            <div
                class="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5"
            >
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-orange-50 rounded-xl p-3">
                        <span class="text-2xl">⏳</span>
                    </div>
                    <div class="ml-5 w-0 flex-1 text-start">
                        <dl>
                            <dt
                                class="text-sm font-medium text-gray-500 truncate"
                            >
                                Expiring Soon
                            </dt>
                            <dd class="text-lg font-bold text-orange-600">
                                {data.kpis.expiringSoon}
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>

            <div
                class="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5"
            >
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-red-50 rounded-xl p-3">
                        <span class="text-2xl">💀</span>
                    </div>
                    <div class="ml-5 w-0 flex-1 text-start">
                        <dl>
                            <dt
                                class="text-sm font-medium text-gray-500 truncate"
                            >
                                Expired
                            </dt>
                            <dd class="text-lg font-bold text-red-600">
                                {data.kpis.expired}
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>

            <div
                class="bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-100 p-5"
            >
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-yellow-50 rounded-xl p-3">
                        <span class="text-2xl">📉</span>
                    </div>
                    <div class="ml-5 w-0 flex-1 text-start">
                        <dl>
                            <dt
                                class="text-sm font-medium text-gray-500 truncate"
                            >
                                Low Stock
                            </dt>
                            <dd class="text-lg font-bold text-yellow-600">
                                {data.kpis.lowStock}
                            </dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="relative">
                    <input
                        type="text"
                        bind:value={filters.search}
                        oninput={applyFilters}
                        placeholder="Search product, barcode or batch..."
                        class="w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm h-12"
                    />
                    <span class="absolute left-3 top-3.5 text-gray-400">🔍</span
                    >
                </div>

                <select
                    bind:value={filters.status}
                    onchange={applyFilters}
                    class="rounded-xl border-gray-200 text-sm h-12"
                >
                    <option value="">All Statuses</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>

                <select
                    bind:value={filters.supplier_id}
                    onchange={applyFilters}
                    class="rounded-xl border-gray-200 text-sm h-12"
                >
                    <option value="">All Suppliers</option>
                    {#each data.suppliers as s}
                        <option value={s.id}>{s.name}</option>
                    {/each}
                </select>

                <select
                    bind:value={filters.expiration}
                    onchange={applyFilters}
                    class="rounded-xl border-gray-200 text-sm h-12"
                >
                    <option value="">Expiration Filter</option>
                    <option value="soon">Expires Soon (&lt;30d)</option>
                    <option value="expired">Already Expired</option>
                </select>
            </div>
        </div>

        <!-- Inventory List -->
        <div
            class="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100"
        >
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th
                            class="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase tracking-wider w-10"
                        ></th>
                        <th
                            class="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >Product</th
                        >
                        <th
                            class="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >Category</th
                        >
                        <th
                            class="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >Total Stock</th
                        >
                        <th
                            class="px-6 py-4 text-start text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >Unit</th
                        >
                        <th
                            class="px-4 py-4 text-end text-xs font-bold text-gray-500 uppercase tracking-wider"
                            >Actions</th
                        >
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    {#each data.inventory as product (product.id)}
                        <tr
                            class="hover:bg-gray-50 transition-colors cursor-pointer {expandedProductId ===
                            product.id
                                ? 'bg-indigo-50/30'
                                : ''}"
                            onclick={() => toggleProduct(product.id)}
                        >
                            <td class="px-6 py-5 text-center">
                                <span
                                    class="text-gray-400 transition-transform duration-200 {expandedProductId ===
                                    product.id
                                        ? 'rotate-90 block'
                                        : 'block'}">▶</span
                                >
                            </td>
                            <td class="px-6 py-5">
                                <div class="text-base font-bold text-gray-900">
                                    {product.name}
                                </div>
                                <div
                                    class="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5"
                                >
                                    {product.barcode || "No Barcode"}
                                </div>
                            </td>
                            <td class="px-6 py-5">
                                <span
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                    {product.category}
                                </span>
                            </td>
                            <td class="px-6 py-5 text-center">
                                <span
                                    class="text-lg font-black {product.total_quantity <=
                                    product.min_threshold
                                        ? 'text-red-600'
                                        : 'text-gray-900'}"
                                >
                                    {product.total_quantity}
                                </span>
                            </td>
                            <td
                                class="px-6 py-5 text-sm text-gray-500 font-medium"
                                >{product.unit}</td
                            >
                            <td
                                class="px-4 py-5 text-end space-x-2"
                                onclick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onclick={() => {
                                        selectedProduct = product;
                                        entryQty = 0;
                                        entryCost = 0;
                                        isEntryModalOpen = true;
                                    }}
                                    class="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
                                    >+ Stock Entry</button
                                >
                                <button
                                    onclick={() => {
                                        selectedProduct = product;
                                        isUsageModalOpen = true;
                                    }}
                                    class="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all shadow-sm"
                                    disabled={product.total_quantity === 0}
                                    >- Real Usage</button
                                >
                            </td>
                        </tr>
                        {#if expandedProductId === product.id}
                            <tr class="bg-gray-50/50">
                                <td colspan="6" class="px-8 py-6">
                                    <div
                                        class="overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white"
                                    >
                                        <table
                                            class="min-w-full divide-y divide-gray-200"
                                        >
                                            <thead class="bg-gray-50">
                                                <tr>
                                                    <th
                                                        class="px-4 py-3 text-start text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                                        >Batch #</th
                                                    >
                                                    <th
                                                        class="px-4 py-3 text-start text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                                        >Exp. Date</th
                                                    >
                                                    <th
                                                        class="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                                        >Current Qty</th
                                                    >
                                                    <th
                                                        class="px-4 py-3 text-end text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                                        >Unit Cost</th
                                                    >
                                                    <th
                                                        class="px-4 py-3 text-start text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                                        >Supplier</th
                                                    >
                                                    <th
                                                        class="px-4 py-3 text-end text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                                                        >Actions</th
                                                    >
                                                </tr>
                                            </thead>
                                            <tbody
                                                class="divide-y divide-gray-100"
                                            >
                                                {#each product.batches as batch}
                                                    <tr
                                                        class="hover:bg-gray-50 transition-colors"
                                                    >
                                                        <td
                                                            class="px-4 py-3 text-sm font-bold text-gray-900"
                                                            >{batch.batch_number}</td
                                                        >
                                                        <td class="px-4 py-3">
                                                            <span
                                                                class="text-sm font-bold {new Date(
                                                                    batch.expiration_date,
                                                                ) < new Date()
                                                                    ? 'text-red-600'
                                                                    : new Date(
                                                                            batch.expiration_date,
                                                                        ) <
                                                                        new Date(
                                                                            Date.now() +
                                                                                30 *
                                                                                    24 *
                                                                                    60 *
                                                                                    60 *
                                                                                    1000,
                                                                        )
                                                                      ? 'text-orange-500'
                                                                      : 'text-gray-700'}"
                                                            >
                                                                {batch.expiration_date}
                                                                {#if new Date(batch.expiration_date) < new Date()}
                                                                    <span
                                                                        class="ml-1 text-[8px] bg-red-100 text-red-600 px-1 rounded uppercase tracking-tighter"
                                                                        >Expired</span
                                                                    >
                                                                {/if}
                                                            </span>
                                                        </td>
                                                        <td
                                                            class="px-4 py-3 text-center font-black text-indigo-700"
                                                            >{batch.current_quantity}</td
                                                        >
                                                        <td
                                                            class="px-4 py-3 text-end font-mono text-xs"
                                                            >{batch.unit_cost.toLocaleString()}
                                                            دج</td
                                                        >
                                                        <td
                                                            class="px-4 py-3 text-xs text-gray-500"
                                                            >{batch.supplier_name ||
                                                                "Internal"}</td
                                                        >
                                                        <td
                                                            class="px-4 py-3 text-end space-x-2"
                                                        >
                                                            {#if data.user.role === "admin"}
                                                                <button
                                                                    onclick={() => {
                                                                        selectedBatch =
                                                                            batch;
                                                                        isEditBatchModalOpen = true;
                                                                    }}
                                                                    class="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                                                    title="Edit Metadata"
                                                                >
                                                                    ✏️
                                                                </button>
                                                                <button
                                                                    onclick={() => {
                                                                        selectedBatch =
                                                                            batch;
                                                                        isAdjustStockModalOpen = true;
                                                                    }}
                                                                    class="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                                                                    title="Adjust Quantity"
                                                                >
                                                                    📉
                                                                </button>
                                                            {:else}
                                                                <span
                                                                    class="text-[10px] text-gray-300 font-bold uppercase italic"
                                                                    >Admin Only</span
                                                                >
                                                            {/if}
                                                        </td>
                                                    </tr>
                                                {:else}
                                                    <tr>
                                                        <td
                                                            colspan="6"
                                                            class="px-4 py-8 text-center text-gray-400 italic text-sm"
                                                            >No active batches
                                                            for this product.</td
                                                        >
                                                    </tr>
                                                {/each}
                                            </tbody>
                                        </table>
                                    </div>
                                </td>
                            </tr>
                        {/if}
                    {:else}
                        <tr>
                            <td
                                colspan="6"
                                class="px-6 py-12 text-center text-gray-500 font-medium"
                            >
                                No products found matching your filters.
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modals -->

    <!-- Product Creation Modal -->
    {#if isProductModalOpen}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
        >
            <div
                class="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all border border-gray-100"
            >
                <form
                    method="POST"
                    action="?/createProduct"
                    use:enhance={({ formElement }) => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isProductModalOpen = false;
                                await update();
                            }
                        };
                    }}
                >
                    <div
                        class="bg-indigo-600 p-8 flex justify-between items-center text-white"
                    >
                        <div>
                            <h3 class="text-2xl font-black">Catalog Entry</h3>
                            <p class="text-indigo-100 text-sm mt-1">
                                Add a new reference to your inventory product
                                catalog.
                            </p>
                        </div>
                        <span class="text-5xl">📦</span>
                    </div>

                    <div
                        class="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-start"
                    >
                        <!-- Col 1: Identity -->
                        <div class="space-y-4">
                            <h4
                                class="text-xs font-black text-indigo-600 uppercase tracking-widest"
                            >
                                1. Identity
                            </h4>
                            <div>
                                <label
                                    for="prod_name"
                                    class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
                                    >Full Product Name</label
                                >
                                <input
                                    id="prod_name"
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="ex: Mask Type II R"
                                    class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
                                />
                            </div>
                            <div>
                                <label
                                    for="prod_barcode"
                                    class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
                                    >Barcode / SKU / Ref</label
                                >
                                <input
                                    id="prod_barcode"
                                    type="text"
                                    name="barcode"
                                    placeholder="Optional"
                                    class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-mono"
                                />
                            </div>
                        </div>

                        <!-- Col 2: Classification -->
                        <div class="space-y-4">
                            <h4
                                class="text-xs font-black text-indigo-600 uppercase tracking-widest"
                            >
                                2. Classification
                            </h4>
                            <div>
                                <label
                                    for="prod_cat"
                                    class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
                                    >Department / Category</label
                                >
                                <select
                                    id="prod_cat"
                                    name="category"
                                    class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold"
                                >
                                    <option>Consommables</option>
                                    <option>Produits</option>
                                    <option>Restaurations</option>
                                    <option>Chirurgie</option>
                                    <option>Autre</option>
                                </select>
                            </div>
                            <div>
                                <label
                                    for="prod_unit"
                                    class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
                                    >Unit of Measure</label
                                >
                                <input
                                    id="prod_unit"
                                    type="text"
                                    name="unit"
                                    placeholder="ex: Box, Unit, ml..."
                                    required
                                    class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold"
                                />
                            </div>
                        </div>

                        <!-- Col 3: Safety -->
                        <div class="space-y-4">
                            <h4
                                class="text-xs font-black text-indigo-600 uppercase tracking-widest"
                            >
                                3. Guardrails
                            </h4>
                            <div
                                class="bg-red-50 p-6 rounded-3xl border-2 border-red-100"
                            >
                                <label
                                    for="prod_min_threshold"
                                    class="block text-[10px] font-bold text-red-500 uppercase mb-2"
                                    >Min Threshold Alert</label
                                >
                                <input
                                    id="prod_min_threshold"
                                    type="number"
                                    name="min_threshold"
                                    value="5"
                                    min="1"
                                    required
                                    class="w-full h-14 text-2xl rounded-2xl border-2 border-red-200 px-4 font-black text-red-600 text-center"
                                />
                                <p
                                    class="text-[9px] text-red-400 mt-3 text-center"
                                >
                                    System will trigger alert when stock falls
                                    below this value.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="p-8 bg-gray-50 flex justify-end gap-4">
                        <button
                            type="button"
                            onclick={() => (isProductModalOpen = false)}
                            class="px-8 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase"
                            >Cancel</button
                        >
                        <button
                            type="submit"
                            class="px-12 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest"
                            >Register Product</button
                        >
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Stock Entry (Mega Modal) -->
    {#if isEntryModalOpen && selectedProduct}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
        >
            <div
                class="bg-white rounded-[2rem] shadow-2xl w-[90vw] max-w-6xl overflow-hidden transform transition-all border border-gray-100"
            >
                <form
                    method="POST"
                    action="?/addStockBatch"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isEntryModalOpen = false;
                                await update();
                            }
                        };
                    }}
                >
                    <input
                        type="hidden"
                        name="product_id"
                        value={selectedProduct.id}
                    />

                    <div
                        class="bg-emerald-600 p-8 flex justify-between items-center text-white"
                    >
                        <div>
                            <h3
                                class="text-2xl font-black uppercase tracking-tighter"
                            >
                                Inventory Inbound (New Batch)
                            </h3>
                            <div class="flex items-center gap-3 mt-1">
                                <span
                                    class="bg-emerald-700 px-3 py-1 rounded-lg font-black text-xs uppercase tracking-widest"
                                    >{selectedProduct.category}</span
                                >
                                <p class="text-emerald-100 text-lg font-bold">
                                    {selectedProduct.name}
                                </p>
                            </div>
                        </div>
                        <span class="text-6xl">🚚</span>
                    </div>

                    <div
                        class="p-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-start"
                    >
                        <!-- Col 1: Traceability -->
                        <div class="space-y-6">
                            <h4
                                class="text-xs font-black text-emerald-600 uppercase tracking-widest border-b pb-2"
                            >
                                1. Traceability
                            </h4>
                            <div>
                                <label
                                    for="batch_num"
                                    class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                    >Batch / Lot Number</label
                                >
                                <input
                                    id="batch_num"
                                    type="text"
                                    name="batch_number"
                                    required
                                    placeholder="ex: LOT-2024-X"
                                    class="w-full h-16 text-xl rounded-2xl border-2 border-gray-100 px-4 focus:ring-emerald-500 focus:border-emerald-500 font-black uppercase"
                                />
                            </div>
                            <div>
                                <label
                                    for="batch_exp"
                                    class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                    >Expiration Date (Safety)</label
                                >
                                <input
                                    id="batch_exp"
                                    type="date"
                                    name="expiration_date"
                                    required
                                    class="w-full h-16 text-xl rounded-2xl border-2 border-gray-100 px-4 font-bold"
                                />
                            </div>
                            <div>
                                <label
                                    for="batch_supp"
                                    class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                    >Trusted Supplier</label
                                >
                                <select
                                    id="batch_supp"
                                    name="supplier_id"
                                    class="w-full h-16 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold"
                                >
                                    <option value="">Internal / Unknown</option>
                                    {#each data.suppliers as s}
                                        <option value={s.id}>{s.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>

                        <!-- Col 2: Inbound Quantity -->
                        <div class="space-y-6">
                            <h4
                                class="text-xs font-black text-emerald-600 uppercase tracking-widest border-b pb-2"
                            >
                                2. Received Volume
                            </h4>
                            <div
                                class="bg-emerald-50 p-8 rounded-[2.5rem] border-2 border-emerald-100"
                            >
                                <label
                                    for="batch_qty"
                                    class="block text-[10px] font-black text-emerald-600 uppercase mb-4 text-center"
                                    >Entry Quantity ({selectedProduct.unit})</label
                                >
                                <div class="relative">
                                    <input
                                        id="batch_qty"
                                        type="number"
                                        name="quantity"
                                        bind:value={entryQty}
                                        min="1"
                                        step="0.01"
                                        required
                                        class="w-full h-24 text-5xl rounded-3xl border-2 border-emerald-200 px-4 text-center font-black text-emerald-700 bg-white shadow-inner"
                                    />
                                </div>
                                <p
                                    class="text-[10px] text-emerald-400 mt-4 text-center font-bold"
                                >
                                    Verify total volume before confirmation.
                                </p>
                            </div>
                        </div>

                        <!-- Col 3: Financials & Refs -->
                        <div class="space-y-6">
                            <h4
                                class="text-xs font-black text-emerald-600 uppercase tracking-widest border-b pb-2"
                            >
                                3. Financial Audit
                            </h4>
                            <div>
                                <label
                                    for="batch_cost"
                                    class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                    >Unit Purchase Cost (PMP)</label
                                >
                                <div class="relative">
                                    <input
                                        id="batch_cost"
                                        type="number"
                                        name="unit_cost"
                                        bind:value={entryCost}
                                        step="0.01"
                                        required
                                        placeholder="0.00"
                                        class="w-full h-16 text-2xl rounded-2xl border-2 border-gray-100 px-4 font-mono text-end pr-14"
                                    />
                                    <span
                                        class="absolute right-4 top-5 text-gray-400 font-bold"
                                        >دج</span
                                    >
                                </div>
                            </div>
                            <div>
                                <label
                                    for="batch_reason"
                                    class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                    >Invoice / Purchase order #</label
                                >
                                <input
                                    id="batch_reason"
                                    type="text"
                                    name="reason"
                                    placeholder="ex: INV-2024-100"
                                    class="w-full h-16 text-lg rounded-2xl border-2 border-gray-100 px-4"
                                />
                            </div>
                            <div
                                class="bg-gray-50 p-6 rounded-2xl border border-gray-100"
                            >
                                <div
                                    class="flex justify-between items-center opacity-50"
                                >
                                    <span
                                        class="text-[10px] font-bold uppercase"
                                        >Estimated Total</span
                                    >
                                    <span class="text-sm font-black underline"
                                        >Calculated at submit</span
                                    >
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-8 bg-gray-50 flex justify-end gap-4">
                        <button
                            type="button"
                            onclick={() => (isEntryModalOpen = false)}
                            class="px-8 py-4 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase"
                            >Cancel</button
                        >
                        <button
                            type="submit"
                            class="px-16 py-4 bg-emerald-600 text-white text-lg font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 uppercase tracking-widest"
                            >Commit to Stock</button
                        >
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Metadata Edit Modal (Safe Edit) -->
    {#if isEditBatchModalOpen && selectedBatch}
        <div
            class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
        >
            <div
                class="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all border border-gray-100"
            >
                <form
                    method="POST"
                    action="?/updateBatch"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isEditBatchModalOpen = false;
                                await update();
                            }
                        };
                    }}
                >
                    <input
                        type="hidden"
                        name="batch_id"
                        value={selectedBatch.id}
                    />

                    <div class="bg-indigo-600 p-8 text-white relative">
                        <h3
                            class="text-2xl font-black uppercase tracking-tighter"
                        >
                            Correct Metadata
                        </h3>
                        <p class="text-indigo-100 text-sm mt-1">
                            Batch ID: {selectedBatch.id} • Corrections are logged
                            for audit.
                        </p>
                        <span class="absolute top-8 right-8 text-4xl opacity-50"
                            >✏️</span
                        >
                    </div>

                    <div class="p-8 grid grid-cols-2 gap-6 text-start">
                        <div
                            class="col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-[10px] text-yellow-700 font-bold mb-4"
                        >
                            ⚠️ Note: You are editing descriptive information
                            only. To change quantity, use the "Adjust" function.
                        </div>
                        <div>
                            <label
                                for="edit_batch_num"
                                class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                >Batch Number</label
                            >
                            <input
                                id="edit_batch_num"
                                type="text"
                                name="batch_number"
                                value={selectedBatch.batch_number}
                                required
                                class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold uppercase"
                            />
                        </div>
                        <div>
                            <label
                                for="edit_batch_exp"
                                class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                >Expiration Date</label
                            >
                            <input
                                id="edit_batch_exp"
                                type="date"
                                name="expiration_date"
                                value={selectedBatch.expiration_date}
                                required
                                class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold"
                            />
                        </div>
                        <div>
                            <label
                                for="edit_batch_cost"
                                class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                >Correct Unit Cost</label
                            >
                            <input
                                id="edit_batch_cost"
                                type="number"
                                name="unit_cost"
                                step="0.01"
                                value={selectedBatch.unit_cost}
                                required
                                class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label
                                for="edit_batch_supp"
                                class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                >Correct Supplier</label
                            >
                            <select
                                id="edit_batch_supp"
                                name="supplier_id"
                                value={selectedBatch.supplier_id}
                                class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold"
                            >
                                <option value="">Internal / Unknown</option>
                                {#each data.suppliers as s}
                                    <option value={s.id}>{s.name}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <div class="p-8 bg-gray-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onclick={() => (isEditBatchModalOpen = false)}
                            class="px-6 py-3 text-sm font-bold text-gray-500 uppercase"
                            >Discard</button
                        >
                        <button
                            type="submit"
                            class="px-10 py-3 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 uppercase uppercase tracking-widest"
                            >Update Metadata</button
                        >
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Stock Adjustment Modal (Safe Adjust) -->
    {#if isAdjustStockModalOpen && selectedBatch}
        <div
            class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
        >
            <div
                class="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border border-gray-100"
            >
                <form
                    method="POST"
                    action="?/adjustStock"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isAdjustStockModalOpen = false;
                                await update();
                            }
                        };
                    }}
                >
                    <input
                        type="hidden"
                        name="batch_id"
                        value={selectedBatch.id}
                    />

                    <div
                        class="bg-orange-600 p-8 text-white flex justify-between items-center"
                    >
                        <div>
                            <h3
                                class="text-2xl font-black uppercase tracking-tighter"
                            >
                                Inventory Adjustment
                            </h3>
                            <p class="text-orange-100 text-sm mt-1">
                                Batch: {selectedBatch.batch_number} • Current: {selectedBatch.current_quantity}
                            </p>
                        </div>
                        <span class="text-4xl">📉</span>
                    </div>

                    <div class="p-8 space-y-6 text-start">
                        <div
                            class="bg-orange-50 p-6 rounded-3xl border border-orange-100 text-center"
                        >
                            <label
                                for="adj_delta"
                                class="block text-[10px] font-black text-orange-600 uppercase mb-4"
                                >Quantity Change (+ or -)</label
                            >
                            <input
                                id="adj_delta"
                                type="number"
                                name="delta"
                                step="1"
                                required
                                placeholder="0"
                                class="w-full h-20 text-5xl text-center rounded-2xl border-2 border-orange-200 px-4 font-black bg-white focus:ring-orange-500 focus:border-orange-500"
                            />
                            <p
                                class="text-[10px] text-orange-400 mt-4 font-bold opacity-70 italic"
                            >
                                Example: Put "-5" to fix a breakage or "+2" to
                                fix a miscount.
                            </p>
                        </div>

                        <div>
                            <label
                                for="adj_reason"
                                class="block text-[10px] font-black text-gray-400 uppercase mb-2"
                                >Formal Reason for Adjustment</label
                            >
                            <select
                                id="adj_reason"
                                name="reason"
                                required
                                class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold"
                            >
                                <option
                                    >Correction d'Inventaire (Miscount)</option
                                >
                                <option>Casse / Dommage</option>
                                <option>Périmé (Expiré)</option>
                                <option>Retour Fournisseur</option>
                                <option>Autre</option>
                            </select>
                        </div>
                    </div>

                    <div class="p-8 bg-gray-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onclick={() => (isAdjustStockModalOpen = false)}
                            class="px-6 py-3 text-sm font-bold text-gray-500 uppercase"
                            >Discard</button
                        >
                        <button
                            type="submit"
                            class="px-10 py-3 bg-orange-600 text-white text-sm font-black rounded-xl hover:bg-orange-700 shadow-xl shadow-orange-100 uppercase tracking-widest"
                            >Apply Adjustment</button
                        >
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Usage Modal (FEFO) -->
    {#if isUsageModalOpen && selectedProduct}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
        >
            <div
                class="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all border border-gray-100"
            >
                <form
                    method="POST"
                    action="?/deductStock"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isUsageModalOpen = false;
                                await update();
                            }
                        };
                    }}
                >
                    <input
                        type="hidden"
                        name="product_id"
                        value={selectedProduct.id}
                    />
                    <div
                        class="bg-gray-900 p-8 flex justify-between items-center text-white"
                    >
                        <div>
                            <h3
                                class="text-2xl font-black uppercase tracking-tighter"
                            >
                                Fast Stock Usage
                            </h3>
                            <p class="text-gray-400 text-lg font-bold">
                                {selectedProduct.name}
                            </p>
                        </div>
                        <span class="text-4xl">✂️</span>
                    </div>
                    <div class="p-8 space-y-6 text-start">
                        <div
                            class="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-gray-100"
                        >
                            <label
                                for="usage_qty"
                                class="block text-[10px] font-black text-gray-400 uppercase mb-4 text-center"
                                >Quantity to Deduct ({selectedProduct.unit})</label
                            >
                            <div class="relative">
                                <input
                                    id="usage_qty"
                                    type="number"
                                    name="quantity"
                                    min="1"
                                    step="1"
                                    max={selectedProduct.total_quantity}
                                    required
                                    class="w-full h-24 text-6xl rounded-3xl border-2 border-gray-200 px-4 text-center font-black text-gray-900 bg-white"
                                />
                            </div>
                            <p
                                class="text-[9px] text-gray-500 mt-4 text-center font-medium"
                            >
                                System applies **FEFO logic** (earliest
                                expiration first).
                            </p>
                        </div>
                        <div>
                            <label
                                for="usage_reason"
                                class="block text-xs font-bold text-gray-500 uppercase mb-1"
                                >Usage Reason</label
                            >
                            <select
                                id="usage_reason"
                                name="reason"
                                class="w-full h-14 text-lg rounded-2xl border-2 border-gray-100 px-4 font-bold"
                            >
                                <option>Patient Treatment</option>
                                <option>Clinic Daily Operation</option>
                                <option>Waste / Expired disposal</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div class="p-8 bg-gray-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onclick={() => (isUsageModalOpen = false)}
                            class="px-8 py-3 text-sm font-bold text-gray-500 uppercase"
                            >Cancel</button
                        >
                        <button
                            type="submit"
                            class="px-12 py-3 bg-gray-900 text-white text-sm font-black rounded-xl hover:bg-black uppercase tracking-widest"
                            >Confirm Usage</button
                        >
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Supplier Modal -->
    {#if isSupplierModalOpen}
        <div
            class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
        >
            <div
                class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100"
            >
                <form
                    method="POST"
                    action="?/addSupplier"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isSupplierModalOpen = false;
                                await update();
                            }
                        };
                    }}
                >
                    <div class="bg-gray-800 p-8 text-white">
                        <h3
                            class="text-xl font-black uppercase tracking-widest"
                        >
                            New Trusted Partner
                        </h3>
                    </div>
                    <div class="p-8 space-y-6 text-start">
                        <div>
                            <label
                                for="supp_name"
                                class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
                                >Company Name</label
                            >
                            <input
                                id="supp_name"
                                type="text"
                                name="name"
                                required
                                class="w-full h-14 text-lg rounded-xl border-2 border-gray-100 px-4 font-bold"
                            />
                        </div>
                        <div>
                            <label
                                for="supp_phone"
                                class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
                                >Contact Phone</label
                            >
                            <input
                                id="supp_phone"
                                type="text"
                                name="contact_phone"
                                class="w-full h-14 text-lg rounded-xl border-2 border-gray-100 px-4"
                            />
                        </div>
                        <div>
                            <label
                                for="supp_tax"
                                class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
                                >Tax ID / RC / IF</label
                            >
                            <input
                                id="supp_tax"
                                type="text"
                                name="tax_id"
                                class="w-full h-14 text-lg rounded-xl border-2 border-gray-100 px-4 font-mono"
                            />
                        </div>
                    </div>
                    <div class="p-8 bg-gray-50 flex justify-end gap-3">
                        <button
                            type="button"
                            onclick={() => (isSupplierModalOpen = false)}
                            class="px-6 py-3 text-sm font-bold text-gray-500 uppercase"
                            >Cancel</button
                        >
                        <button
                            type="submit"
                            class="px-10 py-3 bg-gray-800 text-white text-sm font-black rounded-xl hover:bg-black shadow-xl shadow-gray-100 uppercase tracking-widest"
                            >Save Partner</button
                        >
                    </div>
                </form>
            </div>
        </div>
    {/if}
</PortalShell>

<style>
    input[type="date"]::-webkit-calendar-picker-indicator {
        filter: invert(0.5);
        cursor: pointer;
    }

    /* Professional scrollbar for large tables */
    :global(.overflow-x-auto::-webkit-scrollbar) {
        height: 6px;
    }
    :global(.overflow-x-auto::-webkit-scrollbar-track) {
        background: transparent;
    }
    :global(.overflow-x-auto::-webkit-scrollbar-thumb) {
        background: #e2e8f0;
        border-radius: 10px;
    }
</style>
