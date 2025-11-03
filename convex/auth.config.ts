import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

const config = {
  providers: [Google()],
};

export const { auth, signIn, signOut, store } = convexAuth(config);

export default config;
