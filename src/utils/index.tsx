import { ColorValue } from "react-native";
import { lineDataItem } from "../LineChart/types";
import {
  AxesAndRulesDefaults,
  BarDefaults,
  RANGE_ENTER,
  RANGE_EXIT,
  STOP,
  defaultLineConfig,
  loc,
} from "./constants";
import {
  arrowConfigType,
  CurveType,
  LineProperties,
  LineSegment,
} from "./types";
import { FocusedBarConfig } from "../BarChart/types";

const versionString = require("react-native/package.json").version;

const versionAr = versionString?.split?.(".") ?? "";
const msb = Number(versionAr[0]);
const mid = Number(versionAr[1]);
const lsb = Number(versionAr[2]);

export const rnVersion =
  (!isNaN(msb) ? msb : 0) * 1000000 +
  (!isNaN(mid) ? mid : 0) * 10000 +
  (!isNaN(lsb) ? lsb : 0);

export const getCumulativeWidth = (
  data: any,
  index: number,
  spacing: number
) => {
  let cumWidth = 0;
  for (let i = 0; i < index; i++) {
    let { barWidth } = data[i];
    barWidth = barWidth || 30;
    cumWidth += barWidth + (spacing ?? 20);
  }
  return cumWidth;
};

export const getLighterColor = (color: String) => {
  let r,
    g,
    b,
    lighter = "#";
  if (color.startsWith("#")) {
    if (color.length < 7) {
      r = parseInt(color[1], 16);
      g = parseInt(color[2], 16);
      b = parseInt(color[3], 16);
      if (r < 14) {
        r += 2;
        lighter += r.toString(16);
      }
      if (g < 14) {
        g += 2;
        lighter += g.toString(16);
      }
      if (b < 14) {
        b += 2;
        lighter += b.toString(16);
      }
    } else {
      r = parseInt(color[1] + color[2], 16);
      g = parseInt(color[3] + color[4], 16);
      b = parseInt(color[5] + color[6], 16);

      if (r < 224) {
        r += 32;
        lighter += r.toString(16);
      }
      if (g < 224) {
        g += 32;
        lighter += g.toString(16);
      }
      if (b < 224) {
        b += 32;
        lighter += b.toString(16);
      }
    }
  }
  return lighter;
};

export const svgQuadraticCurvePath = (points: number[][]) => {
  let path = "M" + points[0][0] + "," + points[0][1];

  for (let i = 0; i < points.length - 1; i++) {
    const xMid = (points[i][0] + points[i + 1][0]) / 2;
    const yMid = (points[i][1] + points[i + 1][1]) / 2;
    const cpX1 = (xMid + points[i][0]) / 2;
    const cpX2 = (xMid + points[i + 1][0]) / 2;
    path +=
      "Q " +
      cpX1 +
      ", " +
      points[i][1] +
      ", " +
      xMid +
      ", " +
      yMid +
      (" Q " +
        cpX2 +
        ", " +
        points[i + 1][1] +
        ", " +
        points[i + 1][0] +
        ", " +
        points[i + 1][1]);
  }

  return path;
};

export const svgPath = (
  points: Array<Array<number>>,
  curveType: CurveType,
  curvature: number
) => {
  if (!points?.length) return "";
  if (curveType === CurveType.QUADRATIC) {
    return svgQuadraticCurvePath(points);
  }
  // build the d attributes by looping over the points
  const d = points.reduce(
    (acc, point, i, a) =>
      i === 0
        ? // if first point
          `M${point[0]},${point[1]}`
        : // else
          `${acc} ${bezierCommand(point, i, a, curvature)}`,
    ""
  );
  return d;
};

const line = (pointA: Array<number>, pointB: Array<number>) => {
  const lengthX = pointB[0] - pointA[0];
  const lengthY = pointB[1] - pointA[1];
  return {
    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
    angle: Math.atan2(lengthY, lengthX),
  };
};

const controlPoint = (
  curvature: number,
  current: Array<number>,
  previous: Array<number>,
  next: Array<number>,
  reverse?: any
) => {
  // When 'current' is the first or last point of the array
  // 'previous' or 'next' don't exist.
  // Replace with 'current'
  const p = previous || current;
  const n = next || current;
  // The smoothing ratio
  const smoothing = curvature;
  // Properties of the opposed-line
  const o = line(p, n);
  // If is end-control-point, add PI to the angle to go backward
  const angle = o.angle + (reverse ? Math.PI : 0);
  const length = o.length * smoothing;
  // The control point position is relative to the current point
  const x = current[0] + Math.cos(angle) * length;
  const y = current[1] + Math.sin(angle) * length;
  return [x, y];
};

