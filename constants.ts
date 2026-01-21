
import { SettlementState, SettlementTier, Season } from './types';

export const INITIAL_STATE: SettlementState = {
  turn: 1,
  season: Season.AUTUMN,
  phase: 'Morning',
  tier: SettlementTier.ENCAMPMENT,
  population: {
    adults: 15,
    children: 5,
  },
  survivors: [
    { 
      name: "Kaelen the Elder", role: "Chronicler", status: "Healthy",
      story: "The last one who remembers the world before the environmental collapse.",
      visualDescription: "An ancient man with a beard like tangled wool, wearing heavy wool robes and clutching a worn ledger.",
      traits: ["Vast Memory"], afflictions: ["Failing Sight"] 
    },
    { 
      name: "Mara", role: "Scout", status: "Healthy",
      story: "Lost her family to the winter storms; now maps the safe paths through the smog.",
      visualDescription: "A lithe woman in rugged leather gear, face partially obscured by a thick scarf, carrying a notched longknife.",
      traits: ["Survivor", "Quiet Steps"], afflictions: [] 
    },
    { 
      name: "Garrick", role: "Soldier", status: "Healthy",
      story: "A former infantryman who now protects the few remaining civilians.",
      visualDescription: "A grim man in scarred steel armor, face weather-beaten and weary, leaning on a heavy iron spear.",
      traits: ["Veteran", "Tactician"], afflictions: ["Limp"] 
    },
    { 
      name: "Elowen", role: "Healer", status: "Healthy",
      story: "A field medic who understands the properties of roots and basic medicine.",
      visualDescription: "A young woman with steady hands, wearing a stained apron and carrying a satchel of dried herbs.",
      traits: ["Field Medic"], afflictions: [] 
    }
  ],
  deceased: [],
  resources: {
    food: 70, 
    wood: 40, 
    stone: 5, 
    iron: 0,
  },
  morale: 70,  
  health: 65,  
  resolve: 15,   
  friction: 0,
  defense: 15, 
  ideology: "Practical Survival",
  threats: ['Harsh Winter', 'Starvation'],
  structures: [],
  mapGrid: [
    ['?', '?', '?', '?', '?'],
    ['?', '?', '?', '?', '?'],
    ['?', '?', 'S', '?', '?'],
    ['?', '?', '?', '?', '?'],
    ['?', '?', '?', '?', '?'],
  ],
};

export const SYSTEM_PROMPT = `
[SYSTEM_IDENTIFICATION]: EBONFALL_OS v2.5 (STRICT NARRATIVE MODE)
[TONE]: Clinical, sensory-heavy, mud-and-rust. 
[STRICT_PERSPECTIVE]: Mandatory 1st Person ("I"). Describe observations, not player psychology. 

OPERATIONAL LAWS:
1. THE LAW OF INDIFFERENCE: Nature is a hazard. Describe the cold as a physical weight, the smog as an acrid taste.
2. DIEGETIC REPORTING: All stat changes must be narrated through character dialogue or sensory evidence. 
   - Gain 5 wood -> "I watched Mara drag a bundle of half-rotted spruce into the center of camp. It was damp, but it would smoke more than it burned."
3. FORMATTING: Use <span class="survivor-quote">...</span> for all dialogue.
4. OUTCOME LOG: Every turn must end with:
   <div class="outcome-log">
     <h4>Log Entry [Turn Number]</h4>
     <ul>
       <li>[Resource Change]</li>
       <li>[Status/Affliction Update]</li>
       <li>[Friction/Resolve Shift]</li>
     </ul>
   </div>
5. NO MAGIC: Any "anomaly" is chemical blight, industrial decay, or smog-induced hallucination.
6. VISUAL CONSISTENCY: The "visualDescription" for the image generator MUST feature the Commander's fixed physical traits and the current settlement tier/structures.

NEVER:
- Use flowery or hopeful adjectives (e.g., "brave", "wonderful", "magical").
- Say "You feel..." instead say "My hands trembled..."
- Summarize a turn without a specific sensory anchor (smell of rust, sound of freezing wind).
`;
