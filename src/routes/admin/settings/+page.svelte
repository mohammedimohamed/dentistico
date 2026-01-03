<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();
    
    let isSaving = $state(false);
</script>

<div class="py-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 class="text-2xl font-semibold text-gray-900">System Settings</h1>
        <p class="mt-1 text-sm text-gray-500">Configure global application parameters like currency and clinic details.</p>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-8">
        <div class="bg-white shadow sm:rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <h3 class="text-lg font-medium leading-6 text-gray-900">Financial Configuration</h3>
                <div class="mt-2 max-w-xl text-sm text-gray-500">
                    <p>These settings affect how prices and payments are displayed throughout the system.</p>
                </div>
                
                <form method="POST" action="?/updateConfig" use:enhance={() => {
                    isSaving = true;
                    return async ({ update }) => {
                        await update();
                        isSaving = false;
                    };
                }} class="mt-5 space-y-6">
                    <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div class="sm:col-span-3">
                            <label for="currency" class="block text-sm font-medium text-gray-700">Currency Code</label>
                            <div class="mt-1">
                                <input 
                                    type="text" 
                                    name="currency" 
                                    id="currency" 
                                    value={data.config.currency}
                                    placeholder="e.g., USD"
                                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                                <p class="mt-1 text-xs text-gray-400">Standard 3-letter currency code (DZD, USD, EUR, etc.)</p>
                            </div>
                        </div>

                        <div class="sm:col-span-3">
                            <label for="currencySymbol" class="block text-sm font-medium text-gray-700">Currency Symbol</label>
                            <div class="mt-1">
                                <input 
                                    type="text" 
                                    name="currencySymbol" 
                                    id="currencySymbol" 
                                    value={data.config.currencySymbol}
                                    placeholder="e.g., $"
                                    class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                                <p class="mt-1 text-xs text-gray-400">The symbol displayed next to amounts ($, €, دج, etc.)</p>
                            </div>
                        </div>
                    </div>

                    {#if form?.message}
                        <div class="rounded-md bg-red-50 p-4">
                            <div class="flex">
                                <div class="ml-3">
                                    <h3 class="text-sm font-medium text-red-800">{form.message}</h3>
                                </div>
                            </div>
                        </div>
                    {/if}

                    {#if form?.success}
                        <div class="rounded-md bg-green-50 p-4">
                            <div class="flex">
                                <div class="ml-3">
                                    <h3 class="text-sm font-medium text-green-800">Settings saved successfully!</h3>
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
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <div class="mt-10 bg-white shadow sm:rounded-lg overflow-hidden border border-amber-200">
            <div class="px-4 py-5 sm:p-6 bg-amber-50">
                <h3 class="text-lg font-medium leading-6 text-amber-900 flex items-center gap-2">
                    <span>⚠️</span> Advanced Configuration (Future)
                </h3>
                <div class="mt-2 text-sm text-amber-700">
                    <p>The following parameters are currently managed via the CMS (Landing Page Config) and will be integrated into this dashboard in future updates:</p>
                </div>
                <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60">
                    <div class="border border-amber-200 rounded p-3 bg-white">
                        <p class="font-bold text-xs uppercase text-amber-800">Clinic Name</p>
                        <p class="text-sm">Dentistico Clinic</p>
                    </div>
                    <div class="border border-amber-200 rounded p-3 bg-white">
                        <p class="font-bold text-xs uppercase text-amber-800">Booking Interval</p>
                        <p class="text-sm">30 Minutes</p>
                    </div>
                    <div class="border border-amber-200 rounded p-3 bg-white">
                        <p class="font-bold text-xs uppercase text-amber-800">Work Hours</p>
                        <p class="text-sm">08:00 - 18:00</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
