/**
 * Returns the same value as `router.canDismiss()` and re-renders when it changes. Unlike
 * `router.canDismiss()`, it is correct during render.
 *
 * @example
 * ```tsx
 * import { router, useCanDismiss } from 'expo-router';
 * import { Button } from 'react-native';
 *
 * export default function CloseButton() {
 *   const canDismiss = useCanDismiss();
 *   return canDismiss ? <Button title="Close" onPress={() => router.dismiss()} /> : null;
 * }
 * ```
 */
export declare function useCanDismiss(): boolean;
