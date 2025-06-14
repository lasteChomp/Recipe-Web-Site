import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, increment } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';

export interface Like {
  id?: string;
  recipeId: string;
  userId: string;
  createdAt: Date;
}

export interface Dislike {
  id?: string;
  recipeId: string;
  userId: string;
  createdAt: Date;
}

export interface Comment {
  id?: string;
  recipeId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  constructor(private firestore: Firestore) {}

  // Like methods
  async addLike(recipeId: string, userId: string): Promise<void> {
    const like: Like = {
      recipeId,
      userId,
      createdAt: new Date()
    };
    await addDoc(collection(this.firestore, 'likes'), like);
  }

  async removeLike(recipeId: string, userId: string): Promise<void> {
    const likesRef = collection(this.firestore, 'likes');
    const q = query(likesRef, 
      where('recipeId', '==', recipeId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  }

  getLikesCount(recipeId: string): Observable<number> {
    const likesRef = collection(this.firestore, 'likes');
    const q = query(likesRef, where('recipeId', '==', recipeId));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.size)
    );
  }

  hasUserLiked(recipeId: string, userId: string): Observable<boolean> {
    const likesRef = collection(this.firestore, 'likes');
    const q = query(likesRef, 
      where('recipeId', '==', recipeId),
      where('userId', '==', userId)
    );
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty)
    );
  }

  // Dislike methods
  async addDislike(recipeId: string, userId: string): Promise<void> {
    const dislike: Dislike = {
      recipeId,
      userId,
      createdAt: new Date()
    };
    await addDoc(collection(this.firestore, 'dislikes'), dislike);
  }

  async removeDislike(recipeId: string, userId: string): Promise<void> {
    const dislikesRef = collection(this.firestore, 'dislikes');
    const q = query(dislikesRef, 
      where('recipeId', '==', recipeId),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  }

  getDislikesCount(recipeId: string): Observable<number> {
    const dislikesRef = collection(this.firestore, 'dislikes');
    const q = query(dislikesRef, where('recipeId', '==', recipeId));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.size)
    );
  }

  hasUserDisliked(recipeId: string, userId: string): Observable<boolean> {
    const dislikesRef = collection(this.firestore, 'dislikes');
    const q = query(dislikesRef, 
      where('recipeId', '==', recipeId),
      where('userId', '==', userId)
    );
    return from(getDocs(q)).pipe(
      map(snapshot => !snapshot.empty)
    );
  }

  // Comment methods
  async addComment(recipeId: string, userId: string, userName: string, content: string): Promise<void> {
    const comment: Comment = {
      recipeId,
      userId,
      userName: userName?.trim() || 'Bilinmeyen',
      content,
      createdAt: new Date()
    };
    await addDoc(collection(this.firestore, 'comments'), comment);
  }

  getComments(recipeId: string): Observable<Comment[]> {
    const commentsRef = collection(this.firestore, 'comments');
    const q = query(commentsRef, where('recipeId', '==', recipeId));
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Comment))
      )
    );
  }

  getCommentsCount(recipeId: string): Observable<number> {
    const commentsRef = collection(this.firestore, 'comments');
    const q = query(commentsRef, where('recipeId', '==', recipeId));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.size)
    );
  }
} 