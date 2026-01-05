export interface User {
    id: number;
    username: string;
    password_hash: string;
    full_name: string;
    role: 'doctor' | 'assistant';
}

export interface Patient {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    date_of_birth: string | null;
    primary_contract_id: number | null;
    relationship_to_primary: string | null;
    user_id: number | null;
}

export interface Appointment {
    id: number;
    patient_id: number;
    doctor_id: number | null;
    start_time: string;
    duration_minutes: number;
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
    notes: string | null;
}

export interface AppointmentWithDetails extends Appointment {
    patient_name: string;
    patient_phone: string | null;
    patient_email: string | null;
    patient_dob: string | null;
}
