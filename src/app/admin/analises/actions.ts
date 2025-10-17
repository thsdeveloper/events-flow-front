'use server'

import { getAuthenticatedClient } from '@/lib/directus/directus'
import { readItems, aggregate } from '@directus/sdk'
import { cookies } from 'next/headers'
import {
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  format,
  startOfHour,
  addHours
} from 'date-fns'

/**
 * Get authenticated Directus client from user's cookie
 */
async function getDirectusClient() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    throw new Error('Usuário não autenticado. Por favor, faça login.')
  }

  return getAuthenticatedClient(token)
}

export interface AnalyticsFilters {
  startDate?: Date
  endDate?: Date
  eventId?: string
  organizerId?: string
}

export interface KPIData {
  totalRevenue: number
  revenueChange: number
  ticketsSold: number
  ticketsTotal: number
  uniqueParticipants: number
  checkinRate: number
  checkinChange: number
}

export interface SalesDataPoint {
  date: string
  revenue: number
  tickets: number
}

export interface PaymentStatusData {
  status: string
  count: number
  value: number
  percentage: number
}

export interface PaymentMethodData {
  method: string
  count: number
  revenue: number
}

export interface TicketPerformance {
  id: string
  title: string
  sold: number
  total: number
  revenue: number
  conversionRate: number
  status: string
}

export interface InstallmentData {
  status: string
  count: number
  totalAmount: number
  receivedAmount: number
  pendingAmount: number
}

export interface InstallmentAlert {
  type: 'overdue' | 'upcoming' | 'defaulted'
  count: number
  amount: number
}

export interface CheckinHourData {
  hour: string
  count: number
  percentage: number
}

export interface ActiveEvent {
  id: string
  title: string
  startDate: string
  ticketsSold: number
  ticketsTotal: number
  revenue: number
  status: 'active' | 'slow' | 'critical'
}

/**
 * Busca KPIs principais do dashboard
 */
export async function getKPIData(filters: AnalyticsFilters = {}): Promise<KPIData> {
  try {
    console.log('[getKPIData] Starting with filters:', filters)
    const directus = await getDirectusClient()
    const { startDate, endDate, eventId, organizerId } = filters

    // Filtro base para registrations
    const baseFilter: any = {
      payment_status: { _eq: 'paid' }
    }

    if (startDate) {
      baseFilter.date_created = { _gte: startOfDay(startDate).toISOString() }
    }
    if (endDate) {
      baseFilter.date_created = {
        ...(baseFilter.date_created || {}),
        _lte: endOfDay(endDate).toISOString()
      }
    }
    if (eventId) {
      baseFilter.event_id = { _eq: eventId }
    }

    // Buscar registrations com filtros
    const registrations = await directus.request(
      readItems('event_registrations', {
        filter: baseFilter,
        fields: ['id', 'payment_amount', 'participant_email', 'check_in_date', 'date_created']
      })
    )

  // Calcular receita total
  const totalRevenue = registrations.reduce((sum, reg) => sum + Number(reg.payment_amount || 0), 0)

  // Calcular participantes únicos
  const uniqueEmails = new Set(registrations.map(reg => reg.participant_email))
  const uniqueParticipants = uniqueEmails.size

  // Calcular taxa de check-in
  const checkedIn = registrations.filter(reg => reg.check_in_date).length
  const checkinRate = registrations.length > 0 ? (checkedIn / registrations.length) * 100 : 0

  // Calcular vendas totais vs disponíveis
  const ticketsSold = registrations.length

  // Buscar total de tickets disponíveis
  const ticketsFilter: any = {}
  if (eventId) {
    ticketsFilter.event_id = { _eq: eventId }
  }

  const tickets = await directus.request(
    readItems('event_tickets', {
      filter: ticketsFilter,
      fields: ['quantity']
    })
  )

  const ticketsTotal = tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0)

  // Calcular variação percentual (comparando com período anterior)
  let revenueChange = 0
  let checkinChange = 0

  if (startDate && endDate) {
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const previousStartDate = subDays(startDate, periodDays)
    const previousEndDate = subDays(endDate, periodDays)

    const previousFilter = {
      ...baseFilter,
      date_created: {
        _gte: startOfDay(previousStartDate).toISOString(),
        _lte: endOfDay(previousEndDate).toISOString()
      }
    }

    const previousRegistrations = await (await getDirectusClient()).request(
      readItems('event_registrations', {
        filter: previousFilter,
        fields: ['payment_amount', 'check_in_date']
      })
    )

    const previousRevenue = previousRegistrations.reduce((sum, reg) => sum + Number(reg.payment_amount || 0), 0)
    revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    const previousCheckedIn = previousRegistrations.filter(reg => reg.check_in_date).length
    const previousCheckinRate = previousRegistrations.length > 0
      ? (previousCheckedIn / previousRegistrations.length) * 100
      : 0

    checkinChange = previousCheckinRate > 0
      ? ((checkinRate - previousCheckinRate) / previousCheckinRate) * 100
      : 0
  }

    console.log('[getKPIData] Success:', { totalRevenue, ticketsSold, uniqueParticipants })

    return {
      totalRevenue,
      revenueChange,
      ticketsSold,
      ticketsTotal,
      uniqueParticipants,
      checkinRate,
      checkinChange
    }
  } catch (error) {
    console.error('[getKPIData] Error:', error)
    throw error
  }
}

