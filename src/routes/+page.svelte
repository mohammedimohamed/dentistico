<script>
    import { onMount } from 'svelte';

    let scrolled = false;
    let observer;

    onMount(() => {
        const handleScroll = () => {
            scrolled = window.scrollY > 20;
        };
        window.addEventListener('scroll', handleScroll);

        // Intersection Observer for scroll animations
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (observer) observer.disconnect();
        };
    });

    const services = [
        {
            title: 'General Dentistry',
            desc: 'Comprehensive exams, cleanings, and preventative care for all ages.',
            img: '/service-general.png'
        },
        {
            title: 'Cosmetic Dentistry',
            desc: 'Veneers, whitening, and smile makeovers to boost your confidence.',
            img: '/service-cosmetic.png'
        },
        {
            title: 'Orthodontics',
            desc: 'Modern solutions like Invisalign and traditional braces for a perfect smile.',
            img: '/service-ortho.png'
        }
    ];
</script>

<div class="min-h-screen">
    <!-- Navigation -->
    <nav class="fixed top-0 w-full z-50 transition-all duration-300 {scrolled ? 'glass-nav py-3' : 'bg-transparent py-6'}">
        <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <span class="text-2xl font-bold tracking-tight text-teal-700">Dentistico</span>
            </div>
            
            <div class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                <a href="#home" class="hover:text-teal-600 transition-colors">Home</a>
                <a href="#services" class="hover:text-teal-600 transition-colors">Services</a>
                <a href="#about" class="hover:text-teal-600 transition-colors">About</a>
                <a href="#contact" class="hover:text-teal-600 transition-colors">Contact</a>
            </div>

                <div class="flex items-center gap-4">
                <a href="/login" class="text-sm font-medium text-teal-700 hover:text-teal-800">Login</a>
                <a href="/book" class="bg-teal-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-teal-700 transition-all shadow-md hover:shadow-lg">
                    Book Now
                </a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="home" class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden hero-gradient">
        <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div class="reveal-up">
                <span class="inline-block px-4 py-1.5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold uppercase tracking-wider mb-6">
                    Professional Dental Care
                </span>
                <h1 class="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] mb-8">
                    Your Smile is Our <span class="text-teal-600">Greatest Passion</span>
                </h1>
                <p class="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
                    Experience state-of-the-art dentistry in a warm, welcoming environment. We combine technology with compassion for your perfect smile.
                </p>
                <div class="flex flex-wrap gap-4">
                    <a href="/book" class="bg-teal-600 text-white px-8 py-4 rounded-full font-bold hover:bg-teal-700 transition-all shadow-xl hover:scale-105">
                        Experience Dentistico
                    </a>
                    <div class="flex items-center gap-3 px-6">
                        <div class="flex -space-x-2">
                            <div class="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                                <img src="https://i.pravatar.cc/100?u=1" alt="user" />
                            </div>
                            <div class="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                                <img src="https://i.pravatar.cc/100?u=2" alt="user" />
                            </div>
                        </div>
                        <span class="text-sm font-medium text-slate-600">Loved by 2k+ Patients</span>
                    </div>
                </div>
            </div>
            
            <div class="relative reveal-up delay-200">
                <div class="relative rounded-3xl overflow-hidden shadow-2xl skew-y-1">
                    <img src="/hero.png" alt="Modern Clinic" class="w-full h-auto" />
                </div>
                <!-- Decorative Elements -->
                <div class="absolute -bottom-6 -left-6 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl"></div>
                <div class="absolute -top-6 -right-6 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
            </div>
        </div>
    </section>

    <!-- Services Section -->
    <section id="services" class="py-24 bg-white">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center mb-16 reveal-up">
                <h2 class="text-4xl font-bold text-slate-900 mb-4">Our Specialized Services</h2>
                <div class="w-20 h-1.5 bg-teal-500 mx-auto rounded-full mb-6"></div>
                <p class="text-slate-600 max-w-2xl mx-auto">
                    We offer a wide range of dental treatments tailored to your unique needs, from routine checkups to specialized procedures.
                </p>
            </div>

            <div class="grid md:grid-cols-3 gap-8">
                {#each services as service, i}
                    <div class="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-teal-200 transition-all duration-300 hover:shadow-xl reveal-up" style="transition-delay: {i * 100}ms">
                        <div class="w-full h-48 rounded-2xl overflow-hidden mb-6">
                            <img src={service.img} alt={service.title} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <h3 class="text-xl font-bold text-slate-900 mb-3">{service.title}</h3>
                        <p class="text-slate-600 text-sm leading-relaxed mb-6">{service.desc}</p>
                        <a href="#services" class="text-teal-600 font-bold text-sm inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                            Learn More <span>→</span>
                        </a>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section id="about" class="py-24 bg-slate-50 overflow-hidden">
        <div class="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
            <div class="grid grid-cols-2 gap-4 reveal-up">
                <div class="space-y-4">
                    <div class="rounded-2xl overflow-hidden shadow-lg h-60">
                        <img src="/about-interior.png" class="w-full h-full object-cover" alt="Clinic Interior" />
                    </div>
                    <div class="rounded-2xl overflow-hidden shadow-lg h-40 bg-teal-600 flex items-center justify-center text-white text-center p-6">
                        <div>
                            <div class="text-3xl font-bold mb-1">15+</div>
                            <div class="text-xs uppercase font-bold tracking-widest opacity-80">Years Experience</div>
                        </div>
                    </div>
                </div>
                <div class="space-y-4 pt-12">
                    <div class="rounded-2xl overflow-hidden shadow-lg h-40 bg-slate-900 flex items-center justify-center text-white text-center p-6">
                         <div>
                            <div class="text-3xl font-bold mb-1">99%</div>
                            <div class="text-xs uppercase font-bold tracking-widest opacity-80">Happy Patients</div>
                        </div>
                    </div>
                    <div class="rounded-2xl overflow-hidden shadow-lg h-60">
                        <img src="/service-general.png" class="w-full h-full object-cover" alt="Patient care" />
                    </div>
                </div>
            </div>

            <div class="reveal-up">
                <h2 class="text-4xl font-bold text-slate-900 mb-6 leading-tight">Why Choose Dentistico?</h2>
                <p class="text-lg text-slate-600 mb-8 leading-relaxed">
                    We believe that dental care should be an experience you look forward to. Our team of experts is dedicated to providing pain-free, efficient, and aesthetic results for every patient.
                </p>
                <div class="space-y-6">
                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                            <span class="text-xl">✨</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-900 mb-1">Advanced Technology</h4>
                            <p class="text-sm text-slate-500">We use the latest 3D imaging and laser technology for precision.</p>
                        </div>
                    </div>
                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                            <span class="text-xl">🤝</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-900 mb-1">Personalized Care</h4>
                            <p class="text-sm text-slate-500">Every treatment plan is customized to your specific goals and budget.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer id="contact" class="bg-slate-900 text-slate-400 py-20">
        <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
            <div class="col-span-1 md:col-span-1">
                <div class="text-2xl font-bold text-white mb-6">Dentistico</div>
                <p class="text-sm leading-relaxed mb-6">
                    Redefining dentistry with technology and heart. Your perfect smile starts here.
                </p>
                <div class="flex gap-4">
                    <!-- Social icons placeholder -->
                    <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-teal-600 transition-colors cursor-pointer">f</div>
                    <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-teal-600 transition-colors cursor-pointer">i</div>
                </div>
            </div>

            <div>
                <h4 class="text-white font-bold mb-6">Quick Links</h4>
                <ul class="space-y-4 text-sm">
                    <li><a href="#home" class="hover:text-teal-400 transition-colors">Home</a></li>
                    <li><a href="#services" class="hover:text-teal-400 transition-colors">Services</a></li>
                    <li><a href="#about" class="hover:text-teal-400 transition-colors">About</a></li>
                    <li><a href="/login" class="hover:text-teal-400 transition-colors">Patient Login</a></li>
                </ul>
            </div>

            <div>
                <h4 class="text-white font-bold mb-6">Contact Us</h4>
                <ul class="space-y-4 text-sm">
                    <li class="flex items-start gap-3">
                        <span>📍</span>
                        123 Dental Street, Medical District, NY 10001
                    </li>
                    <li class="flex items-start gap-3">
                        <span>📞</span>
                        +1 (555) 000-1234
                    </li>
                    <li class="flex items-start gap-3">
                        <span>✉️</span>
                        hello@dentistico.com
                    </li>
                </ul>
            </div>

            <div>
                <h4 class="text-white font-bold mb-6">Newsletter</h4>
                <p class="text-sm mb-6">Get dental health tips and updates.</p>
                <div class="flex">
                    <input type="email" placeholder="Email" class="bg-slate-800 border-none rounded-l-lg px-4 py-2 text-sm w-full focus:ring-1 focus:ring-teal-500 outline-none" />
                    <button class="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-r-lg text-sm font-bold transition-colors">→</button>
                </div>
            </div>
        </div>
        <div class="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-800 text-center text-xs">
            © 2025 Dentistico Clinic. All rights reserved.
        </div>
    </footer>
</div>

