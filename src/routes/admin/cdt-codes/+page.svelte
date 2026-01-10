<script lang="ts">
  import { onMount } from 'svelte';
  import { APP_CONFIG } from '$lib/config/app.config';
  import { t } from 'svelte-i18n';

  let codes = $state<any[]>([]);
  let loading = $state(true);
  let showModal = $state(false);
  let editingCode = $state<any>(null);

  let formData = $state({
    code: '',
    category: 'Restorative',
    description: '',
    default_fee: 0,
    requires_surfaces: false,
    whole_tooth_only: false,
    valid_tooth_types: 'all',
    color_code: '#3B82F6'
  });

  const categories = [
    { value: 'Diagnostic', label: $t('admin.cdt_codes.categories.Diagnostic') },
    { value: 'Preventive', label: $t('admin.cdt_codes.categories.Preventive') },
    { value: 'Restorative', label: $t('admin.cdt_codes.categories.Restorative') },
    { value: 'Crowns', label: $t('admin.cdt_codes.categories.Crowns') },
    { value: 'Endodontics', label: $t('admin.cdt_codes.categories.Endodontics') },
    { value: 'Periodontics', label: $t('admin.cdt_codes.categories.Periodontics') },
    { value: 'Prosthodontics', label: $t('admin.cdt_codes.categories.Prosthodontics') },
    { value: 'Surgery', label: $t('admin.cdt_codes.categories.Surgery') },
    { value: 'Orthodontics', label: $t('admin.cdt_codes.categories.Orthodontics') },
    { value: 'Other', label: $t('admin.cdt_codes.categories.Other') }
  ];

  const toothTypes = [
    { value: 'all', label: $t('admin.cdt_codes.tooth_types.all') },
    { value: 'anterior', label: $t('admin.cdt_codes.tooth_types.anterior') },
    { value: 'posterior', label: $t('admin.cdt_codes.tooth_types.posterior') },
    { value: 'primary', label: $t('admin.cdt_codes.tooth_types.primary') }
  ];

  async function loadCodes() {
    loading = true;
    const res = await fetch('/api/dental/cdt-codes');
    const data = await res.json();
    codes = data.codes || [];
    loading = false;
  }

  function openAddModal() {
    editingCode = null;
    formData = {
      code: '',
      category: 'Restorative',
      description: '',
      default_fee: 0,
      requires_surfaces: false,
      whole_tooth_only: false,
      valid_tooth_types: 'all',
      color_code: '#3B82F6'
    };
    showModal = true;
  }

  function openEditModal(code: any) {
    editingCode = code;
    formData = {
      code: code.code,
      category: code.category,
      description: code.description,
      default_fee: code.default_fee,
      requires_surfaces: code.requires_surfaces === 1,
      whole_tooth_only: code.whole_tooth_only === 1,
      valid_tooth_types: code.valid_tooth_types || 'all',
      color_code: code.color_code
    };
    showModal = true;
  }

  async function saveCode() {
    const method = editingCode ? 'PUT' : 'POST';
    const url = editingCode
      ? `/api/admin/cdt-codes/${editingCode.code}`
      : '/api/admin/cdt-codes';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    showModal = false;
    await loadCodes();
  }

  async function deleteCode(code: string) {
    if (!confirm($t('admin.cdt_codes.confirm_delete', { values: { code } }))) return;

    await fetch(`/api/admin/cdt-codes/${code}`, { method: 'DELETE' });
    await loadCodes();
  }

  onMount(loadCodes);
</script>

