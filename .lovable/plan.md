

# Content Repurposing Dashboard

A full-stack application that transforms YouTube videos into multi-platform content with AI-powered generation, user accounts, and brand voice customization.

---

## Core Features

### 1. User Authentication & Profiles
- Email/password signup and login
- Personal dashboard with saved content history
- Profile settings page

### 2. Brand Voice System
- Create and save custom "Brand Voice" presets
- Configure writing style, tone, key phrases, and target audience
- Apply saved brand voice to all future content generations
- Option to switch between different brand voices per generation

### 3. YouTube Transcription
- URL input field with validation for YouTube links
- **Auto-fetch first**: Automatically extract YouTube captions when available
- **Manual fallback**: Text area to paste transcript if auto-fetch fails
- Clear indication of which method was used

### 4. AI Content Generation
Powered by Lovable AI, generating content based on the transcript and selected brand voice:

| Content Type | Description |
|--------------|-------------|
| **5 X (Twitter) Hooks** | Viral, attention-grabbing opening lines |
| **1 LinkedIn Post** | Problem-Agitation-Solution framework |
| **3 Short-form Scripts** | TikTok/Reels scripts with time-stamped cues |
| **1 Blog Post** | 500-word SEO-optimized article |

### 5. Tone/Style Options
Before generating, users can select:
- **Tone**: Professional, Casual, Humorous, Inspirational
- **Audience**: General, B2B, Tech-savvy, Young adults

### 6. Content Editing & Output
- Inline editing for all generated content
- "Copy to Clipboard" button for each section
- Auto-save edits to history

### 7. Export Options
- Download all content as a single document (PDF or Markdown)
- Export individual sections

---

## Pages & Navigation

| Page | Purpose |
|------|---------|
| **Landing/Home** | Hero section, feature overview, CTA to sign up |
| **Auth** | Login and signup forms |
| **Dashboard** | Main workspace - URL input, generation, and output |
| **History** | Browse and revisit previously generated content |
| **Brand Voices** | Manage saved brand voice presets |
| **Settings** | Profile and account settings |

---

## Design & UI
- **Dark mode** aesthetic with modern Tailwind CSS styling
- Clean, organized card layout for each content type
- Loading states during transcription and AI generation
- Toast notifications for copy/save actions
- Responsive design for desktop and tablet use

---

## Technical Architecture

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- React Router for navigation

### Backend (Lovable Cloud)
- **Database**: Users, brand voices, content history, generations
- **Authentication**: Email/password via Supabase Auth
- **Edge Functions**:
  - YouTube transcript fetching
  - AI content generation (via Lovable AI)
  - Export/PDF generation

