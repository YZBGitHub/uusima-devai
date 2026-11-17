import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Wrench,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  Play,
  Code2,
  ListChecks,
  ShieldAlert,
  Clock,
  Layers,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  type McpToolItem,
  type McpToolType,
  type McpConcurrency,
  type McpRiskLevel,
  type McpScriptLanguage,
  type McpParamType,
  type McpParametersSchema,
  MCP_PROTOCOL_OPTIONS,
  MCP_PARAM_TYPES,
  MCP_SCRIPT_LANGUAGE_OPTIONS,
  MCP_DEFAULT_ENTRYPOINTS,
  MCP_SCRIPT_TEMPLATES,
  formatMcpTimestamp,
} from '../lib/mcpTemplates';

interface ParamRow {
  id: string;
  name: string;
  types: McpParamType[];
  required: boolean;
  description: string;
}

interface McpToolFormModalProps {
  tool: McpToolItem | null;
  isNew: boolean;
  existingToolNames: string[];
  defaultProtocol?: string;
  defaultToolType?: McpToolType;
  onSave: (savedTool: McpToolItem) => void;
  onCancel: () => void;
}

const TOOL_NAME_REGEX = /^[a-z][a-z0-9_]*$/;
const PARAM_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const CATEGORY_PRESETS = [
  'mqtt',
  'http',
  'modbus',
  'tcp',
  'websocket',
  'telemetry',
  'control',
  'diagnostic',
  'custom',
];

const KEYWORD_SETS: Record<McpScriptLanguage, Set<string>> = {
  python: new Set([
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import', 'from', 'as',
    'try', 'except', 'finally', 'with', 'class', 'pass', 'break', 'continue', 'and', 'or',
    'not', 'is', 'None', 'True', 'False', 'async', 'await', 'raise', 'lambda', 'json',
  ]),
  javascript: new Set([
    'async', 'await', 'function', 'return', 'const', 'let', 'var', 'if', 'else', 'for',
    'while', 'try', 'catch', 'finally', 'throw', 'new', 'typeof', 'true', 'false', 'null',
    'undefined', 'import', 'export', 'from', 'switch', 'case', 'break', 'default', 'JSON',
  ]),
  bash: new Set([
    'echo', 'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'case',
    'esac', 'function', 'return', 'exit', 'export', 'local', 'jq', 'curl', 'printf', 'cat',
  ]),
  lua: new Set([
    'function', 'end', 'local', 'return', 'if', 'then', 'else', 'elseif', 'for', 'while',
    'do', 'repeat', 'until', 'in', 'and', 'or', 'not', 'true', 'false', 'nil', 'table',
  ]),
  groovy: new Set([
    'def', 'return', 'if', 'else', 'for', 'while', 'in', 'try', 'catch', 'finally',
    'class', 'import', 'true', 'false', 'null', 'Map', 'List', 'String', 'println', 'new',
  ]),
  go: new Set([
    'package', 'import', 'func', 'return', 'if', 'else', 'for', 'range', 'var', 'const',
    'type', 'struct', 'interface', 'map', 'any', 'string', 'int', 'error', 'nil', 'true', 'false',
  ]),
};

function renderHighlightedLine(line: string, lang: McpScriptLanguage): React.ReactNode {
  if (!line) return '\u00A0';
  const commentMarker = lang === 'lua' ? '--' : lang === 'python' || lang === 'bash' ? '#' : '//';
  const keywords = KEYWORD_SETS[lang];
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let keyIdx = 0;

  while (i < line.length) {
    // Comment check
    if (line.startsWith(commentMarker, i)) {
      nodes.push(
        <span key={keyIdx++} className="text-slate-400 italic">
          {line.slice(i)}
        </span>
      );
      break;
    }

    // String literals ("..." or '...')
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      nodes.push(
        <span key={keyIdx++} className="text-emerald-300">
          {line.slice(i, j)}
        </span>
      );
      i = j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) && (i === 0 || !/[A-Za-z0-9_]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[0-9.xXa-fA-F]/.test(line[j])) j += 1;
      nodes.push(
        <span key={keyIdx++} className="text-amber-300">
          {line.slice(i, j)}
        </span>
      );
      i = j;
      continue;
    }

    // Identifiers / Keywords / Function calls
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j += 1;
      const word = line.slice(i, j);
      if (keywords.has(word)) {
        nodes.push(
          <span key={keyIdx++} className="text-sky-300 font-semibold">
            {word}
          </span>
        );
      } else if (line[j] === '(') {
        nodes.push(
          <span key={keyIdx++} className="text-violet-300">
            {word}
          </span>
        );
      } else {
        nodes.push(
          <span key={keyIdx++} className="text-slate-100">
            {word}
          </span>
        );
      }
      i = j;
      continue;
    }

    // Punctuation / Whitespace
    let j = i + 1;
    while (
      j < line.length &&
      !line.startsWith(commentMarker, j) &&
      !/["'`0-9A-Za-z_$]/.test(line[j])
    ) {
      j += 1;
    }
    nodes.push(
      <span key={keyIdx++} className="text-slate-300">
        {line.slice(i, j)}
      </span>
    );
    i = j;
  }

  return nodes;
}

