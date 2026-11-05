import "./styles.css";
import CommitOutlined from "@mui/icons-material/CommitOutlined";
import FastForwardOutlined from "@mui/icons-material/FastForwardOutlined";
import FastRewindOutlined from "@mui/icons-material/FastRewindOutlined";
import PauseOutlined from "@mui/icons-material/PauseOutlined";
import PictureInPictureAltOutlined from "@mui/icons-material/PictureInPictureAltOutlined";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import SkipNextOutlined from "@mui/icons-material/SkipNextOutlined";
import SkipPreviousOutlined from "@mui/icons-material/SkipPreviousOutlined";
import StopOutlined from "@mui/icons-material/StopOutlined";
import VolumeOffOutlined from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import { useEffect, useRef, useState } from "react";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";
import {
  actionBoxes,
  type BoxId,
  createPlayer,
  type PlayerState,
} from "./player";
import { tracks } from "./tracks";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

/**
 * S-430
 * 目的: 外側のMedia Session九操作と実Audio Sessionの割り込み復帰を、実メディアの状態変化と対応させる。
 * 最初の一手: いずれかの再生系アイコンの箱を押し、音付き波形動画と外側のプレイヤーを見る。スピーカーの箱は別途Audio Sessionの復帰観測を開始する。
 * 箱ごとの解法:
 * - B01「二本の縦線」: 再生中に外側から一時停止する。登録したpause callbackが実動画をpauseし、pausedになった場合だけ開く。ページの停止や自然終了では開かない。
 * - B02「音波の出るスピーカー」: 箱から始めた同じAudio Session playback試行で、別の音等によるtrusted interruptedの後に対象動画のtrusted playingとsession activeを観測すると開く。初回再生・通常pause・ページ操作だけでは開かず、playingとactiveの到着順は固定しない。
 * - B03「三角」: 外側から再生する。play callbackが停止/一時停止中の動画を実playし、Promise成功と実再生状態が揃うと開く。箱からの開始自体では開かない。
 * - B04「四角」: 外側から停止する。stop callbackが実pauseと先頭復帰を行い、必要な実seekedとpaused/先頭状態を確認して開く。pause actionをstopへ読み替えない。
 * - B05「右向きの二重三角」: 外側から送りを要求する。callbackのseekOffsetがあればその正の有限値を使い、省略時だけ5秒とする。範囲内の目標へcurrentTimeを設定し、同じsourceのtrusted seekedで前進/目標位置を確認して開く。15秒限定ではない。
 * - B06「左向きの二重三角」: 同様に外側から戻しを要求し、実seekedの後退と目標位置を確認すると開く。
 * - B07「左三角と縦線」: 外側から前メディアを要求する。二曲のplaylistで異なる実sourceへ切替え、読み込み成功と必要な再生継続を確認すると開く。
 * - B08「右三角と縦線」: 外側から次メディアを要求し、同様に異なる実sourceへ切り替わると開く。
 * - B09「線上のつまみ」: 外側からseektoを要求する。有限のseekTimeへ実seekし、trusted seekedで変化/目標位置を確認すると開く。登録や既存位置だけで開かない。
 * - B10「小さな窓が重なる画面」: 外側からMedia Session経由でPiPを要求する。reason useractionを伴うcallbackに続く実request成功・trusted enterpictureinpicture・当該videoの実PiP状態が揃うと開く。自動contentoccludedや欠損/不明理由は手動と断定せず開かない。普通のPiP eventだけとは区別する。
 * 使用API: HTMLVideoElement、Media Session actions/MediaMetadata/playbackState/setPositionState、Audio Session statechange/type、PiP。setPositionStateは実長さ/速度/位置が有限のときだけ更新する。
 * 権限・privacy: 架空の二曲の合成音/波形動画だけを再生し、録音・端末情報・外側操作の履歴を保存/送信しない。ページ内の停止/消音は安全操作として残す。離脱時にmedia・handler・待機listener・PiPを解放し、Audio Session typeを元へ戻す。
 * 対応環境: 各外側UI/buttonの提供はbrowser/OS依存。登録成功だけでは達成にしない。Audio SessionとPiPの理由提供を含む未観測差は、他の確定した再生系の箱を止めない。
 */
