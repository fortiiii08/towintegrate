import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Crop, RotateCcw, RefreshCw } from "lucide-react";

// Crop area matches the card banner ratio (≈2:1)
const CROP_W      = 340;
const CROP_H      = 170;
const OUTPUT_W    = 800;
const OUTPUT_H    = 400;

interface Props {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onCrop: (blob: Blob) => void;
}

export function ImageCropDialog({ file, open, onClose, onCrop }: Props) {
  const [imgSrc, setImgSrc]           = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [zoom, setZoom]               = useState(1);
  const [minZoom, setMinZoom]         = useState(1);
  const [offset, setOffset]           = useState({ x: 0, y: 0 });
  const [rotation, setRotation]       = useState(0);
  const [dragging, setDragging]       = useState(false);
  const [showGrid, setShowGrid]       = useState(true);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    setRotation(0);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const effW = rotation % 180 === 0 ? naturalSize.w : naturalSize.h;
  const effH = rotation % 180 === 0 ? naturalSize.h : naturalSize.w;

  const calcMin = useCallback(
    (w: number, h: number) => Math.max(CROP_W / w, CROP_H / h),
    []
  );

  const initFromImage = useCallback((nw: number, nh: number) => {
    setNaturalSize({ w: nw, h: nh });
    const mz = Math.max(CROP_W / nw, CROP_H / nh);
    setMinZoom(mz);
    setZoom(mz);
    setOffset({
      x: -(nw * mz - CROP_W) / 2,
      y: -(nh * mz - CROP_H) / 2,
    });
  }, []);

  useEffect(() => {
    if (naturalSize.w === 1) return;
    const mz = calcMin(effW, effH);
    const z  = Math.max(zoom, mz);
    setMinZoom(mz);
    setZoom(z);
    setOffset({ x: -(effW * z - CROP_W) / 2, y: -(effH * z - CROP_H) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation]);

  const clamp = useCallback(
    (ox: number, oy: number, z: number) => ({
      x: Math.min(0, Math.max(-(effW * z - CROP_W), ox)),
      y: Math.min(0, Math.max(-(effH * z - CROP_H), oy)),
    }),
    [effW, effH]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setOffset((p) => clamp(p.x + dx, p.y + dy, zoom));
  };

  const handlePointerUp = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZ = Math.min(Math.max(zoom * (1 - e.deltaY * 0.001), minZoom), minZoom * 5);
    setZoom(newZ);
    setOffset((p) => clamp(p.x, p.y, newZ));
  };

  const handleZoomChange = (val: number[]) => {
    setZoom(val[0]);
    setOffset((p) => clamp(p.x, p.y, val[0]));
  };

  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleReset = () => {
    setRotation(0);
    const mz = calcMin(naturalSize.w, naturalSize.h);
    setMinZoom(mz);
    setZoom(mz);
    setOffset({ x: -(naturalSize.w * mz - CROP_W) / 2, y: -(naturalSize.h * mz - CROP_H) / 2 });
  };

  const handleCrop = () => {
    if (!imgSrc) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = OUTPUT_W;
      canvas.height = OUTPUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sx = -offset.x / zoom;
      const sy = -offset.y / zoom;
      const sw = CROP_W / zoom;
      const sh = CROP_H / zoom;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_W, OUTPUT_H);

      canvas.toBlob((blob) => { if (blob) onCrop(blob); }, "image/jpeg", 0.93);
    };
    img.src = imgSrc;
  };

  const displayW = effW * zoom;
  const displayH = effH * zoom;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-[#1a1a2e] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Crop className="w-4 h-4 text-[#407b75]" />
            Enquadrar foto
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">

          {/* ── Crop canvas ── */}
          <div
            className="relative overflow-hidden rounded-xl select-none"
            style={{
              width: CROP_W,
              height: CROP_H,
              cursor: dragging ? "grabbing" : "grab",
              boxShadow: "0 0 0 2px rgba(91,191,181,0.45), 0 8px 32px rgba(0,0,0,0.6)",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt="crop"
                draggable={false}
                onLoad={(e) => initFromImage(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                style={{
                  position: "absolute",
                  width: displayW,
                  height: displayH,
                  left: offset.x,
                  top: offset.y,
                  pointerEvents: "none",
                  userSelect: "none",
                  transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  transformOrigin: "center center",
                }}
              />
            )}

            {/* Grid */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 bottom-0 border-r border-white/15" style={{ left: "33.33%" }} />
                <div className="absolute top-0 bottom-0 border-r border-white/15" style={{ left: "66.66%" }} />
                <div className="absolute left-0 right-0 border-b border-white/15" style={{ top: "50%" }} />
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/70 rounded-tl" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/70 rounded-tr" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/70 rounded-bl" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/70 rounded-br" />
              </div>
            )}
          </div>

          <p className="text-white/30 text-xs -mt-1">
            Isso é exatamente o que aparece no card do cliente
          </p>

          {/* ── Controls row ── */}
          <div className="w-full flex items-center justify-between text-xs text-white/35">
            <span>Arraste · Scroll para zoom</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShowGrid((g) => !g)}
                className={`px-2 py-1 rounded-md border text-[11px] transition-colors ${
                  showGrid
                    ? "border-[#407b75]/60 text-[#5bbfb5]"
                    : "border-white/10 text-white/30 hover:text-white/50"
                }`}
              >
                grade
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded-md border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                title="Girar 90°"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-md border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                title="Resetar"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Zoom slider ── */}
          <div className="w-full flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-white/35 flex-shrink-0" />
            <Slider
              min={minZoom}
              max={minZoom * 5}
              step={0.005}
              value={[zoom]}
              onValueChange={handleZoomChange}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-white/35 flex-shrink-0" />
          </div>
        </div>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10">
            Cancelar
          </Button>
          <Button onClick={handleCrop} className="bg-[#407b75] hover:bg-[#356862] text-white gap-2">
            <Crop className="w-4 h-4" />
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
