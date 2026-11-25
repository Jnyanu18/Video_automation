"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    setICloudEntitlements: null,
    withDocumentPickerIOS: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get setICloudEntitlements () {
        return setICloudEntitlements;
    },
    get withDocumentPickerIOS () {
        return withDocumentPickerIOS;
    }
});
function _configplugins() {
    const data = require("expo/config-plugins");
    _configplugins = function() {
        return data;
    };
    return data;
}
const withDocumentPickerIOS = (config, { iCloudContainerEnvironment, kvStoreIdentifier } = {})=>{
    return (0, _configplugins().withEntitlementsPlist)(config, (config)=>{
        config.modResults = setICloudEntitlements(config, {
            iCloudContainerEnvironment,
            kvStoreIdentifier
        }, config.modResults);
        return config;
    });
};
function setICloudEntitlements(config, { iCloudContainerEnvironment, kvStoreIdentifier }, { 'com.apple.developer.icloud-container-environment': _env, ...entitlements }) {
    if (config.ios?.usesIcloudStorage) {
        // Used for AdHoc iOS builds: https://github.com/expo/eas-cli/issues/693
        // https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_developer_icloud-container-environment
        entitlements['com.apple.developer.icloud-container-environment'] = iCloudContainerEnvironment;
        entitlements['com.apple.developer.icloud-container-identifiers'] = [
            `iCloud.${config.ios.bundleIdentifier}`
        ];
        entitlements['com.apple.developer.ubiquity-container-identifiers'] = [
            `iCloud.${config.ios.bundleIdentifier}`
        ];
        entitlements['com.apple.developer.ubiquity-kvstore-identifier'] = kvStoreIdentifier || `$(TeamIdentifierPrefix)${config.ios.bundleIdentifier}`;
        entitlements['com.apple.developer.icloud-services'] = [
            'CloudDocuments'
        ];
    }
    return entitlements;
}

//# sourceMappingURL=withDocumentPickerIOS.js.map
