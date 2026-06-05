import React, { useState, useEffect, useRef } from 'react';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: string;
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'file' | 'dir';
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
}

interface RepoFileGraphProps {
  files?: FileItem[];
}

const DEFAULT_FILES: FileItem[] = [
  { id: '1', name: 'README.md', path: 'README.md', type: 'blob' },
  { id: '2', name: 'src', path: 'src', type: 'tree' },
  { id: '3', name: 'main.tsx', path: 'src/main.tsx', type: 'blob' },
  { id: '4', name: 'App.tsx', path: 'src/App.tsx', type: 'blob' },
  { id: '5', name: 'index.css', path: 'src/index.css', type: 'blob' },
  { id: '6', name: 'package.json', path: 'package.json', type: 'blob' },
  { id: '7', name: 'tsconfig.json', path: 'tsconfig.json', type: 'blob' },
  { id: '8', name: 'vite.config.ts', path: 'vite.config.ts', type: 'blob' },
  { id: '9', name: 'backend', path: 'backend', type: 'tree' },
  { id: '10', name: 'server.ts', path: 'backend/server.ts', type: 'blob' },
  { id: '11', name: 'routes', path: 'backend/routes', type: 'tree' },
  { id: '12', name: 'gitlab.ts', path: 'backend/routes/gitlab.ts', type: 'blob' }
];

