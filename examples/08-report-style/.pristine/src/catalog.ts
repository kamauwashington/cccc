// The static data the API serves. It ships complete. Nothing reads a database
// and nothing reads a file. Same bytes on every request.

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  priceCents: number;
  inStock: boolean;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'tools', name: 'Hand tools' },
  { id: 'fasteners', name: 'Fasteners' },
  { id: 'safety', name: 'Safety gear' },
];

export const PRODUCTS: readonly Product[] = [
  { id: 'p-101', name: 'Claw hammer', category: 'tools', priceCents: 1899, inStock: true },
  { id: 'p-102', name: 'Torque wrench', category: 'tools', priceCents: 7450, inStock: false },
  { id: 'p-103', name: 'Pry bar', category: 'tools', priceCents: 2250, inStock: true },
  { id: 'p-201', name: 'Hex bolt, box of 50', category: 'fasteners', priceCents: 1195, inStock: true },
  { id: 'p-202', name: 'Wood screw, box of 200', category: 'fasteners', priceCents: 899, inStock: true },
  { id: 'p-301', name: 'Safety glasses', category: 'safety', priceCents: 1499, inStock: true },
];
