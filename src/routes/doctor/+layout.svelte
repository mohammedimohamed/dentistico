<script lang="ts">
    import { page } from "$app/state";
    import type { Snippet } from "svelte";
    import PortalShell from "$lib/components/PortalShell.svelte";
    import { NAVIGATION } from "$lib/config/navigation";
    import { enhance } from "$app/forms";
    import { configStore } from "$lib/stores/config.svelte";
    import { Building2, Sofa, Syringe, Radiation, DoorOpen, AlertTriangle, Rocket } from "lucide-svelte";
    let { children, data }: { children: Snippet; data: any } = $props();

    const navItems = $derived(
        NAVIGATION.doctor.filter((item) => {
            if (item.href === "/lab-tracking") {
                const modules = configStore.modules;
                if (!modules.custom) return false;
                const allowedRoles = (configStore.raw?.module_custom_roles || 'doctor').split(',');
                if (!allowedRoles.includes(data.user?.role)) return false;
            }
            // Hide billing related if invoicing is disabled (optional, depending on if ledger is still "billing")
            // For now, let's keep doctor nav as is unless there's a specific billing item.
            return true;
        }),
    );
    const currentTitle = $derived(
        navItems.find((i) => page.url.pathname.startsWith(i.href))?.label ||
            "common.portal",
    );

    const showRoomSelection = $derived(
        data.clinicSettings?.require_room_selection === 1 &&
            !data.currentShift &&
            data.user?.role === "doctor" &&
            !page.url.pathname.includes("/profile"), // Allow profile access
    );

    const currentRoom = $derived(
        data.activeRooms?.find((r: any) => r.id === data.currentShift?.room_id),
    );

    let isChangingRoom = $state(false);
    let autoSubmitForm: HTMLFormElement | null = $state(null);

    // Auto-select for single room
    $effect(() => {
        if (
            showRoomSelection &&
            data.activeRooms?.length === 1 &&
            autoSubmitForm
        ) {
            autoSubmitForm.requestSubmit();
        }
    });
</script>

