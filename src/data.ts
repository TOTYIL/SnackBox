export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  stock: number;
  costPrice?: number;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  phone: string;
  room: string;
  items: OrderItem[];
  total: number;
  date: string;
  status: 'pending' | 'accepted' | 'preparing' | 'completed' | 'rejected' | 'out_for_delivery' | 'rage_blocked' | 'unanswered';
  paymentMethod?: 'cod' | 'prepaid';
  pointsUsed?: number;
  prepaidDiscount?: number;
  cravePointsDisabled?: boolean;
  dbRoom?: string;
  shakeSeen?: boolean;
}

export const categories = [
  "All",
  "Chips & Crisps",
  "Chocolates",
  "Healthy",
  "Drinks",
  "Instant Noodles"
];

export const products: Product[] = [
  {
    id: "p1",
    name: "Spicy Nacho Chips",
    description: "Crunchy tortilla chips with a burst of spicy cheese flavor. Perfect for late-night study sessions.",
    price: 40,
    image: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Chips & Crisps",
    inStock: true,
    stock: 25
  },
  {
    id: "p2",
    name: "Classic Potato Chips",
    description: "Thinly sliced, perfectly salted classic potato chips.",
    price: 30,
    image: "https://images.unsplash.com/photo-1621852004158-f3bc188ace2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Chips & Crisps",
    inStock: true,
    stock: 12
  },
  {
    id: "p3",
    name: "Dark Chocolate Bar",
    description: "Rich 70% cocoa dark chocolate for when you need a premium energy boost.",
    price: 80,
    image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Chocolates",
    inStock: true,
    stock: 8
  },
  {
    id: "p4",
    name: "Energy Drink",
    description: "Stay awake through those all-nighters with this citrus-flavored energy kick.",
    price: 110,
    image: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Drinks",
    inStock: true,
    stock: 15
  },
  {
    id: "p5",
    name: "Mixed Nuts Pack",
    description: "A healthy blend of almonds, cashews, and walnuts.",
    price: 150,
    image: "https://images.unsplash.com/photo-1599598425947-33001bfce3df?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Healthy",
    inStock: true,
    stock: 5
  },
  {
    id: "p6",
    name: "Spicy Ramen Soup",
    description: "The classic hostel staple. Just add hot water!",
    price: 25,
    image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Instant Noodles",
    inStock: true,
    stock: 50
  },
  {
    id: "p7",
    name: "Cold Brew Coffee",
    description: "Smooth, chilled coffee to keep you going.",
    price: 120,
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Drinks",
    inStock: true,
    stock: 10
  },
  {
    id: "p8",
    name: "Protein Bar",
    description: "Chocolate peanut butter flavor packed with 20g of protein.",
    price: 90,
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    category: "Healthy",
    inStock: true,
    stock: 18
  }
];
