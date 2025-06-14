import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private auth: Auth, private firestore: Firestore) {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
    });
  }

  async login(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string, name: string) {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      // Store additional user data in Firestore
      const userDoc = doc(this.firestore, 'users', result.user.uid);
      await setDoc(userDoc, {
        name,
        email,
        createdAt: new Date()
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw error;
    }
  }

  getCurrentUserId(): string | null {
    return this.currentUserSubject.value?.uid || null;
  }

  async getCurrentUserName(): Promise<string> {
    const userId = this.getCurrentUserId();
    if (!userId) return 'Bilinmeyen';
  
    const userDoc = await getDoc(doc(this.firestore, 'users', userId));
    const data = userDoc.data();
    return data?.['username']?.trim() || 'Bilinmeyen';
  }
}
