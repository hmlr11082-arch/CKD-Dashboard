import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Search,
  X,
} from 'lucide-react';
import {
  ClaimScheme,
  MonthlyRecord,
  PeriodRecord,
  SheetSummaryRow,
} from '../types/claims';
import { formatCurrencyTHB, formatNumberTH } from '../utils/csvParser';

interface ClaimsTableProps {
  periods: PeriodRecord[];
  months: MonthlyRecord[];
  hasUcColumn: boolean;
  sheetName: string;
  selectedSchemes: ClaimScheme[];
  sheetSummaryRow: SheetSummaryRow | null;
}

type PeriodSortField =
  | 'fiscalOrderIndex'
  | 'cocdPatients'
  | 'cocdAmount'
  | 'socdPatients'
  | 'socdAmount'
  | 'calculatedTotalAmount'
  | 'combinedAvgPerPatient';

type MonthlySortField =
  | 'fiscalMonthIndex'
  | 'socdAmount'
  | 'cocdAmount'
  | 'ucAmount'
  | 'calculatedTotalAmount';

export const ClaimsTable: React.FC<ClaimsTableProps> = ({
  periods,
  months,
  hasUcColumn,
  sheetName,
  selectedSchemes,
  sheetSummaryRow,
}) => {
  const [activeTableMode, setActiveTableMode] = useState<'PERIOD' | 'MONTHLY'>(
    'PERIOD'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [periodSortField, setPeriodSortField] =
    useState<PeriodSortField>('fiscalOrderIndex');
  const [periodSortAsc, setPeriodSortAsc] = useState<boolean>(true);

  const [monthlySortField, setMonthlySortField] =
    useState<MonthlySortField>('fiscalMonthIndex');
  const [monthlySortAsc, setMonthlySortAsc] = useState<boolean>(true);

  const handlePeriodSort = (field: PeriodSortField) => {
    if (periodSortField === field) {
      setPeriodSortAsc(!periodSortAsc);
    } else {
      setPeriodSortField(field);
      setPeriodSortAsc(field === 'fiscalOrderIndex');
    }
  };

  const handleMonthlySort = (field: MonthlySortField) => {
    if (monthlySortField === field) {
      setMonthlySortAsc(!monthlySortAsc);
    } else {
      setMonthlySortField(field);
      setMonthlySortAsc(field === 'fiscalMonthIndex');
    }
  };

  // Filtered & sorted periods
  const filteredPeriods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = periods.filter((p) => {
      if (!q) return true;
      return (
        p.id.toLowerCase().includes(q) ||
        p.cocdCode.toLowerCase().includes(q) ||
        p.socdCode.toLowerCase().includes(q) ||
        p.monthNameThai.toLowerCase().includes(q) ||
        p.periodLabelThai.toLowerCase().includes(q) ||
        String(p.cocdAmount ?? '').includes(q) ||
        String(p.socdAmount ?? '').includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const valA = a[periodSortField] ?? 0;
      const valB = b[periodSortField] ?? 0;
      return periodSortAsc ? valA - valB : valB - valA;
    });
  }, [periods, searchQuery, periodSortField, periodSortAsc]);

  // Filtered & sorted months
  const filteredMonths = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = months.filter((m) => {
      if (!q) return true;
      return (
        m.monthNameThai.toLowerCase().includes(q) ||
        m.monthShortThai.toLowerCase().includes(q) ||
        String(m.socdAmount ?? '').includes(q) ||
        String(m.cocdAmount ?? '').includes(q) ||
        String(m.ucAmount ?? '').includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const valA = a[monthlySortField] ?? -1;
      const valB = b[monthlySortField] ?? -1;
      return monthlySortAsc ? valA - valB : valB - valA;
    });
  }, [months, searchQuery, monthlySortField, monthlySortAsc]);

  // Totals for Period Table Footer
  const periodTotals = useMemo(() => {
    const cocdPts = filteredPeriods.reduce(
      (acc, p) => acc + (p.cocdPatients ?? 0),
      0
    );
    const cocdAmt = filteredPeriods.reduce(
      (acc, p) => acc + (p.cocdAmount ?? 0),
      0
    );
    const socdPts = filteredPeriods.reduce(
      (acc, p) => acc + (p.socdPatients ?? 0),
      0
    );
    const socdAmt = filteredPeriods.reduce(
      (acc, p) => acc + (p.socdAmount ?? 0),
      0
    );
    const totalAmt = cocdAmt + socdAmt;
    const totalPts = cocdPts + socdPts;
    const avgPerPt = totalPts > 0 ? totalAmt / totalPts : 0;

    return {
      cocdPts,
      cocdAmt,
      socdPts,
      socdAmt,
      totalAmt,
      totalPts,
      avgPerPt,
    };
  }, [filteredPeriods]);

  // Totals for Monthly Table Footer
  const monthlyTotals = useMemo(() => {
    const socd = filteredMonths.reduce((acc, m) => acc + (m.socdAmount ?? 0), 0);
    const cocd = filteredMonths.reduce((acc, m) => acc + (m.cocdAmount ?? 0), 0);
    const uc = filteredMonths.reduce((acc, m) => acc + (m.ucAmount ?? 0), 0);
    const grandTotal = socd + cocd + uc;
    return { socd, cocd, uc, grandTotal };
  }, [filteredMonths]);

  // Export CSV Handler
  const handleExportCsv = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Thai compatibility in Excel

    if (activeTableMode === 'PERIOD') {
      const headers = [
        'งวดที่',
        'เดือน',
        'เลขงวด COCD',
        'ผู้รับบริการ COCD (คน)',
        'จำนวนเงิน COCD (บาท)',
        'เฉลี่ย COCD (บาท/คน)',
        'เลขงวด SOCD',
        'ผู้รับบริการ SOCD (คน)',
        'จำนวนเงิน SOCD (บาท)',
        'เฉลี่ย SOCD (บาท/คน)',
        'รวมผู้รับบริการ (คน)',
        'รวมเงินรายงวด (บาท)',
        'หมายเหตุการตรวจสอบ',
      ];
      csvContent += headers.join(',') + '\n';

      for (const p of filteredPeriods) {
        const note = p.isDuplicateSchemeValues
          ? 'พบข้อมูล SOCD = COCD ทุกตัวเลข'
          : p.isCocdOutlier || p.isSocdOutlier
          ? 'ค่าเฉลี่ยบาท/คน เบี่ยงเบนเกิน ±25%'
          : 'ปกติ';

        const row = [
          `"${p.id}"`,
          `"${p.periodLabelThai}"`,
          `"${p.cocdCode}"`,
          p.cocdPatients ?? '',
          p.cocdAmount !== null ? p.cocdAmount.toFixed(2) : '',
          p.cocdAvgPerPatient !== null ? p.cocdAvgPerPatient.toFixed(2) : '',
          `"${p.socdCode}"`,
          p.socdPatients ?? '',
          p.socdAmount !== null ? p.socdAmount.toFixed(2) : '',
          p.socdAvgPerPatient !== null ? p.socdAvgPerPatient.toFixed(2) : '',
          p.totalPatients,
          p.calculatedTotalAmount.toFixed(2),
          `"${note}"`,
        ];
        csvContent += row.join(',') + '\n';
      }

      csvContent +=
        [
          '"รวมทั้งหมด"',
          `""`,
          `""`,
          periodTotals.cocdPts,
          periodTotals.cocdAmt.toFixed(2),
          `""`,
          `""`,
          periodTotals.socdPts,
          periodTotals.socdAmt.toFixed(2),
          `""`,
          periodTotals.totalPts,
          periodTotals.totalAmt.toFixed(2),
          `""`,
        ].join(',') + '\n';
    } else {
      const headers = [
        'เดือน',
        'SOCD ประกันสังคม (บาท)',
        'COCD กรมบัญชีกลาง (บาท)',
        ...(hasUcColumn ? ['UC บัตรทอง (บาท)'] : []),
        'รวมรายเดือน (บาท)',
        'สถานะข้อมูล',
      ];
      csvContent += headers.join(',') + '\n';

      for (const m of filteredMonths) {
        const status = m.isUcMissing ? 'ข้อมูลยังไม่ครบ (รอ UC)' : 'ครบถ้วน';
        const row = [
          `"${m.monthNameThai}"`,
          m.socdAmount !== null ? m.socdAmount.toFixed(2) : '',
          m.cocdAmount !== null ? m.cocdAmount.toFixed(2) : '',
          ...(hasUcColumn
            ? [m.ucAmount !== null ? m.ucAmount.toFixed(2) : '"ยังไม่มีข้อมูล"']
            : []),
          m.calculatedTotalAmount.toFixed(2),
          `"${status}"`,
        ];
        csvContent += row.join(',') + '\n';
      }

      csvContent +=
        [
          '"รวมคำนวณโดยแอป"',
          monthlyTotals.socd.toFixed(2),
          monthlyTotals.cocd.toFixed(2),
          ...(hasUcColumn ? [monthlyTotals.uc.toFixed(2)] : []),
          monthlyTotals.grandTotal.toFixed(2),
          `""`,
        ].join(',') + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const modeSlug = activeTableMode === 'PERIOD' ? 'รายงวด' : 'รายเดือน';
    link.setAttribute(
      'download',
      `โรงพยาบาลท่าคันโท_11085_การส่งเบิกค่าฟอกไต_${sheetName.replace(/\s+/g, '_')}_${modeSlug}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (isCurrent: boolean, isAsc: boolean) => {
    if (!isCurrent) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return isAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#38BDF8]" />
    );
  };

  return (
    <section
      aria-label="ตารางข้อมูลการส่งเบิกค่าฟอกไต"
      className="bg-white dark:bg-[#112240] rounded-2xl p-4 sm:p-5 border border-blue-100/80 dark:border-slate-800 shadow-xs"
    >
      {/* Top Toolbar: Table Mode Switcher + Search + Export CSV */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-[#F4F8FF] dark:bg-slate-800/90 p-1 rounded-xl border border-blue-100 dark:border-slate-700 self-start">
          <button
            type="button"
            onClick={() => setActiveTableMode('PERIOD')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTableMode === 'PERIOD'
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>ตารางรายงวด (A–G) · {filteredPeriods.length} งวด</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTableMode('MONTHLY')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTableMode === 'MONTHLY'
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'text-[#0F2A6B] dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>ตารางสรุปรายเดือน (I–M) · {filteredMonths.length} เดือน</span>
          </button>
        </div>

        {/* Right Controls: Search Input & Export CSV */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขงวด, เดือน, จำนวนเงิน..."
              className="w-full min-h-[42px] pl-9 pr-8 py-2 rounded-xl bg-[#F4F8FF] dark:bg-slate-800/90 border border-blue-100 dark:border-slate-700 text-xs text-[#0F2A6B] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
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
            onClick={handleExportCsv}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table 1: Period Table (Columns A-G) */}
      {activeTableMode === 'PERIOD' ? (
        <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-[#F4F8FF] dark:bg-slate-800/90 text-[#0F2A6B] dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700">
                <th className="py-3 px-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => handlePeriodSort('fiscalOrderIndex')}
                    className="inline-flex items-center gap-1 hover:text-[#1D4ED8]"
                  >
                    <span>งวด / เดือน</span>
                    {renderSortIcon(
                      periodSortField === 'fiscalOrderIndex',
                      periodSortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold">เลขงวด COCD (A)</th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handlePeriodSort('cocdPatients')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>ผู้รับบริการ COCD (B)</span>
                    {renderSortIcon(
                      periodSortField === 'cocdPatients',
                      periodSortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handlePeriodSort('cocdAmount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>จำนวนเงิน COCD (C)</span>
                    {renderSortIcon(
                      periodSortField === 'cocdAmount',
                      periodSortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold">เลขงวด SOCD (D)</th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handlePeriodSort('socdPatients')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>ผู้รับบริการ SOCD (E)</span>
                    {renderSortIcon(
                      periodSortField === 'socdPatients',
                      periodSortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handlePeriodSort('socdAmount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>จำนวนเงิน SOCD (F)</span>
                    {renderSortIcon(
                      periodSortField === 'socdAmount',
                      periodSortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handlePeriodSort('calculatedTotalAmount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>รวมเงิน (G)</span>
                    {renderSortIcon(
                      periodSortField === 'calculatedTotalAmount',
                      periodSortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handlePeriodSort('combinedAvgPerPatient')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>เฉลี่ย (บาท/คน)</span>
                    {renderSortIcon(
                      periodSortField === 'combinedAvgPerPatient',
                      periodSortAsc
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {filteredPeriods.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    ไม่พบข้อมูลรายงวดที่ตรงกับคำค้นหา
                  </td>
                </tr>
              ) : (
                filteredPeriods.map((p) => {
                  const hasAnomaly =
                    p.isDuplicateSchemeValues ||
                    p.isCocdOutlier ||
                    p.isSocdOutlier;
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        hasAnomaly
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70'
                          : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-medium text-[#0F2A6B] dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{p.periodLabelThai}</span>
                          {hasAnomaly && (
                            <span
                              title={
                                p.isDuplicateSchemeValues
                                  ? `งวด ${p.id}: พบยอด SOCD เท่ากับ COCD ทุกตัวเลข (${p.cocdPatients} คน, ${formatCurrencyTHB(p.cocdAmount, true)})`
                                  : 'ค่าเฉลี่ยบาท/คน เบี่ยงเบนเกิน ±25%'
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded-md"
                            >
                              <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                              {p.isDuplicateSchemeValues
                                ? 'SOCD=COCD'
                                : 'ผิดปกติ'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-xs text-slate-600 dark:text-slate-300">
                        {p.cocdCode}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#0F2A6B] dark:text-slate-200">
                        {formatNumberTH(p.cocdPatients)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right font-medium text-[#1D4ED8] dark:text-[#3B82F6]">
                        {formatCurrencyTHB(p.cocdAmount, true)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-xs text-slate-600 dark:text-slate-300">
                        {p.socdCode}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#0F2A6B] dark:text-slate-200">
                        {formatNumberTH(p.socdPatients)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right font-medium text-[#0284C7] dark:text-[#38BDF8]">
                        {formatCurrencyTHB(p.socdAmount, true)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right font-bold text-[#0F2A6B] dark:text-white">
                        {formatCurrencyTHB(p.calculatedTotalAmount, true)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-slate-600 dark:text-slate-300">
                        {p.combinedAvgPerPatient !== null
                          ? `฿${formatNumberTH(p.combinedAvgPerPatient, 2)}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#E0F2FE]/60 dark:bg-slate-800 font-bold text-[#0F2A6B] dark:text-white text-xs sm:text-sm border-t-2 border-blue-200 dark:border-slate-700">
                <td className="py-3 px-3" colSpan={2}>
                  รวมทั้งสิ้น ({filteredPeriods.length} งวด)
                </td>
                <td className="py-3 px-3 font-mono-num text-right">
                  {formatNumberTH(periodTotals.cocdPts)} คน
                </td>
                <td className="py-3 px-3 font-mono-num text-right text-[#1D4ED8] dark:text-[#38BDF8]">
                  {formatCurrencyTHB(periodTotals.cocdAmt, true)}
                </td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3 font-mono-num text-right">
                  {formatNumberTH(periodTotals.socdPts)} คน
                </td>
                <td className="py-3 px-3 font-mono-num text-right text-[#0284C7] dark:text-[#38BDF8]">
                  {formatCurrencyTHB(periodTotals.socdAmt, true)}
                </td>
                <td className="py-3 px-3 font-mono-num text-right text-[#1D4ED8] dark:text-white">
                  {formatCurrencyTHB(periodTotals.totalAmt, true)}
                </td>
                <td className="py-3 px-3 font-mono-num text-right">
                  ฿{formatNumberTH(periodTotals.avgPerPt, 2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* Table 2: Monthly Summary Table (Columns I-M) */
        <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-[#F4F8FF] dark:bg-slate-800/90 text-[#0F2A6B] dark:text-slate-200 text-xs border-b border-slate-200/80 dark:border-slate-700">
                <th className="py-3 px-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleMonthlySort('fiscalMonthIndex')}
                    className="inline-flex items-center gap-1 hover:text-[#1D4ED8]"
                  >
                    <span>เดือน (คอลัมน์ I)</span>
                    {renderSortIcon(
                      monthlySortField === 'fiscalMonthIndex',
                      monthlySortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleMonthlySort('socdAmount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>SOCD ประกันสังคม (J)</span>
                    {renderSortIcon(
                      monthlySortField === 'socdAmount',
                      monthlySortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleMonthlySort('cocdAmount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>COCD กรมบัญชีกลาง (K)</span>
                    {renderSortIcon(
                      monthlySortField === 'cocdAmount',
                      monthlySortAsc
                    )}
                  </button>
                </th>
                {hasUcColumn && (
                  <th className="py-3 px-4 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => handleMonthlySort('ucAmount')}
                      className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                    >
                      <span>UC บัตรทอง (L)</span>
                      {renderSortIcon(
                        monthlySortField === 'ucAmount',
                        monthlySortAsc
                      )}
                    </button>
                  </th>
                )}
                <th className="py-3 px-4 font-semibold text-right">
                  <button
                    type="button"
                    onClick={() => handleMonthlySort('calculatedTotalAmount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-[#1D4ED8] ml-auto"
                  >
                    <span>รวมรายเดือน (M)</span>
                    {renderSortIcon(
                      monthlySortField === 'calculatedTotalAmount',
                      monthlySortAsc
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold text-center">
                  เทียบผลรวม 2 งวด
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {filteredMonths.map((m) => {
                const isReconciled =
                  Math.abs(m.cocdCrossTableDiff) <= 0.5 &&
                  Math.abs(m.socdCrossTableDiff) <= 0.5;
                return (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      m.isUcMissing
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/80'
                        : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-[#0F2A6B] dark:text-white">
                      {m.monthNameThai}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-right text-[#0284C7] dark:text-[#38BDF8]">
                      {formatCurrencyTHB(m.socdAmount, true)}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-right text-[#1D4ED8] dark:text-[#3B82F6]">
                      {formatCurrencyTHB(m.cocdAmount, true)}
                    </td>
                    {hasUcColumn && (
                      <td className="py-3 px-4 text-right">
                        {m.ucAmount === null ? (
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            ยังไม่มีข้อมูล
                          </span>
                        ) : (
                          <span className="font-mono-num font-medium text-[#1E40AF] dark:text-indigo-300">
                            {formatCurrencyTHB(m.ucAmount, true)}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono-num font-bold text-[#0F2A6B] dark:text-white">
                        {formatCurrencyTHB(m.calculatedTotalAmount, true)}
                      </div>
                      {m.isUcMissing && (
                        <div className="text-[11px] font-medium text-[#F59E0B]">
                          ข้อมูลยังไม่ครบ
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isReconciled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#16A34A] dark:text-[#22C55E] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ตรงกัน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#EF4444] font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ไม่ตรง
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* Row 1: App Calculated Total */}
              <tr className="bg-[#E0F2FE]/60 dark:bg-slate-800 font-bold text-[#0F2A6B] dark:text-white text-xs sm:text-sm border-t-2 border-blue-200 dark:border-slate-700">
                <td className="py-3 px-4">
                  ยอดรวมที่แอปคำนวณ ({filteredMonths.length} เดือน)
                </td>
                <td className="py-3 px-4 font-mono-num text-right text-[#0284C7] dark:text-[#38BDF8]">
                  {formatCurrencyTHB(monthlyTotals.socd, true)}
                </td>
                <td className="py-3 px-4 font-mono-num text-right text-[#1D4ED8] dark:text-[#3B82F6]">
                  {formatCurrencyTHB(monthlyTotals.cocd, true)}
                </td>
                {hasUcColumn && (
                  <td className="py-3 px-4 font-mono-num text-right text-[#1E40AF] dark:text-indigo-300">
                    {formatCurrencyTHB(monthlyTotals.uc, true)}
                  </td>
                )}
                <td className="py-3 px-4 font-mono-num text-right text-[#1D4ED8] dark:text-white">
                  {formatCurrencyTHB(monthlyTotals.grandTotal, true)}
                </td>
                <td className="py-3 px-4 text-center text-xs font-medium text-[#16A34A] dark:text-[#22C55E]">
                  คำนวณอัตโนมัติ
                </td>
              </tr>

              {/* Row 2: Sheet's "รวม" Row for Comparison */}
              {sheetSummaryRow && filteredMonths.length === months.length && (
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 text-xs border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2.5 px-4 font-medium">
                    แถว &ldquo;รวม&rdquo; ใน Google Sheet (สำหรับตรวจสอบ)
                  </td>
                  <td className="py-2.5 px-4 font-mono-num text-right">
                    {formatCurrencyTHB(sheetSummaryRow.socdTotal, true)}
                  </td>
                  <td className="py-2.5 px-4 font-mono-num text-right">
                    {formatCurrencyTHB(sheetSummaryRow.cocdTotal, true)}
                  </td>
                  {hasUcColumn && (
                    <td className="py-2.5 px-4 font-mono-num text-right">
                      {formatCurrencyTHB(sheetSummaryRow.ucTotal, true)}
                    </td>
                  )}
                  <td className="py-2.5 px-4 font-mono-num text-right font-semibold">
                    {formatCurrencyTHB(sheetSummaryRow.grandTotal, true)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {Math.abs(
                      monthlyTotals.grandTotal -
                        (sheetSummaryRow.grandTotal ?? 0)
                    ) <= 0.5 ? (
                      <span className="inline-flex items-center gap-1 text-[#16A34A] dark:text-[#22C55E] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ตรงกัน 100%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#EF4444] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ต่างกัน
                      </span>
                    )}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
};
