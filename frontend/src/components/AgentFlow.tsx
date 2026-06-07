import { memo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowProvider,
  type NodeProps,
} from '@xyflow/react';
import { Brain, Eye, Shield, Zap, GitBranch, CheckCircle } from 'lucide-react';

interface AgentFlowProps {
  activeAgent: 'none' | 'gitlab' | 'orchestrator' | 'a11y' | 'security' | 'performance';
  workflowState: 'idle' | 'running' | 'completed';
}

interface AgentNodeData extends Record<string, unknown> {
  label: string;
  agentType: string;
  isActive: boolean;
  isCompleted: boolean;
}

const AGENT_COLORS: Record<string, { primary: string; glow: string; bg: string }> = {
  orchestrator: { primary: '#A663CC', glow: 'rgba(166, 99, 204, 0.4)', bg: 'rgba(166, 99, 204, 0.1)' },
  a11y:         { primary: '#2ecc71', glow: 'rgba(46, 204, 113, 0.4)', bg: 'rgba(46, 204, 113, 0.1)' },
  security:     { primary: '#d63031', glow: 'rgba(214, 48, 49, 0.4)', bg: 'rgba(214, 48, 49, 0.1)' },
  performance:  { primary: '#00bcd4', glow: 'rgba(0, 188, 212, 0.4)', bg: 'rgba(0, 188, 212, 0.1)' },
  gitlab:       { primary: '#ffffff', glow: 'rgba(255, 255, 255, 0.15)', bg: 'rgba(255, 255, 255, 0.04)' },
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <Brain size={18} />,
  a11y:         <Eye size={18} />,
  security:     <Shield size={18} />,
  performance:  <Zap size={18} />,
  gitlab:       <GitBranch size={18} />,
};

function AgentNode({ data }: NodeProps) {
  const agentData = data as unknown as AgentNodeData;
  const colors = AGENT_COLORS[agentData.agentType] || AGENT_COLORS.gitlab;

  return (
    <div
      className={`agent-flow-node ${agentData.agentType} ${agentData.isActive ? 'active' : ''} ${agentData.isCompleted ? 'completed' : ''}`}
      style={{
        background: agentData.isActive
          ? `linear-gradient(135deg, ${colors.bg}, rgba(255,255,255,0.02))`
          : colors.bg,
        border: `1px solid ${agentData.isActive ? colors.primary : `${colors.primary}33`}`,
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#fff',
        boxShadow: agentData.isActive
          ? `0 0 20px ${colors.glow}, 0 4px 15px rgba(0,0,0,0.5)`
          : '0 4px 15px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        transform: agentData.isActive ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.primary, width: 8, height: 8, border: '2px solid #171123', opacity: agentData.isActive ? 1 : 0.5 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: colors.primary, width: 8, height: 8, border: '2px solid #171123', opacity: agentData.isActive ? 1 : 0.5 }} />

      {agentData.isCompleted && (
        <div style={{ position: 'absolute', top: -4, right: -4, color: '#2ecc71', filter: 'drop-shadow(0 0 4px rgba(46,204,113,0.6))' }}>
          <CheckCircle size={16} />
        </div>
      )}

      <div style={{ color: colors.primary, display: 'flex', filter: agentData.isActive ? 'drop-shadow(0 0 6px currentColor)' : 'none', transition: 'filter 0.4s ease' }}>
        {AGENT_ICONS[agentData.agentType]}
      </div>
      <span>{agentData.label}</span>
    </div>
  );
}

const MemoizedAgentNode = memo(AgentNode);

const nodeTypes = { agentNode: MemoizedAgentNode };

const EDGE_AGENT_MAP: Record<string, string> = {
  e1: 'a11y', e4: 'a11y',
  e2: 'security', e5: 'security',
  e3: 'performance', e6: 'performance',
};

const INITIAL_NODES = [
  { id: 'orchestrator', type: 'agentNode', position: { x: 200, y: 0 }, data: { label: 'Orchestrator', agentType: 'orchestrator', isActive: false, isCompleted: false } },
  { id: 'a11y', type: 'agentNode', position: { x: 0, y: 95 }, data: { label: 'A11y Agent', agentType: 'a11y', isActive: false, isCompleted: false } },
  { id: 'security', type: 'agentNode', position: { x: 200, y: 95 }, data: { label: 'Security Agent', agentType: 'security', isActive: false, isCompleted: false } },
  { id: 'performance', type: 'agentNode', position: { x: 400, y: 95 }, data: { label: 'Performance Agent', agentType: 'performance', isActive: false, isCompleted: false } },
  { id: 'gitlab', type: 'agentNode', position: { x: 200, y: 190 }, data: { label: 'GitLab', agentType: 'gitlab', isActive: false, isCompleted: false } },
];

const INITIAL_EDGES = [
  { id: 'e1', source: 'orchestrator', target: 'a11y' },
  { id: 'e2', source: 'orchestrator', target: 'security' },
  { id: 'e3', source: 'orchestrator', target: 'performance' },
  { id: 'e4', source: 'a11y', target: 'gitlab' },
  { id: 'e5', source: 'security', target: 'gitlab' },
  { id: 'e6', source: 'performance', target: 'gitlab' },
];

export function AgentFlow({ activeAgent, workflowState }: AgentFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  useEffect(() => {
    setEdges((prev) =>
      prev.map((e) => {
        const edgeAgent = EDGE_AGENT_MAP[e.id];
        const isActive = edgeAgent === activeAgent;
        return {
          ...e,
          animated: isActive || workflowState === 'completed',
          style: {
            stroke: isActive ? '#A663CC' : workflowState === 'completed' ? '#2ecc71' : 'rgba(255,255,255,0.12)',
            strokeWidth: isActive ? 3 : workflowState === 'completed' ? 2 : 1.5,
            opacity: isActive ? 1 : workflowState === 'completed' ? 0.8 : 0.25,
          },
        };
      })
    );

    setNodes((prev) =>
      prev.map((n) => {
        const agentType = (n.data as AgentNodeData)?.agentType || n.id;
        const isActive = activeAgent === agentType || (activeAgent !== 'none' && n.id === 'orchestrator');
        const isCompleted = workflowState === 'completed';
        return {
          ...n,
          data: { ...n.data, isActive, isCompleted } as AgentNodeData,
        };
      })
    );
  }, [activeAgent, workflowState, setEdges, setNodes]);

  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%', background: '#09080d' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.5}
          maxZoom={2}
          panOnDrag
          zoomOnScroll
          selectNodesOnDrag={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="rgba(255,255,255,0.03)" gap={24} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
        {workflowState === 'completed' && (
          <div style={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)',
            borderRadius: '8px', padding: '8px 16px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem',
            color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '6px',
            pointerEvents: 'none', zIndex: 5,
          }}>
            <CheckCircle size={14} /> All agents completed
          </div>
        )}
      </div>
    </ReactFlowProvider>
  );
}
