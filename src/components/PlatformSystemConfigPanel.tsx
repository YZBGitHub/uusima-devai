import React, { useState, useRef } from 'react';
import {
  Settings,
  Database,
  Search,
  Upload,
  CloudUpload,
  Plus,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
  Loader2,
  X,
  Save,
  RotateCcw,
  Bot,
  Eye,
  Terminal,
  Folder,
  FolderPlus,
  Star,
  ChevronDown,
  ChevronRight,
  Send,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { AgentKnowledgeDoc } from './AgentKnowledgeModal';
import type { CommandTreeNode } from './AgentDesignModal';
import {
  type DefaultAiConfig,
  INITIAL_DEFAULT_KB_CONFIG,
  formatKbTimestamp,
  collectDefaultCommandsFromTree,
  countCommandTreeStats,
} from '../lib/defaultKnowledgeBase';
import { triggerAIAssistant } from './AIAssistantWidget';

interface PlatformSystemConfigPanelProps {
  config: DefaultAiConfig;
  onChangeConfig: (
    next: DefaultAiConfig | ((prev: DefaultAiConfig) => DefaultAiConfig)
  ) => void;
  onNotify?: (msg: string) => void;
  onRequestConfirm?: (dialog: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  }) => void;
}

// Recursive helpers for command tree
function updateNodeInTree(
  nodes: CommandTreeNode[],
  targetId: string,
  updater: (node: CommandTreeNode) => CommandTreeNode
): CommandTreeNode[] {
  return nodes.map((n) => {
    if (n.id === targetId) return updater(n);
    if (n.children && n.children.length > 0) {
      return { ...n, children: updateNodeInTree(n.children, targetId, updater) };
    }
    return n;
  });
}

function deleteNodeInTree(nodes: CommandTreeNode[], targetId: string): CommandTreeNode[] {
  return nodes
    .filter((n) => n.id !== targetId)
    .map((n) => (n.children ? { ...n, children: deleteNodeInTree(n.children, targetId) } : n));
}

function appendChildInTree(
  nodes: CommandTreeNode[],
  parentId: string,
  child: CommandTreeNode
): CommandTreeNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children || []), child] };
    }
    if (n.children && n.children.length > 0) {
      return { ...n, children: appendChildInTree(n.children, parentId, child) };
    }
    return n;
  });
}

