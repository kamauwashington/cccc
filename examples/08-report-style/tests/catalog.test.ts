// CI backstop. It stays off screen during the demo.
//
// This example ships working. Nothing here tests the app the prompt asks for,
// because the demo is about the shape of the answer and not about a repair.
// These tests hold the static data honest so the prompt always has something
// real to serve.

import { describe, expect, it } from 'vitest';

import { CATEGORIES, PRODUCTS } from '../src/catalog';

describe('the catalog', () => {
  it('ships six products across three categories', () => {
    expect(PRODUCTS).toHaveLength(6);
    expect(CATEGORIES).toHaveLength(3);
  });

  it('gives every product a unique id', () => {
    const ids = new Set(PRODUCTS.map((p) => p.id));
    expect(ids.size).toBe(PRODUCTS.length);
  });

  it('puts every product in a category that exists', () => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    for (const product of PRODUCTS) {
      expect(known.has(product.category)).toBe(true);
    }
  });

  it('prices everything in whole cents', () => {
    for (const product of PRODUCTS) {
      expect(Number.isInteger(product.priceCents)).toBe(true);
      expect(product.priceCents).toBeGreaterThan(0);
    }
  });
});
