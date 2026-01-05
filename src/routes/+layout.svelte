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

{#await waitLocale()}
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="animate-spin text-4xl">⏳</div>
    </div>
{:then}
    {@render children()}
{/await}
