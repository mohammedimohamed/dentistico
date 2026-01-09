<script lang="ts">
    import { onMount } from "svelte";
    import { APP_CONFIG } from "$lib/config/app.config";
    import { t } from "svelte-i18n";

    let { data } = $props();
    let spending = $state<any[]>([]);
    let summary = $state<any>(null);
    let loading = $state(true);
    let showAddModal = $state(false);

    function triggerExport() {
        const params = new URLSearchParams();
        if (filters.start_date) params.set("start_date", filters.start_date);
        if (filters.end_date) params.set("end_date", filters.end_date);
        if (filters.category_id) params.set("category_id", filters.category_id);

        window.location.href = `/api/spending/export?${params}`;
    }

    let filters = $state({
        start_date: "",
        end_date: "",
        category_id: "",
    });

    let categories = $state<any[]>([]);

    let newSpending = $state({
        category_id: "",
        amount: "",
        description: "",
        payment_method: "cash",
        receipt_number: "",
        spending_date: new Date().toISOString().split("T")[0],
        notes: "",
    });

    async function loadCategories() {
        const res = await fetch("/api/spending/categories");
        const data = await res.json();
        categories = data.categories;
    }

    async function loadSpending() {
        const params = new URLSearchParams();
        if (filters.start_date) params.set("start_date", filters.start_date);
        if (filters.end_date) params.set("end_date", filters.end_date);
        if (filters.category_id) params.set("category_id", filters.category_id);

        const res = await fetch(`/api/spending?${params}`);
        const data = await res.json();
        spending = data.spending;
    }

    async function loadSummary() {
        const params = new URLSearchParams();
        if (filters.start_date) params.set("start_date", filters.start_date);
        if (filters.end_date) params.set("end_date", filters.end_date);

        const res = await fetch(`/api/spending/summary?${params}`);
        summary = await res.json();
    }

    async function loadAll() {
        loading = true;
        await Promise.all([loadCategories(), loadSpending(), loadSummary()]);
        loading = false;
    }

    function openAddModal() {
        newSpending = {
            category_id: "",
            amount: "",
            description: "",
            payment_method: "cash",
            receipt_number: "",
            spending_date: new Date().toISOString().split("T")[0],
            notes: "",
        };
        showAddModal = true;
    }

    async function saveSpending() {
        await fetch("/api/spending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...newSpending,
                amount: parseFloat(newSpending.amount),
            }),
        });

        showAddModal = false;
        await loadAll();
    }

    async function applyFilters() {
        await loadAll();
    }

    onMount(loadAll);
</script>