<div class="p-8">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-3xl font-bold">{$t('admin.cdt_codes.title')}</h1>
      <p class="text-gray-600 mt-1">{$t('admin.cdt_codes.subtitle')}</p>
    </div>
    <button onclick={openAddModal} class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
      {$t('admin.cdt_codes.add_button')}
    </button>
  </div>

  <div class="bg-white rounded-lg shadow overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 border-b">
        <tr>
          <th class="px-4 py-3 text-left text-sm font-semibold">{$t('admin.cdt_codes.table.code')}</th>
          <th class="px-4 py-3 text-left text-sm font-semibold">{$t('admin.cdt_codes.table.category')}</th>
          <th class="px-4 py-3 text-left text-sm font-semibold">{$t('admin.cdt_codes.table.description')}</th>
          <th class="px-4 py-3 text-right text-sm font-semibold">{$t('admin.cdt_codes.table.fee')}</th>
          <th class="px-4 py-3 text-center text-sm font-semibold">{$t('admin.cdt_codes.table.surfaces')}</th>
          <th class="px-4 py-3 text-center text-sm font-semibold">{$t('admin.cdt_codes.table.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {#if loading}
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-gray-500">{$t('admin.cdt_codes.loading')}</td>
          </tr>
        {:else}
          {#each codes as code}
            <tr class="border-b hover:bg-gray-50">
              <td class="px-4 py-3 font-semibold" style="color: {code.color_code}">{code.code}</td>
              <td class="px-4 py-3 text-sm">{code.category}</td>
              <td class="px-4 py-3 text-sm">{code.description}</td>
              <td class="px-4 py-3 text-right font-semibold text-green-600">
                {APP_CONFIG.currencySymbol}{code.default_fee.toFixed(2)}
              </td>
              <td class="px-4 py-3 text-center">
                {#if code.requires_surfaces}
                  <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{$t('admin.cdt_codes.modal.requires_surfaces')}</span>
                {:else}
                  <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{$t('common.no')}</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  onclick={() => openEditModal(code)}
                  class="text-blue-600 hover:underline text-sm mr-2"
                >
                  {$t('admin.cdt_codes.table.edit')}
                </button>
                <button
                  onclick={() => deleteCode(code.code)}
                  class="text-red-600 hover:underline text-sm"
                >
                  {$t('admin.cdt_codes.table.delete')}
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<!-- Add/Edit Modal -->
{#if showModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
      <h2 class="text-2xl font-bold mb-4">
        {editingCode ? $t('admin.cdt_codes.modal.edit_title') : $t('admin.cdt_codes.modal.add_title')}
      </h2>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">{$t('admin.cdt_codes.modal.code_label')}</label>
            <input
              type="text"
              bind:value={formData.code}
              class="w-full border rounded px-3 py-2"
              placeholder={$t('admin.cdt_codes.modal.code_placeholder')}
              disabled={!!editingCode}
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{$t('admin.cdt_codes.modal.category_label')}</label>
            <select bind:value={formData.category} class="w-full border rounded px-3 py-2">
              {#each categories as cat}
                <option value={cat.value}>{cat.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{$t('admin.cdt_codes.modal.description_label')}</label>
          <input
            type="text"
            bind:value={formData.description}
            class="w-full border rounded px-3 py-2"
            placeholder={$t('admin.cdt_codes.modal.description_placeholder')}
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">{$t('admin.cdt_codes.modal.fee_label')}</label>
            <input
              type="number"
              step="0.01"
              bind:value={formData.default_fee}
              class="w-full border rounded px-3 py-2"
              placeholder={$t('admin.cdt_codes.modal.fee_placeholder')}
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">{$t('admin.cdt_codes.modal.color_label')}</label>
            <input
              type="color"
              bind:value={formData.color_code}
              class="w-full border rounded px-3 py-2 h-10"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{$t('admin.cdt_codes.modal.tooth_types_label')}</label>
          <select bind:value={formData.valid_tooth_types} class="w-full border rounded px-3 py-2">
            {#each toothTypes as type}
              <option value={type.value}>{type.label}</option>
            {/each}
          </select>
        </div>

        <div class="flex gap-4">
          <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={formData.requires_surfaces} />
            <span class="text-sm">{$t('admin.cdt_codes.modal.requires_surfaces')}</span>
          </label>

          <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={formData.whole_tooth_only} />
            <span class="text-sm">{$t('admin.cdt_codes.modal.whole_tooth_only')}</span>
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <button
          onclick={() => showModal = false}
          class="px-4 py-2 border rounded hover:bg-gray-50"
        >
          {$t('admin.cdt_codes.modal.cancel')}
        </button>
        <button
          onclick={saveCode}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {editingCode ? $t('admin.cdt_codes.modal.update') : $t('admin.cdt_codes.modal.create')} {$t('admin.cdt_codes.table.code')}
        </button>
      </div>
    </div>
  </div>
{/if}