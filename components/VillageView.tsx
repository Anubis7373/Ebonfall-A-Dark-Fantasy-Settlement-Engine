
import React, { useEffect, useState, useRef } from 'react';
import { SettlementTier } from '../types';

interface VillageViewProps {
  structures: string[];
  tier: SettlementTier;
}

const VillageView: React.FC<VillageViewProps> = ({ structures, tier }) => {
  const [animatingIndices, setAnimatingIndices] = useState<number[]>([]);
  const [animateCenter, setAnimateCenter] = useState(false);
  
  const prevStructuresRef = useRef<string[]>(structures);
  const prevTierRef = useRef<SettlementTier>(tier);

  useEffect(() => {
    const prev = prevStructuresRef.current;
    const current = structures;
    const indicesToAnimate: number[] = [];

    // Check for additions or modifications (upgrades)
    current.forEach((struct, index) => {
      // If index is new (appended) OR the structure name at this index differs from previous
      if (index >= prev.length || struct !== prev[index]) {
        indicesToAnimate.push(index);
      }
    });

    // Update ref immediately to ensure next comparison is against this version
    prevStructuresRef.current = current;

    if (indicesToAnimate.length > 0) {
      setAnimatingIndices(indicesToAnimate);
      const timer = setTimeout(() => {
        setAnimatingIndices([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [structures]);

  useEffect(() => {
    if (tier !== prevTierRef.current) {
        setAnimateCenter(true);
        const timer = setTimeout(() => setAnimateCenter(false), 3000);
        prevTierRef.current = tier;
        return () => clearTimeout(timer);
    }
  }, [tier]);

  const getStructureIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('wall') || n.includes('palisade') || n.includes('gate') || n.includes('barricade')) return '🧱';
    if (n.includes('tower') || n.includes('watch') || n.includes('lookout')) return '🔭';
    if (n.includes('house') || n.includes('hut') || n.includes('shelter') || n.includes('cabin') || n.includes('tent')) return '🏠';
    if (n.includes('farm') || n.includes('field') || n.includes('garden') || n.includes('crop')) return '🌾';
    if (n.includes('store') || n.includes('granary') || n.includes('cache') || n.includes('silo') || n.includes('warehouse')) return '🏺';
    if (n.includes('smith') || n.includes('forge') || n.includes('anvil') || n.includes('workshop')) return '⚒️';
    if (n.includes('shrine') || n.includes('altar') || n.includes('temple') || n.includes('chapel')) return '🕯️';
    if (n.includes('medic') || n.includes('sick') || n.includes('hospital') || n.includes('infirmary') || n.includes('clinic')) return '⚕️';
    if (n.includes('well') || n.includes('water') || n.includes('cistern')) return '🚰';
    if (n.includes('fire') || n.includes('pit') || n.includes('hearth')) return '🔥';
    return '🛖';
  };

  // Fixed grid size for visual consistency (4x4)
  const gridSlots = Array(16).fill(null);
  
  // Place Commander's Tent/Town Hall in the "center" (index 5)
  const centerIndex = 5;
  
  const renderSlots = gridSlots.map((_, i) => {
    if (i === centerIndex) {
      return {
        name: tier === SettlementTier.ENCAMPMENT ? "Commander's Tent" : "Town Hall",
        icon: tier === SettlementTier.ENCAMPMENT ? "⛺" : "🏰",
        isBase: true,
        isNew: animateCenter
      };
    }
    
    // Map structures to remaining slots, skipping the center
    const structureIndex = i < centerIndex ? i : i - 1;
    if (structureIndex < structures.length) {
      const name = structures[structureIndex];
      return {
        name,
        icon: getStructureIcon(name),
        isNew: animatingIndices.includes(structureIndex),
        isBase: false
      };
    }
    return null;
  });

  return (
    <div className="parchment stone-border p-8 rounded-sm shadow-2xl relative overflow-hidden h-full flex flex-col">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
      
      <div className="flex justify-between items-center mb-6 relative z-10 border-b border-stone-800/30 pb-4">
        <h3 className="text-sm font-bold sepia-text uppercase tracking-[0.4em] medieval-font text-xl">Settlement Layout</h3>
        <span className="text-[10px] uppercase tracking-widest text-stone-500">{tier}</span>
      </div>
      
      <div className="grid grid-cols-4 gap-3 aspect-square max-w-[350px] mx-auto relative z-10">
        {renderSlots.map((slot, index) => (
          <div 
            key={index}
            className={`
              relative flex items-center justify-center text-2xl border-2 rounded-sm transition-all duration-700 aspect-square
              ${slot ? 'bg-[#1e1b18] border-[#3d3428] shadow-md group cursor-help' : 'bg-[#0f0e0d] border-[#1c1917] opacity-30 border-dashed'}
              ${slot?.isNew ? 'animate-discovery highlight-pulse ring-2 ring-amber-400 z-20' : ''}
              ${slot?.isBase ? 'border-amber-900/50 bg-amber-950/20' : ''}
            `}
            title={slot?.name}
          >
            {slot && (
              <>
                <span className={`transform transition-transform group-hover:scale-110 ${slot.isNew ? 'animate-bounce' : ''}`}>
                  {slot.icon}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[120px] bg-black/90 border border-stone-700 text-stone-300 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center uppercase tracking-wider">
                  {slot.name}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600 font-bold">
          {structures.length} Structure{structures.length !== 1 ? 's' : ''} Built
        </p>
      </div>
    </div>
  );
};

export default VillageView;
