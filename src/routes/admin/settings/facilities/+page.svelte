<script lang="ts">
    import { onMount } from "svelte";
    import { fade, slide, fly } from "svelte/transition";
    import { t } from "svelte-i18n";

    let { data } = $props();
    let hierarchy = $derived(data.hierarchy || []);

    let selectedBuildingId = $state<number | null>(null);
    let selectedFloorId = $state<number | null>(null);
    let selectedRoomId = $state<number | null>(null);

    // Editing states
    let showBuildingModal = $state(false);
    let showFloorModal = $state(false);
    let showRoomModal = $state(false);

    let buildingForm = $state({
        id: null as number | null,
        name: "",
        address: "",
    });
    let floorForm = $state({
        id: null as number | null,
        buildingId: null as number | null,
        name: "",
        levelNumber: 0,
    });
    let roomForm = $state({
        id: null as number | null,
        floorId: null as number | null,
        name: "",
        type: "consultation",
        color: "#3B82F6",
        is_active: 1,
    });

    const selectedBuilding = $derived(
        hierarchy.find((b: any) => b.id === selectedBuildingId),
    );
    const selectedFloor = $derived(
        selectedBuilding?.floors.find((f: any) => f.id === selectedFloorId),
    );

    async function refreshHierarchy() {
        const res = await fetch("/api/admin/facilities"); // Wait, I need this endpoint
        // Or just reload the page/data
        window.location.reload();
    }

    // Since I don't have GET /api/admin/facilities yet, I'll just use the load data and reload on change for now
    // or I can implement the GET /api/admin/facilities quickly.

    async function saveBuilding() {
        const method = buildingForm.id ? "PUT" : "POST";
        const res = await fetch("/api/admin/buildings", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildingForm),
        });
        if (res.ok) {
            showBuildingModal = false;
            window.location.reload();
        }
    }

    async function saveFloor() {
        const method = floorForm.id ? "PUT" : "POST";
        const res = await fetch("/api/admin/floors", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...floorForm,
                buildingId: selectedBuildingId,
            }),
        });
        if (res.ok) {
            showFloorModal = false;
            window.location.reload();
        }
    }

    async function saveRoom() {
        const method = roomForm.id ? "PUT" : "POST";
        const res = await fetch("/api/admin/rooms", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...roomForm, floor_id: selectedFloorId }),
        });
        if (res.ok) {
            showRoomModal = false;
            window.location.reload();
        }
    }

    async function deleteItem(type: "building" | "floor" | "room", id: number) {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet élément ?"))
            return;
        const endpoint =
            type === "building"
                ? "/api/admin/buildings"
                : type === "floor"
                  ? "/api/admin/floors"
                  : "/api/admin/rooms";
        const res = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
        if (res.ok) window.location.reload();
    }
</script>

