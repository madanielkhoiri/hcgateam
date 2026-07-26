import InventoryCrud from "@/components/inventory/inventory-crud";

export default function BarangKeluarElectricPage() {
  return <InventoryCrud mode="stock-outs" scope="ELECTRIC" />;
}
