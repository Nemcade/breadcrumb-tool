export type Id = string;

export type Tab = "generate" | "providers" | "locations" | "breadcrumbs" | "data";

export type FactionId = Id;
export type NPCId = Id;
export type ItemId = Id;
export type LocationId = Id;
export type BreadcrumbId = Id;

export type LocationKind = "region" | "biome" | "settlement" | "landmark";
export type Tier = 0 | 1 | 2 | 3;

export type Faction = { id: FactionId; name: string };

export type Location = {
  id: LocationId;
  name: string;
  kind: LocationKind;

  // single-parent tree; “many children” is derived by filtering on parentId
  parentId: LocationId | null;

  // biome overlay (biomes can span areas; multi-select)
  biomeIds: LocationId[];

  // used mainly by regions; inherited if descendant has no biomeIds
  defaultBiomeId: LocationId | null;

  tags: string[];
};

export type NPC = {
  id: NPCId;
  name: string;
  factionId: FactionId | null; // null = unaffiliated
  roles: string[];
  tier: Tier;
  locationId: LocationId | null;
  notes: string;
};

export type ItemKind = "note" | "chest" | "letter" | "corpse" | "relic" | "other";

export type ItemProvider = {
  id: ItemId;
  name: string;
  kind: ItemKind;
  locationId: LocationId | null;
  notes: string;
  tags: string[];
};

export type Requirement =
  | { kind: "always" }
  | { kind: "blockedFallbackOnly" }
  | { kind: "respectAtLeast"; factionId: FactionId; value: number };

/**
 * Concrete providers chosen from content lists.
 */
export type ProviderRef = { type: "npc"; id: NPCId } | { type: "item"; id: ItemId };

export type BreadcrumbOption = {
  id: BreadcrumbId;
  title: string;
  stageTag: string;
  text: string;

  // chosen pool (one provider will be picked at runtime)
  providerRefs: ProviderRef[];

  // still in schema for now (you plan to remove from UI next)
  requirements: Requirement[];

  nextStageTags: string[];
  weight: number;

  // NEW: main path toggle (lets generator ignore side content)
  isMainJourney: boolean;
};

export type Gate =
  | { kind: "open" }
  | { kind: "key"; keyItemId: ItemId }
  | { kind: "respect"; factionId: FactionId; value: number }
  | { kind: "power"; powerId: string };

export type Connection = {
  id: Id;
  fromId: LocationId;
  toId: LocationId;
  gate: Gate;
  notes: string;
};

export type ContentStore = {
  version: number;
  factions: Faction[];
  locations: Location[];
  npcs: NPC[];
  items: ItemProvider[];
  breadcrumbs: BreadcrumbOption[];
  connections: Connection[];
};

export type RunConfig = {
  seed: number;
  chainLength: number;
  startStageTag: string;
  factionsPresent: Record<string, boolean>;
  respect: Record<string, number>;
};

export type StepProvider =
  | { type: "npc"; npcId: NPCId }
  | { type: "item"; itemId: ItemId }
  | { type: "tavernkeeper" };

export type JourneyStep = {
  idx: number;
  stageTag: string;
  optionId: BreadcrumbId;
  provider: StepProvider;
  usedFallback: boolean;
};

export type Indexes = {
  factionsById: Map<FactionId, Faction>;
  locationsById: Map<LocationId, Location>;
  npcsById: Map<NPCId, NPC>;
  itemsById: Map<ItemId, ItemProvider>;
  breadcrumbsById: Map<BreadcrumbId, BreadcrumbOption>;
};
