import { type DuelState, duel, type Move, winner } from "./duel";
import { rankings } from "./rankings";

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
it("rematches each time and credits three genuine wins on either screen", () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  for (let round = 0; round < 3; round++) {
    one.session.next();
    two.session.next();
    f.flush();
    expect(one.state().phase).toBe("playing");
    two.session.pick("rock");
    f.flush();
    expect(one.state().theirs).toBeNull();
    one.session.pick("scissors");
    f.flush();
    expect(two.state().streak).toBe(round + 1);
    expect(two.solve).toHaveBeenCalledTimes(round === 2 ? 1 : 0);
  }
  expect(one.solve).not.toHaveBeenCalled();
  f.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("CPU is fair before two wins and counters every third-win attempt", async () => {
  for (const hand of ["rock", "paper", "scissors"] as const) {
    const changed = vi.fn(),
      solve = vi.fn();
    const losing =
      hand === "rock" ? "scissors" : hand === "paper" ? "rock" : "paper";
    const d = duel(
      { send: vi.fn(), listen: () => () => {}, close: vi.fn() },
      ids[0] ?? "",
      origin,
      new AbortController().signal,
      changed,
      solve,
      () => losing,
    );
    for (let n = 0; n < 3; n++) {
      d.next();
      await vi.advanceTimersByTimeAsync(1800);
      d.pick(hand);
    }
    expect(changed.mock.lastCall?.[0]).toMatchObject({ winner: 2, streak: 0 });
    expect(
      new Set(changed.mock.calls.map((c) => c[0].opponent).filter(Boolean))
        .size,
    ).toBe(3);
    expect(solve).not.toHaveBeenCalled();
    d.dispose();
  }
});
it("rejects stale hands, third-party interference and aborts without a win", () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  one.session.next();
  two.session.next();
  f.flush();
  const third = f.open(ids[2] ?? "");
  third.session.next();
  f.flush();
  expect(third.state().phase).toBe("waiting");
  two.session.pick("paper");
  one.session.pick("paper");
  f.flush();
  expect(one.state().streak).toBe(0);
  third.session.dispose();
  const old = f.messages.findLast((m) => m.type === "move");
  one.session.next();
  two.session.next();
  f.flush();
  one.receive(old);
  one.receive(old, false);
  one.session.pick("scissors");
  f.flush();
  expect(one.state().phase).toBe("playing");
  one.controller.abort();
  two.session.pick("paper");
  f.flush();
  expect(one.solve).not.toHaveBeenCalled();
  f.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
it("keeps the ranking clue at the bottom", () => {
  expect(rankings.at(-1)?.name).toBe(`${rankings[0]?.name}_sub`);
});
it("covers all nine hand combinations", () => {
  const moves: Move[] = ["rock", "scissors", "paper"];
  expect(moves.map((a) => moves.map((b) => winner(a, b)))).toEqual([
    [0, 1, 2],
    [2, 0, 1],
    [1, 2, 0],
  ]);
});

it("carries two CPU wins into a genuine third win", async () => {
  const f = fixture(),
    one = f.open(ids[0] ?? "");
  const spy = vi
    .spyOn(crypto, "getRandomValues")
    .mockImplementation((array) => {
      if (array instanceof Uint32Array) array.fill(1);
      return array;
    });
  for (let i = 0; i < 2; i++) {
    one.session.next();
    await vi.advanceTimersByTimeAsync(1800);
    one.session.pick("rock");
  }
  expect(one.state().streak).toBe(2);
  const two = f.open(ids[1] ?? "");
  one.session.next();
  two.session.next();
  f.flush();
  two.session.pick("scissors");
  f.flush();
  one.session.pick("rock");
  f.flush();
  expect(one.solve).toHaveBeenCalledOnce();
  one.session.restart();
  expect(one.state()).toMatchObject({ phase: "lobby", streak: 0, history: [] });
  spy.mockRestore();
  f.dispose();
});

it("uses renamed Unicode profiles for matching and rejects invalid or mid-match edits", () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  expect(one.session.rename("  そら_sub  ")).toBe(true);
  expect(one.session.rename("bad name")).toBe(false);
  expect(one.session.rename("x".repeat(21))).toBe(false);
  one.session.next();
  two.session.next();
  f.flush();
  expect(two.state().opponent).toBe("そら_sub");
  expect(one.session.rename("other")).toBe(false);
  one.session.pick("rock");
  two.session.pick("scissors");
  f.flush();
  expect(two.state().history[0]?.opponent).toBe("そら_sub");
  f.dispose();
});
it("groups 28 normal-quantile ratings between two outliers", () => {
  expect(rankings).toHaveLength(30);
  const middle = rankings.slice(1, -1).map((p) => p.score);
  expect(middle.reduce((a, b) => a + b, 0) / 28).toBeCloseTo(5000, 0);
  expect(
    middle.every((score, i) => i === 0 || score < (middle[i - 1] ?? 0)),
  ).toBe(true);
  const variance = middle.reduce((sum, n) => sum + (n - 5000) ** 2, 0) / 28;
  expect(Math.sqrt(variance)).toBeGreaterThan(80);
  expect(Math.sqrt(variance)).toBeLessThan(100);
  expect(rankings[0]?.score).toBeGreaterThan(5000 + 1500);
  expect(rankings.at(-1)?.score).toBeLessThan(5000 - 1500);
});

it("allows twice as long to find a second tab still on the title", async () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  f.flush();
  one.session.next();
  f.flush();
  await vi.advanceTimersByTimeAsync(2000);
  expect(one.state().phase).toBe("waiting");
  two.session.next();
  f.flush();
  expect(one.state().phase).toBe("playing");
  expect(one.state().opponent).toBe(two.state().name);
  f.dispose();
});
it("extends an ongoing search for a newly opened tab, then falls back at 3.6 seconds", async () => {
  const f = fixture(),
    one = f.open(ids[0] ?? "");
  one.session.next();
  await vi.advanceTimersByTimeAsync(1000);
  f.open(ids[1] ?? "");
  f.flush();
  await vi.advanceTimersByTimeAsync(2599);
  expect(one.state().phase).toBe("waiting");
  await vi.advanceTimersByTimeAsync(1);
  expect(one.state().phase).toBe("playing");
  expect(one.state().opponent).not.toMatch(/^guest_/);
  f.dispose();
});
it("returns to the normal CPU delay after the other tab closes", async () => {
  const f = fixture(),
    one = f.open(ids[0] ?? ""),
    two = f.open(ids[1] ?? "");
  f.flush();
  two.session.dispose();
  f.flush();
  one.session.next();
  await vi.advanceTimersByTimeAsync(1799);
  expect(one.state().phase).toBe("waiting");
  await vi.advanceTimersByTimeAsync(1);
  expect(one.state().phase).toBe("playing");
  f.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
