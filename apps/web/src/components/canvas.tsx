import {
  type ChangeEvent,
  type WheelEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ── Types ───────────────────────────────────────────────────────────────

export interface CanvasElement {
  id: string;
  type: "rectangle" | "ellipse" | "diamond" | "text" | "arrow" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
  points?: number[][];
}

interface CanvasProps {
  elements: CanvasElement[];
  onChange: (elements: CanvasElement[]) => void;
}

type Tool = CanvasElement["type"] | "select";

const DEFAULTS = { strokeColor: "#1e1e1e", backgroundColor: "transparent", strokeWidth: 2, fontSize: 16 } as const;

function s2c(sx: number, sy: number, tx: number, ty: number, sc: number): [number, number] {
  return [(sx - tx) / sc, (sy - ty) / sc];
}

// ── Toolbar icons (inline SVG, zero deps) ───────────────────────────────

const TOOLS: Tool[] = ["select", "rectangle", "ellipse", "diamond", "text", "arrow", "line"];
const SHORTCUTS: Record<string, Tool> = { v: "select", r: "rectangle", o: "ellipse", d: "diamond", t: "text", a: "arrow", l: "line" };
const CURSORS: Record<Tool, string> = { select: "default", rectangle: "crosshair", ellipse: "crosshair", diamond: "crosshair", text: "text", arrow: "crosshair", line: "crosshair" };

const ICONS: Record<Tool, React.ReactNode> = {
  select: <path d="M4 4l7 16 2.5-6.5L20 11z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />,
  rectangle: <rect x={4} y={6} width={16} height={12} rx={1} fill="none" stroke="currentColor" strokeWidth={1.8} />,
  ellipse: <ellipse cx={12} cy={12} rx={8} ry={6} fill="none" stroke="currentColor" strokeWidth={1.8} />,
  diamond: <polygon points="12,3 21,12 12,21 3,12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />,
  text: <g stroke="currentColor" strokeWidth={1.8} fill="none" strokeLinecap="round"><line x1={7} y1={7} x2={17} y2={7} /><line x1={12} y1={7} x2={12} y2={19} /><line x1={9} y1={19} x2={15} y2={19} /></g>,
  arrow: <g stroke="currentColor" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1={5} y1={19} x2={19} y2={5} /><polyline points="12,5 19,5 19,12" /></g>,
  line: <line x1={5} y1={19} x2={19} y2={5} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />,
};

// ── Element renderers (memoised) ────────────────────────────────────────

interface ERP {
  el: CanvasElement;
  selected: boolean;
  onDown: (id: string, e: React.PointerEvent) => void;
  onDbl: (id: string) => void;
}

function selBox(x: number, y: number, w: number, h: number) {
  return <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={5} fill="none" stroke="#4f8ff7" strokeWidth={1.5} strokeDasharray="6 3" pointerEvents="none" />;
}

const RectR = memo(function RectR({ el, selected, onDown, onDbl }: ERP) {
  return (
    <g onPointerDown={(e) => onDown(el.id, e)} onDoubleClick={() => onDbl(el.id)}>
      <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={3} fill={el.backgroundColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} />
      {selected && selBox(el.x, el.y, el.width, el.height)}
    </g>
  );
});

const EllipseR = memo(function EllipseR({ el, selected, onDown, onDbl }: ERP) {
  return (
    <g onPointerDown={(e) => onDown(el.id, e)} onDoubleClick={() => onDbl(el.id)}>
      <ellipse cx={el.x + el.width / 2} cy={el.y + el.height / 2} rx={Math.abs(el.width / 2)} ry={Math.abs(el.height / 2)} fill={el.backgroundColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} />
      {selected && selBox(el.x, el.y, el.width, el.height)}
    </g>
  );
});

const DiamondR = memo(function DiamondR({ el, selected, onDown, onDbl }: ERP) {
  const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
  const pts = `${cx},${cy - el.height / 2} ${cx + el.width / 2},${cy} ${cx},${cy + el.height / 2} ${cx - el.width / 2},${cy}`;
  return (
    <g onPointerDown={(e) => onDown(el.id, e)} onDoubleClick={() => onDbl(el.id)}>
      <polygon points={pts} fill={el.backgroundColor} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeLinejoin="round" />
      {selected && selBox(el.x, el.y, el.width, el.height)}
    </g>
  );
});

const TextR = memo(function TextR({ el, selected, onDown, onDbl }: ERP) {
  const fs = el.fontSize ?? DEFAULTS.fontSize;
  const w = Math.max(el.width, 200), h = Math.max(el.height, fs + 8);
  return (
    <g onPointerDown={(e) => onDown(el.id, e)} onDoubleClick={() => onDbl(el.id)}>
      <rect x={el.x} y={el.y} width={w} height={h} fill="transparent" />
      <foreignObject x={el.x} y={el.y} width={w} height={h}>
        <div style={{ fontSize: fs, color: el.strokeColor, lineHeight: 1.4, fontFamily: "system-ui,sans-serif", whiteSpace: "pre-wrap", wordBreak: "break-word", pointerEvents: "none", userSelect: "none" }}>
          {el.text || "Text"}
        </div>
      </foreignObject>
      {selected && selBox(el.x, el.y, w, h)}
    </g>
  );
});

function linePts(el: CanvasElement): number[][] {
  return el.points && el.points.length >= 2 ? el.points : [[el.x, el.y], [el.x + el.width, el.y + el.height]];
}

const ArrowR = memo(function ArrowR({ el, selected, onDown, onDbl }: ERP) {
  const pts = linePts(el);
  const str = pts.map((p) => p.join(",")).join(" ");
  const [lx, ly] = pts[pts.length - 2]!;
  const [ex, ey] = pts[pts.length - 1]!;
  const ang = Math.atan2(ey - ly, ex - lx);
  const hl = 12;
  const a1x = ex - hl * Math.cos(ang - Math.PI / 6), a1y = ey - hl * Math.sin(ang - Math.PI / 6);
  const a2x = ex - hl * Math.cos(ang + Math.PI / 6), a2y = ey - hl * Math.sin(ang + Math.PI / 6);
  return (
    <g onPointerDown={(e) => onDown(el.id, e)} onDoubleClick={() => onDbl(el.id)}>
      <polyline points={str} fill="none" stroke="transparent" strokeWidth={12} />
      <polyline points={str} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`${ex},${ey} ${a1x},${a1y} ${a2x},${a2y}`} fill={el.strokeColor} />
      {selected && <polyline points={str} fill="none" stroke="#4f8ff7" strokeWidth={el.strokeWidth + 4} strokeLinecap="round" opacity={0.3} pointerEvents="none" />}
    </g>
  );
});

