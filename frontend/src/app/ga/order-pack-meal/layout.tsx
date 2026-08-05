import type { ReactNode } from 'react';
import PortalShell from '@/components/portal-shell/portal-shell';
import { ACCESS_KEYS } from '@/lib/access-control';

type OrderPackMealLayoutProps = {
  children: ReactNode;
};

export default function OrderPackMealLayout({
  children,
}: OrderPackMealLayoutProps) {
  return (
    <PortalShell
      areaLabel="GA"
      title="Order Pack Meal"
      menuLabel="Order Pack Meal"
      backHref="/ga"
      backLabel="Pilihan GA"
      requiredAccessKey={ACCESS_KEYS.GA_ORDER_PACK_MEAL}
      menuItems={[
        {
          label: 'Order Pack Meal',
          href: '/ga/order-pack-meal',
          icon: 'utensils-crossed',
        },
      ]}
    >
      {children}
    </PortalShell>
  );
}
