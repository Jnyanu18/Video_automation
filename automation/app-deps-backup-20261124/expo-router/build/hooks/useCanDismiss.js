'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useCanDismiss", {
    enumerable: true,
    get: function() {
        return useCanDismiss;
    }
});
function _react() {
    const data = require("react");
    _react = function() {
        return data;
    };
    return data;
}
const _CanDismissContext = require("../react-navigation/core/CanDismissContext");
function useCanDismiss() {
    const canDismiss = (0, _react().use)(_CanDismissContext.CanDismissContext);
    if (canDismiss === undefined) {
        throw new Error('`useCanDismiss` was called from a component rendered outside the Expo Router root. Render the component inside `ExpoRoot`.');
    }
    return canDismiss;
}

//# sourceMappingURL=useCanDismiss.js.map
