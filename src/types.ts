/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  subject: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  optionExplanations: string[];
}

export interface Exam {
  id: string;
  createdAt: string;
  questions: Question[];
}

export interface ExamResult {
  id: string;
  examId: string;
  userId: string;
  userName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  net: number;
  answers: (number | null)[];
  completedAt: string;
}

export const SUBJECT_DISTRIBUTION = [
  { name: 'Veteriner Anatomi', count: 5 },
  { name: 'Veteriner Biyokimya', count: 4 },
  { name: 'Veteriner Fizyoloji', count: 4 },
  { name: 'Histoloji & Embriyoloji', count: 3 },
  { name: 'Veteriner Hekimliği Tarihi & Deontoloji', count: 3 },
  { name: 'Lab. Hayvanları Bilimi', count: 3 },
  { name: 'İç Hastalıkları', count: 5 },
  { name: 'Cerrahi', count: 5 },
  { name: 'Doğum & Jinekoloji', count: 5 },
  { name: 'Dölverme & Suni Tohumlama', count: 4 },
  { name: 'Farmakoloji & Toksikoloji', count: 4 },
  { name: 'Mikrobiyoloji', count: 4 },
  { name: 'Viroloji', count: 3 },
  { name: 'Su Ürünleri', count: 3 },
  { name: 'Parazitoloji', count: 3 },
  { name: 'Patoloji', count: 3 },
  { name: 'Besin Hijyeni & Halk Sağlığı', count: 5 },
  { name: 'Genetik', count: 3 },
  { name: 'Biyometri', count: 3 },
  { name: 'Zootekni', count: 4 },
  { name: 'Besleme & Beslenme Hastalıkları', count: 4 }
];
