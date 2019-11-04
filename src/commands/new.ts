import { prompt, GluegunToolbox, strings, filesystem } from 'gluegun'
import { ProjectType } from '../enums/projectType'

module.exports = {
  name: 'new',
  alias: ['n'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print,
      project,
      config,
      createDotnetCoreProject,
      createAngularProject
    } = toolbox

    let type = ProjectType.dotnetCore
    let addSuffix = false
    const name = parameters.first
    const options = parameters.options

    // a spinner starts with the text you provide
    const spinner = print.spin('Validating project name...')

    if (!project.hasValidName(name)) {
      print.info(
        `${print.xmark} The project name can´t contain special characters.`
      )
      return
    }

    if (!options.dotnetcore && !options.angular) {
      spinner.stop()

      const result = await prompt.ask([
        {
          type: 'radio',
          name: 'type',
          message: 'Select a type of project? (Use 1,2,3 keys to select)',
          choices: [
            ProjectType.angular,
            ProjectType.dotnetCore,
            ProjectType.both
          ],
          default: ProjectType.dotnetCore
        }
      ])

      type = result.type as ProjectType
    }

    if (options.dotnetCore) {
      type = ProjectType.dotnetCore
    } else if (options.angular) {
      type = ProjectType.angular
    }

    spinner.stop()

    let frontendSuffix = config.project.frontendSuffix
    let backendSuffix = config.project.backendSuffix

    if (
      type === ProjectType.angular &&
      !project.nameHasSuffix(name, frontendSuffix)
    ) {
      addSuffix = await prompt.confirm(
        `Do you want cli to add the suffix "${frontendSuffix}" to project name?`
      )
    } else if (
      type === ProjectType.dotnetCore &&
      !project.nameHasSuffix(name, backendSuffix)
    ) {
      addSuffix = await prompt.confirm(
        `Do you want cli to add the suffix "${backendSuffix}" to project name?`
      )
    } else if (
      type === ProjectType.both &&
      (!project.nameHasSuffix(name, frontendSuffix) ||
        !project.nameHasSuffix(name, backendSuffix))
    ) {
      addSuffix = await prompt.confirm(
        `Do you want cli to add the suffixes "${frontendSuffix}", "${backendSuffix}" to project name?`
      )
    }

    const backendProjectName = addSuffix ? `${name} ${backendSuffix}` : name
    const frontendProjectName = addSuffix ? `${name} ${frontendSuffix}` : name

    const alreadyExistsFrontend = await filesystem.existsAsync(
      filesystem.path(strings.kebabCase(frontendProjectName))
    )
    const alreadyExistsBackend = await filesystem.existsAsync(
      filesystem.path(strings.kebabCase(backendProjectName))
    )

    if (alreadyExistsFrontend && type === ProjectType.angular) {
      print.info(
        `${print.xmark} Already exists a project with name ${strings.kebabCase(
          frontendProjectName
        )}!`
      )
      spinner.stop()
      return
    } else if (alreadyExistsBackend && type === ProjectType.dotnetCore) {
      print.info(
        `${print.xmark} Already exists a project with name ${strings.kebabCase(
          backendProjectName
        )}!`
      )
      spinner.stop()
      return
    } else if (
      frontendProjectName === backendProjectName &&
      type === ProjectType.both
    ) {
      print.info(
        `${print.xmark} Can´t generate 2 projects with same name, consider adding a suffix.`
      )
      spinner.stop()
      return
    }

    const response = await project.checkDependencies(type)

    if (response) {
      spinner.start()

      if (type === ProjectType.dotnetCore) {
        spinner.text = `Creating ${strings.kebabCase(backendProjectName)}...`

        const path = await createDotnetCoreProject(backendProjectName)

        spinner.stop()

        print.newline()
        print.info(
          `${print.checkmark} Successfully created ${strings.kebabCase(
            backendProjectName
          )}!`
        )
        print.info(`At ${path}`)
        print.newline()
        print.info(`  cd ${strings.kebabCase(backendProjectName)}`)
        print.info(`  dotnet run`)
        print.newline()
      } else if (type === ProjectType.angular) {
        spinner.text = `Creating ${strings.kebabCase(frontendProjectName)}...`

        const path = await createAngularProject(frontendProjectName)

        spinner.stop()

        print.newline()
        print.info(
          `${print.checkmark} Successfully created ${strings.kebabCase(
            frontendProjectName
          )}!`
        )
        print.info(`At ${path}`)
        print.newline()
        print.info(`  cd ${strings.kebabCase(frontendProjectName)}`)
        print.info(`  npm install`)
        print.info(`  ng serve`)
        print.newline()
      } else if (type === ProjectType.both) {
        spinner.text = `Creating ${strings.kebabCase(
          backendProjectName
        )} and ${strings.kebabCase(frontendProjectName)}...`

        const pathBackend = await createDotnetCoreProject(backendProjectName)
        const pathFrontend = await createAngularProject(frontendProjectName)

        spinner.stop()

        print.newline()
        print.info(
          `${print.checkmark} Successfully created ${strings.kebabCase(
            backendProjectName
          )} and ${strings.kebabCase(frontendProjectName)}!`
        )
        print.info(`At ${pathBackend}`)
        print.info(`At ${pathFrontend}`)
        print.newline()
        print.info(`  cd ${strings.kebabCase(backendProjectName)}`)
        print.info(`  dotnet run`)
        print.newline()
        print.info(`  cd ${strings.kebabCase(frontendProjectName)}`)
        print.info(`  npm install`)
        print.info(`  ng serve`)
        print.newline()
      }
    }

    spinner.stop()
  }
}
