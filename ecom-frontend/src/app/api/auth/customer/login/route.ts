import { apiError, json, readJson } from '@/server/http';
import { customerLogin } from '@/server/storefront';

export async function POST(req: Request) {
  try {
    return json(await customerLogin(await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
