import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useReactFlow,
} from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';

const DeletableEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}) => {
    const { setEdges } = useReactFlow();
    // Using onEdgesDelete from parent context via ReactFlow instance might be tricky directly,
    // usually we trigger a deletion event or call a function passed down.
    // But standard way is to remove it from state. The onEdgesDelete prop on ReactFlow fires when *deleted*.
    // To initiate delete, we just remove it from edges state.

    // However, our parent relies on onEdgesDelete to trigger the API.
    // If we remove it from state here, ReactFlow's onEdgesDelete might NOT fire if we manually setEdges.
    // Actually, onEdgesDelete fires when edges are removed by backspace/delete key or interactive removal.
    // Manually filtering edges out of state behaves differently.

    // Strategy: We will expose a global event or pass a handler if possible. 
    // Easier: Dispatch a custom event or context. Use the 'deleteElements' function from useReactFlow if available.
    const { deleteElements } = useReactFlow();

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const onEdgeClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        // This triggers React Flows internal deletion which SHOULD fire onEdgesDelete callback
        deleteElements({ edges: [{ id }] });
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    <Button
                        shape="circle"
                        size="small"
                        icon={<CloseOutlined style={{ fontSize: '10px' }} />}
                        danger
                        onClick={onEdgeClick}
                        style={{ width: 20, height: 20, minWidth: 20, border: '1px solid #ffccc7' }}
                    />
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default DeletableEdge;
