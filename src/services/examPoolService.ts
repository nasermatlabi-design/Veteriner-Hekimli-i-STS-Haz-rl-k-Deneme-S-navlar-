import { Question, SUBJECT_DISTRIBUTION } from "../types";
import poolData from "../data/questionPool.json";

const questionPool = poolData as Question[];

/**
 * Generates a stable exam from the question pool based on an index (0-99).
 * Uses a pseudo-random seed based on the index to ensure consistency.
 */
export function getExamFromPool(index: number): Question[] {
  const examQuestions: Question[] = [];
  
  SUBJECT_DISTRIBUTION.forEach((dist) => {
    // Filter questions by subject
    const subjectQuestions = questionPool.filter(q => q.subject === dist.name);
    
    // If pool is empty for this subject, we can't do much (shouldn't happen with proper pool)
    if (subjectQuestions.length === 0) return;
    
    // Sort by a deterministic "random" value based on the exam index and question ID
    const sorted = [...subjectQuestions].sort((a, b) => {
      const seedA = hashString(a.id + index);
      const seedB = hashString(b.id + index);
      return seedA - seedB;
    });
    
    // Pick the required count
    const picked = sorted.slice(0, dist.count);
    examQuestions.push(...picked);
    
    // Fallback: if pool for this subject is smaller than required count, fill with existing ones
    if (picked.length < dist.count) {
      let i = 0;
      while (examQuestions.filter(q => q.subject === dist.name).length < dist.count) {
        examQuestions.push({ ...subjectQuestions[i % subjectQuestions.length], id: `refill-${dist.name}-${i}-${index}` });
        i++;
      }
    }
  });

  return examQuestions.slice(0, 80);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
