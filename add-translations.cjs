const fs = require('fs');
const path = require('path');

const translations = {
    en: {
        login: "Login",
        book_appointment: "Book Appointment",
        established_excellence: "Established Excellence",
        hero_title_1: "Your Smile,",
        hero_title_2: "Our Masterpiece.",
        hero_description: "Experience world-class dental care where artistry meets advanced medical science. We are dedicated to providing a serene environment and exceptional results.",
        schedule_visit: "Schedule a Visit",
        direct_line: "Direct Line",
        location: "Location",
        hours: "Hours",
        privacy_policy: "Privacy Policy",
        terms_of_service: "Terms of Service"
    },
    fr: {
        login: "Connexion",
        book_appointment: "Prendre Rendez-vous",
        established_excellence: "Excellence Établie",
        hero_title_1: "Votre Sourire,",
        hero_title_2: "Notre Chef-d'Œuvre.",
        hero_description: "Découvrez des soins dentaires de classe mondiale où l'art rencontre la science médicale de pointe. Nous sommes déterminés à offrir un environnement serein et des résultats exceptionnels.",
        schedule_visit: "Planifier une Visite",
        direct_line: "Ligne Directe",
        location: "Emplacement",
        hours: "Horaires",
        privacy_policy: "Politique de Confidentialité",
        terms_of_service: "Conditions d'Utilisation"
    },
    ar: {
        login: "تسجيل الدخول",
        book_appointment: "احجز موعداً",
        established_excellence: "تميز راسخ",
        hero_title_1: "ابتسامتك،",
        hero_title_2: "تحفتنا الفنية.",
        hero_description: "جرب العناية بالأسنان ذات المستوى العالمي حيث يلتقي الفن بالعلوم الطبية المتقدمة. نحن مكرسون لتوفير بيئة هادئة ونتائج استثنائية.",
        schedule_visit: "تحديد موعد للزيارة",
        direct_line: "خط مباشر",
        location: "الموقع",
        hours: "ساعات العمل",
        privacy_policy: "سياسة الخصوصية",
        terms_of_service: "شروط الخدمة"
    }
};

['en', 'fr', 'ar'].forEach(lang => {
    const p = path.join('src', 'lib', 'i18n', 'locales', lang + '.json');
    let pFallback = path.join('src', 'lib', 'i18n', lang + '.json');
    let target = fs.existsSync(p) ? p : pFallback;
    
    if (fs.existsSync(target)) {
        const d = JSON.parse(fs.readFileSync(target, 'utf8'));
        d.landing = translations[lang];
        fs.writeFileSync(target, JSON.stringify(d, null, 4), 'utf8');
        console.log('Updated ' + target);
    }
});
