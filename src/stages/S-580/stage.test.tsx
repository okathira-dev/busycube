// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { StageComponentProps } from "../../runtime/stageContract";
import { stage } from "./stage";

class Recognition {
  static current: Recognition | null = null;
  lang = "";
  interimResults = false;
  onresult:
    | ((event: {
        results: Array<Array<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    Recognition.current = this;
  }
}
class Utterance {
  lang = "";
  constructor(readonly text: string) {}
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps typing and final speech independent and never rewards hint playback", () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  vi.stubGlobal("SpeechRecognition", Recognition);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", { speak, cancel });
  const controller = new AbortController();
  const props: StageComponentProps = {
    locale: "en",
    signal: controller.signal,
    boxes: Object.fromEntries(
      Object.entries(stage.boxes).map(([id, definition]) => [
        id,
        { id, definition, state: "ribboned", solve: vi.fn() },
      ]),
    ),
    progress: { hasMarker: () => false, mark: vi.fn() },
    services: {},
  };
  render(<stage.Component {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Speaker" }));
  expect(speak).toHaveBeenCalledOnce();
  expect(speak.mock.calls[0]?.[0].text).toBe("busycube");
  expect(props.boxes.B01?.solve).not.toHaveBeenCalled();
  expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox", { name: "Input" }), {
    target: { value: " busycube" },
  });
  expect(props.boxes.B03?.solve).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox", { name: "Input" }), {
    target: { value: "busycube" },
  });
  expect(props.boxes.B03?.solve).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: /^Microphone:/ }));
  const recognition = Recognition.current;
  if (!recognition) throw new Error("recognition not started");
  expect(recognition.lang).toBe("en-US");
  const result = Object.assign([{ transcript: "Busy cube!" }], {
    isFinal: false,
  });
  act(() => recognition.onresult?.({ results: [result] }));
  expect(props.boxes.B01?.solve).not.toHaveBeenCalled();
  result.isFinal = true;
  act(() => recognition.onresult?.({ results: [result] }));
  expect(props.boxes.B01?.solve).toHaveBeenCalledOnce();
  act(() => controller.abort());
  expect(recognition.abort).toHaveBeenCalledOnce();
  expect(recognition.onresult).toBeNull();
  expect(cancel).toHaveBeenCalled();
});
