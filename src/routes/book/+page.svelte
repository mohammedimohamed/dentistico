<script lang="ts">
    import { enhance } from "$app/forms";
    import type { ActionData, PageData } from "./$types";
    import SmartDateTimePicker from "$lib/components/SmartDateTimePicker.svelte";
    import FreeformDateTimePicker from "$lib/components/FreeformDateTimePicker.svelte";
    import { t, locale } from "svelte-i18n";

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let selectedDoctorId = $state("");
    let loading = $state(false);
    let bookingFor = $state("self");
    let selectedDate = $state("");
    let selectedTime = $state("");
    let selectedDateTime = $state("");

    // Set min date to today for the datetime input
    const today = new Date().toISOString().slice(0, 16);
    // Set max date to today for date of birth (cannot be in the future)
    const maxDateOfBirth = new Date().toISOString().split("T")[0];

    // Check if availability mode is enabled
    const isAvailabilityMode = $derived(
        data.config?.bookingMode === "availability",
    );

    async function setLanguage(lang: string) {
        document.cookie = `lang=${lang}; path=/; max-age=31536000`;
        window.location.reload();
    }

    function dateMask(node: HTMLInputElement) {
        function handleInput(e: Event) {
            let value = node.value.replace(/\D/g, "");
            if (value.length > 8) value = value.slice(0, 8);

            let formattedValue = "";
            if (value.length > 0) {
                formattedValue = value.slice(0, 2);
                if (value.length > 2) {
                    formattedValue += "/" + value.slice(2, 4);
                    if (value.length > 4) {
                        formattedValue += "/" + value.slice(4, 8);
                    }
                }
            }
            node.value = formattedValue;
        }

        node.addEventListener("input", handleInput);
        return {
            destroy() {
                node.removeEventListener("input", handleInput);
            },
        };
    }
</script>

