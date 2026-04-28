<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
    import { locale, waitLocale } from 'svelte-i18n';
    import { setupI18n } from '$lib/i18n';
    import { onMount } from 'svelte';

	let { data, children } = $props();

    import { updateDentalColors } from '$lib/stores/dentalSettings.svelte';

    // Synchronous initialization to prevent i18n race conditions
    setupI18n(data.locale);

    // Initialize dental colors from DB config synchronously
    if (data.config) {
        const dentalColorsFromConfig: Record<string, string> = {};
        Object.entries(data.config).forEach(([key, value]) => {
            if (key.startsWith('dental_color_')) {
                const colorKey = key.replace('dental_color_', '').toUpperCase();
                dentalColorsFromConfig[colorKey] = value as string;
            }
        });
        if (Object.keys(dentalColorsFromConfig).length > 0) {
            updateDentalColors(dentalColorsFromConfig);
        }
    }

    // Handle reactive updates
    $effect(() => {
        if (data.locale) {
            setupI18n(data.locale);
        }

        if (data.config) {
            const dentalColorsFromConfig: Record<string, string> = {};
            Object.entries(data.config).forEach(([key, value]) => {
                if (key.startsWith('dental_color_')) {
                    const colorKey = key.replace('dental_color_', '').toUpperCase();
                    dentalColorsFromConfig[colorKey] = value as string;
                }
            });
            if (Object.keys(dentalColorsFromConfig).length > 0) {
                updateDentalColors(dentalColorsFromConfig);
            }
        }
    });

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
