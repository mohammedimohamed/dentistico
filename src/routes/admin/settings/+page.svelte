<script lang="ts">
    import { enhance } from "$app/forms";
    import type { ActionData, PageData } from "./$types";
    import { t } from "svelte-i18n";

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let isSaving = $state(false);
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
                        return async ({ update }) => {
                            await update();
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
                                    value={data.config.currency}
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
                                    value={data.config.currencySymbol}
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
                                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                >
                                    <option
                                        value="freeform"
                                        selected={data.config.bookingMode ===
                                            "freeform"}
                                        >{$t(
                                            "admin.settings.booking.freeform",
                                        )}</option
                                    >
                                    <option
                                        value="availability"
                                        selected={data.config.bookingMode ===
                                            "availability"}
                                        >{$t(
                                            "admin.settings.booking.availability",
                                        )}</option
                                    >
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
