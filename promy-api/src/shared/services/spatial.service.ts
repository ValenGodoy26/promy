import { Prisma } from "@prisma/client";
import { GeoPoint, getGeoBoundingBox } from "../utils/location";

type RawQueryable = {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
};

export type NearbyCommerceDistanceRow = {
  id: number;
  distanceKm: number;
};

export function getSpatialBoundingPolygonWkt(input: {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}) {
  return [
    "POLYGON((",
    `${input.minLongitude} ${input.minLatitude},`,
    `${input.maxLongitude} ${input.minLatitude},`,
    `${input.maxLongitude} ${input.maxLatitude},`,
    `${input.minLongitude} ${input.maxLatitude},`,
    `${input.minLongitude} ${input.minLatitude}`,
    "))",
  ].join("");
}

export async function findNearbyCommerceDistanceRows(
  db: RawQueryable,
  input: {
    origin: GeoPoint;
    radiusKm: number;
    take: number;
    skip?: number;
    categoryId?: number | null;
    cityId?: number | null;
  },
) {
  const bbox = getGeoBoundingBox(input.origin, input.radiusKm);
  const longitude = Number(input.origin.longitude);
  const latitude = Number(input.origin.latitude);
  const radiusKm = Number(input.radiusKm);
  const take = Math.max(1, Math.trunc(input.take));
  const skip = Math.max(0, Math.trunc(input.skip ?? 0));
  const boundingPolygonWkt = getSpatialBoundingPolygonWkt(bbox);
  const distanceSql = Prisma.sql`ST_Distance_Sphere(location, POINT(${longitude}, ${latitude})) / 1000`;
  const categoryFilter =
    input.categoryId != null
      ? Prisma.sql`AND categoryId = ${Math.trunc(input.categoryId)}`
      : Prisma.empty;
  const cityFilter =
    input.cityId != null ? Prisma.sql`AND cityId = ${Math.trunc(input.cityId)}` : Prisma.empty;

  return db.$queryRaw<NearbyCommerceDistanceRow[]>(Prisma.sql`
    SELECT
      id,
      ${distanceSql} AS distanceKm
    FROM Commerce FORCE INDEX (Commerce_location_spatial_idx)
    WHERE status = 'APPROVED'
      AND isHiddenByAdmin = false
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND MBRContains(ST_GeomFromText(${boundingPolygonWkt}), location)
      AND latitude BETWEEN ${bbox.minLatitude} AND ${bbox.maxLatitude}
      AND longitude BETWEEN ${bbox.minLongitude} AND ${bbox.maxLongitude}
      ${categoryFilter}
      ${cityFilter}
      AND ${distanceSql} <= ${radiusKm}
    ORDER BY distanceKm ASC, id ASC
    LIMIT ${take} OFFSET ${skip}
  `);
}
