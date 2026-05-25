declare module 'stockfish' {
  function initEngine(
    enginePath?: string | null,
    cb?: (err: unknown, engine: unknown) => void
  ): Promise<{
    sendCommand: (cmd: string) => void;
    listener?: (msg: string) => void;
  }>;
  export = initEngine;
}
