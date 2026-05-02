'use server'

import { VertexAI } from '@google-cloud/vertexai'
import path from 'path'
import fs from 'fs'

import type { LLMQuestContent, GrowthStage } from '@/types/quest'



interface QuestAIInput {
  plant_name: string
  growth_stage: GrowthStage
  water_frequency: number
  sunlight: string
  hydration: number
  health: number
  tasks_due: string[]
  streak: number
  type: 'daily' | 'recovery' | 'milestone'
}

export async function generateQuestContent(input: QuestAIInput): Promise<LLMQuestContent | null> {
  const project = process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'farmquest-493806'
  const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1'
  
  console.log(`[QuestAI] Initializing Vertex AI with Project: ${project}, Location: ${location}`)
  
  const keyFilePath = path.join(process.cwd(), 'credentials', 'google.json')
  
  if (fs.existsSync(keyFilePath)) {
    console.log(`[QuestAI] Found local credentials at ${keyFilePath}`)
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath
  }
  
  const vertexAI = new VertexAI({ project, location })
  try {
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const toneMap = {
      daily: input.streak > 5 ? 'encouraging and warm' : 'friendly and motivating',
      recovery: 'urgent but caring — the plant needs help',
      milestone: 'celebratory and exciting',
    }

    const prompt = `You are a plant care assistant generating gamified quest content.

Input:
- Plant: ${input.plant_name}
- Stage: ${input.growth_stage}
- Care rules: water every ${input.water_frequency} days, sunlight: ${input.sunlight}
- Current condition: hydration=${input.hydration}%, health=${input.health}%
- Tasks due today: ${input.tasks_due.join(', ') || 'none'}
- Current streak: ${input.streak} days
- Quest type: ${input.type}

Tone: ${toneMap[input.type]}

Rules:
- Do NOT invent care requirements outside the given data.
- Output ONLY valid JSON with no markdown or preamble.
- Tasks must be realistic and match the schedule.
- Keep titles catchy and under 60 characters.
- Keep descriptions under 120 characters.

Output format:
{
  "title": "string",
  "description": "string",
  "tasks": ["string", "string", "string"]
}`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned) as LLMQuestContent

    // Validate structure
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.description !== 'string' ||
      !Array.isArray(parsed.tasks) ||
      parsed.tasks.some((t: unknown) => typeof t !== 'string')
    ) {
      return null
    }

    return parsed
  } catch (error) {
    console.error('Quest AI generation failed:', error)
    return null
  }
}
