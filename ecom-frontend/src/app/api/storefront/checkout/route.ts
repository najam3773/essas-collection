import { apiError, json, readJson } from '@/server/http';
import { optionalCustomer } from '@/server/request-auth';
import { checkout } from '@/server/shopping';

export async function POST(req: Request) {
  try {
    const customer = await optionalCustomer(req);
    const result = await checkout(await readJson(req), customer?.sub);
    return json(result.body, result.status);
  } catch (err) {
    return apiError(err);
  }
}
