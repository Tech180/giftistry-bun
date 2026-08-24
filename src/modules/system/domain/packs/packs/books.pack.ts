import type { MetadataPack } from '../metadata-pack.interface';

export const BOOKS_PACK: MetadataPack = {
  id: 'books',
  label: 'Books',
  description: 'Bibliographic fields for books and reading products during URL enrich.',
  match: {
    categories: ['books', 'book', 'literature', 'reading'],
    titleKeywords: ['hardcover', 'paperback', 'isbn', 'novel', 'audiobook', 'kindle edition'],
  },
  fields: [
    { key: 'Author', label: 'Author', bucket: 'userDefined', hint: 'primary author or creator' },
    { key: 'Publisher', label: 'Publisher', bucket: 'userDefined', hint: 'publisher name when listed' },
    { key: 'Isbn', label: 'ISBN', bucket: 'userDefined', hint: 'ISBN-13 when listed' },
    {
      key: 'Binding',
      label: 'Binding',
      bucket: 'userDefined',
      hint: 'Hardcover, Paperback, Board book, etc.',
    },
    {
      key: 'Language',
      label: 'Language',
      bucket: 'userDefined',
      hint: 'when not English or explicitly listed',
    },
  ],
  promptFragment: `
Books rules:
- Title is the work title only (no author prefix). Put the author in UserDefinedFields.Author.
- Example: "Kristin Hannah The Women" → Title: "The Women", Author: "Kristin Hannah".
- Prefer bibliographic metadata over marketing blurbs.
- Omit any key that is unknown.
`.trim(),
};
