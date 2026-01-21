
import React from 'react';

interface MapViewProps {
  grid: string[][];
  highlightedCoords?: { x: number; y: number } | null;
}

const MapView: React.FC<MapViewProps> = ({ grid, highlightedCoords }) => {
  const getCellContent = (cell: string) => {
    switch (cell) {
      case 'S': return { icon: '🏠', color: 'bg-[#2a2622] border-[#5c4e3e]', label: 'Settlement' };
      case 'M': return { icon: '🏔️', color: 'bg-[#1a1714] border-[#3d3428]', label: 'Mountains' };
      case 'F': return { icon: '🌲', color: 'bg-[#151c15] border-[#243324]', label: 'Forest' };
      case 'R': return { icon: '🏛️', color: 'bg-[#211d18] border-[#8c7851]/30', label: 'Ruins' };
      case 'W': return { icon: '🐊', color: 'bg-[#151a1c] border-[#242e33]', label: 'Swamp' };
      case 'C': return { icon: '☣️', color: 'bg-[#1c151b] border-[#332431]', label: 'Blighted' }; // Bio/Chem blight, not magic
      case 'P': return { icon: '🌾', color: 'bg-[#1c1a15] border-[#332e24]', label: 'Plains' };
      default: return { icon: '', color: 'bg-[#0a0a0a] border-[#1a1714] opacity-40', label: 'Smog' };
    }
  };

  return (
    <div className="parchment stone-border p-8 rounded-sm shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]"></div>
      
      <h3 className="text-sm font-bold sepia-text uppercase tracking-[0.4em] mb-6 text-center medieval-font text-xl">The Cartographer's View</h3>
      
      <div className="grid grid-cols-5 gap-2 aspect-square max-w-[350px] mx-auto relative z-10">
        {grid.map((row, y) => 
          row.map((cell, x) => {
            const content = getCellContent(cell);
            const isHighlighted = highlightedCoords?.x === x && highlightedCoords?.y === y;
            
            return (
              <div 
                key={`${x}-${y}`}
                className={`flex items-center justify-center text-2xl border-2 rounded-sm transition-all duration-700 ${content.color} shadow-lg hover:scale-105 hover:z-20 group relative 
                  ${isHighlighted ? 'animate-discovery highlight-pulse' : ''}`}
                title={content.label}
              >
                {content.icon}
              </div>
            )
          })
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 text-[10px] uppercase tracking-wider text-stone-500 border-t border-stone-800 pt-6 font-bold italic">
        <div className="flex items-center gap-2"><span>🏠</span> <span className="sepia-text">Home</span></div>
        <div className="flex items-center gap-2"><span>🌲</span> Timber</div>
        <div className="flex items-center gap-2"><span>🏔️</span> Heights</div>
        <div className="flex items-center gap-2"><span>🏛️</span> Scavenge</div>
        <div className="flex items-center gap-2"><span>☣️</span> Blight</div>
        <div className="flex items-center gap-2"><span>🌫️</span> Unexplored</div>
      </div>
    </div>
  );
};

export default MapView;
