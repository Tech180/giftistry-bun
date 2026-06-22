import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { listAccessMiddleware } from '@/common/middlewares/list-access.middleware';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ItemUseCases } from './item-use-cases.interface';

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  digital_tech: [
    'tech', 'computer', 'cell', 'phone', 'laptop', 'keyboard', 'mouse', 
    'audio', 'headphone', 'camera', 'tablet', 'smartwatch', 'electronic', 
    'monitor', 'cable', 'usb', 'charger', 'software', 'video game', 
    'console', 'playstation', 'xbox', 'nintendo', 'switch', 'gamepad', 
    'gpu', 'cpu', 'ram', 'ssd'
  ],
  cash_funds: [
    'gift card', 'giftcard', 'voucher', 'cash', 'fund', 'donation', 
    'ticket', 'coupon'
  ],
  home_kitchen: [
    'kitchen', 'home', 'pillow', 'sheet', 'blanket', 'furniture', 'cook', 
    'bake', 'mug', 'plate', 'fork', 'spoon', 'knife', 'blender', 'toaster', 
    'vacuum', 'towel', 'candle', 'decor', 'bed', 'couch', 'table', 'chair', 
    'lamp', 'rug', 'curtain', 'cleaning', 'pan', 'pot'
  ],
  baby_kids: [
    'baby', 'kids', 'toy', 'diaper', 'pacifier', 'stroller', 'crib', 
    'lego', 'doll', 'plush', 'toddler', 'maternity', 'nursery', 'playmobil'
  ],
  apparel_accessories: [
    'apparel', 'accessory', 'clothing', 'shirt', 'pants', 'shoe', 'sock', 
    'dress', 'jacket', 'coat', 'hat', 'cap', 'ring', 'necklace', 'watch', 
    'bag', 'backpack', 'wallet', 'belt', 'glove', 'scarf', 'boot', 'sneaker', 
    'sweater', 'underwear', 'skirt', 't-shirt', 'jeans', 'trousers', 'shorts', 
    'blouse', 'earring', 'jewelry'
  ],
  health_wellness: [
    'health', 'wellness', 'vitamin', 'supplement', 'skin', 'makeup', 
    'cosmetic', 'soap', 'lotion', 'shampoo', 'massage', 'gym', 'workout', 
    'fitness', 'yoga', 'dumbbells', 'protein', 'perfume', 'cologne', 
    'toothbrush', 'clipper'
  ],
  outdoors_travel: [
    'outdoor', 'travel', 'camp', 'hike', 'tent', 'suitcase', 'luggage', 
    'travel bag', 'hammock', 'binocular', 'grill', 'patio', 'climbing', 
    'backpacking', 'passport', 'cooler'
  ],
  hobbies_entertainment: [
    'hobby', 'entertainment', 'game', 'book', 'dvd', 'movie', 'music', 
    'instrument', 'art', 'craft', 'paint', 'yarn', 'tool', 'drill', 
    'hammer', 'board game', 'puzzle', 'collectible', 'vinyl', 'guitar', 
    'piano', 'novel'
  ]
};

