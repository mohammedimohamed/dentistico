<script lang="ts">
    import { onMount } from 'svelte';
    import config from '$lib/config/landing-page.json';

    let scrolled = $state(false);
    let observer: IntersectionObserver | null = null;

    // Extract config sections for easier access
    const nav = config.navigation;
    const hero = config.hero;
    const services = config.services;
    const about = config.about;
    const footer = config.footer;
    const scripts = config.scripts;

    // Helper function to render heading with highlight
    function renderHeading(text: string, highlight: { text: string; classes: string }) {
        const parts = text.split(`{highlight}${highlight.text}{/highlight}`);
        if (parts.length === 2) {
            return [parts[0], { text: highlight.text, classes: highlight.classes }, parts[1]];
        }
        return [text];
    }

    // Compute heading parts reactively
    const headingParts = $derived(renderHeading(hero.heading.text, hero.heading.highlight));
    
    // Compute about section items
    const leftColumnItems = $derived(about.images.items.slice(0, 2));
    const rightColumnItems = $derived(about.images.items.slice(2));

    onMount(() => {
        // Navigation scroll handler
        const handleScroll = () => {
            scrolled = window.scrollY > (scripts.navScroll.threshold || 20);
        };
        window.addEventListener('scroll', handleScroll);

        // Intersection Observer for scroll animations
        if (scripts.scrollAnimation.enabled) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(scripts.scrollAnimation.activeClass);
                    }
                });
            }, { threshold: scripts.scrollAnimation.threshold });

            document.querySelectorAll(`.${scripts.scrollAnimation.class}`).forEach(el => observer?.observe(el));
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (observer) observer.disconnect();
        };
    });
</script>