{#if showRoomSelection}
    <div
        class="fixed inset-0 z-[999] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4"
    >
        <div
            class="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-10 border border-white/20 animate-in fade-in zoom-in duration-300"
        >
            <div class="text-center mb-10">
                <div
                    class="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"
                >
                    <Building2 size={48} />
                </div>
                <h2 class="text-3xl font-black text-gray-900 mb-2">
                    Ouverture de Cabinet
                </h2>
                <p class="text-gray-500 font-medium">
                    Veuillez sélectionner votre salle pour commencer la journée.
                </p>
            </div>

            <!-- Quick Selection and Room List -->
            {#if !data.activeRooms || data.activeRooms.length === 0}
                <div
                    class="text-center py-10 bg-amber-50 rounded-[2.5rem] border border-amber-100 mb-8 px-6"
                >
                    <div class="mb-4 text-amber-500 flex justify-center">
                        <AlertTriangle size={48} />
                    </div>
                    <h3 class="text-xl font-black text-amber-900 mb-2">
                        Aucune salle configurée
                    </h3>
                    {#if data.user?.role === "admin"}
                        <p
                            class="text-amber-700 font-medium text-sm mb-8 leading-relaxed"
                        >
                            Le système nécessite au moins une salle de
                            consultation active pour fonctionner. En tant
                            qu'administrateur, vous pouvez initialiser une
                            configuration par défaut.
                        </p>
                        <form
                            method="POST"
                            action="/doctor/dashboard?/quickStart"
                            use:enhance
                        >
                            <button
                                type="submit"
                                class="w-full py-4 bg-amber-600 text-white font-black rounded-2xl hover:bg-amber-700 shadow-lg shadow-amber-200/50 transition-all uppercase tracking-widest text-xs animate-pulse hover:animate-none flex items-center justify-center gap-2"
                            >
                                <Rocket size={16} /> Créer 'Cabinet 1' & Démarrer
                            </button>
                        </form>
                    {:else}
                        <p
                            class="text-amber-700 font-medium text-sm leading-relaxed"
                        >
                            L'établissement n'a pas encore configuré de salles
                            de consultation. Veuillez contacter un
                            administrateur pour débloquer votre accès.
                        </p>
                    {/if}
                </div>
            {:else}
                <!-- Quick Selection Dropdown (with optgroup) -->
                <form
                    method="POST"
                    action="/doctor/dashboard?/startShift"
                    bind:this={autoSubmitForm}
                    use:enhance={({ formData, cancel }) => {
                        const roomId = formData.get("room_id");
                        const room = data.activeRooms?.find(
                            (r: any) => r.id == roomId,
                        );
                        if (room?.occupied_by && data.activeRooms.length > 1) {
                            if (
                                !confirm(
                                    `Cette salle est actuellement occupée par ${room.occupied_by}. Êtes-vous sûr de vouloir prendre cette salle ? (Cela peut arriver s'il a oublié de fermer sa session).`,
                                )
                            ) {
                                cancel();
                            }
                        }
                    }}
                    class="mb-8"
                >
                    <label
                        for="room-quick-select"
                        class="block text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1"
                        >Sélection rapide</label
                    >
                    <div class="flex gap-2">
                        <select
                            id="room-quick-select"
                            name="room_id"
                            class="flex-1 px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all cursor-pointer"
                            required
                        >
                            <option value="">-- Choisir une salle --</option>
                            {#each Object.entries(data.groupedRooms || {}) as [groupName, rooms]}
                                <optgroup label={groupName}>
                                    {#each rooms as room}
                                        <option value={room.id}
                                            >{room.name} ({room.type}){room.occupied_by
                                                ? ` - 🔴 Occupé par ${room.occupied_by}`
                                                : ""}</option
                                        >
                                    {/each}
                                </optgroup>
                            {/each}
                        </select>
                        <button
                            type="submit"
                            class="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest text-xs"
                        >
                            Valider
                        </button>
                    </div>
                </form>

                <div
                    class="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
                >
                    {#each Object.entries(data.groupedRooms || {}) as [groupName, rooms]}
                        <div class="space-y-4">
                            <div class="flex items-center gap-2">
                                <div class="h-px flex-1 bg-gray-100"></div>
                                <span
                                    class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap bg-white px-3"
                                >
                                    {groupName}
                                </span>
                                <div class="h-px flex-1 bg-gray-100"></div>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {#each rooms as room}
                                    <form
                                        method="POST"
                                        action="/doctor/dashboard?/startShift"
                                        use:enhance={({ cancel }) => {
                                            if (
                                                room.occupied_by &&
                                                !confirm(
                                                    `Cette salle est actuellement occupée par ${room.occupied_by}. Êtes-vous sûr de vouloir prendre cette salle ? (Cela peut arriver s'il a oublié de fermer sa session).`,
                                                )
                                            ) {
                                                cancel();
                                            }
                                        }}
                                    >
                                        <input
                                            type="hidden"
                                            name="room_id"
                                            value={room.id}
                                        />
                                        <button
                                            type="submit"
                                            class="w-full text-left p-6 rounded-3xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group relative overflow-hidden active:scale-[0.98]"
                                        >
                                            <div
                                                class="flex items-center gap-4 relative z-10"
                                            >
                                                <div
                                                    class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                                                    style="background-color: {room.color}20; color: {room.color}"
                                                >
                                                    {#if room.type === "consultation"}
                                                        <Sofa size={24} />
                                                    {:else if room.type === "surgery"}
                                                        <Syringe size={24} />
                                                    {:else if room.type === "xray"}
                                                        <Radiation size={24} />
                                                    {:else}
                                                        <DoorOpen size={24} />
                                                    {/if}
                                                </div>
                                                <div>
                                                    <h4
                                                        class="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors flex items-center gap-2"
                                                    >
                                                        {room.name}
                                                        {#if room.occupied_by}
                                                            <span
                                                                class="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-tighter"
                                                                >Occupée</span
                                                            >
                                                        {/if}
                                                    </h4>
                                                    <p
                                                        class="text-[10px] text-gray-400 font-black uppercase tracking-widest"
                                                    >
                                                        {room.type}
                                                        {#if room.occupied_by}
                                                            <span
                                                                class="block text-red-400 normal-case font-bold tracking-normal"
                                                                >Par {room.occupied_by}</span
                                                            >
                                                        {/if}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                class="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 text-indigo-500 font-bold text-xl"
                                            >
                                                →
                                            </div>
                                        </button>
                                    </form>
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}

            <!-- Logout Safety Hatch -->
            <div class="mt-12 pt-8 border-t border-gray-100 text-center">
                <form method="POST" action="/logout">
                    <button
                        type="submit"
                        class="text-gray-400 hover:text-red-500 font-bold text-xs transition-colors flex items-center gap-2 justify-center mx-auto uppercase tracking-widest"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path
                                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                            /><polyline points="16 17 21 12 16 7" /><line
                                x1="21"
                                y1="12"
                                x2="9"
                                y2="12"
                            /></svg
                        >
                        Se déconnecter
                    </button>
                </form>
            </div>
        </div>
    </div>
{/if}

<PortalShell
    {navItems}
    sidebarTitle={data.config?.clinicName || "Dentistico"}
    userName={data?.user?.full_name || "Doctor"}
    headerTitle={currentTitle}
    roleLabel="common.doctor"
    noPadding={page.url.pathname.includes("/journey/")}
>
    {#snippet headerChildren()}
        {#if data.currentShift && currentRoom}
            <div
                class="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 shadow-sm mr-4 group relative"
            >
                <div
                    class="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                    style="background-color: {currentRoom.color}20; color: {currentRoom.color}"
                >
                    {#if currentRoom.type === "consultation"}
                        <Sofa size={16} />
                    {:else if currentRoom.type === "surgery"}
                        <Syringe size={16} />
                    {:else if currentRoom.type === "xray"}
                        <Radiation size={16} />
                    {:else}
                        <DoorOpen size={16} />
                    {/if}
                </div>
                <div class="flex flex-col text-start">
                    <span
                        class="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1"
                        >Salle Actuelle</span
                    >
                    <span class="text-sm font-bold text-gray-900 leading-none"
                        >{currentRoom.name}</span
                    >
                </div>
                <button
                    onclick={() => (isChangingRoom = true)}
                    class="ml-2 p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-400 hover:text-indigo-600"
                    title="Changer de salle"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        ><path d="M17 2.1l4 4-4 4" /><path
                            d="M3 12.2v-2a4 4 0 0 1 4-4h14"
                        /><path d="M7 21.9l-4-4 4-4" /><path
                            d="M21 11.8v2a4 4 0 0 1-4 4H3"
                        /></svg
                    >
                </button>
            </div>
        {/if}
    {/snippet}

    {@render children()}
</PortalShell>

{#if isChangingRoom}
    <!-- Change Room Modal -->
    <div
        class="fixed inset-0 z-[1000] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
        <div
            class="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-8 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
            <div class="flex justify-between items-start mb-8">
                <div>
                    <h3 class="text-2xl font-black text-gray-900">
                        Changer de salle
                    </h3>
                    <p class="text-gray-500 text-sm mt-1">
                        Sélectionnez votre nouvelle salle de consultation.
                    </p>
                </div>
                <button
                    onclick={() => (isChangingRoom = false)}
                    class="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >✕</button
                >
            </div>

            <div
                class="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar"
            >
                {#each Object.entries(data.groupedRooms || {}) as [groupName, rooms]}
                    <div class="space-y-3">
                        <div
                            class="text-[9px] font-black uppercase tracking-widest text-gray-400 px-1"
                        >
                            {groupName}
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                            {#each rooms as room}
                                <form
                                    method="POST"
                                    action="/doctor/dashboard?/changeRoom"
                                    use:enhance={({ cancel }) => {
                                        if (
                                            room.occupied_by &&
                                            room.occupied_by !==
                                                data.user.full_name &&
                                            !confirm(
                                                `⚠️ Cette salle est actuellement occupée par ${room.occupied_by}. Voulez-vous vraiment rejoindre et partager cette salle ?`,
                                            )
                                        ) {
                                            cancel();
                                            return;
                                        }
                                        return async ({ result, update }) => {
                                            isChangingRoom = false;
                                            await update();
                                        };
                                    }}
                                >
                                    <input
                                        type="hidden"
                                        name="shift_id"
                                        value={data.currentShift?.id}
                                    />
                                    <input
                                        type="hidden"
                                        name="room_id"
                                        value={room.id}
                                    />
                                    <button
                                        type="submit"
                                        class="w-full flex items-center justify-between p-4 rounded-2xl border-2 {room.id ===
                                        data.currentShift?.room_id
                                            ? 'border-indigo-600 bg-indigo-50/30'
                                            : 'border-gray-50 hover:bg-gray-50'} transition-all group"
                                    >
                                        <div class="flex items-center gap-4">
                                            <div
                                                class="w-10 h-10 rounded-xl flex items-center justify-center"
                                                style="background-color: {room.color}20; color: {room.color}"
                                            >
                                                {#if room.type === "consultation"}
                                                    <Sofa size={20} />
                                                {:else if room.type === "surgery"}
                                                    <Syringe size={20} />
                                                {:else if room.type === "xray"}
                                                    <Radiation size={20} />
                                                {:else}
                                                    <DoorOpen size={20} />
                                                {/if}
                                            </div>
                                            <div class="text-start">
                                                <h5
                                                    class="font-bold text-gray-900 flex items-center gap-2"
                                                >
                                                    {room.name}
                                                    {#if room.occupied_by && room.occupied_by !== data.user.full_name}
                                                        <span
                                                            class="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-tighter"
                                                            >Occupée</span
                                                        >
                                                    {/if}
                                                </h5>
                                                <p
                                                    class="text-[9px] text-gray-400 font-black uppercase tracking-widest"
                                                >
                                                    {room.type}
                                                    {#if room.occupied_by && room.occupied_by !== data.user.full_name}
                                                        <span
                                                            class="block text-red-400 normal-case font-bold tracking-normal"
                                                            >Par {room.occupied_by}</span
                                                        >
                                                    {/if}
                                                </p>
                                            </div>
                                        </div>
                                        {#if room.id === data.currentShift?.room_id}
                                            <span
                                                class="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
                                                >Actuel</span
                                            >
                                        {/if}
                                    </button>
                                </form>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}
