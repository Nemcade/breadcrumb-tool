import type { ContentStore, Connection, Faction, Location, NPC, BreadcrumbOption, ItemProvider, ProviderBeat } from "../core/types";


function beat(id: string, kind: ProviderBeat["kind"], mood: ProviderBeat["mood"], text: string, weight = 1, respectDelta = 0): ProviderBeat {
  return { id, kind, mood, text, weight, respectDelta };
}

export function defaultContent(): ContentStore {
  const bastion: Faction = { id: "bastion", name: "Bastion Court" };
  const root: Faction = { id: "root", name: "Root-Cairn Clans" };
  const pipe: Faction = { id: "pipe", name: "Pipewright Union" };
  const umbral: Faction = { id: "umbral", name: "Umbral Choir" };
  const astral: Faction = { id: "astral", name: "Astral Hoard" };

  const locations: Location[] = [
    // Regions
    { id: "reg_surface", name: "Surface", kind: "region", parentId: null, biomeIds: [], defaultBiomeId: null, tags: ["surface"] },
    { id: "reg_mid", name: "Mid-Depth", kind: "region", parentId: null, biomeIds: [], defaultBiomeId: null, tags: ["mid"] },
    { id: "reg_depths", name: "Depths", kind: "region", parentId: null, biomeIds: [], defaultBiomeId: null, tags: ["deep"] },

    // Settlements / hubs
    { id: "set_gate", name: "Gate Settlement", kind: "settlement", parentId: "reg_surface", biomeIds: [], defaultBiomeId: null, tags: ["hub", "bastion"] },
    { id: "set_pipeyard", name: "Pipeyard", kind: "settlement", parentId: "reg_mid", biomeIds: [], defaultBiomeId: null, tags: ["hub", "pipe"] },
    { id: "set_rootden", name: "Rootden", kind: "settlement", parentId: "reg_mid", biomeIds: [], defaultBiomeId: null, tags: ["hub", "root"] },

    // Landmarks
    { id: "lm_tavern", name: "The Bent Lantern (Tavern)", kind: "landmark", parentId: "set_gate", biomeIds: [], defaultBiomeId: null, tags: ["tavern"] },
    { id: "lm_barracks", name: "Bastion Barracks", kind: "landmark", parentId: "set_gate", biomeIds: [], defaultBiomeId: null, tags: ["bastion", "guard"] },
    { id: "lm_graahl_gate", name: "Graahl Seal-Door", kind: "landmark", parentId: "set_gate", biomeIds: [], defaultBiomeId: null, tags: ["gate", "locked"] },

    { id: "lm_pipe_valves", name: "Valve-Rack Gallery", kind: "landmark", parentId: "set_pipeyard", biomeIds: [], defaultBiomeId: null, tags: ["pipe", "machinery"] },
    { id: "lm_root_trapline", name: "Trapline Hollows", kind: "landmark", parentId: "set_rootden", biomeIds: [], defaultBiomeId: null, tags: ["root", "traps"] },
    { id: "lm_crypt_choir", name: "Choir Crypt", kind: "landmark", parentId: "reg_depths", biomeIds: [], defaultBiomeId: null, tags: ["umbral", "ritual"] },
    { id: "lm_astral_niche", name: "Astral Niche", kind: "landmark", parentId: "reg_depths", biomeIds: [], defaultBiomeId: null, tags: ["astral", "hidden"] },
  ];

  const npcs: NPC[] = [
    {
      id: "npc_innkeep",
      name: "Bent Lantern Keeper",
      factionId: null,
      roles: ["tavernkeeper"],
      tier: 0,
      locationId: "lm_tavern",
      notes: "Fallback tavernkeeper.",
      brotherBeats: [
        beat(
          "bb_innkeep_witness",
          "witness",
          "neutral",
          "I saw him — loud laugh, fast hands. He kept saying {nextProvider} might know more, down in {nextLocation}.",
          2,
          0
        ),
      ],
    },
    {
      id: "npc_bastion_captain",
      name: "Captain Brann",
      factionId: "bastion",
      roles: ["guard", "captain"],
      tier: 2,
      locationId: "lm_barracks",
      notes: "A hard gatekeeper with rules.",
      brotherBeats: [
        beat(
          "bb_brann_fight",
          "fight",
          "hostile",
          "Your brother tested my patrol in the alley and vanished laughing. If you want the same answers, find {nextProvider} near {nextLocation}.",
          2,
          -1
        ),
        beat(
          "bb_brann_witness",
          "witness",
          "neutral",
          "He asked after the seal-door. Said the name ‘{nextProvider}’. Then he headed for {nextLocation}.",
          1,
          0
        ),
      ],
    },
    {
      id: "npc_pipe_mechanic",
      name: "Vessa Valvehand",
      factionId: "pipe",
      roles: ["mechanic", "tinkerer"],
      tier: 1,
      locationId: "lm_pipe_valves",
      notes: "Keeps the pipes singing.",
      brotherBeats: [
        beat(
          "bb_vessa_trade",
          "trade",
          "friendly",
          "He traded me a coil of old wire for directions. Said {nextProvider} in {nextLocation} was ‘worth the trouble’.",
          2,
          +1
        ),
      ],
    },
    {
      id: "npc_root_hunter",
      name: "Celia Trapbriar",
      factionId: "root",
      roles: ["hunter"],
      tier: 1,
      locationId: "lm_root_trapline",
      notes: "Knows beasts and borders.",
      brotherBeats: [
        beat(
          "bb_celia_witness",
          "witness",
          "neutral",
          "He came through my trapline like he owned it. If you’re chasing him, start with {nextProvider} at {nextLocation}.",
          2,
          0
        ),
        beat(
          "bb_celia_party",
          "party",
          "friendly",
          "We drank sap-wine and he told stories. In the morning he left toward {nextLocation} — looking for {nextProvider}.",
          1,
          +1
        ),
      ],
    },
    {
      id: "npc_umbral_acolyte",
      name: "Choir Acolyte",
      factionId: "umbral",
      roles: ["cultist"],
      tier: 2,
      locationId: "lm_crypt_choir",
      notes: "Whispers in the dark.",
      brotherBeats: [
        beat(
          "bb_umbral_letter",
          "letter",
          "mysterious",
          "He left a folded scrap. Only one name on it: {nextProvider}. Find them in {nextLocation}.",
          2,
          0
        ),
      ],
    },
    {
      id: "npc_astral_sage",
      name: "Astral Sage",
      factionId: "astral",
      roles: ["sage"],
      tier: 3,
      locationId: "lm_astral_niche",
      notes: "Hoarder of strange knowing.",
      brotherBeats: [
        beat(
          "bb_astral_witness",
          "witness",
          "mysterious",
          "He listened more than he spoke. Before leaving, he asked for {nextProvider} and vanished toward {nextLocation}.",
          2,
          0
        ),
      ],
    },
  ];

  const items: ItemProvider[] = [
    {
      id: "item_graahl_note",
      name: "Smeared Note (Graahl)",
      kind: "note",
      locationId: "lm_graahl_gate",
      notes: "A note jammed near the seal-door.",
      tags: ["graahl", "clue"],
      brotherBeats: [
        beat(
          "bb_note_witness",
          "letter",
          "neutral",
          "The note mentions {nextProvider} and a meeting in {nextLocation}.",
          1,
          0
        ),
      ],
    },
  ];

  const breadcrumbs: BreadcrumbOption[] = [
    {
      id: "bc_start",
      title: "Starting Rumor",
      stageTag: "Start",
      text: "",
      providerRefs: [{ type: "npc", id: "npc_innkeep" }],
      requirements: [],
      nextStageTags: ["GraahlGate"],
      weight: 3,
      isMainJourney: true,
    },
    {
      id: "bc_graahl_gate",
      title: "Graahl Seal-Door",
      stageTag: "GraahlGate",
      text: "",
      providerRefs: [
        { type: "npc", id: "npc_bastion_captain" },
        { type: "item", id: "item_graahl_note" },
      ],
      requirements: [],
      nextStageTags: ["PipeLead", "RootLead"],
      weight: 3,
      isMainJourney: true,
    },
    {
      id: "bc_pipe_lead",
      title: "Pipewright Lead",
      stageTag: "PipeLead",
      text: "",
      providerRefs: [{ type: "npc", id: "npc_pipe_mechanic" }],
      requirements: [],
      nextStageTags: ["Deeper", "UmbralLead"],
      weight: 3,
      isMainJourney: true,
    },
    {
      id: "bc_root_lead",
      title: "Root-Cairn Lead",
      stageTag: "RootLead",
      text: "",
      providerRefs: [{ type: "npc", id: "npc_root_hunter" }],
      requirements: [],
      nextStageTags: ["Deeper"],
      weight: 3,
      isMainJourney: true,
    },
    {
      id: "bc_umbral_whisper",
      title: "Umbral Whisper",
      stageTag: "UmbralLead",
      text: "",
      providerRefs: [{ type: "npc", id: "npc_umbral_acolyte" }],
      requirements: [],
      nextStageTags: ["Deeper"],
      weight: 2,
      isMainJourney: true,
    },
    {
      id: "bc_deeper",
      title: "Downward Trail",
      stageTag: "Deeper",
      text: "",
      providerRefs: [{ type: "npc", id: "npc_astral_sage" }],
      requirements: [],
      nextStageTags: ["BrotherFound"],
      weight: 2,
      isMainJourney: true,
    },
    {
      id: "bc_brother_found",
      title: "Brother Found",
      stageTag: "BrotherFound",
      text: "You finally catch up — the trail ends here.",
      providerRefs: [{ type: "npc", id: "npc_astral_sage" }],
      requirements: [],
      nextStageTags: [],
      weight: 1,
      isMainJourney: true,
    },
  ];

 const connections: Connection[] = [];

  return {
    version: 3,
    factions: [bastion, root, pipe, umbral, astral],
    locations,
    npcs,
    items,
    breadcrumbs,
    connections,
  };
}
