import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const TeamRocketCelebration = ({ show, onClose }) => {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (show) {
      // Create confetti particles
      const particles = [];
      for (let i = 0; i < 50; i++) {
        particles.push({
          id: i,
          left: Math.random() * 100,
          animationDelay: Math.random() * 3,
          animationDuration: 3 + Math.random() * 2,
        });
      }
      setConfetti(particles);

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-purple-900 to-blue-900 border-2 border-yellow-400">
        <div className="text-center space-y-4 py-6">
          <h2 className="text-3xl font-bold text-yellow-400 animate-bounce">
            🎉 TEAM ROCKET KUDOS! 🎉
          </h2>
          
          {/* Team Rocket GIF */}
          <div className="flex justify-center">
            <img
              src="/giphy.gif"
              alt="Team Rocket"
              className="w-64 h-64 object-cover rounded-lg shadow-2xl border-4 border-yellow-400"
            />
          </div>

          <div className="text-xl text-white font-semibold animate-pulse">
            Prepare for trouble... and make it double! 🚀
          </div>
        </div>

        {/* Confetti Animation */}
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="confetti"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.animationDelay}s`,
              animationDuration: `${particle.animationDuration}s`,
            }}
          >
            {["🎊", "🎉", "⭐", "✨", "🚀", "💫"][Math.floor(Math.random() * 6)]}
          </div>
        ))}

        <style>{`
          .confetti {
            position: fixed;
            top: -10%;
            font-size: 2rem;
            animation: fall linear infinite;
            pointer-events: none;
            z-index: 9999;
          }

          @keyframes fall {
            0% {
              top: -10%;
              transform: translateX(0) rotateZ(0deg);
              opacity: 1;
            }
            100% {
              top: 100%;
              transform: translateX(100px) rotateZ(360deg);
              opacity: 0.5;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default TeamRocketCelebration;
