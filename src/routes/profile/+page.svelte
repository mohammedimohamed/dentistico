<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import Header from "$lib/components/Header.svelte";
    import { NAVIGATION } from "$lib/config/navigation";
    import { page } from "$app/state";

    import type { PageData, ActionData } from "./$types";

    let {
        data,
        form,
    }: { data: PageData & { profile: any }; form: ActionData } = $props();

    const navItems = $derived(
        data.user?.role === "doctor"
            ? NAVIGATION.doctor
            : data.user?.role === "admin"
              ? NAVIGATION.admin
              : NAVIGATION.assistant,
    );

    let profileMessage = $state("");
    let passwordMessage = $state("");
</script>

<PortalShell
    {navItems}
    userName={data?.user?.full_name || "User"}
    headerTitle="common.profile"
    roleLabel={data.user?.role === "doctor"
        ? "common.doctor"
        : data.user?.role === "admin"
          ? "common.admin"
          : "common.assistant"}
>
    <div class="max-w-4xl mx-auto space-y-8">
        <!-- Profile Information Card -->
        <div
            class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
            <div class="px-8 py-6 bg-indigo-600">
                <h2 class="text-xl font-bold text-white">
                    {$t("patients.personal_info")}
                </h2>
                <p class="text-indigo-100 text-sm">
                    Update your public profile information
                </p>
            </div>

            <form
                method="POST"
                action="?/updateProfile"
                use:enhance={() => {
                    return async ({ result }) => {
                        if (result.type === "success") {
                            profileMessage = "Profile updated successfully!";
                        } else if (result.type === "failure") {
                            profileMessage =
                                (result.data?.message as string) ||
                                "Error updating profile";
                        }
                    };
                }}
                class="p-8 space-y-6"
            >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label
                            for="fullName"
                            class="text-sm font-semibold text-gray-700"
                            >{$t("patients.full_name")}</label
                        >
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={data.profile?.full_name || ""}
                            required
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div class="space-y-2">
                        <label
                            for="phone"
                            class="text-sm font-semibold text-gray-700"
                            >{$t("patients.phone")}</label
                        >
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={data.profile?.phone || ""}
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div class="space-y-2 md:col-span-2">
                        <label
                            for="username"
                            class="text-sm font-semibold text-gray-400"
                            >{$t("login.username")} (Read-only)</label
                        >
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={data.profile?.username || ""}
                            readonly
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed transition-all font-mono"
                        />
                        <p class="text-[10px] text-gray-400 ml-1">
                            Your username is your login ID and cannot be changed
                            for security reasons.
                        </p>
                    </div>
                </div>

                {#if profileMessage}
                    <div
                        class="p-4 rounded-xl {profileMessage.includes(
                            'successfully',
                        )
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'}"
                    >
                        {profileMessage}
                    </div>
                {/if}

                <div class="flex justify-end">
                    <button
                        type="submit"
                        class="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                    >
                        {$t("common.save")}
                    </button>
                </div>
            </form>
        </div>

        <!-- Password Change Card -->
        <div
            class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
            <div class="px-8 py-6 border-b border-gray-100">
                <h2 class="text-xl font-bold text-gray-900">Security</h2>
                <p class="text-gray-500 text-sm">
                    Manage your password and security settings
                </p>
            </div>

            <form
                method="POST"
                action="?/updatePassword"
                use:enhance={() => {
                    passwordMessage = "";
                    return async ({ result }) => {
                        if (result.type === "success") {
                            passwordMessage = "Password changed successfully!";
                        } else if (result.type === "failure") {
                            passwordMessage =
                                (result.data?.message as string) ||
                                "Error changing password";
                        }
                    };
                }}
                class="p-8 space-y-6"
            >
                <div class="space-y-6 max-w-md">
                    <div class="space-y-2">
                        <label
                            for="currentPassword"
                            class="text-sm font-semibold text-gray-700"
                            >Current Password</label
                        >
                        <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            required
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    <hr class="border-gray-100" />

                    <div class="space-y-2">
                        <label
                            for="newPassword"
                            class="text-sm font-semibold text-gray-700"
                            >New Password</label
                        >
                        <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            required
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    <div class="space-y-2">
                        <label
                            for="confirmPassword"
                            class="text-sm font-semibold text-gray-700"
                            >Confirm New Password</label
                        >
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            required
                            class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {#if passwordMessage}
                    <div
                        class="p-4 rounded-xl {passwordMessage.includes(
                            'successfully',
                        )
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'}"
                    >
                        {passwordMessage}
                    </div>
                {/if}

                <div class="flex justify-end pt-4">
                    <button
                        type="submit"
                        class="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg transition-all"
                    >
                        Update Password
                    </button>
                </div>
            </form>
        </div>
    </div>
</PortalShell>
