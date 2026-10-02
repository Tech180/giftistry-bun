import { describe, expect, mock, test } from 'bun:test';
import {
  mergeExtractedMetadata,
  shouldAiPopulate,
  shouldRunAiPopulate,
} from '../src/modules/item/domain/utils/merge-extracted-metadata.util';
import type { ScrapeTelemetryEvent } from '../src/modules/item/domain/interfaces/scrape-telemetry-event.interface';
import type { MetadataScraper } from '../src/modules/item/domain/ports/metadata-scraper.port';
import type { MetadataPopulator } from '../src/modules/item/domain/ports/metadata-populator.port';
import type { CategoryClassifier } from '../src/modules/item/domain/ports/category-classifier.port';
import type { PageContextFetcher } from '../src/modules/item/domain/ports/page-context.port';
import type { ServerConfigRepository } from '../src/modules/system/domain/ports/server-config.repository';
import type { UserRepository } from '../src/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '../src/common/application/use-cases/user-policy.use-cases';
import type { WishlistRepository } from '../src/modules/wishlist/domain/ports/wishlist.repository';
import { noopScrapeTelemetry } from '../src/modules/item/infrastructure/adapters/log-scrape-telemetry';

let probeReachable = true;

mock.module('../src/common/utils/probe-ai-reachability.util', () => ({
  probeAiReachability: async () => probeReachable,
}));

const { ExtractMetadataUseCase } = await import(
  '../src/modules/item/slices/metadata/use-cases/extract-metadata.use-case'
);

let aiEnabled = true;
let aiWebSearchEnabled = true;
let userAiEnabled = true;
let policyAllowsAi = true;

function createConfigRepo(overrides: { AiEnabledPackIds?: string[] } = {}): ServerConfigRepository {
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
        ...overrides,
      }) as never,
  } as ServerConfigRepository;
}

const defaultEvidenceHtml = `<!doctype html><html><head><title>Test Product</title></head><body><main>Test Product AI Product Brand Acme Color Blue Size M</main></body></html>`;

