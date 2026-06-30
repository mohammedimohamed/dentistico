<script lang="ts">
    import { t } from "svelte-i18n";
    import { Clock, User, AlertTriangle } from "lucide-svelte";

    let { waitingPatients, onStartVisit } = $props();

    // Calculate positions for each patient
    let enrichedPatients = $derived.by(() => {
        // Sort by appointment time for display
        const sorted = [...waitingPatients].sort(
            (a, b) =>
                new Date(a.start_time.replace(' ', 'T')).getTime() -
                new Date(b.start_time.replace(' ', 'T')).getTime(),
        );

        // Get original check-in order positions
        const arrivalOrder = [...waitingPatients]
            .sort(
                (a, b) =>
                    new Date(a.check_in_time.replace(' ', 'T')).getTime() -
                    new Date(b.check_in_time.replace(' ', 'T')).getTime(),
            )
            .map((p, idx) => ({ id: p.id, position: idx + 1 }));

        // Merge data
        return sorted.map((patient, idx) => {
            const arrivalPos =
                arrivalOrder.find((a) => a.id === patient.id)?.position || 0;
            const timing = getAppointmentTimingStatus(patient);

            return {
                ...patient,
                appointmentPosition: idx + 1, // Position based on appointment time
                arrivalPosition: arrivalPos, // Position based on check-in time
                timing,
            };
        });
    });

    function getAppointmentTimingStatus(appointment: any) {
        const now = new Date();
        const scheduledTime = new Date(appointment.start_time.replace(' ', 'T'));
        const diffMinutes = Math.floor(
            (now.getTime() - scheduledTime.getTime()) / (1000 * 60),
        );

        if (diffMinutes < -10) {
            return {
                status: "early",
                label: "En avance",
                icon: "✅",
                color: "green",
            };
        } else if (diffMinutes >= -10 && diffMinutes <= 10) {
            return {
                status: "on_time",
                label: "À l'heure",
                icon: "🕐",
                color: "blue",
            };
        } else {
            return {
                status: "late",
                label: `Retard ${diffMinutes} min`,
                icon: "⚠️",
                color: "red",
            };
        }
    }

    function formatTime(dateString: any) {
        return new Date(dateString.replace(' ', 'T')).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function calculateWaitTime(checkInTime: any) {
        const diff = Date.now() - new Date(checkInTime.replace(' ', 'T')).getTime();
        return Math.floor(diff / (1000 * 60)); // minutes
    }
</script>

<div class="waiting-room-container">
    <div class="waiting-room-header">
        <h3>{$t('components.waiting_room_list.salle_dattente')}{waitingPatients.length})</h3>
        <div class="legend">
            <div class="legend-item">
                <span class="badge-demo appointment-badge">#</span>
                {$t('components.waiting_room_list.ordre_rdv')}
            </div>
            <div class="legend-item">
                <span class="text-white/70">{$t('components.waiting_room_list.n_me')}</span>
                {$t('components.waiting_room_list.ordre_darriv_e')}
            </div>
        </div>
    </div>

    <div class="patient-list">
        {#each enrichedPatients as patient (patient.id)}
            <div class="patient-card">
                <!-- APPOINTMENT ORDER BADGE (Primary) -->
                <div class="appointment-order-badge">
                    #{patient.appointmentPosition}
                </div>

                <!-- PATIENT INFO -->
                <div class="patient-info-section">
                    <div class="patient-name">
                        <User size={20} class="text-gray-400" />
                        {patient.patient_name}
                    </div>

                    <!-- Arrival Information (Secondary) -->
                    <div class="arrival-info">
                        {$t('components.waiting_room_list.arriv_e')} {formatTime(patient.check_in_time)}
                        <span class="arrival-position"
                            >({patient.arrivalPosition}{patient.arrivalPosition ===
                            1
                                ? "er"
                                : "ème"})</span
                        >
                    </div>
                </div>

                <!-- APPOINTMENT TIMING -->
                <div class="timing-section">
                    <div class="scheduled-time">
                        {$t('components.waiting_room_list.rdv')} {formatTime(patient.start_time)}
                    </div>

                    <div class="timing-status status-{patient.timing.color}">
                        {patient.timing.icon}
                        {patient.timing.label}
                    </div>
                </div>

                <!-- WAIT TIME -->
                <div class="wait-time-section">
                    <Clock size={16} />
                    {$t('components.waiting_room_list.attente')} {calculateWaitTime(patient.check_in_time)} {$t('common.minutes_short')}
                </div>

                <!-- ACTIONS -->
                <div class="actions-section">
                    <button
                        class="btn-start-visit"
                        onclick={() => onStartVisit(patient.id)}
                    >
                        ▶️ Commencer la visite
                    </button>
                </div>
            </div>
        {/each}
        {#if waitingPatients.length === 0}
            <div class="empty-state">
                <div class="empty-icon">🛋️</div>
                <p>{$t('components.waiting_room_list.la_salle_dattente_est')}</p>
            </div>
        {/if}
    </div>
</div>

<style>
    .waiting-room-container {
        background: white;
        border-radius: 1rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        overflow: hidden;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .waiting-room-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        color: white;
    }

    .waiting-room-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .legend {
        display: flex;
        gap: 1rem;
        font-size: 0.75rem;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.375rem;
    }

    .badge-demo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        background: white;
        color: #4f46e5;
        border-radius: 0.25rem;
        font-weight: 900;
    }

    .patient-list {
        flex: 1;
        overflow-y: auto;
        max-height: 600px;
    }

    .empty-state {
        padding: 3rem;
        text-align: center;
        color: #94a3b8;
    }

    .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    /* ============================================ */
    /* PATIENT CARD */
    /* ============================================ */
    .patient-card {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 1.25rem;
        align-items: center;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #f1f5f9;
        transition: all 0.2s ease;
    }

    .patient-card:hover {
        background: #f8fafc;
    }

    .patient-card:last-child {
        border-bottom: none;
    }

    /* ============================================ */
    /* APPOINTMENT ORDER BADGE (Primary Visual) */
    /* ============================================ */
    .appointment-order-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        font-size: 1.125rem;
        font-weight: 900;
        border-radius: 0.75rem;
        box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
    }

    /* ============================================ */
    /* PATIENT INFO */
    /* ============================================ */
    .patient-info-section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .patient-name {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
    }

    .arrival-info {
        font-size: 0.75rem;
        color: #64748b;
    }

    .arrival-position {
        font-weight: 600;
        color: #94a3b8;
    }

    /* ============================================ */
    /* TIMING SECTION */
    /* ============================================ */
    .timing-section {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        text-align: right;
    }

    .scheduled-time {
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
    }

    .timing-status {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.625rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }

    .status-green {
        background: #dcfce7;
        color: #166534;
    }

    .status-blue {
        background: #dbeafe;
        color: #1e40af;
    }

    .status-red {
        background: #fee2e2;
        color: #991b1b;
        animation: pulse 2s infinite;
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

    /* ============================================ */
    /* WAIT TIME */
    /* ============================================ */
    .wait-time-section {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        color: #64748b;
        font-size: 0.8125rem;
        min-width: 100px;
    }

    /* ============================================ */
    /* ACTIONS */
    /* ============================================ */
    .btn-start-visit {
        padding: 0.5rem 1rem;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.8125rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }

    .btn-start-visit:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    /* ============================================ */
    /* RESPONSIVE */
    /* ============================================ */
    @media (max-width: 1280px) {
        .patient-card {
            grid-template-columns: auto 1fr;
            gap: 1rem;
        }

        .timing-section,
        .wait-time-section {
            grid-column: 2;
            flex-direction: row;
            justify-content: flex-start;
            text-align: left;
        }

        .actions-section {
            grid-column: 1 / -1;
        }
    }
</style>
