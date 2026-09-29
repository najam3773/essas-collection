import { z } from 'zod';

export const STORE_COUNTRY = 'Pakistan';

const optionalBlank = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === 'string' ? v.trim() : ''));

export const storefrontAddressSchema = z.object({
  line1: z.string().trim().min(1),
  line2: z.string().optional(),
  city: z.string().trim().min(1),
  state: z.string().optional(),
  postalCode: optionalBlank,
  country: optionalBlank.transform(() => STORE_COUNTRY),
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});
