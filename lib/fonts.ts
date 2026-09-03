import { IBM_Plex_Sans, DM_Sans, Manrope, Plus_Jakarta_Sans, Work_Sans, Source_Sans_3, Nunito_Sans, Poppins, Montserrat, Libre_Franklin, Lora, Source_Serif_4, Merriweather, Playfair_Display } from 'next/font/google';

const appFont = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-app',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
});

export const appFontVariable = appFont.variable;
const dmSans = DM_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-dm-sans' });
const manrope = Manrope({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-manrope' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-plus-jakarta' });
const workSans = Work_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-work-sans' });
const sourceSans = Source_Sans_3({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-source-sans' });
const nunitoSans = Nunito_Sans({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-nunito-sans' });
const poppins = Poppins({ subsets: ['latin', 'latin-ext'], display: 'swap', weight: ['400', '500', '600', '700'], variable: '--font-poppins' });
const montserrat = Montserrat({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-montserrat' });
const libreFranklin = Libre_Franklin({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-libre-franklin' });
const lora = Lora({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-lora' });
const sourceSerif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-source-serif' });
const merriweather = Merriweather({ subsets: ['latin', 'latin-ext'], display: 'swap', weight: ['300', '400', '700', '900'], variable: '--font-merriweather' });
const playfair = Playfair_Display({ subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--font-playfair' });

const systemStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const serifStack = 'Georgia, "Times New Roman", serif';

export type FontCategory = 'sans' | 'serif';

export type FontDef = {
  label: string;
  className: string;
  variable: string;
  fontFamily: string;
  stack: string;
  category: FontCategory;
  headingOnly?: boolean;
};

export const SYSTEM_STACK = systemStack;
export const SERIF_STACK = serifStack;

export const fonts: Record<string, FontDef> = {
  'system': { label: 'System default', className: '', variable: '', fontFamily: '', stack: systemStack, category: 'sans' },
  'dm-sans': { label: 'DM Sans', className: dmSans.className, variable: dmSans.variable, fontFamily: dmSans.style.fontFamily, stack: `'DM Sans', ${systemStack}`, category: 'sans' },
  'manrope': { label: 'Manrope', className: manrope.className, variable: manrope.variable, fontFamily: manrope.style.fontFamily, stack: `'Manrope', ${systemStack}`, category: 'sans' },
  'plus-jakarta': { label: 'Plus Jakarta Sans', className: plusJakarta.className, variable: plusJakarta.variable, fontFamily: plusJakarta.style.fontFamily, stack: `'Plus Jakarta Sans', ${systemStack}`, category: 'sans' },
  'work-sans': { label: 'Work Sans', className: workSans.className, variable: workSans.variable, fontFamily: workSans.style.fontFamily, stack: `'Work Sans', ${systemStack}`, category: 'sans' },
  'source-sans': { label: 'Source Sans 3', className: sourceSans.className, variable: sourceSans.variable, fontFamily: sourceSans.style.fontFamily, stack: `'Source Sans 3', ${systemStack}`, category: 'sans' },
  'nunito-sans': { label: 'Nunito Sans', className: nunitoSans.className, variable: nunitoSans.variable, fontFamily: nunitoSans.style.fontFamily, stack: `'Nunito Sans', ${systemStack}`, category: 'sans' },
  'poppins': { label: 'Poppins', className: poppins.className, variable: poppins.variable, fontFamily: poppins.style.fontFamily, stack: `'Poppins', ${systemStack}`, category: 'sans' },
  'montserrat': { label: 'Montserrat', className: montserrat.className, variable: montserrat.variable, fontFamily: montserrat.style.fontFamily, stack: `'Montserrat', ${systemStack}`, category: 'sans' },
  'libre-franklin': { label: 'Libre Franklin', className: libreFranklin.className, variable: libreFranklin.variable, fontFamily: libreFranklin.style.fontFamily, stack: `'Libre Franklin', ${systemStack}`, category: 'sans' },
  'lora': { label: 'Lora', className: lora.className, variable: lora.variable, fontFamily: lora.style.fontFamily, stack: `'Lora', ${serifStack}`, category: 'serif' },
  'source-serif': { label: 'Source Serif 4', className: sourceSerif.className, variable: sourceSerif.variable, fontFamily: sourceSerif.style.fontFamily, stack: `'Source Serif 4', ${serifStack}`, category: 'serif' },
  'merriweather': { label: 'Merriweather', className: merriweather.className, variable: merriweather.variable, fontFamily: merriweather.style.fontFamily, stack: `'Merriweather', ${serifStack}`, category: 'serif' },
  'playfair': { label: 'Playfair Display (headings)', className: playfair.className, variable: playfair.variable, fontFamily: playfair.style.fontFamily, stack: `'Playfair Display', ${serifStack}`, category: 'serif', headingOnly: true },
};

export type FontOption = { slug: string; label: string; className: string; category: FontCategory; headingOnly?: boolean };

export const fontOptions: FontOption[] = Object.entries(fonts).map(([slug, def]) => ({
  slug,
  label: def.label,
  className: def.className,
  category: def.category,
  headingOnly: def.headingOnly,
}));

export const sansFontOptions: FontOption[] = fontOptions.filter((f) => f.category === 'sans');
export const serifFontOptions: FontOption[] = fontOptions.filter((f) => f.category === 'serif');

export function getFontDef(key: string | null | undefined): FontDef {
  if (key && fonts[key]) return fonts[key];
  return fonts['system'];
}

export function inferFontFormat(url: string): string {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.woff2')) return 'woff2';
  if (lower.endsWith('.woff')) return 'woff';
  if (lower.endsWith('.otf')) return 'opentype';
  if (lower.endsWith('.ttf')) return 'truetype';
  return 'woff2';
}
