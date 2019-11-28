'use strict';

import {dataViewObjectsParser} from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

export class EdgeSettings {
    public show: boolean = true;
    public showLabel: boolean = true;
    public color: string = '#3E3E3E';
    public labelColor: string = '#3E3E3E';
    public width: number = 1;
    public labelSize: number = 10;
    public labelSuffix: string = '%';
    public sourceArrow: ArrowType = ArrowType.Circle;
    public targetArrow: ArrowType = ArrowType.None;
    public bundleHierarchicEdges: boolean = true;
}

export class NodeSettings {
    public color: string = '#8EB1D6';
    public borderColor: string = '#2D5380';
    public mainLabelColor: string = '#ffffff';
    public subLabelColor: string = '#2D5380';
    public topLabelColor: string = '#2D5380';
    public borderWidth: number = 1;
    public nodeReSize: boolean = true;
    public showTopLabel: boolean = true;
    public showBottomLabel: boolean = true;
    public topLabelIsRestPercentage: boolean = false;
}

export class NeighborhoodSettings {
    public show: boolean = false;
    public maxParentLevel: number = 2;
    public maxChildrenLevel: number = 2;
}

export enum NetworkLayoutStyle {
    Organic = <any>'Organic',
    Hierarchic = <any>'Hierarchic',
    Tree = <any>'Tree'
}

export enum LayoutDirection {
    TopToBottom = <any>'TopToBottom',
    BottomToTop = <any>'BottomToTop',
    LeftToRight = <any>'LeftToRight',
    RightToLeft = <any>'RightToLeft'
}

export enum ArrowType {
    None = <any>'None',
    Default = <any>'Default',
    Simple = <any>'Simple',
    Circle = <any>'Circle',
    Diamond = <any>'Diamond'
}

export class NetworkSettings {
    public layoutStyle: NetworkLayoutStyle = NetworkLayoutStyle.Tree;
    public zoomSelectFactor: number = 1.3;
    public highlightColor: string = '#e9661d';
    public invertEdges: boolean = false;
    public layoutDirection: LayoutDirection = LayoutDirection.TopToBottom;
}

export class VisualSettings extends DataViewObjectsParser {
    public edges: EdgeSettings = new EdgeSettings();
    public network: NetworkSettings = new NetworkSettings();
    public nodes: NodeSettings = new NodeSettings();
    public neighborhood: NeighborhoodSettings = new NeighborhoodSettings();
}