function createPageContextFetcher(): PageContextFetcher {
  const context =
    'Title: Test Product\nProduct Name: Test Product\nBrand: Acme\nColor: Blue\nSize: M';
  return {
    fetchHtml: async () => defaultEvidenceHtml,
    fetchContext: async () => context,
    resolveWebsiteName: () => 'Example Shop',
    buildContextFromHtml: () => context,
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

function createWishlistRepo(
  listAiEnabled = true,
  webSearchEnabled = true
): WishlistRepository {
  return {
    findById: async () => ({
      Id: 'list-1',
      AiEnabled: listAiEnabled,
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
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'low',
          blocked: false,
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
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
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
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
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
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
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
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
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
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );
    const result = await useCase.execute('https://shop.example/gadget', 'user-1');

    expect(populateCalled).toBe(false);
    expect(classifyCalled).toBe(false);
    expect(result.data.title).toBe('Gadget');
    expect(result.data.price).toBe(99);
  });

  test('skips AI when wishlist AI is disabled but maps scrape custom fields', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price'],
        },
        data: {
          title: 'Board Game',
          price: 45,
          description: null,
          color: null,
          size: null,
          category: 'games',
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
        return { category: 'games', alternatives: [] };
      },
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
      undefined,
      noopScrapeTelemetry
    );
    const result = await useCase.execute('https://shop.example/game', 'user-1', {
      listId: 'list-1',
    });

    expect(populateCalled).toBe(false);
    expect(classifyCalled).toBe(false);
    expect(result.diagnostics.aiPopulate).toBe('skipped');
    expect(result.data.title).toBe('Board Game');
    expect(result.data.price).toBe(45);
  });

  test('rethrows blocked ScrapeError when wishlist AI is disabled', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    const { ScrapeError } = await import('../src/modules/item/domain/errors/scrape-error');

    let populateCalled = false;
    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => {
        throw new ScrapeError('Both strategies failed: bot-check:captcha', {
          blocked: true,
          validationReason: 'bot-check:captcha',
          tier: 'playwright',
        });
      },
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      {
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
      },
      { classify: async () => ({ category: 'tech', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(false),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    await expect(
      useCase.execute('https://www.amazon.com/dp/B0TEST1234', 'user-1', { listId: 'list-1' })
    ).rejects.toBeInstanceOf(ScrapeError);
    expect(populateCalled).toBe(false);
  });

  test('runs populate when scrape has no mapped custom fields', async () => {
    aiEnabled = true;
    userAiEnabled = true;

    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
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
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );
    const result = await useCase.execute('https://shop.example/gadget', 'user-1');

    expect(populateCalled).toBe(true);
    expect(result.data.userDefinedFields?.Brand).toBe('Acme');
  });

  test('maps top-level AI color and size into predefined fields after merge', async () => {
    aiEnabled = true;
    userAiEnabled = true;

    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
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
      {
        fetchHtml: async () => '',
        fetchContext: async () => 'Title: Hoodie\nColor: Black\nSize: L\nBrand: Acme',
        resolveWebsiteName: () => 'Example Shop',
        buildContextFromHtml: () => 'Title: Hoodie\nColor: Black\nSize: L\nBrand: Acme',
      },
      undefined,
      noopScrapeTelemetry
    );
    const result = await useCase.execute('https://shop.example/hoodie', 'user-1');

    expect(result.data.predefinedFields?.Color).toBe('Black');
    expect(result.data.predefinedFields?.ShirtSize).toBe('L');
    expect(result.data.userDefinedFields?.Brand).toBe('Acme');
  });

  test('keeps scrape price and drops invented AI image when evidence is present', async () => {
    aiEnabled = true;
    userAiEnabled = true;

    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'medium',
          blocked: false,
          fieldsFound: ['title', 'price', 'imageUrl'],
        },
        data: {
          title: 'Mug',
          price: 12.5,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: 'https://cdn.example/mug.jpg',
        },
      }),
    };

    const mockPopulator: MetadataPopulator = {
      populate: async () => ({
        title: 'Mug',
        price: 999,
        description: 'Ceramic',
        color: 'Ultraviolet',
        size: null,
        category: null,
        imageUrl: 'https://cdn.evil/hallucinated.jpg',
      }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      { classify: async () => ({ category: 'home', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      {
        fetchHtml: async () => '',
        fetchContext: async () => 'Title: Mug\nPrice: 12.50',
        resolveWebsiteName: () => 'Shop',
        buildContextFromHtml: () => 'Title: Mug\nPrice: 12.50',
      },
      undefined,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://shop.example/mug', 'user-1');
    expect(result.data.price).toBe(12.5);
    expect(result.data.imageUrl).toBe('https://cdn.example/mug.jpg');
    expect(result.data.color).toBeNull();
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
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
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
      research: async () =>
        'Search query: AYANEO Pocket MICRO 2 specifications\nCompact Android gaming handheld built for portable play.',
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
      mockResearcher,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://shop.example/gadget', 'user-1', {
      listId: 'list-1',
    });

    expect(populateInput?.searchContext).toContain('AYANEO Pocket MICRO 2 specifications');
    expect(populateInput?.reconcileSources).toBe(true);
    expect(result.data.userDefinedFields?.RAM).toBe('8GB');
    expect(result.data.description).toBeTruthy();
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
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
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
      mockResearcher,
      noopScrapeTelemetry
    );

    await useCase.execute('https://shop.example/gadget', 'user-1', {
      listId: 'list-1',
    });

    expect(populateInput?.searchContext).toBeUndefined();
    expect(populateInput?.reconcileSources).toBeFalsy();
  });
});

