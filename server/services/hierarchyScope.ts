import { db } from "../db";
import { hierarchyMembership, churchHierarchy } from "../../shared/schema";
import { eq, sql, inArray } from "drizzle-orm";

export interface HierarchyScope {
  nodeId: string;
  tier: number;
  role: string;
  descendantNodeIds: string[];
}

export interface MergedHierarchyScope {
  scopes: HierarchyScope[];
  allNodeIds: string[];
  highestTier: number;
  highestRole: string;
}

const ROLE_RANK: Record<string, number> = {
  member: 0,
  elder: 1,
  pastor: 2,
  director: 3,
  president: 4,
  admin: 5,
  gc_admin: 6,
};

function roleRank(role: string): number {
  return ROLE_RANK[role] ?? 0;
}

export async function getHierarchyScope(
  userId: string
): Promise<MergedHierarchyScope | null> {
  const memberships = await db
    .select({
      nodeId: hierarchyMembership.hierarchyNodeId,
      role: hierarchyMembership.role,
    })
    .from(hierarchyMembership)
    .where(eq(hierarchyMembership.userId, userId));

  if (memberships.length === 0) return null;

  const nodeIds = memberships.map((m) => m.nodeId);

  const nodes = await db
    .select({
      id: churchHierarchy.id,
      path: churchHierarchy.path,
      tier: churchHierarchy.tier,
    })
    .from(churchHierarchy)
    .where(inArray(churchHierarchy.id, nodeIds));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const scopes: HierarchyScope[] = [];

  for (const membership of memberships) {
    const node = nodeMap.get(membership.nodeId);
    if (!node) continue;

    const descendants = await db
      .select({ id: churchHierarchy.id })
      .from(churchHierarchy)
      .where(sql`${churchHierarchy.path} LIKE ${node.path + "%"}`);

    scopes.push({
      nodeId: membership.nodeId,
      tier: node.tier,
      role: membership.role,
      descendantNodeIds: descendants.map((d) => d.id),
    });
  }

  if (scopes.length === 0) return null;

  const allNodeIds = [...new Set(scopes.flatMap((s) => s.descendantNodeIds))];

  let highestTier = 7;
  let highestRole = "member";

  for (const scope of scopes) {
    if (scope.tier < highestTier) {
      highestTier = scope.tier;
    }
    if (roleRank(scope.role) > roleRank(highestRole)) {
      highestRole = scope.role;
    }
  }

  return {
    scopes,
    allNodeIds,
    highestTier,
    highestRole,
  };
}
