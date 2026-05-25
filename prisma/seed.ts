import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedPuzzles } from './puzzles.seed';

const prisma = new PrismaClient();

/** Must match `src/constants/openSeat.ts` default. */
const OPEN_SEAT_USER_ID = '00000000-0000-4000-a000-000000000001';

async function main(): Promise<void> {
  const defaultPassword = await bcrypt.hash('password123', 12);
  const noLoginPassword = await bcrypt.hash(
    '__no_login__' + Math.random().toString(36),
    12
  );

  await prisma.user.upsert({
    where: { id: OPEN_SEAT_USER_ID },
    create: {
      id: OPEN_SEAT_USER_ID,
      email: 'open-seat@system.local',
      username: '__open_seat__',
      password: noLoginPassword,
      elo: 0,
      eloBullet: 0,
      eloBlitz: 0,
      eloRapid: 0,
      gamesPlayed: 0,
      gamesWon: 0,
    },
    update: {},
  });

  const examples = [
    {
      email: 'alice.martin@univ.edu',
      username: 'KnightRider',
      elo: 1487,
      gamesPlayed: 42,
      gamesWon: 26,
    },
    {
      email: 'ben.dupont@univ.edu',
      username: 'BenkoGambit',
      elo: 1320,
      gamesPlayed: 28,
      gamesWon: 14,
    },
    {
      email: 'chloe.bernard@univ.edu',
      username: 'QueenSide',
      elo: 1562,
      gamesPlayed: 61,
      gamesWon: 39,
    },
    {
      email: 'david.nguyen@univ.edu',
      username: 'RookTower',
      elo: 1198,
      gamesPlayed: 15,
      gamesWon: 6,
    },
    {
      email: 'emma.leroy@univ.edu',
      username: 'PawnStorm',
      elo: 1410,
      gamesPlayed: 33,
      gamesWon: 19,
    },
    {
      email: 'felix.moreau@univ.edu',
      username: 'Fianchetto',
      elo: 1288,
      gamesPlayed: 22,
      gamesWon: 10,
    },
    {
      email: 'gina.petrov@univ.edu',
      username: 'EndgameZen',
      elo: 1624,
      gamesPlayed: 74,
      gamesWon: 48,
    },
    {
      email: 'hugo.sanchez@univ.edu',
      username: 'CastleKing',
      elo: 1355,
      gamesPlayed: 31,
      gamesWon: 17,
    },
    {
      email: 'ines.kowalski@univ.edu',
      username: 'Tactician_I',
      elo: 1503,
      gamesPlayed: 48,
      gamesWon: 29,
    },
    {
      email: 'julien.rossi@univ.edu',
      username: 'ItalianGame',
      elo: 1244,
      gamesPlayed: 19,
      gamesWon: 8,
    },
  ];

  for (const u of examples) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        elo: u.elo,
        eloBullet: u.elo,
        eloBlitz: u.elo,
        eloRapid: u.elo,
        gamesPlayed: u.gamesPlayed,
        gamesWon: u.gamesWon,
        password: defaultPassword,
      },
      create: {
        email: u.email,
        username: u.username,
        password: defaultPassword,
        elo: u.elo,
        eloBullet: u.elo,
        eloBlitz: u.elo,
        eloRapid: u.elo,
        gamesPlayed: u.gamesPlayed,
        gamesWon: u.gamesWon,
      },
    });
  }

  console.log(
    `Seeded open-seat user + ${examples.length} players (password: password123).`
  );

  const puzzleResult = await seedPuzzles(prisma);
  console.log(
    `Seeded puzzles: inserted=${puzzleResult.inserted}, alreadyPresent=${puzzleResult.alreadyPresent}, rejected=${puzzleResult.rejected.length}.`
  );
  if (puzzleResult.rejected.length > 0) {
    for (const r of puzzleResult.rejected) {
      console.warn(`  rejected (${r.reason}) ${r.fen} :: ${r.move}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
