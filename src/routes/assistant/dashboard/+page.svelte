<script lang="ts">
    import type { PageData } from "./$types";
    import { enhance } from "$app/forms";
    import { APP_CONFIG } from "$lib/config/app.config";
    import FullCalendar from "$lib/components/FullCalendar.svelte";
    import SlotPicker from "$lib/components/common/SlotPicker.svelte";
    import { t } from "svelte-i18n";

    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { logger } from "$lib/utils/logger";
    import { createDebouncer } from "$lib/utils/debounce";
    import { fly, fade, slide } from "svelte/transition";

    const invalidateDebouncer = createDebouncer(2000); // 2-second batching window

    let { data }: { data: any } = $props();

    function calculateAge(dob: string) {
        if (!dob) return "N/A";
        let birthDate: Date;
        if (dob.includes("/")) {
            const parts = dob.split("/");
            birthDate = new Date(
                parseInt(parts[2]),
                parseInt(parts[1]) - 1,
                parseInt(parts[0]),
            );
        } else {
            birthDate = new Date(dob);
        }
        if (isNaN(birthDate.getTime())) return "N/A";
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }
    const patients = $derived(data.patients as any[]);
    const patientSearch = $derived((data.patientSearch as string) || "");
    const patientFilter = $derived((data.patientFilter as string) || "");

    function applyPatientFilter(filter: string) {
        const url = new URL($page.url);
        if (filter) {
            url.searchParams.set("patientFilter", filter);
        } else {
            url.searchParams.delete("patientFilter");
        }
        goto(url.toString(), {
            keepFocus: true,
            noScroll: true,
            replaceState: true,
        });
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat("fr-DZ", {
            style: "currency",
            currency: "DZD",
        }).format(Math.abs(amount));
    }

    function formatRelativeDate(dateStr: string) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const diffDays = Math.ceil(
            (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
        if (date.toDateString() === tomorrow.toDateString()) return "Demain";
        if (diffDays > 0 && diffDays <= 7) return `Dans ${diffDays}j`;
        return date.toLocaleDateString("fr-FR");
    }

    let activeTab = $state("schedule");

    // Set max date to today for date of birth (cannot be in the future)
    const maxDateOfBirth = new Date().toISOString().split("T")[0];

    // Initialize viewMode from URL param or default to 'list'
    let viewMode = $state($page.url.searchParams.get("view") || "list");

    let isBookingModalOpen = $state(false);

    // UI state
    let isPatientModalOpen = $state(false);
    let isPaymentModalOpen = $state(false);
    let selectedPaymentPatient = $state<any>(null);
    let selectedAppointment = $state<any>(null); // For booking/editing
    let searchPatientQuery = $state(patientSearch);
    let errorMessage = $state("");
    let isFabOpen = $state(false);

    // Confirmation modal state
    let isConfirmModalOpen = $state(false);
    let pendingAction = $state<{
        type: "single" | "bulk";
        status: string;
        appointmentId?: number;
        appointmentIds?: number[];
        count?: number;
    } | null>(null);
    let pendingFormElement = $state<HTMLFormElement | null>(null);
    // New search & filter state for appointments
    let searchQuery = $state("");
    let statusFilter = $state("");
    // Show past appointments preference (persistent in localStorage)
    let showPastAppointments = $state(
        typeof localStorage !== "undefined"
            ? JSON.parse(
                  localStorage.getItem("assistant-show-past-appointments") ||
                      "false",
              )
            : false,
    );

    // Appointment form state
    let patientSearchQuery = $state(patientSearch);
    let selectedPatient = $state<any>(null);
    let isNewPatient = $state(false);
    let patientCardUrl = $state<string | null>(null);

    // Check-in state
    let isCheckInModalOpen = $state(false);
    let checkInAppointment = $state<any>(null);
    let checkInNotes = $state("");
    let isSubmittingCheckIn = $state(false);
    let isSubmittingPatient = $state(false);
    let isImminentModalOpen = $state(false);
    let imminentAppointment = $state<any>(null);

    // SlotPicker state for visual appointment booking
    let modalDoctorId = $state<string>("");
    let slotPickerDate = $state("");
    let slotPickerTime = $state("");

    // Patient Creation Modal State
    let patientFullName = $state("");
    let patientPhone = $state("");
    let patientEmail = $state("");
    let patientDob = $state("");
    let isDependent = $state(false);
    let guardianName = $state("");
    let guardianRole = $state("Father");
    let guardianPhone = $state("");
    let guardianEmail = $state("");
    let showSuccessView = $state(false);
    let createdPatientData = $state<{ id: number; name: string } | null>(null);

    // Live searches
    let manageSearchQuery = $state("");
    let guardianSearchQuery = $state("");
    let guardianResults = $state<any[]>([]);
    let isGuardianSearching = $state(false);

    // Left panel list filtering (Existing patients + Did you mean?)
    const filteredGlobalPatients = $derived.by(() => {
        const query =
            manageSearchQuery.toLowerCase() || patientFullName.toLowerCase();
        if (!query) return data.patients.slice(0, 10);
        return data.patients
            .filter(
                (p: any) =>
                    p.full_name.toLowerCase().includes(query) ||
                    (p.phone && p.phone.includes(query)),
            )
            .slice(0, 20);
    });

    async function searchGuardians(q: string) {
        if (q.length < 2) {
            guardianResults = [];
            return;
        }
        isGuardianSearching = true;
        try {
            const res = await fetch(
                `/api/patients/search?q=${encodeURIComponent(q)}`,
            );
            guardianResults = await res.json();
        } catch (e) {
            logger.error("Guardian search failed:", e);
        } finally {
            isGuardianSearching = false;
        }
    }

    function selectGuardian(p: any) {
        guardianName = p.full_name;
        guardianPhone = p.phone || "";
        guardianEmail = p.email || "";
        guardianSearchQuery = "";
        guardianResults = [];
    }

    function handleDobInput(e: Event) {
        const input = e.target as HTMLInputElement;
        let value = input.value.replace(/\D/g, "");
        if (value.length > 8) value = value.slice(0, 8);

        let formatted = "";
        if (value.length > 0) {
            formatted += value.slice(0, 2);
            if (value.length > 2) {
                formatted += "/" + value.slice(2, 4);
                if (value.length > 4) {
                    formatted += "/" + value.slice(4, 8);
                }
            }
        }
        patientDob = formatted;
    }

    let patientAge = $derived.by(() => {
        if (!patientDob || patientDob.length < 10) return null;
        const parts = patientDob.split("/");
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

        const birthDate = new Date(year, month - 1, day);
        if (isNaN(birthDate.getTime())) return null;

        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    });

    $effect(() => {
        if (patientAge !== null && patientAge < 18) {
            isDependent = true;
        }
    });

    $effect(() => {
        if (guardianSearchQuery) {
            const timer = setTimeout(
                () => searchGuardians(guardianSearchQuery),
                300,
            );
            return () => clearTimeout(timer);
        }
    });

    function planAppointment(type: string) {
        if (!createdPatientData) return;

        // Pre-fill booking modal
        selectedPatient = {
            id: createdPatientData.id,
            full_name: createdPatientData.name,
        };
        isNewPatient = false;
        patientSearchQuery = createdPatientData.name;

        // Open booking modal
        isBookingModalOpen = true;
        selectedAppointment = {
            appointment_type: type,
            duration_minutes: type === "emergency" ? 15 : 30,
        };

        // Reset and close patient modal
        isPatientModalOpen = false;
        setTimeout(() => {
            showSuccessView = false;
            createdPatientData = null;
        }, 500);
    }

    // Manual booking validation
    let unavailableDates = $state<string[]>([]);
    let nonWorkingDays = $state<number[]>([]);

    async function loadUnavailableDates() {
        try {
            const res = await fetch("/api/booking/unavailable-dates");
            const data = await res.json();
            unavailableDates = data.closureDates || [];
            nonWorkingDays = data.nonWorkingDays || [];
        } catch (e) {
            logger.error("Failed to load unavailable dates:", e);
        }
    }

    function isDateDisabled(dateString: string): boolean {
        if (!dateString) return false;
        // datetime-local gives YYYY-MM-DDTHH:MM
        const justDate = dateString.split("T")[0];
        if (unavailableDates.includes(justDate)) return true;

        const date = new Date(justDate);
        const dayOfWeek = date.getDay();
        if (nonWorkingDays.includes(dayOfWeek)) return true;

        return false;
    }

    let selectedDoctorId = $state("");
    let isWalkInModalOpen = $state(false);

    let lastUpdateVersion = $state<string | null>(null);

    function openPatientModal() {
        patientFullName = "";
        patientPhone = "";
        patientEmail = "";
        patientDob = "";
        isDependent = false;
        guardianName = "";
        guardianPhone = "";
        guardianEmail = "";
        guardianRole = "Father";
        manageSearchQuery = "";
        guardianSearchQuery = "";
        guardianResults = [];
        showSuccessView = false;
        createdPatientData = null;
        errorMessage = "";
        isPatientModalOpen = true;
    }

    onMount(() => {
        loadUnavailableDates();

        // Background polling for real-time updates - tuned for performance
        const interval = setInterval(async () => {
            if (!document.hidden) {
                try {
                    const statusRes = await fetch("/api/updates/status");
                    if (statusRes.ok) {
                        const { version } = await statusRes.json();
                        if (version === lastUpdateVersion) {
                            return; // No changes, keep UI responsive
                        }
                        lastUpdateVersion = version;
                    }

                    logger.info(
                        "Assistant Dashboard: Pulse detected change, sync triggered",
                    );
                    const { invalidate } = await import("$app/navigation");
                    await invalidate("appointments:today");
                    await invalidate("waiting-room:status");
                } catch (e) {
                    logger.error("Assistant sync failed:", e);
                }
            }
        }, 30000); // 30s check (lightweight)

        return () => clearInterval(interval);
    });

    function openCheckInModal(appt: any) {
        checkInAppointment = appt;
        checkInNotes = "";
        isCheckInModalOpen = true;
    }

    async function handleCheckIn() {
        if (!checkInAppointment) return;
        isSubmittingCheckIn = true;

        try {
            const response = await fetch("/api/appointments/check-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointment_id: checkInAppointment.id,
                    check_in_time: new Date().toISOString(),
                    notes: checkInNotes,
                }),
            });

            if (response.ok) {
                isCheckInModalOpen = false;
                checkInAppointment = null;

                // Debounce invalidation to batch rapid manual actions
                invalidateDebouncer(async () => {
                    const { invalidate } = await import("$app/navigation");
                    await invalidate("appointments:today");
                    await invalidate("waiting-room:status");
                });
            } else {
                const err = await response.json();
                alert(`Check-in failed: ${err.error}`);
            }
        } catch (e: any) {
            logger.error("Check-in error:", e);
            alert(`Error: ${e.message}`);
        } finally {
            isSubmittingCheckIn = false;
        }
    }

    async function handleCheckInAndNotify() {
        if (!imminentAppointment) return;
        isSubmittingCheckIn = true;

        const formData = new FormData();
        formData.append("appointment_id", imminentAppointment.id.toString());

        try {
            const response = await fetch("?/checkInAndNotify", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                isImminentModalOpen = false;
                imminentAppointment = null;
                const { invalidate } = await import("$app/navigation");
                await invalidate("appointments:today");
                await invalidate("waiting-room:status");
            }
        } catch (e) {
            logger.error("Check-in and notify failed:", e);
        } finally {
            isSubmittingCheckIn = false;
        }
    }

    // Table view state
    let tableSortColumn = $state<string | null>(null);
    let tableSortDirection = $state<"asc" | "desc">("asc");
    let selectedRows = $state<Set<number>>(new Set());
    let columnFilters = $state<Record<string, string>>({
        patient: "",
        doctor: "",
        status: "",
        type: "",
        date: "",
    });

    // Reactive filtered appointments list using $derived.by for complex logic
    const filteredAppointments = $derived.by(() => {
        const appointments = data.appointments ?? [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return appointments.filter((appt: any) => {
            const apptDate = new Date(appt.start_time);

            const matchesTime = showPastAppointments || apptDate >= today;

            const matchesSearch = searchQuery
                ? appt.patient_name
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  appt.doctor_name
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  (appt.notes &&
                      appt.notes
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()))
                : true;
            const matchesStatus = statusFilter
                ? statusFilter === "arrived"
                    ? appt.checked_in === 1
                    : appt.status === statusFilter
                : true;
            const matchesDoctorFilter = selectedDoctorId
                ? appt.doctor_id == selectedDoctorId
                : true;
            return (
                matchesTime &&
                matchesSearch &&
                matchesStatus &&
                matchesDoctorFilter
            );
        });
    });

    // Table filtered and sorted appointments
    const tableAppointments = $derived.by(() => {
        let result = [...filteredAppointments];

        // Apply column filters
        if (columnFilters.patient) {
            result = result.filter((appt: any) =>
                appt.patient_name
                    ?.toLowerCase()
                    .includes(columnFilters.patient.toLowerCase()),
            );
        }
        if (columnFilters.doctor) {
            result = result.filter((appt: any) =>
                appt.doctor_name
                    ?.toLowerCase()
                    .includes(columnFilters.doctor.toLowerCase()),
            );
        }
        if (columnFilters.status) {
            result = result.filter((appt: any) =>
                columnFilters.status === "arrived"
                    ? appt.checked_in === 1
                    : appt.status === columnFilters.status,
            );
        }
        if (columnFilters.type) {
            result = result.filter(
                (appt: any) => appt.appointment_type === columnFilters.type,
            );
        }
        if (columnFilters.date) {
            const filterDate = columnFilters.date;
            result = result.filter((appt: any) => {
                const apptDate = new Date(appt.start_time)
                    .toISOString()
                    .split("T")[0];
                return apptDate === filterDate;
            });
        }

        // Apply sorting
        if (tableSortColumn) {
            result.sort((a: any, b: any) => {
                let aVal: any;
                let bVal: any;

                switch (tableSortColumn) {
                    case "patient":
                        aVal = a.patient_name || "";
                        bVal = b.patient_name || "";
                        break;
                    case "doctor":
                        aVal = a.doctor_name || "";
                        bVal = b.doctor_name || "";
                        break;
                    case "status":
                        aVal = a.status || "";
                        bVal = b.status || "";
                        break;
                    case "type":
                        aVal = a.appointment_type || "";
                        bVal = b.appointment_type || "";
                        break;
                    case "date":
                        aVal = new Date(a.start_time).getTime();
                        bVal = new Date(b.start_time).getTime();
                        break;
                    case "time":
                        aVal = new Date(a.start_time).getTime();
                        bVal = new Date(b.start_time).getTime();
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return tableSortDirection === "asc" ? -1 : 1;
                if (aVal > bVal) return tableSortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    });

    function toggleSort(column: string) {
        if (tableSortColumn === column) {
            tableSortDirection = tableSortDirection === "asc" ? "desc" : "asc";
        } else {
            tableSortColumn = column;
            tableSortDirection = "asc";
        }
    }

    function toggleRowSelection(id: number) {
        const newSelection = new Set(selectedRows);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        selectedRows = newSelection;
    }

    function toggleSelectAll() {
        if (selectedRows.size === tableAppointments.length) {
            selectedRows = new Set();
        } else {
            selectedRows = new Set(
                tableAppointments.map((appt: any) => appt.id),
            );
        }
    }

    function clearFilters() {
        columnFilters = {
            patient: "",
            doctor: "",
            status: "",
            type: "",
            date: "",
        };
    }

    function showConfirmation(
        event: Event,
        type: "single" | "bulk",
        status: string,
        appointmentId?: number,
        appointmentIds?: number[],
    ) {
        event.preventDefault();
        event.stopPropagation();

        const form = (event.target as HTMLElement).closest(
            "form",
        ) as HTMLFormElement;
        pendingFormElement = form;

        pendingAction = {
            type,
            status,
            appointmentId,
            appointmentIds,
            count: type === "bulk" ? appointmentIds?.length : 1,
        };
        isConfirmModalOpen = true;
    }

    function confirmAction() {
        if (pendingFormElement && pendingAction) {
            // Submit the form
            pendingFormElement.requestSubmit();
            isConfirmModalOpen = false;
            pendingAction = null;
            pendingFormElement = null;
        }
    }

    function cancelConfirmation() {
        isConfirmModalOpen = false;
        pendingAction = null;
        pendingFormElement = null;
    }

    function selectPatient(patient: any) {
        selectedPatient = patient;
        isNewPatient = false;
        patientSearchQuery = "";
    }

    function createNewPatient() {
        selectedPatient = null;
        isNewPatient = true;
    }

    function resetAppointmentForm() {
        selectedAppointment = null;
        selectedPatient = null;
        isNewPatient = false;
        patientSearchQuery = "";
        patientCardUrl = null;
        modalDoctorId = "";
        slotPickerDate = "";
        slotPickerTime = "";
    }

    async function generatePatientCard(patientId: number) {
        try {
            // Find the patient
            const patient = data.patients.find((p: any) => p.id === patientId);
            if (!patient) return;

            const allAppointments = data.appointments;
            const patientAppointments = allAppointments.filter(
                (appt: any) => appt.patient_id === patientId,
            );

            // Get only future appointments (upcoming)
            const futureAppointments = patientAppointments.filter(
                (appt: any) => new Date(appt.start_time) >= new Date(),
            );

            // Calculate age if date of birth is available
            let ageDisplay = "";
            if (patient.date_of_birth) {
                const birthDate = new Date(patient.date_of_birth);
                const today = new Date();
                const age = Math.floor(
                    (today.getTime() - birthDate.getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000),
                );
                ageDisplay = " (" + age + " ans)";
            }

            const patientName = patient.full_name;
            const patientPhone = patient.phone || "N/A";
            const patientEmail = patient.email || "N/A";
            const patientDob = patient.date_of_birth
                ? new Date(patient.date_of_birth).toLocaleDateString("fr-FR") +
                  ageDisplay
                : "N/A";

            const currentDate = new Date().toLocaleDateString("fr-FR");

            // Open a new window
            const printWindow = window.open("", "_blank");
            if (!printWindow) return;

            const doc = printWindow.document;
            doc.open();

            // Basic HTML structure
            doc.write("<!DOCTYPE html>");
            doc.write('<html lang="fr"><head><meta charset="UTF-8">');
            doc.write(
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            );
            doc.write("<title>Fiche Patient - " + patientName + "</title>");

            // Inject styles via a <style> element added to <head>
            const css = [
                "body{font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a;padding:24px;}",
                ".card{max-width:640px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(15,23,42,0.15);overflow:hidden;border:1px solid #e2e8f0;}",
                ".header{background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;padding:24px 28px;text-align:center;}",
                ".header h1{font-size:24px;font-weight:700;margin-bottom:4px;}",
                ".header p{font-size:13px;opacity:.9;}",
                ".content{padding:24px 28px;}",
                ".section{margin-bottom:24px;}",
                ".section-title{font-size:16px;font-weight:600;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #e5e7eb;}",
                ".info-row{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid #e5e7eb;font-size:13px;margin-bottom:6px;}",
                ".info-label{color:#6b7280;font-weight:500;}",
                ".info-value{color:#111827;font-weight:600;}",
                ".appt-card{border-radius:12px;border:1px solid #fbbf24;background:linear-gradient(135deg,#fef3c7,#fde68a);padding:14px 14px 12px 14px;margin-bottom:10px;font-size:13px;}",
                ".appt-date{font-weight:700;color:#92400e;margin-bottom:6px;}",
                ".appt-meta{display:flex;justify-content:space-between;gap:8px;}",
                ".appt-label{font-size:11px;text-transform:uppercase;color:#78350f;font-weight:500;}",
                ".appt-value{font-weight:600;color:#92400e;}",
                ".no-appt{text-align:center;font-size:13px;color:#6b7280;font-style:italic;padding:18px 8px;}",
                ".footer{text-align:center;padding-top:14px;border-top:1px solid #e5e7eb;margin-top:10px;font-size:12px;color:#6b7280;}",
                ".clinic-name{color:#0d9488;font-weight:700;}",
            ].join("");

            const styleEl = doc.createElement("style");
            styleEl.textContent = css;
            doc.head.appendChild(styleEl);

            doc.write("</head><body>");

            doc.write('<div class="card">');

            // Header
            doc.write('<div class="header">');
            doc.write("<h1>Fiche Patient</h1>");
            doc.write("<p>Résumé des informations et rendez-vous</p>");
            doc.write("</div>");

            // Content
            doc.write('<div class="content">');

            // Personal info
            doc.write('<div class="section">');
            doc.write(
                '<div class="section-title">Informations Personnelles</div>',
            );
            doc.write(
                '<div class="info-row"><div class="info-label">Nom complet</div><div class="info-value">' +
                    patientName +
                    "</div></div>",
            );
            doc.write(
                '<div class="info-row"><div class="info-label">Téléphone</div><div class="info-value">' +
                    patientPhone +
                    "</div></div>",
            );
            doc.write(
                '<div class="info-row"><div class="info-label">Email</div><div class="info-value">' +
                    patientEmail +
                    "</div></div>",
            );
            doc.write(
                '<div class="info-row"><div class="info-label">Date de naissance</div><div class="info-value">' +
                    patientDob +
                    "</div></div>",
            );
            if (patient.parent_name) {
                const parentInfo =
                    patient.parent_name +
                    " (" +
                    (patient.parent_phone || "Pas de téléphone") +
                    ")";
                doc.write(
                    '<div class="info-row"><div class="info-label">Parent</div><div class="info-value">' +
                        parentInfo +
                        "</div></div>",
                );
            }
            doc.write("</div>");

            // Upcoming appointments
            doc.write('<div class="section">');
            doc.write('<div class="section-title">Rendez-vous à venir</div>');

            if (futureAppointments.length > 0) {
                for (const appt of futureAppointments) {
                    const apptDate = new Date(
                        appt.start_time,
                    ).toLocaleDateString("fr-FR");
                    const apptTime = new Date(
                        appt.start_time,
                    ).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                    const apptType = appt.appointment_type;
                    const apptDoctor = appt.doctor_name;

                    doc.write('<div class="appt-card">');
                    doc.write(
                        '<div class="appt-date">' +
                            apptDate +
                            " à " +
                            apptTime +
                            "</div>",
                    );
                    doc.write('<div class="appt-meta">');
                    doc.write(
                        '<div><div class="appt-label">Type</div><div class="appt-value">' +
                            apptType +
                            "</div></div>",
                    );
                    doc.write(
                        '<div><div class="appt-label">Docteur</div><div class="appt-value">' +
                            apptDoctor +
                            "</div></div>",
                    );
                    doc.write("</div>");
                    doc.write("</div>");
                }
            } else {
                doc.write(
                    '<div class="no-appt">Aucun rendez-vous programmé</div>',
                );
            }

            doc.write("</div>"); // end section

            // Footer
            doc.write('<div class="footer">');
            doc.write(
                `<span class="clinic-name">${data.config?.clinicName || "Dentistico"}</span> - ` +
                    currentDate,
            );
            doc.write("</div>"); // footer

            doc.write("</div>"); // content
            doc.write("</div>"); // card

            doc.write("</body></html>");
            doc.close();

            // Auto-print when ready
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } catch (error) {
            console.error("Error generating patient card:", error);
        }
    }

    $effect(() => {
        if (!isPatientModalOpen) {
            errorMessage = "";
        }
    });

    // Save show past appointments preference to localStorage
    $effect(() => {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(
                "assistant-show-past-appointments",
                JSON.stringify(showPastAppointments),
            );
        }
    });

    const tabs = [
        {
            id: "schedule",
            label: $t("assistant.dashboard.tabs.schedule.label"),
            icon: $t("assistant.dashboard.tabs.schedule.icon"),
        },
        {
            id: "patients",
            label: $t("assistant.dashboard.tabs.patients.label"),
            icon: $t("assistant.dashboard.tabs.patients.icon"),
        },
        {
            id: "payments",
            label: $t("assistant.dashboard.tabs.payments.label"),
            icon: $t("assistant.dashboard.tabs.payments.icon"),
        },
        {
            id: "waiting_room",
            label: $t("assistant.dashboard.tabs.waiting_room.label"),
            icon: $t("assistant.dashboard.tabs.waiting_room.icon"),
        },
    ];

    function openPaymentModal(patient: any) {
        selectedPaymentPatient = patient;
        isPaymentModalOpen = true;
    }

    // Server-side search for patients
    let searchTimeout: any;

    $effect(() => {
        let activeQuery = "";
        let shouldUpdate = false;

        // Determine which search input is "active" based on the UI state
        if (isBookingModalOpen) {
            activeQuery = patientSearchQuery.trim();
            shouldUpdate = true;
        } else if (activeTab === "patients") {
            activeQuery = searchPatientQuery.trim();
            shouldUpdate = true;
        }

        // Only proceed if we have an active search context
        if (shouldUpdate) {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                // Don't trigger navigation if the query hasn't effectively changed from what the server gave us
                if (activeQuery === patientSearch) return;

                const url = new URL($page.url);
                if (activeQuery) {
                    url.searchParams.set("patientSearch", activeQuery);
                } else {
                    url.searchParams.delete("patientSearch");
                }
                goto(url.toString(), {
                    replaceState: true,
                    noScroll: true,
                    keepFocus: true,
                });
            }, 400);
        }
    });

    $effect(() => {
        if (patientSearch !== undefined) {
            if (document.activeElement?.tagName !== "INPUT") {
                searchPatientQuery = patientSearch;
                patientSearchQuery = patientSearch;
            }
        }
    });

    function getFilteredPatients() {
        // Now patients is already filtered by the server if a search was performed
        return patients;
    }

    function closeModal() {
        isBookingModalOpen = false;
        selectedAppointment = null;
        modalDoctorId = "";
        slotPickerDate = "";
        slotPickerTime = "";
    }

    function openBookingModal(
        appt: any = null,
        startTime: string | null = null,
    ) {
        if (appt) {
            selectedAppointment = appt;
            modalDoctorId = appt.doctor_id ? appt.doctor_id.toString() : "";
            if (appt.start_time) {
                const dt = new Date(appt.start_time);
                slotPickerDate = dt.toISOString().split("T")[0];
                slotPickerTime = appt.start_time.includes("T")
                    ? appt.start_time
                    : appt.start_time.replace(" ", "T");
            }
            // Auto-populate patient
            if (appt.patient_id) {
                const foundPatient = data.patients.find(
                    (p: any) => p.id === appt.patient_id,
                );
                if (foundPatient) {
                    selectedPatient = foundPatient;
                }
            }
        } else if (startTime) {
            selectedAppointment = { start_time: startTime };
            selectedPatient = null;
            modalDoctorId = "";
            if (startTime) {
                slotPickerDate = startTime.split("T")[0].split(" ")[0];
                slotPickerTime = startTime.includes("T")
                    ? startTime
                    : startTime.replace(" ", "T");
            }
        } else {
            selectedAppointment = null;
            selectedPatient = null;
            modalDoctorId = "";
            slotPickerDate = "";
            slotPickerTime = "";
        }
        isBookingModalOpen = true;
    }

    function handleDateClick(info: any) {
        openBookingModal(null, info.dateStr);
    }

    // Map appointments to FC events
    const calendarEvents = $derived(
        filteredAppointments.map((a: any) => {
            const icon = a.relationship_to_primary ? "👶" : "👤";
            const webIndicator =
                a.notes && a.notes.includes("Source: Web") ? " 🌐" : "";
            return {
                id: a.id,
                title: `${icon} ${a.patient_name} - ${a.appointment_type.replace("_", " ")}${webIndicator}`,
                // Ensure ISO format for Calendar by replacing space with T if needed
                start: a.start_time.replace(" ", "T"),
                end: a.end_time.replace(" ", "T"),
                extendedProps: a,
                backgroundColor: a.doctor_color || "#3b82f6",
                borderColor: a.doctor_color || "#2563eb",
                textColor: "#ffffff",
            };
        }),
    );

    function handleEventClick(info: any) {
        openBookingModal(info.event.extendedProps);
    }

    async function handleEventChange(info: any) {
        const formData = new FormData();
        formData.append("id", info.event.id);
        formData.append("start_time", info.event.start.toISOString());
        formData.append("end_time", info.event.end.toISOString());

        const response = await fetch("?/rescheduleAppointment", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            alert("Failed to reschedule appointment");
            info.revert();
        }
    }

    // Tooltip State
    let tooltip = $state({
        visible: false,
        x: 0,
        y: 0,
        title: "",
        time: "",
        notes: "",
        patient: "",
        status: "",
    });

    function handleEventMouseEnter(info: any) {
        console.log("Hover event:", info);
        if (!info.el) return;

        // Ensure we work with valid data
        const props = info.event.extendedProps || {};
        const rect = info.el.getBoundingClientRect();

        // Calculate position - ensure it doesn't go offscreen
        const x = rect.right + 10;
        const y = rect.top;

        tooltip = {
            visible: true,
            x,
            y,
            title: info.event.title || "Appointment",
            time: `${info.event.start?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""} - ${info.event.end?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) || ""}`,
            notes: props.notes || "No notes",
            patient: props.patient_name || "Unknown Patient",
            status: props.status || "scheduled",
        };
    }

    function handleEventMouseLeave() {
        tooltip.visible = false;
    }
</script>

<div>
    <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            {#each tabs as tab}
                <button
                    class="{activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
                    onclick={() => (activeTab = tab.id)}
                >
                    <span class="mr-2">{tab.icon}</span>
                    {tab.label}
                </button>
            {/each}
        </nav>
    </div>

    <!-- SCHEDULE TAB -->
    {#if activeTab === "schedule"}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div
                class="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50"
            >
                <h3 class="text-lg font-bold text-gray-900">
                    {$t("assistant.dashboard.tabs.schedule.header")}
                </h3>
                <div class="flex items-center gap-4">
                    <div class="flex items-center bg-gray-200 p-1 rounded-lg">
                        <button
                            onclick={() => (viewMode = "list")}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode ===
                            'list'
                                ? 'bg-white shadow text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'}"
                        >
                            {$t("assistant.dashboard.buttons.list")}
                        </button>
                        <button
                            onclick={() => (viewMode = "calendar")}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode ===
                            'calendar'
                                ? 'bg-white shadow text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'}"
                        >
                            {$t("assistant.dashboard.buttons.calendar")}
                        </button>
                        <button
                            onclick={() => (viewMode = "table")}
                            class="px-3 py-1.5 text-xs font-bold rounded-md transition-all {viewMode ===
                            'table'
                                ? 'bg-white shadow text-indigo-600'
                                : 'text-gray-500 hover:text-gray-700'}"
                        >
                            Table
                        </button>
                    </div>
                    <!-- Search and filter controls -->
                    <div class="flex items-center gap-4 mt-2">
                        <input
                            type="text"
                            placeholder={$t(
                                "assistant.dashboard.search.placeholder",
                            ) || "Search appointments..."}
                            bind:value={searchQuery}
                            class="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <select
                            bind:value={statusFilter}
                            class="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="scheduled"
                                >{$t(
                                    "assistant.dashboard.appointment.status.scheduled",
                                )}</option
                            >
                            <option value="confirmed"
                                >{$t(
                                    "assistant.dashboard.appointment.status.confirmed",
                                )}</option
                            >
                            <option value="arrived"
                                >{$t(
                                    "assistant.dashboard.appointment.status.arrived",
                                )}</option
                            >
                            <option value="in_progress"
                                >{$t(
                                    "assistant.dashboard.appointment.status.in_progress",
                                )}</option
                            >
                            <option value="completed"
                                >{$t(
                                    "assistant.dashboard.appointment.status.completed",
                                )}</option
                            >
                            <option value="cancelled"
                                >{$t(
                                    "assistant.dashboard.appointment.status.cancelled",
                                )}</option
                            >
                            <option value="no_show"
                                >{$t(
                                    "assistant.dashboard.appointment.status.no_show",
                                )}</option
                            >
                        </select>
                        <button
                            type="button"
                            onclick={() =>
                                (showPastAppointments = !showPastAppointments)}
                            class="px-3 py-1.5 text-xs font-bold rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            {$t(
                                showPastAppointments
                                    ? "assistant.dashboard.buttons.hidePast"
                                    : "assistant.dashboard.buttons.showPast",
                            )}
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Practitioner Filter -->
                        <select
                            bind:value={selectedDoctorId}
                            class="px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                        >
                            <option value="">Tous les Docteurs</option>
                            {#each data.doctors as dr}
                                <option value={dr.id.toString()}
                                    >{dr.full_name}</option
                                >
                            {/each}
                        </select>
                    </div>
                </div>
            </div>

            <div class="p-6">
                {#if viewMode === "list"}
                    <ul role="list" class="divide-y divide-gray-100">
                        {#each filteredAppointments as appt}
                            <li class="group">
                                <div
                                    class="px-4 py-5 transition-colors rounded-xl flex items-center justify-between border-l-4"
                                    style="border-left-color: {appt.doctor_color ||
                                        '#6366f1'}; background-color: {appt.doctor_color}10"
                                >
                                    <div class="flex flex-col">
                                        <div
                                            class="flex items-center gap-3 mb-1"
                                        >
                                            <span
                                                class="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"
                                            >
                                                {new Date(
                                                    appt.start_time,
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                            <span
                                                class="text-xs font-medium text-gray-400"
                                            >
                                                {new Date(
                                                    appt.start_time,
                                                ).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div
                                            class="flex items-center gap-2 mb-1"
                                        >
                                            {#if appt.relationship_to_primary}
                                                <span
                                                    class="text-lg"
                                                    title="Child/Dependent"
                                                >
                                                    👶
                                                </span>
                                            {:else}
                                                <span
                                                    class="text-lg"
                                                    title="Adult"
                                                >
                                                    👤
                                                </span>
                                            {/if}
                                            <p
                                                class="text-base font-bold text-gray-900"
                                            >
                                                {appt.patient_name}
                                            </p>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-2 mb-1"
                                        >
                                            {#if appt.date_of_birth}
                                                {@const birth = new Date(
                                                    appt.date_of_birth,
                                                )}
                                                {@const now = new Date()}
                                                {@const diffMonths =
                                                    (now.getFullYear() -
                                                        birth.getFullYear()) *
                                                        12 +
                                                    now.getMonth() -
                                                    birth.getMonth() -
                                                    (now.getDate() <
                                                    birth.getDate()
                                                        ? 1
                                                        : 0)}
                                                {@const years = Math.floor(
                                                    diffMonths / 12,
                                                )}
                                                {@const months =
                                                    diffMonths % 12}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {years > 0
                                                        ? `${years} ${years === 1 ? "year" : "years"}`
                                                        : ""}
                                                    {years > 0 && months > 0
                                                        ? " "
                                                        : ""}
                                                    {months > 0
                                                        ? `${months} ${months === 1 ? "month" : "months"}`
                                                        : ""}
                                                    {years === 0 && months === 0
                                                        ? "Newborn"
                                                        : ""}
                                                </span>
                                            {/if}
                                            {#if appt.gender}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                                >
                                                    {appt.gender === "male"
                                                        ? "♂️ Male"
                                                        : appt.gender ===
                                                            "female"
                                                          ? "♀️ Female"
                                                          : appt.gender}
                                                </span>
                                            {/if}
                                            {#if appt.notes && appt.notes.includes("Source: Web")}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                                                >
                                                    🌐 Source: Web
                                                </span>
                                            {/if}
                                        </div>
                                        <p
                                            class="text-xs text-gray-500 uppercase tracking-wider font-semibold"
                                        >
                                            {$t(
                                                `assistant.dashboard.appointment.type.${appt.appointment_type}`,
                                            )} •
                                            {#if appt.doctor_name}
                                                {$t(
                                                    "assistant.dashboard.time.dr",
                                                )}
                                                {appt.doctor_name}
                                            {:else}
                                                <span
                                                    class="text-orange-600 font-bold"
                                                    >⚠️ Unassigned</span
                                                >
                                            {/if}
                                        </p>
                                        {#if appt.relationship_to_primary && appt.booked_by_name}
                                            <p
                                                class="text-xs text-gray-500 italic mt-1"
                                            >
                                                Booked by: {appt.booked_by_name}
                                                ({appt.relationship_to_primary})
                                            </p>
                                        {/if}
                                        <div
                                            class="flex flex-wrap items-center gap-2 mt-1"
                                        >
                                            {#if appt.created_by_name}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                                >
                                                    ✏️ Created by: {appt.created_by_name}
                                                </span>
                                            {:else if appt.notes && appt.notes.includes("Source: Web")}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"
                                                >
                                                    🌐 Portal Booking
                                                </span>
                                            {/if}
                                            {#if appt.confirmed_by_name}
                                                <span
                                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800"
                                                >
                                                    ✓ Confirmed by: {appt.confirmed_by_name}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <span
                                            class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
                                            {appt.status === 'confirmed'
                                                ? 'bg-green-100 text-green-800'
                                                : appt.status === 'in_progress'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : appt.status === 'completed'
                                                    ? 'bg-slate-100 text-slate-600'
                                                    : appt.status ===
                                                        'cancelled'
                                                      ? 'bg-red-100 text-red-800'
                                                      : appt.status ===
                                                          'no_show'
                                                        ? 'bg-gray-100 text-gray-700'
                                                        : 'bg-blue-100 text-blue-800'}"
                                        >
                                            {$t(
                                                `assistant.dashboard.appointment.status.${appt.status}`,
                                            )}
                                        </span>
                                        <div class="flex gap-2">
                                            {#if appt.status !== "cancelled" && appt.status !== "no_show"}
                                                {#if !appt.checked_in}
                                                    <button
                                                        onclick={() =>
                                                            openCheckInModal(
                                                                appt,
                                                            )}
                                                        class="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs transition-all flex items-center gap-1"
                                                    >
                                                        ✓ Check-In
                                                    </button>
                                                {:else}
                                                    <span
                                                        class="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-bold text-xs flex items-center gap-1"
                                                    >
                                                        <span
                                                            class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                                                        ></span>
                                                        Arrived
                                                    </span>
                                                {/if}
                                            {/if}
                                            {#if appt.status === "scheduled"}
                                                <form
                                                    method="POST"
                                                    action="?/updateStatus"
                                                    use:enhance
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="appointment_id"
                                                        value={appt.id}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="status"
                                                        value="confirmed"
                                                    />
                                                    <button
                                                        type="submit"
                                                        class="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                        title="Confirm"
                                                        >✓</button
                                                    >
                                                </form>
                                            {/if}
                                            <button
                                                onclick={() =>
                                                    openBookingModal(appt)}
                                                class="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                title="Edit">✎</button
                                            >
                                        </div>
                                    </div>
                                </div>
                            </li>
                        {:else}
                            <li
                                class="px-4 py-12 text-center text-gray-500 italic"
                            >
                                {$t("assistant.dashboard.tabs.schedule.empty")}
                            </li>
                        {/each}
                    </ul>
                {:else if viewMode === "calendar"}
                    <div
                        class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[700px]"
                    >
                        <FullCalendar
                            events={calendarEvents}
                            initialView="timeGridWeek"
                            onEventClick={handleEventClick}
                            onEventDrop={handleEventChange}
                            onEventResize={handleEventChange}
                            onDateClick={handleDateClick}
                            onEventMouseEnter={handleEventMouseEnter}
                            onEventMouseLeave={handleEventMouseLeave}
                            editable={true}
                        />
                    </div>
                {:else if viewMode === "table"}
                    <!-- Table View -->
                    <div
                        class="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                    >
                        <!-- Sticky Filters Header -->
                        <div
                            class="p-4 border-b border-gray-100 bg-gray-50/50 space-y-4 sticky top-0 z-40"
                        >
                            <!-- Bulk Actions Bar -->
                            {#if selectedRows.size > 0}
                                <div
                                    class="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between"
                                >
                                    <span
                                        class="text-sm font-bold text-indigo-900"
                                    >
                                        {selectedRows.size} appointment{selectedRows.size ===
                                        1
                                            ? ""
                                            : "s"} selected
                                    </span>
                                    <div class="flex gap-2">
                                        <form
                                            method="POST"
                                            action="?/bulkUpdateStatus"
                                            use:enhance
                                            class="inline"
                                            id="bulk-confirm-form"
                                        >
                                            <input
                                                type="hidden"
                                                name="appointment_ids"
                                                value={Array.from(
                                                    selectedRows,
                                                ).join(",")}
                                            />
                                            <input
                                                type="hidden"
                                                name="status"
                                                value="confirmed"
                                            />
                                            <button
                                                type="button"
                                                onclick={(e) =>
                                                    showConfirmation(
                                                        e,
                                                        "bulk",
                                                        "confirmed",
                                                        undefined,
                                                        Array.from(
                                                            selectedRows,
                                                        ),
                                                    )}
                                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm transition-colors"
                                            >
                                                Confirm Selected
                                            </button>
                                        </form>
                                        <form
                                            method="POST"
                                            action="?/bulkUpdateStatus"
                                            use:enhance
                                            class="inline"
                                            id="bulk-cancel-form"
                                        >
                                            <input
                                                type="hidden"
                                                name="appointment_ids"
                                                value={Array.from(
                                                    selectedRows,
                                                ).join(",")}
                                            />
                                            <input
                                                type="hidden"
                                                name="status"
                                                value="cancelled"
                                            />
                                            <button
                                                type="button"
                                                onclick={(e) =>
                                                    showConfirmation(
                                                        e,
                                                        "bulk",
                                                        "cancelled",
                                                        undefined,
                                                        Array.from(
                                                            selectedRows,
                                                        ),
                                                    )}
                                                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm transition-colors"
                                            >
                                                Cancel Selected
                                            </button>
                                        </form>
                                        <button
                                            onclick={() =>
                                                (selectedRows = new Set())}
                                            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold text-sm transition-colors"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>
                            {/if}

                            <!-- Column Filters -->
                            <div
                                class="p-4 bg-gray-50 rounded-lg border border-gray-200"
                            >
                                <div
                                    class="flex items-center justify-between mb-2"
                                >
                                    <h4 class="text-sm font-bold text-gray-700">
                                        Column Filters
                                    </h4>
                                    <button
                                        onclick={clearFilters}
                                        class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div
                                    class="grid grid-cols-2 md:grid-cols-5 gap-2"
                                >
                                    <input
                                        type="text"
                                        placeholder="Filter Patient..."
                                        bind:value={columnFilters.patient}
                                        class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Filter Doctor..."
                                        bind:value={columnFilters.doctor}
                                        class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <select
                                        bind:value={columnFilters.status}
                                        class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value=""
                                            >Tous les Statuts</option
                                        >
                                        <option value="scheduled"
                                            >{$t(
                                                "assistant.dashboard.appointment.status.scheduled",
                                            )}</option
                                        >
                                        <option value="confirmed"
                                            >{$t(
                                                "assistant.dashboard.appointment.status.confirmed",
                                            )}</option
                                        >
                                        <option value="arrived"
                                            >{$t(
                                                "assistant.dashboard.appointment.status.arrived",
                                            )}</option
                                        >
                                        <option value="in_progress"
                                            >{$t(
                                                "assistant.dashboard.appointment.status.in_progress",
                                            )}</option
                                        >
                                        <option value="completed"
                                            >{$t(
                                                "assistant.dashboard.appointment.status.completed",
                                            )}</option
                                        >
                                        <option value="cancelled"
                                            >{$t(
                                                "assistant.dashboard.appointment.status.cancelled",
                                            )}</option
                                        >
                                        <option value="no_show"
                                            >{$t(
                                                "assistant.dashboard.appointment.status.no_show",
                                            )}</option
                                        >
                                    </select>
                                    <select
                                        bind:value={columnFilters.type}
                                        class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Tous les Types</option>
                                        <option value="consultation"
                                            >{$t(
                                                "assistant.dashboard.appointment.type.consultation",
                                            )}</option
                                        >
                                        <option value="checkup"
                                            >{$t(
                                                "assistant.dashboard.appointment.type.checkup",
                                            )}</option
                                        >
                                        <option value="cleaning"
                                            >{$t(
                                                "assistant.dashboard.appointment.type.cleaning",
                                            )}</option
                                        >
                                        <option value="emergency"
                                            >{$t(
                                                "assistant.dashboard.appointment.type.emergency",
                                            )}</option
                                        >
                                        <option value="root_canal"
                                            >{$t(
                                                "assistant.dashboard.appointment.type.root_canal",
                                            )}</option
                                        >
                                        <option value="cosmetic"
                                            >{$t(
                                                "assistant.dashboard.appointment.type.cosmetic",
                                            )}</option
                                        >
                                    </select>
                                    <input
                                        type="date"
                                        bind:value={columnFilters.date}
                                        class="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Table Inner Scroll Area -->
                        <div
                            class="overflow-auto max-h-[calc(100vh-420px)] relative"
                        >
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead
                                    class="bg-gray-50 sticky top-0 z-40 shadow-sm"
                                >
                                    <tr>
                                        <th
                                            scope="col"
                                            class="px-4 py-3 text-left"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.size ===
                                                    tableAppointments.length &&
                                                    tableAppointments.length >
                                                        0}
                                                onchange={toggleSelectAll}
                                                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onclick={() => toggleSort("date")}
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                Date
                                                {#if tableSortColumn === "date"}
                                                    {tableSortDirection ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                {/if}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onclick={() => toggleSort("time")}
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                Time
                                                {#if tableSortColumn === "time"}
                                                    {tableSortDirection ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                {/if}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        >
                                            Praticien
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onclick={() =>
                                                toggleSort("patient")}
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                Patient
                                                {#if tableSortColumn === "patient"}
                                                    {tableSortDirection ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                {/if}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onclick={() => toggleSort("doctor")}
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                Doctor
                                                {#if tableSortColumn === "doctor"}
                                                    {tableSortDirection ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                {/if}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onclick={() => toggleSort("type")}
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                Type
                                                {#if tableSortColumn === "type"}
                                                    {tableSortDirection ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                {/if}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onclick={() => toggleSort("status")}
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                Status
                                                {#if tableSortColumn === "status"}
                                                    {tableSortDirection ===
                                                    "asc"
                                                        ? "↑"
                                                        : "↓"}
                                                {/if}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider"
                                        >
                                            Notes
                                        </th>
                                        <th
                                            scope="col"
                                            class="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-50 z-30 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)]"
                                        >
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody
                                    class="bg-white divide-y divide-gray-200"
                                >
                                    {#each tableAppointments as appt}
                                        <tr
                                            class="group hover:bg-slate-50 {selectedRows.has(
                                                appt.id,
                                            )
                                                ? 'bg-indigo-50'
                                                : 'bg-white'} cursor-pointer transition-colors"
                                            ondblclick={() =>
                                                openBookingModal(appt)}
                                            title="Double-click to edit appointment"
                                        >
                                            <td
                                                class="px-3 py-2 whitespace-nowrap"
                                                onclick={(e) =>
                                                    e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.has(
                                                        appt.id,
                                                    )}
                                                    onchange={() =>
                                                        toggleRowSelection(
                                                            appt.id,
                                                        )}
                                                    ondblclick={(e) =>
                                                        e.stopPropagation()}
                                                    class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                                />
                                            </td>
                                            <td
                                                class="px-3 py-2 whitespace-nowrap text-xs text-gray-900"
                                            >
                                                {new Date(
                                                    appt.start_time,
                                                ).toLocaleDateString()}
                                            </td>
                                            <td
                                                class="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium"
                                            >
                                                {new Date(
                                                    appt.start_time,
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>
                                            <td
                                                class="px-3 py-2 whitespace-nowrap"
                                            >
                                                <div
                                                    class="flex items-center gap-1.5"
                                                >
                                                    <span
                                                        class="w-2 h-2 rounded-full"
                                                        style="background-color: {appt.doctor_color ||
                                                            '#6366f1'}"
                                                    ></span>
                                                    <span
                                                        class="text-[10px] font-bold text-gray-700 capitalize"
                                                        >{appt.doctor_name ||
                                                            "N/A"}</span
                                                    >
                                                </div>
                                            </td>
                                            <td
                                                class="px-3 py-2 text-xs text-gray-900"
                                            >
                                                <div
                                                    class="flex items-center gap-2"
                                                >
                                                    {#if appt.relationship_to_primary}
                                                        <span
                                                            title="Child/Dependent"
                                                            >👶</span
                                                        >
                                                    {:else}
                                                        <span title="Adult"
                                                            >👤</span
                                                        >
                                                    {/if}
                                                    <span
                                                        class="font-bold max-w-[120px] truncate block"
                                                        title={appt.patient_name}
                                                        >{appt.patient_name}</span
                                                    >
                                                    {#if appt.gender === "Male"}
                                                        <span
                                                            class="text-blue-500 text-xs"
                                                            title={$t(
                                                                "patients.male",
                                                            )}>♂️</span
                                                        >
                                                    {:else if appt.gender === "Female"}
                                                        <span
                                                            class="text-pink-500 text-xs"
                                                            title={$t(
                                                                "patients.female",
                                                            )}>♀️</span
                                                        >
                                                    {:else if appt.gender === "Other"}
                                                        <span
                                                            class="text-purple-500 text-xs"
                                                            title={$t(
                                                                "patients.other",
                                                            )}>⚧️</span
                                                        >
                                                    {/if}
                                                </div>
                                                {#if appt.date_of_birth}
                                                    {@const birth = new Date(
                                                        appt.date_of_birth,
                                                    )}
                                                    {@const now = new Date()}
                                                    {@const diffMonths =
                                                        (now.getFullYear() -
                                                            birth.getFullYear()) *
                                                            12 +
                                                        now.getMonth() -
                                                        birth.getMonth() -
                                                        (now.getDate() <
                                                        birth.getDate()
                                                            ? 1
                                                            : 0)}
                                                    {@const years = Math.floor(
                                                        diffMonths / 12,
                                                    )}
                                                    {@const months =
                                                        diffMonths % 12}
                                                    <span
                                                        class="text-xs text-gray-500"
                                                        >({years > 0
                                                            ? `${years} ${years === 1 ? "year" : "years"}`
                                                            : ""}{years > 0 &&
                                                        months > 0
                                                            ? " "
                                                            : ""}{months > 0
                                                            ? `${months} ${months === 1 ? "month" : "months"}`
                                                            : ""}{years === 0 &&
                                                        months === 0
                                                            ? "Newborn"
                                                            : ""})</span
                                                    >
                                                {/if}
                                            </td>
                                            <td
                                                class="px-3 py-2 whitespace-nowrap text-xs text-gray-700"
                                            >
                                                <span
                                                    class="max-w-[100px] truncate block"
                                                    title={appt.doctor_name ||
                                                        ""}
                                                >
                                                    {appt.doctor_name || "N/A"}
                                                </span>
                                            </td>
                                            <td
                                                class="px-3 py-2 whitespace-nowrap text-xs text-gray-600"
                                            >
                                                {$t(
                                                    `assistant.dashboard.appointment.type.${appt.appointment_type}`,
                                                )}
                                            </td>
                                            <td
                                                class="px-3 py-2 whitespace-nowrap"
                                            >
                                                <span
                                                    class="px-1.5 py-0.5 text-[10px] font-bold rounded-full uppercase
                                                {appt.status === 'confirmed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : appt.status ===
                                                            'in_progress'
                                                          ? 'bg-amber-100 text-amber-800'
                                                          : appt.status ===
                                                              'completed'
                                                            ? 'bg-slate-100 text-slate-600'
                                                            : appt.status ===
                                                                'cancelled'
                                                              ? 'bg-red-100 text-red-800'
                                                              : appt.status ===
                                                                  'no_show'
                                                                ? 'bg-gray-100 text-gray-700'
                                                                : 'bg-blue-100 text-blue-800'}"
                                                >
                                                    {$t(
                                                        `assistant.dashboard.appointment.status.${appt.status}`,
                                                    )}
                                                </span>
                                            </td>
                                            <td
                                                class="px-3 py-2 text-xs text-gray-500 max-w-[120px] truncate italic"
                                                title={appt.notes || ""}
                                            >
                                                {appt.notes || "-"}
                                            </td>
                                            <td
                                                class="px-3 py-2 whitespace-nowrap text-xs font-medium sticky right-0 z-20 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50 transition-colors {selectedRows.has(
                                                    appt.id,
                                                )
                                                    ? 'bg-indigo-50'
                                                    : 'bg-white'}"
                                                onclick={(e) =>
                                                    e.stopPropagation()}
                                            >
                                                <div
                                                    class="flex items-center gap-2"
                                                >
                                                    {#if appt.status !== "cancelled" && appt.status !== "no_show"}
                                                        {#if !appt.checked_in}
                                                            <button
                                                                onclick={() =>
                                                                    openCheckInModal(
                                                                        appt,
                                                                    )}
                                                                class="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors text-lg border border-blue-100 flex items-center justify-center min-w-[32px]"
                                                                title="Enregistrer l'arrivée (Check-in)"
                                                            >
                                                                📥
                                                            </button>
                                                        {:else}
                                                            <span
                                                                class="px-2 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-[10px] flex items-center gap-1"
                                                                title="Arrived"
                                                            >
                                                                <span
                                                                    class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"
                                                                ></span>
                                                                ARR
                                                            </span>
                                                        {/if}
                                                    {/if}
                                                    {#if appt.status === "scheduled"}
                                                        <form
                                                            method="POST"
                                                            action="?/updateStatus"
                                                            use:enhance
                                                            class="inline"
                                                        >
                                                            <input
                                                                type="hidden"
                                                                name="appointment_id"
                                                                value={appt.id}
                                                            />
                                                            <input
                                                                type="hidden"
                                                                name="status"
                                                                value="confirmed"
                                                            />
                                                            <button
                                                                type="button"
                                                                onclick={(e) =>
                                                                    showConfirmation(
                                                                        e,
                                                                        "single",
                                                                        "confirmed",
                                                                        appt.id,
                                                                    )}
                                                                class="p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-md transition-colors text-lg border border-green-100 flex items-center justify-center min-w-[32px]"
                                                                title="Confirmer le rendez-vous"
                                                                ondblclick={(
                                                                    e,
                                                                ) =>
                                                                    e.stopPropagation()}
                                                            >
                                                                ✅
                                                            </button>
                                                        </form>
                                                    {/if}
                                                    <button
                                                        onclick={() =>
                                                            openBookingModal(
                                                                appt,
                                                            )}
                                                        class="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors text-lg border border-indigo-100 flex items-center justify-center min-w-[32px]"
                                                        title="Modifier le rendez-vous"
                                                        ondblclick={(e) =>
                                                            e.stopPropagation()}
                                                    >
                                                        📝
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    {:else}
                                        <tr>
                                            <td
                                                colspan="9"
                                                class="px-4 py-12 text-center text-gray-500 italic"
                                            >
                                                {$t(
                                                    "assistant.dashboard.tabs.schedule.empty",
                                                )}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- PATIENTS TAB -->
    {#if activeTab === "patients"}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div
                class="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-gray-50/50"
            >
                <h3 class="text-lg font-bold text-gray-900">
                    {$t("assistant.dashboard.tabs.patients.header")}
                </h3>
            </div>
            <div class="p-6">
                <!-- Stats Section -->
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
                >
                    <div
                        class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between"
                    >
                        <div>
                            <p
                                class="text-xs text-gray-500 font-bold uppercase tracking-wider"
                            >
                                {$t(
                                    "assistant.dashboard.tabs.patients.totalPatients",
                                ) || "Total Patients"}
                            </p>
                            <p class="text-2xl font-bold text-indigo-900 mt-1">
                                {patients.length}
                            </p>
                        </div>
                        <div
                            class="bg-indigo-50 p-3 rounded-lg text-indigo-600 font-bold text-xl"
                        >
                            👥
                        </div>
                    </div>
                </div>

                <div class="relative mb-6">
                    <span
                        class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400"
                        >🔍</span
                    >
                    <input
                        type="text"
                        bind:value={searchPatientQuery}
                        placeholder={$t(
                            "assistant.dashboard.tabs.patients.searchPlaceholder",
                        )}
                        class="w-full pl-10 border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <!-- Quick Filters -->
                <div class="flex flex-wrap items-center gap-2 mb-6">
                    <button
                        onclick={() => applyPatientFilter("")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {!patientFilter
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        Tous
                    </button>
                    <button
                        onclick={() => applyPatientFilter("child")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {patientFilter ===
                        'child'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        Enfants
                    </button>
                    <button
                        onclick={() => applyPatientFilter("adult")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {patientFilter ===
                        'adult'
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        Adultes
                    </button>
                    <button
                        onclick={() => applyPatientFilter("debt")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {patientFilter ===
                        'debt'
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        En Dette
                    </button>
                    <button
                        onclick={() => applyPatientFilter("credit")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {patientFilter ===
                        'credit'
                            ? 'bg-green-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        Créditeur
                    </button>
                    <button
                        onclick={() => applyPatientFilter("upcoming")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {patientFilter ===
                        'upcoming'
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        Futurs RDV
                    </button>
                    <button
                        onclick={() => applyPatientFilter("male")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {patientFilter ===
                        'male'
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        Hommes
                    </button>
                    <button
                        onclick={() => applyPatientFilter("female")}
                        class="px-3 py-1.5 rounded-full text-[10px] font-bold transition-all {patientFilter ===
                        'female'
                            ? 'bg-pink-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
                    >
                        Femmes
                    </button>
                </div>
                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 h-[600px] overflow-y-auto pr-2"
                >
                    {#each getFilteredPatients() as patient}
                        <div
                            class="p-4 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group bg-white"
                        >
                            <p
                                class="font-bold text-gray-900 group-hover:text-indigo-600 flex justify-between items-center"
                            >
                                <span class="flex items-center gap-2">
                                    {#if patient.gender === "Male"}
                                        <span
                                            class="text-blue-500 text-xs"
                                            title={$t("patients.male")}>♂️</span
                                        >
                                    {:else if patient.gender === "Female"}
                                        <span
                                            class="text-pink-500 text-xs"
                                            title={$t("patients.female")}
                                            >♀️</span
                                        >
                                    {:else if patient.gender === "Other"}
                                        <span
                                            class="text-purple-500 text-xs"
                                            title={$t("patients.other")}
                                            >⚧️</span
                                        >
                                    {/if}
                                    {patient.full_name}
                                </span>
                                <span class="text-[10px] text-gray-300"
                                    >#{$t(
                                        "assistant.dashboard.tabs.patients.patientId",
                                    )}{patient.id}</span
                                >
                            </p>
                            <div class="mt-3 space-y-1">
                                <p
                                    class="text-sm text-gray-600 flex items-center gap-2"
                                >
                                    <span class="opacity-50">📞</span>
                                    {patient.phone || "-"}
                                </p>
                                <p
                                    class="text-sm text-gray-600 flex items-center justify-between"
                                >
                                    <span class="flex items-center gap-2">
                                        <span class="opacity-50">🎂</span>
                                        {patient.date_of_birth}
                                    </span>
                                    {#if patient.date_of_birth}
                                        <span
                                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter {(patient.is_child ??
                                            Number(
                                                calculateAge(
                                                    patient.date_of_birth,
                                                ),
                                            ) < 16)
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-emerald-100 text-emerald-700'}"
                                        >
                                            {(patient.is_child ??
                                            Number(
                                                calculateAge(
                                                    patient.date_of_birth,
                                                ),
                                            ) < 16)
                                                ? $t("patient_details.child")
                                                : $t("patient_details.adult")}
                                        </span>
                                    {/if}
                                </p>

                                <!-- Financial & Appointment Indicators -->
                                <div
                                    class="flex flex-wrap items-center gap-2 pt-1 pb-1"
                                >
                                    {#if patient.net_balance !== undefined && patient.net_balance !== 0}
                                        <span
                                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold {patient.net_balance <
                                            0
                                                ? 'bg-red-50 text-red-700'
                                                : 'bg-green-50 text-green-700'}"
                                        >
                                            {patient.net_balance < 0
                                                ? "−"
                                                : "+"}
                                            {formatCurrency(
                                                patient.net_balance,
                                            )}
                                        </span>
                                    {/if}

                                    {#if patient.next_appointment}
                                        <div
                                            class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                                        >
                                            <span class="text-[8px]">📅</span>
                                            <span
                                                class="text-[8px] font-bold whitespace-nowrap"
                                                >{formatRelativeDate(
                                                    patient.next_appointment,
                                                )}</span
                                            >
                                        </div>
                                    {/if}
                                </div>
                            </div>
                            <button
                                onclick={() =>
                                    openBookingModal(
                                        null,
                                        new Date().toISOString().split("T")[0] +
                                            "T09:00",
                                    )}
                                class="mt-4 w-full py-2 bg-gray-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                                {$t(
                                    "assistant.dashboard.tabs.patients.scheduleVisit",
                                )}
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    <!-- PAYMENTS TAB -->
    {#if activeTab === "payments"}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900">
                    {$t("assistant.dashboard.tabs.payments.header")}
                </h3>
                <p class="text-xs text-gray-500 font-medium">
                    {$t("assistant.dashboard.tabs.payments.description")}
                </p>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-100">
                    <thead class="bg-gray-50/50">
                        <tr>
                            <th
                                class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                >{$t("common.patient")}</th
                            >
                            <th
                                class="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                >{$t(
                                    "assistant.dashboard.tabs.payments.balanceDue",
                                )}</th
                            >
                            <th
                                class="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                >{$t("common.actions")}</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.pendingPayments as p: any}
                            <tr class="hover:bg-gray-50/50">
                                <td class="px-6 py-4">
                                    <p class="text-sm font-bold text-gray-900">
                                        {p.full_name}
                                    </p>
                                    <p class="text-xs text-gray-500">
                                        {p.phone}
                                    </p>
                                </td>
                                <td class="px-6 py-4">
                                    <span
                                        class="text-sm font-black text-red-600"
                                        >{APP_CONFIG.currencySymbol}{p.balance_due.toFixed(
                                            2,
                                        )}</span
                                    >
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button
                                        onclick={() => openPaymentModal(p)}
                                        class="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                        {$t(
                                            "assistant.dashboard.tabs.payments.collectPayment",
                                        )}
                                    </button>
                                </td>
                            </tr>
                        {:else}
                            <tr>
                                <td
                                    colspan="3"
                                    class="px-6 py-12 text-center text-gray-400 italic"
                                    >{$t(
                                        "assistant.dashboard.tabs.payments.empty",
                                    )}</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}

    <!-- WAITING ROOM TAB -->
    {#if activeTab === "waiting_room"}
        <div class="bg-white shadow rounded-xl overflow-hidden">
            <div
                class="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center"
            >
                <div>
                    <h3 class="text-lg font-bold text-gray-900">
                        {$t("assistant.dashboard.tabs.waiting_room.header")}
                    </h3>
                    <p class="text-xs text-gray-500 font-medium">
                        Patients physically present and waiting for their
                        appointment.
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <span
                        class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest"
                    >
                        {data.appointments.filter(
                            (a: any) =>
                                a.waiting_room_status === "waiting" &&
                                new Date(a.start_time).toDateString() ===
                                    new Date().toDateString(),
                        ).length} Patients
                    </span>
                </div>
            </div>
            <div class="p-6">
                {#if data.appointments.filter((a: any) => a.waiting_room_status === "waiting" && new Date(a.start_time).toDateString() === new Date().toDateString()).length === 0}
                    <div class="py-12 text-center">
                        <div class="text-6xl mb-4">🏥</div>
                        <h3 class="text-gray-500 italic">
                            {$t("assistant.dashboard.tabs.waiting_room.empty")}
                        </h3>
                    </div>
                {:else}
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {#each data.appointments.filter((a: any) => a.waiting_room_status === "waiting" && new Date(a.start_time).toDateString() === new Date().toDateString()) as appt}
                            <div
                                class="p-4 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all bg-white relative overflow-hidden"
                            >
                                <div class="absolute top-0 right-0 p-2">
                                    <span
                                        class="w-3 h-3 bg-green-500 rounded-full animate-pulse inline-block"
                                    ></span>
                                </div>
                                <div class="flex items-start gap-3 mb-3">
                                    <div
                                        class="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold"
                                    >
                                        {appt.patient_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 class="font-bold text-gray-900">
                                            {appt.patient_name}
                                        </h4>
                                        <p class="text-xs text-gray-500">
                                            {appt.appointment_type.replace(
                                                "_",
                                                " ",
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    class="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between"
                                >
                                    <span
                                        class="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                                        >Praticien</span
                                    >
                                    <div
                                        class="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-full"
                                    >
                                        <span
                                            class="w-2 h-2 rounded-full"
                                            style="background-color: {appt.doctor_color ||
                                                '#6366f1'}"
                                        ></span>
                                        <span
                                            class="text-[10px] font-bold text-gray-700"
                                            >{appt.doctor_name}</span
                                        >
                                    </div>
                                </div>

                                <div class="space-y-2 mb-4">
                                    <div
                                        class="flex items-center justify-between text-xs"
                                    >
                                        <span class="text-gray-400"
                                            >Scheduled:</span
                                        >
                                        <span class="font-bold text-indigo-600"
                                            >{new Date(
                                                appt.start_time,
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}</span
                                        >
                                    </div>
                                    <div
                                        class="flex items-center justify-between text-xs"
                                    >
                                        <span class="text-gray-400"
                                            >Arrived:</span
                                        >
                                        <span class="font-bold text-green-600"
                                            >{new Date(
                                                appt.check_in_time,
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}</span
                                        >
                                    </div>
                                </div>

                                <div
                                    class="p-2 bg-gray-50 rounded-lg text-[10px] text-gray-600 italic mb-4"
                                >
                                    {appt.notes?.split("[Check-in]")[1] ||
                                        "No arrival notes"}
                                </div>

                                <div class="flex gap-2">
                                    <button
                                        onclick={() => openBookingModal(appt)}
                                        class="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                                    >
                                        👁️ View Details
                                    </button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- MODALS -->

    <!-- Modal: Booking / Edit -->
    {#if isBookingModalOpen}
        <div
            class="relative z-50 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={closeModal}
            ></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl"
                    >
                        <form
                            method="POST"
                            action={selectedAppointment?.id
                                ? "?/updateAppointment"
                                : "?/createAppointment"}
                            use:enhance={() => {
                                errorMessage = "";
                                return async ({
                                    result,
                                    update,
                                }: {
                                    result: any;
                                    update: any;
                                }) => {
                                    if (result.type === "success") {
                                        const resultData = result.data as any;

                                        // Time Detection for Imminent Check-in
                                        const appt = resultData.appointment;
                                        if (appt) {
                                            const apptDate = new Date(
                                                appt.start_time,
                                            );
                                            const diffMins =
                                                (apptDate.getTime() -
                                                    new Date().getTime()) /
                                                60000;

                                            // If appointment is between -30 mins (late) and +60 mins (early)
                                            if (
                                                diffMins > -30 &&
                                                diffMins < 60
                                            ) {
                                                const patientName =
                                                    selectedPatient?.full_name ||
                                                    (
                                                        document.querySelector(
                                                            'input[name="new_patient_name"]',
                                                        ) as HTMLInputElement
                                                    )?.value ||
                                                    "le patient";

                                                imminentAppointment = {
                                                    ...appt,
                                                    patientName,
                                                };
                                                isImminentModalOpen = true;
                                            }
                                        }

                                        if (
                                            resultData.action === "schedule_new"
                                        ) {
                                            // Reset form for new appointment
                                            resetAppointmentForm();
                                            // Keep modal open for next appointment
                                            errorMessage = "";
                                        } else {
                                            // Close modal for normal schedule & close action
                                            closeModal();
                                        }

                                        // Force reload if in calendar view to ensure fresh data and view persistence
                                        if (viewMode === "calendar") {
                                            window.location.href =
                                                "?view=calendar";
                                            return;
                                        }
                                    } else if (result.type === "failure") {
                                        errorMessage =
                                            (result.data as any)?.error ||
                                            "Error occurred";
                                    }
                                    await update();
                                };
                            }}
                        >
                            {#if selectedAppointment?.id}
                                <input
                                    type="hidden"
                                    name="id"
                                    value={selectedAppointment.id}
                                />
                            {/if}
                            <div class="bg-white px-6 pt-6 pb-6">
                                <h3
                                    class="text-xl font-black text-gray-900 mb-6 border-b pb-4 flex items-center gap-2"
                                >
                                    <span
                                        class="w-2 h-8 bg-indigo-600 rounded-full"
                                    ></span>
                                    {selectedAppointment?.id
                                        ? $t(
                                              "assistant.dashboard.appointment.modals.edit",
                                          )
                                        : $t(
                                              "assistant.dashboard.appointment.modals.new",
                                          )}
                                </h3>

                                {#if errorMessage}
                                    <div
                                        class="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium"
                                    >
                                        {errorMessage}
                                    </div>
                                {/if}

                                <div class="space-y-5">
                                    <!-- Patient Selection/Search -->
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.patient",
                                            )}</label
                                        >

                                        {#if selectedPatient || isNewPatient}
                                            <!-- Selected Patient Display -->
                                            <div
                                                class="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl"
                                            >
                                                <div
                                                    class="flex items-center gap-3"
                                                >
                                                    {#if isNewPatient}
                                                        <div
                                                            class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
                                                        >
                                                            <span
                                                                class="text-green-600 text-sm font-bold"
                                                                >+</span
                                                            >
                                                        </div>
                                                        <span
                                                            class="text-sm font-semibold text-green-800"
                                                            >{$t(
                                                                "assistant.dashboard.appointment.newPatient.title",
                                                            )}</span
                                                        >
                                                    {:else}
                                                        <div
                                                            class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"
                                                        >
                                                            <span
                                                                class="text-blue-600 text-sm"
                                                                >👤</span
                                                            >
                                                        </div>
                                                        <div>
                                                            <p
                                                                class="text-sm font-semibold text-gray-900"
                                                            >
                                                                {selectedPatient.full_name}
                                                            </p>
                                                            <p
                                                                class="text-xs text-gray-600"
                                                            >
                                                                {selectedPatient.phone ||
                                                                    "Pas de téléphone"}
                                                                •
                                                                {selectedPatient.date_of_birth
                                                                    ? new Date(
                                                                          selectedPatient.date_of_birth,
                                                                      ).toLocaleDateString(
                                                                          "fr-FR",
                                                                      )
                                                                    : "Pas de date"}
                                                            </p>
                                                            {#if selectedPatient.parent_name}
                                                                <p
                                                                    class="text-xs text-indigo-600 mt-0.5 flex items-center gap-1"
                                                                >
                                                                    <span
                                                                        >👪</span
                                                                    >
                                                                    Parent: {selectedPatient.parent_name}
                                                                    ({selectedPatient.parent_phone ||
                                                                        "Pas de téléphone"})
                                                                </p>
                                                            {/if}
                                                        </div>
                                                    {/if}
                                                </div>
                                                <div class="flex gap-2">
                                                    {#if !isNewPatient && selectedPatient}
                                                        <button
                                                            type="button"
                                                            onclick={() =>
                                                                generatePatientCard(
                                                                    selectedPatient.id,
                                                                )}
                                                            class="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                                            title={$t(
                                                                "assistant.dashboard.appointment.newPatient.generateCard",
                                                            )}
                                                        >
                                                            📄
                                                        </button>
                                                    {/if}
                                                    <button
                                                        type="button"
                                                        onclick={() => {
                                                            selectedPatient =
                                                                null;
                                                            isNewPatient = false;
                                                        }}
                                                        class="px-3 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        {:else}
                                            <!-- Patient Search -->
                                            <div class="space-y-2">
                                                <div class="relative">
                                                    <input
                                                        type="text"
                                                        placeholder={$t(
                                                            "assistant.dashboard.appointment.newPatient.searchPlaceholder",
                                                        )}
                                                        bind:value={
                                                            patientSearchQuery
                                                        }
                                                        class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 pl-4 pr-10 text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    <div
                                                        class="absolute inset-y-0 right-0 flex items-center pr-3"
                                                    >
                                                        <span
                                                            class="text-gray-400 text-sm"
                                                            >🔍</span
                                                        >
                                                    </div>
                                                </div>

                                                {#if patientSearchQuery}
                                                    <!-- Search Results -->
                                                    <div
                                                        class="max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white shadow-sm"
                                                    >
                                                        {#each data.patients.slice(0, 10) as patient}
                                                            <button
                                                                type="button"
                                                                onclick={() =>
                                                                    selectPatient(
                                                                        patient,
                                                                    )}
                                                                class="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                            >
                                                                <div
                                                                    class="flex items-center justify-between"
                                                                >
                                                                    <div>
                                                                        <p
                                                                            class="text-sm font-semibold text-gray-900"
                                                                        >
                                                                            {patient.full_name}
                                                                        </p>
                                                                        <p
                                                                            class="text-xs text-gray-600"
                                                                        >
                                                                            {patient.phone ||
                                                                                "Pas de téléphone"}
                                                                            •
                                                                            {patient.date_of_birth
                                                                                ? new Date(
                                                                                      patient.date_of_birth,
                                                                                  ).toLocaleDateString(
                                                                                      "fr-FR",
                                                                                  )
                                                                                : "Pas de date"}
                                                                        </p>
                                                                        {#if patient.parent_name}
                                                                            <p
                                                                                class="text-xs text-indigo-600 mt-0.5 flex items-center gap-1"
                                                                            >
                                                                                <span
                                                                                    >👪</span
                                                                                >
                                                                                Parent:
                                                                                {patient.parent_name}
                                                                                ({patient.parent_phone ||
                                                                                    "Pas de téléphone"})
                                                                            </p>
                                                                        {/if}
                                                                    </div>
                                                                    <span
                                                                        class="text-xs text-gray-400"
                                                                        >→</span
                                                                    >
                                                                </div>
                                                            </button>
                                                        {/each}

                                                        {#if data.patients.filter((p) => p.full_name
                                                                    .toLowerCase()
                                                                    .includes(patientSearchQuery.toLowerCase()) || (p.phone && p.phone.includes(patientSearchQuery)) || (p.date_of_birth && new Date(p.date_of_birth)
                                                                        .toLocaleDateString("fr-FR")
                                                                        .includes(patientSearchQuery))).length === 0}
                                                            <div
                                                                class="px-4 py-3 text-center text-gray-500 text-sm"
                                                            >
                                                                {$t(
                                                                    "assistant.dashboard.appointment.newPatient.noResults",
                                                                )}
                                                            </div>
                                                        {/if}
                                                    </div>
                                                {/if}

                                                <!-- Create New Patient Button -->
                                                <button
                                                    type="button"
                                                    onclick={createNewPatient}
                                                    class="w-full px-4 py-3 text-left bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors flex items-center gap-3"
                                                >
                                                    <div
                                                        class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
                                                    >
                                                        <span
                                                            class="text-green-600 text-sm font-bold"
                                                            >+</span
                                                        >
                                                    </div>
                                                    <span
                                                        class="text-sm font-semibold text-green-800"
                                                        >{$t(
                                                            "assistant.dashboard.appointment.newPatient.createNew",
                                                        )}</span
                                                    >
                                                </button>
                                            </div>
                                        {/if}

                                        <!-- Hidden patient_id field for existing patients -->
                                        {#if selectedPatient && !isNewPatient}
                                            <input
                                                type="hidden"
                                                name="patient_id"
                                                value={selectedPatient.id}
                                            />
                                        {/if}
                                    </div>

                                    <!-- New Patient Form Fields -->
                                    {#if isNewPatient}
                                        <div
                                            class="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4"
                                        >
                                            <h4
                                                class="text-sm font-bold text-green-800 flex items-center gap-2"
                                            >
                                                <span class="text-green-600"
                                                    >👤</span
                                                >
                                                {$t(
                                                    "assistant.dashboard.appointment.newPatient.title",
                                                )}
                                            </h4>

                                            <div class="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label
                                                        class="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1"
                                                        >{$t(
                                                            "assistant.dashboard.appointment.newPatient.fullName",
                                                        )} *</label
                                                    >
                                                    <input
                                                        type="text"
                                                        name="new_patient_name"
                                                        required
                                                        class="w-full rounded-lg border-gray-200 bg-white py-2 px-3 text-sm font-medium focus:ring-green-500 focus:border-green-500"
                                                        placeholder="ex: Dupont Jean"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        class="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1"
                                                        >{$t(
                                                            "assistant.dashboard.appointment.newPatient.phone",
                                                        )} *</label
                                                    >
                                                    <input
                                                        type="tel"
                                                        name="new_patient_phone"
                                                        required
                                                        class="w-full rounded-lg border-gray-200 bg-white py-2 px-3 text-sm font-medium focus:ring-green-500 focus:border-green-500"
                                                        placeholder="06XXXXXXXX"
                                                    />
                                                </div>
                                            </div>

                                            <div class="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label
                                                        class="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1"
                                                        >{$t(
                                                            "assistant.dashboard.appointment.newPatient.dob",
                                                        )} *</label
                                                    >
                                                    <input
                                                        type="date"
                                                        name="new_patient_dob"
                                                        required
                                                        max={new Date()
                                                            .toISOString()
                                                            .split("T")[0]}
                                                        class="w-full rounded-lg border-gray-200 bg-white py-2 px-3 text-sm font-medium focus:ring-green-500 focus:border-green-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        class="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1"
                                                        >{$t(
                                                            "assistant.dashboard.appointment.newPatient.email",
                                                        )}</label
                                                    >
                                                    <input
                                                        type="email"
                                                        name="new_patient_email"
                                                        class="w-full rounded-lg border-gray-200 bg-white py-2 px-3 text-sm font-medium focus:ring-green-500 focus:border-green-500"
                                                        placeholder="email@exemple.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    {/if}

                                    <div class="grid grid-cols-2 gap-4">
                                        <div>
                                            <label
                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "assistant.dashboard.appointment.fields.doctor",
                                                )}</label
                                            >
                                            <select
                                                name="doctor_id"
                                                required
                                                class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                                bind:value={modalDoctorId}
                                            >
                                                <option value=""
                                                    >-- Sélectionner un médecin
                                                    --</option
                                                >
                                                {#each data.doctors as doctor}
                                                    <option
                                                        value={doctor.id.toString()}
                                                        >{$t(
                                                            "assistant.dashboard.time.dr",
                                                        )}
                                                        {doctor.full_name}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                        <div>
                                            <label
                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "assistant.dashboard.appointment.fields.type",
                                                )}</label
                                            >
                                            <select
                                                name="appointment_type"
                                                required
                                                class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                                value={selectedAppointment?.appointment_type ||
                                                    "consultation"}
                                            >
                                                <option value="consultation"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.type.consultation",
                                                    )}</option
                                                >
                                                <option value="checkup"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.type.checkup",
                                                    )}</option
                                                >
                                                <option value="cleaning"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.type.cleaning",
                                                    )}</option
                                                >
                                                <option value="emergency"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.type.emergency",
                                                    )}</option
                                                >
                                            </select>
                                        </div>
                                    </div>

                                    <!-- Visual Slot Picker -->
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.startTime",
                                            )}</label
                                        >
                                        {#if modalDoctorId}
                                            <SlotPicker
                                                doctorId={modalDoctorId}
                                                bind:selectedDate={
                                                    slotPickerDate
                                                }
                                                bind:selectedTime={
                                                    slotPickerTime
                                                }
                                                compact={true}
                                            />
                                            <input
                                                type="hidden"
                                                name="start_time"
                                                value={slotPickerTime}
                                                required
                                            />
                                        {:else}
                                            <div
                                                class="bg-amber-50 border-2 border-amber-100 rounded-xl p-4 text-center"
                                            >
                                                <p
                                                    class="text-amber-700 text-sm font-bold"
                                                >
                                                    👆 Veuillez d'abord
                                                    sélectionner un médecin.
                                                </p>
                                            </div>
                                        {/if}
                                    </div>

                                    <div class="grid grid-cols-1 gap-4">
                                        <div>
                                            <label
                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "assistant.dashboard.appointment.fields.duration",
                                                )}</label
                                            >
                                            <select
                                                name="duration_minutes"
                                                class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                                value={selectedAppointment?.duration_minutes
                                                    ? selectedAppointment.duration_minutes.toString()
                                                    : "30"}
                                            >
                                                <option value="15"
                                                    >15 {$t(
                                                        "common.minutes_short",
                                                    )}</option
                                                >
                                                <option value="30"
                                                    >30 {$t(
                                                        "common.minutes_short",
                                                    )}</option
                                                >
                                                <option value="45"
                                                    >45 {$t(
                                                        "common.minutes_short",
                                                    )}</option
                                                >
                                                <option value="60"
                                                    >60 {$t(
                                                        "common.minutes_short",
                                                    )}</option
                                                >
                                            </select>
                                        </div>
                                    </div>

                                    {#if selectedAppointment?.id}
                                        <div>
                                            <label
                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                                >{$t(
                                                    "assistant.dashboard.appointment.fields.status",
                                                )}</label
                                            >
                                            <select
                                                name="status"
                                                class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                                value={selectedAppointment.status}
                                            >
                                                <option value="scheduled"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.status.scheduled",
                                                    )}</option
                                                >
                                                <option value="confirmed"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.status.confirmed",
                                                    )}</option
                                                >
                                                <option value="cancelled"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.status.cancelled",
                                                    )}</option
                                                >
                                                <option value="no_show"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.status.no_show",
                                                    )}</option
                                                >
                                                <option value="completed"
                                                    >{$t(
                                                        "assistant.dashboard.appointment.status.completed",
                                                    )}</option
                                                >
                                            </select>
                                        </div>

                                        <!-- Appointment Tracking Info -->
                                        {#if selectedAppointment?.created_by_name || selectedAppointment?.confirmed_by_name}
                                            <div
                                                class="bg-gray-50 rounded-xl p-4 border border-gray-200"
                                            >
                                                <p
                                                    class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2"
                                                >
                                                    Appointment History
                                                </p>
                                                <div class="space-y-1">
                                                    {#if selectedAppointment.created_by_name}
                                                        <p
                                                            class="text-sm text-gray-700"
                                                        >
                                                            <span
                                                                class="font-semibold"
                                                                >✏️ Created by:</span
                                                            >
                                                            {selectedAppointment.created_by_name}
                                                        </p>
                                                    {:else if selectedAppointment.notes && selectedAppointment.notes.includes("Source: Web")}
                                                        <p
                                                            class="text-sm text-gray-700"
                                                        >
                                                            <span
                                                                class="font-semibold"
                                                                >🌐 Source:</span
                                                            > Portal Booking
                                                        </p>
                                                    {/if}
                                                    {#if selectedAppointment.confirmed_by_name}
                                                        <p
                                                            class="text-sm text-gray-700"
                                                        >
                                                            <span
                                                                class="font-semibold"
                                                                >✓ Confirmed by:</span
                                                            >
                                                            {selectedAppointment.confirmed_by_name}
                                                        </p>
                                                    {/if}
                                                </div>
                                            </div>
                                        {/if}
                                    {/if}

                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.appointment.fields.notes",
                                            )}</label
                                        >
                                        <textarea
                                            name="notes"
                                            rows="2"
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium"
                                            placeholder={$t(
                                                "assistant.dashboard.appointment.fields.additionalNotes",
                                            )}
                                            >{selectedAppointment?.notes ||
                                                ""}</textarea
                                        >
                                    </div>
                                </div>
                            </div>
                            <div
                                class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3"
                            >
                                <button
                                    type="submit"
                                    name="action"
                                    value="schedule_close"
                                    disabled={!slotPickerTime}
                                    class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {$t(
                                        "assistant.dashboard.buttons.scheduleAndClose",
                                    )}
                                </button>
                                {#if !selectedAppointment?.id}
                                    <button
                                        type="submit"
                                        name="action"
                                        value="schedule_new"
                                        disabled={!slotPickerTime}
                                        class="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {$t(
                                            "assistant.dashboard.buttons.scheduleAndNew",
                                        )}
                                    </button>
                                {/if}
                                <button
                                    type="button"
                                    class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100 hover:bg-gray-100 transition-all"
                                    onclick={closeModal}
                                    >{$t("common.cancel")}</button
                                >
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Modal: Add Patient -->
    {#if isPatientModalOpen}
        <div
            class="relative z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                onclick={() => (isPatientModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="bg-white rounded-[2.5rem] shadow-2xl w-[85vw] max-w-[1600px] h-[90vh] flex overflow-hidden transform transition-all border border-white/20"
                    >
                        <div
                            class="w-[30%] bg-gray-50/50 border-r border-gray-100 flex flex-col"
                        >
                            <div class="p-6 pb-2">
                                <h4
                                    class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4"
                                >
                                    Patient Manager
                                </h4>
                                <div class="relative group">
                                    <span
                                        class="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
                                        >🔍</span
                                    >
                                    <input
                                        bind:value={manageSearchQuery}
                                        class="w-full bg-white border-0 ring-1 ring-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                                        placeholder="Rechercher dossiers..."
                                    />
                                </div>
                            </div>

                            <div
                                class="flex-1 overflow-y-auto px-6 pb-6 space-y-3 custom-scrollbar"
                            >
                                <p
                                    class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-4 mb-2"
                                >
                                    {manageSearchQuery || patientFullName
                                        ? "Résultats / Doublons potentiels"
                                        : "Patients récents"}
                                </p>

                                {#each filteredGlobalPatients as p}
                                    <div
                                        class="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-default group relative overflow-hidden"
                                    >
                                        <div class="flex items-center gap-4">
                                            <div
                                                class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-sm font-black text-indigo-600"
                                            >
                                                {p.full_name.charAt(0)}
                                            </div>
                                            <div class="flex-1">
                                                <p
                                                    class="text-sm font-black text-gray-900 leading-none mb-1"
                                                >
                                                    {p.full_name}
                                                </p>
                                                <p
                                                    class="text-[10px] font-bold text-gray-400 font-mono tracking-tighter"
                                                >
                                                    {p.phone || "Pas de numéro"}
                                                </p>
                                            </div>
                                            <!-- Warning badge if matching current input -->
                                            {#if patientFullName && p.full_name
                                                    .toLowerCase()
                                                    .includes(patientFullName.toLowerCase()) && patientFullName.length > 3}
                                                <div
                                                    class="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded-full uppercase tracking-tighter animate-pulse"
                                                >
                                                    Doublon ?
                                                </div>
                                            {/if}
                                        </div>
                                        <div
                                            class="mt-3 pt-3 border-t border-gray-50 flex gap-2"
                                        >
                                            <button
                                                type="button"
                                                class="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest hover:underline"
                                                onclick={() => {
                                                    isPatientModalOpen = false;
                                                    goto(
                                                        `/assistant/patients/${p.id}`,
                                                    );
                                                }}>Détails</button
                                            >
                                            <button
                                                type="button"
                                                class="text-[9px] font-extrabold text-green-600 uppercase tracking-widest hover:underline ml-auto"
                                                onclick={() => {
                                                    openBookingModal(null);
                                                    selectedPatient = p;
                                                    selectedAppointment = {
                                                        patient_id: p.id,
                                                    };
                                                }}>RDV</button
                                            >
                                        </div>
                                    </div>
                                {:else}
                                    <div class="text-center py-12">
                                        <span
                                            class="text-4xl opacity-20 filter grayscale mb-4 block"
                                            >📂</span
                                        >
                                        <p
                                            class="text-xs font-bold text-gray-400 italic"
                                        >
                                            Aucun patient correspondant
                                        </p>
                                    </div>
                                {/each}
                            </div>
                        </div>

                        <!-- RIGHT PANEL: Creation Form (70%) -->
                        <div
                            class="w-[70%] flex flex-col bg-white overflow-hidden"
                        >
                            <form
                                method="POST"
                                action="?/createPatient"
                                class="flex flex-col h-full"
                                use:enhance={() => {
                                    errorMessage = "";
                                    isSubmittingPatient = true;
                                    return async ({ result, update }) => {
                                        isSubmittingPatient = false;
                                        if (result.type === "success") {
                                            const data = result.data as any;
                                            createdPatientData = {
                                                id: data.patientId,
                                                name: data.patientName,
                                            };
                                            showSuccessView = true;
                                        } else {
                                            errorMessage =
                                                (result.data as any)?.error ||
                                                "Registration failed";
                                        }
                                        await update();
                                    };
                                }}
                            >
                                <div
                                    class="flex-1 overflow-y-auto custom-scrollbar p-8"
                                >
                                    {#if showSuccessView}
                                        <div
                                            class="max-w-xl mx-auto py-20 text-center"
                                            in:fly={{ y: 20 }}
                                        >
                                            <div
                                                class="mb-10 relative inline-block"
                                            >
                                                <div
                                                    class="absolute inset-0 bg-green-200 blur-3xl opacity-30 animate-pulse"
                                                ></div>
                                                <div
                                                    class="w-32 h-32 bg-green-500 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-green-200 relative"
                                                >
                                                    ✅
                                                </div>
                                            </div>
                                            <h4
                                                class="text-2xl font-black text-gray-900 mb-4 tracking-tight"
                                            >
                                                C'est fait !
                                            </h4>
                                            <p
                                                class="text-xl text-gray-500 mb-12"
                                            >
                                                Le dossier de <span
                                                    class="text-gray-900 font-black decoration-green-500 decoration-4 underline underline-offset-4"
                                                    >{createdPatientData?.name}</span
                                                > a été créé.
                                            </p>

                                            <div
                                                class="bg-gray-50 p-8 rounded-[2rem] border border-gray-100"
                                            >
                                                <p
                                                    class="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6"
                                                >
                                                    Prochaine étape ?
                                                </p>
                                                <div
                                                    class="grid grid-cols-3 gap-4"
                                                >
                                                    <button
                                                        type="button"
                                                        onclick={() =>
                                                            planAppointment(
                                                                "consultation",
                                                            )}
                                                        class="group p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-600 transition-all text-center"
                                                    >
                                                        <div
                                                            class="text-2xl mb-2 group-hover:scale-125 transition-transform"
                                                        >
                                                            🔵
                                                        </div>
                                                        <span
                                                            class="text-[10px] font-black uppercase tracking-widest text-indigo-600"
                                                            >Consultation</span
                                                        >
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onclick={() =>
                                                            planAppointment(
                                                                "emergency",
                                                            )}
                                                        class="group p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-red-600 transition-all text-center"
                                                    >
                                                        <div
                                                            class="text-2xl mb-2 group-hover:scale-125 transition-transform"
                                                        >
                                                            🔴
                                                        </div>
                                                        <span
                                                            class="text-[10px] font-black uppercase tracking-widest text-red-600"
                                                            >Urgence</span
                                                        >
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onclick={() =>
                                                            planAppointment(
                                                                "checkup",
                                                            )}
                                                        class="group p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-green-600 transition-all text-center"
                                                    >
                                                        <div
                                                            class="text-2xl mb-2 group-hover:scale-125 transition-transform"
                                                        >
                                                            🟢
                                                        </div>
                                                        <span
                                                            class="text-[10px] font-black uppercase tracking-widest text-green-600"
                                                            >Contrôle</span
                                                        >
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    {:else}
                                        <div class="max-w-3xl mx-auto">
                                            <div
                                                class="flex items-center justify-between mb-8"
                                            >
                                                <div>
                                                    <h3
                                                        class="text-2xl font-black text-gray-900 tracking-tight mb-2"
                                                    >
                                                        Nouveau Dossier
                                                    </h3>
                                                    <p
                                                        class="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]"
                                                    >
                                                        Patient Onboarding &
                                                        File Creation
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onclick={() =>
                                                        (isPatientModalOpen = false)}
                                                    class="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full text-xl hover:bg-gray-100 transition-colors"
                                                    >✕</button
                                                >
                                            </div>

                                            {#if errorMessage}
                                                <div
                                                    class="p-6 bg-rose-50 border-l-4 border-rose-500 text-rose-700 rounded-2xl mb-10 flex items-center gap-4"
                                                >
                                                    <span
                                                        class="text-2xl font-black"
                                                        >⚠️</span
                                                    >
                                                    <div
                                                        class="text-sm font-black tracking-tight"
                                                    >
                                                        {errorMessage}
                                                    </div>
                                                </div>
                                            {/if}

                                            <div class="space-y-10">
                                                <!-- Section: Identity -->
                                                <section class="space-y-6">
                                                    <p
                                                        class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-3"
                                                    >
                                                        <span
                                                            class="w-8 h-[1px] bg-indigo-100"
                                                        ></span> Identité & Naissance
                                                    </p>
                                                    <div
                                                        class="grid grid-cols-2 gap-8"
                                                    >
                                                        <div class="col-span-2">
                                                            <label
                                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"
                                                                >Nom & Prénom du
                                                                Patient</label
                                                            >
                                                            <input
                                                                name="full_name"
                                                                required
                                                                bind:value={
                                                                    patientFullName
                                                                }
                                                                class="w-full bg-gray-50 border-0 ring-1 ring-gray-100 rounded-2xl py-4 px-6 text-xl font-black placeholder:text-gray-200 focus:ring-2 focus:ring-indigo-600 transition-all"
                                                                placeholder="ex: Amine Benali"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"
                                                                >Date de
                                                                Naissance</label
                                                            >
                                                            <input
                                                                type="text"
                                                                name="date_of_birth"
                                                                required
                                                                value={patientDob}
                                                                oninput={handleDobInput}
                                                                placeholder="JJ/MM/AAAA"
                                                                class="w-full bg-gray-50 border-0 ring-1 ring-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                                            />
                                                        </div>
                                                        <div
                                                            class="flex items-end pb-4"
                                                        >
                                                            <label
                                                                class="flex items-center gap-3 cursor-pointer group"
                                                            >
                                                                <div
                                                                    class="relative"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        name="is_dependent"
                                                                        bind:checked={
                                                                            isDependent
                                                                        }
                                                                        class="sr-only"
                                                                    />
                                                                    <div
                                                                        class="w-14 h-7 bg-gray-200 rounded-full transition-colors group-hover:bg-gray-300 {isDependent
                                                                            ? 'bg-indigo-600 text-white'
                                                                            : ''}"
                                                                    ></div>
                                                                    <div
                                                                        class="absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md {isDependent
                                                                            ? 'translate-x-7'
                                                                            : ''}"
                                                                    ></div>
                                                                </div>
                                                                <span
                                                                    class="text-xs font-black text-gray-500 uppercase tracking-widest"
                                                                    >Client
                                                                    Dépendant
                                                                    (Enfant/Senior)</span
                                                                >
                                                            </label>
                                                        </div>
                                                    </div>
                                                </section>

                                                <!-- Section: Guardian (Conditional) -->
                                                {#if isDependent}
                                                    <section
                                                        class="p-6 bg-indigo-50/30 border border-indigo-100/50 rounded-[2.5rem] space-y-4"
                                                        transition:slide
                                                    >
                                                        <p
                                                            class="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-3"
                                                        >
                                                            <span>👪</span> Informations
                                                            du Tuteur / Responsable
                                                        </p>

                                                        <!-- Guardian Search Interface -->
                                                        <div class="relative">
                                                            <label
                                                                class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                                                >Rechercher un
                                                                dossier parent
                                                                existant</label
                                                            >
                                                            <div
                                                                class="relative"
                                                            >
                                                                <input
                                                                    bind:value={
                                                                        guardianSearchQuery
                                                                    }
                                                                    class="w-full bg-white border border-indigo-100 rounded-2xl py-4 px-6 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-600 pr-12"
                                                                    placeholder="Taper un nom ou téléphone..."
                                                                />
                                                                {#if isGuardianSearching}
                                                                    <div
                                                                        class="absolute right-4 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"
                                                                    ></div>
                                                                {/if}
                                                            </div>

                                                            {#if guardianResults.length > 0}
                                                                <div
                                                                    class="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-2 space-y-1 max-h-60 overflow-y-auto"
                                                                    in:fly={{
                                                                        y: 10,
                                                                    }}
                                                                >
                                                                    <p
                                                                        class="text-[8px] font-black text-gray-400 uppercase tracking-widest p-2"
                                                                    >
                                                                        Résultats
                                                                        de
                                                                        recherche
                                                                    </p>
                                                                    {#each guardianResults as p}
                                                                        <button
                                                                            type="button"
                                                                            class="w-full text-left p-3 hover:bg-indigo-50 rounded-xl transition-colors flex items-center justify-between group"
                                                                            onclick={() =>
                                                                                selectGuardian(
                                                                                    p,
                                                                                )}
                                                                        >
                                                                            <div
                                                                            >
                                                                                <p
                                                                                    class="text-sm font-black text-gray-900 group-hover:text-indigo-600"
                                                                                >
                                                                                    {p.full_name}
                                                                                </p>
                                                                                <p
                                                                                    class="text-[10px] text-gray-400 font-bold"
                                                                                >
                                                                                    {p.phone}
                                                                                </p>
                                                                            </div>
                                                                            <span
                                                                                class="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg"
                                                                                >Sélectionner</span
                                                                            >
                                                                        </button>
                                                                    {/each}
                                                                </div>
                                                            {/if}
                                                        </div>

                                                        <div
                                                            class="grid grid-cols-2 gap-6"
                                                        >
                                                            <div>
                                                                <label
                                                                    class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                                                    >Rôle</label
                                                                >
                                                                <select
                                                                    name="guardian_role"
                                                                    bind:value={
                                                                        guardianRole
                                                                    }
                                                                    class="w-full rounded-2xl border-indigo-100 bg-white py-3 px-6 text-sm font-black"
                                                                >
                                                                    <option
                                                                        value="Father"
                                                                        >Père</option
                                                                    >
                                                                    <option
                                                                        value="Mother"
                                                                        >Mère</option
                                                                    >
                                                                    <option
                                                                        value="Other"
                                                                        >Tuteur
                                                                        / Autre</option
                                                                    >
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label
                                                                    class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                                                    >Nom Complet
                                                                    Tuteur</label
                                                                >
                                                                <input
                                                                    name="guardian_name"
                                                                    required
                                                                    bind:value={
                                                                        guardianName
                                                                    }
                                                                    class="w-full rounded-2xl border-indigo-100 bg-white py-3 px-6 text-sm font-black"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label
                                                                    class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                                                    >Téléphone
                                                                    Tuteur</label
                                                                >
                                                                <input
                                                                    name="guardian_phone"
                                                                    required={guardianRole !==
                                                                        "Father"}
                                                                    bind:value={
                                                                        guardianPhone
                                                                    }
                                                                    class="w-full rounded-2xl border-indigo-100 bg-white py-3 px-6 text-sm font-black"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label
                                                                    class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2"
                                                                    >Email
                                                                    Tuteur</label
                                                                >
                                                                <input
                                                                    type="email"
                                                                    name="guardian_email"
                                                                    required={guardianRole !==
                                                                        "Father"}
                                                                    bind:value={
                                                                        guardianEmail
                                                                    }
                                                                    class="w-full rounded-2xl border-indigo-100 bg-white py-3 px-6 text-sm font-black"
                                                                />
                                                            </div>
                                                        </div>
                                                    </section>
                                                {/if}

                                                <!-- Section: Contact Patient -->
                                                <section class="space-y-6">
                                                    <p
                                                        class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3"
                                                    >
                                                        <span
                                                            class="w-8 h-[1px] bg-gray-100"
                                                        ></span> Coordonnées Patient
                                                    </p>
                                                    <div
                                                        class="grid grid-cols-2 gap-8"
                                                    >
                                                        <div>
                                                            <label
                                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"
                                                                >Téléphone {isDependent
                                                                    ? "(Facultatif si enfant)"
                                                                    : "*"}</label
                                                            >
                                                            <input
                                                                name="phone"
                                                                required={!isDependent}
                                                                bind:value={
                                                                    patientPhone
                                                                }
                                                                class="w-full bg-gray-50 border-0 ring-1 ring-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                                                placeholder="0XXXXXXXXX"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label
                                                                class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2"
                                                                >Email Personnel</label
                                                            >
                                                            <input
                                                                name="email"
                                                                type="email"
                                                                bind:value={
                                                                    patientEmail
                                                                }
                                                                class="w-full bg-gray-50 border-0 ring-1 ring-gray-100 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all"
                                                                placeholder="email@example.com"
                                                            />
                                                        </div>
                                                    </div>
                                                </section>
                                            </div>
                                        </div>
                                    {/if}
                                </div>

                                <div
                                    class="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between"
                                >
                                    <button
                                        type="button"
                                        class="text-[11px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                        onclick={() =>
                                            (isPatientModalOpen = false)}
                                    >
                                        Annuler & Fermer
                                    </button>

                                    {#if !showSuccessView}
                                        <button
                                            type="submit"
                                            disabled={isSubmittingPatient}
                                            class="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-4"
                                        >
                                            {#if isSubmittingPatient}
                                                <div
                                                    class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                                                ></div>
                                                Traitement...
                                            {:else}
                                                Enregistrer le Patient
                                            {/if}
                                        </button>
                                    {/if}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Modal: Record Payment -->
    {#if isPaymentModalOpen && selectedPaymentPatient}
        <div
            class="relative z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                onclick={() => (isPaymentModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                    >
                        <form
                            method="POST"
                            action="?/recordPayment"
                            use:enhance={() => {
                                errorMessage = "";
                                return async ({ result, update }) => {
                                    if (result.type === "success") {
                                        isPaymentModalOpen = false;
                                    } else {
                                        errorMessage =
                                            (result.data as any)?.error ||
                                            "Payment failed";
                                    }
                                    await update();
                                };
                            }}
                        >
                            <input
                                type="hidden"
                                name="patient_id"
                                value={selectedPaymentPatient.patient_id}
                            />
                            <div class="p-6">
                                <h3
                                    class="text-xl font-black text-gray-900 mb-2 flex items-center gap-2"
                                >
                                    <span
                                        class="w-2 h-8 bg-indigo-600 rounded-full"
                                    ></span>
                                    {$t(
                                        "assistant.dashboard.payment.modal.title",
                                    )}
                                </h3>
                                <p
                                    class="text-gray-400 text-xs font-bold uppercase mb-6 tracking-widest"
                                >
                                    {selectedPaymentPatient.full_name}
                                </p>

                                <div
                                    class="bg-red-50 p-4 rounded-2xl border border-red-100 mb-6 flex justify-between items-center"
                                >
                                    <span
                                        class="text-xs font-bold text-red-600 uppercase tracking-widest"
                                        >{$t(
                                            "assistant.dashboard.payment.modal.totalDue",
                                        )}</span
                                    >
                                    <span
                                        class="text-xl font-black text-red-600"
                                        >{APP_CONFIG.currencySymbol}{selectedPaymentPatient.balance_due.toFixed(
                                            2,
                                        )}</span
                                    >
                                </div>

                                {#if errorMessage}
                                    <div
                                        class="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm"
                                    >
                                        {errorMessage}
                                    </div>
                                {/if}

                                <div class="space-y-4">
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.payment.fields.amount",
                                            )}</label
                                        >
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="amount"
                                            required
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-lg font-black text-indigo-600"
                                            value={selectedPaymentPatient.balance_due}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >Docteur concerné</label
                                        >
                                        <select
                                            name="doctor_id"
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-bold"
                                        >
                                            <option value=""
                                                >Tous / Non spécifié</option
                                            >
                                            {#each data.doctors as dr}
                                                <option value={dr.id}
                                                    >{dr.full_name}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                                            >{$t(
                                                "assistant.dashboard.payment.fields.paymentMethod",
                                            )}</label
                                        >
                                        <select
                                            name="payment_method"
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-bold"
                                        >
                                            {#if data.config?.paymentMethods}
                                                {#each data.config.paymentMethods as method}
                                                    <option value={method}
                                                        >{method}</option
                                                    >
                                                {/each}
                                            {:else}
                                                <option value="cash"
                                                    >{$t(
                                                        "assistant.dashboard.payment.methods.cash",
                                                    )}</option
                                                >
                                                <option value="card"
                                                    >{$t(
                                                        "assistant.dashboard.payment.methods.card",
                                                    )}</option
                                                >
                                            {/if}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div
                                class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3"
                            >
                                <button
                                    type="submit"
                                    class="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                                    >{$t(
                                        "assistant.dashboard.payment.modal.confirm",
                                    )}</button
                                >
                                <button
                                    type="button"
                                    class="px-6 py-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-100"
                                    onclick={() => (isPaymentModalOpen = false)}
                                    >{$t("common.cancel")}</button
                                >
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Confirmation Modal -->
    {#if isConfirmModalOpen && pendingAction}
        <div
            class="relative z-50 overflow-y-auto"
            aria-labelledby="confirm-modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={cancelConfirmation}
            ></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                    >
                        <div class="bg-white px-6 py-5">
                            <div class="flex items-center gap-4 mb-4">
                                <div class="flex-shrink-0">
                                    <div
                                        class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center"
                                    >
                                        <span class="text-2xl">⚠️</span>
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <h3
                                        class="text-lg font-bold text-gray-900"
                                        id="confirm-modal-title"
                                    >
                                        Confirm Status Change
                                    </h3>
                                </div>
                            </div>
                            <div class="mb-6">
                                <p class="text-sm text-gray-600">
                                    {#if pendingAction.type === "bulk"}
                                        Are you sure you want to {pendingAction.status ===
                                        "confirmed"
                                            ? "confirm"
                                            : "cancel"}
                                        <strong>{pendingAction.count}</strong>
                                        appointment{pendingAction.count === 1
                                            ? ""
                                            : "s"}?
                                    {:else}
                                        Are you sure you want to change this
                                        appointment status to <strong
                                            >{pendingAction.status}</strong
                                        >?
                                    {/if}
                                </p>
                            </div>
                            <div class="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onclick={cancelConfirmation}
                                    class="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onclick={confirmAction}
                                    class="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors
                                {pendingAction.status === 'confirmed'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : pendingAction.status === 'cancelled'
                                          ? 'bg-red-600 hover:bg-red-700'
                                          : 'bg-indigo-600 hover:bg-indigo-700'}"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Modal: Patient Check-In -->
    {#if isCheckInModalOpen && checkInAppointment}
        <div
            class="relative z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                onclick={() => (isCheckInModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                    >
                        <div class="bg-white px-6 pt-6 pb-6">
                            <h3
                                class="text-xl font-black text-gray-900 mb-6 border-b pb-4 flex items-center gap-2"
                            >
                                <span class="w-2 h-8 bg-blue-600 rounded-full"
                                ></span>
                                Patient Check-In
                            </h3>

                            <div class="space-y-4">
                                <div
                                    class="p-4 bg-gray-50 rounded-xl border border-gray-100"
                                >
                                    <p
                                        class="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1"
                                    >
                                        Patient
                                    </p>
                                    <p class="text-lg font-bold text-gray-900">
                                        {checkInAppointment.patient_name}
                                    </p>

                                    <div class="grid grid-cols-2 gap-4 mt-3">
                                        <div>
                                            <p
                                                class="text-[10px] text-gray-400 uppercase font-bold"
                                            >
                                                Scheduled
                                            </p>
                                            <p
                                                class="text-sm font-bold text-indigo-600"
                                            >
                                                {new Date(
                                                    checkInAppointment.start_time,
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p
                                                class="text-[10px] text-gray-400 uppercase font-bold"
                                            >
                                                Arrival Time
                                            </p>
                                            <p
                                                class="text-sm font-bold text-green-600"
                                            >
                                                {new Date().toLocaleTimeString(
                                                    [],
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    },
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <label
                                        class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1"
                                        >Check-in Notes (Optional)</label
                                    >
                                    <textarea
                                        bind:value={checkInNotes}
                                        placeholder="e.g., Brought previous X-rays, needs referral..."
                                        class="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 text-sm font-medium focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div
                            class="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3"
                        >
                            <button
                                type="button"
                                disabled={isSubmittingCheckIn}
                                onclick={handleCheckIn}
                                class="inline-flex justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
                            >
                                {isSubmittingCheckIn
                                    ? "Processsing..."
                                    : "✓ Confirm Check-In"}
                            </button>
                            <button
                                type="button"
                                onclick={() => (isCheckInModalOpen = false)}
                                class="inline-flex justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Modal: Imminent Appointment Prompt -->
    {#if isImminentModalOpen && imminentAppointment}
        <div class="relative z-[60]" role="dialog" aria-modal="true">
            <div
                class="fixed inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity"
                onclick={() => (isImminentModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="relative transform overflow-hidden rounded-[2.5rem] bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-gray-100"
                    >
                        <div class="p-8">
                            <div
                                class="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mb-6 animate-bounce"
                            >
                                🔔
                            </div>
                            <h3 class="text-2xl font-black text-gray-900 mb-2">
                                Rendez-vous imminent
                            </h3>
                            <p
                                class="text-gray-500 font-medium leading-relaxed"
                            >
                                Le rendez-vous de <span
                                    class="text-indigo-600 font-black"
                                    >{imminentAppointment.patientName}</span
                                > est pour maintenant. Le patient est-il présent
                                ?
                            </p>
                        </div>
                        <div class="bg-gray-50 p-6 flex flex-col gap-3">
                            <button
                                type="button"
                                disabled={isSubmittingCheckIn}
                                onclick={handleCheckInAndNotify}
                                class="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                {#if isSubmittingCheckIn}
                                    <div
                                        class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                                    ></div>
                                {:else}
                                    ✅ Oui, Salle d'Attente
                                {/if}
                            </button>
                            <button
                                type="button"
                                onclick={() => (isImminentModalOpen = false)}
                                class="w-full py-4 bg-white text-gray-400 font-black rounded-2xl hover:text-gray-600 transition-all uppercase text-[10px] tracking-widest"
                            >
                                Pas encore / Non
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Tooltip for Calendar Events -->
    {#if tooltip.visible}
        <div
            class="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72 pointer-events-none transform -translate-y-1/2"
            style="left: {tooltip.x}px; top: {tooltip.y}px;"
        >
            <div class="flex items-start justify-between mb-2">
                <h4 class="font-bold text-gray-900">{tooltip.title}</h4>
                <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest
                    {tooltip.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : tooltip.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'}"
                >
                    {tooltip.status}
                </span>
            </div>
            <div class="space-y-1 text-xs">
                <div class="flex items-center gap-2 text-gray-600">
                    <span class="font-semibold w-12">Time:</span>
                    <span>{tooltip.time}</span>
                </div>
                <div class="flex items-center gap-2 text-gray-600">
                    <span class="font-semibold w-12">Patient:</span>
                    <span>{tooltip.patient}</span>
                </div>
                {#if tooltip.notes}
                    <div class="mt-2 pt-2 border-t border-gray-100">
                        <span class="font-semibold text-gray-500 block mb-0.5"
                            >Notes:</span
                        >
                        <p class="text-gray-700 italic">{tooltip.notes}</p>
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- WALK-IN MODAL -->
    {#if isWalkInModalOpen}
        <div
            class="relative z-[60] overflow-y-auto"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                onclick={() => (isWalkInModalOpen = false)}
            ></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md"
                    >
                        <form
                            method="POST"
                            action="?/createWalkIn"
                            use:enhance={() => {
                                errorMessage = "";
                                return async ({ result, update }) => {
                                    if (result.type === "success") {
                                        isWalkInModalOpen = false;
                                        const { invalidate } = await import(
                                            "$app/navigation"
                                        );
                                        await invalidate("appointments:today");
                                        await invalidate("waiting-room:status");
                                    } else {
                                        errorMessage =
                                            (result.data as any)?.error ||
                                            "Failed to create walk-in";
                                    }
                                    await update();
                                };
                            }}
                        >
                            <div class="p-6">
                                <div
                                    class="flex items-center justify-between mb-6"
                                >
                                    <h3
                                        class="text-xl font-black text-gray-900 flex items-center gap-2"
                                    >
                                        <span
                                            class="w-2 h-8 bg-orange-500 rounded-full"
                                        ></span>
                                        🚨 Urgence / Sans RDV
                                    </h3>
                                    <button
                                        type="button"
                                        onclick={() =>
                                            (isWalkInModalOpen = false)}
                                        class="text-gray-400 hover:text-gray-600 font-black"
                                        >✕</button
                                    >
                                </div>

                                {#if errorMessage}
                                    <div
                                        class="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold"
                                    >
                                        {errorMessage}
                                    </div>
                                {/if}

                                <div class="space-y-5">
                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5"
                                            >Patient</label
                                        >
                                        <select
                                            name="patient_id"
                                            required
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                                        >
                                            <option value=""
                                                >Sélectionner un patient</option
                                            >
                                            {#each data.patients as p}
                                                <option value={p.id}
                                                    >{p.full_name} ({p.phone})</option
                                                >
                                            {/each}
                                        </select>
                                        <p
                                            class="mt-1.5 text-[10px] text-gray-400 font-medium"
                                        >
                                            Le patient n'est pas dans la liste ?
                                            Créez-le d'abord dans l'onglet
                                            "Patients".
                                        </p>
                                    </div>

                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5"
                                            >Docteur à Assigné</label
                                        >
                                        <select
                                            name="doctor_id"
                                            required
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                                        >
                                            <option value=""
                                                >Sélectionner un docteur</option
                                            >
                                            {#each data.doctors as dr}
                                                <option value={dr.id}
                                                    >{dr.full_name}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5"
                                            >Motif ou Note Rapide</label
                                        >
                                        <textarea
                                            name="reason"
                                            rows="2"
                                            class="w-full rounded-xl border-gray-100 bg-gray-50 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                                            placeholder="Ex: Rage de dent, consultation urgente..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div
                                class="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3"
                            >
                                <button
                                    type="submit"
                                    class="inline-flex justify-center rounded-xl bg-orange-600 px-6 py-3 text-xs font-black text-white shadow-lg hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-all uppercase tracking-widest"
                                >
                                    Admettre en Salle d'Attente
                                </button>
                                <button
                                    type="button"
                                    onclick={() => (isWalkInModalOpen = false)}
                                    class="inline-flex justify-center rounded-xl bg-white px-6 py-3 text-xs font-black text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 transition-all uppercase tracking-widest"
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <!-- Speed Dial FAB -->
    <div class="fixed bottom-8 right-8 z-[101] flex flex-col items-end gap-3">
        {#if isFabOpen}
            <div class="flex flex-col items-end gap-3 mb-2">
                <!-- Action 1: Urgence -->
                <div
                    class="flex items-center gap-3 group"
                    transition:fly={{ y: 20, duration: 200, delay: 0 }}
                >
                    <span
                        class="bg-slate-800 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap uppercase tracking-widest"
                    >
                        Urgence / Sans RDV
                    </span>
                    <button
                        type="button"
                        onclick={() => {
                            isWalkInModalOpen = true;
                            isFabOpen = false;
                        }}
                        class="w-12 h-12 bg-rose-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-xl hover:bg-rose-600"
                    >
                        🚨
                    </button>
                </div>

                <!-- Action 2: Nouveau RDV -->
                <div
                    class="flex items-center gap-3 group"
                    transition:fly={{ y: 20, duration: 200, delay: 50 }}
                >
                    <span
                        class="bg-slate-800 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap uppercase tracking-widest"
                    >
                        Nouveau RDV
                    </span>
                    <button
                        type="button"
                        onclick={() => {
                            openBookingModal();
                            isFabOpen = false;
                        }}
                        class="w-12 h-12 bg-indigo-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-xl hover:bg-indigo-600"
                    >
                        📅
                    </button>
                </div>

                <!-- Action 3: Nouveau Patient -->
                <div
                    class="flex items-center gap-3 group"
                    transition:fly={{ y: 20, duration: 200, delay: 100 }}
                >
                    <span
                        class="bg-slate-800 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xl whitespace-nowrap uppercase tracking-widest"
                    >
                        Nouveau Patient
                    </span>
                    <button
                        type="button"
                        onclick={() => {
                            openPatientModal();
                            isFabOpen = false;
                        }}
                        class="w-12 h-12 bg-emerald-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-xl hover:bg-emerald-600"
                    >
                        👤
                    </button>
                </div>
            </div>
        {/if}

        <!-- Main Trigger -->
        <button
            type="button"
            onclick={(e) => {
                e.stopPropagation();
                isFabOpen = !isFabOpen;
            }}
            class="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/50 flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-95 group relative z-[101]"
        >
            <span
                class="text-3xl font-light transition-transform duration-300 {isFabOpen
                    ? 'rotate-45'
                    : 'rotate-0'}"
                style="margin-top: -2px;">+</span
            >
        </button>
    </div>

    <!-- Backdrop to close FAB on outside click -->
    {#if isFabOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 z-[100] bg-gray-900/10 backdrop-blur-[2px]"
            transition:fade={{ duration: 200 }}
            onclick={() => (isFabOpen = false)}
        ></div>
    {/if}
</div>