<div class="min-h-screen">
    <!-- Navigation -->
    <nav class="{nav.classes.container} {scrolled ? nav.classes.scrolled : nav.classes.default}">
        <div class="{config.theme.spacing.container.maxWidth} {config.theme.spacing.container.padding} {config.theme.spacing.container.center} flex justify-between items-center">
            <div class="flex items-center gap-2">
                <a href={nav.logo.href} class={nav.logo.classes}>{nav.logo.text}</a>
            </div>
            
            <div class={nav.menu.classes.container}>
                {#each nav.menu.items as item}
                    <a href={item.href} class={item.classes}>{item.label}</a>
                {/each}
            </div>

            <div class={nav.actions.classes.container}>
                {#each nav.actions.buttons as button}
                    <a href={button.href} class={button.classes}>{button.label}</a>
                {/each}
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id={hero.id} class="relative {config.theme.spacing.section.heroPaddingTop.mobile} {config.theme.spacing.section.heroPaddingTop.desktop} {config.theme.spacing.section.heroPaddingBottom.mobile} {config.theme.spacing.section.heroPaddingBottom.desktop} overflow-hidden hero-gradient">
        <div class="{config.theme.spacing.container.maxWidth} {config.theme.spacing.container.padding} {config.theme.spacing.container.center} grid lg:grid-cols-2 gap-16 items-center">
            <div class={hero.classes.content}>
                <span class={hero.badge.classes}>
                    {hero.badge.text}
                </span>
                <h1 class={hero.heading.classes}>
                    {#each headingParts as part}
                        {#if typeof part === 'object'}
                            <span class={part.classes}>{part.text}</span>
                        {:else}
                            {part}
                        {/if}
                    {/each}
                </h1>
                <p class={hero.description.classes}>
                    {hero.description.text}
                </p>
                <div class={hero.actions.classes.container}>
                    {#each hero.actions.buttons as button}
                        <a href={button.href} class={button.classes}>{button.label}</a>
                    {/each}
                    {#if hero.actions.socialProof.enabled}
                        <div class={hero.actions.socialProof.classes.container}>
                            <div class={hero.actions.socialProof.classes.avatars}>
                                {#each hero.actions.socialProof.avatars as avatar}
                                    <div class={hero.actions.socialProof.classes.avatar}>
                                        <img src={avatar.src} alt={avatar.alt} />
                                    </div>
                                {/each}
                            </div>
                            <span class={hero.actions.socialProof.classes.text}>{hero.actions.socialProof.text}</span>
                        </div>
                    {/if}
                </div>
            </div>
            
            <div class={hero.classes.image}>
                <div class={hero.image.classes.container}>
                    <img src={hero.image.src} alt={hero.image.alt} class={hero.image.classes.image} />
                </div>
                <!-- Decorative Elements -->
                {#each hero.image.decorativeElements as element}
                    <div class={element.classes}></div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id={services.id} class={services.classes.section}>
        <div class="{config.theme.spacing.container.maxWidth} {config.theme.spacing.container.padding} {config.theme.spacing.container.center}">
            <div class={services.classes.header}>
                <h2 class={services.header.title.classes}>{services.header.title.text}</h2>
                {#if services.header.divider.enabled}
                    <div class={services.header.divider.classes}></div>
                {/if}
                <p class={services.header.description.classes}>
                    {services.header.description.text}
                </p>
            </div>

            <div class={services.classes.grid}>
                {#each services.items as service, i}
                    <div class={service.classes.card} style="transition-delay: {service.animationDelay}ms">
                        <div class={service.classes.imageContainer}>
                            <img src={service.image.src} alt={service.image.alt} class={service.classes.image} />
                        </div>
                        <h3 class={service.classes.title}>{service.title}</h3>
                        <p class={service.classes.description}>{service.description}</p>
                        <a href={service.link.href} class={service.link.classes}>
                            {service.link.text} <span>{service.link.icon}</span>
                        </a>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section id={about.id} class={about.classes.section}>
        <div class="{config.theme.spacing.container.maxWidth} {config.theme.spacing.container.padding} {config.theme.spacing.container.center} {about.classes.container}">
            <div class={about.classes.images}>
                <!-- Left Column -->
                <div class="space-y-4">
                    {#each leftColumnItems as item}
                        {#if item.type === 'image'}
                            <div class={item.classes}>
                                <img src={item.src} alt={item.alt} class={item.imageClasses} />
                            </div>
                        {:else if item.type === 'stat'}
                            <div class={item.classes.container}>
                                <div>
                                    <div class={item.classes.value}>{item.value}</div>
                                    <div class={item.classes.label}>{item.label}</div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
                <!-- Right Column -->
                <div class="space-y-4 pt-12">
                    {#each rightColumnItems as item}
                        {#if item.type === 'image'}
                            <div class={item.classes}>
                                <img src={item.src} alt={item.alt} class={item.imageClasses} />
                            </div>
                        {:else if item.type === 'stat'}
                            <div class={item.classes.container}>
                                <div>
                                    <div class={item.classes.value}>{item.value}</div>
                                    <div class={item.classes.label}>{item.label}</div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>

            <div class={about.classes.content}>
                <h2 class={about.content.title.classes}>{about.content.title.text}</h2>
                <p class={about.content.description.classes}>
                    {about.content.description.text}
                </p>
                <div class={about.content.features.classes.container}>
                    {#each about.content.features.items as feature}
                        <div class={feature.classes.container}>
                            <div class={feature.classes.icon}>
                                <span class={feature.classes.iconText}>{feature.icon}</span>
                            </div>
                            <div class={feature.classes.content}>
                                <h4 class={feature.classes.title}>{feature.title}</h4>
                                <p class={feature.classes.description}>{feature.description}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer id={footer.id} class={footer.classes.section}>
        <div class={footer.classes.container}>
            <!-- Brand Column -->
            <div class="col-span-1 md:col-span-1">
                <div class={footer.brand.classes.name}>{footer.brand.name}</div>
                <p class={footer.brand.description.classes}>
                    {footer.brand.description.text}
                </p>
                {#if footer.brand.socialMedia.enabled}
                    <div class={footer.brand.socialMedia.classes.container}>
                        {#each footer.brand.socialMedia.items as social}
                            <a href={social.href} class={social.classes} aria-label={social.platform}>
                                {social.icon}
                            </a>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Quick Links Column -->
            <div>
                <h4 class={footer.quickLinks.classes.title}>{footer.quickLinks.title}</h4>
                <ul class={footer.quickLinks.classes.list}>
                    {#each footer.quickLinks.items as link}
                        <li><a href={link.href} class={link.classes}>{link.label}</a></li>
                    {/each}
                </ul>
            </div>

            <!-- Contact Column -->
            <div>
                <h4 class={footer.contact.classes.title}>{footer.contact.title}</h4>
                <ul class={footer.contact.classes.list}>
                    {#each footer.contact.items as contact}
                        <li class={contact.classes}>
                            <span>{contact.icon}</span>
                            {#if contact.href}
                                <a href={contact.href}>{contact.text}</a>
                            {:else}
                                {contact.text}
                            {/if}
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Newsletter Column -->
            {#if footer.newsletter.enabled}
                <div>
                    <h4 class={footer.newsletter.classes.title}>{footer.newsletter.title}</h4>
                    <p class={footer.newsletter.description.classes}>
                        {footer.newsletter.description.text}
                    </p>
                    <div class={footer.newsletter.classes.form}>
                        <input 
                            type={footer.newsletter.input.type} 
                            placeholder={footer.newsletter.input.placeholder} 
                            name={footer.newsletter.input.name}
                            class={footer.newsletter.classes.input} 
                        />
                        <button type={footer.newsletter.button.type} class={footer.newsletter.classes.button}>
                            {footer.newsletter.button.text}
                        </button>
                    </div>
                </div>
            {/if}
        </div>
        <div class={footer.copyright.classes}>
            {footer.copyright.text}
        </div>
    </footer>
</div>

