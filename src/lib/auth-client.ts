import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser client. baseURL defaults to the current origin, which is correct
// for both local dev (:3030) and prod (shop.witus.online).
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
