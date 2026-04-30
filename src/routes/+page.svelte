<script lang="ts">
    import { onMount } from 'svelte';
    import { locale, t } from 'svelte-i18n';
    import { fade, fly } from 'svelte/transition';

    let { data } = $props();

    let scrolled = $state(false);

    // Clinic Data (using config if available)
    const clinic = $derived({
        name: data.config?.clinic_name || "Excellence Dental Clinic",
        phone: data.config?.phone || "+1 (555) 123-4567",
        address: data.config?.address || "123 Elegance Blvd, Suite 400, New York, NY",
        email: data.config?.email || "contact@excellencedental.com",
        hours: data.config?.workHours || "Mon - Fri: 9:00 AM - 6:00 PM"
    });

    onMount(() => {
        const handleScroll = () => {
            scrolled = window.scrollY > 50;
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    });

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }
</script>

<svelte:head>
    <title>{clinic.name} | Premium Dental Care</title>
</svelte:head>

<div class="min-h-screen bg-[#FDFCFB] font-sans text-slate-900 overflow-x-hidden">
    <!-- Top Contact Bar -->
    <div class="bg-[var(--primary-color)] text-[var(--secondary-color)] py-2 px-6 text-xs font-medium tracking-widest uppercase hidden md:block">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div class="flex gap-6">
                <span class="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {clinic.phone}
                </span>
                <span class="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {clinic.address}
                </span>
            </div>
            <div class="flex gap-4">
                <button onclick={() => setLanguage('en')} class="transition-colors {$locale === 'en' ? 'text-white border-b border-white font-bold' : 'hover:text-white'}">EN</button>
                <button onclick={() => setLanguage('fr')} class="transition-colors {$locale === 'fr' ? 'text-white border-b border-white font-bold' : 'hover:text-white'}">FR</button>
                <button onclick={() => setLanguage('ar')} class="transition-colors {$locale === 'ar' ? 'text-white border-b border-white font-bold' : 'hover:text-white'}">AR</button>
            </div>
        </div>
    </div>

    <!-- Main Navigation -->
    <nav class="sticky top-0 z-50 transition-all duration-500 {scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-8'}">
        <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <a href="/" class="group">
                <h1 class="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[var(--primary-color)]">
                    {clinic.name.split(' ')[0]} <span class="text-[var(--secondary-color)] font-normal italic">{clinic.name.split(' ').slice(1).join(' ')}</span>
                </h1>
                <div class="h-0.5 bg-[var(--secondary-color)] w-0 group-hover:w-full transition-all duration-500"></div>
            </a>

            <div class="flex items-center gap-4 md:gap-8">
                <a href="/login" class="text-sm font-semibold uppercase tracking-widest text-slate-600 hover:text-[var(--primary-color)] transition-colors hidden sm:block">
                    {$t('landing.login')}
                </a>
                <a href="/book" class="bg-[var(--primary-color)] text-white px-6 md:px-8 py-3 rounded-sm text-xs font-bold uppercase tracking-[0.2em] hover:bg-[var(--secondary-color)] transition-all duration-500 shadow-lg">
                    {$t('landing.book_appointment')}
                </a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <main class="relative">
        <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center min-h-[80vh] py-12">
            <div in:fly={{ y: 30, duration: 1000, delay: 200 }}>
                <span class="inline-block text-[var(--secondary-color)] text-xs font-bold uppercase tracking-[0.3em] mb-4">{$t('landing.established_excellence')}</span>
                <h2 class="font-serif text-5xl md:text-7xl text-[var(--primary-color)] leading-[1.1] mb-8">
                    {$t('landing.hero_title_1')} <br/> 
                    <span class="italic font-normal">{$t('landing.hero_title_2')}</span>
                </h2>
                <p class="text-lg text-slate-600 leading-relaxed max-w-md mb-12 font-light">
                    {$t('landing.hero_description')}
                </p>
                
                <div class="flex flex-col sm:flex-row gap-6">
                    <a href="/book" class="inline-flex items-center justify-center bg-[var(--primary-color)] text-white px-10 py-5 text-sm font-bold uppercase tracking-widest hover:bg-[var(--secondary-color)] hover:-translate-y-1 transition-all duration-300 shadow-xl">
                        {$t('landing.schedule_visit')}
                    </a>
                    <div class="flex flex-col justify-center">
                        <span class="text-xs text-slate-400 uppercase tracking-widest mb-1">{$t('landing.direct_line')}</span>
                        <a href="tel:{clinic.phone}" class="text-xl font-serif text-[var(--primary-color)] font-semibold hover:text-[var(--secondary-color)] transition-colors">{clinic.phone}</a>
                    </div>
                </div>

                <div class="mt-16 grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-[var(--secondary-color)] mb-2">{$t('landing.location')}</h4>
                        <p class="text-sm text-slate-500 leading-relaxed">{clinic.address}</p>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-[var(--secondary-color)] mb-2">{$t('landing.hours')}</h4>
                        <p class="text-sm text-slate-500 leading-relaxed">{clinic.hours}</p>
                    </div>
                </div>
            </div>

            <div class="relative group" in:fade={{ duration: 1500 }}>
                <div class="absolute -inset-4 border border-[var(--secondary-color)]/20 translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-700"></div>
                <div class="relative overflow-hidden aspect-[4/5] shadow-2xl">
                    <img 
                        src="/classic_dental_clinic_hero_1777531673394.png" 
                        alt="Classic Dental Clinic" 
                        class="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-1000"
                    />
                    <div class="absolute inset-0 bg-[var(--primary-color)]/10 group-hover:bg-transparent transition-colors duration-700"></div>
                </div>
            </div>
        </div>

        <!-- Subtle Background Decoration -->
        <div class="absolute top-0 right-0 -z-10 opacity-[0.03] pointer-events-none">
            <svg width="600" height="600" viewBox="0 0 100 100">
                <circle cx="100" cy="0" r="100" fill="var(--primary-color)" />
            </svg>
        </div>
    </main>

    <!-- Simple Footer -->
    <footer class="bg-white border-t border-slate-100 py-12 mt-24">
        <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div>
                <h3 class="font-serif text-xl font-bold text-[var(--primary-color)] mb-2">{clinic.name}</h3>
                <p class="text-sm text-slate-400">© 2026 {clinic.name}. All rights reserved.</p>
            </div>
            <div class="flex gap-8">
                <a href="/privacy" class="text-xs uppercase tracking-widest text-slate-400 hover:text-[var(--primary-color)] transition-colors">{$t('landing.privacy_policy')}</a>
                <a href="/terms" class="text-xs uppercase tracking-widest text-slate-400 hover:text-[var(--primary-color)] transition-colors">{$t('landing.terms_of_service')}</a>
            </div>
        </div>
    </footer>
</div>

<style>
    :global(html) {
        scroll-behavior: smooth;
    }
    
    .font-serif {
        font-family: var(--font-serif);
    }
    
    .font-sans {
        font-family: var(--font-sans);
    }
</style>


