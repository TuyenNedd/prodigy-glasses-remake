/* eslint-disable no-console */
import 'reflect-metadata';
import { AppDataSource } from './data-source';
import * as crypto from 'crypto';

const categories = [
  { name: 'Readers', slug: 'readers' },
  { name: 'Progressive Readers', slug: 'progressive-readers' },
  { name: 'Prescription Glasses', slug: 'prescription' },
  { name: 'Sunglasses', slug: 'sunglasses' },
  { name: 'Sunglass Readers', slug: 'sunglass-readers' },
  { name: 'Sun Progressives', slug: 'sun-progressives' },
  { name: 'Prescription Sunglasses', slug: 'prescription-sunglasses' },
  { name: 'Light Responsive', slug: 'light-responsive' },
  { name: 'Blue Light', slug: 'blue-light' },
  { name: 'Accessories', slug: 'accessories' },
];

function picsum(id: number): string {
  return `https://picsum.photos/seed/glasses${id}/600/400`;
}

const products = [
  // Readers (4)
  {
    name: 'Miklos | Reading Glasses',
    cat: 0,
    price: 110,
    stock: 30,
    discount: 0,
    desc: 'Our best-selling frame in a classic rectangular shape. Lightweight acetate with spring hinges for all-day comfort.',
  },
  {
    name: 'D28 | Reading Glasses',
    cat: 0,
    price: 110,
    stock: 25,
    discount: 0,
    desc: 'Bold square frame with keyhole bridge. A modern take on a timeless silhouette.',
  },
  {
    name: 'Bixby | Reading Glasses',
    cat: 0,
    price: 89,
    stock: 40,
    discount: 10,
    desc: 'Slim rectangular frame with a refined profile. Lightweight and understated.',
  },
  {
    name: 'Porgy Backstage | Reading Glasses',
    cat: 0,
    price: 110,
    stock: 20,
    discount: 0,
    desc: 'Round frame with vintage appeal. Acetate construction with polished finish.',
  },

  // Progressive Readers (3)
  {
    name: 'Miklos | Progressive Readers',
    cat: 1,
    price: 160,
    stock: 15,
    discount: 0,
    desc: 'No-line progressive lenses in our best-selling Miklos frame. Distance on top, reading on bottom.',
  },
  {
    name: 'D28 | Progressive Readers',
    cat: 1,
    price: 160,
    stock: 12,
    discount: 5,
    desc: 'Progressive lenses in the bold D28 square frame. Seamless transition between distances.',
  },
  {
    name: 'Porgy Backstage | Progressive Readers',
    cat: 1,
    price: 160,
    stock: 10,
    discount: 0,
    desc: 'Round progressive readers with vintage charm. No visible line between focal zones.',
  },

  // Prescription Glasses (4)
  {
    name: 'Miklos | Prescription Glasses',
    cat: 2,
    price: 310,
    stock: 18,
    discount: 0,
    desc: 'Our signature Miklos frame fitted with your custom prescription by certified opticians.',
  },
  {
    name: 'Hooper | Prescription Glasses',
    cat: 2,
    price: 340,
    stock: 12,
    discount: 0,
    desc: 'Metal aviator-inspired frame with adjustable nose pads. Premium prescription lenses.',
  },
  {
    name: 'Campbells | Prescription Glasses',
    cat: 2,
    price: 289,
    stock: 20,
    discount: 10,
    desc: 'Classic round orbital frame that works with all face shapes. Hand-measured prescription.',
  },
  {
    name: 'Root Cause Analysis | Prescription Glasses',
    cat: 2,
    price: 310,
    stock: 14,
    discount: 0,
    desc: 'Angular geometric frame with bold presence. Precision-crafted prescription lenses.',
  },

  // Sunglasses (4)
  {
    name: 'Miklos | Zeiss LightPro Sunglasses',
    cat: 3,
    price: 180,
    stock: 25,
    discount: 15,
    desc: 'Zeiss LightPro lenses with superior clarity and UV protection in the iconic Miklos frame.',
  },
  {
    name: 'Hooper | Zeiss LightPro Sunglasses',
    cat: 3,
    price: 210,
    stock: 18,
    discount: 0,
    desc: 'Aviator-style sunglasses with Zeiss optics. Polished metal frame with green lenses.',
  },
  {
    name: 'D28 | Zeiss LightPro Sunglasses',
    cat: 3,
    price: 180,
    stock: 22,
    discount: 0,
    desc: 'Bold square sunglasses with Zeiss LightPro technology. Full UV 400 protection.',
  },
  {
    name: 'Chavela | Zeiss LightPro Sunglasses',
    cat: 3,
    price: 180,
    stock: 20,
    discount: 10,
    desc: 'Cat-eye silhouette with Zeiss sun lenses. Feminine and sophisticated.',
  },

  // Sunglass Readers (3)
  {
    name: 'Miklos | Custom Sunglass Readers',
    cat: 4,
    price: 180,
    stock: 15,
    discount: 0,
    desc: 'Sun protection with your chosen magnification on the entire lens. Miklos frame.',
  },
  {
    name: 'D28 | Custom Sunglass Readers',
    cat: 4,
    price: 180,
    stock: 12,
    discount: 5,
    desc: 'Bold square sunglass readers. Tinted lenses with built-in magnification.',
  },
  {
    name: 'Bixby | Custom Sunglass Readers',
    cat: 4,
    price: 159,
    stock: 18,
    discount: 0,
    desc: 'Slim sunglass readers in the lightweight Bixby frame. Perfect for outdoor reading.',
  },

  // Sun Progressives (3)
  {
    name: 'D28 | Custom Sun Progressives',
    cat: 5,
    price: 230,
    stock: 10,
    discount: 0,
    desc: 'Sun protection with no magnification on top and your chosen power on the bottom.',
  },
  {
    name: 'Miklos | Custom Sun Progressives',
    cat: 5,
    price: 230,
    stock: 12,
    discount: 0,
    desc: 'Progressive sun lenses in the Miklos frame. Distance vision up top, reading below.',
  },
  {
    name: 'Wabi Sabi | Custom Sun Progressives',
    cat: 5,
    price: 230,
    stock: 8,
    discount: 10,
    desc: 'Organic-shaped sun progressives. Seamless focal transition with full UV protection.',
  },

  // Prescription Sunglasses (3)
  {
    name: 'Miklos | Prescription Sunglasses',
    cat: 6,
    price: 360,
    stock: 10,
    discount: 0,
    desc: 'Full prescription sun lenses in the Miklos frame. Certified optician hand-measured.',
  },
  {
    name: 'Bixby | Prescription Sunglasses',
    cat: 6,
    price: 339,
    stock: 12,
    discount: 5,
    desc: 'Lightweight prescription sunglasses in the slim Bixby frame. UV 400 protection.',
  },
  {
    name: 'Porgy Backstage | Prescription Sunglasses',
    cat: 6,
    price: 360,
    stock: 8,
    discount: 0,
    desc: 'Round prescription sunglasses with vintage appeal. Premium Rx sun lenses.',
  },

  // Light Responsive (3)
  {
    name: 'Miklos | Light Responsive Readers',
    cat: 7,
    price: 210,
    stock: 15,
    discount: 0,
    desc: 'Photochromic lenses that darken in sunlight. Clear indoors, tinted outdoors.',
  },
  {
    name: 'D28 | Light Responsive Readers',
    cat: 7,
    price: 210,
    stock: 12,
    discount: 0,
    desc: 'Adaptive lenses in the D28 frame. Automatically adjust to lighting conditions.',
  },
  {
    name: 'Bixby | Light Responsive Readers',
    cat: 7,
    price: 189,
    stock: 18,
    discount: 10,
    desc: 'Budget-friendly light responsive readers. Transitions seamlessly between environments.',
  },

  // Blue Light (3)
  {
    name: 'Miklos | Blue Light Readers',
    cat: 8,
    price: 130,
    stock: 30,
    discount: 0,
    desc: 'Blue light filtering lenses with magnification. Reduces digital eye strain.',
  },
  {
    name: 'D28 | Blue Light Readers',
    cat: 8,
    price: 130,
    stock: 25,
    discount: 0,
    desc: 'Screen protection in the bold D28 frame. Filters harmful blue light wavelengths.',
  },
  {
    name: 'Bixby | Blue Light Readers',
    cat: 8,
    price: 109,
    stock: 35,
    discount: 15,
    desc: 'Affordable blue light protection with reading magnification. All-day screen comfort.',
  },

  // Accessories (5)
  {
    name: 'Origami Case | Artist Series',
    cat: 9,
    price: 15,
    stock: 80,
    discount: 0,
    desc: 'Collapsible origami-style case with artist collaboration print. Protects your frames flat or folded.',
  },
  {
    name: 'Pulverized Apple Leather Pouch',
    cat: 9,
    price: 25,
    stock: 50,
    discount: 0,
    desc: 'Sustainable pouch made from pulverized apple leather. Soft interior lining.',
  },
  {
    name: 'Lens Wipers - 3 Pack',
    cat: 9,
    price: 8,
    stock: 100,
    discount: 0,
    desc: 'Premium microfiber lens wipers. Streak-free cleaning for all lens types.',
  },
  {
    name: 'Anti-Fog Lens Cleaner Solution',
    cat: 9,
    price: 15,
    stock: 60,
    discount: 0,
    desc: 'Professional-grade anti-fog cleaning solution. Safe for all coatings and lens materials.',
  },
  {
    name: 'Organic Linen Eyewear Pouch',
    cat: 9,
    price: 12,
    stock: 70,
    discount: 0,
    desc: 'Natural organic linen pouch with drawstring closure. Eco-friendly frame protection.',
  },
];

