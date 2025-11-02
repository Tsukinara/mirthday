// Constants for the Mystery App Frontend

// Available objective types from the schema
export const OBJECTIVES = [
    'EELS',
    'KEYBOARD',
    'GACHA',
    'MUSIC',
    'NAMETAGS',
    'POSTCARDS',
    'LIBRARY',
    'TREASURE'
] as const;

// Possible agent codenames (display names in uppercase, stored in lowercase)
export const AGENT_CODENAMES = [
    'ADMIN',
    'ALCHEMIST',
    'ANDROID',
    'ANNIE',
    'ARCHER',
    'BART',
    'BUZZ',
    'CHANGE',
    'CINDER',
    'DARK',
    'DIAMOND',
    'ED',
    'ENDER',
    'FURY',
    'GENDO',
    'GOJO',
    'HAMMOND',
    'HORSE',
    'KAGUYA',
    'KEN',
    'KEI',
    'LEGO',
    'LEO',
    'LUNA',
    'MAGE',
    'MEAT',
    'MECHA',
    'PIRATE',
    'PORK',
    'PORYGON',
    'PRESIDENT',
    'RABBIT',
    'SHIELD',
    'TEDDY',
    'TITAN',
    'TUX',
    'UDON',
    'WITCH'
] as const;

// Puzzle statuses
export const PUZZLE_STATUS = {
    SOLVED: 'SOLVED',
    UNSOLVED: 'UNSOLVED'
} as const;

// Roles
export const ROLES = {
    PLAYER: 'PLAYER',
    ADMIN: 'ADMIN'
} as const;

// Type exports for TypeScript
export type ObjectiveType = typeof OBJECTIVES[number];
export type AgentCodename = typeof AGENT_CODENAMES[number];
export type PuzzleStatus = typeof PUZZLE_STATUS[keyof typeof PUZZLE_STATUS];
export type Role = typeof ROLES[keyof typeof ROLES];