const LineR = memo(function LineR({ el, selected, onDown, onDbl }: ERP) {
  const pts = linePts(el);
  const str = pts.map((p) => p.join(",")).join(" ");
  return (
    <g onPointerDown={(e) => onDown(el.id, e)} onDoubleClick={() => onDbl(el.id)}>
      <polyline points={str} fill="none" stroke="transparent" strokeWidth={12} />
      <polyline points={str} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {selected && <polyline points={str} fill="none" stroke="#4f8ff7" strokeWidth={el.strokeWidth + 4} strokeLinecap="round" opacity={0.3} pointerEvents="none" />}
    </g>
  );
});

const RENDERERS: Record<CanvasElement["type"], React.ComponentType<ERP>> = {
  rectangle: RectR, ellipse: EllipseR, diamond: DiamondR, text: TextR, arrow: ArrowR, line: LineR,
};

// ── Style panel ─────────────────────────────────────────────────────────

function StylePanel({ el, onUpdate }: { el: CanvasElement; onUpdate: (p: Partial<CanvasElement>) => void }) {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-lg">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Stroke
        <input type="color" value={el.strokeColor} onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate({ strokeColor: e.target.value })} className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0" />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Fill
        <input type="color" value={el.backgroundColor === "transparent" ? "#ffffff" : el.backgroundColor} onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate({ backgroundColor: e.target.value })} className="h-6 w-6 cursor-pointer rounded border border-border bg-transparent p-0" />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Width
        <input type="range" min={1} max={8} step={1} value={el.strokeWidth} onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate({ strokeWidth: Number(e.target.value) })} className="w-16" />
      </label>
    </div>
  );
}

