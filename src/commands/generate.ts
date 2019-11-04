import { GluegunToolbox } from 'gluegun'
import { CliProjectConfig } from '../models/cli-project-config'

module.exports = {
  name: 'generate',
  alias: ['g'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      template: { generate },
      print,
      config,
      project,
      dotnetCore
    } = toolbox

    const type = parameters.first
    const name = parameters.second

    if (type === 'domain' || type === 'd') {
      const projectConfigFile = (await project.isInsideDotnetCore()) as CliProjectConfig

      if (!projectConfigFile) {
        print.error("You are not inside of a '.Net Core' project")
        print.info(
          'If you are inside a dotnet core project make' +
            ` sure you have a '${config.project.configFileName}' in the root directory.`
        )

        print.info('To create a new .Net Core project run:')
        print.success(' coffee new yourProjectName --dotnetcore')
        return
      }

      await dotnetCore.generateDomain(name, true)
      print.info(`${print.checkmark} Generated domain ${name}`)
      return
    }

    await generate({
      template: 'model.ts.ejs',
      target: `models/${name}-model.js`,
      props: { name }
    })

    print.info(`Generated file at models/${name}-model.js`)
  }
}
