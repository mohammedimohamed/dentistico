<script lang="ts">
    import { onMount } from "svelte";
    import CarteDentaireV2 from "./CarteDentaireV2.svelte";
    import ToothEditPanelV2 from "./ToothEditPanelV2.svelte";
    import FullTreatmentForm from "./FullTreatmentForm.svelte";
    import ClinicalWorkstation from "./ClinicalWorkstation.svelte";
    import { invalidateAll } from "$app/navigation";
    import { Activity } from "lucide-svelte";

    interface Props {
        patientId: number;
        annotations: any;
        treatments: any[];
        providerId?: number;
    }

    let { patientId, annotations, treatments, providerId = 0 }: Props = $props();
 
    let selectedTeethFdis = $state<number[]>([]);
    let showEditPanel = $state(false);
    let showTreatmentForm = $state(false);
    let editingTreatment = $state<any>(null);

    // Derived single FDI for the edit panel
    const selectedFdi = $derived(selectedTeethFdis.length === 1 ? selectedTeethFdis[0] : null);
 
    function handleToothSelect(fdi: number, event?: MouseEvent) {
        if (event?.ctrlKey || event?.metaKey) {
            if (selectedTeethFdis.includes(fdi)) {
                selectedTeethFdis = selectedTeethFdis.filter(id => id !== fdi);
            } else {
                selectedTeethFdis = [...selectedTeethFdis, fdi];
            }
            showEditPanel = false;
        } else {
            selectedTeethFdis = [fdi];
            showEditPanel = true;
        }
    }

    async function createBridge() {
        const bridgeId = crypto.randomUUID();
        const promises = selectedTeethFdis.map(fdi => {
            const annotation = annotations[fdi] || {};
            // If the tooth is missing, it's a 'Pontique', otherwise it's a 'Pilier'
            const status = annotation.globalStatus || annotation.global_status || '';
            const newStatus = (status.toLowerCase().includes('absent')) ? 'Pontique' : 'Pilier';
            
            return handleSaveAnnotation({
                fdi,
                zones: annotation.zones || {},
                notes: annotation.notes || '',
                globalStatus: newStatus,
                bridgeId: bridgeId
            });
        });

        await Promise.all(promises);
        selectedTeethFdis = []; // Reset selection
    }

    async function handleDeleteBridge(bridgeId: string) {
        if (!confirm("Voulez-vous vraiment supprimer ce bridge ? Les dents redeviendront individuelles.")) return;
        
        const teethToUpdate = Object.entries(annotations)
            .filter(([_, data]: [any, any]) => data.bridge_id === bridgeId)
            .map(([fdiStr, _]) => parseInt(fdiStr));

        const promises = teethToUpdate.map(fdiToUpdate => {
            const data = annotations[fdiToUpdate];
            const status = data.global_status || data.globalStatus || '';
            const newStatus = (status === 'Pontique' || status === 'Pontic') ? 'Absent' : 'Sain';
            
            return handleSaveAnnotation({
                fdi: fdiToUpdate,
                zones: data.zones || {},
                notes: data.notes || '',
                globalStatus: newStatus,
                bridgeId: null
            });
        });

        await Promise.all(promises);
    }

    async function handleSaveAnnotation(data: any) {
        try {
            const res = await fetch(`/api/patients/${patientId}/dental/annotations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                await invalidateAll();
            }
        } catch (e) {
            console.error("Failed to save annotation", e);
        }
    }

    async function handleSaveTreatment(data: any) {
        try {
            const method = editingTreatment ? "PUT" : "POST";
            const url = editingTreatment 
                ? `/api/dental/treatments/${editingTreatment.id}`
                : "/api/dental/treatments";
            
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, patient_id: patientId }),
            });
            if (res.ok) {
                await invalidateAll();
                showTreatmentForm = false;
                editingTreatment = null;
            }
        } catch (e) {
            console.error("Failed to save treatment", e);
        }
    }

    function openPlanning(fdi: number) {
        selectedTeethFdis = [fdi];
        showEditPanel = false;
        showTreatmentForm = true;
    }

    function handleEditTreatment(treatment: any) {
        editingTreatment = treatment;
        const fdi = parseInt(treatment.tooth_number);
        selectedTeethFdis = [fdi];
        showTreatmentForm = true;
    }
</script>

<div class="odontogramme-pro-wrapper w-full">
    {#if selectedTeethFdis.length >= 2}
        <div class="flex justify-end mb-4 animate-in fade-in slide-in-from-right-4">
            <button 
                onclick={createBridge}
                class="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
            >
                <Activity class="w-4 h-4" /> Créer un Bridge ({selectedTeethFdis.length} dents)
            </button>
        </div>
    {/if}

    <CarteDentaireV2 
        allAnnotations={annotations} 
        {treatments}
        {selectedTeethFdis}
        onToothSelect={handleToothSelect}
        onEditTreatment={handleEditTreatment}
    />

    {#if showEditPanel && selectedFdi}
        <ToothEditPanelV2 
            fdi={selectedFdi} 
            annotations={annotations[selectedFdi] || {}}
            onSave={handleSaveAnnotation}
            onPlanTreatment={openPlanning}
            onDeleteBridge={handleDeleteBridge}
            onClose={() => showEditPanel = false}
        />
    {/if}

    {#if showTreatmentForm && selectedFdi}
        <FullTreatmentForm 
            {patientId}
            toothNumber={selectedFdi.toString()}
            initialData={editingTreatment}
            onSave={handleSaveTreatment}
            onClose={() => {
                showTreatmentForm = false;
                editingTreatment = null;
            }}
        />
    {/if}

    <!-- Clinical Workstation: Zero-friction treatment entry -->
    <div class="mt-8">
        <ClinicalWorkstation
            {patientId}
            {providerId}
            selectedFdi={selectedFdi}
        />
    </div>
</div>
