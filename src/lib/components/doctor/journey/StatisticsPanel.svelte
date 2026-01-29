<script lang="ts">
    import {
        CheckCircle,
        XCircle,
        Clock,
        Users,
        Calendar,
        TrendingUp,
    } from "lucide-svelte";

    let { dashboardStats } = $props<{ dashboardStats: any }>();

    // Reactive derived values
    let todayProgress = $derived(
        (dashboardStats.today.treated / dashboardStats.today.total) * 100 || 0,
    );
</script>

<!-- ============================================ -->
<!-- MINIMALIST STATS DASHBOARD -->
<!-- ============================================ -->
<div class="stats-dashboard">
    <!-- TODAY'S FUNNEL -->
    <div class="stat-section">
        <h3 class="section-title">
            {dashboardStats.today.total} Patients aujourd'hui
        </h3>

        <div class="stat-grid">
            <!-- Total -->
            <div class="stat-mini stat-primary">
                <Users size={16} />
                <span class="value">{dashboardStats.today.total}</span>
                <span class="label">Total</span>
            </div>

            <!-- Treated -->
            <div class="stat-mini stat-success">
                <span class="stat-icon-wrapper"><CheckCircle size={14} /></span>
                <span class="value">{dashboardStats.today.treated}</span>
                <span class="label">Traités</span>
            </div>

            <!-- Remaining -->
            <div class="stat-mini stat-warning">
                <span class="stat-icon-wrapper"><Clock size={14} /></span>
                <span class="value">{dashboardStats.today.remaining}</span>
                <span class="label">Restants</span>
            </div>

            <!-- Canceled -->
            <div class="stat-mini stat-danger">
                <span class="stat-icon-wrapper"><XCircle size={14} /></span>
                <span class="value">{dashboardStats.today.canceled}</span>
                <span class="label">Annulés</span>
            </div>
        </div>

        <!-- Progress Mini -->
        <div class="progress-info">
            <div class="progress-track">
                <div
                    class="progress-fill"
                    style="width: {todayProgress}%"
                ></div>
            </div>
            <span class="progress-percentage">{todayProgress.toFixed(0)}%</span>
        </div>
    </div>

    <!-- COMPOSITION -->
    <div class="stat-section">
        <h3 class="section-title">Composition</h3>
        <div class="comp-list">
            <div class="comp-item">
                <div class="icon-box bg-indigo-50 text-indigo-500">
                    <Calendar size={16} />
                </div>
                <div class="details">
                    <span class="val">{dashboardStats.composition.planned}</span
                    >
                    <span class="lbl">Rendez-vous prévus</span>
                </div>
            </div>
            <div class="comp-item">
                <div class="icon-box bg-purple-50 text-purple-500">
                    <Users size={16} />
                </div>
                <div class="details">
                    <span class="val">{dashboardStats.composition.walkIns}</span
                    >
                    <span class="lbl">Sans rendez-vous</span>
                </div>
            </div>
        </div>
    </div>

    <!-- PIPELINE -->
    <div class="stat-section">
        <h3 class="section-title">Prévisions Semaine</h3>
        <div class="pipeline-minimal">
            <div class="pipeline-header">
                <div class="icon-box bg-rose-50 text-rose-500">
                    <TrendingUp size={16} />
                </div>
                <div class="pipeline-total-group">
                    <span class="total">{dashboardStats.pipeline.total}</span>
                    <span class="desc">Réservations</span>
                </div>
            </div>
            <div class="pipeline-tags">
                <div class="tag">
                    Demain: <b>{dashboardStats.pipeline.tomorrow}</b>
                </div>
                <div class="tag">
                    Après: <b>{dashboardStats.pipeline.dayAfter}</b>
                </div>
                <div class="tag">
                    Reste: <b>{dashboardStats.pipeline.restOfWeek}</b>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .stats-dashboard {
        display: grid;
        grid-template-columns: 1.5fr 1fr 1.2fr;
        gap: 1.5rem;
        padding: 0.5rem;
        background: white;
        border-radius: 1.25rem;
        border: 1px solid #f1f5f9;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .stat-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .section-title {
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        color: #94a3b8;
    }

    .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
    }

    .stat-mini {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: #f8fafc;
        border-radius: 0.75rem;
        border: 1px solid #f1f5f9;
        transition: all 0.2s ease;
    }

    .stat-mini:hover {
        background: white;
        border-color: #e2e8f0;
        transform: translateY(-2px);
    }

    .stat-mini .value {
        font-size: 1.125rem;
        font-weight: 800;
        color: #1e293b;
    }

    .stat-mini .label {
        font-size: 0.6rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
    }

    .stat-icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
    }

    .stat-primary {
        color: #3b82f6;
    }
    .stat-success {
        color: #10b981;
    }
    .stat-warning {
        color: #f59e0b;
    }
    .stat-danger {
        color: #ef4444;
    }

    .progress-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: #f8fafc;
        padding: 0.65rem 1rem;
        border-radius: 3rem;
    }

    .progress-track {
        flex: 1;
        height: 6px;
        background: #e2e8f0;
        border-radius: 3px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: #10b981;
        border-radius: 3px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .progress-percentage {
        font-size: 0.65rem;
        font-weight: 900;
        color: #1e293b;
    }

    .comp-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .comp-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem;
        background: white;
        border: 1px solid #f1f5f9;
        border-radius: 0.85rem;
        transition: all 0.2s ease;
    }

    .comp-item:hover {
        border-color: #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .icon-box {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .comp-item .details {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
    }

    .comp-item .val {
        font-size: 1.125rem;
        font-weight: 800;
        color: #1e293b;
    }

    .comp-item .lbl {
        font-size: 0.6rem;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
    }

    .pipeline-minimal {
        padding: 0.75rem;
        background: #f8fafc;
        border-radius: 1rem;
        border: 1px solid #f1f5f9;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .pipeline-header {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .pipeline-total-group {
        display: flex;
        flex-direction: column;
        line-height: 1;
    }

    .pipeline-header .total {
        font-size: 1.5rem;
        font-weight: 900;
        color: #1e293b;
    }

    .pipeline-header .desc {
        font-size: 0.6rem;
        font-weight: 800;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .pipeline-tags {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .tag {
        font-size: 0.65rem;
        background: white;
        padding: 0.5rem 0.85rem;
        border-radius: 0.75rem;
        border: 1px solid #f1f5f9;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .tag b {
        color: #1e293b;
        font-weight: 900;
    }

    @media (max-width: 1200px) {
        .stats-dashboard {
            grid-template-columns: 1fr;
            gap: 2rem;
        }
    }
</style>
