# `modules/giphy`

Server-side GIPHY proxy for comment GIF search and CDN import.

## Routes

| Method | Path | Auth | Policy |
|--------|------|------|--------|
| GET | `/api/gifs/status` | Bearer | any authenticated user |
| GET | `/api/gifs/search?q=&limit=` | Bearer | `CanUseComments` |
| POST | `/api/gifs/import` | Bearer | `CanUseComments`, `CanUploadImages` |

## Configuration

- **`GiphyApiKey`** in `config.json` (owner Server settings, masked in GET `/api/settings`).
- Bootstrap: **`GIFTISTRY_GIPHY_API_KEY`** via env or credentials directory (same pattern as other secrets).

If no key is configured, search responds with `503` / `GIPHY_NOT_CONFIGURED`.

## Import safety

Import only accepts HTTPS URLs whose hostname is `giphy.com` or `*.giphy.com`. Bytes are validated as an allowed image type and capped at comment image size limits before returning a data URL.

## Attribution

Comment GIFs are powered by [GIPHY](https://giphy.com/). Follow GIPHY brand/API terms when exposing search in the product UI.
