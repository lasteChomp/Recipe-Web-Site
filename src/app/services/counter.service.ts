import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, query, where } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class CounterService {
  constructor(private firestore: Firestore) {}

  async getCounter(recipeId: string): Promise<{ likes: number, dislikes: number, comments: number }> {
    const counterDoc = doc(this.firestore, 'counters', recipeId);
    const snap = await getDoc(counterDoc);
    if (snap.exists()) {
      return snap.data() as any;
    }
    // Eğer yoksa sıfırdan başlat
    await setDoc(counterDoc, { likes: 0, dislikes: 0, comments: 0 });
    return { likes: 0, dislikes: 0, comments: 0 };
  }

  async incrementCounter(recipeId: string, field: 'likes' | 'dislikes' | 'comments', value: number) {
    const counterDoc = doc(this.firestore, 'counters', recipeId);
    await updateDoc(counterDoc, { [field]: increment(value) });
  }

  // Tüm tariflerin sayaçlarını senkronize eden fonksiyon
  async syncAllCounters() {
    const recipesSnap = await getDocs(collection(this.firestore, 'recipes'));
    for (const recipeDoc of recipesSnap.docs) {
      const recipeId = recipeDoc.id;
      const likesSnap = await getDocs(query(collection(this.firestore, 'likes'), where('recipeId', '==', recipeId)));
      const dislikesSnap = await getDocs(query(collection(this.firestore, 'dislikes'), where('recipeId', '==', recipeId)));
      const commentsSnap = await getDocs(query(collection(this.firestore, 'comments'), where('recipeId', '==', recipeId)));
      await setDoc(doc(this.firestore, 'counters', recipeId), {
        likes: likesSnap.size,
        dislikes: dislikesSnap.size,
        comments: commentsSnap.size
      });
    }
    console.log('Tüm sayaçlar güncellendi!');
  }
} 