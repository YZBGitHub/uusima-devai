import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Plus, Trash2, Edit, Play, FileText, CheckCircle, 
  XCircle, Zap, Cpu, Server, Check, ExternalLink,
  Shield, School, Globe, Layers, Settings, RefreshCw, BarChart2,
  Terminal, Sliders, Database, Eye, ArrowUpCircle, UserCheck,
  MapPin, Clock, Tag, Wifi, WifiOff, MoreHorizontal, Download, Wrench,
  ChevronRight, ChevronDown, ChevronLeft, LayoutDashboard, Menu, X, User, Users, AlertTriangle, Building,
  Activity, CheckCircle2, Folder, FolderPlus, FolderOpen, Link2, Unlink,
  Calendar, BarChart3, MessageSquare, Copy, Upload, FileUp, FileArchive, Package,
  LayoutGrid, List, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  INITIAL_SYSTEM_AGENTS,
  INITIAL_CUSTOM_AGENTS,
  getCustomAgents,
  saveCustomAgents,
  loadStoredDesignConfigsMap,
  saveStoredDesignConfigsMap,
  type HardwareAgentItem,
} from '../data/agents';
import OverviewDashboard from '../components/OverviewDashboard';
import AgentKnowledgeModal, { AgentKnowledgeBase } from '../components/AgentKnowledgeModal';
import AgentDebugModal from '../components/AgentDebugModal';
import AgentDesignModal, {
  AgentDesignConfig,
  createDefaultDesignConfig,
  type McpProtocol,
  type McpToolItem,
} from '../components/AgentDesignModal';
import DeviceConnectPreModal from '../components/DeviceConnectPreModal';
import PlatformSystemToolsPanel, {
  INITIAL_PLATFORM_SYSTEM_TOOLS,
} from '../components/PlatformSystemToolsPanel';
import PlatformSystemConfigPanel from '../components/PlatformSystemConfigPanel';
import {
  type DefaultAiConfig,
  loadDefaultKbConfig,
  saveDefaultKbConfig,
} from '../lib/defaultKnowledgeBase';

// ================== DATA TYPES ==================

// 1. 资产管理 (Asset Item - Tree Hierarchy matching mind map)
// 字段: 资产名称, 上级, 排序号, 备注 | 操作: 编辑, 删除 | 搜索: 资产名称
export interface AssetItem {
  id: number;
  name: string;
  parentId: number | null;
  parentName?: string;
  orderNum: number;
  remark: string;
  schoolName: string;
  children?: AssetItem[];
}

// 2. 终端管理 (Terminal Item)
// 字段: 名称/型号, IP, 当前状态, 关联资产(原最近上线地点), 最近上线时间, 登录账号, 设备序列号
// 去除了: 归属账号
export interface TerminalItem {
  id: number;
  name: string;
  ip: string;
  lastOnlineTime: string;
  assetId: number | null;
  assetName: string; // 关联资产
  loginAccount: string;
  status: 'online' | 'offline';
  sn: string;
  schoolName: string;
  model: string;
}

// 3. 自定义智能体 (Custom Agent Item)
export interface CustomAgent {
  id: number;
  name: string;
  desc: string;
  coverImage: string;
  userCount: number;
  schoolName: string;
  status: 'published' | 'draft';
  knowledgeCount: number;
  workflowSteps: number;
  callCount: number;
  lastDebugTime: string;
  hardwareModel: string;
}

// 4. 终端运行日志 (Terminal Log Item)
// 字段: 时间, 类型(开机、关机、异常、告警、调试、升级、故障), IP, 日志说明, 关联账号, 操作(详细日志)
export type LogTypeCategory = '开机' | '关机' | '异常' | '告警' | '调试' | '升级' | '故障';

export interface TerminalLogItem {
  id: string;
  time: string;
  type: LogTypeCategory;
  ip: string;
  description: string;
  account: string;
  detail: {
    protocol?: string;
    errorCode?: string;
    rawPacket?: string;
    registers?: string;
    actionTaken?: string;
  };
}

// 5. 平台运营 · 固件管理 (Firmware Item)
// 字段: 固件名称、版本、备注、发布状态 (发布、未发布、下架)，新增固件支持上传文件
export type FirmwareStatus = '发布' | '未发布' | '下架';

export interface FirmwareItem {
  id: number;
  name: string;
  version: string;
  fileName: string;
  fileSize: string;
  hardwareModel: string;
  remark: string;
  uploadTime: string;
  status: FirmwareStatus;
  sha256?: string;
  downloadCount?: number;
}

// ================== INITIAL MOCK DATA ==================

const DEFAULT_LOCAL_SCHOOL = '新大陆工程技术学院';

