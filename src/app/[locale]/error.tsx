'use client';

import { PageState } from '@/components/page-state';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <PageState kind="error" reset={reset} />;
}
