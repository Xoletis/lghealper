/**
 * 'village' and 'loups' are the two sides of the main conflict (see MainTeam).
 * 'neutre' roles sit outside it entirely: they never count towards either side's
 * win/loss, and instead pursue their own objective (see NeutralObjective).
 * 'solitaire' roles also sit outside the main conflict, but pursue a much harsher
 * objective: being the LAST player alive, period (see resolveGame in engine.ts).
 */
export type Team = 'village' | 'loups' | 'neutre' | 'solitaire'

/** Display order and labels shared by every screen that groups roles by team (compendium, role setup). */
export const TEAM_ORDER: Team[] = ['village', 'loups', 'neutre', 'solitaire']

export const TEAM_LABELS: Record<Team, string> = {
  village: 'Village',
  loups: 'Loups-Garous',
  neutre: 'Neutre',
  solitaire: 'Solitaire',
}

/** The two sides whose head-count decides when the main conflict ends. */
export type MainTeam = 'village' | 'loups'

/**
 * What the Chien senses when he investigates a player at night — a classification
 * independent of team, based purely on the role's own power:
 * 'sombre': the role can kill someone (Loup-Garou, Grand Méchant Loup, Loup Blanc,
 * Assassin, Sorcière, Chasseur, ...). 'neutre': the role gains information at night
 * (Voyante, Chien, Sœur, ...). 'claire': every other role.
 */
export type Aura = 'sombre' | 'neutre' | 'claire'

/** Display order, labels, icons and the rule text shown in the Règles tab's aura legend. */
export const AURA_ORDER: Aura[] = ['sombre', 'neutre', 'claire']

export const AURA_LABELS: Record<Aura, string> = {
  sombre: 'Sombre',
  neutre: 'Neutre',
  claire: 'Claire',
}

export const AURA_ICONS: Record<Aura, string> = {
  sombre: '🌑',
  neutre: '🌗',
  claire: '☀️',
}

export const AURA_RULE_TEXT: Record<Aura, string> = {
  sombre: 'Le rôle a la capacité de tuer quelqu\'un.',
  neutre: 'Le rôle peut obtenir une information pendant la nuit.',
  claire: 'Tous les autres rôles.',
}

export type NightAction = 'choose-target' | 'none' | 'witch' | 'self-protect' | 'choose-couple' | 'chien-loup-choice'

/** What happens to the chosen target when a 'choose-target' role confirms its pick. */
export type NightEffect = 'kill' | 'none'

/**
 * Who can be picked as a target. 'exclude-own-team' keeps a role from targeting its
 * own side (wolves can't kill wolves). 'exclude-own-role' keeps it from targeting
 * itself or another holder of the same role (a seer doesn't look at another seer).
 * 'loups-only' restricts to Loups-Garous-team players (the Loup Blanc's periodic
 * kill). 'all' allows any living player.
 */
export type TargetFilter = 'exclude-own-team' | 'exclude-own-role' | 'loups-only' | 'all'

/**
 * What happens automatically when a player holding this role dies, regardless of
 * how (night kill or day vote). 'revenge-kill' pauses the game to let the MJ pick
 * one more victim before continuing.
 */
export type OnDeathEffect = 'none' | 'revenge-kill'

/** Only relevant for team 'neutre': what this role must achieve to win on its own. */
export type NeutralObjective = 'none' | 'survive' | 'couple-survives'

export interface RoleDef {
  id: string
  name: string
  icon: string
  team: Team
  /** What the Chien senses about this role at night — see Aura. */
  aura: Aura

  /** Shown with a +/- counter on the role-setup screen. */
  configurable: boolean
  /** The role that silently receives every player not assigned to a configurable role. Exactly one role should have fill: true. */
  fill: boolean
  /** Starting count on the setup screen. Only used when configurable is true. */
  defaultCount: number
  /** Lower bound for the counter. Only used when configurable is true. */
  minCount: number
  /** Rare: this role only ever comes in a fixed pair (e.g. the Sœurs) — the setup stepper moves it by 2 instead of 1, so it can only ever land on an even count. Omitted (falsy) for every normal role. */
  pairOnly?: boolean

