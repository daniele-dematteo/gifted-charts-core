import { screenWidth } from "../../utils/constants";

export const getTopAndLeftForStripAndLabel = (props: {
  width?: number;
  autoAdjustPointerLabelPosition?: boolean;
  pointerX: number;
  pointerLabelWidth: number;
  activatePointersOnLongPress?: boolean;
  yAxisLabelWidth?: number;
  pointerRadius?: number;
  pointerWidth: number;
  shiftPointerLabelX?: number;
  pointerLabelHeight?: number;
  pointerYLocal?: number;
  pointerStripUptoDataPoint?: number;
  pointerStripHeight: number;
  shiftPointerLabelY?: number;
  scrollX?: number;
}) => {
  const {
    autoAdjustPointerLabelPosition,
    pointerX,
    pointerLabelWidth,
    activatePointersOnLongPress,
    yAxisLabelWidth = 0,
    pointerRadius,
    pointerWidth,
    shiftPointerLabelX = 0,
    pointerLabelHeight = 0,
    pointerYLocal = 0,
    pointerStripUptoDataPoint,
    pointerStripHeight,
    shiftPointerLabelY = 0,
    scrollX = 0,
  } = props;
  let left = 0,
    top = 0;
  if (autoAdjustPointerLabelPosition) {
    if (pointerX < pointerLabelWidth / 2) {
      left = 7;
    } else if (
      activatePointersOnLongPress &&
      pointerX - scrollX < pointerLabelWidth / 2 - 10
    ) {
      left = 7;
    } else {
      if (
        !activatePointersOnLongPress &&
        pointerX >
          (props.width || screenWidth - yAxisLabelWidth - 15) -
            pointerLabelWidth / 2
      ) {
        left = -pointerLabelWidth - 4;
      } else if (
        activatePointersOnLongPress &&
        pointerX - scrollX >
          ((props.width ?? 0) + 10 || screenWidth - yAxisLabelWidth - 15) -
            pointerLabelWidth / 2
      ) {
        left = -pointerLabelWidth - 4;
      } else {
        left = -pointerLabelWidth / 2 + 5;
      }
    }
  } else {
    left = (pointerRadius || pointerWidth / 2) - 10 + shiftPointerLabelX;
  }

  if (autoAdjustPointerLabelPosition) {
    if (pointerLabelHeight - pointerYLocal > 10) {
      top = 10;
    } else {
      top = -pointerLabelHeight;
    }
  } else {
    top =
      (pointerStripUptoDataPoint
        ? pointerRadius || pointerStripHeight / 2
        : -pointerYLocal + 8) -
      pointerLabelWidth / 2 +
      shiftPointerLabelY;
  }

  return {
    top,
    left,
  };
};
