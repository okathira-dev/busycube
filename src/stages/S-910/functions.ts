// 同梱15fps WebMの実PTS。生成器のinclusiveな最終frameの次のPTSを排他的な終端とする。
export const s910Cues = [
  { id: "circle", start: 0.4, end: 1.267 },
  { id: "triangle", start: 1.6, end: 2.4 },
  { id: "square", start: 2.733, end: 3.533 },
] as const;
export type S910CueId = (typeof s910Cues)[number]["id"];
export const cueSymbols: Record<S910CueId, string> = {
  circle: "○",
  triangle: "△",
  square: "□",
};
export function activeS910CueId(time: number): S910CueId | undefined {
  return s910Cues.find((cue) => time >= cue.start && time < cue.end)?.id;
}
export function captionInterval(time: number, duration: number) {
  if (
    !Number.isFinite(time) ||
    !Number.isFinite(duration) ||
    time < 0 ||
    time >= duration
  )
    return;
  const segment = s910Cues.find((cue) => time >= cue.start && time < cue.end);
  const end = Math.min(duration, time + 0.45, segment?.end ?? Infinity);
  return end > time ? { start: time, end } : undefined;
}
export function validS910Cue(cue: {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}) {
  const segment = s910Cues.find((expected) => expected.id === cue.id);
  return (
    !!segment &&
    cue.text === cueSymbols[segment.id] &&
    Number.isFinite(cue.startTime) &&
    Number.isFinite(cue.endTime) &&
    cue.startTime >= segment.start &&
    cue.endTime <= segment.end &&
    cue.endTime > cue.startTime
  );
}
