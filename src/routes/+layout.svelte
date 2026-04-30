<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
    import { locale, waitLocale } from 'svelte-i18n';
    import { setupI18n } from '$lib/i18n';
    import { onMount } from 'svelte';
    import { Building2 } from "lucide-svelte";
    import { updateDentalColors } from '$lib/stores/dentalSettings.svelte';
    import { configStore } from '$lib/stores/config.svelte';

	let { data, children } = $props();

    // Initialize config store
    if (data.config) {
        configStore.init(data.config);
    }

    // CRITICAL: Initialize i18n synchronously before any render
    if (data.locale) {
        setupI18n(data.locale);
    }

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
            configStore.init(data.config);
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
    
    {#if data.config}
        {@html `
        <style>
            :root {
                --primary-color: ${data.config.primary_color || '#002147'};
                --secondary-color: ${data.config.secondary_color || '#D4AF37'};
                --font-serif: '${data.config.font_serif || 'Lora'}', serif;
                --font-sans: '${data.config.font_sans || 'Inter'}', sans-serif;
            }
        </style>
        `}
        
        <!-- Preload fonts if they are Google Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family={data.config.font_serif || 'Lora'}:ital,wght@0,400..700;1,400..700&family={data.config.font_sans || 'Inter'}:wght@300;400;500;600&display=swap" rel="stylesheet">
    {/if}

    {#if data.locale === 'ar'}
        {@html `
        <style>
            :root {
                --font-sans: 'Cairo', sans-serif !important;
                font-family: var(--font-sans) !important;
                line-height: 1.6 !important;
            }
        </style>
        `}
    {/if}
</svelte:head>

{#if $locale}
    {#await waitLocale()}
        <div class="min-h-screen flex items-center justify-center bg-gray-50">
            <div class="animate-spin text-4xl group">
                <Building2 size={48} class="text-indigo-600 animate-bounce" />
            </div>
        </div>
    {:then}
        {@render children()}
    {/await}
{:else}
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="animate-spin text-4xl">
            <Building2 size={48} class="text-indigo-600 animate-pulse" />
        </div>
    </div>
{/if}
