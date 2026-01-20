
// Map FDI tooth numbers to French anatomical names
export function getToothName(fdiNumber: string | number): string {
    const num = parseInt(fdiNumber.toString());

    // Quadrants
    const quadrant = Math.floor(num / 10);
    const tooth = num % 10;

    const quadrants: Record<number, string> = {
        1: "supérieure droite",
        2: "supérieure gauche",
        3: "inférieure gauche",
        4: "inférieure droite",
        5: "supérieure droite (lait)",
        6: "supérieure gauche (lait)",
        7: "inférieure gauche (lait)",
        8: "inférieure droite (lait)"
    };

    const teeth: Record<number, string> = {
        1: "Incisive centrale",
        2: "Incisive latérale",
        3: "Canine",
        4: "Première prémolaire",
        5: "Deuxième prémolaire",
        6: "Première molaire",
        7: "Deuxième molaire",
        8: "Troisième molaire (Sagesse)"
    };

    // Primary teeth (milk teeth)
    const primaryTeeth: Record<number, string> = {
        1: "Incisive centrale",
        2: "Incisive latérale",
        3: "Canine",
        4: "Première molaire",
        5: "Deuxième molaire"
    };

    if (quadrant >= 5) {
        return `${primaryTeeth[tooth] || 'Dent inconnue'} ${quadrants[quadrant]}`;
    }

    return `${teeth[tooth] || 'Dent inconnue'} ${quadrants[quadrant]}`;
}
