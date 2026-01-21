
export enum SettlementTier {
  ENCAMPMENT = 'Encampment',
  VILLAGE = 'Village',
  TOWN = 'Town',
  CITY = 'City'
}

export enum Season {
  SPRING = 'Spring',
  SUMMER = 'Summer',
  AUTUMN = 'Autumn',
  WINTER = 'Winter'
}

export type DayPhase = 'Morning' | 'Afternoon' | 'Night';

export interface PlayerCommander {
  name: string;
  origin: string;
  philosophy: string;
  visualDescription: string;
  portraitUrl?: string;
  traits: string[];
}

export interface Survivor {
  name: string;
  role: string;
  story: string;
  visualDescription: string;
  portraitUrl?: string;
  status: 'Healthy' | 'Wounded' | 'Sick' | 'Grim' | 'Deceased';
  traits: string[];
  afflictions: string[];
}

export interface SettlementState {
  turn: number;
  season: Season;
  phase: DayPhase;
  tier: SettlementTier;
  commander?: PlayerCommander;
  population: {
    adults: number;
    children: number;
  };
  survivors: Survivor[]; 
  deceased: Survivor[];  
  resources: {
    food: number;
    wood: number;
    stone: number;
    iron: number;
  };
  morale: number; 
  health: number; 
  resolve: number; 
  friction: number; 
  defense: number; 
  ideology: string; 
  threats: string[];
  structures: string[]; // Track constructed buildings
  mapGrid: string[][]; 
}

export interface Choice {
  id: string;
  text: string;
  description: string;
  hint: string;
  influencedBy?: string;
}

export interface TurnData {
  narrative: string;
  visualDescription: string;
  imageUrl?: string; 
  mapAscii: string;
  stateUpdate: Partial<SettlementState>;
  choices: Choice[];
  eventOccurred?: string;
}

export interface GameHistory {
  turn: number;
  narrative: string;
  choiceTaken?: string;
}
