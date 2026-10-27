/**
 * Compile-time contract between each backend's real client and its demo mock.
 * Demo builds swap `@backend/rpc-client` for `@backend/rpc-client-mock`, so the mock must
 * expose every public method of the real client. Checked once per backend by `pnpm typecheck`.
 */
import type { rpc } from "@backend/rpc-client"
import type { rpc as mockRpc } from "@backend/rpc-client-mock"

// withSignal is optional: shared code calls `rpc.withSignal?.(signal) ?? rpc`.
type PublicApi<T> = Omit<{ [K in keyof T]: T[K] }, "withSignal">
type MissingMethods = Exclude<keyof PublicApi<typeof rpc>, keyof typeof mockRpc>

export const mockImplementsClient: [MissingMethods] extends [never]
  ? typeof mockRpc extends PublicApi<typeof rpc> ? true : "mock signatures differ from the real client"
  : { missingInMock: MissingMethods } = true
