/**
 * Defines the payload attached to nodes.
 */
export interface INodeSourceItem {
    id: string,
    label: string,
    shape: string,
    subLabel: string,
    topLabel: string,
    identity: any
    layerIndex: number;
}
