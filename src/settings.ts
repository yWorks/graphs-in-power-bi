'use strict';

import {dataViewObjectsParser} from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;
import {TextSettings} from './visual';

export class VisualSettings extends DataViewObjectsParser {
    public text: TextSettings = new TextSettings();

}
