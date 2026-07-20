"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRShare({
  publicUrl,
  ownerName,
  eventName
}: {
  publicUrl: string;
  ownerName: string;
  eventName?: string;
}) {
  const displayName = ownerName.trim() || "Your NameTag";
  const displayEvent = eventName?.trim();

  return (
    <section className="w-full max-w-[min(90vw,460px)] overflow-hidden rounded-lg border border-[#e9ad88] bg-[#ffe2ce] shadow-[0_18px_40px_rgb(132_62_27_/_0.15)]">
      <div className="flex items-center justify-between border-b border-[#e9ad88] bg-[#ffbf96] px-4 py-3 sm:px-5">
        <span className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-[#742918]">NameTag</span>
        <span className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-[#742918]">Room pass</span>
      </div>
      <div className="border-b border-dashed border-[#d99168] px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="font-badge-mono text-[10px] font-black uppercase tracking-normal text-[#a6472b]">My public links</div>
            <h2 className="mt-1 truncate text-[28px] font-black leading-8 tracking-tight text-[#5f2319] sm:text-[32px]">{displayName}</h2>
            {displayEvent && <p className="mt-1 truncate text-xs font-bold text-[#8e4128]">{displayEvent}</p>}
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-full border border-[#d8825d] bg-[#fff5ec] font-badge-mono text-[10px] font-black text-[#8e4128]">
            SCAN
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex aspect-square items-center justify-center rounded-lg border border-[#e8b08d] bg-[#fff9f5] p-3 shadow-[0_7px_18px_rgb(132_62_27_/_0.08)] sm:p-5">
          <QRCodeSVG
            value={publicUrl}
            size={440}
            level="H"
            marginSize={2}
            bgColor="#fff9f5"
            fgColor="#6d291d"
            className="h-auto w-full"
            aria-label="QR code for NameTag public card"
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#e9ad88] px-4 py-3 text-[11px] font-semibold text-[#8e4128] sm:px-5">
        <span>Scan to open my links</span>
        <span className="font-badge-mono text-[9px] font-black uppercase tracking-normal">NameTag</span>
      </div>
    </section>
  );
}
