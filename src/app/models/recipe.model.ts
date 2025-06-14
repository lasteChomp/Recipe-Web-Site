export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  imageUrl?: string;
  createdBy: string;
  createdAt: Date;
  userName?: string;
} 