import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { StageComponentProps } from "../../runtime/stageContract";
import type { CommonStatus } from "../../ui/statusLocale";
import { statusText } from "../../ui/statusLocale";
import { stageText } from "../locale";

const startLabel = { ja: "センサーを開始", en: "Start sensor" };

/** Shared lifecycle only. Each stage owns its sensor, readings, and boxes. */
export function useStageSensor<T extends Sensor, TBoxId extends string>(
  props: StageComponentProps<TBoxId>,
  create: () => T,
  reading: (sensor: T) => void,
) {
  const [status, setStatus] = useState<CommonStatus>("idle");
  const sensorRef = useRef<T | null>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const active = useRef(false);
  const createRef = useRef(create);
  const readingRef = useRef(reading);
  createRef.current = create;
  readingRef.current = reading;
  const stop = useCallback(() => {
    cleanupRef.current();
    cleanupRef.current = () => {};
  }, []);
  useEffect(() => {
    active.current = true;
    const dispose = () => {
      active.current = false;
      stop();
    };
    props.signal.addEventListener("abort", dispose, { once: true });
    if (props.signal.aborted) dispose();
    return () => {
      props.signal.removeEventListener("abort", dispose);
      dispose();
    };
  }, [props.signal, stop]);
  const start = useCallback(() => {
    if (!active.current || props.signal.aborted || sensorRef.current) return;
    const fail = (error: unknown) => {
      stop();
      if (!active.current || props.signal.aborted) return;
      setStatus(
        error instanceof ReferenceError
          ? "unavailable"
          : error instanceof DOMException &&
              (error.name === "NotAllowedError" ||
                error.name === "SecurityError")
            ? "denied"
            : error instanceof DOMException &&
                (error.name === "NotSupportedError" ||
                  error.name === "NotReadableError")
              ? "unavailable"
              : "error",
      );
    };
    try {
      const sensor = createRef.current();
      sensorRef.current = sensor;
      const onReading = (event: Event) => {
        if (
          !event.isTrusted ||
          !active.current ||
          props.signal.aborted ||
          sensorRef.current !== sensor ||
          document.hidden ||
          !sensor.activated ||
          !sensor.hasReading ||
          typeof sensor.timestamp !== "number" ||
          !Number.isFinite(sensor.timestamp)
        )
          return;
        try {
          readingRef.current(sensor);
        } catch (error) {
          fail(error);
        }
      };
      const onError = (event: Event) => {
        if (event.isTrusted && active.current && sensorRef.current === sensor)
          fail(Reflect.get(event, "error"));
      };
      cleanupRef.current = () => {
        sensor.removeEventListener("reading", onReading);
        sensor.removeEventListener("error", onError);
        sensorRef.current = null;
        try {
          sensor.stop();
        } catch {
          /* A failed/removed device may already be stopped. */
        }
      };
      sensor.addEventListener("reading", onReading);
      sensor.addEventListener("error", onError);
      sensor.start();
      if (sensorRef.current === sensor) setStatus("running");
    } catch (error) {
      fail(error);
    }
  }, [props.signal, stop]);
  return { start, stop, status };
}

export function SensorStageShell<TBoxId extends string>({
  props,
  children,
  start,
  status,
}: {
  props: StageComponentProps<TBoxId>;
  children: ReactNode;
  start(): void;
  status: CommonStatus;
}) {
  return (
    <div className="puzzle puzzle--centered">
      <div className="problem-row">{children}</div>
      <button type="button" className="stage-action" onClick={start}>
        {stageText(props.locale, startLabel)}
      </button>
      <p className="interaction-status" role="status">
        {statusText(props.locale, status)}
      </p>
    </div>
  );
}
