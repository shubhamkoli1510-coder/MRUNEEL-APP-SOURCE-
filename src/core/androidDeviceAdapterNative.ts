import { androidDeviceActions } from "../utils/androidDeviceActions";
import { createAndroidDeviceAdapter } from "./androidDeviceAdapter";
import type { AndroidActionPort } from "./androidDeviceAdapter";

/** Production bridge for the allowlisted Android task adapter. */
const nativePort: AndroidActionPort = {
  isAndroid: androidDeviceActions.isAndroid,
  openScreen: androidDeviceActions.openScreen,
  volumeUp: androidDeviceActions.volumeUp,
  volumeDown: androidDeviceActions.volumeDown,
};

export const androidDeviceAdapter = createAndroidDeviceAdapter(nativePort);
