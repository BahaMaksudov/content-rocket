import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

  try {
    // ── Auth check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authorization required" }, { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`Transcribe request from user: ${user.id}`);

    // ── Parse multipart form data ──
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return json({ error: "No file provided. Please upload an audio or video file." }, { status: 400 });
    }

    console.log(
      `File received — name: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)} MB, type: ${file.type}`
    );

    // Whisper API limit is 25 MB
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return json(
        { error: "File too large. Maximum size is 25 MB." },
        { status: 400 }
      );
    }

    // ── Call OpenAI Whisper API ──
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not configured");
      return json(
        { error: "Transcription service not configured." },
        { status: 500 }
      );
    }

    const whisperForm = new FormData();
    whisperForm.append("file", file, file.name);
    whisperForm.append("model", "whisper-1");

    console.log("Sending to Whisper API...");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: whisperForm,
      }
    );

    if (!whisperResponse.ok) {
      const errBody = await whisperResponse.text();
      console.error(`Whisper API error ${whisperResponse.status}:`, errBody);

      if (whisperResponse.status === 413) {
        return json({ error: "File too large for transcription." }, { status: 413 });
      }
      if (whisperResponse.status === 400) {
        return json(
          { error: "Unsupported file format. Please upload MP3, MP4, WAV, M4A, or WebM." },
          { status: 400 }
        );
      }

      return json(
        { error: "Transcription failed. Please try again." },
        { status: whisperResponse.status }
      );
    }

    const whisperData = await whisperResponse.json();
    const transcript = whisperData.text || "";

    if (!transcript || transcript.length < 10) {
      console.log("Whisper returned very short/empty transcript");
      return json({
        error: "Could not extract meaningful text from this file. The audio may be too short or unclear.",
        transcript: null,
        title: null,
      });
    }

    // Clean filename for title (remove extension)
    const title = file.name.replace(/\.[^.]+$/, "");

    console.log(
      `Transcription complete — length: ${transcript.length} chars, title: "${title}"`
    );

    return json({ transcript, title });
  } catch (error) {
    console.error("Transcribe media error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return json(
      { error: "Transcription service unavailable", details: errorMessage },
      { status: 500 }
    );
  }
});
