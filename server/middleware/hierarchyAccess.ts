import type { Request, Response, NextFunction } from "express";
import { getAuthUserId } from "./auth";
import {
  getHierarchyScope,
  type MergedHierarchyScope,
} from "../services/hierarchyScope";

declare global {
  namespace Express {
    interface Request {
      hierarchyScope?: MergedHierarchyScope;
    }
  }
}

export function requireHierarchyAccess(
  minRole?: string
) {
  const ROLE_RANK: Record<string, number> = {
    member: 0,
    elder: 1,
    pastor: 2,
    director: 3,
    president: 4,
    admin: 5,
    gc_admin: 6,
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const scope = await getHierarchyScope(userId);
      if (!scope) {
        return res
          .status(403)
          .json({ error: "No hierarchy access. Contact your church administrator." });
      }

      if (minRole) {
        const requiredRank = ROLE_RANK[minRole] ?? 0;
        const userRank = ROLE_RANK[scope.highestRole] ?? 0;
        if (userRank < requiredRank) {
          return res
            .status(403)
            .json({ error: "Insufficient hierarchy role for this action" });
        }
      }

      req.authUserId = userId;
      req.hierarchyScope = scope;
      next();
    } catch (err) {
      console.error("Hierarchy access check error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}
