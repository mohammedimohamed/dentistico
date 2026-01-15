<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import type { PageData, ActionData } from "./$types";

    let { data, form }: { data: any; form: ActionData } = $props();
    let showAddModal = $state(false);
    let importStatus = $state<{ success: boolean; count: number } | null>(null);

    $effect(() => {
        if (form?.success && form?.importedCount) {
            importStatus = { success: true, count: form.importedCount };
            setTimeout(() => {
                importStatus = null;
            }, 5000);
        }
    });
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex justify-between items-center mb-8">
        <div>
            <h1 class="text-3xl font-bold text-gray-900">
                {$t("medications.title")}
            </h1>
            <p class="mt-2 text-sm text-gray-600">
                {$t("medications.subtitle")}
            </p>
        </div>
        <div class="flex space-x-3">
            <a
                href="medications/download"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <svg
                    class="-ml-1 mr-2 h-5 w-5 text-gray-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                </svg>
                {$t("medications.download_template")}
            </a>

            <form
                action="?/importMedications"
                method="POST"
                enctype="multipart/form-data"
                use:enhance
                class="relative"
            >
                <label
                    for="file-upload"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                >
                    <svg
                        class="-ml-1 mr-2 h-5 w-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                    </svg>
                    {$t("medications.import_label")}
                </label>
                <input
                    id="file-upload"
                    name="file"
                    type="file"
                    accept=".xlsx"
                    class="sr-only"
                    onchange={(e) => e.currentTarget.form?.requestSubmit()}
                />
            </form>

            <button
                onclick={() => (showAddModal = true)}
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <svg
                    class="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                {$t("medications.add_button")}
            </button>
        </div>
    </div>

    {#if importStatus}
        <div
            class="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded shadow-sm animate-in fade-in slide-in-from-top-4"
        >
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg
                        class="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-green-700">
                        {$t("medications.import_success", {
                            values: { count: importStatus.count },
                        })}
                    </p>
                </div>
            </div>
        </div>
    {/if}

    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th
                        scope="col"
                        class="px-6 py-3 text-inline-start text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("medications.table.name")}</th
                    >
                    <th
                        scope="col"
                        class="px-6 py-3 text-inline-start text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("medications.table.dosage")}</th
                    >
                    <th
                        scope="col"
                        class="px-6 py-3 text-inline-start text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("medications.table.forme")}</th
                    >
                    <th
                        scope="col"
                        class="px-6 py-3 text-inline-start text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("medications.table.instructions")}</th
                    >
                    <th scope="col" class="relative px-6 py-3">
                        <span class="sr-only">{$t("common.actions")}</span>
                    </th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                {#each data.medications as medication}
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-medium text-gray-900">
                                {medication.name}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-500">
                                {medication.default_dosage || "-"}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-500">
                                {medication.forme || "-"}
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="text-sm text-gray-500 line-clamp-1">
                                {medication.instructions || "-"}
                            </div>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-inline-end text-sm font-medium"
                        >
                            <form
                                action="?/deleteMedication"
                                method="POST"
                                use:enhance
                            >
                                <input
                                    type="hidden"
                                    name="id"
                                    value={medication.id}
                                />
                                <button
                                    type="submit"
                                    class="text-red-600 hover:text-red-900 ml-4"
                                    >{$t("common.delete")}</button
                                >
                            </form>
                        </td>
                    </tr>
                {/each}
                {#if data.medications.length === 0}
                    <tr>
                        <td
                            colspan="4"
                            class="px-6 py-10 text-center text-gray-500"
                        >
                            {$t("medications.empty_state")}
                        </td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </div>

    {#if showAddModal}
        <div
            class="fixed z-10 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
            >
                <div
                    class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                    onclick={() => (showAddModal = false)}
                ></div>

                <span
                    class="hidden sm:inline-block sm:align-middle sm:h-screen"
                    aria-hidden="true">&#8203;</span
                >

                <div
                    class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
                >
                    <div>
                        <div
                            class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100"
                        >
                            <svg
                                class="h-6 w-6 text-indigo-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                        </div>
                        <div class="mt-3 text-center sm:mt-5">
                            <h3
                                class="text-lg leading-6 font-medium text-gray-900"
                                id="modal-title"
                            >
                                {$t("medications.modal.title")}
                            </h3>
                        </div>
                    </div>
                    <form
                        action="?/addMedication"
                        method="POST"
                        use:enhance={() => {
                            return async ({ result, update }) => {
                                if (result.type === "success") {
                                    showAddModal = false;
                                }
                                await update();
                            };
                        }}
                        class="mt-5 sm:mt-6 space-y-4"
                    >
                        <div>
                            <label
                                for="name"
                                class="block text-sm font-medium text-gray-700"
                                >{$t("medications.modal.name_label")}</label
                            >
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={$t(
                                    "medications.modal.name_placeholder",
                                )}
                            />
                        </div>
                        <div>
                            <label
                                for="default_dosage"
                                class="block text-sm font-medium text-gray-700"
                                >{$t("medications.modal.dosage_label")}</label
                            >
                            <input
                                type="text"
                                name="default_dosage"
                                id="default_dosage"
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={$t(
                                    "medications.modal.dosage_placeholder",
                                )}
                            />
                        </div>
                        <div>
                            <label
                                for="forme"
                                class="block text-sm font-medium text-gray-700"
                                >{$t("medications.modal.forme_label")}</label
                            >
                            <input
                                type="text"
                                name="forme"
                                id="forme"
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={$t(
                                    "medications.modal.forme_placeholder",
                                )}
                            />
                        </div>
                        <div>
                            <label
                                for="instructions"
                                class="block text-sm font-medium text-gray-700"
                                >{$t(
                                    "medications.modal.instructions_label",
                                )}</label
                            >
                            <textarea
                                name="instructions"
                                id="instructions"
                                rows="3"
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder={$t(
                                    "medications.modal.instructions_placeholder",
                                )}
                            ></textarea>
                        </div>
                        <div class="mt-5 sm:mt-6 flex space-x-3">
                            <button
                                type="button"
                                onclick={() => (showAddModal = false)}
                                class="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                            >
                                {$t("common.cancel")}
                            </button>
                            <button
                                type="submit"
                                class="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                            >
                                {$t("common.save")}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    {/if}
</div>
