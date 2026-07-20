"use client";

import { QRCodeSVG } from "qrcode.react";

export function QRShare({ publicUrl }: { publicUrl: string }) {
  return (
    <div className="flex aspect-square w-full max-w-[min(90vw,460px)] items-center justify-center rounded-lg border border-line bg-white p-3 shadow-sm sm:p-5">
      <QRCodeSVG
        value={publicUrl}
        size={440}
        level="H"
        bgColor="#ffffff"
        fgColor="#182235"
        className="h-auto w-full"
        aria-label="QR code for NameTag public card"
      />
    </div>
  );
}
