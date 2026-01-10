<script lang="ts">
    import { enhance } from "$app/forms";
    import type { ActionData, PageData } from "./$types";
    import { t } from "svelte-i18n";

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let isSaving = $state(false);
    let isCreatingTreatmentType = $state(false);
    let isEditingTreatmentType = $state(false);
    let editingTreatmentType = $state(null);

    async function deleteTreatmentType(id: number) {
        if (confirm($t("admin.settings.treatment_types.confirm_delete"))) {
            const formData = new FormData();
            formData.append('id', id.toString());

            const response = await fetch('?/deleteTreatmentType', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Reload the page to refresh the treatment types list
                window.location.reload();
            }
        }
    }

    // Local state for form fields to avoid Svelte/SvelteKit "reset" issues
    let currency = $state(data.config.currency);
    let currencySymbol = $state(data.config.currencySymbol);
    let bookingMode = $state(data.config.bookingMode);

    // Sync if data changes (e.g. on fresh load or after server update)
    $effect(() => {
        if (data.config) {
            currency = data.config.currency;
            currencySymbol = data.config.currencySymbol;
            bookingMode = data.config.bookingMode;
        }
    });
</script>

<div class="py-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 class="text-2xl font-semibold text-gray-900">
            {$t("admin.settings.title")}
        </h1>
        <p class="mt-1 text-sm text-gray-500">
            {$t("admin.settings.description")}
        </p>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-8">
        <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900">
                    {$t("admin.settings.financial.title")}
                </h3>
                <div class="mt-2 max-w-xl text-sm text-gray-500">
                    <p>{$t("admin.settings.financial.description")}</p>
                </div>

                <form
                    method="POST"
                    action="?/updateConfig"
                    use:enhance={() => {
                        isSaving = true;
                        // Avoid resetting the form which causes the fields to clear
                        return async ({ update, result }) => {
                            // Only update if successful
                            if (result.type === "success") {
                                // Re-run load function to get fresh data
                                await update({ reset: false });
                            } else {
                                await update();
                            }
                            isSaving = false;
                        };
                    }}
                    class="mt-5 space-y-6"
                >
                    <div
                        class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6"
                    >
                        <div class="sm:col-span-3">
                            <label
                                for="currency"
                                class="block text-sm font-medium text-gray-700"
                                >{$t(
                                    "admin.settings.financial.currencyCode",
                                )}</label
                            >
                            <div class="mt-1">
                                <input
                                    type="text"
                                    name="currency"
                                    id="currency"
                                    bind:value={currency}
                                    placeholder={$t(
                                        "admin.settings.financial.currencyPlaceholder",
                                    )}
                                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                                <p class="mt-1 text-xs text-gray-400">
                                    {$t(
                                        "admin.settings.financial.currencyHelp",
                                    )}
                                </p>
                            </div>
                        </div>

                        <div class="sm:col-span-3">
                            <label
                                for="currencySymbol"
                                class="block text-sm font-medium text-gray-700"
                                >{$t(
                                    "admin.settings.financial.currencySymbol",
                                )}</label
                            >
                            <div class="mt-1">
                                <input
                                    type="text"
                                    name="currencySymbol"
                                    id="currencySymbol"
                                    bind:value={currencySymbol}
                                    placeholder={$t(
                                        "admin.settings.financial.symbolPlaceholder",
                                    )}
                                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                                <p class="mt-1 text-xs text-gray-400">
                                    {$t("admin.settings.financial.symbolHelp")}
                                </p>
                            </div>
                        </div>

                        <div class="sm:col-span-6">
                            <label
                                for="bookingMode"
                                class="block text-sm font-medium text-gray-700"
                                >{$t("admin.settings.booking.mode")}</label
                            >
                            <div class="mt-1">
                                <select
                                    name="bookingMode"
                                    id="bookingMode"
                                    bind:value={bookingMode}
                                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                >
                                    <option value="freeform">
                                        {$t("admin.settings.booking.freeform")}
                                    </option>
                                    <option value="availability">
                                        {$t(
                                            "admin.settings.booking.availability",
                                        )}
                                    </option>
                                </select>
                                <p class="mt-1 text-xs text-gray-400">
                                    {$t("admin.settings.booking.help")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {#if form?.message}
                        <div class="rounded-md bg-red-50 p-4">
                            <div class="flex">
                                <div class="ml-3">
                                    <h3
                                        class="text-sm font-medium text-red-800"
                                    >
                                        {form.message}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    {/if}

                    {#if form?.success}
                        <div class="rounded-md bg-green-50 p-4">
                            <div class="flex">
                                <div class="ml-3">
                                    <h3
                                        class="text-sm font-medium text-green-800"
                                    >
                                        {$t("admin.settings.success")}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <div class="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isSaving
                                ? $t("common.loading")
                                : $t("admin.settings.saveButton")}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div class="mt-10 bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">
                    {$t("admin.settings.treatment_types.title")}
                </h3>
                <p class="mt-1 text-sm text-gray-500 mb-6">
                    {$t("admin.settings.treatment_types.description")}
                </p>

                <!-- Treatment Types List -->
                <div class="space-y-4 mb-6">
                    {#each data.treatmentTypes as treatmentType (treatmentType.id)}
                        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                                <h4 class="font-medium text-gray-900">{treatmentType.name}</h4>
                                {#if treatmentType.description}
                                    <p class="text-sm text-gray-500">{treatmentType.description}</p>
                                {/if}
                            </div>
                            <div class="flex space-x-2">
                                <button
                                    type="button"
                                    onclick={() => {
                                        editingTreatmentType = treatmentType;
                                        isEditingTreatmentType = true;
                                    }}
                                    class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                >
                                    {$t("common.edit")}
                                </button>
                                <button
                                    type="button"
                                    onclick={() => deleteTreatmentType(treatmentType.id)}
                                    class="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                    {$t("common.delete")}
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>

                <!-- Add New Treatment Type Button -->
                <button
                    type="button"
                    onclick={() => {
                        editingTreatmentType = null;
                        isCreatingTreatmentType = true;
                    }}
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <span>+</span>
                    <span class="ml-2">{$t("admin.settings.treatment_types.add_button")}</span>
                </button>
            </div>
        </div>

        <!-- Create/Edit Treatment Type Modal -->
        {#if isCreatingTreatmentType || isEditingTreatmentType}
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" id="treatment-type-modal">
                <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">
                            {isEditingTreatmentType ? $t("admin.settings.treatment_types.edit_title") : $t("admin.settings.treatment_types.create_title")}
                        </h3>

                        <form
                            method="POST"
                            action={isEditingTreatmentType ? "?/updateTreatmentType" : "?/createTreatmentType"}
                            use:enhance={() => {
                                isCreatingTreatmentType = false;
                                isEditingTreatmentType = false;
                                editingTreatmentType = null;
                                return async ({ update, result }) => {
                                    if (result.type === "success") {
                                        await update({ reset: false });
                                    }
                                };
                            }}
                        >
                            {#if isEditingTreatmentType}
                                <input type="hidden" name="id" value={editingTreatmentType.id} />
                            {/if}

                            <div class="mb-4">
                                <label for="name" class="block text-sm font-medium text-gray-700">
                                    {$t("admin.settings.treatment_types.name_label")}
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    value={editingTreatmentType?.name || ''}
                                    required
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>

                            <div class="mb-4">
                                <label for="description" class="block text-sm font-medium text-gray-700">
                                    {$t("admin.settings.treatment_types.description_label")}
                                </label>
                                <textarea
                                    name="description"
                                    id="description"
                                    rows="3"
                                    value={editingTreatmentType?.description || ''}
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder={$t("admin.settings.treatment_types.description_placeholder")}
                                ></textarea>
                            </div>

                            <div class="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onclick={() => {
                                        isCreatingTreatmentType = false;
                                        isEditingTreatmentType = false;
                                        editingTreatmentType = null;
                                    }}
                                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    {$t("common.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    {isEditingTreatmentType ? $t("common.save") : $t("common.add")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        {/if}

        <div
            class="mt-10 bg-white shadow sm:rounded-lg overflow-hidden border border-amber-200"
        >
            <div class="px-4 py-5 sm:p-6 bg-amber-50">
                <h3
                    class="text-lg font-medium leading-6 text-amber-900 flex items-center gap-2"
                >
                    <span>⚠️</span>
                    {$t("admin.settings.advanced.title")}
                </h3>
                <div class="mt-2 text-sm text-amber-700">
                    <p>{$t("admin.settings.advanced.description")}</p>
                </div>
                <div
                    class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60"
                >
                    <div class="border border-amber-200 rounded p-3 bg-white">
                        <p class="font-bold text-xs uppercase text-amber-800">
                            {$t("admin.settings.advanced.clinicName")}
                        </p>
                        <p class="text-sm">Dentistico Clinic</p>
                    </div>
                    <div class="border border-amber-200 rounded p-3 bg-white">
                        <p class="font-bold text-xs uppercase text-amber-800">
                            {$t("admin.settings.advanced.bookingInterval")}
                        </p>
                        <p class="text-sm">
                            {$t("admin.settings.advanced.bookingValue")}
                        </p>
                    </div>
                    <div class="border border-amber-200 rounded p-3 bg-white">
                        <p class="font-bold text-xs uppercase text-amber-800">
                            {$t("admin.settings.advanced.workHours")}
                        </p>
                        <p class="text-sm">
                            {$t("admin.settings.advanced.workHoursValue")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
