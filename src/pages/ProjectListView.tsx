import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Tag, Badge, message, Tooltip, Modal, Form } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    FolderOutlined,
    GithubOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface ProjectData {
    key: string;
    name: string;
    repoCount: number;
    impactCount: number;
    lastUpdated: string;
    status: 'active' | 'archived';
}

const ProjectListView: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<ProjectData[]>([]);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:3001/projects');
            const mappedData = response.data.map((p: any) => ({
                key: p.id,
                name: p.name,
                repoCount: p.repos ? p.repos.length : 0,
                // Calculate total affected files from nested scans -> impactReports -> summary.affectedFiles.length
                impactCount: p.repos
                    ? p.repos.reduce((acc: number, r: any) =>
                        acc + (r.scans ? r.scans.reduce((sAcc: number, s: any) => {
                            if (!s.impactReports) return sAcc;
                            return sAcc + s.impactReports.reduce((rAcc: number, report: any) => {
                                try {
                                    const summary = typeof report.summary === 'string' ? JSON.parse(report.summary) : report.summary;
                                    return rAcc + (summary.affectedFiles ? summary.affectedFiles.length : 0);
                                } catch (e) {
                                    return rAcc;
                                }
                            }, 0);
                        }, 0) : 0), 0)
                    : 0,
                lastUpdated: new Date(p.createdAt).toLocaleDateString(),
                status: 'active'
            }));
            setProjects(mappedData);
        } catch (error) {
            console.error('Failed to fetch projects', error);
            message.error('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (values: { name: string }) => {
        setConfirmLoading(true);
        try {
            await axios.post('http://localhost:3001/projects', { name: values.name });
            message.success('Project created successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchProjects(); // Refresh list
        } catch (error) {
            console.error('Failed to create project', error);
            message.error('Failed to create project');
        } finally {
            setConfirmLoading(false);
        }
    };

    const columns = [
        {
            title: 'Project Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <FolderOutlined />
                    </div>
                    <span className="font-semibold text-slate-700">{text}</span>
                </div>
            )
        },
        {
            title: 'Repositories',
            dataIndex: 'repoCount',
            key: 'repoCount',
            render: (count: number) => (
                <Tag icon={<GithubOutlined />} color="default">
                    {count} Repos
                </Tag>
            )
        },
        {
            title: 'Affected Files',
            dataIndex: 'impactCount',
            key: 'impactCount',
            render: (count: number) => (
                count > 0 ? (
                    <Badge count={count} className="site-badge-count-4">
                        <Tag color="error" className="ml-2 font-medium">
                            {count} Files Affected
                        </Tag>
                    </Badge>
                ) : (
                    <Tag color="success">All Good</Tag>
                )
            )
        },
        {
            title: 'Last Updated',
            dataIndex: 'lastUpdated',
            key: 'lastUpdated',
            render: (text: string) => <span className="text-slate-500">{text}</span>
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: ProjectData) => (
                <Button onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${record.key}`);
                }}>
                    View Details
                </Button>
            )
        }
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-1">Projects</h1>
                    <p className="text-slate-500">Manage and monitor code impact across your projects.</p>
                </div>
                <div className="flex gap-4">
                    <Button icon={<ReloadOutlined />} onClick={fetchProjects} loading={loading}>Refresh</Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="bg-blue-600"
                        onClick={() => setIsModalVisible(true)}
                    >
                        New Project
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-gray-100 rounded-xl" bodyStyle={{ padding: 0 }}>
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Search projects..."
                        className="w-64"
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={projects}
                    loading={loading}
                    onRow={(record) => ({
                        onClick: () => navigate(`/projects/${record.key}`),
                        className: 'cursor-pointer hover:bg-slate-50 transition-colors'
                    })}
                    pagination={false}
                    locale={{ emptyText: 'No projects found. Create one to get started!' }}
                />
            </Card>

            <Modal
                title="Create New Project"
                open={isModalVisible}
                onOk={form.submit}
                onCancel={() => setIsModalVisible(false)}
                confirmLoading={confirmLoading}
                okText="Create Project"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateProject}
                >
                    <Form.Item
                        name="name"
                        label="Project Name"
                        rules={[{ required: true, message: 'Please enter a project name' }]}
                    >
                        <Input placeholder="e.g., E-Commerce Platform" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProjectListView;
