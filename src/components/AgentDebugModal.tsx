import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Cpu,
  Unlink,
  Link2,
  ChevronDown,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Mic,
  Camera,
  FileText,
  Paperclip,
  ArrowUp,
  MoreHorizontal,
  RefreshCw,
  Wrench,
  Sliders,
  Lightbulb,
  Trash2,
  X,
  Database,
  Star,
  Folder,
  Plug,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { AgentKnowledgeBase } from './AgentKnowledgeModal';
import type { AgentDesignConfig, CommandTreeNode } from './AgentDesignModal';
import DeviceConnectPreModal from './DeviceConnectPreModal';

export interface DebugCustomAgentInfo {
  id: number;
  name: string;
  desc: string;
  coverImage: string;
  schoolName: string;
  status: 'published' | 'draft';
  hardwareModel: string;
}

interface DebugDetailMessage {
  id: string;
  sender: 'assistant' | 'user';
  type?: 'welcome' | 'normal';
  content: string;
  codeHint?: string;
  kbCitations?: Array<{ kbName: string; docName: string }>;
  attachmentName?: string;
  liked?: 'up' | 'down' | null;
  timestamp: string;
}

interface DebugSession {
  id: string;
  title: string;
  group: '今天' | '7天内' | '更早之前';
  messages: DebugDetailMessage[];
}

interface DebugCommandItem {
  id: string;
  label: string;
  prompt: string;
  response: string;
  codeHint?: string;
}

interface AgentDebugModalProps {
  agent: DebugCustomAgentInfo;
  knowledgeBases: AgentKnowledgeBase[];
  designConfig?: AgentDesignConfig;
  initialAutoConnect?: boolean;
  initialConnectSummary?: string;
  onClose: () => void;
}

function buildCommandsForAgent(agent: DebugCustomAgentInfo): {
  troubleshoot: DebugCommandItem[];
  control: DebugCommandItem[];
} {
  return {
    troubleshoot: [
      {
        id: 'ts-1',
        label: `${agent.hardwareModel} 通讯超时与丢包排查`,
        prompt: `请排查 ${agent.hardwareModel} 设备通讯超时、无应答或丢包率偏高的问题`,
        response: `已完成 ${agent.hardwareModel} 通讯链路自检：\n1. 检测当前波特率与从站设备校验位配置是否一致；\n2. 验证 RS485 总线 A/B 接线极性与 120Ω 终端匹配电阻状态；\n3. 建议检查网关串口接收缓冲区溢出计数并重新建立 MCP 心跳。`,
        codeHint: `MCP_PROBE ${agent.hardwareModel} --check-uart --baud=115200 --verify=crc16`,
      },
      {
        id: 'ts-2',
        label: '寄存器读写异常与状态码诊断',
        prompt: `帮我分析 ${agent.name} 读取寄存器返回错误码的原因`,
        response: `已匹配硬件寄存器规格书：\n- 若返回异常码 0x02/0x03，请核对起始寄存器地址与长度范围；\n- 若出现供电波动导致的偶发 CRC 错误，建议检查 24V 直流供电纹波与屏蔽接地。`,
        codeHint: `READ_HOLDING_REGISTERS 0x0001 0x0008 -> STATUS: OK (Latency 3.2ms)`,
      },
      {
        id: 'ts-3',
        label: '接线引脚与供电链路核验',
        prompt: `检查 ${agent.hardwareModel} 实训工位供电及传感器接线状态`,
        response: `已执行工位硬件状态核验：\n1. 电源轨电压 24.05V 正常；\n2. 传感器信号通道无开路告警，建议确认接线端子锁紧力矩。`,
      },
    ],
    control: [
      {
        id: 'ctl-1',
        label: '执行设备出厂自检序列',
        prompt: `向 ${agent.hardwareModel} 下发标准自检与心跳探针指令`,
        response: `已向目标设备【${agent.name}】下发自检序列，各通道采样与开关量回读响应均处于正常范围。`,
        codeHint: `MCP_EXEC self_test --target=${agent.hardwareModel} --timeout=3000ms`,
      },
      {
        id: 'ctl-2',
        label: '同步并校准默认通讯参数',
        prompt: `将 ${agent.hardwareModel} 通讯参数校准为实训默认推荐值`,
        response: `已下发参数校准指令：波特率 115200bps、8N1、心跳间隔 30s，设备已生效并完成握手确认。`,
        codeHint: `SET_UART_CONFIG baud=115200 parity=NONE stopbits=1`,
      },
    ],
  };
}

