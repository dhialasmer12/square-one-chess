import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const umlDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "uml");

for (const f of fs.readdirSync(umlDir).filter((x) => x.endsWith(".puml"))) {
  let s = fs.readFileSync(path.join(umlDir, f), "utf8");
  const next = s
    .replaceAll("#FEFECE", "#FFFFFF")
    .replaceAll("#A80036", "#000000");
  if (next !== s) {
    fs.writeFileSync(path.join(umlDir, f), next);
    console.log("ok", f);
  }
}
