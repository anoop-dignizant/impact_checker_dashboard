import React, { useState, useEffect } from 'react';
import GraphView from '../components/GraphView';
import ImpactAlert from '../components/ImpactAlert';
import { getProjects, createProject, addRepo } from '../api';
import { Plus, Folder, GitBranch, Server, Globe, Smartphone, Loader } from 'lucide-react';
import { initializeSocket, disconnectSocket } from '../socket';
import './Dashboard.css';

interface Repository {
    id: string;
    name: string;
    url: string;
    type: string;
    status: string;
    branch: string;
}

interface Project {
    id: string;
    name: string;
    repos: Repository[];
}

interface ImpactDetection {
    projectId: string;
    changedFile: string;
    changedRepo: string;
    affectedFiles: Array<{
        repoId: string;
        filePath: string;
        reason: string;
    }>;
    isBreaking: boolean;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    explanation: string;
    timestamp: string;
}

const Dashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showAddProject, setShowAddProject] = useState(false);
    const [impacts, setImpacts] = useState<ImpactDetection[]>([]);

    // Repo Form
    const [repoName, setRepoName] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    const [repoType, setRepoType] = useState('SERVER');
    const [isAddingRepo, setIsAddingRepo] = useState(false);

    useEffect(() => {
        loadProjects();

        // Initialize WebSocket connection
        const socket = initializeSocket();

        // Listen for repository updates
        socket.on('repository:added', ({ projectId, repository }) => {
            console.log('[WEBSOCKET] Repository added:', repository.name);
            loadProjects();
        });

        socket.on('repository:updated', ({ projectId, repository }) => {
            console.log('[WEBSOCKET] Repository updated:', repository.name, repository.status);
            loadProjects();
        });

        socket.on('graph:updated', ({ projectId }) => {
            console.log('[WEBSOCKET] Graph updated for project:', projectId);
            // Graph will auto-reload via its own effect
        });

        // Listen for impact detection events
        socket.on('impact:detected', (impact: ImpactDetection) => {
            console.log('[WEBSOCKET] Impact detected:', impact);
            setImpacts(prev => [impact, ...prev]);
        });

        return () => {
            disconnectSocket();
        };
    }, []);

    const loadProjects = async () => {
        const res = await getProjects();
        setProjects(res.data);
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        await createProject(newProjectName);
        setNewProjectName('');
        setShowAddProject(false);
        loadProjects();
    };

    const handleAddRepo = async () => {
        if (!selectedProjectId || !repoUrl.trim()) return;
        setIsAddingRepo(true);
        try {
            await addRepo(selectedProjectId, repoName || 'Unnamed Repo', repoUrl, repoType);
            setRepoName('');
            setRepoUrl('');
            loadProjects();
        } finally {
            setIsAddingRepo(false);
        }
    };

    const getRepoIcon = (type: string) => {
        switch (type) {
            case 'SERVER': return <Server size={16} />;
            case 'WEB': return <Globe size={16} />;
            case 'MOBILE': return <Smartphone size={16} />;
            default: return <GitBranch size={16} />;
        }
    };

    const getStatusBadge = (status: string) => {
        const className = `badge badge-${status.toLowerCase()}`;
        return <span className={className}>{status}</span>;
    };

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl text-blue-500">⚡</span>
                                <h1 className="gradient-text m-0">Syncrup</h1>
                            </div>
                            <p className="header-subtitle mt-1">AI-Powered Cross-Repository Impact Analysis</p>
                        </div>
                        <button
                            onClick={loadProjects}
                            className="btn btn-secondary"
                            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>
            </header>

            <div className="dashboard-content">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-section">
                        <div className="section-header">
                            <h2>Projects</h2>
                            <button
                                className="btn-icon"
                                onClick={() => setShowAddProject(!showAddProject)}
                                title="Add Project"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {showAddProject && (
                            <div className="add-project-form">
                                <input
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                    placeholder="Project name"
                                    className="input"
                                    onKeyPress={e => e.key === 'Enter' && handleCreateProject()}
                                />
                                <div className="form-actions">
                                    <button onClick={handleCreateProject} className="btn btn-primary btn-sm">
                                        Create
                                    </button>
                                    <button onClick={() => setShowAddProject(false)} className="btn btn-secondary btn-sm">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="projects-list">
                            {projects.map(project => (
                                <div
                                    key={project.id}
                                    className={`project-card ${selectedProjectId === project.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedProjectId(project.id)}
                                >
                                    <div className="project-header">
                                        <Folder size={18} />
                                        <span className="project-name">{project.name}</span>
                                    </div>
                                    <div className="project-repos">
                                        {project.repos.map(repo => (
                                            <div key={repo.id} className="repo-item">
                                                {getRepoIcon(repo.type)}
                                                <span className="repo-name">{repo.name}</span>
                                                {getStatusBadge(repo.status)}
                                            </div>
                                        ))}
                                        {project.repos.length === 0 && (
                                            <span className="empty-text">No repositories</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <div className="empty-state">
                                    <p>No projects yet</p>
                                    <button onClick={() => setShowAddProject(true)} className="btn btn-secondary btn-sm">
                                        Create your first project
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {/* Impact Alerts */}
                    {impacts.length > 0 && (
                        <div className="impact-alerts-container">
                            <h3>🔔 Impact Alerts</h3>
                            {impacts.map((impact, index) => (
                                <ImpactAlert
                                    key={`${impact.timestamp}-${index}`}
                                    impact={impact}
                                    onDismiss={() => setImpacts(prev => prev.filter((_, i) => i !== index))}
                                />
                            ))}
                        </div>
                    )}

                    {selectedProject && (
                        <div className="add-repo-section">
                            <h3>Add Repository</h3>
                            <div className="repo-form">
                                <input
                                    value={repoName}
                                    onChange={e => setRepoName(e.target.value)}
                                    placeholder="Repository name"
                                    className="input"
                                />
                                <input
                                    value={repoUrl}
                                    onChange={e => setRepoUrl(e.target.value)}
                                    placeholder="Git URL (e.g., https://github.com/user/repo)"
                                    className="input flex-1"
                                />
                                <select
                                    value={repoType}
                                    onChange={e => setRepoType(e.target.value)}
                                    className="select"
                                >
                                    <option value="SERVER">Server</option>
                                    <option value="WEB">Web</option>
                                    <option value="MOBILE">Mobile</option>
                                </select>
                                <button
                                    onClick={handleAddRepo}
                                    className="btn btn-primary"
                                    disabled={isAddingRepo || !repoUrl.trim()}
                                >
                                    {isAddingRepo ? (
                                        <>
                                            <Loader className="loading" size={16} />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} />
                                            Add & Index
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="graph-section">
                        <div className="section-header">
                            <h3>Dependency Graph</h3>
                            <span className="section-subtitle">
                                Visual representation of cross-repository dependencies
                            </span>
                        </div>
                        <div className="graph-wrapper">
                            <GraphView projectId={selectedProjectId || undefined} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
