<script lang="ts">
    import { t } from "svelte-i18n";
    import { fade } from "svelte/transition";

    let { stats } = $props<{
        stats: {
            confirmed: number;
            scheduled: number;
            inProgress: number;
            cancelled: number;
        };
    }>();

    const total = $derived(
        stats.confirmed + stats.scheduled + stats.inProgress + stats.cancelled,
    );

    function getPercent(val: number) {
        return total > 0 ? (val / total) * 100 : 0;
    }
</script>

<div class="stat-card" in:fade>
    <div class="card-header">
        <div class="icon-bg bg-emerald-100 text-emerald-600">
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
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
            </svg>
        </div>
        <div class="title-group">
            <h3>{$t('components.appointment_status_card.tats_rv')}</h3>
            <p>{$t('components.appointment_status_card.r_partition_quotidienne')}</p>
        </div>
    </div>

    <div class="card-body">
        <div class="multi-progress">
            <div
                class="progress-segment confirmed"
                style="width: {getPercent(stats.confirmed)}%"
            ></div>
            <div
                class="progress-segment in-progress"
                style="width: {getPercent(stats.inProgress)}%"
            ></div>
            <div
                class="progress-segment scheduled"
                style="width: {getPercent(stats.scheduled)}%"
            ></div>
            <div
                class="progress-segment cancelled"
                style="width: {getPercent(stats.cancelled)}%"
            ></div>
        </div>

        <div class="status-grid">
            <div class="status-item">
                <div class="dot bg-emerald-500"></div>
                <span class="label">{$t('components.appointment_status_card.confirm_s')}</span>
                <span class="count">{stats.confirmed}</span>
            </div>
            <div class="status-item">
                <div class="dot bg-blue-500"></div>
                <span class="label">{$t('components.appointment_status_card.en_cours')}</span>
                <span class="count">{stats.inProgress}</span>
            </div>
            <div class="status-item">
                <div class="dot bg-amber-500"></div>
                <span class="label">{$t('components.appointment_status_card.planifi_s')}</span>
                <span class="count">{stats.scheduled}</span>
            </div>
            <div class="status-item">
                <div class="dot bg-slate-400"></div>
                <span class="label">{$t('components.appointment_status_card.annul_s')}</span>
                <span class="count">{stats.cancelled}</span>
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
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .multi-progress {
        height: 0.75rem;
        background: #f1f5f9;
        border-radius: 1rem;
        display: flex;
        overflow: hidden;
    }

    .progress-segment {
        height: 100%;
        transition: width 0.5s ease;
    }

    .confirmed {
        background: #10b981;
    }
    .in-progress {
        background: #3b82f6;
    }
    .scheduled {
        background: #f59e0b;
    }
    .cancelled {
        background: #94a3b8;
    }

    .status-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    .status-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        flex: 1;
    }

    .count {
        font-size: 0.875rem;
        font-weight: 800;
        color: #1e293b;
    }
</style>
