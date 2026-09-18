import { describe, expect, test } from 'bun:test';
import { promoteProseCustomFieldsToDescription } from '@/modules/item/domain/promote-prose-custom-fields-to-description.util';
import {
  collectSpecValues,
  sanitizeProductDescription,
} from '@/modules/item/domain/sanitize-product-description.util';
import { parsePopulateJsonForTests } from '@/modules/item/infrastructure/gemini-metadata-populator';

describe('promoteProseCustomFieldsToDescription', () => {
  test('promotes Note into Description when Description is empty', () => {
    const result = promoteProseCustomFieldsToDescription({
      title: 'Fosi Audio C3',
      price: 129.99,
      description: null,
      color: null,
      size: null,
      category: null,
      imageUrl: null,
      predefinedFields: {},
      userDefinedFields: {
        Brand: 'Fosi Audio',
        Note: 'USB gaming DAC amp with StepSense footstep enhancement and 7.1 surround.',
      },
    });

    expect(result.description).toContain('StepSense');
    expect(result.userDefinedFields?.Note).toBeUndefined();
    expect(result.userDefinedFields?.Brand).toBe('Fosi Audio');
  });

  test('drops duplicate Note when Description already exists', () => {
    const result = promoteProseCustomFieldsToDescription({
      title: 'Fosi Audio C3',
      price: null,
      description: 'Short product description about the DAC amp.',
      color: null,
      size: null,
      category: null,
      imageUrl: null,
      userDefinedFields: {
        Note: 'Duplicate prose that should not stay as a custom field.',
      },
    });

    expect(result.description).toContain('Short product description');
    expect(result.userDefinedFields?.Note).toBeUndefined();
  });

  test('promotes long Features prose when Description is empty', () => {
    const result = promoteProseCustomFieldsToDescription({
      title: 'C3',
      price: null,
      description: null,
      color: null,
      size: null,
      category: null,
      imageUrl: null,
      userDefinedFields: {
        Features:
          'StepSense footstep radar with 7.1 surround sound for competitive FPS gaming on PC and consoles.',
      },
    });

    expect(result.description).toContain('StepSense');
    expect(result.userDefinedFields?.Features).toBeUndefined();
  });
});

describe('sanitizeProductDescription spec keys', () => {
  test('does not treat Note/Features values as specs that wipe Description', () => {
    const description =
      'USB gaming DAC amp with StepSense footstep enhancement and 7.1 surround sound.';
    const cleaned = sanitizeProductDescription(description, {
      userDefinedFields: {
        Brand: 'Fosi Audio',
        Note: description,
        Features: 'StepSense footstep enhancement and 7.1 surround sound',
      },
    });

    expect(cleaned).toBe(description);
  });

  test('still strips real RAM/storage specs from Description', () => {
    const cleaned = sanitizeProductDescription(
      'Compact 2-in-1 device with 8GB RAM and 256GB storage for on-the-go productivity.',
      {
        userDefinedFields: { RAM: '8GB' },
        predefinedFields: { StorageCapacity: '256GB' },
      }
    );

    expect(cleaned).not.toContain('8GB');
    expect(cleaned).not.toContain('256GB');
  });

  test('collectSpecValues ignores prose custom fields', () => {
    const specs = collectSpecValues({
      predefinedFields: { Color: 'Black', Note: 'A long product blurb that is not a spec.' },
      userDefinedFields: { Brand: 'Fosi Audio', Features: 'Lots of marketing copy here.', RAM: '8GB' },
    });

    expect(specs).toContain('Black');
    expect(specs).toContain('8GB');
    expect(specs).not.toContain('Fosi Audio');
    expect(specs).not.toContain('A long product blurb that is not a spec.');
    expect(specs).not.toContain('Lots of marketing copy here.');
  });
});

describe('parsePopulateJsonForTests', () => {
  test('moves Note into Description and keeps Brand', () => {
    const parsed = parsePopulateJsonForTests(
      JSON.stringify({
        Title: 'Fosi Audio C3 Gaming DAC Amp',
        Price: 129.99,
        Description: null,
        PredefinedFields: {},
        UserDefinedFields: {
          Brand: 'Fosi Audio',
          Note: 'USB gaming DAC amp with StepSense and 7.1 surround for FPS play.',
        },
      })
    );

    expect(parsed.title).toBe('Fosi Audio C3 Gaming DAC Amp');
    expect(parsed.description).toContain('StepSense');
    expect(parsed.userDefinedFields?.Brand).toBe('Fosi Audio');
    expect(parsed.userDefinedFields?.Note).toBeUndefined();
  });
});
