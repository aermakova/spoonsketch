import React from 'react';
import Svg, { Defs, Pattern, Rect, Line, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import type { CookbookPaperType } from '../../types/cookbook';

interface Props {
  type: CookbookPaperType;
  width: number;
  height: number;
}

// Geometry tuned for a ~560px design width. Values are absolute px on the
// page — the containing View already scales the whole canvas, so absolute
// pixels here give the same visual density across screen sizes.
const LINE_STEP = 28;
const DOT_STEP = 16;
const GRID_STEP = 24;
const TOP_MARGIN = 56; // leaves space for title / hero on every template

const PATTERN_STROKE = colors.inkFaint;

export function PaperPattern({ type, width, height }: Props) {
  if (type === 'blank') return null;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {type === 'lined' && <LinedPattern width={width} height={height} />}
      {type === 'dotted' && <DottedPattern width={width} height={height} />}
      {type === 'grid' && <GridPattern width={width} height={height} />}
    </Svg>
  );
}

function LinedPattern({ width, height }: { width: number; height: number }) {
  const lines: React.ReactElement[] = [];
  for (let y = TOP_MARGIN; y < height; y += LINE_STEP) {
    lines.push(
      <Line
        key={y}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={PATTERN_STROKE}
        strokeWidth={1}
        strokeOpacity={0.35}
      />,
    );
  }
  return <>{lines}</>;
}

function DottedPattern({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Defs>
        <Pattern
          id="dotted"
          x={0}
          y={TOP_MARGIN}
          width={DOT_STEP}
          height={DOT_STEP}
          patternUnits="userSpaceOnUse"
        >
          <Circle
            cx={DOT_STEP / 2}
            cy={DOT_STEP / 2}
            r={1.2}
            fill={PATTERN_STROKE}
            fillOpacity={0.45}
          />
        </Pattern>
      </Defs>
      <Rect
        x={0}
        y={TOP_MARGIN}
        width={width}
        height={height - TOP_MARGIN}
        fill="url(#dotted)"
      />
    </>
  );
}

function GridPattern({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Defs>
        <Pattern
          id="grid"
          x={0}
          y={TOP_MARGIN}
          width={GRID_STEP}
          height={GRID_STEP}
          patternUnits="userSpaceOnUse"
        >
          <Line
            x1={0}
            y1={0}
            x2={GRID_STEP}
            y2={0}
            stroke={PATTERN_STROKE}
            strokeWidth={0.75}
            strokeOpacity={0.3}
          />
          <Line
            x1={0}
            y1={0}
            x2={0}
            y2={GRID_STEP}
            stroke={PATTERN_STROKE}
            strokeWidth={0.75}
            strokeOpacity={0.3}
          />
        </Pattern>
      </Defs>
      <Rect
        x={0}
        y={TOP_MARGIN}
        width={width}
        height={height - TOP_MARGIN}
        fill="url(#grid)"
      />
    </>
  );
}
