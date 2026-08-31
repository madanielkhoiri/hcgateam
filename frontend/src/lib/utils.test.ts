import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
 it("menggabungkan beberapa class menjadi satu string", () => {
 expect(cn("a", "b")).toBe("a b");
 });

 it("mengabaikan value falsy (undefined, null, false)", () => {
 expect(cn("a", undefined, null, false, "b")).toBe("a b");
 });

 it("class Tailwind yang konflik di-resolve, yang terakhir menang", () => {
 expect(cn("px-2", "px-4")).toBe("px-4");
 });

 it("mendukung object conditional ala clsx", () => {
 expect(cn("base", { aktif: true, nonaktif: false })).toBe("base aktif");
 });
});
