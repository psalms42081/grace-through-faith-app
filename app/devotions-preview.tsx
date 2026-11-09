import { lazyScreen } from "@/lib/lazy-screen";

export default lazyScreen(() => import("@/components/devotions-v2/DevotionsPreview"));
