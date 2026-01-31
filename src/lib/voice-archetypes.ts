// Voice archetypes for AI audio generation
// Each archetype has a unique ElevenLabs voice and performance prompt

export interface VoiceArchetype {
  id: string;
  name: string;
  description: string;
  voiceId: string; // ElevenLabs voice ID
  performancePrompt: string; // Instructions for the AI's delivery
  tier: "pro" | "agency"; // Minimum tier required
}

// Standard voices available to Pro and Agency users
export const VOICE_ARCHETYPES: VoiceArchetype[] = [
  {
    id: "tech_visionary",
    name: "Tech Visionary",
    description: "High-energy startup founder vibe",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam - energetic male voice
    performancePrompt: "Speak like a high-energy startup founder pitching a new idea. Be enthusiastic, confident, and forward-thinking. Use dynamic pacing with emphasis on key innovation points.",
    tier: "pro",
  },
  {
    id: "viral_storyteller",
    name: "Viral Storyteller",
    description: "Punchy, trendy influencer energy",
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica - energetic female voice
    performancePrompt: "Deliver this with high energy and a punchy, trendy influencer tone. Be relatable, exciting, and use natural conversational patterns. Add enthusiasm and urgency where appropriate.",
    tier: "pro",
  },
  {
    id: "sage_advisor",
    name: "Sage Advisor",
    description: "Sophisticated British authority",
    voiceId: "JBFqnCBsd6RMkjVDRZzb", // George - British male voice
    performancePrompt: "Narrate this slowly with sophistication and British authority. Be measured, thoughtful, and authoritative. Use deliberate pacing to emphasize wisdom and experience.",
    tier: "pro",
  },
  {
    id: "growth_coach",
    name: "Growth Coach",
    description: "Deep, motivational presence",
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian - deep male voice
    performancePrompt: "Use a deep, gritty, and motivational tone to inspire the listener. Be commanding yet encouraging. Speak with conviction and passion to drive action.",
    tier: "pro",
  },
  {
    id: "friendly_guide",
    name: "Friendly Guide",
    description: "Warm, conversational helper",
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah - warm female voice
    performancePrompt: "Speak in a warm, relatable, and helpful conversational style. Be approachable and friendly. Use natural pauses and a genuine, caring tone.",
    tier: "pro",
  },
];

// Premium cloned voices only available to Agency users
export const AGENCY_CLONED_VOICES: VoiceArchetype[] = [
  {
    id: "agency_executive",
    name: "Executive Leader",
    description: "Commanding corporate presence",
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel - authoritative voice
    performancePrompt: "Speak with executive authority and boardroom presence. Be decisive, clear, and commanding. Project confidence and leadership in every word.",
    tier: "agency",
  },
  {
    id: "agency_narrator",
    name: "Documentary Narrator",
    description: "Cinematic storytelling voice",
    voiceId: "pqHfZKP75CvOlQylNhV4", // Bill - documentary voice
    performancePrompt: "Narrate with cinematic gravitas like a documentary host. Build tension and drama. Use dramatic pauses and emphasize key revelations.",
    tier: "agency",
  },
  {
    id: "agency_podcast",
    name: "Podcast Host",
    description: "Engaging conversational style",
    voiceId: "iP95p4xoKVk53GoZ742B", // Chris - podcast voice
    performancePrompt: "Speak like a seasoned podcast host. Be engaging, curious, and conversational. Make the listener feel like they're part of an intimate discussion.",
    tier: "agency",
  },
];

export function getVoiceById(id: string): VoiceArchetype | undefined {
  return [...VOICE_ARCHETYPES, ...AGENCY_CLONED_VOICES].find(voice => voice.id === id);
}

export function getDefaultVoice(): VoiceArchetype {
  return VOICE_ARCHETYPES[4]; // Friendly Guide as default
}

export function getVoicesForTier(tier: "free" | "pro" | "agency"): {
  standard: VoiceArchetype[];
  cloned: VoiceArchetype[];
} {
  if (tier === "free") {
    return { standard: [], cloned: [] };
  }
  
  if (tier === "pro") {
    return { standard: VOICE_ARCHETYPES, cloned: [] };
  }
  
  // Agency gets all voices
  return { standard: VOICE_ARCHETYPES, cloned: AGENCY_CLONED_VOICES };
}
