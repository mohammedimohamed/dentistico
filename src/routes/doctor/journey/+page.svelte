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
    import { page, navigating } from "$app/stores";
    import {
        ChevronLeft,
        ChevronRight,
        CalendarCheck,
        CalendarX,
        History,
        Clock,
        User,
    } from "lucide-svelte";

    let { data }: { data: any } = $props();

    // ============================================
    // TIMEZONE-SAFE DATE HELPERS
    // ============================================

    function parseUTCDate(dateStr: string): Date {
        return new Date(dateStr + "T00:00:00Z");
    }

    function formatUTCDate(date: Date): string {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function addDays(dateStr: string, days: number): string {
        const date = parseUTCDate(dateStr);
        date.setUTCDate(date.getUTCDate() + days);
        return formatUTCDate(date);
    }

    // ============================================
    // DATE NAVIGATION STATE (URL Driven)
    // ============================================

    let selectedDate = $derived.by(() => {
        const urlDate = $page.url.searchParams.get("date");
        if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
            return urlDate;
        }
        return formatUTCDate(new Date());
    });

    let isToday = $derived(selectedDate === formatUTCDate(new Date()));
    let selectedDateObj = $derived(parseUTCDate(selectedDate));
    let isNavigating = $derived($navigating !== null);

    let loading = $state(false);
    let showUpdateIndicator = $state(false);

    // Phase 1: Real-Time Clock System
    let now = $state(new Date());
    let lastMinute = $state(new Date().getMinutes());
    let waitingPatients = $state<any[]>([]);

    // Performance Optimization: Adaptive Polling
    const POLLING_INTERVALS = {
        ACTIVE: 15000,
        IDLE: 60000,
        BACKGROUND: 180000,
    };

    let pollInterval: any = null;
    let isPageVisible = $state(true);
    let lastUserActivity = $state(Date.now());
    let currentInterval = $state(POLLING_INTERVALS.ACTIVE);
    let lastUpdateVersion = $state<string | null>(null);

    async function fetchWaitingRoom() {
        if (!isToday || !isPageVisible) return;

        try {
            if (!data.user?.id) return;
            const statusRes = await fetch(
                `/api/updates/status?doctorId=${data.user.id}`,
            );
            if (statusRes.ok) {
                const { version } = await statusRes.json();
                if (version === lastUpdateVersion) return;
                lastUpdateVersion = version;
            }

            logger.perf("fetchWaitingRoom:heavySync", async () => {
                const res = await fetch(`/api/waiting-room/${data.user.id}`);
                if (res.ok) {
                    waitingPatients = await res.json();
                }
                const { invalidate } = await import("$app/navigation");
                await invalidate("appointments:journey");
                await invalidate("waiting-room:status");

                showUpdateIndicator = true;
                setTimeout(() => (showUpdateIndicator = false), 2000);
            });
        } catch (e) {
            logger.error("Failed to fetch waiting room:", e);
        }
    }

    // ============================================
    // NAVIGATION FUNCTIONS
    // ============================================

    function goToPreviousDay() {
        const previousDate = addDays(selectedDate, -1);
        navigateToDate(previousDate);
    }

    function goToNextDay() {
        const nextDate = addDays(selectedDate, 1);
        navigateToDate(nextDate);
    }

    function goToToday() {
        navigateToDate(formatUTCDate(new Date()));
    }

    async function navigateToDate(dateStr: string) {
        const url = new URL($page.url);
        url.searchParams.set("date", dateStr);

        await goto(url.toString(), {
            replaceState: true,
            noScroll: true,
            keepFocus: true,
        });

        await invalidate("appointments:journey");
    }

    function formatDateDisplay(dateStr: string): string {
        const date = parseUTCDate(dateStr);
        const options: Intl.DateTimeFormatOptions = {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        };

        const formatted = date.toLocaleDateString("fr-FR", options);
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.target instanceof HTMLInputElement) return;

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            goToPreviousDay();
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            goToNextDay();
        } else if (event.key === "t" || event.key === "T") {
            event.preventDefault();
            goToToday();
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
            restartPolling(POLLING_INTERVALS.IDLE);
        }
    }

    function handleVisibilityChange() {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            fetchWaitingRoom();
            restartPolling(POLLING_INTERVALS.ACTIVE);
        } else {
            restartPolling(POLLING_INTERVALS.BACKGROUND);
        }
    }

    $effect(() => {
        if (browser && typeof document !== "undefined") {
            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
            const activityEvents = ["click", "keydown", "scroll", "mousemove"];
            activityEvents.forEach((event) => {
                document.addEventListener(event, handleUserActivity, {
                    passive: true,
                });
            });
            const activityChecker = setInterval(checkActivityLevel, 120000);
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

    const currentAppointments = $derived(data.appointments || []);

    function getAppointmentTimeStatus(appt: any) {
        if (appt.status === "completed") return "completed";
        if (appt.status === "cancelled" || appt.status === "no_show")
            return "inactive";

        const start = new Date(appt.start_time.replace(' ', 'T')).getTime();
        const nowMs = now.getTime();
        const duration = appt.duration_minutes || 30;
        const end = start + duration * 60000;

        if (appt.actual_start_time && !appt.actual_end_time) return "ongoing";
        if (isToday && nowMs >= start && nowMs <= end) return "ongoing";

        if (isToday && nowMs > start + 15 * 60000) return "overdue";

        if (isToday && start - nowMs <= 15 * 60000 && start - nowMs > 0)
            return "upcoming";

        return "future";
    }

    function getDelayMinutes(appt: any) {
        if (!isToday) return 0;
        const start = new Date(appt.start_time.replace(' ', 'T')).getTime();
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
                isToday &&
                appt.checked_in &&
                (appt.status === "waiting_room" ||
                    appt.waiting_room_status === "waiting")
                    ? Math.floor(
                          (now.getTime() -
                              new Date(appt.check_in_time.replace(' ', 'T')).getTime()) /
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

    const currentPatientId = $derived.by(() => {
        if (!isToday) return null;
        const appointments = data.appointments || [];

        const ongoing = appointments.find(
            (a: any) => getAppointmentTimeStatus(a) === "ongoing",
        );
        if (ongoing) return ongoing.id;

        const overdue = appointments.find(
            (a: any) => getAppointmentTimeStatus(a) === "overdue",
        );
        if (overdue) return overdue.id;

        const next = appointments.find(
            (a: any) => getAppointmentTimeStatus(a) === "upcoming",
        );
        if (next) return next.id;

        return null;
    });

    async function completeVisit(e: Event, appointmentId: number) {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm($t("doctor_journey.confirm_finish"))) return;

        try {
            const response = await fetch("/api/appointments/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: appointmentId }),
            });

            if (response.ok) {
                await invalidate("journey:stats");
                await invalidate("appointments:journey");
            }
        } catch (err) {
            console.error("Failed to complete visit:", err);
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="journey-hub" in:fade>
    <!-- Header: Daily Session Management -->
    <div class="hub-header">
        {#if showUpdateIndicator}
            <div
                transition:fade
                class="fixed top-20 right-8 z-[100] bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-tighter"
            >
                <span class="w-2 h-2 bg-white rounded-full animate-ping"></span>
                {$t("doctor_journey.sync_completed")}
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
                        >{$t("doctor_journey.since")}
                        {new Date(data.session.start_time.replace(' ', 'T')).toLocaleTimeString(
                            [],
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                            },
                        )}</span
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
        <!-- New Date Navigation Bar -->
        <div class="date-navigation-bar">
            <!-- Previous Day Button -->
            <button
                class="nav-button nav-prev"
                onclick={goToPreviousDay}
                aria-label={$t("doctor_journey.previous_day")}
            >
                <ChevronLeft size={20} />
                <span class="button-label">{$t("doctor_journey.previous")}</span
                >
            </button>

            <!-- Current Date Display -->
            <div class="date-display-container">
                <div class="calendar-picker-wrapper">
                    <button
                        class="date-display-btn"
                        onclick={() =>
                            document
                                .getElementById("date-picker")
                                ?.showPicker()}
                        title={$t("doctor_journey.choose_date")}
                    >
                        <div class="date-display">
                            {formatDateDisplay(selectedDate)}
                        </div>
                        <History size={18} class="text-slate-400" />
                    </button>
                    <input
                        type="date"
                        id="date-picker"
                        class="hidden-date-input"
                        value={selectedDate}
                        onchange={(e) => navigateToDate(e.currentTarget.value)}
                    />
                </div>

                {#if isToday}
                    <div class="today-badge">{$t("doctor_journey.today")}</div>
                {/if}
            </div>

            <!-- Next Day Button -->
            <button
                class="nav-button nav-next"
                onclick={goToNextDay}
                aria-label={$t("doctor_journey.next_day")}
            >
                <span class="button-label">{$t("doctor_journey.next")}</span>
                <ChevronRight size={20} />
            </button>

            <!-- Quick Jump to Today -->
            {#if !isToday}
                <button
                    class="today-jump-btn"
                    onclick={goToToday}
                    transition:scale
                >
                    <CalendarCheck size={18} />
                    {$t("doctor_journey.today")}
                </button>
            {/if}
        </div>

        <div class="appointments-container" class:loading-active={isNavigating}>
            {#if isNavigating}
                <div class="loading-overlay" transition:fade>
                    <div class="loading-spinner"></div>
                    <span class="ml-3 font-bold text-indigo-600"
                        >{$t("doctor_journey.loading")}</span
                    >
                </div>
            {/if}

            <div class="appointments-list">
                {#if enrichedAppointments.length === 0}
                    <div class="empty-state" in:fade>
                        <div class="empty-icon">
                            <CalendarX size={64} />
                        </div>
                        <h3 class="empty-title">
                            {$t("doctor_journey.no_appointments")}
                        </h3>
                        <p class="empty-description">
                            {#if isToday}
                                {$t("doctor_journey.no_appt_today")}
                            {:else}
                                {$t("doctor_journey.no_appt_on_date", {
                                    values: {
                                        date: formatDateDisplay(selectedDate),
                                    },
                                })}
                            {/if}
                        </p>
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
                                    {new Date(
                                        appt.start_time.replace(' ', 'T'),
                                    ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
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
                                            ✅ {$t(
                                                "journey.status_completed",
                                            ) || "Terminé"}
                                        </span>
                                    {:else}
                                        <span class="status-badge scheduled">
                                            📅 {$t("doctor_journey.scheduled")}
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <div class="patient-info flex-1">
                                <div class="flex items-center gap-2">
                                    <h4 class="patient-name">
                                        {appt.patient_name}
                                    </h4>
                                    {#if isToday && (appt.status === "waiting_room" || appt.waiting_room_status === "waiting")}
                                        <div
                                            class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            <span
                                                class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                                            ></span>
                                            🏥 {$t(
                                                "doctor_journey.waiting_room",
                                            )}
                                        </div>
                                    {/if}
                                </div>
                                <div class="appointment-meta">
                                    <span class="appointment-type"
                                        >{$t(
                                            `assistant.dashboard.appointment.type.${appt.appointment_type}`,
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

                                {#if isToday && appt.waitMins !== null}
                                    <p
                                        class="text-[10px] mt-1 font-bold {appt.waitMins >
                                        20
                                            ? 'text-red-500'
                                            : 'text-green-600'}"
                                    >
                                        ↳ {$t("doctor_journey.waiting_since")}
                                        {appt.waitMins} min ({$t(
                                            "doctor_journey.arrival_at",
                                        )}
                                        {new Date(
                                            appt.check_in_time.replace(' ', 'T'),
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
                                                : $t(
                                                      "journey.start_treatment",
                                                  ) || "Traiter"}</span
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
                                        onclick={(e) =>
                                            completeVisit(e, appt.id)}
                                        title={$t("doctor_journey.finish")}
                                    >
                                        {$t("doctor_journey.finish")}
                                    </button>
                                {/if}
                            </div>
                        </article>
                    {/each}
                {/if}
            </div>
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
        padding: 2.5rem;
        box-shadow:
            0 20px 25px -5px rgba(0, 0, 0, 0.05),
            0 10px 10px -5px rgba(0, 0, 0, 0.02);
    }

    /* ============================================ */
    /* DATE NAVIGATION BAR - Glassmorphism */
    /* ============================================ */
    .date-navigation-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5rem;
        padding: 1.25rem 2rem;
        margin-bottom: 2.5rem;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        position: sticky;
        top: 0.5rem;
        z-index: 50;
    }

    /* ============================================ */
    /* NAVIGATION BUTTONS */
    /* ============================================ */
    .nav-button {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .nav-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }

    .nav-button:active {
        transform: translateY(0);
    }

    /* ============================================ */
    /* DATE DISPLAY */
    /* ============================================ */
    .date-display-container {
        flex: 1;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .calendar-picker-wrapper {
        position: relative;
    }

    .date-display-btn {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: transparent;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.75rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .date-display-btn:hover {
        background: rgba(0, 0, 0, 0.03);
        transform: scale(1.02);
    }

    .hidden-date-input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
        pointer-events: none;
    }

    .date-display {
        font-size: 1.5rem;
        font-weight: 800;
        color: #1e293b;
        letter-spacing: -0.03em;
        line-height: 1;
    }

    .today-badge {
        display: inline-block;
        margin-top: 0.5rem;
        padding: 0.25rem 0.875rem;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        font-size: 0.7rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        border-radius: 9999px;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    /* ============================================ */
    /* TODAY QUICK JUMP BUTTON */
    /* ============================================ */
    .today-jump-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: white;
        border: 2px solid #10b981;
        color: #059669;
        border-radius: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
    }

    /* Responsive: Hide labels on mobile */
    @media (max-width: 640px) {
        .button-label {
            display: none;
        }
        .date-display {
            font-size: 1.125rem;
        }
        .nav-button {
            padding: 0.75rem 1rem;
        }
    }

    .today-jump-btn:hover {
        background: #f0fdf4;
        transform: translateY(-2px);
    }

    /* ============================================ */
    /* EMPTY STATE */
    /* ============================================ */
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 6rem 2rem;
        text-align: center;
        background: #fcfdfe;
        border: 2px dashed #e2e8f0;
        border-radius: 2rem;
    }

    .empty-icon {
        margin-bottom: 2rem;
        color: #cbd5e1;
        opacity: 0.8;
    }

    .empty-title {
        font-size: 1.75rem;
        font-weight: 800;
        color: #475569;
        margin-bottom: 0.75rem;
        letter-spacing: -0.02em;
    }

    .empty-description {
        color: #94a3b8;
        font-size: 1.125rem;
        max-width: 400px;
        line-height: 1.6;
    }

    .appointments-container {
        position: relative;
        min-height: 400px;
        transition: opacity 0.3s ease;
    }

    .appointments-container.loading-active {
        opacity: 0.6;
        pointer-events: none;
    }

    .loading-overlay {
        position: absolute;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        background: white;
        padding: 1rem 2rem;
        border-radius: 9999px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        z-index: 100;
        border: 1px solid #eef2ff;
    }

    .loading-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #e0e7ff;
        border-top-color: #4f46e5;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .appointments-list {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
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

    .status-badge-container {
        display: flex;
    }

    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 2rem;
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
    }

    .status-badge.ongoing {
        background: #dbeafe;
        color: #2563eb;
    }
    .status-badge.overdue {
        background: #fee2e2;
        color: #dc2626;
        animation: pulse 2s infinite;
    }
    .status-badge.upcoming {
        background: #fef3c7;
        color: #d97706;
    }
    .status-badge.completed {
        background: #dcfce7;
        color: #166534;
    }
    .status-badge.scheduled {
        background: #f1f5f9;
        color: #64748b;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.8;
        }
    }

    .pulse-dot {
        width: 6px;
        height: 6px;
        background: currentColor;
        border-radius: 50%;
        position: relative;
    }

    .pulse-dot::after {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        background: inherit;
        border-radius: inherit;
        animation: pulse-ring 1.5s cubic-bezier(0.24, 0, 0.38, 1) infinite;
    }

    /* Actions Zone */
    .actions-zone {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .action-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 1rem;
        font-weight: 800;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;
        text-decoration: none;
    }

    .action-btn.primary {
        background: #1e293b;
        color: white;
    }

    .action-btn.primary:hover {
        background: #0f172a;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .action-btn.primary.ongoing {
        background: #2563eb;
    }

    .action-btn.ghost {
        background: #f1f5f9;
        color: #475569;
    }

    .action-btn.ghost:hover {
        background: #e2e8f0;
    }

    .finish-visit-hint {
        background: transparent;
        border: 2px solid #10b981;
        color: #10b981;
        padding: 0.5rem 1rem;
        border-radius: 0.75rem;
        font-size: 0.75rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.2s;
    }

    .finish-visit-hint:hover {
        background: #10b981;
        color: white;
    }

    /* Responsive Grid Layout */
    @media (max-width: 1024px) {
        .appointment-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
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
            justify-content: space-between;
        }

        .action-btn {
            flex: 1;
            justify-content: center;
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
