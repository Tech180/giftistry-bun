export const AMAZON_BUY_BOX_SELECTORS = [
  '#corePrice_feature_div .a-price .a-offscreen',
  '#apex_desktop .a-price .a-offscreen',
  '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
] as const;

export const AMAZON_PRICE_EXCLUDE_CONTAINERS =
  '#sims-consolidated-2_feature_div, #similarities_feature_div, #sp_detail, .a-carousel, #rhf';
