import type { ReactNode } from 'react';
import PortalShell from '@/components/portal-shell/portal-shell';
import { ACCESS_KEYS } from '@/lib/access-control';

export default function OrderPackMealMiningLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PortalShell
      areaLabel="GA"
      title="Order Pack Meal Mining"
      menuLabel="Pack Meal"
      backHref="/ga"
      backLabel="Pilihan GA"
      requiredAccessKey={ACCESS_KEYS.GA_ORDER_PACK_MEAL}
      menuItems={[
        {
          label: 'Order Spesial',
          href: '/ga/order-pack-meal',
          icon: 'utensils-crossed',
        },
        {
          label: 'Order Pack Meal Mining',
          href: '/ga/order-pack-meal-mining',
          icon: 'utensils-crossed',
        },
        { label: 'Input Jumlah Additional', href: '/ga/order-pack-meal-mining/input', icon: 'utensils-crossed' },
        { label: 'Rekap Monthly Pack Meal Mining', href: '/ga/order-pack-meal-mining/rekap-bulanan', icon: 'utensils-crossed' },
      ]}
    >
      {children}
    </PortalShell>
  );
}
