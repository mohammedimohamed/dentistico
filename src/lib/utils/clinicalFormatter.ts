export interface CompositeValue {
    [key: string]: any;
}

export function formatCompositeValue(structure: string, value: any, unit: string = ''): string {
    if (!value) return '—';
    
    let parsedValue: CompositeValue;
    try {
        parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
        return String(value);
    }

    const subLabels = structure.split(',').map(s => s.trim()).filter(s => s);
    if (subLabels.length === 0) return String(value);

    // Special Case: Blood Pressure / Tension style
    const isTension = subLabels.some(label => 
        label.toLowerCase().includes('tension') || 
        label.toLowerCase().includes('systolique') || 
        label.toLowerCase().includes('diastolique')
    );

    if (isTension) {
        const values = subLabels.map(label => parsedValue[label] || '—');
        return `${values.join(' / ')}${unit ? ' ' + unit : ''}`;
    }

    // Default: Label: Val, Label: Val
    const parts = subLabels
        .filter(label => parsedValue[label] !== undefined)
        .map(label => `${label}: ${parsedValue[label]}`);
    
    return `${parts.join(', ')}${unit ? ' ' + unit : ''}`;
}

export function checkCompositeNorms(label: string, value: any, min: number | null, max: number | null): 'GOOD' | 'WARNING' | 'NEUTRAL' {
    if (min === null && max === null) return 'NEUTRAL';
    if (value === undefined || value === '' || value === null) return 'NEUTRAL';
    
    const num = parseFloat(value);
    if (isNaN(num)) return 'NEUTRAL';

    const isMinOk = min !== null ? num >= min : true;
    const isMaxOk = max !== null ? num <= max : true;

    return (isMinOk && isMaxOk) ? 'GOOD' : 'WARNING';
}
