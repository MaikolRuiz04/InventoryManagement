"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Use `undefined` (not null) for default device
        reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (!mounted) return;
          const text = result?.getText();
          if (!text) return;

          if (text.startsWith("http")) {
            window.location.href = text;
          } else {
            window.location.href = `/item/${encodeURIComponent(text)}`;
          }
        });
      } catch (e: any) {
        setErr(e?.message || "Camera error");
      }
    })();

    return () => {
      mounted = false;

      // Stop ZXing decode loop (handle different versions safely)
      const anyReader = reader as any;
      try {
        anyReader.stopContinuousDecode?.();
        anyReader.reset?.();
        anyReader.stopStreams?.();
      } catch {
        // ignore
      }

      // Also stop the camera stream
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Scan</h1>
      <video ref={videoRef} className="w-full rounded border" muted playsInline />
      {err && <p className="text-red-600">{err}</p>}
      <p className="text-sm text-gray-600">
        Tip: grant camera permission. On phones, use HTTPS (localhost is OK).
      </p>
    </div>
  );
}
