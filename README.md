# node-kraken-ws

This is a library I personally use for connecting to kraken. It is absolutely
not necessary to use this library as you simply need to connect to the
websocket. You'll have to read the documentation as well, this library won't
help you understand how to use websocket.

The intention of this library was to be able to separate invalid param errors
from other error response. I want invalid param errors to cause the runtime
to exit with an error during development so I can notice issues right away.
This also helps me to know that any error response I get asynchronously via
the api is not about wrong params but a different issue, so there are fewer
cases I have to deal with. This reduces unavoidable complexity in my codebase.

## Installation

With npm:
```sh
npm install node-kraken-ws zod
```

With yarn:
```sh
yarn install node-kraken-ws zod
```

`zod` is a peer dependency which is used for validation the parameter values
against a schema that was created from the api docs.
The reason that this is a peer dependency is to allow the consumer to decide
which version to use, which doesn't lock down the zod version when the
consuming code wants to use `zod` as well.

## API

### `connect`

```ts
(options?: { authenticated?: boolean }) => Connection
```

`Connection` is an `EventEmitter` with extra methods used to interact with the
websocket server. It is exported from the library's types if you need the type in TS.

### request-method functions

There is a function exported for every method you can find on the
[docs page](https://docs.kraken.com/api/docs/websocket-v2/add_order).

All request-method functions use the same signature with a concrete Params type:

```ts
<Params, Response>(conn: Connection, params: Params, reqId?: number) => Promise<Response>
```

The shape of `Params` can be found on the docs pages.
The methods returns a promise and waits for a response message from the
websocket. Depending on the value of the `.success` property, the promise will
either resolve or reject.

**It's highly encourages to provide request ids to be able to being able to
attribute a reponse to its corresponding request!**

---

In my experience it's better to not rely on the response except for error
handling. Using the subscriptions instead seems to be a better choice,
especially in combination with using `order_userref`s to identify the orders.

The reason for this is: Sending packages over the network can cause weird
issues. E.g. the response of adding an order can arrive after an update
on the executions channel, although they were emitted by kraken's server
in a different order.

This leads to having to add additional checks and therefore complexity
to your project, which I think is handled much cleaner by simply not
using the request's response except when it's an error.

### subscription-method functions

All subscription-method functions have the same signature as request-method
functions, but they have no return value. Instead you'll have to subscribe and
differentiate between snapshot and update responses yourself (if that's even
necessary).

#### Example:

```js
import { connect, addOrder } from 'node-kraken-ws'

(async function() {
  const conn = await connect()
  addOrder(conn, {
    limit_price: 1000,
    side: 'buy',
    order_type: 'limit',
    symbol: 'BTC/USD',
    order_qty: 2,
    token: 'YOUR TOKEN HERE',
  })
})()
```

## Testing

If you want to test, you can provide a mock `connection` implementation, which
just needs to follow this shape:

```ts
{ send: (message: object) => void }
```

E.g. with jest, as you can simply use:


```js
const conn = { send: jest.fn() }
addOrder(conn, { /* ... */ })

// ...

expect(conn.send).toHaveBeenCalledTimes(1)
expect(conn.send).toHaveBeenCalledWith({ /* ... */ })
```

## FAQ

**What about deprecated params?**<br />
I decided to omit them from validation as they're deprecated anyway. The
validation of parameters won't fail if you add them and any unknown parameter
will be send to the endpoint.