function buildInitialSessions(agent: DebugCustomAgentInfo): DebugSession[] {
  return [
    {
      id: `session-today-${agent.id}`,
      title: '开始',
      group: '今天',
      messages: [
        {
          id: `welcome-${agent.id}`,
          sender: 'assistant',
          type: 'welcome',
          content: '',
          liked: null,
          timestamp: '刚刚',
        },
      ],
    },
    {
      id: `session-7d-1-${agent.id}`,
      title: '通信链路排查',
      group: '7天内',
      messages: [
        {
          id: `welcome-hist1-${agent.id}`,
          sender: 'assistant',
          type: 'welcome',
          content: '',
          liked: null,
          timestamp: '3天前',
        },
        {
          id: `u-hist1-${agent.id}`,
          sender: 'user',
          content: `请帮我排查 ${agent.name} 的通信异常问题`,
          timestamp: '3天前',
        },
        {
          id: `a-hist1-${agent.id}`,
          sender: 'assistant',
          content: `已完成 ${agent.hardwareModel} 通信端口自检，当前链路状态稳定，建议核对总线接线及波特率设置。`,
          codeHint: `MCP_PING ${agent.hardwareModel} -> RTT: 3.1ms [ONLINE]`,
          liked: 'up',
          timestamp: '3天前',
        },
      ],
    },
    {
      id: `session-old-1-${agent.id}`,
      title: '端口参数校准记录',
      group: '更早之前',
      messages: [
        {
          id: `welcome-hist2-${agent.id}`,
          sender: 'assistant',
          type: 'welcome',
          content: '',
          liked: null,
          timestamp: '2周前',
        },
      ],
    },
  ];
}

