export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type FlatCategoryRow = CategoryRow & { depth: 0 | 1 };

export function buildFlatCategoryTree(categories: CategoryRow[]): FlatCategoryRow[] {
  const topLevel = categories.filter((c) => !c.parent_id);
  const children = categories.filter((c) => c.parent_id);
  const result: FlatCategoryRow[] = [];
  const addedIds = new Set<string>();

  for (const parent of topLevel) {
    result.push({ ...parent, depth: 0 });
    addedIds.add(parent.id);
    for (const child of children.filter((c) => c.parent_id === parent.id)) {
      result.push({ ...child, depth: 1 });
      addedIds.add(child.id);
    }
  }

  for (const child of children) {
    if (!addedIds.has(child.id)) result.push({ ...child, depth: 1 });
  }

  return result;
}
