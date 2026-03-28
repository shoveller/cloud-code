import { Container } from '@cloudflare/containers'
import { env } from 'cloudflare:workers'
import { processSSEStream } from './sse'

const PORT = 2633

const containerEnv = Object.fromEntries(
  Object.entries(env).filter(([, value]) => typeof value === 'string'),
)

export class AgentContainer extends Container {
  sleepAfter = '10m'
  defaultPort = PORT

  private _startPromise?: Promise<void>
  private _watchPromise?: Promise<void>

  envVars = {
    ...containerEnv,
    PORT: PORT.toString(),
  }

  private async ensureContainerStarted() {
    if (this._startPromise) {
      return this._startPromise
    }

    this._startPromise = (async () => {
      const maxAttempts = 3
      const delaysMs = [0, 300, 800]

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (attempt > 1) {
            const delayMs = delaysMs[attempt - 1] ?? 800
            await new Promise((resolve) => setTimeout(resolve, delayMs))
          }
          console.info(`Starting container (attempt ${attempt}/${maxAttempts})`)
          await this.start()
          console.info('Container started')
          return
        } catch (error) {
          console.error('Container start failed:', error)
          if (attempt === maxAttempts) {
            this._startPromise = undefined
            throw error
          }
        }
      }
    })()

    return this._startPromise
  }

  async watchContainer() {
    try {
      await this.ensureContainerStarted()
      const res = await this.containerFetch('http://container/global/event')
      const reader = res.body?.getReader()
      if (reader) {
        await processSSEStream(reader, (event) => {
          const eventType = event.payload?.type

          if (eventType === 'session.updated') {
            this.renewActivityTimeout()
            console.info('Renewed container activity timeout')
          }

          if (eventType !== 'message.part.updated') {
            console.info('SSE event:', JSON.stringify(event.payload))
          }
        })
      }
    } catch (error) {
      console.error('SSE connection error:', error)
      console.info(this._watchPromise)
    }
  }

  override async onStart(): Promise<void> {
    // Fire-and-forget: let SSE listener run in background to avoid blocking blockConcurrencyWhile
    this._watchPromise = this.watchContainer()
  }

  override async fetch(request: Request): Promise<Response> {
    await this.ensureContainerStarted()
    return super.fetch(request)
  }
}

const SINGLETON_CONTAINER_ID = 'cf-singleton-container'

export async function forwardRequestToContainer(request: Request) {
  const objectId = env.AGENT_CONTAINER.idFromName(SINGLETON_CONTAINER_ID)
  const container = env.AGENT_CONTAINER.get(objectId, {
    locationHint: 'wnam', // Force west US region
  })

  return container.fetch(request)
}
