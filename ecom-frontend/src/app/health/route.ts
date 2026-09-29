export const dynamic = 'force-static';

/** Public liveness for Deplexo. No DB, Prisma, Cloudinary, or Express. */
export function GET() {
  return Response.json({ ok: true, service: 'essas-collection' });
}
