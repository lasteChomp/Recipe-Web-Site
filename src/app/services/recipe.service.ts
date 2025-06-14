import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy, doc, getDoc } from '@angular/fire/firestore';
import { Observable, from, switchMap } from 'rxjs';
import { Recipe } from '../models/recipe.model';
import { CounterService } from './counter.service';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  constructor(private firestore: Firestore, private counterService: CounterService) {}

  getRecipesWithUser(): Observable<Recipe[]> {
    const recipesRef = collection(this.firestore, 'recipes');
    const q = query(recipesRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }).pipe(
      switchMap((recipes: any[]) =>
        from(Promise.all(
          recipes.map(async (recipe) => {
            let userName = '-';
            if (recipe.createdBy) {
              const userDoc = doc(this.firestore, 'users', recipe.createdBy);
              const userSnap = await getDoc(userDoc);
              if (userSnap.exists()) {
                userName = userSnap.data()['username'] || '-';
              }
            }
            const counters = await this.counterService.getCounter(recipe.id);
            return {
              ...recipe,
              userName,
              likesCount: counters.likes,
              dislikesCount: counters.dislikes,
              commentsCount: counters.comments
            };
          })
        ))
      )
    );
  }
} 