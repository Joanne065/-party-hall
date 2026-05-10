import { router } from "./router-base";
import { passwordRouter } from "./password-router";
import { eventRouter } from "./event-router";
import { photoRouter } from "./photo-router";
import { reviewRouter } from "./review-router";

export const appRouter = router({
  password: passwordRouter,
  event: eventRouter,
  photo: photoRouter,
  review: reviewRouter,
});

export type AppRouter = typeof appRouter;
