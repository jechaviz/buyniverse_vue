
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Job, File as ProjectFile, User, File, FileCategory } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppState, useAppDispatch } from '@/context/AppStateContext';
import Tooltip from '@/components/ui/Tooltip';
import { useTheme } from '@/context/ThemeContext';

type FileTreeNode = ProjectFile & { nodeType: 'file' } | { name: string; nodeType: 'folder'; children: FileTreeNode[]; path: string };

const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'md') return 'fa-brands fa-markdown text-cyan-400';
    if (extension === 'json') return 'fa-solid fa-brackets-curly text-yellow-400';
    if (['doc', 'docx'].includes(extension || '')) return 'fa-regular fa-file-word text-blue-400';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(extension || '')) return 'fa-regular fa-file-image text-purple-400';
    if (extension === 'fig') return 'fa-brands fa-figma text-pink-500';
    return 'fa-regular fa-file-lines text-slate-400';
};

const buildFileTree = (files: ProjectFile[]): FileTreeNode[] => {
    const root: { [key: string]: any } = {};
    
    files.forEach(file => {
        const pathParts = file.path.split('/').filter(p => p);
        let currentLevel = root;
        let builtPath = '';
        pathParts.forEach(part => {
            builtPath += part + '/';
            if (!currentLevel[part]) {
                currentLevel[part] = { name: part, nodeType: 'folder', children: {}, path: builtPath };
            }
            currentLevel = currentLevel[part].children;
        });
    });
    
    [...files].sort((a,b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name)).forEach(file => {
        if (file.name === '.placeholder' && file.type === 'system/folder') return;
        const pathParts = file.path.split('/').filter(p => p);
        let currentLevel = root;
        pathParts.forEach(part => {
            currentLevel = currentLevel[part].children;
        });
        currentLevel[file.name] = { ...file, nodeType: 'file' };
    });

    const convertTreeToArray = (node: { [key: string]: any }): FileTreeNode[] => {
        return Object.values(node).sort((a, b) => {
            if (a.nodeType === b.nodeType) return a.name.localeCompare(b.name);
            return a.nodeType === 'folder' ? -1 : 1;
        }).map((child: any) => {
            if (child.nodeType === 'folder') {
                return { ...child, children: convertTreeToArray(child.children) };
            }
            return child;
        });
    };

    return convertTreeToArray(root);
};

const getUniqueNodeName = (baseName: string, path: string, existingFiles: ProjectFile[]): string => {
    const siblingNodes = new Set<string>();
    
    existingFiles.forEach(f => {
        if (f.path === path) {
            siblingNodes.add(f.name);
        } else if (f.path.startsWith(path) && f.path.length > path.length) {
             const relativePath = f.path.substring(path.length);
             const folderName = relativePath.split('/')[0];
             if(folderName) siblingNodes.add(folderName);
        }
    });

    let newName = baseName;
    let counter = 1;
    const isFile = baseName.includes('.');
    const parts = baseName.split('.');
    const extension = isFile ? `.${parts.pop()}` : '';
    const name = isFile ? parts.join('.') : baseName;
    
    while (siblingNodes.has(newName)) {
        newName = `${name} (${counter})${extension}`;
        counter++;
    }
    return newName;
};

