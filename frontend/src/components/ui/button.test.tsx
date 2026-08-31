import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
 it("merender label dan memicu onClick saat diklik", async () => {
 const user = userEvent.setup();
 const onClick = vi.fn();

 render(<Button onClick={onClick}>Simpan</Button>);
 await user.click(screen.getByRole("button", { name: "Simpan" }));

 expect(onClick).toHaveBeenCalledTimes(1);
 });

 it("tidak memicu onClick saat disabled", async () => {
 const user = userEvent.setup();
 const onClick = vi.fn();

 render(
 <Button onClick={onClick} disabled>
 Simpan
 </Button>,
 );
 await user.click(screen.getByRole("button", { name: "Simpan" }));

 expect(onClick).not.toHaveBeenCalled();
 });

 it("asChild merender elemen anak (mis. <a>) alih-alih <button>", () => {
 render(
 <Button asChild>
 <a href="/hc">Ke halaman HC</a>
 </Button>,
 );

 const tautan = screen.getByRole("link", { name: "Ke halaman HC" });
 expect(tautan.tagName).toBe("A");
 expect(tautan).toHaveAttribute("href", "/hc");
 });

 it("data-variant & data-size mengikuti props yang diberikan", () => {
 render(
 <Button variant="destructive" size="lg">
 Hapus
 </Button>,
 );

 const tombol = screen.getByRole("button", { name: "Hapus" });
 expect(tombol).toHaveAttribute("data-variant", "destructive");
 expect(tombol).toHaveAttribute("data-size", "lg");
 });
});
