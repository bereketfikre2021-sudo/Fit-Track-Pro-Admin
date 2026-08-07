/**
 * telebirr.hooks.ts
 *
 * Telebirr (EthioTelecom) provider hook implementations.
 * Telebirr is Ethiopia's largest mobile money platform.
 *
 * Setup:
 *   1. Register as a merchant at: https://developer.ethiotelecom.et
 *   2. Store your appId, appKey, and publicKey in a Supabase Edge Function
 *   3. Replace the TODO stubs with Edge Function calls
 *   4. Register in subscriptions.queries.ts PROVIDER_HOOKS
 *
 * Telebirr API flow:
 *   1. Build the payment payload (outTradeNo, subject, totalAmount, returnUrl, notifyUrl)
 *   2. Encrypt with the merchant public key
 *   3. POST to Telebirr H5 payment URL
 *   4. User completes payment in Telebirr app
 *   5. Telebirr calls your notifyUrl webhook with the result
 *
 * Documentation: https://developer.ethiotelecom.et/docs/GetStarted
 */

import { createProviderHooks, type ProviderHookPayload } from '../subscriptions.queries'

export const telebirrHooks = createProviderHooks({
  name: 'telebirr',

  onManualRenewal: async (payload: ProviderHookPayload) => {
    // TODO: Initiate Telebirr H5 payment for the renewal amount
    // 1. Call Edge Function with { subscriptionId, amount, userId }
    // 2. Edge Function encrypts payload and calls Telebirr API
    // 3. Return payment URL to redirect user
    // 4. Telebirr webhook notifies your Edge Function on success
    // 5. Edge Function updates subscription status
    console.info('[Telebirr] onManualRenewal hook triggered', payload)
  },

  onUpgrade: async (payload: ProviderHookPayload) => {
    // TODO: Collect the pro-rated difference via Telebirr payment
    console.info('[Telebirr] onUpgrade hook triggered', payload)
  },

  onCancel: async (payload: ProviderHookPayload) => {
    // TODO: No native cancel API — mark internally and stop future charges
    console.info('[Telebirr] onCancel hook triggered', payload)
  },

  onGrantFreeMonths: async (payload: ProviderHookPayload) => {
    // Free months are DB-only — no provider action needed
    console.info('[Telebirr] onGrantFreeMonths — no provider action required', payload)
  },
})
