import powerbi from "powerbi-visuals-api";
import {FormattingSettingsService} from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import {NetworkLayoutStyle, VisualFormattingSettingsModel} from "./settings";
import licenseJson from "../yFiles/license.json";
import {
    Arrow,
    ArrowType,
    Class,
    Color,
    DefaultGraph,
    DefaultLabelStyle,
    EdgeSegmentLabelModel,
    EdgeSides, Fill,
    FilteredGraphWrapper,
    GraphComponent,
    GraphItemTypes,
    GraphStructureAnalyzer,
    GraphViewerInputMode,
    HierarchicLayout,
    HierarchicLayoutData,
    IGraph, ILayoutAlgorithm,
    INode,
    InteriorLabelModel,
    LayoutExecutor,
    LayoutOrientation,
    License, OrganicEdgeRouter,
    OrganicLayout,
    OrganicLayoutData,
    Point,
    PolylineEdgeStyle,
    Rect, SequentialLayout,
    ShapeNodeShape,
    ShapeNodeStyle,
    Size,
    SolidColorFill,
    Stroke,
    TextRenderSupport,
    TreeLayout,
    TreeLayoutData
} from "yfiles";
import {INodeSourceItem} from "./INodeSourceItem";
import {IEdgeSourceItem} from "./IEdgeSourceItem";
import {edgeLabelModel, edgeLabelStyle, edgeStyle, nodeLabelStyle, shapeStyle} from "./styling";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionIdBuilder = powerbi.extensibility.ISelectionIdBuilder;
import {NeighborType} from "./neighborType";
import DataViewValueColumn = powerbi.DataViewValueColumn;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewCategorical = powerbi.DataViewCategorical;

function debug(msg) {
    // just comment out if you wish to hide the logging
    // console.log(msg);
}

const zip = (a, b) => a.map((k, i) => [k, b[i]]);
const unique = ar => [...new Set(ar)];
const range = (n) => [...Array(n).keys()];
const isNil = (x) => x == null;
const remove = (ar, predicate) => {
    ar = ar.filter(x => !predicate(x))
    return ar;
}
const min = (ar) => Math.min(...ar);
const cloneArray = (ar) => ar.map(item => Object.assign({}, item));
Class.ensure(LayoutExecutor);

export class Visual implements IVisual {

    //region Fields
    /**
     * Root widget host element in which the diagram is placed.
     * @type {HTMLElement}
     */
    private hostElement: HTMLElement;
    /**
     * The yFiles component.
     */
    private graphComponent: GraphComponent;
    /**
     * The settings at design-time.
     * Part of the PowerBI framework.
     * @type {VisualFormattingSettingsModel}
     */
    private formattingSettings: VisualFormattingSettingsModel;
    /**
     * The settings service.
     * Part of the PowerBI framework.
     * @type {FormattingSettingsService}
     */
    private formattingSettingsService: FormattingSettingsService;
    /**
     * Enables cross-widget selection.
     */
    private selectionIdBuilder: ISelectionIdBuilder;

    /**
     * Part of the PBI mechanics to highlight selections.
     */
    private selectionManager: ISelectionManager;
    private graph: IGraph;
    /**
     * The mapping from feature name to field names.
     * That is, from the predefined widget features to the dataset field names (if CSV or JSON, the names therein).
     */
    private dataFieldMap: {};
    /**
     * The specs of the current highlight.
     */
    private highlights: any[];
    /**
     * All the id's, corresponding to the raw column of id's.
     * One has multiplicity here but this source is needed to find row indices.
     */
    private nodeIds: string[];

    /**
     * The global stroke of all the nodes.
     */
    private nodeStroke: Stroke;
    /**
     * Cached node data.
     */
    private cachedNodeSource: INodeSourceItem[];
    /**
     * Debounces the update method.
     * @type {any}
     */
    timestamp = null;

    /**
     * Cached edge data.
     */
    private cachedEdgeSource: IEdgeSourceItem[];

    /**
     * The node data defining the graph nodes.
     * The id's are unique in here.
     */
    private nodesSource: INodeSourceItem[];

    /**
     * The payload of edges.
     */
    private edgesSource: IEdgeSourceItem[];

    /**
     * Root of the datasets. We use only categorical data for the network creation.
     */
    private data: powerbi.DataView;

    /**
     * The visual host given by PBI.
     */
    private host: powerbi.extensibility.visual.IVisualHost;
    /**
     * The filtered graph wrapper around the {@link fullGraph}.
     */
    private filteredGraph: FilteredGraphWrapper;

    /**
     * The node ids being filtered out.
     */
    private filteredNodeIds: string[];

    /**
     * The filtering predicate of the {@link filteredGraph}.
     */
    private nodeFilter: (n: INode) => boolean;

    /**
     * The graph underneath the {@link filteredGraph}.
     */
    private fullGraph: DefaultGraph;

    /**
     * The graph analyzer of the {@link graph}.
     */
    private analyzer: GraphStructureAnalyzer;
    private ignoreNeighborhoodSettings: boolean;
    //endregion

