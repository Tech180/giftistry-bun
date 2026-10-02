import { describe, expect, test } from 'bun:test';
import { groundAiFields } from '../src/modules/item/domain/utils/ground-ai-fields.util';
import type { ExtractedMetadata } from '../src/modules/item/domain/interfaces/extracted-metadata.interface';

const empty: ExtractedMetadata = {
  title: '',
  price: null,
  description: null,
  color: null,
  size: null,
  category: null,
  imageUrl: null,
};

describe('groundAiFields', () => {
  test('drops color and image when absent from evidence', () => {
    const ai: ExtractedMetadata = {
      ...empty,
      title: 'Acme Widget Pro',
      color: 'Ultraviolet',
      imageUrl: 'https://cdn.evil/fake.jpg',
    };
    const evidence = 'Product Name: Acme Widget Pro\nColor: Blue';
    const { metadata, droppedFields } = groundAiFields(ai, evidence, 'Acme Widget Pro');
    expect(metadata.color).toBeNull();
    expect(metadata.imageUrl).toBeNull();
    expect(droppedFields).toContain('color');
    expect(droppedFields).toContain('imageUrl');
  });

  test('drops title when it does not overlap scraped anchors', () => {
    const ai: ExtractedMetadata = {
      ...empty,
      title: 'Totally Different Product Name',
    };
    const { metadata, droppedFields } = groundAiFields(
      ai,
      'Page Title: Sony WH-1000XM5',
      'Sony WH-1000XM5'
    );
    expect(metadata.title).toBe('');
    expect(droppedFields).toContain('title');
  });

  test('drops a description that echoes prompt wording instead of the product', () => {
    const ai: ExtractedMetadata = {
      ...empty,
      title: 'Toshiba 14TB MG07 Refurbished HDD',
      description: 'A beginner craft kit for needle felting.',
    };
    const evidence =
      'Product Name: Toshiba 14TB MG07 MG07ACA14TEY SATA 3.5in Refurbished HDD\nCapacity: 14TB';
    const { metadata, droppedFields } = groundAiFields(
      ai,
      evidence,
      'Toshiba 14TB MG07 MG07ACA14TEY SATA 3.5in Refurbished HDD'
    );
    expect(metadata.description).toBeNull();
    expect(droppedFields).toContain('description');
  });

  test('keeps a description that shares product words with the evidence', () => {
    const ai: ExtractedMetadata = {
      ...empty,
      title: 'Toshiba 14TB MG07 Refurbished HDD',
      description: 'Refurbished 14TB enterprise hard drive with a SATA interface.',
    };
    const evidence = 'Product Name: Toshiba 14TB MG07 SATA 3.5in Refurbished HDD';
    const { metadata, droppedFields } = groundAiFields(ai, evidence, 'Toshiba 14TB MG07 HDD');
    expect(metadata.description).toBe('Refurbished 14TB enterprise hard drive with a SATA interface.');
    expect(droppedFields).not.toContain('description');
  });

  test('keeps grounded brand and model fields', () => {
    const ai: ExtractedMetadata = {
      ...empty,
      title: 'Acme Widget',
      userDefinedFields: { Brand: 'Acme' },
      predefinedFields: { ModelNumber: 'W-1' },
    };
    const evidence = 'Brand: Acme\nModelNumber: W-1\nProduct Name: Acme Widget';
    const { metadata, droppedFields } = groundAiFields(ai, evidence, 'Acme Widget');
    expect(metadata.userDefinedFields?.Brand).toBe('Acme');
    expect(metadata.predefinedFields?.ModelNumber).toBe('W-1');
    expect(droppedFields).toHaveLength(0);
  });
});
