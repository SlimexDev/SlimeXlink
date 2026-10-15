import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { dictionaries } from '@/i18n/dictionaries';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionaries[locale];
  return <main id="main" className="container" tabIndex={-1}>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="status-dot" />{t.eyebrow}</p>
        <h1 id="hero-title">{t.title.split('\n').map((line, index) => <span key={line} className={index === 1 ? 'accent-line' : undefined}>{line}</span>)}</h1>
        <p className="hero-description">{t.description}</p>
        <a className="button primary" href="#status">{t.viewStatus}<span aria-hidden="true">↗</span></a>
        <p className="hero-note">{t.note}</p>
      </div>
      <aside className="development-panel" aria-labelledby="development-title">
        <div className="panel-top"><span className="panel-symbol" aria-hidden="true">↗</span><span className="badge">SlimeXlink / 01</span></div>
        <div className="panel-art" aria-hidden="true"><span className="art-orbit" /><span className="art-link">↗</span><span className="art-caption">SHARE ON YOUR TERMS</span></div>
        <div className="panel-bottom"><span className="badge"><span className="status-dot" />{t.development}</span><h2 id="development-title">{t.platform}</h2><p>{t.developmentDetail}</p></div>
      </aside>
    </section>
    <section id="status" className="progress-section" aria-labelledby="progress-title">
      <div className="section-heading"><p className="eyebrow">SLIMEXLINK / {t.status.toUpperCase()}</p><h2 id="progress-title">{t.statusTitle}</h2><p>{t.statusDescription}</p></div>
      <ol className="progress-list">
        {[
          { title: t.platform, description: t.platformDetail, state: t.available, ready: true },
          { title: t.accounts, description: t.accountsDetail, state: t.planned, ready: false },
          { title: t.unlock, description: t.unlockDetail, state: t.planned, ready: false },
        ].map((step, index) => <li key={step.title}><span className="step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div><span className={`step-state${step.ready ? ' ready' : ''}`}>{step.ready ? '✓ ' : '◷ '}{step.state}</span></li>)}
      </ol>
      <p className="honesty-note"><span aria-hidden="true">ⓘ</span> {t.honesty}</p>
    </section>
  </main>;
}