export default function AgentDebugModal({
  agent,
  knowledgeBases,
  designConfig,
  initialAutoConnect = false,
  initialConnectSummary,
  onClose,
}: AgentDebugModalProps) {
  const [sessions, setSessions] = useState<DebugSession[]>(() => buildInitialSessions(agent));
  const [activeSessionId, setActiveSessionId] = useState<string>(`session-today-${agent.id}`);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 设备连接状态与连接参数弹窗
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectFormOpen, setConnectFormOpen] = useState(false);
  const autoConnectHandledRef = useRef(false);

  // 折叠面板状态
  const [troubleshootOpen, setTroubleshootOpen] = useState(true);
  const [controlOpen, setControlOpen] = useState(true);
  const [expandedCmdTreeIds, setExpandedCmdTreeIds] = useState<Record<string, boolean>>({});

  // 对话交互状态
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stagedAttachment, setStagedAttachment] = useState<string | null>(null);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const commands = buildCommandsForAgent(agent);

  const allVectorizedDocs = knowledgeBases.flatMap((kb) =>
    kb.docs
      .filter((d) => d.status === 'completed')
      .map((d) => ({ kbName: kb.name, doc: d }))
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length, isTyping]);

  useEffect(() => {
    if (initialAutoConnect && !autoConnectHandledRef.current) {
      autoConnectHandledRef.current = true;
      executeConnect(initialConnectSummary);
    }
  }, [initialAutoConnect, initialConnectSummary]);

  const appendMessageToActive = (msg: DebugDetailMessage) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        const shouldUpdateTitle =
          msg.sender === 'user' && (s.title === '开始' || s.title === '新对话');
        return {
          ...s,
          title: shouldUpdateTitle ? msg.content.slice(0, 14) : s.title,
          messages: [...s.messages, msg],
        };
      })
    );
  };

  const executeConnect = (paramSummary?: string) => {
    setConnectFormOpen(false);
    setConnectionState('connecting');
    setTimeout(() => {
      setConnectionState('connected');
      const protoInfo = designConfig?.mcpConfig
        ? `${designConfig.mcpConfig.protocol} 协议（已挂载 ${designConfig.mcpConfig.tools.length} 个 MCP 工具）`
        : 'MCP 实时协议通道';
      appendMessageToActive({
        id: `sys-${Date.now()}`,
        sender: 'assistant',
        content: `已成功建立与【${agent.name}】的双向通信连接！\n- 设备型号：${agent.hardwareModel}\n- 协议通道：${protoInfo}${paramSummary ? `\n- 连接参数：${paramSummary}` : ''}\n- 挂载知识库：${knowledgeBases.length} 个知识库（${allVectorizedDocs.length} 篇已向量化文档）\n- 握手延迟：3.4ms（在线就绪，可直接点击左侧“设备指令库”或输入问题进行调试）`,
        liked: null,
        timestamp: '刚刚',
      });
    }, 550);
  };

  const handleConnectToggle = () => {
    if (connectionState === 'connected') {
      setConnectionState('disconnected');
      appendMessageToActive({
        id: `sys-${Date.now()}`,
        sender: 'assistant',
        content: `已断开与【${agent.name}】(${agent.hardwareModel}) 的 MCP 实时通道连接。如需重新下发控制或采集指令，请点击左侧“连接设备”。`,
        liked: null,
        timestamp: '刚刚',
      });
      return;
    }

    setConnectFormOpen(true);
  };

  const handleSendQuery = (
    text: string,
    customReply?: string,
    customCodeHint?: string
  ) => {
    const trimmed = text.trim();
    if (!trimmed && !stagedAttachment) return;

    const userMsg: DebugDetailMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: trimmed || `已上传调试附件：${stagedAttachment}`,
      attachmentName: stagedAttachment || undefined,
      timestamp: '刚刚',
    };

    appendMessageToActive(userMsg);
    setInputValue('');
    const currentAttach = stagedAttachment;
    setStagedAttachment(null);
    setIsTyping(true);

    setTimeout(() => {
      // 检索当前智能体知识库中已向量化的文档
      const qLower = trimmed.toLowerCase();
      const matchedDocs = allVectorizedDocs
        .filter(({ kbName, doc }) => {
          const hay = `${kbName} ${doc.name} ${doc.content || ''}`.toLowerCase();
          return qLower.split(/[\s,，。？?]+/).some((tk) => tk.length >= 2 && hay.includes(tk));
        })
        .slice(0, 2);
      const citations = (matchedDocs.length > 0 ? matchedDocs : allVectorizedDocs.slice(0, 1)).map(
        (item) => ({ kbName: item.kbName, docName: item.doc.name })
      );

      let reply = customReply;
      if (!reply) {
        const citedText = matchedDocs[0]?.doc.content;
        reply = `已收到您针对【${agent.name}】（${agent.hardwareModel}）的调试请求${
          currentAttach ? `与附件（${currentAttach}）` : ''
        }。\n\n诊断分析与建议操作：\n1. 已检索当前挂载的 ${allVectorizedDocs.length} 篇已向量化知识文档；${
          citedText ? `\n2. 知识库命中要点：${citedText}` : '\n2. 请确认当前设备供电与通道指示灯处于正常心跳状态；'
        }\n3. 若需进一步测试控制响应，可点击左侧【设备指令库】一键下发协议探针指令。`;
      }

      appendMessageToActive({
        id: `a-${Date.now() + 1}`,
        sender: 'assistant',
        content: reply,
        codeHint: customCodeHint,
        kbCitations: citations,
        liked: null,
        timestamp: '刚刚',
      });
      setIsTyping(false);
    }, 450);
  };

  const handleCommandClick = (cmd: DebugCommandItem) => {
    handleSendQuery(cmd.prompt, cmd.response, cmd.codeHint);
  };

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: DebugSession = {
      id: newId,
      title: '新对话',
      group: '今天',
      messages: [
        {
          id: `welcome-${newId}`,
          sender: 'assistant',
          type: 'welcome',
          content: '',
          liked: null,
          timestamp: '刚刚',
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (sessionId: string) => {
    setOpenMenuSessionId(null);
    if (sessions.length <= 1) {
      const fresh: DebugSession = {
        id: `session-${Date.now()}`,
        title: '开始',
        group: '今天',
        messages: [
          {
            id: `welcome-fresh-${Date.now()}`,
            sender: 'assistant',
            type: 'welcome',
            content: '',
            liked: null,
            timestamp: '刚刚',
          },
        ],
      };
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      return;
    }
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleFeedback = (msgId: string, vote: 'up' | 'down') => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === msgId
                  ? { ...m, liked: m.liked === vote ? null : vote }
                  : m
              ),
            }
          : s
      )
    );
  };

  const handleCopyText = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStagedAttachment(file.name);
    }
    e.target.value = '';
  };

  const groups: Array<'今天' | '7天内' | '更早之前'> = ['今天', '7天内', '更早之前'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-[96vw] max-w-7xl h-[90vh] max-h-[860px] rounded-3xl bg-slate-50 border border-slate-200 shadow-2xl flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Device Info + Command Library + Close Debug (完全参考设备智能体大厅开启界面) */}
        <aside className="w-full lg:w-[272px] shrink-0 bg-gradient-to-b from-[#f3f2ff] via-[#f5f6ff] to-[#f8f9fc] border-b lg:border-b-0 lg:border-r border-slate-200/80 p-3.5 flex flex-col gap-3 overflow-y-auto">
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-white/80 hover:bg-white border border-purple-200/70 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回智能体管理</span>
            </button>

            <div className="flex items-start gap-2.5 px-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 leading-snug">
                  {agent.name}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {agent.hardwareModel} · 在线调试
                </p>
              </div>
            </div>
          </div>

          {/* Device Info Card (设备信息) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">设备信息</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {agent.status === 'published' ? '已发布' : '未发布'}
              </span>
            </div>

            {/* Device Image */}
            <div className="aspect-[16/10] w-full rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-100 p-2.5 flex items-center justify-center overflow-hidden">
              <img
                src={agent.coverImage}
                alt={agent.name}
                className="max-h-full max-w-full object-contain drop-shadow-xs"
              />
            </div>

            {/* Connection Status & Connect Button */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {connectionState === 'connected' ? (
                  <>
                    <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-emerald-600 block leading-none">
                        已连接
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate block mt-0.5">
                        {agent.hardwareModel}
                      </span>
                    </div>
                  </>
                ) : connectionState === 'connecting' ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    <span className="text-xs font-semibold text-blue-600">连接中...</span>
                  </>
                ) : (
                  <>
                    <Unlink className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-semibold text-rose-500">未连接</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleConnectToggle}
                disabled={connectionState === 'connecting'}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 shadow-xs whitespace-nowrap',
                  connectionState === 'connected'
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {connectionState === 'connected' ? '断开设备' : '连接设备'}
              </button>
            </div>
          </div>

          {/* Device Command Library Card (设备指令库) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex-1 min-h-[200px] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold py-2.5 px-4 text-center tracking-wide shrink-0">
              设备指令库
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {designConfig && designConfig.commandTree.length > 0 ? (
                <div className="p-2 space-y-1">
                  {(() => {
                    const renderNode = (node: CommandTreeNode, depth = 0): React.ReactNode => {
                      const isExpanded = expandedCmdTreeIds[node.id] ?? true;
                      if (node.nodeType === 'category') {
                        return (
                          <div key={node.id} className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCmdTreeIds((prev) => ({
                                  ...prev,
                                  [node.id]: !(prev[node.id] ?? true),
                                }))
                              }
                              style={{ paddingLeft: `${depth * 10 + 8}px` }}
                              className="w-full flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <span className="flex items-center gap-1.5 min-w-0">
                                <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate">{node.label}</span>
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                            </button>
                            {isExpanded && node.children && node.children.length > 0 && (
                              <div className="space-y-0.5">
                                {node.children.map((ch) => renderNode(ch, depth + 1))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          key={node.id}
                          onClick={() =>
                            handleSendQuery(
                              node.prompt || node.label,
                              node.expectedReply ||
                                `已向【${agent.name}】下发指令「${node.label}」，设备响应状态正常。`,
                              node.commandCode
                            )
                          }
                          style={{ paddingLeft: `${depth * 10 + 10}px` }}
                          className="w-full text-left pr-2.5 py-1.5 rounded-lg text-[11px] text-slate-600 hover:text-purple-700 hover:bg-purple-50/70 transition-colors leading-snug flex items-center justify-between gap-1.5"
                        >
                          <span className="truncate">{node.label}</span>
                          {node.isDefault && (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" title="默认指令" />
                          )}
                        </button>
                      );
                    };
                    return designConfig.commandTree.map((n) => renderNode(n, 0));
                  })()}
                </div>
              ) : (
                <>
                  {/* 排错能力 */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setTroubleshootOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-purple-600" />
                        <span>排错能力</span>
                      </span>
                      {troubleshootOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                    {troubleshootOpen && (
                      <div className="px-2.5 pb-2.5 space-y-1">
                        {commands.troubleshoot.map((cmd) => (
                          <button
                            type="button"
                            key={cmd.id}
                            onClick={() => handleCommandClick(cmd)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-600 hover:text-purple-700 hover:bg-purple-50/70 transition-colors leading-snug"
                          >
                            {cmd.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 控制能力 */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setControlOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        <span>控制能力</span>
                      </span>
                      {controlOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                    {controlOpen && (
                      <div className="px-2.5 pb-2.5 space-y-1">
                        {commands.control.map((cmd) => (
                          <button
                            type="button"
                            key={cmd.id}
                            onClick={() => handleCommandClick(cmd)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/70 transition-colors leading-snug"
                          >
                            {cmd.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>退出调试</span>
          </button>
        </aside>

        {/* Middle Column: Collapsible Conversation History Sidebar */}
        {!sidebarCollapsed && (
          <aside className="hidden md:flex w-[228px] shrink-0 bg-white border-r border-slate-200/80 flex-col">
            <div className="p-3 border-b border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/80 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建对话</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap"
                title="收起对话栏"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>收起</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
              {groups.map((group) => {
                const items = sessions.filter((s) => s.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="space-y-1">
                    <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400">
                      {group}
                    </div>
                    {items.map((session) => {
                      const isActive = session.id === activeSession.id;
                      return (
                        <div key={session.id} className="relative group">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSessionId(session.id);
                              setOpenMenuSessionId(null);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2',
                              isActive
                                ? 'bg-slate-100 text-slate-900 font-semibold'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            )}
                          >
                            <span className="truncate">{session.title}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuSessionId(
                                  openMenuSessionId === session.id ? null : session.id
                                );
                              }}
                              className={cn(
                                'p-0.5 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-opacity',
                                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              )}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </span>
                          </button>

                          {openMenuSessionId === session.id && (
                            <div className="absolute right-2 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-28">
                              <button
                                type="button"
                                onClick={() => handleDeleteSession(session.id)}
                                className="w-full px-3 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>删除对话</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Right Main Area: Chat & Diagnostic Workspace */}
        <section className="flex-1 flex flex-col bg-white min-w-0">
          {/* Top Utility Strip */}
          <div className="h-12 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2">
              {sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors mr-1"
                >
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span>展开对话</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleNewChat}
                className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新对话</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMuted((v) => !v)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title={isMuted ? '开启语音播报' : '静音'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-purple-600" />
                )}
              </button>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {activeSession?.title || '开始'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              {designConfig?.mcpConfig && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                  <span>{designConfig.mcpConfig.protocol} · {designConfig.mcpConfig.tools.length} 工具</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                <Database className="w-3 h-3" />
                <span>已关联 {knowledgeBases.length} 个知识库 ({allVectorizedDocs.length} 篇已向量化)</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                title="关闭调试窗口"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Message Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession?.messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.sender === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 text-sm leading-relaxed shadow-xs">
                        {msg.attachmentName && (
                          <div className="text-[11px] bg-white/15 rounded-lg px-2.5 py-1 mb-1.5 inline-flex items-center gap-1.5">
                            <Paperclip className="w-3 h-3" />
                            <span>{msg.attachmentName}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ) : msg.type === 'welcome' ? (
                    /* Structured Welcome Guide Card matching AgentDetail.tsx */
                    <div className="space-y-2">
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
                        <div className="flex justify-center">
                          <img
                            src={agent.coverImage}
                            alt={agent.name}
                            className="max-h-52 sm:max-h-60 w-auto object-contain drop-shadow-sm rounded-xl"
                          />
                        </div>

                        <hr className="border-slate-200" />

                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
                            <span>下一步操作指引</span>
                          </h3>

                          <p className="text-sm text-slate-700">
                            请您直接回复包含以下内容的信息，我将立即为您生成诊断报告：
                          </p>

                          <ul className="space-y-2 pl-5 list-disc text-sm text-slate-800 font-medium">
                            <li>您的设备型号（如 {agent.hardwareModel}）与实际串口/TCP 通道参数；</li>
                            <li>当前遇到的故障现象、报错日志或寄存器读写返回值；</li>
                            <li>需要验证的知识库技术文档问题或设备自检指令。</li>
                          </ul>

                          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                            <span>提示：{agent.desc}。当前已挂载 {allVectorizedDocs.length} 篇已向量化文档，支持结合实时设备状态输出排错建议。</span>
                          </div>

                          <p className="text-sm text-slate-700 pt-1">
                            期待您的输入，我将竭诚为您服务！
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pl-1">
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'up')}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            msg.liked === 'up'
                              ? 'text-purple-600 bg-purple-50'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          )}
                          title="有帮助"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'down')}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            msg.liked === 'down'
                              ? 'text-rose-600 bg-rose-50'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          )}
                          title="待改进"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Assistant Diagnostic Reply */
                    <div className="space-y-2">
                      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3 text-sm text-slate-700 leading-relaxed">
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.kbCitations && msg.kbCitations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {msg.kbCitations.map((c, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                              >
                                <Database className="w-3 h-3" />
                                <span>{c.kbName} · {c.docName}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.codeHint && (
                          <div className="bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl p-3.5 overflow-x-auto">
                            {msg.codeHint}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 pl-1">
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'up')}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            msg.liked === 'up'
                              ? 'text-purple-600 bg-purple-50'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          )}
                          title="有帮助"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(msg.id, 'down')}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            msg.liked === 'down'
                              ? 'text-rose-600 bg-rose-50'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          )}
                          title="待改进"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="复制回答"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="inline-flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                  <span>正在调用硬件智能体知识库与 MCP 探针分析中...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bottom Prompt Composer */}
          <div className="px-4 sm:px-8 pb-5 pt-2 shrink-0 bg-white">
            <div className="max-w-3xl mx-auto">
              {stagedAttachment && (
                <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-700">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>已附加：{stagedAttachment}</span>
                  <button
                    type="button"
                    onClick={() => setStagedAttachment(null)}
                    className="hover:text-purple-950"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all p-3">
                <textarea
                  rows={2}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendQuery(inputValue);
                    }
                  }}
                  placeholder="点击这里开始提问"
                  className="w-full resize-none text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none leading-relaxed"
                />

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setInputValue((prev) =>
                          prev
                            ? prev
                            : `请帮我检查 ${agent.name} 当前运行日志并给出下一步操作建议`
                        )
                      }
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                      title="语音快速输入"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                      title="上传报错截图"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setInputValue(
                          `设备型号：${agent.hardwareModel}\n异常现象：`
                        )
                      }
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                      title="插入排错模板"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 transition-colors"
                      title="附加日志文件"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendQuery(inputValue)}
                      disabled={!inputValue.trim() && !stagedAttachment}
                      className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white flex items-center justify-center transition-colors shadow-xs ml-1"
                      title="发送"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.log,.txt,.py,.c,.cpp"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>
          </div>
        </section>
      </div>

      {/* 设备连接参数输入表单弹窗 */}
      <DeviceConnectPreModal
        open={connectFormOpen}
        agentName={agent.name}
        fields={designConfig?.connectionFields}
        primaryLabel="确认连接"
        showSkipOption={false}
        onStartWithConnect={(_, summary) => executeConnect(summary)}
        onSkipConnect={() => setConnectFormOpen(false)}
        onCancel={() => setConnectFormOpen(false)}
      />
    </div>
  );
}
