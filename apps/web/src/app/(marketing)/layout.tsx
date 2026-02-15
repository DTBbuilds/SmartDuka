import { OrganizationJsonLd, SoftwareApplicationJsonLd, WebSiteJsonLd, LocalBusinessJsonLd } from '@/components/seo';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
      <WebSiteJsonLd />
      <LocalBusinessJsonLd />
      {children}
    </>
  );
}
