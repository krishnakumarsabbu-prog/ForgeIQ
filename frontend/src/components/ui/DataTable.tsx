import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridOptions } from 'ag-grid-community'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { useMemo } from 'react'

ModuleRegistry.registerModules([AllCommunityModule])

interface DataTableProps {
  rowData: Record<string, unknown>[]
  columnDefs: ColDef[]
  height?: string | number
  gridOptions?: Partial<GridOptions>
  onRowClick?: (row: Record<string, unknown>) => void
}

export function DataTable({ rowData, columnDefs, height = '100%', gridOptions, onRowClick }: DataTableProps) {
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
    flex: 1,
    cellStyle: { display: 'flex', alignItems: 'center', fontSize: '13px' },
  }), [])

  const mergedGridOptions: Partial<GridOptions> = {
    rowHeight: 36,
    headerHeight: 32,
    animateRows: true,
    rowSelection: 'single',
    suppressCellFocus: false,
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    defaultColDef,
    onRowClicked: (e) => {
      if (onRowClick && e.data) onRowClick(e.data)
    },
    ...gridOptions,
  }

  return (
    <div className="ag-theme-quartz" style={{ height, width: '100%' }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        {...mergedGridOptions}
      />
    </div>
  )
}
