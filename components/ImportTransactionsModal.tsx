"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useTranslations } from "next-intl";
import { X, Upload, ArrowLeft, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useUserProfile } from "@/lib/providers/UserProfileProvider";
import {
  getAllTransactions,
  addTransactionsBatch,
  getImportTemplate,
  saveImportTemplate,
  ImportMapping
} from "@/lib/firebase/firestore";
import { detectColumnMapping, computeColumnsSignature } from "@/lib/csvImportKeywords";
import { detectDateFormat, parseDateWithFormat, parseAmount, DATE_FORMAT_IDS, DateFormatId } from "@/lib/csvFormatDetection";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/categories";
import { Transaction, TransactionType } from "@/types";

interface Props {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "upload" | "mapping" | "preview";
type TypeMode = "signedAmount" | "column" | "debitCredit";

interface ParsedRow {
  key: string;
  date: Date | null;
  label: string;
  category: string;
  type: TransactionType;
  baseAmount: number | null;
  originalAmount: number | null;
  hardInvalid: boolean;
  hardReasonKey?: string;
  warningKeys: string[];
  isDuplicate: boolean;
  checked: boolean;
}

interface ParsedFile {
  fields: string[];
  rows: Record<string, string>[];
}

const normalizeLabel = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const EXCEL_EXTENSIONS = [".xlsx", ".xls"];
const isExcelFile = (file: File) => EXCEL_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

const cellToString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value);
};

const parseExcelFile = async (file: File): Promise<ParsedFile | null> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return null;

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, blankrows: false });
  if (matrix.length === 0) return null;

  const headerCells = matrix[0] as unknown[];
  const fields = headerCells.map(cellToString);
  if (fields.every((f) => f === "")) return null;

  const rows = matrix.slice(1)
    .map((rawRow) => {
      const record: Record<string, string> = {};
      fields.forEach((field, i) => {
        if (field === "") return;
        record[field] = cellToString((rawRow as unknown[])[i]);
      });
      return record;
    })
    .filter((row) => Object.values(row).some((v) => v.trim() !== ""));

  return { fields: fields.filter((f) => f !== ""), rows };
};

const isMappingValid = (mapping: ImportMapping, availableColumns: string[]): boolean => {
  const referenced = [
    mapping.dateColumn, mapping.labelColumn, mapping.categoryColumn,
    mapping.amountColumn, mapping.typeColumn, mapping.debitColumn, mapping.creditColumn
  ].filter((c): c is string => !!c);
  return referenced.length > 0 && referenced.every((c) => availableColumns.includes(c));
};

const TYPE_MODE_OPTIONS: { mode: TypeMode; labelKey: string }[] = [
  { mode: "signedAmount", labelKey: "typeModeSigned" },
  { mode: "column", labelKey: "typeModeColumn" },
  { mode: "debitCredit", labelKey: "typeModeDebitCredit" }
];

