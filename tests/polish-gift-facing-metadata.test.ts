import { describe, expect, test } from 'bun:test';
import { polishGiftFacingMetadata } from '@/modules/item/domain/polish-gift-facing-metadata.util';

describe('polishGiftFacingMetadata', () => {
  test('compacts verbose amazon titles and drops amazon.com meta descriptions', () => {
    const polished = polishGiftFacingMetadata({
      title:
        'Fosi Audio C3 Gaming DAC Amp for PC, USB Headphone Amplifier with 7.1 Surround Sound, Desktop Volume Control, Footstep Enhancement, Compatible with PS5, Switch, Laptop, Headset for FPS',
      price: 129.99,
      description:
        'Amazon.com: Fosi Audio C3 Gaming DAC Amp for PC, USB Headphone Amplifier with 7.1 Surround Sound, Desktop Volume Control, Footstep Enhancement, Compatible with PS5, Switch, Laptop, Headset for FPS : Electronics',
      color: null,
      size: null,
      category: 'tech',
      imageUrl: null,
    });

    expect(polished.title).toBe('Fosi Audio C3 Gaming DAC Amp for PC');
    expect(polished.description).toBeNull();
    expect(polished.price).toBe(129.99);
  });

  test('keeps short gift-friendly titles and descriptions', () => {
    const polished = polishGiftFacingMetadata({
      title: 'Fosi Audio C3 Gaming DAC Amp',
      price: 129.99,
      description: 'USB gaming DAC amp with StepSense footstep enhancement.',
      color: null,
      size: null,
      category: 'tech',
      imageUrl: null,
    });

    expect(polished.title).toBe('Fosi Audio C3 Gaming DAC Amp');
    expect(polished.description).toContain('StepSense');
  });
});
