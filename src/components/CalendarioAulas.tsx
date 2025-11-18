import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

type Aula = {
  aula_id: string;
  data_aula: string;
  status: string;
  conteudo: string | null;
  observacoes: string | null;
  aluno?: string;
  aluno_nome?: string;
};

type CalendarioAulasProps = {
  aulas: Aula[];
  showAlunoName?: boolean;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
};

const getStatusDisplay = (status: string): string => {
  return status === "Cancelada" ? "Faltou" : status;
};

const getStatusColorClasses = (status: string): string => {
  switch (status) {
    case "Realizada":
      return "bg-green-500 text-white";
    case "Agendada":
      return "bg-blue-500 text-white";
    case "Cancelada":
      return "bg-red-500 text-white";
    case "Remarcada":
      return "bg-yellow-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

export function CalendarioAulas({
  aulas,
  showAlunoName = false,
  currentMonth,
  onMonthChange,
}: CalendarioAulasProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAulasForDay = (day: Date) => {
    return aulas.filter((aula) => isSameDay(new Date(aula.data_aula), day));
  };

  const previousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={previousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="outline" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day names */}
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-sm text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day, idx) => {
          const dayAulas = getAulasForDay(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

          return (
            <Popover key={idx}>
              <PopoverTrigger asChild>
                <div
                  className={`min-h-[80px] border rounded-md p-2 cursor-pointer hover:bg-accent transition-colors ${
                    !isCurrentMonth ? "opacity-40" : ""
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, "d")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dayAulas.map((aula) => (
                      <div
                        key={aula.aula_id}
                        className={`w-2 h-2 rounded-full ${getStatusColorClasses(
                          aula.status
                        )}`}
                      />
                    ))}
                  </div>
                </div>
              </PopoverTrigger>
              {dayAulas.length > 0 && (
                <PopoverContent className="w-80">
                  <div className="space-y-3">
                    <h3 className="font-semibold">
                      {format(day, "d 'de' MMMM", { locale: ptBR })}
                    </h3>
                    {dayAulas.map((aula) => (
                      <Card key={aula.aula_id}>
                        <CardContent className="p-3 space-y-2">
                          {showAlunoName && aula.aluno_nome && (
                            <div className="font-medium text-sm">
                              {aula.aluno_nome}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {format(new Date(aula.data_aula), "HH:mm")}
                            </span>
                            <Badge className={getStatusColorClasses(aula.status)}>
                              {getStatusDisplay(aula.status)}
                            </Badge>
                          </div>
                          {aula.conteudo && (
                            <div className="text-sm text-muted-foreground">
                              {aula.conteudo}
                            </div>
                          )}
                          {aula.observacoes && (
                            <div className="text-xs text-muted-foreground italic">
                              {aula.observacoes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm">Agendada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">Realizada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-sm">Remarcada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm">Faltou</span>
        </div>
      </div>
    </div>
  );
}
