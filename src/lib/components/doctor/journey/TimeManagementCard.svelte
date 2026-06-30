<script lang="ts">
    import { t } from "svelte-i18n";
    import { fade } from "svelte/transition";

    let { stats, totalAppointments } = $props<{
        stats: {
            workStart: string;
            workEnd: string;
            lunchBreakMinutes: number;
            availableMinutes: number;
            avgConsultationSetting: number;
            recommendedTimePerVisit: number;
            paceStatus: "comfortable" | "tight" | "overbooked";
        };
        totalAppointments: number;
    }>();

    const statusMap: Record<
        string,
        { label: string; color: string; bg: string; icon: string }
    > = {
        comfortable: {
            label: "Pace Confortable",
            color: "#10b981",
            bg: "#f0fdf4",
            icon: "✅",
        },
        tight: {
            label: "Horaire Serré",
            color: "#f59e0b",
            bg: "#fffbeb",
            icon: "⚠️",
        },
        overbooked: {
            label: "Surchargé",
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "🔴",
        },
    };

    const currentStatus = $derived(
        statusMap[stats.paceStatus] || statusMap.comfortable,
    );
</script>

<div class="stat-card" in:fade>
    <div class="card-header">
        <div class="icon-bg bg-blue-100 text-blue-600">
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
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        </div>
        <div class="title-group">
            <h3>{$t('components.time_management_card.gestion_du_temps')}</h3>
            <p>{$t('components.time_management_card.calcul_de_la_cadence')}</p>
        </div>
    </div>

    <div class="card-body">
        <div class="pace-display" style="background: {currentStatus.bg}">
            <div class="pace-val" style="color: {currentStatus.color}">
                ⏱️ {stats.recommendedTimePerVisit} {$t('common.minutes_short')}
            </div>
            <div class="pace-label" style="color: {currentStatus.color}">
                {currentStatus.label}
                {currentStatus.icon}
            </div>
        </div>

        <div class="time-details">
            <div class="detail-row">
                <span class="label">{$t('components.time_management_card.disponibilit')}</span>
                <span class="value"
                    >{Math.floor(stats.availableMinutes / 60)}h {stats.availableMinutes %
                        60}m</span
                >
            </div>
            <div class="detail-row">
                <span class="label">{$t('common.patients')}</span>
                <span class="value">{totalAppointments} {$t('components.time_management_card.pers')}</span>
            </div>
            <div class="detail-row">
                <span class="label">{$t('components.time_management_card.objectif_clinique')}</span>
                <span class="value">{stats.avgConsultationSetting} {$t('common.minutes_short')}</span>
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
        gap: 1rem;
    }

    .pace-display {
        padding: 1rem;
        border-radius: 1rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .pace-val {
        font-size: 1.5rem;
        font-weight: 900;
    }

    .pace-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .time-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .detail-row .label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
    }

    .detail-row .value {
        font-size: 0.875rem;
        font-weight: 800;
        color: #1e293b;
    }
</style>