export default function ImportTransactionsModal({ userId, onClose, onSuccess }: Props) {
  const t = useTranslations("importModal");
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toBase, fromBase, formatCurrency, currency } = useCurrency();
  const { profile } = useUserProfile();

  const expenseCategories = profile?.expenseCategories ?? DEFAULT_EXPENSE_CATEGORIES;
  const incomeCategories = profile?.incomeCategories ?? DEFAULT_INCOME_CATEGORIES;

  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);

  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<Record<string, string>[]>([]);
  const [columnsSignature, setColumnsSignature] = useState("");
  const [templateApplied, setTemplateApplied] = useState(false);

  const [dateColumn, setDateColumn] = useState("");
  const [labelColumn, setLabelColumn] = useState("");
  const [amountColumn, setAmountColumn] = useState("");
  const [categoryColumn, setCategoryColumn] = useState("");
  const [typeMode, setTypeMode] = useState<TypeMode>("signedAmount");
  const [typeColumn, setTypeColumn] = useState("");
  const [expenseLabel, setExpenseLabel] = useState(language === "en" ? "Expense" : "Dépense");
  const [incomeLabel, setIncomeLabel] = useState(language === "en" ? "Income" : "Revenu");
  const [debitColumn, setDebitColumn] = useState("");
  const [creditColumn, setCreditColumn] = useState("");
  const [dateFormat, setDateFormat] = useState<DateFormatId | "">("");

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [importing, setImporting] = useState(false);

  const sampleValuesFor = (col: string, source: Record<string, string>[]) =>
    source.slice(0, 25).map((r) => r[col] ?? "").filter((v) => v.trim() !== "");

  const applyMapping = (mapping: Partial<ImportMapping>) => {
    setDateColumn(mapping.dateColumn ?? "");
    setLabelColumn(mapping.labelColumn ?? "");
    setCategoryColumn(mapping.categoryColumn ?? "");
    setTypeMode(mapping.typeMode ?? "signedAmount");
    setAmountColumn(mapping.amountColumn ?? "");
    setTypeColumn(mapping.typeColumn ?? "");
    if (mapping.expenseLabel) setExpenseLabel(mapping.expenseLabel);
    if (mapping.incomeLabel) setIncomeLabel(mapping.incomeLabel);
    setDebitColumn(mapping.debitColumn ?? "");
    setCreditColumn(mapping.creditColumn ?? "");
    setDateFormat((mapping.dateFormat as DateFormatId) ?? "");
  };

  const resolveMapping = async (cols: string[], rowsData: Record<string, string>[]) => {
    const signature = computeColumnsSignature(cols);
    setColumnsSignature(signature);

    let template: ImportMapping | null = null;
    try {
      template = await getImportTemplate(userId, signature);
    } catch (err) {
      console.error(err);
    }

    if (template && isMappingValid(template, cols)) {
      applyMapping(template);
      setTemplateApplied(true);
      return;
    }

    setTemplateApplied(false);
    const detected = detectColumnMapping(cols);
    const hasDebitCredit = !!detected.debit && !!detected.credit;

    applyMapping({
      dateColumn: detected.date ?? "",
      labelColumn: detected.label ?? "",
      categoryColumn: detected.category ?? "",
      typeMode: hasDebitCredit ? "debitCredit" : "signedAmount",
      amountColumn: hasDebitCredit ? "" : (detected.amount ?? ""),
      debitColumn: detected.debit ?? "",
      creditColumn: detected.credit ?? "",
      dateFormat: ""
    });

    if (detected.date) {
      const format = detectDateFormat(sampleValuesFor(detected.date, rowsData));
      setDateFormat(format ?? "");
    }
  };

  const applyParsedFile = async (file: File, parsed: ParsedFile | null) => {
    if (!parsed || parsed.fields.length === 0) {
      setParsing(false);
      setError(t("upload.errors.noColumns"));
      return;
    }
    if (parsed.rows.length === 0) {
      setParsing(false);
      setError(t("upload.errors.emptyFile"));
      return;
    }

    setFileName(file.name);
    setColumns(parsed.fields);
    setSourceRows(parsed.rows);

    await resolveMapping(parsed.fields, parsed.rows);

    setParsing(false);
    setStep("mapping");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setParsing(true);

    if (isExcelFile(file)) {
      parseExcelFile(file)
        .then((parsed) => applyParsedFile(file, parsed))
        .catch(() => {
          setParsing(false);
          setError(t("upload.errors.readFailed"));
        });
      e.target.value = "";
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        if (results.errors.length > 0 && fields.length === 0) {
          setParsing(false);
          setError(t("upload.errors.invalidFile"));
          return;
        }
        const data = results.data.filter((row) => Object.values(row).some((v) => (v ?? "").toString().trim() !== ""));
        applyParsedFile(file, { fields, rows: data });
      },
      error: () => {
        setParsing(false);
        setError(t("upload.errors.readFailed"));
      }
    });

    e.target.value = "";
  };

  const handleDateColumnChange = (col: string) => {
    setDateColumn(col);
    if (!col) {
      setDateFormat("");
      return;
    }
    const detected = detectDateFormat(sampleValuesFor(col, sourceRows));
    setDateFormat(detected ?? "");
  };

  const canProceedMapping =
    !!dateColumn && !!labelColumn && !!categoryColumn && !!dateFormat &&
    (
      (typeMode === "signedAmount" && !!amountColumn) ||
      (typeMode === "column" && !!amountColumn && !!typeColumn) ||
      (typeMode === "debitCredit" && !!debitColumn && !!creditColumn)
    );

  const missingOnlyDateFormat =
    !!dateColumn && !!labelColumn && !!categoryColumn && !dateFormat &&
    (
      (typeMode === "signedAmount" && !!amountColumn) ||
      (typeMode === "column" && !!amountColumn && !!typeColumn) ||
      (typeMode === "debitCredit" && !!debitColumn && !!creditColumn)
    );

  const buildCurrentMapping = (): ImportMapping => ({
    dateColumn,
    labelColumn,
    categoryColumn,
    typeMode,
    amountColumn: typeMode !== "debitCredit" ? amountColumn : undefined,
    typeColumn: typeMode === "column" ? typeColumn : undefined,
    expenseLabel: typeMode === "column" ? expenseLabel : undefined,
    incomeLabel: typeMode === "column" ? incomeLabel : undefined,
    debitColumn: typeMode === "debitCredit" ? debitColumn : undefined,
    creditColumn: typeMode === "debitCredit" ? creditColumn : undefined,
    dateFormat: dateFormat || ""
  });

  const buildRows = async () => {
    if (!canProceedMapping) {
      setError(missingOnlyDateFormat ? t("mapping.errors.dateFormatRequired") : t("mapping.errors.required"));
      return;
    }
    setError("");
    setCheckingDuplicates(true);

    let existing: Transaction[] = [];
    try {
      existing = await getAllTransactions(userId);
    } catch (err) {
      console.error(err);
    }

    const now = new Date();

    const parsed: ParsedRow[] = sourceRows.map((raw, index) => {
      const date = parseDateWithFormat(raw[dateColumn] ?? "", dateFormat as DateFormatId);
      const label = (raw[labelColumn] ?? "").trim();
      const category = (raw[categoryColumn] ?? "").trim();

      let parsedAmount: number | null = null;
      let type: TransactionType = "expense";
      let typeKnown = true;

      if (typeMode === "signedAmount") {
        parsedAmount = parseAmount(raw[amountColumn] ?? "");
        type = parsedAmount !== null && parsedAmount < 0 ? "expense" : "income";
      } else if (typeMode === "column") {
        parsedAmount = parseAmount(raw[amountColumn] ?? "");
        const rawTypeValue = normalizeLabel(raw[typeColumn] ?? "");
        if (rawTypeValue === normalizeLabel(expenseLabel)) type = "expense";
        else if (rawTypeValue === normalizeLabel(incomeLabel)) type = "income";
        else typeKnown = false;
      } else {
        const debitValue = parseAmount(raw[debitColumn] ?? "");
        const creditValue = parseAmount(raw[creditColumn] ?? "");
        if (debitValue !== null && debitValue !== 0) {
          type = "expense";
          parsedAmount = -Math.abs(debitValue);
        } else if (creditValue !== null && creditValue !== 0) {
          type = "income";
          parsedAmount = Math.abs(creditValue);
        }
      }

      let hardReasonKey: string | undefined;
      if (!date) hardReasonKey = "invalidDate";
      else if (parsedAmount === null) hardReasonKey = "invalidAmount";
      else if (!label) hardReasonKey = "missingLabel";
      else if (!typeKnown) hardReasonKey = "unknownType";

      const hardInvalid = !!hardReasonKey;
      const originalAmount = !hardInvalid && parsedAmount !== null ? Math.abs(parsedAmount) : null;
      const baseAmount = originalAmount !== null ? toBase(originalAmount) : null;

      const warningKeys: string[] = [];
      if (!hardInvalid) {
        if (date && date.getTime() > now.getTime()) warningKeys.push("futureDate");
        if (!category) warningKeys.push("missingCategory");
        else {
          const knownCategories = type === "expense" ? expenseCategories : incomeCategories;
          if (!knownCategories.includes(category)) warningKeys.push("unrecognizedCategory");
        }
      }

      const isDuplicate = !hardInvalid && date !== null && baseAmount !== null && existing.some((tx) =>
        isSameDay(tx.date, date) &&
        Math.abs(tx.amount - baseAmount) < 0.01 &&
        normalizeLabel(tx.label) === normalizeLabel(label)
      );

      return {
        key: `row-${index}`,
        date,
        label,
        category,
        type,
        baseAmount,
        originalAmount,
        hardInvalid,
        hardReasonKey,
        warningKeys,
        isDuplicate,
        checked: !hardInvalid && !isDuplicate
      };
    });

    setRows(parsed);
    setCheckingDuplicates(false);
    setStep("preview");
  };

  const toggleRow = (key: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, checked: !r.checked } : r)));
  };

  const checkedCount = useMemo(() => rows.filter((r) => !r.hardInvalid && r.checked).length, [rows]);

  const handleImport = async () => {
    if (!user || checkedCount === 0) return;
    setImporting(true);
    setError("");

    try {
      const toImport = rows
        .filter((r) => !r.hardInvalid && r.checked && r.date && r.baseAmount !== null)
        .map((r) => ({
          amount: r.baseAmount as number,
          type: r.type,
          category: r.category,
          label: r.label,
          date: r.date as Date,
          addedBy: user.uid,
          originalAmount: r.originalAmount as number,
          originalCurrency: currency
        }));

      await addTransactionsBatch(userId, toImport);

      if (columnsSignature) {
        saveImportTemplate(userId, columnsSignature, buildCurrentMapping()).catch((err) => console.error(err));
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t("preview.errors.importFailed"));
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setError("");
    setFileName("");
    setColumns([]);
    setSourceRows([]);
    setColumnsSignature("");
    setTemplateApplied(false);
    setDateColumn("");
    setLabelColumn("");
    setAmountColumn("");
    setCategoryColumn("");
    setTypeMode("signedAmount");
    setTypeColumn("");
    setDebitColumn("");
    setCreditColumn("");
    setDateFormat("");
    setRows([]);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const firstRow = sourceRows[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 shrink-0">
          <div>
            <h2 className="text-gray-900 dark:text-white font-semibold text-lg">{t("title")}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs">
              {(["upload", "mapping", "preview"] as Step[]).map((s) => (
                <span
                  key={s}
                  className={
                    s === step
                      ? "text-emerald-500 font-medium"
                      : "text-gray-500 dark:text-gray-500"
                  }
                >
                  {t(`steps.${s}`)}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-4">
          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2.5">{error}</p>
          )}

          {/* ÉTAPE 1 — UPLOAD */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t("upload.instructions")}</p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl px-4 py-10 cursor-pointer hover:border-emerald-500 transition-colors">
                <Upload className="w-6 h-6 text-gray-500 dark:text-gray-400" strokeWidth={2} />
                <span className="text-gray-900 dark:text-white font-medium text-sm">
                  {parsing ? t("upload.parsing") : t("upload.selectFile")}
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={parsing}
                />
              </label>
              {fileName && (
                <p className="text-gray-500 dark:text-gray-500 text-xs">{t("upload.selectedFile", { name: fileName })}</p>
              )}
            </div>
          )}

          {/* ÉTAPE 2 — MAPPING */}
          {step === "mapping" && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t("mapping.instructions")}</p>

              {templateApplied && (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm px-4 py-2.5 rounded-xl">
                  <Check className="w-4 h-4 shrink-0" strokeWidth={2} />
                  {t("mapping.templateApplied")}
                </div>
              )}

              <ColumnSelect label={t("mapping.date")} value={dateColumn} onChange={handleDateColumnChange} columns={columns} placeholder={t("mapping.selectPlaceholder")} example={firstRow} exampleLabel={t("mapping.example", { value: dateColumn && firstRow ? firstRow[dateColumn] : "" })} />

              {dateColumn && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("mapping.dateFormatLabel")}</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value as DateFormatId)}
                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">{t("mapping.selectPlaceholder")}</option>
                    {DATE_FORMAT_IDS.map((id) => (
                      <option key={id} value={id}>{t(`mapping.dateFormats.${id}`)}</option>
                    ))}
                  </select>
                  <p className={`text-xs mt-1 ${dateFormat ? "text-gray-500 dark:text-gray-500" : "text-amber-500"}`}>
                    {dateFormat ? t("mapping.dateFormatDetected") : t("mapping.dateFormatNotDetected")}
                  </p>
                </div>
              )}

              <ColumnSelect label={t("mapping.label")} value={labelColumn} onChange={setLabelColumn} columns={columns} placeholder={t("mapping.selectPlaceholder")} example={firstRow} exampleLabel={t("mapping.example", { value: labelColumn && firstRow ? firstRow[labelColumn] : "" })} />
              <ColumnSelect label={t("mapping.category")} value={categoryColumn} onChange={setCategoryColumn} columns={columns} placeholder={t("mapping.selectPlaceholder")} example={firstRow} exampleLabel={t("mapping.example", { value: categoryColumn && firstRow ? firstRow[categoryColumn] : "" })} />

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("mapping.typeModeLabel")}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                  {TYPE_MODE_OPTIONS.map(({ mode, labelKey }) => (
                    <button
                      key={mode}
                      onClick={() => setTypeMode(mode)}
                      className={`py-2 px-2 rounded-lg text-sm font-medium transition-colors ${typeMode === mode
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        }`}
                    >
                      {t(`mapping.${labelKey}`)}
                    </button>
                  ))}
                </div>
              </div>

              {typeMode !== "debitCredit" && (
                <ColumnSelect label={t("mapping.amount")} value={amountColumn} onChange={setAmountColumn} columns={columns} placeholder={t("mapping.selectPlaceholder")} example={firstRow} exampleLabel={t("mapping.example", { value: amountColumn && firstRow ? firstRow[amountColumn] : "" })} />
              )}

              {typeMode === "column" && (
                <div className="space-y-4 border-l-2 border-gray-200 dark:border-gray-800 pl-4">
                  <ColumnSelect label={t("mapping.typeColumn")} value={typeColumn} onChange={setTypeColumn} columns={columns} placeholder={t("mapping.selectPlaceholder")} example={firstRow} exampleLabel={t("mapping.example", { value: typeColumn && firstRow ? firstRow[typeColumn] : "" })} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("mapping.expenseLabel")}</label>
                      <input
                        type="text"
                        value={expenseLabel}
                        onChange={(e) => setExpenseLabel(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{t("mapping.incomeLabel")}</label>
                      <input
                        type="text"
                        value={incomeLabel}
                        onChange={(e) => setIncomeLabel(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {typeMode === "debitCredit" && (
                <div className="grid grid-cols-2 gap-3 border-l-2 border-gray-200 dark:border-gray-800 pl-4">
                  <ColumnSelect label={t("mapping.debitColumn")} value={debitColumn} onChange={setDebitColumn} columns={columns} placeholder={t("mapping.selectPlaceholder")} example={firstRow} exampleLabel={t("mapping.example", { value: debitColumn && firstRow ? firstRow[debitColumn] : "" })} />
                  <ColumnSelect label={t("mapping.creditColumn")} value={creditColumn} onChange={setCreditColumn} columns={columns} placeholder={t("mapping.selectPlaceholder")} example={firstRow} exampleLabel={t("mapping.example", { value: creditColumn && firstRow ? firstRow[creditColumn] : "" })} />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("upload")}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                  {t("mapping.back")}
                </button>
                <button
                  onClick={buildRows}
                  disabled={checkingDuplicates}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {checkingDuplicates ? t("preview.loadingDuplicates") : t("mapping.next")}
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — APERÇU */}
          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">{t("preview.instructions")}</p>

              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/60 sticky top-0">
                      <tr className="text-left text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2">{t("preview.columns.date")}</th>
                        <th className="px-3 py-2">{t("preview.columns.label")}</th>
                        <th className="px-3 py-2">{t("preview.columns.category")}</th>
                        <th className="px-3 py-2">{t("preview.columns.type")}</th>
                        <th className="px-3 py-2 text-right">{t("preview.columns.amount")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {rows.map((row) => (
                        <tr key={row.key} className={row.hardInvalid ? "opacity-40" : row.warningKeys.length > 0 ? "bg-amber-500/5" : ""}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={row.checked}
                              disabled={row.hardInvalid}
                              onChange={() => toggleRow(row.key)}
                              className="accent-emerald-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white whitespace-nowrap">
                            {row.date ? row.date.toLocaleDateString(language === "en" ? "en-CA" : "fr-CA") : "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">
                            <div>{row.label || "—"}</div>
                            {row.isDuplicate && (
                              <div className="flex items-center gap-1 text-amber-500 text-xs mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                                {t("preview.duplicateBadge")}
                              </div>
                            )}
                            {row.hardInvalid && row.hardReasonKey && (
                              <div className="text-red-500 text-xs mt-0.5">
                                {t("preview.invalidBadge")} — {t(`preview.reasons.${row.hardReasonKey}`)}
                              </div>
                            )}
                            {!row.hardInvalid && row.warningKeys.map((key) => (
                              <div key={key} className="flex items-center gap-1 text-amber-500 text-xs mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                                {t(`preview.reasons.${key}`)}
                              </div>
                            ))}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.category || "—"}</td>
                          <td className="px-3 py-2">
                            <span className={row.type === "expense" ? "text-red-500" : "text-emerald-500"}>
                              {row.type === "expense" ? t("preview.expense") : t("preview.income")}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white whitespace-nowrap">
                            {row.baseAmount !== null ? formatCurrency(fromBase(row.baseAmount)) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-gray-500 dark:text-gray-500 text-xs">
                {t("preview.selectedCount", { count: checkedCount })}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("mapping")}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                  {t("preview.back")}
                </button>
                <button
                  onClick={handleImport}
                  disabled={checkedCount === 0 || importing}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {importing ? t("preview.importing") : t("preview.import", { count: checkedCount })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ColumnSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  columns: string[];
  placeholder: string;
  example?: Record<string, string>;
  exampleLabel: string;
}

function ColumnSelect({ label, value, onChange, columns, placeholder, example, exampleLabel }: ColumnSelectProps) {
  return (
    <div>
      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
      >
        <option value="">{placeholder}</option>
        {columns.map((col) => (
          <option key={col} value={col}>{col}</option>
        ))}
      </select>
      {value && example && (
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-1 truncate">{exampleLabel}</p>
      )}
    </div>
  );
}
