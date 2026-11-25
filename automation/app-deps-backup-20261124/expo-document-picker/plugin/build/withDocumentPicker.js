"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
function _configplugins() {
    const data = require("expo/config-plugins");
    _configplugins = function() {
        return data;
    };
    return data;
}
const _withDocumentPickerIOS = require("./withDocumentPickerIOS");
const pkg = require('../../package.json');
const _default = (0, _configplugins().createRunOncePlugin)(_withDocumentPickerIOS.withDocumentPickerIOS, pkg.name, pkg.version);

//# sourceMappingURL=withDocumentPicker.js.map
