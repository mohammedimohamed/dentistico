// Universal Numbering System
export const ADULT_TEETH_UNIVERSAL = [
    // Upper Right
    1, 2, 3, 4, 5, 6, 7, 8,
    // Upper Left
    9, 10, 11, 12, 13, 14, 15, 16,
    // Lower Left
    17, 18, 19, 20, 21, 22, 23, 24,
    // Lower Right
    25, 26, 27, 28, 29, 30, 31, 32
];

export const PEDIATRIC_TEETH_UNIVERSAL = [
    // Upper Right
    'A', 'B', 'C', 'D', 'E',
    // Upper Left
    'F', 'G', 'H', 'I', 'J',
    // Lower Left
    'K', 'L', 'M', 'N', 'O',
    // Lower Right
    'P', 'Q', 'R', 'S', 'T'
];

// FDI (International) Numbering System
export const ADULT_TEETH_FDI = [
    // Upper Right (Quadrant 1)
    18, 17, 16, 15, 14, 13, 12, 11,
    // Upper Left (Quadrant 2)
    21, 22, 23, 24, 25, 26, 27, 28,
    // Lower Left (Quadrant 3)
    38, 37, 36, 35, 34, 33, 32, 31,
    // Lower Right (Quadrant 4)
    48, 47, 46, 45, 44, 43, 42, 41
];

export const PEDIATRIC_TEETH_FDI = [
    // Upper Right (Quadrant 5)
    55, 54, 53, 52, 51,
    // Upper Left (Quadrant 6)
    61, 62, 63, 64, 65,
    // Lower Left (Quadrant 7)
    75, 74, 73, 72, 71,
    // Lower Right (Quadrant 8)
    85, 84, 83, 82, 81
];

// Tooth surfaces
export const SURFACES = ['M', 'O', 'D', 'B', 'L'] as const;

// Treatment types
export const TREATMENT_TYPES = [
    { id: 'cavity', label: 'Cavity', color: '#DC2626' },
    { id: 'filling', label: 'Filling', color: '#2563EB' },
    { id: 'crown', label: 'Crown', color: '#7C3AED' },
    { id: 'extraction', label: 'Extraction', color: '#000000' },
    { id: 'root_canal', label: 'Root Canal', color: '#EA580C' },
    { id: 'implant', label: 'Implant', color: '#059669' },
    { id: 'bridge', label: 'Bridge', color: '#0891B2' },
    { id: 'sealant', label: 'Sealant', color: '#65A30D' }
] as const;

// Treatment status colors
export const STATUS_COLORS = {
    existing: '#3B82F6',    // Blue - work from previous dentist
    completed: '#10B981',   // Green - work done here
    planned: '#EF4444'      // Red - treatment planned
} as const;

// Age-based tooth eruption chart (simplified)
export const ERUPTION_AGES = {
    // Primary teeth erupt 6-33 months
    primary_eruption: { min: 6, max: 33 },
    // Primary teeth shed 6-12 years
    primary_shedding: { min: 6, max: 12 },
    // Permanent teeth erupt 6-21 years
    permanent_eruption: { min: 6, max: 21 }
};

// Mapping: Which primary tooth becomes which permanent tooth
export const PRIMARY_TO_PERMANENT_MAP: Record<string, number> = {
    'A': 6, 'B': 7, 'C': 8, 'D': 9, 'E': 10,
    'F': 11, 'G': 12, 'H': 13, 'I': 14, 'J': 15,
    'K': 22, 'L': 23, 'M': 24, 'N': 25, 'O': 26,
    'P': 27, 'Q': 28, 'R': 29, 'S': 30, 'T': 31
};

// Calculate patient age in years
export function calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Determine if patient should see adult or pediatric chart by default
export function getDefaultDentitionType(age: number): 'adult' | 'pediatric' | 'mixed' {
    if (age < 6) return 'pediatric';
    if (age > 12) return 'adult';
    return 'mixed'; // Ages 6-12 need both
}
