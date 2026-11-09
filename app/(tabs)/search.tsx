import { lazyScreen } from "@/lib/lazy-screen";

export default lazyScreen(() => import("../discover-v2"));
