import InventoryCrud from "@/components/inventory/inventory-crud";

export default function BarangKeluarCivilElectricPage() {
  return <InventoryCrud mode="stock-outs" scope="ELECTRIC" />;
}
