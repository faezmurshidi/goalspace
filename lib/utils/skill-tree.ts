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

interface TreeNode extends SkillNode {
  children: TreeNode[];
  level: number;
  position: {
    x: number;
    y: number;
  };
}

export function calculateNodePositions(
  nodes: SkillNode[],
  width: number = 1000,
  height: number = 500,
  nodeSpacing: number = 120,
  levelHeight: number = 100
): SkillNode[] {
  // Build tree structure
  const buildTree = (nodeId: string, level: number = 0, processed = new Set<string>()): TreeNode | null => {
    if (processed.has(nodeId)) return null; // Prevent cycles
    processed.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const children: TreeNode[] = nodes
      .filter(n => n.requirements.parentNodes.includes(nodeId))
      .map(n => buildTree(n.id, level + 1, new Set(processed)))
      .filter((n): n is TreeNode => n !== null);

    return {
      ...node,
      children,
      level,
      position: { x: 0, y: 0 } // Initial position
    };
  };

  // Find root nodes (nodes with no parents)
  const rootNodes = nodes
    .filter(node => node.requirements.parentNodes.length === 0)
    .map(node => buildTree(node.id))
    .filter((n): n is TreeNode => n !== null);

  // Calculate positions
  const calculatePositions = (node: TreeNode, startX: number, levelWidth: number) => {
    const childrenWidth = levelWidth / (node.children.length || 1);
    
    // Position current node
    node.position = {
      x: startX + levelWidth / 2,
      y: node.level * levelHeight + 100 // Add 100px initial offset
    };

    // Position children
    node.children.forEach((child, index) => {
      calculatePositions(
        child,
        startX + index * childrenWidth,
        childrenWidth
      );
    });
  };

  // Calculate positions for each root node
  const rootWidth = width / rootNodes.length;
  rootNodes.forEach((root, index) => {
    calculatePositions(root, index * rootWidth, rootWidth);
  });

  // Flatten tree back to array and ensure minimum spacing
  const flattenTree = (node: TreeNode): SkillNode[] => {
    return [
      {
        ...node,
        position: node.position
      },
      ...node.children.flatMap(flattenTree)
    ];
  };

  const positionedNodes = rootNodes.flatMap(flattenTree);

  // Adjust positions to maintain minimum spacing
  positionedNodes.forEach((node, i) => {
    for (let j = i + 1; j < positionedNodes.length; j++) {
      const other = positionedNodes[j];
      if (node.position && other.position) {
        const dx = other.position.x - node.position.x;
        const dy = other.position.y - node.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < nodeSpacing) {
          const angle = Math.atan2(dy, dx);
          const adjustment = (nodeSpacing - distance) / 2;
          
          other.position.x += Math.cos(angle) * adjustment;
          other.position.y += Math.sin(angle) * adjustment;
          node.position.x -= Math.cos(angle) * adjustment;
          node.position.y -= Math.sin(angle) * adjustment;
        }
      }
    }
  });

  return positionedNodes;
} 