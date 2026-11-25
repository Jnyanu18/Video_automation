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
const withExpoVideo = (config, { supportsBackgroundPlayback, supportsPictureInPicture } = {})=>{
    (0, _configplugins().withInfoPlist)(config, (config)=>{
        const currentBackgroundModes = config.modResults.UIBackgroundModes ?? [];
        const shouldEnableBackgroundAudio = supportsBackgroundPlayback || supportsPictureInPicture;
        // No-op if the values are not defined
        if (typeof supportsBackgroundPlayback === 'undefined' && typeof supportsPictureInPicture === 'undefined') {
            return config;
        }
        if (shouldEnableBackgroundAudio && !currentBackgroundModes.includes('audio')) {
            config.modResults.UIBackgroundModes = [
                ...currentBackgroundModes,
                'audio'
            ];
        } else if (!shouldEnableBackgroundAudio) {
            config.modResults.UIBackgroundModes = currentBackgroundModes.filter((mode)=>mode !== 'audio');
        }
        return config;
    });
    (0, _configplugins().withAndroidManifest)(config, (config)=>{
        const activity = _configplugins().AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
        // Handle Picture in Picture configuration
        if (typeof supportsPictureInPicture !== 'undefined') {
            if (supportsPictureInPicture) {
                activity.$['android:supportsPictureInPicture'] = 'true';
            } else {
                delete activity.$['android:supportsPictureInPicture'];
            }
        }
        // Handle background playback configuration
        if (supportsBackgroundPlayback) {
            // Add required permissions for foreground service
            _configplugins().AndroidConfig.Permissions.ensurePermissions(config.modResults, [
                'android.permission.FOREGROUND_SERVICE',
                'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'
            ]);
            // Add the foreground service to the manifest
            const application = _configplugins().AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
            // Check if the service already exists
            const existingService = application.service?.find((service)=>service.$?.['android:name'] === 'expo.modules.video.playbackService.ExpoVideoPlaybackService');
            if (!existingService) {
                // Add the service if it doesn't exist
                if (!application.service) {
                    application.service = [];
                }
                application.service.push({
                    $: {
                        'android:name': 'expo.modules.video.playbackService.ExpoVideoPlaybackService',
                        'android:exported': 'false',
                        'android:foregroundServiceType': 'mediaPlayback'
                    },
                    'intent-filter': [
                        {
                            action: [
                                {
                                    $: {
                                        'android:name': 'androidx.media3.session.MediaSessionService'
                                    }
                                }
                            ]
                        }
                    ]
                });
            }
        }
        return config;
    });
    return config;
};
const _default = withExpoVideo;

//# sourceMappingURL=withExpoVideo.js.map
