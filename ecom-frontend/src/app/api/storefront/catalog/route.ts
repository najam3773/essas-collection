import { apiError, json } from '@/server/http';
import { catalog } from '@/server/storefront';

export async function GET(req: Request) {
  try {
    return json(await catalog(new URL(req.url)));
  } catch (err) {
    return apiError(err);
  }
}
