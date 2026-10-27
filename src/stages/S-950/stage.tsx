import "./styles.css";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import MicOutlined from "@mui/icons-material/MicOutlined";
import MusicNoteOutlined from "@mui/icons-material/MusicNoteOutlined";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { type GuitarState, guitar } from "./listen";
import { locale } from "./locale";
import { manifest } from "./manifest";
import { strings } from "./pitch";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
/**
 * S-950
 * 目的: 太さの違う六弦に対応する主音高を、実マイクから単音ずつ認識する。
 * 最初の一手: いずれかの箱を押してマイクを許可し、弦の反応を見る。
 * 箱ごとの解法:
 * - B01「一番太い弦」: E2=82.4069Hzの単音を実マイクへ出し、目標±35centで300ms継続する。
 * - B02「下から二番目の弦」: A2=110Hzの単音を実マイクへ出し、目標±35centで300ms継続する。
 * - B03「下から三番目の弦」: D3=146.8324Hzの単音を実マイクへ出し、目標±35centで300ms継続する。
 * - B04「上から三番目の弦」: G3=195.9977Hzの単音を実マイクへ出し、目標±35centで300ms継続する。
 * - B05「上から二番目の弦」: B3=246.9417Hzの単音を実マイクへ出し、目標±35centで300ms継続する。
 * - B06「一番細い弦」: E4=329.6276Hzの単音を実マイクへ出し、目標±35centで300ms継続する。E2とは別octaveとする。
 * 各箱はYIN型の周期性と基音/倍音のenergy確認を経た音高が、目標±35centで300ms継続すると開く。順不同/単音でよく、ギター以外の同音高も受け付ける。許容幅/保持時間/品質しきい値は実音調整用の仮値。150ms超のgap/停止時計/不正値では保持をresetする。
 * 使用API: getUserMedia、AudioContext/MediaStreamAudioSourceNode/AnalyserNodeの実Float time-domain 8192 samples、実audio clockとrequestAnimationFrame。
 * 権限・privacy: 箱から明示的にmicを許可し、音声は短い判定buffer内だけで使う。録音/保存/外部送信しない。音声補正offをideal指定するが実OSの補正無効までは保証しない。
 * 対応環境: secure contextで実micとWeb Audioを利用できるbrowser。雑音/和音/未観測を音高成功へ変換せず、物理楽器・音量・倍音比と端末差の調整を残す。
 */
function S950Stage(props: Props) {
  const session = useRef<ReturnType<typeof guitar> | null>(null),
    boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [state, setState] = useState<GuitarState>({
    status: "idle",
    running: false,
    nearest: null,
    alignment: 0,
  });
  useEffect(() => {
    const current = guitar(props.signal, setState, (index) => {
      const string = strings[index];
      if (string) boxes.current[string.id].solve();
    });
    session.current = current;
    const hide = () => current.dispose();
    window.addEventListener("pagehide", hide, { once: true });
    return () => {
      window.removeEventListener("pagehide", hide);
      current.dispose();
      if (session.current === current) session.current = null;
    };
  }, [props.signal]);
  return (
    <div className="puzzle puzzle--centered s950-stage">
      <MicOutlined aria-label={stageText(props.locale, locale.microphone)} />
      <div className="s950-neck">
        {[...strings].reverse().map((string) => {
          const index = strings.indexOf(string),
            active = state.nearest === index;
          return (
            <div
              key={string.id}
              className="s950-row"
              data-active={active}
              style={
                {
                  "--string-thickness": `${1 + (5 - index) * 0.5}px`,
                  "--alignment": active ? state.alignment : 0,
                } as CSSProperties
              }
            >
              <div className="s950-string" aria-hidden="true">
                <span />
              </div>
              <StageProblemGiftBox
                box={props.boxes[string.id]}
                locale={props.locale}
                onClick={() => void session.current?.start()}
              />
            </div>
          );
        })}
      </div>
      {state.running ? (
        <button
          className="stage-action"
          type="button"
          aria-label={stageText(props.locale, locale.stop)}
          onClick={() => session.current?.stop()}
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      ) : null}
      <p role="status" className="interaction-status">
        {statusText(props.locale, state.status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: Object.fromEntries(
    strings.map((string) => [
      string.id,
      { icon: MusicNoteOutlined, color: "#dba75b", label: locale[string.id] },
    ]),
  ) as Record<
    (typeof manifest.boxIds)[number],
    {
      icon: typeof MusicNoteOutlined;
      color: string;
      label: (typeof locale)["B01"];
    }
  >,
  probe: () =>
    safeCapabilityProbe(() =>
      isSecureContext &&
      navigator.mediaDevices &&
      "getUserMedia" in navigator.mediaDevices &&
      "AudioContext" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S950Stage,
});
