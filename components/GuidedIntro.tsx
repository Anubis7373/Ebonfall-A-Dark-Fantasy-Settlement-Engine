
import React, { useState } from 'react';

interface GuidedIntroProps {
  onComplete: () => void;
}

const GuidedIntro: React.FC<GuidedIntroProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "The Broken World",
      content: "You are the leader of Ebonfall. Following a catastrophic volcanic event and total ecological collapse, the sun has been blotted out by a permanent Ashen Smog. Survival is no longer a given; it is a daily battle against the elements.",
      icon: "❄️"
    },
    {
      title: "Hard Realities",
      content: "Food and Fuel are your only currency. Without nutrition, your people weaken; without wood for heat, they freeze. Every decision carries a physical weight. There are no miracles here—only preparation and grit.",
      icon: "🪵"
    },
    {
      title: "The Social Ledger",
      content: "A leader is defined by their people. Every citizen is a real person with practical skills and physical limitations. When a life is lost to the cold or hunger, it is gone. Record their names, for they were the labor and the heart of this camp.",
      icon: "📋"
    },
    {
      title: "Human Resolve",
      content: "Your 'Resolve' represents the unity of the settlement. Internal friction, lawlessness, and despair are your true enemies. How you treat your people will dictate whether they stand together or tear each other apart.",
      icon: "🤝"
    },
    {
      title: "Mapping the Ruin",
      content: "The world outside is a graveyard of the old era. Exploration reveals forests for wood and ruins for iron. But every expedition risks lives. The smog masks predators and harsh terrain alike.",
      icon: "🗺️"
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 md:p-12 overflow-hidden">
      <div className="max-w-4xl w-full parchment stone-border p-12 md:p-20 relative fade-in flex flex-col items-center text-center shadow-[0_0_150px_rgba(0,0,0,1)]">
        
        <div className="absolute top-10 left-0 right-0 flex justify-center gap-4">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-12 transition-all duration-700 ${i <= step ? 'bg-amber-600' : 'bg-stone-900'}`}
            ></div>
          ))}
        </div>

        <div className="text-8xl mb-12">{currentStep.icon}</div>
        
        <h2 className="text-5xl md:text-7xl medieval-font sepia-text mb-8 tracking-widest uppercase">
          {currentStep.title}
        </h2>
        
        <div className="text-2xl md:text-3xl font-serif italic leading-relaxed text-stone-300 mb-16 max-w-2xl">
          {currentStep.content}
        </div>

        <button 
          onClick={handleNext}
          className="px-16 py-6 border-2 border-stone-700 hover:border-stone-400 text-stone-500 hover:text-white transition-all uppercase tracking-[0.5em] text-2xl medieval-font group"
        >
          <span className="relative z-10">
            {step === steps.length - 1 ? "Take Command" : "Examine Reality"}
          </span>
        </button>

        <div className="mt-12 text-stone-700 text-sm uppercase tracking-[0.3em] medieval-font">
          Record {step + 1} of {steps.length} ◈ The Winter Never Ends
        </div>
      </div>
    </div>
  );
};

export default GuidedIntro;
