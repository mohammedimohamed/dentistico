<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import { fade, slide, scale } from "svelte/transition";
    import { quintOut } from "svelte/easing";

    let { data } = $props();

    let activeTab = $state("today");
    let loading = $state(false);

    const tabs = [
        { id: "today", label: "journey.today", date: data.dates.today },
        {
            id: "tomorrow",
            label: "journey.tomorrow",
            date: data.dates.tomorrow,
        },
        {
            id: "dayAfter",
            label: "journey.after_tomorrow",
            date: data.dates.dayAfter,
        },
    ];

    const currentAppointments = $derived(data.agenda[activeTab]);
    const isToday = $derived(activeTab === "today");
</script>

<div class="journey-hub" in:fade>
    <!-- Header: Daily Session Management -->
    <div class="hub-header">
        <div class="header-content">
            <h1 class="text-4xl font-black text-slate-800 tracking-tight">
                {$t("journey.daily_hub")}
            </h1>
            <p class="text-slate-500 font-medium">
                {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}
            </p>
        </div>

        {#if !data.session}
            <form
                action="?/startSession"
                method="POST"
                use:enhance={() => {
                    loading = true;
                    return async ({ update }) => {
                        await update();
                        loading = false;
                    };
                }}
            >
                <button class="btn-start-session group" disabled={loading}>
                    <span class="icon">✨</span>
                    <span class="text">{$t("journey.start_day")}</span>
                </button>
            </form>
        {:else}
            <div
                class="session-active-badge"
                transition:scale={{ duration: 400, easing: quintOut }}
            >
                <div class="pulse"></div>
                <div class="flex flex-col">
                    <span class="status-label"
                        >{$t("journey.active_session")}</span
                    >
                    <span class="time-label"
                        >Depuis {new Date(
                            data.session.start_time,
                        ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}</span
                    >
                </div>
                {#if !data.session.end_time}
                    <form action="?/endSession" method="POST" use:enhance>
                        <button class="btn-end-session">
                            {$t("journey.end_day")}
                        </button>
                    </form>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Agenda Content -->
    <div class="agenda-container">
        <!-- Tabs -->
        <div class="tabs-nav">
            {#each tabs as tab}
                <button
                    class="tab-item"
                    class:active={activeTab === tab.id}
                    onclick={() => (activeTab = tab.id)}
                >
                    <span class="tab-label">{$t(tab.label)}</span>
                    <span class="tab-date"
                        >{new Date(tab.date).toLocaleDateString([], {
                            day: "2-digit",
                            month: "short",
                        })}</span
                    >
                    {#if activeTab === tab.id}
                        <div class="active-indicator"></div>
                    {/if}
                </button>
            {/each}
        </div>

        <div class="appointments-list">
            {#if currentAppointments.length === 0}
                <div class="empty-state" in:fade>
                    <div class="empty-icon">📅</div>
                    <h3>
                        {$t("dashboard.no_appointments", {
                            tab: $t(tabs.find((t) => t.id === activeTab).label),
                        })}
                    </h3>
                </div>
            {:else}
                {#each currentAppointments as appt, i (appt.id)}
                    <a
                        href="/doctor/journey/{appt.id}"
                        class="appointment-card group"
                        style="--delay: {i * 0.05}s"
                        in:slide={{ axis: "y" }}
                    >
                        <div class="time-box">
                            <span class="start-time"
                                >{new Date(appt.start_time).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                )}</span
                            >
                            <span class="duration"
                                >{appt.duration_minutes}m</span
                            >
                        </div>

                        <div class="patient-info">
                            <h4 class="patient-name">{appt.patient_name}</h4>
                            <p class="appointment-type">
                                {appt.appointment_type}
                            </p>
                        </div>

                        <div class="status-box">
                            <span class="status-tag {appt.status}"
                                >{appt.status}</span
                            >
                            {#if appt.actual_start_time}
                                <span class="visit-status"
                                    >Visite en cours...</span
                                >
                            {/if}
                        </div>

                        <div class="action-hint">
                            <span
                                class="group-hover:translate-x-1 transition-transform inline-block"
                                >→</span
                            >
                        </div>
                    </a>
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    .journey-hub {
        padding: 2.5rem;
        max-width: 1200px;
        margin: 0 auto;
        min-height: 100vh;
        background: #f8fafc;
    }

    .hub-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 3.5rem;
    }

    .btn-start-session {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
        padding: 1.25rem 2.5rem;
        border-radius: 1.25rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        border: none;
    }

    .btn-start-session:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 20px 30px -10px rgba(79, 70, 229, 0.5);
    }

    .btn-start-session .icon {
        font-size: 1.5rem;
    }

    .session-active-badge {
        background: white;
        padding: 1rem 1.5rem;
        border-radius: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        border: 2px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .pulse {
        width: 12px;
        height: 12px;
        background: #10b981;
        border-radius: 50%;
        position: relative;
    }

    .pulse::after {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        background: inherit;
        border-radius: inherit;
        animation: pulse-ring 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
    }

    @keyframes pulse-ring {
        0% {
            transform: scale(1);
            opacity: 0.7;
        }
        100% {
            transform: scale(3.5);
            opacity: 0;
        }
    }

    .status-label {
        font-size: 0.75rem;
        font-weight: 800;
        color: #10b981;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .time-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #64748b;
    }

    .btn-end-session {
        background: #f1f5f9;
        color: #ef4444;
        padding: 0.5rem 1rem;
        border-radius: 0.75rem;
        font-size: 0.75rem;
        font-weight: 700;
        transition: all 0.2s;
        border: none;
    }

    .btn-end-session:hover {
        background: #fee2e2;
    }

    .agenda-container {
        background: white;
        border-radius: 2rem;
        padding: 2rem;
        box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.05),
            0 10px 10px -5px rgba(0, 0, 0, 0.02);
    }

    .tabs-nav {
        display: flex;
        gap: 1rem;
        margin-bottom: 2.5rem;
        background: #f8fafc;
        padding: 0.5rem;
        border-radius: 1.25rem;
    }

    .tab-item {
        flex: 1;
        padding: 1rem;
        border-radius: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        transition: all 0.3s;
        position: relative;
        border: none;
        background: transparent;
        cursor: pointer;
    }

    .tab-item.active {
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .tab-label {
        font-weight: 800;
        font-size: 0.875rem;
        color: #64748b;
    }

    .active .tab-label {
        color: #4f46e5;
    }

    .tab-date {
        font-size: 0.75rem;
        color: #94a3b8;
    }

    .appointments-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .appointment-card {
        display: flex;
        align-items: center;
        padding: 1.5rem;
        background: white;
        border: 1px solid #f1f5f9;
        border-radius: 1.5rem;
        text-decoration: none;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .appointment-card:hover {
        transform: translateX(10px);
        background: #f8fafc;
        border-color: #6366f1;
        box-shadow: -10px 0 0 #6366f1;
    }

    .time-box {
        display: flex;
        flex-direction: column;
        min-width: 100px;
    }

    .start-time {
        font-size: 1.25rem;
        font-weight: 900;
        color: #1e293b;
    }

    .duration {
        font-size: 0.75rem;
        font-weight: 600;
        color: #94a3b8;
    }

    .patient-info {
        flex: 1;
        margin-left: 2rem;
    }

    .patient-name {
        font-size: 1.125rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 0.25rem;
    }

    .appointment-type {
        font-size: 0.875rem;
        color: #64748b;
        text-transform: capitalize;
    }

    .status-box {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
        margin-right: 2rem;
    }

    .status-tag {
        padding: 0.35rem 0.75rem;
        border-radius: 2rem;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
    }

    .status-tag.scheduled {
        background: #eff6ff;
        color: #3b82f6;
    }
    .status-tag.confirmed {
        background: #f0fdf4;
        color: #16a34a;
    }
    .status-tag.completed {
        background: #f8fafc;
        color: #64748b;
    }

    .visit-status {
        font-size: 0.75rem;
        font-weight: 700;
        color: #f59e0b;
        animation: blink 2s infinite;
    }

    @keyframes blink {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    .empty-state {
        text-align: center;
        padding: 5rem 0;
        color: #94a3b8;
    }

    .empty-icon {
        font-size: 4rem;
        margin-bottom: 1.5rem;
        opacity: 0.5;
    }
</style>
