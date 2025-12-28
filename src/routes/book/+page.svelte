<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();
    
    let loading = $state(false);
    let bookingFor = $state('self');
    
    // Set min date to today for the datetime input
    const today = new Date().toISOString().slice(0, 16);
</script>

<div class="min-h-screen bg-slate-50 py-20 px-6">
    <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-12">
            <a href="/" class="text-2xl font-bold tracking-tight text-teal-700 inline-block mb-6">Dentistico</a>
            <h1 class="text-4xl font-bold text-slate-900 mb-4">Book Your Appointment</h1>
            <p class="text-slate-600">Take the first step towards a healthier, brighter smile.</p>
        </div>

        <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            {#if form?.success}
                <div class="p-12 text-center">
                    <div class="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                        ✓
                    </div>
                    <h2 class="text-2xl font-bold text-slate-900 mb-2">Request Received!</h2>
                    <p class="text-slate-600 mb-8">
                        Thank you for choosing Dentistico. Our team will review your request and contact you shortly to confirm the appointment.
                    </p>
                    <a href="/" class="inline-block bg-teal-600 text-white px-8 py-3 rounded-full font-bold hover:bg-teal-700 transition-all shadow-lg">
                        Back to Home
                    </a>
                </div>
            {:else}
                <form method="POST" use:enhance={() => {
                    loading = true;
                    return async ({ update }) => {
                        loading = false;
                        update();
                    };
                }} class="p-8 md:p-12">
                    {#if form?.error}
                        <div class="mb-8 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm">
                            {form.error}
                        </div>
                    {/if}

                    <div class="mb-10 p-6 bg-teal-50 rounded-2xl border border-teal-100 flex items-center justify-between">
                        <span class="text-teal-900 font-bold">Who are you booking for?</span>
                        <div class="flex bg-white p-1 rounded-full shadow-inner">
                            <button type="button" 
                                class="px-6 py-2 rounded-full text-sm font-bold transition-all {bookingFor === 'self' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500'}"
                                onclick={() => bookingFor = 'self'}>
                                Myself
                            </button>
                            <button type="button" 
                                class="px-6 py-2 rounded-full text-sm font-bold transition-all {bookingFor === 'other' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500'}"
                                onclick={() => bookingFor = 'other'}>
                                Someone Else
                            </button>
                        </div>
                        <input type="hidden" name="booking_for" value={bookingFor} />
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">
                        <!-- Left Column: Requester Info -->
                        <div class="space-y-6">
                            <h3 class="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">
                                {bookingFor === 'self' ? 'Personal Details' : 'Your Information (Requester)'}
                            </h3>
                            
                            <div>
                                <label for="full_name" class="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                                <input type="text" name="full_name" id="full_name" required 
                                    class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                    placeholder="Enter your full name" />
                            </div>

                            <div>
                                <label for="email" class="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                                <input type="email" name="email" id="email" required 
                                    class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                    placeholder="your@email.com" />
                            </div>

                            <div>
                                <label for="phone" class="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                                <input type="tel" name="phone" id="phone" required 
                                    class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                    placeholder="e.g. +1 (555) 000-0000" />
                            </div>

                            {#if bookingFor === 'self'}
                                <div>
                                    <label for="date_of_birth" class="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                                    <input type="date" name="date_of_birth" id="date_of_birth" required 
                                        class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                                </div>
                            {/if}
                        </div>

                        <!-- Right Column: Patient or Appointment Info -->
                        <div class="space-y-6">
                            {#if bookingFor === 'other'}
                                <h3 class="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Patient Information</h3>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="col-span-2">
                                        <label for="patient_name" class="block text-sm font-semibold text-slate-700 mb-2">Patient Full Name</label>
                                        <input type="text" name="patient_name" id="patient_name" required 
                                            class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                            placeholder="Patient's name" />
                                    </div>
                                    <div>
                                        <label for="patient_dob" class="block text-sm font-semibold text-slate-700 mb-2">Patient DOB</label>
                                        <input type="date" name="patient_dob" id="patient_dob" required 
                                            class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label for="relationship" class="block text-sm font-semibold text-slate-700 mb-2">Relationship</label>
                                        <select name="relationship" id="relationship" required 
                                            class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all">
                                            <option value="child">Child</option>
                                            <option value="spouse">Spouse</option>
                                            <option value="parent">Parent</option>
                                            <option value="friend">Friend</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="h-px bg-slate-100 my-6"></div>
                            {/if}

                            <h3 class="text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">Schedule</h3>

                            <div>
                                <label for="doctor_id" class="block text-sm font-semibold text-slate-700 mb-2">Select Specialist</label>
                                <select name="doctor_id" id="doctor_id" required 
                                    class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all">
                                    <option value="">Choose a doctor...</option>
                                    {#each data.doctors as doctor}
                                        <option value={doctor.id}>{doctor.full_name}</option>
                                    {/each}
                                </select>
                            </div>

                            <div>
                                <label for="appointment_type" class="block text-sm font-semibold text-slate-700 mb-2">Service Type</label>
                                <select name="appointment_type" id="appointment_type" required 
                                    class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all">
                                    <option value="consultation">Initial Consultation</option>
                                    <option value="checkup">Routine Checkup</option>
                                    <option value="cleaning">Dental Cleaning</option>
                                    <option value="cosmetic">Cosmetic Dentistry</option>
                                    <option value="emergency">Emergency Dental Care</option>
                                </select>
                            </div>

                            <div>
                                <label for="start_time" class="block text-sm font-semibold text-slate-700 mb-2">Preferred Date & Time</label>
                                <input type="datetime-local" name="start_time" id="start_time" min={today} required 
                                    class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" />
                            </div>

                            <div>
                                <label for="notes" class="block text-sm font-semibold text-slate-700 mb-2">Additional Notes (Optional)</label>
                                <textarea name="notes" id="notes" rows="1" 
                                    class="w-full px-4 py-3 rounded-xl border-slate-200 border bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
                                    placeholder="Reason for visit..."></textarea>
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        class="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-teal-700 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Processing...' : 'Confirm Request'}
                    </button>
                    
                    <p class="text-center text-xs text-slate-400 mt-6 italic">
                        By booking, you agree to our terms of service and privacy policy.
                    </p>
                </form>
            {/if}
        </div>

        <!-- Support Info -->
        <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-sm">
            <div>
                <span class="block text-teal-600 font-bold mb-1">Call Us</span>
                <span class="text-slate-600">+1 (555) 000-1234</span>
            </div>
            <div>
                <span class="block text-teal-600 font-bold mb-1">Email Us</span>
                <span class="text-slate-600">hello@dentistico.com</span>
            </div>
            <div>
                <span class="block text-teal-600 font-bold mb-1">Emergency</span>
                <span class="text-slate-600">24/7 Support Line</span>
            </div>
        </div>
    </div>
</div>
