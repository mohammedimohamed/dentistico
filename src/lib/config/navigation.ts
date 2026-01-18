export const NAVIGATION = {
    doctor: [
        { label: "common.dashboard", href: "/doctor/dashboard", icon: "dashboard" },
        { label: "common.journey", href: "/doctor/journey", icon: "activity" },
        { label: "common.patients", href: "/doctor/patients", icon: "patients" },
        { label: "common.inventory", href: "/inventory", icon: "inventory" },
        { label: "medications.title", href: "/doctor/settings/medications", icon: "medications" },

    ],
    assistant: [
        { label: "assistant.nav.items.schedule", href: "/assistant/dashboard", icon: "schedule" },
        { label: "assistant.nav.items.inventory", href: "/inventory", icon: "inventory" },
        { label: "assistant.nav.items.invoices", href: "/assistant/invoices", icon: "invoices" },
        { label: "spending.menu", href: "/assistant/spending", icon: "spending" },

    ],
    admin: [
        { label: "admin.nav.dashboard", href: "/admin", icon: "dashboard" },
        { label: "admin.nav.users", href: "/admin/users", icon: "patients" },
        { label: "admin.nav.settings", href: "/admin/settings", icon: "settings" },
        { label: "admin.cdt_codes.title", href: "/admin/cdt-codes", icon: "settings" },
        { label: "admin.nav.inventory", href: "/inventory", icon: "inventory" },
        { label: "spending.menu", href: "/admin/spending", icon: "spending" },
        { label: "spending.categories_menu", href: "/admin/spending/categories", icon: "categories" },

    ]
};
