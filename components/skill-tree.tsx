'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillNode {
  id: string;
  title: string;
  description: string;
  type: 'task' | 'milestone' | 'practice';
  status: 'locked' | 'unlocked' | 'completed';
  xp: number;
  requirements: {
    parentNodes: string[];
    minLevel: number;
  };
  position: {
    x: number;
    y: number;
  };
}

interface SkillTreeProps {
  nodes: SkillNode[];
  userProgress: {
    currentLevel: number;
    totalXP: number;
    currentLevelXP: number;
    xpToNextLevel: number;
  };
  onNodeClick: (node: SkillNode) => void;
}

export function SkillTree({ nodes, userProgress, onNodeClick }: SkillTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Memoize line calculation
  const lines = useMemo(() => {
    const newLines: { start: SkillNode; end: SkillNode }[] = [];
    nodes.forEach(node => {
      node.requirements.parentNodes.forEach(parentId => {
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode) {
          newLines.push({ start: parentNode, end: node });
        }
      });
    });
    return newLines;
  }, [nodes]);

  const getNodeStyles = (node: SkillNode) => {
    const baseStyles = 'w-20 h-20 rounded-lg border-4 flex flex-col items-center justify-center relative ';
    const statusStyles = {
      completed: 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 shadow-emerald-200',
      unlocked: 'bg-gradient-to-br from-blue-100 to-white border-blue-300 shadow-blue-100',
      locked: 'bg-gradient-to-br from-gray-100 to-white border-gray-300 shadow-gray-100'
    };
    return cn(
      baseStyles,
      statusStyles[node.status],
      node.status !== 'locked' && 'hover:scale-105 hover:shadow-lg',
      node.type === 'milestone' && '!rounded-full',
      node.type === 'practice' && '!rounded-[30%]'
    );
  };

  const getLineColor = (start: SkillNode, end: SkillNode) => {
    if (start.status === 'completed' && end.status === 'completed') {
      return '#37b24d';
    }
    if (start.status === 'completed' && end.status === 'unlocked') {
      return '#4dabf7';
    }
    return '#999';
  };

  return (
    <div className="relative w-full h-[700px] bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-xl overflow-hidden">
      {/* Enhanced Progress Header */}
      <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-emerald-600" />
            <span className="text-lg font-semibold text-gray-700">
              Level {userProgress.currentLevel}
            </span>
          </div>
          <div className="text-sm text-emerald-600 font-medium">
            {Math.round((userProgress.currentLevelXP / userProgress.xpToNextLevel) * 100)}% Complete
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${(userProgress.currentLevelXP / userProgress.xpToNextLevel) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Enhanced Skill Tree SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ transform: 'translate(0, 100px)' }}
      >
        {lines.map(({ start, end }, index) => (
          <motion.line
            key={`${start.id}-${end.id}`}
            x1={start.position.x}
            y1={start.position.y}
            x2={end.position.x}
            y2={end.position.y}
            stroke={getLineColor(start, end)}
            strokeWidth={3}
            strokeDasharray="8 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
          />
        ))}
      </svg>

      {/* Enhanced Nodes */}
      <div className="absolute inset-0" style={{ transform: 'translate(0, 100px)' }}>
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            className="absolute"
            style={{
              left: node.position.x - 40,
              top: node.position.y - 40,
            }}
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.05 }}
            onHoverStart={() => setHoveredNode(node.id)}
            onHoverEnd={() => setHoveredNode(null)}
          >
            <button
              onClick={() => onNodeClick(node)}
              disabled={node.status === 'locked'}
              className={getNodeStyles(node)}
            >
              {node.status === 'completed' && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
                  +{node.xp}XP
                </div>
              )}
              {node.status === 'completed' ? (
                <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
              ) : node.status === 'locked' ? (
                <Lock className="w-8 h-8 text-gray-400" strokeWidth={2} />
              ) : (
                <Star className="w-8 h-8 text-blue-500" fill="currentColor" strokeWidth={1.5} />
              )}
              <span className="mt-1 text-xs font-medium text-center">
                {node.status === 'locked' ? 'Locked' : node.title}
              </span>
            </button>

            {/* Enhanced Tooltip */}
            <AnimatePresence>
              {hoveredNode === node.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-56 p-4 bg-white rounded-xl shadow-2xl z-20 border border-gray-100"
                >
                  <h4 className="font-semibold text-sm text-gray-800 mb-2">{node.title}</h4>
                  <p className="text-sm text-gray-600 leading-tight">{node.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">{node.xp} XP</span>
                    </div>
                    {node.status === 'locked' && (
                      <span className="text-xs text-gray-500">Level {node.requirements.minLevel}+</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 