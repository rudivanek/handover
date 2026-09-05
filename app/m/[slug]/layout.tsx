import type { Metadata } from 'next';
import { publicClient } from '@/lib/supabase-public';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const base: Metadata = { robots: { index: false, follow: false } };

  let data: any = null;
  try {
    const res = await publicClient().rpc('get_public_manual', { p_slug: params.slug });
    data = res.data;
  } catch {
    // Never throw from generateMetadata — fall through to neutral title.
  }

  if (!data?.manual) {
    return { ...base, title: 'Manual', icons: { icon: [] } };
  }

  const m = data.manual;
  const agency = data.agency ?? {};
  const es = m.locale === 'es';

  const subject = m.site_name || m.client_name;
  const agencyName: string | null = agency.agency_name || null;
  const logo: string | undefined = agency.logo_url || undefined;

  const title = es
    ? `${subject} — Manual del sitio web`
    : `${subject} — Website Manual`;

  const description = agencyName
    ? (es
        ? `Manual del propietario del sitio web de ${subject}, preparado por ${agencyName}.`
        : `Website owner's manual for ${subject}, prepared by ${agencyName}.`)
    : (es
        ? `Manual del propietario del sitio web de ${subject}.`
        : `Website owner's manual for ${subject}.`);

  return {
    ...base,
    title,
    description,
    icons: logo
      ? { icon: [{ url: logo }], shortcut: [{ url: logo }], apple: [{ url: logo }] }
      : { icon: [] },
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: agencyName ?? subject,
      ...(logo ? { images: [{ url: logo }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(logo ? { images: [logo] } : {}),
    },
  };
}

export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return children;
}
