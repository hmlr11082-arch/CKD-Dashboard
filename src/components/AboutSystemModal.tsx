import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Code2,
  Copy,
  Database,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

interface AboutSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APPS_SCRIPT_SNIPPET = `var DEFAULT_SPREADSHEET_ID = '1shG_tr85INBLD_Vvc56SG6BSQte6z4U56uWVTdOogy4';
var DEFAULT_SHEET_NAME = 'ฟอกไต 2569';

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var ss = SpreadsheetApp.openById(params.id || DEFAULT_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(params.sheet || DEFAULT_SHEET_NAME) || ss.getSheets()[0];
  var values = sheet.getDataRange().getDisplayValues();
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    sheetName: sheet.getName(),
    updatedAt: new Date().toISOString(),
    rows: values
  })).setMimeType(ContentService.MimeType.JSON);
}`;

export const AboutSystemModal: React.FC<AboutSystemModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
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
                id="about-modal-title"
                className="font-display font-bold text-base sm:text-lg text-[#0F2A6B] dark:text-white"
              >
                โรงพยาบาลท่าคันโท 11085 · เกี่ยวกับระบบ &amp; ผังการทำงาน
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                ระบบ Dashboard การส่งเบิกค่าฟอกไต เชื่อมต่อ Google Sheets แบบ Real-time
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Visual Architecture Flow Diagram */}
          <div className="p-4 rounded-2xl bg-[#F4F8FF] dark:bg-slate-900/80 border border-blue-100 dark:border-slate-800 space-y-3">
            <h3 className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
              ผังการทำงานของตัวดึงข้อมูล 3 ระดับ (Fallback Chain &amp; Real-time Polling)
            </h3>

            {/* Step 1: Boot & Fetch Chain */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-[#112240] border border-blue-200 dark:border-slate-700">
                <div className="font-display font-bold text-[#1D4ED8] dark:text-[#38BDF8] mb-1">
                  ระดับ 1 (หลัก): gviz CSV
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  ดึงจาก Google Visualization Endpoint พร้อม Cache-busting (`cache: &quot;no-store&quot;`) อัปเดตเกือบ Real-time ทันทีที่แก้ใน Sheet
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#112240] border border-blue-100 dark:border-slate-700">
                <div className="font-display font-bold text-[#0F2A6B] dark:text-white mb-1">
                  ระดับ 2 (สำรอง): Published CSV
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  หากระดับ 1 ไม่สำเร็จ ระบบสลับไปใช้ลิงก์ Publish to Web (`output=csv`) อัตโนมัติ พร้อมแจ้งเตือนความล่าช้าราว 5 นาที
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#112240] border border-blue-100 dark:border-slate-700">
                <div className="font-display font-bold text-[#0F2A6B] dark:text-white mb-1">
                  ระดับ 3 (CORS): Apps Script
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  ทางเลือกเมื่อเครือข่ายบล็อก CSV โดยเรียกผ่าน Google Apps Script Web App (`doGet()`) ที่คืนค่า JSON ทั้งชีต
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowDown className="w-4 h-4 text-[#1D4ED8]" />
            </div>

            {/* Step 2: Parse, Clean, Validate, Poll */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-[#112240] border border-blue-100 dark:border-slate-700 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-[#0F2A6B] dark:text-white">
                    Parse CSV → Clean + Validate อัตโนมัติ
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    แยกตารางรายงวด (A–G) และรายเดือน (I–M) แปลงค่าว่างเป็น `null` (ไม่นับเป็น 0) ตรวจยอดรวมเทียบแถว &ldquo;รวม&rdquo; และจับความผิดปกติรายงวด (เช่น งวด 20260201)
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#112240] border border-blue-100 dark:border-slate-700 flex items-start gap-2.5">
                <RefreshCw className="w-5 h-5 text-[#1D4ED8] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                <div>
                  <div className="font-display font-bold text-[#0F2A6B] dark:text-white">
                    Smart Polling &amp; Diff Highlight
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    ดึงซ้ำทุก 15 วินาที (หยุดพักเมื่อซ่อนแท็บ) เปรียบเทียบ Hash ของข้อมูล หากมีการแก้ไขจะอัปเดตกราฟทันทีพร้อม Highlight ตัวเลขและแจ้งเตือน Toast
                  </p>
                </div>
              </div>
            </div>

            {/* ASCII/Flow Summary Box as specified in section 4 */}
            <div className="p-3 rounded-xl bg-slate-900 text-sky-100 font-mono-num text-[11px] leading-relaxed overflow-x-auto">
              <div>เปิดแอป → โหลดค่าตั้งต้นจาก localStorage → ลองดึงข้อมูลระดับ 1 (gviz CSV)</div>
              <div> ├─ สำเร็จ → Parse CSV → Clean + Validate → แสดง Dashboard → ตั้ง Polling</div>
              <div> │            └─ ทุกรอบ: ดึงข้อมูล → ตรวจ Hash → (เปลี่ยน: อัปเดต state + highlight + toast)</div>
              <div> └─ ล้มเหลว → ลองระดับ 2 (Published CSV) → ลองระดับ 3 (Apps Script)</div>
              <div>      └─ ถ้าทุกระดับล้มเหลว → แจ้งเตือนภาษาไทย + ใช้ข้อมูลแคชออฟไลน์ / ข้อมูลจำลอง</div>
            </div>
          </div>

          {/* User Workflow */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <h3 className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white mb-2">
              ขั้นตอนการใช้งานของผู้ใช้ (User Journey)
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
              <span>1. เลือกปีงบประมาณ (2569 / 2568)</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>2. กรองสิทธิ / ช่วงเดือน</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>3. แตะชิ้นกราฟ Donut เพื่อกรองเร็ว</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>4. ค้นหา/เรียงลำดับตาราง &amp; Export CSV</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>5. สลับโหมด มือถือ / เดสก์ท็อป</span>
            </div>
          </div>

          {/* Apps Script Code Snippet for Tier 3 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-bold text-sm text-[#0F2A6B] dark:text-white flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#1D4ED8] dark:text-[#38BDF8]" />
                โค้ด Google Apps Script สำหรับระดับ 3 (ไฟล์ docs/apps-script.gs)
              </h3>
              <button
                type="button"
                onClick={handleCopyScript}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-[#E0F2FE] dark:bg-slate-800 text-[#1D4ED8] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกโค้ด</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono-num text-[11px] overflow-x-auto leading-relaxed">
              {APPS_SCRIPT_SNIPPET}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-[#F4F8FF] dark:bg-slate-900/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium transition-colors"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
};
