import { type DuelState, duel, type Move, winner } from "./duel";

const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
const origin = "https://game.example";
function fixture() {
  const peers = new Map<
    string,
    { handler?: (event: MessageEvent<unknown>) => void }
  >();
  const queue: (() => void)[] = [],
    messages: Record<string, unknown>[] = [];
  const sessions: ReturnType<typeof duel>[] = [];
  const open = (id: string) => {
    const client: { handler?: (event: MessageEvent<unknown>) => void } = {};
    peers.set(id, client);
    let state: DuelState | null = null;
    const solve = vi.fn(),
      controller = new AbortController();
    const receive = (data: unknown, trusted = true) =>
      client.handler?.({
        isTrusted: trusted,
        origin,
        data,
      } as MessageEvent<unknown>);
    const session = duel(
      {
        send: (data) => {
          messages.push(data as Record<string, unknown>);
          for (const [other, target] of peers)
            if (id !== other)
              queue.push(() =>
                target.handler?.({
                  isTrusted: true,
                  origin,
                  data,
                } as MessageEvent<unknown>),
              );
        },
        listen: (handler) => {
          client.handler = handler;
          return () => {
            client.handler = undefined;
          };
        },
        close: () => peers.delete(id),
      },
      id,
      origin,
      controller.signal,
      (value) => {
        state = value;
      },
      solve,
    );
    sessions.push(session);
    return {
      session,
      solve,
      controller,
      receive,
      state: () => {
        if (!state) throw new Error("No duel state");
        return state;
      },
    };
  };
  const flush = () => {
    for (let i = 0; queue.length; i++) {
      if (i > 100) throw new Error("Message loop");
      queue.shift()?.();
    }
  };
  return {
    open,
    flush,
    messages,
    dispose: () =>
      sessions.forEach((session) => {
        session.dispose();
      }),
  };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
it("pairs two contexts, hides the opponent's selected hand, and awards one genuine P1 win only once", () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  f.flush();
  expect(one.state().role).toBe(1);
  expect(two.state().role).toBe(2);
  expect(one.solve).not.toHaveBeenCalled();
  two.session.pick("scissors");
  f.flush();
  expect(one.state()).toMatchObject({
    theirs: null,
    opponentReady: true,
    phase: "playing",
  });
  expect(one.solve).not.toHaveBeenCalled();
  one.session.pick("rock");
  f.flush();
  expect(one.state()).toMatchObject({
    mine: "rock",
    theirs: "scissors",
    winner: 1,
  });
  expect(one.solve).toHaveBeenCalledOnce();
  expect(two.solve).not.toHaveBeenCalled();
  one.session.pick("paper");
  f.flush();
  expect(one.solve).toHaveBeenCalledOnce();
  f.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("draw and P2 win remain uncompleted and the P1-led next round rejects replayed old hands", () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  f.flush();
  one.session.pick("paper");
  two.session.pick("paper");
  f.flush();
  expect(one.state().winner).toBe(0);
  const old = f.messages.findLast((message) => message.type === "move");
  two.session.next();
  expect(one.state().phase).toBe("result");
  one.session.next();
  f.flush();
  if (old) one.receive(old);
  expect(one.state().opponentReady).toBe(false);
  one.session.pick("scissors");
  two.session.pick("rock");
  f.flush();
  expect(one.state().winner).toBe(2);
  expect(one.solve).not.toHaveBeenCalled();
  one.session.next();
  f.flush();
  one.session.pick("rock");
  two.session.pick("scissors");
  f.flush();
  expect(one.solve).toHaveBeenCalledOnce();
  f.dispose();
});
it("keeps a third context outside the existing match and ignores synthetic/foreign/old-match messages", () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  f.flush();
  const third = f.open(ids[2] ?? "");
  f.flush();
  expect(third.state().phase).toBe("waiting");
  two.session.pick("scissors");
  f.flush();
  const actual = f.messages.findLast((message) => message.type === "move");
  if (!actual) throw new Error("Missing real message");
  one.session.restart();
  f.flush();
  one.receive(actual);
  one.receive({ ...actual, match: "old" });
  one.receive(actual, false);
  one.session.pick("rock");
  f.flush();
  expect(one.solve).not.toHaveBeenCalled();
  expect(third.solve).not.toHaveBeenCalled();
  f.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("releases a pending offer on timeout and an aborted session cannot select or receive an old win", async () => {
  const f = fixture(),
    one = f.open(ids[0] ?? "");
  one.receive({ protocol: "busycube-duel-v1", from: ids[1], type: "hello" });
  expect(one.state().phase).toBe("joining");
  await vi.advanceTimersByTimeAsync(5000);
  expect(one.state().phase).toBe("waiting");
  one.controller.abort();
  one.session.pick("rock");
  f.flush();
  expect(one.solve).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  f.dispose();
});
it("covers all nine hand combinations without extra wins", () => {
  const moves: Move[] = ["rock", "scissors", "paper"];
  expect(moves.map((a) => moves.map((b) => winner(a, b)))).toEqual([
    [0, 1, 2],
    [2, 0, 1],
    [1, 2, 0],
  ]);
});
