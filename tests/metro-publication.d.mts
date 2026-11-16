export type DesignStation = {
  n: number;
  city: string;
  slug: string;
  station: string;
  lines?: string[] | null;
  name_en?: string | null;
  map: {
    line: string;
    at: number[];
    label?: string;
    labelOffset?: number[];
    posterLabelOffset?: number[];
  };
};

export type StationPackage = {
  n: number;
  city?: string;
  slug?: string;
  station?: string;
  date?: string;
};

export type StationPackages = {
  base: StationPackage[];
  daily: StationPackage[];
  keys: Set<string>;
};

export type PublicationSets = {
  design: DesignStation[];
  packages: StationPackages;
  published: DesignStation[];
  mapOnly: DesignStation[];
};

export const SHANGHAI_HERO_HOLDOUTS: Set<string>;

export function stationPackageKey(station: { n: number; city?: string | null }): string;

export function loadStationPackages(root?: string): StationPackages;

export function publicationSets(root?: string): PublicationSets;

export function publishedIn(sets: PublicationSets, city: string): DesignStation[];

export function newestPackage(sets: PublicationSets, city: string): StationPackage | null;

export function mapOnlyIn(sets: PublicationSets, city: string): DesignStation[];

export function heroMapPins(mapOnly: readonly DesignStation[]): DesignStation[];

export function schematicMapPin(entry: DesignStation): {
  n: number;
  slug: string;
  station: string;
  lines: string[];
  map: {
    line: string;
    at: number[];
    label?: string;
    labelOffset?: number[];
    posterLabelOffset?: number[];
  };
};
