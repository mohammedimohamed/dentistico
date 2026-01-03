<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
    import { locale, waitLocale } from 'svelte-i18n';
    import { setupI18n } from '$lib/i18n';
    import { onMount } from 'svelte';

	let { data, children } = $props();

    // Initialize i18n on the client
    setupI18n(data.locale);

    let isRTL = $derived(data.locale === 'ar');

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }

    onMount(() => {
        // Sync document direction
        document.documentElement.dir = data.locale === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = data.locale;
        
        // Add Arabic font font if needed
        if (data.locale === 'ar') {
            const link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
    {#if data.locale === 'ar'}
        <style>
            :root {
                font-family: 'Cairo', sans-serif !important;
                line-height: 1.6 !important;
            }
        </style>
    {/if}
</svelte:head>

<div class="fixed top-4 right-4 z-[9999] flex gap-2">
    <button 
        onclick={() => setLanguage('fr')} 
        class="bg-white/80 backdrop-blur-sm border shadow-sm px-3 py-1 rounded-full text-xs font-bold transition-all hover:bg-white {data.locale === 'fr' ? 'border-indigo-600 text-indigo-600' : 'border-gray-200 text-gray-400'}"
    >
        FR
    </button>
    <button 
        onclick={() => setLanguage('ar')} 
        class="bg-white/80 backdrop-blur-sm border shadow-sm px-3 py-1 rounded-full text-xs font-bold transition-all hover:bg-white {data.locale === 'ar' ? 'border-indigo-600 text-indigo-600' : 'border-gray-200 text-gray-400'}"
    >
        AR (عربي)
    </button>
</div>

{#await waitLocale()}
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="animate-spin text-4xl">⏳</div>
    </div>
{:then}
    {@render children()}
{/await}
