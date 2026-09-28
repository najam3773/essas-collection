import { apiError, json } from '@/server/http';
import { storefrontSettings } from '@/server/storefront';

export async function GET() {
  try {
    return json(await storefrontSettings());
  } catch (err) {
    return apiError(err);
  }
}
