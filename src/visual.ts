'use strict';

import 'core-js/stable';
import './../style/visual.less';
import lic from '../yfiles/lib/license.json';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import {VisualSettings} from './settings';
import {DataViewObjectsParser} from 'powerbi-visuals-utils-dataviewutils/lib/dataViewObjectsParser';
import {
    GraphComponent, Rect, License, Point,
    Class,
    LayoutExecutor,
    IGraph, GraphBuilder, OrganicLayout, HierarchicLayout, TimeSpan, INode, ShinyPlateNodeStyle, Fill, ShapeNodeStyle, ShapeNodeShape
} from 'yfiles';
import * as _ from 'lodash';

export class TextSettings {
    public textColor: string = 'orange';

}


Class.ensure(LayoutExecutor);

export class Visual implements IVisual {
    private target: HTMLElement;
    private updateCount: number;
    private settings: VisualSettings;
    private textNode: Text;
    private new_p: HTMLParagraphElement;
    private graphComponent: GraphComponent;
    private graph: IGraph;
    private data: powerbi.DataView;

    constructor(options: VisualConstructorOptions) {
        this.setLicense();
        this.target = options.element;
        this.updateCount = 0;
        if (typeof document !== 'undefined') {

            const div: HTMLDivElement = document.createElement('div');
            div.setAttribute('id', 'graphHost');
            div.style.width = '100%';
            div.style.height = '100%';

            this.target.appendChild(div);
            this.graphComponent = new GraphComponent('#graphHost');
            this.graph = this.graphComponent.graph;
            this.graphComponent.graph.nodeDefaults.style = new ShapeNodeStyle({
                fill: Fill.STEEL_BLUE,
                shape: ShapeNodeShape.ELLIPSE
            });
        }
    }
    setLicense() {
        License.value = lic;
    }

    public update(options: VisualUpdateOptions) {
        if (!options
            || !options.dataViews
            || !options.dataViews[0]
            || _.isNil(this.graph)
        ) {
            return;
        }
        this.data = options.dataViews[0];
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);

        if (this.data.categorical && this.data.categorical.categories) {
            const sources = this.data.categorical.categories[0].values;
            const targets = this.data.categorical.categories[1].values;
            const uniqueIds = Array.from(new Set([...sources, ...targets])).map(i => {
                return {
                    id: i.toString()
                }
            });
            const edgeData = _.zip(sources, targets).map(pair => {
                return {
                    source: pair[0].toString(),
                    target: pair[1].toString()
                }
            });
            // debugger
            const graphBuilder = new GraphBuilder(this.graph);
            graphBuilder.nodesSource = uniqueIds;
            graphBuilder.nodeIdBinding = 'id';
            graphBuilder.edgeLabelBinding = 'id';
            graphBuilder.edgesSource = edgeData;
            graphBuilder.sourceNodeBinding = 'source';
            graphBuilder.targetNodeBinding = 'target';
            graphBuilder.edgeLabelBinding = null;
            graphBuilder.buildGraph();
            this.graph.nodes.forEach((n: INode) => {
                n.layout.x = Math.random() * 300;
                n.layout.y = Math.random() * 300;
            });
            const layout = new OrganicLayout({
                minimumNodeDistance: 120
            });
            this.graphComponent.morphLayout(layout).then(() => {
                console.log(`node count:${this.graph.nodes.size}`);
            })
        }

    }

    private static parseSettings(dataView: DataView): VisualSettings {


        return VisualSettings.parse(dataView) as VisualSettings;
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}
