import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
 AlertDialogTrigger,
} from "./alert-dialog";

function DialogHapusData({ onHapus }: { onHapus: () => void }) {
 return (
 <AlertDialog>
 <AlertDialogTrigger>Hapus</AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Yakin hapus data ini?</AlertDialogTitle>
 <AlertDialogDescription>
 Tindakan ini tidak bisa dibatalkan.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Batal</AlertDialogCancel>
 <AlertDialogAction onClick={onHapus}>Ya, Hapus</AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 );
}

describe("AlertDialog", () => {
 it("konten dialog tersembunyi sebelum trigger diklik", () => {
 render(<DialogHapusData onHapus={vi.fn()} />);

 expect(screen.queryByText("Yakin hapus data ini?")).not.toBeInTheDocument();
 });

 it("trigger membuka dialog dan menampilkan judul/deskripsi", async () => {
 const user = userEvent.setup();
 render(<DialogHapusData onHapus={vi.fn()} />);

 await user.click(screen.getByText("Hapus"));

 expect(screen.getByText("Yakin hapus data ini?")).toBeInTheDocument();
 expect(
 screen.getByText("Tindakan ini tidak bisa dibatalkan."),
 ).toBeInTheDocument();
 });

 it("Batal menutup dialog tanpa memanggil aksi", async () => {
 const user = userEvent.setup();
 const onHapus = vi.fn();
 render(<DialogHapusData onHapus={onHapus} />);

 await user.click(screen.getByText("Hapus"));
 await user.click(screen.getByText("Batal"));

 expect(onHapus).not.toHaveBeenCalled();
 expect(screen.queryByText("Yakin hapus data ini?")).not.toBeInTheDocument();
 });

 it("Action memanggil callback dan menutup dialog", async () => {
 const user = userEvent.setup();
 const onHapus = vi.fn();
 render(<DialogHapusData onHapus={onHapus} />);

 await user.click(screen.getByText("Hapus"));
 await user.click(screen.getByText("Ya, Hapus"));

 expect(onHapus).toHaveBeenCalledTimes(1);
 expect(screen.queryByText("Yakin hapus data ini?")).not.toBeInTheDocument();
 });
});
