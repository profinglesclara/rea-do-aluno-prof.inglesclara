import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
}

export function TimePicker({ value, onChange, placeholder = "Selecione a hora" }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tempHour, setTempHour] = React.useState("");
  const [tempMinute, setTempMinute] = React.useState("");

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const [selectedHour, selectedMinute] = value ? value.split(":") : ["", ""];

  const handleOpen = () => {
    setTempHour(selectedHour || "08");
    setTempMinute(selectedMinute || "00");
    setOpen(true);
  };

  const handleConfirm = () => {
    onChange(`${tempHour}:${tempMinute}`);
    setOpen(false);
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return placeholder;
    const [h, m] = time.split(":");
    return `${h}:${m}`;
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground"
        )}
        onClick={handleOpen}
      >
        <Clock className="mr-2 h-4 w-4" />
        {formatDisplayTime(value)}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[280px] p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-center">Selecionar Horário</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center items-center py-4 px-4">
            <div className="flex items-center gap-2 text-4xl font-semibold">
              <span>{tempHour}</span>
              <span>:</span>
              <span>{tempMinute}</span>
            </div>
          </div>

          <div className="flex border-t border-border">
            {/* Hours */}
            <div className="flex-1 border-r border-border">
              <div className="px-3 py-2 text-sm font-medium text-muted-foreground text-center bg-muted/50">
                Hora
              </div>
              <ScrollArea className="h-[180px]">
                <div className="p-1 grid grid-cols-4 gap-1">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      type="button"
                      variant={tempHour === hour ? "default" : "ghost"}
                      size="sm"
                      className="h-9 w-full"
                      onClick={() => setTempHour(hour)}
                    >
                      {hour}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {/* Minutes */}
            <div className="flex-1">
              <div className="px-3 py-2 text-sm font-medium text-muted-foreground text-center bg-muted/50">
                Minuto
              </div>
              <ScrollArea className="h-[180px]">
                <div className="p-1 grid grid-cols-4 gap-1">
                  {minutes.map((minute) => (
                    <Button
                      key={minute}
                      type="button"
                      variant={tempMinute === minute ? "default" : "ghost"}
                      size="sm"
                      className="h-9 w-full"
                      onClick={() => setTempMinute(minute)}
                    >
                      {minute}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="px-4 py-3 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
