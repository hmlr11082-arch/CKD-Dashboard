import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FileCheck2,
  Filter,
  Receipt,
  RotateCcw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ParsedBillSheetData,
  SheetTabInfo,
} from '../types/claims';
import { formatNumberTH } from '../utils/csvParser';

interface BillDashboardViewProps {
  billData: ParsedBillSheetData | null;
  isLoading: boolean;
  billTabs: SheetTabInfo[];
  activeBillSheetName: string;
  effectiveIsDesktop: boolean;
  darkMode: boolean;
  flashKey: number;
  onSelectBillSheet: (sheetName: string) => void;
}

type BillSortField =
  | 'rowNumber'
  | 'ofcSent'
  | 'ofcPassed'
  | 'ofcFailed'
  | 'sssSent'
  | 'sssPassed'
  | 'sssFailed'
  | 'calculatedPassedTotal'
  | 'calculatedFailedTotal';

export const BillDashboardView: React.FC<BillDashboardViewProps> = ({
  billData,
  isLoading,
  billTabs,
  activeBillSheetName,
  effectiveIsDesktop,
  darkMode,
  flashKey,
  onSelectBillSheet,
}) => {
  const [rowFilterMode, setRowFilterMode] = useState<
    'SUBMITTED' | 'FAILED_ONLY' | 'ALL'
  >('SUBMITTED');
  const [selectedErrorCode, setSelectedErrorCode] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<BillSortField>('rowNumber');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: BillSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'rowNumber');
    }
  };

  const filteredRecords = useMemo(() => {
    if (!billData) return [];
    const q = searchQuery.trim().toLowerCase();

    const list = billData.records.filter((r) => {
      if (rowFilterMode === 'SUBMITTED' && !r.isSubmitted) return false;
      if (rowFilterMode === 'FAILED_ONLY' && !r.hasFailedItems) return false;

      if (selectedErrorCode) {
        const upperRemark = r.remark.toUpperCase();
        if (!upperRemark.includes(selectedErrorCode.toUpperCase())) return false;
      }

      if (!q) return true;
      return (
        r.billCode.toLowerCase().includes(q) ||
        r.dateRaw.toLowerCase().includes(q) ||
        r.remark.toLowerCase().includes(q) ||
        String(r.seqNo ?? '').includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [billData, rowFilterMode, selectedErrorCode, searchQuery, sortField, sortAsc]);

  const tableTotals = useMemo(() => {
    return filteredRecords.reduce(
      (acc, r) => {
        acc.ofcSent += r.ofcSent ?? 0;
        acc.ofcPassed += r.ofcPassed ?? 0;
        acc.ofcFailed += r.ofcFailed ?? 0;
        acc.sssSent += r.sssSent ?? 0;
        acc.sssPassed += r.sssPassed ?? 0;
        acc.sssFailed += r.sssFailed ?? 0;
        acc.totalPassed += r.calculatedPassedTotal;
        acc.totalFailed += r.calculatedFailedTotal;
        return acc;
      },
      {
        ofcSent: 0,
        ofcPassed: 0,
        ofcFailed: 0,
        sssSent: 0,
        sssPassed: 0,
        sssFailed: 0,
        totalPassed: 0,
        totalFailed: 0,
      }
    );
  }, [filteredRecords]);

  const handleExportBillCsv = () => {
    if (!billData) return;
    let csv = '\uFEFF';
    const headers = [
      'ลำดับ',
      'ว/ด/ป',
      'งวด (CORTBIL)',
      'OFC ส่ง',
      'OFC ผ่าน',
      'OFC ไม่ผ่าน',
      'SSS ส่ง',
      'SSS ผ่าน',
      'SSS ไม่ผ่าน',
      'รวมผ่าน',
      'หมายเหตุ',
    ];
    csv += headers.join(',') + '\n';

    for (const r of filteredRecords) {
      const row = [
        r.seqNo ?? '',
        `"${r.dateRaw}"`,
        `"${r.billCode}"`,
        r.ofcSent ?? '',
        r.ofcPassed ?? '',
        r.ofcFailed ?? '',
        r.sssSent ?? '',
        r.sssPassed ?? '',
        r.sssFailed ?? '',
        r.sheetTotal ?? r.calculatedPassedTotal,
        `"${r.remark.replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    }

    csv +=
      [
        '"รวม"',
        `""`,
        `"${filteredRecords.length} งวด"`,
        tableTotals.ofcSent,
        tableTotals.ofcPassed,
        tableTotals.ofcFailed,
        tableTotals.sssSent,
        tableTotals.sssPassed,
        tableTotals.sssFailed,
        tableTotals.totalPassed,
        `""`,
      ].join(',') + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `โรงพยาบาลท่าคันโท_11085_${activeBillSheetName.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading || !billData) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-32 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-800"
            />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-800" />
      </div>
    );
  }

  const failedBatchesCount = billData.submittedRecords.filter(
    (r) => r.hasFailedItems
  ).length;

  const axisTextColor = darkMode ? '#94A3B8' : '#475569';
  const gridStrokeColor = darkMode ? '#1E293B' : '#E2E8F0';

  const renderSortIcon = (isCurrent: boolean, isAsc: boolean) => {
    if (!isCurrent) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return isAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Bill Sheet Selector Bar */}
      <div className="bg-white dark:bg-[#112240] rounded-2xl p-3.5 sm:p-4 border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] dark:bg-blue-950 text-[#1D4ED8] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm sm:text-base text-[#0F2A6B] dark:text-white">
              ข้อมูลการส่ง Bill ฟอกไต (CORTBIL / EDC) · {billData.sheetName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ติดตามสถานะการส่งเบิก OFC และ SSS รายงวด พร้อมสรุปรหัสสาเหตุที่ไม่ผ่านจาก Google Sheet
            </p>
          </div>
        </div>

        {/* Dynamic Bill Sheet Tabs */}
        <div className="flex items-center flex-wrap gap-1.5 bg-[#F4F8FF] dark:bg-slate-800/90 p-1 rounded-xl border border-blue-100 dark:border-slate-700">
          {billTabs.map((tab) => {
            const active = activeBillSheetName === tab.name;
            return (
              <button
                key={tab.name}
                type="button"
                onClick={() => onSelectBillSheet(tab.name)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 KPI Cards for Bill ฟอกไต */}
      <div
        className={
          effectiveIsDesktop
            ? 'grid grid-cols-4 gap-4'
            : 'flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 custom-scrollbar -mx-3 px-3'
        }
      >
        {/* KPI 1: Submitted Batches & Overall Pass Rate */}
        <div
          className={`${
            effectiveIsDesktop
              ? 'w-full'
              : 'min-w-[270px] snap-start shrink-0'
          } rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#1D4ED8] via-[#1E40AF] to-[#0284C7] text-white shadow-sm flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-blue-100">
              งวดส่งเบิกแล้วทั้งหมด (CORTBIL)
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4 text-sky-200" />
            </div>
          </div>

          <div
            key={`bkpi1-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num tracking-tight animate-number-flash"
          >
            {formatNumberTH(billData.totals.submittedBatchesCount)} งวด · รวม{' '}
            {formatNumberTH(billData.totals.totalSent)} รายการ
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-blue-100 font-mono-num">
            <span>
              ผ่านรวม {formatNumberTH(billData.totals.totalPassed)} รายการ
            </span>
            <span className="font-bold text-[#4ADE80]">
              ({billData.totals.overallPassRatePct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* KPI 2: OFC (ข้าราชการ) */}
        <div
          className={`${
            effectiveIsDesktop
              ? 'w-full'
              : 'min-w-[270px] snap-start shrink-0'
          } rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#112240] border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              สิทธิข้าราชการ (OFC)
            </span>
            <span className="text-xs font-mono-num font-bold text-[#1D4ED8] dark:text-[#38BDF8]">
              ผ่าน {billData.totals.ofcPassRatePct.toFixed(1)}%
            </span>
          </div>

          <div
            key={`bkpi2-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num text-[#0F2A6B] dark:text-white animate-number-flash"
          >
            ส่ง {formatNumberTH(billData.totals.ofcSent)} รายการ
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-xs font-mono-num">
            <span className="text-[#16A34A] dark:text-[#22C55E] font-semibold">
              ผ่าน {formatNumberTH(billData.totals.ofcPassed)}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                billData.totals.ofcFailed > 0
                  ? 'text-[#EF4444] font-semibold'
                  : 'text-slate-500'
              }
            >
              ไม่ผ่าน {formatNumberTH(billData.totals.ofcFailed)}
            </span>
          </div>
        </div>

        {/* KPI 3: SSS (ประกันสังคม) */}
        <div
          className={`${
            effectiveIsDesktop
              ? 'w-full'
              : 'min-w-[270px] snap-start shrink-0'
          } rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#112240] border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              สิทธิประกันสังคม (SSS)
            </span>
            <span className="text-xs font-mono-num font-bold text-[#0284C7] dark:text-[#38BDF8]">
              ผ่าน {billData.totals.sssPassRatePct.toFixed(1)}%
            </span>
          </div>

          <div
            key={`bkpi3-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num text-[#0F2A6B] dark:text-white animate-number-flash"
          >
            ส่ง {formatNumberTH(billData.totals.sssSent)} รายการ
          </div>

          <div className="mt-2.5 flex items-center gap-2 text-xs font-mono-num">
            <span className="text-[#16A34A] dark:text-[#22C55E] font-semibold">
              ผ่าน {formatNumberTH(billData.totals.sssPassed)}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={
                billData.totals.sssFailed > 0
                  ? 'text-[#EF4444] font-semibold'
                  : 'text-slate-500'
              }
            >
              ไม่ผ่าน {formatNumberTH(billData.totals.sssFailed)}
            </span>
          </div>
        </div>

        {/* KPI 4: Failed / Error Summary */}
        <div
          className={`${
            effectiveIsDesktop
              ? 'w-full'
              : 'min-w-[270px] snap-start shrink-0'
          } rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#112240] border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              รายการที่ไม่ผ่าน / ติดรหัสแจ้งเตือน
            </span>
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" />
          </div>

          <div
            key={`bkpi4-${flashKey}`}
            className="text-xl sm:text-2xl font-display font-bold font-mono-num text-[#EF4444] animate-number-flash"
          >
            {formatNumberTH(billData.totals.totalFailed)} รายการ
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>พบใน {formatNumberTH(failedBatchesCount)} งวดส่งเบิก</span>
            <button
              type="button"
              onClick={() =>
                setRowFilterMode(
                  rowFilterMode === 'FAILED_ONLY' ? 'SUBMITTED' : 'FAILED_ONLY'
                )
              }
              className="text-[#1D4ED8] dark:text-[#38BDF8] font-semibold hover:underline"
            >
              {rowFilterMode === 'FAILED_ONLY'
                ? 'แสดงทุกงวด'
                : 'กรองเฉพาะที่ไม่ผ่าน →'}
            </button>
          </div>
        </div>
      </div>

      {/* Charts Row: Left = Error Code Breakdown, Right = Monthly Bill Chart */}
      <div
        className={
          effectiveIsDesktop
            ? 'grid grid-cols-12 gap-4 items-stretch'
            : 'space-y-4'
        }
      >
        {/* Left (5 cols): สรุปรหัสสาเหตุที่ไม่ผ่าน (หมายเหตุ EDC / CORTBIL) */}
        <div
          className={`${
            effectiveIsDesktop ? 'col-span-5' : 'w-full'
          } bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-5 border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base text-[#0F2A6B] dark:text-white">
                  สรุปสาเหตุที่ไม่ผ่าน (หมายเหตุ EDC / CORTBIL)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  คลิกที่รหัสสาเหตุเพื่อกรองตารางเฉพาะงวดที่ติดรหัสนั้น
                </p>
              </div>
              {selectedErrorCode && (
                <button
                  type="button"
                  onClick={() => setSelectedErrorCode(null)}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#E0F2FE] dark:bg-slate-800 text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  ล้างตัวกรองรหัส
                </button>
              )}
            </div>

            {billData.remarkSummaries.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                ไม่พบรายการหมายเหตุความผิดปกติในแผ่นงานนี้
              </div>
            ) : (
              <div className="space-y-2">
                {billData.remarkSummaries.map((item) => {
                  const isSelected = selectedErrorCode === item.code;
                  const maxCount = billData.remarkSummaries[0]?.count || 1;
                  const widthPct = Math.max(12, (item.count / maxCount) * 100);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() =>
                        setSelectedErrorCode(isSelected ? null : item.code)
                      }
                      className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200'
                          : 'bg-[#F4F8FF]/70 dark:bg-slate-800/70 border-blue-100/70 dark:border-slate-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-display font-semibold text-[#0F2A6B] dark:text-white truncate">
                          {item.fullText}
                        </span>
                        <span className="font-mono-num font-bold text-[#EF4444] shrink-0">
                          {item.count} งวด
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#F59E0B] rounded-full"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              งวดที่เตรียมไว้ล่วงหน้า (ยังไม่ส่ง):{' '}
              <strong className="font-mono-num text-[#0F2A6B] dark:text-slate-200">
                {formatNumberTH(billData.totals.pendingBatchesCount)} งวด
              </strong>
            </span>
            <span>
              งวดล่าสุด:{' '}
              <strong className="font-mono-num text-[#1D4ED8] dark:text-[#38BDF8]">
                {billData.submittedRecords[
                  billData.submittedRecords.length - 1
                ]?.billCode || '—'}
              </strong>
            </span>
          </div>
        </div>

        {/* Right (7 cols): กราฟแท่งรายเดือน แสดง OFC ผ่าน, SSS ผ่าน, และไม่ผ่าน */}
        <div
          className={`${
            effectiveIsDesktop ? 'col-span-7' : 'w-full'
          } bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-5 border border-blue-100/80 dark:border-slate-800 shadow-xs flex flex-col justify-between`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-[#0F2A6B] dark:text-white">
                สถิติการส่ง Bill รายเดือน (แยกสิทธิ OFC / SSS / ไม่ผ่าน)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จำนวนรายการที่ส่งผ่านและไม่ผ่านในแต่ละเดือนจากข้อมูลในแผ่นงาน {billData.sheetName}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#3B82F6]" />
                OFC ผ่าน
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#38BDF8]" />
                SSS ผ่าน
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#EF4444]" />
                ไม่ผ่าน
              </span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[480px] h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={billData.monthlySummaries}
                  margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={gridStrokeColor}
                  />
                  <XAxis
                    dataKey="monthLabelThai"
                    tick={{ fill: axisTextColor, fontSize: 11 }}
                    axisLine={{ stroke: gridStrokeColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: axisTextColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const m = payload[0]
                        .payload as (typeof billData.monthlySummaries)[0];
                      return (
                        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-blue-100 dark:border-slate-700 shadow-lg text-xs font-mono-num space-y-1">
                          <div className="font-display font-bold text-[#0F2A6B] dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
                            เดือน {m.monthLabelThai} ({m.batchesCount} งวด)
                          </div>
                          <div className="text-[#1D4ED8] dark:text-[#3B82F6]">
                            OFC: ส่ง {m.ofcSent} · ผ่าน {m.ofcPassed} · ไม่ผ่าน{' '}
                            {m.ofcFailed}
                          </div>
                          <div className="text-[#0284C7] dark:text-[#38BDF8]">
                            SSS: ส่ง {m.sssSent} · ผ่าน {m.sssPassed} · ไม่ผ่าน{' '}
                            {m.sssFailed}
                          </div>
                          <div className="font-bold text-[#0F2A6B] dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                            รวมผ่าน: {m.totalPassed} / {m.totalSent} รายการ
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="ofcPassed"
                    name="OFC ผ่าน"
                    stackId="b"
                    fill="#3B82F6"
                  />
                  <Bar
                    dataKey="sssPassed"
                    name="SSS ผ่าน"
                    stackId="b"
                    fill="#38BDF8"
                  />
                  <Bar
                    dataKey="totalFailed"
                    name="ไม่ผ่าน"
                    stackId="b"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Table Section */}
      <section className="bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-5 border border-blue-100/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          {/* Filter Tabs */}
          <div className="flex items-center flex-wrap gap-1.5 bg-[#F4F8FF] dark:bg-slate-800/90 p-1 rounded-xl border border-blue-100 dark:border-slate-700 self-start">
            <button
              type="button"
              onClick={() => setRowFilterMode('SUBMITTED')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rowFilterMode === 'SUBMITTED'
                  ? 'bg-[#1D4ED8] text-white shadow-xs'
                  : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-blue-50'
              }`}
            >
              ส่งเบิกแล้ว ({billData.submittedRecords.length} งวด)
            </button>
            <button
              type="button"
              onClick={() => setRowFilterMode('FAILED_ONLY')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                rowFilterMode === 'FAILED_ONLY'
                  ? 'bg-[#F59E0B] text-white shadow-xs'
                  : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              เฉพาะงวดที่ไม่ผ่าน/มีหมายเหตุ ({failedBatchesCount})
            </button>
            <button
              type="button"
              onClick={() => setRowFilterMode('ALL')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                rowFilterMode === 'ALL'
                  ? 'bg-[#1D4ED8] text-white shadow-xs'
                  : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-blue-50'
              }`}
            >
              ทั้งหมดในชีต ({billData.records.length} แถว)
            </button>
          </div>

          {/* Search & Export CSV */}
          <div className="flex items-center gap-2">
            {selectedErrorCode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                <Filter className="w-3.5 h-3.5" />
                รหัส: {selectedErrorCode}
                <button
                  type="button"
                  onClick={() => setSelectedErrorCode(null)}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา CORTBIL, ว/ด/ป, HN, รหัส..."
                className="w-full min-h-[40px] pl-9 pr-8 py-1.5 rounded-xl bg-[#F4F8FF] dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-xs text-[#0F2A6B] dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportBillCsv}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bill Table */}
        <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="bg-[#F4F8FF] dark:bg-slate-800/90 text-[#0F2A6B] dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700">
                <th className="py-3 px-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('rowNumber')}
                    className="inline-flex items-center gap-1 hover:text-[#1D4ED8]"
                  >
                    <span>ลำดับ</span>
                    {renderSortIcon(sortField === 'rowNumber', sortAsc)}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold">ว/ด/ป</th>
                <th className="py-3 px-3 font-semibold">งวด (CORTBIL)</th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('ofcSent')}
                    className="inline-flex items-center justify-end gap-1 ml-auto"
                  >
                    <span>OFC ส่ง</span>
                    {renderSortIcon(sortField === 'ofcSent', sortAsc)}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('ofcPassed')}
                    className="inline-flex items-center justify-end gap-1 ml-auto"
                  >
                    <span>OFC ผ่าน</span>
                    {renderSortIcon(sortField === 'ofcPassed', sortAsc)}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('ofcFailed')}
                    className="inline-flex items-center justify-end gap-1 ml-auto"
                  >
                    <span>OFC ไม่ผ่าน</span>
                    {renderSortIcon(sortField === 'ofcFailed', sortAsc)}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('sssSent')}
                    className="inline-flex items-center justify-end gap-1 ml-auto"
                  >
                    <span>SSS ส่ง</span>
                    {renderSortIcon(sortField === 'sssSent', sortAsc)}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('sssPassed')}
                    className="inline-flex items-center justify-end gap-1 ml-auto"
                  >
                    <span>SSS ผ่าน</span>
                    {renderSortIcon(sortField === 'sssPassed', sortAsc)}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('sssFailed')}
                    className="inline-flex items-center justify-end gap-1 ml-auto"
                  >
                    <span>SSS ไม่ผ่าน</span>
                    {renderSortIcon(sortField === 'sssFailed', sortAsc)}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('calculatedPassedTotal')}
                    className="inline-flex items-center justify-end gap-1 ml-auto"
                  >
                    <span>รวม</span>
                    {renderSortIcon(
                      sortField === 'calculatedPassedTotal',
                      sortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    ไม่พบรายการ Bill ที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      r.hasFailedItems
                        ? 'bg-amber-50/60 dark:bg-amber-950/25 hover:bg-amber-100/60'
                        : !r.isSubmitted
                        ? 'opacity-55 bg-slate-50/50 dark:bg-slate-900/30'
                        : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono-num text-slate-500">
                      {r.seqNo ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num whitespace-nowrap text-[#0F2A6B] dark:text-slate-200">
                      {r.dateRaw || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num font-semibold text-[#1D4ED8] dark:text-[#38BDF8] whitespace-nowrap">
                      {r.billCode}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right">
                      {formatNumberTH(r.ofcSent)}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right text-[#16A34A] dark:text-[#22C55E] font-medium">
                      {formatNumberTH(r.ofcPassed)}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right">
                      {r.ofcFailed && r.ofcFailed > 0 ? (
                        <span className="inline-flex items-center gap-0.5 font-bold text-[#EF4444]">
                          <XCircle className="w-3 h-3" />
                          {r.ofcFailed}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {r.ofcFailed === 0 ? '0' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right">
                      {formatNumberTH(r.sssSent)}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right text-[#16A34A] dark:text-[#22C55E] font-medium">
                      {formatNumberTH(r.sssPassed)}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right">
                      {r.sssFailed && r.sssFailed > 0 ? (
                        <span className="inline-flex items-center gap-0.5 font-bold text-[#EF4444]">
                          <XCircle className="w-3 h-3" />
                          {r.sssFailed}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          {r.sssFailed === 0 ? '0' : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right font-bold text-[#0F2A6B] dark:text-white">
                      {formatNumberTH(r.sheetTotal ?? r.calculatedPassedTotal)}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      {r.remark ? (
                        <span className="inline-flex items-center gap-1 text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-900/50 px-2 py-0.5 rounded-md font-medium">
                          <AlertTriangle className="w-3 h-3 text-[#F59E0B] shrink-0" />
                          <span>{r.remark}</span>
                        </span>
                      ) : r.isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          ผ่านครบ
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          รอดำเนินการ
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#E0F2FE]/60 dark:bg-slate-800 font-bold text-[#0F2A6B] dark:text-white text-xs border-t-2 border-blue-200 dark:border-slate-700 font-mono-num">
                <td className="py-3 px-3 font-sans-thai" colSpan={3}>
                  รวม ({filteredRecords.length} งวดที่แสดง)
                </td>
                <td className="py-3 px-3 text-right">
                  {formatNumberTH(tableTotals.ofcSent)}
                </td>
                <td className="py-3 px-3 text-right text-[#16A34A] dark:text-[#22C55E]">
                  {formatNumberTH(tableTotals.ofcPassed)}
                </td>
                <td className="py-3 px-3 text-right text-[#EF4444]">
                  {formatNumberTH(tableTotals.ofcFailed)}
                </td>
                <td className="py-3 px-3 text-right">
                  {formatNumberTH(tableTotals.sssSent)}
                </td>
                <td className="py-3 px-3 text-right text-[#16A34A] dark:text-[#22C55E]">
                  {formatNumberTH(tableTotals.sssPassed)}
                </td>
                <td className="py-3 px-3 text-right text-[#EF4444]">
                  {formatNumberTH(tableTotals.sssFailed)}
                </td>
                <td className="py-3 px-3 text-right text-[#1D4ED8] dark:text-[#38BDF8]">
                  {formatNumberTH(tableTotals.totalPassed)}
                </td>
                <td className="py-3 px-3 font-sans-thai text-slate-600 dark:text-slate-300">
                  ไม่ผ่านรวม {formatNumberTH(tableTotals.totalFailed)} รายการ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};
