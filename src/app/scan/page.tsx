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

        const vid = videoRef.current;
        if (!vid) return;

        vid.srcObject = stream;
        await vid.play();

        reader.decodeFromVideoDevice(undefined, vid, (result) => {
          if (!mounted) return;
          const text = result?.getText();
          if (!text) return;

          if (text.startsWith("http")) {
            window.location.href = text;
          } else {
            window.location.href = `/item/${encodeURIComponent(text)}`;
          }
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErr(msg || "Camera error");
      }
    })();

    return () => {
      mounted = false;

      // Stop ZXing (defensive across versions)
      const anyReader = reader as unknown as {
        stopContinuousDecode?: () => void;
        reset?: () => void;
        stopStreams?: () => void;
      };
      try {
        anyReader.stopContinuousDecode?.();
        anyReader.reset?.();
        anyReader.stopStreams?.();
      } catch {}

      // Stop camera
      const vid = videoRef.current;
      const stream = (vid?.srcObject as MediaStream | null) || null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Scan</h1>
      <video ref={videoRef} className="w-full rounded border" muted playsInline />
      {err && <p className="text-red-600">{err}</p>}
      <p className="text-sm text-gray-600">Tip: on phones, use your HTTPS Vercel URL.</p>
    </div>
  );
}
