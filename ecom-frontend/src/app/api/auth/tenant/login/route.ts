import { apiError, json, readJson } from '@/server/http';
import { staffLogin } from '@/server/storefront';

export async function POST(req: Request) {
  try {
    return json(await staffLogin(await readJson(req)));
  } catch (err) {
    return apiError(err);
  }
}
