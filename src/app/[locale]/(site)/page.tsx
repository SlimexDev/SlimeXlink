import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { dictionaries } from '@/i18n/dictionaries';
import Link from 'next/link';

export const metadata = { title: 'SlimeXlink · Share on your terms', robots: { index: true, follow: true } };

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
        <div className="actions"><Link prefetch={false} className="button primary" href={`/${locale}/dashboard/links/new`}>{locale === 'vi' ? 'Tạo link của bạn' : 'Create your link'}<span aria-hidden="true">↗</span></Link><Link prefetch={false} className="button" href={`/${locale}/discover`}>{locale === 'vi' ? 'Khám phá' : 'Discover'}</Link></div>
        <p className="hero-note">{t.note}</p>
      </div>
      <aside className="development-panel" aria-labelledby="development-title">
        <div className="panel-top"><span className="panel-symbol" aria-hidden="true">↗</span><span className="badge">SlimeXlink / 01</span></div>
        <div className="panel-art" aria-hidden="true"><span className="art-orbit" /><span className="art-link">↗</span><span className="art-caption">SHARE ON YOUR TERMS</span></div>
        <div className="panel-bottom"><span className="badge"><span className="status-dot" />SHARE ON YOUR TERMS</span><h2 id="development-title">{locale === 'vi' ? 'Một link. Các bước rõ ràng.' : 'One link. Clear steps.'}</h2><p>{locale === 'vi' ? 'Quản lý nội dung đích, nhiệm vụ và quyền hiển thị trong cùng một nơi.' : 'Manage destinations, visit tasks and visibility in one place.'}</p></div>
      </aside>
    </section>
    <section id="status" className="progress-section" aria-labelledby="progress-title">
      <div className="section-heading"><p className="eyebrow">SLIMEXLINK / HOW IT WORKS</p><h2 id="progress-title">{locale === 'vi' ? 'Từ nội dung đến kết nối.' : 'From content to connection.'}</h2><p>{locale === 'vi' ? 'Ba bước để chia sẻ theo cách của bạn.' : 'Three steps to share on your terms.'}</p></div>
      <ol className="progress-list">
        {[
          { title: locale === 'vi' ? 'Tạo link' : 'Create a link', description: locale === 'vi' ? 'Thêm URL đích và các nhiệm vụ truy cập.' : 'Add your destination URL and visit tasks.' },
          { title: locale === 'vi' ? 'Chia sẻ' : 'Share it', description: locale === 'vi' ? 'Sao chép URL, chọn niêm yết hoặc không niêm yết.' : 'Copy the shared URL. Choose listed or unlisted visibility.' },
          { title: locale === 'vi' ? 'Mở khóa' : 'Unlock', description: t.unlockDetail },
        ].map((step, index) => <li key={step.title}><span className="step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}
      </ol>
      <p className="honesty-note"><span aria-hidden="true">ⓘ</span> {t.honesty}</p>
      <div className="actions"><Link prefetch={false} className="button" href={`/${locale}/guide`}>{locale === 'vi' ? 'Đọc hướng dẫn' : 'Read the guide'}</Link><Link prefetch={false} href={`/${locale}/contact`}>{locale === 'vi' ? 'Liên hệ' : 'Contact'}</Link></div>
    </section>
  </main>;
}
