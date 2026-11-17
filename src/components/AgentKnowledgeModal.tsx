import React, { useState, useRef } from 'react';
import {
  Database,
  Search,
  Plus,
  X,
  Upload,
  CloudUpload,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface AgentKnowledgeDoc {
  id: string;
  name: string;
  fileType: 'PDF' | 'DOC' | 'MD' | 'TXT';
  size: string;
  uploadedAt: string;
  status: 'vectorizing' | 'completed';
  content?: string;
}

export interface AgentKnowledgeBase {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  docs: AgentKnowledgeDoc[];
}

interface AgentKnowledgeModalProps {
  agentName: string;
  knowledgeBases: AgentKnowledgeBase[];
  onChangeKnowledgeBases: (
    next: AgentKnowledgeBase[] | ((prev: AgentKnowledgeBase[]) => AgentKnowledgeBase[])
  ) => void;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

function formatNowTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function AgentKnowledgeModal({
  agentName,
  knowledgeBases,
  onChangeKnowledgeBases,
  onClose,
  onNotify,
}: AgentKnowledgeModalProps) {
  const [kbSearch, setKbSearch] = useState('');

  // Modal 2: 新增 / 编辑知识库
  const [kbFormOpen, setKbFormOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<AgentKnowledgeBase | null>(null);
  const [kbFormName, setKbFormName] = useState('');
  const [kbFormDesc, setKbFormDesc] = useState('');

  // Modal 3: 知识库文件配置
  const [configuringKbId, setConfiguringKbId] = useState<string | null>(null);
  const [docSearch, setDocSearch] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // 删除确认内联状态 (替代受限的 window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'kb'; kbId: string; name: string }
    | { type: 'doc'; kbId: string; docId: string; name: string }
    | null
  >(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const configuringKb = knowledgeBases.find((kb) => kb.id === configuringKbId) || null;

  const filteredKbs = knowledgeBases.filter((kb) => {
    if (!kbSearch.trim()) return true;
    const q = kbSearch.trim().toLowerCase();
    return (
      kb.name.toLowerCase().includes(q) ||
      kb.description.toLowerCase().includes(q)
    );
  });

  // 打开新增知识库弹窗
  const handleOpenCreateKb = () => {
    setEditingKb(null);
    setKbFormName('');
    setKbFormDesc('');
    setKbFormOpen(true);
  };

  // 打开编辑知识库弹窗
  const handleOpenEditKb = (kb: AgentKnowledgeBase) => {
    setEditingKb(kb);
    setKbFormName(kb.name);
    setKbFormDesc(kb.description);
    setKbFormOpen(true);
  };

  // 保存新增或编辑知识库
  const handleSubmitKbForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbFormName.trim()) return;

    const nowStr = formatNowTimestamp();
    if (editingKb) {
      onChangeKnowledgeBases(
        knowledgeBases.map((kb) =>
          kb.id === editingKb.id
            ? {
                ...kb,
                name: kbFormName.trim(),
                description: kbFormDesc.trim() || '暂无简介说明',
                updatedAt: nowStr,
              }
            : kb
        )
      );
      onNotify?.(`已更新知识库【${kbFormName.trim()}】`);
    } else {
      const newKb: AgentKnowledgeBase = {
        id: `kb-${Date.now()}`,
        name: kbFormName.trim(),
        description: kbFormDesc.trim() || '暂无简介说明',
        updatedAt: nowStr,
        docs: [],
      };
      onChangeKnowledgeBases([newKb, ...knowledgeBases]);
      onNotify?.(`已新增知识库【${newKb.name}】`);
    }

    setKbFormOpen(false);
    setEditingKb(null);
  };

  // 上传文件并自动向量化
  const handleUploadFiles = (kbId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const nowStr = formatNowTimestamp();
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

      const docId = `doc-${Date.now()}-${idx}`;
      createdDocIds.push(docId);

      newDocs.push({
        id: docId,
        name: file.name,
        fileType,
        size: sizeStr,
        uploadedAt: nowStr,
        status: 'vectorizing',
        content: `已解析硬件文档【${file.name}】核心协议寄存器参数、设备接口定义及排错操作指南。`,
      });
    });

    onChangeKnowledgeBases((prev) =>
      prev.map((kb) =>
        kb.id === kbId
          ? {
              ...kb,
              updatedAt: nowStr,
              docs: [...newDocs, ...kb.docs],
            }
          : kb
      )
    );

    // 读取纯文本文件内容用于调试对话召回
    fileArr.forEach((file, idx) => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (ext === 'txt' || ext === 'md' || ext === 'csv') {
        const reader = new FileReader();
        reader.onload = () => {
          const text = typeof reader.result === 'string' ? reader.result.trim() : '';
          if (text) {
            const targetId = createdDocIds[idx];
            onChangeKnowledgeBases((prev) =>
              prev.map((kb) =>
                kb.id === kbId
                  ? {
                      ...kb,
                      docs: kb.docs.map((d) =>
                        d.id === targetId ? { ...d, content: text.slice(0, 1500) } : d
                      ),
                    }
                  : kb
              )
            );
          }
        };
        reader.readAsText(file);
      }
    });

    // 自动向量化完成过渡
    setTimeout(() => {
      onChangeKnowledgeBases((prev) =>
        prev.map((kb) =>
          kb.id === kbId
            ? {
                ...kb,
                docs: kb.docs.map((d) =>
                  createdDocIds.includes(d.id) ? { ...d, status: 'completed' } : d
                ),
              }
            : kb
        )
      );
      onNotify?.(`已上传并完成 ${newDocs.length} 个文件的自动向量化`);
    }, 900);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'kb') {
      onChangeKnowledgeBases(knowledgeBases.filter((kb) => kb.id !== deleteTarget.kbId));
      if (configuringKbId === deleteTarget.kbId) {
        setConfiguringKbId(null);
      }
      onNotify?.(`已删除知识库【${deleteTarget.name}】`);
    } else {
      const nowStr = formatNowTimestamp();
      onChangeKnowledgeBases(
        knowledgeBases.map((kb) =>
          kb.id === deleteTarget.kbId
            ? {
                ...kb,
                updatedAt: nowStr,
                docs: kb.docs.filter((d) => d.id !== deleteTarget.docId),
              }
            : kb
        )
      );
      onNotify?.(`已删除文档【${deleteTarget.name}】`);
    }
    setDeleteTarget(null);
  };

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs">
      {/* ================= 截图1：知识库管理主列表弹窗 ================= */}
      <div className="bg-white rounded-3xl w-[94vw] max-w-6xl max-h-[86vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* 弹窗头部 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base truncate">
              知识库管理 · {agentName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 顶部搜索与新增按钮 (对齐截图1) */}
        <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={kbSearch}
              onChange={(e) => setKbSearch(e.target.value)}
              placeholder="输入名称或描述查找知识库..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleOpenCreateKb}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 self-end sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增知识库</span>
          </button>
        </div>

        {/* 知识库列表表格 (对齐截图1) */}
        <div className="px-6 pb-6 flex-1 min-h-0 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3.5 px-5">知识库名称与简介</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap w-28">文档篇数</th>
                  <th className="py-3.5 px-4 whitespace-nowrap w-48">最后更新时间</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap w-44">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKbs.length > 0 ? (
                  filteredKbs.map((kb) => (
                    <tr key={kb.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-start gap-2.5">
                          <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-[13px]">
                              {kb.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                              {kb.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-slate-700">
                        {kb.docs.length}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {kb.updatedAt}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2.5 text-xs font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              setDocSearch('');
                              setConfiguringKbId(kb.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            配置
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditKb(kb)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            编辑
                          </button>
                          <span className="text-slate-200">|</span>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({ type: 'kb', kbId: kb.id, name: kb.name })
                            }
                            className="text-rose-500 hover:text-rose-700 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-14 text-center text-slate-400 text-xs">
                      暂无知识库数据，请点击右上角「+ 新增知识库」创建
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= 截图2：新增 / 编辑知识库弹窗 ================= */}
      {kbFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h4 className="font-bold text-slate-900 text-base">
                {editingKb ? '编辑知识库' : '新增知识库'}
              </h4>
              <button
                type="button"
                onClick={() => setKbFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitKbForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  知识库名称 <span className="text-slate-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={kbFormName}
                  onChange={(e) => setKbFormName(e.target.value)}
                  placeholder="必填，1~60字符，如：智能制造与工业互联网知识库"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  简介与应用场景
                </label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={kbFormDesc}
                  onChange={(e) => setKbFormDesc(e.target.value)}
                  placeholder="选填，最多200字，请输入该知识库收录的教学资料范围..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-blue-600 text-[11px] leading-relaxed">
                <CloudUpload className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  创建成功后可在知识库列表点击“配置”上传 PDF、Word 或 Markdown 文档。
                </span>
              </div>

              <div className="flex items-center justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setKbFormOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:text-slate-900 font-medium text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors"
                >
                  确定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 截图3：知识库文件配置弹窗 ================= */}
      {configuringKb && (() => {
        const filteredDocs = configuringKb.docs.filter((d) => {
          if (!docSearch.trim()) return true;
          return d.name.toLowerCase().includes(docSearch.trim().toLowerCase());
        });

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-900/45 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-[92vw] max-w-4xl max-h-[86vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
              {/* 顶部标题区 (对齐截图3) */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-base">
                        知识库文件配置
                      </h4>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-semibold">
                        {configuringKb.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      管理知识库内的文档资产，支持新增上传文件与废弃文档删除，文件上传后自动向量化
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfiguringKbId(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 搜索与上传按钮行 */}
              <div className="px-6 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="搜索文档名称..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.md,.txt"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadFiles(configuringKb.id, e.target.files);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 self-end sm:self-auto"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>上传新文件</span>
                </button>
              </div>

              {/* 拖拽上传区域 */}
              <div className="px-6 pb-4 shrink-0">
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
                    handleUploadFiles(configuringKb.id, e.dataTransfer.files);
                  }}
                  className={cn(
                    "border border-dashed rounded-2xl px-5 py-4 flex items-center justify-between gap-4 cursor-pointer transition-colors",
                    isDraggingOver
                      ? "border-blue-500 bg-blue-50"
                      : "border-blue-200 bg-blue-50/35 hover:bg-blue-50/60"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                      <CloudUpload className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800">
                        点击或拖拽文件至此处上传
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        支持 PDF、Word (.docx/.doc)、Markdown (.md)、TXT 格式，单个文件不超过 50MB
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 shrink-0 hover:underline">
                    选择文件
                  </span>
                </div>
              </div>

              {/* 文档表格 */}
              <div className="px-6 flex-1 min-h-0 overflow-y-auto pb-4">
                <div className="rounded-2xl border border-slate-200/90 overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">文档名称</th>
                        <th className="py-3 px-4 whitespace-nowrap w-24">大小</th>
                        <th className="py-3 px-4 whitespace-nowrap w-44">上传时间</th>
                        <th className="py-3 px-4 whitespace-nowrap w-32 text-center">状态</th>
                        <th className="py-3 px-4 whitespace-nowrap w-20 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocs.length > 0 ? (
                        filteredDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={cn(
                                    "w-7 h-7 rounded-lg border text-[10px] font-bold flex items-center justify-center shrink-0",
                                    getFileBadgeClass(doc.fileType)
                                  )}
                                >
                                  {doc.fileType}
                                </span>
                                <span className="font-medium text-slate-800 truncate max-w-[260px]" title={doc.name}>
                                  {doc.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {doc.size}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {doc.uploadedAt}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
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
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: 'doc',
                                    kbId: configuringKb.id,
                                    docId: doc.id,
                                    name: doc.name,
                                  })
                                }
                                className="text-rose-500 hover:text-rose-700 font-medium text-xs"
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                            当前知识库暂无文档，请点击或拖拽上传文件
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 底部总数与完成按钮 */}
              <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
                <span className="text-xs text-slate-500">
                  当前知识库文档总数：<b className="text-slate-900 font-bold">{configuringKb.docs.length}</b> 篇
                </span>
                <button
                  type="button"
                  onClick={() => setConfiguringKbId(null)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  完成
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">
              {deleteTarget.type === 'kb' ? '确认删除知识库' : '确认删除文档'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {deleteTarget.type === 'kb'
                ? `确认删除知识库【${deleteTarget.name}】及其全部文档索引？`
                : `确认从知识库中删除文件【${deleteTarget.name}】？`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