  /**
   * Position in the night wake-up order. `null` = this role never wakes at night.
   * Values are spaced (100, 200, 300, ...) so a new role can be inserted between
   * two existing ones just by picking a value in between (e.g. 150 goes between
   * 100 and 200) without renumbering anything else.
   */
  nightOrder: number | null
  /** True for a role that only wakes on the very first night (e.g. Cupidon), never again after. */
  onlyFirstNight: boolean
  nightAction: NightAction
  /**
   * Only relevant when nightAction is 'choose-target'. 'kill' removes the target
   * from the game; 'none' lets the role privately pick someone (e.g. a seer
   * checking a role) without affecting them.
   */
  nightEffect: NightEffect
  /** Only relevant when nightAction is 'choose-target'. */
  targetFilter: TargetFilter
  onDeathEffect: OnDeathEffect
  /** Only relevant for team 'neutre'. Checked once the main conflict ends. */
  neutralObjective: NeutralObjective
  /**
   * How many times, for the whole game, this role can block ANY night kill against
   * itself (wolves, a Sorcière's poison, ...). Only relevant with nightAction
   * 'self-protect': at the start of its night step, the MJ is asked whether this
   * role activates its protection for THAT night — decided blind, without knowing
   * who will be targeted, and a charge is spent the moment it's activated whether
   * or not an attack actually comes. 0 = no such power.
   */
  nightProtectionCharges: number
  /**
   * If true, this role's alive holder gets an automatic textual alert at the start
   * of every day when at least one living player belongs to a different team than
   * this role's own team (e.g. Montreur d'ours: the bear growls if a non-Village
   * player is alive). Purely a derived display — no state, no MJ action needed.
   */
  dayCampAlert: boolean
  /**
   * If true, this role's alive holder can never be killed by a 'loups'-team role's
   * night kill (the main pack kill or the Grand Méchant Loup's bonus kill) — the
   * kill simply has no effect, silently, the same way a wolf attack on a protected
   * Survivant fizzles. Only 'loups'-sourced kills are blocked: votes, poison, a
   * hunter's revenge, and a lover's heartbreak death all still work normally.
   */
  immuneToWolves: boolean
  /** Only relevant for the Chien: his night reveal shows the target's aura instead of their role. Omitted for every other role. */
  nightRevealsAura?: boolean
  nightPrompt?: string
  /**
   * Free-text explanation, shown as-is in the compendium. Used by most roles.
   *
   * A role that needs to call out specifics instead sets any of `objective`,
   * `power`, `immunity` — the compendium shows whichever of those are present as
   * separate labeled lines ("Objectif :" / "Pouvoir :" / "Immunité :") instead of
   * one flowing paragraph, and `description` is ignored when any of them is set.
   * - `objective`: team 'neutre' roles, which each pursue their own separate win
   *   condition worth spelling out.
   * - `power` / `immunity`: team 'solitaire' roles. They all share the same
   *   objective (be the sole survivor), so it isn't repeated per role — just the
   *   power, kept brief, and any immunity. Skip interaction specifics here (how it
   *   plays with the Sorcière, Cupidon, etc.) — the app already handles those, the
   *   MJ doesn't need to track them.
   */
  description?: string
  objective?: string
  power?: string
  immunity?: string
}

