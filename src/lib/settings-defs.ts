import { required, maxLen, isEmail, isUrl, isPhone, isHexColor, isRating, isCount, isOneOf } from './validate.js';

/**
 * Shared definition of the editable restaurant settings fields.
 * Used by the API (validation) and the settings admin page.
 */
export const SETTING_GROUPS: Record<string, string[]> = {
  restaurant: [
    'restaurant.name',
    'restaurant.cuisine',
    'restaurant.tagline',
    'restaurant.description',
    'restaurant.about',
  ],
  hero: ['hero.heading', 'hero.subheading', 'hero.image', 'hero.video'],
  contact: [
    'contact.phone',
    'contact.whatsapp',
    'contact.email',
    'contact.address',
    'contact.city',
    'contact.maps_url',
  ],
  ordering: ['ordering.channel', 'ordering.messenger_page'],
  social: ['social.facebook', 'social.instagram', 'social.tiktok', 'social.youtube'],
  design: ['design.primary_color', 'design.logo'],
  reviews: ['reviews.google_rating', 'reviews.google_count', 'reviews.google_url'],
};

export const ALL_SETTING_KEYS = Object.values(SETTING_GROUPS).flat();

export const SETTING_RULES: Record<string, (v: unknown) => string | null> = {
  'restaurant.name': (v) => required(v) ?? maxLen(v, 120),
  'restaurant.cuisine': (v) => required(v) ?? maxLen(v, 160),
  'restaurant.tagline': (v) => required(v) ?? maxLen(v, 200),
  'restaurant.description': (v) => required(v) ?? maxLen(v, 600),
  'restaurant.about': (v) => required(v) ?? maxLen(v, 3000),
  'hero.heading': (v) => required(v) ?? maxLen(v, 200),
  'hero.subheading': (v) => required(v) ?? maxLen(v, 600),
  'hero.image': (v) => isUrl(v, true),
  'design.logo': (v) => isUrl(v, true),
  'hero.video': (v) => isUrl(v),
  'contact.phone': (v) => required(v) ?? isPhone(v),
  'contact.whatsapp': (v) => required(v) ?? isPhone(v),
  'contact.email': (v) => required(v) ?? isEmail(v),
  'contact.address': (v) => required(v) ?? maxLen(v, 300),
  'contact.city': (v) => required(v) ?? maxLen(v, 120),
  'contact.maps_url': (v) => isUrl(v),
  'social.facebook': (v) => isUrl(v),
  'social.instagram': (v) => isUrl(v),
  'social.tiktok': (v) => isUrl(v),
  'social.youtube': (v) => isUrl(v),
  'ordering.channel': (v) => isOneOf(v, ['whatsapp', 'messenger', 'both']),
  'ordering.messenger_page': (v) => maxLen(v, 120),
  'design.primary_color': (v) => isHexColor(v),
  'reviews.google_rating': (v) => isRating(v),
  'reviews.google_count': (v) => isCount(v),
  'reviews.google_url': (v) => isUrl(v),
};

export interface SettingsPageData {
  settings: Record<string, string | null>;
  published: Record<string, string | null>;
  baseline: Record<string, string | null>;
  dirtyKeys: string[];
}
