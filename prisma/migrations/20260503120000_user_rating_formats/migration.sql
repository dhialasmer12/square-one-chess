-- Per-format ELO (bullet / blitz / rapid). Copy existing `elo` into all three.
ALTER TABLE "User" ADD COLUMN "eloBullet" INTEGER NOT NULL DEFAULT 1200;
ALTER TABLE "User" ADD COLUMN "eloBlitz" INTEGER NOT NULL DEFAULT 1200;
ALTER TABLE "User" ADD COLUMN "eloRapid" INTEGER NOT NULL DEFAULT 1200;

UPDATE "User"
SET
  "eloBullet" = "elo",
  "eloBlitz" = "elo",
  "eloRapid" = "elo";