    //region Constructor
    /**
     * Instantiates the visual and sets up the diagram component.
     * The actual construction of the graph happens in the {@link update} method.
     * @param options
     */
    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        this.hostElement = options.element;
        this.highlights = [];
        this.filteredNodeIds = [];
        if (document) {
            this.setLicense()
            this.createGraphComponent()
            this.createSelectionMechanics();
        }
    }

    //endregion

    //region Methods
    /**
     * Sets the yFiles license.
     */
    setLicense() {
        License.value = licenseJson;
    }

    private createGraphComponent() {
        const div: HTMLDivElement = document.createElement('div');

        div.setAttribute('id', 'graphHost');
        div.style.width = '100%';
        div.style.height = '100%';
        this.hostElement.appendChild(div);
        this.graphComponent = new GraphComponent('#graphHost');
        this.graphComponent.inputMode = this.setGraphInteractions();

        this.nodeFilter = (n: INode) => {
            // we use a filtered graph only for displaying neighborhood views.
            if ((this.formattingSettings && !this.formattingSettings.neighborhoodSettings.show) || this.ignoreNeighborhoodSettings) {
                return true;
            }

            return this.filteredNodeIds.includes(n.tag.id);
        };
        this.fullGraph = new DefaultGraph();
        this.filteredGraph = new FilteredGraphWrapper(this.fullGraph, this.nodeFilter, (e) => true);
        this.graph = this.filteredGraph;
        this.graphComponent.graph = this.filteredGraph;
        this.analyzer = new GraphStructureAnalyzer(this.graph);

    }


    private setStyle() {

        this.graph.nodeDefaults.size = new Size(80, 50);

        this.graph.nodeDefaults.style = new ShapeNodeStyle({
            fill: new SolidColorFill(new Color(141, 177, 218)),
            shape: ShapeNodeShape.RECTANGLE
        });

        this.nodeStroke = new Stroke({
            fill: Fill.from(this.formattingSettings.nodeSettings.borderColor.value.value.toString()),
            thickness: parseFloat(this.formattingSettings.nodeSettings.borderWidth.value.toString())
        });
    }

    /**
     * Every time something changes in the edit mode of the widget this method gets called.
     * @param options
     */
    public update(options: VisualUpdateOptions) {

        // a simple debounce
        if (this.timestamp === null) {
            this.timestamp = Date.now() + 1000; // 1secs
        } else {
            if (Date.now() < this.timestamp) {
                return;
            } else {
                this.timestamp = null;
            }
        }
        // no need to render things if there ain;t any data
        if (!options
            || !options.dataViews
            || !options.dataViews[0]
            || (this.graph == null)
        ) {
            return;
        }

        // const dataView: powerbi.DataView = options.dataViews[0];
        // const categoricalDataView: DataViewCategorical = dataView.categorical;
        // const categories: DataViewCategoryColumn = categoricalDataView.categories[0];
        // const categoryValues = categories.values;
        //
        // const measures: DataViewValueColumn = categoricalDataView.values[0];
        // const measureValues = measures.values;
        // const measureHighlights = measures.highlights;
        // debugger

        // access to all data
        this.data = options.dataViews[0];

        // access to the formatting options
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
        this.setStyle();

        // we use only categorical data for the graph
        if (!(this.data.categorical && this.data.categorical.categories)) {
            return;
        }
        // need a map to know whether we get data from highlights or a normal view
        this.createDataMapping();

        try {
            if (!this.formattingSettings.neighborhoodSettings.show) {
                this.clearGraphFilter();
            }
            if (this.isHighlight) {
                this.ignoreNeighborhoodSettings = false;
                this.clearHighlight();
                this.highlightSelection();
                if (this.formattingSettings.neighborhoodSettings.show) {
                    this.layout();
                }
            } else if (this.isFiltered) {
                debug('Filtered data presented.');
                this.ignoreNeighborhoodSettings = false;
                this.clearHighlight();
                this.fullGraph.clear();
                this.highlights = [];

                this.buildGraph(false);
                this.layout();
            } else {
                this.ignoreNeighborhoodSettings = true;
                this.fullGraph.clear();
                this.highlights = [];
                this.buildGraph(true);
                this.layout();
            }
        } catch (e) {
            // PowerBI swallows all error...
            debugger;
        }
    }

    clearGraphFilter() {
        this.filteredNodeIds = [];
        this.filteredGraph.nodePredicateChanged();
    }

    /**
     * Whether the update is a filtered view of the network.
     */
    private get isFiltered() {
        const notHighlight = !(this.data.categorical.values == null) && this.data.categorical.values.length > 0 && !!this.data.categorical.values[0].values;
        if (notHighlight) {
            const values = this.data.categorical.values[0].values;
            if (this.cachedNodeSource) {
                if (values.length < this.cachedNodeSource.length) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Whether the view is a highlight of the current data.
     */
    private get isHighlight() {
        return !(this.data.categorical.values == null) && this.data.categorical.values.length > 0 && !!this.data.categorical.values[0].highlights
    }

    private highlightSelection() {
        const selection = this.data.categorical.values[0].highlights;
        const found = selection.filter(x => {
            return !(x == null);
        });
        debug(`Highlights: ${found.length}`);
        // fetching the row indices of non-nil elements aka selection
        const rowIndices = ((zip(range(selection.length), selection)).filter(t => {
            return !(t[1] == null)
        })).map(t => t[0]);

        const nodeIds: string[] = rowIndices.map(i => this.nodeIds[i]);
        debug(`Highlights2: ${nodeIds.length}`);
        if (nodeIds.length > 0) {
            let firstNode;
            for (let i = 0; i < nodeIds.length; i++) {
                const nodeId = nodeIds[i];
                const node = this.getNodeById(nodeId);
                if (i === 0) {
                    firstNode = node; // we zoomfocus only the first one
                }
                this.highlightNode(node);
            }
            // should we show only the neighbors?
            if (this.formattingSettings.neighborhoodSettings.show && !this.ignoreNeighborhoodSettings) {
                this.filteredNodeIds = this.getNeighborhoodOf(nodeIds, true);
                debug(`Highlight neighborhood reduced to ${this.filteredNodeIds.length}`);
                this.filteredGraph.nodePredicateChanged();
            }
            const nodeMidPoint = firstNode.layout.toPoint().add(new Point(firstNode.layout.width / 2, firstNode.layout.height / 2));
            this.graphComponent.zoomToAnimated(nodeMidPoint, this.formattingSettings.networkSettings.zoomSelectFactor.value);
        }

    }

    /**
     * Returns the neighborhood of the given items.
     * @param ids
     * @param includeGivenItems
     */
    private getNeighborhoodOf(ids: string[], includeGivenItems = true): string[] {
        let neighborIds = [];
        //fetch the node source for the ids
        const nodeSources = ids.map(id => this.getCachedNodeItem(id)) as INodeSourceItem[];
        for (let i = 0; i < nodeSources.length; i++) {
            let neighbors = this.fetchNeighbors(nodeSources[i], this.formattingSettings.neighborhoodSettings.maxChildrenLevel.value, this.formattingSettings.neighborhoodSettings.maxParentLevel.value);
            neighborIds = neighborIds.concat(neighbors);
        }
        // the different nodes might have overlapping neighborhoods
        neighborIds = unique(neighborIds);

        if (includeGivenItems) {
            neighborIds = neighborIds.concat(ids);
        }

        return neighborIds;
    }

    private getCachedNodeItem(id: string): INodeSourceItem {
        if ((this.cachedNodeSource == null)) {
            throw new Error('Attempt to fetch a node source but no cache present.');
        }
        return this.cachedNodeSource.find((n: INodeSourceItem) => {
            return n.id === id
        });
    }

    private augmentNodeSourceWithNeighbors() {

        if (!this.formattingSettings.neighborhoodSettings.show) {
            return;
        }
        if (isNil(this.cachedNodeSource)) {
            throw new Error('No cache to augment with.');
        }

        let toAdd = [];
        for (let i = 0; i < this.nodesSource.length; i++) {
            let neighbors = this.fetchNeighbors(this.nodesSource[i], this.formattingSettings.neighborhoodSettings.maxChildrenLevel.value, this.formattingSettings.neighborhoodSettings.maxParentLevel.value);
            toAdd = toAdd.concat(neighbors);
        }
        // the different nodes might have overlapping neighborhoods
        toAdd = unique(toAdd);

        this.filteredNodeIds = this.nodesSource.map(n => n.id).concat(toAdd);
        this.edgesSource = this.cachedEdgeSource;
        // from id's to INodeSourceItem
        toAdd = toAdd.map(id => this.getCachedNodeItem(id));
        this.nodesSource = this.nodesSource.concat(toAdd);

        debug(`augmented node source with ${toAdd.length} nodes`);

    }

    /**
     * Fetches the neighborhood of the given item with specified maximum depth.
     * @param node
     * @param maxChildLevel
     * @param maxParentLevel
     */
    private fetchNeighbors(node: INodeSourceItem, maxChildLevel: number = 2, maxParentLevel: number = 2): INode[] {

        let neighbors = [];
        const collector = (item: INodeSourceItem, level: number) => {
            item.layerIndex = level;
            neighbors.push(item.id); // we'll de-duplicate things late on
        };

        // note that the BFS also collects the item we start with;
        // we'll remove this at the end
        if (this.formattingSettings.networkSettings.invertEdges) {
            this.bfs(node, maxParentLevel, NeighborType.Child, collector);
            this.bfs(node, maxChildLevel, NeighborType.Parent, collector);
        } else {
            this.bfs(node, maxChildLevel, NeighborType.Child, collector);
            this.bfs(node, maxParentLevel, NeighborType.Parent, collector);
        }

        // remote the starting id
        neighbors = neighbors.filter(id => id !== node.id);
        // remove duplicates
        neighbors = unique(neighbors);
        return neighbors;
    }

    /**
     * Breadth-first traversal with maximum depth.
     * @param item {INodeSourceItem} The node where the traversal starts.
     * @param maxLevel {number} The maximum depth to traverse. Zero is the given node, the first level is one and so on.
     * @param direction {NeighborType} In which direction to traverse the graph.
     * @param callback What to do with the visited node.
     */
    private bfs(item: INodeSourceItem, maxLevel = 1, direction: NeighborType = NeighborType.Child, callback: (n: INodeSourceItem, level: number) => void) {
        if ((callback == null)) {
            throw new Error('Given BFS callback is nil.');
        }
        if ((item == null)) {
            throw new Error('Given BFS item is nil.');
        }
        if (maxLevel < 0) {
            return;
        }

        const queue = [item, null]; // null denotes the end of a level
        let n;
        let level = 0;
        while (queue.length > 0) {
            n = queue.shift();
            if (n == null) {
                level++;
                queue.push(null);

                if (queue[0] === null) {
                    break;
                }
            } else {
                if (callback) {
                    callback(n, level);
                }
                if (level !== maxLevel) {
                    const siblings = this.getSiblings(n, direction);
                    if (siblings.length === 0) {
                        continue;
                    }
                    for (let i = 0; i < siblings.length; i++) {
                        queue.push(siblings[i]);
                    }
                }
            }
        }
    }

    /**
     * Fetches the siblings of the given item.
     * This goes via the cached data.
     * @param item {INodeSourceItem} An item
     * @param neighborType {NeighborType} The direction to look for siblings.
     */
    private getSiblings(item: INodeSourceItem, neighborType: NeighborType = NeighborType.Child): INodeSourceItem[] {
        let ids = [];
        switch (neighborType) {
            case NeighborType.Parent:
                ids = this.cachedEdgeSource.filter((e: IEdgeSourceItem) => e.targetId === item.id).map(e => e.sourceId);
                break;
            case NeighborType.Child:
                ids = this.cachedEdgeSource.filter((e: IEdgeSourceItem) => e.sourceId === item.id).map(e => e.targetId);
                break;
        }
        if (ids.length === 0) {
            return [];
        }
        return this.cachedNodeSource.filter((n: INodeSourceItem) => ids.includes(n.id));
    }

    /**
     * The graph layout pass.
     */
    private layout(): void {
        let layout;
        let layoutData: any = null;
        switch (this.formattingSettings.networkSettings.layoutStyle.value.value.toString().toLowerCase()) {
            case "organic":
                layout = new OrganicLayout({
                    minimumNodeDistance: 120
                });
                layoutData = new OrganicLayoutData();
                layoutData.edgeDirectedness.constant = 1;
                break;
            case "hierarchic":
                layout = new HierarchicLayout({
                    minimumLayerDistance: 50,
                    layoutOrientation: this.getLayoutDirection(),

                });
                if (this.formattingSettings.edgeSettings.bundleHierarchicEdges.value) {
                    layoutData = new HierarchicLayoutData({
                        sourceGroupIds: edge => edge.sourceNode,
                        targetGroupIds: edge => edge.targetNode
                    });
                } else {
                    layoutData = new HierarchicLayoutData();
                }
                layoutData.edgeDirectedness.constant = 1;

                (layoutData as HierarchicLayoutData).bfsLayererCoreNodes = this.findRoots() as any;
                break;
            case "tree":
                const isTree = this.analyzer.isTree(false);
                if (isTree) {
                    layout = new TreeLayout({
                        layoutOrientation: this.getLayoutDirection()
                    });
                    layoutData = new TreeLayoutData();
                    const roots = this.findRoots();
                    if (roots && roots.length > 0) {
                        (layoutData as TreeLayoutData).treeRoot.item = roots[0];
                    }

                } else {
                    layout = new HierarchicLayout({
                        minimumLayerDistance: 50,
                        layoutOrientation: this.getLayoutDirection(),

                    });
                    if (this.formattingSettings.edgeSettings.bundleHierarchicEdges.value) {
                        layoutData = new HierarchicLayoutData({
                            sourceGroupIds: edge => edge.sourceNode,
                            targetGroupIds: edge => edge.targetNode
                        });
                    } else {
                        layoutData = new HierarchicLayoutData();
                    }
                    layoutData.edgeDirectedness.constant = 1;

                    (layoutData as HierarchicLayoutData).bfsLayererCoreNodes = this.findRoots() as any;
                    break;
                }

        }
        try {

            // we ignore async here but that's OK considering that nothing else happens beyond this
            this.graphComponent.morphLayout({
                layout: layout,
                layoutData: layoutData
            });
        } catch (e) {
            console.error(e);
            debugger
        }
    }

    private getLayoutDirection(): LayoutOrientation {
        switch (this.formattingSettings.networkSettings.layoutDirection.value.toString().toLowerCase()) {
            case "toptobottom":
                return LayoutOrientation.TOP_TO_BOTTOM;
            case "bottomtotop":
                return LayoutOrientation.BOTTOM_TO_TOP;
            case "lefttoright":
                return LayoutOrientation.LEFT_TO_RIGHT;
            case "righttoleft":
                return LayoutOrientation.RIGHT_TO_LEFT;
        }
    }

    /**
     * Fetches the last node with minimum outdegree, i.e. with the least amount of parents.
     */
    private findRoots() {
        if (isNil(this.graph)) {
            return null;
        }

        const dic = {};

        this.graph.nodes.forEach(n => {
            dic[n.tag.id] = {
                outDegree: this.graph.outDegree(n),
                node: n
            };
        });
        const minOutDegree = min(Object.entries(dic).map(([k, v]) => (v as any).outDegree));
        const roots = [];
        for (let k in dic) {
            if (dic[k].outDegree === minOutDegree) {
                roots.push(dic[k].node);
            }
        }
        return roots;
    }



    /**
     * Defines the interactions with the graph.
     */
    private setGraphInteractions() {
        // this defines a read-only diagram
        const mode = new GraphViewerInputMode();
        mode.selectableItems = GraphItemTypes.NODE;
        mode.selectableItems = GraphItemTypes.NONE;
        mode.marqueeSelectableItems = GraphItemTypes.NONE;
        mode.marqueeSelectionInputMode.enabled = false;

        // clicking the canvas disables any highlight, like other PBI widgets
        mode.addCanvasClickedListener((sender, args) => {
            this.clearHighlight();
            // let other widgets know there is nothing selected anymore
            this.selectionManager.clear();
            args.handled = true;
        });

        // clickin a node will highlight it
        mode.addItemLeftClickedListener((sender, args) => {

            const node = args.item;
            if (node !== null && INode.isInstance(node)) { // could an edge or a label in principle
                // clear the previous highlight, if any
                this.clearHighlight();
                this.highlightNode(node);
                // let other widgets know we have a network selection.
                this.selectionManager.select(node.tag.identity);
                args.handled = true;
            }
        });
        return mode;
    }

    /**
     * Clears any of the highlights and notifies other widgets about it.
     */
    private clearHighlight() {
        if (this.highlights == null || this.highlights.length === 0) {
            return;
        }

        for (let i = 0; i < this.highlights.length; i++) {
            const highlightedItem = this.highlights[i];
            try {
                const previousNode = this.getNodeById(highlightedItem.id);
                if (previousNode) {
                    this.graph.setStyle(previousNode, highlightedItem.oldStyle);
                }
            } catch (e) {
                debugger
            }
        }
        this.highlights = [];
        this.filteredNodeIds = [];
    }

    /**
     * Returns the (unique) node with the given id.
     * @param id The id coming from the 'FromId' feature.
     */
    private getNodeById(id): INode {
        if (this.fullGraph == null) {
            throw new Error('The graph is not set.')
        }
        return this.fullGraph.nodes.find({
            predicate: n => {
                return n.tag.id === id.toString();
            }
        })

    }

    /**
     * Highlights the specified node.
     * @param node
     */
    private highlightNode(node: INode): void {
        if (node == null) {
            throw new Error('Attempt to highlight nil node.');
        }
        // is the node already in the collection?
        const found = this.highlights.find(h => {
            return h.id === node.tag.id
        });
        if (found == null) {
            const newHighlight = {
                value: this.data.categorical.values[0].highlights.find(x => !(x == null)),
                id: node.tag.id,
                oldStyle: node.style
            };
            this.highlights.push(newHighlight);
            debug(`Highlight added: ${newHighlight.value}`);
            const highlightStyle = this.getHighlightStyle(node);
            this.graph.setStyle(node, highlightStyle);
        }
    }

    private getHighlightStyle(node): ShapeNodeStyle {
        return new ShapeNodeStyle({
            shape: (node.style as ShapeNodeStyle).shape,
            fill: Fill.from(this.formattingSettings.networkSettings.highlightColor.value.value.toString()),
            stroke: this.nodeStroke
        });
    }

    /**
     * Assembles the graph using the generated data mappings.
     */
    private buildGraph(updateCache = true) {

        this.nodesSource = this.createNodeSource();
        this.edgesSource = this.createEdgeSource();
        // debugger
        if (updateCache) {
            this.cachedNodeSource = cloneArray(this.nodesSource);
            this.cachedEdgeSource = cloneArray(this.edgesSource);
        }
        debug(`cached sources: ${this.cachedNodeSource.length} nodes and ${this.cachedEdgeSource.length} edges`);

        debug(`original node source: ${this.nodesSource.length}`);
        if (this.isFiltered) {
            this.augmentNodeSourceWithNeighbors();

        }
        if (isNil(this.nodesSource) || this.nodesSource.length === 0) {
            return;
        }

        const edgeStroke = new Stroke({
            fill: this.formattingSettings.edgeSettings.color.value.value.toString(),
            thickness: parseFloat(this.formattingSettings.edgeSettings.width.value.toString())
        });
        const styleMap = {
            'rectangle': new ShapeNodeStyle({
                shape: 'rectangle',
                fill: Fill.from(this.formattingSettings.nodeSettings.color.value.value.toString()),
                stroke: this.nodeStroke
            }),
            'ellipse': new ShapeNodeStyle({
                shape: 'ellipse',
                fill: Fill.from(this.formattingSettings.nodeSettings.color.value.value.toString()),
                stroke: this.nodeStroke
            }),
            'round-rectangle': new ShapeNodeStyle({
                shape: 'round-rectangle',
                fill: Fill.from(this.formattingSettings.nodeSettings.color.value.value.toString()),
                stroke: this.nodeStroke
            }),
            'roundrectangle': new ShapeNodeStyle({
                shape: 'round-rectangle',
                fill: Fill.from(this.formattingSettings.nodeSettings.color.value.value.toString()),
                stroke: this.nodeStroke
            }),
            'pill': new ShapeNodeStyle({
                shape: "pill",
                fill: Fill.from(this.formattingSettings.nodeSettings.color.value.value.toString()),
                stroke: this.nodeStroke
            }),
            'octagon': new ShapeNodeStyle({
                shape: "octagon",
                fill: Fill.from(this.formattingSettings.nodeSettings.color.value.value.toString()),
                stroke: this.nodeStroke
            }),
            'triangle': new ShapeNodeStyle({
                shape: "triangle",
                fill: Fill.from(this.formattingSettings.nodeSettings.color.value.value.toString()),
                stroke: this.nodeStroke
            })

        };

        const nodeDic = {};
        for (let i = 0; i < this.nodesSource.length; i++) {
            const item = this.nodesSource[i];
            const mainLabel = item.label || '';
            const subLabel = item.subLabel || '';
            const topLabel = item.topLabel || '';
            const node = this.fullGraph.createNode({
                layout: new Rect(this.graphComponent.size.width / 2, this.graphComponent.size.height / 2, this.graph.nodeDefaults.size.width, this.graph.nodeDefaults.size.height),
                tag: item,
                style: styleMap[(item.shape || 'rectangle').toLowerCase()] || styleMap["rectangle"]
            });
            // @ts-ignore
            const font = this.fullGraph.getLabelDefaults(node).style.font;

            let labelMargin = 15;
            let nodeWidth = 50 + labelMargin;
            let nodeHeight = 40 + labelMargin;
            if (this.formattingSettings.nodeSettings.nodeReSize.value) {
                const mainLabelSize = TextRenderSupport.measureText(mainLabel, font);
                const subLabelSize = TextRenderSupport.measureText(subLabel, font);
                const topLabelSize = TextRenderSupport.measureText(topLabel, font);
                // either the shape's width is defined by the label or it's minimum 50, in any case less than 300px
                nodeWidth = Math.min(Math.max(Math.max(mainLabelSize.width, subLabelSize.width, topLabelSize.width), 40) + labelMargin, 300);
                nodeHeight = mainLabelSize.height + subLabelSize.height + topLabelSize.height + labelMargin;
            }

            this.fullGraph.setNodeLayout(node, new Rect(node.layout.toPoint(), new Size(nodeWidth, nodeHeight)));

            this.fullGraph.addLabel({
                owner: node,
                text: mainLabel,
                style: new DefaultLabelStyle({
                    textFill: Fill.from(this.formattingSettings.nodeSettings.mainLabelColor.value.value.toString()),
                    insets: 5
                }),
                layoutParameter: InteriorLabelModel.CENTER
            });
            this.fullGraph.addLabel({
                owner: node,
                text: subLabel,
                layoutParameter: InteriorLabelModel.SOUTH,
                style: new DefaultLabelStyle({
                    textFill: Fill.from(this.formattingSettings.nodeSettings.subLabelColor.value.value.toString()),
                    textSize: 10,
                    insets: [7, 0, 3, 0]
                })
            });
            this.fullGraph.addLabel({
                owner: node,
                text: topLabel,
                layoutParameter: InteriorLabelModel.NORTH,
                style: new DefaultLabelStyle({
                    textFill: Fill.from(this.formattingSettings.nodeSettings.topLabelColor.value.value.toString()),
                    textSize: 10,
                    insets: [3, 0, 7, 0]
                })
            });

            nodeDic[item.id.toString()] = node;
        }
        debug(`node dictionary: ${Object.keys(nodeDic).length}`);

        if (this.formattingSettings.edgeSettings.show.value) {


            let edgeLabelSource = this.getCategoricalData('EdgeLabel');

            if (isNil(this.edgesSource) || this.edgesSource.length === 0) {
                return;
            }
            const labelModel = new EdgeSegmentLabelModel({
                autoRotation: false,
                offset: 10
            });
            const edgeLabelStyle = new DefaultLabelStyle({
                textFill: Fill.from(this.formattingSettings.edgeSettings.labelColor.value.value.toString()),
                textSize: Math.max(5, Math.min(30, parseInt(this.formattingSettings.edgeSettings.labelSize.value.toString())))
            });
            const sourceArrowStyle = new Arrow({
                type: this.getArrowType(this.formattingSettings.edgeSettings.sourceArrow.value.value.toString()),
                stroke: Stroke.from(this.formattingSettings.edgeSettings.color.value.value.toString()),
                fill: Fill.from(this.formattingSettings.edgeSettings.color.value.value.toString()),
                cropLength: 0
            });

            const targetArrowStyle = new Arrow({
                type: this.getArrowType(this.formattingSettings.edgeSettings.targetArrow.value.value.toString()),
                stroke: Stroke.from(this.formattingSettings.edgeSettings.color.value.value.toString()),
                fill: Fill.from(this.formattingSettings.edgeSettings.color.value.value.toString()),
                cropLength: 1
            });
            const edgeStyle = new PolylineEdgeStyle({
                stroke: edgeStroke,
                sourceArrow: sourceArrowStyle,
                targetArrow: targetArrowStyle,
                smoothingLength: 200
            });


            let showEdgeLabel = this.formattingSettings.edgeSettings.showLabel.value && !isNil(edgeLabelSource) && edgeLabelSource.length > 0;
            for (let i = 0; i < this.edgesSource.length; i++) {
                try {
                    if (isNil(this.edgesSource[i].sourceId) || isNil(this.edgesSource[i].targetId) || isNil(nodeDic[this.edgesSource[i].sourceId]) || isNil(nodeDic[this.edgesSource[i].targetId])) {
                        continue; // happens when the data defines an edge without defining both endpoints
                    }
                    let s = this.edgesSource[i].sourceId;
                    let t = this.edgesSource[i].targetId;

                    if (this.formattingSettings.networkSettings.invertEdges) {
                        s = this.edgesSource[i].targetId;
                        t = this.edgesSource[i].sourceId;
                    }
                    const edge = this.fullGraph.createEdge({
                        source: nodeDic[s],
                        target: nodeDic[t]
                    });
                    this.fullGraph.setStyle(edge, edgeStyle);

                    if (!isNil(edgeLabelSource) && !isNil(edgeLabelSource[i])) {
                        edge.tag = edgeLabelSource[i];
                        if (showEdgeLabel) {
                            const edgeLabelText = edgeLabelSource[i] + this.formattingSettings.edgeSettings.labelSuffix.value;
                            const edgeLabelLayoutParameter = labelModel.createParameterFromSource(0, 0.0, EdgeSides.LEFT_OF_EDGE);

                            const label = this.fullGraph.addLabel(edge, edgeLabelText, edgeLabelLayoutParameter, edgeLabelStyle);
                        }
                    }
                } catch (e) {
                    debugger

                }
            }
            if (this.formattingSettings.nodeSettings.topLabelIsRestPercentage.value && !isNil(edgeLabelSource)) {
                const restPercentages = {};
                this.fullGraph.edges.forEach(e => {
                    const id = e.sourceNode.tag.id.toString();
                    if (restPercentages[id]) {
                        restPercentages[id] -= parseFloat(e.tag || '0');
                    } else {
                        restPercentages[id] = Math.round((100 - parseFloat(e.tag || '0')) * 100) / 100;
                    }
                });
                this.fullGraph.nodes.forEach(n => {
                    const topLabel = n.labels.find(lab => lab.layoutParameter === InteriorLabelModel.NORTH);
                    const restPercent = restPercentages[n.tag.id.toString()];
                    if (!isNil(topLabel)) {
                        if (!isNil(restPercent) && restPercent !== 0) { // we omit the '0%' labels for visibility
                            this.fullGraph.setLabelText(topLabel, restPercent + '%')
                        } else {
                            this.fullGraph.setLabelText(topLabel, '');
                        }
                    }
                })
            }
        }
    }

    /**
     * Maps the allowed arrow types.
     * @param name Name of tha arrow as defined in the capabilities.
     */
    private getArrowType(name): ArrowType {
        switch (name.toLowerCase()) {
            case 'default':
                return ArrowType.DEFAULT;
            case 'simple':
                return ArrowType.SIMPLE;
            case 'circle':
                return ArrowType.CIRCLE;
            case 'diamond':
                return ArrowType.DIAMOND;
            default:
                return ArrowType.NONE;
        }
    }


    /**
     * Assembles the node data source for the GraphBuilder.
     */
    private createNodeSource(): INodeSourceItem[] {

        // all the ids corresponding to the rows of edges, you have multiplicity here
        this.nodeIds = this.getCategoricalData('NodeId');

        if (isNil(this.nodeIds)) {
            return [];
        }
        const uniqueIds = unique(this.nodeIds);
        const nodeMainLabels = this.getCategoricalData('NodeMainLabel');
        const nodeSecondLabels = this.getCategoricalData('NodeSecondLabel');
        const nodeShapes = this.getCategoricalData('NodeShape');
        const nodeTopLabels = this.getCategoricalData('NodeTopLabel');
        const nodeSource: INodeSourceItem[] = [];
        // creating unique nodes from the unique ids
        for (let i = 0; i < uniqueIds.length; i++) {
            const id = uniqueIds[i].toString();
            // pick up the first row where this id appears
            // supposed all the entity info is the same whenever this id appears, so the first will do
            const rowIndex = this.nodeIds.findIndex(x => x === id);
            const item: INodeSourceItem = {
                id: id,
                label: null,
                shape: null,
                subLabel: null,
                topLabel: null,
                identity: null,
                layerIndex: null
            };
            const categorical = this.data.categorical.categories[0];
            item.identity = this.host.createSelectionIdBuilder()
                .withCategory(categorical, rowIndex)
                .createSelectionId();
            if (nodeMainLabels && i < nodeMainLabels.length) {
                item.label = isNil(nodeMainLabels[rowIndex]) ? '' : nodeMainLabels[rowIndex].toString();
            }
            if (nodeShapes && i < nodeShapes.length) {
                item.shape = isNil(nodeShapes[rowIndex]) ? null : nodeShapes[rowIndex].toString();
            }
            if (this.formattingSettings.nodeSettings.showBottomLabel.value && nodeSecondLabels && i < nodeSecondLabels.length) {
                item.subLabel = isNil(nodeSecondLabels[rowIndex]) ? null : nodeSecondLabels[rowIndex].toString();
            }
            if (this.formattingSettings.nodeSettings.showTopLabel.value && nodeTopLabels && i < nodeTopLabels.length) {
                item.topLabel = isNil(nodeTopLabels[rowIndex]) ? null : nodeTopLabels[rowIndex].toString();
            }
            nodeSource.push(item);
        }
        return nodeSource;
    }

    /**
     * Assembles the given datasets to something yFiles can use with the GraphBuilder.
     */
    private createEdgeSource(): IEdgeSourceItem[] {
        const nodeIds = this.getCategoricalData('NodeId');
        const targetIds = this.getCategoricalData('TargetId');
        if ((targetIds == null) || targetIds.length === 0) {
            return [];
        }

        const edges: IEdgeSourceItem[] = [];
        for (let i = 0; i < nodeIds.length; i++) {
            // null target means no edge towards anything else, which happens e.g. with the root of a tree
            if ((targetIds[i] == null)) {
                continue;
            }
            const item: IEdgeSourceItem = {
                sourceId: nodeIds[i].toString(),
                targetId: targetIds[i].toString()
            };
            edges.push(item)
        }
        return edges;
    }

    /**
     * Fetches the dataset with the given name.
     * @param name
     */
    private getCategoricalData(name): string[] {
        const categoricalFields: string[] = ['NodeId', 'TargetId', 'NodeMainLabel', 'NodeSecondLabel', 'NodeShape', 'EdgeLabel', 'NodeTopLabel'];

        if (!categoricalFields.includes(name, 0)) {
            return null;
        }
        const fieldDefinition = this.dataFieldMap[name];

        if (fieldDefinition == null) {
            return null;
        }
        if (fieldDefinition.isMeasure) // means the data comes from the highlights info
        {
            if (this.data.categorical.values.length > 0) // should always be there based on the PBI framework
            {
                const highlightCollection = this.data.categorical.values[0];
                if (highlightCollection.source.displayName !== fieldDefinition.fieldName) {
                    throw new Error('Something wrong in the highlight logic.')
                }
                return highlightCollection.values as string[];
            }
            return null;
        } else {
            const index = this.getCategoricalIndex(fieldDefinition.fieldName);
            return index < 0 ? null : this.data.categorical.categories[index].values.map(v => (v == null) ? null : v.toString()) as string[];
        }


    }

    /**
     * Maps the given field name to the index of the corresponding category.
     * @param name A field name.
     */
    private getCategoricalIndex(name) {
        if (this.data.categorical.categories.length === 0) {
            return -1;
        }
        const dataset = this.data.categorical.categories;
        for (let i = 0; i < dataset.length; i++) {
            if (dataset[i].source.displayName === name) {
                return i;
            }
        }
        return -1;
    }

    /**
     * The names of the properties are mapped to field names.
     * This dictionary is used later on to pick up the data for a property.
     */
    private createDataMapping() {
        this.dataFieldMap = {};
        for (let i = 0; i < this.data.metadata.columns.length; i++) {
            const roles = this.data.metadata.columns[i].roles;
            for (let k in roles) {

                if (roles[k] === true) {
                    this.dataFieldMap[k] = {
                        fieldName: this.data.metadata.columns[i].displayName,
                        isMeasure: this.data.metadata.columns[i].isMeasure === true
                    };
                }
            }
        }
    }

    /**
     * Returns properties pane formatting model content hierarchies, properties and latest formatting values, Then populate properties pane.
     * This method is called once every time we open properties pane or when the user edit any format property.
     */
    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private createSelectionMechanics() {
        this.selectionIdBuilder = this.host.createSelectionIdBuilder();
        this.selectionManager = this.host.createSelectionManager();
    }

    //endregion
}
