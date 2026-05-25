import type { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as gameService from '../services/game.service';
import type { CreateGameApiBody, PlayMoveBody } from '../types';
import { HttpError } from '../types';

function assertSelfOr403(requestingUserId: string, targetUserId: string): void {
  if (requestingUserId !== targetUserId) {
    throw new HttpError(403, 'You can only list your own games');
  }
}

function assertCreateAuthorized(
  requestingUserId: string,
  whiteId: string,
  blackId: string
): void {
  if (requestingUserId !== whiteId && requestingUserId !== blackId) {
    throw new HttpError(
      403,
      'You must be one of the players to create this game'
    );
  }
}

/** POST /api/games/create */
export const createGamePost = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const body = (req.body ?? {}) as CreateGameApiBody;
  if (!body.whitePlayerId || !body.blackPlayerId) {
    throw new HttpError(400, 'whitePlayerId and blackPlayerId are required');
  }
  assertCreateAuthorized(userId, body.whitePlayerId, body.blackPlayerId);
  const game = await gameService.createGame(
    body.whitePlayerId,
    body.blackPlayerId,
    { timeControl: body.timeControl }
  );
  res.status(201).json(game);
});

/** POST /api/games/bot — create an unrated game vs AI (open-seat). */
export const createBotGame = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const timeControl =
    typeof req.body?.timeControl === 'string' ? req.body.timeControl : undefined;
  const color =
    req.body?.color === 'black' || req.body?.color === 'white'
      ? (req.body.color as 'white' | 'black')
      : 'white';
  const difficulty =
    req.body?.difficulty === 'easy' ||
    req.body?.difficulty === 'medium' ||
    req.body?.difficulty === 'hard'
      ? (req.body.difficulty as 'easy' | 'medium' | 'hard')
      : 'medium';
  const game = await gameService.createBotGame(userId, {
    color,
    timeControl,
    difficulty,
  });
  res.status(201).json(game);
});

/** POST /api/games/:gameId/move */
export const submitMove = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const body = req.body as PlayMoveBody;
  if (!body?.from || !body?.to) {
    throw new HttpError(400, 'from and to are required');
  }
  const promotion = (body.promotion ?? 'q') as 'q' | 'r' | 'b' | 'n';
  const game = await gameService.makeMove(
    gameId,
    body.from,
    body.to,
    promotion,
    userId
  );
  res.json(game);
});

/** GET /api/games/:gameId/board */
export const getBoard = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const state = await gameService.getBoardState(gameId, userId);
  res.json(state);
});

/** GET /api/games/:gameId/moves — SAN list, or ?verbose=1 for {san,from,to,promotion}[] */
export const getHistory = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const verbose =
    req.query.verbose === '1' ||
    req.query.verbose === 'true' ||
    req.query.verbose === 'yes';
  if (verbose) {
    const moves = await gameService.getMoveHistoryVerbose(gameId, userId);
    res.json({ moves });
    return;
  }
  const history = await gameService.getMoveHistory(gameId, userId);
  res.json({ moves: history });
});

/** GET /api/games/user/:userId/history?limit=50 */
export const getProfileHistory = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { userId: targetId } = req.params;
  assertSelfOr403(userId, targetId);
  const raw = req.query.limit;
  const n = raw === undefined || raw === '' ? 50 : Number(raw);
  const limit = Number.isFinite(n) ? Math.floor(n) : 50;
  const games = await gameService.getProfileGameHistory(
    targetId,
    userId,
    limit
  );
  res.json({ games });
});

/** GET /api/games/user/:userId/recent?limit=5 */
export const getRecentGames = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { userId: targetId } = req.params;
  assertSelfOr403(userId, targetId);
  const raw = req.query.limit;
  const n = raw === undefined || raw === '' ? 5 : Number(raw);
  const limit = Number.isFinite(n) ? Math.floor(n) : 5;
  const games = await gameService.getRecentGamesSummary(
    targetId,
    userId,
    limit
  );
  res.json({ games });
});

/** GET /api/games/user/:userId */
export const getUserGames = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { userId: targetId } = req.params;
  assertSelfOr403(userId, targetId);
  const games = await gameService.getGamesForUser(targetId);
  res.json({ games });
});

/** GET /api/games/:gameId/valid-moves?square=e2 */
export const getValidMovesForSquare = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const square = req.query.square;
  if (typeof square !== 'string' || !square) {
    throw new HttpError(400, 'Query parameter square is required (e.g. ?square=e2)');
  }
  const moves = await gameService.getValidMoves(gameId, square, userId);
  res.json({ square, moves });
});

/** GET /api/games/:gameId/pgn — raw PGN, or ?format=json for { pgn } */
export const getPgn = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const pgn = await gameService.exportPGN(gameId, userId);
  if (req.query.format === 'json') {
    res.json({ pgn });
    return;
  }
  res.type('application/x-chess-pgn').send(pgn);
});

/** GET /api/games/history/:userId — paginated completed games */
export const getGameHistoryPaginated = asyncHandler(
  async (req, res: Response) => {
    const userId = req.user!.sub;
    const { userId: targetId } = req.params;
    assertSelfOr403(userId, targetId);

    const pageRaw = req.query.page;
    const sizeRaw = req.query.pageSize;
    const page =
      pageRaw === undefined || pageRaw === ''
        ? 1
        : Math.max(1, Number(pageRaw));
    const pageSize =
      sizeRaw === undefined || sizeRaw === ''
        ? 20
        : Math.max(1, Number(sizeRaw));

    const resultRaw = req.query.result;
    const result =
      resultRaw === 'win' ||
      resultRaw === 'loss' ||
      resultRaw === 'draw' ||
      resultRaw === 'all'
        ? resultRaw
        : 'all';

    const opponent =
      typeof req.query.opponent === 'string' ? req.query.opponent : undefined;
    const dateFrom =
      typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo =
      typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;

    const sort = gameService.parseGameHistorySort(req.query.sort);

    const payload = await gameService.getCompletedGameHistoryPage(
      targetId,
      userId,
      {
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 20,
        result,
        opponent,
        dateFrom,
        dateTo,
        sort,
      }
    );
    res.json(payload);
  }
);

/** GET /api/games/:gameId/status — turn, check, mate, stalemate, draw */
export const getStatus = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const status = await gameService.getChessStatus(gameId, userId);
  res.json(status);
});

/** GET /api/games/:gameId — session + opponent preview */
export const getGameSession = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const session = await gameService.getGameSession(gameId, userId);
  res.json(session);
});

/** POST /api/games/:gameId/resign */
export const resignGame = asyncHandler(async (req, res: Response) => {
  const userId = req.user!.sub;
  const { gameId } = req.params;
  const game = await gameService.resignGame(gameId, userId);
  res.json(game);
});
