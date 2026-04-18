/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  Trophy, 
  BookOpen,
  Info,
  Loader2
} from 'lucide-react';
import { Question, Exam, ExamResult, SUBJECT_DISTRIBUTION } from './types';
import { generateFullExam, getPerformanceAdvice } from './services/geminiService';
import { saveExam, saveResult, getAllExams } from './services/dbService';
import { getExamFromPool } from './services/examPoolService';
import { cn } from './lib/utils';

export default function App() {
  const [view, setView] = useState<'landing' | 'loading' | 'exam' | 'result'>('landing');
  const [exam, setExam] = useState<Exam | null>(null);
  const [pastExams, setPastExams] = useState<Exam[]>([]);
  const [examPool] = useState<Exam[]>(() => {
    // Generate 100 virtual exams from the pool service
    return Array.from({ length: 100 }, (_, i) => ({
      id: `pool-exam-${i + 1}`,
      createdAt: new Date().toISOString(),
      questions: [], // Questions will be loaded when selected to save memory
      isStatic: true,
      poolIndex: i
    })) as any[];
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(150 * 60);
  const [finalResult, setFinalResult] = useState<ExamResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userName, setUserName] = useState('');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);

  // Load results from DB on mount if needed (currently we only load exams)
  useEffect(() => {
    // We can fetch past individual results here if needed
  }, [view]);

  // Timer logic
  useEffect(() => {
    let timer: number;
    if (view === 'exam' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && view === 'exam') {
      handleSubmitExam();
    }
    return () => clearInterval(timer);
  }, [view, timeLeft]);

  const selectPoolExam = (index: number) => {
    const questions = getExamFromPool(index);
    const selectedExam: Exam = {
      id: `pool-exam-${index + 1}`,
      createdAt: new Date().toISOString(),
      questions: questions
    };
    setExam(selectedExam);
    setUserAnswers(new Array(questions.length).fill(null));
    setCurrentQuestionIndex(0);
    setTimeLeft(150 * 60);
    setView('exam');
    setAiAdvice(null);
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...userAnswers];
    if (newAnswers[currentQuestionIndex] === optionIndex) {
      newAnswers[currentQuestionIndex] = null;
    } else {
      newAnswers[currentQuestionIndex] = optionIndex;
    }
    setUserAnswers(newAnswers);
  };

  const handleSubmitExam = async () => {
    if (!exam) return;

    let correctCount = 0;
    let wrongCount = 0;
    let emptyCount = 0;

    exam.questions.forEach((q, idx) => {
      const answer = userAnswers[idx];
      if (answer === null) {
        emptyCount++;
      } else if (answer === q.correctIndex) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const net = correctCount - (wrongCount / 4);
    const score = (net / exam.questions.length) * 100;

    const result: ExamResult = {
      id: `result-${Date.now()}`,
      examId: exam.id,
      userId: 'anonymous',
      userName: userName || 'Ziyaretçi',
      score,
      correctCount,
      wrongCount,
      emptyCount,
      net,
      answers: userAnswers,
      completedAt: new Date().toISOString()
    };

    setFinalResult(result);
    setView('result');
    await saveResult(result);

    // Get AI advice
    setIsGettingAdvice(true);
    try {
      const advice = await getPerformanceAdvice(result, exam.questions);
      setAiAdvice(advice);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGettingAdvice(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-brand-bg text-[#212529] font-sans flex flex-col overflow-hidden h-screen">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full p-6 text-center overflow-y-auto"
          >
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Main CTA */}
              <div className="bg-white rounded-lg p-10 shadow-lg border-t-4 border-brand-blue sticky top-0">
                <div className="w-16 h-16 bg-brand-gray rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-8 h-8 text-brand-blue" />
                </div>
                <h1 className="text-2xl font-bold text-brand-blue mb-2">
                  Veteriner Hekimliği STS Hazırlık Deneme Sınavları
                </h1>
                <p className="text-sm text-gray-500 mb-8 uppercase tracking-wider font-semibold">
                  Simülasyon Platformu
                </p>
                
                <div className="space-y-4 mb-8 text-left text-sm">
                  <div className="flex flex-col gap-2 mb-4">
                    <label className="text-[10px] font-bold text-brand-blue uppercase tracking-widest">Aday Adı Soyadı</label>
                    <input 
                      type="text" 
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Adınızı giriniz..."
                      className="w-full p-3 bg-brand-bg border border-brand-gray rounded focus:ring-2 focus:ring-brand-blue outline-none font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-brand-bg rounded">
                    <span className="font-semibold text-gray-600">Soru Sayısı:</span>
                    <span className="font-bold">80 Soru</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-brand-bg rounded">
                    <span className="font-semibold text-gray-600">Sınav Süresi:</span>
                    <span className="font-bold">150 Dakika</span>
                  </div>
                  <div className="p-3 bg-red-50 text-brand-red rounded text-xs leading-relaxed font-bold border border-red-100 italic">
                    * 100 Farklı Deneme Sınavı içeren hazır soru havuzu.
                  </div>
                </div>

                <button 
                  onClick={() => selectPoolExam(Math.floor(Math.random() * 100))}
                  className="w-full bg-brand-blue text-white py-3 mb-4 rounded font-bold hover:bg-opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" /> RASTGELE SINAV BAŞLAT
                </button>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed text-center px-4">
                  Havuzdaki 100 farklı deneme sınavından dilediğinizi seçin veya rastgele birini başlatın.
                </p>
              </div>

              {/* History / Exam Library */}
              <div className="bg-white rounded-lg p-8 shadow-md border border-brand-gray h-full min-h-[500px] flex flex-col">
                <h3 className="text-xs font-bold text-[#1a3a5f] uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Sabit Sınav Havuzu (100 Deneme)
                </h3>
                
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar text-left scroll-smooth">
                  {examPool.map((e, idx) => (
                    <button
                      key={e.id}
                      onClick={() => selectPoolExam(idx)}
                      className="w-full p-4 rounded border border-brand-gray hover:border-brand-blue hover:bg-blue-50 transition-all flex items-center justify-between group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-brand-blue">DENEME SINAVI #{idx + 1}</span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          Durum: Hazır
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-gray-300 group-hover:text-brand-blue uppercase transition-colors">BAŞLAT</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-blue transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-auto pt-6 border-t border-brand-gray">
                   <p className="text-[10px] text-gray-400 text-center italic">
                    Bu havuz 2026 müfredatına uygun 100 farklı sınav kombinasyonu içermektedir.
                   </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full p-6 bg-white"
          >
            <Loader2 className="w-10 h-10 text-brand-blue animate-spin mb-4" />
            <h2 className="text-lg font-bold text-brand-blue">Havuzdan Sınav Yükleniyor</h2>
            <p className="text-sm text-gray-500 mt-2">Seçilen deneme sınavı hazırlanıyor...</p>
          </motion.div>
        )}

        {view === 'exam' && exam && (
          <motion.div 
            key="exam"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen overflow-hidden"
          >
            {/* Header */}
            <header className="bg-brand-blue text-white p-3 px-6 flex justify-between items-center border-b-4 border-brand-gold shrink-0">
              <div className="text-lg font-bold tracking-tight">2026 Veteriner Hekimliği STS Simülasyonu</div>
              <div className="flex items-center gap-6">
                <div className="text-sm">Aday: <strong className="text-brand-gold">{userName || 'Ziyaretçi'}</strong></div>
                <div className="bg-brand-red px-4 py-1.5 rounded text-white font-mono font-bold text-lg shadow-inner">
                  Kalan Süre: {formatTime(timeLeft)}
                </div>
              </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <aside className="w-72 bg-white border-r border-brand-gray flex flex-col p-4 shrink-0 shadow-xl z-10">
                <div className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest">Soru Navigasyonu (80 Soru)</div>
                <div className="grid grid-cols-5 gap-1.5 overflow-y-auto pr-2 custom-scrollbar">
                  {exam.questions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={cn(
                        "aspect-square rounded flex items-center justify-center text-[10px] font-bold border transition-all",
                        idx === currentQuestionIndex 
                          ? "border-2 border-brand-blue text-brand-blue scale-105 shadow-sm"
                          : userAnswers[idx] !== null 
                            ? "bg-brand-green border-brand-green text-white" 
                            : "bg-white border-brand-gray text-gray-400 hover:border-gray-400"
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-4 border-t border-brand-gray space-y-3">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                    <span>Tamamlanan: {userAnswers.filter(a => a !== null).length}</span>
                    <span>Kalan: {80 - userAnswers.filter(a => a !== null).length}</span>
                  </div>
                  <button 
                    onClick={handleSubmitExam}
                    className="w-full bg-brand-green text-white py-2.5 rounded text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
                  >
                    SINAVI BİTİR
                  </button>
                </div>
              </aside>

              {/* Content area */}
              <main className="flex-1 p-8 overflow-y-auto bg-brand-bg flex items-start justify-center">
                <div className="max-w-3xl w-full bg-white rounded shadow-md flex flex-col min-h-[500px] border border-brand-gray">
                  <div className="p-2 px-6 bg-brand-gray border-b border-brand-gray flex justify-between items-center text-[10px] font-bold text-brand-blue uppercase tracking-wider">
                    <span>Soru {currentQuestionIndex + 1} / 80</span>
                    <span>{exam.questions[currentQuestionIndex].subject}</span>
                  </div>
                  
                  <div className="p-8 flex-1">
                    <div className="text-lg leading-relaxed font-semibold mb-8 text-gray-800">
                      {exam.questions[currentQuestionIndex].text}
                    </div>

                    <div className="space-y-3">
                      {exam.questions[currentQuestionIndex].options.map((option, idx) => (
                        <label
                          key={idx}
                          className={cn(
                            "flex items-center p-4 border rounded-md cursor-pointer transition-all hover:bg-gray-50 group",
                            userAnswers[currentQuestionIndex] === idx
                              ? "bg-blue-50 border-brand-blue shadow-sm"
                              : "bg-white border-brand-gray"
                          )}
                        >
                          <div className="flex items-center">
                             <input
                              type="radio"
                              name="question-option"
                              checked={userAnswers[currentQuestionIndex] === idx}
                              onChange={() => handleAnswer(idx)}
                              className="w-4 h-4 text-brand-blue accent-brand-blue"
                            />
                            <span className={cn(
                              "ml-4 font-bold text-sm",
                              userAnswers[currentQuestionIndex] === idx ? "text-brand-blue" : "text-gray-400"
                            )}>{String.fromCharCode(65 + idx)})</span>
                          </div>
                          <span className={cn(
                            "ml-3 text-base",
                            userAnswers[currentQuestionIndex] === idx ? "text-brand-blue font-medium" : "text-gray-700 font-normal"
                          )}>
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 border-t border-brand-gray flex justify-between items-center">
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="px-6 py-2 bg-white border border-brand-gray text-gray-600 rounded text-xs font-bold hover:bg-gray-100 disabled:opacity-30 transition-all flex items-center gap-2"
                    >
                      &larr; Önceki Soru
                    </button>
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                      disabled={currentQuestionIndex === exam.questions.length - 1}
                      className="px-8 py-2 bg-brand-blue text-white rounded text-xs font-bold hover:bg-opacity-90 transition-all flex items-center gap-2"
                    >
                      Sonraki Soru &rarr;
                    </button>
                  </div>
                </div>
              </main>
            </div>
            
            <footer className="bg-brand-gray p-2 px-6 flex gap-8 text-[10px] font-bold text-gray-500 border-t border-brand-gray z-20">
              <div className="flex items-center gap-1.5 underline decoration-brand-blue underline-offset-2">Sınav Süresi: 150 Dakika</div>
              <div className="flex items-center gap-1.5">Puanlama: <span className="text-brand-red font-black tracking-tighter decoration-1">4 Yanlış 1 Doğruyu Götürür</span></div>
              <div className="flex items-center gap-1.5 ml-auto">Veritabanı Durumu: <span className="text-brand-green">Senkronize Edildi</span></div>
            </footer>
          </motion.div>
        )}

        {view === 'result' && finalResult && exam && (
          <motion.div 
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full overflow-y-auto bg-brand-bg flex flex-col"
          >
             {/* Simple Header for Results */}
            <header className="bg-brand-blue text-white p-3 px-6 flex justify-between items-center border-b-4 border-brand-gold shrink-0">
              <div className="text-lg font-bold tracking-tight text-brand-gold">SINAV SONUCU VE ANALİZİ</div>
              <div className="flex gap-3">
                <button onClick={() => setView('landing')} className="text-[10px] items-center gap-1.5 font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded hover:bg-white/20 transition-all">ANA MENÜ</button>
                <button onClick={() => selectPoolExam(Math.floor(Math.random() * 100))} className="text-[10px] items-center gap-1.5 font-bold uppercase tracking-widest bg-brand-green px-4 py-2 rounded hover:opacity-90 transition-all">YENİ SINAV</button>
              </div>
            </header>

            <div className="max-w-4xl mx-auto w-full p-8 space-y-8">
              {/* Summary Card */}
              <div className="bg-white rounded p-8 shadow-md border-t-4 border-brand-blue grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center group border-r last:border-r-0 border-brand-gray p-4 hover:bg-emerald-50 transition-all rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Doğru</div>
                  <div className="text-4xl font-black text-brand-green">{finalResult.correctCount}</div>
                </div>
                <div className="text-center group border-r last:border-r-0 border-brand-gray p-4 hover:bg-red-50 transition-all rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Yanlış</div>
                  <div className="text-4xl font-black text-brand-red">{finalResult.wrongCount}</div>
                </div>
                <div className="text-center group border-r last:border-r-0 border-brand-gray p-4 hover:bg-gray-100 transition-all rounded">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Boş</div>
                  <div className="text-4xl font-black text-gray-400">{finalResult.emptyCount}</div>
                </div>
                <div className="text-center group p-4 border-brand-gray hover:bg-brand-gray transition-all rounded bg-brand-gray/20">
                  <div className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-1">NET PUAN</div>
                  <div className="text-4xl font-black text-brand-blue">{finalResult.net.toFixed(2)}</div>
                </div>
              </div>

              {/* AI Performance Advice */}
              <div className="bg-white rounded-lg p-8 shadow-md border-t-4 border-brand-gold overflow-hidden">
                <div className="flex items-center gap-3 mb-6 border-b border-brand-gray pb-4">
                  <div className="w-10 h-10 bg-brand-gold/10 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-brand-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-blue">Yapay Zeka Eğitim Danışmanı</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kişiselleştirilmiş Gelişim Stratejisi</p>
                  </div>
                </div>
                
                {isGettingAdvice ? (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-sm font-semibold italic">Aday performansı analiz ediliyor, strateji oluşturuluyor...</p>
                  </div>
                ) : aiAdvice ? (
                  <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                    <div className="whitespace-pre-wrap font-medium">{aiAdvice}</div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Analiz getirilemedi.</p>
                )}
              </div>

              {/* Detailed Solutions Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-brand-blue uppercase tracking-widest border-b-2 border-brand-gold pb-2 inline-block">ÇÖZÜMLÜ CEVAP ANAHTARI</h3>
                {exam.questions.map((q, qIdx) => {
                  const userAnswer = userAnswers[qIdx];
                  const isCorrect = userAnswer === q.correctIndex;
                  return (
                    <div key={qIdx} className="bg-white rounded overflow-hidden shadow-sm border border-brand-gray">
                      <div className={cn(
                        "p-3 px-6 text-[10px] font-bold uppercase tracking-wider flex justify-between items-center text-white",
                        isCorrect ? "bg-brand-green" : userAnswer === null ? "bg-gray-400" : "bg-brand-red"
                      )}>
                        <span>Soru {qIdx + 1} | {q.subject}</span>
                        <span>{isCorrect ? "DOĞRU" : userAnswer === null ? "BOŞ" : "YANLIŞ"}</span>
                      </div>
                      <div className="p-8">
                        <div className="text-lg font-bold text-gray-800 mb-6">{q.text}</div>
                        <div className="grid gap-3 mb-8">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className={cn(
                              "p-3 px-4 border rounded text-sm flex items-center justify-between",
                              oIdx === q.correctIndex ? "bg-emerald-50 border-brand-green text-brand-green font-bold" :
                              userAnswer === oIdx ? "bg-red-50 border-brand-red text-brand-red font-bold" : "bg-gray-50 border-brand-gray text-gray-500"
                            )}>
                              <span>{String.fromCharCode(65+oIdx)}) {opt}</span>
                              {oIdx === q.correctIndex && <CheckCircle2 className="w-4 h-4" />}
                              {oIdx !== q.correctIndex && userAnswer === oIdx && <XCircle className="w-4 h-4" />}
                            </div>
                          ))}
                        </div>
                        <div className="bg-brand-bg/50 p-6 rounded-lg border-l-4 border-brand-blue">
                          <h5 className="text-xs font-bold text-brand-blue uppercase mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Çözüm Analizi
                          </h5>
                          <p className="text-sm text-gray-700 leading-relaxed italic mb-6"> {q.explanation} </p>
                          <div className="space-y-4 pt-4 border-t border-brand-gray/30">
                            <h6 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">DİĞER ŞIKLARIN ANALİZİ:</h6>
                            {q.optionExplanations.map((exp, expIdx) => (
                              <div key={expIdx} className="flex gap-2 text-[11px] leading-relaxed">
                                <span className="font-bold text-brand-blue w-4 shrink-0">{String.fromCharCode(65 + expIdx)}:</span>
                                <p className="text-gray-500">{exp}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
