<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";

    let categories = $state<any[]>([]);
    let loading = $state(true);
    let showAddModal = $state(false);
    let editingCategory = $state<any>(null);

    let newCategory = $state({
        name: "",
        description: "",
        color: "#3B82F6",
    });

    async function loadCategories() {
        const res = await fetch("/api/spending/categories");
        const data = await res.json();
        categories = data.categories;
        loading = false;
    }

    function openAddModal() {
        editingCategory = null;
        newCategory = {
            name: "",
            description: "",
            color: "#3B82F6",
        };
        showAddModal = true;
    }

    function openEditModal(cat: any) {
        editingCategory = cat;
        newCategory = {
            name: cat.name,
            description: cat.description || "",
            color: cat.color,
        };
        showAddModal = true;
    }

    async function saveCategory() {
        const method = editingCategory ? "PUT" : "POST";
        const url = editingCategory
            ? `/api/spending/categories/${editingCategory.id}`
            : "/api/spending/categories";

        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCategory),
        });

        showAddModal = false;
        await loadCategories();
    }

    async function deleteCategory(id: number) {
        if (!confirm($t("spending.categories.delete_confirm"))) return;

        const res = await fetch(`/api/spending/categories/${id}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const data = await res.json();
            alert($t("spending.categories.delete_error"));
            return;
        }

        await loadCategories();
    }

    onMount(loadCategories);
</script>

<div class="p-8">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-bold">
                {$t("spending.categories.title")}
            </h1>
            <p class="text-gray-600 mt-1">
                {$t("spending.categories.subtitle")}
            </p>
        </div>
        <button
            onclick={openAddModal}
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
            + {$t("spending.categories.add_category")}
        </button>
    </div>

    <div class="bg-white rounded-lg shadow">
        <table class="w-full">
            <thead class="bg-gray-50 border-b">
                <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.categories.color")}</th
                    >
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.categories.name_required")}</th
                    >
                    <th class="px-4 py-3 text-left text-sm font-semibold"
                        >{$t("spending.categories.description")}</th
                    >
                    <th class="px-4 py-3 text-center text-sm font-semibold"
                        >{$t("spending.table.actions")}</th
                    >
                </tr>
            </thead>
            <tbody>
                {#if loading}
                    <tr>
                        <td
                            colspan="4"
                            class="px-4 py-8 text-center text-gray-500"
                        >
                            {$t("spending.loading")}
                        </td>
                    </tr>
                {:else}
                    {#each categories as cat}
                        <tr class="border-b hover:bg-gray-50">
                            <td class="px-4 py-3">
                                <div
                                    class="w-8 h-8 rounded"
                                    style="background-color: {cat.color}"
                                ></div>
                            </td>
                            <td class="px-4 py-3 font-medium">{cat.name}</td>
                            <td class="px-4 py-3 text-sm text-gray-600"
                                >{cat.description || "-"}</td
                            >
                            <td class="px-4 py-3 text-center">
                                <button
                                    onclick={() => openEditModal(cat)}
                                    class="text-blue-600 hover:text-blue-800 text-sm mr-2"
                                >
                                    {$t("spending.table.edit")}
                                </button>
                                <button
                                    onclick={() => deleteCategory(cat.id)}
                                    class="text-red-600 hover:text-red-800 text-sm"
                                >
                                    {$t("spending.table.delete")}
                                </button>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>

<!-- Add/Edit Modal -->
{#if showAddModal}
    <div
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 class="text-2xl font-bold mb-4">
                {editingCategory
                    ? $t("spending.categories.edit_category")
                    : $t("spending.categories.new_category")}
            </h2>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("spending.categories.name_required")}</label
                    >
                    <input
                        type="text"
                        bind:value={newCategory.name}
                        class="w-full border rounded px-3 py-2"
                        placeholder={$t("spending.categories.name_placeholder")}
                        required
                    />
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("spending.categories.description")}</label
                    >
                    <textarea
                        bind:value={newCategory.description}
                        class="w-full border rounded px-3 py-2"
                        rows="2"
                        placeholder={$t(
                            "spending.categories.description_placeholder",
                        )}
                    ></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium mb-1"
                        >{$t("spending.categories.color")}</label
                    >
                    <input
                        type="color"
                        bind:value={newCategory.color}
                        class="w-full h-12 border rounded cursor-pointer"
                    />
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
                    onclick={saveCategory}
                    class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    {editingCategory
                        ? $t("spending.form.update")
                        : $t("spending.categories.new_category")}
                </button>
            </div>
        </div>
    </div>
{/if}
