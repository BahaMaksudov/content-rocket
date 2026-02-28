export interface HookOption {
  id: number;
  text: string;
  style: string;
}

export interface SceneRow {
  time: string;
  script: string;
  visual: string;
}

export interface ViralScriptResult {
  hooks: HookOption[];
  scenes: SceneRow[];
  overlays: string[];
  socialCaption: string;
  hashtags: string[];
}

export type Duration = "15s" | "30s" | "60s";
export type Tone = "hype" | "educational" | "funny" | "mysterious";
export type Platform = "tiktok" | "youtube-shorts" | "instagram-reels";

export const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: "15s", label: "15s" },
  { value: "30s", label: "30s" },
  { value: "60s", label: "60s" },
];

export const TONE_OPTIONS: { value: Tone; emoji: string; label: string }[] = [
  { value: "hype", emoji: "🔥", label: "Hype" },
  { value: "educational", emoji: "🧠", label: "Educational" },
  { value: "funny", emoji: "🤣", label: "Funny" },
  { value: "mysterious", emoji: "🤫", label: "Mysterious" },
];

export const PLATFORM_OPTIONS: { value: Platform; emoji: string; label: string }[] = [
  { value: "tiktok", emoji: "🎵", label: "TikTok" },
  { value: "youtube-shorts", emoji: "🩳", label: "YT Shorts" },
  { value: "instagram-reels", emoji: "🎞️", label: "Reels" },
];
