<script lang="ts">
    import type { PageData } from "./$types";
    import { enhance } from "$app/forms";
    import { page as pageStore } from "$app/stores";
    import { goto } from "$app/navigation";
    import { t } from "svelte-i18n";

    let { data }: { data: PageData } = $props();

    let isCreateModalOpen = $state(false);
    let searchInput = $state(data.searchQuery || "");

    function calculateAge(dob: string) {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    // Reactively update search input if sync is needed from URL
    $effect(() => {
        searchInput = data.searchQuery || "";
    });

    // Runes for reactive data access
    const patients = $derived(data.patients as any[]);
    const totalPages = $derived(data.totalPages as number);
    const currentPage = $derived(data.page as number);
    const totalPatients = $derived(data.totalPatients as number);
    const searchQuery = $derived(data.searchQuery as string);
    const currentFilter = $derived(data.filter as string);

    function applyFilter(filter: string) {
        const url = new URL($pageStore.url);
        if (filter) {
            url.searchParams.set("filter", filter);
        } else {
            url.searchParams.delete("filter");
        }
        url.searchParams.set("page", "1");
        goto(url.toString(), { keepFocus: true, noScroll: true });
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
</script>

<div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div
        class="px-4 py-4 sm:px-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
    >
        <h1 class="text-2xl font-bold text-gray-900">
            {$t("patients.directory")}
        </h1>
        <div class="flex items-center gap-4 w-full sm:w-auto">
            <a
                href="/doctor/patients/archived"
                class="text-sm text-gray-500 hover:text-indigo-600 font-bold transition-colors"
            >
                {$t("patients.view_archived")}
            </a>
            <button
                onclick={() => (isCreateModalOpen = true)}
                class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 group"
            >
                <span class="group-hover:scale-125 transition-transform text-lg"
                    >+</span
                >
                {$t("patients.new_patient")}
            </button>
        </div>
    </div>

    <!-- Search & Filters -->
    <div class="mb-10 px-4 sm:px-0 space-y-6">
        <form
            action="/doctor/patients"
            method="GET"
            class="relative rounded-2xl shadow-sm max-w-lg flex group"
        >
            <div
                class="absolute inset-y-0 inset-inline-start-0 pl-4 flex items-center pointer-events-none text-gray-400"
            >
                <span class="text-lg">🔍</span>
            </div>
            <input
                type="text"
                name="search"
                bind:value={searchInput}
                class="block w-full ps-12 pe-4 py-4 sm:text-sm border-gray-200 rounded-s-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                placeholder={$t("patients.search_placeholder")}
            />
            {#if currentFilter}
                <input type="hidden" name="filter" value={currentFilter} />
            {/if}
            <button
                type="submit"
                class="inline-flex items-center px-6 py-4 bg-gray-900 hover:bg-black text-white rounded-e-2xl text-sm font-bold transition-all border-none"
            >
                {$t("common.search")}
            </button>
        </form>

        <!-- Quick Filters -->
        <div class="flex flex-wrap items-center gap-2">
            <span
                class="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2"
                >Filters:</span
            >
            <button
                onclick={() => applyFilter("")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {!currentFilter
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                Tous
            </button>
            <div class="h-4 w-px bg-gray-200 mx-1"></div>
            <button
                onclick={() => applyFilter("child")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {currentFilter ===
                'child'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                Enfants
            </button>
            <button
                onclick={() => applyFilter("adult")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {currentFilter ===
                'adult'
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                Adultes
            </button>
            <div class="h-4 w-px bg-gray-200 mx-1"></div>
            <button
                onclick={() => applyFilter("debt")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {currentFilter ===
                'debt'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                En Dette
            </button>
            <button
                onclick={() => applyFilter("credit")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {currentFilter ===
                'credit'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                Créditeur
            </button>
            <div class="h-4 w-px bg-gray-200 mx-1"></div>
            <button
                onclick={() => applyFilter("upcoming")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {currentFilter ===
                'upcoming'
                    ? 'bg-indigo-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                Futurs RDV
            </button>
            <div class="h-4 w-px bg-gray-200 mx-1"></div>
            <button
                onclick={() => applyFilter("male")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {currentFilter ===
                'male'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                Hommes
            </button>
            <button
                onclick={() => applyFilter("female")}
                class="px-4 py-2 rounded-full text-xs font-bold transition-all {currentFilter ===
                'female'
                    ? 'bg-pink-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
            >
                Femmes
            </button>
        </div>
    </div>

    {#if patients.length === 0}
        <div
            class="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm mx-4 sm:mx-0"
        >
            <p class="text-gray-400 text-lg font-medium">
                {$t("patients.no_patients")}
            </p>
            {#if searchQuery}
                <a
                    href="/doctor/patients"
                    class="text-indigo-600 hover:text-indigo-800 mt-4 inline-block font-bold"
                    >{$t("patients.clear_search")}</a
                >
            {/if}
        </div>
    {:else}
        <div
            class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 px-4 sm:px-0"
        >
            {#each patients as patient}
                <div
                    class="bg-white group overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 rounded-2xl border border-gray-100 transition-all duration-300"
                >
                    <div class="px-6 py-6">
                        <div class="flex items-start justify-between mb-4">
                            <h3
                                class="text-lg leading-6 font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate text-start flex items-center gap-2"
                            >
                                {#if patient.gender === "Male"}
                                    <span
                                        class="text-blue-500 text-base"
                                        title={$t("patients.male")}>♂️</span
                                    >
                                {:else if patient.gender === "Female"}
                                    <span
                                        class="text-pink-500 text-base"
                                        title={$t("patients.female")}>♀️</span
                                    >
                                {:else if patient.gender === "Other"}
                                    <span
                                        class="text-purple-500 text-base"
                                        title={$t("patients.other")}>⚧️</span
                                    >
                                {/if}
                                {patient.full_name}
                            </h3>
                            <div class="flex flex-col items-end gap-1">
                                <span
                                    class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase tracking-wider"
                                >
                                    {$t("patients.age")}: {patient.age ??
                                        calculateAge(patient.date_of_birth)}
                                </span>
                                {#if patient.is_child !== undefined || calculateAge(patient.date_of_birth) !== "N/A"}
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter {(patient.is_child ??
                                        Number(
                                            calculateAge(patient.date_of_birth),
                                        ) < 16)
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700'}"
                                    >
                                        {(patient.is_child ??
                                        Number(
                                            calculateAge(patient.date_of_birth),
                                        ) < 16)
                                            ? $t("patient_details.child")
                                            : $t("patient_details.adult")}
                                    </span>
                                {/if}
                            </div>
                        </div>

                        <!-- Financial & Appointment Indicators -->
                        <div class="flex items-center gap-3 mb-4">
                            {#if patient.net_balance !== undefined && patient.net_balance !== 0}
                                <span
                                    class="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold {patient.net_balance <
                                    0
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'}"
                                >
                                    {patient.net_balance < 0 ? "−" : "+"}
                                    {formatCurrency(patient.net_balance)}
                                </span>
                            {:else if patient.net_balance === 0}
                                <span
                                    class="text-[10px] font-bold text-gray-300"
                                    >0 DZD</span
                                >
                            {/if}

                            {#if patient.next_appointment}
                                <div
                                    class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100"
                                >
                                    <span class="text-[10px]">📅</span>
                                    <span
                                        class="text-[10px] font-bold whitespace-nowrap"
                                        >{formatRelativeDate(
                                            patient.next_appointment,
                                        )}</span
                                    >
                                </div>
                            {/if}
                        </div>
                        <div class="text-sm text-gray-500 space-y-3 text-start">
                            <p class="flex items-center font-medium">
                                <span class="margin-inline-end-3 text-lg"
                                    >📞</span
                                >
                                {patient.phone}
                            </p>
                            <p class="flex items-center font-medium">
                                <span class="margin-inline-end-3 text-lg"
                                    >✉️</span
                                >
                                <span class="truncate"
                                    >{patient.email || "N/A"}</span
                                >
                            </p>
                            <p class="flex items-center font-medium">
                                <span class="margin-inline-end-3 text-lg"
                                    >🚻</span
                                >
                                {patient.gender
                                    ? $t(
                                          `patients.${patient.gender.toLowerCase()}`,
                                      )
                                    : $t("common.none")}
                            </p>
                        </div>
                        <div class="mt-6 flex gap-3">
                            {#if patient.allergies && patient.allergies !== "None"}
                                <div
                                    class="h-3 w-3 rounded-full bg-red-400 animate-pulse"
                                    title={$t("patient_details.allergies")}
                                ></div>
                            {/if}
                            {#if patient.medical_conditions && patient.medical_conditions !== "None"}
                                <div
                                    class="h-3 w-3 rounded-full bg-amber-400"
                                    title={$t("patient_details.conditions")}
                                ></div>
                            {/if}
                        </div>
                    </div>
                    <div
                        class="bg-gray-50/50 px-6 py-4 flex justify-between items-center group-hover:bg-indigo-50/50 transition-colors"
                    >
                        <a
                            href="/doctor/patients/{patient.id}"
                            class="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center group"
                        >
                            {$t("patients.view_profile")}
                            <span
                                class="margin-inline-start-2 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform inline-block"
                                >→</span
                            >
                        </a>
                    </div>
                </div>
            {/each}
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
            <div
                class="mt-12 flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm mx-4 sm:mx-0"
            >
                <div class="flex flex-1 justify-between sm:hidden">
                    <a
                        href="?page={currentPage - 1}&search={searchQuery}"
                        class="relative inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 {currentPage <=
                        1
                            ? 'pointer-events-none opacity-50'
                            : ''}"
                    >
                        {$t("common.previous")}
                    </a>
                    <a
                        href="?page={currentPage + 1}&search={searchQuery}"
                        class="relative ml-3 inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 {currentPage >=
                        totalPages
                            ? 'pointer-events-none opacity-50'
                            : ''}"
                    >
                        {$t("common.next")}
                    </a>
                </div>
                <div
                    class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between"
                >
                    <div>
                        <p class="text-sm text-gray-700">
                            {$t("common.showing")}
                            <span class="font-bold"
                                >{(currentPage - 1) * 24 + 1}</span
                            >
                            {$t("common.to")}
                            <span class="font-bold"
                                >{Math.min(
                                    currentPage * 24,
                                    totalPatients,
                                )}</span
                            >
                            {$t("common.of")}
                            <span class="font-bold">{totalPatients}</span>
                            {$t("patients.results")}
                        </p>
                    </div>
                    <div>
                        <nav
                            class="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-2"
                            aria-label="Pagination"
                        >
                            <a
                                href="?page={currentPage -
                                    1}&search={searchQuery}"
                                class="relative inline-flex items-center rounded-xl px-4 py-2.5 text-gray-400 hover:bg-gray-50 focus:z-20 transition-all {currentPage <=
                                1
                                    ? 'pointer-events-none opacity-20'
                                    : ''}"
                            >
                                <span class="text-xl">←</span>
                            </a>

                            {#each Array.from( { length: Math.min(5, totalPages) }, (_, i) => {
                                    let start = Math.max(1, currentPage - 2);
                                    let end = Math.min(totalPages, start + 4);
                                    if (end === totalPages) start = Math.max(1, end - 4);
                                    return start + i;
                                }, ) as pageNum}
                                {#if pageNum <= totalPages}
                                    <a
                                        href="?page={pageNum}&search={searchQuery}"
                                        class="relative inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl transition-all {currentPage ===
                                        pageNum
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                            : 'text-gray-900 hover:bg-gray-50'}"
                                    >
                                        {pageNum}
                                    </a>
                                {/if}
                            {/each}

                            <a
                                href="?page={currentPage +
                                    1}&search={searchQuery}"
                                class="relative inline-flex items-center rounded-xl px-4 py-2.5 text-gray-400 hover:bg-gray-50 focus:z-20 transition-all {currentPage >=
                                totalPages
                                    ? 'pointer-events-none opacity-20'
                                    : ''}"
                            >
                                <span class="text-xl">→</span>
                            </a>
                        </nav>
                    </div>
                </div>
            </div>
        {/if}
    {/if}

    <!-- Create Patient Modal -->
    {#if isCreateModalOpen}
        <div
            class="relative z-50"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div
                class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onclick={() => (isCreateModalOpen = false)}
            ></div>

            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div
                    class="flex min-h-full items-center justify-center p-4 text-center sm:p-0"
                >
                    <div
                        class="relative transform overflow-hidden rounded-3xl bg-white text-start shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl"
                    >
                        <form
                            method="POST"
                            action="?/createPatient"
                            use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === "success") {
                                        isCreateModalOpen = false;
                                    }
                                    await update();
                                };
                            }}
                        >
                            <div
                                class="bg-white px-6 pt-8 pb-6 sm:p-10 max-h-[85vh] overflow-y-auto custom-scrollbar"
                            >
                                <div
                                    class="flex justify-between items-start mb-8"
                                >
                                    <h3
                                        class="text-2xl font-bold text-gray-900"
                                        id="modal-title"
                                    >
                                        {$t("patients.add_new")}
                                    </h3>
                                    <button
                                        type="button"
                                        onclick={() =>
                                            (isCreateModalOpen = false)}
                                        class="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <span class="text-3xl">&times;</span>
                                    </button>
                                </div>
                                <div class="space-y-10">
                                    <!-- Personal Information -->
                                    <div class="space-y-6">
                                        <h4
                                            class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]"
                                        >
                                            {$t("patients.personal_info")}
                                        </h4>
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                        >
                                            <div class="md:col-span-2">
                                                <label
                                                    for="full_name"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t("patients.full_name")} *</label
                                                >
                                                <input
                                                    type="text"
                                                    name="full_name"
                                                    id="full_name"
                                                    required
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    for="date_of_birth"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.date_of_birth",
                                                    )} *</label
                                                >
                                                <input
                                                    type="date"
                                                    name="date_of_birth"
                                                    id="date_of_birth"
                                                    required
                                                    max={new Date()
                                                        .toISOString()
                                                        .split("T")[0]}
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    for="gender"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.gender",
                                                    )}</label
                                                >
                                                <select
                                                    name="gender"
                                                    id="gender"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                >
                                                    <option value=""
                                                        >{$t(
                                                            "common.none",
                                                        )}</option
                                                    >
                                                    <option value="Male"
                                                        >{$t(
                                                            "patients.male",
                                                        )}</option
                                                    >
                                                    <option value="Female"
                                                        >{$t(
                                                            "patients.female",
                                                        )}</option
                                                    >
                                                    <option value="Other"
                                                        >{$t(
                                                            "patients.other",
                                                        )}</option
                                                    >
                                                    <option
                                                        value="Prefer not to say"
                                                        >{$t(
                                                            "patients.prefer_not_to_say",
                                                        )}</option
                                                    >
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Contact Information -->
                                    <div class="space-y-6">
                                        <h4
                                            class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]"
                                        >
                                            {$t("patients.contact_info")}
                                        </h4>
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                        >
                                            <div>
                                                <label
                                                    for="phone"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.phone",
                                                    )}</label
                                                >
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    id="phone"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    for="email"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t("common.email")}</label
                                                >
                                                <input
                                                    type="email"
                                                    name="email"
                                                    id="email"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Address -->
                                    <div class="space-y-6">
                                        <h4
                                            class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]"
                                        >
                                            {$t("patients.address")}
                                        </h4>
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                        >
                                            <div class="md:col-span-2">
                                                <label
                                                    for="address"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.street_address",
                                                    )}</label
                                                >
                                                <input
                                                    type="text"
                                                    name="address"
                                                    id="address"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    for="city"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.city",
                                                    )}</label
                                                >
                                                <input
                                                    type="text"
                                                    name="city"
                                                    id="city"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    for="postal_code"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.postal_code",
                                                    )}</label
                                                >
                                                <input
                                                    type="text"
                                                    name="postal_code"
                                                    id="postal_code"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Insurance -->
                                    <div class="space-y-6">
                                        <h4
                                            class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]"
                                        >
                                            {$t("patients.insurance")}
                                        </h4>
                                        <div
                                            class="grid grid-cols-1 md:grid-cols-2 gap-6"
                                        >
                                            <div>
                                                <label
                                                    for="insurance_provider"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.provider",
                                                    )}</label
                                                >
                                                <input
                                                    type="text"
                                                    name="insurance_provider"
                                                    id="insurance_provider"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    for="insurance_number"
                                                    class="block text-sm font-bold text-gray-700 mb-2"
                                                    >{$t(
                                                        "patients.policy_number",
                                                    )}</label
                                                >
                                                <input
                                                    type="text"
                                                    name="insurance_number"
                                                    id="insurance_number"
                                                    class="block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                class="bg-gray-50/50 px-8 py-8 sm:flex sm:flex-row-reverse sm:px-10 gap-4 border-t border-gray-100"
                            >
                                <button
                                    type="submit"
                                    class="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] transition-all sm:w-auto"
                                    >{$t("patients.create")}</button
                                >
                                <button
                                    type="button"
                                    class="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-all"
                                    onclick={() => (isCreateModalOpen = false)}
                                    >{$t("common.cancel")}</button
                                >
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }

    /* Logical spacing */
    :global([dir="rtl"]) .margin-inline-end-3 {
        margin-left: 0.75rem;
    }
    :global([dir="ltr"]) .margin-inline-end-3 {
        margin-right: 0.75rem;
    }

    :global([dir="rtl"]) .margin-inline-start-2 {
        margin-right: 0.5rem;
    }
    :global([dir="ltr"]) .margin-inline-start-2 {
        margin-left: 0.5rem;
    }
</style>
