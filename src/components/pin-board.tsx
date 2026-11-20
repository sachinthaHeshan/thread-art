"use client";

import { useEffect, useRef, useState } from "react";
import { pinPositions } from "@/lib/pins";
import {
  BOARD_CENTER,
  BOARD_RADIUS,
  BOARD_VIEW,
  LABEL_RADIUS,
  renderBoard,
  type ThreadSegment,
} from "@/lib/thread-pattern";

const LABEL_SIZE = 11;

export function PinBoard({
  pinCount,
  threads,
  step,
  lineCount,
  weight,
  crossing,
}: {
  pinCount: number;
  threads: ThreadSegment[];
  step: number;
  lineCount: number;
  weight: number;
  crossing: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = Math.min(Math.max(0, step), threads.length);
  const pins = pinPositions(pinCount, BOARD_CENTER, BOARD_RADIUS);
  const labels = pinPositions(pinCount, BOARD_CENTER, LABEL_RADIUS);
  const spacing = (Math.PI * 2 * BOARD_RADIUS) / pinCount;
  const dotRadius = Math.min(3.2, Math.max(1.05, spacing * 0.22));
  const shownLabels = new Set(labelIndexes(pinCount));
  const hoverLabel = hovered === null ? null : labels[hovered];
  const hoverText = hovered === null ? "" : String(hovered + 1);
  const hoverWidth = Math.max(22, hoverText.length * 7.4 + 12);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const size = 760;
    canvas.width = size;
    canvas.height = size;
    const pixels = renderBoard(threads.slice(0, shown), pinCount, size, lineCount, { weight, crossing });
    context.putImageData(new ImageData(pixels, size, size), 0, 0);
  }, [crossing, lineCount, pinCount, shown, threads, weight]);

  function trackPin(event: React.PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const local = point.matrixTransform(matrix.inverse());
    setHovered(pinAt(local.x, local.y, pinCount));
  }

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <canvas ref={canvasRef} className="block h-auto w-full" />
      <svg
        viewBox={`0 0 ${BOARD_VIEW} ${BOARD_VIEW}`}
        role="img"
        aria-label={`White board with ${pinCount} pins and ${shown} black threads`}
        className="absolute inset-0 h-full w-full"
        onPointerMove={trackPin}
        onPointerLeave={() => setHovered(null)}
      >
        <circle
          cx={BOARD_CENTER}
          cy={BOARD_CENTER}
          r={BOARD_RADIUS}
          fill="none"
          stroke="#e7e1d8"
        />
        {labels.map((label, index) =>
          shownLabels.has(index) && !coveredByHover(label, hoverLabel) ? (
            <text
              key={`label-${index}`}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#5f5952"
              fontSize={LABEL_SIZE}
              fontFamily="var(--font-geist), ui-sans-serif, system-ui, sans-serif"
            >
              {index + 1}
            </text>
          ) : null,
        )}
        {pins.map((pin, index) => (
          <circle
            key={`pin-${index}`}
            cx={pin.x}
            cy={pin.y}
            r={index === hovered ? Math.max(dotRadius, 2.4) : dotRadius}
            fill="#171614"
          />
        ))}
        {hoverLabel && hovered !== null ? (
          <g>
            <rect
              x={hoverLabel.x - hoverWidth / 2}
              y={hoverLabel.y - 10}
              width={hoverWidth}
              height={20}
              rx={10}
              fill="#fffcf8"
              stroke="#e4dfd6"
            />
            <text
              x={hoverLabel.x}
              y={hoverLabel.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#171614"
              fontSize={LABEL_SIZE}
              fontWeight={600}
              fontFamily="var(--font-geist), ui-sans-serif, system-ui, sans-serif"
            >
              {hoverText}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function labelIndexes(pinCount: number) {
  const digits = String(pinCount).length;
  const slot = LABEL_SIZE * (digits * 0.72 + 0.9);
  const room = Math.max(8, Math.floor((Math.PI * 2 * LABEL_RADIUS) / slot));
  const stride = Math.max(1, Math.ceil(pinCount / room));
  const indexes: number[] = [];
  for (let index = 0; index < pinCount; index += stride) {
    if (index > 0 && pinCount - index < stride) break;
    indexes.push(index);
  }
  return indexes;
}

function coveredByHover(
  label: { x: number; y: number },
  hover: { x: number; y: number } | null,
) {
  if (!hover) return false;
  return Math.hypot(label.x - hover.x, label.y - hover.y) < 26;
}

function pinAt(x: number, y: number, pinCount: number) {
  const dx = x - BOARD_CENTER;
  const dy = y - BOARD_CENTER;
  if (Math.abs(Math.hypot(dx, dy) - BOARD_RADIUS) > 16) return null;
  const turns = (Math.atan2(dy, dx) + Math.PI / 2) / (Math.PI * 2);
  return ((Math.round(turns * pinCount) % pinCount) + pinCount) % pinCount;
}
