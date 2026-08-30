import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import WindowOutlined from "@mui/icons-material/WindowOutlined";
import { safeCapabilityProbe } from "../../domain/stageRuntime";
import {
  defineStageModule,
  type StageComponentProps,
} from "../../runtime/stageContract";
import { StageProblemGiftBox } from "../../ui/GiftBox";
import { manifest } from "./manifest";

type Props = StageComponentProps<(typeof manifest.boxIds)[number]>;

import { useEffect, useMemo, useRef, useState } from "react";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";
import { locale } from "./locale";

type SignalMessage = {
  round: string;
  sender: string;
  ready?: boolean;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  close?: boolean;
};

/**
 * S-360
 *
 * 目的: 同一端末の二つのwindow間で生成音trackとRTCDataChannelを持つpeer connectionを確立し、利用者操作でchannelを閉じる。
 * 最初の一手: 「受信窓を開く」を押し、同じroundのoffer/answer接続が完了してから「接続を閉じる」を押す。
 * 箱ごとの解法:
 * - B01「接続の箱」: answer窓とのWebRTC signalingが完了し、`busycube` RTCDataChannelの`open` eventを受けると両窓側で開く。
 * - B02「切断の箱」: data channelの`readyState`が`open`な間に「接続を閉じる」を押し、箱を開いてから`RTCDataChannel.close()`を実行する。
 * 使用API: RTCPeerConnection/RTCDataChannel、Web Audio oscillatorとMediaStreamDestination、BroadcastChannelによるlocal signaling、`window.open()`、Web Crypto UUID。
 * 権限・privacy: microphoneは使わず生成した小音量toneだけを同一端末window間でrelayする。SDP/ICEと一時IDは同一origin channel内だけで扱い、保存・server送信しない。
 * 対応環境: WebRTC、Web Audio、BroadcastChannelと複数window/tabを利用できるbrowser。
 */
function S360Stage(props: Props) {
  const connectBox = props.boxes[manifest.box.B01];
  const closeBox = props.boxes[manifest.box.B02];
  const params = useMemo(() => new URL(location.href).searchParams, []);
  const round = useMemo(
    () => params.get("round") ?? crypto.randomUUID(),
    [params],
  );
  const initiator = params.get("peer") !== "answer";
  const sender = useMemo(() => crypto.randomUUID(), []);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    const signaling = new BroadcastChannel(`busycube:S-360:${round}`);
    const peer = new RTCPeerConnection({ iceServers: [] });
    peerRef.current = peer;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();
    gain.gain.value = 0.04;
    oscillator.connect(gain).connect(destination);
    oscillator.start();
    for (const track of destination.stream.getTracks())
      peer.addTrack(track, destination.stream);
    const attach = (channel: RTCDataChannel) => {
      channelRef.current = channel;
      channel.onopen = () => {
        setStatus("connected");
        connectBox.solve();
      };
      channel.onclose = () => {
        setStatus("closed");
      };
    };
    if (initiator) attach(peer.createDataChannel("busycube"));
    else peer.ondatachannel = (event) => attach(event.channel);
    peer.onicecandidate = (event) => {
      if (event.candidate)
        signaling.postMessage({
          round,
          sender,
          candidate: event.candidate.toJSON(),
        } satisfies SignalMessage);
    };
    const makeOffer = async () => {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      signaling.postMessage({
        round,
        sender,
        description: offer,
      } satisfies SignalMessage);
    };
    const receive = async (event: MessageEvent<SignalMessage>) => {
      const message = event.data;
      if (message.round !== round || message.sender === sender) return;
      try {
        if (message.ready && initiator && peer.signalingState === "stable")
          await makeOffer();
        if (message.description) {
          await peer.setRemoteDescription(message.description);
          if (message.description.type === "offer") {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            signaling.postMessage({
              round,
              sender,
              description: answer,
            } satisfies SignalMessage);
          }
        }
        if (message.candidate) await peer.addIceCandidate(message.candidate);
      } catch {
        setStatus("error");
      }
    };
    signaling.addEventListener("message", receive);
    if (!initiator)
      signaling.postMessage({
        round,
        sender,
        ready: true,
      } satisfies SignalMessage);
    const cleanup = () => {
      channelRef.current?.close();
      peer.close();
      signaling.close();
      oscillator.stop();
      void context.close();
    };
    props.signal.addEventListener("abort", cleanup, { once: true });
    return () => {
      props.signal.removeEventListener("abort", cleanup);
      cleanup();
    };
  }, [connectBox.solve, initiator, props.signal, round, sender]);

  const peerUrl = new URL(location.href);
  peerUrl.searchParams.set("round", round);
  peerUrl.searchParams.set("peer", "answer");
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">
        <StageProblemGiftBox box={connectBox} locale={props.locale} />
        <StageProblemGiftBox box={closeBox} locale={props.locale} />
      </div>
      {initiator && (
        <button
          type="button"
          className="stage-action"
          onClick={() => window.open(peerUrl, "_blank")}
        >
          {stageText(props.locale, locale.openReceiver)}
        </button>
      )}
      <button
        type="button"
        className="stage-action"
        disabled={channelRef.current?.readyState !== "open"}
        onClick={() => {
          if (channelRef.current?.readyState === "open") {
            closeBox.solve();
            channelRef.current.close();
          }
        }}
      >
        {stageText(props.locale, locale.closeConnection)}
      </button>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}

export const stage = defineStageModule(manifest, {
  boxes: {
    [manifest.box.B01]: {
      icon: VolumeUpOutlined,
      color: "#22d3ee",
      label: locale.B01,
    },
    [manifest.box.B02]: {
      icon: WindowOutlined,
      color: "#fb7185",
      label: locale.B02,
    },
  },
  probe: () =>
    safeCapabilityProbe(() =>
      "RTCPeerConnection" in window && "BroadcastChannel" in window
        ? "available"
        : "unsupported",
    ),
  Component: S360Stage,
});
