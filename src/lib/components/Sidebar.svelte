<script lang="ts">
    import { page } from "$app/state";
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";

    interface NavItem {
        id?: string;
        label: string;
        href?: string;
        icon: string;
        onClick?: () => void;
    }

    interface Props {
        items: NavItem[];
        activeId?: string;
        title: string;
        userName: string;
    }

    let { items, activeId, title, userName }: Props = $props();
    let isCollapsed = $state(false);

    const icons = {
        dashboard:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />',
        patients:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />',
        inventory:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />',
        medications:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />',
        schedule:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />',
        invoices:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />',
        spending:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />',
        categories:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />',
        settings:
            '<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />',
        pill: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />',
    };
</script>

<aside
    class="bg-gray-900 text-white h-screen sticky top-0 transition-all duration-300 flex flex-col {isCollapsed
        ? 'w-16'
        : 'w-56'} border-inline-end border-gray-800 flex-shrink-0"
>
    <div class="p-6 flex items-center justify-between border-b border-gray-800">
        {#if !isCollapsed}
            <span class="text-base font-bold tracking-tight text-indigo-400"
                >{title}</span
            >
        {/if}
        <button
            onclick={() => (isCollapsed = !isCollapsed)}
            class="p-2 rounded-lg hover:bg-gray-800 text-gray-400 mirrored-rtl"
        >
            {isCollapsed ? "→" : "←"}
        </button>
    </div>

    <nav
        class="flex-1 {isCollapsed
            ? 'px-2'
            : 'px-4'} py-8 space-y-2 overflow-y-auto"
    >
        {#each items as item}
            {#if item.href}
                <a
                    href={item.href}
                    class="flex items-center {isCollapsed
                        ? 'justify-center'
                        : 'gap-4 px-4'} py-3 rounded-xl transition-all {(
                        item.href === '/admin' ||
                        item.href === '/doctor/dashboard' ||
                        item.href === '/assistant/dashboard'
                            ? page.url.pathname === item.href
                            : page.url.pathname.startsWith(item.href) &&
                              !items.some(
                                  (i) =>
                                      i.href &&
                                      i.href !== item.href &&
                                      i.href.length > item.href.length &&
                                      page.url.pathname.startsWith(i.href),
                              )
                    )
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
                >
                    <span class="w-6 h-6">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="size-5"
                        >
                            {@html (icons as any)[item.icon] || ""}
                        </svg>
                    </span>
                    {#if !isCollapsed}
                        <span class="text-xs font-medium whitespace-nowrap"
                            >{$t(item.label)}</span
                        >
                    {/if}
                </a>
            {:else}
                <button
                    onclick={item.onClick}
                    class="w-full flex items-center {isCollapsed
                        ? 'justify-center'
                        : 'gap-4 px-4'} py-3 rounded-xl transition-all {activeId ===
                    item.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
                >
                    <span class="w-6 h-6">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="size-5"
                        >
                            {@html (icons as any)[item.icon] || ""}
                        </svg>
                    </span>
                    {#if !isCollapsed}
                        <span class="text-xs font-medium whitespace-nowrap"
                            >{$t(item.label)}</span
                        >
                    {/if}
                </button>
            {/if}
        {/each}
    </nav>

    <div
        class="{isCollapsed
            ? 'p-2'
            : 'p-4'} border-t border-gray-800 text-start"
    >
        <div
            class="flex items-center {isCollapsed
                ? 'justify-center'
                : 'gap-3'} mb-4"
        >
            <div
                class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white shadow-inner"
            >
                {userName.charAt(0)}
            </div>
            {#if !isCollapsed}
                <div class="flex flex-col overflow-hidden">
                    <span
                        class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1"
                        >{$t("common.user")}</span
                    >
                    <span class="text-sm font-medium truncate">{userName}</span>
                </div>
            {/if}
        </div>

        <form
            action="/logout"
            method="POST"
            use:enhance={() => {
                return async () => {
                    window.location.href = "/login";
                };
            }}
        >
            <button
                type="submit"
                class="w-full flex items-center {isCollapsed
                    ? 'justify-center'
                    : 'gap-4 px-4'} py-3 rounded-xl text-red-100 bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/20"
            >
                <span class="w-6 h-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                        />
                    </svg>
                </span>
                {#if !isCollapsed}
                    <span class="text-sm font-bold">{$t("common.logout")}</span>
                {/if}
            </button>
        </form>
    </div>
</aside>
