import { apiError, json } from '@/server/http';
import * as storefront from '@/server/storefront';

export async function GET() {
  try {
    const result = await storefront.healthOrDown();
    return json(result.body, result.status);
  } catch (err) {
    return apiError(err);
  }
}