function S430Stage(props: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const player = useRef<ReturnType<typeof createPlayer> | null>(null);
  const boxes = useRef(props.boxes);
  boxes.current = props.boxes;
  const [view, setView] = useState<PlayerState>({
    status: "idle",
    track: 0,
    paused: true,
    muted: false,
    position: null,
    duration: null,
    available: {},
  });
  useEffect(() => {
    if (!video.current || props.signal.aborted) return;
    const current = createPlayer(
      video.current,
      setView,
      (id) => boxes.current[id].solve(),
      props.signal,
    );
    player.current = current;
    return () => {
      current.dispose();
      if (player.current === current) player.current = null;
    };
  }, [props.signal]);
  const renderBox = (id: BoxId, start: () => void) => (
    <div className="s430-box" key={id} data-available={view.available[id]}>
      <StageProblemGiftBox
        box={props.boxes[id]}
        locale={props.locale}
        onClick={start}
      />
      {view.available[id] === false ? (
        <span className="s430-unavailable">
          {statusText(props.locale, "unavailable")}
        </span>
      ) : null}
    </div>
  );
  const special =
    view.status === "interrupted" ||
    view.status === "pipUnknown" ||
    view.status === "pipAutomatic";
  return (
    <div className="puzzle puzzle--centered s430-player">
      <video
        ref={video}
        src={tracks[0].src}
        preload="auto"
        playsInline
        aria-label={stageText(props.locale, locale.player)}
      >
        <track
          kind="captions"
          src={new URL("./assets/tones.vtt", import.meta.url).href}
          srcLang="en"
          label="Tone"
        />
      </video>
      <span className="s430-track">{tracks[view.track]?.name}</span>
      {view.duration !== null && view.position !== null ? (
        <progress
          max={view.duration}
          value={view.position}
          aria-label={stageText(props.locale, locale.position)}
        />
      ) : null}
      <div className="s430-actions">
        {(
          Object.entries(actionBoxes) as [keyof typeof actionBoxes, BoxId][]
        ).map(([action, id]) =>
          renderBox(id, () => void player.current?.start(action)),
        )}
      </div>
      <div className="s430-recovery">
        {renderBox("B02", () => void player.current?.start("recovery"))}
      </div>
      <div className="stage-action-row">
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.stop)}
          onClick={() => player.current?.stop()}
        >
          <StopOutlined aria-hidden="true" />
        </button>
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(
            props.locale,
            view.muted ? locale.unmute : locale.mute,
          )}
          onClick={() => player.current?.mute()}
        >
          {view.muted ? (
            <VolumeOffOutlined aria-hidden="true" />
          ) : (
            <VolumeUpOutlined aria-hidden="true" />
          )}
        </button>
      </div>
      <p role="status" className="interaction-status">
        {special
          ? stageText(
              props.locale,
              locale[
                view.status as "interrupted" | "pipUnknown" | "pipAutomatic"
              ],
            )
          : statusText(props.locale, view.status)}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    B01: { icon: PauseOutlined, color: "#22d3ee", label: locale.B01 },
    B02: { icon: VolumeUpOutlined, color: "#a78bfa", label: locale.B02 },
    B03: { icon: PlayArrowOutlined, color: "#34d399", label: locale.B03 },
    B04: { icon: StopOutlined, color: "#fb7185", label: locale.B04 },
    B05: { icon: FastForwardOutlined, color: "#fbbf24", label: locale.B05 },
    B06: { icon: FastRewindOutlined, color: "#fbbf24", label: locale.B06 },
    B07: { icon: SkipPreviousOutlined, color: "#c084fc", label: locale.B07 },
    B08: { icon: SkipNextOutlined, color: "#c084fc", label: locale.B08 },
    B09: { icon: CommitOutlined, color: "#818cf8", label: locale.B09 },
    B10: {
      icon: PictureInPictureAltOutlined,
      color: "#f472b6",
      label: locale.B10,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "mediaSession" in navigator || "audioSession" in navigator
        ? "available"
        : "unsupported",
    ),
  Component: S430Stage,
});
