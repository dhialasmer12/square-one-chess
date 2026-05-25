-- Reset schema (replaces prior Square One prototype tables)
PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "Move";
DROP TABLE IF EXISTS "QueueEntry";
DROP TABLE IF EXISTS "Game";
DROP TABLE IF EXISTS "User";

PRAGMA foreign_keys=ON;

CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "elo" INTEGER NOT NULL DEFAULT 1200,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "whitePlayerId" TEXT NOT NULL,
    "blackPlayerId" TEXT NOT NULL,
    "winner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "fen" TEXT NOT NULL,
    "pgn" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Game_whitePlayerId_fkey" FOREIGN KEY ("whitePlayerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_blackPlayerId_fkey" FOREIGN KEY ("blackPlayerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Game_status_idx" ON "Game"("status");
CREATE INDEX "Game_whitePlayerId_idx" ON "Game"("whitePlayerId");
CREATE INDEX "Game_blackPlayerId_idx" ON "Game"("blackPlayerId");

CREATE TABLE "Move" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "from_square" TEXT NOT NULL,
    "to_square" TEXT NOT NULL,
    "piece" TEXT NOT NULL,
    "promotion" TEXT,
    "fen" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Move_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Move_gameId_idx" ON "Move"("gameId");

CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elo" INTEGER NOT NULL,
    CONSTRAINT "QueueEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "QueueEntry_userId_idx" ON "QueueEntry"("userId");
