import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useRef, useState } from "react";
import { stageText } from "../locale";
import { locale } from "./locale";

function normalizeSpeech(value: string) {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

/**
 * S-580
 *
 * 目的: 英語音声のspeech recognitionと、一文字ずつ連続するspeech synthesisを文字入力なしで完了させる。
 * 最初の一手: 「聞き取る」を押してmicrophoneへ`busycube`と発話する。次に「ずれた音を聞く」で8文字の読み上げを最後まで聞く。
 * 箱ごとの解法:
 * - B01「聞き取りの箱」: en-US SpeechRecognitionの全alternative transcriptを小文字化し、空白・句読点・記号を除いたどれかが厳密に`busycube`なら開く。
 * - B02「読み上げの箱」: en-USの一文字utteranceで`aspuxouw`を先頭から順に読み、少なくとも一つがstartし、errorなしで全8個の`end`を連鎖完了すると開く。
 * 使用API: Web Speech APIのSpeechRecognition/webkitSpeechRecognition、SpeechSynthesis、SpeechSynthesisUtterance events。
 * 権限・privacy: microphone accessはB01のbutton操作時だけ利用し、音声とtranscriptを保存・送信しない。B02は固定文字だけを端末の音声engineへ渡す。
 * 対応環境: en-USのspeech recognitionとspeech synthesis voiceを提供し、Web Speech API eventsを実装するbrowser/OS。
 */
function S580Stage(props: Props) {
  const problem = props.boxes[manifest.box.B01];
  const synthesisProblem = props.boxes[manifest.box.B02];
  const recognition = useRef<SpeechRecognition | null>(null);
  const synthesis = useRef<SpeechSynthesis | null>(null);
  const [status, setStatus] = useState("");
  const start = () => {
    const Constructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) return;
    const instance = new Constructor();
    recognition.current = instance;
    // The answer is the English product name; UI localization must not change
    // the recognition language used by this browser API puzzle.
    instance.lang = "en-US";
    instance.interimResults = false;
    instance.onresult = (event) => {
      const alternatives = Array.from(
        { length: event.results.length },
        (_, resultIndex) => event.results[resultIndex],
      ).flatMap((result) =>
        result
          ? Array.from(
              { length: result.length },
              (_, index) => result[index]?.transcript ?? "",
            )
          : [],
      );
      setStatus(alternatives[0] ?? "");
      if (alternatives.some((value) => normalizeSpeech(value) === "busycube"))
        problem.solve();
    };
    instance.onerror = () =>
      setStatus(stageText(props.locale, locale.notRecognized));
    instance.start();
  };
  const speakShifted = () => {
    const current = window.speechSynthesis;
    if (!current || typeof SpeechSynthesisUtterance === "undefined") return;
    current.cancel();
    synthesis.current = current;
    const source = "aspuxouw";
    let index = 0;
    let started = false;
    let failed = false;
    const speakNext = () => {
      const character = source[index];
      if (!character) {
        if (started && !failed) synthesisProblem.solve();
        setStatus(stageText(props.locale, locale.speechComplete));
        return;
      }
      const utterance = new SpeechSynthesisUtterance(character);
      utterance.lang = "en-US";
      utterance.onstart = () => {
        started = true;
      };
      utterance.onend = () => {
        index += 1;
        speakNext();
      };
      utterance.onerror = () => {
        failed = true;
        setStatus(stageText(props.locale, locale.speechError));
      };
      current.speak(utterance);
    };
    setStatus(stageText(props.locale, locale.speaking));
    speakNext();
  };
  useEffect(() => {
    const cancel = () => {
      recognition.current?.abort();
      synthesis.current?.cancel();
    };
    props.signal.addEventListener("abort", cancel, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cancel);
      cancel();
    };
  }, [props.signal]);
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={problem} locale={props.locale} />
        <StageProblemGiftBox box={synthesisProblem} locale={props.locale} />
      </div>
      <div className="stage-actions">
        <button type="button" className="stage-action" onClick={start}>
          {stageText(props.locale, locale.listen)}
        </button>
        <button type="button" className="stage-action" onClick={speakShifted}>
          {stageText(props.locale, locale.shifted)}
        </button>
      </div>
      <p className="interaction-status" role="status">
        {status}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: VolumeUpOutlined,
      color: "#f472b6",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: VolumeUpOutlined,
      color: "#ec4899",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
        ? "permission-required"
        : "unsupported",
    ),
  Component: S580Stage,
});
