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
    examQuestions.push(...sorted.slice(0, dist.count));
  });

  return examQuestions;
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
