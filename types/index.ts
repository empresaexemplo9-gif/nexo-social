export type Category = 'Tecnologia' | 'Música' | 'Moda' | 'Cultura' | 'Esporte';

export interface EventItem {
  id: string;
  title: string;
  category: Category;
  date: string;
  location: string;
  imageUrl: string;
  description: string;
}

export interface ContentItem {
  id: string;
  title: string;
  category: Category;
  snippet: string;
  readTime: string;
  imageUrl: string;
}
