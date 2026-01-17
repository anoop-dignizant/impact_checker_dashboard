import React, { useEffect, useState } from 'react';
import { Card, Tag, Collapse, Table, Empty, message, Modal, Form, Input, Select } from 'antd';
import {
    HistoryOutlined,
    SyncOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    PlusOutlined,
    StopOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    MarkerType
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { io } from 'socket.io-client';
import DeletableEdge from '../components/DeletableEdge';
import ImpactDetails from '../components/ImpactDetails';

const edgeTypes = {
    deletable: DeletableEdge,
};

const { Panel } = Collapse;
const { Option } = Select;

interface Repo {
    id: string;
    name: string;
    type: string;
    status: string;
    url: string;
    scans: any[];
}

interface ProjectDetail {
    id: string;
    name: string;
    repos: Repo[];
}

const ProjectDetailView: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isAddRepoModalVisible, setIsAddRepoModalVisible] = useState(false);
    const [repoForm] = Form.useForm();
    const [repoConfirmLoading, setRepoConfirmLoading] = useState(false);

    // React Flow State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Sync nodes with project state (Ensures new Repos appear immediately)
    useEffect(() => {
        if (!project) return;

        setNodes((prevNodes) => {
            const existingNodeMap = new Map(prevNodes.map(n => [n.id, n]));
            const newNodes: Node[] = project.repos.map((repo, index) => {
                const existingNode = existingNodeMap.get(repo.id);

                // Preserve position if exists, otherwise assign new
                const position = existingNode ? existingNode.position : { x: 250, y: 100 + (index * 150) };

                return {
                    id: repo.id,
                    position,
                    data: { label: repo.name },
                    type: repo.type === 'SERVER' ? 'input' : 'default', // Visual distinction
                    style: {
                        background: '#fff',
                        padding: '10px',
                        borderRadius: '8px',
                        border: repo.status === 'UNTRACKED' ? '1px dashed #999' : '1px solid #ddd', // Visual cue for Untracked
                        width: 180,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        opacity: repo.status === 'UNTRACKED' ? 0.7 : 1
                    }
                };
            });
            return newNodes;
        });
    }, [project, setNodes]);

    // WebSocket Connection for Real-time Updates
    useEffect(() => {
        const socket = io('http://localhost:3001');

        socket.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        socket.on('repository:added', (data: { projectId: string, repository: Repo }) => {
            if (data.projectId === id) {
                console.log('Repo added:', data.repository);
                setProject((prev) => {
                    if (!prev) return null;
                    if (prev.repos.find(r => r.id === data.repository.id)) return prev;
                    return { ...prev, repos: [...prev.repos, data.repository] };
                });
                message.success(`New repository added: ${data.repository.name}`);
            }
        });

        socket.on('repository:updated', (data: { projectId: string, repository: Repo }) => {
            if (data.projectId === id) {
                console.log('Repo updated:', data.repository);
                setProject((prev) => {
                    if (!prev) return null;
                    const updatedRepos = prev.repos.map(r =>
                        r.id === data.repository.id ? { ...r, ...data.repository } : r
                    );
                    return { ...prev, repos: updatedRepos };
                });
            }
        });

        socket.on('graph:updated', (data: { projectId: string }) => {
            if (data.projectId === id) {
                console.log('Graph updated, refetching...');
                fetchGraphData();
            }
        });

        socket.on('affected-file:updated', (data: { id: string, repoId: string, status: string, impactReportId: string }) => {
            console.log('Affected file updated:', data);
            setProject((prev) => {
                if (!prev) return null;
                const newRepos = prev.repos.map(repo => {
                    if (repo.id !== data.repoId) return repo;
                    const newScans = repo.scans.map((scan: any) => {
                        const newReports = scan.impactReports.map((report: any) => {
                            if (report.id !== data.impactReportId) return report;
                            // Update the relational affectedFiles array
                            const newAffectedFiles = (report.affectedFiles || []).map((f: any) =>
                                f.id === data.id ? { ...f, status: data.status } : f
                            );
                            return { ...report, affectedFiles: newAffectedFiles };
                        });
                        return { ...scan, impactReports: newReports };
                    });
                    return { ...repo, scans: newScans };
                });
                // Refetch to ensure clean state and verify removal
                fetchProjectDetails();

                return { ...prev, repos: newRepos };
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [id]);

    // Initial Data Fetch
    useEffect(() => {
        if (id) {
            fetchProjectDetails();
            fetchGraphData();
        }
    }, [id]);

    const fetchProjectDetails = async () => {
        try {
            // Since we don't have a single project endpoint, fetch all and filter
            // In a real app, you'd want GET /projects/:id
            const response = await axios.get('http://localhost:3001/projects');
            const foundProject = response.data.find((p: any) => p.id === id);

            if (foundProject) {
                setProject(foundProject);
            } else {
                message.error('Project not found');
                navigate('/');
            }
        } catch (error) {
            console.error('Failed to fetch project details', error);
            message.error('Failed to load project details');
        } finally {
            setLoading(false);
        }
    };

    const fetchGraphData = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/graph?projectId=${id}`);
            processGraphEdges(response.data);
        } catch (error) {
            console.error('Failed to fetch graph', error);
            // Don't show error message for graph as it might be empty initially
        }
    };

    const processGraphEdges = (backendGraph: any) => {
        if (!backendGraph.edges) return;

        // Backend edge: source: "repoId:filePath", target: "repoId:filePath"
        const repoEdgesMap = new Map<string, Edge>();

        if (backendGraph.edges) {
            backendGraph.edges.forEach((edge: any) => {
                const sourceRepoId = edge.source.split(':')[0];
                const targetRepoId = edge.target.split(':')[0];

                // Only create edge if crossing repo boundaries and different repos
                if (sourceRepoId && targetRepoId && sourceRepoId !== targetRepoId) {
                    const edgeId = `e-${sourceRepoId}-${targetRepoId}`;
                    // Avoid duplicate visual edges
                    if (!repoEdgesMap.has(edgeId)) {
                        repoEdgesMap.set(edgeId, {
                            id: edgeId,
                            source: sourceRepoId,
                            target: targetRepoId,
                            animated: true,
                            label: 'Depends On',
                            type: 'deletable', // Use custom type
                            markerEnd: { type: MarkerType.ArrowClosed },
                            style: { stroke: '#b1b1b7' }
                        });
                    }
                }
            });
        }

        setEdges(Array.from(repoEdgesMap.values()));
    };

    const handleAddRepo = async (values: any) => {
        setRepoConfirmLoading(true);
        try {
            await axios.post('http://localhost:3001/repos', {
                projectId: id,
                name: values.name,
                url: values.url,
                type: values.type
            });
            message.success('Repository added successfully');
            setIsAddRepoModalVisible(false);
            repoForm.resetFields();
            fetchProjectDetails();
        } catch (error: any) {
            console.error('Failed to add repository', error);
            if (error.response && error.response.data && error.response.data.error) {
                message.error(error.response.data.error);
            } else {
                message.error('Failed to add repository');
            }
        } finally {
            setRepoConfirmLoading(false);
        }
    };

    // Handle Graph Connection (Manual Topology)
    const onConnect = async (params: any) => {
        const { source, target } = params;
        if (!source || !target || source === target) return;

        // Enforce Server -> Client Logic (or allow any for flexibility, user said "server can connect with web/mobile")
        // We will just persist it for now.

        try {
            await axios.post('http://localhost:3001/dependencies', {
                sourceRepoId: source,
                targetRepoId: target
            });
            message.success('Connected repositories!');
            fetchGraphData(); // Refresh graph to see the official edge
        } catch (error) {
            message.error('Failed to connect repositories');
        }
    };

    const onEdgesDelete = async (edgesToDelete: Edge[]) => {
        if (edgesToDelete.length === 0) return;

        const edge = edgesToDelete[0]; // Handle single deletion for simplicity
        const { source, target } = edge;

        try {
            await axios.delete('http://localhost:3001/dependencies', {
                data: {
                    sourceRepoId: source,
                    targetRepoId: target
                }
            });
            message.success('Connection removed');
            // Graph update checks server-side for status revert and emits events
            // We manually refetch to be sure visual state is clean immediately
            fetchGraphData();
        } catch (error) {
            console.error('Failed to delete dependency', error);
            message.error('Failed to remove connection');
        }
    };

    // Repo Table Columns
    const repoColumns = [
        {
            title: 'Repository',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Repo) => (
                <div>
                    <div className="font-medium text-slate-700">{text}</div>
                    <a href={record.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                        View on Git
                    </a>
                </div>
            )
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => <Tag color="blue">{type}</Tag>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const color = status === 'INDEXED' ? 'success' : status === 'FAILED' ? 'error' : status === 'UNTRACKED' ? 'default' : 'warning';
                const icon = status === 'INDEXED' ? <CheckCircleOutlined /> : status === 'FAILED' ? <CloseCircleOutlined /> : status === 'UNTRACKED' ? <StopOutlined /> : <SyncOutlined spin />;
                return <Tag icon={icon} color={color}>{status}</Tag>;
            }
        }
    ];

    // Helper to get flattened impact history
    const getImpactHistory = () => {
        if (!project) return [];

        const history: any[] = [];
        project.repos.forEach(repo => {
            if (repo.scans) {
                repo.scans.forEach((scan: any) => {
                    if (scan.impactReports) {
                        scan.impactReports.forEach((report: any) => {
                            // Parse summary if it's a string, assuming backend stores JSON string
                            let summaryData = typeof report.summary === 'string'
                                ? JSON.parse(report.summary)
                                : report.summary;

                            // Prefer relational data if available (supports status updates)
                            if (report.affectedFiles && report.affectedFiles.length > 0) {
                                summaryData = {
                                    ...summaryData,
                                    affectedFiles: report.affectedFiles
                                };
                            }

                            // Filter out commits where ALL affected files are resolved/rejected
                            // We only include the report if at least one file is PENDING
                            // OR if the user wants to see history (but requirement says "remove from user panel")
                            const pendingCount = summaryData.affectedFiles ? summaryData.affectedFiles.filter((f: any) => f.status === 'PENDING').length : 0;
                            const totalCount = summaryData.affectedFiles ? summaryData.affectedFiles.length : 0;

                            // If there are files, but none are pending, it means they are all resolved/rejected.
                            // In that case, we skip adding it to history.
                            if (totalCount > 0 && pendingCount === 0) {
                                return;
                            }

                            history.push({
                                key: report.id,
                                repoName: repo.name,
                                repoType: repo.type,
                                commit: scan.commitHash || 'Unknown',
                                date: new Date(report.createdAt),
                                impactCount: pendingCount,
                                details: summaryData
                            });
                        });
                    }
                });
            }
        });

        return history.sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    const impactHistory = getImpactHistory();

    if (loading || !project) {
        return <div className="flex h-screen items-center justify-center">Loading project details...</div>;
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            {/* Premium Top Navigation */}
            {/* Premium Top Navigation */}
            <div className="top-nav">
                <div className="top-nav-title flex items-center gap-2">
                    <span className="text-blue-500 text-2xl">⚡</span>
                    <span className="font-extrabold tracking-tight">Syncrup</span>
                    <span className="text-slate-400 text-sm font-normal ml-2">| {project.name}</span>
                </div>
                <div>
                    <button className="btn-premium" onClick={() => setIsAddRepoModalVisible(true)}>
                        <PlusOutlined style={{ fontSize: '16px' }} />
                        Add Repository
                    </button>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT PANEL: Repo Info & Events */}
                <div className="w-3/5 overflow-y-auto p-6 border-r border-gray-200 bg-gray-50">
                    <Card title="Repositories" className="mb-6 shadow-sm">
                        <Table
                            columns={repoColumns}
                            dataSource={project.repos}
                            pagination={false}
                            rowKey="id"
                            size="small"
                        />
                    </Card>

                    <div className="flex items-center gap-2 mb-4">
                        <HistoryOutlined />
                        <h3 className="text-lg font-semibold text-slate-700 m-0">Impact History</h3>
                    </div>

                    {impactHistory.length > 0 ? (
                        <Collapse defaultActiveKey={['0']} className="bg-white shadow-sm">
                            {impactHistory.map((item, index) => (
                                <Panel
                                    header={
                                        <div className="flex justify-between w-full pr-4">
                                            <span>
                                                <span className="font-semibold">{item.repoName}</span>
                                                <span className="text-gray-400 mx-2">|</span>
                                                Commit {item.commit.substring(0, 7)}
                                            </span>
                                            <span className="text-gray-500 text-xs mt-1">{item.date.toLocaleString()}</span>
                                        </div>
                                    }
                                    key={index}
                                    extra={
                                        <Tag color={item.impactCount > 0 ? "red" : "green"}>
                                            {item.impactCount} Files Affected
                                        </Tag>
                                    }
                                >
                                    {item.impactCount > 0 ? (
                                        <div className="space-y-2">
                                            <ImpactDetails impact={item.details} />
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No files impacted by this change.</p>
                                    )}
                                </Panel>
                            ))}
                        </Collapse>
                    ) : (
                        <Empty description="No impact history recorded yet" />
                    )}
                </div>

                {/* RIGHT PANEL: Dependency Graph */}
                <div className="w-2/5 h-full bg-slate-50 relative border-l border-gray-200">
                    <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur p-2 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="font-semibold text-sm">Project Topology</h3>
                        <p className="text-xs text-gray-500">{nodes.length} Repositories</p>
                    </div>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        edgeTypes={edgeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onEdgesDelete={onEdgesDelete}
                        fitView
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="#ccc" gap={20} />
                        <Controls />
                    </ReactFlow>
                </div>
            </div>

            {/* Add Repo Modal */}
            <Modal
                title="Add Repository"
                open={isAddRepoModalVisible}
                onOk={repoForm.submit}
                onCancel={() => setIsAddRepoModalVisible(false)}
                confirmLoading={repoConfirmLoading}
                okText="Add Repository"
            >
                <Form
                    form={repoForm}
                    layout="vertical"
                    onFinish={handleAddRepo}
                >
                    <Form.Item
                        name="name"
                        label="Repository Name"
                        rules={[{ required: true, message: 'Please enter a repository name' }]}
                    >
                        <Input placeholder="e.g., Backend API" />
                    </Form.Item>
                    <Form.Item
                        name="url"
                        label="Git URL (Local Path or Remote)"
                        rules={[{ required: true, message: 'Please enter the Git URL/path' }]}
                    >
                        <Input placeholder="c:/projects/my-repo" />
                    </Form.Item>
                    <Form.Item
                        name="type"
                        label="Repository Type"
                        rules={[{ required: true, message: 'Please select a type' }]}
                    >
                        <Select placeholder="Select type">
                            <Option value="SERVER">Server / Backend</Option>
                            <Option value="WEB">Web Frontend</Option>
                            <Option value="MOBILE">Mobile App</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectDetailView;
