export const MOCK_TEMPLATE_DATA = {
    Invoice: {
        invoice_number: 'INV-2024-001',
        date: new Date().toLocaleDateString(),
        patient_name: 'Jean Dupont',
        patient_address: '12 Avenue des Champs-Élysées',
        patient_city: '75008 Paris',
        clinic_name: 'Dentistico Clinic',
        clinic_address: '123 Boulevard Haussmann, Paris',
        currency_symbol: '€',
        total_amount: 150.00,
        is_paid: true,
        items: [
            { description: 'Consultation standard', cost: 50.00 },
            { description: 'Détartrage complet', cost: 80.00 },
            { description: 'Imagerie panoramique', cost: 20.00 }
        ]
    },
    Prescription: {
        prescription_number: 'ORD-2024-88A',
        prescription_type: 'Standard',
        date: new Date().toLocaleDateString(),
        patient_name: 'Marie Curie',
        patient_age: 45,
        doctor_name: 'Dr. Sarah Connor',
        doctor_specialties: 'Chirurgien-Dentiste, Implantologie',
        clinic_name: 'Dentistico Clinic',
        clinic_address: '123 Boulevard Haussmann, Paris',
        notes: 'Prendre les médicaments après les repas. Éviter la conduite.',
        items: [
            {
                index_plus_one: 1,
                medication_name: 'Amoxicilline',
                dosage: '1g',
                duration: '6 jours',
                instructions: '1 comprimé matin et soir pendant le repas'
            },
            {
                index_plus_one: 2,
                medication_name: 'Paracétamol',
                dosage: '1000mg',
                duration: 'Si douleur',
                instructions: 'Max 3 par jour espacés de 6h'
            },
            {
                index_plus_one: 3,
                medication_name: 'Bain de bouche Eludril',
                dosage: '15ml',
                duration: '10 jours',
                instructions: '3 fois par jour après brossage'
            }
        ]
    }
};
