export const s710Flags = {
  dark: "busycube{dark_frame}",
  broken: "busycube{broken_input}",
  qr: "busycube{qr_replaced}",
  second: "busycube{second_pass}",
} as const;

export type S710FlagKind = keyof typeof s710Flags;

export interface S710LayoutMessage {
  channel: "busycube-s710-tool";
  height: number;
  session: string;
  type: "layout";
}