async function seed() {
  const ds = await AppDataSource.initialize();
  console.log('🌱 Seeding catalog...');

  // Check if already seeded (idempotent)
  const existingCategories = await ds.query('SELECT COUNT(*) as cnt FROM categories');
  if (existingCategories[0].cnt > 0) {
    console.log('⏭️  Categories already exist — skipping seed (idempotent)');
    await ds.destroy();
    return;
  }

  // Insert categories
  const categoryIds: string[] = [];
  for (const cat of categories) {
    const id = crypto.randomUUID();
    categoryIds.push(id);
    await ds.query(
      'INSERT INTO categories (id, name, slug, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [id, cat.name, cat.slug],
    );
  }
  console.log(`✅ Inserted ${categories.length} categories`);

  // Insert products
  let productIndex = 0;
  for (const prod of products) {
    productIndex++;
    const id = crypto.randomUUID();
    await ds.query(
      `INSERT INTO products (id, name, image, imageHover, imageDetail, category_id, price, countInStock, discount, description, rating, reviewCount, selled, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, NOW(), NOW())`,
      [
        id,
        prod.name,
        picsum(productIndex),
        picsum(productIndex + 100),
        picsum(productIndex + 200),
        categoryIds[prod.cat],
        prod.price * 24000, // Convert USD to VND
        prod.stock,
        prod.discount,
        prod.desc,
      ],
    );
  }
  console.log(`✅ Inserted ${products.length} products`);

  await ds.destroy();
  console.log('🎉 Seed complete!');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