// 初始多级树形资产数据
const initialAssets: AssetItem[] = [
  {
    id: 1,
    name: '新大陆工程技术实训基地',
    parentId: null,
    orderNum: 1,
    remark: '新工科国家级综合实验教学示范基地',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 2,
    name: '信息楼 A 栋',
    parentId: 1,
    parentName: '新大陆工程技术实训基地',
    orderNum: 1,
    remark: '物联网工程与嵌入式软件教学楼',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 3,
    name: 'A-301 物联网综合实训室',
    parentId: 2,
    parentName: '信息楼 A 栋',
    orderNum: 1,
    remark: '配备40套智能网关、无线传感与边缘计算实验箱',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 4,
    name: 'A-302 嵌入式总线实验室',
    parentId: 2,
    parentName: '信息楼 A 栋',
    orderNum: 2,
    remark: 'Modbus/CAN/RS485 通讯接口调测工位',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 5,
    name: '实验楼 B 栋',
    parentId: 1,
    parentName: '新大陆工程技术实训基地',
    orderNum: 2,
    remark: '人工智能与机器视觉协同中心',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 6,
    name: 'B-205 人工智能前端视觉中心',
    parentId: 5,
    parentName: '实验楼 B 栋',
    orderNum: 1,
    remark: '工业相机分拣与机械臂联动实训台',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 7,
    name: '工程实训中心 D 栋',
    parentId: 1,
    parentName: '新大陆工程技术实训基地',
    orderNum: 3,
    remark: '智能制造与数字化车间产线',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 8,
    name: 'D-102 智能制造边缘车间',
    parentId: 7,
    parentName: '工程实训中心 D 栋',
    orderNum: 1,
    remark: 'PLC与研华工业网关制造实训台',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 9,
    name: '现代生态农业实训大棚',
    parentId: 1,
    parentName: '新大陆工程技术实训基地',
    orderNum: 4,
    remark: '智慧农业物联网精准灌溉与气象监测基地',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  {
    id: 10,
    name: '生态大棚 3 号水肥联动区',
    parentId: 9,
    parentName: '现代生态农业实训大棚',
    orderNum: 1,
    remark: '电磁阀继电器组与土壤温湿度传感试验点',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  },
  // 华东理工资产
  {
    id: 20,
    name: '华东理工工业4.0示范中心',
    parentId: null,
    orderNum: 2,
    remark: '跨校智能物联联合实训示范中心',
    schoolName: '华东理工实训示范校',
  },
  {
    id: 21,
    name: '智造大楼 102 自动化室',
    parentId: 20,
    parentName: '华东理工工业4.0示范中心',
    orderNum: 1,
    remark: '工业现场总线与LoRa数传实训站',
    schoolName: '华东理工实训示范校',
  },
];

// 初始终端列表
const initialTerminals: TerminalItem[] = [
  // 本校: 新大陆工程技术学院
  {
    id: 1,
    name: '物联实训终端-01',
    ip: '192.168.1.101',
    lastOnlineTime: '2026-03-28 10:14:22',
    assetId: 3,
    assetName: 'A-301 物联网综合实训室',
    loginAccount: 'student_zhang',
    status: 'online',
    sn: 'NL-2026-SN88901',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'NL-AGENT-V1',
  },
  {
    id: 2,
    name: '工业网关终端-02',
    ip: '192.168.1.102',
    lastOnlineTime: '2026-03-28 09:45:10',
    assetId: 3,
    assetName: 'A-301 物联网综合实训室',
    loginAccount: 'student_li',
    status: 'online',
    sn: 'NL-2026-SN88902',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'NL-AGENT-PRO',
  },
  {
    id: 3,
    name: 'AI前端视觉台-03',
    ip: '192.168.2.205',
    lastOnlineTime: '2026-03-28 10:02:44',
    assetId: 6,
    assetName: 'B-205 人工智能前端视觉中心',
    loginAccount: 'teacher_wang',
    status: 'online',
    sn: 'NL-2026-SN99103',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'AI-FRONTEND-V1',
  },
  {
    id: 4,
    name: '智能制造边缘网关-04',
    ip: '',
    lastOnlineTime: '',
    assetId: null,
    assetName: '',
    loginAccount: 'operator_chen',
    status: 'offline',
    sn: 'NL-2026-SN77304',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'ECU-1251',
  },
  {
    id: 5,
    name: '四通道IO控制器-05',
    ip: '192.168.4.88',
    lastOnlineTime: '2026-03-28 08:20:00',
    assetId: null,
    assetName: '',
    loginAccount: 'student_zhao',
    status: 'online',
    sn: 'NL-2026-SN66205',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'USR-IO424',
  },
  // 其他高校
  {
    id: 6,
    name: '智慧农业数传终端-06',
    ip: '192.168.5.55',
    lastOnlineTime: '2026-03-26 14:10:33',
    assetId: 10,
    assetName: '生态大棚 3 号水肥联动区',
    loginAccount: 'agri_tech01',
    status: 'offline',
    sn: 'NL-2026-SN55106',
    schoolName: '华东理工实训示范校',
    model: 'USR-M100',
  },
  {
    id: 7,
    name: '工业4.0总线网关-07',
    ip: '192.168.5.80',
    lastOnlineTime: '2026-03-28 09:12:00',
    assetId: 21,
    assetName: '智造大楼 102 自动化室',
    loginAccount: 'ecust_teacher',
    status: 'online',
    sn: 'NL-2026-SN55107',
    schoolName: '华东理工实训示范校',
    model: 'NL-GW-2000',
  },
  {
    id: 8,
    name: '研华嵌入式工控网关-08',
    ip: '192.168.8.12',
    lastOnlineTime: '2026-03-28 10:15:30',
    assetId: null,
    assetName: '未关联资产',
    loginAccount: 'tj_admin01',
    status: 'online',
    sn: 'NL-2026-SN44808',
    schoolName: '同济智能制造学院',
    model: 'ADVANTECH-ECU1251',
  },
  {
    id: 9,
    name: '智能电表 Modbus 控制器-09',
    ip: '192.168.8.44',
    lastOnlineTime: '2026-03-28 07:50:11',
    assetId: null,
    assetName: '未关联资产',
    loginAccount: 'tj_student02',
    status: 'online',
    sn: 'NL-2026-SN44809',
    schoolName: '同济智能制造学院',
    model: 'USR-TCP232-410s',
  },
  {
    id: 10,
    name: '边缘计算视觉实训箱-10',
    ip: '192.168.9.100',
    lastOnlineTime: '2026-03-28 10:20:45',
    assetId: null,
    assetName: '未关联资产',
    loginAccount: 'szpt_teacher',
    status: 'online',
    sn: 'NL-2026-SN33910',
    schoolName: '深圳职业技术大学智能物联中心',
    model: 'AI-FRONTEND-V1',
  },
  {
    id: 11,
    name: 'LoRa无线传感网关-11',
    ip: '192.168.1.111',
    lastOnlineTime: '2026-03-28 10:18:22',
    assetId: 3,
    assetName: 'A-301 物联网综合实训室',
    loginAccount: 'lab_admin01',
    status: 'online',
    sn: 'NL-2026-SN11911',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'NL-LORA-GW',
  },
  {
    id: 12,
    name: '总线接口调测箱-12',
    ip: '',
    lastOnlineTime: '',
    assetId: 4,
    assetName: 'A-302 嵌入式总线实验室',
    loginAccount: 'student_li',
    status: 'offline',
    sn: 'NL-2026-SN11912',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'USR-TCP232-410s',
  },
  {
    id: 13,
    name: '工业相机机械臂工作站-13',
    ip: '192.168.2.213',
    lastOnlineTime: '2026-03-28 09:55:01',
    assetId: 6,
    assetName: 'B-205 人工智能前端视觉中心',
    loginAccount: 'teacher_wang',
    status: 'online',
    sn: 'NL-2026-SN22913',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'AI-FRONTEND-V1',
  },
  {
    id: 14,
    name: 'PLC数控实验机-14',
    ip: '192.168.3.114',
    lastOnlineTime: '',
    assetId: 8,
    assetName: 'D-102 智能制造边缘车间',
    loginAccount: 'operator_chen',
    status: 'online',
    sn: 'NL-2026-SN33914',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'ECU-1251',
  },
  {
    id: 15,
    name: '智慧农业环境感知盒-15',
    ip: '192.168.4.115',
    lastOnlineTime: '2026-03-28 10:22:15',
    assetId: 10,
    assetName: '生态大棚 3 号水肥联动区',
    loginAccount: 'agri_tech01',
    status: 'online',
    sn: 'NL-2026-SN44915',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'USR-M100',
  },
  {
    id: 16,
    name: '边缘计算推断主机-16',
    ip: '',
    lastOnlineTime: '',
    assetId: null,
    assetName: '',
    loginAccount: 'guest_user',
    status: 'offline',
    sn: 'NL-2026-SN55916',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'NL-AGENT-PRO',
  },
  {
    id: 17,
    name: '无线传感数据中继-17',
    ip: '192.168.1.117',
    lastOnlineTime: '2026-03-28 10:25:33',
    assetId: null,
    assetName: '',
    loginAccount: 'lab_admin02',
    status: 'online',
    sn: 'NL-2026-SN66917',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'USR-IO424',
  },
  {
    id: 18,
    name: '工业交换网关终端-18',
    ip: '',
    lastOnlineTime: '',
    assetId: null,
    assetName: '',
    loginAccount: 'student_zhang',
    status: 'offline',
    sn: 'NL-2026-SN77918',
    schoolName: DEFAULT_LOCAL_SCHOOL,
    model: 'ADVANTECH-ECU1251',
  },
];

// 初始自定义智能体数据 (构造多条实训硬件智能体用于分页与多场景展示)
const initialCustomAgents: CustomAgent[] = [
  {
    id: 101,
    name: '自定义 PLC 梯形图调试助手',
    desc: '针对特定型号 PLC 的梯形图编程与通讯异常自诊断',
    coverImage: '/assets/agents/ecu-1251.png',
    userCount: 186,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 3,
    workflowSteps: 4,
    callCount: 1420,
    lastDebugTime: '2026-03-28 10:05',
    hardwareModel: 'ADVANTECH-ECU1251',
  },
  {
    id: 102,
    name: '四通道数字IO网络联动智能体',
    desc: '针对四通道继电器状态回读与光耦输入信号电平跳变排错',
    coverImage: '/assets/agents/io424-controller.png',
    userCount: 112,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 3,
    callCount: 890,
    lastDebugTime: '2026-03-27 16:20',
    hardwareModel: 'USR-IO424',
  },
  {
    id: 103,
    name: '串口服务器透明传输诊断体',
    desc: 'USR-TCP232-410s 串口参数自适应校准与心跳包监听',
    coverImage: '/assets/agents/serial-server.png',
    userCount: 43,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'draft',
    knowledgeCount: 1,
    workflowSteps: 2,
    callCount: 310,
    lastDebugTime: '2026-03-26 15:10',
    hardwareModel: 'USR-TCP232-410s',
  },
  {
    id: 104,
    name: 'Lora 节点自适应配置向导',
    desc: '频段 470-510MHz 空中速率与发射功率自动化标定',
    coverImage: '/assets/agents/lora-terminal.png',
    userCount: 28,
    schoolName: '华东理工实训示范校',
    status: 'draft',
    knowledgeCount: 1,
    workflowSteps: 5,
    callCount: 160,
    lastDebugTime: '2026-03-25 11:40',
    hardwareModel: 'USR-LG206',
  },
  {
    id: 105,
    name: '智慧农业水肥一体化配比助手',
    desc: 'EC/PH 传感器实时反馈与电磁阀继电器脉冲调控智能体',
    coverImage: '/assets/agents/system-agent-5.png',
    userCount: 95,
    schoolName: '华东理工实训示范校',
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 4,
    callCount: 720,
    lastDebugTime: '2026-03-27 09:30',
    hardwareModel: 'NL-GW-2000',
  },
  {
    id: 106,
    name: '边缘计算中心网关运维专家',
    desc: '支持多路 MQTT 接入状态巡检、网口丢包定位及容器服务重启',
    coverImage: '/assets/agents/central-gateway.png',
    userCount: 154,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 4,
    callCount: 960,
    lastDebugTime: '2026-03-28 08:40',
    hardwareModel: 'NL-GW-2000',
  },
  {
    id: 107,
    name: 'USR-M100 边缘物联网采集助手',
    desc: 'RS485/AI/DI 混合通道数据解析、云端 MQTT 上报断点续传排查',
    coverImage: '/assets/agents/usr-m100.png',
    userCount: 79,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 3,
    callCount: 540,
    lastDebugTime: '2026-03-26 19:15',
    hardwareModel: 'USR-M100',
  },
  {
    id: 108,
    name: 'AI 前端视觉实训终端诊断体',
    desc: '工业相机帧率抖动分析、目标检测推理耗时与串口机械臂联动调试',
    coverImage: '/assets/agents/ai-terminal.png',
    userCount: 138,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 5,
    callCount: 1120,
    lastDebugTime: '2026-03-28 11:02',
    hardwareModel: 'AI-FRONTEND-V1',
  },
  {
    id: 109,
    name: '工业总线 CAN-FD 协议分析助手',
    desc: '高速 CAN-FD 报文仲裁段冲突检测与终端匹配阻抗核验',
    coverImage: '/assets/agents/device_1.png',
    userCount: 64,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'draft',
    knowledgeCount: 1,
    workflowSteps: 3,
    callCount: 245,
    lastDebugTime: '2026-03-25 14:50',
    hardwareModel: 'PCAN-USB-FD',
  },
  {
    id: 110,
    name: '温湿度与光照环境传感标定体',
    desc: '针对实训室气象采集节点 Modbus 地址冲突与漂移校准',
    coverImage: '/assets/agents/device_2.png',
    userCount: 88,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 3,
    callCount: 470,
    lastDebugTime: '2026-03-27 10:15',
    hardwareModel: 'RS-WS-N01-8',
  },
  {
    id: 111,
    name: '智能电表能耗采集与谐波诊断',
    desc: 'DL/T645 与 Modbus 规约三相电表读数异常、CT 变比核验辅助',
    coverImage: '/assets/agents/device_3.png',
    userCount: 52,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'draft',
    knowledgeCount: 1,
    workflowSteps: 4,
    callCount: 195,
    lastDebugTime: '2026-03-24 17:30',
    hardwareModel: 'DTSU666-M',
  },
  {
    id: 112,
    name: 'RFID 高频门禁读卡器排错专家',
    desc: 'ISO15693 标签识读率下降分析、RS232 波特率校验与天线驻波比排查',
    coverImage: '/assets/agents/device_4.png',
    userCount: 71,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 3,
    callCount: 410,
    lastDebugTime: '2026-03-26 16:05',
    hardwareModel: 'NL-RFID-HF200',
  },
  {
    id: 113,
    name: '六轴协作机械臂示教联动助手',
    desc: '关节伺服使能告警解析、TCP/IP 坐标点位下发与夹爪 IO 同步调试',
    coverImage: '/assets/agents/device_5.png',
    userCount: 121,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'published',
    knowledgeCount: 1,
    workflowSteps: 5,
    callCount: 830,
    lastDebugTime: '2026-03-28 09:50',
    hardwareModel: 'ELITE-EC66',
  },
  {
    id: 114,
    name: '智能仓储 AGV 调度通信诊断体',
    desc: 'Wi-Fi 漫游丢包定位、激光雷达避障状态码读取与调度 MQTT 心跳监控',
    coverImage: '/assets/agents/device_6.png',
    userCount: 47,
    schoolName: DEFAULT_LOCAL_SCHOOL,
    status: 'draft',
    knowledgeCount: 1,
    workflowSteps: 4,
    callCount: 280,
    lastDebugTime: '2026-03-25 13:20',
    hardwareModel: 'NL-AGV-S100',
  },
];

const initialAgentKnowledgeBasesMap: Record<number, AgentKnowledgeBase[]> = {
  101: [
    {
      id: 'kb-101-1',
      name: '工业网关协议与寄存器核心问答库',
      description: '包含 ECU-1251 串口引脚定义、Modbus TCP/RTU 寄存器映射表与心跳超时排查理论答疑',
      updatedAt: '2026-09-15 14:20:00',
      docs: [
        {
          id: 'doc-101-1',
          name: 'ECU-1251工业通讯网关用户手册_V2.pdf',
          fileType: 'PDF',
          size: '4.2 MB',
          uploadedAt: '2026-09-15 14:18:22',
          status: 'completed',
          content: '寄存器 0x0001 控制 RS485 波特率（默认 115200bps）；寄存器 0x0002 配置站号（1-247）；当出现 CRC 校验失败时优先核对终端匹配电阻 120Ω 与双绞线 A/B 极性。',
        },
        {
          id: 'doc-101-2',
          name: 'PLC梯形图通讯异常自诊断手册.docx',
          fileType: 'DOC',
          size: '1.8 MB',
          uploadedAt: '2026-09-15 14:19:05',
          status: 'completed',
          content: '错误码 E04 表示 Modbus 从站响应超时（>500ms），建议检测网关串口 FIFO 缓冲区配置并将轮询周期调至 100ms 以上。',
        },
        {
          id: 'doc-101-3',
          name: '工业总线RS485抗干扰与接地规范.md',
          fileType: 'MD',
          size: '320 KB',
          uploadedAt: '2026-09-15 14:20:00',
          status: 'completed',
          content: '实训工位需采用手拉手串联拓扑，屏蔽层单端可靠接地，A+ 对 B- 差分电压应维持在 200mV 以上。',
        },
        {
          id: 'doc-101-4',
          name: '实训常见硬件接线错误及排查步骤.txt',
          fileType: 'TXT',
          size: '120 KB',
          uploadedAt: '2026-09-14 10:11:30',
          status: 'completed',
          content: '排查步骤：1. 万用表测量 24V DC 电源纹波；2. 断开星型分支改为手拉手串联；3. 验证终端匹配电阻阻值。',
        },
      ],
    },
    {
      id: 'kb-101-2',
      name: 'Modbus实训工程排错与调试指南',
      description: '学生实验常见环境连接报错、串口帧超时及寄存器维度不匹配解决方案',
      updatedAt: '2026-09-12 11:30:15',
      docs: [
        {
          id: 'doc-101-5',
          name: 'Modbus-RTU功能码与异常码对照表.pdf',
          fileType: 'PDF',
          size: '2.1 MB',
          uploadedAt: '2026-09-12 11:25:10',
          status: 'completed',
          content: '异常码 0x01 非法功能码；0x02 非法数据地址；0x03 非法数据值；0x04 从站设备故障。',
        },
        {
          id: 'doc-101-6',
          name: '边缘网关TCP透传通道配置模板.md',
          fileType: 'MD',
          size: '240 KB',
          uploadedAt: '2026-09-12 11:28:40',
          status: 'completed',
          content: '透传端口默认 502，心跳间隔 30s，建议开启断线自动重连并配置看门狗复位周期。',
        },
      ],
    },
    {
      id: 'kb-101-3',
      name: '校本特色实训指导大纲与验收规范',
      description: '工业互联网网关实训考核评分标准、排错报告模板与操作规范',
      updatedAt: '2026-09-08 09:10:00',
      docs: [
        {
          id: 'doc-101-7',
          name: '产教融合实训工位验收标准_2026.docx',
          fileType: 'DOC',
          size: '1.5 MB',
          uploadedAt: '2026-09-08 09:10:00',
          status: 'completed',
          content: '考核内容涵盖硬件接线核验、网关联网心跳验证、异常故障定位与自愈脚本下发四个维度。',
        },
      ],
    },
  ],
  102: [
    {
      id: 'kb-102-1',
      name: 'USR-IO424 四通道继电器与光耦知识库',
      description: '覆盖四路 DO 继电器输出线圈地址、DI 光耦输入滤波与感性负载保护规范',
      updatedAt: '2026-09-14 11:20:00',
      docs: [
        {
          id: 'doc-102-1',
          name: 'USR-IO424四通道数字IO控制指令集.pdf',
          fileType: 'PDF',
          size: '1.6 MB',
          uploadedAt: '2026-09-14 11:18:10',
          status: 'completed',
          content: '线圈地址 0x0000~0x0003 对应 DO1~DO4；输入寄存器 0x0010 读取 DI1~DI4 状态位；支持防抖时间 10ms~500ms 动态下发。',
        },
        {
          id: 'doc-102-2',
          name: '光耦输入电平跳变与继电器保护规范.md',
          fileType: 'MD',
          size: '64 KB',
          uploadedAt: '2026-09-14 11:20:00',
          status: 'completed',
          content: '驱动电磁阀或接触器等感性负载时，必须在继电器触点两端并联 RC 吸收回路或续流二极管，防止反电动势导致 MCU 复位。',
        },
      ],
    },
  ],
  103: [
    {
      id: 'kb-103-1',
      name: 'USR-TCP232 串口透传与丢包排查库',
      description: '包含 TCP Server/Client 透传模式、心跳包帧格式与粘包处理机制',
      updatedAt: '2026-09-10 15:00:00',
      docs: [
        {
          id: 'doc-103-1',
          name: 'USR-TCP232-410s串口参数自适应规范.pdf',
          fileType: 'PDF',
          size: '1.9 MB',
          uploadedAt: '2026-09-10 15:00:00',
          status: 'completed',
          content: '默认透传端口 23/26，串口帧打包时间建议设置为 10ms；当丢包率高于 5% 时建议开启硬件流控 RTS/CTS 并匹配双方奇偶校验位。',
        },
      ],
    },
  ],
  104: [
    {
      id: 'kb-104-1',
      name: 'LoRa 扩频通信频段与速率标定库',
      description: 'CN470 频段信道规划、SF7-SF12 扩频因子与发射功率 dBm 对照参考',
      updatedAt: '2026-09-09 11:30:00',
      docs: [
        {
          id: 'doc-104-1',
          name: 'USR-LG206_LoRa频段与扩频因子配置说明.md',
          fileType: 'MD',
          size: '92 KB',
          uploadedAt: '2026-09-09 11:30:00',
          status: 'completed',
          content: '信道 0-95 对应 470.3MHz~489.3MHz，室内实训建议 SF7 速率优先，远距离大棚场景切换至 SF10 并开启 ADR 自适应速率。',
        },
      ],
    },
  ],
  105: [
    {
      id: 'kb-105-1',
      name: '智慧农业水肥一体化传感标定知识库',
      description: '温室大棚营养液 EC/PH 电极两点标定流程与 PID 电磁阀脉冲调控策略',
      updatedAt: '2026-09-16 09:20:00',
      docs: [
        {
          id: 'doc-105-1',
          name: '水肥一体化EC_PH传感标定与配比算法.pdf',
          fileType: 'PDF',
          size: '3.1 MB',
          uploadedAt: '2026-09-16 09:20:00',
          status: 'completed',
          content: 'EC 目标阈值 1.8~2.2 mS/cm，PH 控制区间 5.8~6.4；若传感器读数漂移超过 0.3，需触发自清洗电磁阀 15s 后重新采样。',
        },
      ],
    },
  ],
  106: [
    {
      id: 'kb-106-1',
      name: '中心网关 MQTT 接入与边缘容器运维库',
      description: '涵盖 NL-GW-2000 网口路由、MQTT Broker 保活心跳及 Docker 服务自检指南',
      updatedAt: '2026-09-15 08:40:00',
      docs: [
        {
          id: 'doc-106-1',
          name: 'NL-GW-2000中心网关运维指南.pdf',
          fileType: 'PDF',
          size: '2.8 MB',
          uploadedAt: '2026-09-15 08:40:00',
          status: 'completed',
          content: '默认 MQTT 端口 1883，心跳保活 60s；如出现断链优先检测网口链路灯与 TLS 证书有效期。',
        },
      ],
    },
  ],
  107: [
    {
      id: 'kb-107-1',
      name: 'USR-M100 多通道数采与断网续传手册',
      description: '记录 RS485 采集轮询与模拟量 AI 4-20mA 换算标准公式',
      updatedAt: '2026-09-13 19:15:00',
      docs: [
        {
          id: 'doc-107-1',
          name: 'USR-M100采集通道寄存器说明.md',
          fileType: 'MD',
          size: '185 KB',
          uploadedAt: '2026-09-13 19:15:00',
          status: 'completed',
          content: 'AI1~AI2 支持 4-20mA 电流输入，对应寄存器 0x0010~0x0011，断点续传缓存最大 4096 条。',
        },
      ],
    },
  ],
  108: [
    {
      id: 'kb-108-1',
      name: 'AI 视觉推理与串口联动排错库',
      description: '工业相机曝光参数、NPU 推理帧率瓶颈及夹爪通信协议说明',
      updatedAt: '2026-09-14 11:02:00',
      docs: [
        {
          id: 'doc-108-1',
          name: 'AI视觉实训台标定与串口协议.pdf',
          fileType: 'PDF',
          size: '3.4 MB',
          uploadedAt: '2026-09-14 11:02:00',
          status: 'completed',
          content: '视觉分拣坐标系通过串口 115200bps 下发，连续 3 帧未识别需核查光源照度与镜头焦距。',
        },
      ],
    },
  ],
  109: [
    {
      id: 'kb-109-1',
      name: 'CAN-FD 总线仲裁与错误帧排查库',
      description: 'CAN-FD 数据段波特率切换与 120Ω 终端电阻配置说明',
      updatedAt: '2026-09-11 14:50:00',
      docs: [
        {
          id: 'doc-109-1',
          name: 'CAN-FD总线波形分析规范.txt',
          fileType: 'TXT',
          size: '96 KB',
          uploadedAt: '2026-09-11 14:50:00',
          status: 'completed',
          content: '仲裁段 500kbps、数据段 2Mbps，当总线上出现大量显性位填充错误时检查终端匹配电阻。',
        },
      ],
    },
  ],
  110: [
    {
      id: 'kb-110-1',
      name: '气象传感器校准与站号配置手册',
      description: '温湿度、光照度传感变送器寄存器偏移及零点修正参数',
      updatedAt: '2026-09-12 10:15:00',
      docs: [
        {
          id: 'doc-110-1',
          name: 'RS-WS-N01传感器Modbus规约.pdf',
          fileType: 'PDF',
          size: '1.1 MB',
          uploadedAt: '2026-09-12 10:15:00',
          status: 'completed',
          content: '0x0000 湿度（除以10），0x0001 温度（有符号补码除以10），默认站号 0x01。',
        },
      ],
    },
  ],
  111: [
    {
      id: 'kb-111-1',
      name: '三相智能电表通讯规约知识库',
      description: 'DL/T645-2007 与 Modbus RTU 双规约抄表指令集',
      updatedAt: '2026-09-10 17:30:00',
      docs: [
        {
          id: 'doc-111-1',
          name: 'DTSU666-M电表寄存器映射.doc',
          fileType: 'DOC',
          size: '920 KB',
          uploadedAt: '2026-09-10 17:30:00',
          status: 'completed',
          content: '正向有功总电能位于寄存器 0x2000，IEEE-754 浮点数格式，读取前确认互感器变比系数。',
        },
      ],
    },
  ],
  112: [
    {
      id: 'kb-112-1',
      name: 'RFID 读卡器天线与串口协议库',
      description: '13.56MHz 高频标签指令帧与防碰撞读卡参数配置',
      updatedAt: '2026-09-09 16:05:00',
      docs: [
        {
          id: 'doc-112-1',
          name: 'NL-RFID-HF200指令集手册.pdf',
          fileType: 'PDF',
          size: '1.4 MB',
          uploadedAt: '2026-09-09 16:05:00',
          status: 'completed',
          content: '默认串口 115200 8N1，射频功率支持 0.5W~1.5W 调节，读距异常需排查金属背板屏蔽干扰。',
        },
      ],
    },
  ],
  113: [
    {
      id: 'kb-113-1',
      name: '协作机械臂运动控制与报错代码库',
      description: '伺服驱动器报警代码、TCP/IP 控制端口及示教器联动规范',
      updatedAt: '2026-09-15 09:50:00',
      docs: [
        {
          id: 'doc-113-1',
          name: 'ELITE-EC66机械臂接口与报错字典.pdf',
          fileType: 'PDF',
          size: '4.8 MB',
          uploadedAt: '2026-09-15 09:50:00',
          status: 'completed',
          content: '控制端口 8055，状态广播端口 8056；急停拍下解除后需调用 clearAlarm() 并重新伺服使能。',
        },
      ],
    },
  ],
  114: [
    {
      id: 'kb-114-1',
      name: '智能 AGV 调度通信与避障诊断库',
      description: 'MQTT 调度指令格式、激光雷达点云遮挡告警与无线漫游优化',
      updatedAt: '2026-09-08 13:20:00',
      docs: [
        {
          id: 'doc-114-1',
          name: 'NL-AGV-S100调度通讯协议.md',
          fileType: 'MD',
          size: '210 KB',
          uploadedAt: '2026-09-08 13:20:00',
          status: 'completed',
          content: '调度心跳主题 agv/{id}/heartbeat，每 1000ms 上报电量、坐标与激光安全区域触发标志。',
        },
      ],
    },
  ],
};

const availableSchools = [
  '全部学校',
  '新大陆工程技术学院',
  '华东理工实训示范校',
  '同济智能制造学院',
  '深圳职业技术大学智能物联中心',
];

// 初始固件管理数据列表
export const initialFirmwares: FirmwareItem[] = [
  {
    id: 1,
    name: '物联边缘网关通用标准固件',
    version: 'v3.5.0-RELEASE',
    fileName: 'iot-edge-gateway-v3.5.0-release.bin',
    fileSize: '24.6 MB',
    hardwareModel: 'NL-GW-2000 / 通用终端',
    remark: '新增MCP双向长连接重试机制，增强CAN-Bus高频抗干扰滤波，优化断网自愈策略',
    uploadTime: '2026-03-24 10:20',
    status: '发布',
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    downloadCount: 142
  },
  {
    id: 2,
    name: 'ECU-1251 智能控制器增强版',
    version: 'v3.4.2-RELEASE',
    fileName: 'advantech-ecu1251-v3.4.2.tar.gz',
    fileSize: '31.2 MB',
    hardwareModel: 'ADVANTECH-ECU1251',
    remark: '修复Modbus RTU长报文分片丢失缺陷，提升梯形图指令周期执行吞吐',
    uploadTime: '2026-02-18 16:45',
    status: '下架',
    sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    downloadCount: 89
  },
  {
    id: 3,
    name: 'USR-IO424 网络IO控制专版固件',
    version: 'v1.4.0-STABLE',
    fileName: 'usr-io424-v1.4.0.bin',
    fileSize: '8.8 MB',
    hardwareModel: 'USR-IO424',
    remark: '优化数字量/模拟量端口状态采集中断响应，支持毫秒级边缘逻辑联锁',
    uploadTime: '2026-03-12 09:15',
    status: '发布',
    sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    downloadCount: 65
  },
  {
    id: 4,
    name: 'USR-M100 边缘网关下一代固件预览版',
    version: 'v3.6.0-BETA',
    fileName: 'usr-m100-v3.6.0-preview.bin',
    fileSize: '26.8 MB',
    hardwareModel: 'USR-M100',
    remark: '实验室测试版：内嵌轻量级TinyLlama推理引擎微调版，支持离线语音指令初筛',
    uploadTime: '2026-03-27 15:00',
    status: '未发布',
    sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    downloadCount: 12
  },
  {
    id: 5,
    name: 'Lora 无线传感基站固件',
    version: 'v2.1.0-RELEASE',
    fileName: 'usr-lg206-lora-v2.1.0.zip',
    fileSize: '12.4 MB',
    hardwareModel: 'USR-LG206',
    remark: '扩展433/868MHz跳频跳信道算法，降低遮挡场景丢包率至0.1%以下',
    uploadTime: '2026-01-10 11:30',
    status: '下架',
    sha256: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    downloadCount: 38
  },
  {
    id: 6,
    name: '物联终端资产安全防护热补丁',
    version: 'v3.5.1-PATCH',
    fileName: 'patch-security-hotfix-202603.bin',
    fileSize: '4.2 MB',
    hardwareModel: '通用终端 (全系兼容)',
    remark: '安全防护紧急加固补丁：TLS 1.3握手套件加固与非法端口扫描自动拦截',
    uploadTime: '2026-03-28 08:30',
    status: '未发布',
    sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    downloadCount: 0
  }
];

type NavigationTab = 
  | 'system_terminals' 
  | 'system_assets'
  | 'system_agents' 
  | 'system_overview' 
  | 'platform_terminals' 
  | 'platform_agents'  
  | 'platform_firmwares'
  | 'platform_system_tools'
  | 'platform_system_config'
  | 'platform_overview';

export default function Console() {
  const [searchParams] = useSearchParams();
  const scopeParam = searchParams.get('scope');

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavigationTab>(() =>
    scopeParam === 'platform' ? 'platform_terminals' : 'system_terminals'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (scopeParam === 'platform') {
      setActiveTab('platform_terminals');
    } else if (scopeParam === 'system') {
      setActiveTab('system_terminals');
    }
  }, [scopeParam]);

  // ================= 终端管理状态 =================
  const [terminals, setTerminals] = useState<TerminalItem[]>(initialTerminals);
  const [terminalSearchQuery, setTerminalSearchQuery] = useState('');
  const [terminalAccountQuery, setTerminalAccountQuery] = useState(''); // 1. 搜索增加按照账号搜索
  const [terminalStatusFilter, setTerminalStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [terminalSchoolFilter, setTerminalSchoolFilter] = useState('全部学校');
  const [selectedAssetFilterNames, setSelectedAssetFilterNames] = useState<string[]>([]); // 按照资产多选检索
  const [assetFilterDropdownOpen, setAssetFilterDropdownOpen] = useState(false);
  const [assetFilterKeyword, setAssetFilterKeyword] = useState('');
  const [activeMoreDropdownId, setActiveMoreDropdownId] = useState<number | null>(null); // 操作列点击更多后下拉展示
  const [activeActionModal, setActiveActionModal] = useState<{ type: string; terminal: TerminalItem } | null>(null);
  
  // 终端详情模态框下半部分图表状态 (在线记录折线图 & AI问答消耗柱状图)
  const [detailsTab, setDetailsTab] = useState<'online' | 'ai_tokens'>('online');
  const [detailsOnlineDimension, setDetailsOnlineDimension] = useState<'day' | 'month' | 'year'>('day');
  const [detailsHoveredPoint, setDetailsHoveredPoint] = useState<number | null>(null);
  const [detailsHoveredBar, setDetailsHoveredBar] = useState<number | null>(null);
  const [detailsTimeRange, setDetailsTimeRange] = useState<string>('近14天');
  const [detailsStartDate, setDetailsStartDate] = useState<string>('2026-03-15');
  const [detailsEndDate, setDetailsEndDate] = useState<string>('2026-03-28');
  const [detailsSearchKeyword, setDetailsSearchKeyword] = useState<string>('');
  
  // 分页状态
  const [terminalPage, setTerminalPage] = useState(1);
  const [terminalPageSize, setTerminalPageSize] = useState(10);

  // 批量操作多选状态
  const [selectedTerminalIds, setSelectedTerminalIds] = useState<number[]>([]);
  const [batchFirmwareModalOpen, setBatchFirmwareModalOpen] = useState(false);
  const [batchFirmwareUpgrading, setBatchFirmwareUpgrading] = useState(false);
  const [batchFirmwareProgress, setBatchFirmwareProgress] = useState(0);

  // 线上最新稳定固件版本
  const ONLINE_LATEST_FIRMWARE = 'v3.5.0-RELEASE';

  // 终端固件版本台账记录 (默认 v3.4.2-RELEASE 为低版本，需升级；个别为最新版)
  const [terminalFirmwares, setTerminalFirmwares] = useState<Record<number, string>>({
    1: 'v3.4.2-RELEASE',
    2: 'v3.4.2-RELEASE',
    3: 'v3.5.0-RELEASE',
    4: 'v3.4.2-RELEASE',
    5: 'v3.4.2-RELEASE',
    6: 'v3.4.2-RELEASE',
    7: 'v3.5.0-RELEASE',
    8: 'v3.4.2-RELEASE',
    11: 'v3.4.2-RELEASE',
    12: 'v3.4.2-RELEASE',
    13: 'v3.4.2-RELEASE',
    14: 'v3.4.2-RELEASE',
    15: 'v3.4.2-RELEASE',
    16: 'v3.4.2-RELEASE',
    17: 'v3.4.2-RELEASE',
    18: 'v3.4.2-RELEASE',
  });

  // 单设备固件升级流程状态 (Loading -> 离线不可升级/低版本可升级 -> 5s倒计时提示 -> 横向滚动条进度 -> 完成关闭)
  const [firmwareChecking, setFirmwareChecking] = useState(true);
  const [firmwareCountdownOpen, setFirmwareCountdownOpen] = useState(false);
  const [firmwareCountdown, setFirmwareCountdown] = useState(5);
  const [firmwareUpgrading, setFirmwareUpgrading] = useState(false);
  const [firmwareProgress, setFirmwareProgress] = useState(0);
  const [firmwareCurrentStep, setFirmwareCurrentStep] = useState('正在校验设备当前固件版本...');
  const [firmwareCompleted, setFirmwareCompleted] = useState(false);

  // 批量固件升级流程状态
  const [batchFirmwareChecking, setBatchFirmwareChecking] = useState(true);
  const [batchFirmwareCountdownOpen, setBatchFirmwareCountdownOpen] = useState(false);
  const [batchFirmwareCountdown, setBatchFirmwareCountdown] = useState(5);
  const [batchFirmwareCurrentStep, setBatchFirmwareCurrentStep] = useState('准备分发 OTA 补丁...');
  const [batchFirmwareCompleted, setBatchFirmwareCompleted] = useState(false);

  // 运行日志弹窗状态 (大弹窗、分页列表、时间范围、7种日志类型、搜索、详细日志)
  const [logTypeFilter, setLogTypeFilter] = useState<string>('全部类型');
  const [logTimeRangeFilter, setLogTimeRangeFilter] = useState<string>('全部时间');
  const [logSearchKeyword, setLogSearchKeyword] = useState<string>('');
  const [logPage, setLogPage] = useState<number>(1);
  const [logPageSize, setLogPageSize] = useState<number>(5);
  const [selectedLogDetail, setSelectedLogDetail] = useState<TerminalLogItem | null>(null);
  const [copiedLogFeedback, setCopiedLogFeedback] = useState<boolean>(false);

  // 绑定/关联资产弹窗 (树形资产展示)
  const [bindingTerminal, setBindingTerminal] = useState<TerminalItem | null>(null);
  const [selectedAssetIdForBinding, setSelectedAssetIdForBinding] = useState<number | null>(null);
  const [modalAssetSearch, setModalAssetSearch] = useState('');
  const [modalTreeExpanded, setModalTreeExpanded] = useState<Record<number, boolean>>({});

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  // 关联资产弹窗内部的“解除关联”操作
  const handleModalUnbindCurrentTerminal = () => {
    if (!bindingTerminal) return;
    const targetTerminal = bindingTerminal;
    setConfirmDialog({
      title: '确认解除关联',
      message: `确认解除终端【${targetTerminal.name}】与当前资产【${targetTerminal.assetName || '未关联资产'}】的关联？`,
      confirmLabel: '确认解除',
      variant: 'warning',
      onConfirm: () => {
        setTerminals((prev) =>
          prev.map((t) =>
            t.id === targetTerminal.id
              ? { ...t, assetId: null, assetName: '' }
              : t
          )
        );
        setBindingTerminal(null);
        setSelectedAssetIdForBinding(null);
        setConfirmDialog(null);
        showFirmwareToast(`已解除终端【${targetTerminal.name}】的资产关联`);
      },
    });
  };

  // 打开关联资产弹窗
  const handleOpenBindAssetModal = (term: TerminalItem) => {
    setBindingTerminal(term);
    setSelectedAssetIdForBinding(term.assetId);
    setModalAssetSearch('');
    const exp: Record<number, boolean> = {};
    assets.forEach((a) => {
      exp[a.id] = true;
    });
    setModalTreeExpanded(exp);
  };

  // ================= 资产管理状态 (树形多级资产管理) =================
  const [assets, setAssets] = useState<AssetItem[]>(initialAssets);
  const [assetSearchName, setAssetSearchName] = useState(''); // 搜索: 资产名称
  const [expandedAssetIds, setExpandedAssetIds] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    5: true,
    7: true,
    9: true,
    20: true,
  });
  
  // 新增/编辑资产弹窗
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [assetFormData, setAssetFormData] = useState({
    name: '',
    parentId: null as number | null,
    orderNum: 1,
    remark: '',
    schoolName: DEFAULT_LOCAL_SCHOOL,
  });

  // ================= 自定义智能体状态 =================
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>(initialCustomAgents);
  const [agentViewMode, setAgentViewMode] = useState<'grid' | 'list'>('grid');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentSchoolFilter, setAgentSchoolFilter] = useState('全部学校');
  const [agentStatusFilter, setAgentStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [agentPage, setAgentPage] = useState(1);
  const [agentPageSize, setAgentPageSize] = useState(8);
  const [designingAgent, setDesigningAgent] = useState<CustomAgent | null>(null);
  const [statsAgent, setStatsAgent] = useState<CustomAgent | null>(null);
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const [isNewAgentMenuOpen, setIsNewAgentMenuOpen] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState({ name: '', desc: '', hardwareModel: '' });
  const newAgentMenuRef = useRef<HTMLDivElement | null>(null);

  // 智能体设计配置状态 (连接配置 + MCP工具配置 + 多级指令库)
  const [agentDesignConfigsMap, setAgentDesignConfigsMap] = useState<Record<number, AgentDesignConfig>>(() => {
    const stored = loadStoredDesignConfigsMap();
    const map: Record<number, AgentDesignConfig> = { ...stored };
    initialCustomAgents.forEach((a) => {
      if (!map[a.id]) {
        map[a.id] = createDefaultDesignConfig(a.hardwareModel, a.name);
      }
    });
    return map;
  });

  // 同步后台已发布的自定义智能体与设计配置到共享存储，供智能体大厅与对话界面读取
  const syncCustomAgentsToPublicStore = (
    nextAgents: CustomAgent[],
    nextDesignMap: Record<number, AgentDesignConfig>
  ) => {
    saveStoredDesignConfigsMap(nextDesignMap);
    const publishedFromConsole: HardwareAgentItem[] = nextAgents
      .filter((a) => a.status === 'published')
      .map((a) => {
        const design = nextDesignMap[a.id];
        return {
          id: a.id,
          name: a.name,
          shortTitle: a.name,
          desc: a.desc,
          type: 'custom',
          industry: '物联网',
          status: 'published',
          schoolName: a.schoolName,
          author: a.schoolName,
          publishDate: a.lastDebugTime,
          views: String(a.callCount),
          openCount: a.callCount,
          popularity: 85,
          port: design?.mcpConfig?.protocol
            ? `${design.mcpConfig.protocol} / Custom`
            : 'TCP / Custom',
          model: a.hardwareModel,
          image: a.coverImage,
          deviceImage: a.coverImage,
          connectionFields: design?.connectionFields,
          commandTree: design?.commandTree,
          guideBullets: [
            `设备型号（${a.hardwareModel}）及当前连接通道参数`,
            '触发故障的操作步骤或报错日志截图',
            '需要排查或验证的指令/寄存器信息',
          ],
          guideTip: `当前智能体已关联 ${a.knowledgeCount} 个私有知识库，支持按预设指令快速排错`,
          guideHighlight: 'Connected OK',
          troubleshootingCommands: [],
          controlCommands: [],
        };
      });

    // 保留预置初始公开自定义智能体（11~14），并与控制台已发布项合并去重
    const existingPublic = getCustomAgents().filter((item) =>
      INITIAL_CUSTOM_AGENTS.some((init) => init.id === item.id)
    );
    const baseList = existingPublic.length > 0 ? existingPublic : INITIAL_CUSTOM_AGENTS;
    const mergedMap = new Map<number, HardwareAgentItem>();
    baseList.forEach((item) => mergedMap.set(item.id, item));
    publishedFromConsole.forEach((item) => mergedMap.set(item.id, item));
    saveCustomAgents(Array.from(mergedMap.values()));
  };

  // 智能体知识库管理状态 (多知识库列表 + 文件配置 + 自动向量化)
  const [agentKnowledgeBasesMap, setAgentKnowledgeBasesMap] = useState<Record<number, AgentKnowledgeBase[]>>(
    initialAgentKnowledgeBasesMap
  );
  const [kbModalAgent, setKbModalAgent] = useState<CustomAgent | null>(null);

  // 智能体对话调试弹窗状态 (先弹出设备连接提示弹窗，选择暂不连接或开始对话再进入调试界面)
  const [pendingDebugAgent, setPendingDebugAgent] = useState<CustomAgent | null>(null);
  const [debugInitConnect, setDebugInitConnect] = useState<{
    autoConnect: boolean;
    summary?: string;
  }>({ autoConnect: false });
  const [debugChatAgent, setDebugChatAgent] = useState<CustomAgent | null>(null);

  // ================= 平台运营 · 固件管理状态 =================
  const [firmwares, setFirmwares] = useState<FirmwareItem[]>(initialFirmwares);
  const [systemTools, setSystemTools] = useState<McpToolItem[]>(INITIAL_PLATFORM_SYSTEM_TOOLS);
  const [defaultAiConfig, setDefaultAiConfig] = useState<DefaultAiConfig>(() => loadDefaultKbConfig());

  const handleUpdateDefaultAiConfig = (
    nextOrUpdater: DefaultAiConfig | ((prev: DefaultAiConfig) => DefaultAiConfig)
  ) => {
    setDefaultAiConfig((prev) => {
      const updated =
        typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      saveDefaultKbConfig(updated);
      return updated;
    });
  };
  const [firmwareSearchQuery, setFirmwareSearchQuery] = useState('');
  const [firmwareStatusFilter, setFirmwareStatusFilter] = useState<'all' | '发布' | '未发布' | '下架'>('all');
  const [isUploadFirmwareModalOpen, setIsUploadFirmwareModalOpen] = useState(false);
  const [selectedFirmwareForDetail, setSelectedFirmwareForDetail] = useState<FirmwareItem | null>(null);

  // 上传新增固件表单状态
  const [newFirmwareName, setNewFirmwareName] = useState('');
  const [newFirmwareVersion, setNewFirmwareVersion] = useState('');
  const [newFirmwareModel, setNewFirmwareModel] = useState('通用终端 (全系兼容)');
  const [newFirmwareRemark, setNewFirmwareRemark] = useState('');
  const [newFirmwareStatus, setNewFirmwareStatus] = useState<'发布' | '未发布'>('未发布');
  const [newFirmwareFile, setNewFirmwareFile] = useState<{ name: string; size: string } | null>(null);
  const [firmwareUploadProgress, setFirmwareUploadProgress] = useState(0);
  const [firmwareUploading, setFirmwareUploading] = useState(false);
  const [firmwareActionToast, setFirmwareActionToast] = useState<string | null>(null);

  const showFirmwareToast = (msg: string) => {
    setFirmwareActionToast(msg);
    setTimeout(() => {
      setFirmwareActionToast(null);
    }, 3000);
  };

  // 固件操作方法: 发布、下架、删除、上传新增
  const handlePublishFirmware = (id: number) => {
    setFirmwares(prev => prev.map(f => f.id === id ? { ...f, status: '发布' } : f));
    showFirmwareToast('固件已成功发布生效！全网终端可检测并升级至该版本。');
  };

  const handleRevokeFirmware = (id: number) => {
    setFirmwares(prev => prev.map(f => f.id === id ? { ...f, status: '下架' } : f));
    showFirmwareToast('固件已成功下架归档，终端将暂停该版本升级分发。');
  };

  const handleDeleteFirmware = (id: number, name: string) => {
    if (confirm(`确定要永久删除固件包【${name}】吗？删除后将无法恢复。`)) {
      setFirmwares(prev => prev.filter(f => f.id !== id));
      showFirmwareToast(`固件【${name}】已成功删除。`);
    }
  };

  const handleSaveNewFirmware = () => {
    if (!newFirmwareName.trim()) {
      alert('请输入固件名称');
      return;
    }
    if (!newFirmwareVersion.trim()) {
      alert('请输入固件版本号 (例如 v3.5.2-RELEASE)');
      return;
    }
    if (!newFirmwareFile) {
      alert('请上传固件安装包文件');
      return;
    }
    if (!newFirmwareRemark.trim()) {
      alert('请输入固件更新备注说明');
      return;
    }

    setFirmwareUploading(true);
    setFirmwareUploadProgress(35);
    setTimeout(() => {
      setFirmwareUploadProgress(75);
      setTimeout(() => {
        setFirmwareUploadProgress(100);
        setTimeout(() => {
          const newItem: FirmwareItem = {
            id: Date.now(),
            name: newFirmwareName.trim(),
            version: newFirmwareVersion.trim(),
            fileName: newFirmwareFile.name,
            fileSize: newFirmwareFile.size,
            hardwareModel: newFirmwareModel,
            remark: newFirmwareRemark.trim(),
            uploadTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
            status: newFirmwareStatus,
            sha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            downloadCount: 0,
          };
          setFirmwares(prev => [newItem, ...prev]);
          setFirmwareUploading(false);
          setIsUploadFirmwareModalOpen(false);
          // 重置表单
          setNewFirmwareName('');
          setNewFirmwareVersion('');
          setNewFirmwareModel('通用终端 (全系兼容)');
          setNewFirmwareRemark('');
          setNewFirmwareStatus('未发布');
          setNewFirmwareFile(null);
          setFirmwareUploadProgress(0);
          showFirmwareToast(`固件【${newItem.name} (${newItem.version})】上传成功，状态：${newItem.status}！`);
        }, 400);
      }, 500);
    }, 500);
  };

  // 固件管理筛选列表
  const displayedFirmwares = firmwares.filter(f => {
    if (firmwareStatusFilter !== 'all' && f.status !== firmwareStatusFilter) {
      return false;
    }
    if (firmwareSearchQuery.trim()) {
      const q = firmwareSearchQuery.trim().toLowerCase();
      const matchName = f.name.toLowerCase().includes(q);
      const matchVer = f.version.toLowerCase().includes(q);
      const matchModel = f.hardwareModel.toLowerCase().includes(q);
      const matchFile = f.fileName.toLowerCase().includes(q);
      const matchRemark = f.remark.toLowerCase().includes(q);
      if (!matchName && !matchVer && !matchModel && !matchFile && !matchRemark) {
        return false;
      }
    }
    return true;
  });

  // Current scope
  const isPlatformScope = activeTab.startsWith('platform_');
  const currentCategoryName = isPlatformScope ? '平台运营' : '系统管理';

  // 终端管理可用于筛选的资产集合 (包含已有资产名称与未关联资产)
  const allAvailableAssetNames = React.useMemo(() => {
    const counts: Record<string, number> = {};
    terminals.forEach((t) => {
      const label = t.assetName || '未关联资产';
      counts[label] = (counts[label] || 0) + 1;
    });
    assets.forEach((a) => {
      if (!counts[a.name]) counts[a.name] = 0;
    });
    return Object.keys(counts)
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
      .map((name) => ({ name, count: counts[name] || 0 }));
  }, [terminals, assets]);

  // ================= 终端数据筛选 =================
  const displayedTerminals = terminals.filter((item) => {
    // 权限范围: 系统管理只看本校
    if (!isPlatformScope) {
      if (item.schoolName !== DEFAULT_LOCAL_SCHOOL) return false;
    } else {
      if (terminalSchoolFilter !== '全部学校' && item.schoolName !== terminalSchoolFilter) {
        return false;
      }
    }

    // 1. 按照账号精准/模糊搜索 (用户要求 1)
    if (terminalAccountQuery.trim()) {
      if (!item.loginAccount.toLowerCase().includes(terminalAccountQuery.trim().toLowerCase())) {
        return false;
      }
    }

    // 2. 按照资产多选检索 (用户要求: 终端管理支持按照资产来检索，多选资产)
    if (selectedAssetFilterNames.length > 0) {
      if (!selectedAssetFilterNames.includes(item.assetName || '未关联资产')) {
        return false;
      }
    }

    // 常规关键词搜索 (名称, 型号, IP, 序列号, 关联资产)
    if (terminalSearchQuery.trim()) {
      const q = terminalSearchQuery.toLowerCase();
      const match = 
        item.name.toLowerCase().includes(q) ||
        (item.model || '').toLowerCase().includes(q) ||
        (item.ip || '').toLowerCase().includes(q) ||
        item.sn.toLowerCase().includes(q) ||
        (item.assetName || '').toLowerCase().includes(q) ||
        item.loginAccount.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 状态筛选
    if (terminalStatusFilter !== 'all' && item.status !== terminalStatusFilter) {
      return false;
    }

    return true;
  });

  // 筛选重置分页与批量勾选
  useEffect(() => {
    setTerminalPage(1);
    setSelectedTerminalIds([]);
  }, [terminalSearchQuery, terminalAccountQuery, selectedAssetFilterNames, terminalStatusFilter, terminalSchoolFilter, activeTab]);

  // 分页计算
  const totalTerminalPages = Math.max(1, Math.ceil(displayedTerminals.length / terminalPageSize));
  const safeTerminalPage = Math.min(terminalPage, totalTerminalPages);
  const paginatedTerminals = displayedTerminals.slice(
    (safeTerminalPage - 1) * terminalPageSize,
    safeTerminalPage * terminalPageSize
  );

  // 批量全选 / 单选判断
  const isAllPageSelected = paginatedTerminals.length > 0 && paginatedTerminals.every((t) => selectedTerminalIds.includes(t.id));
  const isSomePageSelected = paginatedTerminals.some((t) => selectedTerminalIds.includes(t.id)) && !isAllPageSelected;

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = paginatedTerminals.map((t) => t.id);
      setSelectedTerminalIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedTerminals.map((t) => t.id);
      setSelectedTerminalIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectTerminal = (id: number) => {
    setSelectedTerminalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 批量解除资产关联
  const handleBatchUnbindAssets = () => {
    if (selectedTerminalIds.length === 0) return;
    const count = selectedTerminalIds.length;
    const boundCount = terminals.filter((t) => selectedTerminalIds.includes(t.id) && t.assetId !== null).length;
    setConfirmDialog({
      title: '批量解除资产关联',
      message: `确认批量解除所选 ${count} 台终端的资产关联？其中 ${boundCount} 台当前已绑定资产，解除后将全部置为未关联。`,
      confirmLabel: '确认解除',
      variant: 'warning',
      onConfirm: () => {
        setTerminals((prev) =>
          prev.map((t) =>
            selectedTerminalIds.includes(t.id)
              ? { ...t, assetId: null, assetName: '' }
              : t
          )
        );
        setSelectedTerminalIds([]);
        setConfirmDialog(null);
        showFirmwareToast(`已成功为 ${count} 台终端解除资产关联！`);
      },
    });
  };

  // 批量删除设备
  const handleBatchDeleteTerminals = () => {
    if (selectedTerminalIds.length === 0) return;
    const count = selectedTerminalIds.length;
    setConfirmDialog({
      title: '批量删除终端设备',
      message: `确认批量删除所选的 ${count} 台终端设备？删除后设备记录将从系统中彻底移除，不可恢复。`,
      confirmLabel: '确认删除',
      variant: 'danger',
      onConfirm: () => {
        setTerminals((prev) => prev.filter((t) => !selectedTerminalIds.includes(t.id)));
        setSelectedTerminalIds([]);
        setConfirmDialog(null);
        showFirmwareToast(`已成功删除 ${count} 台终端设备！`);
      },
    });
  };

  // 单设备固件升级弹窗生命周期: 打开时先 Loading 核对版本
  useEffect(() => {
    if (activeActionModal && activeActionModal.type === 'firmware') {
      setFirmwareChecking(true);
      setFirmwareCountdownOpen(false);
      setFirmwareCountdown(5);
      setFirmwareUpgrading(false);
      setFirmwareProgress(0);
      setFirmwareCurrentStep('正在校验设备当前固件版本...');
      setFirmwareCompleted(false);
      const timer = setTimeout(() => {
        setFirmwareChecking(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
    if (activeActionModal && activeActionModal.type === 'logs') {
      setLogPage(1);
      setSelectedLogDetail(null);
    }
  }, [activeActionModal]);

  // 单设备升级安全倒计时 (5s倒计时结束后方可点击确定)
  useEffect(() => {
    let timer: any;
    if (firmwareCountdownOpen && firmwareCountdown > 0) {
      timer = setInterval(() => {
        setFirmwareCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [firmwareCountdownOpen, firmwareCountdown]);

  // 单设备开始升级：横向进度条逐步走完
  const handleStartFirmwareUpgrade = (terminalId: number) => {
    setFirmwareCountdownOpen(false);
    setFirmwareUpgrading(true);
    setFirmwareProgress(10);
    setFirmwareCompleted(false);
    setFirmwareCurrentStep('正在向设备下发 OTA 增量固件补丁 (v3.5.0-RELEASE)...');

    const steps = [
      { p: 25, text: '正在下载 OTA 增量固件包 (v3.5.0-RELEASE)...' },
      { p: 52, text: '正在校验芯片寄存器指纹与 SHA256 签名...' },
      { p: 76, text: '正在擦除 Flash 扇区并写入新固件镜像...' },
      { p: 90, text: '正在执行引导分区自检与软重启复位...' },
      { p: 100, text: '固件升级成功！设备已恢复在线心跳与 MCP 自愈通道' },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setFirmwareProgress(steps[idx].p);
        setFirmwareCurrentStep(steps[idx].text);
        if (steps[idx].p === 100) {
          clearInterval(interval);
          setFirmwareUpgrading(false);
          setFirmwareCompleted(true);
          setTerminalFirmwares((prev) => ({
            ...prev,
            [terminalId]: ONLINE_LATEST_FIRMWARE,
          }));
        }
        idx++;
      }
    }, 650);
  };

  // 批量固件升级生命周期: 打开时核对
  useEffect(() => {
    if (batchFirmwareModalOpen) {
      setBatchFirmwareChecking(true);
      setBatchFirmwareCountdownOpen(false);
      setBatchFirmwareCountdown(5);
      setBatchFirmwareUpgrading(false);
      setBatchFirmwareProgress(0);
      setBatchFirmwareCompleted(false);
      setBatchFirmwareCurrentStep('正在批量扫描各终端版本状态...');
      const timer = setTimeout(() => {
        setBatchFirmwareChecking(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [batchFirmwareModalOpen]);

  // 批量固件升级倒计时
  useEffect(() => {
    let timer: any;
    if (batchFirmwareCountdownOpen && batchFirmwareCountdown > 0) {
      timer = setInterval(() => {
        setBatchFirmwareCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [batchFirmwareCountdownOpen, batchFirmwareCountdown]);

  // 批量确认升级开始
  const handleConfirmBatchFirmwareUpgrade = () => {
    setBatchFirmwareCountdownOpen(false);
    setBatchFirmwareUpgrading(true);
    setBatchFirmwareProgress(12);
    setBatchFirmwareCompleted(false);
    setBatchFirmwareCurrentStep('正在批量下发 OTA 补丁包至在线终端...');

    const steps = [
      { p: 30, text: '正在向在线终端广播分发 OTA 补丁包 (v3.5.0-RELEASE)...' },
      { p: 58, text: '正在远程校验各设备固件指纹与 CRC 校验码...' },
      { p: 80, text: '正在批量刷写芯片 Flash 存储扇区...' },
      { p: 92, text: '正在同步软重启并等待 MCP 探针握手就绪...' },
      { p: 100, text: '批量固件升级完成！在线终端已全部更新至最新版本' },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setBatchFirmwareProgress(steps[idx].p);
        setBatchFirmwareCurrentStep(steps[idx].text);
        if (steps[idx].p === 100) {
          clearInterval(interval);
          setBatchFirmwareUpgrading(false);
          setBatchFirmwareCompleted(true);
          setTerminalFirmwares((prev) => {
            const next = { ...prev };
            selectedTerminalIds.forEach((id) => {
              const term = terminals.find((t) => t.id === id);
              if (term && term.status === 'online') {
                next[id] = ONLINE_LATEST_FIRMWARE;
              }
            });
            return next;
          });
        }
        idx++;
      }
    }, 650);
  };

  // 生成终端真实的运行与通信日志数据 (包含时间、类型[开机、关机、异常、告警、调试、升级、故障]、IP、日志说明、关联账号、详细日志)
  const getMockLogsForTerminal = (term: TerminalItem): TerminalLogItem[] => [
    {
      id: 'LOG-20260328-001',
      time: '2026-03-28 10:14:22',
      type: '开机',
      ip: term.ip || '—',
      description: '[系统上电引导] 嵌入式 Linux 内核加载完毕，MCP 通信套接字初始化并在端口 502/8234 监听',
      account: 'system_boot',
      detail: {
        protocol: 'TCP/IP · MCP Daemon v3.5',
        errorCode: 'SUCCESS (0x00)',
        rawPacket: 'BOOT_LOADER_STAGE2: CPU_CLK=1.2GHz DRAM=1024MB ETH0=UP 192.168.1.101/24 GATEWAY=192.168.1.1 MCP_SOCKET_BOUND_PORT_502_OK',
        registers: 'R0=0x00000000 R1=0x00001000 PC=0x80004210 SP=0x7FFFEE00',
        actionTaken: '内核服务初始化完成，启动心跳守护进程，向控制台广播在线握手包。'
      }
    },
    {
      id: 'LOG-20260328-002',
      time: '2026-03-28 10:13:58',
      type: '调试',
      ip: term.ip || '—',
      description: '[寄存器调测] 成功读取保持寄存器 0x0001 ~ 0x0010，串口波特率自适应切换为 115200bps',
      account: term.loginAccount,
      detail: {
        protocol: 'Modbus RTU over TCP',
        errorCode: 'ACK_OK (0x03)',
        rawPacket: 'TX: 01 03 00 01 00 10 15 C6\nRX: 01 03 20 25 80 00 01 00 64 00 00 1A 2B 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 8F 1A',
        registers: '0x0001=0x2580 (Baud 115200) · 0x0002=0x0001 (Parity None) · 0x0003=0x0064 (Heartbeat 100ms)',
        actionTaken: '更新通信配置缓存，将RS485总线波特率设定为115200并重启串口中断服务。'
      }
    },
    {
      id: 'LOG-20260328-003',
      time: '2026-03-28 09:50:11',
      type: '告警',
      ip: term.ip || '—',
      description: '[主板温度预警] 主板核心温度监测达到 78.2℃ (高负荷预警线 75℃)，已启动高转速散热风扇',
      account: 'system_sensor',
      detail: {
        protocol: 'Hardware Health Watchdog',
        errorCode: 'WARN_TEMP_HIGH_LEVEL1',
        rawPacket: 'THERMAL_SENSOR_I2C: ADDR=0x48 TEMP_READ=78.25C FAN_PWM=255/255 SPEED=4800RPM THROTTLE=NONE',
        registers: 'HW_STATUS_REG=0x0004 (BIT_2: FAN_FULL_SPEED_ACTIVE)',
        actionTaken: '将PWM风扇驱动占空比调至100%，上报设备运行态势大屏告警卡片。'
      }
    },
    {
      id: 'LOG-20260328-004',
      time: '2026-03-28 09:25:40',
      type: '异常',
      ip: term.ip || '—',
      description: '[通信超时重传] 目标从机传感器 (Addr: 0x04) 连续 3 次无响应，已触发 MCP 自诊断探针',
      account: 'system_auto',
      detail: {
        protocol: 'RS485 Modbus RTU',
        errorCode: 'ERR_TIMEOUT_NO_RESPONSE (0x0B)',
        rawPacket: 'TX_POLL: 04 03 00 00 00 02 C4 5E -> WAIT_ACK_1500MS_TIMEOUT -> RETRY_COUNT=3_EXHAUSTED',
        registers: 'BUS_ERR_COUNTER=3 LAST_ERROR_CODE=0x0B',
        actionTaken: '智能体启动 MCP 链路自愈探针，复位从机驱动并标记从机 0x04 离线待重连。'
      }
    },
    {
      id: 'LOG-20260328-005',
      time: '2026-03-28 08:45:15',
      type: '升级',
      ip: term.ip || '—',
      description: '[固件校验与刷写] 接收到平台 OTA 升级分发包，正在写入 Flash 扇区并校验 SHA256 哈希',
      account: 'sys_admin',
      detail: {
        protocol: 'OTA Secure Transfer (TLS 1.3)',
        errorCode: 'SUCCESS_OTA_APPLY',
        rawPacket: 'OTA_CHUNK_RECV: 1024/1024 KB VERIFY_SHA256=9f8a2c4e1b8d5a2f... WRITE_FLASH_SECTORS=[0x08020000 - 0x08060000]',
        registers: 'BOOT_FLAG=0x01 (PENDING_SWAP_BOOT)',
        actionTaken: '固件扇区校验完整无误，写入引导备份区，完成热更新准备。'
      }
    },
    {
      id: 'LOG-20260327-006',
      time: '2026-03-27 22:30:00',
      type: '关机',
      ip: term.ip || '—',
      description: '[系统下电休眠] 实训课业结束，平台下发安全关机休眠指令，完成通信套接字注销',
      account: 'lab_admin01',
      detail: {
        protocol: 'System Power Daemon',
        errorCode: 'CLEAN_SHUTDOWN (0x00)',
        rawPacket: 'CMD_SAFE_SHUTDOWN: CLOSE_SOCKETS=PORT_502,8234 UNMOUNT_FILE_SYSTEM FLUSH_LOG_BUFFERS POWER_OFF_STANDBY',
        registers: 'PWR_MGMT=0x0000',
        actionTaken: '各外设安全掉电，终端进入微安级低功耗网络待机唤醒模式。'
      }
    },
    {
      id: 'LOG-20260327-007',
      time: '2026-03-27 16:18:22',
      type: '故障',
      ip: term.ip || '—',
      description: '[总线反射波形畸变] RS485 差分总线 A/B 端反射波畸变超过 35%，导致报文偶发乱码校验失败',
      account: 'mcp_probe_agent',
      detail: {
        protocol: 'RS485 Physical Layer Probe',
        errorCode: 'FAULT_LINE_REFLECTION_HIGH (0xE2)',
        rawPacket: 'OSCILLOSCOPE_MCP_PROBE: V_DIFF_P2P=3.8V REFLECTION_RATIO=36.4% CRC16_FAIL_RATE=8.2% ADDR_CORRUPTION_DETECTED',
        registers: 'LINE_IMPEDANCE=72_OHM (MISMATCH)',
        actionTaken: '智能体诊断结论：末端匹配电阻未闭合，已自动下发闭合内置 120Ω 终端电阻指令。'
      }
    },
    {
      id: 'LOG-20260327-008',
      time: '2026-03-27 14:10:05',
      type: '调试',
      ip: term.ip || '—',
      description: '[MCP指令调测] 学生下发 Modbus 写入多寄存器指令 (0x10)，完成温湿度上限阈值参数写入',
      account: term.loginAccount,
      detail: {
        protocol: 'Modbus RTU / Function 0x10',
        errorCode: 'ACK_WRITE_SUCCESS',
        rawPacket: 'TX: 01 10 00 20 00 02 04 01 2C 02 58 9E 4A\nRX: 01 10 00 20 00 02 41 CD',
        registers: '0x0020=300 (30.0℃) · 0x0021=600 (60.0%RH)',
        actionTaken: '更新环境变量寄存器，并同步回写到实训台位数字孪生模型。'
      }
    },
    {
      id: 'LOG-20260327-009',
      time: '2026-03-27 11:05:49',
      type: '告警',
      ip: term.ip || '—',
      description: '[网络延迟波动] 内网网关 Ping 延时从 2.8ms 突增至 185.0ms，触发防丢包流控保护',
      account: 'system_auto',
      detail: {
        protocol: 'ICMP / QoS Sentinel',
        errorCode: 'WARN_NETWORK_JITTER',
        rawPacket: 'PING_PROBE_192.168.1.1: RTT_MIN=2.8MS RTT_AVG=142.5MS RTT_MAX=185.0MS PACKET_LOSS=1.2%',
        registers: 'BUFFER_QUEUE_DEPTH=84%',
        actionTaken: '启动报文拥塞控制算法，临时调大重发定时器至 2500ms。'
      }
    },
    {
      id: 'LOG-20260327-010',
      time: '2026-03-27 08:30:12',
      type: '开机',
      ip: term.ip || '—',
      description: '[系统正常开机] 晨间实训教学设备定时自启上电，完成硬件自检(POST)与协议探针自检',
      account: 'system_boot',
      detail: {
        protocol: 'POST Hardware Diagnostic',
        errorCode: 'POST_ALL_PASS',
        rawPacket: 'POST_CHECK: CPU_OK MEM_OK ETHERNET_OK RS485_OK DI_DO_PORTS_OK RTC_SYNC_NTP_OK',
        registers: 'SYSTEM_STATUS_REG=0x0001',
        actionTaken: '全项硬件自检通过，向控制台汇报正常在线。'
      }
    },
    {
      id: 'LOG-20260326-011',
      time: '2026-03-26 15:40:30',
      type: '异常',
      ip: term.ip || '—',
      description: '[CRC校验异常] 接收到从机传感器数据帧 CRC 校验位不匹配，报文已被丢弃并重发',
      account: 'system_auto',
      detail: {
        protocol: 'Modbus RTU Frame',
        errorCode: 'ERR_CRC_MISMATCH',
        rawPacket: 'RECV_FRAME: 01 03 04 00 24 1A 8F [CRC_CALC=0x34C2 != RECV_CRC=0x8F1A]',
        registers: 'CRC_ERR_REG=0x0001',
        actionTaken: '抛弃坏帧，重新发送保持寄存器轮询请求。'
      }
    },
    {
      id: 'LOG-20260326-012',
      time: '2026-03-26 10:20:15',
      type: '升级',
      ip: term.ip || '—',
      description: '[子模块固件升级] 升级数字量控制模块 USR-IO424 固件补丁至 v1.2.0，优化防抖时序',
      account: 'sys_admin',
      detail: {
        protocol: 'Sub-module UART Bootloader',
        errorCode: 'UPGRADE_SUCCESS',
        rawPacket: 'IO424_FLASH_UPDATE: ADDR=0x0000 ERASE_PAGES=16 WRITE_VERIFY_OK REBOOT_IO_MODULE',
        registers: 'IO_FW_VER=0x010200',
        actionTaken: '子模块重启生效，继电器去抖时间设置为标准的 20ms。'
      }
    },
    {
      id: 'LOG-20260326-013',
      time: '2026-03-26 09:12:00',
      type: '故障',
      ip: term.ip || '—',
      description: '[电源输入瞬态欠压] 直流供电母线电压瞬时跌落至 18.5V (额定 24V)，触发低压防护保护',
      account: 'system_sensor',
      detail: {
        protocol: 'Power Management IC',
        errorCode: 'FAULT_UNDERVOLTAGE_LOCKOUT',
        rawPacket: 'PMIC_ADC_SAMPLE: V_IN=18.52V THRESHOLD_MIN=21.0V DURATION=120MS BACKUP_CAP_ENGAGED',
        registers: 'PWR_FAULT_REG=0x0010',
        actionTaken: '启动超级电容供电保护芯片，向教师控制台推送电源接线松动告警。'
      }
    },
    {
      id: 'LOG-20260325-014',
      time: '2026-03-25 16:50:20',
      type: '关机',
      ip: term.ip || '—',
      description: '[例行维护下电] 实训室开展电路总闸检修，管理员执行全网关统一断电下线操作',
      account: 'lab_admin01',
      detail: {
        protocol: 'ACPI Power Signal',
        errorCode: 'USER_INITIATED_POWEROFF',
        rawPacket: 'SHUTDOWN_SIGNAL: REASON=MAINTENANCE FLUSH_ALL=OK',
        registers: '0x0000',
        actionTaken: '安全注销连接并切断备用电。'
      }
    },
    {
      id: 'LOG-20260325-015',
      time: '2026-03-25 08:30:00',
      type: '开机',
      ip: term.ip || '—',
      description: '[冷启动开机] 实验楼电闸恢复供电，设备冷启动完成，自动恢复断电前运行模式',
      account: 'system_boot',
      detail: {
        protocol: 'Cold Boot Sequence',
        errorCode: 'COLD_BOOT_RESTORE_OK',
        rawPacket: 'COLD_BOOT: POWER_RAILS_UP RESTORE_NVRAM_STATE=OK RE_CONNECT_BROKER=OK',
        registers: 'NVRAM_RESTORED=1',
        actionTaken: '重新同步实训资产关联状态，恢复正常数据采集。'
      }
    }
  ];

  // ================= 资产管理数据树形组织与筛选 =================
  const filteredAssets = assets.filter((item) => {
    if (item.schoolName !== DEFAULT_LOCAL_SCHOOL) return false;
    // 搜索: 资产名称
    if (assetSearchName.trim()) {
      return item.name.toLowerCase().includes(assetSearchName.trim().toLowerCase());
    }
    return true;
  });

  // 构造多级树结构
  const buildAssetTree = (items: AssetItem[]) => {
    const itemMap: Record<number, AssetItem & { children: AssetItem[] }> = {};
    const rootNodes: (AssetItem & { children: AssetItem[] })[] = [];

    // 初始化映射
    items.forEach((item) => {
      itemMap[item.id] = { ...item, children: [] };
    });

    // 组装父子层级
    items.forEach((item) => {
      if (item.parentId && itemMap[item.parentId]) {
        itemMap[item.parentId].children.push(itemMap[item.id]);
        itemMap[item.parentId].children.sort((a, b) => a.orderNum - b.orderNum);
      } else {
        rootNodes.push(itemMap[item.id]);
      }
    });

    rootNodes.sort((a, b) => a.orderNum - b.orderNum);
    return rootNodes;
  };

  const assetTreeNodes = buildAssetTree(filteredAssets);

  // ================= 关联资产弹窗树形逻辑 =================
  const modalTargetAssets = assets.filter((item) => {
    if (!isPlatformScope) {
      return item.schoolName === DEFAULT_LOCAL_SCHOOL;
    }
    if (bindingTerminal && bindingTerminal.schoolName) {
      return item.schoolName === bindingTerminal.schoolName;
    }
    return true;
  });

  const modalAssetTreeNodes = buildAssetTree(modalTargetAssets);

  // 获取资产完整路径层级数组
  const getAssetFullPath = (assetId: number | null, allAssets: AssetItem[]): string[] => {
    if (!assetId) return [];
    const chain: string[] = [];
    let current = allAssets.find((a) => a.id === assetId);
    let depthGuard = 0;
    while (current && depthGuard < 10) {
      depthGuard++;
      chain.unshift(current.name);
      if (current.parentId) {
        current = allAssets.find((a) => a.id === current.parentId);
      } else {
        break;
      }
    }
    return chain;
  };

  const expandAllModalTree = () => {
    const exp: Record<number, boolean> = {};
    assets.forEach((a) => {
      exp[a.id] = true;
    });
    setModalTreeExpanded(exp);
  };

  const collapseAllModalTree = () => {
    const exp: Record<number, boolean> = {};
    assets.forEach((a) => {
      exp[a.id] = false;
    });
    setModalTreeExpanded(exp);
  };

  const checkModalNodeMatches = (item: AssetItem & { children?: AssetItem[] }, query: string): boolean => {
    if (!query) return true;
    if (item.name.toLowerCase().includes(query)) return true;
    if (item.remark && item.remark.toLowerCase().includes(query)) return true;
    return Boolean(item.children && item.children.some((c) => checkModalNodeMatches(c, query)));
  };

  // 渲染弹窗中的树形资产项
  const renderModalAssetTreeNodes = (
    nodes: (AssetItem & { children?: AssetItem[] })[],
    depth = 0
  ): React.ReactNode => {
    const query = modalAssetSearch.trim().toLowerCase();

    return nodes.map((node) => {
      const isExpanded = query ? true : (modalTreeExpanded[node.id] !== undefined ? modalTreeExpanded[node.id] : true);
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isSelected = selectedAssetIdForBinding === node.id;
      const isCurrentBound = bindingTerminal?.assetId === node.id;
      const boundCount = terminals.filter((t) => t.assetId === node.id && t.id !== bindingTerminal?.id).length;

      if (!checkModalNodeMatches(node, query)) {
        return null;
      }

      return (
        <div key={node.id} className="relative select-none">
          <div
            onClick={() => setSelectedAssetIdForBinding(node.id)}
            className={cn(
              "flex items-center justify-between py-2 px-3 rounded-xl text-xs cursor-pointer transition-all border my-1 group",
              isSelected
                ? "bg-blue-50/90 border-blue-400 text-blue-900 font-semibold shadow-xs"
                : "border-transparent hover:bg-white hover:border-slate-200 text-slate-700"
            )}
            style={{ paddingLeft: `${depth * 24 + 10}px` }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalTreeExpanded((prev) => ({
                      ...prev,
                      [node.id]: !isExpanded,
                    }));
                  }}
                  className="p-1 hover:bg-slate-200/80 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                  title={isExpanded ? '折叠' : '展开'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}

              {depth === 0 ? (
                <Building className="w-4 h-4 text-blue-600 shrink-0" />
              ) : hasChildren ? (
                <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}

              <div className="truncate flex items-center gap-2 min-w-0">
                <span className={cn(
                  "truncate",
                  isSelected ? "text-blue-900 font-bold" : depth === 0 ? "text-slate-900 font-semibold text-sm" : "text-slate-700 text-xs"
                )}>
                  {node.name}
                </span>

                {isCurrentBound && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200 shrink-0">
                    当前关联
                  </span>
                )}

                {boundCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-normal shrink-0">
                    已连{boundCount}台
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3 ml-2">
              {node.remark && (
                <span className="text-[11px] text-slate-400 max-w-[240px] truncate hidden md:inline" title={node.remark}>
                  {node.remark}
                </span>
              )}
              {isSelected ? (
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs bg-white px-3 py-1 rounded-lg border border-blue-300 shadow-2xs">
                  <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                  <span>已选择</span>
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 group-hover:border-slate-400 flex items-center justify-center bg-white" />
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="relative">
              <div
                className="absolute top-0 bottom-2 w-px bg-slate-200 pointer-events-none"
                style={{ left: `${depth * 22 + 18}px` }}
              />
              {renderModalAssetTreeNodes(node.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // 展开/折叠资产节点
  const toggleAssetNode = (nodeId: number) => {
    setExpandedAssetIds((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // 保存资产 (新增/编辑)
  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetFormData.name.trim()) return;

    const parentNode = assets.find((a) => a.id === assetFormData.parentId);
    const parentName = parentNode ? parentNode.name : undefined;

    if (editingAsset) {
      // 编辑
      setAssets(
        assets.map((a) =>
          a.id === editingAsset.id
            ? {
                ...a,
                name: assetFormData.name,
                parentId: assetFormData.parentId,
                parentName: parentName,
                orderNum: Number(assetFormData.orderNum) || 1,
                remark: assetFormData.remark,
              }
            : a
        )
      );
      // 同步更新关联了此资产的终端名称
      setTerminals(
        terminals.map((t) =>
          t.assetId === editingAsset.id ? { ...t, assetName: assetFormData.name } : t
        )
      );
    } else {
      // 新增
      const newAsset: AssetItem = {
        id: Date.now(),
        name: assetFormData.name,
        parentId: assetFormData.parentId,
        parentName: parentName,
        orderNum: Number(assetFormData.orderNum) || 1,
        remark: assetFormData.remark,
        schoolName: isPlatformScope ? assetFormData.schoolName : DEFAULT_LOCAL_SCHOOL,
      };
      setAssets([...assets, newAsset]);
      // 默认展开其父级
      if (assetFormData.parentId) {
        setExpandedAssetIds((prev) => ({ ...prev, [assetFormData.parentId!]: true }));
      }
    }

    setIsAssetModalOpen(false);
    setEditingAsset(null);
  };

  // 打开新增资产
  const handleOpenAddAsset = (parent?: AssetItem) => {
    setEditingAsset(null);
    setAssetFormData({
      name: '',
      parentId: parent ? parent.id : null,
      orderNum: assets.length + 1,
      remark: '',
      schoolName: isPlatformScope ? '全校示范平台' : DEFAULT_LOCAL_SCHOOL,
    });
    setIsAssetModalOpen(true);
  };

  // 打开编辑资产
  const handleOpenEditAsset = (asset: AssetItem) => {
    setEditingAsset(asset);
    setAssetFormData({
      name: asset.name,
      parentId: asset.parentId,
      orderNum: asset.orderNum,
      remark: asset.remark,
      schoolName: asset.schoolName,
    });
    setIsAssetModalOpen(true);
  };

  // 删除资产（弹窗提示确认）
  const handleDeleteAsset = (id: number, name: string) => {
    const hasChildren = assets.some((a) => a.parentId === id);
    if (hasChildren) {
      setConfirmDialog({
        title: '无法删除资产',
        message: `资产【${name}】下包含下级资产节点，请先删除或转移所有下级资产后再试。`,
        confirmLabel: '知道了',
        variant: 'warning',
        onConfirm: () => setConfirmDialog(null),
      });
      return;
    }

    const boundCount = terminals.filter((t) => t.assetId === id).length;
    setConfirmDialog({
      title: '确认删除资产',
      message:
        boundCount > 0
          ? `确认删除资产【${name}】？当前有 ${boundCount} 台终端绑定此资产，删除后这些终端将重置为未关联状态。`
          : `确认删除资产【${name}】？删除后无法恢复。`,
      confirmLabel: '确认删除',
      variant: 'danger',
      onConfirm: () => {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        setTerminals((prev) =>
          prev.map((t) => (t.assetId === id ? { ...t, assetId: null, assetName: '' } : t))
        );
        setConfirmDialog(null);
        showFirmwareToast(`已删除资产【${name}】`);
      },
    });
  };

  // 绑定资产确认 (用户要求 2)
  const handleConfirmBindAsset = () => {
    if (!bindingTerminal) return;
    const targetAsset = assets.find((a) => a.id === selectedAssetIdForBinding);

    setTerminals(
      terminals.map((t) =>
        t.id === bindingTerminal.id
          ? {
              ...t,
              assetId: targetAsset ? targetAsset.id : null,
              assetName: targetAsset ? targetAsset.name : '',
            }
          : t
      )
    );

    setBindingTerminal(null);
    setSelectedAssetIdForBinding(null);
  };

  // 解绑资产
  const handleUnbindAsset = (term: TerminalItem) => {
    setConfirmDialog({
      title: '确认解除关联',
      message: `确认解除终端【${term.name}】当前关联的资产？`,
      confirmLabel: '确认解除',
      variant: 'warning',
      onConfirm: () => {
        setTerminals(
          terminals.map((t) =>
            t.id === term.id ? { ...t, assetId: null, assetName: '' } : t
          )
        );
        setConfirmDialog(null);
      },
    });
  };

  // 终端操作处理 (详情、固件升级、运行日志、重启、MCP诊断等)
  const handleExecuteOperation = (type: string, terminal: TerminalItem) => {
    setActiveActionModal({ type, terminal });
  };

  // 自定义智能体筛选
  const displayedCustomAgents = customAgents.filter((agent) => {
    if (!isPlatformScope) {
      if (agent.schoolName !== DEFAULT_LOCAL_SCHOOL) return false;
    } else {
      if (agentSchoolFilter !== '全部学校' && agent.schoolName !== agentSchoolFilter) {
        return false;
      }
    }

    if (agentSearchQuery.trim()) {
      const q = agentSearchQuery.toLowerCase();
      const match = 
        agent.name.toLowerCase().includes(q) ||
        agent.desc.toLowerCase().includes(q) ||
        agent.hardwareModel.toLowerCase().includes(q) ||
        agent.schoolName.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (agentStatusFilter !== 'all' && agent.status !== agentStatusFilter) {
      return false;
    }

    return true;
  });

  const totalAgentPages = Math.max(1, Math.ceil(displayedCustomAgents.length / agentPageSize));
  const safeAgentPage = Math.min(agentPage, totalAgentPages);
  const paginatedCustomAgents = displayedCustomAgents.slice(
    (safeAgentPage - 1) * agentPageSize,
    safeAgentPage * agentPageSize
  );

  // 保存新增自定义智能体
  const handleSaveNewAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentForm.name.trim() || !newAgentForm.hardwareModel.trim()) return;

    const hwModel = newAgentForm.hardwareModel.trim();
    const agentName = newAgentForm.name.trim();
    const newAgent: CustomAgent = {
      id: Date.now(),
      name: agentName,
      desc: newAgentForm.desc.trim() || '用于实验教学的自定义硬件智能体',
      coverImage: '/assets/agents/ai-terminal.png',
      userCount: 0,
      schoolName: isPlatformScope ? '全校示范平台' : DEFAULT_LOCAL_SCHOOL,
      status: 'draft',
      knowledgeCount: 0,
      workflowSteps: 3,
      callCount: 0,
      lastDebugTime: '刚刚',
      hardwareModel: hwModel,
    };

    setCustomAgents([newAgent, ...customAgents]);
    setAgentKnowledgeBasesMap((prev) => ({
      ...prev,
      [newAgent.id]: [],
    }));
    setAgentDesignConfigsMap((prev) => ({
      ...prev,
      [newAgent.id]: createDefaultDesignConfig(hwModel, agentName),
    }));
    setAgentPage(1);
    setIsNewAgentModalOpen(false);
    setNewAgentForm({ name: '', desc: '', hardwareModel: '' });
    setDesigningAgent(newAgent);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newAgentMenuRef.current && !newAgentMenuRef.current.contains(e.target as Node)) {
        setIsNewAgentMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleAiCreateConfirm = (e: Event) => {
      const detail = (e as CustomEvent<{
        name: string;
        hardwareModel: string;
        desc: string;
        protocol: McpProtocol;
        tools: McpToolItem[];
        openDesign?: boolean;
      }>).detail;
      if (!detail || !detail.name) return;

      const baseDesign = createDefaultDesignConfig(detail.hardwareModel, detail.name);
      const newAgent: CustomAgent = {
        id: Date.now(),
        name: detail.name,
        desc: detail.desc || '由 AI 智能体助手辅助生成的自定义硬件智能体',
        coverImage: '/assets/agents/ai-terminal.png',
        userCount: 0,
        schoolName: isPlatformScope ? '全校示范平台' : DEFAULT_LOCAL_SCHOOL,
        status: 'draft',
        knowledgeCount: 0,
        workflowSteps: 3,
        callCount: 0,
        lastDebugTime: '刚刚',
        hardwareModel: detail.hardwareModel,
      };

      setCustomAgents((prev) => [newAgent, ...prev]);
      setAgentKnowledgeBasesMap((prev) => ({
        ...prev,
        [newAgent.id]: [],
      }));
      setAgentDesignConfigsMap((prev) => ({
        ...prev,
        [newAgent.id]: {
          ...baseDesign,
          mcpConfig: {
            protocol: detail.protocol,
            tools: detail.tools,
          },
        },
      }));
      setAgentPage(1);
      showFirmwareToast(`已通过 AI 助手创建智能体【${newAgent.name}】`);
      if (detail.openDesign) {
        setDesigningAgent(newAgent);
      }
    };

    window.addEventListener('ai-create-agent-confirm', handleAiCreateConfirm);
    return () => {
      window.removeEventListener('ai-create-agent-confirm', handleAiCreateConfirm);
    };
  }, [isPlatformScope]);

  // 发布 / 取消发布自定义智能体
  const handleTogglePublishAgent = (agent: CustomAgent) => {
    const nextStatus: 'published' | 'draft' = agent.status === 'published' ? 'draft' : 'published';
    const nextAgents = customAgents.map((a) =>
      a.id === agent.id ? { ...a, status: nextStatus } : a
    );
    setCustomAgents(nextAgents);
    syncCustomAgentsToPublicStore(nextAgents, agentDesignConfigsMap);
    showFirmwareToast(
      nextStatus === 'published'
        ? `已发布智能体【${agent.name}】，同租户设备大厅与硬件终端已同步可见`
        : `已取消发布智能体【${agent.name}】`
    );
  };

  // 打开设计配置弹窗
  const handleOpenDesignModal = (agent: CustomAgent) => {
    setAgentDesignConfigsMap((prev) => {
      if (prev[agent.id]) return prev;
      return {
        ...prev,
        [agent.id]: createDefaultDesignConfig(agent.hardwareModel, agent.name),
      };
    });
    setDesigningAgent(agent);
  };

  // 汇总全部去重知识库列表（供设计弹窗基础配置多选关联）
  const allAvailableKnowledgeBases: AgentKnowledgeBase[] = React.useMemo(() => {
    const seen = new Map<string, AgentKnowledgeBase>();
    (Object.values(agentKnowledgeBasesMap) as AgentKnowledgeBase[][]).forEach((list) => {
      list.forEach((kb) => {
        if (!seen.has(kb.id)) {
          seen.set(kb.id, kb);
        }
      });
    });
    return Array.from(seen.values());
  }, [agentKnowledgeBasesMap]);

  // 保存设计弹窗配置
  const handleSaveAgentDesign = (
    agentId: number,
    payload: {
      basic: {
        name: string;
        hardwareModel: string;
        coverImage: string;
        desc: string;
        selectedKbIds: string[];
      };
      designConfig: AgentDesignConfig;
    }
  ) => {
    const selectedKbs = allAvailableKnowledgeBases.filter((kb) =>
      payload.basic.selectedKbIds.includes(kb.id)
    );

    const nextAgents = customAgents.map((a) =>
      a.id === agentId
        ? {
            ...a,
            name: payload.basic.name,
            hardwareModel: payload.basic.hardwareModel,
            coverImage: payload.basic.coverImage,
            desc: payload.basic.desc,
            knowledgeCount: selectedKbs.length,
          }
        : a
    );
    const nextDesignMap = {
      ...agentDesignConfigsMap,
      [agentId]: payload.designConfig,
    };

    setCustomAgents(nextAgents);
    setAgentKnowledgeBasesMap((prev) => ({
      ...prev,
      [agentId]: selectedKbs,
    }));
    setAgentDesignConfigsMap(nextDesignMap);
    syncCustomAgentsToPublicStore(nextAgents, nextDesignMap);
    setDesigningAgent(null);
    showFirmwareToast(`已保存智能体【${payload.basic.name}】的设计配置`);
  };

  const handleDeleteAgent = (id: number) => {
    const target = customAgents.find((a) => a.id === id);
    setConfirmDialog({
      title: '确认删除智能体',
      message: `确认删除自定义智能体【${target?.name || id}】？删除后无法恢复。`,
      confirmLabel: '确认删除',
      variant: 'danger',
      onConfirm: () => {
        const nextAgents = customAgents.filter((a) => a.id !== id);
        setCustomAgents(nextAgents);
        syncCustomAgentsToPublicStore(nextAgents, agentDesignConfigsMap);
        if (designingAgent?.id === id) setDesigningAgent(null);
        setConfirmDialog(null);
        showFirmwareToast(`已删除智能体【${target?.name || ''}】`);
      },
    });
  };

  // ================= 知识库与调试弹窗交互 =================
  const updateAgentKnowledgeBases = (
    agentId: number,
    nextOrUpdater: AgentKnowledgeBase[] | ((prev: AgentKnowledgeBase[]) => AgentKnowledgeBase[])
  ) => {
    setAgentKnowledgeBasesMap((prev) => {
      const current = prev[agentId] || [];
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(current) : nextOrUpdater;
      setCustomAgents((agents) =>
        agents.map((a) => (a.id === agentId ? { ...a, knowledgeCount: next.length } : a))
      );
      return {
        ...prev,
        [agentId]: next,
      };
    });
  };

  const handleOpenKbModal = (agent: CustomAgent) => {
    setKbModalAgent(agent);
  };

  const handleOpenDebugChat = (agent: CustomAgent) => {
    setPendingDebugAgent(agent);
  };

  // 左侧导航徽章统计
  const systemTerminalsCount = terminals.filter(t => t.schoolName === DEFAULT_LOCAL_SCHOOL).length;
  const systemAssetsCount = assets.filter(a => a.schoolName === DEFAULT_LOCAL_SCHOOL).length;
  const systemAgentsCount = customAgents.filter(a => a.schoolName === DEFAULT_LOCAL_SCHOOL).length;

  const platformTerminalsCount = terminals.length;
  const platformAgentsCount = customAgents.length;

  // 递归渲染资产树节点
  const renderAssetTreeRows = (nodes: (AssetItem & { children?: AssetItem[] })[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedAssetIds[node.id] ?? false;
      const hasChildren = node.children && node.children.length > 0;

      return (
        <React.Fragment key={node.id}>
          <tr className="hover:bg-blue-50/20 transition-colors border-b border-slate-100 group">
            {/* 资产名称 (树形缩进 + 展开折叠 + 图标) */}
            <td className="p-3.5 whitespace-nowrap">
              <div 
                className="flex items-center gap-1.5"
                style={{ paddingLeft: `${depth * 24}px` }}
              >
                {hasChildren ? (
                  <button
                    onClick={() => toggleAssetNode(node.id)}
                    className="p-1 hover:bg-slate-200/70 rounded text-slate-500 hover:text-slate-800 transition-colors"
                    title={isExpanded ? '折叠' : '展开'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                ) : (
                  <span className="w-5.5" />
                )}

                {depth === 0 ? (
                  <Building className="w-4 h-4 text-blue-600 shrink-0" />
                ) : hasChildren ? (
                  <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}

                <span className={cn(
                  "font-bold text-xs",
                  depth === 0 ? "text-slate-900 text-sm" : depth === 1 ? "text-slate-800" : "text-slate-700"
                )}>
                  {node.name}
                </span>

                {/* 关联终端数轻量提示 */}
                {(() => {
                  const boundCount = terminals.filter(t => t.assetId === node.id).length;
                  if (boundCount > 0) {
                    return (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 ml-1">
                        已绑定 {boundCount} 台终端
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </td>

            {/* 上级 */}
            <td className="p-3.5 whitespace-nowrap text-xs text-slate-500">
              {node.parentName ? (
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <span className="text-slate-300">↳</span>
                  <span>{node.parentName}</span>
                </span>
              ) : (
                <span className="text-slate-400 font-medium">顶级资产</span>
              )}
            </td>

            {/* 排序号 */}
            <td className="p-3.5 whitespace-nowrap text-xs font-mono font-medium text-slate-700">
              {node.orderNum}
            </td>

            {/* 备注 */}
            <td className="p-3.5 text-xs text-slate-500 max-w-xs truncate" title={node.remark}>
              {node.remark || '-'}
            </td>

            {/* 操作: 编辑, 删除, 快捷添加子级 */}
            <td className="p-3.5 whitespace-nowrap text-center">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => handleOpenAddAsset(node)}
                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  title="在此节点下添加子级资产"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加子级</span>
                </button>

                <button
                  onClick={() => handleOpenEditAsset(node)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Edit className="w-3 h-3 text-slate-500" />
                  <span>编辑</span>
                </button>

                <button
                  onClick={() => handleDeleteAsset(node.id, node.name)}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                  <span>删除</span>
                </button>
              </div>
            </td>
          </tr>

          {/* 递归渲染子级 */}
          {hasChildren && isExpanded && renderAssetTreeRows(node.children!, depth + 1)}
        </React.Fragment>
      );
    });
  };

  const isOverviewTab = activeTab === 'system_overview' || activeTab === 'platform_overview';

  return (
    <div
      className={cn(
        "flex-1 bg-slate-100/70 flex flex-col md:flex-row text-slate-900",
        isOverviewTab ? "min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] lg:overflow-hidden" : "min-h-[calc(100vh-4rem)]"
      )}
    >
      
      {/* ================= LEFT SIDEBAR (左侧导航菜单栏: 系统管理 & 平台运营) ================= */}
      <aside
        className={cn(
          "w-full md:w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 shadow-xs transition-all z-20",
          mobileMenuOpen ? "block" : "hidden md:flex"
        )}
      >
        {/* Sidebar Header Brand */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                系统控制台
              </h2>
              <div className="text-[11px] text-slate-400 font-medium">
                硬件大模型与资产运管中心
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation: 系统管理 & 平台运营 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          
          {/* Section 1: 系统管理 (本校视角) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-blue-600" />
                系统管理
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                本校
              </span>
            </div>

            {/* 1.1 终端管理 */}
            <button
              onClick={() => {
                setActiveTab('system_terminals');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'system_terminals'
                  ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Server className={cn("w-4 h-4", activeTab === 'system_terminals' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>终端管理</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'system_terminals' ? "bg-blue-200/70 text-blue-800" : "bg-slate-100 text-slate-500"
              )}>
                {systemTerminalsCount}
              </span>
            </button>

            {/* 1.2 资产管理 (NEW! 系统管理之下增加资产管理) */}
            <button
              onClick={() => {
                setActiveTab('system_assets');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'system_assets'
                  ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Building className={cn("w-4 h-4", activeTab === 'system_assets' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>资产管理</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'system_assets' ? "bg-blue-200/70 text-blue-800" : "bg-slate-100 text-slate-500"
              )}>
                {systemAssetsCount}
              </span>
            </button>

            {/* 1.3 自定义硬件智能体 */}
            <button
              onClick={() => {
                setActiveTab('system_agents');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'system_agents'
                  ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Cpu className={cn("w-4 h-4", activeTab === 'system_agents' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>自定义硬件智能体</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'system_agents' ? "bg-blue-200/70 text-blue-800" : "bg-slate-100 text-slate-500"
              )}>
                {systemAgentsCount}
              </span>
            </button>

            {/* 1.4 数据总览 */}
            <button
              onClick={() => {
                setActiveTab('system_overview');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'system_overview'
                  ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={cn("w-4 h-4", activeTab === 'system_overview' ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>数据总览</span>
              </div>
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Section 2: 平台运营 (全平台/所有学校视角) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                平台运营
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">
                跨校全域
              </span>
            </div>

            {/* 2.1 终端管理 */}
            <button
              onClick={() => {
                setActiveTab('platform_terminals');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'platform_terminals'
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Server className={cn("w-4 h-4", activeTab === 'platform_terminals' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>终端管理</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'platform_terminals' ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"
              )}>
                {platformTerminalsCount}
              </span>
            </button>

            {/* 2.2 自定义硬件智能体 */}
            <button
              onClick={() => {
                setActiveTab('platform_agents');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'platform_agents'
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Cpu className={cn("w-4 h-4", activeTab === 'platform_agents' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>自定义硬件智能体</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'platform_agents' ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"
              )}>
                {platformAgentsCount}
              </span>
            </button>

            {/* 2.4 固件管理 (平台运营新增) */}
            <button
              onClick={() => {
                setActiveTab('platform_firmwares');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'platform_firmwares'
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <ArrowUpCircle className={cn("w-4 h-4", activeTab === 'platform_firmwares' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>固件管理</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'platform_firmwares' ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"
              )}>
                {firmwares.length}
              </span>
            </button>

            {/* 2.5 系统工具 (平台运营新增) */}
            <button
              onClick={() => {
                setActiveTab('platform_system_tools');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'platform_system_tools'
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className={cn("w-4 h-4", activeTab === 'platform_system_tools' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>系统工具</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'platform_system_tools' ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"
              )}>
                {systemTools.length}
              </span>
            </button>

            {/* 2.6 系统配置 (平台运营新增 - 默认AI助手配置) */}
            <button
              onClick={() => {
                setActiveTab('platform_system_config');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'platform_system_config'
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Settings className={cn("w-4 h-4", activeTab === 'platform_system_config' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>系统配置</span>
              </div>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold",
                activeTab === 'platform_system_config' ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"
              )}>
                {defaultAiConfig.docs.length}
              </span>
            </button>

            {/* 2.7 数据总览 */}
            <button
              onClick={() => {
                setActiveTab('platform_overview');
                setDesigningAgent(null);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                activeTab === 'platform_overview'
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={cn("w-4 h-4", activeTab === 'platform_overview' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>数据总览</span>
              </div>
            </button>
          </div>

        </div>
      </aside>

      {/* ================= RIGHT WORKSPACE CONTENT ================= */}
      <div className={cn("flex-1 flex flex-col min-w-0", isOverviewTab ? "lg:min-h-0 lg:overflow-hidden" : "overflow-y-auto")}>
        
        {/* Admin Content Topbar (Breadcrumbs) */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 -ml-2 mr-1 rounded-lg text-slate-600 hover:bg-slate-100"
              title="切换菜单"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <span className="text-slate-400">控制台</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-medium text-slate-700">
              {currentCategoryName}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className={cn("font-bold", isPlatformScope ? "text-indigo-700" : "text-blue-700")}>
              {activeTab.endsWith('_terminals') && '终端管理'}
              {activeTab === 'system_assets' && '资产管理'}
              {activeTab.endsWith('_agents') && '自定义硬件智能体'}
              {activeTab === 'platform_firmwares' && '固件管理'}
              {activeTab === 'platform_system_tools' && '系统工具'}
              {activeTab === 'platform_system_config' && '系统配置'}
              {activeTab.endsWith('_overview') && '数据总览'}
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className={cn(isOverviewTab ? "p-3 sm:p-4 flex-1 min-h-0 flex flex-col lg:overflow-hidden" : "p-6 sm:p-8 space-y-6")}>

          {/* ================= 1. 终端管理 (Terminals) ================= */}
          {(activeTab === 'system_terminals' || activeTab === 'platform_terminals') && (
            <div className="space-y-4">
              
              {/* Header Card for Terminals */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Server className={cn("w-4 h-4", isPlatformScope ? "text-indigo-600" : "text-blue-600")} />
                    <span>{currentCategoryName} · 终端管理</span>
                  </h3>
                </div>

                {/* Quick Status Stats Counter */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-4 text-xs bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      在线: <b className="text-slate-800 font-mono">{displayedTerminals.filter(t => t.status === 'online').length}</b>
                    </span>
                    <div className="h-4 w-px bg-slate-300" />
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      离线: <b className="text-slate-800 font-mono">{displayedTerminals.filter(t => t.status === 'offline').length}</b>
                    </span>
                    <div className="h-4 w-px bg-slate-300" />
                    <button
                      onClick={() => showFirmwareToast('已刷新终端连接状态与在线心跳')}
                      className={cn(
                        "flex items-center gap-1 font-semibold",
                        isPlatformScope ? "text-indigo-600 hover:text-indigo-700" : "text-blue-600 hover:text-blue-700"
                      )}
                      title="刷新心跳状态"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>刷新</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar: (满足要求 1: 增加按照账号搜索) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  
                  {/* 平台运营增加学校筛选 */}
                  {isPlatformScope && (
                    <div className="flex items-center gap-1.5 bg-indigo-50/80 p-1 rounded-xl border border-indigo-200 text-xs">
                      <span className="text-indigo-700 px-2 font-bold flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-indigo-600" />
                        所属学校:
                      </span>
                      <select
                        value={terminalSchoolFilter}
                        onChange={(e) => setTerminalSchoolFilter(e.target.value)}
                        className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      >
                        {availableSchools.map((sch) => (
                          <option key={sch} value={sch}>{sch}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 要求 1: 按照账号搜索 */}
                  <div className="relative min-w-[180px] max-w-[220px]">
                    <User className="w-3.5 h-3.5 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={terminalAccountQuery}
                      onChange={(e) => setTerminalAccountQuery(e.target.value)}
                      placeholder="按登录账号搜索..."
                      className="w-full pl-8.5 pr-7 py-2 bg-blue-50/40 hover:bg-white focus:bg-white border border-blue-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                    />
                    {terminalAccountQuery && (
                      <button
                        onClick={() => setTerminalAccountQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 常规关键词搜索 (名称, IP, 序列号, 关联资产) */}
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={terminalSearchQuery}
                      onChange={(e) => setTerminalSearchQuery(e.target.value)}
                      placeholder="按终端名称、设备型号、IP、序列号、资产搜索..."
                      className="w-full pl-9 pr-7 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                    />
                    {terminalSearchQuery && (
                      <button
                        onClick={() => setTerminalSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 用户要求: 终端管理支持按照资产来检索，多选资产 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAssetFilterDropdownOpen(!assetFilterDropdownOpen)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs whitespace-nowrap",
                        selectedAssetFilterNames.length > 0
                          ? "bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-200"
                          : "bg-slate-50 hover:bg-white text-slate-700 border-slate-200"
                      )}
                    >
                      <Building className={cn("w-3.5 h-3.5", selectedAssetFilterNames.length > 0 ? "text-amber-600" : "text-slate-400")} />
                      <span>
                        {selectedAssetFilterNames.length === 0
                          ? '按资产筛选 (全部)'
                          : `已选 ${selectedAssetFilterNames.length} 个资产`}
                      </span>
                      {selectedAssetFilterNames.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center font-mono">
                          {selectedAssetFilterNames.length}
                        </span>
                      )}
                      <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", assetFilterDropdownOpen ? "rotate-180" : "")} />
                    </button>

                    {/* 资产多选下拉浮层 */}
                    {assetFilterDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-40 space-y-2.5 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-amber-600" />
                            <span>按照资产检索 (多选)</span>
                          </span>
                          <div className="flex items-center gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssetFilterNames(allAvailableAssetNames.map(a => a.name));
                              }}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              全选
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedAssetFilterNames([])}
                              className="text-slate-500 hover:text-slate-800"
                            >
                              清空
                            </button>
                          </div>
                        </div>

                        {/* 搜索资产名称 */}
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={assetFilterKeyword}
                            onChange={(e) => setAssetFilterKeyword(e.target.value)}
                            placeholder="输入关键词过滤资产..."
                            className="w-full pl-7 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white text-slate-800"
                          />
                          {assetFilterKeyword && (
                            <button
                              type="button"
                              onClick={() => setAssetFilterKeyword('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* 资产多选列表 */}
                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                          {allAvailableAssetNames
                            .filter(a => !assetFilterKeyword.trim() || a.name.toLowerCase().includes(assetFilterKeyword.trim().toLowerCase()))
                            .map((asset) => {
                              const isChecked = selectedAssetFilterNames.includes(asset.name);
                              return (
                                <label
                                  key={asset.name}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors",
                                    isChecked
                                      ? "bg-amber-50 text-amber-950 font-bold border border-amber-200"
                                      : "hover:bg-slate-50 text-slate-700 border border-transparent"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedAssetFilterNames(prev => prev.filter(n => n !== asset.name));
                                        } else {
                                          setSelectedAssetFilterNames(prev => [...prev, asset.name]);
                                        }
                                      }}
                                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <span className="truncate" title={asset.name}>{asset.name}</span>
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 bg-slate-100 text-slate-500">
                                    {asset.count}
                                  </span>
                                </label>
                              );
                            })}
                        </div>

                        {/* 底部确认栏 */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-500">
                            已勾选 <b className="text-amber-700 font-mono font-bold">{selectedAssetFilterNames.length}</b> 项资产
                          </span>
                          <button
                            type="button"
                            onClick={() => setAssetFilterDropdownOpen(false)}
                            className="px-3.5 py-1 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-900 transition-colors"
                          >
                            确定筛选
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 状态筛选 */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-400 px-2 font-medium">状态:</span>
                    {(['all', 'online', 'offline'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setTerminalStatusFilter(st)}
                        className={cn(
                          "px-3 py-1 rounded-lg font-bold transition-all",
                          terminalStatusFilter === st
                            ? "bg-white text-blue-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {st === 'all' ? '全部' : st === 'online' ? '仅在线' : '仅离线'}
                      </button>
                    ))}
                  </div>

                </div>

                <div className="text-xs text-slate-500 self-end md:self-auto">
                  筛选结果: <b className="text-slate-900">{displayedTerminals.length}</b> 台设备
                </div>
              </div>

              {/* 已选资产过滤标签栏 (便于查看和单个移除) */}
              {selectedAssetFilterNames.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-2.5 px-3.5 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-amber-900 flex items-center gap-1 mr-1 text-[11px]">
                      <Building className="w-3.5 h-3.5 text-amber-600" />
                      <span>已生效资产多选过滤:</span>
                    </span>
                    {selectedAssetFilterNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-semibold shadow-2xs"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAssetFilterNames(prev => prev.filter(n => n !== name))}
                          className="text-amber-500 hover:text-amber-900 rounded-full"
                          title="移除该资产过滤"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAssetFilterNames([])}
                    className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline shrink-0"
                  >
                    清空资产过滤
                  </button>
                </div>
              )}

              {/* Data Table:
                  要求 3: 最近上线地点改成关联资产
                  要求 4: 归属账号去除
                  要求 5: 管理操作改为操作，包含详情、关联资产、固件升级、日志，详情放在操作，其他的点击更多后下拉展示
              */}
              {/* 批量操作工具条 */}
              {selectedTerminalIds.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2.5 text-xs text-blue-950 font-medium">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      {selectedTerminalIds.length}
                    </div>
                    <span>已选择 <b className="font-bold text-blue-700">{selectedTerminalIds.length}</b> 台终端设备</span>
                    <button
                      onClick={() => setSelectedTerminalIds([])}
                      className="text-slate-400 hover:text-slate-600 underline ml-1 text-xs"
                    >
                      清空选择
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 1. 批量解除资产关联 */}
                    <button
                      onClick={handleBatchUnbindAssets}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                      title="批量解除选中终端的资产绑定"
                    >
                      <Unlink className="w-3.5 h-3.5 text-amber-600" />
                      <span>批量解除资产关联</span>
                    </button>

                    {/* 2. 批量升级固件 */}
                    <button
                      onClick={() => setBatchFirmwareModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                      title="下发最新稳定版固件升级任务"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>批量升级固件</span>
                    </button>

                    {/* 3. 批量删除设备 */}
                    <button
                      onClick={handleBatchDeleteTerminals}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                      title="删除选中的终端设备"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>批量删除设备</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-visible">
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        {/* 批量全选 Checkbox */}
                        <th className="p-3.5 pl-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllPageSelected}
                            onChange={toggleSelectAllPage}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            title={isAllPageSelected ? '取消全选本页' : '全选本页终端'}
                          />
                        </th>
                        <th className="p-3.5 whitespace-nowrap">名称</th>
                        <th className="p-3.5 whitespace-nowrap">设备型号</th>
                        {isPlatformScope && (
                          <th className="p-3.5 whitespace-nowrap">所属学校</th>
                        )}
                        <th className="p-3.5 whitespace-nowrap">IP 地址</th>
                        <th className="p-3.5 whitespace-nowrap">当前状态</th>
                        <th className="p-3.5 whitespace-nowrap">关联资产</th>
                        <th className="p-3.5 whitespace-nowrap">最近上线时间</th>
                        <th className="p-3.5 whitespace-nowrap">登录账号</th>
                        <th className="p-3.5 whitespace-nowrap">设备序列号</th>
                        <th className="p-3.5 text-center whitespace-nowrap w-36">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedTerminals.map((item) => (
                        <tr
                          key={item.id}
                          className={cn(
                            "transition-colors",
                            selectedTerminalIds.includes(item.id)
                              ? "bg-blue-50/60"
                              : "hover:bg-blue-50/20"
                          )}
                        >
                          {/* 单选 Checkbox */}
                          <td className="p-3.5 pl-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedTerminalIds.includes(item.id)}
                              onChange={() => toggleSelectTerminal(item.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            />
                          </td>

                          {/* 1. 名称 */}
                          <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{item.name}</span>
                            </div>
                          </td>

                          {/* 1.5 设备型号 */}
                          <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap font-medium">
                            {item.model ? item.model : <span className="text-slate-400">—</span>}
                          </td>

                          {/* 平台所属学校 */}
                          {isPlatformScope && (
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium">
                                <School className="w-3 h-3 text-slate-400" />
                                {item.schoolName}
                              </span>
                            </td>
                          )}

                          {/* 2. IP */}
                          <td className="p-3.5 font-mono font-medium text-slate-800 whitespace-nowrap">
                            {item.ip ? item.ip : <span className="text-slate-400">—</span>}
                          </td>

                          {/* 3. 当前状态 */}
                          <td className="p-3.5 whitespace-nowrap">
                            {item.status === 'online' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[11px]">
                                <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
                                在线
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200 text-[11px]">
                                <WifiOff className="w-3 h-3 text-slate-400" />
                                离线
                              </span>
                            )}
                          </td>

                          {/* 4. 关联资产 (纯信息展示，不显示变更操作) */}
                          <td className="p-3.5 whitespace-nowrap">
                            {item.assetId && item.assetName ? (
                              <div className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="font-semibold text-slate-800" title={item.assetName}>
                                  {item.assetName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 5. 最近上线时间 */}
                          <td className="p-3.5 text-slate-500 font-mono whitespace-nowrap">
                            {item.lastOnlineTime ? item.lastOnlineTime : <span className="text-slate-400">—</span>}
                          </td>

                          {/* 6. 登录账号 */}
                          <td className="p-3.5 font-medium text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                              {item.loginAccount}
                            </span>
                          </td>

                          {/* 7. 设备序列号 */}
                          <td className="p-3.5 font-mono text-blue-700 whitespace-nowrap font-semibold">
                            {item.sn}
                          </td>

                          {/* 操作列 */}
                          <td className="p-3.5 text-center whitespace-nowrap relative">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 详情 */}
                              <button
                                onClick={() => handleExecuteOperation('details', item)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200 transition-colors shadow-2xs"
                                title="查看终端详细信息与数据图表"
                              >
                                详情
                              </button>

                              {/* 更多 */}
                              <div className="relative inline-block text-left">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMoreDropdownId(activeMoreDropdownId === item.id ? null : item.id);
                                  }}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-0.5 border",
                                    activeMoreDropdownId === item.id
                                      ? "bg-slate-200 text-slate-900 border-slate-300 shadow-xs"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                                  )}
                                  title="更多操作"
                                >
                                  <span>更多</span>
                                  <ChevronDown className="w-3 h-3 text-slate-500" />
                                </button>

                                {/* 更多操作下拉菜单 */}
                                <AnimatePresence>
                                  {activeMoreDropdownId === item.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setActiveMoreDropdownId(null)}
                                      />
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-40 text-left text-xs font-medium"
                                      >
                                        {/* 1. 关联资产 */}
                                        <button
                                          onClick={() => {
                                            setActiveMoreDropdownId(null);
                                            handleOpenBindAssetModal(item);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center gap-2"
                                        >
                                          <Link2 className="w-3.5 h-3.5 text-blue-600" />
                                          <span>关联资产</span>
                                        </button>

                                        {/* 2. 固件升级 (离线设备禁止点击) */}
                                        <button
                                          type="button"
                                          disabled={item.status === 'offline'}
                                          onClick={() => {
                                            if (item.status === 'offline') return;
                                            setActiveMoreDropdownId(null);
                                            handleExecuteOperation('firmware', item);
                                          }}
                                          title={item.status === 'offline' ? '离线状态下不允许固件升级' : '固件升级'}
                                          className={cn(
                                            "w-full text-left px-3 py-1.5 flex items-center gap-2 transition-colors",
                                            item.status === 'offline'
                                              ? "text-slate-300 cursor-not-allowed bg-slate-50/50"
                                              : "hover:bg-blue-50 text-slate-700 hover:text-blue-700"
                                          )}
                                        >
                                          <ArrowUpCircle className={cn("w-3.5 h-3.5", item.status === 'offline' ? "text-slate-300" : "text-indigo-600")} />
                                          <span>固件升级</span>
                                        </button>

                                        {/* 3. 运行日志 */}
                                        <button
                                          onClick={() => {
                                            setActiveMoreDropdownId(null);
                                            handleExecuteOperation('logs', item);
                                          }}
                                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center gap-2"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>运行日志</span>
                                        </button>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {displayedTerminals.length === 0 && (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    未找到符合条件的终端设备
                  </div>
                )}

                {/* 分页控制栏 */}
                {displayedTerminals.length > 0 && (
                  <div className="bg-slate-50/70 border-t border-slate-200/90 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>
                        显示第 <b className="text-slate-800 font-mono">{(safeTerminalPage - 1) * terminalPageSize + 1}</b> 到 <b className="text-slate-800 font-mono">{Math.min(safeTerminalPage * terminalPageSize, displayedTerminals.length)}</b> 条，共 <b className="text-slate-900 font-mono">{displayedTerminals.length}</b> 条终端
                      </span>
                      <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
                      <div className="flex items-center gap-1.5">
                        <span>每页:</span>
                        <select
                          value={terminalPageSize}
                          onChange={(e) => {
                            setTerminalPageSize(Number(e.target.value));
                            setTerminalPage(1);
                          }}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value={5}>5 条/页</option>
                          <option value={10}>10 条/页</option>
                          <option value={20}>20 条/页</option>
                          <option value={50}>50 条/页</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTerminalPage((prev) => Math.max(1, prev - 1))}
                        disabled={safeTerminalPage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 shadow-2xs"
                        title="上一页"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalTerminalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setTerminalPage(pageNum)}
                            className={cn(
                              "w-7 h-7 rounded-lg text-xs font-semibold transition-all",
                              safeTerminalPage === pageNum
                                ? "bg-blue-600 text-white shadow-2xs font-bold"
                                : "text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200"
                            )}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setTerminalPage((prev) => Math.min(totalTerminalPages, prev + 1))}
                        disabled={safeTerminalPage >= totalTerminalPages}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 shadow-2xs"
                        title="下一页"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= 2. 资产管理 (系统管理) ================= */}
          {activeTab === 'system_assets' && (
            <div className="space-y-4">
              
              {/* Header Card for Assets */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span>资产管理</span>
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const allIds: Record<number, boolean> = {};
                      assets.forEach(a => { allIds[a.id] = true; });
                      setExpandedAssetIds(allIds);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                  >
                    展开全部
                  </button>

                  <button
                    onClick={() => setExpandedAssetIds({})}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                  >
                    折叠全部
                  </button>

                  <button
                    onClick={() => handleOpenAddAsset()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>新增资产</span>
                  </button>
                </div>
              </div>

              {/* 搜索栏 (搜索 -> 资产名称) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  {/* 搜索: 资产名称 */}
                  <div className="relative min-w-[260px] max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={assetSearchName}
                      onChange={(e) => setAssetSearchName(e.target.value)}
                      placeholder="搜索资产名称 (如: 信息楼、实训室、大棚)..."
                      className="w-full pl-9 pr-7 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                    />
                    {assetSearchName && (
                      <button
                        onClick={() => setAssetSearchName('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                </div>

                <div className="text-xs text-slate-500">
                  资产节点共计: <b className="text-slate-900">{filteredAssets.length}</b> 个
                </div>
              </div>

              {/* 树形资产列表 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3.5 whitespace-nowrap min-w-[260px]">资产名称</th>
                        <th className="p-3.5 whitespace-nowrap">上级</th>
                        <th className="p-3.5 whitespace-nowrap">排序号</th>
                        <th className="p-3.5 whitespace-nowrap">备注</th>
                        <th className="p-3.5 text-center whitespace-nowrap w-44">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assetTreeNodes.length > 0 ? (
                        renderAssetTreeRows(assetTreeNodes)
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-slate-400 text-xs">
                            暂无符合条件的资产记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ================= 3. 自定义硬件智能体 (Agents) ================= */}
          {(activeTab === 'system_agents' || activeTab === 'platform_agents') && (
            <div className="space-y-4">
              {/* Top Bar for Custom Agents */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Cpu className={cn("w-4 h-4", isPlatformScope ? "text-indigo-600" : "text-blue-600")} />
                    <span>自定义智能体管理</span>
                  </h3>
                </div>

                <div ref={newAgentMenuRef} className="relative self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsNewAgentMenuOpen((prev) => !prev)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs whitespace-nowrap",
                      isPlatformScope ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    <span>新增智能体</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isNewAgentMenuOpen && "rotate-180")} />
                  </button>

                  {isNewAgentMenuOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-30 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewAgentMenuOpen(false);
                          setIsNewAgentModalOpen(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition-colors flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Edit className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">手动创建</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">填写名称与型号后手动配置</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsNewAgentMenuOpen(false);
                          window.dispatchEvent(new CustomEvent('open-agent-create-assistant'));
                        }}
                        className="w-full px-3 py-2.5 rounded-xl hover:bg-indigo-50/70 text-left transition-colors flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-indigo-700">AI 创建</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">弹出 AI 智能体助手辅助生成</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter Bar for Custom Agents */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {isPlatformScope && (
                    <div className="flex items-center gap-1.5 bg-indigo-50/80 p-1 rounded-xl border border-indigo-200 text-xs">
                      <span className="text-indigo-700 px-2 font-bold flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-indigo-600" />
                        发布高校:
                      </span>
                      <select
                        value={agentSchoolFilter}
                        onChange={(e) => {
                          setAgentSchoolFilter(e.target.value);
                          setAgentPage(1);
                        }}
                        className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      >
                        {availableSchools.map((sch) => (
                          <option key={sch} value={sch}>{sch}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="relative w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={agentSearchQuery}
                      onChange={(e) => {
                        setAgentSearchQuery(e.target.value);
                        setAgentPage(1);
                      }}
                      placeholder="按智能体名称、描述搜索..."
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-400 px-2 font-medium">状态:</span>
                    {(['all', 'published', 'draft'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setAgentStatusFilter(st);
                          setAgentPage(1);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-bold transition-all",
                          agentStatusFilter === st
                            ? "bg-white text-blue-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        {st === 'all' ? '全部' : st === 'published' ? '已发布' : '未发布'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-xs text-slate-500">
                    共有 <b className="text-slate-900">{displayedCustomAgents.length}</b> 个智能体
                  </div>

                  {/* 图文 / 列表 视图切换 */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setAgentViewMode('grid')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1",
                        agentViewMode === 'grid'
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                      title="图文展示（每行4个）"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>图文</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgentViewMode('list')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1",
                        agentViewMode === 'list'
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      )}
                      title="列表展示"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>列表</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Agents Grid / List View */}
              {paginatedCustomAgents.length > 0 ? (
                agentViewMode === 'grid' ? (
                  /* 图文视图：每行显示4个 */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {paginatedCustomAgents.map((agent) => {
                      const kbs = agentKnowledgeBasesMap[agent.id] || [];
                      const docCount = kbs.reduce((acc, kb) => acc + kb.docs.length, 0);
                      return (
                        <div
                          key={agent.id}
                          className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                        >
                          <div>
                            {/* 智能体封面图 */}
                            <div className="relative h-36 bg-slate-100 overflow-hidden border-b border-slate-100">
                              <img
                                src={agent.coverImage}
                                alt={agent.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <span
                                className={cn(
                                  "absolute top-2.5 right-2.5 text-[11px] px-2 py-0.5 rounded-md font-semibold backdrop-blur-xs shadow-2xs",
                                  agent.status === 'published'
                                    ? "bg-emerald-50/95 text-emerald-700 border border-emerald-200"
                                    : "bg-white/95 text-slate-600 border border-slate-200"
                                )}
                              >
                                {agent.status === 'published' ? '已发布' : '未发布'}
                              </span>
                            </div>

                            {/* 智能体信息 */}
                            <div className="p-4 space-y-2">
                              <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors line-clamp-1" title={agent.name}>
                                {agent.name}
                              </h4>

                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[2.25rem]">
                                {agent.desc}
                              </p>

                              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  <span>使用人数: <b className="text-slate-700 font-semibold">{agent.userCount}</b> 人</span>
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  知识库 {kbs.length} 个 · {docCount} 篇
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 操作按钮: 调试、设计、发布/取消发布、删除 */}
                          <div className="px-4 pb-4 pt-2.5 border-t border-slate-100 space-y-1.5">
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDebugChat(agent)}
                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[11px] font-semibold border border-emerald-200 transition-colors flex items-center justify-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>调试</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDesignModal(agent)}
                                className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[11px] font-semibold border border-blue-200 transition-colors flex items-center justify-center gap-1"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>设计</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTogglePublishAgent(agent)}
                                className={cn(
                                  "px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors flex items-center justify-center gap-1",
                                  agent.status === 'published'
                                    ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                                )}
                              >
                                {agent.status === 'published' ? (
                                  <>
                                    <XCircle className="w-3 h-3" />
                                    <span>取消发布</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpCircle className="w-3 h-3" />
                                    <span>发布</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteAgent(agent.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>删除</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* 列表视图 */
                  <div className="space-y-3">
                    {paginatedCustomAgents.map((agent) => {
                      const kbs = agentKnowledgeBasesMap[agent.id] || [];
                      const docCount = kbs.reduce((acc, kb) => acc + kb.docs.length, 0);
                      return (
                        <div
                          key={agent.id}
                          className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                            {/* 智能体封面图 */}
                            <div className="w-24 h-18 sm:w-32 sm:h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0">
                              <img
                                src={agent.coverImage}
                                alt={agent.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            {/* 文案信息: 智能体名称、发布状态、简短描述、使用人数 */}
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors truncate">
                                  {agent.name}
                                </h4>
                                <span
                                  className={cn(
                                    "text-[11px] px-2 py-0.5 rounded-md font-semibold shrink-0",
                                    agent.status === 'published'
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  )}
                                >
                                  {agent.status === 'published' ? '已发布' : '未发布'}
                                </span>
                              </div>

                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {agent.desc}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-slate-400" />
                                  <span>使用人数: <b className="text-slate-700 font-semibold">{agent.userCount}</b> 人</span>
                                </span>
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Database className="w-3.5 h-3.5" />
                                  <span>知识库: <b className="text-slate-600 font-semibold">{kbs.length}</b> 个 ({docCount} 篇)</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 操作按钮: 调试、设计、发布/取消发布、删除 */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleOpenDebugChat(agent)}
                              className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>调试</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDesignModal(agent)}
                              className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold border border-blue-200 transition-colors flex items-center gap-1.5"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>设计</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleTogglePublishAgent(agent)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5",
                                agent.status === 'published'
                                  ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                                  : "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                              )}
                            >
                              {agent.status === 'published' ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>取消发布</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle className="w-3.5 h-3.5" />
                                  <span>发布</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>删除</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
                  暂无符合条件的自定义智能体
                </div>
              )}

              {/* 分页控制栏 */}
              {displayedCustomAgents.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>
                      显示第 <b className="text-slate-800 font-mono">{(safeAgentPage - 1) * agentPageSize + 1}</b> 到{' '}
                      <b className="text-slate-800 font-mono">{Math.min(safeAgentPage * agentPageSize, displayedCustomAgents.length)}</b> 条，共{' '}
                      <b className="text-slate-900 font-mono">{displayedCustomAgents.length}</b> 个智能体
                    </span>
                    <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <span>每页:</span>
                      <select
                        value={agentPageSize}
                        onChange={(e) => {
                          setAgentPageSize(Number(e.target.value));
                          setAgentPage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={4}>4 条/页</option>
                        <option value={8}>8 条/页</option>
                        <option value={12}>12 条/页</option>
                        <option value={20}>20 条/页</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAgentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safeAgentPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 shadow-2xs"
                      title="上一页"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalAgentPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setAgentPage(pageNum)}
                          className={cn(
                            "w-7 h-7 rounded-lg text-xs font-semibold transition-all",
                            safeAgentPage === pageNum
                              ? "bg-blue-600 text-white shadow-2xs font-bold"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200"
                          )}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setAgentPage((prev) => Math.min(totalAgentPages, prev + 1))}
                      disabled={safeAgentPage >= totalAgentPages}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 shadow-2xs"
                      title="下一页"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= 平台运营 · 固件管理 (Firmwares - 用户要求 10) ================= */}
          {activeTab === 'platform_firmwares' && (
            <div className="space-y-4">
              {/* Header Card for Firmwares */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-indigo-600" />
                    <span>平台运营 · 固件管理</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                      全网终端 OTA 固件包分发中心
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    集中管理全网实训接入终端、边缘网关与工控控制器的固件上传、版本发布、下架归档与历史清理
                  </p>
                </div>

                {/* 固件状态统计指标 */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-4 text-xs bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-slate-400">总固件数: </span>
                      <b className="font-mono text-slate-800 font-bold">{firmwares.length}</b>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-400">已发布: </span>
                      <b className="font-mono text-emerald-700 font-bold">
                        {firmwares.filter(f => f.status === '发布').length}
                      </b>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-slate-400">未发布: </span>
                      <b className="font-mono text-amber-700 font-bold">
                        {firmwares.filter(f => f.status === '未发布').length}
                      </b>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="text-slate-400">已下架: </span>
                      <b className="font-mono text-slate-700 font-bold">
                        {firmwares.filter(f => f.status === '下架').length}
                      </b>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNewFirmwareName('');
                      setNewFirmwareVersion('');
                      setNewFirmwareModel('通用终端 (全系兼容)');
                      setNewFirmwareRemark('');
                      setNewFirmwareStatus('未发布');
                      setNewFirmwareFile(null);
                      setFirmwareUploadProgress(0);
                      setIsUploadFirmwareModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>上传新增固件</span>
                  </button>
                </div>
              </div>

              {/* 搜索与发布状态筛选工具栏 */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* 状态 Tab */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => setFirmwareStatusFilter('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-semibold transition-all text-xs flex items-center gap-1.5",
                      firmwareStatusFilter === 'all'
                        ? "bg-white text-indigo-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span>全部固件</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 text-slate-600 font-mono">
                      {firmwares.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setFirmwareStatusFilter('发布')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-semibold transition-all text-xs flex items-center gap-1.5",
                      firmwareStatusFilter === '发布'
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>已发布</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100/70 text-emerald-800 font-mono">
                      {firmwares.filter(f => f.status === '发布').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setFirmwareStatusFilter('未发布')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-semibold transition-all text-xs flex items-center gap-1.5",
                      firmwareStatusFilter === '未发布'
                        ? "bg-white text-amber-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>未发布</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100/70 text-amber-800 font-mono">
                      {firmwares.filter(f => f.status === '未发布').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setFirmwareStatusFilter('下架')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-semibold transition-all text-xs flex items-center gap-1.5",
                      firmwareStatusFilter === '下架'
                        ? "bg-white text-slate-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>已下架</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 text-slate-700 font-mono">
                      {firmwares.filter(f => f.status === '下架').length}
                    </span>
                  </button>
                </div>

                {/* 搜索框 */}
                <div className="relative min-w-[280px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={firmwareSearchQuery}
                    onChange={(e) => setFirmwareSearchQuery(e.target.value)}
                    placeholder="按固件名称 / 版本 / 备注 / 文件名搜索..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-400 transition-all text-slate-800"
                  />
                  {firmwareSearchQuery && (
                    <button
                      onClick={() => setFirmwareSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 固件列表表格 */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">固件名称与安装包</th>
                        <th className="py-3 px-4">版本号</th>
                        <th className="py-3 px-4">适配硬件型号</th>
                        <th className="py-3 px-4">更新备注说明</th>
                        <th className="py-3 px-4">上传时间</th>
                        <th className="py-3 px-4 text-center">发布状态</th>
                        <th className="py-3 px-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedFirmwares.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Package className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                              <span className="text-xs">暂无符合条件的固件包记录</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        displayedFirmwares.map((firmware) => {
                          return (
                            <tr key={firmware.id} className="hover:bg-slate-50/60 transition-colors">
                              {/* 1. 固件名称与文件 */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                                    firmware.status === '发布'
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                      : firmware.status === '未发布'
                                      ? "bg-amber-50 border-amber-200 text-amber-700"
                                      : "bg-slate-100 border-slate-200 text-slate-500"
                                  )}>
                                    <Package className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                      <span>{firmware.name}</span>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                                      <span className="text-slate-400">{firmware.fileName}</span>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-slate-500 font-semibold">{firmware.fileSize}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. 版本 */}
                              <td className="py-3.5 px-4 font-mono">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/80">
                                  {firmware.version}
                                </span>
                              </td>

                              {/* 3. 适配硬件 */}
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200/70">
                                  {firmware.hardwareModel}
                                </span>
                              </td>

                              {/* 4. 备注 */}
                              <td className="py-3.5 px-4 max-w-[280px]">
                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed" title={firmware.remark}>
                                  {firmware.remark}
                                </p>
                              </td>

                              {/* 5. 上传时间 */}
                              <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{firmware.uploadTime}</span>
                                </div>
                              </td>

                              {/* 6. 发布状态 */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                                  firmware.status === '发布'
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : firmware.status === '未发布'
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    firmware.status === '发布'
                                      ? "bg-emerald-500 animate-pulse"
                                      : firmware.status === '未发布'
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                                  )} />
                                  {firmware.status}
                                </span>
                              </td>

                              {/* 7. 操作 */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {/* 状态未发布: 显示发布、删除 */}
                                  {firmware.status === '未发布' && (
                                    <>
                                      <button
                                        onClick={() => handlePublishFirmware(firmware.id)}
                                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                                        title="将此固件发布为生效版本"
                                      >
                                        发布
                                      </button>
                                      <button
                                        onClick={() => setSelectedFirmwareForDetail(firmware)}
                                        className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                      >
                                        详情
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFirmware(firmware.id, firmware.name)}
                                        className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="删除固件包"
                                      >
                                        删除
                                      </button>
                                    </>
                                  )}

                                  {/* 状态已发布: 显示下架、详情 */}
                                  {firmware.status === '发布' && (
                                    <>
                                      <button
                                        onClick={() => handleRevokeFirmware(firmware.id)}
                                        className="px-2.5 py-1 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                                        title="下架此固件包"
                                      >
                                        下架
                                      </button>
                                      <button
                                        onClick={() => setSelectedFirmwareForDetail(firmware)}
                                        className="px-2.5 py-1 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                                      >
                                        详情
                                      </button>
                                    </>
                                  )}

                                  {/* 状态已下架: 显示重新发布、详情、删除 */}
                                  {firmware.status === '下架' && (
                                    <>
                                      <button
                                        onClick={() => handlePublishFirmware(firmware.id)}
                                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                                        title="重新上架发布"
                                      >
                                        发布
                                      </button>
                                      <button
                                        onClick={() => setSelectedFirmwareForDetail(firmware)}
                                        className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                      >
                                        详情
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFirmware(firmware.id, firmware.name)}
                                        className="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="永久删除"
                                      >
                                        删除
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="bg-slate-50/70 border-t border-slate-200/80 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
                  <span>共展示 <b>{displayedFirmwares.length}</b> 个固件升级包</span>
                  <span className="text-[11px] text-slate-400">支持 .bin / .tar.gz / .zip 格式 · 实时双向握手校验 OTA 完整性</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= 平台运营 · 系统工具 ================= */}
          {activeTab === 'platform_system_tools' && (
            <PlatformSystemToolsPanel
              tools={systemTools}
              onChangeTools={setSystemTools}
              onNotify={showFirmwareToast}
              onRequestConfirm={(dialog) =>
                setConfirmDialog({
                  ...dialog,
                  onConfirm: () => {
                    dialog.onConfirm();
                    setConfirmDialog(null);
                  },
                })
              }
            />
          )}

          {/* ================= 平台运营 · 系统配置 (默认 AI 助手配置) ================= */}
          {activeTab === 'platform_system_config' && (
            <PlatformSystemConfigPanel
              config={defaultAiConfig}
              onChangeConfig={handleUpdateDefaultAiConfig}
              onNotify={showFirmwareToast}
              onRequestConfirm={(dialog) =>
                setConfirmDialog({
                  ...dialog,
                  onConfirm: () => {
                    dialog.onConfirm();
                    setConfirmDialog(null);
                  },
                })
              }
            />
          )}

          {/* ================= 4. 数据总览 (Overview) ================= */}
          {(activeTab === 'system_overview' || activeTab === 'platform_overview') && (
            <OverviewDashboard
              isPlatformScope={isPlatformScope}
              terminals={isPlatformScope ? terminals : terminals.filter((t) => t.schoolName === DEFAULT_LOCAL_SCHOOL)}
              customAgents={isPlatformScope ? customAgents : customAgents.filter((a) => a.schoolName === DEFAULT_LOCAL_SCHOOL)}
              systemAgents={INITIAL_SYSTEM_AGENTS}
              availableSchools={availableSchools}
            />
          )}

        </main>
      </div>

      {/* ================= MODAL: 绑定/关联资产弹窗 (树形展示 · 占屏幕80%) ================= */}
      <AnimatePresence>
        {bindingTerminal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 md:p-7 w-[82vw] max-w-6xl h-[82vh] max-h-[880px] min-h-[520px] shadow-2xl border border-slate-200 flex flex-col justify-between overflow-hidden">
              {/* 1. 顶部标题栏 */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base md:text-lg">
                        关联终端资产
                      </h3>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setBindingTerminal(null)}
                  className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* 2. 终端信息卡片 */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 rounded-2xl border border-blue-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 my-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                      <span>{bindingTerminal.name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-100 shrink-0 flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5">
                  <div>
                    <span className="text-[11px] text-slate-400 block">当前已关联资产:</span>
                    <span className="font-bold text-blue-700 text-sm flex items-center sm:justify-end gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      {bindingTerminal.assetName || '未关联资产'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. 树形列表核心区域 (flex-1 撑开至80%高度) */}
              <div className="flex-1 min-h-0 flex flex-col space-y-2.5 my-1">
                {/* 搜索与展开折叠工具栏 */}
                <div className="flex items-center justify-between gap-3 shrink-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modalAssetSearch}
                      onChange={(e) => setModalAssetSearch(e.target.value)}
                      placeholder="快速检索资产节点名称或备注..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 transition-all"
                    />
                    {modalAssetSearch && (
                      <button
                        onClick={() => setModalAssetSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-slate-400 text-xs hidden sm:inline">
                      共 <b className="text-slate-700 font-mono">{modalTargetAssets.length}</b> 个资产节点
                    </span>
                    <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                    <button
                      type="button"
                      onClick={expandAllModalTree}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-xl font-medium transition-colors flex items-center gap-1 border border-slate-200 text-xs"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>全部展开</span>
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllModalTree}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center gap-1 border border-slate-200 text-xs"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      <span>全部折叠</span>
                    </button>
                  </div>
                </div>

                {/* 滚动树形视图 (大尺寸撑开) */}
                <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-1">
                  {/* 递归树形列表 */}
                  {modalAssetTreeNodes.length > 0 ? (
                    renderModalAssetTreeNodes(modalAssetTreeNodes)
                  ) : (
                    <div className="p-16 text-center text-slate-400 text-xs">
                      未检索到匹配的资产节点
                    </div>
                  )}
                </div>
              </div>

              {/* 4. 底部状态与操作栏 */}
              <div className="shrink-0 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                {/* 选中资产层级路径提示 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-slate-700 shrink-0">已选目标:</span>
                  {selectedAssetIdForBinding === null ? (
                    <span className="text-slate-400 font-medium">
                      请选择要关联的资产
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 overflow-x-auto text-blue-900 font-medium whitespace-nowrap">
                      {getAssetFullPath(selectedAssetIdForBinding, assets).map((seg, idx, arr) => (
                        <React.Fragment key={idx}>
                          <span className={idx === arr.length - 1 ? "font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-md" : "text-slate-600"}>
                            {seg}
                          </span>
                          {idx < arr.length - 1 && <span className="text-slate-300">/</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  {bindingTerminal.assetId !== null && (
                    <button
                      type="button"
                      onClick={handleModalUnbindCurrentTerminal}
                      className="px-4 py-2.5 border border-rose-200 text-rose-600 bg-rose-50/80 hover:bg-rose-100 hover:border-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Unlink className="w-3.5 h-3.5 text-rose-500" />
                      <span>解除关联</span>
                    </button>
                  )}
                  <button
                    onClick={() => setBindingTerminal(null)}
                    className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button
                    disabled={selectedAssetIdForBinding === null}
                    onClick={handleConfirmBindAsset}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
                  >
                    确认保存关联
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: 新增/编辑资产弹窗 (截图要求: 资产名称, 上级, 排序号, 备注) ================= */}
      <AnimatePresence>
        {isAssetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingAsset ? '编辑资产信息' : '新增树形资产'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAssetModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAsset} className="space-y-3.5 text-xs">
                {/* 1. 资产名称 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">
                      资产名称 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {assetFormData.name.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={assetFormData.name}
                    onChange={(e) => setAssetFormData({ ...assetFormData, name: e.target.value })}
                    placeholder="必填，1~50个字符，如：信息楼 A栋 / A-301 物联实训室"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 2. 上级 (上级资产选择) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">上级资产</label>
                  <select
                    value={assetFormData.parentId === null ? '' : assetFormData.parentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssetFormData({
                        ...assetFormData,
                        parentId: val === '' ? null : Number(val),
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">(无上级 · 作为顶级资产)</option>
                    {assets
                      .filter((a) => !editingAsset || a.id !== editingAsset.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.parentId ? '　└ ' : '■ '} {a.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* 3. 排序号 */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    排序号 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={9999}
                    value={assetFormData.orderNum}
                    onChange={(e) =>
                      setAssetFormData({
                        ...assetFormData,
                        orderNum: Math.min(9999, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    placeholder="1~9999，数字越小排在越前"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 4. 备注 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">备注说明</label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {assetFormData.remark.length}/200
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={assetFormData.remark}
                    onChange={(e) => setAssetFormData({ ...assetFormData, remark: e.target.value })}
                    placeholder="选填，最多200字，例如：可容纳实验设备工位数量、责任区域等"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssetModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-xs"
                  >
                    保存资产
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: 终端详情大屏 (上半部分展示列表信息，下半部分在线记录折线图 + AI问答消耗柱状图) ================= */}
      <AnimatePresence>
        {activeActionModal && activeActionModal.type === 'details' && (() => {
          const term = activeActionModal.terminal;

          // 在线记录折线图数据: 按日(14天)、按月(12个月)、按年(3年)
          const onlineDayData = [
            { label: '03-15', fullDate: '2026-03-15', hours: 22.5, timeSpan: '01:30 - 24:00', rate: '93.8%', note: '实训台位全天运行' },
            { label: '03-16', fullDate: '2026-03-16', hours: 21.0, timeSpan: '03:00 - 24:00', rate: '87.5%', note: '例行网络端口巡检' },
            { label: '03-17', fullDate: '2026-03-17', hours: 23.8, timeSpan: '00:12 - 24:00', rate: '99.2%', note: '高频实训教学使用' },
            { label: '03-18', fullDate: '2026-03-18', hours: 24.0, timeSpan: '00:00 - 24:00', rate: '100%', note: '全天24h持续在线' },
            { label: '03-19', fullDate: '2026-03-19', hours: 19.5, timeSpan: '04:30 - 24:00', rate: '81.3%', note: '总线反射自愈恢复' },
            { label: '03-20', fullDate: '2026-03-20', hours: 20.2, timeSpan: '03:50 - 24:00', rate: '84.2%', note: 'Modbus协议探测' },
            { label: '03-21', fullDate: '2026-03-21', hours: 24.0, timeSpan: '00:00 - 24:00', rate: '100%', note: '全天24h持续在线' },
            { label: '03-22', fullDate: '2026-03-22', hours: 23.5, timeSpan: '00:30 - 24:00', rate: '97.9%', note: '稳态通信保持' },
            { label: '03-23', fullDate: '2026-03-23', hours: 18.0, timeSpan: '06:00 - 24:00', rate: '75.0%', note: '实训室电闸保养' },
            { label: '03-24', fullDate: '2026-03-24', hours: 22.8, timeSpan: '01:10 - 24:00', rate: '95.0%', note: '智能体排错实训' },
            { label: '03-25', fullDate: '2026-03-25', hours: 24.0, timeSpan: '00:00 - 24:00', rate: '100%', note: '全天24h持续在线' },
            { label: '03-26', fullDate: '2026-03-26', hours: 23.2, timeSpan: '00:50 - 24:00', rate: '96.7%', note: 'MCP通道心跳稳态' },
            { label: '03-27', fullDate: '2026-03-27', hours: 21.6, timeSpan: '02:24 - 24:00', rate: '90.0%', note: '固件更新后握手' },
            { label: '03-28', fullDate: '2026-03-28', hours: term.status === 'online' ? 23.5 : 14.2, timeSpan: term.status === 'online' ? '00:30 - 24:00' : '00:00 - 14:12', rate: term.status === 'online' ? '97.9%' : '59.2%', note: term.status === 'online' ? '当前保持实时联机' : '当前设备离线待机' },
          ];

          const onlineMonthData = [
            { label: '1月', fullDate: '2026年01月', hours: 21.2, timeSpan: '日均 21.2h / 天', rate: '88.3%', note: '期末集中实训' },
            { label: '2月', fullDate: '2026年02月', hours: 19.8, timeSpan: '日均 19.8h / 天', rate: '82.5%', note: '寒假低功耗巡检' },
            { label: '3月', fullDate: '2026年03月', hours: 23.4, timeSpan: '日均 23.4h / 天', rate: '97.5%', note: '春季学期常态化教学' },
            { label: '4月', fullDate: '2026年04月', hours: 22.8, timeSpan: '日均 22.8h / 天', rate: '95.0%', note: '传感器网络实操' },
            { label: '5月', fullDate: '2026年05月', hours: 23.6, timeSpan: '日均 23.6h / 天', rate: '98.3%', note: '职业技能大赛备赛' },
            { label: '6月', fullDate: '2026年06月', hours: 22.5, timeSpan: '日均 22.5h / 天', rate: '93.8%', note: '期末课程综合实训' },
            { label: '7月', fullDate: '2026年07月', hours: 18.2, timeSpan: '日均 18.2h / 天', rate: '75.8%', note: '暑期例行维护期' },
            { label: '8月', fullDate: '2026年08月', hours: 19.5, timeSpan: '日均 19.5h / 天', rate: '81.3%', note: '系统新固件推送' },
            { label: '9月', fullDate: '2026年09月', hours: 23.8, timeSpan: '日均 23.8h / 天', rate: '99.2%', note: '秋季迎新实训周' },
            { label: '10月', fullDate: '2026年10月', hours: 22.9, timeSpan: '日均 22.9h / 天', rate: '95.4%', note: '工业互联网综合课' },
            { label: '11月', fullDate: '2026年11月', hours: 23.7, timeSpan: '日均 23.7h / 天', rate: '98.8%', note: '多终端联动大项目' },
            { label: '12月', fullDate: '2026年12月', hours: 22.3, timeSpan: '日均 22.3h / 天', rate: '92.9%', note: '学期末设备考评' },
          ];

          const onlineYearData = [
            { label: '2024年', fullDate: '2024年度', hours: 20.8, timeSpan: '年日均 20.8h / 天', rate: '86.7%', note: '物联实训基地初期组网' },
            { label: '2025年', fullDate: '2025年度', hours: 22.4, timeSpan: '年日均 22.4h / 天', rate: '93.3%', note: '全面部署网关协议探针' },
            { label: '2026年(至今)', fullDate: '2026年度', hours: 23.2, timeSpan: '年日均 23.2h / 天', rate: '96.7%', note: '硬件智能体自愈加持' },
          ];

          // 时间范围切片与开始/结束日期过滤
          let baseOnline = 
            detailsOnlineDimension === 'day' ? onlineDayData :
            detailsOnlineDimension === 'month' ? onlineMonthData : onlineYearData;

          if (detailsOnlineDimension === 'day') {
            if (detailsStartDate || detailsEndDate) {
              const filtered = onlineDayData.filter((d) => {
                if (detailsStartDate && d.fullDate < detailsStartDate) return false;
                if (detailsEndDate && d.fullDate > detailsEndDate) return false;
                return true;
              });
              baseOnline = filtered.length > 0 ? filtered : onlineDayData;
            } else if (detailsTimeRange === '近7天') {
              baseOnline = onlineDayData.slice(-7);
            } else if (detailsTimeRange === '近14天') {
              baseOnline = onlineDayData.slice(-14);
            }
          } else if (detailsOnlineDimension === 'month') {
            if (detailsStartDate || detailsEndDate) {
              const filtered = onlineMonthData.filter((d) => {
                const monthStr = d.fullDate.replace('年', '-').replace('月', '');
                if (detailsStartDate && monthStr < detailsStartDate.substring(0, 7)) return false;
                if (detailsEndDate && monthStr > detailsEndDate.substring(0, 7)) return false;
                return true;
              });
              baseOnline = filtered.length > 0 ? filtered : onlineMonthData;
            } else if (detailsTimeRange === '近半年') {
              baseOnline = onlineMonthData.slice(-6);
            }
          } else if (detailsOnlineDimension === 'year') {
            if (detailsStartDate || detailsEndDate) {
              const filtered = onlineYearData.filter((d) => {
                const yrStr = d.label.replace('年', '').substring(0, 4);
                if (detailsStartDate && yrStr < detailsStartDate.substring(0, 4)) return false;
                if (detailsEndDate && yrStr > detailsEndDate.substring(0, 4)) return false;
                return true;
              });
              baseOnline = filtered.length > 0 ? filtered : onlineYearData;
            }
          }

          // 关键词检索
          const currentOnlineDataset = baseOnline.filter((d) => {
            if (!detailsSearchKeyword.trim()) return true;
            const q = detailsSearchKeyword.trim().toLowerCase();
            return (
              d.label.toLowerCase().includes(q) ||
              d.fullDate.toLowerCase().includes(q) ||
              d.note.toLowerCase().includes(q)
            );
          });

          // AI 问答消耗柱状图数据 (支持开始和结束日期计算及快捷范围)
          let multiplier = 1.0;
          if (detailsStartDate && detailsEndDate) {
            const startMs = new Date(detailsStartDate).getTime();
            const endMs = new Date(detailsEndDate).getTime();
            const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
            multiplier = Math.min(1.2, Math.max(0.1, diffDays / 14));
          } else {
            const timeRangeMultipliers: Record<string, number> = {
              '全部时间': 1.0,
              '今年': 0.85,
              '近半年': 0.65,
              '近30天': 0.35,
              '近14天': 0.18,
              '近7天': 0.10,
              '自定义': 0.5,
            };
            multiplier = timeRangeMultipliers[detailsTimeRange] ?? 1.0;
          }

          const rawAiTokensDataset = [
            { agentName: '中心网关智能体', model: 'NL-GW-2000', tokens: Math.round(68420 * multiplier), calls: Math.max(1, Math.round(1420 * multiplier)), focus: '多协议报文转发与握手自愈', color: 'from-blue-600 to-indigo-600' },
            { agentName: 'USR-M100 DTU智能体', model: 'USR-M100', tokens: Math.round(45600 * multiplier), calls: Math.max(1, Math.round(910 * multiplier)), focus: '边缘计算脚本与网络丢包自诊断', color: 'from-blue-500 to-cyan-500' },
            { agentName: 'AI前端视觉实训智能体', model: 'AI-FRONTEND-V1', tokens: Math.round(89350 * multiplier), calls: Math.max(1, Math.round(1890 * multiplier)), focus: '目标检测模型推理与摄像头推流排障', color: 'from-indigo-600 to-violet-600' },
            { agentName: '网络IO控制器智能体', model: 'USR-IO424', tokens: Math.round(32800 * multiplier), calls: Math.max(1, Math.round(680 * multiplier)), focus: '数字量与模拟量IO端口冲突排查', color: 'from-emerald-500 to-teal-600' },
            { agentName: 'ECU-1251工控智能体', model: 'ADVANTECH-ECU1251', tokens: Math.round(74100 * multiplier), calls: Math.max(1, Math.round(1530 * multiplier)), focus: 'Modbus/CAN协议解析与阻抗反射自测', color: 'from-blue-600 to-sky-600' },
            { agentName: '智慧农业联动智能体', model: 'USR-LG206', tokens: Math.round(28900 * multiplier), calls: Math.max(1, Math.round(590 * multiplier)), focus: 'Lora无线数传与微气候传感器标定', color: 'from-amber-500 to-orange-500' },
            { agentName: 'PLC梯形图调测智能体', model: 'ADVANTECH-ECU1251', tokens: Math.round(56200 * multiplier), calls: Math.max(1, Math.round(1160 * multiplier)), focus: '梯形图语法逻辑错误与寄存器越界', color: 'from-purple-600 to-pink-600' },
          ];

          const aiTokensDataset = rawAiTokensDataset.filter(item => {
            if (!detailsSearchKeyword.trim()) return true;
            const q = detailsSearchKeyword.trim().toLowerCase();
            return item.agentName.toLowerCase().includes(q) || item.model.toLowerCase().includes(q) || item.focus.toLowerCase().includes(q);
          });

          const maxTokens = 100000;
          const totalTokensSum = aiTokensDataset.reduce((sum, item) => sum + item.tokens, 0);
          const totalCallsSum = aiTokensDataset.reduce((sum, item) => sum + item.calls, 0);

          // SVG 坐标计算 (在线折线图: 纵轴0-24小时)
          const svgW = 720;
          const svgH = 200;
          const padL = 46;
          const padR = 24;
          const padT = 24;
          const padB = 36;
          const plotW = svgW - padL - padR;
          const plotH = svgH - padT - padB;

          const points = currentOnlineDataset.map((d, i) => {
            const x = padL + (i / Math.max(1, currentOnlineDataset.length - 1)) * plotW;
            const y = padT + plotH - (Math.min(24, Math.max(0, d.hours)) / 24) * plotH;
            return { x, y, ...d, index: i };
          });

          const pathD = points.length > 0
            ? points.reduce((acc, pt, idx) => {
                if (idx === 0) return `M ${pt.x} ${pt.y}`;
                // 平滑三次贝塞尔曲线
                const prev = points[idx - 1];
                const cx1 = prev.x + (pt.x - prev.x) / 2;
                const cy1 = prev.y;
                const cx2 = prev.x + (pt.x - prev.x) / 2;
                const cy2 = pt.y;
                return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
              }, '')
            : '';

          const areaD = points.length > 0
            ? `${pathD} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`
            : '';

          const yTicks = [24, 18, 12, 6, 0];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl w-[92vw] max-w-6xl h-[88vh] max-h-[920px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 1. 详情大屏顶部导航栏 */}
                <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-extrabold text-slate-900 text-base">{term.name}</h3>
                        <span className={cn(
                          "text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                          term.status === 'online'
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", term.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                          {term.status === 'online' ? '正常在线' : '离线未连接'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveActionModal(null)}
                    className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. 详情内容主体 (可上下滚动) */}
                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                  {/* ================= 上半部分：基础信息 ================= */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-600" />
                        <h4 className="font-extrabold text-slate-900 text-sm">基础信息</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* 1. 名称 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-blue-600" />
                          <span>名称</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-1.5 truncate">{term.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                          型号: {term.model || '—'}
                        </div>
                      </div>

                      {/* 2. 所属学校 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-indigo-600" />
                          <span>所属学校</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-1.5 truncate">{term.schoolName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">示范实训教学点</div>
                      </div>

                      {/* 3. IP 地址 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-blue-600" />
                          <span>IP 地址</span>
                        </div>
                        <div className="font-mono font-bold text-blue-700 text-xs mt-1.5">{term.ip || '—'}</div>
                        <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                          {term.ip ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>端口 502/8234 (MCP握手)</span>
                            </>
                          ) : (
                            <span className="text-slate-400">暂无 IP 地址</span>
                          )}
                        </div>
                      </div>

                      {/* 4. 当前状态 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          {term.status === 'online' ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-slate-400" />}
                          <span>当前状态</span>
                        </div>
                        <div className="mt-1.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold",
                            term.status === 'online'
                              ? "bg-emerald-100/80 text-emerald-800"
                              : "bg-slate-200 text-slate-700"
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", term.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                            {term.status === 'online' ? '正常在线' : '离线断开'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">探针延时 2.8ms · 无丢包</div>
                      </div>

                      {/* 5. 关联资产 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-amber-600" />
                          <span>关联资产</span>
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-1.5 truncate flex items-center gap-1">
                          <span className={cn(term.assetId !== null && term.assetName ? "text-blue-700" : "text-slate-400")}>
                            {term.assetName || '—'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {term.assetId !== null ? `资产 ID: #${term.assetId}` : '未绑定物理工位空间'}
                        </div>
                      </div>

                      {/* 6. 最近上线时间 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>最近上线时间</span>
                        </div>
                        <div className="font-mono text-xs font-bold text-slate-800 mt-1.5">{term.lastOnlineTime || '—'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {term.lastOnlineTime ? '心跳周期 30s 持续保活' : '暂无上线记录'}
                        </div>
                      </div>

                      {/* 7. 登录账号 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-purple-600" />
                          <span>登录账号</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs mt-1.5">{term.loginAccount}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">实训工位授权操作员</div>
                      </div>

                      {/* 8. 设备序列号 */}
                      <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:bg-white hover:border-blue-200 transition-all">
                        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-600" />
                          <span>设备序列号 (SN)</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs mt-1.5">{term.sn}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">硬件唯一识别码</div>
                      </div>
                    </div>
                  </div>

                  {/* ================= 下半部分：Tab 切换（硬件智能体在线记录折线图 VS AI问答消耗柱状图） ================= */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                    {/* Tab 导航头与时间维度选择器 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsTab('online')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                            detailsTab === 'online'
                              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          <Activity className="w-4 h-4" />
                          <span>硬件智能体在线记录（折线图）</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsTab('ai_tokens')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                            detailsTab === 'ai_tokens'
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>AI问答消耗统计（柱状图）</span>
                        </button>
                      </div>

                      {/* 若在 Tab 1 在线记录，展示日、月、年切换 */}
                      {detailsTab === 'online' && (
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs self-start sm:self-auto">
                          <span className="text-[11px] text-slate-400 px-2 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            时间跨度:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsOnlineDimension('day');
                              setDetailsHoveredPoint(null);
                            }}
                            className={cn(
                              "px-3 py-1 rounded-lg font-bold transition-all text-xs",
                              detailsOnlineDimension === 'day'
                                ? "bg-white text-blue-600 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            按日
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsOnlineDimension('month');
                              setDetailsHoveredPoint(null);
                            }}
                            className={cn(
                              "px-3 py-1 rounded-lg font-bold transition-all text-xs",
                              detailsOnlineDimension === 'month'
                                ? "bg-white text-blue-600 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            按月
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsOnlineDimension('year');
                              setDetailsHoveredPoint(null);
                            }}
                            className={cn(
                              "px-3 py-1 rounded-lg font-bold transition-all text-xs",
                              detailsOnlineDimension === 'year'
                                ? "bg-white text-blue-600 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            按年
                          </button>
                        </div>
                      )}

                      {/* 若在 Tab 2 AI问答消耗，展示概览数字 */}
                      {detailsTab === 'ai_tokens' && (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500">累计调用问答: <b className="font-mono text-slate-800">{totalCallsSum.toLocaleString()}</b> 轮次</span>
                          <div className="h-3 w-px bg-slate-200" />
                          <span className="text-slate-500">总消耗: <b className="font-mono text-indigo-700 font-bold">{totalTokensSum.toLocaleString()}</b> Tokens</span>
                        </div>
                      )}
                    </div>

                    {/* 时间范围与开始/结束日期选择器过滤栏 (在线记录与AI问答消耗均支持) */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
                      {/* 时间范围预设快捷标签 */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          快捷范围:
                        </span>
                        {[
                          { label: '全部时间', start: '', end: '' },
                          { label: '近7天', start: '2026-03-22', end: '2026-03-28' },
                          { label: '近14天', start: '2026-03-15', end: '2026-03-28' },
                          { label: '近30天', start: '2026-03-01', end: '2026-03-28' },
                          { label: '近半年', start: '2025-10-01', end: '2026-03-28' },
                          { label: '今年', start: '2026-01-01', end: '2026-03-28' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setDetailsTimeRange(preset.label);
                              setDetailsStartDate(preset.start);
                              setDetailsEndDate(preset.end);
                              setDetailsHoveredPoint(null);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                              detailsTimeRange === preset.label
                                ? "bg-white text-blue-700 shadow-2xs font-bold border border-blue-200"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* 开始日期和结束日期选择器 (用户要求) */}
                      <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">开始日期:</span>
                            <input
                              type="date"
                              value={detailsStartDate}
                              onChange={(e) => {
                                setDetailsStartDate(e.target.value);
                                setDetailsTimeRange('自定义');
                                setDetailsHoveredPoint(null);
                                setDetailsHoveredBar(null);
                              }}
                              className="text-xs font-mono font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                              title="选择开始日期"
                            />
                          </div>
                          <span className="text-slate-400 font-bold px-0.5">至</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">结束日期:</span>
                            <input
                              type="date"
                              value={detailsEndDate}
                              onChange={(e) => {
                                setDetailsEndDate(e.target.value);
                                setDetailsTimeRange('自定义');
                                setDetailsHoveredPoint(null);
                                setDetailsHoveredBar(null);
                              }}
                              className="text-xs font-mono font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                              title="选择结束日期"
                            />
                          </div>
                        </div>

                        {(detailsStartDate || detailsEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsStartDate('');
                              setDetailsEndDate('');
                              setDetailsTimeRange('全部时间');
                              setDetailsHoveredPoint(null);
                              setDetailsHoveredBar(null);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="重置日期"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ================= TAB 1: 硬件智能体在线记录 (折线图: 纵轴0-24小时，横轴日期，支持切换月/年) ================= */}
                    {detailsTab === 'online' && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-slate-500 flex items-center gap-2">
                            <span>纵轴：<b>在线时间段 (0 - 24 小时)</b></span>
                            <span>·</span>
                            <span>横轴：<b>日期（当前按{detailsOnlineDimension === 'day' ? '日 (近14天)' : detailsOnlineDimension === 'month' ? '月 (全年12月)' : '年 (2024-2026)'}展示）</b></span>
                          </div>
                        </div>

                        {/* 折线图 SVG 绘图区 */}
                        <div className="relative bg-slate-50/60 rounded-2xl p-3 border border-slate-100 overflow-x-auto">
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-56 sm:h-64 overflow-visible select-none">
                            <defs>
                              <linearGradient id="onlineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* 纵轴刻度参考线与标签 (0 - 24 小时) */}
                            {yTicks.map((val) => {
                              const y = padT + plotH - (val / 24) * plotH;
                              return (
                                <g key={val}>
                                  <line
                                    x1={padL}
                                    y1={y}
                                    x2={padL + plotW}
                                    y2={y}
                                    stroke="#e2e8f0"
                                    strokeDasharray={val === 0 || val === 24 ? undefined : "3 3"}
                                    strokeWidth={val === 0 || val === 24 ? 1.5 : 1}
                                  />
                                  <text
                                    x={padL - 8}
                                    y={y + 3.5}
                                    textAnchor="end"
                                    fontSize="10"
                                    className="font-mono fill-slate-400 font-medium"
                                  >
                                    {val === 24 ? '24h' : `${val}h`}
                                  </text>
                                </g>
                              );
                            })}

                            {/* 横轴标签 */}
                            {points.map((pt, i) => (
                              <text
                                key={i}
                                x={pt.x}
                                y={padT + plotH + 18}
                                textAnchor="middle"
                                fontSize="10"
                                className={cn(
                                  "font-mono transition-colors",
                                  detailsHoveredPoint === i ? "fill-blue-600 font-bold" : "fill-slate-400"
                                )}
                              >
                                {pt.label}
                              </text>
                            ))}

                            {/* 面积渐变填充 */}
                            {areaD && (
                              <path d={areaD} fill="url(#onlineAreaGrad)" />
                            )}

                            {/* 折线路径 */}
                            {pathD && (
                              <path
                                d={pathD}
                                fill="none"
                                stroke="#2563eb"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}

                            {/* 悬停竖向对齐虚线 */}
                            {detailsHoveredPoint !== null && points[detailsHoveredPoint] && (
                              <line
                                x1={points[detailsHoveredPoint].x}
                                y1={padT}
                                x2={points[detailsHoveredPoint].x}
                                y2={padT + plotH}
                                stroke="#3b82f6"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                              />
                            )}

                            {/* 数据节点圆点 */}
                            {points.map((pt, i) => {
                              const isHovered = detailsHoveredPoint === i;
                              return (
                                <g
                                  key={i}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setDetailsHoveredPoint(i)}
                                  onClick={() => setDetailsHoveredPoint(i)}
                                >
                                  {/* 悬停扩大的热区 */}
                                  <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                                  <circle
                                    cx={pt.x}
                                    cy={pt.y}
                                    r={isHovered ? 6 : 3.5}
                                    fill={isHovered ? "#1d4ed8" : "#2563eb"}
                                    stroke="#ffffff"
                                    strokeWidth={isHovered ? 2.5 : 2}
                                    className="transition-all duration-150 shadow-sm"
                                  />
                                </g>
                              );
                            })}
                          </svg>

                          {/* 交互 Tooltip 卡片 */}
                          {detailsHoveredPoint !== null && points[detailsHoveredPoint] && (() => {
                            const active = points[detailsHoveredPoint];
                            return (
                              <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                                  <span className="font-bold text-slate-800">{active.fullDate}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-blue-700 font-bold font-mono">累计在线: {active.hours} 小时 / 24小时</span>
                                  <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    在线率: {active.rate}
                                  </span>
                                </div>
                                <div className="text-slate-500 text-[11px] flex items-center gap-2">
                                  <span>活跃时段: <b className="font-mono text-slate-700">{active.timeSpan}</b></span>
                                  <span>({active.note})</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* ================= TAB 2: AI问答消耗统计 (柱状图: 横轴硬件设备智能体，纵轴token消耗) ================= */}
                    {detailsTab === 'ai_tokens' && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-slate-500 flex items-center gap-2">
                            <span>纵轴：<b>Token 消耗量 (0 - 100,000 Tokens)</b></span>
                            <span>·</span>
                            <span>横轴：<b>各实训硬件设备智能体</b></span>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            点击或悬停柱状图查看具体问答轮次与排障领域
                          </div>
                        </div>

                        {/* 柱状图容器 */}
                        <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100 space-y-2">
                          {/* 纵轴刻度参考线与柱状图实体 */}
                          <div className="relative h-60 pt-4 pb-2">
                            {/* Y轴参考网格刻度 */}
                            <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
                              <div className="border-b border-slate-200 pb-0.5 flex justify-between">
                                <span>100k Tokens</span>
                                <span>峰值上限</span>
                              </div>
                              <div className="border-b border-slate-200/60 border-dashed pb-0.5">
                                <span>75k Tokens</span>
                              </div>
                              <div className="border-b border-slate-200/60 border-dashed pb-0.5">
                                <span>50k Tokens</span>
                              </div>
                              <div className="border-b border-slate-200/60 border-dashed pb-0.5">
                                <span>25k Tokens</span>
                              </div>
                              <div className="border-b border-slate-300 pb-0.5">
                                <span>0</span>
                              </div>
                            </div>

                            {/* 7 个硬件设备智能体柱子 (Flex 等分) */}
                            <div className="absolute inset-0 flex items-end justify-between px-6 sm:px-10 gap-3 sm:gap-6 z-10">
                              {aiTokensDataset.map((item, idx) => {
                                const heightPercent = Math.min(100, Math.max(12, (item.tokens / maxTokens) * 100));
                                const isHovered = detailsHoveredBar === idx;

                                return (
                                  <div
                                    key={idx}
                                    onMouseEnter={() => setDetailsHoveredBar(idx)}
                                    className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer"
                                  >
                                    {/* 柱子顶部 Token 数值徽标 */}
                                    <div className={cn(
                                      "mb-1.5 text-[10px] sm:text-xs font-mono font-bold transition-all px-1.5 py-0.5 rounded-md",
                                      isHovered
                                        ? "bg-slate-900 text-white shadow-md scale-105"
                                        : "text-slate-600 bg-white/90 border border-slate-200"
                                    )}>
                                      {(item.tokens / 1000).toFixed(1)}k
                                    </div>

                                    {/* 渐变柱体 */}
                                    <div
                                      style={{ height: `${heightPercent}%` }}
                                      className={cn(
                                        "w-full max-w-[42px] rounded-t-xl bg-gradient-to-t transition-all duration-300 relative shadow-sm",
                                        item.color,
                                        isHovered ? "ring-4 ring-blue-300/60 shadow-lg brightness-110" : "group-hover:brightness-105"
                                      )}
                                    >
                                      {/* 内部微光层 */}
                                      <div className="absolute inset-x-0 top-0 h-2 rounded-t-xl bg-white/30" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 柱状图底部横轴标签：各硬件设备智能体 */}
                          <div className="flex items-start justify-between px-6 sm:px-10 gap-3 sm:gap-6 pt-2 border-t border-slate-200 text-center">
                            {aiTokensDataset.map((item, idx) => {
                              const isHovered = detailsHoveredBar === idx;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setDetailsHoveredBar(idx)}
                                  className="flex-1 cursor-pointer flex flex-col items-center min-w-0"
                                >
                                  <div className={cn(
                                    "text-[11px] font-bold line-clamp-2 leading-tight transition-colors",
                                    isHovered ? "text-blue-700" : "text-slate-700"
                                  )}>
                                    {item.agentName}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate hidden sm:block">
                                    {item.model}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* 悬停详细指标说明卡片 */}
                          {detailsHoveredBar !== null && aiTokensDataset[detailsHoveredBar] && (() => {
                            const bar = aiTokensDataset[detailsHoveredBar];
                            return (
                              <div className="mt-3 p-3.5 bg-white rounded-xl border border-indigo-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-1">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 font-bold">
                                    {detailsHoveredBar + 1}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-slate-900 flex items-center gap-2">
                                      <span>{bar.agentName}</span>
                                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        {bar.model}
                                      </span>
                                    </div>
                                    <div className="text-slate-500 text-[11px] mt-0.5">
                                      核心领域: {bar.focus}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs shrink-0 font-mono">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Token 累计消耗:</span>
                                    <b className="text-indigo-700 text-sm">{bar.tokens.toLocaleString()}</b>
                                  </div>
                                  <div className="h-6 w-px bg-slate-200" />
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">AI 问答调用:</span>
                                    <b className="text-slate-800 text-sm">{bar.calls.toLocaleString()} 轮次</b>
                                  </div>
                                  <div className="h-6 w-px bg-slate-200" />
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">平均单次消耗:</span>
                                    <b className="text-emerald-700 text-sm">{(bar.tokens / bar.calls).toFixed(1)} T/次</b>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. 详情大屏底部操作栏 */}
                <div className="shrink-0 px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveActionModal(null)}
                      className="px-5 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-semibold transition-colors"
                    >
                      关闭详情
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ================= MODAL: 终端固件版本与升级 (带核对Loading、离线不支持、低版本升级、5s倒计时防断网提示、横向进度条) ================= */}
      <AnimatePresence>
        {activeActionModal && activeActionModal.type === 'firmware' && (() => {
          const term = activeActionModal.terminal;
          const currentVersion = terminalFirmwares[term.id] || 'v3.4.2-RELEASE';
          const isLatest = currentVersion === ONLINE_LATEST_FIRMWARE;
          const isOffline = term.status === 'offline';

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 1. 标题头 */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ArrowUpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">终端固件版本核对与升级</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {term.name} · IP: {term.ip}
                      </p>
                    </div>
                  </div>
                  <button
                    disabled={firmwareUpgrading}
                    onClick={() => setActiveActionModal(null)}
                    className="w-7 h-7 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs font-bold disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>

                {/* 2. 状态与核对过程 */}
                {firmwareChecking ? (
                  /* ================= 步骤 1: 出现弹窗后先有个 loading 代表正在和设备核对版本 ================= */
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-3 border-indigo-100 border-t-indigo-600 animate-spin" />
                      <RefreshCw className="w-4 h-4 text-indigo-600 absolute inset-0 m-auto" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 text-xs">正在与终端核对固件版本...</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        向 {term.ip || term.sn} 下发 MCP 协议版本探针，比对云端最新稳定版指纹
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= 步骤 2: 核对完成后展示版本详情与升级策略 ================= */
                  <div className="space-y-4 text-xs">
                    {/* 设备台账信息条 */}
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 grid grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">终端型号:</span>
                        <span className="font-mono font-bold text-slate-800">{term.model}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">内网 IP:</span>
                        <span className="font-mono font-bold text-blue-700">{term.ip || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">网络联机状态:</span>
                        <span className={cn(
                          "inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full mt-0.5",
                          !isOffline ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", !isOffline ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                          {!isOffline ? '正常在线' : '当前离线'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">序列号 (SN):</span>
                        <span className="font-mono text-slate-700">{term.sn}</span>
                      </div>
                    </div>

                    {/* 版本比对卡片 */}
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">设备当前固件:</span>
                        <span className={cn(
                          "font-mono font-bold px-2.5 py-0.5 rounded-md border text-xs",
                          isLatest ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-white text-slate-800 border-slate-200"
                        )}>
                          {currentVersion}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">线上最新版本:</span>
                        <span className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-md border border-indigo-200 text-xs">
                          {ONLINE_LATEST_FIRMWARE} (最新稳定版)
                        </span>
                      </div>

                      {/* 规则判定 1: 离线的设备不支持固件升级 */}
                      {isOffline && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-amber-900 mt-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-xs">该设备当前离线，不支持固件升级</div>
                            <div className="text-[11px] text-amber-700 mt-0.5">
                              终端未与控制中心建立 TCP/IP 握手通信，无法推送 OTA 升级包，请先将设备加电开机并接入网络。
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 规则判定 2: 在线且已是最新版本 */}
                      {!isOffline && isLatest && !firmwareUpgrading && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-emerald-900 mt-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-xs">当前设备固件已是线上最新版本</div>
                            <div className="text-[11px] text-emerald-700 mt-0.5">
                              硬件协议探针及自愈组件均为最新状态，无需执行升级。
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 规则判定 3: 在线且版本低于线上版本 -> 出现升级按钮 */}
                      {!isOffline && !isLatest && !firmwareUpgrading && !firmwareCompleted && (
                        <div className="pt-1">
                          <p className="text-[11px] text-indigo-900/80">
                            ✨ 检测到设备固件版本低于线上版本，支持一键推送 OTA 补丁，包含 MCP 探针自愈机制与通信抗干扰优化。
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ================= 步骤 4: 横向滚动条显示升级进度 ================= */}
                    {(firmwareUpgrading || firmwareCompleted) && (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                            {firmwareUpgrading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{firmwareCurrentStep}</span>
                          </span>
                          <span className="font-extrabold text-slate-800">{firmwareProgress}%</span>
                        </div>

                        {/* 横向滚动进度条 */}
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300/60">
                          <div
                            style={{ width: `${firmwareProgress}%` }}
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 relative shadow-inner"
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>

                        {firmwareCompleted && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>固件升级成功！已完成芯片扇区写入与重启，设备固件已同步为 v3.5.0-RELEASE。</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. 底部操作栏 */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  {/* 当在升级中时禁用关闭 */}
                  <button
                    disabled={firmwareUpgrading}
                    onClick={() => setActiveActionModal(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    {firmwareCompleted ? '完成关闭' : '关闭'}
                  </button>

                  {/* 如果版本低于线上版本且在线，则出现一个升级按钮 */}
                  {!firmwareChecking && !isOffline && !isLatest && !firmwareUpgrading && !firmwareCompleted && (
                    <button
                      onClick={() => {
                        setFirmwareCountdown(5);
                        setFirmwareCountdownOpen(true);
                      }}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span>立即升级固件</span>
                    </button>
                  )}
                </div>

                {/* ================= 步骤 3: 倒计时提示弹窗 (升级过程中请保持设备联网不掉线，倒计时结束后方可点击确定) ================= */}
                <AnimatePresence>
                  {firmwareCountdownOpen && (
                    <div className="absolute inset-0 z-20 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">固件升级安全警示</h4>
                            <p className="text-[11px] text-slate-400">请仔细阅读并遵守升级要求</p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs">
                          <div className="font-extrabold text-rose-800 text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                            <span>升级过程中请保持设备联网不掉线</span>
                          </div>
                          <p className="text-[11px] text-rose-700 leading-relaxed">
                            固件写入芯片 Flash 扇区及软重启期间，若发生断电或网络中断，可能造成引导程序损坏或硬件无法启动。
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>倒计时安全锁:</span>
                          <span className={cn(
                            "font-mono font-extrabold text-xs px-2 py-0.5 rounded",
                            firmwareCountdown > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          )}>
                            {firmwareCountdown > 0 ? `还需等待 ${firmwareCountdown} 秒` : '已解锁可确认'}
                          </span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setFirmwareCountdownOpen(false)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            disabled={firmwareCountdown > 0}
                            onClick={() => handleStartFirmwareUpgrade(term.id)}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                          >
                            <span>{firmwareCountdown > 0 ? `确定升级 (${firmwareCountdown}s)` : '确定升级'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ================= MODAL: 终端运行日志 (做大一些、带分页列表、时间范围筛选、7种日志类型、搜索、详细日志) ================= */}
      <AnimatePresence>
        {activeActionModal && activeActionModal.type === 'logs' && (() => {
          const term = activeActionModal.terminal;
          const allLogs = getMockLogsForTerminal(term);

          // 筛选逻辑: 日志类型 + 时间范围 + 关键字搜索
          const filteredLogs = allLogs.filter((log) => {
            // 1. 类型筛选: 开机、关机、异常、告警、调试、升级、故障
            if (logTypeFilter !== '全部类型' && log.type !== logTypeFilter) {
              return false;
            }

            // 2. 时间范围筛选 (简化按天划分演示)
            if (logTimeRangeFilter === '今天') {
              if (!log.time.startsWith('2026-03-28')) return false;
            } else if (logTimeRangeFilter === '近3天') {
              const day = log.time.slice(8, 10);
              if (!['26', '27', '28'].includes(day)) return false;
            } else if (logTimeRangeFilter === '近7天') {
              // 7天内都符合
            }

            // 3. 关键字搜索 (说明、账号、IP)
            if (logSearchKeyword.trim()) {
              const q = logSearchKeyword.toLowerCase();
              const match =
                log.description.toLowerCase().includes(q) ||
                log.account.toLowerCase().includes(q) ||
                log.ip.toLowerCase().includes(q) ||
                log.id.toLowerCase().includes(q);
              if (!match) return false;
            }

            return true;
          });

          // 分页计算
          const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logPageSize));
          const safeLogPage = Math.min(logPage, totalLogPages);
          const paginatedLogs = filteredLogs.slice(
            (safeLogPage - 1) * logPageSize,
            safeLogPage * logPageSize
          );

          // 7 种日志类型徽标样式
          const typeBadgeStyles: Record<LogTypeCategory, string> = {
            '开机': 'bg-emerald-50 text-emerald-700 border-emerald-200',
            '关机': 'bg-slate-100 text-slate-700 border-slate-200',
            '异常': 'bg-amber-50 text-amber-700 border-amber-200',
            '告警': 'bg-orange-50 text-orange-700 border-orange-200',
            '调试': 'bg-blue-50 text-blue-700 border-blue-200',
            '升级': 'bg-purple-50 text-purple-700 border-purple-200',
            '故障': 'bg-rose-50 text-rose-700 border-rose-200',
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl w-[90vw] max-w-5xl h-[85vh] max-h-[880px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 1. 顶部标题栏 */}
                <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-extrabold text-slate-900 text-base">日志</h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
                          {term.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveActionModal(null)}
                    className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. 筛选过滤工具栏 */}
                <div className="shrink-0 p-4 border-b border-slate-100 bg-slate-50/60 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* 时间范围快速筛选 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 text-xs font-medium flex items-center gap-1 mr-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        时间范围:
                      </span>
                      {['全部时间', '今天', '近3天', '近7天', '近30天'].map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setLogTimeRangeFilter(t);
                            setLogPage(1);
                          }}
                          className={cn(
                            "px-3 py-1 rounded-lg font-bold text-xs transition-all",
                            logTimeRangeFilter === t
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* 搜索框 */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={logSearchKeyword}
                        onChange={(e) => {
                          setLogSearchKeyword(e.target.value);
                          setLogPage(1);
                        }}
                        placeholder="搜索说明、账号或IP..."
                        className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                      />
                      {logSearchKeyword && (
                        <button
                          onClick={() => setLogSearchKeyword('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 7种日志类型切换标签页 (开机、关机、异常、告警、调试、升级、故障) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 mr-1">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      日志类型:
                    </span>
                    {(['全部类型', '开机', '关机', '异常', '告警', '调试', '升级', '故障'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setLogTypeFilter(cat);
                          setLogPage(1);
                        }}
                        className={cn(
                          "px-3 py-1 rounded-xl font-bold transition-all shrink-0 text-xs flex items-center gap-1",
                          logTypeFilter === cat
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <span>{cat}</span>
                        {cat !== '全部类型' && (
                          <span className="text-[10px] opacity-75 font-mono">
                            ({allLogs.filter((l) => l.type === cat).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 日志列表表格核心区域 (带横纵滚动) */}
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="py-3 px-4 w-44">时间</th>
                        <th className="py-3 px-4 w-24">类型</th>
                        <th className="py-3 px-4 w-36">IP 地址</th>
                        <th className="py-3 px-4">日志说明</th>
                        <th className="py-3 px-4 w-32">关联账号</th>
                        <th className="py-3 px-4 w-28 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedLogs.length > 0 ? (
                        paginatedLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50/40 transition-colors group">
                            {/* 时间 */}
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {log.time}
                            </td>

                            {/* 类型 (7种类型专属徽标) */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[11px] font-bold border inline-block",
                                typeBadgeStyles[log.type]
                              )}>
                                {log.type}
                              </span>
                            </td>

                            {/* IP */}
                            <td className="py-3 px-4 font-mono text-[11px] text-blue-700 font-medium whitespace-nowrap">
                              {log.ip}
                            </td>

                            {/* 日志说明 */}
                            <td className="py-3 px-4 max-w-md">
                              <div className="line-clamp-2 leading-relaxed text-slate-800 font-medium text-xs">
                                {log.description}
                              </div>
                            </td>

                            {/* 关联账号 */}
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                {log.account}
                              </span>
                            </td>

                            {/* 操作 (详细日志) */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => setSelectedLogDetail(log)}
                                className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95 flex items-center gap-1 mx-auto"
                              >
                                <Eye className="w-3 h-3 text-blue-500" />
                                <span>详细日志</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400 text-xs">
                            没有检索到符合筛选条件的日志记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. 分页控制条 */}
                <div className="shrink-0 px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 flex items-center gap-2">
                    <span>共 <b className="font-mono text-slate-800">{filteredLogs.length}</b> 条记录</span>
                    <span>·</span>
                    <span>当前显示第 <b className="font-mono text-blue-700">{filteredLogs.length > 0 ? (safeLogPage - 1) * logPageSize + 1 : 0}</b> 至 <b className="font-mono text-blue-700">{Math.min(filteredLogs.length, safeLogPage * logPageSize)}</b> 条</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <span>每页</span>
                      <select
                        value={logPageSize}
                        onChange={(e) => {
                          setLogPageSize(Number(e.target.value));
                          setLogPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value={5}>5 条</option>
                        <option value={10}>10 条</option>
                        <option value={15}>15 条</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        disabled={safeLogPage <= 1}
                        onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-0.5"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>上一页</span>
                      </button>

                      <span className="px-2 font-mono font-bold text-slate-700">
                        {safeLogPage} / {totalLogPages}
                      </span>

                      <button
                        disabled={safeLogPage >= totalLogPages}
                        onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-0.5"
                      >
                        <span>下一页</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ================= MODAL: 详细日志弹窗 (纯文本日志展示 - 用户明确要求) ================= */}
                <AnimatePresence>
                  {selectedLogDetail && (() => {
                    const rawLogText = [
                      `================================================================================`,
                      `[TIMESTAMP]    ${selectedLogDetail.time}`,
                      `[LOG_ID]       ${selectedLogDetail.id}`,
                      `[CATEGORY]     ${selectedLogDetail.type}`,
                      `[CLIENT_IP]    ${selectedLogDetail.ip}`,
                      `[ACCOUNT]      ${selectedLogDetail.account}`,
                      `[PROTOCOL]     ${selectedLogDetail.detail.protocol || 'TCP/IP Socket (Port 502)'}`,
                      `--------------------------------------------------------------------------------`,
                      `[EVENT_DESC]`,
                      `${selectedLogDetail.description}`,
                      ``,
                      `[REGISTERS & STATUS]`,
                      `${selectedLogDetail.detail.registers || 'REG_CLEAN (0x0000)'}`,
                      ``,
                      `[RAW_PACKET_FRAME]`,
                      `${selectedLogDetail.detail.rawPacket || 'EMPTY_FRAME'}`,
                      ``,
                      `[SYSTEM_ACTION]`,
                      `${selectedLogDetail.detail.actionTaken || '系统自动归档并保持实时心跳探测'}`,
                      `================================================================================`
                    ].join('\n');

                    return (
                      <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
                        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-700" />
                              <h4 className="font-extrabold text-slate-900 text-sm">
                                详细日志 (纯文本)
                              </h4>
                              <span className="font-mono text-xs text-slate-400">
                                · {selectedLogDetail.id}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedLogDetail(null)}
                              className="text-slate-400 hover:text-slate-600 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-end text-xs text-slate-500">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(rawLogText);
                                  setCopiedLogFeedback(true);
                                  setTimeout(() => setCopiedLogFeedback(false), 2000);
                                }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedLogFeedback ? '已复制日志' : '复制纯文本'}</span>
                              </button>
                            </div>

                            {/* 纯文本展示框 */}
                            <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] sm:text-xs rounded-2xl max-h-[440px] overflow-x-auto overflow-y-auto leading-relaxed whitespace-pre font-normal border border-slate-800 select-text shadow-inner">
                              {rawLogText}
                            </pre>
                          </div>

                          <div className="flex justify-end items-center pt-2 border-t border-slate-100 text-xs">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(rawLogText);
                                  setCopiedLogFeedback(true);
                                  setTimeout(() => setCopiedLogFeedback(false), 2000);
                                }}
                                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copiedLogFeedback ? '已复制' : '复制纯文本'}</span>
                              </button>
                              <button
                                onClick={() => setSelectedLogDetail(null)}
                                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
                              >
                                关闭
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ================= MODAL: 终端重启 / MCP 诊断 (小操作模态框) ================= */}
      <AnimatePresence>
        {activeActionModal && activeActionModal.type !== 'details' && activeActionModal.type !== 'firmware' && activeActionModal.type !== 'logs' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {activeActionModal.type === 'reboot' && '远程重启终端'}
                    {activeActionModal.type === 'mcp-diagnostic' && 'MCP 联机诊断'}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveActionModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                  <div><b>终端名称:</b> {activeActionModal.terminal.name}</div>
                  <div><b>设备型号:</b> <span className="font-mono">{activeActionModal.terminal.model || '—'}</span></div>
                  <div><b>关联资产:</b> {activeActionModal.terminal.assetName || '—'}</div>
                  <div><b>IP 地址:</b> {activeActionModal.terminal.ip || '—'}</div>
                  <div><b>设备序列号:</b> {activeActionModal.terminal.sn}</div>
                </div>

                {activeActionModal.type === 'reboot' && (
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                    确认向终端 <b>{activeActionModal.terminal.ip}</b> 发送安全重启指令？正在执行的实训实验状态将自动缓存。
                  </div>
                )}

                {activeActionModal.type === 'mcp-diagnostic' && (
                  <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl space-y-1">
                    <div>[PING] 发送 MCP 协议握手探针至 {activeActionModal.terminal.ip}...</div>
                    <div>[ACK] 延时: 3.2ms · 丢包率: 0.0%</div>
                    <div>[STATUS] 该终端处于最佳联机状态</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                >
                  关闭
                </button>
                {activeActionModal.type === 'reboot' && (
                  <button
                    onClick={() => {
                      alert(`已成功发送远程重启指令至 ${activeActionModal.terminal.ip}`);
                      setActiveActionModal(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
                  >
                    确认重启
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: 批量升级终端固件 (带版本扫描核对、离线不可升级筛选、安全倒计时防断网提示、横向进度条) ================= */}
      <AnimatePresence>
        {batchFirmwareModalOpen && (() => {
          const selectedTerminals = terminals.filter((t) => selectedTerminalIds.includes(t.id));
          const offlineCount = selectedTerminals.filter((t) => t.status === 'offline').length;
          const upgradableOnlineTerminals = selectedTerminals.filter(
            (t) => t.status === 'online' && (terminalFirmwares[t.id] || 'v3.4.2-RELEASE') !== ONLINE_LATEST_FIRMWARE
          );

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 relative overflow-hidden animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900 text-base">批量推送升级终端固件</h3>
                  </div>
                  <button
                    disabled={batchFirmwareUpgrading}
                    onClick={() => setBatchFirmwareModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>

                {batchFirmwareChecking ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin" />
                    <div className="text-xs text-slate-600 font-medium">
                      正在批量扫描 {selectedTerminalIds.length} 台终端当前版本与网络在线状态...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">目标升级固件:</span>
                        <span className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-md border border-indigo-200">
                          {ONLINE_LATEST_FIRMWARE} (最新稳定版)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">已勾选设备统计:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          共 {selectedTerminalIds.length} 台（可升级: <b className="text-emerald-600">{upgradableOnlineTerminals.length}</b> 台，离线不支持: <b className="text-amber-600">{offlineCount}</b> 台）
                        </span>
                      </div>
                      {offlineCount > 0 && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          ⚠️ 注意：已选中的 {offlineCount} 台设备处于离线状态，离线设备不支持固件升级，本次将仅对在线设备下发补丁。
                        </p>
                      )}
                    </div>

                    {/* 选中的终端列表预览 */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex justify-between">
                        <span>待处理设备列表:</span>
                        <span className="text-slate-400 font-normal">离线设备自动跳过</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                        {selectedTerminals.map((t) => {
                          const v = terminalFirmwares[t.id] || 'v3.4.2-RELEASE';
                          const isOff = t.status === 'offline';
                          return (
                            <div key={t.id} className="p-2 bg-white rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", !isOff ? "bg-emerald-500" : "bg-slate-300")} />
                                <span className="font-bold text-slate-800">{t.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">{t.ip}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500">
                                  当前: {v}
                                </span>
                                {isOff ? (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                                    离线不支持
                                  </span>
                                ) : v === ONLINE_LATEST_FIRMWARE ? (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                                    已是最新
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                                    可升级
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 升级进度横向滚动条 */}
                    {(batchFirmwareUpgrading || batchFirmwareCompleted) && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-indigo-700 font-bold flex items-center gap-1.5">
                            {batchFirmwareUpgrading ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{batchFirmwareCurrentStep}</span>
                          </span>
                          <span className="font-bold text-indigo-900">{batchFirmwareProgress}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300/60">
                          <div
                            style={{ width: `${batchFirmwareProgress}%` }}
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300 rounded-full relative"
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={batchFirmwareUpgrading}
                    onClick={() => setBatchFirmwareModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {batchFirmwareCompleted ? '完成关闭' : '取消'}
                  </button>
                  {!batchFirmwareChecking && !batchFirmwareUpgrading && !batchFirmwareCompleted && (
                    <button
                      type="button"
                      disabled={upgradableOnlineTerminals.length === 0}
                      onClick={() => {
                        setBatchFirmwareCountdown(5);
                        setBatchFirmwareCountdownOpen(true);
                      }}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>开始批量升级 ({upgradableOnlineTerminals.length}台在线设备)</span>
                    </button>
                  )}
                </div>

                {/* 批量升级安全倒计时确认框 */}
                <AnimatePresence>
                  {batchFirmwareCountdownOpen && (
                    <div className="absolute inset-0 z-20 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">批量升级固件安全确认</h4>
                            <p className="text-[11px] text-slate-400">请保持在线设备供电稳定</p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs">
                          <div className="font-extrabold text-rose-800 text-xs flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                            <span>升级过程中请保持设备联网不掉线</span>
                          </div>
                          <p className="text-[11px] text-rose-700 leading-relaxed">
                            正在对 {upgradableOnlineTerminals.length} 台在线设备并行下发 OTA 补丁，若在写入 Flash 期间设备掉线或断电，将导致终端变砖。
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <span>倒计时安全锁:</span>
                          <span className={cn(
                            "font-mono font-extrabold text-xs px-2 py-0.5 rounded",
                            batchFirmwareCountdown > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          )}>
                            {batchFirmwareCountdown > 0 ? `还需等待 ${batchFirmwareCountdown} 秒` : '已解锁可确认'}
                          </span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setBatchFirmwareCountdownOpen(false)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            disabled={batchFirmwareCountdown > 0}
                            onClick={handleConfirmBatchFirmwareUpgrade}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                          >
                            <span>{batchFirmwareCountdown > 0 ? `确定批量升级 (${batchFirmwareCountdown}s)` : '确定批量升级'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ================= MODAL: 新增自定义智能体弹窗 ================= */}
      <AnimatePresence>
        {isNewAgentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">新增自定义硬件智能体</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewAgentModalOpen(false);
                      window.dispatchEvent(new CustomEvent('open-agent-create-assistant'));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>切换 AI 助手创建</span>
                  </button>
                  <button onClick={() => setIsNewAgentModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                    ✕
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveNewAgent} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-medium">
                      智能体名称 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {newAgentForm.name.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={newAgentForm.name}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
                    placeholder="必填，1~50字，如：智能电表通讯与自诊断智能体"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-medium">
                      适配硬件型号 <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {newAgentForm.hardwareModel.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={newAgentForm.hardwareModel}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, hardwareModel: e.target.value })}
                    placeholder="必填，1~50字，如：ADVANTECH-ECU1251、USR-IO424"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-medium">功能描述</label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {newAgentForm.desc.length}/200
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={newAgentForm.desc}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, desc: e.target.value })}
                    placeholder="选填，最多200字，简述该智能体的排错与自愈场景"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewAgentModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                  >
                    创建并进入设计
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: Agent Statistics (统计) ================= */}
      <AnimatePresence>
        {statsAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">{statsAgent.name} - 运营统计</h3>
                </div>
                <button onClick={() => setStatsAgent(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-slate-500">累计调用人次</div>
                    <div className="text-xl font-bold text-blue-700 mt-1">{statsAgent.callCount} 次</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="text-slate-500">排错自愈成功率</div>
                    <div className="text-xl font-bold text-emerald-700 mt-1">99.2%</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800">热门排错问题 TOP 3:</div>
                  <div>1. 波特率参数与控制器不匹配 (占比 42%)</div>
                  <div>2. RS485 终端匹配电阻未开启引发反射 (占比 31%)</div>
                  <div>3. 通信端口被占用或接线虚接 (占比 27%)</div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setStatsAgent(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: 上传新增固件 (用户要求 10: 固件名称、版本、备注、发布状态、支持上传文件) ================= */}
      <AnimatePresence>
        {isUploadFirmwareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">上传新增固件</h3>
                    <p className="text-xs text-slate-500 mt-0.5">上传物联终端/边缘网关固件包，配置版本与发布策略</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!firmwareUploading) setIsUploadFirmwareModalOpen(false);
                  }}
                  className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-4 text-xs">
                {/* 1. 文件上传区域 (Drag & Drop + Native File Input) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>固件安装包文件 <b className="text-rose-500">*</b></span>
                    <span className="text-[11px] font-normal text-slate-400">支持 .bin / .tar.gz / .zip / .img / .hex</span>
                  </label>

                  <input
                    id="firmware-file-input"
                    type="file"
                    accept=".bin,.tar.gz,.zip,.img,.hex"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
                        setNewFirmwareFile({
                          name: file.name,
                          size: `${sizeMb} MB`
                        });
                        // 智能预填名称
                        if (!newFirmwareName) {
                          const base = file.name.replace(/\.[^/.]+$/, "");
                          setNewFirmwareName(base.replace(/[-_]/g, ' '));
                        }
                      }
                    }}
                  />

                  {!newFirmwareFile ? (
                    <div
                      onClick={() => document.getElementById('firmware-file-input')?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
                          setNewFirmwareFile({
                            name: file.name,
                            size: `${sizeMb} MB`
                          });
                          if (!newFirmwareName) {
                            const base = file.name.replace(/\.[^/.]+$/, "");
                            setNewFirmwareName(base.replace(/[-_]/g, ' '));
                          }
                        }
                      }}
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileUp className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 text-xs">点击选择文件 或 将固件包拖拽至此</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">单文件最大支持 200MB，上传将自动计算 SHA-256 校验码</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs font-mono">{newFirmwareFile.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>大小: <b className="font-mono text-indigo-700">{newFirmwareFile.size}</b></span>
                            <span>·</span>
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>文件已就绪</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => document.getElementById('firmware-file-input')?.click()}
                        className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                      >
                        重新选择
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. 固件名称与版本号 (两列) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">
                        固件名称 <b className="text-rose-500">*</b>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {newFirmwareName.length}/60
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={60}
                      value={newFirmwareName}
                      onChange={(e) => setNewFirmwareName(e.target.value)}
                      placeholder="1~60字符，如: 物联边缘网关通用标准固件"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">
                        固件版本 <b className="text-rose-500">*</b>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {newFirmwareVersion.length}/30
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={30}
                      value={newFirmwareVersion}
                      onChange={(e) => setNewFirmwareVersion(e.target.value)}
                      placeholder="1~30字符，如: v3.5.2-RELEASE"
                      className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* 3. 适配硬件型号 */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    适配硬件型号
                  </label>
                  <select
                    value={newFirmwareModel}
                    onChange={(e) => setNewFirmwareModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 text-xs text-slate-900"
                  >
                    <option value="通用终端 (全系兼容)">通用终端 (全系兼容)</option>
                    <option value="NL-GW-2000 / 通用终端">NL-GW-2000 / 通用终端</option>
                    <option value="ADVANTECH-ECU1251">ADVANTECH-ECU1251</option>
                    <option value="USR-IO424">USR-IO424</option>
                    <option value="USR-M100">USR-M100</option>
                    <option value="USR-LG206">USR-LG206</option>
                  </select>
                </div>

                {/* 4. 发布状态选择 (发布、未发布) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    发布状态
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      onClick={() => setNewFirmwareStatus('未发布')}
                      className={cn(
                        "p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all",
                        newFirmwareStatus === '未发布'
                          ? "bg-amber-50/70 border-amber-300 text-amber-900 shadow-2xs font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                      )}
                    >
                      <input
                        type="radio"
                        name="firmware-status-radio"
                        checked={newFirmwareStatus === '未发布'}
                        onChange={() => setNewFirmwareStatus('未发布')}
                        className="text-amber-600"
                      />
                      <div>
                        <div className="text-xs font-bold">未发布 (存为草稿)</div>
                        <div className="text-[10px] text-slate-400 font-normal">暂不向全网终端推送升级通知</div>
                      </div>
                    </label>

                    <label
                      onClick={() => setNewFirmwareStatus('发布')}
                      className={cn(
                        "p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all",
                        newFirmwareStatus === '发布'
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                      )}
                    >
                      <input
                        type="radio"
                        name="firmware-status-radio"
                        checked={newFirmwareStatus === '发布'}
                        onChange={() => setNewFirmwareStatus('发布')}
                        className="text-emerald-600"
                      />
                      <div>
                        <div className="text-xs font-bold">立即发布 (生效中)</div>
                        <div className="text-[10px] text-slate-400 font-normal">全网低版本终端可即刻检测并升级</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 5. 备注 / 更新说明 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      备注 / 更新说明 <b className="text-rose-500">*</b>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {newFirmwareRemark.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={newFirmwareRemark}
                    onChange={(e) => setNewFirmwareRemark(e.target.value)}
                    placeholder="必填，最多500字，描述固件更新内容、协议支持及升级要求..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 text-xs text-slate-900"
                  />
                </div>

                {/* 上传进度条动画 */}
                {firmwareUploading && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-700 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>正在校验并上传固件包...</span>
                      </span>
                      <span className="font-mono font-bold text-slate-700">{firmwareUploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${firmwareUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={firmwareUploading}
                  onClick={() => setIsUploadFirmwareModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={firmwareUploading}
                  onClick={handleSaveNewFirmware}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {firmwareUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在上传...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>确认上传并保存</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: 固件详情查看 ================= */}
      <AnimatePresence>
        {selectedFirmwareForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{selectedFirmwareForDetail.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-bold text-indigo-700">{selectedFirmwareForDetail.version}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.2 rounded-full border",
                        selectedFirmwareForDetail.status === '发布'
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : selectedFirmwareForDetail.status === '未发布'
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {selectedFirmwareForDetail.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFirmwareForDetail(null)}
                  className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 text-[11px] block">适配硬件型号</span>
                    <b className="text-slate-800 font-mono mt-0.5 block">{selectedFirmwareForDetail.hardwareModel}</b>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 text-[11px] block">安装包文件大小</span>
                    <b className="text-slate-800 font-mono mt-0.5 block">{selectedFirmwareForDetail.fileSize}</b>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 text-[11px] block">上传生效时间</span>
                    <b className="text-slate-800 font-mono mt-0.5 block">{selectedFirmwareForDetail.uploadTime}</b>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 text-[11px] block">终端累计下载升级</span>
                    <b className="text-indigo-700 font-mono mt-0.5 block">{selectedFirmwareForDetail.downloadCount ?? 128} 台次</b>
                  </div>
                </div>

                {/* SHA-256 Checksum */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>SHA-256 固件安全指纹</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFirmwareForDetail.sha256) {
                          navigator.clipboard.writeText(selectedFirmwareForDetail.sha256);
                          showFirmwareToast('固件 SHA-256 指纹已复制到剪贴板！');
                        }
                      }}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制指纹</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 break-all bg-white p-2 rounded-lg border border-slate-200">
                    {selectedFirmwareForDetail.sha256 ?? '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'}
                  </div>
                </div>

                {/* 备注说明 */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="font-bold text-slate-800 block text-xs">固件更新备注说明</span>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedFirmwareForDetail.remark}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div>
                  {selectedFirmwareForDetail.status === '未发布' && (
                    <button
                      type="button"
                      onClick={() => {
                        handlePublishFirmware(selectedFirmwareForDetail.id);
                        setSelectedFirmwareForDetail(null);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                    >
                      立即发布生效
                    </button>
                  )}
                  {selectedFirmwareForDetail.status === '发布' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleRevokeFirmware(selectedFirmwareForDetail.id);
                        setSelectedFirmwareForDetail(null);
                      }}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors"
                    >
                      下架固件
                    </button>
                  )}
                  {selectedFirmwareForDetail.status === '下架' && (
                    <button
                      type="button"
                      onClick={() => {
                        handlePublishFirmware(selectedFirmwareForDetail.id);
                        setSelectedFirmwareForDetail(null);
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                    >
                      重新发布
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFirmwareForDetail(null)}
                  className="px-4 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-semibold transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: 智能体知识库管理弹窗 (参考截图实现：知识库列表 + 新增/编辑 + 文件配置自动向量化) ================= */}
      {kbModalAgent && (
        <AgentKnowledgeModal
          agentName={kbModalAgent.name}
          knowledgeBases={agentKnowledgeBasesMap[kbModalAgent.id] || []}
          onChangeKnowledgeBases={(nextOrUpdater) =>
            updateAgentKnowledgeBases(kbModalAgent.id, nextOrUpdater)
          }
          onClose={() => setKbModalAgent(null)}
          onNotify={showFirmwareToast}
        />
      )}

      {/* ================= MODAL: 自定义智能体调试前置设备连接弹窗 ================= */}
      <DeviceConnectPreModal
        open={Boolean(pendingDebugAgent)}
        agentName={pendingDebugAgent?.name}
        fields={
          pendingDebugAgent
            ? agentDesignConfigsMap[pendingDebugAgent.id]?.connectionFields
            : undefined
        }
        onSkipConnect={() => {
          if (!pendingDebugAgent) return;
          setDebugInitConnect({ autoConnect: false });
          setDebugChatAgent(pendingDebugAgent);
          setPendingDebugAgent(null);
        }}
        onStartWithConnect={(_, summary) => {
          if (!pendingDebugAgent) return;
          setDebugInitConnect({ autoConnect: true, summary });
          setDebugChatAgent(pendingDebugAgent);
          setPendingDebugAgent(null);
        }}
        onCancel={() => setPendingDebugAgent(null)}
      />

      {/* ================= MODAL: 智能体对话调试界面弹窗 (参考设备智能体大厅开启智能体界面) ================= */}
      {debugChatAgent && (
        <AgentDebugModal
          agent={debugChatAgent}
          knowledgeBases={agentKnowledgeBasesMap[debugChatAgent.id] || []}
          designConfig={agentDesignConfigsMap[debugChatAgent.id]}
          initialAutoConnect={debugInitConnect.autoConnect}
          initialConnectSummary={debugInitConnect.summary}
          onClose={() => {
            setDebugChatAgent(null);
            setDebugInitConnect({ autoConnect: false });
          }}
        />
      )}

      {/* ================= MODAL: 自定义智能体设计配置弹窗 (4个Tab表单) ================= */}
      {designingAgent && (
        <AgentDesignModal
          agent={designingAgent}
          designConfig={
            agentDesignConfigsMap[designingAgent.id] ||
            createDefaultDesignConfig(designingAgent.hardwareModel, designingAgent.name)
          }
          availableKnowledgeBases={allAvailableKnowledgeBases}
          selectedKbIds={(agentKnowledgeBasesMap[designingAgent.id] || []).map((kb) => kb.id)}
          onSaveDesign={(payload) => handleSaveAgentDesign(designingAgent.id, payload)}
          onOpenKnowledgeManager={() => handleOpenKbModal(designingAgent)}
          onClose={() => setDesigningAgent(null)}
          onNotify={showFirmwareToast}
        />
      )}

      {/* ================= MODAL: 通用操作确认弹窗 (替代受限的 window.confirm) ================= */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    confirmDialog.variant === 'danger'
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "bg-amber-50 text-amber-600 border border-amber-200"
                  )}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm">{confirmDialog.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors",
                    confirmDialog.variant === 'danger'
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  )}
                >
                  {confirmDialog.confirmLabel || '确定'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 全局操作反馈 Toast */}
      {firmwareActionToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[80] max-w-md w-[90%] bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-medium truncate">{firmwareActionToast}</span>
          </div>
          <button onClick={() => setFirmwareActionToast(null)} className="text-indigo-400 hover:text-indigo-700 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