describe('ExtractMetadataUseCase AiPopulate diagnostics', () => {
  test('marks AiPopulate succeeded when populate returns', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'low',
          blocked: false,
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

    const mockPopulator: MetadataPopulator = {
      populate: async () => ({
        title: 'AI Product',
        price: 10,
        description: 'Notes',
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      { classify: async () => ({ category: 'tech', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://shop.example/item', 'user-1');
    expect(result.diagnostics.aiPopulate).toBe('succeeded');
    expect(result.data.title).toBe('AI Product');
  });

  test('marks AiPopulate failed and keeps scrape data when populate throws', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price'],
        },
        data: {
          title: 'Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue',
          price: 599,
          description: null,
          color: 'Blue',
          size: null,
          category: null,
          imageUrl: null,
        },
      }),
    };

    const mockPopulator: MetadataPopulator = {
      populate: async () => {
        throw new Error('model unavailable');
      },
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      { classify: async () => ({ category: 'home', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://shop.example/dyson', 'user-1');
    expect(result.diagnostics.aiPopulate).toBe('failed');
    expect(result.data.title).toBe('Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue');
    expect(result.data.price).toBe(599);
  });

  test('records failed aiPopulate and split durations in telemetry when populate throws', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    const events: ScrapeTelemetryEvent[] = [];
    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title', 'price'],
        },
        data: {
          title: 'Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue',
          price: 599,
          description: null,
          color: 'Blue',
          size: null,
          category: null,
          imageUrl: null,
        },
      }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      {
        populate: async () => {
          throw new Error('model unavailable');
        },
      },
      { classify: async () => ({ category: 'home', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      { record: (event) => void events.push(event) }
    );

    await useCase.execute('https://shop.example/dyson', 'user-1');

    expect(events).toHaveLength(1);
    expect(events[0]?.aiPopulate).toBe('failed');
    expect(events[0]?.scrapeDurationMs).toBeGreaterThanOrEqual(0);
    expect(events[0]?.aiDurationMs).toBeGreaterThanOrEqual(0);
    expect(events[0]?.durationMs).toBeGreaterThanOrEqual(
      (events[0]?.scrapeDurationMs ?? 0) + (events[0]?.aiDurationMs ?? 0) - 1
    );
  });

  test('skips AI stages and returns scrape-only data when the caller budget is exhausted', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    let populateCalls = 0;
    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'low',
          blocked: false,
          fieldsFound: ['title'],
        },
        data: {
          title: 'Some Product',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        },
      }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      {
        populate: async () => {
          populateCalls += 1;
          throw new Error('should not be called');
        },
      },
      { classify: async () => ({ category: 'home', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    // 1ms budget: exhausted before the AI stages start.
    const result = await useCase.execute('https://shop.example/p', 'user-1', { deadlineMs: 1 });
    await Bun.sleep(0);
    expect(populateCalls).toBe(0);
    expect(result.diagnostics.aiPopulate).toBe('skipped');
    expect(result.data.title).toBe('Some Product');
  });

  test('marks AiPopulate skipped when server AI is disabled', async () => {
    aiEnabled = false;
    userAiEnabled = true;
    policyAllowsAi = true;

    const mockScraper: MetadataScraper = {
      resolveFinalUrl: async () => null,
      scrapeFromCapture: async () => {
        throw new Error('scrapeFromCapture not implemented in mock');
      },
      scrape: async () => ({
        diagnostics: {
          source: 'fetch',
          confidence: 'high',
          blocked: false,
          fieldsFound: ['title'],
        },
        data: {
          title: 'Sneaker',
          price: null,
          description: null,
          color: null,
          size: null,
          category: null,
          imageUrl: null,
        },
      }),
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      {
        populate: async () => {
          throw new Error('should not run');
        },
      },
      { classify: async () => ({ category: 'tech', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://shop.example/item', 'user-1');
    expect(result.diagnostics.aiPopulate).toBe('skipped');
    expect(result.data.title).toBe('Sneaker');
  });

  test('composes CPU pack fields into populate prompt for tech category', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    let capturedPrompt = '';
    let capturedCategory: string | undefined;

    const useCase = new ExtractMetadataUseCase(
      {
        resolveFinalUrl: async () => null,
        scrape: async () => ({
          diagnostics: {
            source: 'fetch',
            confidence: 'low',
            blocked: false,
            fieldsFound: ['title'],
          },
          data: {
            title: 'AMD Ryzen 5 5600X',
            price: null,
            description: null,
            color: null,
            size: null,
            category: null,
            imageUrl: null,
          },
        }),
      },
      {
        populate: async (input, config) => {
          capturedPrompt = config.customPrompt;
          capturedCategory = input.category;
          return {
            title: 'AMD Ryzen 5 5600X',
            price: null,
            description: null,
            color: null,
            size: null,
            category: null,
            imageUrl: null,
            predefinedFields: { Cores: '6', Threads: '12', Socket: 'AM4' },
            userDefinedFields: {},
          };
        },
      },
      { classify: async () => ({ category: 'tech', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://shop.example/cpu', 'user-1');

    expect(capturedCategory).toBe('tech');
    expect(capturedPrompt).toContain('=== Metadata Packs ===');
    expect(capturedPrompt).toContain('Cores');
    expect(capturedPrompt).toContain('Threads');
    expect(capturedPrompt).toContain('Socket');
    expect(result.data.predefinedFields?.Cores).toBe('6');
    expect(result.data.predefinedFields?.Socket).toBe('AM4');
  });

  test('omits pack section when no packs are enabled', async () => {
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    let capturedPrompt = '';

    const useCase = new ExtractMetadataUseCase(
      {
        resolveFinalUrl: async () => null,
        scrape: async () => ({
          diagnostics: {
            source: 'fetch',
            confidence: 'low',
            blocked: false,
            fieldsFound: ['title'],
          },
          data: {
            title: 'AMD Ryzen 5 5600X',
            price: null,
            description: null,
            color: null,
            size: null,
            category: null,
            imageUrl: null,
          },
        }),
      },
      {
        populate: async (_input, config) => {
          capturedPrompt = config.customPrompt;
          return {
            title: 'AMD Ryzen 5 5600X',
            price: null,
            description: null,
            color: null,
            size: null,
            category: null,
            imageUrl: null,
          };
        },
      },
      { classify: async () => ({ category: 'tech', alternatives: [] }) },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo({ AiEnabledPackIds: [] }),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    await useCase.execute('https://shop.example/cpu', 'user-1');
    expect(capturedPrompt).not.toContain('=== Metadata Packs ===');
  });
});

describe('ExtractMetadataUseCase unreachable AI', () => {
  test('skips categorize and populate when probe fails', async () => {
    probeReachable = false;
    aiEnabled = true;
    userAiEnabled = true;
    policyAllowsAi = true;

    const classify = mock(async () => ({ category: 'tech', alternatives: [] }));
    const populate = mock(async () => ({
      title: 'Should not run',
      price: null,
      description: null,
      color: null,
      size: null,
      category: null,
      imageUrl: null,
    }));

    const useCase = new ExtractMetadataUseCase(
      {
        resolveFinalUrl: async () => null,
        scrape: async () => ({
          diagnostics: {
            source: 'fetch',
            confidence: 'low',
            blocked: false,
            fieldsFound: ['title'],
          },
          data: {
            title: 'Scraped Title',
            price: 12,
            description: null,
            color: null,
            size: null,
            category: null,
            imageUrl: null,
          },
        }),
      },
      { populate },
      { classify },
      createUserRepo(),
      createAssertUserCan(),
      createWishlistRepo(),
      createItemRepo(),
      createConfigRepo(),
      createPageContextFetcher(),
      undefined,
      noopScrapeTelemetry
    );

    const result = await useCase.execute('https://shop.example/item', 'user-1');
    expect(result.diagnostics.aiPopulate).toBe('skipped');
    expect(result.data.title).toBe('Scraped Title');
    expect(classify).not.toHaveBeenCalled();
    expect(populate).not.toHaveBeenCalled();

    probeReachable = true;
  });
});
