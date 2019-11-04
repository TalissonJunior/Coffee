export class CliProjectConfig {
  architecture: CliProjectConfigArchitecture
}

class CliProjectConfigArchitecture {
  type: string
  webapi: string
  application: string
  domain: string
  infrastructure: string
  test: string
}