/**
 * Busca dados de vendas ao longo do tempo
 */
export async function getSalesData(filters: AnalyticsFilters = {}): Promise<SalesDataPoint[]> {
  try {
    console.log('[getSalesData] Starting with filters:', filters)
    const directus = await getDirectusClient()
    const { startDate, endDate, eventId } = filters

    const end = endDate || new Date()
    const start = startDate || subDays(end, 30)

    const baseFilter: any = {
      payment_status: { _eq: 'paid' },
      date_created: {
        _gte: startOfDay(start).toISOString(),
        _lte: endOfDay(end).toISOString()
      }
    }

    if (eventId) {
      baseFilter.event_id = { _eq: eventId }
    }

    const registrations = await directus.request(
    readItems('event_registrations', {
      filter: baseFilter,
      fields: ['date_created', 'payment_amount', 'quantity'],
      sort: ['date_created']
    })
  )

  // Agrupar por dia
  const dayInterval = eachDayOfInterval({ start, end })
  const salesByDay = new Map<string, { revenue: number; tickets: number }>()

  // Inicializar todos os dias com 0
  dayInterval.forEach(day => {
    salesByDay.set(format(day, 'yyyy-MM-dd'), { revenue: 0, tickets: 0 })
  })

  // Agregar vendas por dia
  registrations.forEach(reg => {
    const day = format(new Date(reg.date_created!), 'yyyy-MM-dd')
    const current = salesByDay.get(day) || { revenue: 0, tickets: 0 }

    salesByDay.set(day, {
      revenue: current.revenue + Number(reg.payment_amount || 0),
      tickets: current.tickets + Number(reg.quantity || 1)
    })
  })

    // Converter para array ordenado
    const result = Array.from(salesByDay.entries())
      .map(([date, data]) => ({
        date: format(new Date(date), 'dd/MM'),
        revenue: data.revenue,
        tickets: data.tickets
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    console.log('[getSalesData] Success, data points:', result.length)

    return result
  } catch (error) {
    console.error('[getSalesData] Error:', error)
    throw error
  }
}

/**
 * Busca distribuição de status de pagamentos
 */
export async function getPaymentStatusData(filters: AnalyticsFilters = {}): Promise<PaymentStatusData[]> {
  const directus = await getDirectusClient()
  const { eventId } = filters

  const baseFilter: any = {}
  if (eventId) {
    baseFilter.event_id = { _eq: eventId }
  }

  const registrations = await directus.request(
    readItems('event_registrations', {
      filter: baseFilter,
      fields: ['status', 'payment_amount']
    })
  )

  const statusMap = new Map<string, { count: number; value: number }>()

  registrations.forEach(reg => {
    const status = reg.status || 'unknown'
    const current = statusMap.get(status) || { count: 0, value: 0 }

    statusMap.set(status, {
      count: current.count + 1,
      value: current.value + Number(reg.payment_amount || 0)
    })
  })

  const total = registrations.length

  return Array.from(statusMap.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    value: data.value,
    percentage: total > 0 ? (data.count / total) * 100 : 0
  }))
}

/**
 * Busca distribuição de métodos de pagamento
 */
export async function getPaymentMethodsData(filters: AnalyticsFilters = {}): Promise<PaymentMethodData[]> {
  const directus = await getDirectusClient()
  const { eventId } = filters

  const baseFilter: any = {
    payment_status: { _eq: 'paid' }
  }

  if (eventId) {
    baseFilter.event_id = { _eq: eventId }
  }

  const registrations = await directus.request(
    readItems('event_registrations', {
      filter: baseFilter,
      fields: ['payment_method', 'payment_amount']
    })
  )

  const methodMap = new Map<string, { count: number; revenue: number }>()

  registrations.forEach(reg => {
    const method = reg.payment_method || 'unknown'
    const current = methodMap.get(method) || { count: 0, revenue: 0 }

    methodMap.set(method, {
      count: current.count + 1,
      revenue: current.revenue + Number(reg.payment_amount || 0)
    })
  })

  return Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    count: data.count,
    revenue: data.revenue
  }))
}

