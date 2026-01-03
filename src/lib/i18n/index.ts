import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

register('fr', () => import('./fr.json'));
register('ar', () => import('./ar.json'));

const defaultLocale = 'fr';

export function setupI18n(locale?: string) {
    init({
        fallbackLocale: defaultLocale,
        initialLocale: locale || getLocaleFromNavigator() || defaultLocale,
    });
}
