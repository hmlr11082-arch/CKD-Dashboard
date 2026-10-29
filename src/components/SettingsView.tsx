import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Laptop,
  Loader2,
  Play,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  XCircle,
} from 'lucide-react';
import {
  ConnectionTestResult,
  DEFAULT_SETTINGS,
  DEFAULT_SPREADSHEET_ID,
  testConnectionForSettings,
} from '../services/sheetFetcher';
import {
  AppSettings,
  FetcherTierMode,
  SheetTabInfo,
  ViewLayoutMode,
} from '../types/claims';
import { formatCurrencyTHB } from '../utils/csvParser';

interface SettingsViewProps {
  settings: AppSettings;
  claimsTabs: SheetTabInfo[];
  billTabs: SheetTabInfo[];
  isDiscoveringTabs: boolean;
  onRediscoverTabs: () => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetSettings: () => void;
  onOpenAboutModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  claimsTabs,
  billTabs,
  isDiscoveringTabs,
  onRediscoverTabs,
  onUpdateSettings,
  onResetSettings,
  onOpenAboutModal,
}) => {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [testingTier, setTestingTier] = useState<
    'TIER_1' | 'TIER_2' | 'TIER_3' | null
  >(null);
  const [testResults, setTestResults] = useState<
    Record<string, ConnectionTestResult>
  >({});
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(draft);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleRunTest = async (tier: 'TIER_1' | 'TIER_2' | 'TIER_3') => {
    setTestingTier(tier);
    try {
      const res = await testConnectionForSettings(draft, tier);
      setTestResults((prev) => ({ ...prev, [tier]: res }));
    } finally {
      setTestingTier(null);
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_SETTINGS);
    setTestResults({});
    onResetSettings();
  };

  return (
    <section
      aria-label="ตั้งค่าระบบและการเชื่อมต่อ"
      className="bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-6 border border-blue-100/80 dark:border-slate-800 shadow-xs max-w-4xl mx-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-blue-100 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/assets/aistudio/TTK_Logo_3d9ddd8c.png"
              alt="โลโก้ โรงพยาบาลท่าคันโท 11085"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-[#0F2A6B] dark:text-white">
              โรงพยาบาลท่าคันโท 11085 · ตั้งค่าระบบและการเชื่อมต่อ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              กำหนดปีงบประมาณ ตรวจหาแผ่นงานใหม่อัตโนมัติ และตั้งค่าตัวดึงข้อมูลสำรอง
            </p>
          </div>
        </div>

        <a
          href={`https://docs.google.com/spreadsheets/d/${draft.spreadsheetId}/edit`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 hover:bg-[#E0F2FE] text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-1.5 border border-blue-100 dark:border-slate-700 transition-colors"
        >
          <span>เปิดไฟล์ Google Sheet ต้นฉบับ</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs sm:text-sm">
        {/* 1. Dynamic Sheet Discovery & Selection */}
        <div className="p-4 rounded-2xl bg-[#F4F8FF]/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-bold text-[#0F2A6B] dark:text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
                แผ่นงานที่ตรวจพบใน Google Sheet อัตโนมัติ ({claimsTabs.length + billTabs.length} แผ่นงาน)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                เมื่อเพิ่มแผ่นงานใหม่ใน Google Sheet (เช่น ฟอกไต 2570 หรือ Bill ฟอกไต 2570) ระบบจะดึงรายชื่อแผ่นงานเข้าสู่ระบบให้อัตโนมัติ
              </p>
            </div>
            <button
              type="button"
              onClick={onRediscoverTabs}
              disabled={isDiscoveringTabs}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isDiscoveringTabs ? 'animate-spin' : ''
                }`}
              />
              <span>ซิงค์รายชื่อแผ่นงานเดี๋ยวนี้</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Claims Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#0F2A6B] dark:text-slate-200 block">
                แผ่นงานการส่งเบิกค่าฟอกไต ({claimsTabs.length} แผ่นงาน):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {claimsTabs.map((item) => {
                  const active = draft.sheetName === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        const updated = { ...draft, sheetName: item.name };
                        setDraft(updated);
                        onUpdateSettings(updated);
                      }}
                      className={`min-h-[46px] p-2 rounded-xl text-left border transition-all ${
                        active
                          ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-[#0F2A6B] dark:text-slate-200 border-blue-100 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-display font-bold text-xs truncate">
                        {item.name}
                      </div>
                      <div
                        className={`text-[10px] ${
                          active ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.shortLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bill Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#0F2A6B] dark:text-slate-200 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>แผ่นงาน Bill ฟอกไต ({billTabs.length} แผ่นงาน):</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {billTabs.map((item) => {
                  const active = draft.billSheetName === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        const updated = { ...draft, billSheetName: item.name };
                        setDraft(updated);
                        onUpdateSettings(updated);
                      }}
                      className={`min-h-[46px] p-2 rounded-xl text-left border transition-all ${
                        active
                          ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-[#0F2A6B] dark:text-slate-200 border-blue-100 dark:border-slate-700 hover:border-sky-300'
                      }`}
                    >
                      <div className="font-display font-bold text-xs truncate">
                        {item.name}
                      </div>
                      <div
                        className={`text-[10px] ${
                          active ? 'text-sky-100' : 'text-slate-500'
                        }`}
                      >
                        {item.shortLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Polling Interval & View Layout Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#F4F8FF]/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 space-y-2.5">
            <label className="font-display font-bold text-[#0F2A6B] dark:text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
              ความถี่การดึงข้อมูลอัตโนมัติ (Real-time Polling)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([10, 15, 30, 60] as const).map((sec) => {
                const active = draft.pollingIntervalSec === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      const updated = { ...draft, pollingIntervalSec: sec };
                      setDraft(updated);
                      onUpdateSettings(updated);
                    }}
                    className={`min-h-[48px] rounded-xl font-mono-num font-semibold text-xs border transition-all ${
                      active
                        ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-[#0F2A6B] dark:text-slate-200 border-blue-100 dark:border-slate-700 hover:border-blue-300'
                    }`}
                  >
                    {sec} วินาที
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F4F8FF]/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 space-y-2.5">
            <label className="font-display font-bold text-[#0F2A6B] dark:text-white block">
              โหมดการจัดวางหน้าจอ (Mobile / Desktop Layout)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  mode: ViewLayoutMode.AUTO,
                  label: 'อัตโนมัติ',
                  icon: Smartphone,
                },
                {
                  mode: ViewLayoutMode.MOBILE,
                  label: 'มือถือ',
                  icon: Smartphone,
                },
                {
                  mode: ViewLayoutMode.DESKTOP,
                  label: 'เดสก์ท็อป',
                  icon: Laptop,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = draft.viewLayoutMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => {
                      const updated = { ...draft, viewLayoutMode: item.mode };
                      setDraft(updated);
                      onUpdateSettings(updated);
                    }}
                    className={`min-h-[48px] px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      active
                        ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-[#0F2A6B] dark:text-slate-200 border-blue-100 dark:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Data Fetcher Tier Selection */}
        <div className="p-4 rounded-2xl bg-[#F4F8FF]/70 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="font-display font-bold text-[#0F2A6B] dark:text-white">
              ตัวดึงข้อมูลจาก Google Sheets (3-Tier Fallback)
            </label>
            <button
              type="button"
              onClick={onOpenAboutModal}
              className="text-xs text-[#1D4ED8] dark:text-[#38BDF8] font-medium hover:underline"
            >
              ดูผังการทำงาน &amp; วิธีตั้งค่า →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {[
              {
                mode: FetcherTierMode.AUTO,
                title: 'อัตโนมัติ (แนะนำ)',
                sub: 'ลองระดับ 1 → 2 → 3 ตามลำดับ',
              },
              {
                mode: FetcherTierMode.TIER_1_GVIZ,
                title: 'บังคับระดับ 1',
                sub: 'gviz CSV (Real-time)',
              },
              {
                mode: FetcherTierMode.TIER_2_PUBLISHED_CSV,
                title: 'บังคับระดับ 2',
                sub: 'Published CSV (~5 นาที)',
              },
              {
                mode: FetcherTierMode.TIER_3_APPS_SCRIPT,
                title: 'บังคับระดับ 3',
                sub: 'Apps Script JSON',
              },
              {
                mode: FetcherTierMode.MOCK,
                title: 'ข้อมูลจำลอง',
                sub: 'โหมดทดสอบออฟไลน์',
              },
            ].map((item) => {
              const active = draft.fetcherMode === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    const updated = { ...draft, fetcherMode: item.mode };
                    setDraft(updated);
                    onUpdateSettings(updated);
                  }}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    active
                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-[#0F2A6B] dark:text-slate-200 border-blue-100 dark:border-slate-700'
                  }`}
                >
                  <div className="font-display font-bold text-xs">
                    {item.title}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      active ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {item.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. URLs & Connection Testing per Tier */}
        <div className="space-y-4">
          {/* Tier 1 Config */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display font-bold text-[#0F2A6B] dark:text-white">
                  ระดับ 1 (หลัก): Google Visualization Endpoint (gviz CSV)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  อ่านข้อมูลเกือบ Real-time จาก Spreadsheet ID โดยตรง (ต้องแชร์ Sheet เป็น &ldquo;ทุกคนที่มีลิงก์ – ผู้มีสิทธิ์อ่าน&rdquo;)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRunTest('TIER_1')}
                disabled={testingTier !== null}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#E0F2FE] dark:bg-slate-800 hover:bg-blue-100 text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
              >
                {testingTier === 'TIER_1' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>ทดสอบการเชื่อมต่อระดับ 1</span>
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                Spreadsheet ID:
              </label>
              <input
                type="text"
                value={draft.spreadsheetId}
                onChange={(e) =>
                  setDraft({ ...draft, spreadsheetId: e.target.value })
                }
                placeholder={DEFAULT_SPREADSHEET_ID}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 font-mono-num text-xs text-[#0F2A6B] dark:text-white"
              />
            </div>

            {testResults.TIER_1 && (
              <TestResultBanner result={testResults.TIER_1} />
            )}
          </div>

          {/* Tier 2 Config */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display font-bold text-[#0F2A6B] dark:text-white">
                  ระดับ 2 (สำรอง): ลิงก์ &ldquo;เผยแพร่ไปยังเว็บ&rdquo; (Published to Web CSV)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  วางลิงก์จากเมนู ไฟล์ &gt; แชร์ &gt; เผยแพร่ไปยังเว็บ ที่ลงท้ายด้วย <code className="font-mono-num">output=csv</code> (ข้อมูลอาจช้ากว่าจริงราว 5 นาที)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRunTest('TIER_2')}
                disabled={testingTier !== null}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#E0F2FE] dark:bg-slate-800 hover:bg-blue-100 text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
              >
                {testingTier === 'TIER_2' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>ทดสอบระดับ 2</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                  URL ของ Published CSV (แท็บ ฟอกไต 2569):
                </label>
                <input
                  type="url"
                  value={draft.publishedCsvUrl2569}
                  onChange={(e) =>
                    setDraft({ ...draft, publishedCsvUrl2569: e.target.value })
                  }
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?gid=1291235853&single=true&output=csv"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 font-mono-num text-xs text-[#0F2A6B] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                  URL ของ Published CSV (แท็บ ฟอกไต 2568):
                </label>
                <input
                  type="url"
                  value={draft.publishedCsvUrl2568}
                  onChange={(e) =>
                    setDraft({ ...draft, publishedCsvUrl2568: e.target.value })
                  }
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 font-mono-num text-xs text-[#0F2A6B] dark:text-white"
                />
              </div>
            </div>

            {testResults.TIER_2 && (
              <TestResultBanner result={testResults.TIER_2} />
            )}
          </div>

          {/* Tier 3 Config */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display font-bold text-[#0F2A6B] dark:text-white">
                  ระดับ 3 (เมื่อถูกบล็อก CORS): Google Apps Script Web App (JSON)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  วาง URL ของ Web App ที่ Deploy จากไฟล์ <code className="font-mono-num">docs/apps-script.gs</code> โดยตั้งสิทธิ์เป็น &ldquo;Anyone&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRunTest('TIER_3')}
                disabled={testingTier !== null}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#E0F2FE] dark:bg-slate-800 hover:bg-blue-100 text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
              >
                {testingTier === 'TIER_3' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>ทดสอบระดับ 3</span>
              </button>
            </div>

            <div>
              <input
                type="url"
                value={draft.appsScriptUrl}
                onChange={(e) =>
                  setDraft({ ...draft, appsScriptUrl: e.target.value })
                }
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 font-mono-num text-xs text-[#0F2A6B] dark:text-white"
              />
            </div>

            {testResults.TIER_3 && (
              <TestResultBanner result={testResults.TIER_3} />
            )}
          </div>
        </div>

        {/* Bottom Actions: Save & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
          </button>

          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="text-xs font-medium text-[#16A34A] dark:text-[#22C55E] flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                บันทึกการตั้งค่าเรียบร้อยแล้ว
              </span>
            )}
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

const TestResultBanner: React.FC<{ result: ConnectionTestResult }> = ({
  result,
}) => {
  return (
    <div
      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
        result.success
          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          : 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
      }`}
    >
      {result.success ? (
        <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
      )}
      <div className="space-y-0.5">
        <div className="font-display font-bold">{result.tierLabel}</div>
        <div>{result.message}</div>
        {result.success && (
          <div className="font-mono-num text-[11px] opacity-90">
            ยอดรวมทั้งปีงบประมาณที่อ่านได้: {formatCurrencyTHB(result.grandTotal, true)}
          </div>
        )}
      </div>
    </div>
  );
};
