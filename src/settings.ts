import {formattingSettings} from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.Card;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
import {ArrowType} from "yfiles";

export enum NetworkLayoutStyle {
    Organic = <any>'Organic',
    Hierarchic = <any>'Hierarchic',
    Tree = <any>'Tree'
}

class NetworkSettings extends FormattingSettingsCard {
    layoutStyle = new formattingSettings.ItemDropdown({
        name: "layoutStyle",
        displayName: "Layout Style",
        items: [
            {value: "Tree", displayName: "Tree"},
            {value: "Organic", displayName: "Organic"}
        ],
        value: {value: "Tree", displayName: "Tree"}
    });
    invertEdges = new formattingSettings.ToggleSwitch({
        name: "invertEdges",
        displayName: "Invert Edges",
        value: false
    });
    zoomSelectFactor = new formattingSettings.NumUpDown({
        name: "zoomSelectFactor",
        "displayName": "Selection Zoom Factor",
        "description": "The zoom factor applied when another widget defines a focus. Typically a value between 1 and 2.",
        "displayNameKey": "Visual_Network_Zoom_Factor",
        value: 1.3
    });

    highlightColor = new formattingSettings.ColorPicker({
        name: "highlightColor",
        "displayName": "Selection Zoom Color",
        "description": "The color of the node when zooming into a selected item via an adjacent widget.",
        value: {
            value: "#e9661d"
        }
    })
    layoutDirection = new formattingSettings.ItemDropdown({
        name: "layoutDirection",
        displayName: "Layout Direction",
        items: [
            {
                "value": "TopToBottom",
                "displayName": "Top to bottom"
            },
            {
                "value": "BottomToTop",
                "displayName": "Bottom to top"
            },
            {
                "value": "LeftToRight",
                "displayName": "Left to right"
            },
            {
                "value": "RightToLeft",
                "displayName": "Right to left"
            }
        ],
        value: {value: "TopToBottom", displayName: "TopToBottom"}
    });
    name = "networkSettings"
    displayName = "Network Settings"
    slices: Array<FormattingSettingsSlice> = [
        this.layoutStyle,
        this.invertEdges,
        this.zoomSelectFactor,
        this.highlightColor,
        this.layoutDirection
    ];
}

class NeighborhoodSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "showNeighborhood",
        displayName: "Show Neighborhood",
        value: false
    });
    maxParentLevel = new formattingSettings.NumUpDown({
        name: "maxParentLevel",
        "displayName": "Maximum Parent Level",
        "description": "How many parents should be shown for the filtered items.",
        "displayNameKey": "Visual_Parents",
        value: 2
    });
    maxChildrenLevel = new formattingSettings.NumUpDown({
        name: "maxChildrenLevel",
        "displayName": "Maximum Children Level",
        "description": "How many children should be shown for the filtered items.",
        "displayNameKey": "Visual_Children",
        value: 2
    });
    name = "neighborhoodSettings"
    displayName = "Neighborhood Settings"
    slices: Array<FormattingSettingsSlice> = [
        this.show,
        this.maxParentLevel,
        this.maxChildrenLevel
    ];
}

class NodeSettings extends FormattingSettingsCard {
    color = new formattingSettings.ColorPicker({
        name: "color",
        "displayName": "Main Color",
        "description": "The main (background) color of the nodes.",
        value: {
            value: "#8EB1D6"
        }
    });
    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        "displayName": "Border Color",
        "description": "The border color of the nodes.",
        value: {
            value: "#8EB1D6"
        }
    });
    mainLabelColor = new formattingSettings.ColorPicker({
        name: "mainLabelColor",
        "displayName": "Main Label Color",
        "description": "The color of the main label.",
        value: {
            value: "#ffffff"
        }
    });
    subLabelColor = new formattingSettings.ColorPicker({
        name: "subLabelColor",
        "displayName": "Sub Label Color",
        "description": "The color of the label underneath the main label.",
        value: {
            value: "#2D5380"
        }
    });
    topLabelColor = new formattingSettings.ColorPicker({
        name: "topLabelColor",
        "displayName": "Top Label Color",
        "description": "The color of the label above the main label.",
        value: {
            value: "#2D5380"
        }
    });
    borderWidth = new formattingSettings.NumUpDown({
        name: "borderWidth",
        "displayName": "Border Width",
        "description": "The thickness of the node border.",
        value: 1
    });
    nodeReSize = new formattingSettings.ToggleSwitch({
        name: "nodeResize",
        displayName: "Node Resize",
        description: "Whether the nodes are resized in function of the labels.",
        value: true
    });
    showTopLabel = new formattingSettings.ToggleSwitch({
        name: "showTopLabel",
        displayName: "Show Top Label",
        description: "Whether the label above the main label is shown.",
        value: true,
    });
    showBottomLabel = new formattingSettings.ToggleSwitch({
        name: "showBottomLabel",
        displayName: "Show Bottom Label",
        description: "Whether the label below the main label is shown.",
        value: true,
    });
    topLabelIsRestPercentage = new formattingSettings.ToggleSwitch({
        name: "topLabelIsRestPercentage",
        displayName: "Top Label is Rest Percentage",
        description: "If switched on the top-label will show the rest-percentage of the combined outgoing edge percentages.",
        value: false,
    });

    name = "nodeSettings"
    displayName = "Node Settings"
    slices: Array<FormattingSettingsSlice> = [
        this.color,
        this.borderColor,
        this.mainLabelColor,
        this.subLabelColor,
        this.topLabelColor,
        this.borderWidth,
        this.nodeReSize,
        this.showTopLabel,
        this.showBottomLabel,
        this.topLabelIsRestPercentage
    ];
}

class EdgeSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show Edges",
        description: "Whether the edges are rendered or not.",
        value: true
    });
    showLabel = new formattingSettings.ToggleSwitch({
        name: "showLabel",
        displayName: "Show Label",
        description: "Whether the labels of the edges are shown.",
        value: true
    });
    color = new formattingSettings.ColorPicker({
        name: "color",
        "displayName": "Edge Color",
        "description": "The color of edges.",
        value: {
            value: "#3E3E3E"
        }
    });
    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        "displayName": "Label Color",
        "description": "The color of the edge label.",
        value: {
            value: "#3E3E3E"
        }
    });
    width = new formattingSettings.NumUpDown({
        name: "width",
        "displayName": "Edge Width",
        "description": "The thickness of the edges.",
        value: 1
    });
    labelSize = new formattingSettings.NumUpDown({
        name: "labelSize",
        "displayName": "Label Size",
        "description": "The font size of the edge labels.",
        value: 10
    });
    labelSuffix = new formattingSettings.TextInput({
        name: "labelSuffix",
        displayName: "Label Suffix",
        description: "The string appended to the edge labels.",
        placeholder: "%",
        value: "%"
    })
    sourceArrow = new formattingSettings.ItemDropdown({
        name: "sourceArrow",
        displayName: "Source Arrow",
        description: "The arrow at the source of the edges.",
        items: [
            {
                "value": "Circle",
                "displayName": "Circle"
            },
            {
                "value": "None",
                "displayName": "None"
            },
            {
                "value": "Default",
                "displayName": "Default"
            },
            {
                "value": "Simple",
                "displayName": "Simple"
            },
            {
                "value": "Diamond",
                "displayName": "Diamond"
            }
        ],
        value: {value: "Circle", displayName: "Circle"}
    });
    targetArrow = new formattingSettings.ItemDropdown({
        name: "targetArrow",
        displayName: "Target Arrow",
        description: "The arrow at the target of the edges.",
        items: [
            {
                "value": "Circle",
                "displayName": "Circle"
            },
            {
                "value": "None",
                "displayName": "None"
            },
            {
                "value": "Default",
                "displayName": "Default"
            },
            {
                "value": "Simple",
                "displayName": "Simple"
            },
            {
                "value": "Diamond",
                "displayName": "Diamond"
            }
        ],
        value: {value: "None", displayName: "None"}
    });
    bundleHierarchicEdges = new formattingSettings.ToggleSwitch({
        name: "bundleHierarchicEdges",
        displayName: "Bundle Hierarchic Edges",
        description: "Whether the edges are merged. This setting only applies to the hierarchic layout.",
        value: false
    });
    name = "edgeSettings"
    displayName = "Edge Settings"
    slices: Array<FormattingSettingsSlice> = [
        this.show,
        this.showLabel,
        this.color,
        this.labelColor,
        this.width,
        this.labelSize,
        this.labelSuffix,
        this.sourceArrow,
        this.targetArrow,
        this.bundleHierarchicEdges
    ];
}

/**
 * visual settings model class
 *
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {

    networkSettings = new NetworkSettings();
    neighborhoodSettings = new NeighborhoodSettings();
    nodeSettings = new NodeSettings();

    edgeSettings = new EdgeSettings();

    cards = [this.networkSettings, this.neighborhoodSettings, this.nodeSettings, this.edgeSettings];
}
