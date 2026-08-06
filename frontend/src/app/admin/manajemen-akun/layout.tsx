import type { ReactNode } from 'react';
import PortalShell from '@/components/portal-shell/portal-shell';

type AccountManagementLayoutProps = {
  children: ReactNode;
};

export default function AccountManagementLayout({
  children,
}: AccountManagementLayoutProps) {
  return (
    <PortalShell
      areaLabel="ADMIN"
      title="Manajemen Akun"
      menuLabel="Administrator"
      adminOnly
      menuItems={[
        {
          label: 'Manajemen Akun',
          href: '/admin/manajemen-akun',
          icon: 'user-cog',
        },
      ]}
    >
      {children}
    </PortalShell>
  );
}
