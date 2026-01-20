<script lang="ts">
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

    let isMobile = false;

    function checkScreenSize() {
        if (typeof window !== "undefined") {
            isMobile = window.innerWidth < 1024;
        }
    }

    onMount(() => {
        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);
        return () => window.removeEventListener("resize", checkScreenSize);
    });
</script>

{#if isMobile}
    <div class="shield-overlay" transition:fade={{ duration: 200 }}>
        <div class="shield-content">
            <div class="shield-icon">🖥️</div>
            <h1 class="shield-title">Optimisé pour Desktop</h1>
            <p class="shield-message">
                Dentistico est optimisé pour les écrans larges (Tablettes &
                Laptops).
                <br /><br />
                Veuillez pivoter votre appareil ou utiliser un ordinateur pour accéder
                au mode Journey.
            </p>
        </div>
    </div>
{:else}
    <slot />
{/if}

<style>
    .shield-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
        padding: 2rem;
    }

    .shield-content {
        max-width: 500px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 3rem;
        border-radius: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .shield-icon {
        font-size: 4rem;
        margin-bottom: 1.5rem;
    }

    .shield-title {
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        letter-spacing: -0.025em;
    }

    .shield-message {
        font-size: 1.125rem;
        line-height: 1.6;
        opacity: 0.9;
        font-weight: 500;
    }
</style>
