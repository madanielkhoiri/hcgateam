import InventoryCrud from "@/components/inventory/inventory-crud";

export default function BarangKeluarMessPage() {
  return <InventoryCrud mode="stock-outs" scope="MESS" />;
}
