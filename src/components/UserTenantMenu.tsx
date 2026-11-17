import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User,
  Settings,
  Activity,
  LogOut,
  Check,
  X,
  Building2,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface TenantItem {
  id: string;
  name: string;
  badge: string;
  desc: string;
  badgeColor: string;
}

export const TENANT_LIST: TenantItem[] = [
  {
    id: 'newland-edu-cloud',
    name: '新大陆教育行业云',
    badge: '新',
    desc: '主租户 · 教育行业云默认空间',
    badgeColor: 'from-blue-500 to-blue-600',
  },
  {
    id: 'newland-college',
    name: '新大陆工程技术学院',
    badge: '工',
    desc: '本校实训基地 · 默认教学租户',
    badgeColor: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'ecust-demo',
    name: '华东理工实训示范校',
    badge: '华',
    desc: '跨校联合实训示范租户',
    badgeColor: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'tongji-smart',
    name: '同济智能制造学院',
    badge: '同',
    desc: '智能制造产教融合租户',
    badgeColor: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'szpt-iot',
    name: '深圳职业技术大学智能物联中心',
    badge: '深',
    desc: '物联网实训协同租户',
    badgeColor: 'from-violet-500 to-indigo-600',
  },
];

const TENANT_STORAGE_KEY = 'uusima_active_tenant_id_v1';
const USER_STORAGE_KEY = 'uusima_active_user_v1';
export const TENANT_UPDATED_EVENT = 'uusima-tenant-updated';

const DEFAULT_TENANT = TENANT_LIST[1] || TENANT_LIST[0];

export function getActiveTenant(): TenantItem {
  try {
    const savedId = localStorage.getItem(TENANT_STORAGE_KEY);
    if (savedId) {
      const found = TENANT_LIST.find((t) => t.id === savedId);
      if (found) return found;
    }
  } catch {
    // ignore
  }
  return DEFAULT_TENANT;
}

interface UserProfile {
  name: string;
  phone: string;
  email: string;
  role: string;
}

const DEFAULT_USER: UserProfile = {
  name: '杨振邦',
  phone: '15396005420',
  email: 'yangzb@newland-edu.cn',
  role: '平台管理员',
};

