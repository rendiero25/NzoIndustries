export type ProductDetailVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  /** Foto khusus varian — bukan bagian dari `images` (galeri/carousel produk). */
  imageUrl: string | null;
};

export type ProductDetailImage = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type ProductDetailBrand = {
  name: string;
  slug: string;
};

export type ProductDetailCategory = {
  name: string;
  slug: string;
};

export type ProductDetailPublic = {
  id: string;
  brandId: string | null;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  salePrice: number | null;
  condition: "new" | "second";
  averageRating: number;
  reviewCount: number;
  totalSold: number;
  minOrderQty: number;
  brand: ProductDetailBrand | null;
  category: ProductDetailCategory | null;
  images: ProductDetailImage[];
  variants: ProductDetailVariant[];
  tags: string[];
};

export type ProductReviewPublic = {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  createdAt: string;
  authorName: string;
};

export type RatingHistogramRow = { stars: 1 | 2 | 3 | 4 | 5; count: number };
