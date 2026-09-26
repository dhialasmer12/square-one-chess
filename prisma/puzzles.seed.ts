import { Chess } from 'chess.js';
import type { PrismaClient } from '@prisma/client';

type Candidate = { fen: string; moves: string[]; theme: string; rating: number };

function placementHasBothKings(fen: string): boolean {
  const placement = fen.split(' ')[0] ?? '';
  return placement.includes('k') && placement.includes('K');
}

/** Validate the full SAN line; normalize SANs to chess.js output. */
function validateAndNormalize(
  c: Candidate
): { ok: true; moves: string[] } | { ok: false; reason: string } {
  let board: Chess;
  try {
    board = new Chess(c.fen);
  } catch (err) {
    return { ok: false, reason: `illegal fen: ${(err as Error).message}` };
  }
  if (!placementHasBothKings(board.fen())) {
    return { ok: false, reason: 'both kings required' };
  }
  if (!c.moves.length) {
    return { ok: false, reason: 'empty line' };
  }

  const normalized: string[] = [];
  for (const san of c.moves) {
    let played: ReturnType<Chess['move']>;
    try {
      played = board.move(san);
    } catch (err) {
      return {
        ok: false,
        reason: `illegal ${san}: ${(err as Error).message}`,
      };
    }
    if (!played) {
      return { ok: false, reason: `illegal move ${san}` };
    }
    if (!placementHasBothKings(board.fen())) {
      return { ok: false, reason: `king capture after ${san}` };
    }
    normalized.push(played.san);
  }

  if (
    (c.theme === 'mate_in_1' || c.theme === 'mate_in_2') &&
    !board.isCheckmate()
  ) {
    return { ok: false, reason: 'line does not end in checkmate' };
  }
  if (c.theme === 'mate_in_1' && normalized.length !== 1) {
    return { ok: false, reason: 'mate_in_1 must be exactly one ply' };
  }
  if (c.theme === 'mate_in_2' && normalized.length < 3) {
    return { ok: false, reason: 'mate_in_2 needs player–reply–player' };
  }

  return { ok: true, moves: normalized };
}

/**
 * Curated tactics for demo/PFE — real motifs, validated at seed time.
 * Multi-ply lines: even steps = player, odd = opponent auto-reply.
 */
