import { createEmitSubscriptionEventPublic } from './utils/createEmitSubscriptionEventPublic'

export const createEmitSubscriptionEventTicker = data => {
  if (!data.data.a) throw new Error('data needs "a"')
  if (!data.data.a.price) throw new Error('data needs "a.price"')
  if (typeof data.a.price !== 'string') throw new Error('data.a.price must be a string')
  if (!data.data.a.wholeLotVolume) throw new Error('data needs "a.wholeLotVolume"')
  if (typeof data.a.wholeLotVolume !== 'number') throw new Error('data.a.wholeLotVolume must be a number')
  if (!data.data.a.lotVolume) throw new Error('data needs "a.lotVolume"')
  if (typeof data.a.lotVolume !== 'string') throw new Error('data.a.lotVolume must be a string')

  if (!data.data.b) throw new Error('data needs "b"')
  if (!data.data.b.price) throw new Error('data needs "b.price"')
  if (typeof data.b.price !== 'string') throw new Error('data.b.price must be a string')
  if (!data.data.b.wholeLotVolume) throw new Error('data needs "b.wholeLotVolume"')
  if (typeof data.b.wholeLotVolume !== 'number') throw new Error('data.b.wholeLotVolume must be a number')
  if (!data.data.b.lotVolume) throw new Error('data needs "b.lotVolume"')
  if (typeof data.b.lotVolume !== 'string') throw new Error('data.b.lotVolume must be a string')

  if (!data.data.c) throw new Error('data needs "c"')
  if (!data.data.c.price) throw new Error('data needs "c.price"')
  if (typeof data.c.price !== 'string') throw new Error('data.c.price must be a string')
  if (!data.data.c.lotVolume) throw new Error('data needs "c.lotVolume"')
  if (typeof data.c.lotVolume !== 'string') throw new Error('data.c.lotVolume must be a string')

  if (!data.data.v) throw new Error('data needs "v"')
  if (!data.data.v.today) throw new Error('data needs "v.today"')
  if (typeof data.v.today !== 'string') throw new Error('data.v.today must be a string')
  if (!data.data.v.last24Hours) throw new Error('data needs "v.last24Hours"')
  if (typeof data.v.last24Hours !== 'string') throw new Error('data.v.last24Hours must be a string')

  if (!data.data.p) throw new Error('data needs "p"')
  if (!data.data.p.today) throw new Error('data needs "p.today"')
  if (typeof data.p.today !== 'string') throw new Error('data.p.today must be a string')
  if (!data.data.p.last24Hours) throw new Error('data needs "p.last24Hours"')
  if (typeof data.p.last24Hours !== 'string') throw new Error('data.p.last24Hours must be a string')

  if (!data.data.t) throw new Error('data needs "t"')
  if (!data.data.t.today) throw new Error('data needs "t.today"')
  if (typeof data.t.today !== 'number') throw new Error('data.t.today must be a number')
  if (!data.data.t.last24Hours) throw new Error('data needs "t.last24Hours"')
  if (typeof data.t.last24Hours !== 'number') throw new Error('data.t.last24Hours must be a number')

  if (!data.data.l) throw new Error('data needs "l"')
  if (!data.data.l.today) throw new Error('data needs "l.today"')
  if (typeof data.l.today !== 'string') throw new Error('data.l.today must be a string')
  if (!data.data.l.last24Hours) throw new Error('data needs "l.last24Hours"')
  if (typeof data.l.last24Hours !== 'string') throw new Error('data.l.last24Hours must be a string')

  if (!data.data.h) throw new Error('data needs "h"')
  if (!data.data.h.today) throw new Error('data needs "h.today"')
  if (typeof data.h.today !== 'string') throw new Error('data.h.today must be a string')
  if (!data.data.h.last24Hours) throw new Error('data needs "h.last24Hours"')
  if (typeof data.h.last24Hours !== 'string') throw new Error('data.h.last24Hours must be a string')

  if (!data.data.o) throw new Error('data needs "o"')
  if (!data.data.o.today) throw new Error('data needs "o.today"')
  if (typeof data.o.today !== 'string') throw new Error('data.o.today must be a string')
  if (!data.data.o.last24Hours) throw new Error('data needs "o.last24Hours"')
  if (typeof data.o.last24Hours !== 'string') throw new Error('data.o.last24Hours must be a string')

  return createEmitSubscriptionEventPublic({
    ...data,
    channelName: 'ticker',
    data: {
      a: [data.data.a.price, data.data.a.wholeLotVolume, data.data.a.lotVolume],
      b: [data.data.b.price, data.data.b.wholeLotVolume, data.data.b.lotVolume],
      c: [data.data.c.price, data.data.c.lotVolume],
      v: [data.data.v.today, data.data.v.last24Hours],
      v: [data.data.p.today, data.data.p.last24Hours],
      v: [data.data.t.today, data.data.t.last24Hours],
      v: [data.data.l.today, data.data.l.last24Hours],
      v: [data.data.h.today, data.data.h.last24Hours],
      v: [data.data.o.today, data.data.o.last24Hours],
    }
  })
}
