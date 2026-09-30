const FLASH_SALE_PREFIX = "flash_sale:" as const;

function parseFlashSaleId(template: string | null): string | null {
  if (!template?.startsWith(FLASH_SALE_PREFIX)) return null;
  const id = template.slice(FLASH_SALE_PREFIX.length);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

export function templateToPromotionAdminPath(template: string | null): string {
  if (!template) return "/admin/banners";
  if (template.startsWith("brand_main:") || template.startsWith("brand_secondary:")) {
    return "/admin/banners";
  }
  const flashSaleId = parseFlashSaleId(template);
  if (flashSaleId) return `/admin/promotions/flash-sale/${flashSaleId}`;
  return `/admin/promotions/${template.replace(/_/g, "-")}`;
}
