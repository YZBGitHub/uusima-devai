import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
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
  Home as HomeIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getAgentById, HardwareAgentItem, AgentCommand } from '../data/agents';
import DeviceConnectPreModal from '../components/DeviceConnectPreModal';

interface DetailMessage {
  id: string;
  sender: 'assistant' | 'user';
  type?: 'welcome' | 'normal';
  content: string;
  codeHint?: string;
  attachmentName?: string;
  liked?: 'up' | 'down' | null;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  group: '今天' | '7天内' | '更早之前';
  messages: DetailMessage[];
}

function createWelcomeMessage(agent: HardwareAgentItem): DetailMessage {
  return {
    id: `welcome-${agent.id}`,
    sender: 'assistant',
    type: 'welcome',
    content: '',
    liked: null,
    timestamp: '刚刚',
  };
}

function buildInitialSessions(agent: HardwareAgentItem): ChatSession[] {
  const firstTroubleshoot = agent.troubleshootingCommands[0];
  const firstControl = agent.controlCommands[0];

  return [
    {
      id: 'session-today-1',
      title: '开始',
      group: '今天',
      messages: [createWelcomeMessage(agent)],
    },
    {
      id: 'session-7d-1',
      title: firstTroubleshoot ? firstTroubleshoot.label.slice(0, 12) : '通信链路排查',
      group: '7天内',
      messages: [
        createWelcomeMessage(agent),
        {
          id: 'hist-u-1',
          sender: 'user',
          content: firstTroubleshoot?.prompt || `请帮我排查 ${agent.name} 的通信异常问题`,
          timestamp: '3天前',
        },
        {
          id: 'hist-a-1',
          sender: 'assistant',
          content:
            firstTroubleshoot?.response ||
            `已完成 ${agent.model} 通信端口（${agent.port}）自检，当前链路状态稳定，建议核对总线接线及波特率设置。`,
          codeHint: firstTroubleshoot?.codeHint,
          liked: 'up',
          timestamp: '3天前',
        },
      ],
    },
    {
      id: 'session-7d-2',
      title: firstControl ? firstControl.label.slice(0, 12) : '设备初始化自检',
      group: '7天内',
      messages: [
        createWelcomeMessage(agent),
        {
          id: 'hist-u-2',
          sender: 'user',
          content: firstControl?.prompt || `执行 ${agent.name} 设备出厂自检指令`,
          timestamp: '5天前',
        },
        {
          id: 'hist-a-2',
          sender: 'assistant',
          content:
            firstControl?.response ||
            `已向 ${agent.model} 下发标准自检序列，核心寄存器与传感器回读状态正常。`,
          liked: null,
          timestamp: '5天前',
        },
      ],
    },
    {
      id: 'session-old-1',
      title: '端口参数校准记录',
      group: '更早之前',
      messages: [
        createWelcomeMessage(agent),
        {
          id: 'hist-u-3',
          sender: 'user',
          content: `查看 ${agent.model} 默认推荐通信参数`,
          timestamp: '2周前',
        },
        {
          id: 'hist-a-3',
          sender: 'assistant',
          content: `设备型号 ${agent.model} 当前标准通道为 ${agent.port}，实训环境建议保持 MCP 心跳间隔 30s，确保断线自动重连。`,
          liked: null,
          timestamp: '2周前',
        },
      ],
    },
    {
      id: 'session-old-2',
      title: '固件版本与驱动核验',
      group: '更早之前',
      messages: [createWelcomeMessage(agent)],
    },
  ];
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const agent = getAgentById(Number(id));

  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    agent ? buildInitialSessions(agent) : []
  );
  const [activeSessionId, setActiveSessionId] = useState<string>('session-today-1');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Device connection state
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const handledAutoConnectRef = useRef<string | null>(null);

  // Accordion states for 设备指令库
  const [troubleshootOpen, setTroubleshootOpen] = useState(true);
  const [controlOpen, setControlOpen] = useState(true);

  // Chat interaction states
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stagedAttachment, setStagedAttachment] = useState<string | null>(null);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset state when switching agent route
  useEffect(() => {
    if (agent) {
      const init = buildInitialSessions(agent);
      setSessions(init);
      setActiveSessionId(init[0].id);
      setConnectionState('disconnected');
      setConnectModalOpen(false);
      setInputValue('');
      setStagedAttachment(null);
      setIsTyping(false);

      const navState = location.state as { connectMode?: 'skip' | 'connect'; connectSummary?: string } | null;
      const key = `${agent.id}-${location.key}`;
      if (navState?.connectMode === 'connect' && handledAutoConnectRef.current !== key) {
        handledAutoConnectRef.current = key;
        setConnectionState('connecting');
        const summary = navState.connectSummary;
        setTimeout(() => {
          setConnectionState('connected');
          setSessions((prev) =>
            prev.map((s, idx) =>
              idx === 0
                ? {
                    ...s,
                    messages: [
                      ...s.messages,
                      {
                        id: `sys-${Date.now()}`,
                        sender: 'assistant',
                        content: `已成功建立与【${agent.name}】的双向通信连接！\n- 设备型号：${agent.model}\n- 绑定通道：${agent.port}${summary ? `\n- 连接参数：${summary}` : ''}\n- 握手延迟：3.4ms（在线就绪，可直接点击左侧“设备指令库”或输入问题进行排错）`,
                        liked: null,
                        timestamp: '刚刚',
                      },
                    ],
                  }
                : s
            )
          );
        }, 500);
      }
    }
  }, [agent?.id, location.key]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length, isTyping]);

  if (!agent) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-xs">
          <Cpu className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">未找到对应的设备智能体</h2>
          <p className="text-sm text-slate-500">该设备智能体可能已被移除或链接地址无效。</p>
          <Link
            to="/agents"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回设备智能体大厅</span>
          </Link>
        </div>
      </div>
    );
  }

  const appendMessageToActive = (msg: DetailMessage) => {
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
    setConnectModalOpen(false);
    setConnectionState('connecting');
    setTimeout(() => {
      setConnectionState('connected');
      appendMessageToActive({
        id: `sys-${Date.now()}`,
        sender: 'assistant',
        content: `已成功建立与【${agent.name}】的双向通信连接！\n- 设备型号：${agent.model}\n- 绑定通道：${agent.port}${paramSummary ? `\n- 连接参数：${paramSummary}` : ''}\n- 握手延迟：3.4ms（在线就绪，可直接点击左侧“设备指令库”或输入问题进行排错）`,
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
        content: `已断开与【${agent.name}】(${agent.model}) 的 MCP 实时通道连接。如需重新下发控制或采集指令，请点击左侧“连接设备”。`,
        liked: null,
        timestamp: '刚刚',
      });
      return;
    }

    setConnectModalOpen(true);
  };

  const handleSendQuery = (
    text: string,
    customReply?: string,
    customCodeHint?: string
  ) => {
    const trimmed = text.trim();
    if (!trimmed && !stagedAttachment) return;

    const userMsg: DetailMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: trimmed || `已上传诊断附件：${stagedAttachment}`,
      attachmentName: stagedAttachment || undefined,
      timestamp: '刚刚',
    };

    appendMessageToActive(userMsg);
    setInputValue('');
    const currentAttach = stagedAttachment;
    setStagedAttachment(null);
    setIsTyping(true);

    setTimeout(() => {
      let reply = customReply;
      if (!reply) {
        reply = `已收到您针对【${agent.name}】（${agent.model}）的排错请求${
          currentAttach ? `与附件（${currentAttach}）` : ''
        }。\n\n诊断分析与建议操作：\n1. 已检索 ${agent.industry} 领域设备知识库与 ${agent.port} 协议规范；\n2. 请确认当前设备供电与通道指示灯处于正常心跳状态；\n3. 建议优先核对代码输出日志是否匹配预期结果「${
          agent.guideHighlight || 'Connected OK'
        }」，若仍有异常可点击左侧【设备指令库】执行一键自检。`;
      }

      appendMessageToActive({
        id: `a-${Date.now() + 1}`,
        sender: 'assistant',
        content: reply,
        codeHint: customCodeHint,
        liked: null,
        timestamp: '刚刚',
      });
      setIsTyping(false);
    }, 450);
  };

  const handleCommandClick = (cmd: AgentCommand) => {
    handleSendQuery(cmd.prompt, cmd.response, cmd.codeHint);
  };

  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: '新对话',
      group: '今天',
      messages: [createWelcomeMessage(agent)],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  };

  const handleDeleteSession = (sessionId: string) => {
    setOpenMenuSessionId(null);
    if (sessions.length <= 1) {
      const fresh: ChatSession = {
        id: `session-${Date.now()}`,
        title: '开始',
        group: '今天',
        messages: [createWelcomeMessage(agent)],
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
    <div className="flex-1 min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-slate-50 overflow-hidden">
      {/* Left Column: Device Info + Command Library + Return to Lobby */}
      <aside className="w-full lg:w-[272px] shrink-0 bg-gradient-to-b from-[#f3f2ff] via-[#f5f6ff] to-[#f8f9fc] border-b lg:border-b-0 lg:border-r border-slate-200/80 p-3.5 flex flex-col gap-3 overflow-y-auto">
        {/* Top Return Link + Agent Title */}
        <div className="space-y-2.5">
          <button
            onClick={() => navigate('/agents')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-white/80 hover:bg-white border border-purple-200/70 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回设备大厅</span>
          </button>

          <div className="flex items-start gap-2.5 px-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-snug">
                {agent.name}
                {!agent.name.endsWith('智能体') && '智能体'}
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {agent.model} · {agent.industry}
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
              {agent.type === 'system' ? '系统发布' : '用户发布'}
            </span>
          </div>

          {/* Device Image */}
          <div className="aspect-[16/10] w-full rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-100 p-2.5 flex items-center justify-center overflow-hidden">
            <img
              src={agent.deviceImage}
              alt={agent.name}
              referrerPolicy="no-referrer"
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
                      {agent.port}
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex-1 min-h-[210px] flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold py-2.5 px-4 text-center tracking-wide shrink-0">
            设备指令库
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {/* 排错能力 */}
            <div>
              <button
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
                  {agent.troubleshootingCommands.map((cmd) => (
                    <button
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
                  {agent.controlCommands.map((cmd) => (
                    <button
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
          </div>
        </div>

        {/* Bottom Return to Lobby CTA (matches screenshot bottom button position) */}
        <button
          onClick={() => navigate('/agents')}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0"
        >
          <HomeIcon className="w-3.5 h-3.5" />
          <span>返回大厅</span>
        </button>
      </aside>

      {/* Middle Column: Collapsible Conversation History Sidebar */}
      {!sidebarCollapsed && (
        <aside className="hidden md:flex w-[228px] shrink-0 bg-white border-r border-slate-200/80 flex-col">
          {/* Top Action Row: 新建对话 & 收起 */}
          <div className="p-3 border-b border-slate-100 flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/80 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建对话</span>
            </button>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap"
              title="收起对话栏"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
              <span>收起</span>
            </button>
          </div>

          {/* Grouped History List */}
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
        <div className="h-11 px-4 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors mr-1"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
                <span>展开对话</span>
              </button>
            )}
            <button
              onClick={handleNewChat}
              className="md:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新对话</span>
            </button>
            <button
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

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
              {agent.model} · {agent.port}
            </span>
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
                  /* Structured Welcome Guide Card matching the screenshot */
                  <div className="space-y-2">
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
                      {/* Hardware Showcase Image */}
                      <div className="flex justify-center">
                        <img
                          src={agent.image}
                          alt={agent.name}
                          referrerPolicy="no-referrer"
                          className="max-h-56 sm:max-h-64 w-auto object-contain drop-shadow-sm"
                        />
                      </div>

                      <hr className="border-slate-200" />

                      {/* Next Step Guidance */}
                      <div className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
                          <span>下一步操作指引</span>
                        </h2>

                        <p className="text-sm text-slate-700">
                          请您直接回复包含以下内容的信息，我将立即为您生成诊断报告：
                        </p>

                        <ul className="space-y-2 pl-5 list-disc text-sm text-slate-800 font-medium">
                          {agent.guideBullets.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {item}
                            </li>
                          ))}
                        </ul>

                        {/* Knowledge Base Tip Box */}
                        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 text-xs sm:text-sm text-slate-600 italic leading-relaxed">
                          <span>提示：{agent.guideTip} </span>
                          {agent.guideHighlight && (
                            <code className="not-italic font-mono text-xs bg-white border border-slate-200 text-slate-800 px-1.5 py-0.5 rounded mx-0.5">
                              {agent.guideHighlight}
                            </code>
                          )}
                          <span>。若未出现该提示或出现其他报错，请提供详细日志以便我进行代码比对分析。</span>
                        </div>

                        <p className="text-sm text-slate-700 pt-1">
                          期待您的输入，我将竭诚为您服务！
                        </p>
                      </div>
                    </div>

                    {/* Feedback Actions */}
                    <div className="flex items-center gap-1.5 pl-1">
                      <button
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
                      {msg.codeHint && (
                        <div className="bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl p-3.5 overflow-x-auto">
                          {msg.codeHint}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pl-1">
                      <button
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
                        `设备型号：${agent.model}\n通信通道：${agent.port}\n异常现象：`
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

      <DeviceConnectPreModal
        open={connectModalOpen}
        agentName={agent.name}
        primaryLabel="确认连接"
        showSkipOption={false}
        onStartWithConnect={(_, summary) => executeConnect(summary)}
        onSkipConnect={() => setConnectModalOpen(false)}
        onCancel={() => setConnectModalOpen(false)}
      />
    </div>
  );
}
