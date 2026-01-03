<script lang="ts">
    import type { PageData } from './$types';
    let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Users</h3>
            <p class="mt-2 text-3xl font-bold text-indigo-600">--</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">System Status</h3>
            <p class="mt-2 text-3xl font-bold text-green-600">Online</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">DB Version</h3>
            <p class="mt-2 text-3xl font-bold text-gray-900">1.2.0</p>
        </div>
    </div>

    <div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <h2 class="text-lg font-bold text-gray-900 mb-4">Welcome to the Command Center</h2>
        <p class="text-gray-600 max-w-2xl mx-auto">
            From here you can manage staff accounts, adjust global settings, and monitor system-wide inventory.
        </p>
        <div class="mt-6">
            <a href="/admin/users" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                Go to User Management
            </a>
        </div>
    </div>
</div>
