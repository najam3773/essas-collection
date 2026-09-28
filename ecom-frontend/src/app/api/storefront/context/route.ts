import { apiError, json } from '@/server/http';
import { storefrontContext } from '@/server/storefront';

export async function GET() {
  try {
    return json(await storefrontContext());
  } catch (err) {
    return apiError(err);
  }
}