export default function PlatformSystemConfigPanel({
  config,
  onChangeConfig,
  onNotify,
  onRequestConfirm,
}: PlatformSystemConfigPanelProps) {
  // 统一归入「默认AI助手配置」内部页签
  const [assistantSubTab, setAssistantSubTab] = useState<'kb' | 'commands'>('kb');

  // 默认 AI 助手基础配置编辑状态
  const [assistantMetaEditing, setAssistantMetaEditing] = useState(false);
  const [assistantNameDraft, setAssistantNameDraft] = useState(config.assistantName);
  const [welcomeMsgDraft, setWelcomeMsgDraft] = useState(config.welcomeMessage);

  // 默认知识库基础信息编辑状态
  const [kbNameDraft, setKbNameDraft] = useState(config.kbName);
  const [kbDescDraft, setKbDescDraft] = useState(config.description);
  const [metaEditing, setMetaEditing] = useState(false);

  // 文件列表搜索与筛选
  const [docSearch, setDocSearch] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | AgentKnowledgeDoc['fileType']>('all');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // 文件内容新增/编辑弹窗状态
  const [editingDoc, setEditingDoc] = useState<AgentKnowledgeDoc | null>(null);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [docNameInput, setDocNameInput] = useState('');
  const [docTypeInput, setDocTypeInput] = useState<AgentKnowledgeDoc['fileType']>('MD');
  const [docContentInput, setDocContentInput] = useState('');
  const [docFormError, setDocFormError] = useState<string | null>(null);

  // 默认指令配置状态
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    const expandAll = (nodes: CommandTreeNode[]) => {
      nodes.forEach((n) => {
        map[n.id] = true;
        if (n.children) expandAll(n.children);
      });
    };
    expandAll(config.commandTree);
    return map;
  });
  const [editingCmdNode, setEditingCmdNode] = useState<CommandTreeNode | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getFileBadgeClass = (fileType: AgentKnowledgeDoc['fileType']) => {
    switch (fileType) {
      case 'PDF':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'DOC':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'MD':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const calculateTextSizeLabel = (text: string) => {
    const bytes = new Blob([text]).size;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  // 保存默认 AI 助手名称与欢迎语
  const handleSaveAssistantMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantNameDraft.trim()) {
      onNotify?.('请填写默认 AI 助手名称');
      return;
    }
    const nowStr = formatKbTimestamp();
    onChangeConfig((prev) => ({
      ...prev,
      assistantName: assistantNameDraft.trim(),
      welcomeMessage: welcomeMsgDraft.trim() || prev.welcomeMessage,
      updatedAt: nowStr,
    }));
    setAssistantMetaEditing(false);
    onNotify?.('已保存默认 AI 助手基础配置');
  };

  // 保存默认知识库名称与简介
  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbNameDraft.trim()) {
      onNotify?.('默认知识库名称不能为空');
      return;
    }
    const nowStr = formatKbTimestamp();
    onChangeConfig((prev) => ({
      ...prev,
      kbName: kbNameDraft.trim(),
      description: kbDescDraft.trim() || prev.description,
      updatedAt: nowStr,
    }));
    setMetaEditing(false);
    onNotify?.('已保存默认知识库基础配置');
  };

  // 上传本地文件并读取内容
  const handleUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const nowStr = formatKbTimestamp();
    const fileArr = Array.from(files);
    const createdDocIds: string[] = [];
    const newDocs: AgentKnowledgeDoc[] = [];

    fileArr.forEach((file, idx) => {
      const ext = (file.name.split('.').pop() || 'TXT').toUpperCase();
      const fileType: AgentKnowledgeDoc['fileType'] =
        ext === 'PDF'
          ? 'PDF'
          : ext === 'DOC' || ext === 'DOCX'
            ? 'DOC'
            : ext === 'MD'
              ? 'MD'
              : 'TXT';

      const sizeStr =
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      const docId = `default-doc-${Date.now()}-${idx}`;
      createdDocIds.push(docId);

      newDocs.push({
        id: docId,
        name: file.name,
        fileType,
        size: sizeStr,
        uploadedAt: nowStr,
        status: 'vectorizing',
        content: `已导入默认知识库文件【${file.name}】，包含设备运维规范、接入参数及常见故障排错说明。可在操作列点击“配置内容”补充或修订正文。`,
      });
    });

    onChangeConfig((prev) => ({
      ...prev,
      updatedAt: nowStr,
      docs: [...newDocs, ...prev.docs],
    }));

    // 读取纯文本 / Markdown / CSV 文件正文
    fileArr.forEach((file, idx) => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json' || ext === 'log') {
        const reader = new FileReader();
        reader.onload = () => {
          const text = typeof reader.result === 'string' ? reader.result.trim() : '';
          if (text) {
            const targetId = createdDocIds[idx];
            onChangeConfig((prev) => ({
              ...prev,
              docs: prev.docs.map((d) =>
                d.id === targetId ? { ...d, content: text.slice(0, 8000) } : d
              ),
            }));
          }
        };
        reader.readAsText(file);
      }
    });

    // 自动完成向量化并可供默认 AI 助手读取
    setTimeout(() => {
      onChangeConfig((prev) => ({
        ...prev,
        updatedAt: formatKbTimestamp(),
        docs: prev.docs.map((d) =>
          createdDocIds.includes(d.id) ? { ...d, status: 'completed' } : d
        ),
      }));
      onNotify?.(`已上传 ${newDocs.length} 个文件并完成向量化，系统默认 AI 助手已可读取`);
    }, 800);
  };

  // 打开在线新建知识文件弹窗
  const handleOpenCreateDoc = () => {
    setIsCreatingDoc(true);
    setEditingDoc(null);
    setDocNameInput('');
    setDocTypeInput('MD');
    setDocContentInput('');
    setDocFormError(null);
  };

  // 打开编辑知识文件内容弹窗
  const handleOpenEditDocContent = (doc: AgentKnowledgeDoc) => {
    setIsCreatingDoc(false);
    setEditingDoc(doc);
    setDocNameInput(doc.name);
    setDocTypeInput(doc.fileType);
    setDocContentInput(doc.content || '');
    setDocFormError(null);
  };

  // 保存新建或编辑后的文件内容
  const handleSaveDocContent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = docNameInput.trim();
    const trimmedContent = docContentInput.trim();

    if (!trimmedName) {
      setDocFormError('请填写文件名称');
      return;
    }
    if (!trimmedContent) {
      setDocFormError('请配置知识库文件的正文内容，以便系统默认 AI 助手读取检索');
      return;
    }

    const nowStr = formatKbTimestamp();
    const normalizedName = /\.[a-zA-Z0-9]+$/.test(trimmedName)
      ? trimmedName
      : `${trimmedName}.${docTypeInput.toLowerCase()}`;

    if (isCreatingDoc) {
      const newDoc: AgentKnowledgeDoc = {
        id: `default-doc-${Date.now()}`,
        name: normalizedName,
        fileType: docTypeInput,
        size: calculateTextSizeLabel(trimmedContent),
        uploadedAt: nowStr,
        status: 'completed',
        content: trimmedContent,
      };
      onChangeConfig((prev) => ({
        ...prev,
        updatedAt: nowStr,
        docs: [newDoc, ...prev.docs],
      }));
      onNotify?.(`已新增默认知识库文件【${normalizedName}】，系统默认 AI 助手已实时生效`);
    } else if (editingDoc) {
      onChangeConfig((prev) => ({
        ...prev,
        updatedAt: nowStr,
        docs: prev.docs.map((d) =>
          d.id === editingDoc.id
            ? {
                ...d,
                name: normalizedName,
                fileType: docTypeInput,
                size: calculateTextSizeLabel(trimmedContent),
                uploadedAt: nowStr,
                status: 'completed',
                content: trimmedContent,
              }
            : d
        ),
      }));
      onNotify?.(`已更新文件【${normalizedName}】的内容配置，系统默认 AI 助手将读取最新内容`);
    }

    setEditingDoc(null);
    setIsCreatingDoc(false);
    setDocFormError(null);
  };

  // 删除文件
  const handleDeleteDoc = (doc: AgentKnowledgeDoc) => {
    const doDelete = () => {
      const nowStr = formatKbTimestamp();
      onChangeConfig((prev) => ({
        ...prev,
        updatedAt: nowStr,
        docs: prev.docs.filter((d) => d.id !== doc.id),
      }));
      onNotify?.(`已从默认知识库移除文件【${doc.name}】`);
    };

    if (onRequestConfirm) {
      onRequestConfirm({
        title: '确认删除知识库文件',
        message: `确认从默认知识库中删除【${doc.name}】？删除后系统默认 AI 助手将不再检索该文件内容。`,
        confirmLabel: '确认删除',
        variant: 'danger',
        onConfirm: doDelete,
      });
    } else {
      doDelete();
    }
  };

  // ================= 默认指令配置 handlers =================
  const updateCommandTree = (
    updater: (prevTree: CommandTreeNode[]) => CommandTreeNode[]
  ) => {
    const nowStr = formatKbTimestamp();
    onChangeConfig((prev) => ({
      ...prev,
      updatedAt: nowStr,
      commandTree: updater(prev.commandTree),
    }));
  };

  const toggleExpandNode = (id: string) => {
    setExpandedNodeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddRootCategory = () => {
    const newId = `sys-cat-${Date.now()}`;
    const newCat: CommandTreeNode = {
      id: newId,
      label: `新指令分类 ${config.commandTree.length + 1}`,
      nodeType: 'category',
      children: [],
    };
    updateCommandTree((prev) => [...prev, newCat]);
    setExpandedNodeIds((prev) => ({ ...prev, [newId]: true }));
    setEditingCmdNode(newCat);
  };

  const handleAddRootDefaultCommand = () => {
    const newId = `sys-cmd-${Date.now()}`;
    const newCmd: CommandTreeNode = {
      id: newId,
      label: '新默认诊断指令',
      nodeType: 'command',
      isDefault: true,
      prompt: '请执行平台实训设备默认连通性与心跳健康检查',
      commandCode: 'MCP_HEALTH_CHECK --scope=platform',
      expectedReply: '已完成设备默认巡检，各通讯通道与供电状态正常。',
    };
    updateCommandTree((prev) => [...prev, newCmd]);
    setEditingCmdNode(newCmd);
    onNotify?.('已添加默认指令，请在右侧完善提示词与响应配置');
  };

  const handleAddChildNode = (parentId: string, nodeType: 'category' | 'command') => {
    const newId = `${nodeType === 'category' ? 'sys-cat' : 'sys-cmd'}-${Date.now()}`;
    const newNode: CommandTreeNode =
      nodeType === 'category'
        ? {
            id: newId,
            label: '子级指令分组',
            nodeType: 'category',
            children: [],
          }
        : {
            id: newId,
            label: '新建子指令',
            nodeType: 'command',
            isDefault: false,
            prompt: '请执行实训设备专项通讯排查与自愈检查',
            commandCode: '',
            expectedReply: '已收到指令并完成设备状态核验。',
          };
    updateCommandTree((prev) => appendChildInTree(prev, parentId, newNode));
    setExpandedNodeIds((prev) => ({ ...prev, [parentId]: true, [newId]: true }));
    setEditingCmdNode(newNode);
  };

  const handleToggleDefaultCmd = (nodeId: string) => {
    updateCommandTree((prev) =>
      updateNodeInTree(prev, nodeId, (n) => ({ ...n, isDefault: !n.isDefault }))
    );
    if (editingCmdNode?.id === nodeId) {
      setEditingCmdNode((prev) => (prev ? { ...prev, isDefault: !prev.isDefault } : null));
    }
    onNotify?.('已更新默认指令快捷展示状态，系统默认 AI 助手已同步');
  };

  const handleDeleteTreeNode = (node: CommandTreeNode) => {
    const doDelete = () => {
      updateCommandTree((prev) => deleteNodeInTree(prev, node.id));
      if (editingCmdNode?.id === node.id) setEditingCmdNode(null);
      onNotify?.(`已删除指令节点【${node.label}】`);
    };

    if (onRequestConfirm) {
      onRequestConfirm({
        title: node.nodeType === 'category' ? '确认删除指令分类' : '确认删除指令',
        message:
          node.nodeType === 'category'
            ? `确认删除指令分类【${node.label}】及其下所有子分类和指令？`
            : `确认从默认指令库删除【${node.label}】？`,
        confirmLabel: '确认删除',
        variant: 'danger',
        onConfirm: doDelete,
      });
    } else {
      doDelete();
    }
  };

  const handleSaveEditingCmdNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCmdNode || !editingCmdNode.label.trim()) return;
    updateCommandTree((prev) =>
      updateNodeInTree(prev, editingCmdNode.id, (old) => ({
        ...old,
        label: editingCmdNode.label.trim(),
        isDefault: editingCmdNode.isDefault,
        prompt: editingCmdNode.prompt,
        commandCode: editingCmdNode.commandCode,
        expectedReply: editingCmdNode.expectedReply,
      }))
    );
    setEditingCmdNode(null);
    onNotify?.(`已更新默认指令【${editingCmdNode.label.trim()}】，系统默认 AI 助手已实时同步`);
  };

  // Recursive command tree renderer
  const renderCommandNodes = (nodes: CommandTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedNodeIds[node.id] ?? true;
      const isCategory = node.nodeType === 'category';
      const isSelected = editingCmdNode?.id === node.id;

      return (
        <div key={node.id} className="space-y-1">
          <div
            style={{ paddingLeft: `${depth * 18 + 10}px` }}
            className={cn(
              'pr-2.5 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs',
              isSelected
                ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isCategory ? (
                <button
                  type="button"
                  onClick={() => toggleExpandNode(node.id)}
                  className="p-0.5 rounded hover:bg-slate-100 text-slate-400 shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}

              {isCategory ? (
                <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
              ) : (
                <Terminal className="w-4 h-4 text-emerald-600 shrink-0" />
              )}

              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono shrink-0">
                {depth + 1}级
              </span>

              <span className="font-semibold text-slate-800 truncate" title={node.label}>
                {node.label}
              </span>

              {!isCategory && node.isDefault && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold shrink-0">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>默认指令</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isCategory ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddChildNode(node.id, 'category')}
                    className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1"
                    title="添加子分类（支持多级）"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span className="hidden sm:inline">子分类</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddChildNode(node.id, 'command')}
                    className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1"
                    title="添加子指令"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">子指令</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleDefaultCmd(node.id)}
                  className={cn(
                    'px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1',
                    node.isDefault
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-amber-600'
                  )}
                  title={node.isDefault ? '取消默认指令' : '设为默认指令'}
                >
                  <Star
                    className={cn('w-3 h-3', node.isDefault && 'fill-amber-500 text-amber-500')}
                  />
                  <span className="hidden sm:inline">{node.isDefault ? '已设默认' : '设默认'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setEditingCmdNode({ ...node })}
                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                title="编辑"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTreeNode(node)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isCategory && isExpanded && node.children && node.children.length > 0 && (
            <div className="space-y-1">{renderCommandNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  // 恢复默认预设（知识库 + 默认指令 + AI助手设置）
  const handleResetToDefault = () => {
    const doReset = () => {
      onChangeConfig(INITIAL_DEFAULT_KB_CONFIG);
      setAssistantNameDraft(INITIAL_DEFAULT_KB_CONFIG.assistantName);
      setWelcomeMsgDraft(INITIAL_DEFAULT_KB_CONFIG.welcomeMessage);
      setKbNameDraft(INITIAL_DEFAULT_KB_CONFIG.kbName);
      setKbDescDraft(INITIAL_DEFAULT_KB_CONFIG.description);
      setEditingCmdNode(null);
      onNotify?.('已恢复默认 AI 助手配置（含默认知识库与默认指令）');
    };

    if (onRequestConfirm) {
      onRequestConfirm({
        title: '恢复默认 AI 助手配置',
        message:
          '确认将默认 AI 助手的基础设置、默认知识库文件内容及默认指令重置为平台初始预设？',
        confirmLabel: '确认恢复',
        variant: 'warning',
        onConfirm: doReset,
      });
    } else {
      doReset();
    }
  };

  // 触发默认 AI 助手测试读取效果
  const handleTestDefaultAiAssistant = (samplePrompt?: string) => {
    const defaultCmds = collectDefaultCommandsFromTree(config.commandTree);
    const fallbackPrompt =
      defaultCmds[0]?.node.prompt ||
      '请结合默认知识库说明串口丢包和 Modbus CRC 校验失败的排查步骤';
    triggerAIAssistant(samplePrompt || fallbackPrompt, undefined, undefined, { centered: false });
  };

  const filteredDocs = config.docs.filter((d) => {
    if (fileTypeFilter !== 'all' && d.fileType !== fileTypeFilter) return false;
    if (docSearch.trim()) {
      const q = docSearch.trim().toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        (d.content || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const completedDocsCount = config.docs.filter((d) => d.status === 'completed').length;
  const vectorizingCount = config.docs.length - completedDocsCount;
  const treeStats = countCommandTreeStats(config.commandTree);
  const defaultCommandsList = collectDefaultCommandsFromTree(config.commandTree);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 flex-wrap">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>平台运营 · 系统配置</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
              默认 AI 助手配置
            </span>
          </h3>
        </div>

        {/* Stats & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3.5 text-xs bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-400">知识文件: </span>
              <b className="font-mono text-slate-800 font-bold">{config.docs.length}</b>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-400">已向量化: </span>
              <b className="font-mono text-emerald-700 font-bold">{completedDocsCount}</b>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span className="text-slate-400">默认指令: </span>
              <b className="font-mono text-amber-700 font-bold">{treeStats.defaults}</b>
            </div>
            {vectorizingCount > 0 && (
              <>
                <div className="h-3 w-px bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  <span className="text-slate-400">处理中: </span>
                  <b className="font-mono text-blue-700 font-bold">{vectorizingCount}</b>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleTestDefaultAiAssistant()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-purple-500/20 transition-all whitespace-nowrap"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>测试默认 AI 助手</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="重置为平台初始默认 AI 助手配置"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认</span>
          </button>
        </div>
      </div>

      {/* Unified Card: 默认 AI 助手配置 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Assistant Identity Banner inside 默认AI助手配置 */}
        <div className="p-5 border-b border-slate-200/80 bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/40">
          {assistantMetaEditing ? (
            <form onSubmit={handleSaveAssistantMeta} className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>编辑默认 AI 助手基础信息</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAssistantNameDraft(config.assistantName);
                    setWelcomeMsgDraft(config.welcomeMessage);
                    setAssistantMetaEditing(false);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1">
                    助手显示名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={assistantNameDraft}
                    onChange={(e) => setAssistantNameDraft(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-8">
                  <label className="block font-bold text-slate-700 mb-1">默认欢迎语</label>
                  <input
                    type="text"
                    value={welcomeMsgDraft}
                    onChange={(e) => setWelcomeMsgDraft(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAssistantNameDraft(config.assistantName);
                    setWelcomeMsgDraft(config.welcomeMessage);
                    setAssistantMetaEditing(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存配置</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="font-extrabold text-slate-900 text-sm">
                    默认 AI 助手配置 · {config.assistantName}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    欢迎语：{config.welcomeMessage}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAssistantNameDraft(config.assistantName);
                  setWelcomeMsgDraft(config.welcomeMessage);
                  setAssistantMetaEditing(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 self-start md:self-center"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>编辑助手信息</span>
              </button>
            </div>
          )}
        </div>

        {/* Sub-Tabs Navigation inside 默认AI助手配置 */}
        <div className="px-6 pt-3 bg-slate-50/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setAssistantSubTab('kb')}
            className={cn(
              'px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0',
              assistantSubTab === 'kb'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-white/60'
            )}
          >
            <Database className="w-3.5 h-3.5" />
            <span>默认知识库配置</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums',
                assistantSubTab === 'kb'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-200 text-slate-600'
              )}
            >
              {config.docs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAssistantSubTab('commands')}
            className={cn(
              'px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0',
              assistantSubTab === 'commands'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-white/60'
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>默认指令配置</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums',
                assistantSubTab === 'commands'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-200 text-slate-600'
              )}
            >
              {treeStats.commands}
            </span>
          </button>
        </div>

        {/* ============== TAB 1: 默认知识库配置 ============== */}
        {assistantSubTab === 'kb' && (
          <div className="p-5 space-y-4">
            {/* Default KB Metadata */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
              {metaEditing ? (
                <form onSubmit={handleSaveMeta} className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Database className="w-4 h-4 text-indigo-600" />
                      <span>编辑默认知识库基础信息</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setKbNameDraft(config.kbName);
                        setKbDescDraft(config.description);
                        setMetaEditing(false);
                      }}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <label className="block font-bold text-slate-700 mb-1">
                        默认知识库名称 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={kbNameDraft}
                        onChange={(e) => setKbNameDraft(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-7">
                      <label className="block font-bold text-slate-700 mb-1">知识库用途说明</label>
                      <input
                        type="text"
                        value={kbDescDraft}
                        onChange={(e) => setKbDescDraft(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setKbNameDraft(config.kbName);
                        setKbDescDraft(config.description);
                        setMetaEditing(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>保存知识库信息</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>{config.kbName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{config.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setKbNameDraft(config.kbName);
                      setKbDescDraft(config.description);
                      setMetaEditing(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-center"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>修改库信息</span>
                  </button>
                </div>
              )}
            </div>

            {/* File Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="搜索默认知识库文件名或正文关键词..."
                    className="w-full h-8 pl-8 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                  {docSearch && (
                    <button
                      type="button"
                      onClick={() => setDocSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={fileTypeFilter}
                  onChange={(e) =>
                    setFileTypeFilter(e.target.value as 'all' | AgentKnowledgeDoc['fileType'])
                  }
                  className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">全部格式</option>
                  <option value="MD">Markdown (MD)</option>
                  <option value="PDF">PDF 文档</option>
                  <option value="DOC">Word (DOC)</option>
                  <option value="TXT">纯文本 (TXT)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.md,.txt,.csv,.json"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadFiles(e.target.files);
                    e.target.value = '';
                  }}
                />

                <button
                  type="button"
                  onClick={handleOpenCreateDoc}
                  className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新建知识文件</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-3.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上传本地文件</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                handleUploadFiles(e.dataTransfer.files);
              }}
              className={cn(
                'border border-dashed rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors',
                isDraggingOver
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-indigo-200 bg-indigo-50/35 hover:bg-indigo-50/60'
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                  <CloudUpload className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    点击或拖拽上传知识文件
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    支持 PDF / Word / Markdown / TXT
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-600 shrink-0 hover:underline">
                选择文件
              </span>
            </div>

            {/* Files Table */}
            <div className="rounded-2xl border border-slate-200/90 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4 whitespace-nowrap">文件名称</th>
                      <th className="py-3 px-4 whitespace-nowrap">文件内容摘要</th>
                      <th className="py-3 px-4 whitespace-nowrap w-24">大小</th>
                      <th className="py-3 px-4 whitespace-nowrap w-40">更新时间</th>
                      <th className="py-3 px-4 whitespace-nowrap w-28 text-center">状态</th>
                      <th className="py-3 px-4 whitespace-nowrap w-44 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocs.length > 0 ? (
                      filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  'w-7 h-7 rounded-lg border text-[10px] font-bold flex items-center justify-center shrink-0',
                                  getFileBadgeClass(doc.fileType)
                                )}
                              >
                                {doc.fileType}
                              </span>
                              <span
                                className="font-semibold text-slate-900 truncate max-w-[230px]"
                                title={doc.name}
                              >
                                {doc.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[360px]">
                            <p
                              className="text-xs text-slate-600 line-clamp-2 leading-relaxed"
                              title={doc.content || '暂无内容'}
                            >
                              {doc.content || '暂无正文内容，请点击“配置内容”补充'}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {doc.size}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {doc.uploadedAt}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {doc.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>已向量化</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-medium">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>向量化中</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDocContent(doc)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition-colors whitespace-nowrap flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>配置内容</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleTestDefaultAiAssistant(
                                    `请根据默认知识库文件「${doc.name}」总结关键排查步骤`
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 font-medium transition-colors whitespace-nowrap"
                                title="用默认 AI 助手试读此文件"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc)}
                                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 font-medium transition-colors whitespace-nowrap"
                                title="删除文件"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                            <span>
                              {config.docs.length === 0
                                ? '默认知识库暂无文件，请点击「新建知识文件」或「上传本地文件」添加'
                                : '没有符合当前检索条件的知识库文件'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50/70 border-t border-slate-200/80 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  共 <b className="text-slate-800">{filteredDocs.length}</b> 篇文件（已向量化{' '}
                  <b className="text-emerald-700">{completedDocsCount}</b> 篇）
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============== TAB 2: 默认指令配置 ============== */}
        {assistantSubTab === 'commands' && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            {/* Left: Multi-level Command Tree */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">默认指令库</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {treeStats.categories} 个分类 · {treeStats.commands} 条指令 ·{' '}
                    <b className="text-amber-600">{treeStats.defaults}</b> 条默认
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRootCategory}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>新增一级分类</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRootDefaultCommand}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-semibold flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>新增默认指令</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
                {config.commandTree.length > 0 ? (
                  renderCommandNodes(config.commandTree, 0)
                ) : (
                  <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    暂无默认指令节点，请点击右上方按钮创建分类或默认指令
                  </div>
                )}
              </div>
            </div>

            {/* Right: Node Editor OR Default Commands Preview */}
            <div className="lg:col-span-5 space-y-4">
              {editingCmdNode ? (
                <form
                  onSubmit={handleSaveEditingCmdNode}
                  className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3.5"
                >
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {editingCmdNode.nodeType === 'category' ? '编辑分类节点' : '编辑默认指令详情'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingCmdNode(null)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {editingCmdNode.nodeType === 'category' ? '分类名称 *' : '指令名称 *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editingCmdNode.label}
                      onChange={(e) =>
                        setEditingCmdNode({ ...editingCmdNode, label: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {editingCmdNode.nodeType === 'command' && (
                    <>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editingCmdNode.isDefault)}
                          onChange={(e) =>
                            setEditingCmdNode({ ...editingCmdNode, isDefault: e.target.checked })
                          }
                          className="rounded border-amber-300 text-amber-600"
                        />
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>设为默认 AI 助手快捷指令</span>
                      </label>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          触发对话提示词 <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={editingCmdNode.prompt || ''}
                          onChange={(e) =>
                            setEditingCmdNode({ ...editingCmdNode, prompt: e.target.value })
                          }
                          placeholder="点击该快捷指令时自动发送给默认 AI 助手的提问内容"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          推荐下发指令 / 动作标识（可选）
                        </label>
                        <input
                          type="text"
                          value={editingCmdNode.commandCode || ''}
                          onChange={(e) =>
                            setEditingCmdNode({ ...editingCmdNode, commandCode: e.target.value })
                          }
                          placeholder="如：MCP_PROBE --check-uart"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          标准诊断参考响应模板
                        </label>
                        <textarea
                          rows={3}
                          value={editingCmdNode.expectedReply || ''}
                          onChange={(e) =>
                            setEditingCmdNode({ ...editingCmdNode, expectedReply: e.target.value })
                          }
                          placeholder="默认 AI 助手命中该指令时返回的标准诊断步骤与建议"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingCmdNode(null)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                      应用修改
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span>默认指令预览（{defaultCommandsList.length} 条）</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {defaultCommandsList.length > 0 ? (
                      defaultCommandsList.map(({ path, node }) => (
                        <div
                          key={node.id}
                          className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 truncate">{node.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {path && <span className="text-[10px] text-slate-400">{path}</span>}
                              <button
                                type="button"
                                onClick={() =>
                                  handleTestDefaultAiAssistant(node.prompt || node.label)
                                }
                                className="px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-semibold transition-colors"
                              >
                                试运行
                              </button>
                            </div>
                          </div>
                          {node.prompt && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Send className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="truncate">{node.prompt}</span>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        暂未设置默认指令，可在左侧指令行点击「设默认」
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: 新建 / 配置知识库文件内容 */}
      {(isCreatingDoc || editingDoc) && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-5 bg-slate-900/55 backdrop-blur-xs">
          <form
            onSubmit={handleSaveDocContent}
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-xs"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {isCreatingDoc ? '新建默认知识库文件' : `配置知识库文件内容 · ${editingDoc?.name}`}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDoc(null);
                  setIsCreatingDoc(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              {docFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {docFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block font-bold text-slate-700 mb-1.5">
                    文件名称 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={docNameInput}
                    onChange={(e) => setDocNameInput(e.target.value)}
                    placeholder="例如：实训室Modbus网关接入与排错规范.md"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1.5">文件格式</label>
                  <select
                    value={docTypeInput}
                    onChange={(e) =>
                      setDocTypeInput(e.target.value as AgentKnowledgeDoc['fileType'])
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="MD">Markdown (MD)</option>
                    <option value="TXT">纯文本 (TXT)</option>
                    <option value="PDF">PDF 文本摘录 (PDF)</option>
                    <option value="DOC">Word 文本摘录 (DOC)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">
                    文件内容 <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {docContentInput.length} 字符 · {calculateTextSizeLabel(docContentInput)}
                  </span>
                </div>
                <textarea
                  rows={12}
                  value={docContentInput}
                  onChange={(e) => setDocContentInput(e.target.value)}
                  placeholder="请输入设备操作规范、通讯参数表、常见错误码及排查步骤等结构化文本内容..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingDoc(null);
                  setIsCreatingDoc(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存并更新向量索引</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
