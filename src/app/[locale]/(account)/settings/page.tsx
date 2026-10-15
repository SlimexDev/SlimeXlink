import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { requireActor } from '@/lib/auth/guards';
import { authMessages } from '@/lib/auth/messages';
import { AuthForm } from '@/components/auth-form';
import Image from 'next/image';
import { AvatarForm } from '@/components/avatar-form';
import { avatarPath } from '@/lib/profile/avatar-validation';

export default async function Settings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const actor = await requireActor(locale);
  const { data, error } = await actor.client.from('profiles').select('display_name,avatar_path').eq('id', actor.user.id).single();
  if (error || typeof data?.display_name !== 'string') throw new Error('PROFILE_UNAVAILABLE');
  let avatar: string | undefined;
  if (typeof data.avatar_path === 'string' && avatarPath(data.avatar_path, actor.user.id)) {
    const signed = await actor.client.storage.from('avatars').createSignedUrl(data.avatar_path, 60);
    if (signed.error) throw new Error('AVATAR_UNAVAILABLE');
    avatar = signed.data.signedUrl;
  }
  return <main id="main" className="container state-panel"><h1>{authMessages[locale].profile}</h1>{avatar ? <Image src={avatar} alt={authMessages[locale].avatar} width={96} height={96} unoptimized /> : null}<AvatarForm locale={locale} /><AuthForm mode="profile" locale={locale} displayName={data.display_name} /></main>;
}
