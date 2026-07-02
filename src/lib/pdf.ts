import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Vehicle, HistoryItem } from '@/types'
import { getDriverStats, calculateDriverKm, getDriverKmDetails } from '@/lib/helpers'

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number }
}

export function generateFleetReport(vehicles: Vehicle[], history: HistoryItem[]) {
  const doc = new jsPDF() as JsPDFWithAutoTable
  let yPos = 20

  doc.setFontSize(22)
  doc.setTextColor(0, 150, 136)
  doc.text('FROTA INFRATECH', 105, yPos, { align: 'center' })
  yPos += 10

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text('Relatorio Detalhado de Historico de Veiculos', 105, yPos, { align: 'center' })
  yPos += 8

  doc.setFontSize(10)
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, 105, yPos, { align: 'center' })
  yPos += 15

  // Estatísticas por motorista
  const driverStats = getDriverStats(history)
  if (driverStats.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(0, 150, 136)
    doc.text('ESTATISTICAS POR MOTORISTA (Ultimos 30 dias)', 14, yPos)
    yPos += 8

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Motorista', 'Retiradas', 'KM Rodado', 'Media/Retirada']],
      body: driverStats.map((driver, index) => {
        const totalKm = calculateDriverKm(driver[0], history)
        const avgKm = driver[1] > 0 ? Math.round(totalKm / driver[1]) : 0
        return [index + 1, driver[0], driver[1], `${totalKm.toLocaleString()} km`, `${avgKm.toLocaleString()} km`]
      }),
      theme: 'striped',
      headStyles: { fillColor: [0, 150, 136], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 15 : 80
  }

  // Detalhes de KM por motorista (retirada/devolução)
  doc.addPage()
  yPos = 20
  doc.setFontSize(14)
  doc.setTextColor(0, 150, 136)
  doc.text('DETALHES DE KM POR MOTORISTA', 14, yPos)
  yPos += 10

  const driversWithDetails = driverStats.filter(d => calculateDriverKm(d[0], history) > 0)

  driversWithDetails.forEach(([driverName]) => {
    if (yPos > 250) { doc.addPage(); yPos = 20 }

    doc.setFontSize(11)
    doc.setTextColor(52, 73, 94)
    doc.text(`Motorista: ${driverName}`, 14, yPos)
    yPos += 6

    const details = getDriverKmDetails(driverName, history)
    if (details.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Veiculo', 'KM Inicio', 'KM Fim', 'KM Rodado']],
        body: details.map(d => [d.date, d.vehicle, d.kmStart.toLocaleString(), d.kmEnd.toLocaleString(), `${d.kmDriven.toLocaleString()} km`]),
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      })
      yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 30
    }
    yPos += 5
  })

  // Histórico detalhado
  doc.addPage()
  yPos = 20
  doc.setFontSize(14)
  doc.setTextColor(0, 150, 136)
  doc.text('HISTORICO COMPLETO DE MOVIMENTACOES', 14, yPos)
  yPos += 10

  if (history.length > 0) {
    const sortedHistory = [...history].reverse().slice(0, 100)
    autoTable(doc, {
      startY: yPos,
      head: [['Data/Hora', 'Veiculo', 'Motorista', 'Acao', 'KM', 'Extras']],
      body: sortedHistory.map(item => [item.date, item.vehicle, item.driver || '-', item.action, item.km.toLocaleString() + ' km', item.extra || '-']),
      theme: 'grid',
      headStyles: { fillColor: [52, 73, 94], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 20 }, 5: { cellWidth: 35 } },
      margin: { left: 14, right: 14 },
    })
  }

  // Resumo da frota
  doc.addPage()
  yPos = 20
  doc.setFontSize(14)
  doc.setTextColor(0, 150, 136)
  doc.text('RESUMO DA FROTA', 14, yPos)
  yPos += 10

  const totalVehicles = vehicles.length
  const stats: [string, number][] = [
    ['Total de Veiculos', totalVehicles],
    ['Disponiveis', vehicles.filter(v => v.status === 'disp').length],
    ['Em Uso', vehicles.filter(v => v.status === 'uso').length],
    ['Em Manutencao', vehicles.filter(v => v.status === 'man').length],
    ['Em Lavador', vehicles.filter(v => v.status === 'lav').length],
    ['Em Mobilizacao', vehicles.filter(v => v.status === 'mobilizacao').length],
    ['Bloqueados', vehicles.filter(v => v.blocked).length],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Status', 'Quantidade', 'Percentual']],
    body: stats.map((s, i) => [s[0], s[1], i === 0 ? '100%' : `${(s[1] / totalVehicles * 100).toFixed(1)}%`]),
    theme: 'striped',
    headStyles: { fillColor: [0, 150, 136] },
    margin: { left: 14, right: 14 },
  })

  // Rodapé
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Frota Infratech - Pagina ${i} de ${pageCount}`, 105, 290, { align: 'center' })
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 105, 295, { align: 'center' })
  }

  doc.save(`relatorio-frota-${new Date().toISOString().split('T')[0]}.pdf`)
}