/**
 * Busca performance dos tipos de ingressos
 */
export async function getTicketPerformance(filters: AnalyticsFilters = {}): Promise<TicketPerformance[]> {
  const directus = await getDirectusClient()
  const { eventId } = filters

  const ticketsFilter: any = {
    status: { _neq: 'inactive' }
  }

  if (eventId) {
    ticketsFilter.event_id = { _eq: eventId }
  }

  const tickets = await directus.request(
    readItems('event_tickets', {
      filter: ticketsFilter,
      fields: ['id', 'title', 'quantity', 'quantity_sold', 'price', 'status']
    })
  )

  return tickets.map(ticket => {
    const sold = Number(ticket.quantity_sold || 0)
    const total = Number(ticket.quantity || 0)
    const revenue = sold * Number(ticket.price || 0)
    const conversionRate = total > 0 ? (sold / total) * 100 : 0

    return {
      id: ticket.id,
      title: ticket.title || '',
      sold,
      total,
      revenue,
      conversionRate,
      status: ticket.status || 'active'
    }
  })
}

/**
 * Busca dados de parcelamentos
 */
export async function getInstallmentData(filters: AnalyticsFilters = {}): Promise<{
  summary: InstallmentData[]
  alerts: InstallmentAlert[]
}> {
  const directus = await getDirectusClient()
  const baseFilter: any = {}

  const installments = await directus.request(
    readItems('payment_installments', {
      filter: baseFilter,
      fields: ['id', 'status', 'amount', 'due_date', 'paid_at']
    })
  )

  // Agrupar por status
  const statusMap = new Map<string, { count: number; total: number; received: number; pending: number }>()

  installments.forEach(inst => {
    const status = inst.status || 'unknown'
    const amount = Number(inst.amount || 0)
    const current = statusMap.get(status) || { count: 0, total: 0, received: 0, pending: 0 }

    statusMap.set(status, {
      count: current.count + 1,
      total: current.total + amount,
      received: current.received + (inst.paid_at ? amount : 0),
      pending: current.pending + (!inst.paid_at ? amount : 0)
    })
  })

  const summary = Array.from(statusMap.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    totalAmount: data.total,
    receivedAmount: data.received,
    pendingAmount: data.pending
  }))

  // Calcular alertas
  const today = new Date()
  const in7Days = addHours(today, 7 * 24)

  const overdue = installments.filter(i => i.status === 'overdue')
  const upcoming = installments.filter(i =>
    i.status === 'pending' &&
    new Date(i.due_date!) <= in7Days &&
    new Date(i.due_date!) >= today
  )
  const defaulted = installments.filter(i => i.status === 'cancelled')

  const alerts: InstallmentAlert[] = [
    {
      type: 'overdue',
      count: overdue.length,
      amount: overdue.reduce((sum, i) => sum + Number(i.amount || 0), 0)
    },
    {
      type: 'upcoming',
      count: upcoming.length,
      amount: upcoming.reduce((sum, i) => sum + Number(i.amount || 0), 0)
    },
    {
      type: 'defaulted',
      count: defaulted.length,
      amount: defaulted.reduce((sum, i) => sum + Number(i.amount || 0), 0)
    }
  ]

  return { summary, alerts }
}

