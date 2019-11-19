import { GluegunToolbox } from 'gluegun'
import { ProjectType } from '../enums/projectType'

module.exports = {
  name: 'designer',
  run: async (toolbox: GluegunToolbox) => {
    const { print, dependencies, designer, prompt, dotnetcore } = toolbox

    const isInsideDotnetCore = await dependencies.isInsideDotnetCore()

    if (!isInsideDotnetCore) {
      return;
    }

    const allInstalled = await dependencies.checkDependencies(ProjectType.dotnetCore)

    if (allInstalled) {
      await designer.start()

      const hasChange = await designer.hasChangeClassTables()

      print.info(`Coffe Designer has ended.`)
      print.newline()

      if (!hasChange) {
        print.info('There was no change to apply.')

        return
      }

      const requiredResult = await prompt.ask([
        {
          type: 'radio',
          name: 'required',
          message: `It seems that you have made some changes, do you want Coffe to update your project?:`,
          choices: ['Yes', 'No']
        }
      ])

      const updateProject = requiredResult.required === 'Yes' ? true : false

      if (!updateProject) {
        print.newline()
        print.info('Don´t forget to update your project')
        print.newline()
        print.info('run: ')
        print.info(' coffee update')
        return
      }

      const spinner = print.spin()
      spinner.start()

      spinner.text = 'Updating project...'

      await dotnetcore.updateEntitiesAndContext()
      await dotnetcore.updateDomains()

      spinner.stop()
      print.newline()
      print.info(`${print.checkmark} Project was successfully updated`)
    } else {
      print.info('Failed to install .Net Core dependencies...')
    }
  }
}
