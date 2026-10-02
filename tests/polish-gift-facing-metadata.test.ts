import { describe, expect, test } from 'bun:test';
import { polishGiftFacingMetadata } from '@/modules/item/domain/utils/polish-gift-facing-metadata.util';

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

  test('compacts mid-length comma SEO laundry under 80 chars', () => {
    const polished = polishGiftFacingMetadata({
      title:
        'UGREEN Ethernet Switch, 10-Port PoE Switch, 8 PoE+@60W + 2 Gigabit Uplink',
      price: 37.79,
      description: null,
      color: null,
      size: null,
      category: 'tech',
      imageUrl: null,
    });

    expect(polished.title).toBe('UGREEN Ethernet Switch');
  });

  test('keeps two-segment brand model color titles intact', () => {
    const polished = polishGiftFacingMetadata({
      title: 'Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue',
      price: 599,
      description: null,
      color: 'Blue',
      size: null,
      category: 'home',
      imageUrl: null,
    });

    expect(polished.title).toBe('Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue');
  });
});
