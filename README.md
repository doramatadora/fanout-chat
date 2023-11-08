# Real-time chat powered by Fastly Fanout

This is a basic web chat application hosted on [Glitch](https://glitch.com). It relies on [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) and [Fastly Fanout](https://docs.fastly.com/products/fanout) for real-time functionality.

✨ It is intended as a companion to [doramatadora/passwordless-demo](https://www.github.com/doramatadora/passwordless-demo), a proof-of-concept implementation of passwordless authentication with [passkeys](https://passkeys.dev/), at the network's edge, using [Fastly Compute](https://www.fastly.com/products/edge-compute). ✨

A live instance of the passwordless chat demo can be found at [devchat.edgecompute.app](https://devchat.edgecompute.app/).

## Components

To enable real-time updates, [Fastly Fanout](https://docs.fastly.com/products/fanout) is positioned as a
[GRIP (Generic Real-time Intermediary Protocol)](https://pushpin.org/docs/protocols/grip/) proxy. Responses for streaming
requests are held open by Fanout, operating at the Fastly edge. Then, as updates become ready, the backend application publishes these updates through Fanout to all connected clients. For details on this mechanism, see [Real-time Updates](#real-time-updates) below.

### 1. Backend (origin)

The backend for this web application is written in [Node.js](https://nodejs.org/). It uses the [Express framework](https://expressjs.com/), and [SQLite](https://www.sqlite.org/) to maintain a small database. The frontend for this web application uses HTML, CSS and JavaScript. The files that compose the frontend are served by the backend as static files.

The backend runs on [Glitch](https://glitch.com/). You can [view and remix the project here](https://glitch.com/~fanout-chat).

### 2. Serverless compute (edge)

The [Fastly Compute](https://www.fastly.com/products/edge-compute) application that handles [passwordless authentication at the edge](https://www.github.com/doramatadora/passwordless-demo), also passes auth'd traffic through to the web application, and activates the [Fanout feature](https://docs.fastly.com/products/fanout) for relevant requests.

The Compute application is available at [devchat.edgecompute.app](https://devchat.edgecompute.app/). It is configured with the above [Glitch app](#1-backend-origin) as the backend, and with the [Fanout feature enabled](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#enable-fanout).

## Local development

### 1. Check out this repo and install dependencies

```sh
git clone https://github.com/doramatadora/fanout-chat.git
cd fanout-chat
npm install
```

### 2. Set up real-time functionality support

In a separate shell, run the following to quickly set up a local instance of [Pushpin](https://pushpin.org) (via Docker), configured for convenience in the [`pushpin`](`./pushpin`) directory:

```sh
cd pushpin
npm run pull
npm start
```

### 3. Set up environment and run development server

```sh
cp .env.local .env
npm start # or npm run dev to watch code changes
```

Navigate to http://localhost:7999 for the chat app proxied through Pushpin.

## Deploy your own

To run your own chat app, you will need a [Fastly Compute](https://developer.fastly.com/learning/compute/) service with [Fanout enabled](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#enable-fanout), and also a [Fastly KV Store](https://docs.fastly.com/en/guides/working-with-kv-stores) to support the passwordless login functionality.

### Deploy on Glitch, front with Fastly Compute

The chat application is written with 💖 [Glitch](https://www.glitch.com) 💖 in mind, though you can deploy it anywhere you like.

> 💡 Consider [boosting your Glitch app](https://glitch.happyfox.com/kb/article/73-glitch-pro/) so that it doesn't go to sleep.

1. Create a new project on [Glitch](https://glitch.com/) and import this GitHub repository. Note the public URL of your project, which
   typically has the domain name `https://<project-name>.glitch.me`.

1. Set up the environment. In the Glitch interface, modify `.env` and set the following values:

   - `GRIP_VERIFY_KEY`:

     ```
     base64:LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFQ0tvNUExZWJ5RmNubVZWOFNFNU9uKzhHODFKeQpCalN2Y3J4NFZMZXRXQ2p1REFtcHBUbzN4TS96ejc2M0NPVENnSGZwLzZsUGRDeVlqanFjK0dNN3N3PT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0t
     ```

     This is a base64-encoded version of the public key published at [Validating GRIP requests](https://developer.fastly.com/learning/concepts/real-time-messaging/fanout/#validating-grip-requests) on the Fastly Developer Hub.

   - `API_KEYS`: Comma-separated API keys that can be used to authenticate requests. Here's how you might generate one –

     ```sh
     openssl rand -base64 32 | tr -d '+/' | cut -c 1-32
     ```

1. Set up the edge [Compute application](https://github.com/doramatadora/passwordless-demo) with your Glitch application as a backend for it, following the instructions on [doramatadora/passwordless-demo](https://github.com/doramatadora/passwordless-demo/README.md).

1. In the Glitch interface, modify `.env` again and set the following value:

   - `FASTLY_SERVICE_ID`: The service ID of your newly deployed Fastly Compute application.

   - `FASTLY_API_TOKEN`: A Fastly API token for your service that has `global` scope.

1. Browse to your application at the public URL of your Compute application.
