import ContentPage from '@/components/content-page';
export const metadata = { robots: { index: true, follow: true } };
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{slug?:string}>}) {const {locale}=await params;return ContentPage({params:Promise.resolve({locale,content:'guide'}),searchParams});}
