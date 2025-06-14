import { Component } from '@angular/core';
import { RouterOutlet, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'yemek-tarifi-platformu';
  currentUserId: string | null = null;

  constructor(private router: Router, private auth: Auth) {
    this.auth.onAuthStateChanged(user => {
      this.currentUserId = user?.uid || null;
    });
  }

  isAuthPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/register';
  }
}
