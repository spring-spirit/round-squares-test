import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, keyframes } from '@mui/material';
import gussImage from '../assets/guss.webp';
import type { RoundDetails } from '../types';
import { UserRole, RoundStatus } from '../types/enums';

interface AnimatedGussProps {
  onClick?: () => void;
  disabled?: boolean;
  currentRound: RoundDetails | null;
  userRole?: UserRole;
}

const tapImpulse = keyframes`
  0% { transform: scale(1) translate(0, 0); }
  30% { transform: scale(1.07) translate(0, -2px); }
  60% { transform: scale(0.98) translate(0, 1px); }
  100% { transform: scale(1) translate(0, 0); }
`;

const mutationPulse = keyframes`
  0%, 100% { 
    filter: brightness(1) saturate(1);
  }
  50% { 
    filter: brightness(1.15) saturate(1.2);
  }
`;

const combo11 = keyframes`
  0% { 
    transform: scale(1);
    filter: brightness(1) hue-rotate(0deg);
  }
  20% { 
    transform: scale(1.15);
    filter: brightness(1.5) hue-rotate(120deg);
  }
  40% { 
    transform: scale(1.1);
    filter: brightness(1.3) hue-rotate(240deg);
  }
  60% { 
    transform: scale(1.05);
    filter: brightness(1.2) hue-rotate(120deg);
  }
  100% { 
    transform: scale(1);
    filter: brightness(1) hue-rotate(0deg);
  }
`;

const cooldownPulse = keyframes`
  0%, 100% { 
    opacity: 0.6;
    filter: grayscale(0.3);
  }
  50% { 
    opacity: 0.8;
    filter: grayscale(0.1);
  }
`;

const finishedFade = keyframes`
  0% { 
    opacity: 1;
    filter: brightness(1);
  }
  100% { 
    opacity: 0.7;
    filter: brightness(0.8) grayscale(0.2);
  }
`;

const scorePopKeyframes = keyframes`
  0% { 
    opacity: 1;
    transform: translateY(0) scale(0.8);
  }
  50% { 
    opacity: 1;
    transform: translateY(-60px) scale(1.2);
  }
  100% { 
    opacity: 0;
    transform: translateY(-120px) scale(0.6);
  }
`;

function ScorePop({ points, x, y }: { points: number; x: number; y: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const isCombo = points === 10;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        pointerEvents: 'none',
        zIndex: 1000,
        color: isCombo ? '#00ff00' : '#ffff00',
        fontSize: isCombo ? '2rem' : '1.5rem',
        fontWeight: 'bold',
        textShadow: '0 0 10px currentColor, 0 0 20px currentColor',
        animation: `${scorePopKeyframes} 1s ease-out forwards`,
        fontFamily: 'monospace',
      }}
    >
      +{points}
    </Box>
  );
}

function Particles({
  x,
  y,
  isCombo,
}: {
  x: number;
  y: number;
  isCombo: boolean;
}) {
  const particlesData = useMemo(() => {
    return Array.from({ length: isCombo ? 40 : 25 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 40;
      const delay = Math.random() * 0.2;
      const duration = 0.3 + Math.random() * 0.3;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      const particleKeyframes = keyframes`
        0% { 
          opacity: 1;
          transform: translate(0, 0) scale(1);
        }
        100% { 
          opacity: 0;
          transform: translate(${endX}px, ${endY}px) scale(0);
        }
      `;

      return {
        delay,
        duration,
        keyframes: particleKeyframes,
      };
    });
  }, [isCombo]);

  const particles = particlesData.map((particle, i) => (
    <Box
      key={i}
      sx={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: '4px',
        height: '4px',
        backgroundColor: isCombo ? '#00ff00' : '#ffff00',
        boxShadow: `0 0 ${isCombo ? '8px' : '4px'} currentColor`,
        borderRadius: '50%',
        pointerEvents: 'none',
        animation: `${particle.keyframes} ${particle.duration}s ease-out ${particle.delay}s forwards`,
      }}
    />
  ));

  return <>{particles}</>;
}

