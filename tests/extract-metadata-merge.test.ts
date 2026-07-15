import { describe, expect, mock, test } from 'bun:test';
import {
  mergeExtractedMetadata,
  shouldAiPopulate,
  shouldRunAiPopulate,
} from '../src/modules/item/domain/merge-extracted-metadata';
import type { MetadataScraper } from '../src/modules/item/domain/ports/metadata-scraper.port';
import type { MetadataPopulator } from '../src/modules/item/domain/ports/metadata-populator.port';
import type { CategoryClassifier } from '../src/modules/item/domain/ports/category-classifier.port';
import type { PageContextFetcher } from '../src/modules/item/domain/ports/page-context.port';
import type { ServerConfigRepository } from '../src/modules/system/domain/ports/server-config.repository';
import type { UserRepository } from '../src/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '../src/common/application/user-policy.use-cases';
import type { WishlistRepository } from '../src/modules/wishlist/domain/ports/wishlist.repository';
import { ExtractMetadataUseCase } from '../src/modules/item/application/extract-metadata.use-case';

let aiEnabled = true;
let aiWebSearchEnabled = true;
let userAiEnabled = true;
let policyAllowsAi = true;

function createConfigRepo(): ServerConfigRepository {
  return {
    load: () =>
      ({
        AiEnabled: aiEnabled,
        AiWebSearchEnabled: aiWebSearchEnabled,
        AiFastProvider: 'openrouter',
        AiFastApiKey: 'test-key',
        AiFastModel: '',
        AiFastEndpoint: '',
        AiIntelligentProvider: 'openrouter',
        AiIntelligentApiKey: 'test-key',
        AiIntelligentModel: '',
        AiIntelligentEndpoint: '',
        AiPopulatePrompt: '',
        AiCategoryPrompt: '',
      }) as never,
  } as ServerConfigRepository;
}

function createPageContextFetcher(): PageContextFetcher {
  return {
    fetchHtml: async () => '',
    fetchContext: async () => 'Title: Test Product',
    resolveWebsiteName: () => 'Example Shop',
    buildContextFromHtml: () => 'Title: Test Product',
  };
}

function createUserRepo(): UserRepository {
  return {
    findById: async () => ({
      Id: 'user-1',
      AiEnabled: userAiEnabled,
      WebSearchEnabled: true,
    }),
  } as unknown as UserRepository;
}

function createWishlistRepo(webSearchEnabled = true): WishlistRepository {
  return {
    findById: async () => ({
      Id: 'list-1',
      AiEnabled: true,
      WebSearchEnabled: webSearchEnabled,
    }),
  } as unknown as WishlistRepository;
}

function createItemRepo() {
  return {
    findByListId: async () => [],
  } as unknown as import('../src/modules/item/domain/ports/item.repository').ItemRepository;
}

function createAssertUserCan(): AssertUserCanUseCase {
  return {
    execute: async () => {
      if (!policyAllowsAi) throw new Error('blocked');
    },
  } as unknown as AssertUserCanUseCase;
}

