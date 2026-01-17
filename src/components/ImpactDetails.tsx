import React, { useState } from 'react';
import { FileCode, Eye, EyeOff, Check, X } from 'lucide-react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import axios from 'axios';
import '../components/ImpactAlert.css'; // Reuse existing styles

const API_URL = 'http://localhost:3001';

interface ImpactDetailsProps {
    impact: {
        changedFile: string;
        affectedFiles: Array<{
            id?: string;
            repoId: string;
            repoName?: string;
            filePath: string;
            reason: string;
            context?: string;
            status?: string;
        }>;
        affectedFrontendFiles?: Array<{
            filename: string;
            repo?: string;
            line: number;
            raw_line?: string;
            snippet?: string;
            context_lines?: Array<{
                line_number: number;
                content: string;
                is_affected: boolean;
            }>;
        }>;
        apiChanges?: {
            removed_endpoints: string[];
            added_endpoints: string[];
            changed_endpoints: string[];
            is_breaking: boolean;
        } | null;
        diff?: {
            oldContent: string;
            newContent: string;
        };
        explanation: string;
    };
}

const ImpactDetails: React.FC<ImpactDetailsProps> = ({ impact }) => {
    const [showDiff, setShowDiff] = React.useState(false);
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

    const handleAction = async (id: string | undefined, status: 'RESOLVED' | 'REJECTED') => {
        if (!id) return;

        // Optimistic UI update: Hide immediately
        setHiddenIds(prev => new Set(prev).add(id));

        try {
            await axios.patch(`${API_URL}/impacts/file/${id}/status`, { status });
        } catch (error) {
            console.error('Failed to update status:', error);
            // Revert if failed (optional, but good practice)
            setHiddenIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    // Filter out hidden (resolved/rejected) files
    const visibleFiles = (impact.affectedFiles || []).filter(f => {
        if (f.id && hiddenIds.has(f.id)) return false;
        if (f.status && f.status !== 'PENDING') return false;
        return true;
    });

    // Merge standard affected files with rich frontend affected files
    // If a file exists in both, we'll prefer the rich frontend data
    const richFrontendFiles = impact.affectedFrontendFiles || [];

    // Create a unified list of unique files to display
    const fileDisplays = [
        ...visibleFiles.map(f => ({
            filePath: f.filePath,
            reason: f.reason,
            id: f.id,
            type: 'dependency' as const,
            context: f.context,
            repo: f.repoName,
            contextLines: undefined
        })),
        ...richFrontendFiles.map(f => ({
            filePath: f.filename,
            reason: 'API Contract Breakage',
            id: `fe-${f.filename}-${f.line}`,
            type: 'api' as const,
            contextLines: f.context_lines,
            context: undefined,
            repo: f.repo
        }))
    ];

    return (
        <div className="impact-details-container">
            <div className="impact-changed-file">
                <FileCode size={16} />
                <span className="flex items-center">
                    <strong>Changed:</strong> {impact.changedFile ? impact.changedFile.split('/').pop() : 'Unknown File'}
                    {impact.apiChanges && impact.apiChanges.removed_endpoints.length > 0 && (
                        <span className="api-contract-badge">Contract Changed</span>
                    )}
                </span>
                {impact.diff && (
                    <button
                        className="impact-diff-toggle"
                        onClick={() => setShowDiff(!showDiff)}
                    >
                        {showDiff ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showDiff ? 'Hide Diff' : 'View Diff'}
                    </button>
                )}
            </div>

            {showDiff && impact.diff && (
                <div className="impact-diff-viewer" style={{ maxHeight: '400px', overflow: 'auto', margin: '10px 0', border: '1px solid #eee', borderRadius: '4px' }}>
                    <ReactDiffViewer
                        oldValue={impact.diff.oldContent}
                        newValue={impact.diff.newContent}
                        splitView={true}
                        compareMethod={DiffMethod.WORDS}
                        styles={{
                            variables: {
                                dark: {
                                    diffViewerBackground: '#fff',
                                }
                            }
                        }}
                    />
                </div>
            )}

            <p className="impact-explanation" style={{ marginTop: '10px', marginBottom: '10px' }}>{impact.explanation}</p>

            {fileDisplays.length > 0 ? (
                <div className="impact-affected-files">
                    <strong>Impact Points ({fileDisplays.length}):</strong>
                    <ul className="space-y-4">
                        {fileDisplays.map((file, index) => (
                            <li key={file.id || index} className="group relative border border-slate-200 rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="impact-file-info flex-1">
                                        <div className="flex items-center gap-2">
                                            <FileCode size={14} className={file.type === 'api' ? 'text-pink-500' : 'text-slate-400'} />
                                            <span className="font-semibold text-slate-700">
                                                {file.filePath.split('/').pop() || file.filePath.split('\\').pop()}
                                            </span>
                                            {file.repo && (
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider border border-slate-200">
                                                    {file.repo}
                                                </span>
                                            )}
                                        </div>
                                        <span className="file-reason text-xs text-slate-500 mt-0.5 block">{file.reason}</span>
                                    </div>
                                    {file.type === 'dependency' && file.id && !file.id.startsWith('fe-') && (
                                        <div className="flex gap-2 ml-4 shrink-0">
                                            <button
                                                onClick={() => handleAction(file.id, 'RESOLVED')}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all shadow-sm font-medium text-xs whitespace-nowrap"
                                            >
                                                <Check size={14} />
                                                Accept
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {file.type === 'api' && file.contextLines ? (
                                    <div className="file-context-container mt-2 bg-slate-50 rounded border border-slate-100 overflow-hidden font-mono text-[11px]">
                                        {file.contextLines.map((lineObj, idx) => (
                                            <div key={idx} className={`code-line flex border-b border-slate-100 last:border-0 ${lineObj.is_affected ? 'bg-rose-50 border-l-2 border-l-rose-500' : ''}`}>
                                                <div className="line-number w-8 py-1 pr-2 text-right text-slate-400 select-none bg-slate-100/50">{lineObj.line_number}</div>
                                                <div className="line-content py-1 px-3 whitespace-pre text-slate-700">{lineObj.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : file.type === 'dependency' && file.context && (
                                    <pre className="file-context-container mt-2 bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px] text-slate-600 whitespace-pre-wrap">
                                        {file.context}
                                    </pre>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="text-gray-500 italic text-sm mt-2 font-light">
                    Clear scan. No active issues detected.
                </div>
            )}
        </div>
    );
};

export default ImpactDetails;
