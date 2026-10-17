/* SceneAtlas records. Shaped like the planned Supabase tables (places, location_claims, claim_sources) so the
   prototype, the Wikidata baseline and the database all hand the interface the same thing. */
export type Precision = 'exact' | 'site' | 'city' | 'region' | 'country';
export type LocationKind = 'on_location' | 'studio' | 'backlot' | 'unknown';
export type Status = 'verified' | 'sourced' | 'community' | 'candidate';
export interface Source { title: string; url: string; publisher?: string; quote?: string; method: 'wikidata' | 'wikipedia' | 'web'; retrievedAt: string }
export interface LocationImage { url: string; license: string; author: string; sourceUrl: string; caption?: string }
export interface AtlasLocation {
  id: string; tmdbId: number | null;
  name: string; country?: string; region?: string;
  lat: number; lng: number; precision: Precision; kind: LocationKind;
  scene?: string | null; behindTheScenes?: string | null;
  status: Status; lastVerified?: string; sources: Source[];
  image?: LocationImage | null; accessibility?: string | null; notes?: string | null;
  /* Prototype only: a marker that shows how the globe works and makes no claim about any film. */
  sample?: boolean;
}
export interface AtlasFilm { id: number; title: string; year?: number; posterPath: string | null }

export const STATUS_LABEL: Record<Status, string> = {
  verified: 'Verified', sourced: 'Sourced on Wikidata', community: 'Listed on Wikidata', candidate: 'Unconfirmed',
};
export const STATUS_NOTE: Record<Status, string> = {
  verified: 'A source we checked says, in its own words, that filming happened here.',
  sourced: 'Recorded on Wikidata with a reference.',
  community: 'Recorded on Wikidata without a reference. Treat with some caution.',
  candidate: 'Suggested but not confirmed by a checked source.',
};
export const PRECISION_LABEL: Record<Precision, string> = {
  exact: 'Exact place', site: 'Site', city: 'Approximate: city', region: 'Approximate: region', country: 'Approximate: country',
};
export const KIND_LABEL: Record<LocationKind, string> = { on_location: 'On location', studio: 'Studio', backlot: 'Backlot', unknown: 'Filming location' };
export const isApproximate = (l: Pick<AtlasLocation, 'precision'>) => l.precision === 'city' || l.precision === 'region' || l.precision === 'country';

/* Sample markers for the prototype, at city centres. They are labelled as samples everywhere they appear and
   carry no film, scene or source. They disappear as soon as a film is chosen. */
const sample = (id: string, name: string, country: string, lat: number, lng: number): AtlasLocation => ({
  id: `sample-${id}`, tmdbId: null, name, country, lat, lng, precision: 'city', kind: 'unknown', status: 'candidate', sources: [], sample: true,
});
export const SAMPLE_LOCATIONS: AtlasLocation[] = [
  sample('london', 'London', 'United Kingdom', 51.5074, -0.1278),
  sample('reykjavik', 'Reykjavík', 'Iceland', 64.1466, -21.9426),
  sample('marrakesh', 'Marrakesh', 'Morocco', 31.6295, -7.9811),
  sample('kyoto', 'Kyoto', 'Japan', 35.0116, 135.7681),
  sample('wellington', 'Wellington', 'New Zealand', -41.2865, 174.7762),
  sample('newyork', 'New York City', 'United States', 40.7128, -74.006),
  sample('mexicocity', 'Mexico City', 'Mexico', 19.4326, -99.1332),
];
