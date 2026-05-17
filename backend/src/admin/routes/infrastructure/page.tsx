import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ServerStack } from '@medusajs/icons'
import { Container, Heading, Text, Badge, Button } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type Service = {
  name: string
  url: string
  description: string
  credentials?: Record<string, string>
}

const InfrastructurePage = () => {
  const [data, setData] = useState<{
    services: Service[]
    connectionStrings: Record<string, string>
  } | null>(null)

  useEffect(() => {
    fetch('/admin/infrastructure', { credentials: 'include' })
      .then((r) => r.json())
      .then(setData)
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Infrastructure</Heading>
        <Text className="text-ui-fg-subtle">
          Every service URL and login for this shop, in one place.
        </Text>
      </div>

      {!data ? (
        <div className="px-6 py-4">
          <Text>Loading…</Text>
        </div>
      ) : (
        <>
          <div className="px-6 py-4 flex flex-col gap-y-4">
            {data.services.map((svc) => (
              <div
                key={svc.name}
                className="border rounded-lg p-4 flex flex-col gap-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Text weight="plus">{svc.name}</Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      {svc.description}
                    </Text>
                  </div>
                  <a href={svc.url} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="small">
                      Open ↗
                    </Button>
                  </a>
                </div>
                <Badge size="2xsmall">{svc.url}</Badge>
                {svc.credentials && (
                  <div className="bg-ui-bg-subtle rounded-md p-3 grid grid-cols-2 gap-1 max-w-md">
                    {Object.entries(svc.credentials).map(([k, v]) => (
                      <div key={k} className="contents">
                        <Text size="small" className="text-ui-fg-subtle">
                          {k}
                        </Text>
                        <Text size="small" className="font-mono">
                          {v}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-6 py-4">
            <Text weight="plus" className="mb-2">
              Connection strings
            </Text>
            <div className="flex flex-col gap-y-1">
              {Object.entries(data.connectionStrings).map(([k, v]) => (
                <Text key={k} size="small" className="font-mono break-all">
                  <span className="text-ui-fg-subtle">{k}: </span>
                  {v}
                </Text>
              ))}
            </div>
          </div>
        </>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: 'Infrastructure',
  icon: ServerStack,
})

export default InfrastructurePage
