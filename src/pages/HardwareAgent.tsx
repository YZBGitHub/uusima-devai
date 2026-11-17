import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Play,
  Cpu,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  INITIAL_SYSTEM_AGENTS,
  HardwareAgentItem,
  getCustomAgents,
} from '../data/agents';
import DeviceConnectPreModal from '../components/DeviceConnectPreModal';

const industries = ['全部', '物联网', '工业互联网', '人工智能', '智慧农业'];
const PAGE_SIZE = 8;

export default function HardwareAgent() {
  const navigate = useNavigate();

  // Source filter: 'all' (全部), 'system' (系统发布), 'custom' (用户发布)
  const [sourceType, setSourceType] = useState<'all' | 'system' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('全部');
  const [customAgents] = useState<HardwareAgentItem[]>(() => getCustomAgents());
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingAgent, setPendingAgent] = useState<HardwareAgentItem | null>(null);

  const publishedCustomAgents = customAgents.filter((a) => a.status === 'published');
  const allAgents = [...INITIAL_SYSTEM_AGENTS, ...publishedCustomAgents];

  // Apply source type filter (全部, 系统发布, 用户发布)
  let filteredAgents = allAgents;
  if (sourceType === 'system') {
    filteredAgents = INITIAL_SYSTEM_AGENTS;
  } else if (sourceType === 'custom') {
    filteredAgents = publishedCustomAgents;
  }

  // Apply industry filter
  if (selectedIndustry !== '全部') {
    filteredAgents = filteredAgents.filter((a) => a.industry === selectedIndustry);
  }

  // Apply search query filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredAgents = filteredAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        (a.type === 'custom' && a.author?.toLowerCase().includes(q))
    );
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sourceType, selectedIndustry, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedAgents = filteredAgents.slice(startIdx, startIdx + PAGE_SIZE);

  const handleLaunchAgent = (agent: HardwareAgentItem) => {
    setPendingAgent(agent);
  };

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-b from-[#f0f6ff] via-[#f7faff] to-slate-50 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                设备智能体大厅
              </h1>
            </div>
          </div>

        </div>

        {/* Integrated Search & Filter Options Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-blue-100/80 space-y-3">
          {/* Top Filter Row: Segmented Source Type + Divider + Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                {[
                  { key: 'all', label: '全部', count: allAgents.length },
                  { key: 'system', label: '系统发布', count: INITIAL_SYSTEM_AGENTS.length },
                  { key: 'custom', label: '用户发布', count: publishedCustomAgents.length },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSourceType(item.key as 'all' | 'system' | 'custom')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap',
                      sourceType === item.key
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <span>{item.label}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full tabular-nums',
                        sourceType === item.key
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-200/80 text-slate-500'
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="h-5 w-px bg-slate-200 hidden md:block" />
            </div>

            {/* Keyword Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索智能体名称、型号、发布者"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Bottom Filter Row: Domain pills */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              领域:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setSelectedIndustry(ind)}
                  className={cn(
                    'px-3.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap',
                    selectedIndustry === ind
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  )}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <div>
            共 <span className="font-bold text-slate-800 tabular-nums">{filteredAgents.length}</span> 个智能体
          </div>
          {filteredAgents.length > 0 && (
            <div className="text-slate-400 tabular-nums">
              第 {safePage} / {totalPages} 页
            </div>
          )}
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {paginatedAgents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => handleLaunchAgent(agent)}
              className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Image Container */}
                <div className="aspect-[16/10] w-full rounded-xl bg-gradient-to-b from-[#eaf2fd] to-[#d8e8fa] p-3 flex items-center justify-center relative overflow-hidden mb-3">
                  {/* Badge top-left */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    {agent.type === 'system' ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-blue-700 shadow-2xs border border-blue-200/50">
                        系统发布
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-100/90 text-purple-700 shadow-2xs border border-purple-200/50">
                        用户发布
                      </span>
                    )}
                  </div>

                  <img
                    src={agent.image}
                    alt={agent.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (agent.deviceImage && target.src !== agent.deviceImage) {
                        target.src = agent.deviceImage;
                      }
                    }}
                  />
                </div>

                {/* Agent Title & Description */}
                <h3
                  className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors"
                  title={agent.name}
                >
                  {agent.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1 mt-1" title={agent.desc}>
                  {agent.desc}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                  <div className="flex items-center gap-1 text-slate-600 truncate">
                    <span className="text-blue-500 text-xs">⬡</span>
                    <span className="font-medium">{agent.industry}</span>
                  </div>

                  {agent.type === 'custom' && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{agent.author}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchAgent(agent);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1 hover:shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>开启智能体</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Bar */}
        {filteredAgents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl border border-blue-100/80 px-5 py-3.5 shadow-2xs">
            <div className="text-xs text-slate-500 tabular-nums">
              显示第 <span className="font-semibold text-slate-800">{startIdx + 1}</span> -{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(startIdx + PAGE_SIZE, filteredAgents.length)}
              </span>{' '}
              条，共 <span className="font-semibold text-slate-800">{filteredAgents.length}</span> 个智能体
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一页</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded-xl text-xs font-semibold transition-colors tabular-nums',
                    safePage === pageNum
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <span>下一页</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-blue-100 shadow-xs">
            <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-bold">未找到符合条件的设备智能体</p>
            <p className="text-xs text-slate-400 mt-1">请尝试切换分类选项或更改搜索关键词</p>
            <button
              onClick={() => {
                setSourceType('all');
                setSelectedIndustry('全部');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              重置所有搜索选项
            </button>
          </div>
        )}
      </div>

      {/* 设备连接前置弹窗 */}
      <DeviceConnectPreModal
        open={Boolean(pendingAgent)}
        agentName={pendingAgent?.name}
        onSkipConnect={() => {
          if (!pendingAgent) return;
          const targetId = pendingAgent.id;
          setPendingAgent(null);
          navigate(`/agents/${targetId}`, { state: { connectMode: 'skip' } });
        }}
        onStartWithConnect={(_, summary) => {
          if (!pendingAgent) return;
          const targetId = pendingAgent.id;
          setPendingAgent(null);
          navigate(`/agents/${targetId}`, {
            state: { connectMode: 'connect', connectSummary: summary },
          });
        }}
        onCancel={() => setPendingAgent(null)}
      />
    </div>
  );
}
