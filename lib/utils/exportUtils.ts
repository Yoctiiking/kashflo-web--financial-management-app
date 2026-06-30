import { Transaction } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportTransactionsToCSV = (transactions: Transaction[], filename: string) => {
    const headers = ["Date", "Description", "Catégorie", "Type", "Montant"];
    const rows = transactions.map(t => [
        format(t.date, "dd-MM-yyyy"),
        t.label,
        t.category,
        t.type === "income" ? "Revenu" : "Dépense",
        t.amount.toFixed(2)
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

export const exportTransactionsToPDF = (
    transactions: Transaction[],
    filename: string,
    monthLabel: string,
    formatCurrency: (amount: number) => string
) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Kash Flo — Transactions", 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(monthLabel, 14, 28);

    const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    doc.setFontSize(10);
    doc.text(`Revenus : ${formatCurrency(totalIncome)}`, 14, 36);
    doc.text(`Dépenses : ${formatCurrency(totalExpenses)}`, 14, 42);
    doc.text(`Solde : ${formatCurrency(totalIncome - totalExpenses)}`, 14, 48);

    const rows = transactions.map(t => [
        format(t.date, "d MMM yyyy", { locale: fr }),
        t.label,
        t.category,
        t.type === "income" ? "Revenu" : "Dépense",
        (t.type === "income" ? "+" : "-") + formatCurrency(t.amount)
    ]);

    autoTable(doc, {
        startY: 56,
        head: [["Date", "Description", "Catégorie", "Type", "Montant"]],
        body: rows,
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 }
    });

    doc.save(`${filename}.pdf`);
};