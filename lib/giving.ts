import {
  GIVING_ABN,
  GIVING_BANK_ACCOUNT,
  GIVING_BANK_BSB,
  GIVING_BANK_NAME,
  STRIPE_GIVING_URL,
} from "../constants/app";

export type GivingBankRow = {
  id: "name" | "bsb" | "account" | "abn";
  label: string;
  value: string;
};

export function givingOnlineUrl(url: string = STRIPE_GIVING_URL): string | null {
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function givingBankRows(values?: {
  name?: string;
  bsb?: string;
  account?: string;
  abn?: string;
}): GivingBankRow[] {
  const source = {
    name: values?.name ?? GIVING_BANK_NAME,
    bsb: values?.bsb ?? GIVING_BANK_BSB,
    account: values?.account ?? GIVING_BANK_ACCOUNT,
    abn: values?.abn ?? GIVING_ABN,
  };
  const rows: GivingBankRow[] = [
    { id: "name", label: "Account name", value: source.name },
    { id: "bsb", label: "BSB", value: source.bsb },
    { id: "account", label: "Account number", value: source.account },
    { id: "abn", label: "ABN", value: source.abn },
  ];
  return rows
    .map((row) => ({ ...row, value: row.value.trim() }))
    .filter((row) => row.value.length > 0);
}