/**
 * Busca dados de check-in por horário
 */
export async function getCheckinHeatmap(filters: AnalyticsFilters = {}): Promise<CheckinHourData[]> {
  const directus = await getDirectusClient()
  const { eventId } = filters

  const baseFilter: any = {
    check_in_date: { _nnull: true }
  }

  if (eventId) {
    baseFilter.event_id = { _eq: eventId }
  }

  const registrations = await directus.request(
    readItems('event_registrations', {
      filter: baseFilter,
      fields: ['check_in_date']
    })
  )

  // Agrupar por hora
  const hourMap = new Map<number, number>()

  registrations.forEach(reg => {
    if (reg.check_in_date) {
      const hour = new Date(reg.check_in_date).getHours()
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
    }
  })

  const total = registrations.length

  // Criar array de 24 horas
  const hours: CheckinHourData[] = []
  for (let h = 0; h < 24; h++) {
    const count = hourMap.get(h) || 0
    hours.push({
      hour: `${h.toString().padStart(2, '0')}:00`,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })
  }

  return hours.filter(h => h.count > 0) // Retornar apenas horas com check-ins
}

/**
 * Busca eventos ativos com análise de performance
 */
export async function getActiveEvents(filters: AnalyticsFilters = {}): Promise<ActiveEvent[]> {
  try {
    console.log('[getActiveEvents] Starting with filters:', filters)
    const directus = await getDirectusClient()
    const { organizerId } = filters

    const eventsFilter: any = {
      status: { _eq: 'published' },
      start_date: { _gte: new Date().toISOString() }
    }

    if (organizerId) {
      eventsFilter.organizer_id = { _eq: organizerId }
    }

    console.log('[getActiveEvents] Fetching events with filter:', eventsFilter)

    const events = await directus.request(
      readItems('events', {
        filter: eventsFilter,
        fields: [
          'id',
          'title',
          'start_date',
          { tickets: ['quantity', 'quantity_sold', 'price'] }
        ],
        sort: ['start_date']
      })
    )

    console.log('[getActiveEvents] Found events:', events.length)

    return events.map(event => {
    const tickets = event.tickets || []
    const ticketsTotal = tickets.reduce((sum, t) => sum + Number(t.quantity || 0), 0)
    const ticketsSold = tickets.reduce((sum, t) => sum + Number(t.quantity_sold || 0), 0)
    const revenue = tickets.reduce((sum, t) => {
      const sold = Number(t.quantity_sold || 0)
      const price = Number(t.price || 0)
      
return sum + (sold * price)
    }, 0)

    // Determinar status
    const sellRate = ticketsTotal > 0 ? (ticketsSold / ticketsTotal) * 100 : 0
    let status: 'active' | 'slow' | 'critical' = 'active'

    if (sellRate < 20) status = 'critical'
    else if (sellRate < 50) status = 'slow'

      return {
        id: event.id,
        title: event.title || '',
        startDate: event.start_date || '',
        ticketsSold,
        ticketsTotal,
        revenue,
        status
      }
    })
  } catch (error) {
    console.error('[getActiveEvents] Error:', error)
    throw error
  }
}