export default function AnimatedGuss({
  onClick,
  disabled,
  currentRound,
  userRole,
}: AnimatedGussProps) {
  const [tapAnimation, setTapAnimation] = useState(false);
  const [glitchAnimation, setGlitchAnimation] = useState(false);
  const [comboAnimation, setComboAnimation] = useState(false);
  const [scorePops, setScorePops] = useState<
    Array<{ id: number; points: number; x: number; y: number }>
  >([]);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; isCombo: boolean }>
  >([]);
  const imageRef = useRef<HTMLImageElement>(null);

  const roundStatus = currentRound?.status || RoundStatus.COOLDOWN;
  const myTaps = currentRound?.myTaps || 0;
  const prevTapsRef = useRef(myTaps);
  const [isCombo11, setIsCombo11] = useState(false);
  const isNikita = userRole === UserRole.NIKITA;

  useEffect(() => {
    prevTapsRef.current = myTaps;
  }, [myTaps]);

  useEffect(() => {
    if (isCombo11 && !comboAnimation) {
      // Use setTimeout for asynchronous state update
      const timer = setTimeout(() => {
        setComboAnimation(true);
      }, 0);

      const resetTimer = setTimeout(() => {
        setComboAnimation(false);
        setIsCombo11(false);
      }, 600);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    }
  }, [isCombo11, comboAnimation]);

  // Click handler without debouncing, all clicks are processed
  const handleClick = () => {
    if (disabled || !onClick) return;

    // Call the handler immediately - this is critical for the competition
    onClick();

    // Visual effects are processed with debouncing to avoid overloading the render
    // But this does not block the click processing
    const rect = imageRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : 0;
    const y = rect ? rect.top + rect.height / 2 : 0;

    // Determine if this is the 11th tap (check the current value + 1)
    const nextTap = myTaps + 1;
    const willBeCombo11 = nextTap > 0 && nextTap % 11 === 0;

    // Tap animation - use requestAnimationFrame for optimization
    requestAnimationFrame(() => {
      setTapAnimation(true);
      setTimeout(() => setTapAnimation(false), 180);
    });

    // Glitch effect
    requestAnimationFrame(() => {
      setGlitchAnimation(true);
      setTimeout(() => setGlitchAnimation(false), 200);
    });

    // Combo effect on the 11th tap
    if (willBeCombo11) {
      requestAnimationFrame(() => {
        setIsCombo11(true);
      });
    }

    // Floating points - batch updates
    const points = willBeCombo11 ? 10 : 1;
    const displayPoints = isNikita ? 0 : points;
    const popId = Date.now() + Math.random();

    requestAnimationFrame(() => {
      setScorePops((prev) => {
        // Limit the number of simultaneously displayed points (maximum 10)
        const limited = prev.length >= 10 ? prev.slice(-9) : prev;
        return [
          ...limited,
          {
            id: popId,
            points: displayPoints,
            x: x - 20,
            y: y - 40,
          },
        ];
      });
    });

    // Particles - batch updates
    const particleId = Date.now() + Math.random();

    requestAnimationFrame(() => {
      setParticles((prev) => {
        // Limit the number of simultaneously displayed particles (maximum 50)
        const limited = prev.length >= 50 ? prev.slice(-49) : prev;
        return [
          ...limited,
          {
            id: particleId,
            x,
            y,
            isCombo: willBeCombo11,
          },
        ];
      });
    });
  };

  // Clean up old particles and points
  useEffect(() => {
    const timer = setInterval(() => {
      setScorePops((prev) => {
        const now = Date.now();
        return prev.filter((pop) => now - pop.id < 1000);
      });
      setParticles((prev) => {
        const now = Date.now();
        return prev.filter((p) => now - p.id < 600);
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Determine the animation depending on the state
  const getAnimation = () => {
    if (roundStatus === RoundStatus.COOLDOWN) {
      return `${cooldownPulse} 2s ease-in-out infinite`;
    } else if (roundStatus === RoundStatus.FINISHED) {
      return `${finishedFade} 2s ease-in-out forwards`;
    } else if (isCombo11 || comboAnimation) {
      return `${combo11} 0.6s ease-out`;
    } else if (tapAnimation) {
      return `${tapImpulse} 0.18s ease-out`;
    } else {
      return `${mutationPulse} 3s ease-in-out infinite`;
    }
  };

  const animation = getAnimation();

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Particles */}
      {particles.map((particle) => (
        <Particles
          key={particle.id}
          x={particle.x}
          y={particle.y}
          isCombo={particle.isCombo}
        />
      ))}

      {/* Floating points */}
      {scorePops.map((pop) => (
        <ScorePop key={pop.id} points={pop.points} x={pop.x} y={pop.y} />
      ))}

      {/* Goose image */}
      <Box
        ref={imageRef}
        component="img"
        src={gussImage}
        alt="Guss"
        onClick={handleClick}
        sx={{
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 300px)',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          opacity: disabled ? 0.6 : 1,
          transition: 'opacity 0.2s',
          animation: animation,
          filter: glitchAnimation
            ? 'hue-rotate(90deg) brightness(1.2)'
            : roundStatus === RoundStatus.COOLDOWN
            ? 'grayscale(0.2)'
            : roundStatus === RoundStatus.FINISHED
            ? 'grayscale(0.3) brightness(0.9)'
            : 'none',
          transform: glitchAnimation ? 'translate(-2px, 2px)' : 'none',
          '&:hover': disabled
            ? {}
            : {
                opacity: 0.9,
                transform: 'scale(1.02)',
              },
        }}
      />

      {/* Grid effect for cooldown */}
      {roundStatus === RoundStatus.COOLDOWN && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
            opacity: 0.5,
            mixBlendMode: 'screen',
          }}
        />
      )}
    </Box>
  );
}
