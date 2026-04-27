/**
 * Dental Anatomy V2 Logic
 * This file drives the anatomical rendering for the interactive dental chart.
 */

export const ZONE_COLORS = {
    SAIN: '#f1f5f9',      // Slate 100
    CARIE: '#f87171',     // Red 400
    TRAITEMENT: '#60a5fa', // Blue 400 (Inferred)
    ABSENT: '#e2e8f0',    // Slate 200 (Inferred)
    OBTURATION: '#a855f7', // Purple 500 (Inferred)
    ABSCES: '#fbbf24',    // Amber 400 (Inferred)
} as const;

export type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar';

export interface ToothAnatomy {
    type: ToothType;
    roots: number;
    zones: {
        crown: string[];
        root: string[];
    };
}

/**
 * Returns the anatomical configuration for a specific tooth using FDI notation.
 * @param fdi The FDI tooth number (e.g., 18, 24, 51)
 */
export function getAnatomy(fdi: number): ToothAnatomy {
    const lastDigit = fdi % 10;
    const quadrant = Math.floor(fdi / 10);
    const isUpper = quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
    
    // Determine Type
    let type: ToothType;
    if (lastDigit <= 2) {
        type = 'incisor';
    } else if (lastDigit === 3) {
        type = 'canine';
    } else if (lastDigit === 4 || lastDigit === 5) {
        // Pediatric 4 and 5 are primary molars, but often use molar/premolar shape
        // In adult, 4 and 5 are premolars.
        type = (quadrant > 4) ? 'molar' : 'premolar';
    } else {
        type = 'molar';
    }

    // Determine Roots
    let roots = 1;
    
    // 3 roots: Upper adult molars
    const upperAdultMolars = [16, 17, 18, 26, 27, 28];
    // 2 roots: Lower adult molars and upper 1st premolars
    const twoRootTeeth = [14, 24, 36, 37, 38, 46, 47, 48];
    
    if (upperAdultMolars.includes(fdi)) {
        roots = 3;
    } else if (twoRootTeeth.includes(fdi)) {
        roots = 2;
    } else if (quadrant > 4) {
        // Pediatric logic
        if (isUpper && (lastDigit === 4 || lastDigit === 5)) {
            roots = 3; // Upper primary molars usually have 3 roots
        } else if (!isUpper && (lastDigit === 4 || lastDigit === 5)) {
            roots = 2; // Lower primary molars usually have 2 roots
        }
    }

    return {
        type,
        roots,
        zones: {
            crown: ['M', 'D', 'B', 'L', 'O'],
            root: Array.from({ length: roots }, (_, i) => `R${i + 1}`)
        }
    };
}
/**
 * Returns the full French anatomical name for a specific tooth.
 */
export function getFrenchName(fdi: number): string {
    const lastDigit = fdi % 10;
    const quadrant = Math.floor(fdi / 10);
    
    const types: Record<number, string> = {
        1: 'Incisive centrale',
        2: 'Incisive latérale',
        3: 'Canine',
        4: 'Première prémolaire',
        5: 'Deuxième prémolaire',
        6: 'Première molaire',
        7: 'Deuxième molaire',
        8: 'Troisième molaire'
    };

    const positions: Record<number, string> = {
        1: 'supérieure droite',
        2: 'supérieure gauche',
        3: 'inférieure gauche',
        4: 'inférieure droite',
        5: 'supérieure droite (temporaire)',
        6: 'supérieure gauche (temporaire)',
        7: 'inférieure gauche (temporaire)',
        8: 'inférieure droite (temporaire)'
    };

    const type = types[lastDigit] || 'Dent';
    const position = positions[quadrant] || '';

    return `${type} ${position}`.trim();
}
