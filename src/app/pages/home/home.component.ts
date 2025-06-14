import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, CollectionReference, collectionData, query, orderBy, doc, updateDoc, deleteDoc, getDoc, where, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, map } from 'rxjs';
import { ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Storage } from '@angular/fire/storage';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RecipeService } from '../../services/recipe.service';
import { InteractionService, Comment } from '../../services/interaction.service';
import { Recipe } from '../../models/recipe.model';
import { CounterService } from '../../services/counter.service';
import { OrderByDatePipe } from '../../pipes/order-by-date.pipe';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, RouterLinkActive, OrderByDatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  recipeForm: FormGroup;
  success: string = '';
  error: string = '';
  recipes$: Observable<any[]>;
  selectedFile: File | null = null;
  editingRecipe: Recipe | null = null;
  editForm: FormGroup | null = null;
  editSelectedFile: File | null = null;
  showEditModal = false;
  showDeleteModal = false;
  recipeToDelete: any = null;
  currentUserId: string | null = null;
  recipesWithUser$!: Observable<any[]>;
  showCommentModal = false;
  selectedRecipe: Recipe | null = null;
  commentForm: FormGroup;
  comments$: Observable<Comment[]> | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private auth: Auth,
    private storage: Storage,
    private router: Router,
    private authService: AuthService,
    private recipeService: RecipeService,
    private interactionService: InteractionService,
    private counterService: CounterService
  ) {
    this.recipeForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      ingredients: ['', Validators.required],
      image: [null]
    });

    this.commentForm = this.fb.group({
      content: ['', Validators.required]
    });

    this.auth.onAuthStateChanged(async user => {
      this.currentUserId = user?.uid || null;
    });
    const recipesRef = collection(this.firestore, 'recipes') as CollectionReference;
    const recipesQuery = query(recipesRef, orderBy('createdAt', 'desc'));
    this.recipes$ = collectionData(recipesQuery, { idField: 'id' });
  }

  ngOnInit() {
    this.currentUserId = this.authService.getCurrentUserId();
    this.recipesWithUser$ = this.recipeService.getRecipesWithUser();
    this.counterService.syncAllCounters();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  async onSubmit() {
    this.success = '';
    this.error = '';
    if (this.recipeForm.valid) {
      const { title, description, ingredients } = this.recipeForm.value;
      const user = this.auth.currentUser;
      if (!user) {
        this.error = 'Kullanıcı oturumu bulunamadı!';
        return;
      }
      const ingredientsArray = ingredients.split(',').map((item: string) => item.trim()).filter((item: string) => item);
      let imageUrl = '';
      if (this.selectedFile) {
        try {
          const filePath = `recipes/${user.uid}_${Date.now()}_${this.selectedFile.name}`;
          const storageRef = ref(this.storage, filePath);
          await uploadBytes(storageRef, this.selectedFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (err: any) {
          this.error = 'Resim yüklenirken hata oluştu: ' + (err.message || err);
          return;
        }
      }
      try {
        const userDoc = doc(this.firestore, 'users', user.uid);
        const userSnap = await getDoc(userDoc);
        const userName = userSnap.exists() ? userSnap.data()['name'] || '-' : '-';

        await addDoc(collection(this.firestore, 'recipes'), {
          title,
          description,
          ingredients: ingredientsArray,
          imageUrl,
          createdBy: user.uid,
          userName,
          createdAt: new Date()
        });
        this.success = 'Tarif başarıyla eklendi!';
        this.recipeForm.reset();
        this.selectedFile = null;
      } catch (err: any) {
        this.error = 'Bir hata oluştu: ' + (err.message || err);
      }
    }
  }

  openEditModal(recipe: Recipe) {
    this.editingRecipe = recipe;
    this.editForm = this.fb.group({
      title: [recipe.title, Validators.required],
      description: [recipe.description, Validators.required],
      ingredients: [recipe.ingredients.join(', '), Validators.required],
      imageUrl: [recipe.imageUrl || '']
    });
    this.editSelectedFile = null;
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingRecipe = null;
    this.editForm = null;
    this.editSelectedFile = null;
  }

  onEditFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editSelectedFile = file;
    }
  }

  async saveEdit() {
    if (!this.editForm || !this.editingRecipe) return;
    const { title, description, ingredients } = this.editForm.value;
    let imageUrl = this.editingRecipe.imageUrl || '';
    if (this.editSelectedFile) {
      try {
        const user = this.auth.currentUser;
        if (!user) throw new Error('Kullanıcı oturumu bulunamadı!');
        const filePath = `recipes/${user.uid}_${Date.now()}_${this.editSelectedFile.name}`;
        const storageRef = ref(this.storage, filePath);
        await uploadBytes(storageRef, this.editSelectedFile);
        imageUrl = await getDownloadURL(storageRef);
      } catch (err: any) {
        this.error = 'Resim yüklenirken hata oluştu: ' + (err.message || err);
        return;
      }
    }
    try {
      const recipeRef = doc(this.firestore, 'recipes', this.editingRecipe.id);
      await updateDoc(recipeRef, {
        title,
        description,
        ingredients: ingredients.split(',').map((item: string) => item.trim()).filter((item: string) => item),
        imageUrl
      });
      this.success = 'Tarif güncellendi!';
      this.closeEditModal();
    } catch (err: any) {
      this.error = 'Güncelleme hatası: ' + (err.message || err);
    }
  }

  openDeleteModal(recipe: Recipe) {
    this.recipeToDelete = recipe;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.recipeToDelete = null;
    this.showDeleteModal = false;
  }

  async confirmDelete() {
    if (!this.recipeToDelete) return;
    try {
      const recipeRef = doc(this.firestore, 'recipes', this.recipeToDelete.id);
      await deleteDoc(recipeRef);
      // İlgili likes, dislikes, comments ve counters dokümanlarını da sil
      const likesQ = query(collection(this.firestore, 'likes'), where('recipeId', '==', this.recipeToDelete.id));
      const likesSnap = await getDocs(likesQ);
      for (const likeDoc of likesSnap.docs) {
        await deleteDoc(likeDoc.ref);
      }
      const dislikesQ = query(collection(this.firestore, 'dislikes'), where('recipeId', '==', this.recipeToDelete.id));
      const dislikesSnap = await getDocs(dislikesQ);
      for (const dislikeDoc of dislikesSnap.docs) {
        await deleteDoc(dislikeDoc.ref);
      }
      const commentsQ = query(collection(this.firestore, 'comments'), where('recipeId', '==', this.recipeToDelete.id));
      const commentsSnap = await getDocs(commentsQ);
      for (const commentDoc of commentsSnap.docs) {
        await deleteDoc(commentDoc.ref);
      }
      // Sayaç dokümanını sil
      await deleteDoc(doc(this.firestore, 'counters', this.recipeToDelete.id));
      this.success = 'Tarif silindi!';
      this.closeDeleteModal();
    } catch (err: any) {
      this.error = 'Silme hatası: ' + (err.message || err);
    }
  }

  // Like methods
  async toggleLike(recipe: Recipe) {
    if (!this.currentUserId) {
      this.router.navigate(['/login']);
      return;
    }
    const hasLiked = await this.interactionService.hasUserLiked(recipe.id, this.currentUserId).toPromise();
    const hasDisliked = await this.interactionService.hasUserDisliked(recipe.id, this.currentUserId).toPromise();

    if (hasLiked) {
      // Beğeniyi kaldır
      await this.interactionService.removeLike(recipe.id, this.currentUserId);
      await this.counterService.incrementCounter(recipe.id, 'likes', -1);
    } else {
      // Beğeni ekle
      await this.interactionService.addLike(recipe.id, this.currentUserId);
      await this.counterService.incrementCounter(recipe.id, 'likes', 1);
      // Eğer beğenmeme varsa kaldır
      if (hasDisliked) {
        await this.interactionService.removeDislike(recipe.id, this.currentUserId);
        await this.counterService.incrementCounter(recipe.id, 'dislikes', -1);
      }
    }
  }

  // Dislike methods
  async toggleDislike(recipe: Recipe) {
    if (!this.currentUserId) {
      this.router.navigate(['/login']);
      return;
    }
    const hasLiked = await this.interactionService.hasUserLiked(recipe.id, this.currentUserId).toPromise();
    const hasDisliked = await this.interactionService.hasUserDisliked(recipe.id, this.currentUserId).toPromise();

    if (hasDisliked) {
      // Beğenmeyi kaldır
      await this.interactionService.removeDislike(recipe.id, this.currentUserId);
      await this.counterService.incrementCounter(recipe.id, 'dislikes', -1);
    } else {
      // Beğenmeme ekle
      await this.interactionService.addDislike(recipe.id, this.currentUserId);
      await this.counterService.incrementCounter(recipe.id, 'dislikes', 1);
      // Eğer beğeni varsa kaldır
      if (hasLiked) {
        await this.interactionService.removeLike(recipe.id, this.currentUserId);
        await this.counterService.incrementCounter(recipe.id, 'likes', -1);
      }
    }
  }

  // Comment methods
  openCommentModal(recipe: Recipe) {
    if (!this.currentUserId) {
      this.router.navigate(['/login']);
      return;
    }
    this.selectedRecipe = recipe;
    this.showCommentModal = true;
    this.comments$ = this.interactionService.getComments(recipe.id);
  }

  closeCommentModal() {
    this.showCommentModal = false;
    this.selectedRecipe = null;
    this.commentForm.reset();
  }

  async submitComment() {
    if (this.commentForm.valid && this.selectedRecipe && this.currentUserId) {
      const userName = await this.authService.getCurrentUserName();
      await this.interactionService.addComment(
        this.selectedRecipe.id,
        this.currentUserId,
        userName,
        this.commentForm.get('content')?.value
      );
      await this.counterService.incrementCounter(this.selectedRecipe.id, 'comments', 1);
      this.commentForm.reset();
      this.comments$ = this.interactionService.getComments(this.selectedRecipe.id);
    }
  }

  // Helper methods for template
  getLikesCount(recipeId: string): Observable<number> {
    return this.interactionService.getLikesCount(recipeId);
  }

  getDislikesCount(recipeId: string): Observable<number> {
    return this.interactionService.getDislikesCount(recipeId);
  }

  getCommentsCount(recipeId: string): Observable<number> {
    return this.interactionService.getCommentsCount(recipeId);
  }

  hasUserLiked(recipeId: string): Observable<boolean> {
    return this.currentUserId ? 
      this.interactionService.hasUserLiked(recipeId, this.currentUserId) : 
      new Observable<boolean>(observer => observer.next(false));
  }

  hasUserDisliked(recipeId: string): Observable<boolean> {
    return this.currentUserId ? 
      this.interactionService.hasUserDisliked(recipeId, this.currentUserId) : 
      new Observable<boolean>(observer => observer.next(false));
  }
}
