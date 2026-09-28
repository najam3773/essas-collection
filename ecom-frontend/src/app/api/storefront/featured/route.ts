import { apiError, json } from '@/server/http';
import { featuredProducts } from '@/server/storefront';

export async function GET() {
  try {
    return json(await featuredProducts());
  } catch (err) {
    return apiError(err);
  }
}
