import { Component } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, query, where, collectionData, doc, getDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Storage } from '@angular/fire/storage';
import { ActivatedRoute } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  user: any = null;
  userName: string = '-';
  myRecipes$: Observable<any[]> | null = null;
  editingRecipe: any = null;
  editForm: FormGroup | null = null;
  editSelectedFile: File | null = null;
  showEditModal = false;
  showDeleteModal = false;
  recipeToDelete: any = null;
  success: string = '';
  error: string = '';
  isOwnProfile: boolean = false;

  constructor(private auth: Auth, private firestore: Firestore, private fb: FormBuilder, private storage: Storage, private route: ActivatedRoute) {
    this.route.paramMap.subscribe(async params => {
      const uid = params.get('uid');
      if (!uid) return;
      this.auth.onAuthStateChanged(async user => {
        this.isOwnProfile = !!user && user.uid === uid;
        // Kullanıcı bilgisi
        const userDoc = doc(this.firestore, 'users', uid);
        const userSnap = await getDoc(userDoc);
        if (userSnap.exists()) {
          this.userName = userSnap.data()['username'] || '-';
          this.user = { email: userSnap.data()['email'] || '', uid };
        }
        const recipesRef = collection(this.firestore, 'recipes');
        const q = query(recipesRef, where('createdBy', '==', uid));
        this.myRecipes$ = collectionData(q, { idField: 'id' });
      });
    });
  }

  openEditModal(recipe: any) {
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

  openDeleteModal(recipe: any) {
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
      this.success = 'Tarif silindi!';
      this.closeDeleteModal();
    } catch (err: any) {
      this.error = 'Silme hatası: ' + (err.message || err);
    }
  }
}
