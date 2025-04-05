"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, ArrowUpDown, X } from "lucide-react"
import * as XLSX from 'xlsx'
import { useStockStore } from "@/store/useStockStore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface StockItem {
  Marka: string
  "Ürün Grubu": string
  "Ürün Kodu": string
  "Renk Kodu": string
  Beden: string
  Envanter: number
}

type SortConfig = {
  column: keyof StockItem | null
  direction: 'asc' | 'desc'
}

type Filter = {
  column: keyof StockItem
  value: string
}

export default function StockQueryPage() {
  const { stockData, setStockData } = useStockStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterColumn, setFilterColumn] = useState<keyof StockItem>("Marka")
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, direction: 'asc' })
  const [activeFilters, setActiveFilters] = useState<Filter[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as StockItem[]
        setStockData(jsonData)
      }
      reader.readAsBinaryString(file)
    }
  }

  const handleSort = (column: keyof StockItem) => {
    setSortConfig(current => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const addFilter = (column: keyof StockItem, value: string) => {
    if (value) {
      setActiveFilters(prev => [...prev, { column, value }])
    }
  }

  const removeFilter = (index: number) => {
    setActiveFilters(prev => prev.filter((_, i) => i !== index))
  }

  const processedData = useMemo(() => {
    let result = [...stockData]

    // Apply active filters
    activeFilters.forEach(filter => {
      result = result.filter(item => 
        String(item[filter.column]).toLowerCase().includes(filter.value.toLowerCase())
      )
    })

    // Apply search
    if (searchTerm) {
      result = result.filter(item => 
        String(item[filterColumn]).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply sorting
    if (sortConfig.column) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.column!]).toLowerCase()
        const bValue = String(b[sortConfig.column!]).toLowerCase()
        
        if (sortConfig.direction === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }

    return result
  }, [stockData, activeFilters, searchTerm, filterColumn, sortConfig])

  const columns: (keyof StockItem)[] = ["Marka", "Ürün Grubu", "Ürün Kodu", "Renk Kodu", "Beden", "Envanter"]

  const uniqueValues = useMemo(() => {
    const values: Partial<Record<keyof StockItem, Set<string>>> = {}
    columns.forEach(column => {
      values[column] = new Set(stockData.map(item => String(item[column])))
    })
    return values
  }, [stockData, columns])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stok Sorgula</h1>
        <div className="flex gap-4">
          <Button asChild>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Excel Yükle
              <input
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
              />
            </label>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-[200px]"
          />
          <Select
            value={filterColumn}
            onValueChange={(value) => setFilterColumn(value as keyof StockItem)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Arama Kolonu" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Filtre Ekle</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <Select onValueChange={(value) => setFilterColumn(value as keyof StockItem)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kolon Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column} value={column}>
                      {column}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                onValueChange={(value) => addFilter(filterColumn, value)}
                disabled={!uniqueValues[filterColumn]?.size}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Değer Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(uniqueValues[filterColumn] || []).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full text-sm"
            >
              <span>{filter.column}: {filter.value}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={() => removeFilter(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column}
                  className="cursor-pointer"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-2">
                    {column}
                    <ArrowUpDown className="h-4 w-4" />
                    {sortConfig.column === column && (
                      <span className="text-xs">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column}>{item[column]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 