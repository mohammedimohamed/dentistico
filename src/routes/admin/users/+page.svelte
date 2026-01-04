<script lang="ts">
    import { enhance } from "$app/forms";
    import type { PageData } from "./$types";
    import { t } from "svelte-i18n";

    let { data }: { data: PageData } = $props();
    let isCreateModalOpen = $state(false);
    let errorMessage = $state("");

    function getRoleBadgeColor(role: string) {
        switch (role) {
            case "admin":
                return "bg-purple-100 text-purple-800";
            case "doctor":
                return "bg-blue-100 text-blue-800";
            case "assistant":
                return "bg-green-100 text-green-800";
            case "patient":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    }
</script>

<div class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">
                {$t("admin.users.title")}
            </h1>
            <p class="text-sm text-gray-500">{$t("admin.users.description")}</p>
        </div>
        <button
            onclick={() => (isCreateModalOpen = true)}
            class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium shadow-sm transition-all"
        >
            + {$t("admin.users.createButton")}
        </button>
    </div>

    {#if errorMessage}
        <div
            class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        >
            {errorMessage}
        </div>
    {/if}

    <div
        class="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200"
    >
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("admin.users.table.name")}</th
                    >
                    <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("admin.users.table.username")}</th
                    >
                    <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("admin.users.table.role")}</th
                    >
                    <th
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("admin.users.table.created")}</th
                    >
                    <th
                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >{$t("admin.users.table.actions")}</th
                    >
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                {#each data.users as user}
                    <tr>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                            >{user.full_name}</td
                        >
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >{user.username}</td
                        >
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                                class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {user.is_active
                                    ? getRoleBadgeColor(user.role)
                                    : 'bg-gray-200 text-gray-500'}"
                            >
                                {user.is_active
                                    ? user.role.toUpperCase()
                                    : "INACTIVE"}
                            </span>
                        </td>
                        <td
                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >{new Date(
                                user.created_at,
                            ).toLocaleDateString()}</td
                        >
                        <td
                            class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                        >
                            <form
                                method="POST"
                                action="?/toggleUserStatus"
                                use:enhance
                                class="inline"
                            >
                                <input
                                    type="hidden"
                                    name="id"
                                    value={user.id}
                                />
                                <input
                                    type="hidden"
                                    name="is_active"
                                    value={user.is_active ? 0 : 1}
                                />
                                <button
                                    type="submit"
                                    class="{user.is_active
                                        ? 'text-red-600 hover:text-red-900'
                                        : 'text-green-600 hover:text-green-900'} ml-4 font-semibold"
                                    onclick={(e) =>
                                        !confirm(
                                            user.is_active
                                                ? "Are you sure you want to deactivate this user?"
                                                : "Activate this user?",
                                        ) && e.preventDefault()}
                                    >{user.is_active
                                        ? "Deactivate"
                                        : "Activate"}</button
                                >
                            </form>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

{#if isCreateModalOpen}
    <div
        class="fixed inset-0 z-[60] overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
    >
        <div class="flex items-center justify-center min-h-screen p-4">
            <!-- Overlay -->
            <button
                type="button"
                class="fixed inset-0 bg-gray-600 bg-opacity-50 transition-opacity w-full h-full cursor-default"
                aria-hidden="true"
                onclick={() => (isCreateModalOpen = false)}
            ></button>

            <!-- Modal Content -->
            <div
                class="relative bg-white rounded-xl shadow-2xl transform transition-all sm:max-w-lg sm:w-full overflow-hidden z-[70]"
            >
                <form
                    method="POST"
                    action="?/createUser"
                    use:enhance={() => {
                        return async ({ result, update }) => {
                            if (result.type === "success") {
                                isCreateModalOpen = false;
                                errorMessage = "";
                            } else if (result.type === "failure") {
                                errorMessage =
                                    (result.data as any)?.error ||
                                    "An error occurred";
                            }
                            await update();
                        };
                    }}
                >
                    <div class="bg-white px-6 pt-6 pb-4">
                        <div
                            class="flex items-center justify-between border-b pb-3 mb-5"
                        >
                            <h3 class="text-xl font-bold text-gray-900">
                                {$t("admin.users.modal.title")}
                            </h3>
                            <button
                                type="button"
                                onclick={() => (isCreateModalOpen = false)}
                                class="text-gray-400 hover:text-gray-500"
                            >
                                <span class="sr-only">Close</span>
                                <svg
                                    class="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <div class="space-y-4">
                            <div>
                                <label
                                    for="full_name"
                                    class="block text-sm font-semibold text-gray-700"
                                    >{$t("admin.users.modal.fullName")}</label
                                >
                                <input
                                    id="full_name"
                                    type="text"
                                    name="full_name"
                                    required
                                    placeholder={$t(
                                        "admin.users.modal.fullNamePlaceholder",
                                    )}
                                    class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label
                                    for="phone"
                                    class="block text-sm font-semibold text-gray-700"
                                    >{$t("admin.users.modal.phone")}</label
                                >
                                <input
                                    id="phone"
                                    type="tel"
                                    name="phone"
                                    placeholder={$t(
                                        "admin.users.modal.phonePlaceholder",
                                    )}
                                    class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label
                                    for="username"
                                    class="block text-sm font-semibold text-gray-700"
                                    >{$t("admin.users.modal.username")}</label
                                >
                                <input
                                    id="username"
                                    type="email"
                                    name="username"
                                    required
                                    placeholder={$t(
                                        "admin.users.modal.usernamePlaceholder",
                                    )}
                                    class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label
                                    for="password"
                                    class="block text-sm font-semibold text-gray-700"
                                    >{$t("admin.users.modal.password")}</label
                                >
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    placeholder={$t(
                                        "admin.users.modal.passwordPlaceholder",
                                    )}
                                    class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label
                                    for="confirm_password"
                                    class="block text-sm font-semibold text-gray-700"
                                    >{$t(
                                        "admin.users.modal.confirmPassword",
                                    )}</label
                                >
                                <input
                                    id="confirm_password"
                                    type="password"
                                    name="confirm_password"
                                    required
                                    placeholder={$t(
                                        "admin.users.modal.confirmPasswordPlaceholder",
                                    )}
                                    class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label
                                    for="role"
                                    class="block text-sm font-semibold text-gray-700"
                                    >{$t("admin.users.modal.role")}</label
                                >
                                <select
                                    id="role"
                                    name="role"
                                    required
                                    class="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                >
                                    <option value="doctor"
                                        >{$t(
                                            "admin.users.modal.roles.doctor",
                                        )}</option
                                    >
                                    <option value="assistant" selected
                                        >{$t(
                                            "admin.users.modal.roles.assistant",
                                        )}</option
                                    >
                                    <option value="admin"
                                        >{$t(
                                            "admin.users.modal.roles.admin",
                                        )}</option
                                    >
                                </select>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3"
                    >
                        <button
                            type="submit"
                            class="inline-flex justify-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {$t("admin.users.modal.createButton")}
                        </button>
                        <button
                            type="button"
                            class="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onclick={() => (isCreateModalOpen = false)}
                        >
                            {$t("common.cancel")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
{/if}
