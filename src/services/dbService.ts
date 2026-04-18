import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { Exam, ExamResult } from '../types';

let db: any = null;

const initializeFirebase = async () => {
  try {
    // We attempt to fetch the config file. If it fails, we fall back.
    const response = await fetch('/firebase-applet-config.json');
    if (response.ok) {
      const firebaseConfig = await response.json();
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');
      
      if (firebaseConfig && !getApps().length) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
        return true;
      }
    }
  } catch (e) {
    console.warn('Firebase config could not be loaded. This is expected if Firebase setup failed or is not yet complete.', e);
  }
  return false;
};

// Start initialization
let firebaseReady = initializeFirebase();

export async function saveExam(exam: Exam): Promise<string> {
  const isReady = await firebaseReady;
  
  if (!isReady || !db) {
    const exams = JSON.parse(localStorage.getItem('exams') || '[]');
    exams.push(exam);
    localStorage.setItem('exams', JSON.stringify(exams));
    return exam.id;
  }
  
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const docRef = await addDoc(collection(db, 'exams'), {
    ...exam,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function saveResult(result: ExamResult): Promise<string> {
  const isReady = await firebaseReady;

  if (!isReady || !db) {
    const results = JSON.parse(localStorage.getItem('results') || '[]');
    results.push(result);
    localStorage.setItem('results', JSON.stringify(results));
    return result.id;
  }

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const docRef = await addDoc(collection(db, 'results'), {
    ...result,
    completedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getAllExams(): Promise<Exam[]> {
  const isReady = await firebaseReady;

  if (!isReady || !db) {
    return JSON.parse(localStorage.getItem('exams') || '[]');
  }

  const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
  const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
}
