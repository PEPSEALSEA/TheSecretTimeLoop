export type Question = {
  id: string
  prompt: string
  answer: string
  durationSec: number
}

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    prompt: 'โจทย์ตัวอย่างข้อ 1 — แก้ข้อความนี้ทีหลังได้',
    answer: 'เฉลยข้อ 1',
    durationSec: 30,
  },
  {
    id: 'q2',
    prompt: 'โจทย์ตัวอย่างข้อ 2 — แก้ข้อความนี้ทีหลังได้',
    answer: 'เฉลยข้อ 2',
    durationSec: 45,
  },
  {
    id: 'q3',
    prompt: 'โจทย์ตัวอย่างข้อ 3 — แก้ข้อความนี้ทีหลังได้',
    answer: 'เฉลยข้อ 3',
    durationSec: 60,
  },
]

export function getQuestion(index: number): Question | null {
  if (index < 0 || index >= QUESTIONS.length) return null
  return QUESTIONS[index] ?? null
}
