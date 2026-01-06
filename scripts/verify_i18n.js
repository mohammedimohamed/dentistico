
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const frPath = join(__dirname, '../src/lib/i18n/fr.json');
const arPath = join(__dirname, '../src/lib/i18n/ar.json');

try {
    const fr = JSON.parse(readFileSync(frPath, 'utf8'));
    const ar = JSON.parse(readFileSync(arPath, 'utf8'));

    // Helper to get nested keys
    function getKeys(obj, prefix = '') {
        return Object.keys(obj).reduce((res, el) => {
            if (Array.isArray(obj[el])) return res;
            if (typeof obj[el] === 'object' && obj[el] !== null) {
                return [...res, ...getKeys(obj[el], prefix + el + '.')];
            }
            return [...res, prefix + el];
        }, []);
    }

    const frKeys = getKeys(fr);
    const arKeys = getKeys(ar);

    const missingInAr = frKeys.filter(k => !arKeys.includes(k));
    const missingInFr = arKeys.filter(k => !frKeys.includes(k));

    console.log(`Total Keys FR: ${frKeys.length}`);
    console.log(`Total Keys AR: ${arKeys.length}`);

    if (missingInAr.length > 0) {
        console.error('Keys missing in AR:', missingInAr);
        process.exit(1);
    }

    if (missingInFr.length > 0) {
        console.error('Keys missing in FR:', missingInFr);
        process.exit(1);
    }

    // Check for spending specific keys
    if (!fr.spending || !ar.spending) {
        console.error('Missing spending section!');
        process.exit(1);
    }

    console.log('✅ i18n Verification Passed! All keys match.');
} catch (err) {
    console.error('Error verifying i18n:', err);
    process.exit(1);
}
