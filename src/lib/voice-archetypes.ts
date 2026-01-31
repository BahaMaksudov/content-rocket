// Voice archetypes for AI audio generation
// Each archetype has a unique ElevenLabs voice and performance prompt

export interface VoiceArchetype {
  id: string;
  name: string;
  description: string;
  voiceId: string; // ElevenLabs voice ID
  performancePrompt: string; // Instructions for the AI's delivery
}

export const VOICE_ARCHETYPES: VoiceArchetype[] = [
  {
    id: "tech_visionary",
    name: "Tech Visionary",
    description: "High-energy startup founder vibe",
    voiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam - energetic male voice
    performancePrompt: "Speak like a high-energy startup founder pitching a new idea. Be enthusiastic, confident, and forward-thinking. Use dynamic pacing with emphasis on key innovation points.",
  },
  {
    id: "viral_storyteller",
    name: "Viral Storyteller",
    description: "Punchy, trendy influencer energy",
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica - energetic female voice
    performancePrompt: "Deliver this with high energy and a punchy, trendy influencer tone. Be relatable, exciting, and use natural conversational patterns. Add enthusiasm and urgency where appropriate.",
  },
  {
    id: "sage_advisor",
    name: "Sage Advisor",
    description: "Sophisticated British authority",
    voiceId: "JBFqnCBsd6RMkjVDRZzb", // George - British male voice
    performancePrompt: "Narrate this slowly with sophistication and British authority. Be measured, thoughtful, and authoritative. Use deliberate pacing to emphasize wisdom and experience.",
  },
  {
    id: "growth_coach",
    name: "Growth Coach",
    description: "Deep, motivational presence",
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian - deep male voice
    performancePrompt: "Use a deep, gritty, and motivational tone to inspire the listener. Be commanding yet encouraging. Speak with conviction and passion to drive action.",
  },
  {
    id: "friendly_guide",
    name: "Friendly Guide",
    description: "Warm, conversational helper",
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah - warm female voice
    performancePrompt: "Speak in a warm, relatable, and helpful conversational style. Be approachable and friendly. Use natural pauses and a genuine, caring tone.",
  },
];

export function getVoiceById(id: string): VoiceArchetype | undefined {
  return VOICE_ARCHETYPES.find(voice => voice.id === id);
}

export function getDefaultVoice(): VoiceArchetype {
  return VOICE_ARCHETYPES[4]; // Friendly Guide as default
}