// ── Inline text editor ──────────────────────────────────────────────────

function InlineTextEditor({ el, tx, ty, scale, onCommit }: { el: CanvasElement; tx: number; ty: number; scale: number; onCommit: (t: string) => void }) {
  const [value, setValue] = useState(el.text ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = useCallback(() => onCommit(value), [value, onCommit]);
  const fs = el.fontSize ?? DEFAULTS.fontSize;
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); commit(); } }}
      className="pointer-events-auto absolute z-30 resize-none border-none bg-transparent p-0 outline-none"
      style={{ left: el.x * scale + tx, top: el.y * scale + ty, fontSize: fs * scale, lineHeight: 1.4, fontFamily: "system-ui,sans-serif", color: el.strokeColor, minWidth: 80 * scale, minHeight: (fs + 8) * scale }}
    />
  );
}

// ── Main Canvas ─────────────────────────────────────────────────────────

interface Drag {
  kind: "create" | "move" | "pan";
  startX: number;
  startY: number;
  origX?: number;
  origY?: number;
  elementId?: string;
}

export function Canvas({ elements, onChange }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Drag | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Dark mode observer
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const selectedEl = useMemo(() => (selectedId ? elements.find((e) => e.id === selectedId) ?? null : null), [elements, selectedId]);
  const editingEl = editingId ? elements.find((e) => e.id === editingId) ?? null : null;

  // Keyboard
  useEffect(() => {
    const kd = (e: globalThis.KeyboardEvent) => {
      if (editingId) return;
      if (e.code === "Space") { e.preventDefault(); setSpaceHeld(true); }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        onChange(elements.filter((el) => el.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === "Escape") { setSelectedId(null); setTool("select"); setEditingId(null); }
      const t = SHORTCUTS[e.key.toLowerCase()];
      if (t && !e.metaKey && !e.ctrlKey) setTool(t);
    };
    const ku = (e: globalThis.KeyboardEvent) => { if (e.code === "Space") setSpaceHeld(false); };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [selectedId, elements, onChange, editingId]);

  const bbox = useCallback(() => containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }, []);

  // Pointer: down on SVG background
  const onSvgDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (editingId) return;
    const r = bbox();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;

    if (spaceHeld || e.button === 1) {
      setDragging({ kind: "pan", startX: e.clientX, startY: e.clientY, origX: tx, origY: ty });
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    if (tool === "select") { setSelectedId(null); return; }

    const [cx, cy] = s2c(sx, sy, tx, ty, scale);
    const id = crypto.randomUUID();
    const el: CanvasElement = {
      id, type: tool, x: cx, y: cy, width: 0, height: 0,
      strokeColor: isDark ? "#e2e2e2" : DEFAULTS.strokeColor,
      backgroundColor: DEFAULTS.backgroundColor,
      strokeWidth: DEFAULTS.strokeWidth,
      ...(tool === "text" ? { text: "Text", fontSize: DEFAULTS.fontSize } : {}),
      ...(tool === "arrow" || tool === "line" ? { points: [[cx, cy], [cx, cy]] } : {}),
    };
    onChange([...elements, el]);
    setSelectedId(id);
    setDragging({ kind: "create", startX: cx, startY: cy, elementId: id });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [tool, tx, ty, scale, spaceHeld, elements, onChange, bbox, isDark, editingId]);

  const onSvgMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    if (dragging.kind === "pan") {
      setTx((dragging.origX ?? 0) + e.clientX - dragging.startX);
      setTy((dragging.origY ?? 0) + e.clientY - dragging.startY);
      return;
    }
    const r = bbox();
    const [cx, cy] = s2c(e.clientX - r.left, e.clientY - r.top, tx, ty, scale);

    if (dragging.kind === "create" && dragging.elementId) {
      onChange(elements.map((el) => {
        if (el.id !== dragging.elementId) return el;
        if (el.type === "arrow" || el.type === "line") {
          return { ...el, width: cx - dragging.startX, height: cy - dragging.startY, points: [[dragging.startX, dragging.startY], [cx, cy]] };
        }
        return { ...el, x: Math.min(dragging.startX, cx), y: Math.min(dragging.startY, cy), width: Math.abs(cx - dragging.startX), height: Math.abs(cy - dragging.startY) };
      }));
    } else if (dragging.kind === "move" && dragging.elementId) {
      const dx = cx - dragging.startX, dy = cy - dragging.startY;
      onChange(elements.map((el) => {
        if (el.id !== dragging.elementId) return el;
        const moved: CanvasElement = { ...el, x: (dragging.origX ?? el.x) + dx, y: (dragging.origY ?? el.y) + dy };
        if (el.points) {
          const orig = elements.find((o) => o.id === el.id);
          if (orig?.points) moved.points = orig.points.map(([px, py]) => [px + dx, py + dy]);
        }
        return moved;
      }));
    }
  }, [dragging, tx, ty, scale, elements, onChange, bbox]);

  const onSvgUp = useCallback(() => {
    if (dragging?.kind === "create" && tool !== "select") setTool("select");
    setDragging(null);
  }, [dragging, tool]);

  // Element pointer down (select/move)
  const onElDown = useCallback((id: string, e: React.PointerEvent) => {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(id);
    const r = bbox();
    const [cx, cy] = s2c(e.clientX - r.left, e.clientY - r.top, tx, ty, scale);
    const el = elements.find((el) => el.id === id);
    setDragging({ kind: "move", startX: cx, startY: cy, origX: el?.x, origY: el?.y, elementId: id });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [tool, tx, ty, scale, elements, bbox]);

  const onElDbl = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (el?.type === "text") setEditingId(id);
  }, [elements]);

  // Wheel zoom
  const onWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const r = bbox();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const f = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const ns = Math.min(5, Math.max(0.1, scale * f));
    setTx(mx - (mx - tx) * (ns / scale));
    setTy(my - (my - ty) * (ns / scale));
    setScale(ns);
  }, [scale, tx, ty, bbox]);

  const onStyleUpdate = useCallback((p: Partial<CanvasElement>) => {
    if (!selectedId) return;
    onChange(elements.map((el) => (el.id === selectedId ? { ...el, ...p } : el)));
  }, [selectedId, elements, onChange]);

  const onTextCommit = useCallback((text: string) => {
    if (!editingId) return;
    onChange(elements.map((el) => (el.id === editingId ? { ...el, text } : el)));
    setEditingId(null);
  }, [editingId, elements, onChange]);

  const dotColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const gs = 24;
  const cursor = spaceHeld || dragging?.kind === "pan" ? "grab" : CURSORS[tool];

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ cursor }}>
      {/* Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-border bg-card px-1.5 py-1 shadow-md">
          {TOOLS.map((t) => (
            <button
              key={t}
              onClick={() => { setTool(t); setSelectedId(null); }}
              title={`${t.charAt(0).toUpperCase()}${t.slice(1)} (${t[0]})`}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${tool === t ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
            >
              <svg viewBox="0 0 24 24" width={18} height={18}>{ICONS[t]}</svg>
            </button>
          ))}
        </div>
      </div>

      {/* SVG */}
      <svg
        className="h-full w-full"
        onPointerDown={onSvgDown}
        onPointerMove={onSvgMove}
        onPointerUp={onSvgUp}
        onWheel={onWheel}
        tabIndex={0}
        style={{ touchAction: "none" }}
      >
        <defs>
          <pattern id="qb-dots" x={tx % (gs * scale)} y={ty % (gs * scale)} width={gs * scale} height={gs * scale} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={1} fill={dotColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#qb-dots)" />
        <g transform={`translate(${tx},${ty}) scale(${scale})`}>
          {elements.map((el) => {
            const R = RENDERERS[el.type];
            return <R key={el.id} el={el} selected={el.id === selectedId} onDown={onElDown} onDbl={onElDbl} />;
          })}
        </g>
      </svg>

      {/* Inline text editor */}
      {editingEl && <InlineTextEditor el={editingEl} tx={tx} ty={ty} scale={scale} onCommit={onTextCommit} />}

      {/* Style panel */}
      {selectedEl && !editingId && <StylePanel el={selectedEl} onUpdate={onStyleUpdate} />}
    </div>
  );
}
