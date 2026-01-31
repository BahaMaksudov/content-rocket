// Pre-populated default brand voice options
// These are always available to all users without needing to be stored in the database

export interface DefaultBrandVoice {
  id: string; // Prefixed with "default_" to distinguish from DB voices
  name: string;
  description: string;
  isDefault?: boolean; // Mark which one should be pre-selected
}

export const DEFAULT_BRAND_VOICES: DefaultBrandVoice[] = [
  {
    id: "default_friendly_peer",
    name: "The Friendly Peer",
    description: "Write like you're a knowledgeable friend explaining things over coffee. Use casual, approachable language with occasional humor. Break down complex ideas into simple terms. Be encouraging and supportive. End with clear, actionable takeaways that feel achievable.",
    isDefault: true,
  },
  {
    id: "default_authority",
    name: "The Authority",
    description: "Write with confidence and expertise. Use precise, professional language that commands respect. Back up points with logic and structure. Maintain a formal but engaging tone. Position yourself as a thought leader who provides valuable insights and strategic perspectives.",
  },
  {
    id: "default_viral_disruptor",
    name: "The Viral Disruptor",
    description: "Write with high energy and bold opinions. Challenge conventional wisdom and use provocative hooks. Keep sentences punchy and impactful. Create urgency and FOMO. Use power words, contrarian takes, and pattern interrupts. Aim for maximum engagement and shareability.",
  },
];

// Get a default voice by ID
export function getDefaultVoiceById(id: string): DefaultBrandVoice | undefined {
  return DEFAULT_BRAND_VOICES.find(voice => voice.id === id);
}

// Check if an ID is a default voice
export function isDefaultVoiceId(id: string): boolean {
  return id.startsWith("default_");
}
