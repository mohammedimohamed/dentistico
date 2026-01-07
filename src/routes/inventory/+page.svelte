<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import NotificationBell from "$lib/components/NotificationBell.svelte";
    import { page } from "$app/state";
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";

    let { data }: { data: any } = $props();

    const doctorNav = [
        { label: "common.dashboard", href: "/doctor/dashboard", icon: "📊" },
        { label: "common.patients", href: "/doctor/patients", icon: "👥" },
        { label: "common.inventory", href: "/inventory", icon: "📦" },
        {
            label: "common.settings",
            href: "/doctor/settings/medications",
            icon: "💊",
        },
    ];

    const assistantNav = [
        {
            label: "assistant.nav.items.schedule",
            href: "/assistant/dashboard",
            icon: "📅",
        },
        { label: "common.inventory", href: "/inventory", icon: "📦" },
        {
            label: "assistant.nav.items.invoices",
            href: "/assistant/invoices",
            icon: "📄",
        },
        {
            label: "spending.menu",
            href: "/assistant/spending",
            icon: "💸",
        },
    ];

    const adminNav = [
        { label: "common.dashboard", href: "/admin", icon: "📊" },
        { label: "common.patients", href: "/admin/users", icon: "👥" },
        { label: "common.settings", href: "/admin/settings", icon: "⚙️" },
        { label: "common.inventory", href: "/inventory", icon: "📦" },
        { label: "spending.menu", href: "/admin/spending", icon: "💸" },
        {
            label: "spending.categories_menu",
            href: "/admin/spending/categories",
            icon: "🏷️",
        },
    ];

    const navItems = $derived(
        data.user.role === "doctor"
            ? doctorNav
            : data.user.role === "admin"
              ? adminNav
              : assistantNav,
    );

    let isMoveModalOpen = $state(false);
    let moveType = $state("in");
    let selectedItem = $state<any>(null);

    let isExportModalOpen = $state(false);
    let selectedExportType = $state("global");
    let selectedExportFormat = $state("xlsx");
    let isExporting = $state(false);

    function openMoveModal(item: any, type: "in" | "out") {
        selectedItem = item;
        moveType = type;
        isMoveModalOpen = true;
    }

    let isCreateModalOpen = $state(false);
    let createErrorMessage = $state("");

    function triggerExport() {
        isExporting = true;
        const url = `/api/inventory/export?type=${selectedExportType}&format=${selectedExportFormat}&lang=${data.locale}`;
        window.location.href = url;
        setTimeout(() => {
            isExporting = false;
            isExportModalOpen = false;
        }, 2000);
    }
</script>

