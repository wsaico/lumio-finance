
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { iconMap, CategoryIcon } from "@/components/icons/category-icon"

const icons = Object.keys(iconMap).map((key) => ({
    value: key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace("-", " ")
}))

interface IconPickerProps {
    value: string
    onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-12"
                >
                    <div className="flex items-center gap-2">
                        {value ? <CategoryIcon name={value} className="h-5 w-5 text-primary" /> : null}
                        {value ? icons.find((icon) => icon.value === value)?.label : "Selecciona un icono..."}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Buscar icono..." />
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty>No se encontraron iconos.</CommandEmpty>
                        <CommandGroup>
                            <div className="grid grid-cols-5 gap-2 p-2">
                                {icons.map((icon) => (
                                    <CommandItem
                                        key={icon.value}
                                        value={icon.value}
                                        onSelect={(currentValue) => {
                                            onChange(currentValue === value ? "" : currentValue)
                                            setOpen(false)
                                        }}
                                        className={cn(
                                            "cursor-pointer flex flex-col items-center justify-center p-2 rounded-md hover:bg-muted transition-colors border aspect-square",
                                            value === icon.value ? "bg-primary/10 border-primary" : "border-transparent"
                                        )}
                                    >
                                        <CategoryIcon name={icon.value} className={cn("h-6 w-6", value === icon.value ? "text-primary" : "text-muted-foreground")} />
                                    </CommandItem>
                                ))}
                            </div>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
