<script lang="ts">
    import { fade } from 'svelte/transition';

    let { stats } = $props<{ stats: { total: number, completed: number, remaining: number } }>();

    const progress = $derived(stats.total > 0 ? (stats.completed / stats.total) * 100 : 0);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = $derived(circumference - (progress / 100) * circumference);
</script>

<div class="stat-card" in:fade>
    <div class="card-header">
        <div class="icon-bg bg-indigo-100 text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
        </div>
        <div class="title-group">
            <h3>Volume Patients</h3>
            <p>Aujourd'hui</p>
        </div>
    </div>

    <div class="card-body">
        <div class="gauge-container">
            <svg class="gauge" viewBox="0 0 80 80">
                <circle class="gauge-bg" cx="40" cy="40" r={radius} />
                <circle class="gauge-fill" cx="40" cy="40" r={radius} 
                    style="stroke-dasharray: {circumference}; stroke-dashoffset: {offset};" 
                />
            </svg>
            <div class="gauge-text">
                <span class="main-val">{stats.completed}</span>
                <span class="sub-val">/ {stats.total}</span>
            </div>
        </div>

        <div class="stats-info">
            <div class="info-item">
                <span class="label">Restant</span>
                <span class="value">{stats.remaining}</span>
            </div>
            <div class="info-item">
                <span class="label">Complété</span>
                <span class="value">{progress.toFixed(0)}%</span>
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
        gap: 1.5rem;
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
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .gauge-container {
        position: relative;
        width: 80px;
        height: 80px;
        flex-shrink: 0;
    }

    .gauge {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }

    .gauge-bg {
        fill: none;
        stroke: #f1f5f9;
        stroke-width: 8;
    }

    .gauge-fill {
        fill: none;
        stroke: #6366f1;
        stroke-width: 8;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.5s ease-out;
    }

    .gauge-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 1;
    }

    .main-val {
        font-size: 1.25rem;
        font-weight: 800;
        color: #1e293b;
    }

    .sub-val {
        font-size: 0.75rem;
        color: #94a3b8;
        font-weight: 600;
    }

    .stats-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .info-item .label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
    }

    .info-item .value {
        font-size: 0.875rem;
        font-weight: 800;
        color: #1e293b;
    }
</style>
