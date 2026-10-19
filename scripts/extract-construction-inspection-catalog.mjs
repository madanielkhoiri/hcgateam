import fs from "node:fs";

const [source, target] = process.argv.slice(2);
if (!source || !target) throw new Error("Usage: node extract-construction-inspection-catalog.mjs <source.html> <target.ts>");

const html = fs.readFileSync(source, "utf8");
const match = html.match(/const DATA=(\[.*?\]);\s*const COMMON=/s);
if (!match) throw new Error("Construction inspection DATA was not found");

const catalog = JSON.parse(match[1]);
const output = `// Generated from Construction_Inspection_Katalog_Lengkap.html.\n` +
  `export type ConstructionInspectionCatalogItem = { id: string; category: string; name: string; questions: string[] };\n\n` +
  `export const CONSTRUCTION_INSPECTION_CATALOG: ConstructionInspectionCatalogItem[] = ${JSON.stringify(catalog, null, 2)};\n`;

fs.writeFileSync(target, output);
console.log(`Generated ${catalog.length} construction inspection items in ${target}`);
