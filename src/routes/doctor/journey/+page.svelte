<script lang="ts">
    import { enhance } from "$app/forms";
    import { t } from "svelte-i18n";
    import { fade, slide, scale } from "svelte/transition";
    import { quintOut } from "svelte/easing";
    import { logger } from "$lib/utils/logger";
    import { browser } from "$app/environment";
    import StatisticsPanel from "$lib/components/doctor/journey/StatisticsPanel.svelte";
    import WaitingRoomList from "$lib/components/doctor/journey/WaitingRoomList.svelte";
    import { goto, invalidate } from "$app/navigation";

    let { data }: { data: any } = $props();

    let activeTab = $state("today");
    let loading = $state(false);
    let showUpdateIndicator = $state(false);

    // Phase 1: Real-Time Clock System
    let now = $state(new Date());
    let lastMinute = $state(new Date().getMinutes());
    let waitingPatients = $state<any[]>([]);

    // Performance Optimization: Adaptive Polling
    const POLLING_INTERVALS = {
        ACTIVE: 60000, // 1 minute when user is active
        IDLE: 120000, // 2 minutes when idle
        BACKGROUND: 300000, // 5 minutes when tab is hidden
    };

    let pollInterval: any = null;
    let isPageVisible = $state(true);
    let lastUserActivity = $state(Date.now());
    let currentInterval = $state(POLLING_INTERVALS.ACTIVE);
    let lastUpdateVersion = $state<string | null>(null);

    async function fetchWaitingRoom() {
        if (!isToday || !isPageVisible) return;

        try {
            // Clever Optimization: Check if anything actually changed before invalidating
            // This prevents SvelteKit from re-running the heavy PageServerLoad on every poll
            if (!data.user?.id) return;
            const statusRes = await fetch(
                `/api/updates/status?doctorId=${data.user.id}`,
            );
            if (statusRes.ok) {
                const { version } = await statusRes.json();
                if (version === lastUpdateVersion) {
                    // No changes detected, skip heavy processing
                    return;
                }
                lastUpdateVersion = version;
            }

            logger.perf("fetchWaitingRoom:heavySync", async () => {
                if (!data.user?.id) return;
                const res = await fetch(`/api/waiting-room/${data.user.id}`);
                if (res.ok) {
                    waitingPatients = await res.json();
                }
                // Also invalidate appointments to sync the list
                const { invalidate } = await import("$app/navigation");
                await invalidate("appointments:today");
                await invalidate("waiting-room:status");

                showUpdateIndicator = true;
                setTimeout(() => (showUpdateIndicator = false), 2000);
            });
        } catch (e) {
            logger.error("Failed to fetch waiting room:", e);
        }
    }

    function restartPolling(interval: number) {
        currentInterval = interval;
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(() => {
            const date = new Date();
            if (date.getMinutes() !== lastMinute) {
                now = date;
                lastMinute = date.getMinutes();
            }
            fetchWaitingRoom();
        }, interval);

        logger.info(`Polling frequency adjusted: ${interval}ms`);
    }

    function handleUserActivity() {
        lastUserActivity = Date.now();
        if (currentInterval !== POLLING_INTERVALS.ACTIVE && isPageVisible) {
            restartPolling(POLLING_INTERVALS.ACTIVE);
        }
    }

    function checkActivityLevel() {
        const idleTime = Date.now() - lastUserActivity;
        if (idleTime > 300000 && currentInterval === POLLING_INTERVALS.ACTIVE) {
            logger.info("User idle detected, slowing down polling");
            restartPolling(POLLING_INTERVALS.IDLE);
        }
    }

    function handleVisibilityChange() {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            logger.info("Tab became visible, resuming active polling");
            fetchWaitingRoom();
            restartPolling(POLLING_INTERVALS.ACTIVE);
        } else {
            logger.info("Tab hidden, entering background polling mode");
            restartPolling(POLLING_INTERVALS.BACKGROUND);
        }
    }

    $effect(() => {
        if (typeof document !== "undefined") {
            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );

            // Track activity for smart backoff
            const activityEvents = ["click", "keydown", "scroll", "mousemove"];
            activityEvents.forEach((event) => {
                document.addEventListener(event, handleUserActivity, {
                    passive: true,
                });
            });

            // Activity checker
            const activityChecker = setInterval(checkActivityLevel, 120000);

            // Initial polling setup
            restartPolling(POLLING_INTERVALS.ACTIVE);
            fetchWaitingRoom();

            return () => {
                document.removeEventListener(
                    "visibilitychange",
                    handleVisibilityChange,
                );
                activityEvents.forEach((event) => {
                    document.removeEventListener(event, handleUserActivity);
                });
                clearInterval(activityChecker);
                if (pollInterval) clearInterval(pollInterval);
            };
        }
    });

    const tabs = $derived([
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
    ]);

    const currentAppointments = $derived((data.agenda as any)[activeTab] || []);
    const isToday = $derived(activeTab === "today");

    // Phase 2: Time Status Classification
    function getAppointmentTimeStatus(appt: any) {
        if (appt.status === "completed") return "completed";
        if (appt.status === "cancelled" || appt.status === "no_show")
            return "inactive";

        const start = new Date(appt.start_time).getTime();
        const nowMs = now.getTime();
        const duration = appt.duration_minutes || 30;
        const end = start + duration * 60000;

        // 1. Ongoing: actual session started OR current time in range
        if (appt.actual_start_time && !appt.actual_end_time) return "ongoing";
        if (nowMs >= start && nowMs <= end) return "ongoing";

        // 2. Overdue: more than 15 mins late
        if (nowMs > start + 15 * 60000) return "overdue";

        // 3. Upcoming: within 15 mins
        if (start - nowMs <= 15 * 60000 && start - nowMs > 0) return "upcoming";

        // 4. Future
        return "future";
    }

    function getDelayMinutes(appt: any) {
        const start = new Date(appt.start_time).getTime();
        const nowMs = now.getTime();
        if (nowMs > start) {
            return Math.floor((nowMs - start) / 60000);
        }
        return 0;
    }

    const enrichedAppointments = $derived.by(() => {
        return currentAppointments.map((appt: any) => {
            const timeStatus = getAppointmentTimeStatus(appt);
            const isCurrent = appt.id === currentPatientId;
            const delay = getDelayMinutes(appt);
            const waitMins =
                appt.checked_in && appt.waiting_room_status === "waiting"
                    ? Math.floor(
                          (now.getTime() -
                              new Date(appt.check_in_time).getTime()) /
                              60000,
                      )
                    : null;

            return {
                ...appt,
                timeStatus,
                isCurrent,
                delay,
                waitMins,
            };
        });
    });

    // Phase 1B: Current Patient Detection
    const currentPatientId = $derived.by(() => {
        if (!isToday) return null;
        const appointments = (data.agenda as any).today || [];

        // 1. First priority: Ongoing
        const ongoing = appointments.find(
            (a: any) => getAppointmentTimeStatus(a) === "ongoing",
        );
        if (ongoing) return ongoing.id;

        // 2. Second priority: Overdue
        const overdue = appointments.find(
            (a: any) => getAppointmentTimeStatus(a) === "overdue",
        );
        if (overdue) return overdue.id;

        // 3. Third priority: Closest upcoming
        const next = appointments.find(
            (a: any) => getAppointmentTimeStatus(a) === "upcoming",
        );
        if (next) return next.id;

        return null;
    });

    async function completeVisit(e: Event, appointmentId: number) {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm("Terminer cette visite ?")) return;

        try {
            const response = await fetch("/api/appointments/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: appointmentId }),
            });

            if (response.ok) {
                await invalidate("journey:stats");
            }
        } catch (err) {
            console.error("Failed to complete visit:", err);
        }
    }
