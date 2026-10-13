"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, LayoutList, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { nativeSelectClass } from "@/components/admin/form-styles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/import/slug";
import { categorySchema, type CategoryValues } from "@/lib/validations/admin-catalog";
import { deleteCategory, reorderCategories, saveCategory } from "@/server/actions/admin/catalog";
import type { AdminCategory } from "@/server/queries/admin/catalog";

type Node = AdminCategory & { children: Node[] };

function buildTree(rows: AdminCategory[]): Node[] {
  const byId = new Map<string, Node>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: Node[] = [];
  for (const n of byId.values()) {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const sort = (list: Node[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "id"));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

type Editing =
  { mode: "create"; parentId: string | null } | { mode: "edit"; category: AdminCategory };

export function CategoryTree({ categories }: { categories: AdminCategory[] }) {
  const tree = useMemo(() => buildTree(categories), [categories]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const confirmDelete = () => {
    if (!deleting) return;
    start(async () => {
      const res = await deleteCategory(deleting.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Kategori "${deleting.name}" dihapus.`);
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Seret <GripVertical className="inline size-4 align-text-bottom" aria-hidden /> untuk
          mengubah urutan di antara kategori satu induk. Urutan ini dipakai di menu toko.
        </p>
        <Button onClick={() => setEditing({ mode: "create", parentId: null })}>
          <Plus /> Kategori utama
        </Button>
      </div>

      {tree.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="Belum ada kategori"
          description="Tambah kategori utama untuk mulai."
        />
      ) : (
        <div className="rounded-xl border border-border">
          <SortableList
            nodes={tree}
            depth={0}
            onAdd={(parentId) => setEditing({ mode: "create", parentId })}
            onEdit={(category) => setEditing({ mode: "edit", category })}
            onDelete={setDeleting}
          />
        </div>
      )}

      <CategoryDialog editing={editing} categories={categories} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Hapus kategori "${deleting?.name ?? ""}"?`}
        description="Kategori yang masih punya subkategori atau produk tidak bisa dihapus. Nonaktifkan saja bila ingin menyembunyikannya."
        confirmLabel="Hapus"
        variant="destructive"
        isLoading={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SortableList({
  nodes,
  depth,
  onAdd,
  onEdit,
  onDelete,
}: {
  nodes: Node[];
  depth: number;
  onAdd: (parentId: string) => void;
  onEdit: (c: AdminCategory) => void;
  onDelete: (c: AdminCategory) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState(nodes);
  const [source, setSource] = useState(nodes);
  // id stabil SSR/client (aria-describedby dnd-kit), cegah hydration mismatch.
  const dndId = useId();
  const [, start] = useTransition();
  // Data baru dari server (router.refresh) menggantikan urutan lokal.
  if (source !== nodes) {
    setSource(nodes);
    setItems(nodes);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((n) => n.id === active.id);
    const to = items.findIndex((n) => n.id === over.id);
    if (from < 0 || to < 0) return;
    const previous = items;
    const next = arrayMove(items, from, to);
    setItems(next);
    start(async () => {
      const res = await reorderCategories({ ids: next.map((n) => n.id) });
      if (!res.ok) {
        setItems(previous);
        toast.error(res.error);
        return;
      }
      toast.success("Urutan disimpan.");
      router.refresh();
    });
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <ul className={depth === 0 ? "divide-y divide-border" : "border-t border-border"}>
          {items.map((n) => (
            <SortableRow
              key={n.id}
              node={n}
              depth={depth}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  node,
  depth,
  onAdd,
  onEdit,
  onDelete,
}: {
  node: Node;
  depth: number;
  onAdd: (parentId: string) => void;
  onEdit: (c: AdminCategory) => void;
  onDelete: (c: AdminCategory) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-10 bg-background shadow-md" : "bg-background"}
    >
      <div
        className="flex items-center gap-2 py-2 pr-2"
        style={{ paddingLeft: `${0.5 + depth * 1.5}rem` }}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Geser urutan ${node.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {node.name}
            {!node.isActive ? <Badge variant="outline">Nonaktif</Badge> : null}
            {!node.isAutomotive ? <Badge variant="secondary">Non-otomotif</Badge> : null}
          </span>
          <span className="truncate font-mono text-caption text-muted-foreground">{node.slug}</span>
        </div>
        <span className="hidden shrink-0 text-sm text-muted-foreground tabular-nums sm:inline">
          {node.productCount.toLocaleString("id-ID")} produk
        </span>
        <div className="flex shrink-0">
          {depth < 2 ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Tambah subkategori di ${node.name}`}
              onClick={() => onAdd(node.id)}
            >
              <Plus />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ubah ${node.name}`}
            onClick={() => onEdit(node)}
          >
            <Pencil />
          </Button>
          <Button
            variant="destructive-ghost"
            size="icon-sm"
            aria-label={`Hapus ${node.name}`}
            onClick={() => onDelete(node)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {node.children.length ? (
        <SortableList
          nodes={node.children}
          depth={depth + 1}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : null}
    </li>
  );
}

function CategoryDialog({
  editing,
  categories,
  onClose,
}: {
  editing: Editing | null;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const current = editing?.mode === "edit" ? editing.category : null;

  const defaults = (): CategoryValues => {
    if (current) {
      return {
        name: current.name,
        slug: current.slug,
        parentId: current.parentId,
        description: current.description ?? "",
        isAutomotive: current.isAutomotive,
        isActive: current.isActive,
      };
    }
    const parent = categories.find(
      (c) => c.id === (editing?.mode === "create" ? editing.parentId : null),
    );
    return {
      name: "",
      slug: "",
      parentId: parent?.id ?? null,
      description: "",
      isAutomotive: parent?.isAutomotive ?? true,
      isActive: true,
    };
  };

  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaults(),
  });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, dirtyFields },
  } = form;

  useEffect(() => {
    if (editing) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Induk yang boleh dipilih: bukan diri sendiri atau turunannya, maks 3 tingkat.
  const parentOptions = useMemo(() => {
    const blocked = new Set<string>();
    if (current) {
      blocked.add(current.id);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of categories) {
          if (c.parentId && blocked.has(c.parentId) && !blocked.has(c.id)) {
            blocked.add(c.id);
            grew = true;
          }
        }
      }
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    const depthOf = (c: AdminCategory): number =>
      c.parentId && byId.get(c.parentId) ? 1 + depthOf(byId.get(c.parentId)!) : 0;
    const label = (c: AdminCategory): string =>
      c.parentId && byId.get(c.parentId) ? `${label(byId.get(c.parentId)!)} › ${c.name}` : c.name;
    return categories
      .filter((c) => !blocked.has(c.id) && depthOf(c) < 2)
      .map((c) => ({ id: c.id, label: label(c) }))
      .sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, [categories, current]);

  const onSubmit = (values: CategoryValues) =>
    start(async () => {
      const res = await saveCategory(current?.id ?? null, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(current ? "Kategori disimpan." : "Kategori ditambahkan.");
      onClose();
      router.refresh();
    });

  const isAutomotive = useWatch({ control, name: "isAutomotive" });
  const isActive = useWatch({ control, name: "isActive" });

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{current ? "Ubah kategori" : "Tambah kategori"}</DialogTitle>
          <DialogDescription>Slug dipakai di URL toko: /categories/slug.</DialogDescription>
        </DialogHeader>
        <form
          id="category-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-name">Nama</Label>
            <Input
              id="c-name"
              aria-invalid={!!errors.name}
              {...register("name", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!current && !dirtyFields.slug) setValue("slug", slugify(e.target.value, 60));
                },
              })}
            />
            {errors.name ? <p className="text-sm text-danger">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-slug">Slug</Label>
            <Input
              id="c-slug"
              className="font-mono"
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            {errors.slug ? <p className="text-sm text-danger">{errors.slug.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-parent">Induk</Label>
            <select
              id="c-parent"
              className={nativeSelectClass}
              {...register("parentId", { setValueAs: (v: string | null) => (v ? v : null) })}
            >
              <option value="">— Kategori utama —</option>
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-desc">Deskripsi (opsional)</Label>
            <Textarea id="c-desc" rows={3} {...register("description")} />
            {errors.description ? (
              <p className="text-sm text-danger">{errors.description.message}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="c-auto">Produk otomotif</Label>
            <Switch
              id="c-auto"
              checked={isAutomotive}
              onCheckedChange={(v) => setValue("isAutomotive", v, { shouldDirty: true })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="c-active">Tampil di toko</Label>
            <Switch
              id="c-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button type="submit" form="category-form" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
