import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
    type Node,
    type Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getGraph } from '../api';
import './GraphView.css';

interface GraphData {
    nodes: Array<{
        id: string;
        type: string;
        label: string;
        metadata?: any;
    }>;
    edges: Array<{
        source: string;
        target: string;
        type: string;
    }>;
}

interface GraphViewProps {
    projectId?: string;
}

const GraphView: React.FC<GraphViewProps> = ({ projectId }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);

    const getNodeColor = (nodeId: string, nodeType: string) => {
        // Extract repo ID from node ID
        const repoId = nodeId.split(':')[0];

        // Different colors for different repos
        const colors: Record<string, string> = {};
        const repoColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

        if (!colors[repoId]) {
            const colorIndex = Object.keys(colors).length % repoColors.length;
            colors[repoId] = repoColors[colorIndex];
        }

        return colors[repoId] || '#6366f1';
    };

    const getNodeStyle = (nodeType: string, nodeId: string) => {
        const baseColor = getNodeColor(nodeId, nodeType);

        return {
            background: nodeType === 'FILE' ? baseColor : `${baseColor}dd`,
            color: '#fff',
            border: `2px solid ${baseColor}`,
            borderRadius: nodeType === 'FILE' ? '8px' : '20px',
            padding: '12px 16px',
            fontSize: '12px',
            fontWeight: '500',
            boxShadow: `0 4px 12px ${baseColor}40`,
            minWidth: nodeType === 'FILE' ? '150px' : '120px',
        };
    };

    const loadGraph = useCallback(async () => {
        if (!projectId) {
            setNodes([]);
            setEdges([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await getGraph(projectId);
            const graphData: GraphData = response.data;

            if (!graphData.nodes || graphData.nodes.length === 0) {
                setNodes([]);
                setEdges([]);
                setLoading(false);
                return;
            }

            // Convert to React Flow format
            const flowNodes: Node[] = graphData.nodes.map((node, index) => {
                // Calculate circular layout
                const angle = (index / graphData.nodes.length) * 2 * Math.PI;
                const radius = 300;

                // Extract just the file name from the full path
                const fileName = node.label.split('\\').pop()?.split('/').pop() || node.label;

                return {
                    id: node.id,
                    type: 'default',
                    data: {
                        label: (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '16px' }}>
                                    {node.type === 'FILE' ? '📄' : '⚡'}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                                    {fileName}
                                </div>
                                {node.type === 'FUNCTION' && (
                                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                                        function
                                    </div>
                                )}
                            </div>
                        )
                    },
                    position: {
                        x: 400 + radius * Math.cos(angle),
                        y: 300 + radius * Math.sin(angle),
                    },
                    style: getNodeStyle(node.type, node.id),
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                };
            });

            const flowEdges: Edge[] = graphData.edges.map((edge, index) => {
                // Get file names for edge label
                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                const sourceName = sourceNode?.label.split('\\').pop()?.split('/').pop() || '';
                const targetName = targetNode?.label.split('\\').pop()?.split('/').pop() || '';

                return {
                    id: `edge-${index}`,
                    source: edge.source,
                    target: edge.target,
                    type: 'smoothstep',
                    animated: edge.type === 'IMPORTS',
                    style: {
                        stroke: edge.type === 'IMPORTS' ? '#6366f1' : edge.type === 'DEFINES' ? '#8b5cf6' : '#10b981',
                        strokeWidth: 2,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: edge.type === 'IMPORTS' ? '#6366f1' : edge.type === 'DEFINES' ? '#8b5cf6' : '#10b981',
                    },
                    label: edge.type,
                    labelStyle: {
                        fontSize: '11px',
                        fill: '#cbd5e1',
                        fontWeight: '600',
                    },
                    labelBgStyle: {
                        fill: '#1e293b',
                        fillOpacity: 0.95,
                        rx: 4,
                        ry: 4,
                    },
                };
            });

            setNodes(flowNodes);
            setEdges(flowEdges);
        } catch (error) {
            console.error('Failed to load graph:', error);
        } finally {
            setLoading(false);
        }
    }, [setNodes, setEdges, projectId]);

    useEffect(() => {
        loadGraph();

        // Listen for graph updates via WebSocket
        import('../socket').then(({ getSocket }) => {
            const socket = getSocket();

            if (socket && projectId) {
                const handleGraphUpdate = ({ projectId: updatedProjectId }: { projectId: string }) => {
                    if (updatedProjectId === projectId) {
                        console.log('[GRAPH] Reloading graph due to WebSocket update');
                        loadGraph();
                    }
                };

                socket.on('graph:updated', handleGraphUpdate);

                return () => {
                    socket.off('graph:updated', handleGraphUpdate);
                };
            }
        });
    }, [loadGraph, projectId]);

    if (loading) {
        return (
            <div className="graph-loading">
                <div className="loading-spinner"></div>
                <p>Loading dependency graph...</p>
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div className="graph-empty">
                <div className="empty-icon">📊</div>
                <h3>No Graph Data</h3>
                <p>Add and index repositories to see the dependency graph</p>
            </div>
        );
    }

    return (
        <div className="graph-container">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                attributionPosition="bottom-left"
            >
                <Background color="#334155" gap={16} />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        const style = node.style as any;
                        return style?.background || '#6366f1';
                    }}
                    maskColor="rgba(15, 23, 42, 0.8)"
                />
            </ReactFlow>
        </div>
    );
};

export default GraphView;
