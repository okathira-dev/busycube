export const sharedMarksPlaceholder = "BUSYCUBE_SHARED_MARKS_PLACEHOLDER";

/** Extract only game marks; never forward the rest of the received text. */
export function extractSharedMarks(text: string) {
  const matches = text.matchAll(
    /(?:^|[^A-Za-z0-9:_-])busycube:S240:([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})(?![A-Za-z0-9_-])/g,
  );
  return [
    ...new Set(
      [...matches]
        .map((match) => match[1])
        .filter((nonce): nonce is string => !!nonce),
    ),
  ];
}
