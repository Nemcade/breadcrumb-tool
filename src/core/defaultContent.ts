import type { ContentStore, Faction, Location, NPC, BreadcrumbOption, ItemProvider } from "../core/types";


export function defaultContent(): ContentStore {
  // --- Factions ---
  const bastion: Faction = { id: "bastion", name: "Bastion Court" };
  const root: Faction = { id: "root", name: "Root-Cairn Clans" };
  const pipe: Faction = { id: "pipe", name: "Pipewright Union" };
  const umbral: Faction = { id: "umbral", name: "Umbral Choir" };
  const astral: Faction = { id: "astral", name: "Astral Hoard" };

  // --- Locations (simple hierarchy) ---
  const loc: Location[] = [
    // Regions
    { id: "reg_surface", name: "Surface", kind: "region", parentId: null, tags: ["surface"] },
    { id: "reg_mid", name: "Mid-Depth", kind: "region", parentId: null, tags: ["mid"] },
    { id: "reg_depths", name: "Depths", kind: "region", parentId: null, tags: ["deep"] },

    // Settlements / hubs
    { id: "set_gate", name: "Gate Settlement", kind: "settlement", parentId: "reg_surface", tags: ["hub", "bastion"] },
    { id: "set_pipeyard", name: "Pipeyard", kind: "settlement", parentId: "reg_mid", tags: ["hub", "pipe"] },
    { id: "set_rootden", name: "Rootden", kind: "settlement", parentId: "reg_mid", tags: ["hub", "root"] },

    // Landmarks inside Gate Settlement
    { id: "lm_tavern", name: "The Bent Lantern (Tavern)", kind: "landmark", parentId: "set_gate", tags: ["tavern"] },
    { id: "lm_barracks", name: "Bastion Barracks", kind: "landmark", parentId: "set_gate", tags: ["bastion", "guard"] },
    { id: "lm_graahl_gate", name: "Graahl Seal-Door", kind: "landmark", parentId: "set_gate", tags: ["gate", "locked"] },

    // Landmarks elsewhere
    { id: "lm_pipe_valves", name: "Valve-Rack Gallery", kind: "landmark", parentId: "set_pipeyard", tags: ["pipe", "machinery"] },
    { id: "lm_root_trapline", name: "Trapline Hollows", kind: "landmark", parentId: "set_rootden", tags: ["root", "traps"] },
    { id: "lm_crypt_choir", name: "Choir Crypt", kind: "landmark", parentId: "reg_depths", tags: ["umbral", "ritual"] },
    { id: "lm_astral_niche", name: "Astral Niche", kind: "landmark", parentId: "reg_depths", tags: ["astral", "hidden"] },
  ];

  // --- NPCs ---
  const npcs: NPC[] = [
    // Global fallback NPC (tavernkeeper)
    {
      id: "npc_innkeep",
      name: "Innkeep Salla",
      factionId: null,
      roles: ["tavernkeeper", "rumormonger"],
      tier: 0,
      locationId: "lm_tavern",
      notes: "Knows what people whisper. Works as global fallback provider.",
    },

    // Bastion
    {
      id: "npc_chief_bastion",
      name: "Captain Vell",
      factionId: bastion.id,
      roles: ["chieftain", "officer"],
      tier: 1,
      locationId: "lm_barracks",
      notes: "Keeps discipline. Will trade access for proof of usefulness.",
    },
    {
      id: "npc_bastion_scribe",
      name: "Scribe Orin",
      factionId: bastion.id,
      roles: ["scribe", "clerk"],
      tier: 0,
      locationId: "set_gate",
      notes: "Knows records and names. Talks more if you’re not a threat.",
    },

    // Root
    {
      id: "npc_root_scout",
      name: "Rusk of the Roots",
      factionId: root.id,
      roles: ["scout", "trapper"],
      tier: 1,
      locationId: "lm_root_trapline",
      notes: "Reads spoor like scripture. Hates Bastion patrols.",
    },

    // Pipewright
    {
      id: "npc_pipe_mechanic",
      name: "Mivvi Brass-Ear",
      factionId: pipe.id,
      roles: ["mechanic", "merchant"],
      tier: 1,
      locationId: "set_pipeyard",
      notes: "Sells passage and fixes what others fear to touch.",
    },

    // Umbral
    {
      id: "npc_umbral_acolyte",
      name: "Hush-Acolyte Ilen",
      factionId: umbral.id,
      roles: ["acolyte", "cultist"],
      tier: 2,
      locationId: "lm_crypt_choir",
      notes: "Deals in vows and soft threats. Doesn’t bargain cheaply.",
    },

    // Astral
    {
      id: "npc_astral_seer",
      name: "Seer Koria",
      factionId: astral.id,
      roles: ["seer", "sage"],
      tier: 2,
      locationId: "lm_astral_niche",
      notes: "Speaks in short, accurate statements. Hoards forgotten names.",
    },
  ];

  // --- Items (these are your place-anchored providers: notes, chests, etc.) ---
  const items: ItemProvider[] = [
    {
      id: "item_barracks_chest_key",
      name: "Barracks Chest (Key stash)",
      kind: "chest",
      locationId: "lm_barracks",
      notes: "A battered lockbox used during shift-changes. Good heist target.",
      tags: ["key", "bastion"],
    },
    {
      id: "item_note_graahl_scratch",
      name: "Damp Note: 'Graahl mark'",
      kind: "note",
      locationId: "lm_graahl_gate",
      notes: "A scrap naming a Pipewright who escorted someone below.",
      tags: ["graahl", "clue"],
    },
    {
      id: "item_valve_ledger",
      name: "Valve Ledger Page",
      kind: "letter",
      locationId: "lm_pipe_valves",
      notes: "A torn ledger page listing valve sequences and a witness name.",
      tags: ["pipe", "clue"],
    },
    {
      id: "item_root_totem_shard",
      name: "Totem Shard",
      kind: "relic",
      locationId: "lm_root_trapline",
      notes: "A broken charm. Someone used it to bargain for safe passage.",
      tags: ["root", "clue"],
    },
    {
      id: "item_crypt_prayer_strip",
      name: "Prayer Strip (stained)",
      kind: "note",
      locationId: "lm_crypt_choir",
      notes: "A ritual strip with a name repeated. The ink feels wrong.",
      tags: ["umbral", "clue"],
    },
  ];

  // --- Breadcrumb options (beats). Each beat picks concrete providers from NPCs/Items ---
  const breadcrumbs: BreadcrumbOption[] = [
    // START
    {
      id: "bc_start_rumor_graahl",
      title: "Rumor: he argued about Graahl",
      stageTag: "Start",
      text: "At the Gate Settlement, someone remembers your brother arguing about a sealed door called Graahl.",
      providerRefs: [
        { type: "npc", id: "npc_innkeep" },
        { type: "npc", id: "npc_bastion_scribe" },
      ],
      requirements: [],
      nextStageTags: ["GraahlLocked"],
      weight: 3,
    },

    // GRAAHL LOCKED
    {
      id: "bc_graahl_locked_key_where",
      title: "Graahl is locked: where the key is kept",
      stageTag: "GraahlLocked",
      text: "Graahl is sealed. Either earn permission, steal the key, or take it from someone who carries it.",
      providerRefs: [
        { type: "npc", id: "npc_chief_bastion" },
        { type: "item", id: "item_barracks_chest_key" },
      ],
      requirements: [],
      nextStageTags: ["GetKey"],
      weight: 3,
    },

    // GET KEY (respect route)
    {
      id: "bc_get_key_permission",
      title: "Permission route: prove yourself to Bastion",
      stageTag: "GetKey",
      text: "Captain Vell will give you access if you do something that harms a rival’s hold nearby.",
      providerRefs: [{ type: "npc", id: "npc_chief_bastion" }],
      requirements: [{ kind: "respectAtLeast", factionId: "bastion", value: 1 }],
      nextStageTags: ["EnterGraahl"],
      weight: 2,
    },

    // GET KEY (heist route)
    {
      id: "bc_get_key_heist",
      title: "Heist route: the chest can be cracked",
      stageTag: "GetKey",
      text: "A lockbox in the barracks is the weak point. If you can get it open, you don’t need permission.",
      providerRefs: [{ type: "item", id: "item_barracks_chest_key" }],
      requirements: [{ kind: "always" }],
      nextStageTags: ["EnterGraahl"],
      weight: 2,
    },

    // ENTER GRAAHL
    {
      id: "bc_enter_graahl_note",
      title: "Inside Graahl: a mark and a name",
      stageTag: "EnterGraahl",
      text: "Beyond the seal, a damp note links your brother to a Pipewright guide and a valve-rack route.",
      providerRefs: [{ type: "item", id: "item_note_graahl_scratch" }],
      requirements: [{ kind: "always" }],
      nextStageTags: ["PipeLead"],
      weight: 3,
    },

    // PIPE LEAD
    {
      id: "bc_pipe_lead_mechanic",
      title: "Pipewright mechanic confirms the route",
      stageTag: "PipeLead",
      text: "A Pipewright admits your brother traded a relic for passage through the pipe-networks.",
      providerRefs: [
        { type: "npc", id: "npc_pipe_mechanic" },
        { type: "item", id: "item_valve_ledger" },
      ],
      requirements: [{ kind: "respectAtLeast", factionId: "pipe", value: 1 }],
      nextStageTags: ["DeeperRoute"],
      weight: 3,
    },

    // DEEPER ROUTE
    {
      id: "bc_deeper_route_root_trade",
      title: "Root-Cairn traded him safe passage",
      stageTag: "DeeperRoute",
      text: "The Root-Cairn claim he passed their traplines after paying in charms and promises.",
      providerRefs: [
        { type: "npc", id: "npc_root_scout" },
        { type: "item", id: "item_root_totem_shard" },
      ],
      requirements: [{ kind: "always" }],
      nextStageTags: ["UmbralWhisper", "AstralWhisper"],
      weight: 2,
    },

    // UMBRAL
    {
      id: "bc_umbral_whisper",
      title: "Umbral whisper: Choir Crypt knows his name",
      stageTag: "UmbralWhisper",
      text: "Deep below, the Choir Crypt repeats your brother’s name as if it were a prayer. Someone there can tell you why.",
      providerRefs: [
        { type: "npc", id: "npc_umbral_acolyte" },
        { type: "item", id: "item_crypt_prayer_strip" },
      ],
      requirements: [{ kind: "respectAtLeast", factionId: "umbral", value: 2 }],
      nextStageTags: ["FinalTrail"],
      weight: 2,
    },

    // ASTRAL
    {
      id: "bc_astral_whisper",
      title: "Astral whisper: a seer hoards the last clue",
      stageTag: "AstralWhisper",
      text: "In a hidden niche, an Astral seer keeps a ledger of ‘those who fell inward’. Your brother is written there.",
      providerRefs: [{ type: "npc", id: "npc_astral_seer" }],
      requirements: [{ kind: "respectAtLeast", factionId: "astral", value: 2 }],
      nextStageTags: ["FinalTrail"],
      weight: 2,
    },

    // FINAL (not literally brother yet; just the last breadcrumb beat in this sample)
    {
      id: "bc_final_trail",
      title: "Final trail: the last region lies ahead",
      stageTag: "FinalTrail",
      text: "The trail narrows. The last witness points toward the furthest regions where the world feels older and less forgiving.",
      providerRefs: [{ type: "npc", id: "npc_innkeep" }],
      requirements: [{ kind: "always" }],
      nextStageTags: [],
      weight: 1,
    },
  ];

  return {
    version: 2,
    factions: [bastion, root, pipe, umbral, astral],
    locations: loc,
    npcs,
    items,
    breadcrumbs,
  };
}
