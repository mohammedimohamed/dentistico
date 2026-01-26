<script lang="ts">
    import { fade } from "svelte/transition";

    let { stats } = $props<{
        stats: { new: number; returning: number; planned: number };
    }>();
</script>

<div class="stat-card" in:fade>
    <div class="card-header">
        <div class="icon-bg bg-purple-100 text-purple-600">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-6 h-6"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 7.5s-1.125 1.125-1.125 3 1.125 3 1.125 3V15a3 3 0 01-3 3h-1.5a3 3 0 01-3-3v-1.5s-1.125-1.125-3-1.125-3 1.125-3 1.125V19a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4.5s1.125-1.125 1.125-3-1.125-3-1.125-3V9a1 1 0 011-1h2a1 1 0 011 1v1.5s1.125 1.125 3 1.125 3-1.125 3-1.125V7.5a3 3 0 013-3h1.5a3 3 0 013 3z"
                />
            </svg>
        </div>
        <div class="title-group">
            <h3>Analyse Profils</h3>
            <p>Nouveaux vs Récurrents</p>
        </div>
    </div>

    <div class="card-body">
        <div class="type-cards">
            <div class="type-mini-card new">
                <div class="card-val">{stats.new}</div>
                <div class="card-lab">Nouveaux</div>
            </div>
            <div class="type-mini-card returning">
                <div class="card-val">{stats.returning}</div>
                <div class="card-lab">Anciens</div>
            </div>
            <div class="type-mini-card planned">
                <div class="card-val">{stats.planned}</div>
                <div class="card-lab">Planifiés</div>
            </div>
        </div>
    </div>
</div>

<style>
    .stat-card {
        background: #fcfdfe;
        border-radius: 1.5rem;
        padding: 1.5rem;
        border: 1px solid #eef2f6;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .icon-bg {
        width: 3rem;
        height: 3rem;
        border-radius: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .title-group h3 {
        font-size: 0.875rem;
        font-weight: 800;
        color: #1e293b;
        margin: 0;
    }

    .title-group p {
        font-size: 0.75rem;
        color: #94a3b8;
        margin: 0;
    }

    .card-body {
        margin-top: 0.25rem;
    }

    .type-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
    }

    .type-mini-card {
        padding: 0.75rem;
        border-radius: 1rem;
        text-align: center;
        transition: transform 0.2s;
    }

    .type-mini-card:hover {
        transform: translateY(-2px);
    }

    .card-val {
        font-size: 1.25rem;
        font-weight: 900;
        margin-bottom: 0.125rem;
    }

    .card-lab {
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .new {
        background: #eff6ff;
        color: #1d4ed8;
    }
    .returning {
        background: #f0fdf4;
        color: #15803d;
    }
    .planned {
        background: #faf5ff;
        color: #7e22ce;
    }
</style>
