import { apiError, json } from '@/server/http';
import { listCategories } from '@/server/storefront';

export async function GET() {
  try {
    return json(await listCategories());
  } catch (err) {
    return apiError(err);
  }
}
