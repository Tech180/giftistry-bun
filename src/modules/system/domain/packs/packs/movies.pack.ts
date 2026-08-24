import type { MetadataPack } from '../metadata-pack.interface';

export const MOVIES_PACK: MetadataPack = {
  id: 'movies',
  label: 'Movies',
  description: 'Edition and media fields for films, TV, and physical/digital video.',
  match: {
    categories: [
      'movies',
      'movie',
      'films',
      'film',
      'entertainment',
      'hobbies_entertainment',
      'tv',
      'video',
    ],
    titleKeywords: ['blu-ray', 'bluray', '4k uhd', 'uhd', 'dvd', 'steelbook', 'digital hd'],
  },
  fields: [
    {
      key: 'Format',
      label: 'Format',
      bucket: 'userDefined',
      hint: 'e.g. 4K UHD, Blu-ray, DVD',
    },
    { key: 'Runtime', label: 'Runtime', bucket: 'userDefined', hint: 'e.g. 102 min' },
    { key: 'Genre', label: 'Genre', bucket: 'userDefined', hint: 'primary genre when listed' },
    { key: 'Rating', label: 'Rating', bucket: 'userDefined', hint: 'MPAA or age rating when listed' },
    {
      key: 'ReleaseYear',
      label: 'Release year',
      bucket: 'userDefined',
      hint: 'four-digit year when listed',
    },
  ],
  promptFragment: `
Movies rules:
- Title is the work title only.
- Studio or distributor prefixes (e.g. Disney) go in UserDefinedFields.Brand.
- Edition and format tokens (4K, UHD, Blu-ray, DVD) go in UserDefinedFields.Format — never leave them in Title.
- Example: "Disney Encanto 4K UHD" → Title: "Encanto", Brand: "Disney", Format: "4K UHD".
- Omit any key that is unknown.
`.trim(),
};
