'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    CanDismissContext: null,
    getCanDismiss: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get CanDismissContext () {
        return CanDismissContext;
    },
    get getCanDismiss () {
        return getCanDismiss;
    }
});
function _react() {
    const data = require("react");
    _react = function() {
        return data;
    };
    return data;
}
const _stack = require("../../utils/stack");
const CanDismissContext = /*#__PURE__*/ (0, _react().createContext)(undefined);
function getCanDismiss(rootState) {
    let state = rootState;
    // Keep traversing down the state tree until we find a stack navigator that we can pop
    while(state){
        // Seeded states have no `type`; anchors are fully supported only in stacks.
        if ((state.type ?? 'stack') === 'stack' && (0, _stack.getHistoryLength)(state) > 1) {
            return true;
        }
        if (state.index === undefined) return false;
        state = state.routes?.[state.index]?.state;
    }
    return false;
}

//# sourceMappingURL=CanDismissContext.js.map
