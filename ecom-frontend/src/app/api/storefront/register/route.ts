import { apiError, json, readJson } from '@/server/http';
import { customerRegister } from '@/server/storefront';

export async function POST(req: Request) {
  try {
    const result = await customerRegister(await readJson(req));
    return json(result.body, result.status);
  } catch (err) {
    return apiError(err);
  }
}
