"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { cancelOrderAction } from "@/app/(dashboard)/dashboard/orders/_actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BANK_OPTIONS = [
  "BCA",
  "BNI",
  "BRI",
  "Mandiri",
  "BSI",
  "CIMB Niaga",
  "SeaBank",
  "Danamon",
  "Permata",
  "BTN",
  "Maybank",
  "OCBC",
  "Lainnya",
] as const;

type Props = {
  orderId: string;
  orderNumber: string;
  status: "pending_payment" | "paid";
  savedBank?: {
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CancelOrderDialog({
  orderId,
  orderNumber,
  status,
  savedBank,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Mayar has no refund API — every paid cancellation is refunded by bank transfer.
  const requiresBank = status === "paid";
  const [step, setStep] = useState<"confirm" | "bank">("confirm");

  const [bankName, setBankName] = useState(savedBank?.bank_name ?? "");
  const [accountName, setAccountName] = useState(savedBank?.bank_account_name ?? "");
  const [accountNumber, setAccountNumber] = useState(savedBank?.bank_account_number ?? "");
  const [errors, setErrors] = useState<{
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  }>({});

  const resetState = () => {
    setStep("confirm");
    setErrors({});
    setBankName(savedBank?.bank_name ?? "");
    setAccountName(savedBank?.bank_account_name ?? "");
    setAccountNumber(savedBank?.bank_account_number ?? "");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetState();
    onOpenChange(v);
  };

  const onConfirmStep = () => {
    if (requiresBank) {
      setStep("bank");
    } else {
      doCancel();
    }
  };

  const validateBank = () => {
    const e: typeof errors = {};
    if (!bankName.trim()) e.bankName = "Pilih nama bank.";
    if (!accountName.trim()) e.accountName = "Nama pemilik rekening wajib diisi.";
    if (!accountNumber.trim()) e.accountNumber = "Nomor rekening wajib diisi.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmitBank = () => {
    if (!validateBank()) return;
    doCancel({
      bank_name: bankName.trim(),
      bank_account_name: accountName.trim(),
      bank_account_number: accountNumber.trim(),
    });
  };

  const doCancel = (bankInfo?: {
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
  }) => {
    startTransition(async () => {
      const res = await cancelOrderAction(orderId, bankInfo);
      if (res.success) {
        toast.success("Pesanan dibatalkan.");
        handleOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <DialogTitle className="text-center text-base">Batalkan pesanan ini?</DialogTitle>
              <DialogDescription className="text-center">
                Pesanan <span className="font-mono font-semibold">{orderNumber}</span> akan
                dibatalkan dan tidak dapat dikembalikan.
                {requiresBank && (
                  <span className="mt-1 block">
                    Kamu perlu mengisi data rekening bank untuk proses pengembalian dana.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                Tidak, kembali
              </Button>
              <Button
                variant={requiresBank ? "primary" : "destructive"}
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={onConfirmStep}
                loading={pending && !requiresBank}
              >
                {requiresBank ? (
                  <>
                    Lanjut isi rekening <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  "Ya, batalkan"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">Info rekening pengembalian dana</DialogTitle>
              <DialogDescription>
                Dana akan dikembalikan ke rekening berikut dalam 3–14 hari kerja setelah diproses
                admin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cancel-bank-name">
                  Nama bank <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={bankName}
                  onValueChange={(v) => {
                    setBankName(v);
                    setErrors((e) => ({ ...e, bankName: undefined }));
                  }}
                >
                  <SelectTrigger id="cancel-bank-name" className="mt-1 border-border">
                    <SelectValue placeholder="Pilih bank..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_OPTIONS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bankName && (
                  <p className="mt-1 text-[12px] text-red-500">{errors.bankName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cancel-account-name">
                  Nama pemilik rekening <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cancel-account-name"
                  className="mt-1 border-border"
                  placeholder="Sesuai buku tabungan / ATM"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setErrors((er) => ({ ...er, accountName: undefined }));
                  }}
                />
                {errors.accountName && (
                  <p className="mt-1 text-[12px] text-red-500">{errors.accountName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="cancel-account-number">
                  Nomor rekening <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cancel-account-number"
                  className="mt-1 border-border font-mono"
                  inputMode="numeric"
                  placeholder="Contoh: 1234567890"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ""));
                    setErrors((er) => ({ ...er, accountNumber: undefined }));
                  }}
                />
                {errors.accountNumber && (
                  <p className="mt-1 text-[12px] text-red-500">{errors.accountNumber}</p>
                )}
              </div>

              <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800">
                Info rekening ini juga akan disimpan ke profil kamu untuk kemudahan di masa depan.
              </p>
            </div>

            <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={() => setStep("confirm")}
              >
                Kembali
              </Button>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={pending}
                loading={pending}
                onClick={onSubmitBank}
              >
                Batalkan &amp; kirim info rekening
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
