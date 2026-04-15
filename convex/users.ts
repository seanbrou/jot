import { mutationGeneric, queryGeneric } from "convex/server";
import { authComponent } from "./auth";
import { requireAuthUser } from "./lib";

export const bootstrap = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx);
    return {
      authUserId: authUser._id,
      email: authUser.email,
      name: authUser.name?.trim() || authUser.email.split("@")[0] || "Oat User",
      image: authUser.image ?? null,
    };
  },
});

export const getCurrent = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    return {
      authUserId: authUser._id,
      email: authUser.email,
      name: authUser.name?.trim() || authUser.email.split("@")[0] || "Oat User",
      image: authUser.image ?? null,
    };
  },
});
