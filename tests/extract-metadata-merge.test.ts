import { describe, expect, mock, test } from 'bun:test';
import {
  mergeExtractedMetadata,
  shouldAiPopulate,
  shouldRunAiPopulate,
} from '../src/modules/item/infrastructure/gemini-metadata-populator';
import type { MetadataScraper } from '../src/modules/item/domain/ports/metadata-scraper.port';
import type { MetadataPopulator } from '../src/modules/item/domain/ports/metadata-populator.port';
import type { CategoryClassifier } from '../src/modules/item/domain/ports/category-classifier.port';
import type { UserRepository } from '../src/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '../src/common/application/user-policy.use-cases';

let aiEnabled = true;
let userAiEnabled = true;
let policyAllowsAi = true;

mock.module('../src/common/infrastructure/config.loader', () => ({
  loadConfig: () => ({
    aiEnabled,
    aiProvider: 'gemini',
    aiApiKey: 'test-key',
    aiModel: '',
    aiPopulatePrompt: '',
    aiCategoryPrompt: '',
    aiEndpoint: '',
  }),
}));

mock.module('../src/modules/item/infrastructure/gemini-metadata-populator', () => ({
  fetchPageContext: async () => 'Title: Test Product',
  mergeExtractedMetadata,
  shouldAiPopulate,
  shouldRunAiPopulate,
}));

const { ExtractMetadataUseCase } = await import('../src/modules/item/application/extract-metadata.use-case');

function createUserRepo(): UserRepository {
  return {
    findById: async () => ({
      Id: 'user-1',
      AiEnabled: userAiEnabled,
    }),
  } as unknown as UserRepository;
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
      classify: async () => 'clothing',
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan()
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
        return 'tech';
      },
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan()
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
        return 'tech';
      },
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan()
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
      classify: async () => 'tech',
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan()
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
      classify: async () => 'clothing',
    };

    const useCase = new ExtractMetadataUseCase(
      mockScraper,
      mockPopulator,
      mockClassifier,
      createUserRepo(),
      createAssertUserCan()
    );
    const result = await useCase.execute('https://shop.example/hoodie', 'user-1');

    expect(result.data.predefinedFields?.Color).toBe('Black');
    expect(result.data.predefinedFields?.ShirtSize).toBe('L');
    expect(result.data.userDefinedFields?.Brand).toBe('Acme');
  });
});
