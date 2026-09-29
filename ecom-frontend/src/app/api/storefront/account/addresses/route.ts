import { apiError, json, readJson } from '@/server/http';
import { requireCustomer } from '@/server/request-auth';
import { addAddress } from '@/server/shopping';

export async function POST(req: Request) {
  try {
    const customer = await requireCustomer(req);
    const result = await addAddress(customer.sub, await readJson(req));
    return json(result.body, result.status);
  } catch (err) {
    return apiError(err);
  }
}
