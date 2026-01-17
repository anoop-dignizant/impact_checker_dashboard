import React from 'react';
import { Layout, Menu, Avatar, Breadcrumb, Typography } from 'antd';
import {
    ProjectOutlined,
    DashboardOutlined,
    SettingOutlined,
    UserOutlined,
    BellOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const getSelectedKey = () => {
        const path = location.pathname;
        if (path === '/' || path.startsWith('/projects')) return '1';
        if (path.startsWith('/settings')) return '2';
        return '1';
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                width={250}
                theme="light"
                style={{
                    boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
                    zIndex: 10
                }}
            >
                <div className="flex items-center justify-center h-16 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">S</span>
                        </div>
                        <span className="text-lg font-bold text-slate-800">SyncUp</span>
                    </div>
                </div>

                <Menu
                    mode="inline"
                    selectedKeys={[getSelectedKey()]}
                    style={{ borderRight: 0, padding: '16px 0' }}
                    items={[
                        {
                            key: '1',
                            icon: <ProjectOutlined />,
                            label: 'Projects',
                            onClick: () => navigate('/')
                        },
                        {
                            key: '2',
                            icon: <SettingOutlined />,
                            label: 'Settings',
                            onClick: () => navigate('/settings')
                        }
                    ]}
                />
            </Sider>

            <Layout>
                <Header
                    className="bg-white border-b border-gray-100 flex items-center justify-between px-6"
                    style={{ height: '64px', background: '#fff', padding: '0 24px' }}
                >
                    <Breadcrumb
                        items={[
                            { title: 'Dashboard' },
                            { title: 'Projects' }
                        ]}
                    />

                    <div className="flex items-center gap-4">
                        <div className="relative cursor-pointer hover:text-blue-600 transition-colors">
                            <BellOutlined style={{ fontSize: '18px', color: '#64748b' }} />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                            <Avatar icon={<UserOutlined />} className="bg-blue-50" style={{ color: '#2563eb' }} />
                            <div className="hidden md:block leading-none">
                                <div className="text-sm font-medium text-slate-700">Admin User</div>
                                <div className="text-xs text-slate-400">Engineering Lead</div>
                            </div>
                        </div>
                    </div>
                </Header>

                <Content style={{ margin: '24px 24px', minHeight: 280 }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default DashboardLayout;
