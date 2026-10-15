'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { resolveLocale } from '@/i18n/config';
import { dictionaries } from '@/i18n/dictionaries';
import { Button } from './ui/controls';

export function PageState({ kind, reset }: { kind: 'error' | 'not-found' | 'loading'; reset?: () => void }) {
  const params = useParams();
  const locale = resolveLocale(params.locale, undefined);
  const t = dictionaries[locale];
  if (kind === 'loading') return <main id="main" className="container state-panel" aria-busy="true"><p role="status">{t.loading}</p><div aria-hidden="true"><div className="skeleton" /><div className="skeleton" /></div></main>;
  return <main id="main" className="container state-panel"><p className="eyebrow">{kind === 'error' ? 'SLIMEXLINK' : '404'}</p><h1>{kind === 'error' ? t.errorTitle : t.notFoundTitle}</h1><p role={kind === 'error' ? 'alert' : undefined}>{kind === 'error' ? t.errorDetail : t.notFoundDetail}</p>{reset ? <Button onClick={reset}>{t.retry}</Button> : <Link className="button" href={`/${locale}`}>{t.home}</Link>}</main>;
}
