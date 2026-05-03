import { browser } from '$app/environment';

export interface Column {
    id: string;
    label: string;
    visible: boolean;
    sortable: boolean;
}

export interface PatientFilters {
    search: string;
    ageRange: [number, number];
    gender: string;
    balanceStatus: 'all' | 'debtor' | 'creditor';
    rdvStatus: 'all' | 'has_rdv' | 'no_rdv';
    lastVisitRange: [string, string];
    medicalTags: string[];
}

export type SortDirection = 'asc' | 'desc' | 'none';

class PatientStore {
    // UI State
    _viewMode = $state<'grid' | 'table'>('grid');
    get viewMode() { return this._viewMode; }
    set viewMode(val) { 
        this._viewMode = val; 
        this.savePreferences();
    }
    
    isFilterPanelOpen = $state(false);
    
    // Data State
    rawPatients = $state<any[]>([]);
    
    filters = $state<PatientFilters>({
        search: '',
        ageRange: [0, 100],
        gender: '',
        balanceStatus: 'all',
        rdvStatus: 'all',
        lastVisitRange: ['', ''],
        medicalTags: []
    });

    sortKey = $state<string>('full_name');
    sortDirection = $state<SortDirection>('asc');

    // Pagination
    _pageSize = $state<number>(10);
    get pageSize() { return this._pageSize; }
    set pageSize(val) {
        this._pageSize = val;
        this.savePreferences();
    }

    // Column Configuration
    columns = $state<Column[]>([
        { id: 'index', label: '#', visible: true, sortable: false },
        { id: 'full_name', label: 'Nom Complet', visible: true, sortable: true },
        { id: 'age', label: 'Âge', visible: true, sortable: true },
        { id: 'phone', label: 'Téléphone', visible: true, sortable: false },
        { id: 'city', label: 'Ville', visible: false, sortable: true },
        { id: 'net_balance', label: 'Solde', visible: true, sortable: true },
        { id: 'last_visit', label: 'Dernière Visite', visible: true, sortable: true },
        { id: 'next_appointment', label: 'Prochain RDV', visible: true, sortable: true },
    ]);

    savedPresets = $state<{ name: string; filters: Partial<PatientFilters> }[]>([]);

    // Quick View state
    selectedPatient = $state<any | null>(null);
    isQuickViewOpen = $state(false);

    constructor() {
        if (browser) {
            this.loadPreferences();
        }
    }

    // Derived filtered and sorted list
    filteredPatients = $derived.by(() => {
        let result = [...this.rawPatients];

        // Client-side filtering (audit & fix)
        if (this.filters.search) {
            const s = this.filters.search.toLowerCase();
            result = result.filter(p => 
                p.full_name?.toLowerCase().includes(s) || 
                p.phone?.includes(s) || 
                p.city?.toLowerCase().includes(s) ||
                p.id?.toString().includes(s) ||
                (() => {
                    if (!p.custom_fields) return false;
                    try {
                        const cf = JSON.parse(p.custom_fields);
                        return Object.values(cf).some(v => 
                            String(v).toLowerCase().includes(s) ||
                            (typeof v === 'object' && v !== null && (v as any).name && String((v as any).name).toLowerCase().includes(s))
                        );
                    } catch {
                        return p.custom_fields.toLowerCase().includes(s);
                    }
                })()
            );
        }

        // Age Range Filter
        result = result.filter(p => {
            const age = p.age ?? 0;
            return age >= this.filters.ageRange[0] && age <= this.filters.ageRange[1];
        });

        // Gender Filter
        if (this.filters.gender) {
            result = result.filter(p => p.gender === this.filters.gender);
        }

        // Balance Filter
        if (this.filters.balanceStatus !== 'all') {
            result = result.filter(p => {
                const balance = p.net_balance ?? 0;
                if (this.filters.balanceStatus === 'debtor') return balance < 0;
                if (this.filters.balanceStatus === 'creditor') return balance > 0;
                return true;
            });
        }

        // RDV Filter
        if (this.filters.rdvStatus !== 'all') {
            result = result.filter(p => {
                const hasRdv = !!p.next_appointment;
                if (this.filters.rdvStatus === 'has_rdv') return hasRdv;
                if (this.filters.rdvStatus === 'no_rdv') return !hasRdv;
                return true;
            });
        }

        // Sorting
        if (this.sortKey && this.sortDirection !== 'none') {
            result.sort((a, b) => {
                const valA = a[this.sortKey];
                const valB = b[this.sortKey];
                
                if (valA === valB) return 0;
                
                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') {
                    comparison = valA.localeCompare(valB);
                } else {
                    comparison = (valA ?? 0) > (valB ?? 0) ? 1 : -1;
                }
                
                return this.sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    });

    toggleSort(key: string) {
        if (this.sortKey === key) {
            if (this.sortDirection === 'asc') this.sortDirection = 'desc';
            else if (this.sortDirection === 'desc') this.sortDirection = 'none';
            else this.sortDirection = 'asc';
        } else {
            this.sortKey = key;
            this.sortDirection = 'asc';
        }
    }

    loadPreferences() {
        const prefs = localStorage.getItem('patient_preferences');
        if (prefs) {
            try {
                const parsed = JSON.parse(prefs);
                if (parsed.viewMode) this._viewMode = parsed.viewMode;
                if (parsed.pageSize) this._pageSize = parsed.pageSize;
                if (parsed.activeColumns) {
                    this.columns.forEach(col => {
                        col.visible = parsed.activeColumns.includes(col.id);
                    });
                }
                if (parsed.savedPresets) this.savedPresets = parsed.savedPresets;
            } catch (e) {
                console.error('Failed to load preferences', e);
            }
        }
    }

    savePreferences() {
        if (!browser) return;
        const prefs = {
            viewMode: this._viewMode,
            pageSize: this._pageSize,
            activeColumns: this.columns.filter(c => c.visible).map(c => c.id),
            savedPresets: $state.snapshot(this.savedPresets)
        };
        localStorage.setItem('patient_preferences', JSON.stringify(prefs));
    }

    toggleColumn(id: string) {
        const col = this.columns.find(c => c.id === id);
        if (col) {
            col.visible = !col.visible;
            this.savePreferences();
        }
    }

    setFilter(key: keyof PatientFilters, value: any) {
        (this.filters as any)[key] = value;
    }

    resetFilters() {
        this.filters = {
            search: '',
            ageRange: [0, 100],
            gender: '',
            balanceStatus: 'all',
            rdvStatus: 'all',
            lastVisitRange: ['', ''],
            medicalTags: []
        };
    }

    savePreset(name: string) {
        this.savedPresets.push({
            name,
            filters: $state.snapshot(this.filters)
        });
        this.savePreferences();
    }

    applyPreset(preset: { name: string; filters: Partial<PatientFilters> }) {
        this.filters = { ...this.filters, ...preset.filters };
    }

    deletePreset(name: string) {
        this.savedPresets = this.savedPresets.filter(p => p.name !== name);
        this.savePreferences();
    }

    openQuickView(patient: any) {
        this.selectedPatient = patient;
        this.isQuickViewOpen = true;
    }
}

export const patientStore = new PatientStore();