export const bezierCommand = (
  point: Array<number>,
  i: number,
  a: Array<Array<number>>,
  curvature: number
) => {
  // start control point
  const [cpsX, cpsY] = controlPoint(curvature, a[i - 1], a[i - 2], point);
  // end control point
  const [cpeX, cpeY] = controlPoint(curvature, point, a[i - 1], a[i + 1], true);
  return `C${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
};

export const getSegmentString = (
  lineSegment: LineSegment[] | undefined,
  index: number,
  startDelimeter: string,
  endDelimeter: string
) => {
  const segment = lineSegment?.find((segment) => segment.startIndex === index);
  return segment ? startDelimeter + JSON.stringify(segment) + endDelimeter : "";
};

export const getCurvePathWithSegments = (
  path: string,
  lineSegment: LineSegment[] | undefined,
  startDelimeter: string,
  endDelimeter: string
) => {
  if (!lineSegment?.length) return path;
  let newPath = "";
  const pathArray = path.split("C");
  for (let i = 0; i < pathArray.length; i++) {
    const segment = lineSegment?.find((segment) => segment.startIndex === i);
    newPath +=
      (pathArray[i].startsWith("M") ? "" : "C") +
      pathArray[i] +
      (segment ? startDelimeter + JSON.stringify(segment) + endDelimeter : "");
  }
  return newPath;
};

export const getPreviousSegmentsLastPoint = (
  isCurved: boolean,
  previousSegment: string
) => {
  const prevSegmentLastPoint = isCurved
    ? previousSegment.substring(previousSegment.trim().lastIndexOf(" "))
    : previousSegment
        .substring(previousSegment.lastIndexOf("L"))
        .replace("L", "M");

  return (
    (prevSegmentLastPoint.trim()[0] === "M" ? "" : "M") + prevSegmentLastPoint
  );
};

export const getPathWithHighlight = (
  data: any[],
  i: number,
  highlightedRange: { from: number; to: number },
  startIndex: number,
  endIndex: number,
  getX: (i: number) => number,
  getY: (i: number) => number
) => {
  let path = "";
  const { from, to } = highlightedRange;
  const currentPointRegion =
    data[i].value < from ? loc.DOWN : data[i].value > to ? loc.UP : loc.IN;

  if (i !== endIndex) {
    const nextPointRegion =
      data[i + 1].value < from
        ? loc.DOWN
        : data[i + 1].value > to
        ? loc.UP
        : loc.IN;
    if (
      currentPointRegion !== nextPointRegion ||
      (i === startIndex && currentPointRegion === loc.IN)
    ) {
      const x1 = getX(i),
        y1 = getY(data[i].value),
        x2 = getX(i + 1),
        y2 = getY(data[i + 1].value);

      let m = (y2 - y1) / (x2 - x1),
        x,
        y:number = 0;
      if (i === startIndex && currentPointRegion === loc.IN) {
        // If the 1st point lies IN
        y = y1;
        x = x1;

        path +=
          "L" +
          x +
          " " +
          y +
          " " +
          RANGE_ENTER +
          JSON.stringify(highlightedRange) +
          STOP;

        if (nextPointRegion === loc.UP) {
          y = getY(to);
          x = (y - y1) / m + x1;

          path += "L" + x + " " + y + " " + RANGE_EXIT;
        } else if (nextPointRegion === loc.DOWN) {
          y = getY(from);
          x = (y - y1) / m + x1;

          path += "L" + x + " " + y + " " + RANGE_EXIT;
        }
      } else if (currentPointRegion !== nextPointRegion) {
        if (currentPointRegion === loc.DOWN && nextPointRegion === loc.UP) {
          // if current point is in DOWN and next point is in UP, then we will add 2 points to the the path
          y = getY(from);
          x = (y - y1) / m + x1;

          path +=
            "L" +
            x +
            " " +
            y +
            " " +
            RANGE_ENTER +
            JSON.stringify(highlightedRange) +
            STOP;
          y = getY(to);
          x = (y - y1) / m + x1;

          path += "L" + x + " " + y + " " + RANGE_EXIT;
        } else if (
          currentPointRegion === loc.UP &&
          nextPointRegion === loc.DOWN
        ) {
          // if current point is in UP and next point is in DOWN, then we will add 2 points to the the path
          y = getY(to);
          x = (y - y1) / m + x1;

          path +=
            "L" +
            x +
            " " +
            y +
            " " +
            RANGE_ENTER +
            JSON.stringify(highlightedRange) +
            STOP;
          y = getY(from);
          x = (y - y1) / m + x1;

          path += "L" + x + " " + y + " " + RANGE_EXIT;
        } else {
          if (
            (currentPointRegion === loc.UP && nextPointRegion === loc.IN) ||
            (currentPointRegion === loc.IN && nextPointRegion === loc.UP)
          ) {
            y = getY(to);
          } else if (
            (currentPointRegion === loc.IN && nextPointRegion === loc.DOWN) ||
            (currentPointRegion === loc.DOWN && nextPointRegion === loc.IN)
          ) {
            y = getY(from);
          }
          m = (y2 - y1) / (x2 - x1);
          x = (y! - y1) / m + x1;

          const prefix =
            nextPointRegion === loc.IN
              ? RANGE_ENTER + JSON.stringify(highlightedRange) + STOP
              : RANGE_EXIT;

          path += "L" + x + " " + y + " " + prefix;
        }
      }
    }
  } else if (currentPointRegion === loc.IN) {
    // If the last point lies IN, add RANGE_EXIT
    path += RANGE_EXIT;
  }

  return path;
};

export const getRegionPathObjects = (
  points: string,
  color: ColorValue,
  currentLineThickness: number,
  thickness: number,
  strokeDashArray: undefined | number[],
  isCurved: boolean,
  startDelimeter: string,
  stop: string,
  endDelimeter: string
) => {
  const ar: [any] = [{}];
  let tempStr = points;

  if (!points.startsWith(startDelimeter)) {
    /**********************            line upto first segment                 *****************/

    const lineSvgProps: LineProperties = {
      d: points.substring(0, points.indexOf(startDelimeter)),
      color,
      strokeWidth: currentLineThickness || thickness,
    };
    if (strokeDashArray) {
      lineSvgProps.strokeDashArray = strokeDashArray;
    }
    ar.push(lineSvgProps);
  }

  while (tempStr.includes(startDelimeter)) {
    const startDelimeterIndex = tempStr.indexOf(startDelimeter);
    const stopIndex = tempStr.indexOf(stop);
    const endDelimeterIndex = tempStr.indexOf(endDelimeter);

    const segmentConfigString = tempStr.substring(
      startDelimeterIndex + startDelimeter.length,
      stopIndex
    );

    const segmentConfig = JSON.parse(segmentConfigString);

    let segment = tempStr.substring(stopIndex + stop.length, endDelimeterIndex);

    const previousSegment = ar[ar.length - 1].d;
    const moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(
      isCurved,
      previousSegment
    );

    /**********************            segment line                 *****************/

    const lineSvgProps: LineProperties = {
      d: moveToLastPointOfPreviousSegment + segment,
      color: segmentConfig.color ?? color,
      strokeWidth:
        segmentConfig.thickness ?? (currentLineThickness || thickness),
    };
    if (segmentConfig.strokeDashArray) {
      lineSvgProps.strokeDashArray = segmentConfig.strokeDashArray;
    }
    ar.push(lineSvgProps);

    tempStr = tempStr.substring(endDelimeterIndex + endDelimeter.length);

    const nextDelimiterIndex = tempStr.indexOf(startDelimeter);
    const stringUptoNextSegment = tempStr.substring(0, nextDelimiterIndex);

    /**********************            line upto the next segment            *****************/

    if (
      nextDelimiterIndex !== -1 &&
      stringUptoNextSegment.indexOf(isCurved ? "C" : "L") !== -1
    ) {
      const previousSegment = ar[ar.length - 1].d;
      const moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(
        isCurved,
        previousSegment
      );
      const lineSvgProps: LineProperties = {
        d: moveToLastPointOfPreviousSegment + " " + stringUptoNextSegment,
        color,
        strokeWidth: currentLineThickness || thickness,
      };
      if (strokeDashArray) {
        lineSvgProps.strokeDashArray = strokeDashArray;
      }
      ar.push(lineSvgProps);
    }
  }

  /**********************            line after the last segment            *****************/

  if (tempStr.length) {
    const previousSegment = ar[ar.length - 1].d;
    const moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(
      isCurved,
      previousSegment
    );
    const lineSvgProps: LineProperties = {
      d: moveToLastPointOfPreviousSegment + tempStr,
      color,
      strokeWidth: currentLineThickness || thickness,
    };
    if (strokeDashArray) {
      lineSvgProps.strokeDashArray = strokeDashArray;
    }
    ar.push(lineSvgProps);
  }

  ar.shift();
  return ar;
};

export const getSegmentedPathObjects = (
  points: string,
  color: ColorValue,
  currentLineThickness: number,
  thickness: number,
  strokeDashArray: undefined | number[],
  isCurved: boolean,
  startDelimeter: string,
  endDelimeter: string
) => {
  const ar: [any] = [{}];
  let tempStr = points;

  if (!points.startsWith(startDelimeter)) {
    /**********************            line upto first segment                 *****************/

    const lineSvgProps: LineProperties = {
      d: points.substring(0, points.indexOf(startDelimeter)),
      color,
      strokeWidth: currentLineThickness || thickness,
    };
    if (strokeDashArray) {
      lineSvgProps.strokeDashArray = strokeDashArray;
    }
    ar.push(lineSvgProps);
  }

  while (tempStr.includes(startDelimeter)) {
    const startDelimeterIndex = tempStr.indexOf(startDelimeter);
    const endDelimeterIndex = tempStr.indexOf(endDelimeter);

    const segmentConfigString = tempStr.substring(
      startDelimeterIndex + startDelimeter.length,
      endDelimeterIndex
    );

    const segmentConfig = JSON.parse(segmentConfigString);

    const { startIndex, endIndex } = segmentConfig;
    const segmentLength = endIndex - startIndex;
    let segment = tempStr.substring(endDelimeterIndex + endDelimeter.length);
    let c = 0,
      s = 0,
      i;
    for (i = 0; i < segment.length; i++) {
      if (segment[i] === (isCurved ? "C" : "L")) c++;
      if (c === segmentLength) {
        if (segment[i] === " ") s++;
        if (s === (isCurved ? 3 : 2)) break;
      }
    }
    segment = segment.substring(0, i);

    const previousSegment = ar[ar.length - 1].d;
    const moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(
      isCurved,
      previousSegment
    );

    /**********************            segment line                 *****************/

    const lineSvgProps: LineProperties = {
      d: moveToLastPointOfPreviousSegment + segment,
      color: segmentConfig.color ?? color,
      strokeWidth:
        segmentConfig.thickness ?? (currentLineThickness || thickness),
    };
    if (segmentConfig.strokeDashArray) {
      lineSvgProps.strokeDashArray = segmentConfig.strokeDashArray;
    }
    ar.push(lineSvgProps);

    tempStr = tempStr.substring(endDelimeterIndex + endDelimeter.length + i);

    const nextDelimiterIndex = tempStr.indexOf(startDelimeter);
    const stringUptoNextSegment = tempStr.substring(0, nextDelimiterIndex);

    /**********************            line upto the next segment            *****************/

    if (
      nextDelimiterIndex !== -1 &&
      stringUptoNextSegment.indexOf(isCurved ? "C" : "L") !== -1
    ) {
      const previousSegment = ar[ar.length - 1].d;
      const moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(
        isCurved,
        previousSegment
      );
      const lineSvgProps: LineProperties = {
        d: moveToLastPointOfPreviousSegment + " " + stringUptoNextSegment,
        color,
        strokeWidth: currentLineThickness || thickness,
      };
      if (strokeDashArray) {
        lineSvgProps.strokeDashArray = strokeDashArray;
      }
      ar.push(lineSvgProps);
    }
  }

  /**********************            line after the last segment            *****************/

  if (tempStr.length) {
    const previousSegment = ar[ar.length - 1].d;
    const moveToLastPointOfPreviousSegment = getPreviousSegmentsLastPoint(
      isCurved,
      previousSegment
    );
    const lineSvgProps: LineProperties = {
      d: moveToLastPointOfPreviousSegment + tempStr,
      color,
      strokeWidth: currentLineThickness || thickness,
    };
    if (strokeDashArray) {
      lineSvgProps.strokeDashArray = strokeDashArray;
    }
    ar.push(lineSvgProps);
  }

  ar.shift();
  return ar;
};

export const getArrowPoints = (
  arrowTipX: number,
  arrowTipY: number,
  x1: number,
  y1: number,
  arrowLength?: number,
  arrowWidth?: number,
  showArrowBase?: boolean
) => {
  let dataLineSlope = (arrowTipY - y1) / (arrowTipX - x1);
  let d = arrowLength ?? 0;
  let d2 = (arrowWidth ?? 0) / 2;
  let interSectionX =
    arrowTipX - Math.sqrt((d * d) / (dataLineSlope * dataLineSlope + 1));
  let interSectionY = arrowTipY - dataLineSlope * (arrowTipX - interSectionX);

  let arrowBasex1, arrowBaseY1, arrowBaseX2, arrowBaseY2;
  if (dataLineSlope === 0) {
    arrowBasex1 = interSectionX;
    arrowBaseY1 = interSectionY - d2;
    arrowBaseX2 = interSectionX;
    arrowBaseY2 = interSectionY + d2;
  } else {
    let arrowBaseSlope = -1 / dataLineSlope;
    arrowBasex1 =
      interSectionX -
      Math.sqrt((d2 * d2) / (arrowBaseSlope * arrowBaseSlope + 1));
    arrowBaseY1 =
      interSectionY - arrowBaseSlope * (interSectionX - arrowBasex1);

    arrowBaseX2 =
      interSectionX +
      Math.sqrt((d2 * d2) / (arrowBaseSlope * arrowBaseSlope + 1));
    arrowBaseY2 =
      interSectionY + arrowBaseSlope * (interSectionX - arrowBasex1);
  }
  let arrowPoints = ` M${interSectionX} ${interSectionY}`;
  arrowPoints += ` ${showArrowBase ? "L" : "M"}${arrowBasex1} ${arrowBaseY1}`;
  arrowPoints += ` L${arrowTipX} ${arrowTipY}`;
  arrowPoints += ` M${interSectionX} ${interSectionY}`;
  arrowPoints += ` ${showArrowBase ? "L" : "M"}${arrowBaseX2} ${arrowBaseY2}`;
  arrowPoints += ` L${arrowTipX} ${arrowTipY}`;

  return arrowPoints;
};

export const getAxesAndRulesProps = (
  props: any,
  stepValue: number,
  maxValue?: number
) => {
  const axesAndRulesProps = {
    yAxisSide: props.yAxisSide,
    yAxisLabelContainerStyle: props.yAxisLabelContainerStyle,
    yAxisColor: props.yAxisColor,
    yAxisExtraHeight: props.yAxisExtraHeight,
    trimYAxisAtTop: props.trimYAxisAtTop,
    overflowTop: props.overflowTop,
    yAxisThickness: props.yAxisThickness,
    xAxisColor: props.xAxisColor,
    xAxisLength: props.xAxisLength,
    xAxisType: props.xAxisType,
    xAxisTextNumberOfLines: props.xAxisTextNumberOfLines ?? 1,
    xAxisLabelsHeight: props.xAxisLabelsHeight,
    xAxisLabelsVerticalShift: props.xAxisLabelsVerticalShift,
    dashWidth: props.dashWidth,
    dashGap: props.dashGap,
    backgroundColor: props.backgroundColor,
    hideRules: props.hideRules,
    rulesLength: props.rulesLength,
    rulesType: props.rulesType,
    rulesThickness: props.rulesThickness,
    rulesColor: props.rulesColor,
    rulesConfigArray: props.rulesConfigArray,
    showYAxisIndices: props.showYAxisIndices,
    yAxisIndicesHeight: props.yAxisIndicesHeight,
    yAxisIndicesWidth: props.yAxisIndicesWidth,
    yAxisIndicesColor: props.yAxisIndicesColor,
    hideOrigin: props.hideOrigin,
    hideYAxisText: props.hideYAxisText,
    yAxisTextNumberOfLines: props.yAxisTextNumberOfLines,
    yAxisLabelPrefix: props.yAxisLabelPrefix,
    yAxisLabelSuffix: props.yAxisLabelSuffix,
    yAxisTextStyle: props.yAxisTextStyle,

    referenceLinesConfig: {
      showReferenceLine1: props.showReferenceLine1,
      referenceLine1Position: props.referenceLine1Position,
      referenceLine1Config: props.referenceLine1Config,
      showReferenceLine2: props.showReferenceLine2,
      referenceLine2Position: props.referenceLine2Position,
      referenceLine2Config: props.referenceLine2Config,
      showReferenceLine3: props.showReferenceLine3,
      referenceLine3Position: props.referenceLine3Position,
      referenceLine3Config: props.referenceLine3Config,
      referenceLinesOverChartContent: props.referenceLinesOverChartContent,
    },

    showVerticalLines: props.showVerticalLines,
    verticalLinesThickness: props.verticalLinesThickness,
    verticalLinesHeight: props.verticalLinesHeight,
    verticalLinesColor: props.verticalLinesColor,
    verticalLinesShift: props.verticalLinesShift,
    verticalLinesZIndex: props.verticalLinesZIndex,
    verticalLinesSpacing: props.verticalLinesSpacing,
    noOfVerticalLines: props.noOfVerticalLines,

    //specific to Line charts-
    verticalLinesUptoDataPoint: props.verticalLinesUptoDataPoint,

    roundToDigits: props.roundToDigits,
    stepValue,

    secondaryYAxis: props.secondaryYAxis,
    formatYLabel: props.formatYLabel,
  };
  if (
    (props.secondaryYAxis || props.lineConfig?.isSecondary) &&
    maxValue !== undefined
  ) {
    axesAndRulesProps.secondaryYAxis = { ...props.secondaryYAxis, maxValue };
  }

  return axesAndRulesProps;
};

export const getExtendedContainerHeightWithPadding = (
  containerHeight: number,
  overflowTop?: number
) => containerHeight + (overflowTop ?? 0) + 10;

export const getSecondaryDataWithOffsetIncluded = (
  secondaryData?: any,
  secondaryYAxis?: any,
  showDataPointsForMissingValues?: boolean,
  interpolateMissingValues?: boolean,
  onlyPositive?: boolean
) => {
  if (!secondaryData) return secondaryData;
  const nullishHandledData = getInterpolatedData(
    secondaryData,
    showDataPointsForMissingValues,
    interpolateMissingValues,
    onlyPositive
  );
  if (secondaryYAxis?.yAxisOffset) {
    return nullishHandledData.map((item) => {
      item.value = item.value - (secondaryYAxis?.yAxisOffset ?? 0);
      return item;
    });
  }
  return nullishHandledData;
};

export const getArrowProperty = (
  property: string,
  count: number,
  props: any,
  defaultArrowConfig: arrowConfigType
): any => {
  return (
    props[`arrowConfig${count}`]?.[`${property}`] ??
    props[`arrowConfig`]?.[`${property}`] ??
    // @ts-ignore
    defaultArrowConfig[property]
  );
};

export const getAllArrowProperties = (
  props: any,
  defaultArrowConfig: arrowConfigType
) => {
  const arrowLength1 = getArrowProperty("length", 1, props, defaultArrowConfig);
  const arrowWidth1 = getArrowProperty("width", 1, props, defaultArrowConfig);
  const arrowStrokeWidth1 = getArrowProperty(
    "strokeWidth",
    1,
    props,
    defaultArrowConfig
  );
  const arrowStrokeColor1 = getArrowProperty(
    "strokeColor",
    1,
    props,
    defaultArrowConfig
  );
  const arrowFillColor1 = getArrowProperty(
    "fillColor",
    1,
    props,
    defaultArrowConfig
  );
  const showArrowBase1 = getArrowProperty(
    "showArrowBase",
    1,
    props,
    defaultArrowConfig
  );

  const arrowLength2 = getArrowProperty("length", 2, props, defaultArrowConfig);
  const arrowWidth2 = getArrowProperty("width", 2, props, defaultArrowConfig);
  const arrowStrokeWidth2 = getArrowProperty(
    "strokeWidth",
    2,
    props,
    defaultArrowConfig
  );
  const arrowStrokeColor2 = getArrowProperty(
    "strokeColor",
    2,
    props,
    defaultArrowConfig
  );
  const arrowFillColor2 = getArrowProperty(
    "fillColor",
    2,
    props,
    defaultArrowConfig
  );
  const showArrowBase2 = getArrowProperty(
    "showArrowBase",
    2,
    props,
    defaultArrowConfig
  );

  const arrowLength3 = getArrowProperty("length", 3, props, defaultArrowConfig);
  const arrowWidth3 = getArrowProperty("width", 3, props, defaultArrowConfig);
  const arrowStrokeWidth3 = getArrowProperty(
    "strokeWidth",
    3,
    props,
    defaultArrowConfig
  );
  const arrowStrokeColor3 = getArrowProperty(
    "strokeColor",
    3,
    props,
    defaultArrowConfig
  );
  const arrowFillColor3 = getArrowProperty(
    "fillColor",
    3,
    props,
    defaultArrowConfig
  );
  const showArrowBase3 = getArrowProperty(
    "showArrowBase",
    3,
    props,
    defaultArrowConfig
  );

  const arrowLength4 = getArrowProperty("length", 4, props, defaultArrowConfig);
  const arrowWidth4 = getArrowProperty("width", 4, props, defaultArrowConfig);
  const arrowStrokeWidth4 = getArrowProperty(
    "strokeWidth",
    4,
    props,
    defaultArrowConfig
  );
  const arrowStrokeColor4 = getArrowProperty(
    "strokeColor",
    4,
    props,
    defaultArrowConfig
  );
  const arrowFillColor4 = getArrowProperty(
    "fillColor",
    4,
    props,
    defaultArrowConfig
  );
  const showArrowBase4 = getArrowProperty(
    "showArrowBase",
    4,
    props,
    defaultArrowConfig
  );

  const arrowLength5 = getArrowProperty("length", 5, props, defaultArrowConfig);
  const arrowWidth5 = getArrowProperty("width", 5, props, defaultArrowConfig);
  const arrowStrokeWidth5 = getArrowProperty(
    "strokeWidth",
    5,
    props,
    defaultArrowConfig
  );
  const arrowStrokeColor5 = getArrowProperty(
    "strokeColor",
    5,
    props,
    defaultArrowConfig
  );
  const arrowFillColor5 = getArrowProperty(
    "fillColor",
    5,
    props,
    defaultArrowConfig
  );
  const showArrowBase5 = getArrowProperty(
    "showArrowBase",
    5,
    props,
    defaultArrowConfig
  );

  const arrowLengthsFromSet = props.dataSet?.map(
    (item: any) => item?.arrowConfig?.length ?? arrowLength1
  );
  const arrowWidthsFromSet = props.dataSet?.map(
    (item: any) => item?.arrowConfig?.arrowWidth ?? arrowWidth1
  );
  const arrowStrokeWidthsFromSet = props.dataSet?.map(
    (item: any) => item?.arrowConfig?.arrowStrokeWidth ?? arrowStrokeWidth1
  );
  const arrowStrokeColorsFromSet = props.dataSet?.map(
    (item: any) => item?.arrowConfig?.arrowStrokeColor ?? arrowStrokeColor1
  );
  const arrowFillColorsFromSet = props.dataSet?.map(
    (item: any) => item?.arrowConfig?.arrowFillColor ?? arrowFillColor1
  );
  const showArrowBasesFromSet = props.dataSet?.map(
    (item: any) => item?.arrowConfig?.showArrowBase ?? showArrowBase1
  );

  return {
    arrowLength1,
    arrowWidth1,
    arrowStrokeWidth1,
    arrowStrokeColor1,
    arrowFillColor1,
    showArrowBase1,
    arrowLength2,
    arrowWidth2,
    arrowStrokeWidth2,
    arrowStrokeColor2,
    arrowFillColor2,
    showArrowBase2,
    arrowLength3,
    arrowWidth3,
    arrowStrokeWidth3,
    arrowStrokeColor3,
    arrowFillColor3,
    showArrowBase3,
    arrowLength4,
    arrowWidth4,
    arrowStrokeWidth4,
    arrowStrokeColor4,
    arrowFillColor4,
    showArrowBase4,
    arrowLength5,
    arrowWidth5,
    arrowStrokeWidth5,
    arrowStrokeColor5,
    arrowFillColor5,
    showArrowBase5,
    arrowLengthsFromSet,
    arrowWidthsFromSet,
    arrowStrokeWidthsFromSet,
    arrowStrokeColorsFromSet,
    arrowFillColorsFromSet,
    showArrowBasesFromSet,
  };
};

type MaxAndMin = {
  maxItem: number;
  minItem: number;
};

export const maxAndMinUtil = (
  maxItem: number,
  minItem: number,
  roundToDigits?: number,
  showFractionalValues?: boolean
): MaxAndMin => {
  if (showFractionalValues || roundToDigits) {
    maxItem *= 10 * (roundToDigits || 1);
    maxItem = maxItem + (10 - (maxItem % 10));
    maxItem /= 10 * (roundToDigits || 1);
    maxItem = parseFloat(maxItem.toFixed(roundToDigits || 1));

    if (minItem !== 0) {
      minItem *= 10 * (roundToDigits || 1);
      minItem = minItem - (10 + (minItem % 10));
      minItem /= 10 * (roundToDigits || 1);
      minItem = parseFloat(minItem.toFixed(roundToDigits || 1));
    }
  } else {
    maxItem = maxItem + (10 - (maxItem % 10));
    if (minItem !== 0) {
      minItem = minItem - (10 + (minItem % 10));
    }
  }

  return { maxItem, minItem };
};

export const computeMaxAndMinItems = (
  data: any,
  roundToDigits?: number,
  showFractionalValues?: boolean
): MaxAndMin => {
  if (!data?.length) {
    return { maxItem: 0, minItem: 0 };
  }
  let maxItem = 0,
    minItem = 0;

  data.forEach((item: any) => {
    if (item.value > maxItem) {
      maxItem = item.value;
    }
    if (item.value < minItem) {
      minItem = item.value;
    }
  });

  return maxAndMinUtil(maxItem, minItem, roundToDigits, showFractionalValues);
};

export const getLabelTextUtil = (
  val: any,
  index: number,
  showFractionalValues?: boolean,
  yAxisLabelTexts?: Array<string>,
  yAxisOffset?: number,
  yAxisLabelPrefix?: string,
  yAxisLabelSuffix?: string,
  roundToDigits?: number,
  formatYLabel?: (label: string) => string
) => {
  let label = "";
  if (
    showFractionalValues ||
    (yAxisLabelTexts && yAxisLabelTexts[index] !== undefined)
  ) {
    if (yAxisLabelTexts?.[index]) return val;
    if (val) {
      label = isNaN(Number(val))
        ? val
        : (Number(val) + (yAxisOffset ?? 0)).toFixed(roundToDigits);
    } else {
      label = yAxisOffset?.toString() ?? "0";
    }
  } else {
    if (val) {
      label = val.toString().split(".")[0];
      label = (Number(label) + (yAxisOffset ?? 0)).toString();
    } else {
      label = yAxisOffset?.toString() ?? "0";
    }
  }

  return (
    yAxisLabelPrefix +
    (formatYLabel ? formatYLabel(label) : label) +
    yAxisLabelSuffix
  );
};

export const getXForLineInBar = (
  index: number,
  firstBarWidth: number,
  currentBarWidth: number,
  yAxisLabelWidth: number,
  lineConfig: any,
  spacing: number
) =>
  yAxisLabelWidth +
  firstBarWidth / 2 +
  lineConfig.initialSpacing +
  (currentBarWidth + (lineConfig.spacing ?? spacing)) * index +
  lineConfig.shiftX -
  lineConfig.dataPointsWidth / 2 -
  4;

export const getYForLineInBar = (
  value: number,
  shiftY: number,
  containerHeight: number,
  maxValue: number
) => containerHeight - shiftY - (value * containerHeight) / maxValue;

export const clone = (obj: any) => {
  if (obj === null || typeof obj !== "object" || "isActiveClone" in obj)
    return obj;

  let temp;
  if (obj instanceof Date) temp = new Date(obj);
  else temp = obj.constructor();

  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      obj["isActiveClone"] = null;
      temp[key] = clone(obj[key]);
      delete obj["isActiveClone"];
    }
  }
  return temp;
};

export const getLineConfigForBarChart = (
  lineConfig: any,
  barInitialSpacing: number
) => {
  return {
    initialSpacing:
      lineConfig.initialSpacing ??
      barInitialSpacing ??
      defaultLineConfig.initialSpacing,
    spacing: lineConfig.spacing,
    curved: lineConfig.curved || defaultLineConfig.curved,
    curvature: lineConfig.curvature ?? defaultLineConfig.curvature,
    curveType: lineConfig.curveType ?? defaultLineConfig.curveType,
    isAnimated: lineConfig.isAnimated || defaultLineConfig.isAnimated,
    animationDuration:
      lineConfig.animationDuration || defaultLineConfig.animationDuration,
    thickness: lineConfig.thickness || defaultLineConfig.thickness,
    color: lineConfig.color || defaultLineConfig.color,
    hideDataPoints:
      lineConfig.hideDataPoints || defaultLineConfig.hideDataPoints,
    dataPointsShape:
      lineConfig.dataPointsShape || defaultLineConfig.dataPointsShape,
    dataPointsHeight:
      lineConfig.dataPointsHeight || defaultLineConfig.dataPointsHeight,
    dataPointsWidth:
      lineConfig.dataPointsWidth || defaultLineConfig.dataPointsWidth,
    dataPointsColor:
      lineConfig.dataPointsColor || defaultLineConfig.dataPointsColor,
    dataPointsRadius:
      lineConfig.dataPointsRadius || defaultLineConfig.dataPointsRadius,
    textColor: lineConfig.textColor || defaultLineConfig.textColor,
    textFontSize: lineConfig.textFontSize || defaultLineConfig.textFontSize,
    textShiftX: lineConfig.textShiftX || defaultLineConfig.textShiftX,
    textShiftY: lineConfig.textShiftY || defaultLineConfig.textShiftY,
    shiftX: lineConfig.shiftX || defaultLineConfig.shiftX,
    shiftY: lineConfig.shiftY || defaultLineConfig.shiftY,
    delay: lineConfig.delay || defaultLineConfig.delay,
    startIndex: lineConfig.startIndex || defaultLineConfig.startIndex,
    endIndex:
      lineConfig.endIndex === 0
        ? 0
        : lineConfig.endIndex || defaultLineConfig.endIndex,

    showArrow: lineConfig.showArrow ?? defaultLineConfig.showArrow,
    arrowConfig: {
      length:
        lineConfig.arrowConfig?.length ?? defaultLineConfig.arrowConfig?.length,
      width:
        lineConfig.arrowConfig?.width ?? defaultLineConfig.arrowConfig?.width,

      strokeWidth:
        lineConfig.arrowConfig?.strokeWidth ??
        defaultLineConfig.arrowConfig?.strokeWidth,

      strokeColor:
        lineConfig.arrowConfig?.strokeColor ??
        defaultLineConfig.arrowConfig?.strokeColor,

      fillColor:
        lineConfig.arrowConfig?.fillColor ??
        defaultLineConfig.arrowConfig?.fillColor,

      showArrowBase:
        lineConfig.arrowConfig?.showArrowBase ??
        defaultLineConfig.arrowConfig?.showArrowBase,
    },
    customDataPoint: lineConfig.customDataPoint,
    isSecondary: lineConfig.isSecondary ?? defaultLineConfig.isSecondary,
  };
};

export const getNoOfSections = (
  noOfSections: undefined | number,
  maxValue: undefined | number,
  stepValue: undefined | number
) =>
  maxValue && stepValue
    ? maxValue / stepValue
    : noOfSections ?? AxesAndRulesDefaults.noOfSections;

export const getMaxValue = (
  maxValue: undefined | number,
  stepValue: undefined | number,
  noOfSections: number,
  maxItem: number
) => maxValue ?? (stepValue ? stepValue * noOfSections : maxItem);

export const getBarFrontColor = (
  isFocused: boolean,
  focusedBarConfig: { color: ColorValue },
  itemFrontColor: ColorValue,
  frontColor: undefined | ColorValue,
  isThreeD: undefined | boolean
) => {
  if (isFocused) {
    return (
      focusedBarConfig?.color ??
      (isThreeD
        ? BarDefaults.focusedThreeDBarFrontColor
        : BarDefaults.focusedBarFrontColor)
    );
  }
  return (
    itemFrontColor ||
    frontColor ||
    (isThreeD ? BarDefaults.threeDBarFrontColor : BarDefaults.frontColor)
  );
};

export const getBarSideColor = (
  isFocused: boolean = false,
  focusedBarConfig?: FocusedBarConfig,
  itemSideColor?: ColorValue,
  sideColor?: ColorValue
) => {
  if (isFocused) {
    return focusedBarConfig?.sideColor ?? BarDefaults.focusedBarSideColor;
  }
  return itemSideColor || sideColor;
};

export const getBarTopColor = (
  isFocused: boolean = false,
  focusedBarConfig?: FocusedBarConfig,
  itemTopColor?: ColorValue,
  topColor?: ColorValue
) => {
  if (isFocused) {
    return focusedBarConfig?.topColor ?? BarDefaults.focusedBarTopColor;
  }
  return itemTopColor || topColor;
};

export const getBarWidth = (
  isFocused: boolean,
  focusedBarConfig: FocusedBarConfig,
  itemBarWidth: number,
  barWidth?: number
) => {
  const localBarWidth = itemBarWidth || barWidth || BarDefaults.barWidth;
  if (isFocused) {
    return focusedBarConfig?.width ?? localBarWidth;
  }
  return localBarWidth;
};

export const getInterpolatedData = (
  dataParam: lineDataItem[],
  showDataPointsForMissingValues?: boolean,
  interpolateMissingValues?: boolean,
  onlyPositive?: boolean
): lineDataItem[] => {
  if (!interpolateMissingValues) {
    return dataParam.map((item) => {
      if (typeof item.value !== "number") {
        if (showDataPointsForMissingValues) return { ...item, value: 0 };
        return { ...item, value: 0, hideDataPoint: true };
      }
      return item;
    });
  }
  if (!interpolateMissingValues) return dataParam;
  const data = clone(dataParam);
  const n = data.length;

  /**************         PRE-PROCESSING           **************/
  let numericValue: any;
  const numericValuesLength = data.filter((item: any) => {
    const isNum = typeof item.value === "number";
    if (isNum) {
      numericValue = item.value;
      return true;
    }
    return false;
  }).length;

  if (!numericValuesLength) return [];

  if (numericValuesLength === 1) {
    data.forEach((item: any) => {
      if (!showDataPointsForMissingValues && typeof item.value !== "number") {
        item.hideDataPoint = true;
      }
      item.value = numericValue;
    });
    return data;
  }
  /**********************************************************************/

  data.forEach((item: any, index: number) => {
    if (typeof item.value === "number") return;
    //  Cut the line in 2 halves-> pre and post
    //  Now there are 4 possibilities-
    //    1. Both pre and post have valid values
    //    2. Only pre has valid value
    //    3. Only post has valid value
    //    4. None has valid value -> this is already handled in preprocessing

    const pre = data.slice(0, index);
    const post = data.slice(index + 1, n);

    const preValidIndex = pre.findLastIndex(
      (item: any) => typeof item.value === "number"
    );
    const postValidInd = post.findIndex(
      (item: any) => typeof item.value === "number"
    );
    const postValidIndex = postValidInd + index + 1;

    let count, step;

    //    1. Both pre and post have valid values
    if (preValidIndex !== -1 && postValidInd !== -1) {
      count = postValidIndex - preValidIndex;
      step = (data[postValidIndex].value - data[preValidIndex].value) / count;
      data[index].value =
        data[preValidIndex].value + step * (index - preValidIndex);
    }

    //    2. Only pre has valid value
    else if (preValidIndex !== -1 && postValidInd === -1) {
      //  Now there are 2 possibilities-
      //    1. There's only 1 valid value in the pre -> this is already handled in preprocessing
      //    2. There are more than valid values in pre
      const secondPre = data.slice(0, preValidIndex);
      const secondPreIndex = secondPre.findLastIndex(
        (item: any) => typeof item.value === "number"
      );

      count = preValidIndex - secondPreIndex;
      step = (data[secondPreIndex].value - data[preValidIndex].value) / count;
      data[index].value =
        data[preValidIndex].value - step * (index - preValidIndex);
    }

    //    3. Only post has valid value
    else if (preValidIndex === -1 && postValidInd !== -1) {
      //  Now there are 2 possibilities-
      //    1. There's only 1 valid value in the post -> this is already handled in preprocessing
      //    2. There are more than valid values in post

      const secondPost = data.slice(postValidIndex + 1, n);
      const secondPostInd = secondPost.findIndex(
        (item: any) => typeof item.value === "number"
      );
      const secondPostIndex = secondPostInd + postValidIndex + 1;

      count = secondPostIndex - postValidIndex;
      step = (data[secondPostIndex].value - data[postValidIndex].value) / count;
      data[index].value =
        data[postValidIndex].value - step * (postValidIndex - index);
    }

    // hide data point (since it is interpolated)
    if (!showDataPointsForMissingValues) {
      item.hideDataPoint = true;
    }
  });
  return onlyPositive
    ? data.map((item: any) => ({ ...item, value: Math.max(item.value, 0) }))
    : data;
};

export const getLineSegmentsForMissingValues = (
  data?: lineDataItem[]
): LineSegment[] | undefined => {
  if (!data?.length) return undefined;
  let i,
    n = data.length;
  const numericValuesLength = data.filter(
    (item) => typeof item.value === "number"
  ).length;
  if (!numericValuesLength) return undefined;
  const segments: LineSegment[] = [];
  for (i = 0; i < n; i++) {
    if (typeof data[i].value !== "number") {
      const nextValidInd: number = data
        .slice(i + 1, n)
        .findIndex((item) => typeof item.value === "number");
      if (nextValidInd === -1) {
        segments.push({
          startIndex: Math.max(i - 1, 0),
          endIndex: n,
          color: "transparent",
        });
        break;
      }
      const nextValidIndex: number = nextValidInd + i + 1;
      segments.push({
        startIndex: Math.max(i - 1, 0),
        endIndex: nextValidIndex,
        color: "transparent",
      });
      i = nextValidIndex;
    }
  }
  return segments;
};

export const getTextSizeForPieLabels = (
  textSize: number,
  radius: number
): number => (textSize ? Math.min(textSize, radius / 5) : 16);

export const adjustToOffset = (data: any, yAxisOffset: undefined | number) =>
  data.map((item: any) => ({
    ...item,
    value: item.value - (yAxisOffset ?? 0),
  }));

export const getSanitisedData = (
  data: lineDataItem[] | undefined,
  dataSanitisationProps: {
    showDataPointsForMissingValues?: boolean;
    interpolateMissingValues: boolean;
    onlyPositive?: boolean;
    yAxisOffset?: number;
  }
) => {
  if (!data) {
    return [];
  }
  const {
    showDataPointsForMissingValues,
    interpolateMissingValues,
    onlyPositive,
    yAxisOffset,
  } = dataSanitisationProps;
  const nullishHandledData = getInterpolatedData(
    data,
    showDataPointsForMissingValues,
    interpolateMissingValues,
    onlyPositive
  );
  if (yAxisOffset) {
    return adjustToOffset(nullishHandledData, yAxisOffset);
  }
  return nullishHandledData;
};
