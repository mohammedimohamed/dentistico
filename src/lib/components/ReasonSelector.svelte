<script lang="ts">
    import { get } from "svelte/store";
    import { t } from "svelte-i18n";

    let {
        action = "cancel",
        required = false,
        reasons = [],
        selectedReasonId = $bindable(null),
        customReason = $bindable(""),
    } = $props<{
        action: "postpone" | "cancel";
        required: boolean;
        reasons: any[];
        selectedReasonId: number | null;
        customReason: string;
    }>();

    const isCustomSelected = $derived(
        reasons.find((r: any) => r.id === selectedReasonId)?.reason_text ===
            "Custom/Other",
    );

    const label = $derived(
        action === "cancel"
            ? get(t)("journey.cancellation_reason") || "Cancellation Reason"
            : get(t)("journey.postpone_reason") || "Reason for Rescheduling",
    );
</script>

<div
    class="reason-selector mt-4 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200"
>
    <label
        class="block text-sm font-semibold text-slate-700"
        for="reason-select"
    >
        {label}
        {#if required}
            <span class="text-red-500 font-bold ml-1">*</span>
        {:else}
            <span class="text-slate-400 font-normal italic ml-1"
                >({get(t)("common.none") || "Optional"})</span
            >
        {/if}
    </label>

    <div class="relative">
        <select
            id="reason-select"
            bind:value={selectedReasonId}
            class="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none text-slate-900"
        >
            <option value={null}
                >{get(t)("journey.select_reason") ||
                    "Select a reason..."}</option
            >
            {#each reasons as reason}
                <option value={reason.id}>{reason.reason_text}</option>
            {/each}
        </select>
        <div
            class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400"
        >
            ▼
        </div>
    </div>

    {#if isCustomSelected}
        <div class="animate-in fade-in slide-in-from-top-2 duration-200">
            <textarea
                bind:value={customReason}
                placeholder={get(t)("journey.specify_reason") ||
                    "Please specify reason..."}
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] text-slate-900 placeholder:text-slate-400"
            ></textarea>
        </div>
    {/if}
</div>

<style>
    .reason-selector {
        animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