const HAND_CRAFTED: Candidate[] = [
  // ----- MATE IN 1 -----
  {
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    moves: ['Re8#'],
    theme: 'mate_in_1',
    rating: 400,
  },
  {
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    moves: ['Ra8#'],
    theme: 'mate_in_1',
    rating: 380,
  },
  {
    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    moves: ['Rb8#'],
    theme: 'mate_in_1',
    rating: 385,
  },
  {
    fen: '6k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1',
    moves: ['Rc8#'],
    theme: 'mate_in_1',
    rating: 390,
  },
  {
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    moves: ['Rd8#'],
    theme: 'mate_in_1',
    rating: 395,
  },
  {
    fen: '6k1/5ppp/8/8/8/8/5PPP/3QR1K1 w - - 0 1',
    moves: ['Qd8#'],
    theme: 'mate_in_1',
    rating: 420,
  },
  {
    fen: '7k/6pp/8/8/8/8/6PP/4Q1K1 w - - 0 1',
    moves: ['Qe8#'],
    theme: 'mate_in_1',
    rating: 430,
  },
  {
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    moves: ['Rxe8#'],
    theme: 'mate_in_1',
    rating: 450,
  },
  {
    fen: '7k/5R2/6K1/8/8/8/8/8 w - - 0 1',
    moves: ['Rf8#'],
    theme: 'mate_in_1',
    rating: 360,
  },
  {
    fen: '5k2/R7/5K2/8/8/8/8/8 w - - 0 1',
    moves: ['Ra8#'],
    theme: 'mate_in_1',
    rating: 370,
  },
  {
    fen: '5k2/8/5K2/8/8/8/8/7R w - - 0 1',
    moves: ['Rh8#'],
    theme: 'mate_in_1',
    rating: 375,
  },
  {
    fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',
    moves: ['Qg7#'],
    theme: 'mate_in_1',
    rating: 350,
  },
  {
    fen: '6k1/5Q2/6K1/8/8/8/8/8 w - - 0 1',
    moves: ['Qg7#'],
    theme: 'mate_in_1',
    rating: 355,
  },
  {
    fen: 'k7/8/1N6/8/8/8/7Q/4K3 w - - 0 1',
    moves: ['Qc7#'],
    theme: 'mate_in_1',
    rating: 480,
  },
  {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    moves: ['Qxf7#'],
    theme: 'mate_in_1',
    rating: 500,
  },
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    moves: ['Qxf7#'],
    theme: 'mate_in_1',
    rating: 490,
  },
  {
    fen: '6k1/4Rppp/8/8/8/8/5PPP/6K1 w - - 0 1',
    moves: ['Re8#'],
    theme: 'mate_in_1',
    rating: 410,
  },
  {
    fen: '4r1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
    moves: ['Re1#'],
    theme: 'mate_in_1',
    rating: 405,
  },

  // ----- MATE IN 2 (principal variation) -----
  {
    fen: '6k1/5p1p/6p1/8/8/5Q2/5PPP/6K1 w - - 0 1',
    moves: ['Qxf7+', 'Kh8', 'Qf8#'],
    theme: 'mate_in_2',
    rating: 700,
  },
  {
    fen: '6k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1',
    moves: ['Qd3', 'Kh8', 'Qd8#'],
    theme: 'mate_in_2',
    rating: 720,
  },
  {
    fen: '6k1/5ppp/4Q3/8/8/8/5PPP/6K1 w - - 0 1',
    moves: ['Qd7', 'Kh8', 'Qd8#'],
    theme: 'mate_in_2',
    rating: 740,
  },
  {
    fen: '6k1/5ppp/8/8/8/5Q2/6PP/6K1 w - - 0 1',
    moves: ['Qe4', 'Kh8', 'Qa8#'],
    theme: 'mate_in_2',
    rating: 760,
  },
  {
    fen: '3r2k1/5ppp/8/8/8/4Q3/5PPP/6K1 w - - 0 1',
    moves: ['Qd4', 'Kh8', 'Qxd8#'],
    theme: 'mate_in_2',
    rating: 780,
  },
  {
    fen: '2r3k1/5ppp/8/8/8/4Q3/5PPP/6K1 w - - 0 1',
    moves: ['Qd4', 'Rd8', 'Qxd8#'],
    theme: 'mate_in_2',
    rating: 800,
  },

  // ----- FORK -----
  {
    fen: '2q1k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
    moves: ['Nc7+'],
    theme: 'fork',
    rating: 600,
  },
  {
    fen: '4k3/8/2q5/3N4/8/8/8/4K3 w - - 0 1',
    moves: ['Nc7+'],
    theme: 'fork',
    rating: 610,
  },
  {
    fen: '4k3/8/8/1q1N4/8/8/8/4K3 w - - 0 1',
    moves: ['Nc7+'],
    theme: 'fork',
    rating: 620,
  },
  {
    fen: '2k5/1q6/8/8/3N4/8/8/4K3 w - - 0 1',
    moves: ['Nb5'],
    theme: 'fork',
    rating: 640,
  },
  {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    moves: ['Nxf7'],
    theme: 'fork',
    rating: 850,
  },
  {
    fen: '6k1/pp3ppp/4q3/8/8/2N5/PP3PPP/6K1 w - - 0 1',
    moves: ['Nd5'],
    theme: 'fork',
    rating: 700,
  },
  {
    fen: '6k1/5ppp/8/2q5/8/2N5/5PPP/6K1 w - - 0 1',
    moves: ['Ne4'],
    theme: 'fork',
    rating: 680,
  },
  {
    fen: 'r3k2r/ppp2ppp/2n5/3q4/8/2N5/PPP2PPP/R2QK2R w KQkq - 0 1',
    moves: ['Nxd5'],
    theme: 'fork',
    rating: 650,
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
    rating: 570,
  },

  // ----- PIN -----
  {
    fen: '4k3/4r3/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 500,
  },
  {
    fen: '4k3/4q3/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 550,
  },
  {
    fen: '4k3/4n3/8/8/8/8/8/4R1K1 w - - 0 1',
    moves: ['Rxe7+'],
    theme: 'pin',
    rating: 480,
  },
  {
    fen: '4k3/8/4b3/8/8/8/4R3/4K3 w - - 0 1',
    moves: ['Rxe6'],
    theme: 'pin',
    rating: 520,
  },
  {
    fen: 'r3k3/8/8/8/8/8/8/R3K3 w Qq - 0 1',
    moves: ['Rxa8+'],
    theme: 'pin',
    rating: 460,
  },
  {
    fen: '4k3/4q3/8/8/8/8/8/4Q1K1 w - - 0 1',
    moves: ['Qxe7+'],
    theme: 'pin',
    rating: 540,
  },

  // ----- SKEWER -----
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
    fen: '7q/8/8/8/8/8/8/R3k1K1 w - - 0 1',
    moves: ['Ra8'],
    theme: 'skewer',
    rating: 680,
  },
  {
    fen: '7r/8/8/8/8/8/8/R3k1K1 w - - 0 1',
    moves: ['Ra8'],
    theme: 'skewer',
    rating: 660,
  },
  {
    fen: 'q7/8/8/8/8/8/8/4k1KR w - - 0 1',
    moves: ['Rh8'],
    theme: 'skewer',
    rating: 670,
  },
  {
    fen: 'r7/8/8/8/8/8/8/4k1KR w - - 0 1',
    moves: ['Rh8'],
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
    rating: 350,
  },
  {
    fen: '4k3/3P4/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['d8=Q+'],
    theme: 'endgame',
    rating: 360,
  },
  {
    fen: '6k1/5P2/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['f8=Q+'],
    theme: 'endgame',
    rating: 370,
  },
  {
    fen: '7k/6P1/8/8/8/8/8/4K3 w - - 0 1',
    moves: ['g8=Q+'],
    theme: 'endgame',
    rating: 380,
  },
  {
    fen: '8/8/8/8/8/4k3/3P4/4K3 w - - 0 1',
    moves: ['d4'],
    theme: 'endgame',
    rating: 450,
  },
  {
    fen: '8/8/8/4k3/8/3P4/8/4K3 w - - 0 1',
    moves: ['d4+'],
    theme: 'endgame',
    rating: 500,
  },
];

export async function seedPuzzles(prisma: PrismaClient): Promise<{
  inserted: number;
  alreadyPresent: number;
  rejected: { reason: string; fen: string; move: string }[];
}> {
  const rejected: { reason: string; fen: string; move: string }[] = [];
  let inserted = 0;
  const alreadyPresent = 0;

  // Fresh bank — drop stale toy/illegal puzzles from earlier seeds.
  await prisma.userPuzzleStats.deleteMany();
  await prisma.dailyPuzzle.deleteMany();
  await prisma.puzzle.deleteMany();

  for (const c of HAND_CRAFTED) {
    const checked = validateAndNormalize(c);
    if (!checked.ok) {
      rejected.push({
        reason: checked.reason,
        fen: c.fen,
        move: c.moves[0] ?? '',
      });
      continue;
    }

    await prisma.puzzle.create({
      data: {
        fen: c.fen,
        moves: JSON.stringify(checked.moves),
        theme: c.theme,
        rating: c.rating,
      },
    });
    inserted += 1;
  }

  return { inserted, alreadyPresent, rejected };
}
