import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  const [selectedHour, selectedMinute] = value ? value.split(":") : ["", ""];

  const handleTimeSelect = (hour: string, minute: string) => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return placeholder;
    const [h, m] = time.split(":");
    return `${h}:${m}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplayTime(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <div className="flex">
          {/* Hours */}
          <div className="border-r border-border">
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b border-border">
              Hora
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      if (selectedMinute) {
                        handleTimeSelect(hour, selectedMinute);
                      } else {
                        onChange(`${hour}:00`);
                      }
                    }}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          {/* Minutes */}
          <div>
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b border-border">
              Minuto
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant={selectedMinute === minute ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => {
                      const hour = selectedHour || "08";
                      handleTimeSelect(hour, minute);
                    }}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
