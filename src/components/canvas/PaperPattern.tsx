import React from 'react';
import Svg, { Defs, Pattern, Rect, Line, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import type { CookbookPaperType } from '../../types/cookbook';

interface Props {
  type: CookbookPaperType;
  width: number;
  height: number;
}

// Geometry scales to A4 physical size (210mm wide) so pattern density
// matches real stationery regardless of rendered canvas width.
const A4_WIDTH_MM = 210;
const LINE_MM = 8;   // standard notebook ruling
const DOT_MM = 5;    // bullet journal grid
const GRID_MM = 5;   // graph paper squares
const TOP_MARGIN_MM = 0;

const PATTERN_STROKE = colors.inkFaint;

export function PaperPattern({ type, width, height }: Props) {
  if (type === 'blank') return null;

  const mm = width / A4_WIDTH_MM;
  const lineStep = LINE_MM * mm;
  const dotStep = DOT_MM * mm;
  const gridStep = GRID_MM * mm;
  const topMargin = TOP_MARGIN_MM * mm;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {type === 'lined' && <LinedPattern width={width} height={height} step={lineStep} topMargin={topMargin} />}
      {type === 'dotted' && <DottedPattern width={width} height={height} step={dotStep} topMargin={topMargin} />}
      {type === 'grid' && <GridPattern width={width} height={height} step={gridStep} topMargin={topMargin} />}
    </Svg>
  );
}

function LinedPattern({ width, height, step, topMargin }: { width: number; height: number; step: number; topMargin: number }) {
  const lines: React.ReactElement[] = [];
  for (let y = topMargin; y < height; y += step) {
    lines.push(
      <Line
        key={y}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={PATTERN_STROKE}
        strokeWidth={0.75}
        strokeOpacity={0.4}
      />,
    );
  }
  return <>{lines}</>;
}

function DottedPattern({ width, height, step, topMargin }: { width: number; height: number; step: number; topMargin: number }) {
  return (
    <>
      <Defs>
        <Pattern
          id="dotted"
          x={0}
          y={topMargin}
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
        >
          <Circle
            cx={step / 2}
            cy={step / 2}
            r={0.5}
            fill={PATTERN_STROKE}
            fillOpacity={0.6}
          />
        </Pattern>
      </Defs>
      <Rect
        x={0}
        y={topMargin}
        width={width}
        height={height - topMargin}
        fill="url(#dotted)"
      />
    </>
  );
}

function GridPattern({ width, height, step, topMargin }: { width: number; height: number; step: number; topMargin: number }) {
  return (
    <>
      <Defs>
        <Pattern
          id="grid"
          x={0}
          y={topMargin}
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
        >
          <Line
            x1={0}
            y1={0}
            x2={step}
            y2={0}
            stroke={PATTERN_STROKE}
            strokeWidth={0.5}
            strokeOpacity={0.3}
          />
          <Line
            x1={0}
            y1={0}
            x2={0}
            y2={step}
            stroke={PATTERN_STROKE}
            strokeWidth={0.5}
            strokeOpacity={0.3}
          />
        </Pattern>
      </Defs>
      <Rect
        x={0}
        y={topMargin}
        width={width}
        height={height - topMargin}
        fill="url(#grid)"
      />
    </>
  );
}
