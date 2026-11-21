import { Suspense } from "react";
import StockOpnamePage from "@/components/inventory/stock-opname-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StockOpnamePage scope="GENERAL" />
    </Suspense>
  );
}