describe('ExtractMetadataUseCase AI merge', () => {
  test('fills scrape gaps with AI when populate is needed', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'low',
          blocked: true,
          fieldsFound: [],
        },
        data: {
          title: '',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        },
      }),
    };

    let populateCalled = false;
    const mockPopulator: MetadataPopulator = {
      populate: async () => {
        populateCalled = true;
        return {
          title: 'AI Product',
          price: 49.99,
          description: 'AI description',
          color: 'Blue',
          size: 'M',
          category: null,
          imageUrl: null,
          predefinedFields: { ShirtSize: 'M' },
          userDefinedFields: { Brand: 'Acme' },
        };
      },
    };

    const mockClassifier: CategoryClassifier = {
      classify: async () => ({ category: 'clothing', alternatives: [] }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher()
    );
    const result = await useCase.execute('https://shop.example/item', 'user-1');

    expect(populateCalled).toBe(true);
    expect(result.data.title).toBe('AI Product');
    expect(result.data.price).toBe(49.99);
    expect(result.data.category).toBe('clothing');
    expect(result.data.predefinedFields?.ShirtSize).toBe('M');
    expect(result.data.userDefinedFields?.Brand).toBe('Acme');
  });

  test('skips AI when server AI is disabled but maps scrape custom fields', async () => {
    aiEnabled = false;
    userAiEnabled = true;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'color', 'size'],
        },
        data: {
          title: 'Sneaker',
          price: null,
          description: null,
          color: 'Red',
          size: '10',
          category: 'apparel_accessories',
          imageUrl: null,
        },
      }),
    };

    let populateCalled = false;
    let classifyCalled = false;
    const mockPopulator: MetadataPopulator = {
      populate: async () => {
        populateCalled = true;
        return {
          title: 'AI Product',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        };
      },
    };

    const mockClassifier: CategoryClassifier = {
      classify: async () => {
        classifyCalled = true;
        return { category: 'tech', alternatives: [] };
      },
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher()
    );
    const result = await useCase.execute('https://shop.example/shoes', 'user-1');

    expect(populateCalled).toBe(false);
    expect(classifyCalled).toBe(false);
    expect(result.data.predefinedFields?.Color).toBe('Red');
    expect(result.data.predefinedFields?.ShoesSize).toBe('10');
  });

  test('skips AI when user opted out but maps scrape custom fields', async () => {
    aiEnabled = true;
    userAiEnabled = false;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price'],
        },
        data: {
          title: 'Gadget',
          price: 99,
          description: 'A gadget',
          color: null,
          size: null,
          category: 'digital_tech',
          imageUrl: null,
        },
      }),
    };

    let populateCalled = false;
    let classifyCalled = false;
    const mockPopulator: MetadataPopulator = {
      populate: async () => {
        populateCalled = true;
        return {
          title: 'AI',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        };
      },
    };

    const mockClassifier: CategoryClassifier = {
      classify: async () => {
        classifyCalled = true;
        return { category: 'tech', alternatives: [] };
      },
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher()
    );
    const result = await useCase.execute('https://shop.example/gadget', 'user-1');

    expect(populateCalled).toBe(false);
    expect(classifyCalled).toBe(false);
    expect(result.data.title).toBe('Gadget');
    expect(result.data.price).toBe(99);
  });

  test('runs populate when scrape has no mapped custom fields', async () => {
    aiEnabled = true;
    userAiEnabled = true;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price', 'description'],
        },
        data: {
          title: 'Gadget',
          price: 99,
          description: 'A gadget',
          color: null,
          size: null,
          category: 'digital_tech',
          imageUrl: null,
        },
      }),
    };

    let populateCalled = false;
    const mockPopulator: MetadataPopulator = {
      populate: async () => {
        populateCalled = true;
        return {
          title: 'Gadget',
          price: 99,
          description: 'A gadget',
          color: null,
          size: null,
          category: null,
          imageUrl: null,
          predefinedFields: {},
          userDefinedFields: { Brand: 'Acme' },
        };
      },
    };

    const mockClassifier: CategoryClassifier = {
      classify: async () => ({ category: 'tech', alternatives: [] }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher()
    );
    const result = await useCase.execute('https://shop.example/gadget', 'user-1');

    expect(populateCalled).toBe(true);
    expect(result.data.userDefinedFields?.Brand).toBe('Acme');
  });

  test('maps top-level AI color and size into predefined fields after merge', async () => {
    aiEnabled = true;
    userAiEnabled = true;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price'],
        },
        data: {
          title: 'Hoodie',
          price: 59.99,
          description: null,
          color: null,
          size: null,
          category: 'clothing',
          imageUrl: null,
        },
      }),
    };

    const mockPopulator: MetadataPopulator = {
      populate: async () => ({
        title: 'Hoodie',
        price: 59.99,
        description: 'Soft fleece',
        color: 'Black',
        size: 'L',
        category: null,
        imageUrl: null,
        predefinedFields: {},
        userDefinedFields: { Brand: 'Acme' },
      }),
    };

    const mockClassifier: CategoryClassifier = {
      classify: async () => ({ category: 'clothing', alternatives: [] }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher()
    );
    const result = await useCase.execute('https://shop.example/hoodie', 'user-1');

    expect(result.data.predefinedFields?.Color).toBe('Black');
    expect(result.data.predefinedFields?.ShirtSize).toBe('L');
    expect(result.data.userDefinedFields?.Brand).toBe('Acme');
  });

  test('passes web search context to populator when list web search gates pass', async () => {
    aiEnabled = true;
    aiWebSearchEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    let populateInput: {
      searchContext?: string;
      reconcileSources?: boolean;
    } | null = null;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price'],
        },
        data: {
          title: 'AYANEO Pocket MICRO 2',
          price: 299,
          description: null,
          color: null,
          size: null,
          category: 'tech',
          imageUrl: null,
        },
      }),
    };

    const mockPopulator: MetadataPopulator = {
      populate: async (input) => {
        populateInput = input;
        return {
          title: 'AYANEO Pocket MICRO 2',
          price: 299,
          description: 'Compact Android gaming handheld for portable play.',
          color: null,
          size: null,
          category: null,
          imageUrl: null,
          predefinedFields: { StorageCapacity: '256GB' },
          userDefinedFields: { RAM: '8GB' },
        };
      },
    };

    const mockClassifier: CategoryClassifier = {
      classify: async () => ({ category: 'tech', alternatives: [] }),
    };

    const mockResearcher = {
      research: async () => 'Search query: AYANEO Pocket MICRO 2 specifications',
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(true),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      mockResearcher
    );

    const result = await useCase.execute('https://shop.example/gadget', 'user-1', {
      listId: 'list-1',
    });

    expect(populateInput?.searchContext).toContain('AYANEO Pocket MICRO 2 specifications');
    expect(populateInput?.reconcileSources).toBe(true);
    expect(result.data.userDefinedFields?.RAM).toBe('8GB');
    expect(result.data.description).not.toContain('8GB');
  });

  test('skips web search when list web search is disabled', async () => {
    aiEnabled = true;
    aiWebSearchEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    let populateInput: {
      searchContext?: string;
      reconcileSources?: boolean;
    } | null = null;

    const mockScraper: MetadataScraper = {
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price'],
        },
        data: {
          title: 'AYANEO Pocket MICRO 2',
          price: 299,
          description: null,
          color: null,
          size: null,
          category: 'tech',
          imageUrl: null,
        },
      }),
    };

    const mockPopulator: MetadataPopulator = {
      populate: async (input) => {
        populateInput = input;
        return {
          title: 'AYANEO Pocket MICRO 2',
          price: 299,
          description: 'Compact Android gaming handheld for portable play.',
          color: null,
          size: null,
          category: null,
          imageUrl: null,
          predefinedFields: {},
          userDefinedFields: {},
        };
      },
    };

    const mockClassifier: CategoryClassifier = {
      classify: async () => ({ category: 'tech', alternatives: [] }),
    };

    const mockResearcher = {
      research: async () => 'Search query: AYANEO Pocket MICRO 2 specifications',
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(false),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      mockResearcher
    );

    await useCase.execute('https://shop.example/gadget', 'user-1', {
      listId: 'list-1',
    });

    expect(populateInput?.searchContext).toBeUndefined();
    expect(populateInput?.reconcileSources).toBeFalsy();
  });
});
