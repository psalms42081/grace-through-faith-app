import { lazyScreen } from "@/lib/lazy-screen";

export default lazyScreen(() => import("../../../read/[bookId]/[chapter]"));
