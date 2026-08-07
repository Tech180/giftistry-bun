import { describe, expect, test } from 'bun:test';
import { exampleFromSchema, type JsonSchema, type OpenApiComponents } from './json-schema-example.ts';

describe('exampleFromSchema', () => {
  test('prefers example over type defaults', () => {
    expect(exampleFromSchema({ type: 'string', example: 'hello' })).toBe('hello');
  });

  test('prefers default when no example', () => {
    expect(exampleFromSchema({ type: 'integer', default: 42 })).toBe(42);
  });

  test('uses first enum value', () => {
    expect(exampleFromSchema({ type: 'string', enum: ['open', 'closed'] })).toBe('open');
  });

  test('uses const', () => {
    expect(exampleFromSchema({ const: 'fixed' })).toBe('fixed');
  });

  test('builds object with required properties', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['Giftistry'],
      properties: {
        Giftistry: {
          type: 'object',
          required: ['Auth'],
          properties: {
            Auth: {
              type: 'object',
              required: ['Username', 'Password'],
              properties: {
                Username: { type: 'string' },
                Password: { type: 'string' },
              },
            },
          },
        },
      },
    };
    expect(exampleFromSchema(schema)).toEqual({
      Giftistry: {
        Auth: {
          Username: '',
          Password: '',
        },
      },
    });
  });

  test('builds one-element array from items', () => {
    expect(exampleFromSchema({ type: 'array', items: { type: 'string', enum: ['a'] } })).toEqual([
      'a',
    ]);
  });

  test('resolves $ref via components', () => {
    const components: OpenApiComponents = {
      schemas: {
        UserId: { type: 'string', example: 'user-1' },
      },
    };
    expect(
      exampleFromSchema(
        {
          type: 'object',
          properties: { Id: { $ref: '#/components/schemas/UserId' } },
          required: ['Id'],
        },
        components
      )
    ).toEqual({ Id: 'user-1' });
  });

  test('nullable without type yields null', () => {
    expect(exampleFromSchema({ nullable: true })).toBeNull();
  });

  test('anyOf uses first branch', () => {
    expect(
      exampleFromSchema({
        anyOf: [{ type: 'string', example: 'first' }, { type: 'number' }],
      })
    ).toBe('first');
  });

  test('breaks $ref cycles', () => {
    const components: OpenApiComponents = {
      schemas: {
        Node: {
          type: 'object',
          properties: {
            child: { $ref: '#/components/schemas/Node' },
          },
          required: ['child'],
        },
      },
    };
    expect(exampleFromSchema({ $ref: '#/components/schemas/Node' }, components)).toEqual({
      child: null,
    });
  });

  test('primitive defaults', () => {
    expect(exampleFromSchema({ type: 'boolean' })).toBe(false);
    expect(exampleFromSchema({ type: 'number' })).toBe(0);
    expect(exampleFromSchema({ type: 'string' })).toBe('');
  });
});
