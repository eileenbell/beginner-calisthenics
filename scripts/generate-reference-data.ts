import { writeFileSync } from "node:fs";
import { buildReferenceSql, REFERENCE_MIGRATION } from "./reference-data";

writeFileSync(REFERENCE_MIGRATION, buildReferenceSql());
console.log(`Wrote ${REFERENCE_MIGRATION}`);
