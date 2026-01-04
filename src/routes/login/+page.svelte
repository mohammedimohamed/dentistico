<script lang="ts">
    import { enhance } from "$app/forms";
    import type { ActionData } from "./$types";
    import { t } from "svelte-i18n";

    let { form }: { form: ActionData } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div
        class="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg border border-gray-100"
    >
        <div class="text-center">
            <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
                Dentistico
            </h2>
            <p class="mt-2 text-sm text-gray-600">{$t("login.subtitle")}</p>
        </div>
        <form class="mt-8 space-y-6" method="POST" use:enhance>
            <div class="rounded-md shadow-sm -space-y-px">
                <div>
                    <label for="username" class="sr-only"
                        >{$t("login.username")}</label
                    >
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center"
                        placeholder={$t("login.username")}
                    />
                </div>
                <div>
                    <label for="password" class="sr-only"
                        >{$t("login.password")}</label
                    >
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center"
                        placeholder={$t("login.password")}
                    />
                </div>
            </div>

            {#if form?.missing}
                <p class="text-red-500 text-sm text-center">
                    {$t("login.errors.missing")}
                </p>
            {/if}
            {#if form?.incorrect}
                <p class="text-red-500 text-sm text-center">
                    {$t("login.errors.incorrect")}
                </p>
            {/if}
            {#if form?.inactive}
                <p class="text-red-500 text-sm text-center">
                    {form.error || "Account deactivated"}
                </p>
            {/if}

            <div>
                <button
                    type="submit"
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    {$t("login.signIn")}
                </button>
            </div>
        </form>
    </div>
</div>