<div class="min-h-screen bg-gray-50/50 p-8">
    <div class="max-w-[1600px] mx-auto">
        <!-- Header -->
        <div class="mb-8 flex justify-between items-end">
            <div>
                <nav
                    class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                >
                    <a
                        href="/admin/settings"
                        class="hover:text-indigo-600 transition-colors"
                        >Paramètres</a
                    >
                    <span>/</span>
                    <span class="text-indigo-600">Gestion des locaux</span>
                </nav>
                <h1 class="text-4xl font-black text-gray-900 tracking-tight">
                    Facility Manager <span class="text-indigo-600">.</span>
                </h1>
                <p class="text-gray-500 font-medium mt-1">
                    Gérez la structure hiérarchique de votre clinique.
                </p>
            </div>

            <div class="flex gap-3">
                <a
                    href="/admin/settings"
                    class="px-6 py-3 bg-white text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all border border-gray-200 shadow-sm active:scale-95"
                >
                    Retour
                </a>
            </div>
        </div>

        <!-- Miller Columns Layout -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px]">
            <!-- Column 1: Buildings -->
            <div
                class="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden"
            >
                <div
                    class="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center"
                >
                    <h2
                        class="text-lg font-black text-gray-900 flex items-center gap-2"
                    >
                        <span class="text-xl">🏢</span> Bâtiments
                    </h2>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-2">
                    {#each hierarchy as building}
                        <div
                            role="button"
                            tabindex="0"
                            onclick={() => {
                                selectedBuildingId = building.id;
                                selectedFloorId = null;
                                selectedRoomId = null;
                            }}
                            onkeydown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    selectedBuildingId = building.id;
                                    selectedFloorId = null;
                                    selectedRoomId = null;
                                }
                            }}
                            class="w-full text-left p-5 rounded-3xl transition-all group relative cursor-pointer {selectedBuildingId ===
                            building.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-2'
                                : 'hover:bg-gray-50 text-gray-700 hover:translate-x-1'}"
                        >
                            <div class="flex justify-between items-center">
                                <div class="font-bold">{building.name}</div>
                                <div
                                    class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <button
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            buildingForm = { ...building };
                                            showBuildingModal = true;
                                        }}
                                        class="p-1.5 hover:bg-white/20 rounded-lg"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            deleteItem("building", building.id);
                                        }}
                                        class="p-1.5 hover:bg-white/20 rounded-lg text-red-100"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            <div
                                class="text-[10px] uppercase tracking-widest font-black mt-1 {selectedBuildingId ===
                                building.id
                                    ? 'text-indigo-100'
                                    : 'text-gray-400'}"
                            >
                                {building.floors.length} Étage(s)
                            </div>
                        </div>
                    {/each}

                    {#if hierarchy.length === 0}
                        <div class="text-center py-12 text-gray-400">
                            <p class="text-sm font-medium">Aucun bâtiment</p>
                        </div>
                    {/if}
                </div>

                <div class="p-4 border-t border-gray-50">
                    <button
                        onclick={() => {
                            buildingForm = { id: null, name: "", address: "" };
                            showBuildingModal = true;
                        }}
                        class="w-full py-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 transition-all uppercase tracking-widest text-xs"
                    >
                        + Ajouter Bâtiment
                    </button>
                </div>
            </div>

            <!-- Column 2: Floors -->
            <div
                class="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden {!selectedBuildingId
                    ? 'opacity-50 grayscale pointer-events-none'
                    : ''}"
            >
                <div
                    class="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center"
                >
                    <h2
                        class="text-lg font-black text-gray-900 flex items-center gap-2"
                    >
                        <span class="text-xl">🪜</span> Étages
                    </h2>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-2">
                    {#if selectedBuilding}
                        {#each selectedBuilding.floors as floor}
                            <div
                                role="button"
                                tabindex="0"
                                onclick={() => {
                                    selectedFloorId = floor.id;
                                    selectedRoomId = null;
                                }}
                                onkeydown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        selectedFloorId = floor.id;
                                        selectedRoomId = null;
                                    }
                                }}
                                class="w-full text-left p-5 rounded-3xl transition-all group relative cursor-pointer {selectedFloorId ===
                                floor.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-2'
                                    : 'hover:bg-gray-50 text-gray-700 hover:translate-x-1'}"
                            >
                                <div class="flex justify-between items-center">
                                    <div class="font-bold">{floor.name}</div>
                                    <div
                                        class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <button
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                floorForm = { ...floor };
                                                showFloorModal = true;
                                            }}
                                            class="p-1.5 hover:bg-white/20 rounded-lg"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                deleteItem("floor", floor.id);
                                            }}
                                            class="p-1.5 hover:bg-white/20 rounded-lg text-red-100"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div
                                    class="text-[10px] uppercase tracking-widest font-black mt-1 {selectedFloorId ===
                                    floor.id
                                        ? 'text-indigo-100'
                                        : 'text-gray-400'}"
                                >
                                    Level {floor.level_number} • {floor.rooms
                                        .length} Salle(s)
                                </div>
                            </div>
                        {/each}

                        {#if selectedBuilding.floors.length === 0}
                            <div class="text-center py-12 text-gray-400">
                                <p class="text-sm font-medium">
                                    Aucun étage défini
                                </p>
                            </div>
                        {/if}
                    {:else}
                        <div
                            class="h-full flex flex-col items-center justify-center text-center p-8 opacity-40"
                        >
                            <span class="text-4xl mb-4">👈</span>
                            <p class="font-bold text-gray-500">
                                Sélectionnez un bâtiment
                            </p>
                        </div>
                    {/if}
                </div>

                <div class="p-4 border-t border-gray-50">
                    <button
                        onclick={() => {
                            floorForm = {
                                id: null,
                                buildingId: selectedBuildingId,
                                name: "",
                                levelNumber: 0,
                            };
                            showFloorModal = true;
                        }}
                        class="w-full py-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 transition-all uppercase tracking-widest text-xs"
                    >
                        + Ajouter Étage
                    </button>
                </div>
            </div>

            <!-- Column 3: Rooms -->
            <div
                class="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col overflow-hidden {!selectedFloorId
                    ? 'opacity-50 grayscale pointer-events-none'
                    : ''}"
            >
                <div
                    class="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center"
                >
                    <h2
                        class="text-lg font-black text-gray-900 flex items-center gap-2"
                    >
                        <span class="text-xl">📍</span> Salles
                    </h2>
                </div>

                <div class="flex-1 overflow-y-auto p-4 space-y-2">
                    {#if selectedFloor}
                        {#each selectedFloor.rooms as room}
                            <div
                                class="w-full text-left p-5 rounded-3xl transition-all group bg-gray-50 border border-gray-100"
                            >
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-sm"
                                            style="background-color: {room.color}20; color: {room.color}"
                                        >
                                            {#if room.type === "consultation"}🛋️{:else if room.type === "surgery"}💉{:else if room.type === "xray"}☢️{:else}🚪{/if}
                                        </div>
                                        <div>
                                            <div
                                                class="font-bold text-gray-900"
                                            >
                                                {room.name}
                                            </div>
                                            <div
                                                class="text-[9px] uppercase tracking-widest font-black text-gray-400"
                                            >
                                                {room.type}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex gap-2">
                                        <button
                                            onclick={() => {
                                                roomForm = { ...room };
                                                showRoomModal = true;
                                            }}
                                            class="p-1.5 hover:bg-white rounded-lg border border-gray-100 shadow-sm"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onclick={() =>
                                                deleteItem("room", room.id)}
                                            class="p-1.5 hover:bg-red-50 rounded-lg border border-red-50 text-red-500 shadow-sm"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/each}

                        {#if selectedFloor.rooms.length === 0}
                            <div class="text-center py-12 text-gray-400">
                                <p class="text-sm font-medium">
                                    Aucune salle définie
                                </p>
                            </div>
                        {/if}
                    {:else}
                        <div
                            class="h-full flex flex-col items-center justify-center text-center p-8 opacity-40"
                        >
                            <span class="text-4xl mb-4">👈</span>
                            <p class="font-bold text-gray-500">
                                Sélectionnez un étage
                            </p>
                        </div>
                    {/if}
                </div>

                <div class="p-4 border-t border-gray-50">
                    <button
                        onclick={() => {
                            roomForm = {
                                id: null,
                                floorId: selectedFloorId,
                                name: "",
                                type: "consultation",
                                color: "#3B82F6",
                                is_active: 1,
                            };
                            showRoomModal = true;
                        }}
                        class="w-full py-4 bg-indigo-50 text-indigo-600 font-black rounded-2xl hover:bg-indigo-100 transition-all uppercase tracking-widest text-xs"
                    >
                        + Ajouter Salle
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modals -->
{#if showBuildingModal}
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
        transition:fade
    >
        <div
            class="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl"
            transition:fly={{ y: 20 }}
        >
            <h3 class="text-2xl font-black text-gray-900 mb-6">
                {buildingForm.id ? "Modifier" : "Ajouter"} Bâtiment
            </h3>
            <div class="space-y-4">
                <div>
                    <label
                        for="building-name"
                        class="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                        >Nom du bâtiment</label
                    >
                    <input
                        id="building-name"
                        type="text"
                        bind:value={buildingForm.name}
                        placeholder="ex: Clinique Centrale"
                        class="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div>
                    <label
                        for="building-address"
                        class="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                        >Adresse (Optionnel)</label
                    >
                    <input
                        id="building-address"
                        type="text"
                        bind:value={buildingForm.address}
                        placeholder="Adresse..."
                        class="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
            </div>
            <div class="flex gap-3 mt-10">
                <button
                    onclick={() => (showBuildingModal = false)}
                    class="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                    >Annuler</button
                >
                <button
                    onclick={saveBuilding}
                    class="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                    >Enregistrer</button
                >
            </div>
        </div>
    </div>
{/if}

{#if showFloorModal}
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
        transition:fade
    >
        <div
            class="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl"
            transition:fly={{ y: 20 }}
        >
            <h3 class="text-2xl font-black text-gray-900 mb-6">
                {floorForm.id ? "Modifier" : "Ajouter"} Étage
            </h3>
            <div class="space-y-4">
                <div>
                    <label
                        for="floor-name"
                        class="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                        >Nom de l'étage</label
                    >
                    <input
                        id="floor-name"
                        type="text"
                        bind:value={floorForm.name}
                        placeholder="ex: 1er Étage"
                        class="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div>
                    <label
                        for="floor-level"
                        class="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                        >Niveau (ex: 0, 1, 2)</label
                    >
                    <input
                        id="floor-level"
                        type="number"
                        bind:value={floorForm.levelNumber}
                        class="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
            </div>
            <div class="flex gap-3 mt-10">
                <button
                    onclick={() => (showFloorModal = false)}
                    class="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                    >Annuler</button
                >
                <button
                    onclick={saveFloor}
                    class="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                    >Enregistrer</button
                >
            </div>
        </div>
    </div>
{/if}

{#if showRoomModal}
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
        transition:fade
    >
        <div
            class="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl"
            transition:fly={{ y: 20 }}
        >
            <h3 class="text-2xl font-black text-gray-900 mb-6">
                {roomForm.id ? "Modifier" : "Ajouter"} Salle
            </h3>
            <div class="space-y-4">
                <div>
                    <label
                        for="room-name"
                        class="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                        >Nom de la salle</label
                    >
                    <input
                        id="room-name"
                        type="text"
                        bind:value={roomForm.name}
                        placeholder="ex: Box 1"
                        class="w-full px-5 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label
                            for="room-type"
                            class="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                            >Type</label
                        >
                        <select
                            id="room-type"
                            bind:value={roomForm.type}
                            class="w-full px-4 py-4 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="consultation">Consultation</option>
                            <option value="surgery">Chirurgie</option>
                            <option value="xray">Radio</option>
                            <option value="waiting">Attente</option>
                        </select>
                    </div>
                    <div>
                        <label
                            for="room-color"
                            class="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                            >Couleur</label
                        >
                        <input
                            id="room-color"
                            type="color"
                            bind:value={roomForm.color}
                            class="w-full h-[56px] bg-gray-50 border-gray-100 rounded-2xl cursor-pointer p-1"
                        />
                    </div>
                </div>
            </div>
            <div class="flex gap-3 mt-10">
                <button
                    onclick={() => (showRoomModal = false)}
                    class="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                    >Annuler</button
                >
                <button
                    onclick={saveRoom}
                    class="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                    >Enregistrer</button
                >
            </div>
        </div>
    </div>
{/if}
