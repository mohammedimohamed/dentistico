import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('en', () => import('./en.json'));
register('fr', () => import('./fr.json'));
register('ar', () => import('./ar.json'));
register('fr-assistant', () => import('./translations/assistant.json'));
register('ar-assistant', () => import('./translations/assistant.json'));

const defaultLocale = 'fr';

export function setupI18n(locale?: string) {
    init({
        fallbackLocale: defaultLocale,
        initialLocale: locale || getLocaleFromNavigator() || defaultLocale,
    });
}
