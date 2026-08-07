/**
 * chapa.hooks.ts
 *
 * Chapa provider hook implementations.
 * Chapa is an Ethiopian payment gateway (https://chapa.co).
 *
 * Setup:
 *   1. Store your Chapa secret key in a Supabase Edge Function
 *   2. Use Chapa's API: https://developer.chapa.co/docs
 *   3. Replace the TODO stubs with Edge Function calls
 *   4. Register in subscriptions.queries.ts PROVIDER_HOOKS
 *
 * Chapa supports: bank transfers, mobile money (Telebirr, M-Pesa, CBE Birr)
 * API base URL: https://api.chapa.co/v1
 */

import { createProviderHooks, type ProviderHookPayload } from '../subscriptions.queries'

export const chapaHooks = createProviderHooks({
  name: 'chapa',

  onManualRenewal: async (payload: ProviderHookPayload) => {
    // TODO: Initiate a new Chapa transaction for the renewal amount
    // POST https://api.chapa.co/v1/transaction/initialize
    // { amount, currency: 'ETB', email, tx_ref, callback_url, return_url }
    console.info('[Chapa] onManualRenewal hook triggered', payload)
  },

  onCancel: async (payload: ProviderHookPayload) => {
    // TODO: Chapa does not have a native subscription cancel API
    // Record the cancellation in your own system and stop future charges
    console.info('[Chapa] onCancel hook triggered', payload)
  },

  onUpgrade: async (payload: ProviderHookPayload) => {
    // TODO: Initiate a new transaction for the price difference
    console.info('[Chapa] onUpgrade hook triggered', payload)
  },

  onDowngrade: async (payload: ProviderHookPayload) => {
    // TODO: Apply new pricing on next renewal cycle
    console.info('[Chapa] onDowngrade hook triggered', payload)
  },
})
