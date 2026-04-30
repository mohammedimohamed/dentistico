export const NAVIGATION = {
    doctor: [
        { label: "common.dashboard", href: "/doctor/dashboard", icon: "dashboard", module: "dashboard" },
        { label: "common.journey", href: "/doctor/journey", icon: "activity", module: "journey" },
        { label: "common.patients", href: "/doctor/patients", icon: "patients", module: "patients" },
        { label: "common.inventory", href: "/inventory", icon: "inventory", module: "inventory" },
        { label: "medications.title", href: "/doctor/settings/medications", icon: "medications", module: "prescriptions" },
        { label: "Lab Tracking", href: "/lab-tracking", icon: "lab", module: "custom" },
    ],
    assistant: [
        { label: "assistant.nav.items.schedule", href: "/assistant/dashboard", icon: "schedule", module: "dashboard" },
        { label: "assistant.nav.items.inventory", href: "/inventory", icon: "inventory", module: "inventory" },
        { label: "assistant.nav.items.invoices", href: "/assistant/invoices", icon: "invoices", module: "billing" },
        { label: "spending.menu", href: "/assistant/spending", icon: "spending", module: "billing" },
        { label: "Lab Tracking", href: "/lab-tracking", icon: "lab", module: "custom" },
    ],
    admin: [
        { label: "admin.nav.dashboard", href: "/admin", icon: "dashboard", module: "dashboard" },
        { label: "admin.nav.users", href: "/admin/users", icon: "patients", module: "patients" },
        { label: "admin.nav.settings", href: "/admin/settings", icon: "settings" },
        { label: "admin.cdt_codes.title", href: "/admin/cdt-codes", icon: "settings", module: "dental_chart" },
        { label: "admin.nav.inventory", href: "/inventory", icon: "inventory", module: "inventory" },
        { label: "spending.menu", href: "/admin/spending", icon: "spending", module: "billing" },
        { label: "spending.categories_menu", href: "/admin/spending/categories", icon: "categories", module: "billing" },
        { label: "Print Templates", href: "/admin/templates", icon: "settings" },
    ]
};
