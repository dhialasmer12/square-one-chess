import { Chess } from 'chess.js';
import type { PrismaClient } from '@prisma/client';

type Candidate = { fen: string; moves: string[]; theme: string; rating: number };

function placementHasBothKings(fen: string): boolean {
  const placement = fen.split(' ')[0] ?? '';
  return placement.includes('k') && placement.includes('K');
}

/** Mate in 1 — every line checked against chess.js (no “capture the king”). */
function mateInOneBank(): Candidate[] {
  const rows: Candidate[] = [];
  const rank1s = [
    'R5K1',
    '1R4K1',
    '2R3K1',
    '3R2K1',
    '4R1K1',
  ];
  const sans = ['Ra8#', 'Rb8#', 'Rc8#', 'Rd8#', 'Re8#'];
  for (let i = 0; i < rank1s.length; i += 1) {
    rows.push({
      fen: `6k1/5ppp/8/8/8/8/8/${rank1s[i]} w - - 0 1`,
      moves: [sans[i]!],
      theme: 'mate_in_1',
      rating: 300 + i * 15,
    });
  }
  rows.push({
    fen: '7k/5R2/6K1/8/8/8/8/8 w - - 0 1',
    moves: ['Rf8#'],
    theme: 'mate_in_1',
    rating: 400,
  });
  rows.push({
    fen: '7k/6pp/5R2/6K1/8/8/8/8 w - - 0 1',
    moves: ['Rf8#'],
    theme: 'mate_in_1',
    rating: 410,
  });
  rows.push({
    fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Re8#'],
    theme: 'mate_in_1',
    rating: 360,
  });
  rows.push({
    fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',
    moves: ['Rd8#'],
    theme: 'mate_in_1',
    rating: 355,
  });
  rows.push({
    fen: '6k1/5ppp/8/8/8/8/8/2R3K1 w - - 0 1',
    moves: ['Rc8#'],
    theme: 'mate_in_1',
    rating: 350,
  });
  return rows;
}

