import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthlyPeriodSelectorProps {
  onPeriodChange: (year: number, month: number) => void;
  currentYear?: number;
  currentMonth?: number;
}

export function MonthlyPeriodSelector({
  onPeriodChange,
  currentYear,
  currentMonth,
}: MonthlyPeriodSelectorProps) {
  const today = new Date();
  const [year, setYear] = useState(currentYear || today.getFullYear());
  const [month, setMonth] = useState(currentMonth || today.getMonth() + 1);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handlePreviousMonth = () => {
    let newMonth = month - 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    onPeriodChange(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newMonth = month + 1;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
    onPeriodChange(newYear, newMonth);
  };

  const handleCurrentMonth = () => {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    setYear(currentYear);
    setMonth(currentMonth);
    onPeriodChange(currentYear, currentMonth);
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousMonth}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </Button>

      <div className="flex items-center gap-3 flex-1 justify-center">
        <Calendar className="w-5 h-5 text-slate-600" />
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">
            {monthNames[month - 1]} {year}
          </div>
          <div className="text-xs text-slate-600">
            Período: {new Date(year, month - 1, 1).toLocaleDateString("pt-BR")} a{" "}
            {new Date(year, month, 0).toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {!isCurrentMonth && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentMonth}
            className="text-xs"
          >
            Mês Atual
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="flex items-center gap-2"
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
