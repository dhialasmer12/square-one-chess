import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docs = path.join(__dirname, "..");
const umlDir = path.join(docs, "uml");

/** PlantUML source -> PNG dropped next to the rapport (docs/). */
const jobs = [
  ["01-use-case.puml", "fig-usecase-global.png"],
  ["UC-register.puml", "fig-uc-register.png"],
  ["UC-01-inscrire.puml", "fig-uc-01-inscrire.png"],
  ["UC-manage-account.puml", "fig-uc-manage-account.png"],
  ["UC-profile.puml", "fig-uc-profile.png"],
  ["UC-play.puml", "fig-uc-play.png"],
  ["UC-match-history.puml", "fig-uc-match-history.png"],
  ["UC-replay.puml", "fig-uc-replay.png"],
  ["UC-social.puml", "fig-uc-social.png"],
  ["UC-tournament.puml", "fig-uc-tournament.png"],
  ["UC-train.puml", "fig-uc-train.png"],
  ["UC-leaderboard.puml", "fig-uc-leaderboard.png"],
  ["UC-stats-admin.puml", "fig-uc-stats-admin.png"],
  ["class-register.puml", "fig-class-register.png"],
  ["class-login.puml", "fig-class-login.png"],
  ["class-profile.puml", "fig-class-profile.png"],
  ["class-play.puml", "fig-class-play.png"],
  ["class-match.puml", "fig-class-match.png"],
  ["class-replay.puml", "fig-class-replay.png"],
  ["class-social.puml", "fig-class-social.png"],
  ["class-tournament.puml", "fig-class-tournament.png"],
  ["class-train.puml", "fig-class-train.png"],
  ["class-stats.puml", "fig-class-stats.png"],
  ["class-admin.puml", "fig-class-admin.png"],
  ["02-class-domain.puml", "fig-class-domain.png"],
  ["03-class-architecture.puml", "fig-class-architecture.png"],
  ["06-component.puml", "fig-component.png"],
  ["seq-register.puml", "fig-seq-register.png"],
  ["seq-login.puml", "fig-seq-login.png"],
  ["seq-profile.puml", "fig-seq-profile.png"],
  ["seq-move.puml", "fig-seq-move.png"],
  ["seq-match.puml", "fig-seq-match.png"],
  ["seq-replay.puml", "fig-seq-replay.png"],
  ["seq-chat.puml", "fig-seq-chat.png"],
  ["seq-tournament.puml", "fig-seq-tournament.png"],
  ["seq-puzzle.puml", "fig-seq-puzzle.png"],
  ["seq-leaderboard.puml", "fig-seq-leaderboard.png"],
  ["04-sequence-matchmaking.puml", "fig-seq-matchmaking.png"],
  ["05-sequence-auth.puml", "fig-seq-auth.png"],
  ["07-sequence-inscription.puml", "fig-seq-inscription.png"],
];

async function render(srcName, destName) {
  const srcPath = path.join(umlDir, srcName);
  if (!fs.existsSync(srcPath)) {
    console.warn("SKIP missing", srcName);
    return;
  }
  const body = fs.readFileSync(srcPath, "utf8");
  const res = await fetch("https://kroki.io/plantuml/png", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${srcName}: HTTP ${res.status} ${err.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(docs, destName), buf);
  const umlCopy = path.join(
    umlDir,
    destName.replace(/^fig-/, "").replace("usecase-global", "01-use-case")
  );
  fs.writeFileSync(umlCopy, buf);
  console.log("OK", destName, buf.length, "bytes");
}

(async () => {
  for (const [src, dest] of jobs) {
    await render(src, dest);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
