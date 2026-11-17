import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ConnectionFieldConfig } from './AgentDesignModal';

export interface ConnectFieldSpec extends ConnectionFieldConfig {
  compact?: boolean;
}

export const DEFAULT_SERIAL_CONNECT_FIELDS: ConnectFieldSpec[] = [
  {
    id: 'serial-port',
    name: '串口设备',
    key: 'serialPort',
    type: 'select',
    options: ['', 'COM1', 'COM2', 'COM3', 'COM4', '/dev/ttyUSB0', '/dev/ttyUSB1'],
    required: false,
    defaultValue: '',
  },
  {
    id: 'baud-rate',
    name: '波特率',
    key: 'baudRate',
    type: 'select',
    options: ['9600', '19200', '38400', '57600', '115200'],
    required: false,
    defaultValue: '9600',
  },
  {
    id: 'modbus-addr',
    name: '设备MODBUS地址',
    key: 'modbusAddress',
    type: 'input',
    inputMode: 'number',
    required: false,
    placeholder: '1',
    defaultValue: '1',
    compact: true,
  },
];

interface DeviceConnectPreModalProps {
  open: boolean;
  agentName?: string;
  fields?: ConnectFieldSpec[];
  primaryLabel?: string;
  showSkipOption?: boolean;
  onStartWithConnect: (values: Record<string, string>, summary: string) => void;
  onSkipConnect: () => void;
  onCancel: () => void;
}

export default function DeviceConnectPreModal({
  open,
  fields,
  primaryLabel = '开始对话',
  showSkipOption = true,
  onStartWithConnect,
  onSkipConnect,
  onCancel,
}: DeviceConnectPreModalProps) {
  const activeFields: ConnectFieldSpec[] =
    fields && fields.length > 0 ? fields : DEFAULT_SERIAL_CONNECT_FIELDS;

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    activeFields.forEach((f) => {
      const fieldKey = f.key?.trim() || f.id;
      if (f.defaultValue !== undefined) {
        init[fieldKey] = f.defaultValue;
      } else if (f.type === 'select') {
        init[fieldKey] = f.options?.[0] ?? '';
      } else {
        init[fieldKey] = '';
      }
    });
    setValues(init);
  }, [open, fields]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const summary = activeFields
      .map((f) => {
        const fieldKey = f.key?.trim() || f.id;
        const val = values[fieldKey] ?? '';
        const display =
          f.inputMode === 'password'
            ? '******'
            : val.trim() || (f.id === 'serial-port' || f.key === 'serialPort' ? '自动探测' : '-');
        return `${f.name}=${display}`;
      })
      .join(', ');
    onStartWithConnect(values, summary);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-[440px] rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top subtle periwinkle-blue gradient wash */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#e8f0fe] via-[#f4f8ff] to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="关闭"
          className="absolute top-3.5 right-3.5 z-10 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="relative z-[1] pt-11 pb-6 px-7">
          <div className="space-y-4">
            {activeFields.map((field) => {
              const fieldKey = field.key?.trim() || field.id;
              const currentVal = values[fieldKey] ?? '';
              const options =
                field.options && field.options.length > 0 ? field.options : ['默认'];

              return (
                <div key={field.id || fieldKey} className="flex items-center gap-3.5">
                  <label
                    htmlFor={`pre-connect-${fieldKey}`}
                    className="w-[122px] text-right text-[13px] font-normal text-slate-700 shrink-0 truncate"
                    title={`${field.name} (${fieldKey})`}
                  >
                    {field.name}
                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>

                  {field.type === 'select' ? (
                    <div className="relative flex-1 min-w-0">
                      <select
                        id={`pre-connect-${fieldKey}`}
                        name={fieldKey}
                        data-field-key={fieldKey}
                        required={field.required}
                        value={currentVal}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                        }
                        className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 appearance-none focus:outline-none focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/15 transition-all"
                      >
                        {options.map((opt) => (
                          <option key={opt || '__empty__'} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  ) : (
                    <div className={cn(field.compact ? 'w-24' : 'flex-1 min-w-0')}>
                      <input
                        id={`pre-connect-${fieldKey}`}
                        name={fieldKey}
                        data-field-key={fieldKey}
                        type={field.inputMode || 'text'}
                        required={field.required}
                        value={currentVal}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [fieldKey]: e.target.value }))
                        }
                        placeholder={field.placeholder || ''}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/15 transition-all"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="mt-8 flex items-center justify-between gap-3">
            {showSkipOption ? (
              <button
                type="button"
                onClick={onSkipConnect}
                className="text-[13px] font-normal text-[#1677ff] hover:text-blue-700 hover:underline underline-offset-2 transition-colors whitespace-nowrap shrink-0"
              >
                暂不连接，直接进入对话
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="h-8 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[13px] text-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                取 消
              </button>
              <button
                type="submit"
                className="h-8 px-4 rounded-lg bg-[#1677ff] hover:bg-blue-600 text-white text-[13px] font-medium shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
