export interface Product {
  id: string;
  name: string;
  price: number;
  category: 'charm' | 'keychain' | 'art-toy' | 'decoration';
  description: string;
  image: string;
  details: string;
  fileSize: string;
  printTime: string;
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
