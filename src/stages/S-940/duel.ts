export type Move = "rock" | "scissors" | "paper";
export interface DuelState {
  phase: "waiting" | "joining" | "playing" | "result";
  role: 1 | 2 | null;
  mine: Move | null;
  theirs: Move | null;
  opponentReady: boolean;
  winner: 0 | 1 | 2 | null;
}
export interface Transport {
  send(value: unknown): void;
  listen(handler: (event: MessageEvent<unknown>) => void): () => void;
  close(): void;
}
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const move = (value: unknown): value is Move =>
  value === "rock" || value === "scissors" || value === "paper";
export function winner(p1: Move, p2: Move): 0 | 1 | 2 {
  return p1 === p2
    ? 0
    : (p1 === "rock" && p2 === "scissors") ||
        (p1 === "scissors" && p2 === "paper") ||
        (p1 === "paper" && p2 === "rock")
      ? 1
      : 2;
}
export function duel(
  transport: Transport,
  id: string,
  origin: string,
  signal: AbortSignal,
  changed: (state: DuelState) => void,
  solve: () => void,
) {
  let alive = true,
    credited = false;
  let peer: string | null = null,
    match: string | null = null,
    round: string | null = null;
  let role: 1 | 2 | null = null,
    phase: DuelState["phase"] = "waiting";
  let mine: Move | null = null,
    theirs: Move | null = null,
    result: DuelState["winner"] = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const emit = () => {
    if (alive && !signal.aborted)
      changed({
        phase,
        role,
        mine,
        theirs: mine && theirs ? theirs : null,
        opponentReady: theirs !== null,
        winner: result,
      });
  };
  const send = (type: string, extra = {}) => {
    if (alive)
      transport.send({
        protocol: "busycube-duel-v1",
        from: id,
        to: peer,
        match,
        type,
        ...extra,
      });
  };
  const lobby = () => {
    clearTimeout(timer);
    peer = null;
    match = null;
    round = null;
    role = null;
    mine = null;
    theirs = null;
    result = null;
    phase = "waiting";
    emit();
  };
  const joining = () => {
    phase = "joining";
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!alive || signal.aborted || phase !== "joining") return;
      lobby();
      send("hello");
    }, 5000);
    emit();
  };
  const start = (next: string) => {
    clearTimeout(timer);
    round = next;
    mine = null;
    theirs = null;
    result = null;
    phase = "playing";
    emit();
  };
  const decide = () => {
    if (!mine || !theirs || !role || phase !== "playing") {
      emit();
      return;
    }
    result = role === 1 ? winner(mine, theirs) : winner(theirs, mine);
    phase = "result";
    emit();
    if (role === 1 && result === 1 && !credited && alive && !signal.aborted) {
      credited = true;
      solve();
    }
  };
  const receive = (event: MessageEvent<unknown>) => {
    if (
      !alive ||
      signal.aborted ||
      !event.isTrusted ||
      event.origin !== origin ||
      !event.data ||
      typeof event.data !== "object"
    )
      return;
    const data = event.data as Record<string, unknown>;
    if (
      data.protocol !== "busycube-duel-v1" ||
      !uuid(data.from) ||
      data.from === id
    )
      return;
    if (data.type === "hello") {
      if (peer || phase !== "waiting") return;
      if (id < data.from) {
        peer = data.from;
        match = crypto.randomUUID();
        role = 1;
        joining();
        send("offer");
      } else send("hello");
      return;
    }
    if (data.to !== id || !uuid(data.match)) return;
    if (
      data.type === "offer" &&
      !peer &&
      phase === "waiting" &&
      data.from < id
    ) {
      peer = data.from;
      match = data.match;
      role = 2;
      joining();
      send("accept");
      return;
    }
    if (data.from !== peer || data.match !== match) return;
    if (data.type === "accept" && phase === "joining" && role === 1) {
      const next = crypto.randomUUID();
      start(next);
      send("confirmed", { round: next });
      return;
    }
    if (
      data.type === "confirmed" &&
      phase === "joining" &&
      role === 2 &&
      uuid(data.round)
    ) {
      start(data.round);
      return;
    }
    if (data.type === "bye") {
      lobby();
      send("hello");
      return;
    }
    if (
      data.type === "round" &&
      role === 2 &&
      phase === "result" &&
      data.previous === round &&
      uuid(data.round) &&
      data.round !== round
    ) {
      start(data.round);
      return;
    }
    if (
      data.type === "move" &&
      phase === "playing" &&
      data.round === round &&
      move(data.move) &&
      !theirs
    ) {
      theirs = data.move;
      decide();
    }
  };
  const remove = transport.listen(receive);
  const pick = (value: Move) => {
    if (!alive || signal.aborted || phase !== "playing" || mine || !move(value))
      return;
    mine = value;
    send("move", { round, move: value });
    decide();
  };
  const next = () => {
    if (!alive || signal.aborted || role !== 1 || phase !== "result" || !round)
      return;
    const previous = round,
      value = crypto.randomUUID();
    start(value);
    send("round", { previous, round: value });
  };
  const restart = () => {
    if (!alive || signal.aborted) return;
    if (peer) send("bye");
    lobby();
    send("hello");
  };
  const dispose = () => {
    if (!alive) return;
    if (peer) send("bye");
    alive = false;
    clearTimeout(timer);
    remove();
    transport.close();
    signal.removeEventListener("abort", dispose);
  };
  signal.addEventListener("abort", dispose, { once: true });
  if (signal.aborted) dispose();
  else {
    emit();
    send("hello");
  }
  return { pick, next, restart, dispose };
}
