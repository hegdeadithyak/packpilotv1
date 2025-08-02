"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, QrCode, Trash2, Package, X } from "lucide-react";
import { useOptimizationStore } from "@/store/optimization-store";
import type { Box } from "@/types/box";

/* -------------------------------------------------------------------------- */
/*                               QR Utilities                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validate JSON text coming from a QR code and coerce it to a `Box` payload
 * (without runtime-generated properties such as `id`, `position`, `isNew`).
 */
function parseBoxQR(qr: string): Omit<Box, "id" | "position" | "isNew"> {
  let raw: any;
  try {
    raw = JSON.parse(qr);
  } catch {
    throw new Error("QR data is not valid JSON");
  }

  const required = [
    "name",
    "width",
    "height",
    "length",
    "weight",
    "temperatureZone",
    "destination",
  ];

  const missing = required.filter(
    (k) => raw[k] === undefined || raw[k] === null
  );
  if (missing.length) throw new Error(`Missing fields: ${missing.join(", ")}`);

  for (const n of ["width", "height", "length", "weight"]) {
    if (!(typeof raw[n] === "number" && raw[n] > 0)) {
      throw new Error(`${n} must be a positive number`);
    }
  }

  if (![`regular`, `cold`, `frozen`].includes(raw.temperatureZone)) {
    throw new Error("temperatureZone must be regular, cold or frozen");
  }
  if (![`Stop 1`, `Stop 2`, `Stop 3`, `Stop 4`].includes(raw.destination)) {
    throw new Error("destination must be one of the predefined stops");
  }
  alert("QR Scan Successful");
  return {
    name: String(raw.name).trim(),
    width: raw.width,
    height: raw.height,
    length: raw.length,
    weight: raw.weight,
    temperatureZone: raw.temperatureZone,
    isFragile: Boolean(raw.isFragile),
    destination: raw.destination,
  };
}

/**
 * Stubbed QR-pattern detector. Replace with `jsqr`, `@zxing/browser`, etc.
 */
import jsQR from "jsqr";

function detectQR(frame: ImageData): string | null {
  // jsQR consumes the raw RGBA byte-array plus frame dimensions.
  console.log(frame);
  const { data, width, height } = frame;
  const result = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
  return result ? result.data : null;
}

/* -------------------------------------------------------------------------- */
/*                               Component                                    */
/* -------------------------------------------------------------------------- */

