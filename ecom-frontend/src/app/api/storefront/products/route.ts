import { apiError, json } from '@/server/http';
import { listProducts } from '@/server/storefront';

export async function GET(req: Request) {
  try {
    return json(await listProducts(new URL(req.url)));
  } catch (err) {
    return apiError(err);
  }
}