</script>

<div class="journey-hub" in:fade>
    <!-- Header: Daily Session Management -->
    <div class="hub-header">
        {#if showUpdateIndicator}
            <div
                transition:fade
                class="fixed top-20 right-8 z-[100] bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-tighter"
            >
                <span class="w-2 h-2 bg-white rounded-full animate-ping"></span>
                Synchro Terminée
            </div>
        {/if}

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

    <!-- Waiting Room & Statistics -->
    {#if isToday}
        <div class="flex flex-col gap-4 mb-8 mt-8">
            <!-- Statistics Panel Overlay -->
            <StatisticsPanel dashboardStats={data.stats} />

            <!-- Waiting Room Section -->
            <WaitingRoomList
                {waitingPatients}
                onStartVisit={(id: number) => goto(`/doctor/journey/${id}`)}
            />
        </div>
    {/if}

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
                        {$t("dashboard.no_appointments")}
                    </h3>
                </div>
            {:else}
                {#each enrichedAppointments as appt, i (appt.id)}
                    <article
                        class="appointment-card group {appt.timeStatus}"
                        class:current-patient={appt.isCurrent}
                        style="--delay: {i * 0.05}s"
                        in:slide={{ axis: "y" }}
                        aria-current={appt.isCurrent ? "true" : "false"}
                    >
                        <div class="time-column">
                            <time
                                class="start-time"
                                datetime={appt.start_time}
                                class:text-red-600={appt.timeStatus ===
                                    "overdue"}
                                class:text-blue-600={appt.timeStatus ===
                                    "ongoing"}
                                class:text-green-600={appt.timeStatus ===
                                    "completed"}
                            >
                                {new Date(appt.start_time).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                )}
                            </time>

                            <div class="status-badge-container">
                                {#if appt.timeStatus === "ongoing"}
                                    <span class="status-badge ongoing">
                                        <span class="pulse-dot"></span>
                                        ▶️ {$t("journey.status_ongoing") ||
                                            "En cours"}
                                    </span>
                                {:else if appt.timeStatus === "overdue"}
                                    <span class="status-badge overdue">
                                        🚨 {$t("journey.status_overdue", {
                                            values: { min: appt.delay },
                                        }) || `Retard ${appt.delay}m`}
                                    </span>
                                {:else if appt.timeStatus === "upcoming"}
                                    <span class="status-badge upcoming">
                                        ⏰ {$t("journey.status_upcoming") ||
                                            "Imminent"}
                                    </span>
                                {:else if appt.timeStatus === "completed"}
                                    <span class="status-badge completed">
                                        ✅ {$t("journey.status_completed") ||
                                            "Terminé"}
                                    </span>
                                {:else}
                                    <span class="status-badge scheduled">
                                        📅 Planifié
                                    </span>
                                {/if}
                            </div>
                        </div>

                        <div class="patient-info flex-1">
                            <div class="flex items-center gap-2">
                                <h4 class="patient-name">
                                    {appt.patient_name}
                                </h4>
                                {#if appt.checked_in && appt.waiting_room_status === "waiting"}
                                    <div
                                        class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <span
                                            class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                                        ></span>
                                        🏥 Salle d'attente
                                    </div>
                                {/if}
                            </div>
                            <div class="appointment-meta">
                                <span class="appointment-type"
                                    >{appt.appointment_type.replace(
                                        "_",
                                        " ",
                                    )}</span
                                >
                                <span class="separator">•</span>
                                <span class="duration"
                                    >{appt.duration_minutes}m</span
                                >
                            </div>
                            {#if appt.notes}
                                <p
                                    class="notes-preview text-slate-400 text-xs mt-1 italic truncate max-w-md"
                                >
                                    {appt.notes}
                                </p>
                            {/if}

                            {#if appt.waitMins !== null}
                                <p
                                    class="text-[10px] mt-1 font-bold {appt.waitMins >
                                    20
                                        ? 'text-red-500'
                                        : 'text-green-600'}"
                                >
                                    ↳ En attente depuis {appt.waitMins} min (arrivée
                                    à
                                    {new Date(
                                        appt.check_in_time,
                                    ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })})
                                </p>
                            {/if}
                        </div>

                        <div class="actions-zone">
                            {#if appt.status === "completed"}
                                <a
                                    href="/doctor/journey/{appt.id}"
                                    class="action-btn ghost"
                                    aria-label="Consulter le dossier"
                                >
                                    <span
                                        >{$t("journey.consult") ||
                                            "Consulter"}</span
                                    >
                                    <span class="icon">📄</span>
                                </a>
                            {:else}
                                <a
                                    href="/doctor/journey/{appt.id}"
                                    class="action-btn primary"
                                    class:ongoing={appt.timeStatus ===
                                        "ongoing"}
                                    aria-label="Commencer le traitement"
                                >
                                    <span
                                        >{appt.timeStatus === "ongoing"
                                            ? $t("journey.continue") ||
                                              "Continuer"
                                            : $t("journey.start_treatment") ||
                                              "Traiter"}</span
                                    >
                                    <span
                                        class="group-hover:translate-x-1 transition-transform inline-block"
                                        >→</span
                                    >
                                </a>
                            {/if}

                            {#if isToday && appt.actual_start_time && !appt.actual_end_time}
                                <button
                                    class="finish-visit-hint"
                                    onclick={(e) => completeVisit(e, appt.id)}
                                    title="Terminer la visite"
                                >
                                    Terminer ✓
                                </button>
                            {/if}
                        </div>
                    </article>
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

    /* Phase 2 & 4: Enhanced Appointment Card Styles */
    .appointment-card {
        display: flex;
        align-items: center;
        padding: 1.5rem;
        background: white;
        border: 1px solid #f1f5f9;
        border-left: 4px solid transparent;
        border-radius: 1.5rem;
        transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
    }

    .appointment-card:hover {
        transform: translateX(4px);
        border-color: #e2e8f0;
        background: #fcfdfe;
    }

    /* Current Patient Detection Algorithm Styles */
    .appointment-card.current-patient {
        border-left-color: #3b82f6; /* Algiers Blue */
        background: linear-gradient(90deg, #eff6ff 0%, #ffffff 100%);
        box-shadow:
            -4px 0 12px rgba(59, 130, 246, 0.2),
            0 4px 12px rgba(59, 130, 246, 0.08);
        z-index: 10;
    }

    /* Phase 3: Completed State Design */
    .appointment-card.completed {
        opacity: 0.6;
        filter: grayscale(0.5);
        background: linear-gradient(90deg, #f9fafb 0%, #ffffff 100%);
    }

    .appointment-card.completed:hover {
        opacity: 0.9;
        filter: grayscale(0);
    }

    .time-column {
        display: flex;
        flex-direction: column;
        min-width: 140px;
        gap: 0.5rem;
    }

    .start-time {
        font-size: 1.25rem;
        font-weight: 900;
        color: #1e293b;
    }

    .patient-info {
        margin-left: 1.5rem;
    }

    .patient-name {
        font-size: 1.25rem;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 0.25rem;
    }

    .appointment-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .appointment-type {
        text-transform: capitalize;
    }

    .separator {
        opacity: 0.3;
    }

    /* Phase 3B: Badge System */
    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.025em;
        text-transform: uppercase;
        width: fit-content;
    }

    .status-badge.ongoing {
        background: #eff6ff;
        color: #1d4ed8;
    }
    .status-badge.overdue {
        background: #fef2f2;
        color: #b91c1c;
    }
    .status-badge.upcoming {
        background: #fffbeb;
        color: #b45309;
    }
    .status-badge.completed {
        background: #f0fdf4;
        color: #15803d;
    }
    .status-badge.scheduled {
        background: #f8fafc;
        color: #475569;
    }

    /* Phase 4B: Pulse Indicator */
    .pulse-dot {
        width: 8px;
        height: 8px;
        background: #3b82f6;
        border-radius: 50%;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.5;
            transform: scale(1.4);
        }
    }

    /* Actions Zone */
    .actions-zone {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
        min-width: 180px;
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        border-radius: 1rem;
        font-weight: 800;
        font-size: 0.875rem;
        text-decoration: none;
        transition: all 0.2s;
    }

    .action-btn.primary {
        background: #4f46e5;
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
    }

    .action-btn.primary:hover {
        background: #4338ca;
        transform: translateY(-2px);
    }

    .action-btn.primary.ongoing {
        background: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    }

    .action-btn.ghost {
        background: #f1f5f9;
        color: #475569;
    }

    .action-btn.ghost:hover {
        background: #e2e8f0;
    }

    .finish-visit-hint {
        font-size: 0.7rem;
        font-weight: 800;
        color: #f59e0b;
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.2s;
    }

    .finish-visit-hint:hover {
        color: #d97706;
        text-decoration: underline;
    }

    /* Responsive Grid Layout */
    @media (max-width: 1024px) {
        .time-column {
            min-width: 120px;
        }
        .actions-zone {
            min-width: 140px;
        }
    }

    @media (max-width: 768px) {
        .appointment-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }
        .time-column {
            flex-direction: row;
            align-items: center;
            width: 100%;
            justify-content: space-between;
        }
        .patient-info {
            margin-left: 0;
        }
        .actions-zone {
            width: 100%;
            align-items: stretch;
        }
        .action-btn {
            justify-content: center;
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

    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
</style>
