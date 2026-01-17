import React from 'react';
import { AlertTriangle, X, AlertCircle } from 'lucide-react';
import './ImpactAlert.css';
import ImpactDetails from './ImpactDetails';

interface ImpactAlertProps {
    impact: {
        projectId: string;
        changedFile: string;
        changedRepo: string;
        affectedFiles: Array<{
            repoId: string;
            filePath: string;
            reason: string;
            context?: string;
        }>;
        diff?: {
            oldContent: string;
            newContent: string;
        };
        isBreaking: boolean;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        explanation: string;
        timestamp: string;
    };
    onDismiss: () => void;
}

const ImpactAlert: React.FC<ImpactAlertProps> = ({ impact, onDismiss }) => {

    const getSeverityColor = () => {
        switch (impact.severity) {
            case 'CRITICAL': return '#ef4444';
            case 'HIGH': return '#f59e0b';
            case 'MEDIUM': return '#eab308';
            case 'LOW': return '#10b981';
            default: return '#6366f1';
        }
    };

    const getSeverityIcon = () => {
        if (impact.isBreaking) {
            return <AlertTriangle size={24} color={getSeverityColor()} />;
        }
        return <AlertCircle size={24} color={getSeverityColor()} />;
    };

    return (
        <div className="impact-alert" style={{ borderLeftColor: getSeverityColor() }}>
            <div className="impact-alert-header">
                <div className="impact-alert-title">
                    {getSeverityIcon()}
                    <div>
                        <h4>
                            {impact.isBreaking ? '⚠️ Breaking Change Detected' : '📢 Impact Detected'}
                        </h4>
                        <span className="impact-severity" style={{ color: getSeverityColor() }}>
                            {impact.severity}
                        </span>
                    </div>
                </div>
                <button onClick={onDismiss} className="impact-alert-close">
                    <X size={20} />
                </button>
            </div>

            <div className="impact-alert-body">
                <ImpactDetails impact={impact} />
            </div>

            <div className="impact-alert-footer">
                <span className="impact-timestamp">
                    {new Date(impact.timestamp).toLocaleTimeString()}
                </span>
            </div>
        </div>
    );
};

export default ImpactAlert;