const HAND_CRAFTED: Candidate[] = [
  // ----- FORK (queen double attack) -----
  {
    fen: '3qk3/8/8/8/8/3Q4/8/4K3 w - - 0 1',
    moves: ['Qxd8+'],
    theme: 'fork',
    rating: 720,
  },
  {
    fen: '2q1k3/8/8/8/8/2Q5/8/4K3 w - - 0 1',
    moves: ['Qxc8+'],
    theme: 'fork',
    rating: 700,
  },
  {
    fen: '1q2k3/8/8/8/8/1Q6/8/4K3 w - - 0 1',
    moves: ['Qxb8+'],
    theme: 'fork',
    rating: 690,
  },
  {
    fen: '4k3/3q4/8/1Q6/8/8/8/4K3 w - - 0 1',
    moves: ['Qxd7+'],
    theme: 'fork',
    rating: 680,
  },
  {
    fen: '4k3/8/4r3/8/8/8/4Q3/4K3 w - - 0 1',
    moves: ['Qxe6+'],
    theme: 'fork',
    rating: 560,
  },
  {
    fen: '3k4/8/3r4/8/8/8/3Q4/4K3 w - - 0 1',
    moves: ['Qxd6+'],
    theme: 'fork',
    rating: 580,
  },
  {
    fen: '2k5/8/2r5/8/8/8/2Q5/4K3 w - - 0 1',
    moves: ['Qxc6+'],
    theme: 'fork',
    rating: 570,
  },
  {
    fen: '4k3/8/8/4q3/8/8/4Q3/4K3 w - - 0 1',
    moves: ['Qxe5+'],
    theme: 'fork',
    rating: 640,
  },
  {
    fen: '5k2/8/8/3q4/8/8/3Q4/4K3 w - - 0 1',
    moves: ['Qxd5'],
    theme: 'fork',
    rating: 630,
  },
  {
    fen: '6k1/8/8/8/3q4/8/3Q4/4K3 w - - 0 1',
    moves: ['Qxd4'],
    theme: 'fork',
    rating: 620,
  },

  // ----- PIN -----
  {
    fen: '4k3/4q3/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 500,
  },
  {
    fen: '4k3/4r3/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 450,
  },
  {
    fen: '4k3/4n3/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 400,
  },
  {
    fen: '4k3/4b3/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 400,
  },
  {
    fen: '4k3/4q3/8/8/8/8/8/4Q1K1 w - - 0 1',
    moves: ['Qxe7+'],
    theme: 'pin',
    rating: 500,
  },
  {
    fen: '4k3/4n3/8/8/8/8/8/4Q1K1 w - - 0 1',
    moves: ['Qxe7+'],
    theme: 'pin',
    rating: 400,
  },
  {
    fen: 'k7/p7/8/8/8/8/8/R3K3 w Q - 0 1',
    moves: ['Rxa7+'],
    theme: 'pin',
    rating: 350,
  },
  {
    fen: '7k/7p/8/8/8/8/8/4K2R w K - 0 1',
    moves: ['Rxh7+'],
    theme: 'pin',
    rating: 350,
  },
  {
    fen: '4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 380,
  },
  {
    fen: '4k3/4b3/8/8/8/8/4R3/4K3 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 380,
  },

  // ----- SKEWER (legal only: both kings remain; no “king capture”) -----
  {
    fen: '7q/8/8/8/8/8/8/R3k1K1 w - - 0 1',
    moves: ['Ra8'],
    theme: 'skewer',
    rating: 700,
  },
  {
    fen: '7r/8/8/8/8/8/8/R3k1K1 w - - 0 1',
    moves: ['Ra8'],
    theme: 'skewer',
    rating: 650,
  },
  {
    fen: 'q7/8/8/8/8/8/8/4k1KR w - - 0 1',
    moves: ['Rh8'],
    theme: 'skewer',
    rating: 700,
  },
  {
    fen: 'r7/8/8/8/8/8/8/4k1KR w - - 0 1',
    moves: ['Rh8'],
    theme: 'skewer',
    rating: 650,
  },
  /** Rook check along file; king must move off the queen’s line. */
  {
    fen: '3k4/2q5/8/8/8/8/1R6/4K3 w - - 0 1',
    moves: ['Rb8+'],
    theme: 'skewer',
    rating: 720,
  },
  {
    fen: '3k4/3q4/8/8/8/8/2R5/4K3 w - - 0 1',
    moves: ['Rc8+'],
    theme: 'skewer',
    rating: 710,
  },
  {
    fen: '8/8/8/8/3k4/8/3r4/3R3K w - - 0 1',
    moves: ['Rxd2+'],
    theme: 'skewer',
    rating: 600,
  },
  {
    fen: '8/8/8/8/3k4/8/3q4/3R3K w - - 0 1',
    moves: ['Rxd2+'],
    theme: 'skewer',
    rating: 620,
  },
  {
    fen: '1q6/8/8/8/8/8/8/1R2k1K1 w - - 0 1',
    moves: ['Rxb8'],
    theme: 'skewer',
    rating: 640,
  },
  {
    fen: '2q5/8/8/8/8/8/8/2R1k1K1 w - - 0 1',
    moves: ['Rxc8'],
    theme: 'skewer',
    rating: 650,
  },

  // ----- ENDGAME -----
  {
    fen: '1k6/P7/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['a8=Q+'],
    theme: 'endgame',
    rating: 340,
  },
  {
    fen: '2k5/1P6/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['b8=Q+'],
    theme: 'endgame',
    rating: 360,
  },
  {
    fen: '3k4/2P5/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['c8=Q+'],
    theme: 'endgame',
    rating: 370,
  },
  {
    fen: '4k3/3P4/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['d8=Q+'],
    theme: 'endgame',
    rating: 380,
  },
  {
    fen: '5k2/4P3/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['e8=Q+'],
    theme: 'endgame',
    rating: 390,
  },
  {
    fen: '6k1/5P2/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['f8=Q+'],
    theme: 'endgame',
    rating: 400,
  },
  {
    fen: '7k/6P1/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['g8=Q+'],
    theme: 'endgame',
    rating: 410,
  },
  {
    fen: '1k6/7P/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['h8=Q+'],
    theme: 'endgame',
    rating: 420,
  },
  {
    fen: '8/8/8/8/8/4k3/3P4/4K3 w - - 0 1',
    moves: ['d4'],
    theme: 'endgame',
    rating: 450,
  },
  {
    fen: '8/8/8/8/3k4/8/3P4/4K3 w - - 0 1',
    moves: ['d3'],
    theme: 'endgame',
    rating: 500,
  },
];

