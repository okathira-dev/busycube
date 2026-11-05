export type Move = "rock" | "scissors" | "paper";
export const moves: Move[] = ["rock", "scissors", "paper"];
export interface DuelState {
  phase: "lobby" | "waiting" | "joining" | "playing" | "result";
  name: string;
  opponent: string;
  mine: Move | null;
  theirs: Move | null;
  winner: 0 | 1 | 2 | null;
  streak: number;
  history: {
    id: string;
    opponent: string;
    mine: Move;
    theirs: Move;
    winner: 0 | 1 | 2;
  }[];
}
export interface Transport {
  send(value: unknown): void;
  listen(handler: (event: MessageEvent<unknown>) => void): () => void;
  close(): void;
}
export function validName(value: string): boolean {
  return /^[\p{L}\p{N}_-]{1,20}$/u.test(value);
}
export function winner(a: Move, b: Move): 0 | 1 | 2 {
  return a === b
    ? 0
    : (a === "rock" && b === "scissors") ||
        (a === "scissors" && b === "paper") ||
        (a === "paper" && b === "rock")
      ? 1
      : 2;
}
export function randomMove(): Move {
  // Reject the remainder to keep all three hands equally likely.
  let value = 0xffffffff;
  while (value === 0xffffffff)
    value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0xffffffff;
  return moves[value % 3] ?? "rock";
}
export function duel(
  transport: Transport,
  id: string,
  origin: string,
  signal: AbortSignal,
  changed: (state: DuelState) => void,
  solve: () => void,
  random = randomMove,
) {
  let state: DuelState = {
    phase: "lobby",
    name: `guest_${id.slice(0, 8)}`,
    opponent: "",
    mine: null,
    theirs: null,
    winner: null,
    streak: 0,
    history: [],
  };
  let alive = true,
    credited = false,
    peer: string | null = null,
    match: string | null = null,
    cpu: Move | null = null,
    theirs: Move | null = null,
    serial = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const otherTabs = new Set<string>();
  const emit = () => {
    if (alive && !signal.aborted) changed({ ...state });
  };
  const send = (type: string, extra = {}) =>
    transport.send({
      protocol: "busycube-duel-v2",
      from: id,
      to: peer,
      match,
      name: state.name,
      type,
      ...extra,
    });
  const reset = () => {
    clearTimeout(timer);
    peer = null;
    match = null;
    cpu = null;
    theirs = null;
    state = { ...state, mine: null, theirs: null, winner: null, opponent: "" };
  };
  const decide = () => {
    if (!state.mine || !theirs || state.phase !== "playing") return;
    const result = winner(state.mine, theirs);
    state = {
      ...state,
      phase: "result",
      theirs,
      winner: result,
      streak: result === 1 ? state.streak + 1 : 0,
      history: [
        {
          id: match ?? crypto.randomUUID(),
          opponent: state.opponent,
          mine: state.mine,
          theirs,
          winner: result,
        },
        ...state.history,
      ].slice(0, 8),
    };
    emit();
    if (state.streak === 3 && peer && !credited) {
      credited = true;
      solve();
    }
  };
  const search = () => {
    if (!alive || signal.aborted || state.streak === 3) return;
    if (peer && state.phase !== "result") send("bye");
    reset();
    state.phase = "waiting";
    emit();
    send("hello");
    let extended = otherTabs.size > 0;
    const fallback = () => {
      if (state.phase !== "waiting" || !alive) return;
      if (!extended && otherTabs.size > 0) {
        extended = true;
        timer = setTimeout(fallback, 1800);
        return;
      }
      cpu = random();
      serial++;
      state = {
        ...state,
        phase: "playing",
        opponent: `${["mikan", "kuma", "luna", "nagi", "pico", "tora"][serial % 6]}_${id.slice(0, 4)}${serial.toString().padStart(2, "0")}`,
      };
      emit();
    };
    timer = setTimeout(fallback, extended ? 3600 : 1800);
  };
  const joining = () => {
    clearTimeout(timer);
    state.phase = "joining";
    emit();
    timer = setTimeout(() => {
      if (alive && state.phase === "joining") {
        send("bye");
        search();
      }
    }, 5000);
  };
  const start = () => {
    clearTimeout(timer);
    state.phase = "playing";
    emit();
  };
  const remove = transport.listen((event) => {
    if (
      !alive ||
      signal.aborted ||
      !event.isTrusted ||
      event.origin !== origin ||
      !event.data ||
      typeof event.data !== "object"
    )
      return;
    const d = event.data as Record<string, unknown>;
    if (
      d.protocol !== "busycube-duel-v2" ||
      typeof d.from !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(d.from) ||
      d.from === id ||
      typeof d.name !== "string" ||
      !validName(d.name)
    )
      return;
    if (d.type === "departed") {
      otherTabs.delete(d.from);
      return;
    }
    if (d.type === "presence" || d.type === "presence-request") {
      otherTabs.add(d.from);
      if (d.type === "presence-request") send("presence");
      return;
    }
    if (d.type === "hello" && state.phase === "waiting" && !peer) {
      if (id < d.from) {
        peer = d.from;
        match = crypto.randomUUID();
        state.opponent = d.name;
        joining();
        send("offer");
      } else send("hello");
      return;
    }
    if (d.to !== id || typeof d.match !== "string") return;
    if (
      d.type === "offer" &&
      state.phase === "waiting" &&
      !peer &&
      d.from < id
    ) {
      peer = d.from;
      match = d.match;
      state.opponent = d.name;
      joining();
      send("accept");
      return;
    }
    if (d.from !== peer || d.match !== match) return;
    if (d.type === "accept" && state.phase === "joining" && id < d.from) {
      start();
      send("confirmed");
      return;
    }
    if (d.type === "confirmed" && state.phase === "joining" && id > d.from) {
      start();
      return;
    }
    if (d.type === "bye" && state.phase !== "result") {
      reset();
      state.phase = "lobby";
      emit();
      return;
    }
    if (
      d.type === "move" &&
      state.phase === "playing" &&
      !theirs &&
      moves.includes(d.move as Move)
    ) {
      theirs = d.move as Move;
      decide();
    }
  });
  const pick = (value: Move) => {
    if (
      !alive ||
      signal.aborted ||
      state.phase !== "playing" ||
      state.mine ||
      !moves.includes(value)
    )
      return;
    state.mine = value;
    if (peer) send("move", { move: value });
    else {
      theirs =
        state.streak === 2
          ? value === "rock"
            ? "paper"
            : value === "paper"
              ? "scissors"
              : "rock"
          : cpu;
    }
    decide();
    emit();
  };
  const restart = () => {
    if (!alive) return;
    if (peer && state.phase !== "result") send("bye");
    reset();
    state = { ...state, phase: "lobby", streak: 0, history: [] };
    emit();
  };
  const dispose = () => {
    if (!alive) return;
    send("departed");
    if (peer && state.phase !== "result") send("bye");
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
    send("presence-request");
  }
  const rename = (value: string): boolean => {
    const name = value.trim();
    if (!alive || signal.aborted || state.phase !== "lobby" || !validName(name))
      return false;
    state = { ...state, name };
    emit();
    return true;
  };
  return { pick, next: search, restart, dispose, rename };
}
