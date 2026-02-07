import { useState, useRef, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

/* ────────────────────── Types ────────────────────── */

export interface ExtractionProgress {
  stage: "loading" | "processing" | "done" | "error";
  percent: number;
  message: string;
}

interface UseVideoExtractionReturn {
  extractAudio: (file: File) => Promise<File | null>;
  progress: ExtractionProgress | null;
  isExtracting: boolean;
  error: string | null;
}

/* ────────────────────── Constants ────────────────────── */

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma", ".webm"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm"];
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Check if a file is already an audio file (no extraction needed).
 */
export function isAudioFile(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  // .webm could be audio or video — check MIME type
  if (ext === ".webm") return file.type.startsWith("audio/");
  return AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Check if a file is a video that needs audio extraction.
 */
export function isVideoFile(file: File): boolean {
  const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
  if (ext === ".webm") return file.type.startsWith("video/");
  return VIDEO_EXTENSIONS.includes(ext);
}

/* ────────────────────── Hook ────────────────────── */

export function useVideoExtraction(): UseVideoExtractionReturn {
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const loadFFmpeg = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    // Log progress during extraction
    ffmpeg.on("progress", ({ progress: p }) => {
      const percent = Math.min(Math.round(p * 100), 100);
      setProgress({
        stage: "processing",
        percent,
        message: `Extracting audio… ${percent}%`,
      });
    });

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    setProgress({ stage: "loading", percent: 0, message: "Loading video processor…" });

    // Load FFmpeg core from CDN
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");

    await ffmpeg.load({ coreURL, wasmURL });

    setProgress({ stage: "loading", percent: 100, message: "Video processor ready" });
    return ffmpeg;
  }, []);

  /**
   * Extract audio from a video file client-side.
   *
   * - If the file is already audio and under 25 MB → return it directly.
   * - If it's a video → extract audio as 64 kbps mono MP3.
   * - Returns null on failure (sets `error`).
   */
  const extractAudio = useCallback(
    async (file: File): Promise<File | null> => {
      setError(null);

      // ── Skip extraction for audio files under 25 MB ──
      if (isAudioFile(file) && file.size <= MAX_UPLOAD_SIZE) {
        return file;
      }

      // ── Must be a video file ──
      if (!isVideoFile(file) && !isAudioFile(file)) {
        setError("Unsupported file format. Please upload an audio or video file.");
        return null;
      }

      setIsExtracting(true);
      setProgress({ stage: "loading", percent: 0, message: "Preparing video processor…" });

      try {
        const ffmpeg = await loadFFmpeg();

        // Write input to virtual filesystem
        setProgress({ stage: "processing", percent: 0, message: "Reading file…" });
        const inputName = `input${getExtension(file.name)}`;
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        // Extract audio → 64 kbps mono MP3 for maximum compression
        setProgress({ stage: "processing", percent: 5, message: "Extracting audio…" });
        await ffmpeg.exec([
          "-i", inputName,
          "-vn",                    // strip video
          "-acodec", "libmp3lame",  // MP3 codec
          "-b:a", "64k",            // 64 kbps bitrate
          "-ac", "1",               // mono
          "-ar", "22050",           // 22 kHz sample rate (good for speech)
          "output.mp3",
        ]);

        // Read output
        const data = await ffmpeg.readFile("output.mp3");

        if (!(data instanceof Uint8Array) || data.length === 0) {
          throw new Error("Could not extract audio from this video.");
        }

        // Clean up virtual filesystem
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile("output.mp3");

        const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "audio/mpeg" });

        // Check if extracted audio is under 25 MB
        if (blob.size > MAX_UPLOAD_SIZE) {
          setError(
            `Extracted audio is ${(blob.size / (1024 * 1024)).toFixed(1)} MB — still over 25 MB. Try a shorter video.`
          );
          setProgress(null);
          setIsExtracting(false);
          return null;
        }

        const outputName = file.name.replace(/\.[^.]+$/, "") + ".mp3";
        const outputFile = new File([blob], outputName, { type: "audio/mpeg" });

        setProgress({
          stage: "done",
          percent: 100,
          message: `Audio extracted (${(outputFile.size / (1024 * 1024)).toFixed(1)} MB)`,
        });
        setIsExtracting(false);
        return outputFile;
      } catch (err: any) {
        console.error("FFmpeg extraction error:", err);
        const message =
          err?.message?.includes("audio")
            ? err.message
            : "Could not extract audio from this video.";
        setError(message);
        setProgress({ stage: "error", percent: 0, message });
        setIsExtracting(false);
        return null;
      }
    },
    [loadFFmpeg]
  );

  return { extractAudio, progress, isExtracting, error };
}

/* ────────────────────── Helpers ────────────────────── */

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : "";
}