const ALL_CANDIDATES: Candidate[] = [...mateInOneBank(), ...HAND_CRAFTED];

/** Removed on each seed so random/daily cannot serve pre-fix illegal tactics. */
const STALE_PUZZLE_FENS: string[] = [
  '4q3/8/8/8/8/8/8/R3k1K1 w - - 0 1',
  '4r3/8/8/8/8/8/8/R3k1K1 w - - 0 1',
  '8/8/8/8/8/8/8/1R2k1K1 w - - 0 1',
  '8/8/8/8/8/8/8/2R1k1K1 w - - 0 1',
];

export async function seedPuzzles(prisma: PrismaClient): Promise<{
  inserted: number;
  alreadyPresent: number;
  rejected: { reason: string; fen: string; move: string }[];
}> {
  const rejected: { reason: string; fen: string; move: string }[] = [];
  let inserted = 0;
  let alreadyPresent = 0;

  await prisma.puzzle.deleteMany({ where: { fen: { in: STALE_PUZZLE_FENS } } });

  for (const c of ALL_CANDIDATES) {
    const firstMove = c.moves[0];
    if (!firstMove) {
      rejected.push({ reason: 'no move', fen: c.fen, move: '' });
      continue;
    }

    let board: Chess;
    try {
      board = new Chess(c.fen);
    } catch (err) {
      rejected.push({
        reason: `illegal fen: ${(err as Error).message}`,
        fen: c.fen,
        move: firstMove,
      });
      continue;
    }
    if (!placementHasBothKings(board.fen())) {
      rejected.push({
        reason: 'illegal fen: both kings must be on the board',
        fen: c.fen,
        move: firstMove,
      });
      continue;
    }

    let played: ReturnType<Chess['move']>;
    try {
      played = board.move(firstMove);
    } catch (err) {
      rejected.push({
        reason: `illegal move (threw): ${(err as Error).message}`,
        fen: c.fen,
        move: firstMove,
      });
      continue;
    }
    if (!played) {
      rejected.push({ reason: 'illegal move', fen: c.fen, move: firstMove });
      continue;
    }
    if (!placementHasBothKings(board.fen())) {
      rejected.push({
        reason: 'illegal position after move (e.g. king capture — not valid chess)',
        fen: c.fen,
        move: firstMove,
      });
      continue;
    }
    if (c.theme === 'mate_in_1' && !board.isCheckmate()) {
      rejected.push({
        reason: 'not checkmate after move',
        fen: c.fen,
        move: firstMove,
      });
      continue;
    }

    const existing = await prisma.puzzle.findFirst({
      where: { fen: c.fen, theme: c.theme },
      select: { id: true },
    });
    if (existing) {
      alreadyPresent += 1;
      continue;
    }

    await prisma.puzzle.create({
      data: {
        fen: c.fen,
        moves: JSON.stringify(c.moves),
        theme: c.theme,
        rating: c.rating,
      },
    });
    inserted += 1;
  }

  return { inserted, alreadyPresent, rejected };
}
