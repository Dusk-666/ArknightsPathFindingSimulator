import { FRAMES_PER_SECOND } from "../models";

const TIME_PATTERN = /^(\d+)\s*\u79d2\s*(\d+)\s*\u5e27$/;

export function parseTimeString(input: string): number {
  const trimmed = input.trim();
  const match = trimmed.match(TIME_PATTERN);

  if (!match) {
    throw new Error(`Invalid time format: ${input}`);
  }

  const seconds = Number(match[1]);
  const frames = Number(match[2]);

  if (frames >= FRAMES_PER_SECOND) {
    throw new Error(`Frame count must be < ${FRAMES_PER_SECOND}: ${input}`);
  }

  return seconds * FRAMES_PER_SECOND + frames;
}

export function formatFrameCount(totalFrames: number): string {
  const safeFrames = Math.max(0, Math.floor(totalFrames));
  const seconds = Math.floor(safeFrames / FRAMES_PER_SECOND);
  const frames = safeFrames % FRAMES_PER_SECOND;
  return `${seconds}\u79d2${frames}\u5e27`;
}

export function clampFrame(totalFrames: number, maxFrame: number): number {
  return Math.max(0, Math.min(Math.floor(totalFrames), Math.max(0, Math.floor(maxFrame))));
}