const FileTreeView: React.FC<{
    nodes: FileTreeNode[];
    onSelectFile: (id: string) => void;
    activeTabId: string | null;
    openFolders: Record<string, boolean>;
    toggleFolder: (path: string) => void;
    level: number;
    handleCreateNode: (type: 'file' | 'folder', path: string) => void;
    renamingNode: FileTreeNode | null;
    setRenamingNode: (node: FileTreeNode | null) => void;
    finishRename: (node: FileTreeNode, newName: string) => void;
    handleDeleteNode: (node: FileTreeNode) => void;
}> = (props) => {
    const { nodes, onSelectFile, activeTabId, openFolders, toggleFolder, level, handleCreateNode, renamingNode, setRenamingNode, finishRename, handleDeleteNode } = props;
    const { t } = useTranslation();
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        if (renamingNode) {
            setRenameValue(renamingNode.name);
        }
    }, [renamingNode]);

    const handleFinishRename = () => {
        if (renamingNode) {
            finishRename(renamingNode, renameValue);
        }
    };
    
    const isNodeRenaming = (node: FileTreeNode) => {
        return renamingNode?.path === node.path && renamingNode?.name === node.name;
    }

    return (
        <>
            {nodes.map(node => (
                <div key={node.path + node.name}>
                    {node.nodeType === 'folder' ? (
                        <div>
                           <div className="flex justify-between items-center group pr-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                                <button onClick={() => toggleFolder(node.path)} className="flex items-center gap-2 p-1 flex-grow text-left" style={{ paddingLeft: `${level * 12}px` }}>
                                    <i className={`fa-solid fa-chevron-right text-xs transition-transform ${openFolders[node.path] ? 'rotate-90' : ''}`}></i>
                                    <i className="fa-solid fa-folder text-amber-400"></i>
                                    {isNodeRenaming(node) ? (
                                        <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={handleFinishRename} onKeyDown={e => { if (e.key === 'Enter') handleFinishRename(); if (e.key === 'Escape') setRenamingNode(null); }} autoFocus onClick={e => e.stopPropagation()} className="text-sm bg-white dark:bg-slate-900 border border-primary-500 rounded px-1"/>
                                    ) : (
                                        <span className="text-sm">{node.name}</span>
                                    )}
                                </button>
                                <div className="hidden group-hover:flex items-center gap-1">
                                    <Tooltip content={t('pages.project.details.newFile')}><button onClick={() => handleCreateNode('file', node.path)} className="w-6 h-6 rounded hover:bg-slate-300 dark:hover:bg-slate-600"><i className="fa-solid fa-file-circle-plus"></i></button></Tooltip>
                                    <Tooltip content={t('pages.project.details.newFolder')}><button onClick={() => handleCreateNode('folder', node.path)} className="w-6 h-6 rounded hover:bg-slate-300 dark:hover:bg-slate-600"><i className="fa-solid fa-folder-plus"></i></button></Tooltip>
                                    <Tooltip content={t('pages.project.details.rename')}><button onClick={() => setRenamingNode(node)} className="w-6 h-6 rounded hover:bg-slate-300 dark:hover:bg-slate-600"><i className="fa-solid fa-pen-to-square"></i></button></Tooltip>
                                    <Tooltip content={t('pages.project.details.delete')}><button onClick={() => handleDeleteNode(node)} className="w-6 h-6 rounded hover:bg-slate-300 dark:hover:bg-slate-600"><i className="fa-solid fa-trash-can"></i></button></Tooltip>
                                </div>
                           </div>
                            {openFolders[node.path] && (
                                <FileTreeView {...props} nodes={node.children} level={level + 1} />
                            )}
                        </div>
                    ) : (
                        <div className={`flex justify-between items-center group pr-1 rounded ${activeTabId === node.id ? 'bg-primary-100 dark:bg-primary-900/50' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                             <button onClick={() => onSelectFile(node.id)} className={`w-full text-left flex items-center gap-2 p-1`} style={{ paddingLeft: `${level * 12}px` }}>
                                <i className={getFileIcon(node.name)}></i>
                                {isNodeRenaming(node) ? (
                                    <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={handleFinishRename} onKeyDown={e => { if (e.key === 'Enter') handleFinishRename(); if (e.key === 'Escape') setRenamingNode(null); }} autoFocus onClick={e => e.stopPropagation()} className="text-sm bg-white dark:bg-slate-900 border border-primary-500 rounded px-1"/>
                                ) : (
                                    <span className="text-sm">{node.name}</span>
                                )}
                            </button>
                             <div className="hidden group-hover:flex items-center gap-1">
                                <Tooltip content={t('pages.project.details.rename')}><button onClick={() => setRenamingNode(node)} className="w-6 h-6 rounded hover:bg-slate-300 dark:hover:bg-slate-600"><i className="fa-solid fa-pen-to-square"></i></button></Tooltip>
                                <Tooltip content={t('pages.project.details.delete')}><button onClick={() => handleDeleteNode(node)} className="w-6 h-6 rounded hover:bg-slate-300 dark:hover:bg-slate-600"><i className="fa-solid fa-trash-can"></i></button></Tooltip>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </>
    );
};

const MarkdownToolbar: React.FC<{
    editorRef: React.RefObject<HTMLTextAreaElement>;
    onContentChange: (value: string) => void;
}> = ({ editorRef, onContentChange }) => {
    const { t } = useTranslation();
    const handleInsertMarkdown = (syntax: { prefix: string; suffix: string; block?: boolean }) => {
        const editor = editorRef.current;
        if (!editor) return;

        const { selectionStart, selectionEnd, value } = editor;
        const selectedText = value.substring(selectionStart, selectionEnd);

        let newText;
        if (syntax.block) {
            newText = `${value.substring(0, selectionStart)}${syntax.prefix}${selectedText}\n${value.substring(selectionEnd)}`;
        } else {
            newText = `${value.substring(0, selectionStart)}${syntax.prefix}${selectedText}${syntax.suffix}${value.substring(selectionEnd)}`;
        }
        
        onContentChange(newText);
        
        // This is a bit tricky, we need to wait for react to update the value
        setTimeout(() => {
            editor.focus();
            editor.selectionStart = selectionStart + syntax.prefix.length;
            editor.selectionEnd = selectionEnd + syntax.prefix.length;
        }, 0);
    };

    const toolbarItems = [
        { icon: 'fa-bold', syntax: { prefix: '**', suffix: '**' }, title: t('pages.project.details.bold') },
        { icon: 'fa-italic', syntax: { prefix: '_', suffix: '_' }, title: t('pages.project.details.italic') },
        { icon: 'fa-strikethrough', syntax: { prefix: '~~', suffix: '~~' }, title: t('pages.project.details.strikethrough') },
        { separator: true },
        { icon: 'fa-heading', level: 1, syntax: { prefix: '# ', suffix: '' }, title: t('pages.project.details.heading1') },
        { icon: 'fa-heading', level: 2, syntax: { prefix: '## ', suffix: '' }, title: t('pages.project.details.heading2') },
        { icon: 'fa-heading', level: 3, syntax: { prefix: '### ', suffix: '' }, title: t('pages.project.details.heading3') },
        { separator: true },
        { icon: 'fa-list-ul', syntax: { prefix: '- ', suffix: '' }, title: t('pages.project.details.bulletList') },
        { icon: 'fa-list-ol', syntax: { prefix: '1. ', suffix: '' }, title: t('pages.project.details.numberedList') },
        { icon: 'fa-quote-left', syntax: { prefix: '> ', suffix: '' }, title: t('pages.project.details.quote') },
        { icon: 'fa-code', syntax: { prefix: '```\n', suffix: '\n```' }, title: t('pages.project.details.codeBlock') },
    ];

    return (
        <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50">
            {toolbarItems.map((item, index) =>
                item.separator ? (
                    <div key={index} className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                ) : (
                    <Tooltip content={item.title} key={index}>
                        <button
                            onClick={() => handleInsertMarkdown(item.syntax as any)}
                            className="w-8 h-8 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            <i className={`fa-solid ${item.icon}`}></i>
                        </button>
                    </Tooltip>
                )
            )}
        </div>
    );
};

const FileEditorView: React.FC<{ project: Job, initiallySelectedFileId?: string | null }> = ({ project, initiallySelectedFileId }) => {
    const { t } = useTranslation();
    const { currentUser } = useAppState();
    const dispatch = useAppDispatch();
    
    const [openTabs, setOpenTabs] = useState<string[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({'docs/': true});
    const [editedContent, setEditedContent] = useState<Record<string, string>>({});
    const [renamingNode, setRenamingNode] = useState<FileTreeNode | null>(null);
    const [isExplorerVisible, setExplorerVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const debounceTimeout = useRef<number | null>(null);
    const editorRef = useRef<HTMLTextAreaElement>(null);

    const fileTree = useMemo(() => buildFileTree(project.files || []), [project.files]);
    const activeFile = useMemo(() => project.files?.find(f => f.id === activeTabId), [project.files, activeTabId]);
    
     useEffect(() => {
        if (initiallySelectedFileId) {
            handleSelectFile(initiallySelectedFileId);
        }
    }, [initiallySelectedFileId]);

    const debouncedSave = useCallback((fileId: string, content: string) => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = window.setTimeout(() => {
            dispatch({ type: 'UPDATE_FILE_CONTENT', payload: { projectId: project.id, fileId, newContent: content } });
        }, 1000);
    }, [dispatch, project.id]);
    
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, []);

    const handleSelectFile = (fileId: string) => {
        if (!openTabs.includes(fileId)) {
            setOpenTabs(prev => [...prev, fileId]);
        }
        setActiveTabId(fileId);
    };

    const handleCloseTab = (fileId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const tabIndex = openTabs.indexOf(fileId);
        setOpenTabs(prev => prev.filter(id => id !== fileId));
        if (activeTabId === fileId) {
            const newActiveId = openTabs[tabIndex - 1] || openTabs[tabIndex + 1] || null;
            setActiveTabId(newActiveId);
        }
    };
    
    const handleContentChange = (value: string) => {
        if (!activeTabId) return;
        setEditedContent(prev => ({ ...prev, [activeTabId]: value }));
        debouncedSave(activeTabId, value);
    };

    const toggleFolder = (path: string) => setOpenFolders(prev => ({...prev, [path]: !prev[path]}));

    const handleCreateNode = (type: 'file' | 'folder', path: string) => {
        const baseName = type === 'file' ? 'untitled.md' : 'New Folder';
        const newName = getUniqueNodeName(baseName, path, project.files || []);

        if (type === 'file') {
            const newFile: Omit<File, 'id' | 'uploadedAt' | 'uploadedById'| 'size'> = {
                name: newName, path, content: '# New Document', type: 'text/markdown', status: 'Modified', category: FileCategory.Documentation
            };
            dispatch({ type: 'CREATE_NEW_FILE', payload: { projectId: project.id, file: newFile }});
        } else {
             const newFolderPath = `${path}${newName}/`;
             dispatch({ type: 'CREATE_NEW_FOLDER', payload: { projectId: project.id, folderPath: newFolderPath }});
             setOpenFolders(prev => ({ ...prev, [path]: true, [newFolderPath]: true }));
        }
    };

    const finishRename = (node: FileTreeNode, newName: string) => {
        if (newName && newName !== node.name) {
            dispatch({ type: 'RENAME_NODE', payload: { projectId: project.id, nodeId: node.nodeType === 'file' ? node.id : node.path, nodeType: node.nodeType, newName }});
        }
        setRenamingNode(null);
    };

    const handleDeleteNode = (node: FileTreeNode) => {
        const type = node.nodeType === 'file' ? 'File' : 'Folder';
        if (window.confirm(t('pages.project.details.confirmDeleteNodeText', { name: node.name }))) {
            dispatch({ type: 'DELETE_NODE', payload: { projectId: project.id, nodeId: node.nodeType === 'file' ? node.id : node.path, nodeType: node.nodeType } });
            if (node.nodeType === 'file' && openTabs.includes(node.id)) {
                handleCloseTab(node.id, { stopPropagation: () => {} } as React.MouseEvent);
            }
        }
    };
    
    const handleUploadClick = () => fileInputRef.current?.click();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        dispatch({
            type: 'UPLOAD_FILE',
            payload: {
                projectId: project.id,
                file: {
                    id: `file-${Date.now()}`, name: file.name, path: '/', size: file.size, type: file.type,
                    uploadedAt: new Date(), uploadedById: currentUser.id, status: 'Modified',
                    category: FileCategory.Documentation,
                }
            }
        });
        
        event.target.value = ''; // Reset file input
    };

    const renderBreadcrumbs = () => {
        if (!activeFile) return null;
        const parts = activeFile.path.split('/').filter(Boolean);
        return (
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        <span>{part}</span>
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                    </React.Fragment>
                ))}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{activeFile.name}</span>
            </div>
        );
    };

    return (
        <div className={isFullscreen ? 'fixed inset-0 z-50' : 'relative h-[75vh]'}>
            <div className="flex h-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg overflow-hidden">
                {isExplorerVisible && (
                    <div className="w-64 border-r dark:border-slate-700 flex flex-col shrink-0 transition-all duration-300 bg-slate-50 dark:bg-slate-800/50">
                        <div className="p-2 border-b dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-sm uppercase px-2">{t('pages.project.details.explorer')}</h3>
                            <div className="flex items-center">
                                <Tooltip content={t('pages.project.details.uploadFile')}><button onClick={handleUploadClick} className="w-7 h-7 rounded hover:bg-slate-200 dark:hover:bg-slate-700"><i className="fa-solid fa-cloud-arrow-up"></i></button></Tooltip>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            </div>
                        </div>
                        <div className="flex-grow p-1 overflow-y-auto">
                            <FileTreeView nodes={fileTree} onSelectFile={handleSelectFile} activeTabId={activeTabId} openFolders={openFolders} toggleFolder={toggleFolder} level={0} handleCreateNode={handleCreateNode} renamingNode={renamingNode} setRenamingNode={setRenamingNode} finishRename={finishRename} handleDeleteNode={handleDeleteNode} />
                        </div>
                    </div>
                )}
                <div className="flex-grow flex flex-col overflow-hidden">
                     <div className="border-b dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center overflow-x-auto">
                            {openTabs.map(tabId => {
                                const file = project.files?.find(f => f.id === tabId);
                                if (!file) return null;
                                return (
                                    <button key={tabId} onClick={() => setActiveTabId(tabId)} className={`flex items-center gap-2 px-3 py-2 border-r dark:border-slate-700 text-sm whitespace-nowrap ${activeTabId === tabId ? 'bg-white dark:bg-slate-800 text-primary-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                        <i className={getFileIcon(file.name)}></i>
                                        <span>{file.name}</span>
                                        <button onClick={(e) => handleCloseTab(tabId, e)} className="w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"><i className="fa-solid fa-times text-xs"></i></button>
                                    </button>
                                )
                            })}
                        </div>
                        <div className="flex items-center p-1 mr-2">
                             <Tooltip content={t('pages.project.details.toggleExplorer')}><button onClick={() => setExplorerVisible(!isExplorerVisible)} className="w-7 h-7 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><i className={`fa-solid ${isExplorerVisible ? 'fa-angles-left' : 'fa-angles-right'}`}></i></button></Tooltip>
                             <Tooltip content={t('pages.project.details.toggleFullscreen')}><button onClick={() => setIsFullscreen(!isFullscreen)} className="w-7 h-7 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"><i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i></button></Tooltip>
                        </div>
                    </div>
                     <div className="px-3 py-1.5 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">{renderBreadcrumbs()}</div>
                    <div className="flex-grow flex flex-col overflow-hidden">
                        {activeFile?.type === 'text/markdown' ? (
                            <>
                                <MarkdownToolbar editorRef={editorRef} onContentChange={handleContentChange} />
                                <textarea
                                    ref={editorRef}
                                    value={editedContent[activeFile.id] ?? activeFile.content ?? ''}
                                    onChange={(e) => handleContentChange(e.target.value)}
                                    className="w-full flex-grow p-4 resize-none focus:outline-none bg-inherit font-mono text-sm leading-relaxed"
                                    placeholder="Start writing your markdown..."
                                />
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full w-full text-slate-500">
                                {activeFile ? t('pages.project.details.unsupportedPreview') : t('pages.project.details.noFileSelected')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileEditorView;
