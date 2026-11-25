"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getIconButtonContainerColors", {
    enumerable: true,
    get: function() {
        return getIconButtonContainerColors;
    }
});
function getIconButtonContainerColors(buttonContainerColor) {
    return buttonContainerColor ? {
        containerColor: buttonContainerColor,
        disabledContainerColor: buttonContainerColor
    } : {};
}

//# sourceMappingURL=getIconButtonContainerColors.js.map
