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
  parentId: LocationId | null;
  tags: string[];
};

export type NPC = {
  id: NPCId;
  name: string;
  factionId: FactionId | null; // null = unaffiliated
  roles: string[];
  tier: Tier; // also used as default min respect for that NPC (tier 0..3)
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
  // Keep for compatibility / optional usage. You can ignore it if you do global tavern fallback.
  | { kind: "blockedFallbackOnly" }
  | { kind: "respectAtLeast"; factionId: FactionId; value: number };

/**
 * Concrete providers chosen from content lists.
 * (No more role queries/specs in breadcrumbs.)
 */
export type ProviderRef = { type: "npc"; id: NPCId } | { type: "item"; id: ItemId };

export type BreadcrumbOption = {
  id: BreadcrumbId;
  title: string;

  // Used by generator to pick appropriate beats
  stageTag: string;

  // What is learned / revealed at this step
  text: string;

  // Concrete providers that can deliver this breadcrumb (NPC or Item)
  providerRefs: ProviderRef[];

  requirements: Requirement[];

  // Stage tags the generator can transition to
  nextStageTags: string[];

  // Weighted pick among eligible options
  weight: number;
};

export type ContentStore = {
  version: number;
  factions: Faction[];
  locations: Location[];
  npcs: NPC[];
  items: ItemProvider[];
  breadcrumbs: BreadcrumbOption[];
};

export type RunConfig = {
  seed: number;
  chainLength: number;
  startStageTag: string;

  // Which factions exist in this run
  factionsPresent: Record<string, boolean>;

  // Runtime respect values (simulation/testing)
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

