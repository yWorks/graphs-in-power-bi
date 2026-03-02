import {
    Arrow,
    ArrowType,
    DefaultLabelStyle,
    EdgeSegmentLabelModel,
    Fill,
    LabelShape,
    PolylineEdgeStyle,
    ShapeNodeStyle,
    Stroke
} from "yfiles";

/**
 * The style of the nodes.
 * @type {ShapeNodeStyle}
 */
export const shapeStyle = new ShapeNodeStyle({
    shape: "ellipse",
    fill: Fill.STEEL_BLUE,
    stroke: Stroke.TRANSPARENT
});
/**
 * Styling the label of the nodes.
 * @type {DefaultLabelStyle}
 */
export const nodeLabelStyle = new DefaultLabelStyle({
    textFill: Fill.WHITE,
    insets: 5
});
/**
 * The positioning logic of the edge label.
 * @type {EdgeSegmentLabelModel}
 */
export const edgeLabelModel = new EdgeSegmentLabelModel({
    autoRotation: true,
    offset: 0
});
/**
 * The style of the edge label.
 * @type {DefaultLabelStyle}
 */
export const edgeLabelStyle = new DefaultLabelStyle({
    textFill: Fill.DIM_GRAY,
    shape: LabelShape.ROUND_RECTANGLE,
    backgroundFill: Fill.WHITE,
    backgroundStroke: Stroke.DIM_GRAY,
    insets: [5, 10],
    textSize: 15
});
/**
 * The arrow at the source.
 * @type {Arrow}
 */
const sourceArrowStyle = new Arrow({
    type: ArrowType.CIRCLE,
    stroke: Stroke.DIM_GRAY,
    fill: Fill.DIM_GRAY,
    cropLength: 0
});
/**
 * The arrow at the target
 * @type {Arrow}
 */
const targetArrowStyle = new Arrow({
    type: ArrowType.DEFAULT,
    stroke: Stroke.DIM_GRAY,
    fill: Fill.DIM_GRAY,
    cropLength: 1
});
/**
 * The color of the edge.
 * @type {Stroke}
 */
const edgeStroke = new Stroke({
    fill: Fill.DIM_GRAY,
    thickness: 1
});
/**
 * The edge style.
 * @type {PolylineEdgeStyle}
 */
export const edgeStyle = new PolylineEdgeStyle({
    stroke: edgeStroke,
    sourceArrow: sourceArrowStyle,
    targetArrow: targetArrowStyle,
    smoothingLength: 200
});