export const itemRoutes = (useCases: ItemUseCases) => new Elysia({ prefix: '/api' })
  .use(authMiddleware)
  .use(listAccessMiddleware)
  .get('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId } }) => {
    await checkListAccess('viewer');
    const user = await getAuthUser();
    const items = await useCases.listItems.execute(listId, user.userId);
    return { success: true, data: items };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Get items in wishlist',
      description: 'Fetch all items in a wishlist. Hides hidden items for owners if the list is not expired.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/wishlists/:listId/items', async ({ getAuthUser, checkListAccess, params: { listId }, body: { Giftistry: { Items: { name, description, priorityId, isHiddenIdea, linkUrl, price, websiteName, category, priority } } } }) => {
    const { role } = await checkListAccess('collaborator');
    const user = await getAuthUser();
    const resolvedHidden = isHiddenIdea ?? false;
    if (role === 'owner' && resolvedHidden) {
      throw new AppError('Forbidden: Owner cannot add hidden ideas to their own list', 403, 'FORBIDDEN');
    }

    const isSuggestion = role !== 'owner';

    const item = await useCases.addItem.execute(
      listId,
      name,
      description ?? null,
      priorityId ?? null,
      resolvedHidden || isSuggestion,
      user.userId,
      linkUrl ?? null,
      price !== undefined && price !== null ? Number(price) : null,
      websiteName ?? null,
      category ?? 'uncategorized',
      isSuggestion,
      priority !== undefined && priority !== null ? Number(priority) : null
    );
    return { success: true, data: item };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Add item to wishlist',
      description: 'Add a new gift item to a wishlist. Owners cannot add hidden ideas.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          name: t.String(),
          description: t.Optional(t.Nullable(t.String())),
          priorityId: t.Optional(t.Nullable(t.String())),
          isHiddenIdea: t.Optional(t.Boolean()),
          linkUrl: t.Optional(t.Nullable(t.String())),
          price: t.Optional(t.Nullable(t.Numeric())),
          websiteName: t.Optional(t.Nullable(t.String())),
          category: t.Optional(t.Nullable(t.String())),
          isSuggestion: t.Optional(t.Boolean()),
          priority: t.Optional(t.Nullable(t.Numeric())),
        })
      })
    })
  })
  .post('/items/:itemId/links', async ({ checkListAccess, params: { itemId }, body: { Giftistry: { Items: { url } } } }) => {
    await checkListAccess('collaborator');
    const link = await useCases.addItemLink.execute(itemId, url);
    return { success: true, data: link };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Add purchasing link to item',
      description: 'Add a store/purchasing URL to a wishlist item.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          url: t.String(),
        })
      })
    })
  })
  .post('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId }, body: { Giftistry: { Items: { amount, claimedByName, anonymous, quantity, selection } } } }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner') {
      throw new AppError('Forbidden: List owner cannot claim items on their own list', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    const claim = await useCases.claimItem.execute(
      itemId,
      user.userId,
      amount ?? null,
      claimedByName ?? null,
      anonymous ?? false,
      quantity ?? 1,
      selection ?? null
    );
    return { success: true, data: claim };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Claim item in wishlist',
      description: 'Claim/purchase a wishlist item. Owners cannot claim their own items.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          amount: t.Optional(t.Nullable(t.Numeric())),
          claimedByName: t.Optional(t.Nullable(t.String())),
          anonymous: t.Optional(t.Boolean()),
          quantity: t.Optional(t.Numeric()),
          selection: t.Optional(t.Nullable(t.String())),
        })
      })
    })
  })
  .delete('/items/:itemId/claims', async ({ getAuthUser, checkListAccess, params: { itemId } }) => {
    const { role } = await checkListAccess('viewer');
    if (role === 'owner') {
      throw new AppError('Forbidden: List owner cannot unclaim items', 403, 'FORBIDDEN');
    }
    const user = await getAuthUser();
    await useCases.unclaimItem.execute(itemId, user.userId);
    return { success: true, message: 'Item unclaimed successfully' };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Unclaim item in wishlist',
      description: 'Remove a claim made by the current user.',
      security: [{ bearerAuth: [] }]
    }
  })
  .post('/items/extract-metadata', async ({ body: { Giftistry: { Items: { url } } } }) => {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!res.ok) {
        return { success: false, message: 'Failed to fetch webpage' };
      }

      const html = await res.text();

      // Extract Title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                         html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
      let title = titleMatch ? decodeHtmlEntities(titleMatch[1]?.trim() ?? '') : '';

      // Check if title is generic or blocked
      const lowerTitle = title.toLowerCase();
      const isGeneric = !title || 
                        lowerTitle === 'amazon' || 
                        lowerTitle === 'amazon.com' || 
                        lowerTitle === 'robot check' || 
                        lowerTitle.includes('captcha') || 
                        lowerTitle === 'walmart' || 
                        lowerTitle === 'target';

      if (isGeneric) {
        try {
          const urlObj = new URL(url);
          const segments = urlObj.pathname.split('/').filter(Boolean);
          // Find a segment that represents a product slug (usually longer and has hyphens/underscores)
          const slug = segments.find(s => s.includes('-') || s.includes('_')) || segments[0];
          if (slug && slug.length > 2) {
            // Clean slug
            const cleanSlug = slug
              .replace(/[-_]+/g, ' ')
              .replace(/\.[a-z0-9]+$/i, '') // Remove extension if any (e.g. .html)
              .trim();
            // Capitalize words
            title = cleanSlug
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        } catch (_) {}
      }

      // Extract Price
      const priceMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i);
      const priceVal = priceMatch ? Number(priceMatch[1]) : null;
      const price = priceVal && !isNaN(priceVal) ? priceVal : null;

      // Extract Description
      const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ||
                        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
                        html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i);
      const description = descMatch ? decodeHtmlEntities(descMatch[1]?.trim() ?? '') : '';

      // Extract from JSON-LD
      let jsonLdColor: string | null = null;
      let jsonLdSize: string | null = null;
      try {
        const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        for (const match of jsonLdMatches) {
          try {
            const content = match[1]?.trim();
            if (content) {
              const parsed = JSON.parse(content);
              const extractDetails = (obj: any) => {
                if (!obj || typeof obj !== 'object') return;
                if (obj.color && typeof obj.color === 'string') jsonLdColor = obj.color;
                if (obj.size && typeof obj.size === 'string') jsonLdSize = obj.size;
                if (obj.color && typeof obj.color === 'object' && obj.color.name) jsonLdColor = String(obj.color.name);
                if (obj.size && typeof obj.size === 'object' && obj.size.name) jsonLdSize = String(obj.size.name);

                if (Array.isArray(obj.offers)) {
                  for (const offer of obj.offers) {
                    if (offer.color && typeof offer.color === 'string') jsonLdColor = offer.color;
                    if (offer.size && typeof offer.size === 'string') jsonLdSize = offer.size;
                  }
                } else if (obj.offers && typeof obj.offers === 'object') {
                  if (obj.offers.color && typeof obj.offers.color === 'string') jsonLdColor = obj.offers.color;
                  if (obj.offers.size && typeof obj.offers.size === 'string') jsonLdSize = obj.offers.size;
                }
              };
              if (Array.isArray(parsed)) {
                parsed.forEach(extractDetails);
              } else {
                extractDetails(parsed);
              }
            }
          } catch (_) {}
        }
      } catch (_) {}

      // Extract Color
      const colorMatch = html.match(/<meta[^>]*property=["']product:color["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']product:color["']/i) ||
                         html.match(/<meta[^>]*name=["']color["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']color["']/i) ||
                         html.match(/itemprop=["']color["'][^>]*content=["']([^"']+)["']/i);
      const color = jsonLdColor || (colorMatch ? decodeHtmlEntities(colorMatch[1]?.trim() ?? '') : '');

      // Extract Size
      const sizeMatch = html.match(/<meta[^>]*property=["']product:size["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']product:size["']/i) ||
                        html.match(/<meta[^>]*name=["']size["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']size["']/i) ||
                        html.match(/itemprop=["']size["'][^>]*content=["']([^"']+)["']/i);
      const size = jsonLdSize || (sizeMatch ? decodeHtmlEntities(sizeMatch[1]?.trim() ?? '') : '');

      // Auto-detect Category
      let category: string | null = null;
      try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.toLowerCase();
        const path = urlObj.pathname.toLowerCase();
        const textToScan = `${host} ${path} ${title.toLowerCase()}`;

        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          const escapedKeywords = keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const regex = new RegExp(`\\b(${escapedKeywords})\\b`, 'i');
          if (regex.test(textToScan)) {
            category = cat;
            break;
          }
        }
      } catch (_) {}

      return {
        success: true,
        data: {
          title,
          price,
          description: description || null,
          color: color || null,
          size: size || null,
          category: category || null
        }
      };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Error extracting metadata' };
    }
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Extract metadata from link',
      description: 'Scrapes webpage metadata like title and price from a URL to autopopulate the item creation form.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          url: t.String(),
        })
      })
    })
  })
  .put('/items/:itemId', async ({ checkListAccess, params: { itemId }, body: { Giftistry: { Items: { name, description, priorityId, category, priority } } } }) => {
    await checkListAccess('collaborator');
    const item = await useCases.updateItem.execute(
      itemId,
      name,
      description ?? null,
      priorityId ?? null,
      category ?? 'uncategorized',
      priority !== undefined && priority !== null ? Number(priority) : null
    );
    return { success: true, data: item };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Update item in wishlist',
      description: 'Update a gift item by ID. Requires owner or collaborator role.',
      security: [{ bearerAuth: [] }]
    },
    body: t.Object({
      Giftistry: t.Object({
        Items: t.Object({
          name: t.String(),
          description: t.Optional(t.Nullable(t.String())),
          priorityId: t.Optional(t.Nullable(t.String())),
          category: t.Optional(t.Nullable(t.String())),
          priority: t.Optional(t.Nullable(t.Numeric())),
        })
      })
    })
  })
  .get('/items/field-definitions', async ({ query: { category } }) => {
    const definitions = await useCases.getFieldDefinitions.execute(category || '');
    return { success: true, data: definitions };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Get dynamic optional field definitions for a category',
      description: 'Fetch all field definitions and dependencies for a category.',
      security: [{ bearerAuth: [] }]
    },
    query: t.Object({
      category: t.String()
    })
  })
  .delete('/items/:itemId', async ({ checkListAccess, params: { itemId } }) => {
    await checkListAccess('collaborator');
    await useCases.deleteItem.execute(itemId);
    return { success: true };
  }, {
    detail: {
      tags: ['Items'],
      summary: 'Delete item from wishlist',
      description: 'Delete a gift item by ID. Requires owner or collaborator role.',
      security: [{ bearerAuth: [] }]
    }
  });