export function RepoFileGraph({ files = [] }: RepoFileGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const draggedNodeIdRef = useRef<string | null>(null);

  // Parse files list into hierarchical nodes and edges with position reconciliation
  useEffect(() => {
    const items = files.length > 0 ? files : DEFAULT_FILES;
    const nodeMap = new Map<string, { label: string; type: 'file' | 'dir' }>();
    
    // Always add a root directory node
    nodeMap.set('__root__', { label: 'root', type: 'dir' });

    items.forEach((item) => {
      const parts = item.path.split('/');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;
        const type = isLast ? (item.type === 'tree' ? 'dir' : 'file') : 'dir';
        
        if (!nodeMap.has(currentPath)) {
          nodeMap.set(currentPath, {
            label: part,
            type
          });
        }
      });
    });

    // Create unique edges list
    const parsedEdges: Edge[] = [];
    nodeMap.forEach((_, path) => {
      if (path === '__root__') return;
      const parts = path.split('/');
      if (parts.length === 1) {
        parsedEdges.push({ source: '__root__', target: path });
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        parsedEdges.push({ source: parentPath, target: path });
      }
    });

    // Reconcile node positions to prevent resetting/shaking upon polling update
    setNodes((prevNodes) => {
      const parsedNodes: Node[] = [];
      let i = 0;
      nodeMap.forEach((val, id) => {
        const existingNode = prevNodes.find((n) => n.id === id);
        if (existingNode) {
          // Keep coordinates to avoid jumping/shaking
          parsedNodes.push({
            ...existingNode,
            label: val.label,
            type: val.type
          });
        } else {
          const angle = (i / nodeMap.size) * 2 * Math.PI;
          const radius = 100 + Math.random() * 50;
          parsedNodes.push({
            id,
            label: val.label,
            type: val.type,
            x: 450 + Math.cos(angle) * radius,
            y: 340 + Math.sin(angle) * radius,
            vx: 0,
            vy: 0
          });
        }
        i++;
      });
      return parsedNodes;
    });

    setEdges(parsedEdges);
  }, [files]);

  // Keep ref updated to coordinate drag safety inside physics loop
  useEffect(() => {
    draggedNodeIdRef.current = draggedNodeId;
  }, [draggedNodeId]);

  // Physics animation tick
  useEffect(() => {
    if (nodes.length === 0) return;

    let animFrameId: number;

    const updatePhysics = () => {
      setNodes((prevNodes) => {
        if (prevNodes.length === 0) return prevNodes;

        // Dampen existing velocities
        const nextNodes = prevNodes.map((n) => ({ ...n, vx: n.vx * 0.82, vy: n.vy * 0.82 }));
        const kAttract = 0.045;
        const kRepel = 1800; // Increased repulsion to spread nodes further apart
        const kGravity = 0.012;
        const center = { x: 450, y: 340 };

        // 1. Repel nodes
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const n1 = nextNodes[i];
            const n2 = nextNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 0.1;
            const dist = Math.sqrt(distSq);
            if (dist < 250) {
              const force = kRepel / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              nextNodes[i].vx -= fx;
              nextNodes[i].vy -= fy;
              nextNodes[j].vx += fx;
              nextNodes[j].vy += fy;
            }
          }
        }

        // 2. Attract connected node pairs
        edges.forEach((edge) => {
          const idx1 = nextNodes.findIndex((n) => n.id === edge.source);
          const idx2 = nextNodes.findIndex((n) => n.id === edge.target);
          if (idx1 !== -1 && idx2 !== -1) {
            const n1 = nextNodes[idx1];
            const n2 = nextNodes[idx2];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy + 0.1);
            const restLength = n1.type === 'dir' && n2.type === 'dir' ? 120 : 90; // Spaced nodes further apart
            const force = kAttract * (dist - restLength);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nextNodes[idx1].vx += fx;
            nextNodes[idx1].vy += fy;
            nextNodes[idx2].vx -= fx;
            nextNodes[idx2].vy -= fy;
          }
        });

        // 3. Apply gravity and integrate
        return nextNodes.map((n) => {
          if (n.id === draggedNodeIdRef.current) return n;

          const gdx = center.x - n.x;
          const gdy = center.y - n.y;
          const vx = n.vx + gdx * kGravity;
          const vy = n.vy + gdy * kGravity;

          const speed = Math.sqrt(vx * vx + vy * vy);
          const maxSpeed = 8;
          const scale = speed > maxSpeed ? maxSpeed / speed : 1;

          return {
            ...n,
            vx: vx * scale,
            vy: vy * scale,
            x: Math.max(100, Math.min(n.x + vx * scale, 800)),
            y: Math.max(40, Math.min(n.y + vy * scale, 680))
          };
        });
      });

      animFrameId = requestAnimationFrame(updatePhysics);
    };

    animFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animFrameId);
  }, [edges, nodes.length]);

  // Calculate dynamic bounding box values to center and auto-zoom the viewBox around the nodes
  let minX = 350, maxX = 550, minY = 240, maxY = 440;
  if (nodes.length > 0) {
    minX = Math.min(...nodes.map((n) => n.x));
    maxX = Math.max(...nodes.map((n) => n.x));
    minY = Math.min(...nodes.map((n) => n.y));
    maxY = Math.max(...nodes.map((n) => n.y));
  }
  const padX = 90;
  const padY = 70;
  const viewBoxX = minX - padX;
  const viewBoxY = minY - padY;
  const viewBoxWidth = Math.max(180, (maxX - minX) + padX * 2);
  const viewBoxHeight = Math.max(140, (maxY - minY) + padY * 2);

  const handleMouseDown = (id: string) => {
    setDraggedNodeId(id);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!draggedNodeId || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    const x = viewBoxX + xPct * viewBoxWidth;
    const y = viewBoxY + yPct * viewBoxHeight;

    setNodes((prevNodes) =>
      prevNodes.map((n) => (n.id === draggedNodeId ? { ...n, x: Math.max(100, Math.min(x, 800)), y: Math.max(40, Math.min(y, 680)), vx: 0, vy: 0 } : n))
    );
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Helper function to color code nodes based on type/extension
  const getNodeColor = (node: Node) => {
    if (node.id === '__root__') return 'var(--accent-purple)';
    if (node.type === 'dir') return 'rgba(166, 99, 204, 0.9)'; // Purple directories
    
    const ext = node.label.split('.').pop()?.toLowerCase();
    if (ext === 'md' || ext === 'txt') return '#9d9ca1'; // Neutral text files
    if (ext === 'tsx' || ext === 'ts' || ext === 'js' || ext === 'html') return 'var(--accent-green)'; // Green code components
    if (ext === 'css') return 'var(--accent-cyan)'; // Cyan style configurations
    return '#c3c3c7'; // Standard fallback
  };

  return (
    <div className="file-graph-container" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#09080d' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: draggedNodeId ? 'grabbing' : 'grab' }}
      >
        <defs>
          <radialGradient id="rootNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dirNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(166, 99, 204, 0.7)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgba(166, 99, 204, 0.7)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="codeNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="styleNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fallbackNodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dynamic Connected Lines - Increased Visibility */}
        {edges.map((edge, index) => {
          const sourceNode = nodes.find((n) => n.id === edge.source);
          const targetNode = nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          return (
            <line
              key={index}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke="rgba(255, 255, 255, 0.22)" // More visible stroke opacity
              strokeWidth="1.8" // Stronger line thickness
              strokeDasharray={sourceNode.type === 'dir' && targetNode.type === 'dir' ? 'none' : '3,3'}
            />
          );
        })}

        {/* Dynamic Nodes - Scaled Up Sizes */}
        {nodes.map((node) => {
          const isHovered = hoveredNodeId === node.id;
          const isDragged = draggedNodeId === node.id;
          const isDir = node.type === 'dir';
          const isRoot = node.id === '__root__';
          
          // Significantly larger radii for easy viewing
          let radius = 9.5; // File nodes
          if (isRoot) radius = 13.5; // Root node
          else if (isDir) radius = 11.5; // Directory nodes
          
          const glowRadius = radius * 4.2;

          let glowFill = 'url(#fallbackNodeGlow)';
          if (isRoot) glowFill = 'url(#rootNodeGlow)';
          else if (isDir) glowFill = 'url(#dirNodeGlow)';
          else {
            const color = getNodeColor(node);
            if (color === 'var(--accent-green)') glowFill = 'url(#codeNodeGlow)';
            else if (color === 'var(--accent-cyan)') glowFill = 'url(#styleNodeGlow)';
          }

          const nodeColor = getNodeColor(node);

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onMouseDown={() => handleMouseDown(node.id)}
              style={{ cursor: isDragged ? 'grabbing' : 'grab' }}
            >
              {/* Radial glow background */}
              <circle
                r={glowRadius}
                fill={glowFill}
                style={{
                  pointerEvents: 'none',
                  transform: isHovered || isDragged ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.2s ease-out'
                }}
              />

              {/* Core visual point */}
              <circle
                r={radius}
                fill={nodeColor}
                stroke={isHovered || isDragged ? '#ffffff' : 'rgba(0,0,0,0.5)'}
                strokeWidth={isHovered || isDragged ? '2.5' : '1.5'}
                style={{
                  filter: isHovered || isDragged ? `drop-shadow(0 0 8px ${nodeColor})` : 'none',
                  transition: 'stroke-width 0.15s ease, filter 0.15s ease'
                }}
              />

              {/* Text Label - Bolder and larger font */}
              <text
                y={radius + 15}
                textAnchor="middle"
                fill={isHovered || isDragged ? '#ffffff' : 'rgba(255, 255, 255, 0.85)'}
                style={{
                  fontFamily: 'Jakarta Sans, system-ui, sans-serif',
                  fontSize: '0.82rem', // Increased text size
                  fontWeight: isHovered || isDragged ? '700' : '600', // Bolder font weight
                  pointerEvents: 'none',
                  userSelect: 'none',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.98)'
                }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
