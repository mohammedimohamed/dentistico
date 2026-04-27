export const dentalColors = $state({
    SAIN: '#f1f5f9',
    CARIE: '#f87171',
    TRAITEMENT: '#60a5fa',
    ABSENT: '#e2e8f0',
    OBTURATION: '#a855f7',
    ABSCES: '#fbbf24',
    CANAL: '#a78bfa'
});

export function updateDentalColors(newColors: Partial<typeof dentalColors>) {
    Object.assign(dentalColors, newColors);
}
