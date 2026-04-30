import sys, re

with open('src/routes/doctor/patients/+page.svelte', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    '🎴': '<LayoutGrid size={20} />',
    '📊': '<List size={20} />',
    '🔍': '<Search size={20} />',
    '⚡': '<Filter size={20} />',
    '⚙️': '<Settings size={20} />',
    '💾': '<Save size={18} />',
    '🔄': '<RotateCcw size={18} />',
    '🎐': '<Wind size={48} class="text-gray-300 mx-auto" />',
    '👨‍⚕️': '<User size={24} />',
    '👩‍⚕️': '<User size={24} />',
    '👤': '<User size={24} />',
    '📞': '<Phone size={16} />',
    '📅': '<Calendar size={16} />',
    '👁️': '<Eye size={20} />',
    '🔼': '<ChevronUp size={14} />',
    '🔽': '<ChevronDown size={14} />',
    '↕️': '<ChevronsUpDown size={14} />',
    '⬅️': '<ChevronLeft size={20} />',
    '➡️': '<ChevronRight size={20} />',
    '<span class="text-2xl grayscale group-focus-within:grayscale-0 transition-all">': '<span class="text-gray-400 group-focus-within:text-indigo-500 transition-all">',
    '<span class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">': '<span class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-indigo-500">',
    '<span class="text-6xl mb-6 block">': '<div class="mb-6 flex justify-center">',
    '<span class="text-lg">': '<span class="flex items-center">',
}

for old, new in replacements.items():
    content = content.replace(old, new)

import_statement = '''import { LayoutGrid, List, Search, Filter, Settings, Save, RotateCcw, User, Phone, Calendar, Eye, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Wind, Download } from 'lucide-svelte';
    import { downloadCSV } from "$lib/utils/export";
'''

content = content.replace('import QuickViewModal from "$lib/components/patients/QuickViewModal.svelte";', 'import QuickViewModal from "$lib/components/patients/QuickViewModal.svelte";\n    ' + import_statement)

content = content.replace('<span class="text-xs"><Search size={20} /></span>', '<Search size={16} />')
content = content.replace('<span class="bg-white/20 w-6 h-6 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform">+</span>', '')

export_btn = '''        <div class="flex items-center gap-4 w-full lg:w-auto">
            <button onclick={() => downloadCSV(patientStore.filteredPatients, "patients_export")} class="bg-white border-2 border-gray-100 text-gray-700 px-6 py-3 rounded-2xl hover:bg-gray-50 hover:border-gray-200 font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap">
                <Download size={18} />
                Exporter
            </button>'''
content = content.replace('<div class="flex items-center gap-4 w-full lg:w-auto">', export_btn)

with open('src/routes/doctor/patients/+page.svelte', 'w', encoding='utf-8') as f:
    f.write(content)
