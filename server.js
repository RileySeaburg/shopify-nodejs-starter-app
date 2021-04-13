require('isomorphic-fetch')
const dotenv = require('dotenv')
const Koa = require('koa')
const next = require('next');
const {default: shopifyAuth} = require('@shopify/koa-shopify-auth')
const {verifyRequest} = require('@shopify/koa-shopify-auth')
const {default: Shopify, ApiVersion} = require('@shopify/shopify-api')
const Router = require('koa-router')

dotenv.config();

// Initialize Shopify Library
Shopify.Context.initialize({
    API_KEY: process.env.SHOPIFY_API_KEY,
    API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SHOPIFY_API_SCOPES.split(","),
    HOST_NAME: process.env.SHOPIFY_APP_URL.replace(/https:\/\//, ""),
    API_VERSION: ApiVersion.April21,
    IS_EMBEDDED_APP: true,
    SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
  });

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({dev});
const handle = app.getRequestHandler();


/**
 * Create the ACTIVE_SHOPIFY_SHOPS hash and track shops that complete OAuth. 
 * Your app needs this to decide whether a new shop needs to perform OAuth to install it:
 * 
 * Tip
Storing the active shops in memory will force merchants to go through OAuth again every time your server is restarted. 
We recommend you persist the shops to minimize the number of logins merchants need to perform.
 */
const ACTIVE_SHOPIFY_SHOPS = {};


// Initialize Server
app.prepare().then(() => {
    const server = new Koa();
    const router = new Router();
    server.keys = [Shopify.Context.API_SECRET_KEY];
    // Implement Shopify Auth

    server.use(
        shopifyAuth({
          async afterAuth(ctx) {
            const { shop, accessToken } = ctx.state.shopify;
            ACTIVE_SHOPIFY_SHOPS[shop] = true;
      
            // Your app should handle the APP_UNINSTALLED webhook to make sure merchants go through OAuth if they reinstall it
            const response = await Shopify.Webhooks.Registry.register({
              shop,
              accessToken,
              path: "/webhooks",
              topic: "APP_UNINSTALLED",
              webhookHandler: async (topic, shop, body) => delete ACTIVE_SHOPIFY_SHOPS[shop],
            });
      
            if (!response.success) {
              console.log(
                `Failed to register APP_UNINSTALLED webhook: ${response.result}`
              );
            }
      
            // Redirect to app with shop parameter upon auth
            ctx.redirect(`/?shop=${shop}`);
          },
        }),
      );

    const handleRequest = async (ctx) => {
        await handle(ctx.req, ctx.res);
        ctx.respond = false;
        ctx.res.statusCode = 200;
    }

    router.get("/", async (ctx) => {
        const shop = ctx.query.shop;

        if (ACTIVE_SHOPIFY_SHOPS[shop] === undefined) {
            ctx.redirect(`/auth?shop=${shop}`);
        } else {
            await handleRequest(ctx);
        }
    })

    router.get("(/_next/static/.*)", handleRequest);
    router.get("/_next/webpack-hmr", handleRequest);
    router.get("(.*)", verifyRequest(), handleRequest);

    server.use(router.allowedMethods());
    server.use(router.routes());


    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    })
})