export default function UserTenantMenu() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'main' | 'tenant'>('main');

  const [activeTenantId, setActiveTenantId] = useState<string>(() => getActiveTenant().id);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_USER;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<UserProfile>(userProfile);
  const [isLoggedOutNotice, setIsLoggedOutNotice] = useState(false);

  const activeTenant =
    TENANT_LIST.find((t) => t.id === activeTenantId) || DEFAULT_TENANT;

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectTenant = (tenant: TenantItem) => {
    setActiveTenantId(tenant.id);
    try {
      localStorage.setItem(TENANT_STORAGE_KEY, tenant.id);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent<TenantItem>(TENANT_UPDATED_EVENT, { detail: tenant }));
    setViewMode('main');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm.name.trim()) return;
    const updated = {
      ...settingsForm,
      name: settingsForm.name.trim(),
      phone: settingsForm.phone.trim() || DEFAULT_USER.phone,
    };
    setUserProfile(updated);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setIsSettingsOpen(false);
  };

  const handleOpenSettings = () => {
    setSettingsForm(userProfile);
    setIsSettingsOpen(true);
    setIsOpen(false);
  };

  const handleGoConsole = (scope: 'system' | 'platform') => {
    setIsOpen(false);
    navigate(`/console?scope=${scope}`);
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    setIsLoggedOutNotice(true);
  };

  const avatarChar = userProfile.name.slice(0, 1) || '杨';

  return (
    <>
      <div ref={containerRef} className="relative flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Tenant Switcher Display in Top-Right */}
        <button
          type="button"
          onClick={() => {
            if (isOpen && viewMode === 'tenant') {
              setIsOpen(false);
            } else {
              setViewMode('tenant');
              setIsOpen(true);
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100/80 transition-colors whitespace-nowrap shrink-0"
          title="切换当前租户组织"
        >
          <LayoutGrid className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="hidden md:inline max-w-[140px] truncate">
            {activeTenant.name}
          </span>
        </button>

        {/* User Dropdown Trigger (matching screenshot top-right) */}
        <button
          type="button"
          onClick={() => {
            if (isOpen && viewMode === 'main') {
              setIsOpen(false);
            } else {
              setViewMode('main');
              setIsOpen(true);
            }
          }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50/70 transition-colors whitespace-nowrap shrink-0"
        >
          <span>{userProfile.name}</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-150',
              isOpen && viewMode === 'main' ? 'rotate-180' : ''
            )}
          />
        </button>

        {/* Dropdown Popover Card (Reference: image_dc173e7f.png) */}
        {isOpen && (
          <div className="absolute right-0 top-[calc(100%+10px)] w-[310px] sm:w-[324px] rounded-2xl bg-[#f8fafc] border border-slate-200/90 shadow-xl p-3.5 z-50">
            {viewMode === 'main' ? (
              <div className="space-y-2.5">
                {/* Top Blue Gradient User Banner Card */}
                <div className="rounded-xl bg-gradient-to-br from-[#62a7ff] via-[#458af9] to-[#2d72f2] text-white p-4 relative overflow-hidden shadow-xs">
                  {/* Decorative 3D-style profile card SVG on right side */}
                  <svg
                    viewBox="0 0 120 96"
                    className="w-24 h-20 absolute right-1.5 bottom-0.5 pointer-events-none select-none opacity-95"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    {/* Base Pedestal */}
                    <ellipse cx="64" cy="80" rx="40" ry="10" fill="white" fillOpacity="0.22" />
                    <ellipse cx="64" cy="76" rx="34" ry="8" fill="white" fillOpacity="0.32" />
                    {/* Stacked translucent cards */}
                    <rect
                      x="44"
                      y="18"
                      width="40"
                      height="44"
                      rx="9"
                      fill="white"
                      fillOpacity="0.28"
                      transform="rotate(8 44 18)"
                    />
                    <rect
                      x="38"
                      y="24"
                      width="42"
                      height="46"
                      rx="10"
                      fill="white"
                      fillOpacity="0.45"
                    />
                    {/* Front blue badge */}
                    <rect
                      x="32"
                      y="30"
                      width="42"
                      height="44"
                      rx="10"
                      fill="#1D5CE5"
                      fillOpacity="0.88"
                      stroke="white"
                      strokeOpacity="0.55"
                      strokeWidth="1.5"
                    />
                    <circle cx="53" cy="46" r="6" fill="white" />
                    <path
                      d="M42 63C42 57.5 47 54 53 54C59 54 64 57.5 64 63"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Orbit ring */}
                    <ellipse
                      cx="60"
                      cy="54"
                      rx="46"
                      ry="14"
                      stroke="white"
                      strokeOpacity="0.4"
                      strokeWidth="1.2"
                      transform="rotate(-12 60 54)"
                    />
                    <circle cx="96" cy="42" r="3.5" fill="white" fillOpacity="0.75" />
                    <circle cx="22" cy="56" r="2.5" fill="white" fillOpacity="0.75" />
                  </svg>

                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-xs flex items-center justify-center text-white font-semibold text-base">
                      {avatarChar}
                    </div>
                    <div className="mt-2.5 font-bold text-base tracking-tight text-white">
                      {userProfile.name}
                    </div>
                    <div className="text-xs text-white/90 mt-0.5 tabular-nums">
                      {userProfile.phone}
                    </div>
                  </div>
                </div>

                {/* Menu Action Rows */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="w-full rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 px-3.5 py-2.5 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <User className="w-4 h-4 text-sky-500" />
                      <span>个人设置</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGoConsole('system')}
                    className="w-full rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 px-3.5 py-2.5 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <Settings className="w-4 h-4 text-blue-600" />
                      <span>系统管理</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGoConsole('platform')}
                    className="w-full rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 px-3.5 py-2.5 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <Activity className="w-4 h-4 text-sky-500" />
                      <span>平台运营</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="w-full rounded-xl bg-white border border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/40 px-3.5 py-2.5 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-medium text-rose-500">
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>退出登录</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Organization / Tenant Switcher Section */}
                <div className="pt-1 space-y-1.5">
                  <div className="px-1 text-xs font-medium text-slate-500">组织</div>
                  <button
                    type="button"
                    onClick={() => setViewMode('tenant')}
                    className="w-full rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 px-3 py-2.5 flex items-center justify-between gap-2 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          'w-7 h-7 rounded-lg bg-gradient-to-br text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs',
                          activeTenant.badgeColor
                        )}
                      >
                        {activeTenant.badge}
                      </span>
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {activeTenant.name}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-600 shrink-0 whitespace-nowrap">
                      <span>切换</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* Tenant Switch List View */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setViewMode('main')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>返回</span>
                  </button>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>切换组织 / 租户</span>
                  </span>
                  <span className="w-8" />
                </div>

                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
                  {TENANT_LIST.map((tenant) => {
                    const isSelected = tenant.id === activeTenant.id;
                    return (
                      <button
                        key={tenant.id}
                        type="button"
                        onClick={() => handleSelectTenant(tenant)}
                        className={cn(
                          'w-full rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2.5 text-left transition-colors',
                          isSelected
                            ? 'bg-blue-50/70 border-blue-300'
                            : 'bg-white border-slate-200/80 hover:border-blue-200 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              'w-7 h-7 rounded-lg bg-gradient-to-br text-white text-xs font-bold flex items-center justify-center shrink-0',
                              tenant.badgeColor
                            )}
                          >
                            {tenant.badge}
                          </span>
                          <div className="min-w-0">
                            <div
                              className={cn(
                                'text-xs font-semibold truncate',
                                isSelected ? 'text-blue-700' : 'text-slate-800'
                              )}
                            >
                              {tenant.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {tenant.desc}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personal Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">个人设置</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">用户姓名</label>
                <input
                  type="text"
                  required
                  value={settingsForm.name}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">手机号码</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">所属租户</label>
                <input
                  type="text"
                  disabled
                  value={activeTenant.name}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  保存设置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {isLoggedOutNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">退出登录确认</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  当前账号：{userProfile.name}（{activeTenant.name}）
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              确认退出当前实训平台会话吗？退出后您可以重新登录或切换其他账号。
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsLoggedOutNotice(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoggedOutNotice(false);
                  navigate('/');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
