import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Info,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DataQualityReport, MonthlyRecord } from '../types/claims';
import { formatCurrencyTHB, formatNumberTH } from '../utils/csvParser';

interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DataQualityReport;
  months: MonthlyRecord[];
  sheetName: string;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  onClose,
  report,
  months,
  sheetName,
}) => {
  if (!isOpen) return null;

  const duplicateAnomalies = report.issues.filter(
    (i) => i.category === 'ANOMALY_DUPLICATE'
  );
  const outlierAnomalies = report.issues.filter(
    (i) => i.category === 'ANOMALY_OUTLIER'
  );
  const crossTableIssues = report.issues.filter(
    (i) => i.category === 'CROSS_TABLE' || i.category === 'GRAND_TOTAL'
  );
  const incompleteIssues = report.issues.filter(
    (i) => i.category === 'INCOMPLETE_DATA'
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quality-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#112240] rounded-t-3xl sm:rounded-2xl border border-blue-100 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-[#F4F8FF] dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 border border-blue-100 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/assets/aistudio/TTK_Logo_3d9ddd8c.png"
                alt="โลโก้ โรงพยาบาลท่าคันโท 11085"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2
                id="quality-modal-title"
                className="font-display font-bold text-base sm:text-lg text-[#0F2A6B] dark:text-white"
              >
                โรงพยาบาลท่าคันโท 11085 · รายงานตรวจสอบคุณภาพข้อมูล ({sheetName})
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                ตรวจสอบความสอดคล้องระหว่างตารางรายงวด ตารางรายเดือน และความผิดปกติรายงวด
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* 3 Rule Summary Cards: (ก), (ข), (ค) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Check (ก) */}
            <div className="p-4 rounded-2xl bg-[#F4F8FF] dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-display font-bold text-[#0F2A6B] dark:text-white">
                  (ก) ผลรวม 2 งวด = รายเดือน
                </span>
                {report.crossTablePassed ? (
                  <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {report.crossTablePassed
                  ? 'ผลรวมงวดที่ 1 + งวดที่ 2 ของทุกเดือนในตารางที่ 1 ตรงกับยอดรายเดือนในตารางที่ 2 ทุกสิทธิ'
                  : 'พบเดือนที่ผลรวมรายงวดไม่ตรงกับตารางสรุปรายเดือน'}
              </p>
            </div>

            {/* Check (ข) */}
            <div className="p-4 rounded-2xl bg-[#F4F8FF] dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-display font-bold text-[#0F2A6B] dark:text-white">
                  (ข) ยอดรวมแอป = แถว &ldquo;รวม&rdquo;
                </span>
                {report.grandTotalPassed ? (
                  <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0" />
                )}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 font-mono-num">
                <div>
                  แอปคำนวณ: {formatCurrencyTHB(report.calculatedGrandTotal, true)}
                </div>
                <div>
                  แถวรวม Sheet:{' '}
                  {report.sheetGrandTotal !== null
                    ? formatCurrencyTHB(report.sheetGrandTotal, true)
                    : '—'}
                </div>
              </div>
            </div>

            {/* Check (ค) */}
            <div className="p-4 rounded-2xl bg-[#F4F8FF] dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-display font-bold text-[#0F2A6B] dark:text-white">
                  (ค) ตรวจความผิดปกติรายงวด
                </span>
                {duplicateAnomalies.length + outlierAnomalies.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0" />
                )}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <div>
                  เฉลี่ย COCD: ฿{formatNumberTH(report.meanCocdPerPatient, 2)}/คน
                </div>
                <div>
                  เฉลี่ย SOCD: ฿{formatNumberTH(report.meanSocdPerPatient, 2)}/คน
                </div>
              </div>
            </div>
          </div>

          {/* Highlighted Anomaly Findings (e.g., Period 20260201) */}
          {(duplicateAnomalies.length > 0 || outlierAnomalies.length > 0) && (
            <div className="space-y-2.5">
              <h3 className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                รายการแจ้งเตือนความผิดปกติของข้อมูลงวด ({duplicateAnomalies.length + outlierAnomalies.length} รายการ)
              </h3>
              <div className="space-y-2">
                {[...duplicateAnomalies, ...outlierAnomalies].map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display font-bold text-amber-900 dark:text-amber-200">
                        {issue.title}
                      </span>
                      <span className="text-xs font-mono-num font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                        {issue.periodOrMonth}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-1">
                      {issue.description}
                    </p>
                    {(issue.expectedValue || issue.actualValue) && (
                      <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex flex-wrap gap-4 text-xs font-mono-num text-amber-900 dark:text-amber-200">
                        {issue.expectedValue && (
                          <span>ค่าอ้างอิง: {issue.expectedValue}</span>
                        )}
                        {issue.actualValue && (
                          <span className="font-semibold">
                            ค่าที่ตรวจพบ: {issue.actualValue}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incomplete Months Notice (e.g. ส.ค. and ก.ย. missing UC) */}
          {incompleteIssues.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
                เดือนที่ข้อมูลยังไม่ครบ ({incompleteIssues.length} เดือน)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {incompleteIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/70 dark:border-slate-700"
                  >
                    <div className="font-display font-semibold text-[#0F2A6B] dark:text-white">
                      {issue.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {issue.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Table Reconciliation Table */}
          <div className="space-y-2">
            <h3 className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white">
              ตารางเทียบยอดรวม 2 งวด (ตารางที่ 1) กับ สรุปรายเดือน (ตารางที่ 2)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F4F8FF] dark:bg-slate-800 text-[#0F2A6B] dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 font-semibold">เดือน</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      COCD (งวด 1+2)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      COCD (รายเดือน)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      SOCD (งวด 1+2)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      SOCD (รายเดือน)
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      ผลการตรวจ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono-num">
                  {months.map((m) => {
                    const ok =
                      Math.abs(m.cocdCrossTableDiff) <= 0.5 &&
                      Math.abs(m.socdCrossTableDiff) <= 0.5;
                    return (
                      <tr key={m.id}>
                        <td className="py-2 px-3 font-sans-thai font-medium text-[#0F2A6B] dark:text-white">
                          {m.monthNameThai}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrencyTHB(m.period1And2CocdSum, true)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrencyTHB(m.cocdAmount, true)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrencyTHB(m.period1And2SocdSum, true)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatCurrencyTHB(m.socdAmount, true)}
                        </td>
                        <td className="py-2 px-3 text-center font-sans-thai">
                          {ok ? (
                            <span className="inline-flex items-center gap-1 text-[#16A34A] dark:text-[#22C55E] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ตรงกัน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#EF4444] font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              ต่างกัน
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {crossTableIssues.length > 0 && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
              {crossTableIssues.map((err) => (
                <div key={err.id}>{err.description}</div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-[#F4F8FF] dark:bg-slate-900/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