<div class="p-8">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">{$t("spending.title")}</h1>
        <div class="flex gap-2">
            {#if data.user.can_export_spending || data.user.role === "admin"}
                <button
                    onclick={triggerExport}
                    class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium flex items-center gap-2"
                >
                    <span class="text-xl">📥</span>
                    {$t("common.export") || "Export"}
                </button>
            {/if}
            <button
                onclick={openAddModal}
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium"
            >
                + {$t("spending.add_expense")}
            </button>
        </div>
    </div>

    <!-- Summary Cards -->
    {#if summary}
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-6 rounded-lg shadow">
                <div class="text-gray-500 text-sm">
                    {$t("spending.total_spending")}
                </div>
                <div class="text-3xl font-bold text-red-600">
                    {APP_CONFIG.currencySymbol}{summary.total.toFixed(2)}
                </div>
            </div>

            {#each summary.byCategory.slice(0, 3) as cat}
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex items-center gap-2 mb-2">
                        <div
                            class="w-3 h-3 rounded-full"
                            style="background-color: {cat.color}"
                        ></div>
                        <div class="text-gray-500 text-sm">{cat.name}</div>
                    </div>
                    <div class="text-2xl font-bold">
                        {APP_CONFIG.currencySymbol}{cat.total.toFixed(2)}
                    </div>
                    <div class="text-xs text-gray-400">
                        {cat.count}
                        {$t("spending.summary.transactions")}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm font-medium mb-1"
                    >{$t("spending.filters.start_date")}</label
                >
                <input
                    type="date"
                    bind:value={filters.start_date}
                    class="w-full border rounded px-3 py-2"
                />
            </div>
            <div>
                <label class="block text-sm font-medium mb-1"
                    >{$t("spending.filters.end_date")}</label
                >
                <input
                    type="date"
                    bind:value={filters.end_date}
                    class="w-full border rounded px-3 py-2"
                />
            </div>
            <div>
                <label class="block text-sm font-medium mb-1"
                    >{$t("spending.filters.category")}</label
                >
                <select
                    bind:value={filters.category_id}
                    class="w-full border rounded px-3 py-2"
                >
                    <option value=""
                        >{$t("spending.filters.all_categories")}</option
                    >
                    {#each categories as cat}
                        <option value={cat.id}>{cat.name}</option>
                    {/each}
                </select>
            </div>
            <div class="flex items-end">
                <button
                    onclick={applyFilters}
                    class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    {$t("spending.filters.apply")}
                </button>
            </div>
        </div>
    </div>

    <!-- Spending Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="w-full">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.table.date")}</th
                    >
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.table.category")}</th
                    >
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.table.description")}</th
                    >
                    <th class="px-4 py-3 text-right text-sm font-semibold"
                        >{$t("spending.table.amount")}</th
                    >
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.table.payment")}</th
                    >
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.table.receipt")}</th
                    >
                </tr>
            </thead>
            <tbody>
                {#if loading}
                    <tr>
                        <td
                            colspan="6"
                            class="px-4 py-8 text-center text-gray-500"
                        >
                            {$t("spending.loading")}
                        </td>
                    </tr>
                {:else if spending.length === 0}
                    <tr>
                        <td
                            colspan="6"
                            class="px-4 py-8 text-center text-gray-500"
                        >
                            {$t("spending.no_records")}
                        </td>
                    </tr>
                {:else}
                    {#each spending as item}
                        <tr class="border-b hover:bg-gray-50">
                            <td class="px-4 py-3 text-sm"
                                >{item.spending_date}</td
                            >
                            <td class="px-4 py-3">
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-3 h-3 rounded-full"
                                        style="background-color: {item.category_color}"
                                    ></div>
                                    <span class="text-sm"
                                        >{item.category_name}</span
                                    >
                                </div>
                            </td>
                            <td class="px-4 py-3 text-sm">{item.description}</td
                            >
                            <td
                                class="px-4 py-3 text-right font-semibold text-red-600"
                            >
                                {APP_CONFIG.currencySymbol}{item.amount.toFixed(
                                    2,
                                )}
                            </td>
                            <td class="px-4 py-3 text-sm capitalize"
                                >{item.payment_method}</td
                            >
                            <td class="px-4 py-3 text-sm"
                                >{item.receipt_number || "-"}</td
                            >
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<!-- Add Modal -->
{#if showAddModal}
    <div
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 class="text-2xl font-bold mb-4">
                {$t("spending.new_expense")}
            </h2>

            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1"
                            >{$t("spending.form.category_required")}</label
                        >
                        <select
                            bind:value={newSpending.category_id}
                            class="w-full border rounded px-3 py-2"
                            required
                        >
                            <option value=""
                                >{$t("spending.form.select_category")}</option
                            >
                            {#each categories as cat}
                                <option value={cat.id}>{cat.name}</option>
                            {/each}
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1"
                            >{$t("spending.form.amount_required")}</label
                        >
                        <input
                            type="number"
                            step="0.01"
                            bind:value={newSpending.amount}
                            class="w-full border rounded px-3 py-2"
                            placeholder={$t("spending.form.amount_placeholder")}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("spending.form.description_required")}</label
                    >
                    <input
                        type="text"
                        bind:value={newSpending.description}
                        class="w-full border rounded px-3 py-2"
                        placeholder={$t(
                            "spending.form.description_placeholder",
                        )}
                        required
                    />
                </div>

                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1"
                            >{$t("spending.form.payment_method")}</label
                        >
                        <select
                            bind:value={newSpending.payment_method}
                            class="w-full border rounded px-3 py-2"
                        >
                            <option value="cash"
                                >{$t("spending.form.payment_cash")}</option
                            >
                            <option value="card"
                                >{$t("spending.form.payment_card")}</option
                            >
                            <option value="transfer"
                                >{$t("spending.form.payment_transfer")}</option
                            >
                            <option value="check"
                                >{$t("spending.form.payment_check")}</option
                            >
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1"
                            >{$t("spending.form.receipt_number")}</label
                        >
                        <input
                            type="text"
                            bind:value={newSpending.receipt_number}
                            class="w-full border rounded px-3 py-2"
                            placeholder={$t("spending.form.receipt_optional")}
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium mb-1"
                            >{$t("spending.form.date_required")}</label
                        >
                        <input
                            type="date"
                            bind:value={newSpending.spending_date}
                            class="w-full border rounded px-3 py-2"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("spending.form.notes")}</label
                    >
                    <textarea
                        bind:value={newSpending.notes}
                        class="w-full border rounded px-3 py-2"
                        rows="3"
                        placeholder={$t("spending.form.notes_placeholder")}
                    ></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-6">
                <button
                    onclick={() => (showAddModal = false)}
                    class="px-4 py-2 border rounded hover:bg-gray-50"
                >
                    {$t("spending.form.cancel")}
                </button>
                <button
                    onclick={saveSpending}
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    {$t("spending.form.save")}
                </button>
            </div>
        </div>
    </div>
{/if}