<div class="flex min-h-screen bg-gray-50 overflow-hidden">
    <Sidebar
        items={navItems}
        title="Dentistico"
        userName={data.user.full_name}
    />

    <div class="flex-1 flex flex-col overflow-hidden">
        <header
            class="bg-white shadow-sm border-b border-gray-200 py-4 px-8 flex justify-between items-center"
        >
            <h1 class="text-xl font-bold text-gray-900">
                {$t("inventory.title")}
            </h1>
            <div class="flex items-center gap-4">
                {#if data.user.role === "admin"}
                    <button
                        onclick={() => (isCreateModalOpen = true)}
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                        <span class="margin-inline-end-2">+</span>
                        {$t("inventory.add_item")}
                    </button>
                {/if}
                <NotificationBell />
                <span
                    class="text-[10px] text-gray-500 italic uppercase tracking-widest font-bold px-2 py-1 rounded {data
                        .user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100'}"
                >
                    {$t("common.portal")}: {$t(`common.${data.user.role}`)}
                </span>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <div
                    class="px-4 py-5 sm:px-6 flex justify-between items-center"
                >
                    <div class="text-start">
                        <h3 class="text-lg leading-6 font-bold text-gray-900">
                            {$t("inventory.current_inventory")}
                        </h3>
                        <p class="mt-1 max-w-2xl text-sm text-gray-500">
                            {$t("inventory.tracking")}
                        </p>
                    </div>
                    <button
                        onclick={() => (isExportModalOpen = true)}
                        class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                        <span class="margin-inline-end-2">📥</span>
                        {$t("inventory.export_report")}
                    </button>
                </div>

                <div class="border-t border-gray-200 overflow-x-auto">
                    <!-- Table content remains same -->
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th
                                    class="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase tracking-wider"
                                    >{$t("common.article")}</th
                                >
                                <th
                                    class="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase tracking-wider"
                                    >{$t("common.category")}</th
                                >
                                <th
                                    class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider"
                                    >{$t("common.quantity")}</th
                                >
                                <th
                                    class="px-6 py-3 text-start text-xs font-bold text-gray-500 uppercase tracking-wider"
                                    >{$t("common.unit")}</th
                                >
                                <th
                                    class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider"
                                    >{$t("common.status")}</th
                                >
                                <th
                                    class="px-6 py-3 text-end text-xs font-bold text-gray-500 uppercase tracking-wider"
                                    >{$t("common.actions")}</th
                                >
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            {#each data.inventory as item}
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-start"
                                    >
                                        <div
                                            class="text-sm font-bold text-gray-900"
                                        >
                                            {item.name}
                                        </div>
                                        <div class="text-[10px] text-gray-500">
                                            {$t("common.ref")}: {item.sku ||
                                                "N/A"}
                                        </div>
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-start"
                                    >
                                        {item.category || "-"}
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-center"
                                    >
                                        <span
                                            class="text-lg font-bold {item.current_quantity <=
                                            item.min_threshold
                                                ? 'text-red-600'
                                                : 'text-gray-900'}"
                                        >
                                            {item.current_quantity}
                                        </span>
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-start"
                                    >
                                        {item.unit}
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-center"
                                    >
                                        {#if item.current_quantity <= item.min_threshold}
                                            <span
                                                class="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-red-100 text-red-800 animate-pulse"
                                            >
                                                {$t("inventory.low_stock")}
                                            </span>
                                        {:else}
                                            <span
                                                class="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-green-100 text-green-800"
                                            >
                                                {$t("inventory.ok")}
                                            </span>
                                        {/if}
                                    </td>
                                    <td
                                        class="px-6 py-4 whitespace-nowrap text-end text-sm font-bold"
                                    >
                                        <button
                                            onclick={() =>
                                                openMoveModal(item, "in")}
                                            class="text-indigo-600 hover:text-indigo-900 margin-inline-end-4"
                                        >
                                            + {$t("inventory.reorder")}
                                        </button>
                                        <button
                                            onclick={() =>
                                                openMoveModal(item, "out")}
                                            class="text-orange-600 hover:text-orange-900"
                                        >
                                            - {$t("inventory.exit")}
                                        </button>
                                    </td>
                                </tr>
                            {:else}
                                <tr>
                                    <td
                                        colspan="6"
                                        class="px-6 py-12 text-center text-gray-500 font-medium"
                                    >
                                        {$t("inventory.empty")}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>

        {#if isCreateModalOpen}
            <div class="relative z-50" role="dialog" aria-modal="true">
                <div
                    class="fixed inset-0 bg-gray-500/75 transition-opacity"
                    aria-hidden="true"
                    onclick={() => (isCreateModalOpen = false)}
                ></div>
                <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div
                        class="flex min-h-full items-center justify-center p-4"
                    >
                        <div
                            class="relative transform overflow-hidden rounded-2xl bg-white text-start shadow-xl transition-all sm:w-full sm:max-w-lg"
                        >
                            <form
                                method="POST"
                                action="?/createItem"
                                use:enhance={() => {
                                    createErrorMessage = "";
                                    return async ({ result, update }) => {
                                        if (result.type === "success") {
                                            isCreateModalOpen = false;
                                            await update();
                                        } else if (result.type === "failure") {
                                            createErrorMessage =
                                                result.data?.error ||
                                                "Une erreur est survenue";
                                        }
                                    };
                                }}
                            >
                                <div class="bg-indigo-600 px-6 py-4">
                                    <h3 class="text-lg font-bold text-white">
                                        {$t("inventory.add_new_item")}
                                    </h3>
                                </div>
                                <div
                                    class="bg-white px-6 py-6 sm:p-8 space-y-4"
                                >
                                    {#if createErrorMessage}
                                        <div
                                            class="rounded-md bg-red-50 p-4 border border-red-200"
                                        >
                                            <div class="flex">
                                                <div class="flex-shrink-0">
                                                    <span class="text-red-400"
                                                        >⚠️</span
                                                    >
                                                </div>
                                                <div class="ml-3">
                                                    <h3
                                                        class="text-sm font-medium text-red-800"
                                                    >
                                                        {createErrorMessage}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                    {/if}
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="col-span-2">
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                                                >{$t("common.name")}</label
                                            >
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                class="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                                                >{$t("common.sku")}</label
                                            >
                                            <input
                                                type="text"
                                                name="sku"
                                                class="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                                                >{$t("common.category")}</label
                                            >
                                            <select
                                                name="category"
                                                class="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="Consommables"
                                                    >Consommables</option
                                                >
                                                <option value="Produits"
                                                    >Produits</option
                                                >
                                                <option value="Restaurations"
                                                    >Restaurations</option
                                                >
                                                <option value="Chirurgie"
                                                    >Chirurgie</option
                                                >
                                                <option value="Médicaments"
                                                    >Médicaments</option
                                                >
                                                <option value="Autre"
                                                    >Autre</option
                                                >
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                                                >{$t("common.quantity")}</label
                                            >
                                            <input
                                                type="number"
                                                name="current_quantity"
                                                value="0"
                                                min="0"
                                                required
                                                class="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                                                >{$t("common.unit")}</label
                                            >
                                            <input
                                                type="text"
                                                name="unit"
                                                placeholder="ex: Boîte, Unité"
                                                required
                                                class="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-red-500 uppercase tracking-widest mb-1"
                                                >Min Threshold</label
                                            >
                                            <div class="relative">
                                                <input
                                                    type="number"
                                                    name="min_threshold"
                                                    value="5"
                                                    min="1"
                                                    required
                                                    class="block w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-900 focus:ring-red-500 focus:border-red-500"
                                                />
                                                <span
                                                    class="absolute right-3 top-2 text-xs text-red-400"
                                                    >⚠️</span
                                                >
                                            </div>
                                            <p
                                                class="text-[10px] text-gray-500 mt-1"
                                            >
                                                Alert level
                                            </p>
                                        </div>
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                                                >Unit Cost</label
                                            >
                                            <input
                                                type="number"
                                                name="unit_cost"
                                                step="0.01"
                                                value="0"
                                                min="0"
                                                class="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                        <div class="col-span-2">
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                                                >Supplier</label
                                            >
                                            <select
                                                name="supplier_id"
                                                class="block w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value=""
                                                    >Select Supplier...</option
                                                >
                                                {#each data.suppliers as s}
                                                    <option value={s.id}
                                                        >{s.name}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    class="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3"
                                >
                                    <button
                                        type="submit"
                                        class="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl hover:bg-indigo-700 sm:w-auto transition-all"
                                    >
                                        {$t("common.save")}
                                    </button>
                                    <button
                                        type="button"
                                        class="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
                                        onclick={() =>
                                            (isCreateModalOpen = false)}
                                    >
                                        {$t("common.cancel")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        {#if isMoveModalOpen && selectedItem}
            <div class="relative z-10" role="dialog" aria-modal="true">
                <div
                    class="fixed inset-0 bg-gray-500/75 transition-opacity"
                    aria-hidden="true"
                    onclick={() => (isMoveModalOpen = false)}
                ></div>
                <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div
                        class="flex min-h-full items-center justify-center p-4"
                    >
                        <div
                            class="relative transform overflow-hidden rounded-2xl bg-white text-start shadow-xl transition-all sm:w-full sm:max-w-md"
                        >
                            <form
                                method="POST"
                                action={moveType === "in"
                                    ? "?/addStock"
                                    : "?/removeStock"}
                                use:enhance={() => {
                                    return async ({ result, update }) => {
                                        if (result.type === "success")
                                            isMoveModalOpen = false;
                                        await update();
                                    };
                                }}
                            >
                                <input
                                    type="hidden"
                                    name="item_id"
                                    value={selectedItem.id}
                                />
                                <div class="bg-white px-6 pt-6 pb-4 sm:p-8">
                                    <h3
                                        class="text-xl font-bold text-gray-900 mb-2"
                                    >
                                        {moveType === "in"
                                            ? $t("inventory.add_stock")
                                            : $t("inventory.record_exit")}
                                    </h3>
                                    <p class="text-sm text-gray-500 mb-8">
                                        {$t("common.article")} :
                                        <span class="font-bold text-gray-900"
                                            >{selectedItem.name}</span
                                        >
                                    </p>

                                    <div class="space-y-6">
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
                                                >{$t("common.quantity")} ({selectedItem.unit})</label
                                            >
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="quantity"
                                                required
                                                class="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
                                                >{$t("common.reason")} / {$t(
                                                    "common.comment",
                                                )}</label
                                            >
                                            <input
                                                type="text"
                                                name="reason"
                                                placeholder={moveType === "in"
                                                    ? $t(
                                                          "inventory.reason_placeholder_in",
                                                      )
                                                    : $t(
                                                          "inventory.reason_placeholder_out",
                                                      )}
                                                class="block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div
                                    class="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:px-8 gap-3"
                                >
                                    <button
                                        type="submit"
                                        class="inline-flex w-full justify-center rounded-xl {moveType ===
                                        'in'
                                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                            : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'} px-6 py-3 text-sm font-bold text-white shadow-xl sm:w-auto transition-all"
                                    >
                                        {$t("common.confirm")}
                                    </button>
                                    <button
                                        type="button"
                                        class="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
                                        onclick={() =>
                                            (isMoveModalOpen = false)}
                                    >
                                        {$t("common.cancel")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        {#if isExportModalOpen}
            <div class="relative z-10" role="dialog" aria-modal="true">
                <div
                    class="fixed inset-0 bg-gray-500/75 transition-opacity"
                    aria-hidden="true"
                    onclick={() => (isExportModalOpen = false)}
                ></div>
                <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div
                        class="flex min-h-full items-center justify-center p-4"
                    >
                        <div
                            class="relative transform overflow-hidden rounded-3xl bg-white text-start shadow-2xl transition-all sm:w-full sm:max-w-lg"
                        >
                            <div class="bg-indigo-600 px-8 py-6">
                                <h3 class="text-xl font-bold text-white">
                                    {$t("export.engine")}
                                </h3>
                                <p class="text-indigo-100 text-xs mt-1">
                                    {$t("export.description")}
                                </p>
                            </div>
                            <div class="p-8">
                                <div class="space-y-8">
                                    <div>
                                        <label
                                            class="block text-xs font-bold text-gray-400 mb-4 text-start uppercase tracking-widest"
                                            >{$t("export.report_type")}</label
                                        >
                                        <div class="grid grid-cols-2 gap-4">
                                            <button
                                                onclick={() =>
                                                    (selectedExportType =
                                                        "global")}
                                                class="px-5 py-4 rounded-2xl border-2 text-start transition-all {selectedExportType ===
                                                'global'
                                                    ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-500/10'
                                                    : 'border-gray-50 hover:border-gray-100 bg-gray-50/50'}"
                                            >
                                                <div class="text-2xl mb-2">
                                                    🌍
                                                </div>
                                                <div
                                                    class="font-bold text-sm text-gray-900"
                                                >
                                                    {$t("export.global_status")}
                                                </div>
                                                <div
                                                    class="text-[10px] text-gray-500 mt-1"
                                                >
                                                    {$t(
                                                        "export.full_stock_dump",
                                                    )}
                                                </div>
                                            </button>
                                            <button
                                                onclick={() =>
                                                    (selectedExportType =
                                                        "low_stock")}
                                                class="px-5 py-4 rounded-2xl border-2 text-start transition-all {selectedExportType ===
                                                'low_stock'
                                                    ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-500/10'
                                                    : 'border-gray-50 hover:border-gray-100 bg-gray-50/50'}"
                                            >
                                                <div class="text-2xl mb-2">
                                                    ⚠️
                                                </div>
                                                <div
                                                    class="font-bold text-sm text-gray-900"
                                                >
                                                    {$t("export.low_stock")}
                                                </div>
                                                <div
                                                    class="text-[10px] text-gray-500 mt-1"
                                                >
                                                    {$t("export.reorder_list")}
                                                </div>
                                            </button>
                                            <button
                                                onclick={() =>
                                                    (selectedExportType =
                                                        "expiry")}
                                                class="px-5 py-4 rounded-2xl border-2 text-start transition-all {selectedExportType ===
                                                'expiry'
                                                    ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-500/10'
                                                    : 'border-gray-50 hover:border-gray-100 bg-gray-50/50'}"
                                            >
                                                <div class="text-2xl mb-2">
                                                    📅
                                                </div>
                                                <div
                                                    class="font-bold text-sm text-gray-900"
                                                >
                                                    {$t("export.expiry_audit")}
                                                </div>
                                                <div
                                                    class="text-[10px] text-gray-500 mt-1"
                                                >
                                                    {$t(
                                                        "export.perishables_check",
                                                    )}
                                                </div>
                                            </button>
                                            <button
                                                onclick={() =>
                                                    (selectedExportType =
                                                        "supplier")}
                                                class="px-5 py-4 rounded-2xl border-2 text-start transition-all {selectedExportType ===
                                                'supplier'
                                                    ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-500/10'
                                                    : 'border-gray-50 hover:border-gray-100 bg-gray-50/50'}"
                                            >
                                                <div class="text-2xl mb-2">
                                                    🏢
                                                </div>
                                                <div
                                                    class="font-bold text-sm text-gray-900"
                                                >
                                                    {$t("export.vendor_sheet")}
                                                </div>
                                                <div
                                                    class="text-[10px] text-gray-500 mt-1"
                                                >
                                                    {$t(
                                                        "export.group_by_supplier",
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            class="block text-xs font-bold text-gray-400 mb-4 text-start uppercase tracking-widest"
                                            >{$t("export.file_format")}</label
                                        >
                                        <div class="flex gap-4">
                                            {#each ["xlsx", "pdf", "csv"] as fmt}
                                                <button
                                                    onclick={() =>
                                                        (selectedExportFormat =
                                                            fmt)}
                                                    class="flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all {selectedExportFormat ===
                                                    fmt
                                                        ? 'bg-gray-900 border-gray-900 text-white shadow-xl scale-105'
                                                        : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}"
                                                >
                                                    {fmt.toUpperCase()}
                                                </button>
                                            {/each}
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-10 flex gap-4">
                                    <button
                                        onclick={() =>
                                            (isExportModalOpen = false)}
                                        class="flex-1 px-6 py-4 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                    >
                                        {$t("common.cancel")}
                                    </button>
                                    <button
                                        onclick={triggerExport}
                                        disabled={isExporting}
                                        class="flex-[2] px-6 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-2xl shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-3 transition-all transform active:scale-95"
                                    >
                                        {#if isExporting}
                                            <span class="animate-spin text-xl"
                                                >⏳</span
                                            >
                                            {$t("export.generating")}
                                        {:else}
                                            <span class="text-lg">🚀</span>
                                            {$t("export.generate")}
                                        {/if}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* RTL Specific Overrides for components that don't support logical properties well yet */
    :global([dir="rtl"]) .margin-inline-end-2 {
        margin-left: 0.5rem;
    }
    :global([dir="ltr"]) .margin-inline-end-2 {
        margin-right: 0.5rem;
    }
    :global([dir="rtl"]) .margin-inline-end-4 {
        margin-left: 1rem;
    }
    :global([dir="ltr"]) .margin-inline-end-4 {
        margin-right: 1rem;
    }
</style>
