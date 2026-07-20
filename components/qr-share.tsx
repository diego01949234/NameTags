"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRShare({ publicUrl }: { publicUrl: string }) {
  return (
    <section className="w-full max-w-[min(90vw,460px)] overflow-hidden rounded-xl border border-[#f3c2a7] bg-[#fff0e5] shadow-[0_18px_40px_rgb(127_62_27_/_0.14)]">
      <div className="flex items-center justify-between border-b border-[#f3c2a7] px-4 py-3 sm:px-5">
        <span className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-[#a6472b]">NameTag</span>
        <span className="text-xs font-bold text-[#7f412b]">Scan to connect</span>
      </div>
      <div className="p-3 sm:p-5">
        <div className="flex aspect-square items-center justify-center rounded-lg border border-[#f0c4ac] bg-white p-3 shadow-sm sm:p-5">
          <QRCodeSVG
            value={publicUrl}
            size={440}
            level="H"
            marginSize={2}
            bgColor="#fff0e5"
            fgColor="#182235"
            className="h-auto w-full"
            aria-label="QR code for NameTag public card"
          />
        </div>
      </div>
      <div className="border-t border-[#f3c2a7] px-4 py-3 text-center text-[11px] font-semibold text-[#7f412b] sm:px-5">
        Opens a focused card with only the links you chose.
      </div>
    </section>
  );
}
