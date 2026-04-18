import { GoogleGenAI, Type } from "@google/genai";
import { Question, SUBJECT_DISTRIBUTION, ExamResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const QUESTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      text: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Exactly 5 options"
      },
      correctIndex: { type: Type.INTEGER, description: "0-4 index of the correct option" },
      explanation: { type: Type.STRING, description: "Detailed explanation of why the correct answer is right" },
      optionExplanations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Explanations for EACH option (why others are wrong), length 5"
      }
    },
    required: ["subject", "text", "options", "correctIndex", "explanation", "optionExplanations"]
  }
};

export async function generateExamBatch(subject: string, count: number): Promise<Question[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} distinct, professional-level multiple-choice questions for the 2026 Veterinary Medicine STS (Level Selection Examination) in Turkey. 
      Subject: ${subject}. 
      Language: Turkish.
      Random Seed Context: ${Math.random()}.
      Ensure these questions are unique and cover different sub-topics within ${subject}.
      Each question must have:
      1. A realistic clinical or theoretical text.
      2. Exactly 5 options (A, B, C, D, E).
      3. A clear indication of the correct index (0-4).
      4. A comprehensive explanation for the correct answer.
      5. A specific explanation for each of the 5 options, clarify why the 4 wrong ones are incorrect.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: QUESTION_SCHEMA
      }
    });

    const questions: any[] = JSON.parse(response.text || "[]");
    return questions.map((q, idx) => ({
      ...q,
      id: `${subject.replace(/\s+/g, '-')}-${Date.now()}-${idx}`
    }));
  } catch (error) {
    console.error(`Error generating questions for ${subject}:`, error);
    // Fallback if needed, but here we'll just throw so the caller handles it
    throw error;
  }
}

export async function generateFullExam(): Promise<Question[]> {
  // We can group subjects to avoid too many parallel calls
  // but for 21 subjects, it's roughly 21 calls.
  // Let's do them in chunks to be safe with rate limits.
  const allQuestions: Question[] = [];
  
  // Parallelize by subject
  const promises = SUBJECT_DISTRIBUTION.map(s => generateExamBatch(s.name, s.count));
  
  const results = await Promise.all(promises);
  results.forEach(batch => allQuestions.push(...batch));
  
  // Shuffle questions
  return allQuestions.sort(() => Math.random() - 0.5);
}

export async function getPerformanceAdvice(result: Partial<ExamResult>, questions: Question[]): Promise<string> {
  const subjectPerformance: Record<string, { correct: number; total: number }> = {};
  
  questions.forEach((q, idx) => {
    const isCorrect = (result.answers || [])[idx] === q.correctIndex;
    if (!subjectPerformance[q.subject]) {
      subjectPerformance[q.subject] = { correct: 0, total: 0 };
    }
    subjectPerformance[q.subject].total++;
    if (isCorrect) subjectPerformance[q.subject].correct++;
  });

  const performanceSummary = Object.entries(subjectPerformance)
    .map(([subject, stats]) => `${subject}: ${stats.correct}/${stats.total}`)
    .join(", ");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Veteriner Hekimliği STS hazırlığı için eğitim danışmanı rolündesin. 
      Aday '${result.userName}' bir deneme sınavını tamamladı.
      Sonuçlar: ${result.correctCount} Doğru, ${result.wrongCount} Yanlış, ${result.emptyCount} Boş. Net: ${result.net}.
      Konu bazlı detaylar: ${performanceSummary}.
      
      Bu verilere dayanarak:
      1. Adayın Genel performansını analiz et (Türkçe ve nazik bir dille).
      2. En güçlü ve en zayıf olduğu konuları vurgula.
      3. STS sınavını kazanması için yapması gerekenler hakkında somut, madde madde tavsiyeler ver. 60 net ve üzeri güvenli kabul edilir.
      4. Çalışma stratejisi öner.
      Format sade ve okunabilir olsun.`,
      config: {
        systemInstruction: "Sen bir eğitim danışmanısın. Yanıtların Türkçe, profesyonel ve cesaret verici olsun."
      }
    });

    return response.text || "Danışmanlık verisi hazırlanamadı.";
  } catch (error) {
    console.error("Error getting advice:", error);
    return "Şu an performans analizi yapılamıyor, lütfen sonra tekrar deneyin.";
  }
}