<div class="min-h-screen bg-slate-50 py-12 px-6">
    <div class="max-w-2xl mx-auto">
        <!-- Language Switcher -->
        <div class="flex justify-end mb-8">
            <div
                class="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-slate-100"
            >
                <button
                    onclick={() => setLanguage("fr")}
                    class="px-4 py-2 rounded-lg text-sm font-bold transition-all {$locale ===
                    'fr'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'}"
                >
                    FR
                </button>
                <button
                    onclick={() => setLanguage("ar")}
                    class="px-4 py-2 rounded-lg text-sm font-bold transition-all {$locale ===
                    'ar'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50'}"
                >
                    AR
                </button>
            </div>
        </div>

        <!-- Header -->
        <div class="text-center mb-12">
            <a
                href="/"
                class="text-3xl font-extrabold tracking-tight text-teal-700 inline-block mb-4"
                >{data.config?.clinicName || "Dentistico"}</a
            >
            <h1
                class="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight"
            >
                {$t("booking.title")}
            </h1>
            <p class="text-lg text-slate-600 max-w-md mx-auto">
                {$t("booking.subtitle")}
            </p>
        </div>

        <div
            class="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
        >
            {#if form?.success}
                <div class="p-16 text-center">
                    <div
                        class="w-24 h-24 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-8 text-5xl"
                    >
                        ✓
                    </div>
                    <h2 class="text-3xl font-black text-slate-900 mb-4">
                        {$t("booking.success_title")}
                    </h2>
                    <p class="text-lg text-slate-600 mb-10 leading-relaxed">
                        {$t("booking.success_message", {
                            values: {
                                clinicName:
                                    data.config?.clinicName || "Dentistico",
                            },
                        })}
                    </p>
                    <a
                        href="/"
                        class="inline-block bg-teal-600 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-teal-700 transition-all shadow-xl hover:shadow-teal-100"
                    >
                        {$t("booking.back_home")}
                    </a>
                </div>
            {:else}
                <form
                    method="POST"
                    use:enhance={() => {
                        loading = true;
                        return async ({ update }: { update: any }) => {
                            loading = false;
                            update();
                        };
                    }}
                    class="p-8 md:p-14"
                >
                    {#if form?.error}
                        <div
                            class="mb-10 bg-red-50 border-2 border-red-100 text-red-700 px-8 py-5 rounded-[1.5rem] text-base font-medium flex items-center gap-3"
                        >
                            <span class="text-2xl">⚠️</span>
                            {form.error}
                        </div>
                    {/if}

                    <!-- Legend / Information Box -->
                    <div
                        class="mb-10 bg-teal-50 border-2 border-teal-100 rounded-[2rem] p-8 shadow-sm"
                    >
                        <h3
                            class="text-teal-900 font-black text-xl mb-4 flex items-center gap-2"
                        >
                            <span>ℹ️</span> Informations de Réservation
                        </h3>
                        <ul class="space-y-3 text-slate-700 font-medium">
                            <li class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-teal-500"
                                ></span>
                                Heures de travail:
                                <span class="font-black text-teal-800"
                                    >{data.config?.workHours ||
                                        "09:00 - 18:00"}</span
                                >
                            </li>
                            <li class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-teal-500"
                                ></span>
                                Fermé les:
                                <span class="font-black text-teal-800">
                                    {#if data.workingDays}
                                        {data.workingDays
                                            .filter(
                                                (d: any) => d.is_working === 0,
                                            )
                                            .map((d: any) => {
                                                const days = [
                                                    "Dimanche",
                                                    "Lundi",
                                                    "Mardi",
                                                    "Mercredi",
                                                    "Jeudi",
                                                    "Vendredi",
                                                    "Samedi",
                                                ];
                                                return days[d.day_of_week];
                                            })
                                            .join(", ")}
                                    {:else}
                                        Samedi & Dimanche
                                    {/if}
                                </span>
                            </li>
                            {#if data.closures && data.closures.length > 0}
                                <li class="flex items-start gap-2">
                                    <span
                                        class="w-2 h-2 rounded-full bg-teal-500 mt-2"
                                    ></span>
                                    <span>
                                        Prochaines fermetures:
                                        <span class="font-black text-teal-800">
                                            {data.closures
                                                .slice(0, 3)
                                                .map((c: any) => {
                                                    const d = new Date(
                                                        c.closure_date,
                                                    );
                                                    return d.toLocaleDateString(
                                                        "fr-FR",
                                                        {
                                                            day: "numeric",
                                                            month: "long",
                                                        },
                                                    );
                                                })
                                                .join(", ")}
                                            {#if data.closures.length > 3}
                                                et {data.closures.length - 3} autres{/if}
                                        </span>
                                    </span>
                                </li>
                            {/if}
                        </ul>
                    </div>

                    <!-- Booking For Toggle -->
                    <div
                        class="mb-12 p-8 bg-teal-50 rounded-[2rem] border-2 border-teal-100/50 flex flex-col sm:flex-row items-center justify-between gap-6"
                    >
                        <span class="text-teal-900 text-xl font-black"
                            >{$t("booking.who_booking_for")}</span
                        >
                        <div
                            class="flex bg-white p-1.5 rounded-2xl shadow-inner border border-teal-100"
                        >
                            <button
                                type="button"
                                class="px-8 py-3 rounded-xl text-base font-black transition-all {bookingFor ===
                                'self'
                                    ? 'bg-teal-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:bg-slate-50'}"
                                onclick={() => (bookingFor = "self")}
                            >
                                {$t("booking.myself")}
                            </button>
                            <button
                                type="button"
                                class="px-8 py-3 rounded-xl text-base font-black transition-all {bookingFor ===
                                'other'
                                    ? 'bg-teal-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:bg-slate-50'}"
                                onclick={() => (bookingFor = "other")}
                            >
                                {$t("booking.someone_else")}
                            </button>
                        </div>
                        <input
                            type="hidden"
                            name="booking_for"
                            value={bookingFor}
                        />
                    </div>

                    <!-- Single Column Form -->
                    <div class="space-y-10">
                        <!-- Requester Section -->
                        <section class="space-y-8">
                            <h3
                                class="text-sm font-black uppercase tracking-[0.2em] text-teal-600/80 border-b-2 border-teal-50 pb-4"
                            >
                                {bookingFor === "self"
                                    ? $t("booking.personal_details")
                                    : $t("booking.your_info")}
                            </h3>

                            <div class="space-y-6">
                                <div>
                                    <label
                                        for="full_name"
                                        class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                    >
                                        {$t("booking.full_name")}
                                    </label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        id="full_name"
                                        required
                                        class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-medium focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                                        placeholder={$t(
                                            "booking.full_name_placeholder",
                                        )}
                                    />
                                </div>

                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                >
                                    <div class="w-full">
                                        <label
                                            for="email"
                                            class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                        >
                                            {$t("booking.email")}
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            required
                                            class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-medium focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="nom@exemple.com"
                                        />
                                    </div>

                                    <div class="w-full">
                                        <label
                                            for="phone"
                                            class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                        >
                                            {$t("booking.phone")}
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            id="phone"
                                            required
                                            class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-medium focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="06 XX XX XX XX"
                                        />
                                    </div>
                                </div>

                                {#if bookingFor === "self"}
                                    <div>
                                        <label
                                            for="date_of_birth"
                                            class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                        >
                                            {$t("booking.dob")}
                                        </label>
                                        <input
                                            type="text"
                                            use:dateMask
                                            name="date_of_birth"
                                            id="date_of_birth"
                                            required
                                            class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-medium focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                            placeholder="JJ/MM/AAAA"
                                        />
                                    </div>
                                {/if}
                            </div>
                        </section>

                        <!-- Patient Info (If someone else) -->
                        {#if bookingFor === "other"}
                            <section
                                class="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500"
                            >
                                <h3
                                    class="text-sm font-black uppercase tracking-[0.2em] text-teal-600/80 border-b-2 border-teal-50 pb-4"
                                >
                                    {$t("booking.patient_info")}
                                </h3>

                                <div class="space-y-6">
                                    <div>
                                        <label
                                            for="patient_name"
                                            class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                        >
                                            {$t("booking.patient_name")}
                                        </label>
                                        <input
                                            type="text"
                                            name="patient_name"
                                            id="patient_name"
                                            required
                                            class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-medium focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                                            placeholder={$t(
                                                "booking.patient_name_placeholder",
                                            )}
                                        />
                                    </div>

                                    <div
                                        class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                    >
                                        <div class="w-full">
                                            <label
                                                for="patient_dob"
                                                class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                            >
                                                {$t("booking.patient_dob")}
                                            </label>
                                            <input
                                                type="text"
                                                use:dateMask
                                                name="patient_dob"
                                                id="patient_dob"
                                                required
                                                class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-medium focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all"
                                                placeholder="JJ/MM/AAAA"
                                            />
                                        </div>

                                        <div class="w-full">
                                            <label
                                                for="relationship"
                                                class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                            >
                                                {$t("booking.relationship")}
                                            </label>
                                            <select
                                                name="relationship"
                                                id="relationship"
                                                required
                                                class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                                style="background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27 fill=%27none%27 viewBox=%270%200%2020%2020%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E'); background-position: right 1.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3.5rem;"
                                            >
                                                <option value="child"
                                                    >{$t(
                                                        "booking.relationships.child",
                                                    )}</option
                                                >
                                                <option value="spouse"
                                                    >{$t(
                                                        "booking.relationships.spouse",
                                                    )}</option
                                                >
                                                <option value="parent"
                                                    >{$t(
                                                        "booking.relationships.parent",
                                                    )}</option
                                                >
                                                <option value="friend"
                                                    >{$t(
                                                        "booking.relationships.friend",
                                                    )}</option
                                                >
                                                <option value="other"
                                                    >{$t(
                                                        "booking.relationships.other",
                                                    )}</option
                                                >
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        {/if}

                        <!-- Schedule Section -->
                        <section class="space-y-8">
                            <h3
                                class="text-sm font-black uppercase tracking-[0.2em] text-teal-600/80 border-b-2 border-teal-50 pb-4"
                            >
                                {$t("booking.schedule")}
                            </h3>

                            <div class="space-y-8">
                                <div>
                                    <label
                                        for="doctor_id"
                                        class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                    >
                                        {$t("booking.specialist")}
                                    </label>
                                    <select
                                        name="doctor_id"
                                        id="doctor_id"
                                        bind:value={selectedDoctorId}
                                        class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                        style="background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27 fill=%27none%27 viewBox=%270%200%2020%2020%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E'); background-position: right 1.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3.5rem;"
                                    >
                                        <option value=""
                                            >{$t(
                                                "booking.doctor_placeholder",
                                            )}</option
                                        >
                                        {#each data.doctors as any[] as doctor}
                                            <option value={doctor.id}
                                                >{doctor.full_name}</option
                                            >
                                        {/each}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        for="appointment_type"
                                        class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                    >
                                        {$t("booking.service_type")}
                                    </label>
                                    <select
                                        name="appointment_type"
                                        id="appointment_type"
                                        required
                                        class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                                        style="background-image: url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27 fill=%27none%27 viewBox=%270%200%2020%2020%27%3E%3Cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6%208%204%204%204-4%27%2F%3E%3C%2Fsvg%3E'); background-position: right 1.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 3.5rem;"
                                    >
                                        <option value="consultation"
                                            >{$t(
                                                "booking.services.consultation",
                                            )}</option
                                        >
                                        <option value="checkup"
                                            >{$t(
                                                "booking.services.checkup",
                                            )}</option
                                        >
                                        <option value="cleaning"
                                            >{$t(
                                                "booking.services.cleaning",
                                            )}</option
                                        >
                                        <option value="cosmetic"
                                            >{$t(
                                                "booking.services.cosmetic",
                                            )}</option
                                        >
                                        <option value="emergency"
                                            >{$t(
                                                "booking.services.emergency",
                                            )}</option
                                        >
                                    </select>
                                </div>

                                <div>
                                    <label
                                        for="start_time"
                                        class="block text-base font-bold text-slate-800 mb-4 ml-1"
                                    >
                                        {$t("booking.datetime")}
                                    </label>
                                    <div
                                        class="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100"
                                    >
                                        {#if isAvailabilityMode}
                                            <SmartDateTimePicker
                                                {selectedDate}
                                                {selectedTime}
                                                doctorId={selectedDoctorId}
                                                onDateChange={(date) =>
                                                    (selectedDate = date)}
                                                onTimeChange={(time) =>
                                                    (selectedTime = time)}
                                            />
                                            <input
                                                type="hidden"
                                                name="start_time"
                                                value={selectedTime}
                                                required
                                            />
                                        {:else}
                                            <FreeformDateTimePicker
                                                {selectedDateTime}
                                                onDateTimeChange={(dateTime) =>
                                                    (selectedDateTime =
                                                        dateTime)}
                                            />
                                            <input
                                                type="hidden"
                                                name="start_time"
                                                value={selectedDateTime}
                                                required
                                            />
                                        {/if}
                                    </div>
                                </div>

                                <div>
                                    <label
                                        for="notes"
                                        class="block text-base font-bold text-slate-800 mb-3 ml-1"
                                    >
                                        {$t("booking.notes")}
                                    </label>
                                    <textarea
                                        name="notes"
                                        id="notes"
                                        rows="3"
                                        class="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-lg font-medium focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all resize-none placeholder:text-slate-300"
                                        placeholder={$t(
                                            "booking.notes_placeholder",
                                        )}
                                    ></textarea>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div class="mt-16 space-y-8">
                        <button
                            type="submit"
                            disabled={loading}
                            class="w-full bg-teal-600 text-white py-6 rounded-[1.5rem] font-black text-2xl hover:bg-teal-700 transition-all shadow-[0_20px_50px_rgba(13,148,136,0.3)] hover:shadow-[0_20px_50px_rgba(13,148,136,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {#if loading}
                                <span
                                    class="flex items-center justify-center gap-3"
                                >
                                    <svg
                                        class="animate-spin h-7 w-7 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            class="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            stroke-width="4"
                                        ></circle>
                                        <path
                                            class="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    {$t("booking.processing")}
                                </span>
                            {:else}
                                {$t("booking.confirm")}
                            {/if}
                        </button>

                        <p
                            class="text-center text-sm text-slate-400 max-w-sm mx-auto leading-relaxed"
                        >
                            {$t("booking.terms")}
                        </p>
                    </div>
                </form>
            {/if}
        </div>

        <!-- Support Info -->
        <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div
                class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
            >
                <span
                    class="block text-teal-600 font-black text-xs uppercase tracking-widest mb-2 font-black"
                    >{$t("booking.call_us")}</span
                >
                <span class="text-slate-900 font-bold text-lg"
                    >+1 (555) 000-1234</span
                >
            </div>
            <div
                class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
            >
                <span
                    class="block text-teal-600 font-black text-xs uppercase tracking-widest mb-2 font-black"
                    >{$t("booking.email_us")}</span
                >
                <span class="text-slate-900 font-bold text-lg"
                    >hello@dentistico.com</span
                >
            </div>
            <div
                class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
            >
                <span
                    class="block text-teal-600 font-black text-xs uppercase tracking-widest mb-2 font-black"
                    >{$t("booking.emergency")}</span
                >
                <span class="text-slate-900 font-bold text-lg"
                    >{$t("booking.support_line")}</span
                >
            </div>
        </div>
    </div>
</div>

<style>
    :global(html) {
        scroll-behavior: smooth;
    }

    /* Custom styles for bigger inputs */
    input[type="tel"],
    input[type="email"],
    input[type="text"],
    select,
    textarea {
        font-size: 1.125rem !important; /* text-lg */
    }

    button {
        -webkit-tap-highlight-color: transparent;
    }
</style>
