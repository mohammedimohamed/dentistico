<script lang="ts">
    import { enhance } from "$app/forms";
    import type { ActionData } from "./$types";
    import { t, locale } from "svelte-i18n";

    let { form, data }: { form: ActionData; data: any } = $props();

    let isLoading = $state(false);
    let seconds = $state(0);
    let ms = $state(0);
    let startTime = 0;
    let timerId: any;

    function startTimer() {
        startTime = Date.now();
        timerId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            seconds = Math.floor(elapsed / 1000);
            ms = elapsed % 1000;
        }, 10);
    }

    function stopTimer() {
        clearInterval(timerId);
        // Don't reset immediately so user sees the final time for a split second
        setTimeout(() => {
            if (!isLoading) {
                seconds = 0;
                ms = 0;
            }
        }, 500);
    }

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }
</script>

<div
    class="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden"
>
    <!-- Background Decor -->
    <div
        class="absolute top-0 -left-4 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
    ></div>
    <div
        class="absolute bottom-0 -right-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"
    ></div>

    <!-- Language Selector -->
    <div
        class="absolute top-6 right-6 flex gap-2 bg-white/50 backdrop-blur-md border border-slate-200 rounded-2xl p-1.5 z-10 shadow-sm"
    >
        <button
            onclick={() => setLanguage("fr")}
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all {$locale ===
            'fr'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                : 'text-slate-500 hover:bg-slate-100'}"
        >
            FR
        </button>
        <button
            onclick={() => setLanguage("ar")}
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all {$locale ===
            'ar'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                : 'text-slate-500 hover:bg-slate-100'}"
        >
            AR
        </button>
    </div>

    <div class="max-w-md w-full mx-4 relative z-10">
        <div
            class="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
            <div class="p-8 md:p-12">
                <div class="text-center mb-10">
                    <div
                        class="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-2xl mb-6 text-3xl"
                    >
                        🏥
                    </div>
                    <h2
                        class="text-3xl font-black text-slate-900 tracking-tight"
                    >
                        {data.config?.clinicName || "Dentistico"}
                    </h2>
                    <p class="mt-3 text-slate-500 font-medium">
                        {$t("login.subtitle")}
                    </p>
                </div>

                <form
                    class="space-y-6"
                    method="POST"
                    use:enhance={() => {
                        isLoading = true;
                        startTimer();
                        return async ({ update, result }) => {
                            if (
                                result.type === "failure" ||
                                result.type === "error"
                            ) {
                                isLoading = false;
                                stopTimer();
                            }
                            await update();
                        };
                    }}
                >
                    <div class="space-y-4">
                        <div class="group">
                            <label
                                for="username"
                                class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                            >
                                {$t("login.username")}
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-slate-900 placeholder-slate-300 font-medium"
                                placeholder={$t("login.username")}
                            />
                        </div>
                        <div class="group">
                            <label
                                for="password"
                                class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1"
                            >
                                {$t("login.password")}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-slate-900 placeholder-slate-300 font-medium"
                                placeholder={$t("login.password")}
                            />
                        </div>
                    </div>

                    {#if form?.missing}
                        <div
                            class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center animate-bounce-short"
                        >
                            {$t("login.errors.missing")}
                        </div>
                    {/if}
                    {#if form?.incorrect}
                        <div
                            class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center animate-bounce-short"
                        >
                            {$t("login.errors.incorrect")}
                        </div>
                    {/if}
                    {#if form?.inactive}
                        <div
                            class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center animate-bounce-short"
                        >
                            {form.error || "Account deactivated"}
                        </div>
                    {/if}

                    <button
                        type="submit"
                        disabled={isLoading}
                        class="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {$t("login.signIn")}
                    </button>
                </form>
            </div>

            <div
                class="bg-slate-50/50 p-6 border-t border-slate-50 text-center space-y-4"
            >
                <a
                    href="/"
                    class="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors group"
                >
                    <span
                        class="mr-2 group-hover:-translate-x-1 transition-transform"
                        >←</span
                    >
                    {$t("login.back_to_portal") || "Back to Portal"}
                </a>
                <p
                    class="text-xs text-slate-400 font-medium uppercase tracking-tight"
                >
                    Secure Clinical Access Node v2.0
                </p>
            </div>

        </div>
    </div>
</div>

<!-- Premium Loading Overlay -->
{#if isLoading}
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-xl transition-all duration-500"
    >
        <div class="text-center">
            <!-- Advanced Spinner -->
            <div class="relative w-48 h-48 mx-auto mb-10">
                <!-- Decorative background ring -->
                <div
                    class="absolute inset-0 rounded-full border-8 border-slate-100/50"
                ></div>

                <!-- Rotating SVG container -->
                <svg
                    class="w-full h-full -rotate-90 animate-loader-spin overflow-visible"
                >
                    <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#4f46e5"
                        stroke-width="8"
                        stroke-dasharray="502"
                        stroke-dashoffset="502"
                        stroke-linecap="round"
                        class="animate-loader-dash"
                    />
                    <!-- Glow effect -->
                    <circle
                        cx="96"
                        cy="96"
                        r="80"
                        fill="none"
                        stroke="#4f46e5"
                        stroke-width="12"
                        stroke-dasharray="502"
                        stroke-dashoffset="502"
                        stroke-linecap="round"
                        class="animate-loader-dash opacity-20 blur-sm"
                    />
                </svg>

                <!-- Timer text that stays upright despite rotation -->
                <div
                    class="absolute inset-0 flex flex-col items-center justify-center"
                >
                    <div class="text-center">
                        <span
                            class="text-4xl font-black text-slate-900 font-mono tracking-tighter tabular-nums"
                        >
                            {seconds}<span class="text-indigo-600">.</span>{ms
                                .toString()
                                .padStart(3, "0")}
                        </span>
                        <div
                            class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 ml-1"
                        >
                            Seconds
                        </div>
                    </div>
                </div>
            </div>

            <div class="space-y-3">
                <h3 class="text-2xl font-black text-slate-900 tracking-tight">
                    Authenticating
                </h3>
                <p class="text-slate-500 font-medium animate-pulse">
                    Establishing secure encrypted session...
                </p>
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes loader-dash {
        0% {
            stroke-dashoffset: 502;
        }
        50% {
            stroke-dashoffset: 125;
        }
        100% {
            stroke-dashoffset: 502;
        }
    }
    @keyframes loader-spin {
        0% {
            transform: rotate(-90deg);
        }
        100% {
            transform: rotate(270deg);
        }
    }
    .animate-loader-dash {
        animation: loader-dash 2s ease-in-out infinite;
    }
    .animate-loader-spin {
        animation: loader-spin 3s linear infinite;
    }
    @keyframes bounce-short {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-4px);
        }
    }
    .animate-bounce-short {
        animation: bounce-short 0.5s ease-in-out infinite;
    }
</style>
