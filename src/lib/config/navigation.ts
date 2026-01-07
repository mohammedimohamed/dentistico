export const NAVIGATION = {
    doctor: [
        { label: "common.dashboard", href: "/doctor/dashboard", icon: "📊" },
        { label: "common.patients", href: "/doctor/patients", icon: "👥" },
        { label: "common.inventory", href: "/inventory", icon: "📦" },
        { label: "medications.title", href: "/doctor/settings/medications", icon: "💊" },
        { label: "common.profile", href: "/profile", icon: "👤" },
    ],
    assistant: [
        { label: "assistant.nav.items.schedule", href: "/assistant/dashboard", icon: "📅" },
        { label: "assistant.nav.items.inventory", href: "/inventory", icon: "📦" },
        { label: "assistant.nav.items.invoices", href: "/assistant/invoices", icon: "📄" },
        { label: "spending.menu", href: "/assistant/spending", icon: "💸" },
        { label: "common.profile", href: "/profile", icon: "👤" },
    ],
    admin: [
        { label: "admin.nav.dashboard", href: "/admin", icon: "📊" },
        { label: "admin.nav.users", href: "/admin/users", icon: "👥" },
        { label: "admin.nav.settings", href: "/admin/settings", icon: "⚙️" },
        { label: "admin.nav.inventory", href: "/inventory", icon: "📦" },
        { label: "spending.menu", href: "/admin/spending", icon: "💸" },
        { label: "spending.categories_menu", href: "/admin/spending/categories", icon: "🏷️" },
        { label: "common.profile", href: "/profile", icon: "👤" },
    ]
};
