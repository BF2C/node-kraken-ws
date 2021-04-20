# node-kraken-ws

This is a kraken websocket implementation written by some rando on the
internet.

Tests have not been implemented yet and the docs are still incomplete.

* [How to use](#how-to-use)
  * [Subscribing](#subscribing)
  * [Listening to events](#listening-to-events)
    * [List of shared events](#list-of-shared-events)
* [Public channels](#public-channels)
  * [Public channel methods](#public-channel-methods)
* [Private channels](#private-channels)
  * [List of private events](#list-of-private-events)
  * [Private channel methods](#private-channel-methods)
  * [Private order methods](#private-order-methods)

## How to use

A websocket connection can subscribe to either public or private channels.
For this reason, there are two implementations, one for public & one for
private channels.

### Connecting

Creating an instance will not connect to the web socket, instead, contrary to
3.x versions, the `connect` method has to be used:

```js
import { KrakenWSPublic, KrakenWSPrivate } from 'node-kraken-ws'

async () => {
  const public = new KrakenWSPublic()
  await public.connect()

  const private = new KrakenWSPrivate()
  await private.connect()
}
```

### Subscribing

Subscribing will always return a promise with the properties described in the
[docs](https://docs.kraken.com/websockets/#message-subscriptionStatus).
A `unsubscribe` prop will be added by this library:


```js
import { KrakenWSPublic, KrakenWSPrivate } from 'node-kraken-ws'

async () => {
  const instance = new KrakenWSPublic()
  await instance.connect()

  const {
    ...originalPayload,
    unsubscribe, // Function
  } = await instance.subscribe(...)
}
```

### Listening to events

```js
import { KrakenWSPublic, KrakenWSPrivate } from 'node-kraken-ws'

async () => {
  const instance = new KrakenWSPublic()
  await instance.connect()
  const { channelID } = await instance.subscribeToSpread(...)

  const removeListener = instance.on('kraken:subscribe:event', payload => {
    if (payload[0] !== channelID) return
    // ...
  })
}
```

#### List of shared events

* kraken:connection:closed
* kraken:connection:establishing
* kraken:connection:established
  * payload: `{ ws: /* instance of the actual websocket */ }`
* kraken:connection:error
  * paylaod: instance of `Error`
* kraken:connection:reconnecting:start
* kraken:connection:reconnecting:failure
* kraken:subscribe:success
* kraken:subscribe:error
  * See [subscriptionStatus](https://docs.kraken.com/websockets/#message-subscriptionStatus). The response of the kraken websocket is just forwarded The payload additionally has a `unsubscribe` property, which can be used to unsubscribe to the channel.
* kraken:subscribe:failure
  * See [subscriptionStatus](https://docs.kraken.com/websockets/#message-subscriptionStatus). The response of the kraken websocket is just forwarded
* kraken:unsubscribe:success
* kraken:subscription:event
  * See [Kraken Websocket api](https://docs.kraken.com/websockets/#message-ticker).  The response of the kraken websocket is just forwarded
* kraken:unhandled

## Public channels

```js
import { KrakenWSPublic } from 'node-kraken-ws'

const ws = new KrakenWSPublic({ /* pass options */ })
```

### Public channel methods:

#### subscribeToTicker

##### Arguments

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| pair | String | yes | / |
| reqid | Int | no | / |

#### subscribeToOHLC

##### Arguments

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| pair | String | yes | / |
| reqid | Int | no | / |
| interval | Int | no | / |

#### subscribeToTrade

##### Arguments

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| pair | String | yes | / |
| reqid | Int | no | / |

#### subscribeToSpread

##### Arguments

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| pair | String | yes | / |
| reqid | Int | no | / |

#### subscribeToBook

##### Arguments

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| pair | String | yes | / |
| reqid | Int | no | / |
| depth | Int | no | / |

## Private channels

```js
import { KrakenWSPrivate } from 'node-kraken-ws'

const ws = new KrakenWSPrivate({ /* pass options */ })
```

### List of private events

##### kraken:addorder:success

See the [response
payload](https://docs.kraken.com/websockets/#message-addOrder) of the addOrder
message

##### kraken:addorder:failure

See the [response
payload](https://docs.kraken.com/websockets/#message-addOrder) of the addOrder
message

##### kraken:cancelorder:success

See the [response
payload](https://docs.kraken.com/websockets/#message-cancelOrder) of the addOrder
message

##### kraken:cancelorder:failure

See the [response
payload](https://docs.kraken.com/websockets/#message-cancelOrder) of the addOrder
message

##### kraken:cancelall:success

See the [response
payload](https://docs.kraken.com/websockets/#message-cancelAll) of the addOrder
message

##### kraken:cancelall:failure

See the [response
payload](https://docs.kraken.com/websockets/#message-cancelAll) of the addOrder
message

### Private channel methods:

#### subscribeToOwnTrades

##### Arguments

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| reqid | Int | no | / |
| snapshot | Bool | no | / |


#### subscribeToOpenOrders

##### Arguments

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| reqid | Int | no | / |

### Private order methods

#### addOrder

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| ordertype | String | yes | / |
| type | String | yes | / |
| pair | String | yes | / |
| volume | Float | yes | / |
| reqid | Int | no | / |
| price | Float | no | / |
| price2 | Float | no | / |
| reqid | Int | no | / |
| leverage | Float | no | / |
| oflags | String | no | / |
| starttm | String | no | / |
| expiretm | String | no | / |
| userref | String | no | / |
| validate | String | no | / |
| close | Object | no | / |
| close.ordertype | String | no | / |
| close.price | Float | no | / |
| close.price2 | Float | no | / |
| trading_agreement | String | no | / |

##### Returns

Promise

##### Resolves with:

```js
{
  event: String
  reqid: Int
  status: "ok" | "error"
  txid?: String
  descr?: String
}
```

##### Rejects with:

```js
{
  event: String
  reqid: Int
  status: "ok" | "error"
  errorMessage?: String
}
```

#### cancelOrder

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| txid | String \| String[] | yes | / |
| reqid | Int | no | / |

##### Returns*:

Promise

##### Resolves with:

`void`

##### Rejects with

`void`

#### cancelAll

| arguments | type | required | default value |
|-----------|------|----------|---------------|
| reqid | Int | no | / |
