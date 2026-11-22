import { createClient } from "your api key";
import { getAppParams } from "your api key";

const { appId, token, functionsVersion, appBaseUrl } = getAppParams();

export const base44 = createClient({ appId, token: token ?? undefined, functionsVersion, serverUrl: "", appBaseUrl });
