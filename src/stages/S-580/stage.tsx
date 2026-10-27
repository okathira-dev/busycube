import "./styles.css";
import KeyboardOutlined from "@mui/icons-material/KeyboardOutlined";
import MicOutlined from "@mui/icons-material/MicOutlined";
import StopOutlined from "@mui/icons-material/StopOutlined";
import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import { useEffect, useRef, useState } from "react";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { stageText } from "../locale";
import { locale } from "./locale";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;
export function normalizeSpeech(value: string) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

/**
 * S-580
 *
 * 目的: 表示された名前の文字入力と実音声認識の二箱を、自由な順番で解く。
 * 最初の一手: 名前の入力欄へbusycubeを入力するか、マイクの箱から音声認識を開始する。
 * 箱ごとの解法:
 * - B03「キーボード」: placeholderのbusycubeを入力する。実inputのchange時の値が厳密にbusycubeなら開く。前後空白・大小文字の補正はしない。
 * - B01「マイク」: 箱を押して許可しbusycubeと発話する。en-US SpeechRecognitionのfinalなalternativeのどれかを小文字化し、空白・句読点・記号を除いた結果がbusycubeへ一致したら開く。スピーカーは同じ語の読み上げヒントで、終了しても箱は開かない。
 * 使用API: HTML text input、SpeechRecognition/webkitSpeechRecognition、SpeechSynthesis、SpeechSynthesisUtterance。
 * 権限・privacy: 音声認識は箱の明示操作で開始する。ゲーム自身は生音声・transcriptを保存・送信しないが、ブラウザーやOS組み込み機能の処理・通信は各提供元の方針と設定に従う。完全ローカル処理とは保証しない。
 * 対応環境: text inputは一般的なブラウザー、音声箱はen-USのWeb Speech認識を提供する環境。読み上げは利用可能な音声engineを使う。
 */
function S580Stage(props: Props) {
  const input = props.boxes.B03;
  const speech = props.boxes.B01;
  const recognition = useRef<SpeechRecognition | null>(null);
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");

  const stopRecognition = () => {
    const current = recognition.current;
    recognition.current = null;
    if (current) {
      current.onresult = null;
      current.onerror = null;
      current.onend = null;
      current.abort();
    }
    setListening(false);
  };
  const start = () => {
    if (props.signal.aborted || recognition.current) return;
    const Constructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) {
      setStatus(stageText(props.locale, locale.unavailable));
      return;
    }
    try {
      const instance = new Constructor();
      recognition.current = instance;
      instance.lang = "en-US";
      instance.interimResults = false;
      instance.onresult = (event) => {
        if (props.signal.aborted || recognition.current !== instance) return;
        const alternatives = Array.from(event.results)
          .filter((result) => result.isFinal)
          .flatMap((result) =>
            Array.from(result, (alternative) => alternative.transcript),
          );
        if (alternatives.some((text) => normalizeSpeech(text) === "busycube"))
          speech.solve();
        else setStatus(stageText(props.locale, locale.notRecognized));
      };
      instance.onerror = () => {
        if (!props.signal.aborted && recognition.current === instance)
          setStatus(stageText(props.locale, locale.notRecognized));
      };
      instance.onend = () => {
        if (recognition.current === instance) {
          recognition.current = null;
          setListening(false);
        }
      };
      window.speechSynthesis?.cancel();
      instance.start();
      setListening(true);
      setStatus("");
    } catch {
      stopRecognition();
      setStatus(stageText(props.locale, locale.notRecognized));
    }
  };
  const speak = () => {
    if (props.signal.aborted || recognition.current) return;
    if (
      !window.speechSynthesis ||
      typeof SpeechSynthesisUtterance === "undefined"
    ) {
      setStatus(stageText(props.locale, locale.unavailable));
      return;
    }
    const utterance = new SpeechSynthesisUtterance("busycube");
    utterance.lang = "en-US";
    utterance.onerror = () => {
      if (!props.signal.aborted)
        setStatus(stageText(props.locale, locale.speechError));
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  useEffect(() => {
    const stop = () => {
      const current = recognition.current;
      recognition.current = null;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        current.abort();
      }
      window.speechSynthesis?.cancel();
    };
    props.signal.addEventListener("abort", stop, { once: true });
    return () => {
      props.signal.removeEventListener("abort", stop);
      stop();
    };
  }, [props.signal]);

  return (
    <div className="puzzle puzzle--centered">
      <button
        type="button"
        className="stage-action"
        aria-label={stageText(props.locale, locale.speaker)}
        onClick={speak}
        disabled={listening}
      >
        <VolumeUpOutlined aria-hidden="true" />
      </button>
      <div className="problem-row speech-pair" data-listening={listening}>
        <div className="speech-input">
          <StageProblemGiftBox box={input} locale={props.locale} />
          <input
            className="paste-target"
            aria-label={stageText(props.locale, locale.input)}
            value={value}
            placeholder="busycube"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              const next = event.currentTarget.value;
              setValue(next);
              if (!props.signal.aborted && next === "busycube") input.solve();
            }}
          />
        </div>
        <StageProblemGiftBox
          box={speech}
          locale={props.locale}
          onClick={start}
        />
      </div>
      {listening && (
        <button
          type="button"
          className="stage-action"
          aria-label={stageText(props.locale, locale.stop)}
          onClick={stopRecognition}
        >
          <StopOutlined aria-hidden="true" />
        </button>
      )}
      <p className="interaction-status" role="status">
        {status}
      </p>
    </div>
  );
}
export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B03]: {
      icon: KeyboardOutlined,
      tone: "violet",
      label: locale.B03,
    },
    [manifest.box.B01]: { icon: MicOutlined, tone: "rose", label: locale.B01 },
  },
  probe: () =>
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
      ? "permission-required"
      : "available",
  Component: S580Stage,
});