export const ROLES: RoleDef[] = [
  {
    id: 'villageois',
    name: 'Villageois',
    icon: '🧑‍🌾',
    team: 'village',
    aura: 'claire',
    configurable: false,
    fill: true,
    defaultCount: 0,
    minCount: 0,
    nightOrder: null,
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description: "Aucun pouvoir particulier. Doit démasquer les Loups-Garous pendant les votes.",
  },
  {
    id: 'petite-fille',
    name: 'Petite Fille',
    icon: '👧',
    team: 'village',
    aura: 'claire',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnelle : peut être désactivée si trop peu de joueurs
    // Pas d'étape dédiée : elle risque un œil pendant que les Loups-Garous se
    // réveillent, mais ça se joue autour de la table (le MJ veille à ce qu'elle ne
    // se fasse pas repérer) — rien à faire côté appli.
    nightOrder: null,
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description:
      "Peut risquer un œil pendant le tour des Loups-Garous pour tenter de repérer qui ils sont. Se joue autour de la table : aucun écran dédié dans l'appli.",
  },
  {
    id: 'chasseur',
    name: 'Chasseur',
    icon: '🏹',
    team: 'village',
    aura: 'sombre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnel : peut être désactivé si trop peu de joueurs
    nightOrder: null, // ne se réveille jamais la nuit
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'revenge-kill', // à sa mort (nuit ou vote), il emporte un joueur avec lui
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description: "À sa mort, quelle qu'en soit la cause, élimine immédiatement un autre joueur de son choix.",
  },
  {
    id: 'vieux-chevalier',
    name: 'Vieux Chevalier',
    icon: '⚔️',
    team: 'village',
    aura: 'sombre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // rôle obscur, optionnel
    nightOrder: null, // aucun tour de nuit propre : sa vengeance est une réaction automatique à sa propre mort, pas un choix qu'il fait
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    // Pas 'revenge-kill' : contrairement au Chasseur, ce n'est pas le MJ qui choisit
    // la cible — elle est entièrement automatique (son propre meurtrier, ou pour un
    // groupe le membre assis le plus proche de sa droite) et ne se déclenche que
    // s'il meurt LA NUIT (jamais un vote) — voir avengeOldKnight dans engine.ts,
    // branché dans resolveNightCascades (store.tsx), révélée le jour même.
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description:
      "S'il est tué pendant la nuit, son meurtrier meurt à son tour, révélé le jour même. Si c'est un groupe qui l'a tué (les Loups-Garous par exemple), seul le membre assis le plus proche de sa droite en meurt. Un vote ne déclenche jamais cette vengeance.",
  },
  {
    id: 'voyante',
    name: 'Voyante',
    icon: '🔮',
    team: 'village',
    aura: 'neutre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnelle : peut être désactivée si trop peu de joueurs
    nightOrder: 50, // avant les Loups-Garous (100)
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'none', // ne tue pas : le MJ voit juste le rôle de la cible
    targetFilter: 'exclude-own-role', // ne peut pas se regarder elle-même
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: 'La Voyante se réveille et désigne un joueur dont elle veut voir le rôle.',
    description: "Chaque nuit, découvre en secret le rôle d'un joueur.",
  },
  {
    id: 'chien',
    name: 'Chien',
    icon: '🐕',
    team: 'village',
    aura: 'neutre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnel : peut être désactivé si trop peu de joueurs
    nightOrder: 45, // avant la Voyante (50), tout comme elle il agit avant la meute
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'none', // ne tue pas : le MJ voit juste l'aura de la cible
    targetFilter: 'exclude-own-role', // ne peut pas se cibler lui-même
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    // Contrairement à la Voyante, sa cible ne révèle pas son rôle mais son aura (voir
    // le champ Aura) : le bloc de reveal générique dans NightPhase.tsx bascule sur
    // l'aura de la cible quand nightRevealsAura est vrai, au lieu du rôle.
    nightRevealsAura: true,
    nightPrompt: "Le Chien se réveille et désigne un joueur dont il veut sentir l'aura.",
    description:
      "Chaque nuit, désigne un joueur et découvre son aura : sombre (un rôle capable de tuer), neutre (un rôle qui obtient une information la nuit) ou claire (tous les autres). Voir l'onglet Règles pour le détail des auras.",
  },
  {
    id: 'soeur',
    name: 'Sœur',
    icon: '👭',
    team: 'village',
    aura: 'neutre',
    configurable: true,
    fill: false,
    defaultCount: 2,
    minCount: 0,
    pairOnly: true, // toujours 0 ou 2, jamais un nombre impair — voir le stepper (RolesSetup.tsx) et clampRoleCounts/SET_ROLE_COUNT (store.tsx)
    nightOrder: 15, // tout début de la nuit, juste après le Survivant (10) — uniquement la nuit 1
    onlyFirstNight: true,
    // Rien à choisir : la ligne "holders" déjà affichée par l'écran de nuit
    // générique (leurs deux noms) suffit à les faire "se reconnaître" — aucun écran
    // dédié nécessaire pour cette étape.
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: 'Les Sœurs se réveillent et se reconnaissent entre elles (uniquement lors de la première nuit).',
    // Si l'une des deux meurt d'une mort nocturne attribuable (Loups-Garous, Grand
    // Méchant Loup, Assassin, Sorcière, vengeance du Chasseur — pas un vote, pas un
    // chagrin d'amour), la survivante apprend qui est à l'origine du meurtre dès le
    // début de la nuit suivante — voir pendingSistersVision / nightKillerIds et
    // finishNight dans store.tsx.
    description:
      "Toujours exactement deux joueuses. Elles se reconnaissent entre elles lors de la première nuit. Si l'une meurt pendant la nuit, l'autre apprend, dès la nuit suivante, qui est à l'origine du meurtre (un seul nom, même si plusieurs personnes étaient impliquées).",
  },
  {
    id: 'loup-garou',
    name: 'Loup-Garou',
    icon: '🐺',
    team: 'loups',
    aura: 'sombre',
    configurable: true,
    fill: false,
    defaultCount: 1, // par défaut il y en a toujours au moins un, mais ce n'est plus obligatoire (voir minCount)
    minCount: 0, // peut être descendu à 0 pour une partie sans Loup-Garou, uniquement avec l'Assassin comme menace
    nightOrder: 100,
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'kill',
    targetFilter: 'all', // peuvent désigner n'importe qui, y compris un autre loup (ou le Loup Blanc)
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: 'Les Loups-Garous se réveillent et désignent une victime.',
    description: 'Chaque nuit, les Loups-Garous se concertent pour éliminer une victime — même un autre loup, si la meute le décide.',
  },
  {
    id: 'grand-mechant-loup',
    name: 'Grand Méchant Loup',
    icon: '😈',
    team: 'loups',
    aura: 'sombre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnel : vient s'ajouter au(x) Loup-Garou classique(s), ne les remplace pas
    // Même nightOrder que le Loup-Garou : il se réveille avec eux et participe à la
    // même désignation de victime (voir getNightOrderHolders / le dédoublonnage par
    // nightOrder dans getNightSequence, engine.ts) — y compris un autre loup, comme
    // pour le Loup-Garou. Son pouvoir bonus (une seconde victime, une fois débloqué)
    // est géré à part comme une interruption dédiée, avec sa PROPRE liste de cibles
    // limitée aux non-loups (pas ce targetFilter) — voir bigBadWolfUnlocked /
    // pendingBonusKill dans store.tsx et BigBadWolfBonus.tsx.
    nightOrder: 100,
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'kill',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description:
      "Se réveille avec les autres Loups-Garous et participe normalement à leur désignation d'une victime. Dès qu'un loup meurt d'un vote du village, la nuit suivante (et toutes les suivantes), il peut en plus tuer un villageois de plus, seul.",
  },
  {
    id: 'loup-blanc',
    name: 'Loup Blanc',
    icon: '❄️🐺',
    team: 'solitaire',
    aura: 'sombre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    // Même nightOrder que la meute : il se réveille avec elle chaque nuit (voir
    // getNightOrderHolders) mais n'a aucun choix à cette étape commune — s'il
    // devait exceptionnellement la gouverner (plus aucun vrai loup en vie),
    // nightAction 'none' fait qu'il ne se passe rien. Son vrai pouvoir, périodique,
    // est géré à part comme une interruption dédiée juste après le pas de la meute
    // — voir pendingWhiteWolfKill dans store.tsx et WhiteWolfBonus.tsx. Le
    // targetFilter ci-dessous ne sert pas à cette étape commune : il sert
    // uniquement à cette interruption (cible uniquement des Loups-Garous).
    nightOrder: 100,
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'loups-only',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    power:
      "Se réveille avec les Loups-Garous chaque nuit. Une nuit sur deux, se réveille aussi seul et peut, s'il le souhaite, tuer un loup.",
  },
  {
    id: 'sorciere',
    name: 'Sorcière',
    icon: '🧪',
    team: 'village',
    aura: 'sombre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnelle : peut être désactivée si trop peu de joueurs
    nightOrder: 150, // après les Loups-Garous (100), pour voir leur victime
    onlyFirstNight: false,
    // Écran entièrement dédié (deux potions à usage unique par partie) : ne suit pas
    // le système générique choose-target / nightEffect, voir WitchNight.tsx et le
    // reducer (action WITCH_ACT) dans store.tsx.
    nightAction: 'witch',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: 'La Sorcière se réveille.',
    description:
      "Possède une potion de vie (sauve la victime des Loups-Garous) et une potion de mort (élimine un joueur de son choix), chacune utilisable une seule fois par partie.",
  },
  {
    id: 'chien-loup',
    name: 'Chien-Loup',
    icon: '🐕‍🦺',
    team: 'neutre',
    aura: 'neutre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    // Tout premier de la nuit, avant même Cupidon : son identité doit être fixée
    // avant que quoi que ce soit d'autre ne se joue cette nuit-là, puisqu'elle
    // détermine s'il rejoint la meute (100) ou prend le tour du Chien (45) plus
    // tard cette même nuit. Uniquement la nuit 1 : ce choix ne se refait jamais.
    nightOrder: 1,
    onlyFirstNight: true,
    // Pas un choose-target : il choisit une IDENTITÉ, pas un joueur — voir le bloc
    // dédié dans NightPhase.tsx et l'action CHOOSE_CHIEN_LOUP dans store.tsx. Cette
    // action transforme littéralement son roleId en 'chien' ou 'loup-garou' — il
    // hérite alors intégralement du pouvoir, du camp et de la victoire de ce rôle,
    // à une seule exception près : son aura reste pour toujours 'neutre' (voir
    // Player.forcedAura, posé au moment du choix).
    nightAction: 'chien-loup-choice',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none', // sa victoire n'est pas gérée comme les autres neutres : une fois transformé, il gagne normalement avec son nouveau camp
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: "Le Chien-Loup se réveille et choisit, une fois pour toutes, son identité.",
    objective:
      "Au tout début de la partie, choisit de devenir soit le Chien, soit un Loup-Garou — et gagne dès lors avec le camp correspondant (Village ou Loups-Garous).",
    power:
      "Une fois son choix fait, obtient exactement les pouvoirs du rôle choisi. Son aura reste toujours neutre, quel que soit son choix.",
  },
  {
    id: 'survivant',
    name: 'Survivant',
    icon: '🛡️',
    team: 'neutre',
    aura: 'claire',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: 10, // tout premier de la nuit (après Cupidon) : il choisit avant même que les Loups-Garous ne désignent une victime
    onlyFirstNight: false,
    nightAction: 'self-protect',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'survive', // gagne si en vie quand le conflit village/loups se termine
    nightProtectionCharges: 2,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: "Le Survivant se réveille et doit décider, sans savoir qui sera visé cette nuit, s'il active sa protection.",
    objective:
      "Ne compte pour la victoire ni du Village ni des Loups-Garous. Doit simplement survivre jusqu'à la fin de la partie.",
    power:
      "Au début de chaque nuit, doit deviner s'il va être visé : s'il active sa protection (deux fois par partie), rien ne peut le tuer cette nuit-là — mais la charge est dépensée même si personne ne l'attaque finalement.",
  },
  {
    id: 'cupidon',
    name: 'Cupidon',
    icon: '💘',
    team: 'neutre',
    aura: 'claire',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: 5, // tout premier de la nuit, avant même le Survivant — et uniquement la nuit 1
    onlyFirstNight: true,
    // Choisit DEUX joueurs (pas une seule cible) : ne suit pas le système générique
    // choose-target, voir le bloc dédié dans NightPhase.tsx et l'action CHOOSE_LOVERS
    // dans store.tsx. Le lien qu'il crée (voir GameState.loverIds) persiste ensuite
    // toute la partie, même si Cupidon meurt.
    nightAction: 'choose-couple',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'couple-survives', // gagne si le couple qu'il a formé est encore vivant à la fin, qu'il soit lui-même en vie ou non
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: "Cupidon se réveille et désigne les deux amoureux (uniquement lors de la première nuit).",
    objective: "Gagne si le couple qu'il a formé est toujours vivant à la fin de la partie, qu'il en fasse partie ou non.",
    power:
      "Lors de la première nuit uniquement, désigne deux joueurs qui tombent amoureux (il peut se choisir lui-même). Si l'un des amoureux meurt, l'autre meurt aussitôt de chagrin. Si le couple réunit deux camps opposés (Village / Loups-Garous), les amoureux ont leur propre victoire : ils gagnent s'ils sont les deux derniers survivants, quel que soit le camp.",
  },
  {
    id: 'ange',
    name: 'Ange',
    icon: '👼',
    team: 'neutre',
    aura: 'claire',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: null, // aucune action de nuit propre : son sort dépend de comment se passe le premier tour, pas d'un choix qu'il fait
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none', // son objectif n'est pas géré comme les autres neutres : voir resolveGame dans engine.ts
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    // S'il meurt (nuit ou vote) pendant le tour 1, il gagne seul et la partie
    // s'arrête net — voir la vérification dédiée dans resolveGame (engine.ts).
    // S'il survit jusqu'à la fin du tour 1, il devient Survivant pour le reste de
    // la partie (roleId changé + charges de protection initialisées) — voir la
    // transformation dans l'action CONTINUE_TO_NEXT_NIGHT (store.tsx).
    objective:
      "Gagne — et met immédiatement fin à la partie — s'il est éliminé pendant le tout premier tour (nuit 1 ou vote du jour 1).",
    power:
      "S'il survit jusqu'à la fin du premier tour, il devient Survivant pour le reste de la partie (protection deux fois par partie, doit survivre jusqu'au bout).",
  },
  {
    id: 'montreur-ours',
    name: "Montreur d'ours",
    icon: '🐻',
    team: 'village',
    aura: 'claire',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: null, // ne se réveille jamais : son ours réagit de jour, pas de nuit
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    // Pas d'action à prendre, juste un indicateur affiché automatiquement en début
    // de journée (voir campAlertActive dans engine.ts et son usage dans DayPhase.tsx).
    dayCampAlert: true,
    immuneToWolves: false,
    description:
      "Au début de chaque journée, son ours grogne (indication affichée dans l'appli) si au moins un joueur vivant d'un camp différent du Village est présent — sans compter les morts.",
  },
  {
    id: 'assassin',
    name: 'Assassin',
    icon: '🗡️',
    team: 'solitaire',
    aura: 'sombre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: 120, // après la meute (100), avant la Sorcière (150) : elle doit voir les deux victimes
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'kill',
    targetFilter: 'exclude-own-role', // ne peut pas se cibler lui-même
    onDeathEffect: 'none',
    neutralObjective: 'none', // son objectif n'est pas géré comme les 'neutre' : voir resolveGame dans engine.ts
    nightProtectionCharges: 0,
    dayCampAlert: false,
    // Rien ne le tue la nuit venant des Loups-Garous (meute ou bonus du Grand
    // Méchant Loup) : voir isImmuneToWolfKill, utilisé par applyNightEffect et par
    // l'action RESOLVE_BONUS_KILL dans store.tsx. Vote, poison, vengeance du
    // Chasseur et chagrin d'un amoureux le tuent normalement.
    immuneToWolves: true,
    nightPrompt: "L'Assassin se réveille et désigne une victime.",
    power: 'Chaque nuit, tue un joueur de son choix.',
    immunity: 'Loups-Garous.',
  },

  // Pour ajouter un rôle, une seule entrée ici suffit dans la grande majorité des cas :
  // compteur, distribution, ordre de réveil et écran de nuit s'adaptent automatiquement.
  // Exception : un pouvoir avec un état propre (comme les potions de la Sorcière) ou
  // une mécanique qui ne se résume pas à "choisir une cible" demande un vrai écran
  // dédié en plus de l'entrée ici (nightAction: 'witch' est un exemple de ce cas).
]

export function getRole(roleId: string | undefined): RoleDef | undefined {
  return ROLES.find((r) => r.id === roleId)
}

export function getTeam(roleId: string | undefined): Team | undefined {
  return getRole(roleId)?.team
}

export const CONFIGURABLE_ROLES = ROLES.filter((r) => r.configurable)

export const FILL_ROLE = ROLES.find((r) => r.fill)

export function defaultRoleCounts(): Record<string, number> {
  return Object.fromEntries(CONFIGURABLE_ROLES.map((r) => [r.id, r.defaultCount]))
}