export function BoxManager() {
  /* ----------------------------- global store ----------------------------- */
  const { boxes, addBox, removeBox } = useOptimizationStore();

  /* ------------------------------ local state ----------------------------- */
  const [showScanner, setShowScanner] = useState(false);
  const [qrText, setQrText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const [draft, setDraft] = useState<Partial<Box>>({
    name: "",
    width: 1,
    height: 1,
    length: 1,
    weight: 10,
    temperatureZone: "regular",
    isFragile: false,
    destination: "Stop 1",
  });

  /* ------------------------------- refs ----------------------------------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ------------------------- camera lifecycle ----------------------------- */
  const stopCamera = () => {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    c.width = v.videoWidth;
    c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const candidate = detectQR(ctx.getImageData(0, 0, c.width, c.height));
    if (candidate) handleQr(candidate);
  };

  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          await videoRef.current?.play();
          timerRef.current = setInterval(scanFrame, 150);
        };
      }
    } catch (err) {
      console.error(err);
      setError(
        "Unable to access camera – grant permission or use manual entry."
      );
    }
  };

  useEffect(() => {
    showScanner ? startCamera() : stopCamera();
    return () => stopCamera();
  }, [showScanner]);

  /* ----------------------------- handlers --------------------------------- */
  const resetDraft = () =>
    setDraft({
      name: "",
      width: 1,
      height: 1,
      length: 1,
      weight: 10,
      temperatureZone: "regular",
      isFragile: false,
      destination: "Stop 1",
    });

  const addBoxToStore = (payload: Omit<Box, "id" | "position" | "isNew">) => {
    addBox({
      id: `box-${Date.now()}`,
      ...payload,
      position: { x: 0, y: 0.5, z: 0 },
      isNew: true,
    });
  };

  const handleQr = (txt: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      addBoxToStore(parseBoxQR(txt));
      setShowScanner(false);
      setQrText("");
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const handleManualSubmit = () => {
    if (!qrText.trim()) return;
    handleQr(qrText.trim());
  };

  const handleAddClick = () => {
    if (!draft.name?.trim()) return;
    addBoxToStore({
      name: draft.name.trim(),
      width: draft.width ?? 1,
      height: draft.height ?? 1,
      length: draft.length ?? 1,
      weight: draft.weight ?? 10,
      temperatureZone: draft.temperatureZone ?? "regular",
      isFragile: draft.isFragile ?? false,
      destination: draft.destination ?? "Stop 1",
    });
    resetDraft();
  };

  /* ---------------------------------------------------------------------- */
  /*                                  UI                                   */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="space-y-4">
      {/* ────────────────────── New Box Card ────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-primary">
            <Plus className="h-4 w-4 mr-2" /> Add New Box
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!showScanner ? (
            <>
              {/* ----------------------------- form ----------------------------- */}
              <div>
                <Label htmlFor="name" className="text-xs text-muted-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Box name"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { k: "width", label: "Width" },
                    { k: "height", label: "Height" },
                    { k: "length", label: "Length" },
                  ] as const
                ).map(({ k, label }) => (
                  <div key={k}>
                    <Label className="text-xs text-muted-foreground">
                      {label}
                    </Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={draft[k] as number}
                      onChange={(e) =>
                        setDraft({ ...draft, [k]: parseFloat(e.target.value) })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Weight (lbs)
                </Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={draft.weight}
                  onChange={(e) =>
                    setDraft({ ...draft, weight: parseFloat(e.target.value) })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Temperature Zone
                </Label>
                <Select
                  value={draft.temperatureZone}
                  onValueChange={(v) =>
                    setDraft({ ...draft, temperatureZone: v as any })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["regular", "cold", "frozen"] as const).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Destination
                </Label>
                <Select
                  value={draft.destination}
                  onValueChange={(v) => setDraft({ ...draft, destination: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Stop 1", "Stop 2", "Stop 3", "Stop 4"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fragile"
                  checked={draft.isFragile}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, isFragile: v as boolean })
                  }
                />
                <Label
                  htmlFor="fragile"
                  className="text-xs text-muted-foreground"
                >
                  Fragile Item
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleAddClick} className="h-8 text-xs">
                  Add Box
                </Button>
                <Button
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setShowScanner(true)}
                >
                  <QrCode className="h-4 w-4 mr-1" /> Scan QR
                </Button>
              </div>
            </>
          ) : (
            /* --------------------------- Scanner UI --------------------------- */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">QR Code Scanner</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScanner(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div
                className="relative bg-black rounded-lg overflow-hidden"
                style={{ aspectRatio: "4 / 3" }}
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50" />
                </div>
              </div>

              <div className="text-xs text-center">
                <span className="text-muted-foreground">
                  Align QR code within the square
                </span>
                {busy && <span className="ml-2 text-primary">Scanning…</span>}
              </div>

              {error && (
                <div className="text-xs text-destructive bg-destructive/10 text-center p-2 rounded">
                  {error}
                </div>
              )}

              <div className="border-t pt-2">
                <Label className="text-xs text-muted-foreground">
                  Or paste JSON manually:
                </Label>
                <textarea
                  className="w-full h-20 px-2 py-1 text-xs border rounded-md resize-none mt-1"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder='{"name":"Box1","width":10,"height":5,"length":8,"weight":15,"temperatureZone":"regular","destination":"Stop 1"}'
                />
              </div>

              <Button
                className="w-full h-8 text-xs"
                disabled={!qrText.trim() || busy}
                onClick={handleManualSubmit}
              >
                {busy ? "Processing…" : "Add Box from JSON"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─────────────────────── Current Boxes ─────────────────────── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center text-primary">
            <Package className="h-4 w-4 mr-2" /> Current Boxes ({boxes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {boxes.length === 0 && (
              <div className="text-center text-muted-foreground/70 py-4">
                No boxes added yet
              </div>
            )}
            {boxes.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground truncate max-w-[60%]">
                    {b.name}
                  </div>
                  <div className="text-muted-foreground">
                    {b.width}×{b.height}×{b.length} | {b.weight}lbs
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span
                      className={`px-1 py-0.5 rounded text-xs font-medium ${
                        b.temperatureZone === "frozen"
                          ? "bg-primary/20 text-primary"
                          : b.temperatureZone === "cold"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-secondary/20 text-secondary"
                      }`}
                    >
                      {b.temperatureZone}
                    </span>
                    {b.isFragile && (
                      <span className="px-1 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-medium">
                        FRAGILE
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      → {b.destination}
                    </span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeBox(b.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
