export { templateToPromotionAdminPath } from "@/lib/banner-template-utils";

/** Nilai `banners.template` untuk banner yang terikat ke satu flash sale. */
export const FLASH_SALE_BANNER_TEMPLATE_PREFIX = "flash_sale:" as const;

export function flashSaleBannerTemplate(flashSaleId: string): string {
  return `${FLASH_SALE_BANNER_TEMPLATE_PREFIX}${flashSaleId}`;
}

export function parseFlashSaleIdFromBannerTemplate(template: string | null): string | null {
  if (!template?.startsWith(FLASH_SALE_BANNER_TEMPLATE_PREFIX)) return null;
  const id = template.slice(FLASH_SALE_BANNER_TEMPLATE_PREFIX.length);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}