function schemaToParamRows(schema?: McpParametersSchema): {
  additionalProperties: boolean;
  rows: ParamRow[];
} {
  if (!schema || !schema.properties) {
    return { additionalProperties: false, rows: [] };
  }
  const reqSet = new Set(schema.required || []);
  const rows: ParamRow[] = Object.entries(schema.properties).map(([key, prop], idx) => {
    const typeList = Array.isArray(prop?.type)
      ? prop.type
      : prop?.type
        ? [prop.type]
        : (['string'] as McpParamType[]);
    return {
      id: `param-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      name: key,
      types: typeList.length > 0 ? typeList : ['string'],
      required: reqSet.has(key),
      description: prop?.description || '',
    };
  });
  return {
    additionalProperties: Boolean(schema.additionalProperties),
    rows,
  };
}

function paramRowsToSchema(additionalProperties: boolean, rows: ParamRow[]): McpParametersSchema {
  const properties: McpParametersSchema['properties'] = {};
  const required: string[] = [];

  rows.forEach((row) => {
    const key = row.name.trim();
    if (!key) return;
    const validTypes = row.types.length > 0 ? row.types : (['string'] as McpParamType[]);
    properties[key] = {
      type: validTypes.length === 1 ? validTypes[0] : validTypes,
      ...(row.description.trim() ? { description: row.description.trim() } : {}),
    };
    if (row.required && !required.includes(key)) {
      required.push(key);
    }
  });

  return {
    type: 'object',
    additionalProperties,
    properties,
    required,
  };
}

function buildSampleParamsJson(rows: ParamRow[]): string {
  const obj: Record<string, unknown> = {};
  rows.forEach((r) => {
    const key = r.name.trim();
    if (!key) return;
    const primary = r.types[0] || 'string';
    if (primary === 'integer') obj[key] = 1;
    else if (primary === 'number') obj[key] = 25.6;
    else if (primary === 'boolean') obj[key] = true;
    else if (primary === 'object') obj[key] = { status: 'online' };
    else if (primary === 'array') obj[key] = ['item_1'];
    else obj[key] = key.includes('id') ? 'dev_001' : 'sample_value';
  });
  if (Object.keys(obj).length === 0) {
    obj.connection_id = 'conn_ecu1251_01';
  }
  return JSON.stringify(obj, null, 2);
}

export default function McpToolFormModal({
  tool,
  isNew,
  existingToolNames,
  defaultProtocol = 'mqtt',
  defaultToolType = '用户自定义',
  onSave,
  onCancel,
}: McpToolFormModalProps) {
  const normalizedDefaultProto = defaultProtocol ? defaultProtocol.toLowerCase() : 'mqtt';
  const initialProto = isNew
    ? normalizedDefaultProto || 'mqtt'
    : (tool?.protocol || 'mqtt').toLowerCase();

  // 一、基础信息
  const [name, setName] = useState(isNew ? '' : tool?.name || '');
  const [protocol, setProtocol] = useState(initialProto);
  const [protoDropdownOpen, setProtoDropdownOpen] = useState(false);
  const [category, setCategory] = useState(
    isNew ? initialProto : tool?.category || initialProto
  );
  const [categoryTouched, setCategoryTouched] = useState(!isNew && Boolean(tool?.category));
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const initialVersion = isNew ? 1 : Math.max(1, (tool?.version ?? 1) + 1);
  const [version, setVersion] = useState<number>(initialVersion);
  const [versionLocked, setVersionLocked] = useState(isNew);
  const [enabled, setEnabled] = useState<boolean>(isNew ? true : tool?.enabled !== false);
  const [description, setDescription] = useState(isNew ? '' : tool?.description || '');
  const [toolType, setToolType] = useState<McpToolType>(
    isNew ? defaultToolType : tool?.toolType || defaultToolType
  );

  // 二、运行与安全策略
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(
    isNew ? 10 : tool?.timeout_seconds ?? 10
  );
  const [concurrency, setConcurrency] = useState<McpConcurrency>(
    isNew ? 'parallel' : tool?.concurrency || 'parallel'
  );
  const [risk, setRisk] = useState<McpRiskLevel>(
    isNew ? 'low' : tool?.risk || 'low'
  );

  // 三、输入参数配置 (JSON Schema)
  const parsedInitParams = schemaToParamRows(tool?.parameters);
  const [paramMode, setParamMode] = useState<'visual' | 'json'>('visual');
  const [additionalProperties, setAdditionalProperties] = useState<boolean>(
    isNew ? false : parsedInitParams.additionalProperties
  );
  const [paramRows, setParamRows] = useState<ParamRow[]>(() =>
    isNew ? [] : parsedInitParams.rows
  );
  const [openTypeDropdownRowId, setOpenTypeDropdownRowId] = useState<string | null>(null);
  const [jsonSourceText, setJsonSourceText] = useState<string>(() =>
    JSON.stringify(
      paramRowsToSchema(
        isNew ? false : parsedInitParams.additionalProperties,
        isNew ? [] : parsedInitParams.rows
      ),
      null,
      2
    )
  );
  const [jsonSourceError, setJsonSourceError] = useState<string | null>(null);

  // 四、脚本执行配置
  const initialLang: McpScriptLanguage = isNew
    ? 'python'
    : tool?.script_language || 'python';
  const [scriptLanguage, setScriptLanguage] = useState<McpScriptLanguage>(initialLang);
  const [scriptEntrypoint, setScriptEntrypoint] = useState<string>(
    isNew
      ? MCP_DEFAULT_ENTRYPOINTS.python
      : tool?.script_entrypoint !== undefined
        ? tool.script_entrypoint
        : MCP_DEFAULT_ENTRYPOINTS[initialLang]
  );
  const [scriptCode, setScriptCode] = useState<string>(
    isNew ? MCP_SCRIPT_TEMPLATES.python : tool?.script || MCP_SCRIPT_TEMPLATES[initialLang]
  );
  const [pendingLangTemplatePrompt, setPendingLangTemplatePrompt] =
    useState<McpScriptLanguage | null>(null);
  const [isCodeFullscreen, setIsCodeFullscreen] = useState(false);

  // 在线测试运行
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [testInputJson, setTestInputJson] = useState<string>(() =>
    buildSampleParamsJson(isNew ? [] : parsedInitParams.rows)
  );
  const [testOutput, setTestOutput] = useState<{
    status: 'success' | 'error';
    durationMs: number;
    stdout: string;
    result: string;
  } | null>(null);

  // Tab 导航状态
  type McpFormTabId = 'basic' | 'policy' | 'params' | 'script';
  const [activeTab, setActiveTab] = useState<McpFormTabId>('basic');

  // 表单提交错误提示
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [errorTabs, setErrorTabs] = useState<Record<McpFormTabId, boolean>>({
    basic: false,
    policy: false,
    params: false,
    script: false,
  });

  const protoMenuRef = useRef<HTMLDivElement | null>(null);
  const catMenuRef = useRef<HTMLDivElement | null>(null);
  const codePreRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (protoMenuRef.current && !protoMenuRef.current.contains(e.target as Node)) {
        setProtoDropdownOpen(false);
      }
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && !targetEl.closest('[data-param-type-dropdown="true"]')) {
        setOpenTypeDropdownRowId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Handlers
  const handleProtocolChange = (nextVal: string) => {
    setProtocol(nextVal);
    if (!categoryTouched) {
      setCategory(nextVal);
    }
  };

  const handleSwitchParamMode = (nextMode: 'visual' | 'json') => {
    if (nextMode === paramMode) return;
    if (nextMode === 'json') {
      const schema = paramRowsToSchema(additionalProperties, paramRows);
      setJsonSourceText(JSON.stringify(schema, null, 2));
      setJsonSourceError(null);
      setParamMode('json');
      return;
    }

    // json -> visual: parse JSON back into visual rows
    try {
      const parsed = JSON.parse(jsonSourceText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonSourceError('根节点必须是 JSON Schema 对象（{ "type": "object", ... }）');
        return;
      }
      const nextAddProp = Boolean(parsed.additionalProperties);
      const nextProps =
        parsed.properties && typeof parsed.properties === 'object' ? parsed.properties : {};
      const nextReq = Array.isArray(parsed.required) ? parsed.required : [];
      const nextRows: ParamRow[] = Object.entries(nextProps).map(([k, v]: [string, any], idx) => {
        const rawType = v?.type;
        const arr = Array.isArray(rawType)
          ? rawType.filter((t: string) => MCP_PARAM_TYPES.includes(t as McpParamType))
          : MCP_PARAM_TYPES.includes(rawType)
            ? [rawType]
            : ['string'];
        return {
          id: `param-sync-${Date.now()}-${idx}`,
          name: k,
          types: (arr.length > 0 ? arr : ['string']) as McpParamType[],
          required: nextReq.includes(k),
          description: typeof v?.description === 'string' ? v.description : '',
        };
      });
      setAdditionalProperties(nextAddProp);
      setParamRows(nextRows);
      setJsonSourceError(null);
      setParamMode('visual');
    } catch (err) {
      setJsonSourceError(
        `JSON 解析失败：${err instanceof Error ? err.message : '格式有误'}`
      );
    }
  };

  const handleAddParamRow = () => {
    const idx = paramRows.length + 1;
    let candidate = idx === 1 ? 'connection_id' : `param_${idx}`;
    const used = new Set(paramRows.map((r) => r.name.trim()));
    while (used.has(candidate)) {
      candidate = `param_${used.size + 1}`;
    }
    setParamRows((prev) => [
      ...prev,
      {
        id: `param-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: candidate,
        types: ['string'],
        required: true,
        description: '',
      },
    ]);
  };

  const handleToggleParamType = (rowId: string, paramType: McpParamType) => {
    setParamRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const exists = row.types.includes(paramType);
        if (exists && row.types.length === 1) {
          return row; // Must keep at least 1 type
        }
        const nextTypes = exists
          ? row.types.filter((t) => t !== paramType)
          : [...row.types, paramType];
        return { ...row, types: nextTypes };
      })
    );
  };

  const handleLanguageChange = (nextLang: McpScriptLanguage) => {
    const prevLang = scriptLanguage;
    setScriptLanguage(nextLang);

    // Sync entrypoint if empty or equals previous language's default
    if (
      !scriptEntrypoint.trim() ||
      scriptEntrypoint.trim() === MCP_DEFAULT_ENTRYPOINTS[prevLang]
    ) {
      setScriptEntrypoint(MCP_DEFAULT_ENTRYPOINTS[nextLang]);
    }

    // Check if scriptCode is unmodified default template or empty
    const isUnmodifiedTemplate =
      !scriptCode.trim() ||
      Object.values(MCP_SCRIPT_TEMPLATES).some((tpl) => tpl.trim() === scriptCode.trim());

    if (isUnmodifiedTemplate) {
      setScriptCode(MCP_SCRIPT_TEMPLATES[nextLang]);
      setPendingLangTemplatePrompt(null);
    } else {
      setPendingLangTemplatePrompt(nextLang);
    }
  };

  const handleCodeScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (codePreRef.current) {
      codePreRef.current.scrollTop = e.currentTarget.scrollTop;
      codePreRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = scriptCode.slice(0, start) + '    ' + scriptCode.slice(end);
      setScriptCode(updated);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  const handleRunScriptTest = () => {
    const startTs = performance.now();
    let parsedInput: Record<string, unknown> = {};
    try {
      parsedInput = JSON.parse(testInputJson || '{}');
    } catch (err) {
      setTestOutput({
        status: 'error',
        durationMs: Math.round(performance.now() - startTs),
        stdout: '[Sandbox Input Error] 模拟输入参数 JSON 格式无效',
        result: err instanceof Error ? err.message : 'JSON parse error',
      });
      return;
    }

    if (!scriptCode.trim()) {
      setTestOutput({
        status: 'error',
        durationMs: 1,
        stdout: '[Sandbox Runtime Error] 脚本代码为空',
        result: 'Exit code 1',
      });
      return;
    }

    const lines = scriptCode.split('\n');
    const returnLine = [...lines].reverse().find((l) => /\breturn\s+/.test(l) || /\becho\s+/.test(l));
    let simulatedReturn: unknown = 'ok';
    if (returnLine) {
      const mRet = returnLine.match(/\breturn\s+(.+?);?\s*$/);
      const mEcho = returnLine.match(/\becho\s+(.+?);?\s*$/);
      const rawExpr = (mRet?.[1] || mEcho?.[1] || '"ok"').trim();
      if (rawExpr.startsWith('"') || rawExpr.startsWith("'")) {
        simulatedReturn = rawExpr.slice(1, -1);
      } else {
        simulatedReturn = rawExpr;
      }
    }

    const entryDesc = scriptEntrypoint.trim()
      ? `${scriptEntrypoint.trim()}(p)`
      : scriptLanguage === 'bash'
        ? '$1 (stdin JSON)'
        : 'run(p)';

    const durationMs = Math.max(4, Math.round(performance.now() - startTs) + 12);
    setTestOutput({
      status: 'success',
      durationMs,
      stdout: `[${scriptLanguage.toUpperCase()} Sandbox] 入口: ${entryDesc} | 超时限制: ${timeoutSeconds}s\n已注入参数: ${JSON.stringify(parsedInput)}\n执行成功 (Exit Code: 0)`,
      result: JSON.stringify(
        {
          ok: true,
          protocol,
          tool: name || 'untitled_tool',
          output: simulatedReturn,
        },
        null,
        2
      ),
    });
  };

  // Real-time field checks
  const trimmedName = name.trim();
  const isNameDuplicate =
    Boolean(trimmedName) && existingToolNames.includes(trimmedName);
  const isNameFormatValid =
    Boolean(trimmedName) && TOOL_NAME_REGEX.test(trimmedName);
  const trimmedDesc = description.trim();

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    const tabErrs: Record<McpFormTabId, boolean> = {
      basic: false,
      policy: false,
      params: false,
      script: false,
    };

    if (!trimmedName) {
      errs.push('工具名称 (name) 不能为空');
      tabErrs.basic = true;
    } else if (!TOOL_NAME_REGEX.test(trimmedName)) {
      errs.push('工具名称仅允许小写字母、数字和下划线，且须以小写字母开头（如 mqtt_publish_message）');
      tabErrs.basic = true;
    } else if (isNameDuplicate) {
      errs.push(`工具名称「${trimmedName}」已存在，请保持全局唯一`);
      tabErrs.basic = true;
    }

    if (!protocol.trim()) {
      errs.push('所属协议 (protocol) 不能为空');
      tabErrs.basic = true;
    }

    if (!trimmedDesc) {
      errs.push('工具描述 (description) 不能为空');
      tabErrs.basic = true;
    } else if (trimmedDesc.length < 10 || trimmedDesc.length > 500) {
      errs.push('工具描述长度建议在 10 ~ 500 个字符之间');
      tabErrs.basic = true;
    }

    if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 300) {
      errs.push('超时时间 (timeout_seconds) 须为 1 ~ 300 之间的整数');
      tabErrs.policy = true;
    }

    let finalSchema: McpParametersSchema = {
      type: 'object',
      additionalProperties,
      properties: {},
      required: [],
    };
    if (paramMode === 'json') {
      try {
        const parsed = JSON.parse(jsonSourceText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          errs.push('JSON Schema 根节点必须为对象');
          tabErrs.params = true;
        } else {
          finalSchema = {
            type: 'object',
            additionalProperties: Boolean(parsed.additionalProperties),
            properties:
              parsed.properties && typeof parsed.properties === 'object' ? parsed.properties : {},
            required: Array.isArray(parsed.required) ? parsed.required : [],
          };
        }
      } catch (err) {
        errs.push(`输入参数 JSON 源码格式有误：${err instanceof Error ? err.message : ''}`);
        tabErrs.params = true;
      }
    } else {
      const seenParamNames = new Set<string>();
      for (const row of paramRows) {
        const pName = row.name.trim();
        if (!pName) {
          errs.push('参数定义列表中存在未填写参数名的行');
          tabErrs.params = true;
          break;
        }
        if (!PARAM_NAME_REGEX.test(pName)) {
          errs.push(`参数名「${pName}」格式不合法，须为英文标识（字母/下划线开头）`);
          tabErrs.params = true;
          break;
        }
        if (seenParamNames.has(pName)) {
          errs.push(`参数名「${pName}」在同一工具内重复`);
          tabErrs.params = true;
          break;
        }
        seenParamNames.add(pName);
        if (row.types.length === 0) {
          errs.push(`参数「${pName}」须至少选择一种数据类型`);
          tabErrs.params = true;
          break;
        }
      }
      finalSchema = paramRowsToSchema(additionalProperties, paramRows);
    }

    if (!scriptCode.trim()) {
      errs.push('脚本代码 (script) 不能为空');
      tabErrs.script = true;
    }

    if (errs.length > 0) {
      setSubmitErrors(errs);
      setErrorTabs(tabErrs);
      const firstInvalidTab = (['basic', 'policy', 'params', 'script'] as McpFormTabId[]).find(
        (t) => tabErrs[t]
      );
      if (firstInvalidTab) {
        setActiveTab(firstInvalidTab);
      }
      return;
    }

    setSubmitErrors([]);
    setErrorTabs({ basic: false, policy: false, params: false, script: false });
    const finalProto = protocol.trim();
    const finalCat = category.trim() || finalProto;
    const paramNames = Object.keys(finalSchema.properties);
    const paramSummary =
      paramNames.length > 0 ? paramNames.map((p) => `${p}: any`).join(', ') : 'p: object';

    const savedTool: McpToolItem = {
      ...(tool || {}),
      id: tool?.id || `mcp-${Date.now()}`,
      name: trimmedName,
      protocol: finalProto,
      category: finalCat,
      version: isNew ? 1 : Math.max(1, Math.floor(version || 1)),
      enabled,
      toolType,
      addedAt: tool?.addedAt || formatMcpTimestamp(),
      description: trimmedDesc,
      timeout_seconds: timeoutSeconds,
      concurrency,
      risk,
      parameters: finalSchema,
      script_language: scriptLanguage,
      script_entrypoint: scriptEntrypoint.trim(),
      script: scriptCode,
      addressOrCode: tool?.addressOrCode || `${finalProto}://${finalCat}/${trimmedName}`,
      interfaces:
        tool?.interfaces && tool.interfaces.length > 0
          ? tool.interfaces
          : [
              {
                id: `if-${Date.now()}`,
                methodName: scriptEntrypoint.trim() || trimmedName,
                paramSpec: paramSummary,
              },
            ],
    };

    onSave(savedTool);
  };

  const scriptLines = scriptCode.split('\n');

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-2 sm:p-4 bg-slate-900/55 backdrop-blur-xs">
      <form
        onSubmit={validateAndSubmit}
        className="bg-white rounded-2xl w-full max-w-5xl h-[84vh] max-h-[820px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate">
                {isNew ? '新增 MCP 工具' : `编辑 MCP 工具 · ${tool?.name || ''}`}
              </h4>
              <p className="text-[11px] text-slate-500">
                配置基础信息、运行策略、JSON Schema 输入参数与多语言执行脚本
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Tabs Navigation */}
        <div className="px-6 pt-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          {(
            [
              { id: 'basic', label: '基础信息', icon: Layers },
              { id: 'policy', label: '运行与安全策略', icon: ShieldAlert },
              { id: 'params', label: '输入参数配置', icon: ListChecks, count: paramRows.length },
              { id: 'script', label: '脚本执行配置', icon: Code2 },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasError = errorTabs[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0 relative',
                  isActive
                    ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-white/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {'count' in tab && tab.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums',
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {hasError && (
                  <span
                    className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                    title="该模块存在待修正字段"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 bg-white">
          {submitErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>请检查以下表单校验问题：</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1">
                {submitErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ============== 一、基础信息区块 (Basic Info) ============== */}
          {activeTab === 'basic' && (
          <section className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h5 className="font-bold text-slate-900 text-sm">基础信息 (Basic Info)</h5>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">工具来源类型：</span>
                <select
                  value={toolType}
                  onChange={(e) => setToolType(e.target.value as McpToolType)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-700"
                >
                  <option value="用户自定义">用户自定义</option>
                  <option value="系统内置">系统内置</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* 1. 工具名称 name */}
              <div className="md:col-span-5">
                <label className="block font-bold text-slate-700 mb-1">
                  工具名称 <span className="text-rose-500">*</span>
                  <code className="ml-1.5 font-normal text-[10px] text-slate-400">name</code>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.replace(/\s+/g, ''))}
                  placeholder="例如：mqtt_publish_message"
                  className={cn(
                    'w-full px-3 py-2 bg-white border rounded-xl font-mono text-xs focus:outline-none focus:ring-2',
                    trimmedName && (!isNameFormatValid || isNameDuplicate)
                      ? 'border-rose-400 text-rose-700 focus:ring-rose-500/20'
                      : 'border-slate-200 text-slate-900 focus:ring-blue-500/20 focus:border-blue-500'
                  )}
                />
                <p className="mt-1 text-[11px]">
                  {trimmedName && !isNameFormatValid ? (
                    <span className="text-rose-600">
                      仅允许小写字母、数字和下划线，须以小写字母开头 (^[a-z][a-z0-9_]*$)
                    </span>
                  ) : isNameDuplicate ? (
                    <span className="text-rose-600">工具名称已存在，须全局唯一</span>
                  ) : (
                    <span className="text-slate-400">
                      全局唯一，仅允许小写字母、数字和下划线
                    </span>
                  )}
                </p>
              </div>

              {/* 2. 所属协议 protocol (Select + 支持自定义输入) */}
              <div className="md:col-span-3" ref={protoMenuRef}>
                <label className="block font-bold text-slate-700 mb-1">
                  所属协议 <span className="text-rose-500">*</span>
                  <code className="ml-1.5 font-normal text-[10px] text-slate-400">protocol</code>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={protocol}
                    onFocus={() => setProtoDropdownOpen(true)}
                    onChange={(e) => handleProtocolChange(e.target.value)}
                    placeholder="选择或输入自定义协议"
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setProtoDropdownOpen((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                    title="展开协议可选项"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {protoDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto">
                      {MCP_PROTOCOL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            handleProtocolChange(opt.value);
                            setProtoDropdownOpen(false);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left font-mono text-xs flex items-center justify-between hover:bg-blue-50',
                            protocol === opt.value
                              ? 'bg-blue-50/70 text-blue-700 font-semibold'
                              : 'text-slate-700'
                          )}
                        >
                          <span>{opt.label}</span>
                          {protocol === opt.value && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                      <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1 text-[10px] text-slate-400">
                        支持直接输入自定义协议标识
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">支持下拉选择或自定义输入</p>
              </div>

              {/* 3. 工具分类 category */}
              <div className="md:col-span-2" ref={catMenuRef}>
                <label className="block font-bold text-slate-700 mb-1">
                  工具分类
                  <code className="ml-1.5 font-normal text-[10px] text-slate-400">category</code>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={category}
                    onFocus={() => setCatDropdownOpen(true)}
                    onChange={(e) => {
                      setCategoryTouched(true);
                      setCategory(e.target.value);
                    }}
                    placeholder={protocol || 'mqtt'}
                    className="w-full pl-3 pr-7 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCatDropdownOpen((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {catDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 flex flex-wrap gap-1">
                      {Array.from(new Set([protocol, ...CATEGORY_PRESETS].filter(Boolean))).map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setCategoryTouched(true);
                              setCategory(tag);
                              setCatDropdownOpen(false);
                            }}
                            className={cn(
                              'px-2 py-1 rounded-lg text-[11px] font-mono border transition-colors',
                              category === tag
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                            )}
                          >
                            {tag}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">默认同步所属协议</p>
              </div>

              {/* 4. 版本号 version & 5. 启用状态 enabled */}
              <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-1 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      版本号 <code className="font-normal text-[10px] text-slate-400">version</code>
                    </label>
                    {!isNew && (
                      <button
                        type="button"
                        onClick={() => setVersionLocked((v) => !v)}
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                        title={versionLocked ? '解锁手动调整版本号' : '锁定版本号'}
                      >
                        {versionLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        <span>{versionLocked ? '解锁' : '已解锁'}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={versionLocked}
                      value={version}
                      onChange={(e) => setVersion(Math.max(1, parseInt(e.target.value || '1', 10)))}
                      className="w-full px-3 py-2 bg-white disabled:bg-slate-100 disabled:text-slate-500 border border-slate-200 rounded-xl font-mono tabular-nums text-xs"
                    />
                    {isNew && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Lock className="w-3 h-3" />
                        锁定
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. 启用状态 Switch + 6. 工具描述 description */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-9">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    工具描述 <span className="text-rose-500">*</span>
                    <code className="ml-1.5 font-normal text-[10px] text-slate-400">description</code>
                  </label>
                  <span
                    className={cn(
                      'text-[11px] font-mono tabular-nums',
                      trimmedDesc.length > 500 || (trimmedDesc.length > 0 && trimmedDesc.length < 10)
                        ? 'text-amber-600 font-semibold'
                        : 'text-slate-400'
                    )}
                  >
                    {trimmedDesc.length} / 500 字符（建议 10~500）
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请写明工具用途、关键参数来源（如前置工具返回值）以及成功/失败时的返回特征..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                />
              </div>

              <div className="md:col-span-3 p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-700">
                      启用状态 <span className="text-rose-500">*</span>
                    </div>
                    <code className="text-[10px] text-slate-400">enabled</code>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => setEnabled((v) => !v)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
                      enabled ? 'bg-blue-600' : 'bg-slate-300'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200',
                        enabled ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {enabled ? '已开启：创建后立即注册并允许大模型调用' : '已停用：暂不注册给大模型调用'}
                </p>
              </div>
            </div>
          </section>
          )}

          {/* ============== 二、运行与安全策略区块 (Execution & Policy) ============== */}
          {activeTab === 'policy' && (
          <section className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/80">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <h5 className="font-bold text-slate-900 text-sm">
                运行与安全策略 (Execution &amp; Policy)
              </h5>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* 1. 超时时间 timeout_seconds */}
              <div className="md:col-span-3">
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>超时时间 (秒)</span>
                  <span className="text-rose-500">*</span>
                  <code className="ml-1 font-normal text-[10px] text-slate-400">
                    timeout_seconds
                  </code>
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  step={1}
                  value={timeoutSeconds}
                  onChange={(e) => {
                    const val = parseInt(e.target.value || '10', 10);
                    setTimeoutSeconds(Number.isNaN(val) ? 10 : Math.min(300, Math.max(1, val)));
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono tabular-nums text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">单次执行最长等待 1 ~ 300 秒</p>
              </div>

              {/* 2. 并发策略 concurrency */}
              <div className="md:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">
                  并发策略 <span className="text-rose-500">*</span>
                  <code className="ml-1.5 font-normal text-[10px] text-slate-400">concurrency</code>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'parallel', title: 'parallel', desc: '允许并行执行' },
                    { value: 'sequential', title: 'sequential', desc: '强制串行排队' },
                  ] as const).map((item) => {
                    const checked = concurrency === item.value;
                    return (
                      <label
                        key={item.value}
                        className={cn(
                          'p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 select-none',
                          checked
                            ? 'bg-blue-50/70 border-blue-400 text-blue-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        )}
                      >
                        <input
                          type="radio"
                          name="mcp-concurrency"
                          checked={checked}
                          onChange={() => setConcurrency(item.value)}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-[11px]">{item.title}</div>
                          <div className="text-[10px] text-slate-500">{item.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. 风险等级 risk */}
              <div className="md:col-span-5">
                <label className="block font-bold text-slate-700 mb-1">
                  风险等级 <span className="text-rose-500">*</span>
                  <code className="ml-1.5 font-normal text-[10px] text-slate-400">risk</code>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    {
                      value: 'low',
                      title: 'low',
                      desc: '低风险',
                      activeClass: 'bg-emerald-50/80 border-emerald-400 text-emerald-900',
                    },
                    {
                      value: 'medium',
                      title: 'medium',
                      desc: '中风险',
                      activeClass: 'bg-amber-50/80 border-amber-400 text-amber-900',
                    },
                    {
                      value: 'high',
                      title: 'high',
                      desc: '高风险拦截',
                      activeClass: 'bg-rose-50/80 border-rose-400 text-rose-900',
                    },
                  ] as const).map((item) => {
                    const checked = risk === item.value;
                    return (
                      <label
                        key={item.value}
                        className={cn(
                          'p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-1.5 select-none',
                          checked
                            ? item.activeClass
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        )}
                      >
                        <input
                          type="radio"
                          name="mcp-risk"
                          checked={checked}
                          onChange={() => setRisk(item.value)}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-[11px]">{item.title}</div>
                          <div className="text-[10px] opacity-80 whitespace-nowrap">{item.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
          )}

          {/* ============== 三、输入参数配置区块 (parameters - JSON Schema) ============== */}
          {activeTab === 'params' && (
          <section className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-emerald-600" />
                <div>
                  <h5 className="font-bold text-slate-900 text-sm">
                    输入参数配置 (parameters · JSON Schema)
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    支持「可视化表单配置」与「JSON 源码编辑」两种模式实时双向切换
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-xl bg-slate-200/70 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitchParamMode('visual')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap',
                    paramMode === 'visual'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  可视化表单配置
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchParamMode('json')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap',
                    paramMode === 'json'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  JSON 源码编辑
                </button>
              </div>
            </div>

            {paramMode === 'visual' ? (
              <div className="space-y-3">
                {/* 1. 严格模式 parameters.additionalProperties */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={additionalProperties}
                      onClick={() => setAdditionalProperties((v) => !v)}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                        additionalProperties ? 'bg-blue-600' : 'bg-slate-300'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200',
                          additionalProperties ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
                    <div>
                      <span className="font-bold text-slate-800">
                        严格模式（限制额外参数）
                      </span>
                      <code className="ml-2 text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        parameters.additionalProperties: {String(additionalProperties)}
                      </code>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {additionalProperties
                          ? '已开启允许额外参数：允许模型传入未在下方定义的扩展字段'
                          : '默认 false：禁止传入未定义参数，防止大模型生成多余字段'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddParamRow}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加参数行</span>
                  </button>
                </div>

                {/* 2. 参数定义列表 */}
                {paramRows.length > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2.5 px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 rounded-t-xl">
                      <div className="sm:col-span-3">参数名 (properties.&lt;name&gt;) *</div>
                      <div className="sm:col-span-3">数据类型 (支持多选) *</div>
                      <div className="sm:col-span-2 text-center">是否必填 (required)</div>
                      <div className="sm:col-span-3">参数说明 (description)</div>
                      <div className="sm:col-span-1 text-right">操作</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {paramRows.map((row) => {
                        const isTypeOpen = openTypeDropdownRowId === row.id;
                        const typeLabel =
                          row.types.length === 1
                            ? row.types[0]
                            : `[${row.types.join(', ')}]`;
                        const dupParam =
                          row.name.trim() &&
                          paramRows.filter((r) => r.name.trim() === row.name.trim()).length > 1;
                        return (
                          <div
                            key={row.id}
                            className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                          >
                            {/* 参数名 */}
                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) =>
                                  setParamRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? { ...r, name: e.target.value.replace(/\s+/g, '') }
                                        : r
                                    )
                                  )
                                }
                                placeholder="如：connection_id"
                                className={cn(
                                  'w-full px-2.5 py-1.5 bg-white border rounded-lg font-mono text-xs',
                                  dupParam || (row.name.trim() && !PARAM_NAME_REGEX.test(row.name.trim()))
                                    ? 'border-rose-400 text-rose-700'
                                    : 'border-slate-200 text-slate-800'
                                )}
                              />
                            </div>

                            {/* 数据类型 下拉多选框 */}
                            <div
                              className="sm:col-span-3 relative"
                              data-param-type-dropdown="true"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenTypeDropdownRowId(isTypeOpen ? null : row.id)
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 flex items-center justify-between gap-1.5 hover:border-blue-400"
                              >
                                <span className="truncate">{typeLabel}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              </button>

                              {isTypeOpen && (
                                <div className="absolute left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-0.5">
                                  {MCP_PARAM_TYPES.map((pt) => {
                                    const checked = row.types.includes(pt);
                                    return (
                                      <label
                                        key={pt}
                                        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer select-none"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => handleToggleParamType(row.id, pt)}
                                          className="rounded border-slate-300 text-blue-600"
                                        />
                                        <span className="font-mono text-xs text-slate-800">{pt}</span>
                                      </label>
                                    );
                                  })}
                                  <div className="border-t border-slate-100 mt-1 pt-1 px-2 text-[10px] text-slate-400">
                                    单选输出字符串，多选输出数组
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 是否必填 */}
                            <div className="sm:col-span-2 flex sm:justify-center">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1 rounded-lg hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  checked={row.required}
                                  onChange={(e) =>
                                    setParamRows((prev) =>
                                      prev.map((r) =>
                                        r.id === row.id
                                          ? { ...r, required: e.target.checked }
                                          : r
                                      )
                                    )
                                  }
                                  className="rounded border-slate-300 text-blue-600"
                                />
                                <span className="text-[11px] font-medium text-slate-700">必填</span>
                              </label>
                            </div>

                            {/* 参数说明 */}
                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) =>
                                  setParamRows((prev) =>
                                    prev.map((r) =>
                                      r.id === row.id
                                        ? { ...r, description: e.target.value }
                                        : r
                                    )
                                  )
                                }
                                placeholder="说明参数含义、格式或来源"
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                              />
                            </div>

                            {/* 删除 */}
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setParamRows((prev) => prev.filter((r) => r.id !== row.id))
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="删除该参数"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    暂未配置输入参数，点击右上角「添加参数行」或切换至「JSON 源码编辑」
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={10}
                  value={jsonSourceText}
                  onChange={(e) => {
                    setJsonSourceText(e.target.value);
                    try {
                      JSON.parse(e.target.value);
                      setJsonSourceError(null);
                    } catch (err) {
                      setJsonSourceError(
                        `JSON 语法错误：${err instanceof Error ? err.message : ''}`
                      );
                    }
                  }}
                  spellCheck={false}
                  className="w-full px-4 py-3 bg-slate-900 text-emerald-300 border border-slate-700 rounded-xl font-mono text-xs leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
                />
                {jsonSourceError ? (
                  <div className="text-[11px] text-rose-600 font-medium">{jsonSourceError}</div>
                ) : (
                  <div className="text-[11px] text-slate-500">
                    JSON Schema 校验通过，切回「可视化表单配置」将自动同步参数列表。
                  </div>
                )}
              </div>
            )}
          </section>
          )}

          {/* ============== 四、脚本执行配置区块 (Script Execution) ============== */}
          {activeTab === 'script' && (
          <section
            className={cn(
              'rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4',
              isCodeFullscreen
                ? 'fixed inset-3 z-[75] p-5 bg-white shadow-2xl flex flex-col overflow-hidden'
                : 'p-5'
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80 shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-violet-600" />
                <div>
                  <h5 className="font-bold text-slate-900 text-sm">
                    脚本执行配置 (Script Execution · 支持多语言)
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    支持 Python / JavaScript / Bash / Lua / Groovy / Go 语法高亮、行号显示与在线测试运行
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTestInputJson(buildSampleParamsJson(paramRows));
                    setTestPanelOpen((v) => !v);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap',
                    testPanelOpen
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  )}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>在线测试运行</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCodeFullscreen((v) => !v)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium flex items-center gap-1 whitespace-nowrap"
                >
                  {isCodeFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5" />
                      <span>退出全屏</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>全屏编辑</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 1. 脚本语言 & 2. 入口函数 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
              <div className="md:col-span-5">
                <label className="block font-bold text-slate-700 mb-1">
                  脚本语言 <span className="text-rose-500">*</span>
                  <code className="ml-1.5 font-normal text-[10px] text-slate-400">
                    script_language
                  </code>
                </label>
                <select
                  value={scriptLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as McpScriptLanguage)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-semibold text-xs text-slate-900"
                >
                  {MCP_SCRIPT_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-7">
                <label className="block font-bold text-slate-700 mb-1">
                  入口函数 / 执行命令
                  <code className="ml-1.5 font-normal text-[10px] text-slate-400">
                    script_entrypoint
                  </code>
                </label>
                <input
                  type="text"
                  value={scriptEntrypoint}
                  onChange={(e) => setScriptEntrypoint(e.target.value)}
                  placeholder={
                    scriptLanguage === 'bash'
                      ? 'Bash 可留空或填 main（通过 $1 / stdin 接收 JSON 参数）'
                      : `默认入口函数名：${MCP_DEFAULT_ENTRYPOINTS[scriptLanguage]}`
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
              </div>
            </div>

            {/* Language Switch Template Prompt */}
            {pendingLangTemplatePrompt && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    已切换脚本语言为 <b className="font-mono">{pendingLangTemplatePrompt}</b>
                    ，是否将下方代码替换为该语言的默认入口模板？
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setScriptCode(MCP_SCRIPT_TEMPLATES[pendingLangTemplatePrompt]);
                      setPendingLangTemplatePrompt(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold"
                  >
                    替换为默认模板
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingLangTemplatePrompt(null)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 text-[11px]"
                  >
                    保留当前代码
                  </button>
                </div>
              </div>
            )}

            {/* 3. 脚本代码 多语言语法高亮 + 行号编辑器 */}
            <div
              className={cn(
                'rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col',
                isCodeFullscreen ? 'flex-1 min-h-0' : ''
              )}
            >
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-semibold">
                    {scriptLanguage}
                  </span>
                  <span>
                    script {scriptEntrypoint ? `· entrypoint: ${scriptEntrypoint}` : '· stdin / $1'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setScriptCode(MCP_SCRIPT_TEMPLATES[scriptLanguage])}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                  title="重置为当前语言默认模板"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>恢复默认模板</span>
                </button>
              </div>

              <div
                className={cn(
                  'relative flex font-mono text-xs leading-6',
                  isCodeFullscreen ? 'flex-1 min-h-0' : 'h-72'
                )}
              >
                {/* Line numbers */}
                <div
                  ref={gutterRef}
                  aria-hidden="true"
                  className="w-11 py-3 px-2 bg-slate-900/90 border-r border-slate-800 text-right text-slate-500 select-none overflow-hidden tabular-nums shrink-0"
                >
                  {scriptLines.map((_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>

                {/* Highlighted backdrop + editable transparent textarea */}
                <div className="relative flex-1 min-w-0 overflow-hidden">
                  <pre
                    ref={codePreRef}
                    aria-hidden="true"
                    className="absolute inset-0 m-0 p-3 overflow-hidden pointer-events-none whitespace-pre font-mono text-xs leading-6"
                  >
                    {scriptLines.map((line, idx) => (
                      <div key={idx}>{renderHighlightedLine(line, scriptLanguage)}</div>
                    ))}
                  </pre>

                  <textarea
                    value={scriptCode}
                    onChange={(e) => setScriptCode(e.target.value)}
                    onScroll={handleCodeScroll}
                    onKeyDown={handleCodeKeyDown}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="relative z-10 w-full h-full p-3 bg-transparent text-transparent caret-white selection:bg-blue-500/35 resize-none focus:outline-none whitespace-pre overflow-auto font-mono text-xs leading-6"
                  />
                </div>
              </div>
            </div>

            {/* Online Test Runner Panel */}
            {testPanelOpen && (
              <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-3 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span>在线模拟测试运行</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRunScriptTest}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Play className="w-3 h-3" />
                    <span>执行测试</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      模拟输入 JSON 参数
                    </label>
                    <textarea
                      rows={5}
                      value={testInputJson}
                      onChange={(e) => setTestInputJson(e.target.value)}
                      spellCheck={false}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      运行结果输出
                    </label>
                    {testOutput ? (
                      <div
                        className={cn(
                          'p-3 rounded-xl border font-mono text-[11px] space-y-1.5 max-h-36 overflow-y-auto',
                          testOutput.status === 'success'
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                            : 'bg-rose-50/60 border-rose-200 text-rose-800'
                        )}
                      >
                        <div className="flex items-center justify-between font-sans">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {testOutput.status === 'success' ? '运行成功' : '运行异常'}
                          </span>
                          <span className="text-[10px] text-slate-500 tabular-nums">
                            耗时 {testOutput.durationMs} ms
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap text-[11px] text-slate-600">
                          {testOutput.stdout}
                        </pre>
                        <pre className="p-2 rounded-lg bg-slate-900 text-emerald-300 whitespace-pre-wrap">
                          {testOutput.result}
                        </pre>
                      </div>
                    ) : (
                      <div className="h-[108px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-[11px]">
                        点击右上角「执行测试」验证脚本输入与返回结果
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            带 <span className="text-rose-500 font-bold">*</span> 为必填字段，工具名称需全局唯一
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isNew ? '保存新增工具' : '保存修改'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
