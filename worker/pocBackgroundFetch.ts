import { createSlowDownload, DOWNLOAD_BYTES } from "./slowDownload";
export const POC_DOWNLOAD_BYTES = DOWNLOAD_BYTES;
export function createPocDownload(request: Request): Response {
  return createSlowDownload(request, "busycube-poc.bin");
}
